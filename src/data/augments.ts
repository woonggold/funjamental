import type { Modifiers } from './types';
import type { RunState } from '../core/run';

// 증강체: 특정 스테이지 클리어 후 3개 중 1개 선택. 런 전체에 영구 적용.
export interface AugmentDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  tier: 'silver' | 'gold' | 'prism';
  /** 전투 시작 시 아군 전체에 붙는 보정 (팀 구성을 보고 조건부로 줄 수도 있음) */
  mods?: (run: RunState) => Partial<Modifiers>;
  /** 선택 즉시 1회 실행 */
  onPick?: (run: RunState) => void;
}

export const AUGMENTS: AugmentDef[] = [
  { id: 'iron_skin', name: '강철 피부', icon: '🧱', tier: 'silver', desc: '아군 방어력 +15',
    mods: () => ({ defFlat: 15 }) },
  { id: 'berserk', name: '광폭화', icon: '😡', tier: 'gold', desc: '아군 공격력 +20%',
    mods: () => ({ atkPct: 20 }) },
  { id: 'mana_spring', name: '마나의 샘', icon: '💧', tier: 'silver', desc: '시작 마나 +40',
    mods: () => ({ startMana: 40 }) },
  { id: 'investor', name: '투자의 귀재', icon: '📈', tier: 'silver', desc: '이자 한도 +3, 즉시 5골드',
    onPick: (r) => { r.interestCap += 3; r.gold += 5; } },
  { id: 'gold_hand', name: '황금 손', icon: '💰', tier: 'gold', desc: '즉시 15골드',
    onPick: (r) => { r.gold += 15; } },
  { id: 'catcher', name: '포획 전문가', icon: '🎯', tier: 'silver', desc: '전투 보상 선택지 +1',
    onPick: (r) => { r.rewardChoices += 1; } },
  { id: 'elite_few', name: '소수 정예', icon: '🗡️', tier: 'prism', desc: '출전 카드가 3장 이하면 체력·공격력 +40%',
    mods: (r) => (r.team.length <= 3 ? { hpPct: 40, atkPct: 40 } : {}) },
  { id: 'mono_element', name: '원소 공명', icon: '🌈', tier: 'gold', desc: '같은 속성 카드 3장 이상 출전 시 공격력 +30%',
    mods: (r) => {
      const counts: Record<string, number> = {};
      // 순환 import 방지를 위해 defId → element 변환은 run 쪽 헬퍼 사용
      for (const el of r.teamElements()) counts[el] = (counts[el] ?? 0) + 1;
      return Object.values(counts).some((c) => c >= 3) ? { atkPct: 30 } : {};
    } },
  { id: 'big_team', name: '대규모 원정', icon: '🏕️', tier: 'prism', desc: '최대 출전 인원 +1',
    onPick: (r) => { r.bonusTeamSize += 1; } },
  { id: 'sharp_eye', name: '예리한 눈', icon: '👁️', tier: 'silver', desc: '치명타 확률 +15%',
    mods: () => ({ critChance: 15 }) },
];

export const AUGMENT_MAP = Object.fromEntries(AUGMENTS.map((a) => [a.id, a]));
