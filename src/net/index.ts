import { firebaseConfigFromEnv, FirebaseBackend } from './firebase';
import { LocalBackend } from './local';
import type { Backend } from './types';

export type { Backend, AuthUser } from './types';

/** VITE_FIREBASE_* 설정이 있으면 Firebase, 없으면 로컬(게스트) */
export async function createBackend(): Promise<Backend> {
  const cfg = firebaseConfigFromEnv();
  if (cfg) {
    try {
      const fb = new FirebaseBackend(cfg);
      await fb.init();
      return fb;
    } catch (e) {
      console.error('Firebase 초기화 실패 → 로컬 모드로 실행', e);
    }
  }
  const local = new LocalBackend();
  await local.init();
  return local;
}
