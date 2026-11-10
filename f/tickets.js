/* Court tickets, shared by result.html (booking confirmed) and profile.html (My tickets). A booking can hold several
   sessions; every session is its own ticket with a QR code (booking ref + session number) to show at reception.

   window.SFA_TICKETS
     .sessions(booking)          the booking's sessions in date order: { id, cart, n, of, sport, court, date, start, end }
     .ticket(session, booking)   ticket markup (court photo, date and time, who it's for, QR stub); call .paintQR() after
     .qrLive(session, booking)   'on' | 'soon' | 'over': a program's QR only works on the session day
     .paintQR(root)              draws every [data-qr] inside root (the QR library loads once, from cdnjs)
     .ics(booking) .icsName(b)   an .ics calendar file (Blob URL) with one event per session
     .DIRECTIONS                 Google Maps directions to SFA Domes Dammam
     .describe(session, booking)  { sp, title, label, img } for a court booking or a training program booking
   Needs f/courts-data.js, f/programs-data.js and f/prefs.js. Styles: f/tickets.css. Square corners; the punches on the tear line are round. */
(() => {
  const P = window.SFA_PREFS, t = (s, p) => P.t(s, p), { SLOT } = window.SFA_SCHEDULE;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=26.4047835,50.0250094';
  const toDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const tx = o => o && (P.lang === 'ar' ? o.ar : o.en);
  // what a ticket is for: a court, or a training program (whose order carries the program and its sport, no court)
  function describe(s, b){
    const sp = window.SFA_SPORTS[s.sport];
    if (b.order.kind === 'program'){
      const p = window.SFA_PROGRAMS[b.order.program], title = tx(p.name);
      return { sp, title, label: title, program: p, img: p.img || window.SFA_COURT_IMG(p.sport, sp.courts[p.court || 0]) };
    }
    const c = sp.courts[s.court];
    return { sp, title: t(c[0]), label: `${t(sp.name)} · ${t(c[0])}`, img: window.SFA_COURT_IMG(s.sport, c) };
  }

  // a program booking's participants (older bookings hold one player)
  const people = b => b.order.participants || (b.order.player ? [b.order.player] : []);
  // every session is a ticket; a program booking has one per participant per session (n counts the session)
  function sessions(b){
    const out = [], prog = b.order.kind === 'program', bf = b.order.bookingFor || {}, who = prog ? people(b) : [bf.type === 'child' ? { name: bf.name } : null];   // a court booked for a child carries their name
    const len = prog ? (window.SFA_PROGRAMS[b.order.program] || {}).minutes || SLOT : SLOT;
    let n = 0;
    [...b.order.days].sort((x, y) => x.date.localeCompare(y.date)).forEach(d => [...d.starts].sort((x, y) => x - y).forEach(s => { n++; who.forEach(w => out.push({ date: d.date, start: s, end: s + len, n, player: w && w.name })); }));
    return out.map((s, i) => ({ ...s, id: `${b.cartId}-${i + 1}`, cart: b.cartId, of: n, sport: b.order.sport, court: b.order.court }));
  }

  // program QR codes work only on the session day (Ahmed, 2026-11-10): before it the stub shows a lock and the unlock date,
  // after it "ended"; the code itself is not drawn while locked. Courts and games keep their QR.
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const qrLive = (s, b) => b.order.kind !== 'program' ? 'on' : s.date === dayKey(new Date()) ? 'on' : s.date > dayKey(new Date()) ? 'soon' : 'over';
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
  const icon = sp => sp.img ? `<img src="${sp.img}" alt="">` : `<span class="msi">${sp.icon}</span>`;
  function ticket(s, b){
    const D = describe(s, b), sp = D.sp, prog = b.order.kind === 'program', bf = b.order.bookingFor || { type: 'me' };
    const who = prog ? [t('Participant'), esc(s.player || '')] : [t('Booked for'), bf.type === 'other' || bf.type === 'child' ? esc(bf.name) : t('Myself')];
    return `<article class="tk" data-ticket="${esc(s.id)}">
      <div class="tk-ph"><img src="${D.img}" alt="" loading="lazy" style="object-position:${D.program ? D.program.focus : '50% 50%'}"><span class="tk-sp"><span class="tk-ico" aria-hidden="true">${icon(sp)}</span>${esc(t(sp.name))}</span></div>
      <div class="tk-main">
        <p class="tk-eye">${prog ? t(b.order.plan === 'trial' ? 'Free trial' : 'Training program') : b.order.kind === 'game' ? `${t('Open game')} · ${t(b.order.level)}` : b.order.ladies ? t('Ladies hours') : t('SFA Domes Dammam')}</p>
        <h3 class="tk-court">${esc(D.title)}</h3>
        <dl class="tk-dl">
          <div class="tk-when"><dt>${t('Date and time')}</dt><dd>${P.date(toDate(s.date), 'full')} · <bdi>${P.time(s.start)}</bdi> – <bdi>${P.time(s.end)}</bdi></dd></div>
          <div><dt>${who[0]}</dt><dd>${who[1]}</dd></div>
          ${s.of > 1 ? `<div><dt>${t('Session')}</dt><dd>${t('{i} of {n}', { i: s.n, n: s.of })}</dd></div>` : ''}
        </dl>
      </div>
      ${qrLive(s, b) === 'on' ? `<div class="tk-stub"><div class="tk-qr" data-qr="${esc(s.id)}" role="img" aria-label="${t('QR code for {ref}', { ref: esc(s.id) })}"></div>
        <span class="tk-ref">${esc(s.id)}</span><small>${t('Show this at reception')}</small></div>`
        : `<div class="tk-stub tk-stub--lock"><div class="tk-qr tk-qr--lock" role="img" aria-label="${t('QR code locked')}">${LOCK}</div>
        <span class="tk-ref">${esc(s.id)}</span><small>${qrLive(s, b) === 'soon' ? t('QR unlocks on {date}', { date: P.date(toDate(s.date), 'short') }) : t('This session has ended')}</small></div>`}
    </article>`;
  }

  // QR codes: qrcode-generator from cdnjs, drawn as crisp SVG squares
  let lib;
  const loadLib = () => lib || (lib = new Promise((ok, no) => {
    if (window.qrcode) return ok(window.qrcode);
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    sc.onload = () => ok(window.qrcode); sc.onerror = no; document.head.appendChild(sc);
  }));
  function svg(qr){
    const n = qr.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}"/></svg>`;
  }
  async function paintQR(root = document){
    const els = [...root.querySelectorAll('[data-qr]:not([data-qr-done])')]; if (!els.length) return;
    try {
      const make = await loadLib();
      els.forEach(el => { const q = make(0, 'M'); q.addData(el.dataset.qr); q.make(); el.innerHTML = svg(q); el.dataset.qrDone = '1'; });
    } catch (e) { els.forEach(el => el.classList.add('tk-qr--off')); }   // offline: the ref under it still identifies the ticket
  }

  // calendar file: Riyadh is UTC+3 all year, so session times convert to UTC directly
  function ics(b){
    const D = describe(sessions(b)[0], b);
    const utc = (k, min) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 0, min - 180)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    const stamp = utc(new Date().toISOString().slice(0, 10), new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 180);
    // one event per session (a program booking for several participants has one ticket each, but one session)
    const ev = sessions(b).filter((s, i, all) => all.findIndex(x => x.n === s.n) === i).map(s => ['BEGIN:VEVENT', `UID:${s.id}@sfadomes`, `DTSTAMP:${stamp}`, `DTSTART:${utc(s.date, s.start)}`, `DTEND:${utc(s.date, s.end)}`,
      `SUMMARY:${b.order.kind === 'program' ? D.program.name.en : `${D.sp.name} · ${D.sp.courts[b.order.court][0]}`} · SFA Domes`, 'LOCATION:SFA Domes\\, Dammam', `DESCRIPTION:Booking ${s.id}. Show your ticket QR at reception.`, 'END:VEVENT'].join('\r\n'));
    return URL.createObjectURL(new Blob([['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SFA Domes//Bookings//EN', ...ev, 'END:VCALENDAR'].join('\r\n')], { type: 'text/calendar' }));
  }
  const icsName = b => `sfa-domes-${b.cartId}.ics`;

  window.SFA_TICKETS = { sessions, people, ticket, describe, paintQR, ics, icsName, DIRECTIONS, toDate, tx, qrLive };
})();
