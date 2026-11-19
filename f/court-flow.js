/* Court booking · step 1, Date & time (Figma "Checkout · Court · Desktop" 142:9464, Ahmed 2026-11-18).
   On court-details.html in flow mode (f/flow.js: ?book=1) the page becomes the checkout-style step: a checkout header
   (logo, the steps Date & time → Addons → Checkout, close), a Back title, the "Select date & time" card holding the
   page's own calendar (moved in, so all its logic stays in f/court-details.js), and the booking summary card with the
   picked times, the total and Continue. f/court-flow.css. */
(() => {
  const P = window.SFA_PREFS, t = P.t;
  const icon = (src, w, h, cls) => `<img class="${cls || ''}" src="${src}" width="${w}" height="${h}" alt="">`;
  // the checkout header and the Back title, shared by step 1 (here) and step 2 Details (checkout.html, courts):
  // Date & time → Details → Checkout (Ahmed, 2026-11-18: "Details" in place of the frame's "Addons"; Checkout is the payment page)
  const STEPS = ['Date & time', 'Details', 'Checkout'];
  const fig = () => { if (!document.querySelector('link[href*="family=Figtree"]')){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@600;700&display=swap'; document.head.appendChild(l); } };
  window.SFA_CF = {
    icon, STEPS, PROGRAM_STEPS: ['Date & time', 'Participants & add-ons', 'Checkout'],   // programs: start day, time and plan on one step (Figma 145:9511, 2026-11-19)
    LADIES_STEPS: ['Date & time', 'Tickets & add-ons', 'Checkout'],   // ladies hours as tickets (Ahmed, 2026-11-19)
    header: (now, close, steps = STEPS) => { fig(); return `<header class="cf-hd">
      <a class="cf-logo" href="index.html" aria-label="SFA Domes"><img src="f/hdr-logo.svg" width="73" height="58" alt=""></a>
      <ol class="cf-steps" aria-label="${t('Booking steps')}">${steps.map((s, i) => `<li class="${i < now ? 'done' : i === now ? 'now' : ''}"${i === now ? ' aria-current="step"' : ''}>${i ? '<i class="cf-line" aria-hidden="true"></i>' : ''}<span class="cf-n">${i < now ? icon('f/flow/step-check.svg', 14, 14) : i + 1}</span><span class="cf-l">${t(s)}</span></li>`).join('')}</ol>
      <a class="cf-x" href="${close}" aria-label="${t('Close')}">${icon('f/flow/icon-x.svg', 11.6667, 11.6667)}</a>
    </header>`; },
    back: href => `<a class="cf-back" href="${href}" aria-label="${t('Back')}">${icon('f/flow/chevron-left.svg', 6.66667, 11.6667, 'cf-flip')}</a><span>${t('Back')}</span>`
  };
  const F = window.SFA_FLOW, D = window.SFA_DETAILS;
  if (!F || !F.on || F.kind !== 'court' || !D) return;
  const $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = document.documentElement; html.classList.add('cf');
  const close = F.infoUrl();

  const root = document.createElement('div'); root.className = 'cf-root';
  document.body.prepend(root);
  function frame(){
    root.innerHTML = `${window.SFA_CF.header(0, close)}
    <main class="cf-page">
      <div class="cf-title"><a class="cf-back" href="${close}" aria-label="${t('Back')}">${icon('f/flow/chevron-left.svg', 6.66667, 11.6667, 'cf-flip')}</a><h1>${t('Back')}</h1></div>
      <div class="cf-cols">
        <section class="cf-card" aria-labelledby="cfH">
          <header class="cf-card-h"><h2 id="cfH">${t('Select date & time')}</h2>
            <ul class="cf-legend"><li><i class="sw"></i>${t('Free')}</li><li><i class="sw pk"></i>${t('Picked')}</li><li><i class="sw bk"></i>${t('Booked')}</li></ul></header>
          <div class="cf-body">
            <div class="cf-month" id="cfMonth"></div>
            <div id="cfGrid"></div>
            <ul class="cf-key"><li><i class="sw pk"></i>${t('Has times picked')}</li><li><i class="sw op"></i>${t('Open day')}</li></ul>
          </div>
        </section>
        <div class="cf-side"><aside class="cf-sum" aria-label="${t('Booking summary')}" id="cfSum"></aside><div class="cf-of" id="cfOffers"></div></div>
      </div>
    </main>`;
  }
  // the page's own calendar pieces (with their listeners) move into the card
  const parts = () => ({ month: $('calMonth'), prev: $('calPrev'), next: $('calNext'), grid: $('calGrid') });
  function mount(){
    const p = parts(); if (!p.grid) return;
    const m = $('cfMonth'); const nav = document.createElement('div'); nav.className = 'cf-arrows';
    p.prev.innerHTML = icon('f/flow/cal-prev.svg', 8.66176, 14.4951, 'cf-flip'); p.next.innerHTML = icon('f/flow/cal-next.svg', 7.82843, 12.8284, 'cf-flip');
    nav.append(p.prev, p.next); m.append(p.month, nav); $('cfGrid').append(p.grid);
  }
  // the summary card: the court, the picked times by day (each with its price and a remove), the total, Continue
  const dayFmt = d => P.date(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  function sum(){
    const box = $('cfSum'); if (!box) return;
    const sp = D.sport, keys = [...D.picks.keys()].sort(), n = [...D.picks.values()].reduce((a, s) => a + s.size, 0), full = n * D.SLOT_PRICE;
    const OF = window.SFA_OFFER_UI, B = OF && n ? OF.best('court', { sport: D.key, court: D.court }, n, full) : null, total = B ? Math.round((full - B.save) * 100) / 100 : full;
    const X = icon('f/flow/close-sm.svg', 10.8284, 10.8284);
    box.innerHTML = `<div class="cf-photo"><img src="${window.SFA_COURT_IMG(D.key, sp.courts[D.court])}" alt=""><span class="cf-scrim" aria-hidden="true"></span>
        <div class="cf-ph-t"><small>${t(sp.name)} · ${t('SFA Domes Dammam')}</small><b>${esc(t(D.name))}</b></div></div>
      <div class="cf-lines">${keys.length ? keys.map(k => `<div class="cf-day"><p class="cf-date">${dayFmt(D.fromKey(k))}</p>${[...D.picks.get(k)].sort((a, b) => a - b).map(s => `<div class="cf-row"><span class="cf-time">${D.fmtSlot(s)}</span><span class="cf-p">${P.money(D.SLOT_PRICE)}</span><button type="button" class="cf-rm" data-k="${k}" data-s="${s}" aria-label="${t('Remove {slot}', { slot: D.fmtSlot(s) })}">${X}</button></div>`).join('')}</div>`).join('')
          : `<p class="cf-empty">${t('No times picked yet. Tap a day, then pick one or more slots.')}</p>`}</div>
      ${B ? `<div class="cf-line-of"><span>${OF.line({ id: B.o.id, save: B.save })[0]}</span><span>${OF.line({ id: B.o.id, save: B.save })[1]}</span></div>` : ''}
      <div class="cf-total"><span>${t('Total')}</span><strong>${B ? `<s>${P.money(full)}</s> ` : ''}${P.money(total)}</strong></div>
      <div class="cf-go"><button type="button" class="cf-btn" id="cfGo"${n ? '' : ' disabled'}>${t(n ? 'Continue' : 'Pick a time')}</button></div>`;
    // offers that count times are shown in this step (Ahmed, 2026-11-18), the one that applies marked, with a nudge to the next
    const of = $('cfOffers'); if (of) of.innerHTML = OF ? OF.block('court', { sport: D.key, court: D.court }, n, D.SLOT_PRICE) : '';
  }
  root.addEventListener('click', e => {
    const rm = e.target.closest('.cf-rm'); if (rm){ D.remove(rm.dataset.k, +rm.dataset.s); return; }
    if (e.target.closest('#cfGo')) D.book();
  });
  frame(); mount(); sum();
  document.addEventListener('sfa:render', sum);
  addEventListener('sfa:prefs', () => { const p = parts(); document.body.append(p.month, p.prev, p.next, p.grid); frame(); mount(); sum(); });
})();

// Tablets and phones: the summary card is hidden (f/court-flow.css) and the bottom bar's total opens it as a sheet
// (Ahmed, 2026-11-19). Works on every flow page with #cfSum: court details, training programs and ladies hours.
(() => {
  const html = document.documentElement, small = () => innerWidth < 1024;
  const ready = () => html.classList.contains('fl-on') && document.getElementById('cfSum');
  const targets = () => [...document.querySelectorAll('.go .go-pick, #bar .bar-t')];
  const open = () => html.classList.contains('cf-sheet');
  let scrim = null;
  function decorate(){
    if (!ready()) return;
    targets().forEach(el => { if (el.dataset.cfSheet) return; el.dataset.cfSheet = '1'; el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.setAttribute('aria-controls', 'cfSum'); el.setAttribute('aria-expanded', String(open())); el.title = window.SFA_PREFS ? window.SFA_PREFS.t('Booking summary') : 'Booking summary'; });
  }
  function set(on){
    if (on && (!small() || !ready())) on = false;
    html.classList.toggle('cf-sheet', on);
    if (on){ const bar = document.querySelector('.go, #bar'); html.style.setProperty('--cf-bar', Math.round(bar ? bar.getBoundingClientRect().height : 88) + 'px');
      if (!scrim){ scrim = document.createElement('div'); scrim.className = 'cf-sheet-scrim'; scrim.setAttribute('aria-hidden', 'true'); scrim.addEventListener('click', () => set(false)); document.body.appendChild(scrim); } }
    targets().forEach(el => el.setAttribute('aria-expanded', String(on)));
  }
  document.addEventListener('click', e => { const el = e.target.closest('[data-cf-sheet]'); if (el) set(!open()); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && open()){ set(false); return; }
    const el = e.target.closest && e.target.closest('[data-cf-sheet]'); if (el && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); set(!open()); }
  });
  addEventListener('resize', () => { if (!small() && open()) set(false); });
  new MutationObserver(decorate).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate); else decorate();
})();
