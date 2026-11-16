import type { Modifiers, TraitId } from './types';

// 증강체스식 시너지: 서로 다른 카드 N종이 같은 특성을 가지면 발동
export interface TraitDef {
  name: string;
  kind: '종족' | '직업';
  tiers: { count: number; desc: string; mods: Partial<Modifiers> }[];
}

export const TRAITS: Record<TraitId, TraitDef> = {
  beast: { name: '야수', kind: '종족', tiers: [
    { count: 2, desc: '아군 공격력 +15%', mods: { atkPct: 15 } },
    { count: 4, desc: '아군 공격력 +35%', mods: { atkPct: 35 } },
  ] },
  dragon: { name: '용족', kind: '종족', tiers: [
    { count: 2, desc: '아군 체력 +20%', mods: { hpPct: 20 } },
    { count: 3, desc: '아군 체력 +40%, 공격력 +10%', mods: { hpPct: 40, atkPct: 10 } },
  ] },
  spirit: { name: '정령', kind: '종족', tiers: [
    { count: 2, desc: '시작 마나 +30', mods: { startMana: 30 } },
    { count: 3, desc: '시작 마나 +60', mods: { startMana: 60 } },
  ] },
  machine: { name: '기계', kind: '종족', tiers: [
    { count: 2, desc: '아군 방어력 +20', mods: { defFlat: 20 } },
    { count: 3, desc: '아군 방어력 +45', mods: { defFlat: 45 } },
  ] },
  warrior: { name: '전사', kind: '직업', tiers: [
    { count: 2, desc: '체력 +15%, 공격력 +10%', mods: { hpPct: 15, atkPct: 10 } },
  ] },
  mage: { name: '마법사', kind: '직업', tiers: [
    { count: 2, desc: '스킬 위력 +25%', mods: { skillPowerPct: 25 } },
    { count: 4, desc: '스킬 위력 +60%', mods: { skillPowerPct: 60 } },
  ] },
  guardian: { name: '수호자', kind: '직업', tiers: [
    { count: 2, desc: '전투 시작 시 최대 체력 15% 보호막', mods: { shieldPct: 15 } },
    { count: 3, desc: '전투 시작 시 최대 체력 30% 보호막', mods: { shieldPct: 30 } },
  ] },
  assassin: { name: '암살자', kind: '직업', tiers: [
    { count: 2, desc: '치명타 확률 +25% (암살자는 후열 우선 공격)', mods: { critChance: 25 } },
    { count: 3, desc: '치명타 확률 +45%', mods: { critChance: 45 } },
  ] },
};
