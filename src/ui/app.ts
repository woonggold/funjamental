import { AUGMENT_MAP } from '../data/augments';
import { CARDS, getDef, OBTAINABLE, STARTERS } from '../data/cards';
import { RARITY } from '../data/elements';
import { AUGMENT_STAGES, CHAPTER_1 } from '../data/stages';
import { GACHA_10_COST, GACHA_COST, GACHA_RATES, PITY_MAX, pull, type PullResult } from '../core/gacha';
import { MAX_BENCH, REROLL_COST, RunState } from '../core/run';
import { addToCollection, loadSave, resetSave, writeSave, type SaveData } from '../core/save';
import { sellValue } from '../core/stats';
import { countTraits } from '../core/synergy';
import { cardView, esc, hpBar, traitList } from './components';

type Screen = 'starter' | 'home' | 'collection' | 'gacha' | 'setup' | 'run';

export class App {
  save: SaveData = loadSave();
  screen: Screen = this.save.starterChosen ? 'home' : 'starter';
  run?: RunState;
  gachaResult: PullResult[] = [];
  setupPicks: string[] = [];
  toast = '';
  battleIdx = 0;
  battleTimer?: number;
  endSummary?: { gems: number; stagesCleared: number; newCards: string[] };

  constructor(private root: HTMLElement) {
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el) return;
      this.handle(el.dataset.act!, el.dataset.arg ?? '');
    });
    this.render();
  }

  persist() { writeSave(this.save); }
  flash(msg: string) { this.toast = msg; setTimeout(() => { if (this.toast === msg) { this.toast = ''; this.render(); } }, 1800); }

  // ─────────────────────────── 액션 처리
  handle(act: string, arg: string) {
    const run = this.run;
    switch (act) {
      case 'chooseStarter':
        addToCollection(this.save, arg);
        this.save.starterChosen = true;
        this.persist();
        this.screen = 'home';
        break;
      case 'go': this.screen = arg as Screen; if (arg === 'setup') this.setupPicks = []; break;
      case 'pull1': case 'pull10': {
        const r = pull(this.save, act === 'pull1' ? 1 : 10);
        if (!r) { this.flash('보석이 부족합니다'); break; }
        this.gachaResult = r; this.persist(); break;
      }
      case 'reset':
        if (confirm('세이브를 초기화할까요?')) { resetSave(); this.save = loadSave(); this.screen = 'starter'; this.run = undefined; }
        break;
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
        this.screen = 'run';
        break;
      // ── 런 내부
      case 'buy': if (run && !run.buy(+arg)) this.flash('골드가 부족하거나 대기석이 가득 찼습니다'); break;
      case 'reroll': if (run && !run.reroll()) this.flash('골드가 부족합니다'); break;
      case 'toggle': if (run && !run.toggleTeam(arg)) this.flash(`출전 인원 초과 (최대 ${run.maxTeamSize})`); break;
      case 'left': run?.moveInTeam(arg, -1); break;
      case 'right': run?.moveInTeam(arg, 1); break;
      case 'sell': run?.sell(arg); break;
      case 'fight':
        if (!run?.fight()) { this.flash('출전 카드가 없습니다'); break; }
        this.startPlayback();
        break;
      case 'skip': this.stopPlayback(true); break;
      case 'afterBattle': run?.resolveBattle(); if (run?.phase === 'over') this.endRun(); break;
      case 'reward': run?.pickReward(+arg); if (run?.phase === 'over') this.endRun(); break;
      case 'augment': run?.pickAugment(arg); if (run?.phase === 'over') this.endRun(); break;
      case 'giveUp': if (run && confirm('원정을 포기할까요?')) { run.phase = 'over'; this.endRun(); } break;
      case 'leaveRun': this.run = undefined; this.endSummary = undefined; this.screen = 'home'; break;
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
    this.endSummary = { gems, stagesCleared, newCards };
  }

  startPlayback() {
    this.battleIdx = 0;
    clearInterval(this.battleTimer);
    this.battleTimer = window.setInterval(() => {
      const ev = this.run?.lastBattle?.events;
      if (!ev || this.battleIdx >= ev.length - 1) return this.stopPlayback(false);
      this.battleIdx++;
      this.render();
    }, 260);
  }
  stopPlayback(jump: boolean) {
    clearInterval(this.battleTimer);
    this.battleTimer = undefined;
    if (jump && this.run?.lastBattle) this.battleIdx = this.run.lastBattle.events.length - 1;
    this.render();
  }

  // ─────────────────────────── 렌더링
  render() {
    const body = ({
      starter: () => this.vStarter(),
      home: () => this.vHome(),
      collection: () => this.vCollection(),
      gacha: () => this.vGacha(),
      setup: () => this.vSetup(),
      run: () => this.vRun(),
    } as const)[this.screen]();
    this.root.innerHTML = `
      <header>
        <div class="logo" data-act="${this.screen === 'run' ? '' : 'go'}" data-arg="home">🃏 카드 원정대</div>
        <div class="res">💎 ${this.save.gems} ${this.run && this.screen === 'run' ? `· 💰 ${this.run.gold} · ❤️ ${this.run.life}` : ''}</div>
      </header>
      <main>${body}</main>
      ${this.toast ? `<div class="toast">${esc(this.toast)}</div>` : ''}`;
    const log = this.root.querySelector('.battlelog');
    if (log) log.scrollTop = log.scrollHeight;
  }

  vStarter() {
    return `<section class="center">
      <h1>함께 모험을 떠날 첫 파트너를 골라주세요</h1>
      <div class="row">${STARTERS.map((id) => cardView(id, { act: 'chooseStarter', arg: id, footer: '이 카드로 시작' })).join('')}</div>
      <p class="muted">같은 카드 3장을 모으면 ★승급, 스타터는 승급 시 <b>진화</b>합니다.</p>
    </section>`;
  }

  vHome() {
    const owned = Object.keys(this.save.collection).length;
    const total = CARDS.length;
    return `<section class="center">
      <h1>원정 기지</h1>
      <div class="menu">
        <button class="big primary" data-act="go" data-arg="setup">⚔️ 원정 출발<small>1장 · 10 스테이지</small></button>
        <button class="big" data-act="go" data-arg="gacha">✨ 카드 소환<small>보석 ${GACHA_COST}</small></button>
        <button class="big" data-act="go" data-arg="collection">📖 도감<small>${owned} / ${total}</small></button>
      </div>
      <p class="muted">최고 기록: ${this.save.bestStage} 스테이지 · 원정 ${this.save.runs}회</p>
      <button class="link" data-act="reset">세이브 초기화</button>
    </section>`;
  }

  vCollection() {
    const list = [...CARDS].sort((a, b) => RARITY[a.rarity].order - RARITY[b.rarity].order);
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
    const rates = Object.entries(GACHA_RATES).map(([k, v]) => `<span style="color:${RARITY[k as keyof typeof RARITY].color}">${k} ${v}%</span>`).join(' · ');
    return `<section class="center">
      <div class="bar"><h2>✨ 카드 소환</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <p class="muted">${rates}<br>천장: ${PITY_MAX - this.save.pity}회 안에 SSR 이상 확정 · 10연차는 SR 이상 1장 확정</p>
      <div class="row">
        <button class="primary" data-act="pull1">1회 소환 (💎${GACHA_COST})</button>
        <button class="primary" data-act="pull10">10회 소환 (💎${GACHA_10_COST})</button>
      </div>
      <div class="grid">${this.gachaResult.map((r) => cardView(r.def.id, {
        small: true, level: r.level, extraClass: 'pop', footer: r.isNew ? '<b class="new">NEW</b>' : `각성 +${r.level - 1}`,
      })).join('')}</div>
    </section>`;
  }

  vSetup() {
    const owned = OBTAINABLE.filter((c) => this.save.collection[c.id])
      .concat(CARDS.filter((c) => c.unobtainable && this.save.collection[c.id]));
    return `<section>
      <div class="bar"><h2>⚔️ 원정 준비 — 데려갈 카드 (최대 3장)</h2><button data-act="go" data-arg="home">돌아가기</button></div>
      <p class="muted">선택: ${this.setupPicks.map((id) => getDef(id).name).join(', ') || '없음'}</p>
      <div class="grid">${owned.map((c) => cardView(c.id, {
        act: 'setupToggle', arg: c.id, level: this.save.collection[c.id].level,
        extraClass: this.setupPicks.includes(c.id) ? 'selected' : '',
      })).join('')}</div>
      <div class="center"><button class="big primary" data-act="startRun">출발!</button></div>
    </section>`;
  }

  // ─────────────────────────── 런 화면
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
    const phase = { prep: () => this.vPrep(), battle: () => this.vBattle(), reward: () => this.vReward(), augment: () => this.vAugment() }[run.phase]();
    return header + phase;
  }

  vPrep() {
    const run = this.run!;
    const traits = countTraits(run.team);
    const logs = run.log.splice(0);
    const augs = run.augments.map((id) => AUGMENT_MAP[id]).map((a) => `<span class="aug" title="${esc(a.desc)}">${a.icon} ${a.name}</span>`).join('');
    const sd = run.stageDef;
    const bossHint = sd.boss ? `<div class="bosshint">${getDef(sd.boss).emoji} <b>${getDef(sd.boss).name}</b> — ${esc(getDef(sd.boss).flavor ?? '')}</div>` : '';
    return `
    ${logs.length ? `<div class="logs">${logs.map((l) => `<div>${esc(l)}</div>`).join('')}</div>` : ''}
    ${bossHint}
    <div class="layout">
      <aside>
        <h3>시너지</h3>${traitList(traits)}
        <h3>증강체</h3>${augs || '<div class="muted">스테이지 2·5·8 클리어 시 선택</div>'}
      </aside>
      <div class="board">
        <h3>출전 팀 (${run.team.length}/${run.maxTeamSize}) <small class="muted">— 앞 2칸 전열, 나머지 후열</small></h3>
        <div class="row team">${run.team.map((c, i) => cardView(c.defId, {
          star: c.star, level: c.level, extraClass: i < 2 ? 'front' : 'back',
          footer: `<button data-act="left" data-arg="${c.uid}">◀</button><button data-act="toggle" data-arg="${c.uid}">내리기</button><button data-act="right" data-arg="${c.uid}">▶</button>`,
        })).join('') || '<div class="muted">대기석에서 카드를 올려주세요</div>'}</div>
        <h3>대기석 (${run.bench.length}/${MAX_BENCH})</h3>
        <div class="row bench">${run.bench.map((c) => cardView(c.defId, {
          star: c.star, level: c.level, small: true,
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

  vBattle() {
    const res = this.run!.lastBattle!;
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
    return `<div class="arena">
      <div class="side enemy">${side(res.enemies)}</div>
      <div class="vs">VS</div>
      <div class="side ally">${side(res.allies)}</div>
    </div>
    <div class="battlelog">${log}</div>
    <div class="center">${done
      ? `<button class="big primary" data-act="afterBattle">${res.win ? '보상 받기' : '돌아가기'}</button>`
      : '<button data-act="skip">⏩ 건너뛰기</button>'}</div>`;
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
      <button class="big primary" data-act="leaveRun">기지로 돌아가기</button>
    </section>`;
  }
}
