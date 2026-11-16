import { getDef } from '../data/cards';
import type { CardInstance, Modifiers, Stats } from '../data/types';

/** 별 등급 배율 (증강체스 1성/2성/3성) */
export const STAR_MULT = [0, 1, 1.8, 3.2];
/** 각성 레벨 1당 +6% */
export const LEVEL_BONUS = 0.06;
/** 성장 스택 1당 체력·공격 +5% */
export const GROWTH_BONUS = 0.05;

export function cardStats(inst: CardInstance, power = 1): Stats {
  const b = getDef(inst.defId).base;
  const m = STAR_MULT[inst.star] * (1 + LEVEL_BONUS * (inst.level - 1)) * (1 + GROWTH_BONUS * (inst.growth ?? 0)) * power;
  return {
    hp: Math.round(b.hp * m),
    atk: Math.round(b.atk * m),
    def: Math.round(b.def * (1 + (inst.star - 1) * 0.3)),
    spd: b.spd,
  };
}

export function applyMods(s: Stats, m: Modifiers): Stats {
  return {
    hp: Math.round(s.hp * (1 + m.hpPct / 100)),
    atk: Math.round(s.atk * (1 + m.atkPct / 100)),
    def: s.def + m.defFlat,
    spd: s.spd + m.spdFlat,
  };
}

/** 상점 판매가 */
export function sellValue(inst: CardInstance): number {
  const cost = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5 }[getDef(inst.defId).rarity];
  return cost * Math.pow(3, inst.star - 1) - (inst.star > 1 ? 1 : 0);
}
