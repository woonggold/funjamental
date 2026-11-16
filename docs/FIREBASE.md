# Firebase 연동 가이드 (Google 로그인 + 클라우드 세이브 + PvP)

코드는 이미 준비되어 있습니다. **환경변수만 넣으면** 자동으로 Firebase 모드로 바뀝니다.
환경변수가 없으면 로그인 없는 오프라인(게스트) 모드로 동작합니다.

## 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 에서 프로젝트 생성
2. **빌드 → Authentication → 시작하기 → 로그인 방법 → Google** 사용 설정
3. **Authentication → 설정 → 승인된 도메인**에 추가:
   - `woonggold.github.io` (GitHub Pages)
   - `localhost` (기본으로 있음)
4. **빌드 → Firestore Database → 데이터베이스 만들기** (프로덕션 모드)
5. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱(</>) 추가** → 나오는 `firebaseConfig` 값을 복사

## 2. 로컬 개발
```bash
cp .env.example .env.local
# .env.local 에 firebaseConfig 값 채우기
npm run dev
```

## 3. GitHub Pages 배포에 넣기
레포 **Settings → Secrets and variables → Actions → Variables 탭**에서 아래 변수를 추가:

| 이름 | firebaseConfig 키 |
|---|---|
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_APP_ID` | appId |
| `VITE_FIREBASE_STORAGE_BUCKET` | storageBucket (선택) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId (선택) |

> Firebase 웹 설정값은 원래 브라우저에 공개되는 값이라 비밀이 아닙니다. 보안은 `firestore.rules`가 담당합니다.

변수를 넣은 뒤 Actions 탭에서 **Deploy to GitHub Pages → Run workflow** 로 다시 배포하세요.

## 4. 보안 규칙 배포
```bash
npm i -g firebase-tools
firebase login
firebase use --add      # 만든 프로젝트 선택
firebase deploy --only firestore:rules
```

## 5. 데이터 구조
| 컬렉션 | 내용 | 권한 |
|---|---|---|
| `users/{uid}` | `{ save: SaveData, name, updatedAt }` | 본인만 읽기/쓰기 |
| `defenses/{uid}` | PvP 방어덱 `TeamSnapshot` (+rating) | 로그인 유저 읽기, 본인만 쓰기 |
| `matches/{id}` | `MatchRecord` (공격/방어 스냅샷, seed, 결과) | 공격자만 생성, 당사자만 읽기 |

## 6. 다음 단계 (치트 방지)
지금은 보석·소환·레이팅 계산을 클라이언트가 합니다. 친구끼리 테스트하기엔 충분하지만,
공개 서비스 전에는 **Cloud Functions**로 옮겨야 합니다:
- `pull` (소환): `src/core/gacha.ts`의 로직을 함수로 이전, 보석 차감도 서버에서
- `onMatchCreated`: `matches` 문서가 생기면 `simulatePvp(attacker, defender, seed)`를 서버에서 다시 돌려 결과 검증 → 양쪽 레이팅 갱신
  (전투 엔진이 결정론적이고 DOM 의존성이 없어서 `src/core`, `src/pvp`를 그대로 import 가능)
- 그 다음 `firestore.rules`에서 `users.save.gems` 등 민감 필드의 클라이언트 쓰기를 막기
