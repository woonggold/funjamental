import { getDef } from '../data/cards';
import { DOCTRINES } from '../data/doctrines';
import { ELEMENTS, RARITY } from '../data/elements';
import { TRAITS } from '../data/traits';
import type { CardInstance } from '../data/types';
import type { ActiveDoctrine, ActiveTrait } from '../core/synergy';
import type { Doctrine } from '../data/types';
import { cardStats } from '../core/stats';

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export interface CardOpts {
  star?: number;
  level?: number;
  growth?: number;
  act?: string;
  arg?: string;
  footer?: string;
  locked?: boolean;
  small?: boolean;
  extraClass?: string;
}

/** 카드 한 장 렌더링 */
export function cardView(defId: string, o: CardOpts = {}): string {
  const d = getDef(defId);
  const el = ELEMENTS[d.element];
  const rar = RARITY[d.rarity];
  const star = o.star ?? 1;
  const inst: CardInstance = { uid: '', defId, star, level: o.level ?? 1, growth: o.growth ?? 0 };
  const doc = DOCTRINES[d.doctrine];
  const s = cardStats(inst);
  const attrs = o.act ? `data-act="${o.act}" data-arg="${esc(o.arg ?? '')}"` : '';
  if (o.locked) {
    return `<div class="card locked ${o.small ? 'small' : ''}"><div class="emoji">❔</div><div class="name">???</div></div>`;
  }
  return `
  <div class="card ${o.small ? 'small' : ''} ${o.act ? 'clickable' : ''} ${o.extraClass ?? ''}" ${attrs}
       style="--rar:${rar.color};--el:${el.color}">
    <div class="card-top">
      <span class="rar">${d.rarity}</span>
      <span class="doc" style="--doc:${doc.color}" title="${doc.name}: ${esc(doc.tagline)}">${doc.icon}${o.small ? '' : ` ${doc.name}`}</span>
      <span class="stars">${'★'.repeat(star)}</span>
    </div>
    <div class="emoji">${d.emoji}</div>
    <div class="name">${esc(d.name)}${(o.level ?? 1) > 1 ? ` <small>+${(o.level ?? 1) - 1}</small>` : ''}${o.growth ? ` <small class="grow">🌱${o.growth}</small>` : ''}</div>
    <div class="tags">
      <span class="tag el">${el.name}</span>
      ${d.traits.map((t) => `<span class="tag">${TRAITS[t].name}</span>`).join('')}
    </div>
    ${o.small ? '' : `
    <div class="statline">❤ ${s.hp} ⚔ ${s.atk} 🛡 ${s.def} 💨 ${s.spd}</div>
    <div class="skill"><b>${esc(d.skill.name)}</b> ${esc(d.skill.desc)}</div>`}
    ${o.footer ? `<div class="card-foot">${o.footer}</div>` : ''}
  </div>`;
}

export function traitList(active: ActiveTrait[]): string {
  if (!active.length) return '<div class="muted">카드를 출전시키면 시너지가 표시됩니다</div>';
  return active.map((a) => {
    const t = TRAITS[a.trait];
    const next = t.tiers.find((x) => x.count > a.count);
    const on = a.tier >= 0;
    const desc = on ? t.tiers[a.tier].desc : `${t.tiers[0].count}종 필요: ${t.tiers[0].desc}`;
    return `<div class="trait ${on ? 'on' : ''}" title="${esc(t.tiers.map((x) => `${x.count}: ${x.desc}`).join('\n'))}">
      <b>${t.name}</b> <span class="cnt">${a.count}${next ? `/${next.count}` : ''}</span>
      <div class="tdesc">${esc(desc)}</div>
    </div>`;
  }).join('');
}

export function hpBar(hp: number, max: number, shield: number): string {
  const pct = Math.max(0, (hp / max) * 100);
  const sp = Math.min(100, (shield / max) * 100);
  return `<div class="hpbar"><div class="hp" style="width:${pct}%"></div><div class="sh" style="width:${sp}%"></div></div>`;
}

/** 전략 계열 3종 현황 */
export function doctrineList(active: ActiveDoctrine[]): string {
  return active.map((a) => {
    const d = DOCTRINES[a.doctrine];
    const on = a.tier >= 0;
    const next = d.tiers.find((t) => t.count > a.count);
    const desc = on ? d.tiers[a.tier].desc : `${d.tiers[0].count}종 필요: ${d.tiers[0].desc}`;
    return `<div class="doctrine ${on ? 'on' : ''}" style="--doc:${d.color}">
      <div><b>${d.icon} ${d.name}</b> <span class="cnt">${a.count}${next ? `/${next.count}` : ''}</span></div>
      <div class="tdesc">${esc(desc)}</div>
      ${on ? `<div class="tdesc run">운영: ${esc(d.runBonus[Math.min(a.tier, d.runBonus.length - 1)])}</div>` : ''}
    </div>`;
  }).join('');
}

/** 상성 판정: 내 전략 기준 */
export function matchupText(mine: Doctrine | null, theirs: Doctrine | null): { text: string; cls: string } {
  if (!mine || !theirs || mine === theirs) return { text: '상성 동등', cls: 'even' };
  if (DOCTRINES[mine].beats === theirs) return { text: '상성 유리', cls: 'good' };
  if (DOCTRINES[theirs].beats === mine) return { text: '상성 불리', cls: 'bad' };
  return { text: '상성 동등', cls: 'even' };
}

/** 이 전략을 잡는 카운터 */
export function counterOf(d: Doctrine): Doctrine {
  return (Object.keys(DOCTRINES) as Doctrine[]).find((x) => DOCTRINES[x].beats === d)!;
}
