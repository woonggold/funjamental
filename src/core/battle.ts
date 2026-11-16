import { getDef } from '../data/cards';
import { typeMultiplier } from '../data/elements';
import type { CardInstance, Element, Modifiers, SkillDef } from '../data/types';
import { Rng } from './rng';
import { applyMods, cardStats } from './stats';

// ─────────────────────────────────────────────
// 자동 전투 (증강체스식). 결과와 리플레이 이벤트를 한 번에 계산한다.
//
// ※ PvP를 위해 "결정론적"이어야 한다: 같은 입력 + 같은 seed → 항상 같은 결과.
//   Math.random() 금지, 반드시 Rng(seed)만 쓸 것. (서버에서 재시뮬레이션해서 결과 검증 가능)
//
// 슬롯 0~1 = 전열, 2~4 = 후열. 적은 전열부터 공격 (암살자는 후열 우선).
// 라운드 흐름:
//   라운드 시작 → [요새] 보호막 재생 → [폭풍] 오버타임 피해 → 속도순 행동
//   공격력 = 기본 × (1 + 돌격 보너스(초반만) + 성장 누적 × 라운드 + 버프 스킬 누적)
// ─────────────────────────────────────────────

export interface BattleUnit {
  uid: string;
  defId: string;
  name: string;
  emoji: string;
  element: Element;
  star: number;
  side: 'ally' | 'enemy';
  slot: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mana: number;
  shield: number;
  /** 버프 스킬로 쌓인 공격력 % */
  buffPct: number;
  skill: SkillDef;
  mods: Modifiers;
  assassin: boolean;
}

export interface Snapshot { uid: string; hp: number; shield: number; mana: number }
export interface BattleEvent {
  round: number;
  actor: string;
  targets: string[];
  kind: 'attack' | 'skill' | 'heal' | 'shield' | 'buff' | 'info';
  text: string;
  snap: Snapshot[];
}

export interface BattleResult {
  win: boolean;
  allies: BattleUnit[];
  enemies: BattleUnit[];
  events: BattleEvent[];
  rounds: number;
  seed: number;
}

export function buildUnit(inst: CardInstance, side: 'ally' | 'enemy', slot: number, mods: Modifiers, power = 1): BattleUnit {
  const def = getDef(inst.defId);
  const s = applyMods(cardStats(inst, power), mods);
  return {
    uid: `${side[0]}${slot}_${inst.uid}`, defId: def.id, name: def.name, emoji: def.emoji, element: def.element, star: inst.star,
    side, slot, maxHp: s.hp, hp: s.hp, atk: s.atk, def: s.def, spd: s.spd, buffPct: 0,
    mana: Math.min(def.skill.mana - 1, mods.startMana), shield: Math.round(s.hp * mods.shieldPct / 100),
    skill: def.skill, mods, assassin: def.traits.includes('assassin'),
  };
}

export const MAX_ROUNDS = 40;
/** 이 라운드 이후 폭풍(오버타임): 무한 수비 방지 */
export const OVERTIME_ROUND = 16;

export function simulateBattle(allies: BattleUnit[], enemies: BattleUnit[], seed = Math.floor(Math.random() * 2 ** 31)): BattleResult {
  const r = new Rng(seed);
  const all = [...allies, ...enemies];
  const events: BattleEvent[] = [];
  let round = 0;
  const alive = (u: BattleUnit) => u.hp > 0;
  const foes = (u: BattleUnit) => (u.side === 'ally' ? enemies : allies).filter(alive);
  const friends = (u: BattleUnit) => (u.side === 'ally' ? allies : enemies).filter(alive);
  const snap = (): Snapshot[] => all.map((u) => ({ uid: u.uid, hp: u.hp, shield: u.shield, mana: u.mana }));
  const push = (e: Omit<BattleEvent, 'snap' | 'round'>) => events.push({ ...e, round, snap: snap() });
  const nm = (u: BattleUnit) => (u.side === 'enemy' ? `적 ${u.name}` : u.name);

  /** 이번 라운드의 실제 공격력 */
  const effAtk = (u: BattleUnit) => {
    const rush = round <= u.mods.rushRounds ? u.mods.rushAtkPct : 0;
    const growth = u.mods.growthPct * (round - 1);
    return u.atk * (1 + (rush + growth + u.buffPct) / 100);
  };

  const pickTarget = (u: BattleUnit): BattleUnit | undefined => {
    const list = foes(u);
    if (!list.length) return;
    const front = list.filter((t) => t.slot < 2);
    const back = list.filter((t) => t.slot >= 2);
    const pool = u.assassin ? (back.length ? back : front) : (front.length ? front : back);
    return r.pick(pool);
  };

  /** 보호막 → 체력 순으로 피해 적용. 실제 들어간 양 반환 */
  const applyRaw = (tgt: BattleUnit, dmg: number) => {
    const absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    tgt.hp = Math.max(0, tgt.hp - (dmg - absorbed));
  };

  const dealDamage = (src: BattleUnit, tgt: BattleUnit, raw: number) => {
    const eff = typeMultiplier(src.element, tgt.element);
    const crit = r.next() * 100 < src.mods.critChance;
    const def = tgt.def * (1 - src.mods.piercePct / 100);
    const dmg = Math.max(1, Math.round(raw * eff * (crit ? 1.8 : 1) * (100 / (100 + def)) * (0.9 + r.next() * 0.2)));
    applyRaw(tgt, dmg);
    tgt.mana = Math.min(tgt.skill.mana, tgt.mana + 8);
    // [요새] 반사 피해
    let thorns = 0;
    if (tgt.mods.thornsPct > 0 && alive(src)) {
      // [성장] 관통은 반사도 그만큼 무시한다
      thorns = Math.round(dmg * tgt.mods.thornsPct / 100 * (1 - src.mods.piercePct / 100));
      applyRaw(src, thorns);
    }
    return { dmg, crit, eff, thorns };
  };

  const effText = (eff: number, crit: boolean, thorns = 0) =>
    (eff > 1 ? ' 효과가 굉장했다!' : eff < 1 ? ' 효과가 별로인 듯하다…' : '') + (crit ? ' 치명타!' : '') + (thorns ? ` (반사 ${thorns})` : '');

  push({ actor: '', targets: [], kind: 'info', text: '전투 시작!' });

  while (round < MAX_ROUNDS && allies.some(alive) && enemies.some(alive)) {
    round++;
    // ── 라운드 시작 효과
    for (const u of all.filter(alive)) {
      if (u.mods.shieldRegenPct > 0) u.shield = Math.min(u.maxHp, u.shield + Math.round(u.maxHp * u.mods.shieldRegenPct / 100));
    }
    if (round === 1 && all.some((u) => u.mods.rushRounds > 0)) push({ actor: '', targets: [], kind: 'info', text: '⚔️ 돌격! 초반 공격력 상승' });
    if (round > OVERTIME_ROUND) {
      const pct = 0.06 * (round - OVERTIME_ROUND);
      for (const u of all.filter(alive)) applyRaw(u, Math.round(u.maxHp * pct));
      push({ actor: '', targets: all.filter(alive).map((u) => u.uid), kind: 'info', text: `🌪️ 폭풍 ${round}라운드 — 모두 최대 체력 ${Math.round(pct * 100)}% 피해` });
    }

    const order = all.filter(alive).sort((a, b) => b.spd - a.spd || r.next() - 0.5);
    for (const u of order) {
      if (!alive(u) || !foes(u).length) continue;
      const power = 1 + u.mods.skillPowerPct / 100;
      const atk = effAtk(u);

      if (u.mana >= u.skill.mana) {
        u.mana = 0;
        const sk = u.skill;
        if (sk.kind === 'damage') {
          const t = pickTarget(u)!;
          const { dmg, crit, eff, thorns } = dealDamage(u, t, atk * sk.power * power);
          push({ actor: u.uid, targets: [t.uid], kind: 'skill', text: `${nm(u)}의 [${sk.name}]! ${nm(t)}에게 ${dmg} 피해.${effText(eff, crit, thorns)}` });
        } else if (sk.kind === 'aoe') {
          const ts = foes(u);
          let total = 0;
          for (const t of ts) total += dealDamage(u, t, atk * sk.power * power).dmg;
          push({ actor: u.uid, targets: ts.map((t) => t.uid), kind: 'skill', text: `${nm(u)}의 [${sk.name}]! 상대 전체에게 총 ${total} 피해.` });
        } else if (sk.kind === 'heal') {
          const t = friends(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          const amt = Math.round(atk * sk.power * power);
          t.hp = Math.min(t.maxHp, t.hp + amt);
          push({ actor: u.uid, targets: [t.uid], kind: 'heal', text: `${nm(u)}의 [${sk.name}]! ${nm(t)} ${amt} 회복.` });
        } else if (sk.kind === 'shield') {
          const amt = Math.round(atk * sk.power * power);
          const ts = friends(u);
          for (const t of ts) t.shield += amt;
          push({ actor: u.uid, targets: ts.map((t) => t.uid), kind: 'shield', text: `${nm(u)}의 [${sk.name}]! 같은 편 전체 보호막 +${amt}.` });
        } else if (sk.kind === 'buff') {
          const pct = Math.round(sk.power * 100 * power);
          const ts = friends(u);
          for (const t of ts) t.buffPct += pct;
          push({ actor: u.uid, targets: ts.map((t) => t.uid), kind: 'buff', text: `${nm(u)}의 [${sk.name}]! 같은 편 공격력 +${pct}% (누적 ${u.buffPct}%)` });
        }
      } else {
        const t = pickTarget(u)!;
        const { dmg, crit, eff, thorns } = dealDamage(u, t, atk);
        u.mana = Math.min(u.skill.mana, u.mana + 25);
        push({ actor: u.uid, targets: [t.uid], kind: 'attack', text: `${nm(u)} → ${nm(t)} ${dmg}${effText(eff, crit, thorns)}` });
      }
      for (const t of all) if (t.hp === 0 && !(t as BattleUnit & { _dead?: boolean })._dead) {
        (t as BattleUnit & { _dead?: boolean })._dead = true;
        push({ actor: t.uid, targets: [], kind: 'info', text: `${nm(t)} 쓰러졌다!` });
      }
    }
  }

  const win = allies.some(alive) && !enemies.some(alive);
  push({ actor: '', targets: [], kind: 'info', text: win ? '승리!' : '패배…' });
  return { win, allies, enemies, events, rounds: round, seed };
}
