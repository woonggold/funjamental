import { AUGMENT_MAP } from '../data/augments';
import { CARDS, getDef, OBTAINABLE, STARTERS } from '../data/cards';
import { DOCTRINES } from '../data/doctrines';
import { RARITY } from '../data/elements';
import { AUGMENT_STAGES, CHAPTER_1 } from '../data/stages';
import type { BattleResult } from '../core/battle';
import {
  canFreePull, currentBanners, GACHA_10_COST, GACHA_COST, GACHA_RATES, PITY_MAX, pull, type PullKind, type PullResult,
} from '../core/gacha';
import { MAX_BENCH, REROLL_COST, RunState } from '../core/run';
import { addToCollection, loadSave, normalizeSave, resetSave, writeSave, type SaveData } from '../core/save';
import { sellValue } from '../core/stats';
import { countDoctrines, countTraits, mainDoctrine } from '../core/synergy';
import type { AuthUser, Backend } from '../net';
import { eloDelta, makeSnapshot, matchSeed, simulatePvp, toInstances, type TeamSnapshot } from '../pvp/snapshot';
import { cardView, counterOf, doctrineList, esc, hpBar, matchupText, traitList } from './components';

type Screen = 'starter' | 'home' | 'collection' | 'gacha' | 'setup' | 'run' | 'arena';

interface PvpState {
  opponents: TeamSnapshot[] | null;
  loading: boolean;
  /** 진행 중/끝난 매치 */
  match?: { opp: TeamSnapshot; res: BattleResult; delta: number; gems: number; resolved: boolean };
}

export class App {
  save: SaveData = loadSave();
  user: AuthUser;
  screen: Screen = this.save.starterChosen ? 'home' : 'starter';
  run?: RunState;
  bannerIdx = 0;
  gachaResult: PullResult[] = [];
  showHistory = false;
  setupPicks: string[] = [];
  toast = '';
  /** 현재 재생 중인 전투 (원정/PvP 공용) */
  playing?: BattleResult;
  battleIdx = 0;
  battleTimer?: number;
  endSummary?: { gems: number; stagesCleared: number; newCards: string[]; deckSaved: boolean };
  pvp: PvpState = { opponents: null, loading: false };
  private cloudTimer?: number;

  constructor(private root: HTMLElement, private backend: Backend) {
    this.user = backend.user();
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || !el.dataset.act) return;
      void this.handle(el.dataset.act, el.dataset.arg ?? '');
    });
    backend.onAuthChange((u) => {
      const changed = u.uid !== this.user.uid;
      this.user = u;
      if (changed && !u.isGuest) void this.syncFromCloud();
      this.render();
    });
    if (!this.user.isGuest) void this.syncFromCloud();
    this.render();
  }

  // ─────────────────────────── 저장/동기화
  persist() {
    writeSave(this.save);
    if (this.user.isGuest) return;
    clearTimeout(this.cloudTimer);
    this.cloudTimer = window.setTimeout(() => {
      this.backend.writeCloudSave(this.save).catch((e) => console.warn('클라우드 저장 실패', e));
    }, 1500);
  }

  /** 로그인 시: 클라우드가 더 최신이면 가져오고, 아니면 로컬을 올린다 */
  async syncFromCloud() {
    try {
      const cloud = await this.backend.loadCloudSave();
      if (cloud && cloud.updatedAt > this.save.updatedAt) {
        this.save = normalizeSave(cloud);
        writeSave(this.save);
        this.screen = this.save.starterChosen ? 'home' : 'starter';
        this.flash('☁️ 클라우드 세이브를 불러왔습니다');
      } else {
        await this.backend.writeCloudSave(this.save);
      }
    } catch (e) {
      console.warn(e);
      this.flash('클라우드 동기화 실패 (로컬 저장은 정상)');
    }
    this.render();
  }

  flash(msg: string) {
    this.toast = msg;
    this.render();
    setTimeout(() => { if (this.toast === msg) { this.toast = ''; this.render(); } }, 2000);
  }

  // ─────────────────────────── 액션 처리
  async handle(act: string, arg: string) {
    const run = this.run;
    switch (act) {
      // ── 계정
      case 'signIn':
        try { await this.backend.signIn(); } catch (e) { this.flash(String((e as Error).message ?? e)); }
        break;
      case 'signOut': await this.backend.signOut(); break;

      // ── 기지
      case 'chooseStarter':
        addToCollection(this.save, arg);
        this.save.starterChosen = true;
        this.persist();
        this.screen = 'home';
        break;
      case 'go':
        this.screen = arg as Screen;
        if (arg === 'setup') this.setupPicks = [];
        if (arg === 'gacha') this.gachaResult = [];
        if (arg === 'arena' && !this.pvp.opponents) void this.findOpponents();
        break;
      case 'reset':
        if (confirm('이 기기의 세이브를 초기화할까요?')) {
          resetSave(); this.save = loadSave(); this.screen = 'starter'; this.run = undefined;
        }
        break;

      // ── 소환
      case 'banner': this.bannerIdx = +arg; this.gachaResult = []; break;
      case 'pull': {
        const banner = currentBanners()[this.bannerIdx];
        const r = pull(this.save, banner, arg as PullKind);
        if (typeof r === 'string') { this.flash(r); break; }
        this.gachaResult = r;
        this.persist();
        break;
      }
      case 'history': this.showHistory = !this.showHistory; break;

      // ── 원정 준비
      case 'setupToggle': {
        const i = this.setupPicks.indexOf(arg);
        if (i >= 0) this.setupPicks.splice(i, 1);
        else if (this.setupPicks.length < 3) this.setupPicks.push(arg);
        else this.flash('최대 3장까지 데려갈 수 있습니다');
        break;
      }
      case 'startRun':
        if (!this.setupPicks.length) { this.flash('최소 1장을 골라주세요'); break; }
        this.run = new RunState(this.save, this.setupPicks);
        this.save.runs++; this.persist();
        this.endSummary = undefined;
        this.screen = 'run';
        break;

      // ── 원정 내부
      case 'buy': if (run && !run.buy(+arg)) this.flash('골드가 부족하거나 대기석이 가득 찼습니다'); break;
      case 'reroll': if (run && !run.reroll()) this.flash('골드가 부족합니다'); break;
      case 'toggle': if (run && !run.toggleTeam(arg)) this.flash(`출전 인원 초과 (최대 ${run.maxTeamSize})`); break;
      case 'left': run?.moveInTeam(arg, -1); break;
      case 'right': run?.moveInTeam(arg, 1); break;
      case 'sell': run?.sell(arg); break;
      case 'fight': {
        const res = run?.fight();
        if (!res) { this.flash('출전 카드가 없습니다'); break; }
        this.startPlayback(res);
        break;
      }
      case 'skip': this.stopPlayback(true); break;
      case 'afterBattle': this.playing = undefined; run?.resolveBattle(); if (run?.phase === 'over') this.endRun(); break;
      case 'reward': run?.pickReward(+arg); if (run?.phase === 'over') this.endRun(); break;
      case 'augment': run?.pickAugment(arg); if (run?.phase === 'over') this.endRun(); break;
      case 'giveUp': if (run && confirm('원정을 포기할까요?')) { run.phase = 'over'; this.endRun(); } break;
      case 'saveDeck': await this.registerDeck(); break;
      case 'leaveRun': this.run = undefined; this.endSummary = undefined; this.screen = 'home'; break;

      // ── PvP
      case 'findOpp': await this.findOpponents(); break;
      case 'challenge': this.challenge(+arg); break;
      case 'pvpDone': await this.resolvePvp(); break;
      case 'pvpBack': this.pvp.match = undefined; this.playing = undefined; break;
    }
    this.render();
  }

  endRun() {
    const run = this.run!;
    const { gems, stagesCleared } = run.rewardsOnEnd();
    const newCards: string[] = [];
    for (const id of run.captured) if (addToCollection(this.save, id).isNew) newCards.push(id);
    this.save.gems += gems;
    this.save.bestStage = Math.max(this.save.bestStage, stagesCleared);
    this.persist();
    this.endSummary = { gems, stagesCleared, newCards, deckSaved: false };
  }

  // ─────────────────────────── PvP
  async registerDeck() {
    const run = this.run;
    if (!run || !run.team.length) { this.flash('등록할 팀이 없습니다'); return; }
    const snap = makeSnapshot(run.team, run.augments, { id: this.user.uid, name: this.user.name }, this.save.pvp.rating);
    this.save.pvp.deck = snap;
    this.persist();
    if (this.endSummary) this.endSummary.deckSaved = true;
    try { await this.backend.uploadDefense(snap); } catch (e) { console.warn(e); }
    this.flash('⚔️ PvP 덱으로 등록했습니다');
  }

  async findOpponents() {
    this.pvp.loading = true;
    this.render();
    try { this.pvp.opponents = await this.backend.findOpponents(this.save.pvp.rating, 3); }
    catch (e) { console.warn(e); this.flash('상대를 찾지 못했습니다'); }
    this.pvp.loading = false;
    this.render();
  }

  challenge(i: number) {
    const me = this.save.pvp.deck;
    const opp = this.pvp.opponents?.[i];
    if (!me || !opp) { this.flash('먼저 원정을 마치고 PvP 덱을 등록하세요'); return; }
    const at = Date.now();
    const seed = matchSeed(this.user.uid, opp.ownerId, at);
    const res = simulatePvp(me, opp, seed);
    const delta = eloDelta(this.save.pvp.rating, opp.rating, res.win);
    this.pvp.match = { opp, res, delta, gems: res.win ? 15 : 3, resolved: false };
    void this.backend.reportMatch({
      attackerId: this.user.uid, defenderId: opp.ownerId, seed, at, win: res.win, ratingDelta: delta, attacker: me, defender: opp,
    }).catch((e) => console.warn(e));
    this.startPlayback(res);
  }

  async resolvePvp() {
    const m = this.pvp.match;
    if (!m || m.resolved) return;
    m.resolved = true;
    this.stopPlayback(true);
    const p = this.save.pvp;
    p.rating = Math.max(0, p.rating + m.delta);
    if (m.res.win) p.wins++; else p.losses++;
    this.save.gems += m.gems;
    if (p.deck) {
      p.deck.rating = p.rating;
      void this.backend.uploadDefense(p.deck).catch(() => {});
    }
    this.persist();
    this.pvp.opponents = null;
    void this.findOpponents();
  }

  // ─────────────────────────── 전투 재생 (공용)
  startPlayback(res: BattleResult) {
    this.playing = res;
    this.battleIdx = 0;
    clearInterval(this.battleTimer);
    this.battleTimer = window.setInterval(() => {
      const ev = this.playing?.events;
      if (!ev || this.battleIdx >= ev.length - 1) return this.stopPlayback(false);
      this.battleIdx++;
      this.render();
    }, 240);
  }
  stopPlayback(jump: boolean) {
    clearInterval(this.battleTimer);
    this.battleTimer = undefined;
    if (jump && this.playing) this.battleIdx = this.playing.events.length - 1;
    this.render();
  }

  // ─────────────────────────── 렌더링
  render() {
    const views: Record<Screen, () => string> = {
      starter: () => this.vStarter(),
      home: () => this.vHome(),
      collection: () => this.vCollection(),
      gacha: () => this.vGacha(),
      setup: () => this.vSetup(),
      run: () => this.vRun(),
      arena: () => this.vArena(),
    };
    const inRun = this.screen === 'run' && this.run;
    this.root.innerHTML = `
      <header>
        <div class="logo" ${inRun ? '' : 'data-act="go" data-arg="home"'}>🃏 카드 원정대</div>
        <div class="res">
          💎 ${this.save.gems}${inRun ? ` · 💰 ${this.run!.gold} · ❤️ ${this.run!.life}` : ''}
          ${this.vAccount()}
        </div>
      </header>
      <main>${views[this.screen]()}</main>
      ${this.toast ? `<div class="toast">${esc(this.toast)}</div>` : ''}`;
    const log = this.root.querySelector('.battlelog');
    if (log) log.scrollTop = log.scrollHeight;
  }

  vAccount() {
    if (!this.backend.canSignIn) return `<span class="acct muted" title="Firebase 설정 시 Google 로그인 활성화">👤 게스트</span>`;
    if (this.user.isGuest) return `<button class="acct" data-act="signIn">G Google 로그인</button>`;
    return `<span class="acct">${this.user.photoURL ? `<img src="${esc(this.user.photoURL)}" alt="">` : '👤'} ${esc(this.user.name)}
      <button class="link" data-act="signOut">로그아웃</button></span>`;
  }

  vStarter() {
    return `<section class="center">
      <h1>함께 모험을 떠날 첫 파트너를 골라주세요</h1>
      <p class="muted">스타터마다 <b>전략</b>이 다릅니다. 같은 카드 3장을 모으면 ★승급하면서 <b>진화</b>합니다.</p>
      <div class="row">${STARTERS.map((id) => {
        const d = DOCTRINES[getDef(id).doctrine];
        return `<div class="starter-pick">${cardView(id, { act: 'chooseStarter', arg: id, footer: '이 카드로 시작' })}
          <div class="muted small" style="color:${d.color}">${d.icon} ${d.name}: ${esc(d.tagline)}</div></div>`;
      }).join('')}</div>
      ${this.vTriangle()}
    </section>`;
  }

  /** 상성 삼각형 안내 */
  vTriangle() {
    return `<div class="triangle">
      <span style="color:${DOCTRINES.rush.color}">⚔️ 돌격</span> ▶ 이김 ▶
      <span style="color:${DOCTRINES.growth.color}">🌱 성장</span> ▶ 이김 ▶
      <span style="color:${DOCTRINES.fortress.color}">🏰 요새</span> ▶ 이김 ▶
      <span style="color:${DOCTRINES.rush.color}">⚔️ 돌격</span>
    </div>`;
  }

  vHome() {
    const owned = Object.keys(this.save.collection).length;
    const free = canFreePull(this.save);
    return `<section class="center">
      <h1>원정 기지</h1>
      <div class="menu">
        <button class="big primary" data-act="go" data-arg="setup">⚔️ 원정 출발<small>1장 · 10 스테이지</small></button>
        <button class="big ${free ? 'badge' : ''}" data-act="go" data-arg="gacha">✨ 카드 소환<small>${free ? '무료 소환 가능!' : `보석 ${GACHA_COST}`}</small></button>
        <button class="big" data-act="go" data-arg="arena">🏟️ PvP 아레나<small>레이팅 ${this.save.pvp.rating}</small></button>
        <button class="big" data-act="go" data-arg="collection">📖 도감<small>${owned} / ${CARDS.length}</small></button>
      </div>
      ${this.vTriangle()}
      <p class="muted">최고 기록: ${this.save.bestStage} 스테이지 · 원정 ${this.save.runs}회 · PvP ${this.save.pvp.wins}승 ${this.save.pvp.losses}패</p>
      <button class="link" data-act="reset">세이브 초기화</button>
    </section>`;
  }

  vCollection() {
    const list = [...CARDS].sort((a, b) => a.doctrine.localeCompare(b.doctrine) || RARITY[a.rarity].order - RARITY[b.rarity].order);
    return `<section>
      <div class="bar"><h2>📖 도감</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <p class="muted">중복 획득 시 각성 레벨 상승(최대 +4, 레벨당 스탯 +6%). 보스·진화형은 원정에서만 얻을 수 있습니다.</p>
      <div class="grid">${list.map((c) => {
        const o = this.save.collection[c.id];
        return o ? cardView(c.id, { level: o.level, footer: `보유 ${o.count}장` }) : cardView(c.id, { locked: true });
      }).join('')}</div>
    </section>`;
  }

  vGacha() {
    const banners = currentBanners();
    const b = banners[this.bannerIdx];
    const rates = Object.entries(GACHA_RATES).map(([k, v]) => `<span style="color:${RARITY[k as keyof typeof RARITY].color}">${k} ${v}%</span>`).join(' · ');
    const best = this.gachaResult.reduce((m, r) => Math.max(m, RARITY[r.def.rarity].order), -1);
    const free = canFreePull(this.save);
    return `<section class="center">
      <div class="bar"><h2>✨ 카드 소환</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <div class="tabs">${banners.map((x, i) => `<button class="${i === this.bannerIdx ? 'primary' : ''}" data-act="banner" data-arg="${i}">${esc(x.name)}</button>`).join('')}</div>
      <div class="banner" style="--bc:${b.color}">
        ${b.pickup ? `<div class="banner-card">${cardView(b.pickup, { small: true })}</div>` : ''}
        <div><h2>${esc(b.name)}</h2><p>${esc(b.desc)}</p>
          ${b.pickup && this.save.pickupGuarantee ? '<p class="new">다음 최고 등급은 픽업 확정!</p>' : ''}</div>
      </div>
      <p class="muted">${rates}<br>천장: ${PITY_MAX - this.save.pity}회 안에 SSR 이상 확정 · 10연차는 SR 이상 1장 확정</p>
      <div class="row">
        ${free ? '<button class="primary badge" data-act="pull" data-arg="free">🎁 오늘의 무료 소환</button>' : ''}
        <button class="primary" data-act="pull" data-arg="single">1회 소환 (💎${GACHA_COST})</button>
        <button class="primary" data-act="pull" data-arg="ten">10회 소환 (💎${GACHA_10_COST})</button>
      </div>
      <div class="gacha-result ${best >= 3 ? 'glow' : ''}">${this.gachaResult.map((r, i) => `<div class="flip" style="animation-delay:${i * 0.12}s">${cardView(r.def.id, {
        small: true, level: r.level,
        footer: `${r.pickup ? '<b class="new">PICK UP</b> ' : ''}${r.isNew ? '<b class="new">NEW</b>' : `각성 +${r.level - 1}`}`,
      })}</div>`).join('')}</div>
      <button class="link" data-act="history">${this.showHistory ? '기록 닫기' : '소환 기록 보기'}</button>
      ${this.showHistory ? `<div class="history">${this.save.history.slice(0, 30).map((h) => {
        const d = getDef(h.defId);
        return `<div><span style="color:${RARITY[d.rarity].color}">[${d.rarity}]</span> ${d.emoji} ${esc(d.name)} <small class="muted">${new Date(h.at).toLocaleString()}</small></div>`;
      }).join('') || '<div class="muted">기록 없음</div>'}</div>` : ''}
    </section>`;
  }

  vSetup() {
    const owned = OBTAINABLE.filter((c) => this.save.collection[c.id])
      .concat(CARDS.filter((c) => c.unobtainable && this.save.collection[c.id]));
    const picked = this.setupPicks.map((id, i) => ({ uid: String(i), defId: id, star: 1, level: 1 }));
    return `<section>
      <div class="bar"><h2>⚔️ 원정 준비 — 데려갈 카드 (최대 3장)</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <p class="muted">선택: ${this.setupPicks.map((id) => getDef(id).name).join(', ') || '없음'}
        ${picked.length ? ` · 주 전략: ${(() => { const d = mainDoctrine(picked); return d ? `${DOCTRINES[d].icon} ${DOCTRINES[d].name}` : '-'; })()}` : ''}</p>
      <div class="grid">${owned.map((c) => cardView(c.id, {
        act: 'setupToggle', arg: c.id, level: this.save.collection[c.id].level,
        extraClass: this.setupPicks.includes(c.id) ? 'selected' : '',
      })).join('')}</div>
      <div class="center"><button class="big primary" data-act="startRun">출발!</button></div>
    </section>`;
  }

  // ─────────────────────────── 원정 화면
  vRun() {
    const run = this.run!;
    if (run.phase === 'over') return this.vRunOver();
    const sd = run.stageDef;
    const progress = CHAPTER_1.map((s) => {
      const cls = s.stage < run.stage ? 'done' : s.stage === run.stage ? 'cur' : '';
      const icon = s.type === 'boss' ? '👑' : s.type === 'elite' ? '💀' : AUGMENT_STAGES.includes(s.stage) ? '🔮' : '⚔️';
      return `<div class="node ${cls}" title="${s.name}">${icon}<small>${s.stage}</small></div>`;
    }).join('');
    const header = `<div class="stagebar">
      <div><b>스테이지 ${run.stage}</b> · ${sd.name} ${sd.type === 'boss' ? '<span class="boss">BOSS</span>' : sd.type === 'elite' ? '<span class="elite">ELITE</span>' : ''}</div>
      <div class="nodes">${progress}</div>
    </div>`;
    if (run.phase === 'battle' && this.playing) {
      return header + this.vBattle(this.playing, `<button class="big primary" data-act="afterBattle">${this.playing.win ? '보상 받기' : '돌아가기'}</button>`);
    }
    const phase: Record<string, () => string> = { prep: () => this.vPrep(), reward: () => this.vReward(), augment: () => this.vAugment() };
    return header + (phase[run.phase]?.() ?? '');
  }

  vScout() {
    const run = this.run!;
    const ed = DOCTRINES[run.enemyDoctrine];
    const counter = DOCTRINES[counterOf(run.enemyDoctrine)];
    const mine = mainDoctrine(run.team);
    const mu = matchupText(mine, run.enemyDoctrine);
    const sd = run.stageDef;
    const boss = sd.boss ? getDef(sd.boss) : null;
    return `<div class="scout" style="--doc:${ed.color}">
      <div class="scout-head">
        <b>🔭 정찰 보고</b> — 적 전략: <b style="color:${ed.color}">${ed.icon} ${ed.name}</b>
        · 카운터: <b style="color:${counter.color}">${counter.icon} ${counter.name}</b>
        · 현재 내 팀: <span class="mu ${mu.cls}">${mu.text}</span>
      </div>
      ${boss ? `<div class="bosshint">${boss.emoji} <b>${esc(boss.name)}</b> — ${esc(boss.flavor ?? '')}</div>` : ''}
      <div class="row">${run.enemyPreview.map((c) => cardView(c.defId, { star: c.star, small: true })).join('')}</div>
    </div>`;
  }

  vPrep() {
    const run = this.run!;
    const logs = run.log.splice(0);
    const augs = run.augments.map((id) => AUGMENT_MAP[id]).map((a) => `<span class="aug" title="${esc(a.desc)}">${a.icon} ${a.name}</span>`).join('');
    return `
    ${logs.length ? `<div class="logs">${logs.map((l) => `<div>${esc(l)}</div>`).join('')}</div>` : ''}
    ${this.vScout()}
    <div class="layout">
      <aside>
        <h3>전략</h3>${doctrineList(countDoctrines(run.team))}
        <h3>시너지</h3>${traitList(countTraits(run.team))}
        <h3>증강체</h3>${augs || '<div class="muted">스테이지 2·5·8 클리어 시 선택</div>'}
        <div class="muted small">이자 한도 ${run.effectiveInterestCap} · 연승 ${run.winStreak}</div>
      </aside>
      <div class="board">
        <h3>출전 팀 (${run.team.length}/${run.maxTeamSize}) <small class="muted">— 앞 2칸 전열, 나머지 후열</small></h3>
        <div class="row team">${run.team.map((c, i) => cardView(c.defId, {
          star: c.star, level: c.level, growth: c.growth, extraClass: i < 2 ? 'front' : 'back',
          footer: `<button data-act="left" data-arg="${c.uid}">◀</button><button data-act="toggle" data-arg="${c.uid}">내리기</button><button data-act="right" data-arg="${c.uid}">▶</button>`,
        })).join('') || '<div class="muted">대기석에서 카드를 올려주세요</div>'}</div>
        <h3>대기석 (${run.bench.length}/${MAX_BENCH})</h3>
        <div class="row bench">${run.bench.map((c) => cardView(c.defId, {
          star: c.star, level: c.level, growth: c.growth, small: true,
          footer: `<button data-act="toggle" data-arg="${c.uid}">출전</button><button data-act="sell" data-arg="${c.uid}">판매 ${sellValue(c)}💰</button>`,
        })).join('') || '<div class="muted">비어 있음</div>'}</div>
        <h3>상점 <small class="muted">— 같은 카드 3장 = ★승급</small></h3>
        <div class="row shop">${run.shop.map((id, i) => id
          ? cardView(id, { small: true, act: 'buy', arg: String(i), footer: `💰 ${RARITY[getDef(id).rarity].cost}` })
          : '<div class="card small sold">판매됨</div>').join('')}</div>
        <div class="row actions">
          <button data-act="reroll">🔄 새로고침 (💰${REROLL_COST})</button>
          <button class="primary big" data-act="fight">⚔️ 전투 시작</button>
          <button class="link" data-act="giveUp">포기</button>
        </div>
      </div>
    </div>`;
  }

  /** 전투 재생 화면 (원정/PvP 공용) */
  vBattle(res: BattleResult, doneButton: string, labels = { ally: '내 팀', enemy: '적' }) {
    const ev = res.events[this.battleIdx];
    const snap = new Map(ev.snap.map((s) => [s.uid, s]));
    const done = this.battleIdx >= res.events.length - 1;
    const side = (units: typeof res.allies) => units.map((u) => {
      const s = snap.get(u.uid)!;
      const cls = [s.hp <= 0 ? 'dead' : '', ev.actor === u.uid ? 'acting' : '', ev.targets.includes(u.uid) ? 'hit' : ''].join(' ');
      return `<div class="unit ${cls}">
        <div class="uemoji">${u.emoji}</div>
        <div class="uname">${esc(u.name)} ${'★'.repeat(u.star)}</div>
        ${hpBar(s.hp, u.maxHp, s.shield)}
        <div class="mana"><div style="width:${(s.mana / u.skill.mana) * 100}%"></div></div>
        <small>${s.hp}/${u.maxHp}${s.shield ? ` (+${s.shield})` : ''}</small>
      </div>`;
    }).join('');
    const log = res.events.slice(0, this.battleIdx + 1).slice(-14).map((e) => `<div class="${e.kind}">${esc(e.text)}</div>`).join('');
    return `<div class="round">라운드 ${ev.round}</div>
    <div class="arena">
      <div class="side-label">${esc(labels.enemy)}</div>
      <div class="side enemy">${side(res.enemies)}</div>
      <div class="vs">VS</div>
      <div class="side ally">${side(res.allies)}</div>
      <div class="side-label">${esc(labels.ally)}</div>
    </div>
    <div class="battlelog">${log}</div>
    <div class="center">${done ? doneButton : '<button data-act="skip">⏩ 건너뛰기</button>'}</div>`;
  }

  vReward() {
    const run = this.run!;
    return `<section class="center">
      <h2>🎉 승리! 보상을 하나 고르세요</h2>
      <p class="muted">포획한 카드는 이번 원정에 합류하고, 원정이 끝나면 <b>도감에 영구 등록</b>됩니다.</p>
      <div class="row">${run.pendingRewards.map((r, i) => {
        if (r.kind === 'gold') return `<div class="card clickable reward" data-act="reward" data-arg="${i}"><div class="emoji">💰</div><div class="name">${r.amount} 골드</div></div>`;
        const isNew = !this.save.collection[r.defId];
        return cardView(r.defId, { act: 'reward', arg: String(i), footer: `🎯 포획${isNew ? ' <b class="new">NEW</b>' : ''}` });
      }).join('')}</div>
    </section>`;
  }

  vAugment() {
    const run = this.run!;
    return `<section class="center">
      <h2>🔮 증강체 선택</h2>
      <div class="row">${run.pendingAugments.map((id) => {
        const a = AUGMENT_MAP[id];
        return `<div class="augcard ${a.tier} clickable" data-act="augment" data-arg="${id}">
          <div class="emoji">${a.icon}</div><div class="name">${a.name}</div><div class="desc">${esc(a.desc)}</div><small>${a.tier.toUpperCase()}</small>
        </div>`;
      }).join('')}</div>
    </section>`;
  }

  vRunOver() {
    const run = this.run!;
    const s = this.endSummary!;
    return `<section class="center">
      <h1>${run.cleared ? '🏆 1장 클리어!' : '원정 종료'}</h1>
      <p>클리어 스테이지: <b>${s.stagesCleared}</b> · 획득 보석 <b>💎 ${s.gems}</b></p>
      ${s.newCards.length ? `<h3>새로 도감에 등록된 카드</h3><div class="row">${s.newCards.map((id) => cardView(id, { small: true })).join('')}</div>` : ''}
      <h3>최종 팀</h3>
      <div class="row">${run.team.map((c) => cardView(c.defId, { star: c.star, level: c.level, growth: c.growth, small: true })).join('')}</div>
      <div class="row">
        ${run.team.length ? `<button class="big" data-act="saveDeck" ${s.deckSaved ? 'disabled' : ''}>${s.deckSaved ? '✅ PvP 덱 등록됨' : '🏟️ 이 팀을 PvP 덱으로 등록'}</button>` : ''}
        <button class="big primary" data-act="leaveRun">기지로 돌아가기</button>
      </div>
    </section>`;
  }

  // ─────────────────────────── PvP 아레나
  vArena() {
    const p = this.save.pvp;
    const m = this.pvp.match;
    if (m && this.playing) {
      const doneBtn = m.resolved
        ? `<div class="pvp-result ${m.res.win ? 'win' : 'lose'}">
             <h2>${m.res.win ? '🏆 승리!' : '💀 패배'}</h2>
             <p>레이팅 ${m.delta >= 0 ? '+' : ''}${m.delta} → <b>${p.rating}</b> · 💎 +${m.gems}</p>
             <button class="big primary" data-act="pvpBack">아레나로</button></div>`
        : '<button class="big primary" data-act="pvpDone">결과 확인</button>';
      return this.vBattle(this.playing, doneBtn, { ally: `내 덱 (${this.user.name})`, enemy: m.opp.ownerName });
    }
    const deck = p.deck;
    const myDoc = deck?.doctrine ?? null;
    return `<section>
      <div class="bar"><h2>🏟️ PvP 아레나</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <div class="arena-top">
        <div><div class="muted">레이팅</div><div class="rating">${p.rating}</div><div class="muted">${p.wins}승 ${p.losses}패</div></div>
        <div class="mydeck">
          <h3>내 PvP 덱 ${myDoc ? `<span style="color:${DOCTRINES[myDoc].color}">${DOCTRINES[myDoc].icon} ${DOCTRINES[myDoc].name}</span>` : ''}</h3>
          ${deck ? `<div class="row">${toInstances(deck, 'm').map((c) => cardView(c.defId, { star: c.star, level: c.level, growth: c.growth, small: true })).join('')}</div>`
            : '<p class="muted">원정을 끝낸 뒤 “이 팀을 PvP 덱으로 등록”을 누르면 다른 유저와 대전할 수 있습니다.</p>'}
        </div>
      </div>
      <p class="muted">${this.backend.kind === 'firebase' && !this.user.isGuest
        ? '다른 유저의 방어덱과 비동기 대전합니다. 상대가 부족하면 봇이 채워집니다.'
        : '오프라인 모드: 봇 상대와 대전합니다. Google 로그인 시 실제 유저와 매칭됩니다.'}</p>
      <div class="bar"><h3>상대 목록</h3><button data-act="findOpp" ${this.pvp.loading ? 'disabled' : ''}>🔄 새 상대 찾기</button></div>
      ${this.pvp.loading ? '<p class="muted">상대를 찾는 중…</p>' : ''}
      <div class="opponents">${(this.pvp.opponents ?? []).map((o, i) => {
        const od = o.doctrine ? DOCTRINES[o.doctrine] : null;
        const mu = matchupText(myDoc, o.doctrine);
        return `<div class="opp">
          <div class="opp-head"><b>${esc(o.ownerName)}</b> <span class="muted">R ${o.rating} · 전투력 ${o.power}</span>
            ${od ? `<span style="color:${od.color}">${od.icon} ${od.name}</span>` : ''} <span class="mu ${mu.cls}">${mu.text}</span></div>
          <div class="row">${toInstances(o, 'o').map((c) => cardView(c.defId, { star: c.star, level: c.level, growth: c.growth, small: true })).join('')}</div>
          <button class="primary" data-act="challenge" data-arg="${i}" ${deck ? '' : 'disabled'}>⚔️ 도전</button>
        </div>`;
      }).join('')}</div>
    </section>`;
  }
}
