import { CARD_MAP, OBTAINABLE } from '../data/cards';
import { RARITY } from '../data/elements';
import type { CardDef, Rarity } from '../data/types';
import { rng } from './rng';
import { addToCollection, type SaveData } from './save';

// ─────────────────────────────────────────────
// 수집형 RPG식 소환
//  - 상시 배너 / 픽업 배너(주마다 교체)
//  - 천장: PITY_MAX회 안에 SSR 이상 확정
//  - 반천장: 픽업 배너에서 최고 등급이 픽업이 아니면 다음엔 픽업 확정
//  - 10연차 마지막 1장 SR 이상 확정
//  - 하루 1회 무료 소환
//
// ⚠️ 지금은 클라이언트에서 굴리므로 조작 가능. 출시 전에는 서버(Cloud Functions)로 옮길 것.
//    (이 파일의 rollOne 로직을 그대로 서버로 옮기면 된다)
// ─────────────────────────────────────────────

export const GACHA_COST = 30;
export const GACHA_10_COST = 270;
export const PITY_MAX = 50;

export const GACHA_RATES: Record<Rarity, number> = { N: 50, R: 33, SR: 13, SSR: 3.4, UR: 0.6 };

export interface Banner {
  id: string;
  name: string;
  desc: string;
  /** 픽업 카드 (해당 등급이 나오면 50% 확률로 이 카드) */
  pickup?: string;
  color: string;
}

/** 픽업 로테이션: 주 단위로 바뀐다 */
const PICKUP_ROTATION = ['phoenix', 'worldtree', 'citadelcrab', 'voidlord', 'abyssserpent', 'dawnwyrm'];

export function currentBanners(now = Date.now()): Banner[] {
  const week = Math.floor(now / (7 * 24 * 3600 * 1000));
  const pick = PICKUP_ROTATION[week % PICKUP_ROTATION.length];
  const d = CARD_MAP[pick];
  return [
    { id: `pickup_${pick}`, name: `${d.emoji} ${d.name} 픽업`, desc: `${d.rarity} 등장 시 50% 확률로 ${d.name}! 놓치면 다음엔 확정.`, pickup: pick, color: RARITY[d.rarity].color },
    { id: 'standard', name: '🌟 상시 소환', desc: '모든 카드가 등장합니다.', color: '#6c8cff' },
  ];
}

export interface PullResult { def: CardDef; isNew: boolean; level: number; pickup: boolean }

const today = () => new Date().toISOString().slice(0, 10);
export const canFreePull = (s: SaveData) => s.lastFreePull !== today();

function rollOne(save: SaveData, banner: Banner, guaranteeSR = false): PullResult {
  save.pity++;
  let rarity: Rarity;
  if (save.pity >= PITY_MAX) rarity = rng.next() < 0.15 ? 'UR' : 'SSR';
  else {
    rarity = rng.weighted(GACHA_RATES);
    if (guaranteeSR && RARITY[rarity].order < RARITY.SR.order) rarity = 'SR';
  }
  if (RARITY[rarity].order >= RARITY.SSR.order) save.pity = 0;

  let def: CardDef | undefined;
  let pickup = false;
  const p = banner.pickup ? CARD_MAP[banner.pickup] : undefined;
  if (p && p.rarity === rarity) {
    if (save.pickupGuarantee || rng.next() < 0.5) { def = p; pickup = true; save.pickupGuarantee = false; }
    else save.pickupGuarantee = true;
  }
  if (!def) {
    const pool = OBTAINABLE.filter((c) => c.rarity === rarity && c.id !== p?.id);
    def = rng.pick(pool.length ? pool : OBTAINABLE);
  }
  save.history.unshift({ defId: def.id, at: Date.now(), banner: banner.id });
  save.history.length = Math.min(save.history.length, 100);
  return { def, pickup, ...addToCollection(save, def.id) };
}

export type PullKind = 'free' | 'single' | 'ten';

export function pull(save: SaveData, banner: Banner, kind: PullKind): PullResult[] | string {
  if (kind === 'free') {
    if (!canFreePull(save)) return '오늘 무료 소환은 이미 사용했습니다';
    save.lastFreePull = today();
    return [rollOne(save, banner)];
  }
  const cost = kind === 'single' ? GACHA_COST : GACHA_10_COST;
  if (save.gems < cost) return '보석이 부족합니다';
  save.gems -= cost;
  const n = kind === 'single' ? 1 : 10;
  const res: PullResult[] = [];
  for (let i = 0; i < n; i++) res.push(rollOne(save, banner, n === 10 && i === 9));
  return res;
}
