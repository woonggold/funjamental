import { getDef } from '../data/cards';
import { typeMultiplier } from '../data/elements';
import type { CardInstance, Element, Modifiers, SkillDef } from '../data/types';
import { Rng } from './rng';
import { applyMods, cardStats } from './stats';

// ─────────────────────────────────────────────
// 자동 전투 (증강체스식). 결과와 리플레이 이벤트를 한 번에 계산한다.
// 슬롯 0~1 = 전열, 2~4 = 후열. 적은 전열부터 공격 (암살자는 후열 우선).
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
  skill: SkillDef;
  mods: Modifiers;
  assassin: boolean;
}

export interface Snapshot { uid: string; hp: number; shield: number; mana: number }
export interface BattleEvent {
  actor: string;
  targets: string[];
  kind: 'attack' | 'skill' | 'heal' | 'shield' | 'info';
  text: string;
  snap: Snapshot[];
}

export interface BattleResult {
  win: boolean;
  allies: BattleUnit[];
  enemies: BattleUnit[];
  events: BattleEvent[];
  /** 남은 적 수 (패배 시 라이프 피해 계산용) */
  survivors: number;
}

export function buildUnit(inst: CardInstance, side: 'ally' | 'enemy', slot: number, mods: Modifiers, power = 1): BattleUnit {
  const def = getDef(inst.defId);
  const s = applyMods(cardStats(inst, power), mods);
  return {
    uid: inst.uid, defId: def.id, name: def.name, emoji: def.emoji, element: def.element, star: inst.star,
    side, slot, maxHp: s.hp, hp: s.hp, atk: s.atk, def: s.def, spd: s.spd,
    mana: Math.min(def.skill.mana - 1, mods.startMana), shield: Math.round(s.hp * mods.shieldPct / 100),
    skill: def.skill, mods, assassin: def.traits.includes('assassin'),
  };
}

const MAX_TURNS = 80;

export function simulateBattle(allies: BattleUnit[], enemies: BattleUnit[], seed?: number): BattleResult {
  const r = new Rng(seed);
  const all = [...allies, ...enemies];
  const events: BattleEvent[] = [];
  const alive = (u: BattleUnit) => u.hp > 0;
  const foes = (u: BattleUnit) => (u.side === 'ally' ? enemies : allies).filter(alive);
  const friends = (u: BattleUnit) => (u.side === 'ally' ? allies : enemies).filter(alive);
  const snap = (): Snapshot[] => all.map((u) => ({ uid: u.uid, hp: u.hp, shield: u.shield, mana: u.mana }));
  const push = (e: Omit<BattleEvent, 'snap'>) => events.push({ ...e, snap: snap() });

  const pickTarget = (u: BattleUnit): BattleUnit | undefined => {
    const list = foes(u);
    if (!list.length) return;
    const front = list.filter((t) => t.slot < 2);
    const back = list.filter((t) => t.slot >= 2);
    const pool = u.assassin ? (back.length ? back : front) : (front.length ? front : back);
    return r.pick(pool);
  };

  const dealDamage = (src: BattleUnit, tgt: BattleUnit, raw: number): { dmg: number; crit: boolean; eff: number } => {
    const eff = typeMultiplier(src.element, tgt.element);
    const crit = r.next() * 100 < src.mods.critChance;
    let dmg = Math.round(raw * eff * (crit ? 1.8 : 1) * (100 / (100 + tgt.def)) * (0.9 + r.next() * 0.2));
    dmg = Math.max(1, dmg);
    const absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    tgt.hp = Math.max(0, tgt.hp - (dmg - absorbed));
    tgt.mana = Math.min(tgt.skill.mana, tgt.mana + 8);
    return { dmg, crit, eff };
  };

  const nm = (u: BattleUnit) => (u.side === 'enemy' ? `적 ${u.name}` : u.name);
  const effText = (eff: number, crit: boolean) =>
    (eff > 1 ? ' 효과가 굉장했다!' : eff < 1 ? ' 효과가 별로인 듯하다…' : '') + (crit ? ' 치명타!' : '');

  push({ actor: '', targets: [], kind: 'info', text: '전투 시작!' });

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const order = all.filter(alive).sort((a, b) => b.spd - a.spd || r.next() - 0.5);
    for (const u of order) {
      if (!alive(u) || !foes(u).length) continue;
      const power = 1 + u.mods.skillPowerPct / 100;

      if (u.mana >= u.skill.mana) {
        u.mana = 0;
        const sk = u.skill;
        if (sk.kind === 'damage') {
          const t = pickTarget(u)!;
          const { dmg, crit, eff } = dealDamage(u, t, u.atk * sk.power * power);
          push({ actor: u.uid, targets: [t.uid], kind: 'skill', text: `${nm(u)}의 [${sk.name}]! ${nm(t)}에게 ${dmg} 피해.${effText(eff, crit)}` });
        } else if (sk.kind === 'aoe') {
          const ts = foes(u);
          let total = 0;
          for (const t of ts) total += dealDamage(u, t, u.atk * sk.power * power).dmg;
          push({ actor: u.uid, targets: ts.map((t) => t.uid), kind: 'skill', text: `${nm(u)}의 [${sk.name}]! 상대 전체에게 총 ${total} 피해.` });
        } else if (sk.kind === 'heal') {
          const t = friends(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          const amt = Math.round(u.atk * sk.power * power);
          t.hp = Math.min(t.maxHp, t.hp + amt);
          push({ actor: u.uid, targets: [t.uid], kind: 'heal', text: `${nm(u)}의 [${sk.name}]! ${nm(t)} ${amt} 회복.` });
        } else if (sk.kind === 'shield') {
          const amt = Math.round(u.atk * sk.power * power);
          const ts = friends(u);
          for (const t of ts) t.shield += amt;
          push({ actor: u.uid, targets: ts.map((t) => t.uid), kind: 'shield', text: `${nm(u)}의 [${sk.name}]! 같은 편 전체 보호막 +${amt}.` });
        }
      } else {
        const t = pickTarget(u)!;
        const { dmg, crit, eff } = dealDamage(u, t, u.atk);
        u.mana = Math.min(u.skill.mana, u.mana + 25);
        push({ actor: u.uid, targets: [t.uid], kind: 'attack', text: `${nm(u)} → ${nm(t)} ${dmg}${effText(eff, crit)}` });
      }
      for (const t of all) if (t.hp === 0 && !(t as any)._dead) {
        (t as any)._dead = true;
        push({ actor: t.uid, targets: [], kind: 'info', text: `${nm(t)} 쓰러졌다!` });
      }
    }
    if (!allies.some(alive) || !enemies.some(alive)) break;
  }

  const win = allies.some(alive) && !enemies.some(alive);
  push({ actor: '', targets: [], kind: 'info', text: win ? '승리!' : '패배…' });
  return { win, allies, enemies, events, survivors: enemies.filter(alive).length };
}
