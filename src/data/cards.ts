import type { CardDef } from './types';

// 카드 추가는 여기에 객체 하나만 추가하면 된다.
// base 스탯은 ★1 / 각성 +0 기준.
// doctrine: rush(돌격) / growth(성장) / fortress(요새) — doctrines.ts 참고
export const CARDS: CardDef[] = [
  // ════════════════ 스타터 (전략별 1마리씩) ════════════════
  {
    id: 'emberfox', name: '불씨여우', emoji: '🦊', element: 'fire', rarity: 'R', doctrine: 'rush',
    traits: ['beast', 'mage'], base: { hp: 420, atk: 50, def: 16, spd: 13 },
    skill: { name: '불꽃 세례', desc: '적 전체에게 공격력 70% 피해', kind: 'aoe', power: 0.7, mana: 90 },
    evolvesTo: 'blazefox', flavor: '돌격형 스타터. 빠르게 몰아친다.',
  },
  {
    id: 'blazefox', name: '화염구미호', emoji: '🔥', element: 'fire', rarity: 'SR', unobtainable: true, doctrine: 'rush',
    traits: ['beast', 'mage'], base: { hp: 520, atk: 64, def: 20, spd: 14 },
    skill: { name: '구미호의 업화', desc: '적 전체에게 공격력 110% 피해', kind: 'aoe', power: 1.1, mana: 90 },
  },
  {
    id: 'bubbleturtle', name: '물방울거북', emoji: '🐢', element: 'water', rarity: 'R', doctrine: 'fortress',
    traits: ['beast', 'guardian'], base: { hp: 640, atk: 32, def: 36, spd: 7 },
    skill: { name: '거품 방벽', desc: '같은 편 전체에게 공격력 120% 보호막', kind: 'shield', power: 1.2, mana: 100 },
    evolvesTo: 'tideturtle', flavor: '요새형 스타터. 버티고 받아친다.',
  },
  {
    id: 'tideturtle', name: '해일거북', emoji: '🌊', element: 'water', rarity: 'SR', unobtainable: true, doctrine: 'fortress',
    traits: ['beast', 'guardian'], base: { hp: 820, atk: 40, def: 46, spd: 7 },
    skill: { name: '해일 장벽', desc: '같은 편 전체에게 공격력 180% 보호막', kind: 'shield', power: 1.8, mana: 90 },
  },
  {
    id: 'sproutlizard', name: '새싹도마뱀', emoji: '🦎', element: 'grass', rarity: 'R', doctrine: 'growth',
    traits: ['beast', 'assassin'], base: { hp: 420, atk: 50, def: 18, spd: 12 },
    skill: { name: '광합성', desc: '같은 편 전체 공격력 +12% (전투 중 누적)', kind: 'buff', power: 0.12, mana: 80 },
    evolvesTo: 'vinedrake', flavor: '성장형 스타터. 시간이 지날수록 강해진다.',
  },
  {
    id: 'vinedrake', name: '덩굴드레이크', emoji: '🐉', element: 'grass', rarity: 'SR', unobtainable: true, doctrine: 'growth',
    traits: ['dragon', 'assassin'], base: { hp: 540, atk: 66, def: 22, spd: 13 },
    skill: { name: '숲의 맥동', desc: '같은 편 전체 공격력 +20% (전투 중 누적)', kind: 'buff', power: 0.2, mana: 80 },
  },

  // ════════════════ ⚔️ 돌격 (러시) ════════════════
  {
    id: 'sparkmouse', name: '찌릿쥐', emoji: '🐭', element: 'electric', rarity: 'N', doctrine: 'rush',
    traits: ['beast', 'assassin'], base: { hp: 300, atk: 44, def: 10, spd: 16 },
    skill: { name: '전광석화', desc: '적 하나에게 공격력 180% 피해', kind: 'damage', power: 1.8, mana: 70 },
    evolvesTo: 'thundermouse',
  },
  {
    id: 'thundermouse', name: '뇌전쥐', emoji: '⚡', element: 'electric', rarity: 'R', unobtainable: true, doctrine: 'rush',
    traits: ['beast', 'assassin'], base: { hp: 380, atk: 58, def: 14, spd: 18 },
    skill: { name: '십만 볼트', desc: '적 하나에게 공격력 260% 피해', kind: 'damage', power: 2.6, mana: 70 },
  },
  {
    id: 'shadowbat', name: '그림자박쥐', emoji: '🦇', element: 'dark', rarity: 'N', doctrine: 'rush',
    traits: ['beast', 'assassin'], base: { hp: 320, atk: 42, def: 12, spd: 17 },
    skill: { name: '흡혈 습격', desc: '적 하나에게 공격력 170% 피해', kind: 'damage', power: 1.7, mana: 80 },
  },
  {
    id: 'gearsoldier', name: '톱니병정', emoji: '🤖', element: 'electric', rarity: 'N', doctrine: 'rush',
    traits: ['machine', 'warrior'], base: { hp: 460, atk: 40, def: 22, spd: 10 },
    skill: { name: '회전 베기', desc: '적 하나에게 공격력 170% 피해', kind: 'damage', power: 1.7, mana: 90 },
  },
  {
    id: 'wildboar', name: '돌진멧돼지', emoji: '🐗', element: 'earth', rarity: 'N', doctrine: 'rush',
    traits: ['beast', 'warrior'], base: { hp: 480, atk: 42, def: 18, spd: 11 },
    skill: { name: '들이받기', desc: '적 하나에게 공격력 190% 피해', kind: 'damage', power: 1.9, mana: 90 },
  },
  {
    id: 'wolfalpha', name: '늑대 우두머리', emoji: '🐺', element: 'dark', rarity: 'R', doctrine: 'rush',
    traits: ['beast', 'warrior'], base: { hp: 500, atk: 50, def: 20, spd: 14 },
    skill: { name: '사냥의 포효', desc: '같은 편 전체 공격력 +18%', kind: 'buff', power: 0.18, mana: 60 },
  },
  {
    id: 'volcanodragon', name: '화산드래곤', emoji: '🌋', element: 'fire', rarity: 'SR', doctrine: 'rush',
    traits: ['dragon', 'warrior'], base: { hp: 700, atk: 60, def: 28, spd: 10 },
    skill: { name: '용암 브레스', desc: '적 하나에게 공격력 260% 피해', kind: 'damage', power: 2.6, mana: 90 },
  },
  {
    id: 'phoenix', name: '불사조', emoji: '🐦', element: 'fire', rarity: 'SSR', doctrine: 'rush',
    traits: ['spirit', 'warrior'], base: { hp: 640, atk: 78, def: 24, spd: 16 },
    skill: { name: '불새 강림', desc: '적 전체에게 공격력 130% 피해', kind: 'aoe', power: 1.3, mana: 80 },
  },
  {
    id: 'voidlord', name: '심연의 군주', emoji: '👁️', element: 'dark', rarity: 'UR', doctrine: 'rush',
    traits: ['dragon', 'assassin'], base: { hp: 820, atk: 98, def: 30, spd: 16 },
    skill: { name: '공허 절단', desc: '적 하나에게 공격력 400% 피해', kind: 'damage', power: 4.0, mana: 90 },
  },

  // ════════════════ 🌱 성장 (빌드업) ════════════════
  {
    id: 'mosswarrior', name: '이끼전사', emoji: '🌿', element: 'grass', rarity: 'N', doctrine: 'growth',
    traits: ['spirit', 'warrior'], base: { hp: 500, atk: 34, def: 22, spd: 9 },
    skill: { name: '대지의 일격', desc: '적 하나에게 공격력 180% 피해', kind: 'damage', power: 1.8, mana: 100 },
  },
  {
    id: 'workerbee', name: '꿀벌 일꾼', emoji: '🐝', element: 'grass', rarity: 'N', doctrine: 'growth',
    traits: ['beast', 'mage'], base: { hp: 340, atk: 34, def: 12, spd: 13 },
    skill: { name: '응원의 춤', desc: '같은 편 전체 공격력 +10% (누적)', kind: 'buff', power: 0.1, mana: 70 },
  },
  {
    id: 'ghostlamp', name: '유령등불', emoji: '🏮', element: 'dark', rarity: 'R', doctrine: 'growth',
    traits: ['spirit', 'mage'], base: { hp: 380, atk: 46, def: 14, spd: 10 },
    skill: { name: '저주의 불꽃', desc: '적 전체에게 공격력 60% 피해', kind: 'aoe', power: 0.6, mana: 90 },
  },
  {
    id: 'totem', name: '주술 토템', emoji: '🪵', element: 'earth', rarity: 'R', doctrine: 'growth',
    traits: ['spirit', 'guardian'], base: { hp: 560, atk: 36, def: 28, spd: 6 },
    skill: { name: '전쟁의 북', desc: '같은 편 전체 공격력 +15% (누적)', kind: 'buff', power: 0.15, mana: 80 },
  },
  {
    id: 'thunderbird', name: '천둥새', emoji: '🦅', element: 'electric', rarity: 'SR', doctrine: 'growth',
    traits: ['spirit', 'mage'], base: { hp: 480, atk: 60, def: 20, spd: 13 },
    skill: { name: '낙뢰', desc: '적 전체에게 공격력 90% 피해', kind: 'aoe', power: 0.9, mana: 100 },
  },
  {
    id: 'eldertree', name: '고대 나무', emoji: '🌳', element: 'grass', rarity: 'SR', doctrine: 'growth',
    traits: ['spirit', 'guardian'], base: { hp: 880, atk: 42, def: 34, spd: 6 },
    skill: { name: '세월의 축복', desc: '같은 편 전체 공격력 +22% (누적)', kind: 'buff', power: 0.22, mana: 90 },
  },
  {
    id: 'abyssserpent', name: '심해룡', emoji: '🐍', element: 'water', rarity: 'SSR', doctrine: 'growth',
    traits: ['dragon', 'mage'], base: { hp: 740, atk: 70, def: 28, spd: 11 },
    skill: { name: '심연의 소용돌이', desc: '적 전체에게 공격력 120% 피해', kind: 'aoe', power: 1.2, mana: 100 },
  },
  {
    id: 'worldtree', name: '세계수', emoji: '🌲', element: 'grass', rarity: 'UR', doctrine: 'growth',
    traits: ['dragon', 'mage'], base: { hp: 1050, atk: 70, def: 38, spd: 8 },
    skill: { name: '만물의 개화', desc: '같은 편 전체 공격력 +35% (누적)', kind: 'buff', power: 0.35, mana: 90 },
  },

  // ════════════════ 🏰 요새 (수비) ════════════════
  {
    id: 'pebblegolem', name: '조약돌골렘', emoji: '🪨', element: 'earth', rarity: 'N', doctrine: 'fortress',
    traits: ['machine', 'guardian'], base: { hp: 580, atk: 26, def: 38, spd: 5 },
    skill: { name: '단단해지기', desc: '같은 편 전체에게 공격력 100% 보호막', kind: 'shield', power: 1.0, mana: 100 },
  },
  {
    id: 'hedgehog', name: '가시고슴도치', emoji: '🦔', element: 'grass', rarity: 'N', doctrine: 'fortress',
    traits: ['beast', 'guardian'], base: { hp: 500, atk: 32, def: 40, spd: 8 },
    skill: { name: '가시 세우기', desc: '적 하나에게 공격력 160% 피해', kind: 'damage', power: 1.6, mana: 90 },
  },
  {
    id: 'lightpixie', name: '빛의요정', emoji: '🧚', element: 'light', rarity: 'R', doctrine: 'fortress',
    traits: ['spirit', 'mage'], base: { hp: 360, atk: 40, def: 16, spd: 11 },
    skill: { name: '치유의 빛', desc: '체력이 가장 낮은 아군을 공격력 260% 회복', kind: 'heal', power: 2.6, mana: 80 },
  },
  {
    id: 'crystalgolem', name: '수정골렘', emoji: '💎', element: 'light', rarity: 'R', doctrine: 'fortress',
    traits: ['machine', 'guardian'], base: { hp: 620, atk: 32, def: 42, spd: 6 },
    skill: { name: '수정 방벽', desc: '같은 편 전체에게 공격력 140% 보호막', kind: 'shield', power: 1.4, mana: 100 },
  },
  {
    id: 'irongiant', name: '강철거인', emoji: '🛡️', element: 'earth', rarity: 'SR', doctrine: 'fortress',
    traits: ['machine', 'guardian'], base: { hp: 920, atk: 36, def: 52, spd: 5 },
    skill: { name: '철벽', desc: '같은 편 전체에게 공격력 200% 보호막', kind: 'shield', power: 2.0, mana: 100 },
  },
  {
    id: 'citadelcrab', name: '성채게', emoji: '🦀', element: 'water', rarity: 'SSR', doctrine: 'fortress',
    traits: ['machine', 'warrior'], base: { hp: 1000, atk: 54, def: 56, spd: 7 },
    skill: { name: '집게 반격', desc: '적 하나에게 공격력 280% 피해', kind: 'damage', power: 2.8, mana: 90 },
  },
  {
    id: 'dawnwyrm', name: '여명의 수호룡', emoji: '🌅', element: 'light', rarity: 'UR', doctrine: 'fortress',
    traits: ['dragon', 'guardian'], base: { hp: 1150, atk: 72, def: 50, spd: 9 },
    skill: { name: '새벽의 가호', desc: '같은 편 전체에게 공격력 250% 보호막', kind: 'shield', power: 2.5, mana: 100 },
  },

  // ════════════════ 보스 (격파 시 포획 가능!) ════════════════
  {
    id: 'boss_golemking', name: '고대 골렘왕', emoji: '🗿', element: 'earth', rarity: 'SSR', boss: true, unobtainable: true, doctrine: 'fortress',
    traits: ['machine', 'guardian'], base: { hp: 2400, atk: 58, def: 42, spd: 6 },
    skill: { name: '대지 붕괴', desc: '적 전체에게 공격력 110% 피해', kind: 'aoe', power: 1.1, mana: 100 },
    flavor: '1장의 수문장. 단단한 요새형 — 성장(빌드업)으로 뚫어라.',
  },
  {
    id: 'boss_stormdragon', name: '폭풍의 제왕', emoji: '🌩️', element: 'electric', rarity: 'UR', boss: true, unobtainable: true, doctrine: 'growth',
    traits: ['dragon', 'mage'], base: { hp: 4400, atk: 80, def: 38, spd: 12 },
    skill: { name: '천벌', desc: '적 전체에게 공격력 140% 피해', kind: 'aoe', power: 1.4, mana: 90 },
    flavor: '1장의 최종 보스. 시간이 지날수록 강해진다 — 돌격으로 빨리 끊어라.',
  },
];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const getDef = (id: string): CardDef => {
  const d = CARD_MAP[id];
  if (!d) throw new Error(`unknown card ${id}`);
  return d;
};

export const STARTERS = ['emberfox', 'sproutlizard', 'bubbleturtle'];
/** 뽑기/상점/일반 적에 등장하는 카드 */
export const OBTAINABLE = CARDS.filter((c) => !c.unobtainable);
