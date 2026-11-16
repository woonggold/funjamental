// ─────────────────────────────────────────────
// 게임 전체에서 쓰는 핵심 타입 정의
// ─────────────────────────────────────────────

export type Element = 'fire' | 'water' | 'grass' | 'electric' | 'earth' | 'light' | 'dark';
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type TraitId =
  // 종족
  | 'beast' | 'dragon' | 'spirit' | 'machine'
  // 직업
  | 'warrior' | 'mage' | 'guardian' | 'assassin';

export type SkillKind = 'damage' | 'aoe' | 'heal' | 'shield';

export interface SkillDef {
  name: string;
  desc: string;
  kind: SkillKind;
  /** 공격력 대비 배율 */
  power: number;
  /** 시전에 필요한 마나 (기본 100) */
  mana: number;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

/** 카드 "원본" 정의 (도감 데이터) */
export interface CardDef {
  id: string;
  name: string;
  emoji: string;
  element: Element;
  rarity: Rarity;
  traits: TraitId[];
  base: Stats;
  skill: SkillDef;
  /** 별 승급 시 진화하는 카드 id (포켓몬식 진화) */
  evolvesTo?: string;
  /** 뽑기/상점에 등장하지 않음 (진화형, 보스 등) */
  unobtainable?: boolean;
  boss?: boolean;
  flavor?: string;
}

/** 실제 보유 중인 카드 한 장 (런 안에서 사용) */
export interface CardInstance {
  uid: string;
  defId: string;
  /** 1~3성. 같은 카드 3장 = 1단계 승급 (증강체스식) */
  star: number;
  /** 컬렉션 각성 레벨 (뽑기 중복으로 상승) */
  level: number;
}

/** 전투 시 스탯에 붙는 보정치. 시너지/증강체가 이걸 만들어낸다 */
export interface Modifiers {
  hpPct: number;
  atkPct: number;
  defFlat: number;
  spdFlat: number;
  startMana: number;
  skillPowerPct: number;
  shieldPct: number;
  critChance: number;
}

export const emptyMods = (): Modifiers => ({
  hpPct: 0, atkPct: 0, defFlat: 0, spdFlat: 0,
  startMana: 0, skillPowerPct: 0, shieldPct: 0, critChance: 0,
});

export function addMods(a: Modifiers, b: Partial<Modifiers>): Modifiers {
  const r = { ...a };
  for (const k of Object.keys(b) as (keyof Modifiers)[]) r[k] += b[k] ?? 0;
  return r;
}
