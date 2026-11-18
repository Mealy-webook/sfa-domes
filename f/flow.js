/* The booking flow (Ahmed, 2026-11-18: "follow the structure of the booking journey of webook"). Like webook.com:
   the court / program / ladies-hours page is information plus a Book button; booking is a focused flow of steps with
   "Step x of N", a back arrow and a progress bar, then confirmation.

     Court, Ladies hours   1 Date & times → 2 Booking for → 3 Review → 4 Checkout
     Open game             1 Who's playing → 2 Review → 3 Checkout
     Program               1 Plan & time → 2 Add-ons (not for a free trial) → 3 Participants → 4 Review → 5 Checkout

   Step 1 is the booking part of the page itself, shown on its own (flow mode: ?book=1, or the old #book / #pkg links);
   the rest are steps of checkout.html. This file: the steps, the header, flow mode and the Book buttons. Load it right
   before f/site-nav.js (it sets the focused header). f/flow.css. */
(() => {
  const W = window, P = () => W.SFA_PREFS, t = (k, v) => (P() ? P().t(k, v) : k.replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m));
  const LABEL = { when: 'Date & times', plan: 'Plan & time', upgrade: 'Add-ons', who: 'Booking for', players: "Who's playing", people: 'Participants', review: 'Review your booking', pay: 'Checkout' };
  function steps(kind, o = {}){
    if (kind === 'game') return ['players', 'review', 'pay'];
    if (kind === 'program') return o.trial ? ['plan', 'people', 'review', 'pay'] : ['plan', 'upgrade', 'people', 'review', 'pay'];
    return ['when', 'who', 'review', 'pay'];   // court and ladies hours
  }
  const ARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>';
  // the header: back, "Step 2 of 4", the step's title, and one bar segment per step
  function header({ kind, step, trial, back, backLabel }){
    const L = steps(kind, { trial }), i = Math.max(0, L.indexOf(step));
    return `<div class="fl-h" data-fl-kind="${kind}" data-fl-step="${step}">
      <a class="fl-back" href="${back || '#'}" ${back ? '' : 'data-fl-prev'} aria-label="${t(backLabel || 'Back')}">${ARR}</a>
      <div class="fl-t"><small>${t('Step {i} of {n}', { i: i + 1, n: L.length })}</small><h1>${t(LABEL[step])}</h1></div>
      <ol class="fl-bar" aria-hidden="true">${L.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}"></li>`).join('')}</ol></div>`;
  }
  // flow mode on a detail page: ?book=1, or the old #book / #pkg links (checkout's "Edit booking" goes there too)
  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  const DETAIL = { 'court-details': 'court', program: 'program', 'ladies-hours': 'ladies' };
  const kindHere = DETAIL[page];
  const q = new URLSearchParams(location.search);
  const on = !!kindHere && (q.get('book') === '1' || /^#(book|pkg)$/.test(location.hash));
  const flowUrl = () => { const u = new URL(location.href); u.searchParams.set('book', '1'); u.hash = ''; return u.pathname.split('/').pop() + u.search; };
  const infoUrl = () => { const u = new URL(location.href); u.searchParams.delete('book'); u.hash = ''; return u.pathname.split('/').pop() + u.search; };
  W.SFA_FLOW = { steps, header, label: s => t(LABEL[s]), on, kind: kindHere, flowUrl, infoUrl };
  if (!kindHere) return;
  document.documentElement.classList.add(on ? 'fl-on' : 'fl-off');
  if (on){
    if (/^#(book|pkg)$/.test(location.hash)) history.replaceState(null, '', flowUrl());
    // the focused site header (logo, language, account; back to the page's information)
    const nav = document.querySelector('[data-site-nav]');
    if (nav){ nav.setAttribute('data-focused', ''); nav.setAttribute('data-back', infoUrl()); nav.setAttribute('data-back-label', 'Details'); }
    // the header goes at the top of the page's content column (under the fixed site bar); Ladies hours redraws its page
    // from script, so it is put back whenever it goes missing
    let first = true;
    const put = () => {
      const host = document.querySelector('.kl > .inner') || document.querySelector('main#page') || document.querySelector('main'); if (!host || host.querySelector(':scope > .fl-top')) return;
      const box = document.createElement('div'); box.className = 'fl-top';
      box.innerHTML = header({ kind: kindHere === 'ladies' ? 'court' : kindHere, step: kindHere === 'program' ? 'plan' : 'when', back: infoUrl(), backLabel: 'Back to details' });
      host.prepend(box); if (first){ first = false; scrollTo(0, 0); }
    };
    put(); new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
    addEventListener('sfa:prefs', () => { document.querySelector('.fl-top')?.remove(); put(); });
  } else {
    // on the page itself, every Book button opens the flow (capture phase, before the page's own handlers)
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-book], #goBtn, #bookBtn, a[href="#book"], a[href="#pkg"], .fl-cta'); if (!b) return;
      e.preventDefault(); e.stopImmediatePropagation(); location.href = flowUrl();
    }, true);
    // Ladies hours draws its page from script: give its hero a Book button
    if (kindHere === 'ladies'){
      const add = () => { const cap = document.querySelector('.hero .cap'); if (cap && !cap.querySelector('.fl-cta')) cap.insertAdjacentHTML('beforeend', `<a class="btn fl-cta" href="${flowUrl()}"><span>${t('Book a court')}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-7 7 7-7 7"/></svg></a>`); };
      new MutationObserver(add).observe(document.documentElement, { childList: true, subtree: true }); add();
    }
  }
})();
