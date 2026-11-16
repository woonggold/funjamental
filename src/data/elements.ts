import type { Element, Rarity } from './types';

export const ELEMENTS: Record<Element, { name: string; color: string }> = {
  fire:     { name: '불',   color: '#ef6b4a' },
  water:    { name: '물',   color: '#4a9bef' },
  grass:    { name: '풀',   color: '#5cc46a' },
  electric: { name: '전기', color: '#f2c94c' },
  earth:    { name: '땅',   color: '#b08a5a' },
  light:    { name: '빛',   color: '#f5e6a8' },
  dark:     { name: '어둠', color: '#8a6bbf' },
};

/** 상성표: attacker → 효과가 굉장한 대상들 (포켓몬식) */
const STRONG: Record<Element, Element[]> = {
  fire:     ['grass'],
  water:    ['fire', 'earth'],
  grass:    ['water', 'earth'],
  electric: ['water'],
  earth:    ['electric', 'fire'],
  light:    ['dark'],
  dark:     ['light'],
};

export function typeMultiplier(atk: Element, target: Element): number {
  if (STRONG[atk].includes(target)) return 1.5;
  if (STRONG[target].includes(atk) && atk !== 'light' && atk !== 'dark') return 0.75;
  return 1;
}

export const RARITY: Record<Rarity, { color: string; cost: number; order: number }> = {
  N:   { color: '#9aa4b2', cost: 1, order: 0 },
  R:   { color: '#4aa3ff', cost: 2, order: 1 },
  SR:  { color: '#b36bff', cost: 3, order: 2 },
  SSR: { color: '#ffb02e', cost: 4, order: 3 },
  UR:  { color: '#ff4f81', cost: 5, order: 4 },
};
