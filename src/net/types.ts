import type { SaveData } from '../core/save';
import type { MatchRecord, TeamSnapshot } from '../pvp/snapshot';

// ─────────────────────────────────────────────
// 백엔드 추상화. 게임 코드는 이 인터페이스만 안다.
//  - LocalBackend:    로그인 없음, localStorage + 봇 상대 (기본값, GitHub Pages에서 바로 동작)
//  - FirebaseBackend: Google 로그인 + Firestore (VITE_FIREBASE_* 환경변수가 있으면 자동 사용)
// 나중에 자체 서버로 바꿔도 이 인터페이스만 구현하면 된다.
// ─────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  name: string;
  photoURL?: string;
  isGuest: boolean;
}

export interface Backend {
  readonly kind: 'local' | 'firebase';
  /** 로그인 기능 사용 가능 여부 */
  readonly canSignIn: boolean;
  init(): Promise<void>;
  user(): AuthUser;
  onAuthChange(cb: (u: AuthUser) => void): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  /** 클라우드 세이브 (로그인 상태에서만 의미 있음) */
  loadCloudSave(): Promise<SaveData | null>;
  writeCloudSave(s: SaveData): Promise<void>;

  /** PvP: 내 덱을 방어덱으로 등록 → 다른 유저의 상대 목록에 노출 */
  uploadDefense(s: TeamSnapshot): Promise<void>;
  /** PvP: 레이팅 근처 상대 찾기 (부족하면 봇으로 채움) */
  findOpponents(rating: number, count: number): Promise<TeamSnapshot[]>;
  /** PvP: 매치 결과 기록 (서버 검증/방어자 레이팅 갱신은 Cloud Functions에서) */
  reportMatch(m: MatchRecord): Promise<void>;
}
