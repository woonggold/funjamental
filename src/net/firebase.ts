import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { normalizeSave, type SaveData } from '../core/save';
import { ghostOpponents } from '../pvp/ghosts';
import type { MatchRecord, TeamSnapshot } from '../pvp/snapshot';
import type { AuthUser, Backend } from './types';

// ─────────────────────────────────────────────
// Firebase 백엔드 (Google 로그인 + Firestore)
//
// Firestore 구조 (firestore.rules 참고):
//   users/{uid}       { save: SaveData, name, updatedAt }        ← 본인만 읽기/쓰기
//   defenses/{uid}    TeamSnapshot (+ rating)                      ← 로그인 유저 모두 읽기, 본인만 쓰기
//   matches/{autoId}  MatchRecord                                  ← 공격자 본인만 생성
//
// firebase SDK는 동적 import → 설정이 없으면 번들에서 로드되지 않는다.
// ─────────────────────────────────────────────

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export function firebaseConfigFromEnv(): FirebaseConfig | null {
  const e = import.meta.env;
  if (!e.VITE_FIREBASE_API_KEY || !e.VITE_FIREBASE_PROJECT_ID) return null;
  return {
    apiKey: e.VITE_FIREBASE_API_KEY,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || `${e.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: e.VITE_FIREBASE_PROJECT_ID,
    appId: e.VITE_FIREBASE_APP_ID ?? "",
    storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

const GUEST: AuthUser = { uid: 'guest', name: '게스트', isGuest: true };

export class FirebaseBackend implements Backend {
  readonly kind = 'firebase' as const;
  readonly canSignIn = true;
  private app!: FirebaseApp;
  private auth!: Auth;
  private db!: Firestore;
  private u: AuthUser = GUEST;
  private listeners: ((u: AuthUser) => void)[] = [];

  constructor(private cfg: FirebaseConfig) {}

  async init() {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    this.app = initializeApp(this.cfg);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    await new Promise<void>((resolve) => {
      let first = true;
      onAuthStateChanged(this.auth, (fu) => {
        this.u = fu ? { uid: fu.uid, name: fu.displayName ?? '트레이너', photoURL: fu.photoURL ?? undefined, isGuest: false } : GUEST;
        this.listeners.forEach((l) => l(this.u));
        if (first) { first = false; resolve(); }
      });
    });
  }

  user() { return this.u; }
  onAuthChange(cb: (u: AuthUser) => void) { this.listeners.push(cb); }

  async signIn() {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }
  async signOut() {
    const { signOut } = await import('firebase/auth');
    await signOut(this.auth);
  }

  async loadCloudSave(): Promise<SaveData | null> {
    if (this.u.isGuest) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(this.db, 'users', this.u.uid));
    return snap.exists() ? normalizeSave(snap.data().save) : null;
  }

  async writeCloudSave(s: SaveData) {
    if (this.u.isGuest) return;
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(doc(this.db, 'users', this.u.uid), { save: s, name: this.u.name, updatedAt: serverTimestamp() }, { merge: true });
  }

  async uploadDefense(s: TeamSnapshot) {
    if (this.u.isGuest) return;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(this.db, 'defenses', this.u.uid), { ...s, ownerId: this.u.uid, ownerName: this.u.name });
  }

  async findOpponents(rating: number, count: number): Promise<TeamSnapshot[]> {
    const real: TeamSnapshot[] = [];
    if (!this.u.isGuest) {
      try {
        const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
        const q = query(collection(this.db, 'defenses'), where('rating', '>=', rating - 250), where('rating', '<=', rating + 250), limit(30));
        const docs = await getDocs(q);
        docs.forEach((d) => { if (d.id !== this.u.uid) real.push(d.data() as TeamSnapshot); });
      } catch (e) { console.warn('상대 검색 실패, 봇으로 대체', e); }
    }
    real.sort(() => Math.random() - 0.5);
    const picked = real.slice(0, count);
    return picked.concat(ghostOpponents(rating, count - picked.length));
  }

  async reportMatch(m: MatchRecord) {
    if (this.u.isGuest || m.defender.bot) return;
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(this.db, 'matches'), { ...m, createdAt: serverTimestamp() });
  }
}
