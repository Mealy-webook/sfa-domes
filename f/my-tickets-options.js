/* My tickets options (Ahmed, 2026-11-17), from the bookings benchmark (bookings-benchmark.html). Open with
   profile.html?v=a#tickets, ?v=b or ?v=c; without ?v the live My tickets is unchanged. All three share:
   - one row per booking, with a count ("3 players", "3 times", "12 sessions · 2 participants") and who's on it;
   - the status on the row in words: Ready / QR opens on the day / Played / Cancelled;
   - each person's ticket (or each time, for a court) inside the booking;
   - remove one person from an open game or a program (their share refunded, while free cancellation is open);
   - send a guest their own ticket to the mobile they were added with.
   A = booking cards, and in the booking a ticket stub per person (Klook / GetYourGuide).
   B = compact rows, and the booking opens in a side panel without leaving the list (Cal.com / TravelPerk).
   C = rows grouped by when, and the booking opens as a ticket wallet with a person switcher (event apps).
   profile.html hands over its state and helpers through ctx (see MT_CTX there). */
(() => {
  const st = { seg: 'up', who: 'all', panel: null, pick: {}, open: {}, type: 'court', person: 'all', cal: null, tf: {}, kt: 'all', bt: {}, sel: {} };
  const KIND = { court: 'Court booking', game: 'Open game', program: 'Training program' };
  const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z"/></svg>';
  const RM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const QRI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>';

  // ---- one booking, read once: its sessions, people, count, status
  function model(c, b){
    const { T, t, P, user } = c, kind = b.order.kind || 'court', now = Date.now();
    const at = (s, m) => T.toDate(s.date).getTime() + m * 60e3;
    const ses = T.sessions(b).map(s => ({ ...s, startAt: at(s, s.start), endsAt: at(s, s.end) }));
    const days = ses.filter((s, i, a) => a.findIndex(y => y.n === s.n) === i);
    const next = days.find(s => s.endsAt > now), last = days[days.length - 1] || ses[0];
    const cancelled = b.status === 'cancelled', up = !cancelled && !!next, past = !cancelled && !next;
    const D = T.describe(days[0] || ses[0], b);
    const raw = b.order.participants || (kind === 'program' ? T.people(b) : null);
    const isYou = x => x.type === 'me' || (!x.type && user && x.name === user.name);
    const people = raw ? raw.map((x, i) => ({ i, type: x.type || (isYou(x) ? 'me' : 'child'), name: isYou(x) && user ? user.name : x.name, phone: x.phone, free: !!x.free, sent: x.sent, gone: !!x.cancelled, refund: x.cancelled ? x.cancelled.refund : 0, you: isYou(x) }))
      : (() => { const bf = b.order.bookingFor || { type: 'me' }; return [{ i: 0, type: bf.type, name: bf.type === 'me' ? (user ? user.name : '') : bf.name, phone: bf.phone, you: bf.type === 'me', single: true }]; })();
    const active = people.filter(p => !p.gone), n = active.length;
    const first = s => String(s || '').split(' ')[0];
    const guests = active.filter(p => p.type === 'guest').length, mine = active.filter(p => p.type !== 'guest');
    const names = guests ? `${mine.length ? mine.map(p => p.you ? t('You') : first(p.name)).join(', ') + ' + ' : ''}${guests === 1 ? t('1 guest') : t('{n} guests', { n: guests })}`
      : active.map(p => p.you ? t('You') : first(p.name)).join(', ');
    const dates = [...new Set(ses.map(s => s.date))].length;
    const count = kind === 'game' ? (n === 1 ? t('1 player') : t('{n} players', { n }))
      : kind === 'program' ? `${days.length === 1 ? t('1 session') : t('{n} sessions', { n: days.length })} · ${n === 1 ? t('1 participant') : t('{n} participants', { n })}`
      : `${ses.length === 1 ? t('1 time') : t('{n} times', { n: ses.length })}${dates > 1 ? ' · ' + t('{n} days', { n: dates }) : ''}`;
    const todayK = dk(new Date()), isToday = next && next.date === todayK;
    const status = cancelled ? { k: 'off', txt: t('Cancelled') } : past ? { k: 'done', txt: t('Played') }
      : kind === 'program' && !isToday ? { k: 'lock', txt: t('QR opens {date}', { date: P.date(T.toDate(next.date), { weekday: 'short', day: 'numeric', month: 'short' }) }) }
      : { k: 'ok', txt: t('Ready') };
    const dd = next ? Math.round((T.toDate(next.date) - new Date().setHours(0, 0, 0, 0)) / 864e5) : null;
    const when = next ? (dd <= 0 ? t('Today') : dd === 1 ? t('Tomorrow') : t('In {n} days', { n: dd })) : '';
    const ref = next || last, d0 = T.toDate((days[0] || ses[0]).date), d1 = T.toDate(last.date);
    const time = `<bdi>${P.time(ref.start)}</bdi> – <bdi>${P.time(ref.end)}</bdi>`;
    const dateLine = dates <= 1 ? `${P.date(d0, 'full')} · ${days.length > 1 ? `<bdi>${P.time(days[0].start)}</bdi> – <bdi>${P.time(last.end)}</bdi>` : time}` : `${P.date(d0, 'short')} – ${P.date(d1, 'short')} · ${time}`;
    const open = up && T.cancelInfo(b).can;
    const canRemove = p => !p.gone && !p.single && (kind === 'game' || kind === 'program') && n > 1 && open;
    const canSend = p => !p.gone && p.type === 'guest' && !!p.phone && up;
    const ticketsOf = p => p.single ? ses : ses.filter(s => s.pi === p.i);
    const nextOf = p => { const l = ticketsOf(p); return l.find(s => s.endsAt > now) || l[l.length - 1]; };
    const share = p => window.SFA_OFFER_SHARE && b.order.offer ? window.SFA_OFFER_SHARE(b, p.i) : !b.amount ? 0 : kind === 'game' ? (p.free ? 0 : (b.order.price || 0)) : Math.round((b.amount - (b.order.kit ? b.order.kit.qty * (window.SFA_PROGRAM_KIT || { price: 0 }).price : 0)) / people.length * 100) / 100;
    const endAt = cancelled ? (b.cancelledAt || 0) : past ? last.endsAt : next.startAt;
    return { b, kind, ses, days, next, last, cancelled, up, past, D, people, active, n, names, count, status, when, dateLine, open, canRemove, canSend, ticketsOf, nextOf, share, endAt, kindTxt: t(KIND[kind] || kind) };
  }

  const all = c => c.bookings.filter(b => (b.status === 'paid' || b.status === 'cancelled') && b.order.days && b.order.days.length).map(b => model(c, b));
  const fullName = p => p.name || '';
  function lists(c){
    const ms = all(c).filter(m => st.who === 'all' || m.active.some(p => fullName(p) === st.who) || (m.cancelled && m.people.some(p => fullName(p) === st.who)));
    return { up: ms.filter(m => m.up).sort((a, b) => a.endAt - b.endAt), past: ms.filter(m => m.past).sort((a, b) => b.endAt - a.endAt), off: ms.filter(m => m.cancelled).sort((a, b) => b.endAt - a.endAt) };
  }

  // ---- shared pieces
  const chip = (c, m) => `<span class="mt-st mt-st--${m.status.k}">${m.status.k === 'lock' ? c.LOCK : '<i aria-hidden="true"></i>'}${m.status.txt}${m.when && m.up ? `<em>· ${m.when}</em>` : ''}</span>`;
  function filters(c){
    const L = lists(c), segs = [['up', 'Upcoming', L.up.length], ['past', 'Past', L.past.length], ['off', 'Cancelled', L.off.length]];
    const names = [...new Set(all(c).flatMap(m => m.active.map(fullName)).filter(Boolean))], mine = c.user ? c.user.name : '';
    if (st.who !== 'all' && !names.includes(st.who)) st.who = 'all';
    const order = [mine, ...names.filter(x => x !== mine).sort()].filter(x => names.includes(x));
    return `<div class="mt-bar"><div class="seg" role="group" aria-label="${c.t('My tickets')}">${segs.map(([k, l, n]) => `<button type="button" data-mt-seg="${k}" aria-pressed="${st.seg === k}">${c.t(l)} (${n})</button>`).join('')}</div>
      ${names.length > 1 ? `<div class="types who" role="group" aria-label="${c.t('Who it’s for')}">${['all', ...order].map(k => `<button type="button" class="type" data-mt-who="${c.esc(k)}" aria-pressed="${k === st.who}">${k === 'all' ? c.t('Everyone') : k === mine ? c.t('Me') : c.esc(k.split(' ')[0])}</button>`).join('')}</div>` : ''}</div>`;
  }
  const current = c => { const L = lists(c); return st.seg === 'past' ? L.past : st.seg === 'off' ? L.off : L.up; };
  const emptyTxt = c => `<div class="empty"><strong>${c.t(st.seg === 'up' ? 'No upcoming bookings' : st.seg === 'past' ? 'No past bookings yet' : 'No cancelled bookings')}</strong>${st.seg === 'up' ? `<p>${c.t('Book a court, a game or a program and it will show up here.')}</p><a class="btn" href="courts.html">${c.t('Book a court')}${c.ARROW}</a>` : ''}</div>`;
  // a person's role under their name
  const role = (c, m, p) => p.single ? (m.kind === 'court' ? c.t('Booked for') + ' ' + (p.you ? c.t('you') : c.esc(p.name)) : '') : p.you ? c.t('You') : p.type === 'guest' ? `${c.t('Guest')} · <bdi>${c.esc(fmtPhone(p.phone))}</bdi>` : p.type === 'child' ? c.t('Child') : '';
  const fmtPhone = ph => { const d = String(ph || '').replace(/^\+966/, ''); return d ? `+966 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : ''; };
  const sentTxt = (c, p) => { const m = Math.round((Date.now() - p.sent) / 6e4); return m < 1 ? c.t('Sent just now') : m < 60 ? c.t('Sent {n} min ago', { n: m }) : c.t('Sent {when}', { when: c.P.date(new Date(p.sent), 'short') }); };
  // what you can do for one person: send their ticket (guests), remove them
  function personActs(c, m, p, big){
    const cls = big ? 'ghost sm' : 'mt-mini';
    return `${m.canSend(p) ? `<button type="button" class="${cls}" data-mt-send="${c.esc(m.b.cartId)}|${p.i}">${SEND}<span>${p.sent ? c.t('Send again') : c.t('Send ticket')}</span></button>` : ''}
      ${m.canRemove(p) ? `<button type="button" class="${cls} mt-danger" data-mt-remove="${c.esc(m.b.cartId)}|${p.i}">${RM}<span>${c.t('Remove')}</span></button>` : ''}`;
  }
  const sentLine = (c, p) => p.sent && !p.gone ? `<small class="mt-sent">${SEND}${sentTxt(c, p)} · <bdi>${c.esc(fmtPhone(p.phone))}</bdi></small>` : '';
  const goneLine = (c, m, p) => p.gone ? `<small class="mt-gone">${c.t('Removed')}${p.refund ? ' · ' + c.t('{amount} refunded', { amount: c.P.money(p.refund) }) : ''}</small>` : '';
  // a compact QR (or its lock) for one session
  function qr(c, m, s){
    if (!s) return '';
    const live = c.T.qrLive(s, m.b);
    if (m.cancelled) return `<div class="mt-qr mt-qr--off">${c.LOCK}<small>${c.t('Cancelled')}</small></div>`;
    return live === 'on' ? `<div class="mt-qr"><div class="tk-qr" data-qr="${c.esc(s.id)}" role="img" aria-label="${c.t('QR code for {ref}', { ref: c.esc(s.id) })}"></div><small><bdi>${c.esc(s.id)}</bdi></small></div>`
      : `<div class="mt-qr mt-qr--lock">${c.LOCK}<small>${live === 'soon' ? c.t('QR unlocks on {date}', { date: c.P.date(c.T.toDate(s.date), 'short') }) : c.t('This session has ended')}</small></div>`;
  }
  // the booking's own header (A and C full page; B uses a shorter one)
  function head(c, m, back, backLabel, noDetails){
    const b = m.b;
    return `${back ? `<a class="pg-back" href="#tickets" data-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>${c.t(backLabel || 'My tickets')}</a>` : ''}
      <section class="pg-head mt-head"><span class="pg-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
        <div class="pg-in"><p class="eye">${m.kindTxt}</p><h2>${c.esc(m.D.label)}</h2>
          ${noDetails ? '' : `<p class="meta">${m.dateLine}</p><p class="meta">${m.count} · ${c.esc(m.names)} · <bdi>${c.esc(b.cartId)}</bdi></p>`}
          ${chip(c, m)}
          <div class="dlg-acts">${m.up ? `<a class="ghost sm" href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}${c.t('Add to calendar')}</a><a class="ghost sm" href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${c.PIN}${c.t('Get directions')}</a>` : ''}${noDetails ? '' : `<a class="ghost sm" href="result.html?cart=${encodeURIComponent(b.cartId)}">${c.t('Booking details')}</a>`}${m.up && c.T.cancelInfo(b).can ? `<button type="button" class="ghost sm danger" data-cancel="${c.esc(b.cartId)}">${c.t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button>` : ''}</div>
          ${m.up ? c.cancelLine(b) : ''}${m.cancelled ? `<p class="cx-note off">${c.t('Cancelled')}${b.refund ? ' · ' + c.t('{amount} refunded', { amount: c.P.money(b.refund) }) : ''}</p>` : ''}</div></section>`;
  }
  // a program person's sessions, folded away
  const sessionList = (c, m, p) => { const l = m.ticketsOf(p); if (l.length < 2) return '';
    const played = l.filter(s => s.endsAt <= Date.now()).length;
    return `<details class="mt-ses"><summary>${c.t('{n} sessions', { n: l.length })} · ${c.t('{p} played', { p: played })}</summary><ol>${l.map(s => `<li><button type="button" data-mt-ticket="${c.esc(s.id)}"><span>${c.t('Session {i} of {n}', { i: s.n, n: s.of })}</span><span>${c.P.date(c.T.toDate(s.date), 'short')} · <bdi>${c.P.time(s.start)}</bdi></span>${CHEV}</button></li>`).join('')}</ol></details>`; };
  // for a court: one "unit" per time; otherwise one per person
  const units = m => m.people[0] && m.people[0].single ? m.ses.map(s => ({ s, p: m.people[0], time: true })) : m.people.map(p => ({ p, s: m.nextOf(p) }));
  const unitTitle = (c, m, u) => u.time ? `${c.P.date(c.T.toDate(u.s.date), { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi>${c.P.time(u.s.start)}</bdi>` : c.esc(u.p.name);

  // ================= A · booking cards + a ticket stub per person =================
  const A = {
    list(c){
      const l = current(c);
      return filters(c) + (l.length ? `<ol class="mt-cards">${l.map((m, i) => `<li class="mt-card${m.cancelled || m.past ? ' is-off' : ''}" style="--i:${i}">
          <button type="button" class="mt-hit" data-mt-open="${c.esc(m.b.cartId)}" aria-label="${c.t('View tickets')}: ${c.esc(m.D.label)}"></button>
          <span class="mt-ph"><img src="${m.D.img}" alt="" loading="lazy" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
          <div class="mt-body"><p class="mt-eye">${m.kindTxt}</p><strong>${c.esc(m.D.label)}</strong><p class="mt-meta">${m.dateLine}</p>
            <p class="mt-meta mt-who">${m.count} · ${c.esc(m.names)}</p>${chip(c, m)}</div>
          <div class="mt-cta"><span class="ghost sm mt-view">${c.t('View tickets')}${c.ARROW}</span>
            ${m.people.some(p => m.canSend(p) && !p.sent) ? `<button type="button" class="ghost sm" data-mt-sendall="${c.esc(m.b.cartId)}">${SEND}${c.t('Send guest tickets')}</button>` : ''}</div></li>`).join('')}</ol>` : emptyTxt(c));
    },
    view(c, m){
      return head(c, m, true) + `<section><div class="sec"><h2>${m.people[0].single && m.kind === 'court' ? c.t('Your tickets') : c.t('Tickets by person')}</h2><span>${m.people[0].single ? m.ses.length : m.n}</span></div>
        <div class="mt-stubs">${units(m).map(u => `<article class="mt-stub${u.p.gone ? ' is-gone' : ''}"><header><div><b>${unitTitle(c, m, u)}</b><small>${u.time ? (m.kind === 'court' ? c.esc(m.D.label) : '') : role(c, m, u.p)}</small></div>${!u.time && u.p.free && !u.p.gone ? `<em>${c.t('First game free')}</em>` : ''}</header>
          ${u.p.gone ? goneLine(c, m, u.p) : qr(c, m, u.s)}
          ${!u.time && !u.p.gone && m.kind === 'program' ? sessionList(c, m, u.p) : ''}${!u.time ? sentLine(c, u.p) : ''}
          ${!u.time && !u.p.gone ? `<footer>${u.s && !m.cancelled ? `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(u.s.id)}">${QRI}<span>${c.t('Full ticket')}</span></button>` : ''}${personActs(c, m, u.p)}</footer>`
            : u.time && !m.cancelled ? `<footer><button type="button" class="mt-mini" data-mt-ticket="${c.esc(u.s.id)}">${QRI}<span>${c.t('Full ticket')}</span></button></footer>` : ''}</article>`).join('')}</div>
        ${m.people.some(p => m.canRemove(p)) ? `<p class="pg-note">${c.t('You can remove one person until free cancellation ends; their share is refunded and everyone else keeps their spot.')}</p>` : ''}</section>`;
    }
  };

  // ================= B · compact rows + side panel =================
  const avatars = (c, m) => `<span class="mt-avs" aria-hidden="true">${m.active.slice(0, 4).map(p => `<i class="${p.type === 'guest' ? 'g' : ''}">${c.esc(String(p.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase())}</i>`).join('')}${m.n > 4 ? `<i class="more">+${m.n - 4}</i>` : ''}</span>`;
  const B = {
    list(c){
      const l = current(c), m = st.panel && all(c).find(x => x.b.cartId === st.panel);
      return filters(c) + (l.length ? `<ol class="rows mt-rows${st.seg !== 'up' ? ' past' : ''}">${l.map((m, i) => { const d = c.T.toDate((m.next || m.last).date);
          return `<li class="row mt-row" style="--i:${i}"><button type="button" class="open" data-mt-open="${c.esc(m.b.cartId)}" aria-label="${c.t('View tickets')}: ${c.esc(m.D.label)}"></button>
          <span class="day" aria-hidden="true"><span>${c.P.date(d, { weekday: 'short' })}</span><b>${d.getDate()}</b><small>${c.P.date(d, { month: 'short' })}</small></span>
          <span class="info"><strong>${c.esc(m.D.label)}</strong><span>${m.kindTxt} · ${m.count}</span></span>
          ${avatars(c, m)}<span class="end">${chip(c, m)}<span class="go">${c.ARROW}</span></span></li>`; }).join('')}</ol>` : emptyTxt(c))
        + (m ? B.panel(c, m) : '');
    },
    panel(c, m){
      const b = m.b;
      return `<div class="mt-scrim" data-mt-close></div><aside class="mt-panel" role="dialog" aria-modal="true" aria-labelledby="mtPH">
        <div class="mt-p-top"><p class="eye">${m.kindTxt}</p><button type="button" class="x" data-mt-close aria-label="${c.t('Close')}">${RM}</button></div>
        <div class="mt-p-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></div>
        <div class="mt-p-in"><h2 id="mtPH">${c.esc(m.D.label)}</h2><p class="meta">${m.dateLine}</p><p class="meta">${m.count} · <bdi>${c.esc(b.cartId)}</bdi></p>${chip(c, m)}
          <div class="sec mt-p-sec"><h3>${m.people[0].single ? c.t('Times') : c.t('People')}</h3><span>${m.people[0].single ? m.ses.length : m.n}</span></div>
          <ul class="mt-plist">${units(m).map(u => { const k = `${b.cartId}|${u.time ? 's' + u.s.id : u.p.i}`, on = st.open[k];
            return `<li class="${u.p.gone && !u.time ? 'is-gone' : ''}"><div class="mt-pl-row">${u.time ? `<span class="mt-av t">${c.T.toDate(u.s.date).getDate()}</span>` : `<span class="mt-av${u.p.type === 'guest' ? ' g' : ''}">${c.esc(String(u.p.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase())}</span>`}
              <div class="mt-pl-txt"><b>${unitTitle(c, m, u)}</b><small>${u.time ? '' : role(c, m, u.p)}${!u.time && u.p.free && !u.p.gone ? ` · <em>${c.t('First game free')}</em>` : ''}</small>${!u.time ? goneLine(c, m, u.p) + sentLine(c, u.p) : ''}</div>
              ${(u.time || !u.p.gone) && !m.cancelled && u.s ? `<button type="button" class="mt-mini" data-mt-toggle="${c.esc(k)}" aria-expanded="${!!on}">${QRI}<span>${c.t(on ? 'Hide ticket' : 'Ticket')}</span></button>` : ''}</div>
              ${!u.time && !u.p.gone ? `<div class="mt-pl-acts">${personActs(c, m, u.p)}</div>` : ''}
              ${on ? `<div class="mt-pl-qr">${qr(c, m, u.s)}${!u.time && m.kind === 'program' ? sessionList(c, m, u.p) : ''}</div>` : ''}</li>`; }).join('')}</ul>
          <div class="dlg-acts mt-p-acts">${m.up ? `<a class="ghost sm" href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}${c.t('Add to calendar')}</a>` : ''}<a class="ghost sm" href="result.html?cart=${encodeURIComponent(b.cartId)}">${c.t('Booking details')}</a>${m.up && c.T.cancelInfo(b).can ? `<button type="button" class="ghost sm danger" data-cancel="${c.esc(b.cartId)}">${c.t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button>` : ''}</div>
          ${m.up ? c.cancelLine(b) : ''}${m.cancelled ? `<p class="cx-note off">${c.t('Cancelled')}${b.refund ? ' · ' + c.t('{amount} refunded', { amount: c.P.money(b.refund) }) : ''}</p>` : ''}</div></aside>`;
    }
  };

  // ================= C · grouped by when + ticket wallet =================
  function bucket(c, m){
    if (!m.up) return '';
    const d = Math.round((c.T.toDate(m.next.date) - new Date().setHours(0, 0, 0, 0)) / 864e5);
    return d <= 0 ? c.t('Today') : d <= 7 ? c.t('This week') : d <= 31 ? c.t('This month') : c.t('Later');
  }
  const C = {
    list(c){
      const l = current(c); let last = null;
      return filters(c) + (l.length ? `<div class="mt-groups">${l.map((m, i) => { const g = st.seg === 'up' ? bucket(c, m) : ''; const h = g && g !== last ? `${last !== null ? '</ol>' : ''}<h3 class="mt-g">${g}</h3><ol class="mt-list">` : last === null ? '<ol class="mt-list">' : ''; last = g || last || '';
          const d = c.T.toDate((m.next || m.last).date);
          return h + `<li class="mt-li${m.up ? '' : ' is-off'}" style="--i:${i}"><button type="button" class="mt-hit" data-mt-open="${c.esc(m.b.cartId)}" aria-label="${c.t('View tickets')}: ${c.esc(m.D.label)}"></button>
            <span class="mt-date"><b>${d.getDate()}</b><small>${c.P.date(d, { month: 'short' })}</small></span>
            <span class="mt-li-in"><strong>${c.esc(m.D.label)}</strong><span>${m.kindTxt} · <bdi>${c.P.time((m.next || m.last).start)}</bdi></span><span class="mt-who">${m.count} · ${c.esc(m.names)}</span></span>
            <span class="mt-li-end">${chip(c, m)}<span class="mt-n" aria-hidden="true">${QRI}${m.people[0].single ? m.ses.length : m.n}</span></span></li>`; }).join('')}</ol></div>` : emptyTxt(c));
    },
    view(c, m){
      const us = units(m).filter(u => u.time || !u.p.gone), gone = m.people.filter(p => p.gone && !p.single);
      let k = st.pick[m.b.cartId] || 0; if (k >= us.length) k = 0;
      const u = us[k] || us[0];
      const tabs = us.length > 1 ? `<div class="mt-switch" role="tablist" aria-label="${c.t(u.time ? 'Times' : 'People')}">${us.map((x, j) => `<button type="button" role="tab" aria-selected="${j === k}" data-mt-pick="${c.esc(m.b.cartId)}|${j}">${x.time ? c.P.date(c.T.toDate(x.s.date), { day: 'numeric', month: 'short' }) + ' · ' + c.P.time(x.s.start) : c.esc(x.p.you ? c.t('You') : x.p.name.split(' ')[0])}</button>`).join('')}</div>` : '';
      const nav = us.length > 1 ? `<div class="mt-nav"><button type="button" class="mt-arrow" data-mt-pick="${c.esc(m.b.cartId)}|${(k - 1 + us.length) % us.length}" aria-label="${c.t('Previous')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><span>${c.t('{i} of {n}', { i: k + 1, n: us.length })}</span><button type="button" class="mt-arrow" data-mt-pick="${c.esc(m.b.cartId)}|${(k + 1) % us.length}" aria-label="${c.t('Next')}">${CHEV}</button></div>` : '';
      return head(c, m, true) + `<section class="mt-wallet"><div class="sec"><h2>${c.t(u && u.time ? 'Your tickets' : 'Tickets')}</h2>${nav}</div>${tabs}
        ${u && u.s ? `<div class="mt-big">${c.T.ticket(u.s, m.b)}</div>` : ''}
        ${u && !u.time ? `<div class="mt-for"><div><b>${c.esc(u.p.name)}</b><small>${role(c, m, u.p)}${u.p.free ? ` · <em>${c.t('First game free')}</em>` : ''}</small>${sentLine(c, u.p)}</div><div class="mt-for-acts">${personActs(c, m, u.p, true)}</div></div>
          ${m.kind === 'program' ? sessionList(c, m, u.p) : ''}` : ''}
        ${gone.length ? `<ul class="mt-removed">${gone.map(p => `<li><b>${c.esc(p.name)}</b>${goneLine(c, m, p)}</li>`).join('')}</ul>` : ''}</section>`;
    }
  };

  // =====================================================================================================================
  // Restructures (Ahmed, 2026-11-17: "whole restructure of the my bookings page", all four picked, inside My account).
  // Each organises the page differently; booking details reuse A's booking view (or B's panel for the Today hub).
  // =====================================================================================================================
  const typeOf = m => m.kind === 'court' && m.b.order.ladies ? 'ladies' : m.kind;
  const TYPES = [['court', 'Courts'], ['game', 'Open games'], ['program', 'Programs'], ['ladies', 'Ladies hours']];
  const initials = s => String(s || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const dayK = d => dk(d);
  const fmtDay = (c, k) => c.P.date(c.T.toDate(k), { weekday: 'short', day: 'numeric', month: 'short' });
  // every session of every live booking, once per session (not per person), with who is on it that day
  function agenda(c){
    return all(c).filter(m => !m.cancelled).flatMap(m => m.days.map(s => ({ m, s, who: m.people[0] && m.people[0].single ? [m.people[0]] : m.active.filter(p => m.ticketsOf(p).some(x => x.n === s.n)) })));
  }
  const openBtn = (c, m, label) => `<button type="button" class="mt-mini" data-mt-open="${c.esc(m.b.cartId)}">${QRI}<span>${label || c.t('Tickets')}</span></button>`;
  const whoChips = (c, m) => `<span class="mt-chips">${m.active.map(p => `<span class="mt-pchip${p.type === 'guest' ? ' g' : ''}"><i>${c.esc(initials(p.name))}</i>${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}${p.type === 'guest' ? (p.sent ? `<em class="ok" title="${c.t('Ticket sent')}">✓</em>` : '') : ''}</span>`).join('')}</span>`;

  // ---------- 1 · By booking type: each type laid out for what it is ----------
  const TYPE = {
    list(c){
      const ms = all(c), counts = Object.fromEntries(TYPES.map(([k]) => [k, ms.filter(m => typeOf(m) === k && m.up).length]));
      const have = TYPES.filter(([k]) => ms.some(m => typeOf(m) === k));
      if (!have.some(([k]) => k === st.type)) st.type = (have.find(([k]) => counts[k]) || have[0] || ['court'])[0];
      const mine = ms.filter(m => typeOf(m) === st.type), up = mine.filter(m => m.up).sort((a, b) => a.endAt - b.endAt), rest = mine.filter(m => !m.up).sort((a, b) => b.endAt - a.endAt);
      const body = st.type === 'program' ? TYPE.programs(c, up) : st.type === 'game' ? TYPE.games(c, up) : TYPE.courts(c, up);
      return `<nav class="mt-typenav" aria-label="${c.t('Booking type')}">${have.map(([k, l]) => `<button type="button" data-mt-type="${k}" aria-pressed="${k === st.type}"><span>${c.t(l)}</span><b>${counts[k]}</b></button>`).join('')}</nav>
        <section class="mt-tsec"><div class="sec"><h2>${c.t('Upcoming')}</h2><span>${up.length}</span></div>${up.length ? body : `<p class="meta">${c.t('Nothing coming up here.')}</p>`}</section>
        ${rest.length ? `<details class="mt-hist"><summary>${c.t('Past and cancelled')} <b>${rest.length}</b></summary><ol class="mt-hlist">${rest.map(m => `<li><span>${fmtDay(c, (m.last || m.ses[0]).date)}</span><strong>${c.esc(m.D.label)}</strong><span>${m.count}</span>${chip(c, m)}${openBtn(c, m)}</li>`).join('')}</ol></details>` : ''}`;
    },
    // courts and ladies hours: a reservation table, the times as chips
    courts: (c, l) => `<ol class="mt-res">${l.map(m => { const byDay = {}; m.ses.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
        return `<li><div class="mt-res-c"><span class="mt-res-ph"><img src="${m.D.img}" alt="" loading="lazy"></span><div><strong>${c.esc(m.D.label)}</strong><small>${m.count} · ${m.people[0].you ? c.t('For you') : c.t('For {name}', { name: c.esc(m.people[0].name) })}</small></div></div>
          <div class="mt-res-t">${Object.entries(byDay).map(([k, ss]) => `<div><b>${fmtDay(c, k)}</b>${ss.map(s => `<button type="button" class="mt-time" data-mt-ticket="${c.esc(s.id)}"><bdi>${c.P.time(s.start)}</bdi></button>`).join('')}</div>`).join('')}</div>
          <div class="mt-res-s">${chip(c, m)}${openBtn(c, m, c.t('Manage'))}</div></li>`; }).join('')}</ol>`,
    // open games: match cards with the players
    games: (c, l) => `<div class="mt-matches">${l.map(m => { const g = m.b.order, left = (g.spots || 0);
        return `<article class="mt-match"><header><span class="mt-match-d"><b>${c.T.toDate(m.next.date).getDate()}</b><small>${c.P.date(c.T.toDate(m.next.date), { month: 'short' })}</small></span><div><strong>${c.esc(m.D.label)}</strong><small>${c.esc(c.t(g.format || ''))} · ${c.t(g.who === 'kids' ? 'Kids 6–17' : 'Adults (18+)')} · <bdi>${c.P.time(m.next.start)}</bdi></small></div>${chip(c, m)}</header>
          <div class="mt-match-p"><small>${m.count}</small>${whoChips(c, m)}</div>
          <footer>${openBtn(c, m)}${m.people.some(p => m.canSend(p) && !p.sent) ? `<button type="button" class="mt-mini" data-mt-sendall="${c.esc(m.b.cartId)}">${SEND}<span>${c.t('Send guest tickets')}</span></button>` : ''}</footer></article>`; }).join('')}</div>`,
    // programs: subscriptions with progress, the session strip and renewal
    programs: (c, l) => `<div class="mt-subs">${l.map(m => { const now = Date.now(), played = m.days.filter(s => s.endsAt <= now).length, R = c.renewInfo(m.b);
        return `<article class="mt-sub"><span class="mt-sub-ph"><img src="${m.D.img}" alt="" loading="lazy" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
          <div class="mt-sub-in"><p class="mt-eye">${c.t(m.b.order.plan === 'trial' ? 'Free trial' : 'Subscription')} · ${c.esc(m.names)}</p><strong>${c.esc(m.D.label)}</strong>
            <p class="mt-meta">${c.t('Next session')}: ${fmtDay(c, m.next.date)} · <bdi>${c.P.time(m.next.start)}</bdi></p>${chip(c, m)}
            <div class="mt-strip" aria-label="${c.t('{p} of {n} sessions played', { p: played, n: m.days.length })}">${m.days.map(s => `<i class="${s.endsAt <= now ? 'on' : s === m.next ? 'nx' : ''}" title="${fmtDay(c, s.date)}"></i>`).join('')}</div>
            <small class="mt-meta">${c.t('{p} of {n} sessions played', { p: played, n: m.days.length })}</small>
            <div class="mt-sub-acts">${openBtn(c, m)}${R ? `<button type="button" class="mt-mini mt-accent" data-renew="${c.esc(m.b.cartId)}"><span>${c.t('Renew · 20% off')}</span></button>` : ''}</div></div></article>`; }).join('')}</div>`
  };

  // ---------- 2 · Family: organised by person ----------
  function family(c){
    const ms = all(c).filter(m => !m.cancelled), me = c.user ? c.user.name : '', map = new Map();
    for (const m of ms) for (const p of m.active){ const key = p.type === 'guest' ? 'guests' : p.name; if (!map.has(key)) map.set(key, { key, name: key === 'guests' ? c.t('Guests') : p.name, you: p.you, guest: key === 'guests', items: [] });
      map.get(key).items.push({ m, p }); }
    // people with nothing coming up drop off the page (you always stay)
    const list = [...map.values()].filter(f => f.you || f.items.some(x => x.m.up && x.m.ticketsOf(x.p).some(s => s.endsAt > Date.now()))).sort((a, b) => (b.you - a.you) || (a.guest - b.guest) || a.name.localeCompare(b.name));
    return list;
  }
  const nextFor = it => it.items.map(x => ({ ...x, s: x.m.ticketsOf(x.p).find(s => s.endsAt > Date.now()) })).filter(x => x.s).sort((a, b) => a.s.startAt - b.s.startAt);
  const FAMILY = {
    list(c){
      const fam = family(c); if (st.person !== 'all' && !fam.some(f => f.key === st.person)) st.person = 'all';
      const rail = `<nav class="mt-fam-rail" aria-label="${c.t('People')}"><button type="button" data-mt-person="all" aria-pressed="${st.person === 'all'}"><i class="all">${fam.length}</i><span>${c.t('Everyone')}</span></button>${fam.map(f => `<button type="button" data-mt-person="${c.esc(f.key)}" aria-pressed="${st.person === f.key}"><i class="${f.guest ? 'g' : ''}">${f.guest ? '+' : c.esc(initials(f.name))}</i><span>${f.you ? c.t('You') : c.esc(f.guest ? f.name : f.name.split(' ')[0])}</span></button>`).join('')}</nav>`;
      if (st.person === 'all') return rail + `<div class="mt-fam-grid">${fam.map(f => { const nx = nextFor(f)[0], n = nextFor(f).length;
          return `<article class="mt-fam-card"><button type="button" class="mt-hit" data-mt-person="${c.esc(f.key)}" aria-label="${c.esc(f.name)}"></button><header><i class="${f.guest ? 'g' : ''}">${f.guest ? '+' : c.esc(initials(f.name))}</i><div><b>${f.you ? c.esc(f.name) + ` <small>(${c.t('You')})</small>` : c.esc(f.name)}</b><small>${n === 1 ? c.t('1 upcoming session') : c.t('{n} upcoming sessions', { n })}</small></div></header>
            ${nx ? `<div class="mt-fam-next"><small>${c.t('Next')}</small><strong>${c.esc(nx.m.D.label)}</strong><span>${fmtDay(c, nx.s.date)} · <bdi>${c.P.time(nx.s.start)}</bdi></span>${chip(c, nx.m)}</div>` : `<p class="meta">${c.t('Nothing coming up.')}</p>`}</article>`; }).join('')}</div>`;
      const f = fam.find(x => x.key === st.person), nx = nextFor(f), first = nx[0];
      const books = [...new Map(f.items.map(x => [x.m.b.cartId, x])).values()].sort((a, b) => (b.m.up - a.m.up) || (a.m.up ? a.m.endAt - b.m.endAt : b.m.endAt - a.m.endAt));
      return rail + `<section class="mt-fam-person"><div class="mt-fam-h"><i class="${f.guest ? 'g' : ''}">${f.guest ? '+' : c.esc(initials(f.name))}</i><div><h2>${c.esc(f.name)}</h2><p class="meta">${nx.length === 1 ? c.t('1 upcoming session') : c.t('{n} upcoming sessions', { n: nx.length })} · ${books.length === 1 ? c.t('1 booking') : c.t('{n} bookings', { n: books.length })}</p></div></div>
        ${first && !f.guest ? `<div class="mt-fam-ticket"><div class="sec"><h3>${c.t('Next ticket')}</h3><span>${chip(c, first.m)}</span></div>${c.T.ticket(first.s, first.m.b)}</div>` : ''}
        <div class="sec"><h3>${c.t(f.guest ? 'Guest tickets' : 'Booked into')}</h3></div>
        <ol class="mt-fam-list">${books.map(({ m, p }) => { const own = f.guest ? f.items.filter(x => x.m === m).map(x => x.p) : [p], nn = m.ticketsOf(p).filter(s => s.endsAt > Date.now());
          return `<li><span class="mt-res-ph"><img src="${m.D.img}" alt="" loading="lazy"></span><div><strong>${c.esc(m.D.label)}</strong><small>${m.kindTxt} · ${nn[0] ? fmtDay(c, nn[0].date) + ' · ' + c.P.time(nn[0].start) : ''}${nn.length > 1 ? ' · ' + c.t('{n} sessions left', { n: nn.length }) : ''}</small>
            ${f.guest ? own.map(g => `<small class="mt-gst">${c.esc(g.name)} · <bdi>${c.esc(fmtPhone(g.phone))}</bdi> · ${g.sent ? sentTxt(c, g) : c.t('Not sent yet')}</small>`).join('') : ''}</div>
            <div class="mt-fam-acts">${chip(c, m)}${f.guest ? own.filter(g => m.canSend(g)).map(g => `<button type="button" class="mt-mini" data-mt-send="${c.esc(m.b.cartId)}|${g.i}">${SEND}<span>${g.sent ? c.t('Send again') : c.t('Send')}</span></button>`).join('') : ''}${openBtn(c, m)}</div></li>`; }).join('')}</ol></section>`;
    }
  };

  // ---------- 3 · Calendar: the family's sessions on a month ----------
  const KC = { court: 'k-court', ladies: 'k-ladies', game: 'k-game', program: 'k-program' };
  const CAL = {
    list(c){
      const ag = agenda(c), by = {}; ag.forEach(x => (by[x.s.date] = by[x.s.date] || []).push(x));
      const now = new Date(); if (!st.cal) st.cal = { y: now.getFullYear(), m: now.getMonth(), day: dayK(now) };
      const { y, m } = st.cal, first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), cells = [];
      for (let i = 0; i < 42; i++){ const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
      const weeks = cells.slice(35).every(d => d.getMonth() !== m) ? cells.slice(0, 35) : cells;
      const wk = [0, 1, 2, 3, 4, 5, 6].map(i => c.P.date(new Date(2026, 0, 4 + i), { weekday: 'short' }));
      const sel = by[st.cal.day] || [], todayK = dayK(now);
      const upNext = ag.filter(x => x.s.endsAt > Date.now()).sort((a, b) => a.s.startAt - b.s.startAt).slice(0, 5);
      return `<div class="mt-cal"><div class="mt-cal-m"><div class="mt-cal-h"><h2>${c.P.date(first, { month: 'long', year: 'numeric' })}</h2><div><button type="button" class="mt-arrow" data-mt-cal="-1" aria-label="${c.t('Previous month')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><button type="button" class="mt-mini" data-mt-cal="0">${c.t('Today')}</button><button type="button" class="mt-arrow" data-mt-cal="1" aria-label="${c.t('Next month')}">${CHEV}</button></div></div>
          <div class="mt-grid" role="grid"><div class="mt-wk" role="row">${wk.map(w => `<span role="columnheader">${w}</span>`).join('')}</div>
          <div class="mt-days">${weeks.map(d => { const k = dayK(d), xs = by[k] || [];
            return `<button type="button" role="gridcell" class="mt-day${d.getMonth() !== m ? ' oth' : ''}${k === todayK ? ' now' : ''}${k === st.cal.day ? ' sel' : ''}${k < todayK ? ' past' : ''}" data-mt-day="${k}" aria-label="${c.P.date(d, 'full')}${xs.length ? ', ' + (xs.length === 1 ? c.t('1 session') : c.t('{n} sessions', { n: xs.length })) : ''}"><b>${d.getDate()}</b><span class="mt-dots">${xs.slice(0, 4).map(x => `<i class="${KC[typeOf(x.m)]}"></i>`).join('')}</span></button>`; }).join('')}</div></div>
          <p class="mt-legend">${TYPES.map(([k, l]) => `<span><i class="${KC[k]}"></i>${c.t(l)}</span>`).join('')}</p></div>
        <aside class="mt-cal-d"><div class="sec"><h3>${c.P.date(c.T.toDate(st.cal.day), 'full')}</h3><span>${sel.length}</span></div>
          ${sel.length ? `<ol class="mt-cal-list">${sel.sort((a, b) => a.s.start - b.s.start).map(x => `<li class="${KC[typeOf(x.m)]}"><span class="mt-cal-t"><bdi>${c.P.time(x.s.start)}</bdi><small><bdi>${c.P.time(x.s.end)}</bdi></small></span>
              <div><strong>${c.esc(x.m.D.label)}</strong><small>${x.m.kindTxt}${x.s.of > 1 ? ' · ' + c.t('Session {i} of {n}', { i: x.s.n, n: x.s.of }) : ''}</small>${whoChips(c, { ...x.m, active: x.who })}</div>
              <div class="mt-cal-a">${chip(c, x.m)}${x.who.length === 1 ? (() => { const s = x.m.ticketsOf(x.who[0]).find(t => t.n === x.s.n) || x.s; return `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(s.id)}">${QRI}<span>${c.t('Ticket')}</span></button>`; })() : openBtn(c, x.m)}</div></li>`).join('')}</ol>`
            : `<p class="meta">${c.t('Nothing booked on this day.')}</p>`}
          <div class="sec mt-cal-next"><h3>${c.t('Coming up')}</h3></div>
          <ol class="mt-cal-up">${upNext.map(x => `<li><button type="button" data-mt-day="${x.s.date}"><span>${fmtDay(c, x.s.date)} · <bdi>${c.P.time(x.s.start)}</bdi></span><strong>${c.esc(x.m.D.label)}</strong></button></li>`).join('')}</ol></aside></div>`;
    }
  };

  // ---------- 4 · Today hub: scan today, what needs doing, programs, then the rest ----------
  const TODAY = {
    list(c){
      const ms = all(c), now = Date.now(), todayK = dayK(new Date()), ag = agenda(c);
      const today = ag.filter(x => x.s.date === todayK && x.s.endsAt > now).sort((a, b) => a.s.start - b.s.start);
      const later = ag.filter(x => x.s.date > todayK).sort((a, b) => a.s.startAt - b.s.startAt);
      // things that need you: guests without their ticket, renewals, free cancellation ending in the next 3 days
      const todo = [];
      ms.filter(m => m.up).forEach(m => {
        const g = m.people.filter(p => m.canSend(p) && !p.sent); if (g.length) todo.push(`<li><span class="mt-todo-i">${SEND}</span><div><b>${g.length === 1 ? c.t('Send {name} their ticket', { name: c.esc(g[0].name.split(' ')[0]) }) : c.t('Send {n} guests their tickets', { n: g.length })}</b><small>${c.esc(m.D.label)} · ${fmtDay(c, m.next.date)}</small></div><button type="button" class="mt-mini" data-mt-sendall="${c.esc(m.b.cartId)}">${c.t('Send')}</button></li>`);
        if (c.renewInfo(m.b)) todo.push(`<li><span class="mt-todo-i">%</span><div><b>${c.t('Renew {name} · 20% off', { name: c.esc(m.D.label) })}</b><small>${c.esc(m.names)}</small></div><button type="button" class="mt-mini mt-accent" data-renew="${c.esc(m.b.cartId)}">${c.t('Renew')}</button></li>`);
        const C = c.T.cancelInfo(m.b); if (C.can && C.by - now < 3 * 864e5) todo.push(`<li><span class="mt-todo-i">!</span><div><b>${c.t('Free cancellation ends {when}', { when: c.P.date(C.by, 'short') + ' · ' + c.P.time(C.by.getHours() * 60 + C.by.getMinutes()) })}</b><small>${c.esc(m.D.label)} · ${m.count}</small></div>${openBtn(c, m, c.t('Manage'))}</li>`);
      });
      const progs = ms.filter(m => m.up && m.kind === 'program');
      const groups = []; let gk = null;
      later.slice(0, 12).forEach(x => { const d = Math.round((c.T.toDate(x.s.date) - new Date().setHours(0, 0, 0, 0)) / 864e5), k = d === 1 ? c.t('Tomorrow') : d <= 7 ? c.t('This week') : c.t('Later'); if (k !== gk){ groups.push({ k, xs: [] }); gk = k; } groups[groups.length - 1].xs.push(x); });
      const hist = ms.filter(m => !m.up).sort((a, b) => b.endAt - a.endAt);
      return `<section class="mt-today"><div class="sec"><h2>${c.t('Today')}</h2><span>${c.P.date(new Date(), 'full')}</span></div>
          ${today.length ? `<div class="mt-scan">${today.flatMap(x => x.who.map(p => ({ x, p, s: x.m.ticketsOf(p).find(t => t.n === x.s.n) || x.s }))).map(({ x, p, s }) => `<article class="mt-scan-t"><header><b>${c.esc(p.you ? c.t('You') : p.name)}</b><small><bdi>${c.P.time(s.start)}</bdi> · ${c.esc(x.m.D.label)}</small></header>${qr(c, x.m, s)}<button type="button" class="mt-mini" data-mt-ticket="${c.esc(s.id)}">${c.t('Full ticket')}</button></article>`).join('')}</div>`
            : `<div class="mt-none"><b>${c.t('Nothing today')}</b>${later[0] ? `<span>${c.t('Next: {what}, {when}', { what: c.esc(later[0].m.D.label), when: fmtDay(c, later[0].s.date) + ' · ' + c.P.time(later[0].s.start) })}</span>` : ''}</div>`}</section>
        ${todo.length ? `<section class="mt-todo"><div class="sec"><h2>${c.t('To do')}</h2><span>${todo.length}</span></div><ul>${todo.join('')}</ul></section>` : ''}
        ${progs.length ? `<section><div class="sec"><h2>${c.t('Programs')}</h2><span>${progs.length}</span></div>${TYPE.programs(c, progs)}</section>` : ''}
        <section><div class="sec"><h2>${c.t('Coming up')}</h2><span>${ms.filter(m => m.up).length}</span></div>
          ${groups.map(g => `<h3 class="mt-g">${g.k}</h3><ol class="mt-list">${g.xs.map(x => { const d = c.T.toDate(x.s.date);
            return `<li class="mt-li"><button type="button" class="mt-hit" data-mt-open="${c.esc(x.m.b.cartId)}" aria-label="${c.esc(x.m.D.label)}"></button><span class="mt-date"><b>${d.getDate()}</b><small>${c.P.date(d, { month: 'short' })}</small></span>
              <span class="mt-li-in"><strong>${c.esc(x.m.D.label)}</strong><span>${x.m.kindTxt} · <bdi>${c.P.time(x.s.start)}</bdi>${x.s.of > 1 ? ' · ' + c.t('Session {i} of {n}', { i: x.s.n, n: x.s.of }) : ''}</span><span class="mt-who">${c.esc(x.who.map(p => p.you ? c.t('You') : p.name.split(' ')[0]).join(', '))}</span></span>
              <span class="mt-li-end">${chip(c, x.m)}</span></li>`; }).join('')}</ol>`).join('')}</section>
        ${hist.length ? `<details class="mt-hist"><summary>${c.t('Past and cancelled')} <b>${hist.length}</b></summary><ol class="mt-hlist">${hist.map(m => `<li><span>${fmtDay(c, (m.last || m.ses[0]).date)}</span><strong>${c.esc(m.D.label)}</strong><span>${m.count}</span>${chip(c, m)}${openBtn(c, m)}</li>`).join('')}</ol></details>` : ''}`
        + (st.panel ? (() => { const m = ms.find(x => x.b.cartId === st.panel); return m ? B.panel(c, m) : ''; })() : '');
    }
  };


  // =====================================================================================================================
  // My bookings (Ahmed, 2026-11-17): "it should be my booking and the booking should be a group of tickets as I booked,
  // inside it I can filter by user". The list is bookings; a booking opens to every ticket in it, filtered by person.
  // =====================================================================================================================

  // ---- the confirmation's details, on the booking page (Ahmed, 2026-11-17): what, when, where, who, ref (copy), payment
  const IC = {
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8.5h.01"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/></svg>',
    hash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9z"/><path d="M5 15H4V4h11v1"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/></svg>'
  };
  // the booking's facts and payment as data, so every booking-page layout can show them its own way
  function factsOf(c, m){
    const b = m.b, o = b.order, T = c.T, P = c.P, t = c.t, esc = c.esc, n = m.days.length, prog = m.kind === 'program' && window.SFA_PROGRAMS[o.program];
    const sport = window.SFA_SPORTS[o.sport], court = sport && sport.courts[o.court];
    const s0 = m.days[0], slot = prog && prog.slots.find(x => x.time === s0.start), coach = slot ? T.tx(slot.coach) : '';
    const sameTime = m.days.every(s => s.start === s0.start), wk = [...new Set(m.days.map(s => T.toDate(s.date).getDay()))].sort((a, b) => a - b);
    const pattern = n > 1 && sameTime && wk.length < n ? `${wk.map(d => P.date(new Date(2026, 0, 4 + d), { weekday: 'short' })).join(P.lang === 'ar' ? '، ' : ', ')} · <bdi>${P.time(s0.start)}</bdi> – <bdi>${P.time(s0.end)}</bdi>` : '';
    const nDays = [...new Set(m.ses.map(x => x.date))].length;
    const when = n === 1 ? [P.date(T.toDate(s0.date), 'full'), `<bdi>${P.time(s0.start)}</bdi> – <bdi>${P.time(s0.end)}</bdi>`]
      : nDays === 1 ? [P.date(T.toDate(s0.date), 'full'), m.days.map(s => `<bdi>${P.time(s.start)}</bdi>`).join(' · ')]
      : [`${P.date(T.toDate(s0.date), 'short')} – ${P.date(T.toDate(m.last.date), 'short')}`, pattern || t('{n} sessions', { n })];
    const bf = o.bookingFor || { type: 'me' }, many = m.active.length > 1, players = !!o.participants;
    const who = players ? m.active.map(p => esc(p.name)).join(', ') : bf.type === 'other' ? `${esc(bf.name)} · <bdi>${esc(bf.phone || '')}</bdi>` : bf.type === 'child' ? esc(bf.name) : esc(c.user ? c.user.name : t('Myself'));
    const w = o.waiver, by = w && w.guardian ? `${esc(w.acceptedBy)} · ${t('Guardian')}` : '';
    const info = prog ? [IC.tag, t('Program'), t('{n} sessions', { n }) + (prog.minutes ? ` · ${t('{m} min each', { m: prog.minutes })}` : ''), coach ? esc(coach) : '']
      : m.kind === 'game' ? [IC.tag, t('Game'), esc(t(o.format || '')), o.who ? t({ adults: 'Adults (18+)', kids: 'Kids 6–17' }[o.who]) : ''] : null;
    const facts = [
      [IC.cal, t('When'), when[0], when[1]],
      [IC.pin, t('Where'), t('SFA Domes Dammam'), prog ? '' : esc(t(court ? court[0] : '')) + (o.ladies ? ` · ${t('Ladies hours')}` : '')],
      [IC.user, t(prog ? (many ? 'Participants' : 'Participant') : players ? (many ? 'Players' : 'Player') : 'Booked for'), who, by ? t('Booked by {name}', { name: by }) : ''],
      info
    ].filter(Boolean);
    const K = window.SFA_PROGRAM_KIT, kit = o.kit;
    const plan = prog ? t({ trial: 'Free trial', month: 'One month', month2: 'Two months', month3: 'Three months' }[o.plan] || 'One month') + (o.renewOf ? ' · ' + t('Renewal · 20% off') : '') : '';
    const sessionsTxt = prog ? t('{n} × {m} min', { n, m: prog.minutes }) : m.kind === 'game' ? t('1 game · 1.5 hr') : `${nDays === 1 ? t('1 day') : t('{n} days', { n: nDays })} · ${t('{n} × 1.5 hr', { n })}`;
    const pay = [
      prog ? [t('Plan'), plan] : null,
      kit && K ? [T.tx(K.name), `× ${kit.qty}`] : null,
      b.paidAt && !b.free ? [t('Paid on'), P.date(new Date(b.paidAt), 'full')] : null,
      b.tranRef ? [t(b.test ? 'Test ref' : 'PayTabs ref'), `<bdi>${esc(b.tranRef)}</bdi>`] : null
    ].filter(Boolean);
    const refunded = b.refund || 0, email = (b.payer && b.payer.email) || (c.user && c.user.email) || '';
    return { facts, pay, refunded, email, paid: b.free || !b.amount ? t('Free of charge') : P.money(b.amount), when, who, by, coach, prog };
  }
  function details(c, m){
    const b = m.b, t = c.t, esc = c.esc, P = c.P, { facts, pay, refunded } = factsOf(c, m);
    return `<section class="mt-det" aria-labelledby="mtDetH"><h2 class="mt-det-h" id="mtDetH">${t('Booking details')}</h2><div class="mt-det-in">
      <div class="mt-det-l"><dl class="mt-facts">${facts.map(([ic, k, v, sub]) => `<div><span class="mt-fic">${ic}</span><dt>${k}</dt><dd>${v}${sub ? `<small>${sub}</small>` : ''}</dd></div>`).join('')}
          <div class="mt-refrow"><span class="mt-fic">${IC.hash}</span><dt>${t('Booking ref')}</dt><dd><bdi>${esc(b.cartId)}</bdi></dd><button type="button" class="mt-copy" data-mt-copy="${esc(b.cartId)}" aria-label="${t('Copy booking ref')}">${IC.copy}<span>${t('Copy')}</span></button></div></dl>
        ${(() => { const em = (b.payer && b.payer.email) || (c.user && c.user.email); return em ? `<p class="mt-mail">${IC.mail}<span>${t('A confirmation email was sent to {email}', { email: `<bdi>${esc(em)}</bdi>` })}</span></p>` : ''; })()}</div>
      <aside class="mt-pay"><h3>${t('Payment')}</h3><dl>${pay.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        <div class="mt-pay-t"><dt>${t('Paid')}</dt><dd>${b.free || !b.amount ? t('Free of charge') : P.money(b.amount)}</dd></div>
        ${refunded ? `<div class="mt-pay-r"><dt>${t('Refunded')}</dt><dd>− ${P.money(refunded)}</dd></div>` : ''}</dl></aside></div></section>`;
  }

  // ---- training program card (Ahmed, 2026-11-17): one card per participant with one QR code and a balance of sessions.
  // A scan at reception (check-in) takes one session off; missed sessions stay until the program ends. The QR works on
  // training days only. The demo has "Simulate check-in" in place of the reception scanner.
  function programCard(c, m, p){
    const b = m.b, x = (b.order.participants || [])[p.i] || {}, ck = x.checkins || [], total = m.days.length, left = Math.max(0, total - ck.length);
    const now = Date.now(), todayK = dk(new Date()), today = m.days.find(s => s.date === todayK), next = m.days.find(s => s.endsAt > now), last = m.days[m.days.length - 1];
    const ended = !next, inToday = ck.some(k => k.date === todayK), code = `${b.cartId}-C${p.i + 1}`, t = c.t, D3 = window.SFA_CARD3D;
    const live = !m.cancelled && !ended && !!today && left > 0;
    const short = d => c.P.date(c.T.toDate(d), { weekday: 'short', day: 'numeric', month: 'short' });
    const lock = m.cancelled ? t('Cancelled') : ended ? t('Program ended') : left <= 0 ? t('No sessions left') : t('QR opens {date}', { date: short(next.date) });
    // 3D (Ahmed, 2026-11-18: "make it 3d card"): the front is what reception scans, the back has the details and actions
    const head = `<header class="c3d-h"><div><small>${t('Program card')}</small><b>${c.esc(p.name)}</b></div><span class="c3d-no"><bdi>${c.esc(code)}</bdi></span></header>`;
    const front = head + `<div class="c3d-m"><div class="c3d-q">${live ? `<div class="tk-qr" data-qr="${c.esc(code)}" role="img" aria-label="${t('QR code for {ref}', { ref: c.esc(code) })}"></div>` : `<div class="c3d-lock">${c.LOCK}<small>${lock}</small></div>`}</div>
        <div class="c3d-k"><small>${t('Balance')}</small><p class="c3d-big"><b>${left}</b><span>/ ${total} ${t('sessions left')}</span></p>
          <div class="c3d-dots" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < ck.length ? 'used' : ''}"></i>`).join('')}</div>
          <p class="c3d-sub">${c.esc(m.D.label)}</p></div></div>
      <footer class="c3d-f"><small>${live ? t('Show this at reception') : next ? `${t('Next session')} · ${short(next.date)} · <bdi>${c.P.time(next.start)}</bdi>` : ''}</small>${D3.flip(t('Details'))}</footer>`;
    const back = `<header class="c3d-h"><div><small>${t('Program card')}</small><b>${c.esc(p.name)}</b></div>${D3.flip(t('Card'), true)}</header>
      <div class="c3d-bk"><dl><div><dt>${t('Card number')}</dt><dd><bdi>${c.esc(code)}</bdi></dd></div><div><dt>${t('Sessions left')}</dt><dd>${left} / ${total}</dd></div><div><dt>${t('Used')}</dt><dd>${ck.length}</dd></div>
          <div><dt>${ended ? t('Ended') : t('Next session')}</dt><dd>${next ? `${short(next.date)} · <bdi>${c.P.time(next.start)}</bdi>` : c.P.date(c.T.toDate(last.date), 'short')}</dd></div><div><dt>${t('Valid until')}</dt><dd>${c.P.date(c.T.toDate(last.date), 'short')}</dd></div></dl>
        ${ck.length ? `<details class="mt-pc-ck"><summary>${t('Check-ins')} <b>${ck.length}</b></summary><ol>${ck.slice().reverse().map(k => `<li>${short(k.date)} · <bdi>${c.P.time(new Date(k.at).getHours() * 60 + new Date(k.at).getMinutes())}</bdi></li>`).join('')}</ol></details>` : `<small class="mt-pc-none">${t('No check-ins yet')}</small>`}</div>
      <footer class="c3d-f"><div class="c3d-acts">${live && !inToday ? `<button type="button" class="mt-mini mt-accent" data-mt-checkin="${c.esc(b.cartId)}|${p.i}"><span>${t('Simulate check-in')}</span></button>` : live && inToday ? `<span class="mt-st mt-st--ok"><i></i>${t('Checked in today')}</span>` : ''}${personActs(c, m, p)}</div></footer>`;
    return D3.card({ id: code, front, back, cls: 'c3d--v' + (live ? '' : ' is-locked'), label: `${t('Program card')} · ${p.name}` });
  }
  // court and open-game tickets as the same 3D card (Ahmed, 2026-11-18): a court has one card per time, a game one per player
  function ticketCard(c, m, r){
    const t = c.t, D3 = window.SFA_CARD3D, s = r.s, b = m.b, now = Date.now();
    if (!s) return '';
    const live = !m.cancelled && !r.gone && s.endsAt > now && c.T.qrLive(s, b) === 'on', d = c.T.toDate(s.date);
    const kind = m.kind === 'game' ? t('Open game') : b.order.ladies ? t('Ladies hours') : t('Court booking');
    const title = r.time ? c.esc(m.D.label) : r.name, who = r.time ? (m.people[0] && !m.people[0].you ? c.esc(m.people[0].name) : t('You')) : r.type;
    const lockTxt = r.gone ? t('Removed') : r.st[1];
    const when = `${c.P.date(d, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi>`;
    const front = `<header class="c3d-h"><div><small>${kind}</small><b>${title}</b></div><span class="c3d-no"><bdi>${c.esc(r.no || s.id)}</bdi></span></header>
      <div class="c3d-m"><div class="c3d-q">${live ? `<div class="tk-qr" data-qr="${c.esc(s.id)}" role="img" aria-label="${t('QR code for {ref}', { ref: c.esc(s.id) })}"></div>` : `<div class="c3d-lock">${c.LOCK}<small>${lockTxt}</small></div>`}</div>
        <div class="c3d-k"><small>${c.P.date(d, { weekday: 'long' })}</small><p class="c3d-big"><b>${d.getDate()}</b><span>${c.P.date(d, { month: 'long' })}</span></p>
          <p class="c3d-sub"><bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi></p><p class="c3d-sub">${r.time ? who : c.esc(m.D.label)}${!r.time && who ? ' · ' + who : ''}</p>
          ${r.free ? `<div class="c3d-tags"><span class="pj-tag">${t('First game free')}</span></div>` : ''}</div></div>
      <footer class="c3d-f"><small>${live ? t('Show this at reception') : ''}</small>${D3.flip(t('Details'))}</footer>`;
    const back = `<header class="c3d-h"><div><small>${kind}</small><b>${title}</b></div>${D3.flip(t('Card'), true)}</header>
      <div class="c3d-bk"><dl><div><dt>${t('When')}</dt><dd>${when}</dd></div><div><dt>${t('Where')}</dt><dd>${c.esc(m.D.label)} · ${t('SFA Domes Dammam')}</dd></div>
          ${!r.time ? `<div><dt>${t('Player')}</dt><dd>${r.name}${r.phone ? ` · <bdi>${c.esc(r.phone)}</bdi>` : ''}</dd></div>` : ''}<div><dt>${t('Ticket')}</dt><dd><bdi>${c.esc(s.id)}</bdi></dd></div><div><dt>${t('Booking ref')}</dt><dd><bdi>${c.esc(b.cartId)}</bdi></dd></div>
          <div><dt>${t('Status')}</dt><dd>${stTag(c, r.st)}</dd></div></dl>${r.sent ? `<small class="bv-sent${r.sentOk ? ' is-ok' : ''}">${SEND}${r.sent}</small>` : ''}</div>
      <footer class="c3d-f"><div class="c3d-acts">${rowActs(c, m, r)}</div></footer>`;
    return D3.card({ id: s.id + (r.p ? '|' + r.p.i : ''), front, back, cls: (live ? '' : 'is-locked') + (r.done || r.gone ? ' is-off' : ''), label: `${kind} · ${r.name}` });
  }
  // renew a program for another month at 20% off (Ahmed, 2026-11-18: "add option for renew program subscription and show
  // the discount"): shown on every running monthly program; open any time until a week after it ends (2026-11-18)
  function renewBox(c, m){
    if (m.kind !== 'program' || m.cancelled) return '';
    const R = c.renewSoon && c.renewSoon(m.b); if (!R) return '';
    const t = c.t, n = m.active.length, was = R.p.month * n, now = window.SFA_RENEW_PRICE(R.p) * n, d = k => c.P.date(c.T.toDate(k), 'short');
    return `<div class="c3d-renew bv-renew"><b>${t('Renew for another month')} <em>${t('20% off')}</em></b>
      <small><s>${c.P.money(was)}</s> <strong>${c.P.money(now)}</strong> · ${t('Starts {date} at the same time, for the same participants.', { date: d(R.start) })} ${R.open ? t('Renewal is open until {date}.', { date: d(R.until) }) : t('Renewal opens {date}.', { date: d(R.from) })}</small>
      <button type="button" class="btn sm"${R.open ? ` data-renew="${c.esc(m.b.cartId)}"` : ' disabled'}>${R.open ? t('Renew program') : t('Opens {date}', { date: d(R.from) })}</button></div>`;
  }
  const tixCount = m => m.kind === 'program' ? m.active.length : m.ses.length;   // a program counts cards, the rest tickets
  const tixWord = (c, m, n) => m.kind === 'program' ? (n === 1 ? c.t('card') : c.t('cards')) : (n === 1 ? c.t('ticket') : c.t('tickets'));
  const BOOK = {
    list(c){
      st.who = 'all';
      // type filter under Upcoming / Past / Cancelled (Ahmed, 2026-11-17): All, Courts, Open games, Programs, Ladies hours
      const L = lists(c), byT = l => st.kt === 'all' ? l : l.filter(m => typeOf(m) === st.kt);
      const seg = st.seg === 'past' ? L.past : st.seg === 'off' ? L.off : L.up;
      const kinds = TYPES.filter(([k]) => [...L.up, ...L.past, ...L.off].some(m => typeOf(m) === k));
      if (st.kt !== 'all' && !kinds.some(([k]) => k === st.kt)) st.kt = 'all';
      const segs = [['up', 'Upcoming', byT(L.up).length], ['past', 'Past', byT(L.past).length], ['off', 'Cancelled', byT(L.off).length]], l = byT(seg);
      return `<div class="mt-bar mt-bar--stack"><div class="seg" role="group" aria-label="${c.t('My bookings')}">${segs.map(([k, lb, n]) => `<button type="button" data-mt-seg="${k}" aria-pressed="${st.seg === k}">${c.t(lb)} (${n})</button>`).join('')}</div>
          ${kinds.length > 1 ? `<div class="types mt-kt" role="group" aria-label="${c.t('Booking type')}">${[['all', 'All'], ...kinds].map(([k, lb]) => `<button type="button" class="type" data-mt-kt="${k}" aria-pressed="${st.kt === k}">${k === 'all' ? '' : `<i class="mt-kt-dot ${KC[k]}" aria-hidden="true"></i>`}${c.t(lb)}<b>${k === 'all' ? seg.length : seg.filter(m => typeOf(m) === k).length}</b></button>`).join('')}</div>` : ''}</div>`
        + (l.length ? `<ol class="mt-cards mt-bk">${l.map((m, i) => `<li class="mt-card${m.up ? '' : ' is-off'}" style="--i:${i}">
          <button type="button" class="mt-hit" data-mt-open="${c.esc(m.b.cartId)}" aria-label="${c.t('Open booking')}: ${c.esc(m.D.label)}"></button>
          <span class="mt-ph"><img src="${m.D.img}" alt="" loading="lazy" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
          <div class="mt-body"><p class="mt-eye">${m.kindTxt} · <bdi>${c.esc(m.b.cartId)}</bdi></p><strong>${c.esc(m.D.label)}</strong><p class="mt-meta">${m.dateLine}</p>
            <p class="mt-meta mt-who">${m.count} · ${c.esc(m.names)}</p>${chip(c, m)}</div>
          <div class="mt-cta mt-bk-n"><span class="mt-tix">${window.SFA_CARD3D ? window.SFA_CARD3D.mini({ kind: m.kind === 'program' ? c.t('Program card') : c.t('Ticket'), n: tixCount(m), locked: !m.up, icon: QRI }) : QRI}<b>${tixCount(m)}</b><small>${tixWord(c, m, tixCount(m))}</small></span><span class="ghost sm mt-view">${c.t('Open booking')}${c.ARROW}</span></div></li>`).join('')}</ol>` : emptyTxt(c));
    },
    view(c, m){
      // Manage rail is the live booking page (Ahmed picked it, 2026-11-17); ?bv=was shows the page it replaced
      const bv = bvOf() || 'rail'; if (BV[bv]) return `<div class="bv bv-${bv}">${BV[bv](c, m)}</div>`;
      const b = m.b, multi = !(m.people[0] && m.people[0].single) && m.active.length > 1, now = Date.now();
      let f = st.tf[b.cartId]; if (f === undefined || (f !== 'all' && !m.active.some(p => p.i === f))) f = st.tf[b.cartId] = 'all';
      const P0 = f === 'all' ? null : m.people.find(p => p.i === f);
      const list = (P0 ? m.ticketsOf(P0) : m.ses).slice().sort((x, y) => x.startAt - y.startAt || (x.pi || 0) - (y.pi || 0));
      const up = list.filter(s => s.endsAt > now), done = list.filter(s => s.endsAt <= now);
      const nameOf = s => { const p = m.people.find(x => x.i === s.pi); return p ? (p.you ? c.t('You') : p.name) : (m.people[0].you ? c.t('You') : m.people[0].name); };
      const stat = s => m.cancelled ? `<span class="mt-st mt-st--off"><i></i>${c.t('Cancelled')}</span>` : s.endsAt <= now ? `<span class="mt-st mt-st--done"><i></i>${c.t('Played')}</span>`
        : c.T.qrLive(s, b) === 'on' ? `<span class="mt-st mt-st--ok"><i></i>${c.t('QR ready')}</span>` : `<span class="mt-st mt-st--lock">${c.LOCK}${c.t('QR opens {date}', { date: c.P.date(c.T.toDate(s.date), { weekday: 'short', day: 'numeric', month: 'short' }) })}</span>`;
      const row = s => { const d = c.T.toDate(s.date);
        return `<li class="mt-tk${s.endsAt <= now ? ' is-done' : ''}"><span class="day" aria-hidden="true"><span>${c.P.date(d, { weekday: 'short' })}</span><b>${d.getDate()}</b><small>${c.P.date(d, { month: 'short' })}</small></span>
          <div class="mt-tk-in"><strong>${multi && !P0 ? c.esc(nameOf(s)) : (s.of > 1 ? c.t('Session {i} of {n}', { i: s.n, n: s.of }) : c.esc(m.D.label))}</strong>
            <small><bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi>${multi && !P0 && s.of > 1 ? ' · ' + c.t('Session {i} of {n}', { i: s.n, n: s.of }) : ''} · <bdi>${c.esc(s.id)}</bdi></small></div>
          <div class="mt-tk-e">${stat(s)}${!m.cancelled ? `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(s.id)}">${QRI}<span>${c.t('Show ticket')}</span></button>` : ''}</div></li>`; };
      const chips = multi ? `<div class="types mt-tf" role="group" aria-label="${c.t('Filter tickets by person')}"><button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|all" aria-pressed="${f === 'all'}">${c.t('Everyone')}<b>${m.ses.length}</b></button>${m.active.map(p => `<button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|${p.i}" aria-pressed="${f === p.i}">${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}<b>${m.ticketsOf(p).length}</b></button>`).join('')}</div>` : '';
      const pbar = P0 ? `<div class="mt-for"><div><b>${c.esc(P0.name)}</b><small>${role(c, m, P0)}${P0.free ? ` · <em>${c.t('First game free')}</em>` : ''}</small>${sentLine(c, P0)}</div><div class="mt-for-acts">${personActs(c, m, P0, true)}</div></div>` : '';
      const gone = m.people.filter(p => p.gone && !p.single);
      const R = c.renewInfo(b);
      return head(c, m, true, 'My bookings', true) + details(c, m)
        + (R ? `<div class="pg-renew mt-renew"><div><b>${c.t('Renew for another month · 20% off')}</b><p>${c.t('Starts {date} at the same time, for the same participants.', { date: c.P.date(c.T.toDate(R.start), 'short') })}</p></div><button type="button" class="btn sm" data-renew="${c.esc(b.cartId)}">${c.t('Renew program')}</button></div>` : '')
        + (m.kind === 'program' ? (() => { const ps = P0 ? [P0] : m.active, chipsP = multi ? `<div class="types mt-tf" role="group" aria-label="${c.t('Filter cards by person')}"><button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|all" aria-pressed="${f === 'all'}">${c.t('Everyone')}</button>${m.active.map(p => `<button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|${p.i}" aria-pressed="${f === p.i}">${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}</button>`).join('')}</div>` : '';
            return `<section class="mt-tix-sec"><div class="sec"><h2>${c.t(ps.length === 1 ? 'Program card' : 'Program cards')}</h2><span>${ps.length}</span></div>${chipsP}
              <p class="pg-note">${c.t('One card per participant: show its QR code at reception on training days. Each check-in uses one session from the balance.')}</p>
              <div class="mt-pcs">${ps.map(p => programCard(c, m, p)).join('')}</div>${gone.length ? `<ul class="mt-removed">${gone.map(p => `<li><b>${c.esc(p.name)}</b>${goneLine(c, m, p)}</li>`).join('')}</ul>` : ''}</section>`; })()
        : `<section class="mt-tix-sec"><div class="sec"><h2>${c.t('Tickets')}</h2><span>${list.length}</span></div>${chips}${pbar}
          ${up.length ? `<ol class="mt-tks">${up.map(row).join('')}</ol>` : `<p class="meta">${c.t(m.cancelled ? 'This booking was cancelled.' : 'No upcoming tickets in this booking.')}</p>`}
          ${done.length ? `<details class="mt-hist"${up.length ? '' : ' open'}><summary>${c.t('Played')} <b>${done.length}</b></summary><ol class="mt-tks">${done.map(row).join('')}</ol></details>` : ''}
          ${gone.length ? `<ul class="mt-removed">${gone.map(p => `<li><b>${c.esc(p.name)}</b>${goneLine(c, m, p)}</li>`).join('')}</ul>` : ''}</section>`);
    }
  };

  // =====================================================================================================================
  // Booking page redesigns (Ahmed, 2026-11-17: "a redesign for my booking details page, complete new"; he picked Wallet
  // first, Timeline and Split screen). Open with profile.html?bv=wallet|timeline|split#tickets/<ref>; without ?bv the
  // live booking page is unchanged. Same data and actions as the live page (tickets or program cards, person filter,
  // details, payment, send / remove / cancel / renew), laid out three different ways.
  // =====================================================================================================================
  const bvOf = () => (new URLSearchParams(location.search).get('bv') || '').toLowerCase();
  const NAV = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'}"/></svg>`;
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  function bvActs(c, m){
    const b = m.b, t = c.t, esc = c.esc, R = c.renewInfo(b), out = [];
    if (m.up){ out.push(`<a class="bv-act" href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}<span>${t('Add to calendar')}</span></a>`); out.push(`<a class="bv-act" href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${c.PIN}<span>${t('Get directions')}</span></a>`); }
    if (m.people.some(p => m.canSend(p) && !p.sent)) out.push(`<button type="button" class="bv-act" data-mt-sendall="${esc(b.cartId)}">${SEND}<span>${t('Send guest tickets')}</span></button>`);
    if (R) out.push(`<button type="button" class="bv-act bv-act--accent" data-renew="${esc(b.cartId)}"><span>${t('Renew · 20% off')}</span></button>`);
    if (m.up && c.T.cancelInfo(b).can) out.push(`<button type="button" class="bv-act bv-act--danger" data-cancel="${esc(b.cartId)}">${RM}<span>${t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</span></button>`);
    return out;
  }
  // the person filter and what it selects (shared by the three layouts)
  function bvSel(c, m){
    const b = m.b, multi = !(m.people[0] && m.people[0].single) && m.active.length > 1, now = Date.now();
    let f = st.tf[b.cartId]; if (f === undefined || (f !== 'all' && !m.active.some(p => p.i === f))) f = st.tf[b.cartId] = 'all';
    const P0 = f === 'all' ? null : m.people.find(p => p.i === f);
    const list = (P0 ? m.ticketsOf(P0) : m.ses).slice().sort((x, y) => x.startAt - y.startAt || (x.pi || 0) - (y.pi || 0));
    const chips = cls => multi ? `<div class="types bv-tf ${cls || ''}" role="group" aria-label="${c.t('Filter by person')}"><button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|all" aria-pressed="${f === 'all'}">${c.t('Everyone')}</button>${m.active.map(p => `<button type="button" class="type" data-mt-tf="${c.esc(b.cartId)}|${p.i}" aria-pressed="${f === p.i}">${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}</button>`).join('')}</div>` : '';
    return { multi, P0, chips, list, up: list.filter(s => s.endsAt > now), done: list.filter(s => s.endsAt <= now), people: P0 ? [P0] : m.active };
  }
  const personOfS = (m, s) => m.people.find(x => x.i === s.pi) || m.people[0];
  const shortDay = (c, k) => c.P.date(c.T.toDate(k), { weekday: 'short', day: 'numeric', month: 'short' });
  // one ticket as a pass: who, when, session, QR (or its lock), ref
  function bvPass(c, m, s){
    const p = personOfS(m, s), live = !m.cancelled && c.T.qrLive(s, m.b) === 'on' && s.endsAt > Date.now();
    return `<article class="bv-pass${live ? '' : ' is-locked'}"><header><small>${m.kindTxt}</small><b>${c.esc(p.you ? c.t('You') : p.name)}</b>${p.type === 'guest' ? `<span>${c.t('Guest')}</span>` : ''}</header>
      <div class="bv-pass-q">${live ? `<div class="tk-qr" data-qr="${c.esc(s.id)}" role="img" aria-label="${c.t('QR code for {ref}', { ref: c.esc(s.id) })}"></div>` : `<div class="bv-pass-lock">${c.LOCK}<small>${m.cancelled ? c.t('Cancelled') : s.endsAt <= Date.now() ? c.t('Played') : c.t('QR opens {date}', { date: shortDay(c, s.date) })}</small></div>`}</div>
      <dl><div><dt>${c.t('Date')}</dt><dd>${shortDay(c, s.date)}</dd></div><div><dt>${c.t('Time')}</dt><dd><bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi></dd></div>${s.of > 1 ? `<div><dt>${c.t('Session')}</dt><dd>${c.t('{i} of {n}', { i: s.n, n: s.of })}</dd></div>` : ''}</dl>
      <footer><bdi>${c.esc(s.id)}</bdi>${!m.cancelled ? `<button type="button" class="bv-link" data-mt-ticket="${c.esc(s.id)}">${c.t('Full ticket')}</button>` : ''}</footer></article>`;
  }
  const refCopy = (c, m) => `<span class="bv-ref"><bdi>${c.esc(m.b.cartId)}</bdi><button type="button" class="mt-copy" data-mt-copy="${c.esc(m.b.cartId)}" aria-label="${c.t('Copy booking ref')}">${IC.copy}<span>${c.t('Copy')}</span></button></span>`;
  const factList = (c, F) => `<ul class="bv-facts">${F.facts.map(([ic, k, v, sub]) => `<li><span class="mt-fic">${ic}</span><div><small>${k}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div></li>`).join('')}</ul>`;
  const payList = (c, m, F) => `<dl class="bv-pay">${F.pay.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}<div class="tot"><dt>${c.t('Paid')}</dt><dd>${F.paid}</dd></div>${F.refunded ? `<div class="ref"><dt>${c.t('Refunded')}</dt><dd>− ${c.P.money(F.refunded)}</dd></div>` : ''}</dl>`;
  const removedList = (c, m) => { const g = m.people.filter(p => p.gone && !p.single); return g.length ? `<ul class="mt-removed">${g.map(p => `<li><b>${c.esc(p.name)}</b>${goneLine(c, m, p)}</li>`).join('')}</ul>` : ''; };
  const personBar = (c, m, P0) => P0 ? `<div class="mt-for"><div><b>${c.esc(P0.name)}</b><small>${role(c, m, P0)}${P0.free ? ` · <em>${c.t('First game free')}</em>` : ''}</small>${sentLine(c, P0)}</div><div class="mt-for-acts">${personActs(c, m, P0, true)}</div></div>` : '';
  // breadcrumbs, as on every page below the top level (Ahmed, 2026-11-17: unify the site)
  const crumbsBk = (c, m) => `<nav class="kl-crumbs" aria-label="${c.t('Breadcrumb')}"><a href="index.html">${c.t('Home')}</a><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg><a href="#tickets" data-back>${c.t('My bookings')}</a><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg><span>${c.esc(m.D.label)}</span></nav>`;
  const backLink = c => `<a class="pg-back" href="#tickets" data-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>${c.t('My bookings')}</a>`;

  // ---------- Wallet first: the pass (or program card) big on a dark band, details as a strip, actions pinned ----------
  function bvWallet(c, m){
    const F = factsOf(c, m), S = bvSel(c, m), prog = m.kind === 'program';
    const items = prog ? S.people.map(p => programCard(c, m, p)) : (S.up.length ? S.up : S.done).map(s => bvPass(c, m, s));
    const acts = bvActs(c, m);
    return backLink(c) + `<section class="bv-w-band"><div class="bv-w-in">
        <div class="bv-w-top"><div><p class="eye">${m.kindTxt}</p><h1>${c.esc(m.D.label)}</h1><p class="bv-w-when">${F.when[0]} · ${F.when[1]}</p></div>${chip(c, m)}</div>
        ${S.chips('on-dark')}
        <div class="bv-w-row"><div class="bv-w-passes" id="bvPasses">${items.join('') || `<p class="meta">${c.t('No upcoming tickets in this booking.')}</p>`}</div>
          ${items.length > 1 ? `<div class="bv-w-nav"><button type="button" class="mt-arrow" data-bv-scroll="-1" aria-label="${c.t('Previous')}">${NAV(-1)}</button><span>${items.length} ${prog ? c.t('cards') : c.t('tickets')}</span><button type="button" class="mt-arrow" data-bv-scroll="1" aria-label="${c.t('Next')}">${NAV(1)}</button></div>` : ''}</div></div></section>
      ${personBar(c, m, S.P0)}
      <section class="bv-w-strip"><div class="bv-w-facts">${factList(c, F)}<div class="bv-w-ref"><span class="mt-fic">${IC.hash}</span><div><small>${c.t('Booking ref')}</small>${refCopy(c, m)}</div></div></div>
        <details class="bv-w-pay"><summary><span>${c.t('Payment')}</span><b>${F.paid}</b></summary>${payList(c, m, F)}</details></section>
      ${!prog && S.up.length && S.done.length ? `<details class="mt-hist"><summary>${c.t('Played')} <b>${S.done.length}</b></summary><div class="bv-w-done">${S.done.map(s => bvPass(c, m, s)).join('')}</div></details>` : ''}
      ${removedList(c, m)}${m.up ? c.cancelLine(m.b) : ''}
      ${acts.length ? `<div class="bv-bar" role="group" aria-label="${c.t('Actions')}"><div class="bv-bar-in">${acts.join('')}</div></div>` : ''}`;
  }

  // ---------- Timeline: the booking as a story, tickets on their dates, details in a side card ----------
  function bvTimeline(c, m){
    const F = factsOf(c, m), S = bvSel(c, m), b = m.b, now = Date.now(), prog = m.kind === 'program', todayK = dk(new Date());
    const nodes = [];
    if (b.paidAt || b.createdAt) nodes.push({ at: b.paidAt || b.createdAt, k: 'done', ic: CHECK, title: c.t(b.free || !b.amount ? 'Booked' : 'Booked and paid'), sub: `${c.P.date(new Date(b.paidAt || b.createdAt), 'full')}${b.amount ? ' · ' + c.P.money(b.amount) : ''}` });
    const C = c.T.cancelInfo(b); if (!m.cancelled && C.by) nodes.push({ at: C.by.getTime(), k: C.by.getTime() > now ? 'info' : 'muted', ic: '!', title: c.t(C.by.getTime() > now ? 'Free cancellation until {when}' : 'Free cancellation ended {when}', { when: `${c.P.date(C.by, 'short')} · <bdi>${c.P.time(C.by.getHours() * 60 + C.by.getMinutes())}</bdi>` }), sub: C.by.getTime() > now ? c.t('Cancel before then for a full refund.') : '' });
    m.people.filter(p => p.gone && !p.single).forEach(p => { const x = (b.order.participants || [])[p.i] || {}; if (x.cancelled) nodes.push({ at: x.cancelled.at, k: 'muted', ic: RM, title: c.t('{name} removed', { name: c.esc(p.name) }), sub: x.cancelled.refund ? c.t('{amount} refunded', { amount: c.P.money(x.cancelled.refund) }) : '' }); });
    if (m.cancelled) nodes.push({ at: b.cancelledAt || now, k: 'off', ic: RM, title: c.t('Booking cancelled'), sub: b.refund ? c.t('{amount} refunded', { amount: c.P.money(b.refund) }) : '' });
    m.days.forEach(d => {
      const k = d.endsAt <= now ? 'done' : d.date === todayK ? 'now' : 'next', who = S.people.filter(p => p.single || m.ticketsOf(p).some(s => s.n === d.n));
      const rows = who.map(p => { const s = p.single ? m.ses.find(x => x.n === d.n && x.date === d.date && x.start === d.start) : m.ticketsOf(p).find(x => x.n === d.n); if (!s) return '';
        if (prog){ const ck = ((b.order.participants || [])[p.i] || {}).checkins || [], inn = ck.some(x => x.date === d.date);
          return `<li><span class="bv-t-who">${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}</span>${inn ? `<span class="mt-st mt-st--ok"><i></i>${c.t('Checked in')}</span>` : k === 'done' ? `<span class="mt-st mt-st--done"><i></i>${c.t('Missed · still in the balance')}</span>` : `<span class="mt-st"><i></i>${k === 'now' ? c.t('Today') : c.t('Upcoming')}</span>`}</li>`; }
        return `<li><span class="bv-t-who">${c.esc(p.you ? c.t('You') : p.name.split(' ')[0])}</span>${m.cancelled ? '' : `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(s.id)}">${QRI}<span>${k === 'done' ? c.t('Ticket') : c.t('Show ticket')}</span></button>`}</li>`; }).join('');
      nodes.push({ at: d.startAt, k: m.cancelled ? 'muted' : k, ic: k === 'done' ? CHECK : String(d.n), title: `${d.of > 1 ? c.t('Session {i} of {n}', { i: d.n, n: d.of }) + ' · ' : ''}${shortDay(c, d.date)}`, sub: `<bdi>${c.P.time(d.start)}</bdi> – <bdi>${c.P.time(d.end)}</bdi>${k === 'now' ? ' · ' + c.t('Today') : ''}`, rows });
    });
    nodes.sort((a, z) => a.at - z.at);
    const nowAt = nodes.findIndex(n => n.at > now);
    if (!m.cancelled) nodes.splice(nowAt < 0 ? nodes.length : nowAt, 0, { now: true });
    const acts = bvActs(c, m);
    return backLink(c) + `<header class="bv-t-head"><span class="bv-t-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span><div><p class="eye">${m.kindTxt}</p><h1>${c.esc(m.D.label)}</h1><p class="meta">${m.count} · ${c.esc(m.names)}</p>${chip(c, m)}</div></header>
      <div class="bv-t"><section class="bv-t-main"><div class="sec"><h2>${c.t('Timeline')}</h2>${S.chips()}</div>${personBar(c, m, S.P0)}
          <ol class="bv-tl">${nodes.map(n => n.now ? `<li class="bv-now"><span>${c.t('Now')}</span></li>` : `<li class="bv-n bv-n--${n.k}"><span class="bv-dot">${n.ic}</span><div><b>${n.title}</b>${n.sub ? `<small>${n.sub}</small>` : ''}${n.rows ? `<ul class="bv-t-rows">${n.rows}</ul>` : ''}</div></li>`).join('')}</ol></section>
        <aside class="bv-t-side">${prog ? `<div class="bv-t-cards">${S.people.map(p => programCard(c, m, p)).join('')}</div>` : ''}
          <div class="bv-card">${factList(c, F)}<div class="bv-t-ref"><small>${c.t('Booking ref')}</small>${refCopy(c, m)}</div></div>
          <div class="bv-card"><h3>${c.t('Payment')}</h3>${payList(c, m, F)}</div>
          ${acts.length ? `<div class="bv-card bv-acts">${acts.join('')}</div>` : ''}${m.up ? c.cancelLine(b) : ''}</aside></div>`;
  }

  // ---------- Split screen: the booking on a sticky panel, its tickets scrolling beside it ----------
  function bvSplit(c, m){
    const F = factsOf(c, m), S = bvSel(c, m), prog = m.kind === 'program', acts = bvActs(c, m);
    const tk = s => { const p = personOfS(m, s), live = !m.cancelled && c.T.qrLive(s, m.b) === 'on' && s.endsAt > Date.now();
      return `<li class="bv-s-tk${s.endsAt <= Date.now() ? ' is-done' : ''}"><div class="bv-s-q">${live ? `<div class="tk-qr" data-qr="${c.esc(s.id)}" role="img" aria-label="${c.t('QR code for {ref}', { ref: c.esc(s.id) })}"></div>` : `<div class="bv-s-lock">${c.LOCK}</div>`}</div>
        <div class="bv-s-i"><b>${S.multi && !S.P0 ? c.esc(p.you ? c.t('You') : p.name) : s.of > 1 ? c.t('Session {i} of {n}', { i: s.n, n: s.of }) : c.esc(m.D.label)}</b><span>${shortDay(c, s.date)} · <bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi>${S.multi && !S.P0 && s.of > 1 ? ' · ' + c.t('Session {i} of {n}', { i: s.n, n: s.of }) : ''}</span><small><bdi>${c.esc(s.id)}</bdi></small></div>
        <div class="bv-s-e">${m.cancelled ? `<span class="mt-st mt-st--off"><i></i>${c.t('Cancelled')}</span>` : s.endsAt <= Date.now() ? `<span class="mt-st mt-st--done"><i></i>${c.t('Played')}</span>` : live ? `<span class="mt-st mt-st--ok"><i></i>${c.t('QR ready')}</span>` : `<span class="mt-st mt-st--lock">${c.LOCK}${c.t('QR opens {date}', { date: shortDay(c, s.date) })}</span>`}${!m.cancelled ? `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(s.id)}">${c.t('Enlarge')}</button>` : ''}</div></li>`; };
    return `<div class="bv-s"><aside class="bv-s-l"><div class="bv-s-l-in">${backLink(c)}
        <span class="bv-s-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
        <p class="eye">${m.kindTxt}</p><h1>${c.esc(m.D.label)}</h1>${chip(c, m)}
        ${factList(c, F)}<div class="bv-s-ref"><small>${c.t('Booking ref')}</small>${refCopy(c, m)}</div>
        ${F.email ? `<p class="mt-mail">${IC.mail}<span>${c.t('A confirmation email was sent to {email}', { email: `<bdi>${c.esc(F.email)}</bdi>` })}</span></p>` : ''}
        <div class="bv-s-pay"><h3>${c.t('Payment')}</h3>${payList(c, m, F)}</div>
        ${acts.length ? `<div class="bv-acts">${acts.join('')}</div>` : ''}${m.up ? c.cancelLine(m.b) : ''}</div></aside>
      <section class="bv-s-r"><div class="sec"><h2>${c.t(prog ? (S.people.length === 1 ? 'Program card' : 'Program cards') : 'Tickets')}</h2><span>${prog ? S.people.length : S.list.length}</span></div>${S.chips()}${personBar(c, m, S.P0)}
        ${prog ? `<div class="bv-s-cards">${S.people.map(p => programCard(c, m, p)).join('')}</div>`
          : `${S.up.length ? `<ol class="bv-s-list">${S.up.map(tk).join('')}</ol>` : `<p class="meta">${c.t(m.cancelled ? 'This booking was cancelled.' : 'No upcoming tickets in this booking.')}</p>`}
             ${S.done.length ? `<details class="mt-hist"${S.up.length ? '' : ' open'}><summary>${c.t('Played')} <b>${S.done.length}</b></summary><ol class="bv-s-list">${S.done.map(tk).join('')}</ol></details>` : ''}`}
        ${removedList(c, m)}</section></div>`;
  }

  // =====================================================================================================================
  // Booking page, round 2 (Ahmed, 2026-11-17: "I don't like all options, I want professional options based on best
  // practice and benchmark and new UI directions"). Built from booking-page-benchmark.html: 21 booking pages (GetYourGuide,
  // Booking.com, Agoda, Kayak, Turo, Navan, Eventbrite, Klook, DICE, ClassPass…) and the ten rules they share:
  //  1 status as a sentence with the countdown   2 one main action for the moment   3 manage actions in one place
  //  4 the cancellation deadline right above Cancel   5 Cancel last and quiet   6 every person a row with a status
  //  7 the ref in the header, copyable   8 payment as a receipt   9 help at the end   10 tabs for dense pages on phones
  // profile.html?bv=rail | tabs | order #tickets/<ref>. Same data and actions as the live page.
  // =====================================================================================================================
  const HELP = { tel: '+966537448666', telTxt: '+966 53 744 8666', mail: 'Domes.info@sfa.sa' };
  const IC2 = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 7v5l3 2"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };
  const whenAt = (c, d) => `${c.P.date(d, 'short')} · <bdi>${c.P.time(d.getHours() * 60 + d.getMinutes())}</bdi>`;
  const dayTime = (c, s) => `${shortDay(c, s.date)} · <bdi>${c.P.time(s.start)}</bdi>`;
  const againUrl = m => { const o = m.b.order; return m.kind === 'program' ? `program.html?p=${encodeURIComponent(o.program)}` : m.kind === 'game' ? 'matches.html' : o.ladies ? 'ladies-hours.html' : `court-details.html?sport=${encodeURIComponent(o.sport)}&court=${encodeURIComponent(o.court)}`; };
  const liveTix = (c, m) => m.cancelled ? [] : m.ses.filter(s => s.endsAt > Date.now() && c.T.qrLive(s, m.b) === 'on' && (!s.pi && s.pi !== 0 || !(m.people.find(p => p.i === s.pi) || {}).gone));
  // rule 1: the status as a sentence, with the countdown
  function statusOf(c, m){
    const t = c.t, b = m.b;
    if (m.cancelled) return { k: 'off', title: t('Booking cancelled'), lead: b.refund ? t('{amount} refunded to your card', { amount: c.P.money(b.refund) }) : '' };
    if (m.past) return { k: 'done', title: t('Played'), lead: t('Last session {when}', { when: dayTime(c, m.last) }) };
    const live = liveTix(c, m).length, today = m.next.date === dk(new Date()), prog = m.kind === 'program';
    return { k: live && today ? 'ok' : 'up', title: t('You’re all set'),
      lead: `${prog ? t('Next session') + ': ' : ''}<b>${m.when}</b> · ${dayTime(c, m.next)}`,
      note: live ? (prog ? t('Show the program card at reception') : today ? t('Your QR codes are ready to scan') : t('Show the QR code at reception')) : t('QR codes open on the day of the session') };
  }
  const statusBox = (c, m, S, cls) => `<div class="bv-stat bv-stat--${S.k} ${cls || ''}"><span class="bv-stat-ic">${S.k === 'off' ? IC2.x : S.k === 'up' ? IC2.clock : IC2.ok}</span><div><b>${S.title}</b>${S.lead ? `<p>${S.lead}</p>` : ''}${S.note ? `<small>${S.note}</small>` : ''}</div></div>`;
  // rule 2: one main action for the moment (Show ticket on the day, Add to calendar before, Book again after)
  function mainAct(c, m){
    const t = c.t, b = m.b, L = liveTix(c, m).filter(s => s.date === dk(new Date()));   // Show ticket on the day only
    if (L.length) return m.kind === 'program' || L.length > 1 ? `<button type="button" class="btn bv-main" data-bv-go="bvTix">${QRI}${t(m.kind === 'program' ? (m.active.length > 1 ? 'Show program cards' : 'Show program card') : 'Show tickets')}</button>`
      : `<button type="button" class="btn bv-main" data-mt-ticket="${c.esc(L[0].id)}">${QRI}${t('Show ticket')}</button>`;
    if (m.up) return `<a class="btn bv-main" href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}${t('Add to calendar')}</a>`;
    return `<a class="btn bv-main" href="${againUrl(m)}">${t('Book again')}${c.ARROW}</a>`;
  }
  const dirAct = (c, m) => m.up ? `<a class="ghost bv-sub" href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${c.PIN}${c.t('Get directions')}</a>` : '';
  // rules 3–5: manage actions together; the free-cancellation deadline right above Cancel, which comes last
  function cancelBlock(c, m){
    if (!m.up) return '';
    const t = c.t, b = m.b, C = c.T.cancelInfo(b), left = (b.amount || 0) - (b.refund || 0);
    return C.can ? `<div class="bv-cx"><p><b>${t('Free cancellation until {when}', { when: whenAt(c, C.by) })}</b>${left > 0 ? t('Cancel before then for a full refund of {amount}.', { amount: c.P.money(left) }) : t('Cancel before then and your spot goes back on sale.')}</p><button type="button" class="bv-cxb" data-cancel="${c.esc(b.cartId)}">${t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button></div>`
      // after the deadline Cancel stays in view, switched off, with the reason and who to call (Ahmed: "I can't see the cancel CTA")
      : `<div class="bv-cx is-off"><p id="bvCxWhy"><b>${t('Free cancellation ended {when}', { when: whenAt(c, C.by) })}</b>${t('Bookings can’t be cancelled in the 48 hours before the first session.')} ${t('Need to change plans? Call SFA Domes on {tel}.', { tel: `<a href="tel:${HELP.tel}"><bdi>${HELP.telTxt}</bdi></a>` })}</p><button type="button" class="bv-cxb" disabled aria-describedby="bvCxWhy">${t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button></div>`;
  }
  function manageList(c, m, withCal){
    const t = c.t, b = m.b, esc = c.esc, R = c.renewInfo(b), send = m.people.filter(p => m.canSend(p) && !p.sent).length, out = [];
    if (m.up && withCal) out.push(`<a href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}<span>${t('Add to calendar')}</span>${CHEV}</a>`);
    if (send) out.push(`<button type="button" data-mt-sendall="${esc(b.cartId)}">${SEND}<span>${send === 1 ? t('Send the guest ticket') : t('Send {n} guest tickets', { n: send })}</span>${CHEV}</button>`);
    if (R) out.push(`<button type="button" class="is-accent" data-renew="${esc(b.cartId)}">${IC.cal}<span>${t('Renew for another month · 20% off')}</span>${CHEV}</button>`);
    out.push(`<a href="result.html?cart=${encodeURIComponent(b.cartId)}">${IC2.doc}<span>${t('View confirmation')}</span>${CHEV}</a>`);
    return `<ul class="bv-mg-l">${out.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }
  // rule 6: every person (a court: every time) as a row with its own status, ticket number and actions
  function rowsOf(c, m){
    const b = m.b, t = c.t, now = Date.now(), prog = m.kind === 'program', todayK = dk(new Date());
    const qst = s => m.cancelled ? ['off', t('Cancelled')] : s.endsAt <= now ? ['done', t('Played')] : c.T.qrLive(s, b) === 'on' ? ['ok', t('QR ready')] : ['lock', t('QR opens {date}', { date: shortDay(c, s.date) })];
    if (m.people[0] && m.people[0].single) return m.ses.map(s => ({ time: true, s, id: s.id, name: shortDay(c, s.date), type: `<bdi>${c.P.time(s.start)}</bdi> – <bdi>${c.P.time(s.end)}</bdi>`, no: s.id, st: qst(s), done: s.endsAt <= now }));
    return m.people.map(p => {
      const x = (b.order.participants || [])[p.i] || {}, s = m.nextOf(p), ck = x.checkins || [], total = m.days.length;
      const type = p.you ? t('You') : p.type === 'guest' ? t('Guest') : p.type === 'child' ? t('Child') : '';
      let st;
      if (p.gone) st = ['off', t('Removed') + (p.refund ? ' · ' + t('{amount} refunded', { amount: c.P.money(p.refund) }) : '')];
      else if (prog){ const nx = m.days.find(d => d.endsAt > now), left = total - ck.length;
        st = m.cancelled ? ['off', t('Cancelled')] : ck.some(k => k.date === todayK) ? ['ok', t('Checked in today')] : !nx ? ['done', t('Program ended')] : nx.date === todayK && left > 0 ? ['ok', t('QR ready')] : ['lock', t('QR opens {date}', { date: shortDay(c, nx.date) })]; }
      else st = s ? qst(s) : ['off', ''];
      const sent = !p.gone && p.type === 'guest' && m.up ? (p.sent ? sentTxt(c, p) : m.canSend(p) ? t('Ticket not sent yet') : '') : '';
      return { p, s, id: p.i, name: c.esc(p.name), type, phone: p.type === 'guest' && p.phone ? fmtPhone(p.phone) : '', no: prog ? `${b.cartId}-C${p.i + 1}` : s ? s.id : '', st, sent, sentOk: !!p.sent, free: p.free && !p.gone,
        bal: prog ? { left: Math.max(0, total - ck.length), total, used: ck.length } : null, n: m.ticketsOf(p).length, gone: p.gone };
    });
  }
  const stTag = (c, st) => st[1] ? `<span class="mt-st mt-st--${st[0]}">${st[0] === 'lock' ? c.LOCK : '<i aria-hidden="true"></i>'}${st[1]}</span>` : '';
  const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  // the row's own actions: open the ticket (or the program card), send it to a guest, remove the person
  function rowActs(c, m, r, cardBtn){
    if (r.gone || m.cancelled) return '';
    const open = r.time || !r.p ? `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(r.s.id)}">${QRI}<span>${c.t('Show ticket')}</span></button>`
      : m.kind === 'program' ? (cardBtn ? `<button type="button" class="mt-mini" data-bv-card="${c.esc(m.b.cartId)}|${r.id}" aria-expanded="${!!st.open['card|' + m.b.cartId + '|' + r.id]}">${QRI}<span>${c.t(st.open['card|' + m.b.cartId + '|' + r.id] ? 'Hide card' : 'Show card')}</span></button>` : '')
      : r.s ? `<button type="button" class="mt-mini" data-mt-ticket="${c.esc(r.s.id)}">${QRI}<span>${c.t('Show ticket')}</span></button>` : '';
    return open + (r.p ? personActs(c, m, r.p) : '');
  }
  // the people (or times) as a list, for the rail and tabs layouts; programs show their cards
  function peopleBlock(c, m){
    if (m.kind === 'program') return `<div class="c3d-deck c3d-deck--v">${m.active.map(p => programCard(c, m, p)).join('')}</div>${renewBox(c, m)}${removedList(c, m)}`;
    const R = rowsOf(c, m), now = Date.now(), up = R.filter(r => !r.done), done = R.filter(r => r.done);
    const li = r => `<li class="bv-row${r.gone ? ' is-gone' : ''}${r.done ? ' is-done' : ''}">
        ${r.time ? `<span class="day" aria-hidden="true"><span>${c.P.date(c.T.toDate(r.s.date), { weekday: 'short' })}</span><b>${c.T.toDate(r.s.date).getDate()}</b><small>${c.P.date(c.T.toDate(r.s.date), { month: 'short' })}</small></span>` : `<span class="bv-av${r.p.you ? ' is-you' : ''}" aria-hidden="true">${ini(r.p.name)}</span>`}
        <div class="bv-row-i"><b>${r.name}${r.free ? `<em>${c.t('First game free')}</em>` : ''}</b><small>${[r.type, r.phone ? `<bdi>${c.esc(r.phone)}</bdi>` : '', r.no && !r.gone ? `<bdi>${c.esc(r.no)}</bdi>` : ''].filter(Boolean).join(' · ')}</small>
          ${r.sent ? `<small class="bv-sent${r.sentOk ? ' is-ok' : ''}">${SEND}${r.sent}</small>` : ''}</div>
        <div class="bv-row-s">${stTag(c, r.st)}</div><div class="bv-row-a">${rowActs(c, m, r)}</div></li>`;
    return `<div class="c3d-deck">${(up.length ? up : done).map(r => ticketCard(c, m, r)).join('')}</div>${up.length && done.length ? `<details class="mt-hist"><summary>${c.t('Played')} <b>${done.length}</b></summary><div class="c3d-deck">${done.map(r => ticketCard(c, m, r)).join('')}</div></details>` : ''}
      ${m.people.some(p => m.canRemove(p)) ? `<p class="pg-note">${c.t('You can remove one person until free cancellation ends; their share is refunded and everyone else keeps their spot.')}</p>` : ''}`;
  }
  const peopleTitle = (c, m) => m.kind === 'program' ? c.t(m.active.length === 1 ? 'Program card' : 'Program cards') : m.people[0] && m.people[0].single ? c.t('Tickets') : c.t('Players and tickets');
  const peopleCount = m => m.kind === 'program' ? m.active.length : m.people[0] && m.people[0].single ? m.ses.length : m.active.length;
  // rule 8: payment as a receipt, line by line
  function receipt(c, m){
    const b = m.b, o = b.order, t = c.t, esc = c.esc, P = c.P, K = window.SFA_PROGRAM_KIT, kit = o.kit, L = [];
    const plan = t({ trial: 'Free trial', month: 'One month', month2: 'Two months', month3: 'Three months' }[o.plan] || 'One month');
    if (b.free || !b.amount) L.push([esc(m.D.label), t('Free of charge')]);
    else if (m.kind === 'game') m.people.forEach(p => L.push([`${esc(p.you ? t('You') : p.name)}${p.free ? ` <em>${t('First game free')}</em>` : ''}`, p.free ? P.money(0) : P.money(o.price || 0)]));
    else if (m.kind === 'program'){ const f = o.offer, kt = kit && K ? kit.qty * K.price : 0, each = f && f.paid ? f.base / f.paid : (b.amount - kt) / Math.max(1, m.people.length);
      m.people.forEach(p => L.push([`${plan} · ${esc(p.name)}${o.renewOf ? ` <em>${t('Renewal · 20% off')}</em>` : ''}`, P.money(Math.round(each * 100) / 100)])); if (kt) L.push([`${c.T.tx(K.name)} × ${kit.qty}`, P.money(kt)]); }
    else L.push([`${esc(m.D.label)} · ${t('{n} × 1.5 hr', { n: m.ses.length })}`, P.money(o.offer ? o.offer.base : b.amount)]);
    const OL = window.SFA_OFFER_UI && window.SFA_OFFER_UI.line(o.offer); if (OL) L.push([`<span class="of-line">${OL[0]}</span>`, `<span class="of-line">${OL[1]}</span>`]);
    const refunds = m.people.filter(p => p.gone && p.refund).map(p => [t('{name} removed', { name: esc(p.name) }), '− ' + P.money(p.refund)]);
    if (m.cancelled && b.refund) refunds.push([t('Booking cancelled'), '− ' + P.money(b.refund - m.people.reduce((a, p) => a + (p.gone ? p.refund || 0 : 0), 0))]);
    return `<div class="bv-rc"><dl class="bv-rc-l">${L.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <dl class="bv-rc-t"><div><dt>${t('Total paid')}</dt><dd>${b.free || !b.amount ? t('Free of charge') : P.money(b.amount)}</dd></div>${refunds.map(([k, v]) => `<div class="ref"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <dl class="bv-rc-m">${b.paidAt && !b.free ? `<div><dt>${t('Paid on')}</dt><dd>${P.date(new Date(b.paidAt), 'full')}</dd></div>` : ''}${b.tranRef ? `<div><dt>${t('Paid by')}</dt><dd>${t('Card')} · ${t(b.test ? 'Test ref' : 'PayTabs ref')} <bdi>${esc(b.tranRef)}</bdi></dd></div>` : ''}</dl>
      <a class="bv-rc-doc" href="result.html?cart=${encodeURIComponent(b.cartId)}">${IC2.doc}<span>${t('View confirmation')}</span>${CHEV}</a></div>`;
  }
  // rule 9: help at the end, with the ref to quote
  const helpBox = (c, m) => `<div class="bv-help"><p>${c.t('Call or email SFA Domes and quote your booking ref {ref}.', { ref: `<b><bdi>${c.esc(m.b.cartId)}</bdi></b>` })}</p>
    <div class="bv-help-l"><a href="tel:${HELP.tel}">${IC2.phone}<span><small>${c.t('Call')}</small><b><bdi>${HELP.telTxt}</bdi></b></span></a><a href="mailto:${HELP.mail}">${IC.mail}<span><small>${c.t('Email')}</small><b>${HELP.mail}</b></span></a></div></div>`;
  const factGrid = (c, F) => `<dl class="bv-fg">${F.facts.map(([ic, k, v, sub]) => `<div><span class="mt-fic">${ic}</span><dt>${k}</dt><dd>${v}${sub ? `<small>${sub}</small>` : ''}</dd></div>`).join('')}</dl>`;
  const mailLine = (c, F) => F.email ? `<p class="mt-mail">${IC.mail}<span>${c.t('A confirmation email was sent to {email}', { email: `<bdi>${c.esc(F.email)}</bdi>` })}</span></p>` : '';
  const placeOf = c => c.t('SFA Domes Dammam');

  // ---------- 1 · Manage rail (GetYourGuide, Navan, Kayak, Turo on web) ----------
  // content on the left; a sticky Manage booking card on the right with the main action, the deadline over Cancel, then
  // help. On phones the card comes right after the tickets.
  function bvRail(c, m){
    const F = factsOf(c, m), S = statusOf(c, m), t = c.t;
    return crumbsBk(c, m) + `<header class="bv-hd"><span class="bv-hd-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
        <div><p class="eye">${m.kindTxt}</p><h1>${c.esc(m.D.label)}</h1><p class="bv-hd-ref"><small>${t('Booking ref')}</small>${refCopy(c, m)}</p></div></header>
      <div class="bv-r"><div class="bv-r-main">
        <div class="bv-o1">${statusBox(c, m, S)}</div>
        <section class="bv-sec bv-o2" id="bvTix"><div class="sec"><h2>${peopleTitle(c, m)}</h2><span>${peopleCount(m)}</span></div>${peopleBlock(c, m)}</section>
        <section class="bv-sec bv-o4"><div class="sec"><h2>${t('Booking details')}</h2></div>${factGrid(c, F)}${mailLine(c, F)}</section>
        <section class="bv-sec bv-o5"><div class="sec"><h2>${t('Receipt')}</h2></div>${receipt(c, m)}</section>
      </div><aside class="bv-r-side">
        <section class="bv-card bv-mg bv-o3"><h2>${t('Manage booking')}</h2>${m.up || m.past || m.cancelled ? `<div class="bv-mg-main">${mainAct(c, m)}${dirAct(c, m)}</div>` : ''}${manageList(c, m, !!liveTix(c, m).filter(s => s.date === dk(new Date())).length)}${cancelBlock(c, m)}</section>
        <section class="bv-card bv-o6"><h2>${t('Need help?')}</h2>${helpBox(c, m)}</section>
      </aside></div>`;
  }

  // ---------- 2 · Tabbed record (Turo, Agoda, Kayak in their apps) ----------
  // a summary that stays on top (status sentence, when, ref, the main action), then tabs that each answer one question
  function bvTabs(c, m){
    const F = factsOf(c, m), S = statusOf(c, m), t = c.t, b = m.b, tab = st.bt[b.cartId] || 'tix';
    const TABS = [['tix', m.kind === 'program' ? peopleTitle(c, m) : t('Tickets'), peopleCount(m)], ['det', t('Details')], ['pay', t('Receipt')], ['help', t('Help')]];
    const panel = tab === 'det' ? `<div class="bv-x-two"><section><h2 class="bv-h">${t('Booking details')}</h2>${factGrid(c, F)}${mailLine(c, F)}</section>
          <section class="bv-card bv-mg"><h2>${t('Manage booking')}</h2>${manageList(c, m, !!liveTix(c, m).filter(s => s.date === dk(new Date())).length)}${cancelBlock(c, m)}</section></div>`
      : tab === 'pay' ? `<section class="bv-x-narrow">${receipt(c, m)}</section>`
      : tab === 'help' ? `<div class="bv-x-two"><section><h2 class="bv-h">${t('Contact SFA Domes')}</h2>${helpBox(c, m)}</section>
          <section><h2 class="bv-h">${t('Good to know')}</h2><ul class="bv-know">
            <li><b>${t('Free cancellation')}</b><span>${t('Cancel the whole booking up to 48 hours before the first session for a full refund.')}</span></li>
            ${m.kind === 'court' ? '' : `<li><b>${t('One person can’t make it')}</b><span>${t('Remove them until free cancellation ends; their share is refunded and everyone else keeps their spot.')}</span></li>`}
            <li><b>${t('Your QR code')}</b><span>${m.kind === 'program' ? t('One card per participant. It works on training days; each check-in uses one session.') : t('Each ticket’s QR code works on the day of its session. Show it at reception.')}</span></li>
            <li><b>${t('Getting there')}</b><span>${placeOf(c)} · <a href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${t('Get directions')}</a></span></li></ul></section></div>`
      : `<section id="bvTix">${peopleBlock(c, m)}</section>`;
    return backLink(c) + `<section class="bv-x-sum"><span class="bv-x-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
        <div class="bv-x-in"><p class="eye">${m.kindTxt}</p><h1>${c.esc(m.D.label)}</h1>${statusBox(c, m, S, 'bv-stat--flat')}
          <dl class="bv-x-kv"><div><dt>${t('Booking ref')}</dt><dd>${refCopy(c, m)}</dd></div><div><dt>${t('Where')}</dt><dd>${placeOf(c)}</dd></div><div><dt>${m.kind === 'program' ? t('Participants') : t('Tickets')}</dt><dd>${m.kind === 'program' ? m.active.length : m.ses.filter(s => !(m.people.find(p => p.i === s.pi) || {}).gone).length}</dd></div></dl>
          <div class="bv-x-acts">${mainAct(c, m)}${dirAct(c, m)}</div></div></section>
      <div class="bv-tabbar" role="tablist" aria-label="${t('Booking')}">${TABS.map(([k, l, n]) => `<button type="button" role="tab" id="bvt-${k}" aria-selected="${tab === k}" aria-controls="bvp" data-bv-tab="${c.esc(b.cartId)}|${k}">${l}${n !== undefined ? `<b>${n}</b>` : ''}</button>`).join('')}</div>
      <div class="bv-tabp" id="bvp" role="tabpanel" aria-labelledby="bvt-${tab}">${panel}</div>`;
  }

  // ---------- 3 · Order and attendees (Eventbrite, Live Nation, Klook) ----------
  // the booking read as an order: an order summary, then one row per person (or time) with ticket number, status and
  // actions; tick guests to send their tickets at once. A program card opens inside its row.
  function bvOrder(c, m){
    const F = factsOf(c, m), S = statusOf(c, m), t = c.t, b = m.b, esc = c.esc, R = rowsOf(c, m), prog = m.kind === 'program', times = !!(R[0] && R[0].time);
    const C = c.T.cancelInfo(b), sendable = R.filter(r => r.p && m.canSend(r.p)), bulk = sendable.length > 1;
    const sel = (st.sel[b.cartId] || []).filter(i => sendable.some(r => r.id === i)); st.sel[b.cartId] = sel;
    const by = (b.payer && b.payer.name) || (c.user && c.user.name) || '';
    const kv = [[t('Booked by'), esc(by)], [t('Booked on'), b.paidAt || b.createdAt ? c.P.date(new Date(b.paidAt || b.createdAt), 'full') : '–'], [t('Total paid'), F.paid],
      [t('Payment'), b.tranRef ? `${t('Card')} · <bdi>${esc(b.tranRef)}</bdi>` : b.free || !b.amount ? t('Free of charge') : '–'],
      [prog ? t('Program cards') : t('Tickets'), prog ? m.active.length : m.ses.filter(s => !(m.people.find(p => p.i === s.pi) || {}).gone).length],
      [t('Free cancellation'), m.cancelled ? t('Cancelled') : C.can ? t('Until {when}', { when: whenAt(c, C.by) }) : t('Ended {when}', { when: whenAt(c, C.by) })]];
    const cols = times ? [t('Date'), t('Time'), t('Ticket no.'), t('Status'), ''] : prog ? [t('Participant'), t('Card no.'), t('Balance'), t('Status'), ''] : [t('Player'), t('Ticket no.'), t('Ticket delivery'), t('Status'), ''];
    const row = r => { const k = 'card|' + b.cartId + '|' + r.id, open = prog && st.open[k], chk = bulk && r.p && sendable.some(x => x.id === r.id);
      return `<tr class="${r.gone ? 'is-gone' : ''}${r.done ? ' is-done' : ''}">${bulk ? `<td class="bv-o-ck">${chk ? `<input type="checkbox" data-bv-sel="${esc(b.cartId)}|${r.id}" ${sel.includes(r.id) ? 'checked' : ''} aria-label="${t('Select {name}', { name: r.name })}">` : ''}</td>` : ''}
        <td class="c1" data-k="${cols[0]}">${times ? `<b>${r.name}</b>` : `<div class="bv-o-who"><span class="bv-av${r.p.you ? ' is-you' : ''}" aria-hidden="true">${ini(r.p.name)}</span><div><b>${r.name}${r.free ? `<em>${t('First game free')}</em>` : ''}</b><small>${[r.type, r.phone ? `<bdi>${esc(r.phone)}</bdi>` : ''].filter(Boolean).join(' · ')}</small></div></div>`}</td>
        <td class="c2" data-k="${cols[1]}">${times ? r.type : r.no && !r.gone ? `<bdi class="bv-mono">${esc(r.no)}</bdi>` : '–'}</td>
        <td class="c3" data-k="${cols[2]}">${times ? `<bdi class="bv-mono">${esc(r.no)}</bdi>` : prog ? (r.gone ? '–' : `<span class="bv-bal"><span><b>${r.bal.left}</b> / ${r.bal.total}</span><i style="--p:${r.bal.total ? r.bal.left / r.bal.total : 0}"></i></span>`) : r.gone ? '–' : r.sent ? `<span class="bv-sent${r.sentOk ? ' is-ok' : ''}">${SEND}${r.sent}</span>` : r.p.type === 'guest' ? '–' : t('On your account')}</td>
        <td class="c4" data-k="${cols[3]}">${stTag(c, r.st)}</td>
        <td class="bv-o-a">${rowActs(c, m, r, true)}</td></tr>
        ${open ? `<tr class="bv-o-open"><td colspan="${cols.length + (bulk ? 1 : 0)}">${programCard(c, m, r.p)}</td></tr>` : ''}`; };
    const hasSel = sel.length;
    return backLink(c) + `<header class="bv-o-top"><div><p class="eye">${m.kindTxt} · ${placeOf(c)}</p><h1>${t('Booking')} <bdi>${esc(b.cartId)}</bdi><button type="button" class="mt-copy" data-mt-copy="${esc(b.cartId)}" aria-label="${t('Copy booking ref')}">${IC.copy}<span>${t('Copy')}</span></button></h1></div>
        <div class="bv-o-links"><a href="result.html?cart=${encodeURIComponent(b.cartId)}">${IC2.doc}${t('View confirmation')}</a>${m.up ? `<a href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}${t('Add to calendar')}</a><a href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${c.PIN}${t('Get directions')}</a>` : ''}${m.up && C.can ? `<button type="button" class="is-danger" data-cancel="${esc(b.cartId)}">${IC2.x}${t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button>` : ''}</div></header>
      ${statusBox(c, m, S, 'bv-stat--line')}
      <section class="bv-o-card"><div class="bv-o-ev"><span class="bv-o-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span><div><b>${esc(m.D.label)}</b>
          <p>${IC.cal}<span>${F.when[0]}<small>${F.when[1]}</small></span></p><p>${IC.pin}<span>${placeOf(c)}${F.facts[1][3] ? `<small>${F.facts[1][3]}</small>` : ''}</span></p>${F.coach ? `<p>${IC.user}<span>${t('Coach')}<small>${esc(F.coach)}</small></span></p>` : ''}</div></div>
        <div class="bv-o-det"><h2>${t('Order details')}</h2><dl class="bv-o-kv">${kv.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${m.up && C.can ? `<p class="bv-o-cxn">${t('Cancel before {when} for a full refund.', { when: whenAt(c, C.by) })}</p>` : ''}</div></section>
      ${(() => { const R2 = c.renewInfo(b); return R2 ? `<div class="pg-renew mt-renew"><div><b>${t('Renew for another month · 20% off')}</b><p>${t('Starts {date} at the same time, for the same participants.', { date: c.P.date(c.T.toDate(R2.start), 'short') })}</p></div><button type="button" class="btn sm" data-renew="${esc(b.cartId)}">${t('Renew program')}</button></div>` : ''; })()}
      <section class="bv-o-att" id="bvTix"><div class="bv-o-bar"><h2>${times ? t('Times') : prog ? t('Participants') : t('Players')} <span>${times ? R.length : m.active.length}</span></h2>
          ${bulk ? `<div class="bv-o-bulk${hasSel ? ' is-on' : ''}"><label class="bv-o-all"><input type="checkbox" data-bv-selall="${esc(b.cartId)}" ${hasSel === sendable.length ? 'checked' : ''}><span>${hasSel ? t('{n} selected', { n: hasSel }) : t('Select guests')}</span></label>
            <button type="button" class="mt-mini mt-accent" data-bv-bulk="${esc(b.cartId)}" ${hasSel ? '' : 'disabled'}>${SEND}<span>${hasSel === 1 ? t('Send 1 ticket') : hasSel ? t('Send {n} tickets', { n: hasSel }) : t('Send tickets')}</span></button></div>` : ''}</div>
        <div class="bv-o-tw"><table class="bv-o-t${bulk ? ' has-ck' : ''}"><thead><tr>${bulk ? '<th></th>' : ''}${cols.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${R.map(row).join('')}</tbody></table></div>
        ${m.people.some(p => m.canRemove(p)) ? `<p class="pg-note">${t('You can remove one person until free cancellation ends; their share is refunded and everyone else keeps their spot.')}</p>` : ''}</section>
      <div class="bv-o-foot"><section><h2 class="bv-h">${t('Receipt')}</h2>${receipt(c, m)}</section><section><h2 class="bv-h">${t('Need help?')}</h2>${helpBox(c, m)}</section></div>`;
  }

  const BV = { wallet: bvWallet, timeline: bvTimeline, split: bvSplit, rail: bvRail, tabs: bvTabs, order: bvOrder };

  const OPT = { bookings: BOOK, a: A, b: B, c: C, type: { list: TYPE.list, view: A.view }, family: { list: FAMILY.list, view: A.view }, calendar: { list: CAL.list, view: A.view }, today: TODAY };
  const PANEL = { b: 1, today: 1 };
  // ---- the hooks profile.html calls
  window.SFA_MT_OPTIONS = {
    has: v => !!OPT[v],
    count: c => lists(c).up.length,
    render(v, c){
      const O = OPT[v], id = c.groupId();
      if (id && O.view){ const m = all(c).find(x => x.b.cartId === id); if (m) return O.view(c, m); }
      if (id && !O.view && st.panel !== id && all(c).some(x => x.b.cartId === id)){ st.panel = id; history.replaceState(null, '', location.pathname + location.search + '#tickets'); }   // B: a link to a booking opens its panel
      return `<div class="mt mt-${v}">${O.list(c)}</div>`;
    },
    // returns true when it handled the click
    async click(v, e, c){
      const el = e.target.closest('[data-bv-tab],[data-bv-go],[data-bv-card],[data-bv-sel],[data-bv-selall],[data-bv-bulk],[data-bv-scroll],[data-mt-checkin],[data-mt-copy],[data-mt-kt],[data-mt-tf],[data-mt-type],[data-mt-person],[data-mt-cal],[data-mt-day],[data-mt-seg],[data-mt-who],[data-mt-open],[data-mt-close],[data-mt-toggle],[data-mt-pick],[data-mt-ticket],[data-mt-send],[data-mt-sendall],[data-mt-remove]'); if (!el) return false;
      const d = el.dataset;
      if (d.bvTab){ const [cart, k] = d.bvTab.split('|'); st.bt[cart] = k; c.paint(); c.root.querySelector(`[data-bv-tab="${CSS.escape(d.bvTab)}"]`)?.focus(); return true; }
      if (d.bvGo){ const x = c.root.querySelector('#' + d.bvGo); if (!x){ const tb = c.root.querySelector('[data-bv-tab$="|tix"]'); if (tb){ tb.click(); return true; } } x?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
      if (d.bvCard){ const k = 'card|' + d.bvCard; st.open[k] = !st.open[k]; c.paint(); c.root.querySelector(`[data-bv-card="${CSS.escape(d.bvCard)}"]`)?.focus(); return true; }
      if (d.bvSel){ const [cart, i] = d.bvSel.split('|'), l = st.sel[cart] = st.sel[cart] || [], n = +i; el.checked ? l.includes(n) || l.push(n) : l.splice(l.indexOf(n), 1); c.paint(); c.root.querySelector(`[data-bv-sel="${CSS.escape(d.bvSel)}"]`)?.focus(); return true; }
      if (d.bvSelall){ const cart = d.bvSelall, m = all(c).find(x => x.b.cartId === cart); st.sel[cart] = el.checked && m ? m.people.filter(p => m.canSend(p)).map(p => p.i) : []; c.paint(); c.root.querySelector(`[data-bv-selall]`)?.focus(); return true; }
      if (d.bvBulk){ const cart = d.bvBulk, m = all(c).find(x => x.b.cartId === cart), l = (st.sel[cart] || []).slice(); if (!m || !l.length) return true;
        el.disabled = true; let ok = 0, err = '';
        for (const i of l){ const r = await c.post('/api/auth/send-ticket', { cart, i }); if (r.ok) ok++; else err = r.d.error; }
        st.sel[cart] = []; await c.reload(); c.A.toast(ok ? (ok === 1 ? c.t('Ticket sent') : c.t('{n} tickets sent', { n: ok })) : c.t(err || 'Something went wrong. Try again.')); return true; }
      if (d.bvScroll){ const r = c.root.querySelector('#bvPasses'); if (r){ const dir = document.documentElement.dir === 'rtl' ? -1 : 1, w = (r.firstElementChild || r).getBoundingClientRect().width + 16; r.scrollBy({ left: +d.bvScroll * w * dir, behavior: 'smooth' }); } return true; }
      if (d.mtCheckin){ const [cart, i] = d.mtCheckin.split('|'); el.disabled = true; const r = await c.post('/api/auth/check-in', { cart, i: +i }); await c.reload();
        c.A.toast(r.ok ? c.t('{name} checked in · {n} sessions left', { name: String(r.d.name || '').split(' ')[0], n: r.d.left }) : c.t(r.d.error || 'Something went wrong. Try again.')); return true; }
      if (d.mtCopy){ try { await navigator.clipboard.writeText(d.mtCopy); } catch (x) {} c.A.toast(c.t('Booking ref copied')); return true; }
      if (d.mtKt){ st.kt = d.mtKt; c.paint(); c.root.querySelector(`[data-mt-kt="${d.mtKt}"]`)?.focus(); return true; }
      if (d.mtTf){ const [cart, k] = d.mtTf.split('|'); st.tf[cart] = k === 'all' ? 'all' : +k; c.paint(); c.root.querySelector(`[data-mt-tf="${CSS.escape(d.mtTf)}"]`)?.focus(); return true; }
      if (d.mtType){ st.type = d.mtType; c.paint(); c.root.querySelector(`[data-mt-type="${d.mtType}"]`)?.focus(); return true; }
      if (d.mtPerson){ st.person = d.mtPerson; c.paint(); c.root.querySelector(`.mt-fam-rail [data-mt-person="${CSS.escape(d.mtPerson)}"]`)?.focus(); return true; }
      if (d.mtCal !== undefined){ const n = +d.mtCal, now = new Date(); if (!n){ st.cal = { y: now.getFullYear(), m: now.getMonth(), day: dayK(now) }; } else { const x = new Date(st.cal.y, st.cal.m + n, 1); st.cal.y = x.getFullYear(); st.cal.m = x.getMonth(); } c.paint(); c.root.querySelector(`[data-mt-cal="${d.mtCal}"]`)?.focus(); return true; }
      if (d.mtDay){ const x = c.T.toDate(d.mtDay); st.cal = { y: x.getFullYear(), m: x.getMonth(), day: d.mtDay }; c.paint(); c.root.querySelector(`.mt-day[data-mt-day="${d.mtDay}"]`)?.focus(); return true; }
      if (d.mtSeg){ st.seg = d.mtSeg; c.paint(); return true; }
      if (d.mtWho){ st.who = d.mtWho; c.paint(); c.root.querySelector(`[data-mt-who="${CSS.escape(st.who)}"]`)?.focus(); return true; }
      if (d.mtOpen){ if (PANEL[v]){ st.panel = d.mtOpen; c.paint(); c.root.querySelector('.mt-panel .x')?.focus(); } else { location.hash = '#tickets/' + encodeURIComponent(d.mtOpen); scrollTo({ top: 0 }); } return true; }
      if (el.hasAttribute('data-mt-close')){ const id = st.panel; st.panel = null; c.paint(); c.root.querySelector(`[data-mt-open="${CSS.escape(id || '')}"]`)?.focus(); return true; }
      if (d.mtToggle){ st.open[d.mtToggle] = !st.open[d.mtToggle]; c.paint(); c.root.querySelector(`[data-mt-toggle="${CSS.escape(d.mtToggle)}"]`)?.focus(); return true; }
      if (d.mtPick){ const [cart, j] = d.mtPick.split('|'); st.pick[cart] = +j; c.paint(); c.root.querySelector(`.mt-switch [aria-selected=true]`)?.focus(); return true; }
      if (d.mtTicket){ c.openTicket(d.mtTicket); return true; }
      if (d.mtSend || d.mtSendall){
        const cart = d.mtSend ? d.mtSend.split('|')[0] : d.mtSendall, m = all(c).find(x => x.b.cartId === cart); if (!m) return true;
        const who = d.mtSend ? [m.people[+d.mtSend.split('|')[1]]] : m.people.filter(p => m.canSend(p) && !p.sent);
        el.disabled = true; let ok = 0, err = '';
        for (const p of who){ const r = await c.post('/api/auth/send-ticket', { cart, i: p.i }); if (r.ok) ok++; else err = r.d.error; }
        await c.reload();
        c.A.toast(ok ? (who.length === 1 ? c.t('Ticket sent to {to}', { to: fmtPhone(who[0].phone) }) : c.t('{n} tickets sent', { n: ok })) : c.t(err || 'Something went wrong. Try again.'));
        return true;
      }
      if (d.mtRemove){ askRemove(c, d.mtRemove); return true; }
      return false;
    }
  };

  // ---- remove one person: confirm, then /api/auth/cancel-person
  function askRemove(c, key){
    const [cart, i] = key.split('|'), m = all(c).find(x => x.b.cartId === cart), p = m && m.people[+i]; if (!p) return;
    const share = m.share(p), n = m.ticketsOf(p).length, dlg = c.dlg;
    dlg.innerHTML = `<div class="dlg-top"><h2 id="dlgH">${c.t('Remove {name}?', { name: c.esc(p.name.split(' ')[0]) })}</h2><button type="button" class="x" data-close aria-label="${c.t('Close')}">${RM}</button></div>
      <div class="dlg-body cx"><p><b>${c.esc(p.name)}</b> · ${c.esc(m.D.label)}</p>
        <p>${n > 1 ? c.t('Their {n} tickets will be cancelled.', { n }) : c.t('Their ticket will be cancelled.')} ${c.t('Everyone else on the booking keeps their spot.')} ${share ? c.t('{amount} goes back to your card within 5 to 10 working days.', { amount: c.P.money(share) }) : ''} ${(() => { const f = m.b.order.offer; return f && m.active.length - 1 < f.min ? c.t('The offer needs {n} or more people, so it no longer applies and the price is worked out again.', { n: f.min }) : ''; })()} ${c.t('This can’t be undone.')}</p>
        <p class="err" id="cxErr" role="alert"></p>
        <div class="dlg-acts"><button type="button" class="btn sm danger" data-mt-rm-yes="${c.esc(key)}">${share ? c.t('Remove and refund {amount}', { amount: c.P.money(share) }) : c.t('Remove {name}', { name: c.esc(p.name.split(' ')[0]) })}</button><button type="button" class="ghost sm" data-close>${c.t('Keep')}</button></div></div>`;
    dlg.dir = document.documentElement.dir; if (!dlg.open) dlg.showModal(); dlg.querySelector('[data-close].ghost')?.focus();
    if (!dlg.dataset.mtBound){ dlg.dataset.mtBound = '1';
      dlg.addEventListener('click', async e => {
        const y = e.target.closest('[data-mt-rm-yes]'); if (!y) return;
        const [cart, i] = y.dataset.mtRmYes.split('|'); y.disabled = true;
        const r = await c.post('/api/auth/cancel-person', { cart, i: +i });
        if (!r.ok){ y.disabled = false; dlg.querySelector('#cxErr').textContent = c.t(r.d.error || 'Something went wrong. Try again.'); return; }
        dlg.close(); await c.reload();
        c.A.toast(r.d.refund ? c.t('{name} removed · {amount} refunded', { name: r.d.name, amount: `${c.t('SAR')} ${(+r.d.refund).toLocaleString('en-US')}` }) : c.t('{name} removed', { name: r.d.name }));
      });
    }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && st.panel && !document.querySelector('dialog[open]')){ const b = document.querySelector('.mt-panel [data-mt-close]'); b && b.click(); } });
})();
