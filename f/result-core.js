/* Confirmation page core, shared by the live result.html (option O, since 10 Nov) and the review options result-a…o.html
   (result-hero.html and result-v1.html keep their own copies of this logic). Loads /api/booking?cart=…, shows the shared failed and checking states, and hands a paid booking to the
   page's own layout: window.RESULT_VIEW.paid(m) returns the HTML for #body, and .after(m) (optional) wires it up.

   m = { b, list (sessions), prog, sport, court, D (describe of the first session), title, ref, rows, by,
         who (booked for), when (first to last date), count, acts: { tickets, ics, icsName, dir, more },
         tips: [..], ticket(s) (the shared ticket markup), date(s), time(s), money(n), esc, t, ICON,
         game, ladies, days (one entry per session, without the per-participant copies), pattern (weekdays · time when
         every session shares one time), place ('SFA Domes Dammam'), coach (program), early (minutes to arrive early) }
   Needs f/courts-data.js, f/programs-data.js, f/i18n-ar.js, f/prefs.js, f/tickets.js. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const P = window.SFA_PREFS, t = P.t, T = window.SFA_TICKETS, V = window.RESULT_VIEW || {};
  const money = n => `<span class="sfa-money"><span class="sfa-sar" role="img" aria-label="SAR"></span>${(+n).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>`;
  const MARK = { paid: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', failed: '<path d="M6 6l12 12M18 6 6 18"/>', pending: '<path d="M12 3a9 9 0 1 0 9 9"/>' };
  const ICON = {
    arrow: '<svg class="fwd" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };
  const date = (s, f = 'full') => P.date(T.toDate(s.date), f);
  const time = s => `<bdi>${P.time(s.start)}</bdi> – <bdi>${P.time(s.end)}</bdi>`;

  const cart = new URLSearchParams(location.search).get('cart');
  let tries = 0;
  function show(state, title, sub, body = ''){
    $('cf').className = 'cf ' + state + (state === 'paid' ? '' : ' solo'); $('markIcon').innerHTML = MARK[state];
    document.body.dataset.state = state;
    $('title').textContent = t(title); $('sub').innerHTML = sub; $('body').innerHTML = body;
  }
  const home = `<div class="acts"><a class="btn" href="index.html">${t('Back to home')}</a></div>`;
  async function load(){
    if (!cart) return show('failed', 'No booking found', t('This link is missing its booking reference.'), home);
    let b;
    try { const r = await fetch('/api/booking?cart=' + encodeURIComponent(cart)); b = await r.json(); if (!r.ok) throw new Error(b.error); }
    catch (e) { return show('failed', 'No booking found', esc(t(e.message || 'We could not load this booking.')), home); }

    const sport = window.SFA_SPORTS[b.order.sport], court = sport && sport.courts[b.order.court];
    const list = T.sessions(b), bf = b.order.bookingFor || { type: 'me' };
    const ref = `<span class="ref">${t('Booking ref {ref}', { ref: esc(b.cartId) })}</span>` + (b.test ? `<span class="test-tag">${t('Test payment · nothing was charged')}</span>` : '');
    const prog = b.order.kind === 'program' && window.SFA_PROGRAMS[b.order.program], kit = b.order.kit, K = window.SFA_PROGRAM_KIT, game = b.order.kind === 'game';
    const w = b.order.waiver, by = w && w.guardian ? `${esc(w.acceptedBy)} · ${t('Guardian')}` : '';
    const who = prog ? T.people(b).map(x => esc(x.name)).join(', ') : bf.type === 'other' ? esc(bf.name) : bf.type === 'child' ? esc(bf.name) : t('Myself');
    const sessionsTxt = prog ? t('{n} × {m} min', { n: list[0] ? list[0].of : 0, m: prog.minutes })
      : P.lang === 'ar' ? t('{d} days · {n} × 1.5 hr', { d: b.order.days.length, n: list.length }) : `${b.order.days.length} ${b.order.days.length === 1 ? 'day' : 'days'} · ${list.length} × 1.5 hr`;
    const rows = `<dl class="rows">` + (prog
      ? `<dt>${t('Program')}</dt><dd>${esc(T.tx(prog.name))}</dd><dt>${t('Plan')}</dt><dd>${t({ trial: 'Free trial', month: 'One month', month2: 'Two months', month3: 'Three months' }[b.order.plan] || 'One month')}</dd>
        <dt>${t(T.people(b).length > 1 ? 'Participants' : 'Participant')}</dt><dd>${T.people(b).map(x => esc(x.name)).join('<br>')}</dd>${by ? `<dt>${t('Booked by')}</dt><dd>${by}</dd>` : ''}<dt>${t('Sessions')}</dt><dd>${sessionsTxt}</dd>
        ${kit ? `<dt>${esc(T.tx(K.name))}</dt><dd>× ${kit.qty}${kit.sizes ? ` · <bdi>${kit.sizes.map(esc).join(', ')}</bdi>` : ''}</dd>` : ''}`
      : `<dt>${t('Court')}</dt><dd>${esc(t(sport?.name || ''))} · ${esc(t(court?.[0] || ''))}</dd>
      <dt>${t('Booked for')}</dt><dd>${bf.type === 'other' ? esc(bf.name) + ' · ' + esc(bf.phone) : who}</dd>${by ? `<dt>${t('Booked by')}</dt><dd>${by}</dd>` : ''}
      <dt>${t('Sessions')}</dt><dd>${sessionsTxt}</dd>`) + `
      ${b.paidAt && !b.free ? `<dt>${t('Paid on')}</dt><dd>${P.date(new Date(b.paidAt), 'full')}</dd>` : ''}
      ${b.tranRef ? `<dt>${t(b.test ? 'Test ref' : 'PayTabs ref')}</dt><dd>${esc(b.tranRef)}</dd>` : ''}
      <dt class="total">${t(b.status === 'paid' ? 'Paid' : b.status === 'cancelled' ? 'Refunded' : 'Total')}</dt><dd class="total">${b.free ? t('Free of charge') : money(b.amount)}</dd></dl>`;

    if (b.status === 'paid'){
      try { sessionStorage.removeItem('sfaOrder'); } catch (e) {}
      const first = list[0], last = list[list.length - 1];
      const days = list.filter((s, i, all) => all.findIndex(x => x.n === s.n) === i);
      const wk = [...new Set(days.map(s => T.toDate(s.date).getDay()))].sort((x, y) => x - y);
      const sameTime = days.every(s => s.start === first.start);
      const wkName = d => { const x = new Date(2026, 0, 4 + d); return P.date(x, { weekday: 'short' }); };   // 4 Jan 2026 is a Sunday
      const pattern = days.length > 1 && sameTime && wk.length < days.length ? `${wk.map(wkName).join(P.lang === 'ar' ? '، ' : ', ')} · ${time(first)}` : '';
      const slot = prog && prog.slots.find(x => x.time === first.start);
      const m = {
        b, list, prog, sport, court, D: T.describe(first, b), ref, rows, by, who, count: list.length,
        title: b.free && !game ? 'Your free trial is booked' : "You're booked", sessionsTxt,
        when: first.date === last.date ? date(first) : `${P.date(T.toDate(first.date), 'short')} – ${P.date(T.toDate(last.date), 'short')}`,
        game, ladies: !!b.order.ladies, days, pattern, coach: slot ? T.tx(slot.coach) : '', early: prog ? 15 : 10,
        place: t('SFA Domes Dammam'),
        acts: { tickets: 'profile.html#tickets', ics: T.ics(b), icsName: T.icsName(b), dir: T.DIRECTIONS,
          more: prog ? (b.order.plan === 'trial' ? { href: `program.html?p=${encodeURIComponent(b.order.program)}#book`, label: t('Subscribe for a month') } : { href: 'programs.html', label: t('Explore training programs') })
            : game ? { href: 'matches.html', label: t('Find another game') } : b.order.ladies ? { href: `ladies-hours.html?sport=${encodeURIComponent(b.order.sport)}#book`, label: t('Book more ladies hours') }
            : { href: `courts.html?sport=${encodeURIComponent(b.order.sport)}`, label: t('Book another court') } },
        tips: [t('Your tickets are saved in your profile, under My tickets.'), t('Show the QR code at reception when you arrive.'),
          t(prog ? 'Arrive at least 15 minutes before the session, in the training kit and sports shoes.' : 'Come 10 minutes early to change and warm up.')],
        ticket: s => T.ticket(s, b), date, time, money, esc, t, ICON
      };
      show('paid', m.title, ref, V.paid ? V.paid(m) : '');
      V.after && V.after(m);
      return T.paintQR($('body'));
    }
    // cancelled for free (up to 48 h before): when, and what went back to the card
    if (b.status === 'cancelled'){
      return show('failed', 'Booking cancelled', `${b.cancelledAt ? t('Cancelled on {date}.', { date: P.date(new Date(b.cancelledAt), 'full') }) : ''} ${b.refund ? t('{amount} goes back to your card within 5 to 10 working days.', { amount: money(b.refund) }) : ''}<br>${ref}`,
        `<div class="box">${rows}</div><div class="acts"><a class="btn" href="profile.html#tickets">${t('View my tickets')}</a><a class="ghost" href="index.html">${t('Back to home')}</a></div>`);
    }
    if (b.status === 'failed'){
      return show('failed', "Payment didn't go through", `${esc(t(b.message || 'The payment was declined or cancelled.'))}. ${t('Nothing was charged.')}<br>${ref}`,
        `<div class="box">${rows}</div><div class="acts"><a class="btn" href="checkout.html">${t('Try again')}</a><a class="ghost" href="index.html">${t('Back to home')}</a></div>`);
    }
    if (tries++ < 5){ show('pending', 'Checking your payment', `${t('Still confirming with PayTabs.')}<br>${ref}`); return setTimeout(load, 3000); }
    show('pending', 'Payment not confirmed yet', `${t("We haven't heard back from PayTabs. If you were charged, your booking will confirm shortly.")}<br>${ref}`,
      `<div class="box">${rows}</div><div class="acts"><button class="btn" type="button" onclick="location.reload()">${t('Check again')}</button><a class="ghost" href="index.html">${t('Back to home')}</a></div>`);
  }
  load();
  addEventListener('sfa:prefs', () => { tries = 0; load(); });
})();
