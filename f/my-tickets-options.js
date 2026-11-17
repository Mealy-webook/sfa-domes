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
  const st = { seg: 'up', who: 'all', panel: null, pick: {}, open: {}, type: 'court', person: 'all', cal: null, tf: {} };
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
    const share = p => !b.amount ? 0 : kind === 'game' ? (p.free ? 0 : (b.order.price || 0)) : Math.round((b.amount - (b.order.kit ? b.order.kit.qty * (window.SFA_PROGRAM_KIT || { price: 0 }).price : 0)) / people.length * 100) / 100;
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
  function head(c, m, back, backLabel){
    const b = m.b;
    return `${back ? `<a class="pg-back" href="#tickets" data-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>${c.t(backLabel || 'My tickets')}</a>` : ''}
      <section class="pg-head mt-head"><span class="pg-ph"><img src="${m.D.img}" alt="" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
        <div class="pg-in"><p class="eye">${m.kindTxt}</p><h2>${c.esc(m.D.label)}</h2>
          <p class="meta">${m.dateLine}</p><p class="meta">${m.count} · ${c.esc(m.names)} · <bdi>${c.esc(b.cartId)}</bdi></p>
          ${chip(c, m)}
          <div class="dlg-acts">${m.up ? `<a class="ghost sm" href="${c.T.ics(b)}" download="${c.T.icsName(b)}">${c.CAL}${c.t('Add to calendar')}</a><a class="ghost sm" href="${c.T.DIRECTIONS}" target="_blank" rel="noopener">${c.PIN}${c.t('Get directions')}</a>` : ''}<a class="ghost sm" href="result.html?cart=${encodeURIComponent(b.cartId)}">${c.t('Booking details')}</a>${m.up && c.T.cancelInfo(b).can ? `<button type="button" class="ghost sm danger" data-cancel="${c.esc(b.cartId)}">${c.t(m.n > 1 ? 'Cancel whole booking' : 'Cancel booking')}</button>` : ''}</div>
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
  const tixCount = m => m.ses.length;
  const BOOK = {
    list(c){
      st.who = 'all';
      const L = lists(c), segs = [['up', 'Upcoming', L.up.length], ['past', 'Past', L.past.length], ['off', 'Cancelled', L.off.length]], l = current(c);
      return `<div class="mt-bar"><div class="seg" role="group" aria-label="${c.t('My bookings')}">${segs.map(([k, lb, n]) => `<button type="button" data-mt-seg="${k}" aria-pressed="${st.seg === k}">${c.t(lb)} (${n})</button>`).join('')}</div></div>`
        + (l.length ? `<ol class="mt-cards mt-bk">${l.map((m, i) => `<li class="mt-card${m.up ? '' : ' is-off'}" style="--i:${i}">
          <button type="button" class="mt-hit" data-mt-open="${c.esc(m.b.cartId)}" aria-label="${c.t('Open booking')}: ${c.esc(m.D.label)}"></button>
          <span class="mt-ph"><img src="${m.D.img}" alt="" loading="lazy" style="object-position:${m.D.program ? m.D.program.focus : '50% 50%'}"></span>
          <div class="mt-body"><p class="mt-eye">${m.kindTxt} · <bdi>${c.esc(m.b.cartId)}</bdi></p><strong>${c.esc(m.D.label)}</strong><p class="mt-meta">${m.dateLine}</p>
            <p class="mt-meta mt-who">${m.count} · ${c.esc(m.names)}</p>${chip(c, m)}</div>
          <div class="mt-cta mt-bk-n"><span class="mt-tix">${QRI}<b>${tixCount(m)}</b><small>${tixCount(m) === 1 ? c.t('ticket') : c.t('tickets')}</small></span><span class="ghost sm mt-view">${c.t('Open booking')}${c.ARROW}</span></div></li>`).join('')}</ol>` : emptyTxt(c));
    },
    view(c, m){
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
      return head(c, m, true, 'My bookings')
        + (R ? `<div class="pg-renew mt-renew"><div><b>${c.t('Renew for another month · 20% off')}</b><p>${c.t('Starts {date} at the same time, for the same participants.', { date: c.P.date(c.T.toDate(R.start), 'short') })}</p></div><button type="button" class="btn sm" data-renew="${c.esc(b.cartId)}">${c.t('Renew program')}</button></div>` : '')
        + `<section class="mt-tix-sec"><div class="sec"><h2>${c.t('Tickets')}</h2><span>${list.length}</span></div>${chips}${pbar}
          ${up.length ? `<ol class="mt-tks">${up.map(row).join('')}</ol>` : `<p class="meta">${c.t(m.cancelled ? 'This booking was cancelled.' : 'No upcoming tickets in this booking.')}</p>`}
          ${done.length ? `<details class="mt-hist"${up.length ? '' : ' open'}><summary>${c.t('Played')} <b>${done.length}</b></summary><ol class="mt-tks">${done.map(row).join('')}</ol></details>` : ''}
          ${gone.length ? `<ul class="mt-removed">${gone.map(p => `<li><b>${c.esc(p.name)}</b>${goneLine(c, m, p)}</li>`).join('')}</ul>` : ''}</section>`;
    }
  };

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
      const el = e.target.closest('[data-mt-tf],[data-mt-type],[data-mt-person],[data-mt-cal],[data-mt-day],[data-mt-seg],[data-mt-who],[data-mt-open],[data-mt-close],[data-mt-toggle],[data-mt-pick],[data-mt-ticket],[data-mt-send],[data-mt-sendall],[data-mt-remove]'); if (!el) return false;
      const d = el.dataset;
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
        <p>${n > 1 ? c.t('Their {n} tickets will be cancelled.', { n }) : c.t('Their ticket will be cancelled.')} ${c.t('Everyone else on the booking keeps their spot.')} ${share ? c.t('{amount} goes back to your card within 5 to 10 working days.', { amount: c.P.money(share) }) : ''} ${c.t('This can’t be undone.')}</p>
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
