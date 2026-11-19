/* Offers (Ahmed, 2026-11-17): money off for booking more at once ("20% off when you book 3 or more times").
   One list for courts, open games and training programs. The pages show them; the server re-checks every order with these
   same rules and charges the result (server.js, and f/demo-api.js on the static demo).

   Rules (Ahmed's defaults):
   - "for 3" means 3 or more;
   - offers don't stack: when several apply, the one that saves most is used;
   - the first free open game and the program renewal discount come first; an offer takes its share off what's left;
   - applied automatically (no code to type); ladies hours count as courts;
   - what counts: a court booking's times, an open game's players, a program's participants;
   - an offer runs from `from` to `to` (inclusive) and is checked on the day you book.

   Offer: { id, kind: 'court' | 'game' | 'program', sport?, court?, program?, min, pct (percent off) | upto (SAR off,
   never more than the price), from, to }

   window.SFA_OFFERS                     the list
   SFA_OFFER_ACTIVE(kind, item, at?)     offers running now for a court / game / program (item: { sport, court, program })
   SFA_OFFER_BEST(kind, item, n, base, at?)          { o, save } the best offer for n tickets costing `base`, or null
   SFA_OFFER_NEXT(kind, item, n, unit, at?)          { o, need, save } the next offer that saves more, or null
   SFA_OFFER_SHARE(booking, i)            refund for removing person i, re-priced without them (null: no offer on it)
   SFA_OFFER_TEXT(o, t, money, date)      { title, until } in the page's language */
(() => {
  const W = typeof window !== 'undefined' ? window : globalThis;
  W.SFA_OFFERS = [
    { id: 'courts-3', kind: 'court', min: 3, pct: 20, from: '2026-11-01', to: '2026-12-31' },
    { id: 'courts-6', kind: 'court', min: 6, pct: 30, from: '2026-11-15', to: '2026-12-31' },
    { id: 'tennis-2', kind: 'court', sport: 'tennis', min: 2, upto: 100, from: '2026-11-01', to: '2026-12-31' },
    { id: 'games-2', kind: 'game', min: 2, pct: 10, from: '2026-11-01', to: '2026-12-31' },
    { id: 'games-4', kind: 'game', min: 4, upto: 50, from: '2026-11-01', to: '2026-12-31' },
    { id: 'programs-2', kind: 'program', min: 2, pct: 15, from: '2026-11-01', to: '2026-12-31' },
    { id: 'programs-3', kind: 'program', min: 3, pct: 25, from: '2026-11-01', to: '2026-12-31' },
  ];
  const r2 = x => Math.round(x * 100) / 100;
  const dayKey = at => { const d = new Date(at == null ? Date.now() : at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fits = (o, kind, item) => o.kind === kind && (!o.sport || o.sport === item.sport) && (o.court == null || o.court === item.court) && (!o.program || o.program === item.program);
  const active = (kind, item, at) => { const k = dayKey(at); return W.SFA_OFFERS.filter(o => fits(o, kind, item || {}) && o.from <= k && k <= o.to).sort((a, b) => a.min - b.min); };
  const saveOf = (o, base) => base > 0 ? r2(o.pct ? base * o.pct / 100 : Math.min(o.upto, base)) : 0;
  function best(kind, item, n, base, at){
    let top = null;
    for (const o of active(kind, item, at)) if (n >= o.min){ const s = saveOf(o, base); if (s > 0 && (!top || s > top.save)) top = { o, save: s }; }
    return top;
  }
  // the next step up: the smallest group size that saves more than today's best (unit = the price of one ticket)
  function next(kind, item, n, unit, at){
    if (!(unit > 0)) return null;
    const now = best(kind, item, n, unit * n, at), have = now ? now.save / Math.max(1, n) : 0;
    for (const o of active(kind, item, at)) if (o.min > n){ const s = saveOf(o, unit * o.min); if (s / o.min > have + 0.001) return { o, need: o.min - n, save: s }; }
    return null;
  }
  // removing one person: the booking is re-priced without them (the offer checked on the day it was booked) and the
  // difference with what's paid now is refunded. Kits and other extras keep their price.
  function share(b, i){
    const o = b.order, f = o && o.offer; if (!f) return null;
    const list = o.participants || [], left = list.filter((x, j) => !x.cancelled && j !== +i);
    const unit = f.paid ? f.base / f.paid : 0, paidLeft = o.kind === 'game' ? left.filter(x => !x.free).length : left.length;
    const base = r2(unit * paidLeft), B = best(o.kind, { sport: o.sport, court: o.court, program: o.program }, left.length, base, f.at);
    const extra = r2((b.amount || 0) + f.save - f.base), now = r2(base - (B ? B.save : 0) + extra);
    return Math.max(0, r2((b.amount || 0) - (b.refund || 0) - now));
  }
  const UNIT = { court: ['time', 'times'], game: ['player', 'players'], program: ['subscription', 'subscriptions'] };   // programs count subscriptions, one per participant (Ahmed, 2026-11-19)
  function text(o, t, money, date){
    const u = UNIT[o.kind][1];
    const title = o.pct ? t(`{p}% off when you book {n} or more ${u}`, { p: o.pct, n: o.min }) : t(`Save up to {amount} when you book {n} or more ${u}`, { amount: money(o.upto), n: o.min });
    const [y, m, d] = o.to.split('-').map(Number);
    return { title, until: t('Until {date}', { date: date(new Date(y, m - 1, d)) }) };
  }
  // the order's offer, as stored on it: what the receipt and refunds read later
  const stamp = (r, base, paid, n, at) => r ? { id: r.o.id, pct: r.o.pct || 0, upto: r.o.upto || 0, min: r.o.min, save: r.save, base: r2(base), paid, n, at: at || Date.now() } : null;
  // ---- on the pages: the "Available offers" block, the card tag and the summary line (f/offers.css)
  if (typeof document !== 'undefined'){
    if (!document.querySelector('link[href$="f/offers.css"]')){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'f/offers.css'; document.head.appendChild(l); }
    const P = () => W.SFA_PREFS, tt = (k, v) => P().t(k, v), money = x => P().money(x), date = d => P().date(d, { day: 'numeric', month: 'short' });
    const TAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8.5h.01"/></svg>';
    const OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    const U1 = { court: 'time', game: 'player', program: 'subscription' };
    const up = (kind, nx) => tt(`Add ${nx.need === 1 ? '1 more ' + U1[kind] : '{n} more ' + U1[kind] + 's'} to ${nx.o.pct ? 'get {p}% off' : 'save {amount}'}`, { n: nx.need, p: nx.o.pct, amount: money(nx.o.upto) });
    W.SFA_OFFER_UI = {
      // every offer running for this court / game / program; the one that applies to n tickets is marked, with a nudge
      // to the next one. unit = the price of one ticket; note = a line under the list (e.g. "applied at checkout")
      block(kind, item, n, unit, note, base){   // base: what the n tickets cost, when not n × unit (free first games)
        const list = active(kind, item); if (!list.length) return '';
        const on = n ? best(kind, item, n, base == null ? unit * n : base) : null, nx = n ? next(kind, item, n, unit) : null;   // the nudge once something is picked
        return `<section class="of" aria-label="${tt('Available offers')}"><p class="of-h">${TAG}<span>${tt('Available offers')}</span></p><ul class="of-l">${list.map(o => { const x = text(o, tt, money, date), hit = on && on.o.id === o.id;
            return `<li class="${hit ? 'is-on' : ''}"><span class="of-ic" aria-hidden="true">${hit ? OK : TAG}</span><span class="of-t"><b>${x.title}</b><small>${x.until}</small></span>${hit ? `<em>${tt('Applied')} · −${money(on.save)}</em>` : ''}</li>`; }).join('')}</ul>
          ${nx ? `<p class="of-next">${up(kind, nx)}</p>` : ''}${note ? `<p class="of-note">${note}</p>` : ''}</section>`;
      },
      // checkout (Ahmed, 2026-11-18: "remove Available offers from checkout, show only the applied"): just the offer that
      // applies to these n tickets, or nothing
      applied(kind, item, n, unit, base){
        const on = n ? best(kind, item, n, base == null ? unit * n : base) : null; if (!on) return '';
        const x = text(on.o, tt, money, date);
        return `<section class="of of--on" aria-label="${tt('Offer applied')}"><ul class="of-l"><li class="is-on"><span class="of-ic" aria-hidden="true">${OK}</span><span class="of-t"><b>${x.title}</b><small>${x.until}</small></span><em>${tt('Applied')} · −${money(on.save)}</em></li></ul></section>`;
      },
      // the card tag: "Up to 30% off", or "Save up to SAR 100" when every offer is an amount
      tag(kind, item){
        const list = active(kind, item); if (!list.length) return '';
        const pct = Math.max(0, ...list.map(o => o.pct || 0)), amt = Math.max(0, ...list.map(o => o.upto || 0));
        return `<span class="of-tag">${TAG}<span>${pct ? tt('Up to {p}% off', { p: pct }) : tt('Save up to {amount}', { amount: money(amt) })}</span></span>`;
      },
      // the offer as one summary line: [label, "− SAR 90"]
      line(f){ if (!f || !f.save) return null; const o = W.SFA_OFFERS.find(x => x.id === f.id) || { kind: 'court', ...f, to: '2026-12-31' };
        return [`${tt('Offer')} · ${o.pct || f.pct ? tt('{p}% off {n}+', { p: o.pct || f.pct, n: o.min || f.min }) : tt('{amount} off {n}+', { amount: money(o.upto || f.upto), n: o.min || f.min })}`, `− ${money(f.save)}`]; },
      best: (kind, item, n, base) => best(kind, item, n, base)
    };
  }
  Object.assign(W, { SFA_OFFER_ACTIVE: active, SFA_OFFER_BEST: best, SFA_OFFER_NEXT: next, SFA_OFFER_SHARE: share, SFA_OFFER_TEXT: text, SFA_OFFER_STAMP: stamp });
})();
