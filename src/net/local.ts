import type { SaveData } from '../core/save';
import { ghostOpponents } from '../pvp/ghosts';
import type { MatchRecord, TeamSnapshot } from '../pvp/snapshot';
import type { AuthUser, Backend } from './types';

const GUEST_KEY = 'funjamental.guestId';

function guestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) { id = `guest_${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem(GUEST_KEY, id); }
    return id;
  } catch { return 'guest_local'; }
}

/** 로그인 없는 오프라인 백엔드. 상대는 봇 */
export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  readonly canSignIn = false;
  private u: AuthUser = { uid: guestId(), name: '게스트', isGuest: true };

  async init() {}
  user() { return this.u; }
  onAuthChange(cb: (u: AuthUser) => void) { cb(this.u); }
  async signIn() { throw new Error('Firebase가 설정되지 않았습니다 (docs/FIREBASE.md 참고)'); }
  async signOut() {}
  async loadCloudSave(): Promise<SaveData | null> { return null; }
  async writeCloudSave() {}
  async uploadDefense(_s: TeamSnapshot) {}
  async findOpponents(rating: number, count: number) { return ghostOpponents(rating, count); }
  async reportMatch(_m: MatchRecord) {}
}
