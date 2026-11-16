import { OBTAINABLE } from '../data/cards';
import type { CardDef, Rarity } from '../data/types';
import { rng } from './rng';
import { addToCollection, type SaveData } from './save';

// 수집형 RPG식 뽑기. 확률 + 천장(pity).
export const GACHA_COST = 30;
export const GACHA_10_COST = 270;
export const PITY_MAX = 40;

export const GACHA_RATES: Record<Rarity, number> = { N: 52, R: 32, SR: 12, SSR: 3.5, UR: 0.5 };

export interface PullResult { def: CardDef; isNew: boolean; level: number }

function rollOne(save: SaveData, guaranteeSR = false): PullResult {
  save.pity++;
  let rarity: Rarity;
  if (save.pity >= PITY_MAX) rarity = rng.next() < 0.15 ? 'UR' : 'SSR';
  else {
    rarity = rng.weighted(GACHA_RATES);
    if (guaranteeSR && (rarity === 'N' || rarity === 'R')) rarity = 'SR';
  }
  if (rarity === 'SSR' || rarity === 'UR') save.pity = 0;
  const pool = OBTAINABLE.filter((c) => c.rarity === rarity);
  const def = rng.pick(pool.length ? pool : OBTAINABLE);
  return { def, ...addToCollection(save, def.id) };
}

export function pull(save: SaveData, times: 1 | 10): PullResult[] | null {
  const cost = times === 1 ? GACHA_COST : GACHA_10_COST;
  if (save.gems < cost) return null;
  save.gems -= cost;
  const res: PullResult[] = [];
  for (let i = 0; i < times; i++) res.push(rollOne(save, times === 10 && i === 9)); // 10연차 마지막 SR 이상 확정
  return res;
}
