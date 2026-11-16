import type { CardDef } from './types';

// 카드 추가는 여기에 객체 하나만 추가하면 된다.
// base 스탯은 1성/각성 1 기준.
export const CARDS: CardDef[] = [
  // ── 스타터 (첫 실행 시 1마리 선택) ──
  {
    id: 'emberfox', name: '불씨여우', emoji: '🦊', element: 'fire', rarity: 'R',
    traits: ['beast', 'mage'], base: { hp: 420, atk: 48, def: 18, spd: 12 },
    skill: { name: '불꽃 세례', desc: '적 전체에게 공격력 70% 피해', kind: 'aoe', power: 0.7, mana: 100 },
    evolvesTo: 'blazefox',
  },
  {
    id: 'blazefox', name: '화염구미호', emoji: '🔥', element: 'fire', rarity: 'SR', unobtainable: true,
    traits: ['beast', 'mage'], base: { hp: 520, atk: 62, def: 22, spd: 13 },
    skill: { name: '구미호의 업화', desc: '적 전체에게 공격력 110% 피해', kind: 'aoe', power: 1.1, mana: 100 },
  },
  {
    id: 'bubbleturtle', name: '물방울거북', emoji: '🐢', element: 'water', rarity: 'R',
    traits: ['beast', 'guardian'], base: { hp: 620, atk: 32, def: 34, spd: 7 },
    skill: { name: '거품 방벽', desc: '아군 전체에게 공격력 120% 보호막', kind: 'shield', power: 1.2, mana: 100 },
    evolvesTo: 'tideturtle',
  },
  {
    id: 'tideturtle', name: '해일거북', emoji: '🌊', element: 'water', rarity: 'SR', unobtainable: true,
    traits: ['beast', 'guardian'], base: { hp: 800, atk: 40, def: 45, spd: 7 },
    skill: { name: '해일 장벽', desc: '아군 전체에게 공격력 180% 보호막', kind: 'shield', power: 1.8, mana: 90 },
  },
  {
    id: 'sproutlizard', name: '새싹도마뱀', emoji: '🦎', element: 'grass', rarity: 'R',
    traits: ['beast', 'assassin'], base: { hp: 400, atk: 55, def: 16, spd: 15 },
    skill: { name: '덩굴 채찍', desc: '적 하나에게 공격력 220% 피해', kind: 'damage', power: 2.2, mana: 100 },
    evolvesTo: 'vinedrake',
  },
  {
    id: 'vinedrake', name: '덩굴드레이크', emoji: '🐉', element: 'grass', rarity: 'SR', unobtainable: true,
    traits: ['dragon', 'assassin'], base: { hp: 520, atk: 70, def: 20, spd: 16 },
    skill: { name: '가시 폭풍', desc: '적 하나에게 공격력 320% 피해', kind: 'damage', power: 3.2, mana: 100 },
  },

  // ── 일반 풀 ──
  {
    id: 'sparkmouse', name: '찌릿쥐', emoji: '🐭', element: 'electric', rarity: 'N',
    traits: ['beast', 'assassin'], base: { hp: 300, atk: 42, def: 10, spd: 16 },
    skill: { name: '전광석화', desc: '적 하나에게 공격력 180% 피해', kind: 'damage', power: 1.8, mana: 80 },
    evolvesTo: 'thundermouse',
  },
  {
    id: 'thundermouse', name: '뇌전쥐', emoji: '⚡', element: 'electric', rarity: 'R', unobtainable: true,
    traits: ['beast', 'assassin'], base: { hp: 380, atk: 56, def: 14, spd: 18 },
    skill: { name: '십만 볼트', desc: '적 하나에게 공격력 260% 피해', kind: 'damage', power: 2.6, mana: 80 },
  },
  {
    id: 'pebblegolem', name: '조약돌골렘', emoji: '🪨', element: 'earth', rarity: 'N',
    traits: ['machine', 'guardian'], base: { hp: 560, atk: 26, def: 36, spd: 5 },
    skill: { name: '단단해지기', desc: '아군 전체에게 공격력 100% 보호막', kind: 'shield', power: 1.0, mana: 100 },
  },
  {
    id: 'gearsoldier', name: '톱니병정', emoji: '🤖', element: 'electric', rarity: 'N',
    traits: ['machine', 'warrior'], base: { hp: 460, atk: 38, def: 24, spd: 9 },
    skill: { name: '회전 베기', desc: '적 하나에게 공격력 170% 피해', kind: 'damage', power: 1.7, mana: 100 },
  },
  {
    id: 'shadowbat', name: '그림자박쥐', emoji: '🦇', element: 'dark', rarity: 'N',
    traits: ['beast', 'assassin'], base: { hp: 320, atk: 40, def: 12, spd: 17 },
    skill: { name: '흡혈 습격', desc: '적 하나에게 공격력 170% 피해', kind: 'damage', power: 1.7, mana: 90 },
  },
  {
    id: 'lightpixie', name: '빛의요정', emoji: '🧚', element: 'light', rarity: 'R',
    traits: ['spirit', 'mage'], base: { hp: 340, atk: 40, def: 14, spd: 11 },
    skill: { name: '치유의 빛', desc: '체력이 가장 낮은 아군을 공격력 250% 회복', kind: 'heal', power: 2.5, mana: 90 },
  },
  {
    id: 'ghostlamp', name: '유령등불', emoji: '🏮', element: 'dark', rarity: 'R',
    traits: ['spirit', 'mage'], base: { hp: 360, atk: 46, def: 14, spd: 10 },
    skill: { name: '저주의 불꽃', desc: '적 전체에게 공격력 60% 피해', kind: 'aoe', power: 0.6, mana: 90 },
  },
  {
    id: 'mosswarrior', name: '이끼전사', emoji: '🌿', element: 'grass', rarity: 'N',
    traits: ['spirit', 'warrior'], base: { hp: 480, atk: 36, def: 22, spd: 9 },
    skill: { name: '대지의 일격', desc: '적 하나에게 공격력 180% 피해', kind: 'damage', power: 1.8, mana: 100 },
  },
  {
    id: 'thunderbird', name: '천둥새', emoji: '🦅', element: 'electric', rarity: 'SR',
    traits: ['spirit', 'mage'], base: { hp: 460, atk: 60, def: 20, spd: 14 },
    skill: { name: '낙뢰', desc: '적 전체에게 공격력 90% 피해', kind: 'aoe', power: 0.9, mana: 100 },
  },
  {
    id: 'volcanodragon', name: '화산드래곤', emoji: '🌋', element: 'fire', rarity: 'SR',
    traits: ['dragon', 'warrior'], base: { hp: 700, atk: 58, def: 30, spd: 9 },
    skill: { name: '용암 브레스', desc: '적 하나에게 공격력 260% 피해', kind: 'damage', power: 2.6, mana: 100 },
  },
  {
    id: 'irongiant', name: '강철거인', emoji: '🛡️', element: 'earth', rarity: 'SR',
    traits: ['machine', 'guardian'], base: { hp: 900, atk: 36, def: 50, spd: 5 },
    skill: { name: '철벽', desc: '아군 전체에게 공격력 200% 보호막', kind: 'shield', power: 2.0, mana: 100 },
  },
  {
    id: 'abyssserpent', name: '심해룡', emoji: '🐍', element: 'water', rarity: 'SSR',
    traits: ['dragon', 'mage'], base: { hp: 720, atk: 70, def: 28, spd: 12 },
    skill: { name: '심연의 소용돌이', desc: '적 전체에게 공격력 120% 피해', kind: 'aoe', power: 1.2, mana: 100 },
  },
  {
    id: 'dawnwyrm', name: '여명의 수호룡', emoji: '🌅', element: 'light', rarity: 'UR',
    traits: ['dragon', 'guardian'], base: { hp: 1100, atk: 72, def: 48, spd: 10 },
    skill: { name: '새벽의 가호', desc: '아군 전체에게 공격력 250% 보호막', kind: 'shield', power: 2.5, mana: 100 },
  },
  {
    id: 'voidlord', name: '심연의 군주', emoji: '👁️', element: 'dark', rarity: 'UR',
    traits: ['dragon', 'assassin'], base: { hp: 820, atk: 95, def: 30, spd: 15 },
    skill: { name: '공허 절단', desc: '적 하나에게 공격력 400% 피해', kind: 'damage', power: 4.0, mana: 100 },
  },

  // ── 보스 (격파 시 포획 가능!) ──
  {
    id: 'boss_golemking', name: '고대 골렘왕', emoji: '🗿', element: 'earth', rarity: 'SSR', boss: true, unobtainable: true,
    traits: ['machine', 'guardian'], base: { hp: 2600, atk: 60, def: 45, spd: 6 },
    skill: { name: '대지 붕괴', desc: '적 전체에게 공격력 110% 피해', kind: 'aoe', power: 1.1, mana: 100 },
    flavor: '1장의 수문장. 쓰러뜨리면 동료로 삼을 수 있다.',
  },
  {
    id: 'boss_stormdragon', name: '폭풍의 제왕', emoji: '🌩️', element: 'electric', rarity: 'UR', boss: true, unobtainable: true,
    traits: ['dragon', 'mage'], base: { hp: 4800, atk: 85, def: 40, spd: 12 },
    skill: { name: '천벌', desc: '적 전체에게 공격력 140% 피해', kind: 'aoe', power: 1.4, mana: 90 },
    flavor: '1장의 최종 보스.',
  },
];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const getDef = (id: string): CardDef => {
  const d = CARD_MAP[id];
  if (!d) throw new Error(`unknown card ${id}`);
  return d;
};

export const STARTERS = ['emberfox', 'bubbleturtle', 'sproutlizard'];
/** 뽑기/상점/일반 적에 등장하는 카드 */
export const OBTAINABLE = CARDS.filter((c) => !c.unobtainable);
