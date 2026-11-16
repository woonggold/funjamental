import type { Doctrine, Modifiers } from './types';

// ─────────────────────────────────────────────
// 전략 계열 = 스타크래프트식 가위바위보
//
//        돌격(러시) ──이김──▶ 성장(빌드업)
//            ▲                     │
//           이김                   이김
//            │                     ▼
//        요새(수비) ◀──이김── (성장이 요새를 뚫음)
//
// 팀 전체에 깔리는 버프 + 런(원정) 운영 보너스를 같이 준다.
// ─────────────────────────────────────────────

export interface DoctrineDef {
  name: string;
  icon: string;
  color: string;
  /** 이 계열이 유리한 상대 */
  beats: Doctrine;
  tagline: string;
  /** 원정 운영 보너스 설명 (실제 효과는 core/run.ts) */
  runBonus: string[];
  tiers: { count: number; desc: string; mods: Partial<Modifiers> }[];
}

export const DOCTRINES: Record<Doctrine, DoctrineDef> = {
  rush: {
    name: '돌격', icon: '⚔️', color: '#ff6b5a', beats: 'growth',
    tagline: '4드론처럼 초반에 몰아친다. 빌드업이 끝나기 전에 끝낸다.',
    runBonus: ['연승 골드 +1', '연승 골드 +2'],
    tiers: [
      { count: 2, desc: '처음 3라운드 공격력 +35%, 속도 +3', mods: { rushAtkPct: 35, rushRounds: 3, spdFlat: 3 } },
      { count: 4, desc: '처음 4라운드 공격력 +70%, 치명타 +15%, 속도 +6', mods: { rushAtkPct: 70, rushRounds: 4, spdFlat: 6, critChance: 15 } },
    ],
  },
  growth: {
    name: '성장', icon: '🌱', color: '#5cd17a', beats: 'fortress',
    tagline: '버프를 깔고 버틴다. 시간이 지날수록 감당할 수 없게 된다.',
    runBonus: ['성장 카드: 스테이지 클리어마다 성장 +1', '성장 카드: 스테이지 클리어마다 성장 +2'],
    tiers: [
      { count: 2, desc: '체력 +25%, 매 라운드 공격력 +10% 누적, 방어 관통 25%', mods: { hpPct: 25, growthPct: 10, piercePct: 25 } },
      { count: 4, desc: '체력 +45%, 매 라운드 공격력 +18% 누적, 방어 관통 50%', mods: { hpPct: 45, growthPct: 18, piercePct: 50 } },
    ],
  },
  fortress: {
    name: '요새', icon: '🏰', color: '#5aa8ff', beats: 'rush',
    tagline: '방어를 쌓고 반사로 받아친다. 러시는 성벽에 부딪혀 무너진다.',
    runBonus: ['이자 한도 +1', '이자 한도 +3'],
    tiers: [
      { count: 2, desc: '받은 피해 10% 반사, 매 라운드 체력 4% 보호막', mods: { thornsPct: 10, shieldRegenPct: 4, defFlat: 10 } },
      { count: 4, desc: '받은 피해 20% 반사, 매 라운드 체력 6% 보호막', mods: { thornsPct: 20, shieldRegenPct: 6, defFlat: 20 } },
    ],
  },
};

export const DOCTRINE_IDS = Object.keys(DOCTRINES) as Doctrine[];
