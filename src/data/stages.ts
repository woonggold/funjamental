import type { Rarity } from './types';

// 1장(챕터) = 10 스테이지. 새 챕터는 이 배열을 늘리면 된다.
export interface StageDef {
  stage: number;
  name: string;
  type: 'battle' | 'elite' | 'boss';
  enemyCount: number;
  /** 적 1성 대비 스탯 배율 */
  power: number;
  /** 적 별 등급 */
  star: number;
  boss?: string;
}

export const CHAPTER_1: StageDef[] = [
  { stage: 1,  name: '풀숲 입구',    type: 'battle', enemyCount: 2, power: 0.8, star: 1 },
  { stage: 2,  name: '반딧불 숲',    type: 'battle', enemyCount: 3, power: 0.9, star: 1 },
  { stage: 3,  name: '이끼 동굴',    type: 'battle', enemyCount: 3, power: 1.0, star: 1 },
  { stage: 4,  name: '야수의 둥지',  type: 'elite',  enemyCount: 4, power: 1.1, star: 1 },
  { stage: 5,  name: '고대 유적',    type: 'boss',   enemyCount: 2, power: 1.0, star: 1, boss: 'boss_golemking' },
  { stage: 6,  name: '번개 평원',    type: 'battle', enemyCount: 4, power: 1.1, star: 2 },
  { stage: 7,  name: '구름 다리',    type: 'battle', enemyCount: 4, power: 1.2, star: 2 },
  { stage: 8,  name: '폭풍의 눈',    type: 'elite',  enemyCount: 5, power: 1.2, star: 2 },
  { stage: 9,  name: '천공 신전',    type: 'battle', enemyCount: 5, power: 1.3, star: 2 },
  { stage: 10, name: '폭풍 왕좌',    type: 'boss',   enemyCount: 3, power: 1.2, star: 2, boss: 'boss_stormdragon' },
];

/** 이 스테이지를 클리어하면 증강체 선택 */
export const AUGMENT_STAGES = [2, 5, 8];

/** 상점 등급 확률 (스테이지별). 합 100 */
export function shopOdds(stage: number): Record<Rarity, number> {
  if (stage <= 2) return { N: 70, R: 25, SR: 5, SSR: 0, UR: 0 };
  if (stage <= 5) return { N: 50, R: 33, SR: 15, SSR: 2, UR: 0 };
  if (stage <= 8) return { N: 30, R: 35, SR: 25, SSR: 9, UR: 1 };
  return { N: 20, R: 30, SR: 30, SSR: 16, UR: 4 };
}
