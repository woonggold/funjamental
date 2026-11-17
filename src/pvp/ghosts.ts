import { OBTAINABLE } from '../data/cards';
import { DOCTRINE_IDS } from '../data/doctrines';
import { RARITY } from '../data/elements';
import { Rng } from '../core/rng';
import { mainDoctrine } from '../core/synergy';
import { teamPower, type TeamSnapshot } from './snapshot';

// 오프라인/서버에 상대가 부족할 때 쓰는 봇 상대.
// 레이팅이 높을수록 별·등급이 높아진다. 봇마다 전략(돌격/성장/요새)이 뚜렷하다.

const NAMES = ['떠돌이 조련사', '숲의 은둔자', '번개 수집가', '성벽지기', '붉은 돌격대장', '새벽 순례자', '심연 탐험가', '광산 소년'];

export function makeGhost(rating: number, seed: number): TeamSnapshot {
  const r = new Rng(seed);
  const doctrine = r.pick(DOCTRINE_IDS);
  const tierBoost = Math.max(0, Math.min(3, Math.floor((rating - 900) / 150)));
  const size = rating < 1000 ? 4 : 5;
  const pool = OBTAINABLE.filter((c) => c.doctrine === doctrine && RARITY[c.rarity].order <= 1 + tierBoost);
  const cards = Array.from({ length: size }, () => {
    const d = r.pick(pool);
    const star = r.next() < (rating - 900) / 600 ? 2 : 1;
    return { defId: d.id, star: Math.min(3, star + (rating > 1500 && r.next() < 0.2 ? 1 : 0)), level: 1 + Math.min(4, Math.floor(r.next() * tierBoost * 1.5)), growth: doctrine === 'growth' ? r.int(0, 6) : 0 };
  });
  // 탱커를 앞으로
  cards.sort((a, b) => (OBTAINABLE.find((c) => c.id === b.defId)!.base.hp) - (OBTAINABLE.find((c) => c.id === a.defId)!.base.hp));
  return {
    v: 1, ownerId: `bot_${seed}`, ownerName: `🤖 ${r.pick(NAMES)}`, cards, augments: [],
    doctrine: mainDoctrine(cards.map((c, i) => ({ uid: String(i), ...c }))) ?? doctrine,
    power: teamPower(cards), rating: Math.round(rating + r.int(-80, 80)), createdAt: Date.now(), bot: true,
  };
}

export function ghostOpponents(rating: number, count: number): TeamSnapshot[] {
  const base = Math.floor(Date.now() / 60000);
  return Array.from({ length: count }, (_, i) => makeGhost(rating + (i - 1) * 60, base * 7 + i));
}
