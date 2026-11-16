import { getDef } from '../data/cards';
import { TRAITS } from '../data/traits';
import { addMods, emptyMods, type CardInstance, type Modifiers, type TraitId } from '../data/types';

export interface ActiveTrait {
  trait: TraitId;
  count: number;
  /** 발동 중인 단계 인덱스 (-1 = 미발동) */
  tier: number;
}

/** 서로 다른 카드 종류 기준으로 특성 수를 센다 (같은 카드 2장은 1로 계산) */
export function countTraits(team: CardInstance[]): ActiveTrait[] {
  const unique = [...new Set(team.map((c) => c.defId))];
  const counts = new Map<TraitId, number>();
  for (const id of unique) for (const t of getDef(id).traits) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([trait, count]) => {
      const tiers = TRAITS[trait].tiers;
      let tier = -1;
      tiers.forEach((t, i) => { if (count >= t.count) tier = i; });
      return { trait, count, tier };
    })
    .sort((a, b) => b.tier - a.tier || b.count - a.count);
}

export function synergyMods(team: CardInstance[]): Modifiers {
  let m = emptyMods();
  for (const a of countTraits(team)) if (a.tier >= 0) m = addMods(m, TRAITS[a.trait].tiers[a.tier].mods);
  return m;
}
