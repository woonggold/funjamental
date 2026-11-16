import { AUGMENT_MAP } from '../data/augments';
import { getDef } from '../data/cards';
import { RARITY } from '../data/elements';
import { addMods, type CardInstance, type Doctrine } from '../data/types';
import { buildUnit, simulateBattle, type BattleResult } from '../core/battle';
import { mainDoctrine, synergyMods } from '../core/synergy';

// ─────────────────────────────────────────────
// PvP의 기본 단위: "팀 스냅샷"
//  - 원정이 끝난 팀(카드·별·각성·성장·증강체)을 그대로 얼려서 저장
//  - 비동기 PvP: 내 스냅샷 vs 상대 스냅샷을 seed와 함께 시뮬레이션
//  - 전투가 결정론적이라 (attacker, defender, seed)만 있으면 서버에서 똑같이 재현/검증 가능
//  - 실시간 PvP로 확장할 때도 "양쪽이 준비 단계에서 확정한 스냅샷"을 교환하는 구조로 쓰면 된다
// ─────────────────────────────────────────────

export interface SnapshotCard {
  defId: string;
  star: number;
  level: number;
  growth: number;
}

export interface TeamSnapshot {
  /** 스냅샷 포맷 버전 (밸런스 패치 시 호환성 판단용) */
  v: 1;
  ownerId: string;
  ownerName: string;
  /** 출전 순서 그대로 (앞 2장 전열) */
  cards: SnapshotCard[];
  augments: string[];
  doctrine: Doctrine | null;
  power: number;
  rating: number;
  createdAt: number;
  bot?: boolean;
}

export function toInstances(s: TeamSnapshot, prefix: string): CardInstance[] {
  return s.cards.map((c, i) => ({ uid: `${prefix}${i}`, defId: c.defId, star: c.star, level: c.level, growth: c.growth }));
}

/** 대략적인 전투력 (매칭/표시용) */
export function teamPower(cards: SnapshotCard[]): number {
  return Math.round(cards.reduce((s, c) => {
    const r = RARITY[getDef(c.defId).rarity].order + 1;
    return s + r * 100 * [0, 1, 1.8, 3.2][c.star] * (1 + 0.06 * (c.level - 1)) * (1 + 0.05 * c.growth);
  }, 0));
}

export function makeSnapshot(team: CardInstance[], augments: string[], owner: { id: string; name: string }, rating: number): TeamSnapshot {
  const cards = team.map((c) => ({ defId: c.defId, star: c.star, level: c.level, growth: c.growth ?? 0 }));
  return {
    v: 1, ownerId: owner.id, ownerName: owner.name, cards, augments: [...augments],
    doctrine: mainDoctrine(team), power: teamPower(cards), rating, createdAt: Date.now(),
  };
}

function modsFor(s: TeamSnapshot, team: CardInstance[]) {
  let m = synergyMods(team);
  for (const id of s.augments) {
    const a = AUGMENT_MAP[id];
    if (a?.mods) m = addMods(m, a.mods({ team }));
  }
  return m;
}

/** 공격자(ally) vs 방어자(enemy). 같은 seed면 항상 같은 결과 */
export function simulatePvp(attacker: TeamSnapshot, defender: TeamSnapshot, seed: number): BattleResult {
  const a = toInstances(attacker, 'A');
  const d = toInstances(defender, 'D');
  const ma = modsFor(attacker, a);
  const md = modsFor(defender, d);
  return simulateBattle(a.map((c, i) => buildUnit(c, 'ally', i, ma)), d.map((c, i) => buildUnit(c, 'enemy', i, md)), seed);
}

/** Elo 레이팅 변화량 */
export function eloDelta(my: number, opp: number, win: boolean, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (opp - my) / 400));
  return Math.round(k * ((win ? 1 : 0) - expected));
}

/** 재현용 seed: 같은 매치면 서버도 같은 seed를 계산할 수 있게 */
export function matchSeed(attackerId: string, defenderId: string, at: number): number {
  let h = 2166136261;
  for (const ch of `${attackerId}|${defenderId}|${at}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface MatchRecord {
  attackerId: string;
  defenderId: string;
  seed: number;
  at: number;
  win: boolean;
  ratingDelta: number;
  attacker: TeamSnapshot;
  defender: TeamSnapshot;
}
