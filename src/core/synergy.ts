import { getDef } from '../data/cards';
import { DOCTRINES, DOCTRINE_IDS } from '../data/doctrines';
import { TRAITS } from '../data/traits';
import { addMods, emptyMods, type CardInstance, type Doctrine, type Modifiers, type TraitId } from '../data/types';

export interface ActiveTrait {
  trait: TraitId;
  count: number;
  /** 발동 중인 단계 인덱스 (-1 = 미발동) */
  tier: number;
}
export interface ActiveDoctrine {
  doctrine: Doctrine;
  count: number;
  tier: number;
}

const uniqueDefs = (team: CardInstance[]) => [...new Set(team.map((c) => c.defId))];
const tierOf = (tiers: { count: number }[], count: number) => {
  let tier = -1;
  tiers.forEach((t, i) => { if (count >= t.count) tier = i; });
  return tier;
};

/** 서로 다른 카드 종류 기준으로 특성 수를 센다 (같은 카드 2장은 1로 계산) */
export function countTraits(team: CardInstance[]): ActiveTrait[] {
  const counts = new Map<TraitId, number>();
  for (const id of uniqueDefs(team)) for (const t of getDef(id).traits) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([trait, count]) => ({ trait, count, tier: tierOf(TRAITS[trait].tiers, count) }))
    .sort((a, b) => b.tier - a.tier || b.count - a.count);
}

export function countDoctrines(team: CardInstance[]): ActiveDoctrine[] {
  const ids = uniqueDefs(team);
  return DOCTRINE_IDS.map((d) => {
    const count = ids.filter((id) => getDef(id).doctrine === d).length;
    return { doctrine: d, count, tier: tierOf(DOCTRINES[d].tiers, count) };
  });
}

/** 팀에서 가장 많이 쓰인 전략 (정찰/매칭 표시용) */
export function mainDoctrine(team: CardInstance[]): Doctrine | null {
  const ds = countDoctrines(team).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  return ds[0]?.doctrine ?? null;
}

export function doctrineTier(team: CardInstance[], d: Doctrine): number {
  return countDoctrines(team).find((x) => x.doctrine === d)!.tier;
}

export function synergyMods(team: CardInstance[]): Modifiers {
  let m = emptyMods();
  for (const a of countTraits(team)) if (a.tier >= 0) m = addMods(m, TRAITS[a.trait].tiers[a.tier].mods);
  for (const d of countDoctrines(team)) if (d.tier >= 0) m = addMods(m, DOCTRINES[d.doctrine].tiers[d.tier].mods);
  return m;
}
