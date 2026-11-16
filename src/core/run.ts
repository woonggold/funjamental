import { AUGMENTS, AUGMENT_MAP } from '../data/augments';
import { getDef, OBTAINABLE } from '../data/cards';
import { RARITY } from '../data/elements';
import { AUGMENT_STAGES, CHAPTER_1, shopOdds, type StageDef } from '../data/stages';
import { addMods, type CardInstance, type Element, type Rarity } from '../data/types';
import { buildUnit, simulateBattle, type BattleResult } from './battle';
import { rng, uid } from './rng';
import type { SaveData } from './save';
import { sellValue } from './stats';
import { synergyMods } from './synergy';

// ─────────────────────────────────────────────
// 한 번의 "원정" (로그라이크 런)
//   준비(상점/편성) → 전투 → 보상(포획/골드) → [증강체] → 다음 스테이지
// 런이 끝나면 포획한 카드는 컬렉션에 영구 등록 + 보석 지급.
// ─────────────────────────────────────────────

export type Phase = 'prep' | 'battle' | 'reward' | 'augment' | 'over';

export type Reward =
  | { kind: 'capture'; defId: string; star: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'card'; defId: string };

export const MAX_BENCH = 8;
export const SHOP_SLOTS = 5;
export const REROLL_COST = 2;

export class RunState {
  stage = 1;
  life = 3;
  gold = 6;
  team: CardInstance[] = [];
  bench: CardInstance[] = [];
  shop: (string | null)[] = [];
  augments: string[] = [];
  phase: Phase = 'prep';
  interestCap = 5;
  rewardChoices = 3;
  bonusTeamSize = 0;
  winStreak = 0;
  lastBattle?: BattleResult;
  pendingRewards: Reward[] = [];
  pendingAugments: string[] = [];
  captured: string[] = [];
  cleared = false;
  log: string[] = [];

  constructor(private save: SaveData, starters: string[]) {
    for (const id of starters) this.team.push(this.makeCard(id));
    this.rollShop();
  }

  get stageDef(): StageDef { return CHAPTER_1[this.stage - 1]; }
  get maxTeamSize(): number { return Math.min(6, (this.stage >= 6 ? 5 : this.stage >= 3 ? 4 : 3) + this.bonusTeamSize); }

  teamElements(): Element[] { return this.team.map((c) => getDef(c.defId).element); }

  /** 컬렉션에 있는 카드면 각성 레벨을 반영해서 생성 */
  makeCard(defId: string, star = 1): CardInstance {
    return { uid: uid(), defId, star, level: this.save.collection[defId]?.level ?? 1 };
  }

  // ── 상점 ──────────────────────────
  rollShop() {
    const odds = shopOdds(this.stage);
    this.shop = Array.from({ length: SHOP_SLOTS }, () => {
      const rarity = rng.weighted(odds);
      const pool = OBTAINABLE.filter((c) => c.rarity === rarity);
      return rng.pick(pool.length ? pool : OBTAINABLE).id;
    });
  }

  reroll(): boolean {
    if (this.gold < REROLL_COST) return false;
    this.gold -= REROLL_COST;
    this.rollShop();
    return true;
  }

  buy(slot: number): boolean {
    const id = this.shop[slot];
    if (!id) return false;
    const cost = RARITY[getDef(id).rarity].cost;
    if (this.gold < cost) return false;
    if (!this.addCard(this.makeCard(id))) return false;
    this.gold -= cost;
    this.shop[slot] = null;
    return true;
  }

  sell(uid: string) {
    const c = this.find(uid);
    if (!c) return;
    this.gold += sellValue(c);
    this.remove(uid);
  }

  // ── 편성 ──────────────────────────
  find(uid: string) { return [...this.team, ...this.bench].find((c) => c.uid === uid); }
  remove(uid: string) {
    this.team = this.team.filter((c) => c.uid !== uid);
    this.bench = this.bench.filter((c) => c.uid !== uid);
  }

  /** 대기석에 추가하고 3장 합성 체크 */
  addCard(c: CardInstance): boolean {
    const willMerge = [...this.team, ...this.bench].filter((x) => x.defId === c.defId && x.star === c.star).length >= 2;
    if (this.bench.length >= MAX_BENCH && !willMerge) return false;
    this.bench.push(c);
    this.checkMerge();
    return true;
  }

  toggleTeam(uid: string): boolean {
    const inTeam = this.team.find((c) => c.uid === uid);
    if (inTeam) {
      if (this.bench.length >= MAX_BENCH) return false;
      this.team = this.team.filter((c) => c.uid !== uid);
      this.bench.push(inTeam);
      return true;
    }
    const c = this.bench.find((x) => x.uid === uid);
    if (!c || this.team.length >= this.maxTeamSize) return false;
    this.bench = this.bench.filter((x) => x.uid !== uid);
    this.team.push(c);
    return true;
  }

  /** 팀 내 순서 이동 (앞 2칸 = 전열) */
  moveInTeam(uid: string, dir: -1 | 1) {
    const i = this.team.findIndex((c) => c.uid === uid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.team.length) return;
    [this.team[i], this.team[j]] = [this.team[j], this.team[i]];
  }

  /** 같은 카드·같은 별 3장 → 별 +1. 진화 가능한 카드는 진화형으로 변신 */
  checkMerge() {
    let merged = true;
    while (merged) {
      merged = false;
      const all = [...this.team, ...this.bench];
      const groups = new Map<string, CardInstance[]>();
      for (const c of all) {
        if (c.star >= 3) continue;
        const k = `${c.defId}:${c.star}`;
        groups.set(k, [...(groups.get(k) ?? []), c]);
      }
      for (const [, g] of groups) {
        if (g.length < 3) continue;
        const [keep, ...rest] = g.slice(0, 3);
        for (const r of rest) this.remove(r.uid);
        keep.star++;
        const def = getDef(keep.defId);
        if (def.evolvesTo) {
          keep.defId = def.evolvesTo;
          keep.level = this.save.collection[def.evolvesTo]?.level ?? keep.level;
          this.log.push(`✨ ${def.name}이(가) ${getDef(keep.defId).name}(으)로 진화했다! (★${keep.star})`);
        } else {
          this.log.push(`⭐ ${def.name} ★${keep.star} 승급!`);
        }
        merged = true;
        break;
      }
    }
  }

  // ── 전투 ──────────────────────────
  makeEnemies(): CardInstance[] {
    const sd = this.stageDef;
    const out: CardInstance[] = [];
    if (sd.boss) out.push({ uid: uid(), defId: sd.boss, star: 1, level: 1 });
    const odds = shopOdds(this.stage + (sd.type === 'elite' ? 2 : 0));
    while (out.length < sd.enemyCount) {
      const rarity = rng.weighted(odds) as Rarity;
      const pool = OBTAINABLE.filter((c) => c.rarity === rarity);
      out.push({ uid: uid(), defId: rng.pick(pool.length ? pool : OBTAINABLE).id, star: sd.star, level: 1 });
    }
    // 보스는 후열에, 탱커형은 전열에
    return out.sort((a, b) => getDef(b.defId).base.hp - getDef(a.defId).base.hp);
  }

  allyMods() {
    let m = synergyMods(this.team);
    for (const id of this.augments) {
      const a = AUGMENT_MAP[id];
      if (a.mods) m = addMods(m, a.mods(this));
    }
    return m;
  }

  fight(): BattleResult | null {
    if (!this.team.length) return null;
    const enemyCards = this.makeEnemies();
    const allyMods = this.allyMods();
    const enemyMods = synergyMods(enemyCards);
    const power = this.stageDef.power;
    const allies = this.team.map((c, i) => buildUnit(c, 'ally', i, allyMods));
    const enemies = enemyCards.map((c, i) => buildUnit(c, 'enemy', i, enemyMods, power));
    const res = simulateBattle(allies, enemies);
    this.lastBattle = res;
    this.phase = 'battle';
    return res;
  }

  /** 전투 연출이 끝난 뒤 호출 */
  resolveBattle() {
    const res = this.lastBattle!;
    if (res.win) {
      this.winStreak++;
      this.pendingRewards = this.makeRewards(res);
      this.phase = 'reward';
    } else {
      this.winStreak = 0;
      this.life -= 1;
      this.log.push(`💔 패배! 라이프 -1 (남은 라이프 ${this.life})`);
      if (this.life <= 0) { this.phase = 'over'; return; }
      this.income();
      this.rollShop();
      this.phase = 'prep';
    }
  }

  makeRewards(res: BattleResult): Reward[] {
    // 쓰러뜨린 적 중에서 포획 후보 (보스가 있으면 보스 포획 확정 선택지)
    const enemies = res.enemies;
    const boss = enemies.find((e) => getDef(e.defId).boss);
    const rewards: Reward[] = [];
    if (boss) rewards.push({ kind: 'capture', defId: boss.defId, star: 1 });
    const candidates = [...enemies].filter((e) => !getDef(e.defId).boss).sort(() => rng.next() - 0.5);
    for (const e of candidates) {
      if (rewards.length >= this.rewardChoices - 1) break;
      if (!rewards.some((r) => r.kind === 'capture' && r.defId === e.defId))
        rewards.push({ kind: 'capture', defId: e.defId, star: 1 });
    }
    rewards.push({ kind: 'gold', amount: 4 + Math.floor(this.stage / 2) });
    return rewards;
  }

  pickReward(i: number) {
    const r = this.pendingRewards[i];
    if (!r) return;
    if (r.kind === 'gold') this.gold += r.amount;
    if (r.kind === 'capture' || r.kind === 'card') {
      const ok = this.addCard(this.makeCard(r.defId));
      if (r.kind === 'capture') this.captured.push(r.defId);
      if (!ok) this.log.push('대기석이 가득 차서 카드를 데려오지 못했다 (도감에는 등록됨)');
      else this.log.push(`🎯 ${getDef(r.defId).name} 포획!`);
    }
    this.pendingRewards = [];
    this.afterStageClear();
  }

  afterStageClear() {
    if (AUGMENT_STAGES.includes(this.stage) && this.pendingAugments.length === 0) {
      const pool = AUGMENTS.filter((a) => !this.augments.includes(a.id)).sort(() => rng.next() - 0.5);
      this.pendingAugments = pool.slice(0, 3).map((a) => a.id);
      this.phase = 'augment';
      return;
    }
    this.nextStage();
  }

  pickAugment(id: string) {
    const a = AUGMENT_MAP[id];
    this.augments.push(id);
    a.onPick?.(this);
    this.pendingAugments = [];
    this.nextStage();
  }

  nextStage() {
    if (this.stage >= CHAPTER_1.length) {
      this.cleared = true;
      this.phase = 'over';
      return;
    }
    this.stage++;
    this.income();
    this.rollShop();
    this.phase = 'prep';
  }

  /** 증강체스식 수입: 기본 5 + 이자(10골드당 1) + 연승 보너스 */
  income() {
    const interest = Math.min(this.interestCap, Math.floor(this.gold / 10));
    const streak = this.winStreak >= 3 ? 2 : this.winStreak >= 2 ? 1 : 0;
    const total = 5 + interest + streak;
    this.gold += total;
    this.log.push(`💰 수입 +${total} (기본 5 · 이자 ${interest} · 연승 ${streak})`);
  }

  /** 런 종료 보상 */
  rewardsOnEnd(): { gems: number; stagesCleared: number } {
    const stagesCleared = this.cleared ? CHAPTER_1.length : this.stage - 1;
    return { gems: stagesCleared * 15 + (this.cleared ? 150 : 0), stagesCleared };
  }
}

