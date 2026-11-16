# 🃏 카드 원정대 (funjamental)

포켓몬스터 · 증강체스 · 수집형 RPG · 스타크래프트에서 영감을 받은 **로그라이크 카드 수집 RPG** 웹 게임.

▶ **플레이**: https://woonggold.github.io/funjamental/

- 스타터를 고르고 원정을 떠나 상점에서 카드를 사고, 같은 카드 3장을 모아 ★승급·진화
- **전략 계열 3종**: ⚔️ 돌격(러시) ▶ 🌱 성장(빌드업) ▶ 🏰 요새(수비) ▶ ⚔️ 돌격 — 정찰하고 카운터를 짜라
- 이긴 적(보스 포함!)은 포획해서 도감에 영구 등록
- 픽업 배너·천장·일일 무료 소환이 있는 카드 소환, 중복은 각성
- 원정에서 만든 팀을 PvP 덱으로 등록해서 다른 유저와 비동기 대전 (레이팅)

## 실행

```bash
npm install
npm run dev
```

## 배포 (GitHub Pages)
`main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드·배포합니다 (`.github/workflows/deploy.yml`).
처음 한 번만: 레포 **Settings → Pages → Source를 "GitHub Actions"** 로 설정하세요.

## Google 로그인 / PvP 서버
Firebase 설정값을 넣으면 자동 활성화됩니다 → [docs/FIREBASE.md](docs/FIREBASE.md)

## 문서
- [게임 기획 초안](docs/GAME_DESIGN.md): 시스템 설명, 전략 상성, 코드 구조, 로드맵
- [Firebase 연동 가이드](docs/FIREBASE.md)
