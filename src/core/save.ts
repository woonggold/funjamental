// 영구 데이터 (메타 진행). 지금은 localStorage, 나중에 서버로 교체하기 쉽게 한 곳에 모아둠.
export interface OwnedCard { count: number; level: number }
export interface SaveData {
  version: 1;
  gems: number;
  collection: Record<string, OwnedCard>;
  /** 최고 등급 확정까지 남은 횟수 (천장) */
  pity: number;
  starterChosen: boolean;
  bestStage: number;
  runs: number;
}

const KEY = 'funjamental.save.v1';

export const newSave = (): SaveData => ({
  version: 1, gems: 300, collection: {}, pity: 0, starterChosen: false, bestStage: 0, runs: 0,
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...newSave(), ...JSON.parse(raw) };
  } catch { /* 저장소 차단 등 */ }
  return newSave();
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** 카드 획득: 처음이면 도감 등록, 중복이면 각성 레벨업 (최대 5) */
export function addToCollection(s: SaveData, defId: string): { isNew: boolean; level: number } {
  const c = s.collection[defId];
  if (!c) { s.collection[defId] = { count: 1, level: 1 }; return { isNew: true, level: 1 }; }
  c.count++;
  c.level = Math.min(5, 1 + Math.floor((c.count - 1) / 2) );
  return { isNew: false, level: c.level };
}
