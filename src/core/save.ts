import type { TeamSnapshot } from '../pvp/snapshot';

// ─────────────────────────────────────────────
// 영구 데이터 (메타 진행).
// 로컬(localStorage)에 항상 저장하고, 로그인하면 net/ 백엔드가 클라우드(Firestore)에 동기화한다.
// ─────────────────────────────────────────────

export interface OwnedCard { count: number; level: number }

export interface PvpData {
  rating: number;
  wins: number;
  losses: number;
  /** 내가 등록한 PvP 덱 (다른 유저가 이 덱과 싸운다) */
  deck: TeamSnapshot | null;
}

export interface SaveData {
  version: 2;
  /** 마지막 수정 시각 (클라우드 동기화 시 최신본 판별) */
  updatedAt: number;
  gems: number;
  collection: Record<string, OwnedCard>;
  /** 최고 등급 확정까지 쌓인 횟수 (천장) */
  pity: number;
  /** 픽업 배너에서 픽업 실패 후 다음 최고등급 픽업 확정 여부 (반천장) */
  pickupGuarantee: boolean;
  /** 마지막 무료 소환 날짜 (YYYY-MM-DD) */
  lastFreePull: string;
  /** 최근 소환 기록 (최신이 앞) */
  history: { defId: string; at: number; banner: string }[];
  starterChosen: boolean;
  bestStage: number;
  runs: number;
  pvp: PvpData;
}

const KEY = 'funjamental.save.v2';

export const newSave = (): SaveData => ({
  version: 2, updatedAt: 0, gems: 300, collection: {}, pity: 0, pickupGuarantee: false, lastFreePull: '',
  history: [], starterChosen: false, bestStage: 0, runs: 0,
  pvp: { rating: 1000, wins: 0, losses: 0, deck: null },
});

/** 누락 필드 채우기 (구버전/클라우드 데이터 대응) */
export function normalizeSave(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = newSave();
  if (!raw) return base;
  return { ...base, ...raw, version: 2, pvp: { ...base.pvp, ...(raw.pvp ?? {}) } };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem('funjamental.save.v1');
    if (raw) return normalizeSave(JSON.parse(raw));
  } catch { /* 저장소 차단 등 */ }
  return newSave();
}

export function writeSave(s: SaveData) {
  s.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); localStorage.removeItem('funjamental.save.v1'); } catch { /* ignore */ }
}

/** 카드 획득: 처음이면 도감 등록, 중복이면 각성 레벨업 (2장마다 +1, 최대 5) */
export function addToCollection(s: SaveData, defId: string): { isNew: boolean; level: number } {
  const c = s.collection[defId];
  if (!c) { s.collection[defId] = { count: 1, level: 1 }; return { isNew: true, level: 1 }; }
  c.count++;
  c.level = Math.min(5, 1 + Math.floor((c.count - 1) / 2));
  return { isNew: false, level: c.level };
}
