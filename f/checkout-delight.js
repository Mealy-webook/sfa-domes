/* Checkout "delight" review options (checkout-options.html): checkout.html?cx=a|b|c|d adds one direction on top of the
   real checkout, so booking, checks and payment stay the live code. Without ?cx= this file does nothing.
     a · Ticket in the making  the summary card becomes a ticket that fills in as you choose (who's playing updates live),
                               with a tear line and a QR that "unlocks" after payment
     b · Reassurance           progress across the whole booking, then what's included and what happens next
     c · Motion                ticks draw in, cards lift, the total counts, a mistake nudges, Pay fills as it opens payment
     d · Friendly + pay bar    warmer words ("Who's playing?"), and on phones a bar with the total and Pay that never scrolls away
   DS tokens only, square corners; every animation stops under prefers-reduced-motion. */
(() => {
  const cx = new URLSearchParams(location.search).get('cx'); if (!/^[abcd]$/.test(cx || '')) return;
  const P = window.SFA_PREFS, t = (s, p) => P.t(s, p), $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  document.body.classList.add('cx', 'cx-' + cx);
  const prog = (() => { try { return (JSON.parse(sessionStorage.getItem('sfaOrder') || '{}').kind === 'program'); } catch (e) { return false; } })();
  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3"/></svg>',
    card: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 10h18M7 15h4"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/></svg>',
    car: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14v-4l-2-5H7l-2 5zM5 16v2M19 16v2M5 12h14"/></svg>',
    shower: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V8a4 4 0 0 1 8 0M10 11h6M11 15v1M14 15v1M17 15v1M12 18v1M15 18v1"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
  };

  const css = document.createElement('style');
  css.textContent = `
.cx svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square}
.cx .cx-head{grid-area:head;min-width:0}
.cx-d .cx-head .ck-h{margin-bottom:8px}
.cx-tag{position:fixed;inset-inline-start:16px;bottom:16px;z-index:60;padding:8px 12px;background:var(--color-bg-inverse);color:var(--color-content-inverse);font:var(--ts-caption-1-bold);text-decoration:none}
@keyframes cx-flash{from{background:var(--color-bg-accent-subtle)}to{background:transparent}}
@keyframes cx-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes cx-shake{0%,100%{translate:0}20%{translate:-6px}40%{translate:5px}60%{translate:-3px}80%{translate:2px}}
@keyframes cx-in{from{opacity:0;translate:0 12px}to{opacity:1;translate:0 0}}
@keyframes cx-fill{from{scale:0 1}to{scale:1 1}}
@keyframes cx-shine{from{translate:-120% 0}to{translate:220% 0}}

/* a · the summary card as a ticket */
.cx-a .pay .ck-card{position:relative;overflow:visible}
.cx-a .cx-cut{position:relative;height:0;margin:0 20px;border-top:2px dashed var(--color-border-secondary)}
.cx-a .cx-cut::before,.cx-a .cx-cut::after{content:"";position:absolute;top:-13px;width:24px;height:24px;border-radius:50%;background:var(--color-bg-secondary);border:1px solid var(--color-border-primary)}
.cx-a .cx-cut::before{inset-inline-start:-33px;clip-path:inset(0 0 0 12px)}
.cx-a .cx-cut::after{inset-inline-end:-33px;clip-path:inset(0 12px 0 0)}
[dir=rtl] .cx-a .cx-cut::before{clip-path:inset(0 12px 0 0)}
[dir=rtl] .cx-a .cx-cut::after{clip-path:inset(0 0 0 12px)}
.cx-a .cx-who{display:grid;gap:4px;padding:16px 24px}
.cx-a .cx-who small,.cx-a .cx-stub small{font:var(--ts-caption-1-bold);color:var(--color-content-tertiary)}
.cx-a .cx-who b{font:var(--ts-title-body);text-transform:var(--type-case-title)}
.cx-a .cx-who b.ph{color:var(--color-content-disabled)}
.cx-a .cx-who.flash{animation:cx-flash 1s var(--ease,ease)}
.cx-a .cx-stub{display:grid;grid-template-columns:72px minmax(0,1fr);gap:16px;align-items:center;padding:20px 24px}
.cx-a .cx-qr{position:relative;width:72px;height:72px;background:repeating-conic-gradient(var(--color-content-primary) 0 25%,transparent 0 50%) 0 0/12px 12px;filter:blur(2.5px);opacity:.35}
.cx-a .cx-lock{position:absolute;inset:0;width:72px;height:72px;display:grid;place-items:center;color:var(--color-content-primary)}
.cx-a .cx-lock svg{width:24px;height:24px;stroke-width:2.4}
.cx-a .cx-stub b{display:block;font:var(--ts-body-l-bold)}
.cx-a .cx-qrw{position:relative;width:72px;height:72px}

/* b · progress, what's included, what's next */
.cx-b .cx-steps{list-style:none;display:flex;flex-wrap:wrap;gap:8px 24px;margin:0 0 24px;padding:0;font:var(--ts-body-default-bold);color:var(--color-content-tertiary)}
.cx-b .cx-steps li{display:flex;align-items:center;gap:8px}
.cx-b .cx-steps i{display:grid;place-items:center;width:24px;height:24px;border:1.5px solid var(--color-border-secondary);font:var(--ts-caption-1-bold);font-style:normal}
.cx-b .cx-steps .done{color:var(--color-content-primary)}
.cx-b .cx-steps .done i{background:var(--color-content-primary);border-color:var(--color-content-primary);color:var(--neutral-0)}
.cx-b .cx-steps .done svg{width:14px;height:14px;stroke-width:3;stroke-dasharray:24;animation:cx-draw .5s ease both}
.cx-b .cx-steps .now{color:var(--color-content-primary)}
.cx-b .cx-steps .now i{border-color:var(--color-brand);color:var(--color-brand)}
.cx-b .cx-incl{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:24px 0 0;padding:0}
.cx-b .cx-incl li{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-bg-primary);border:1px solid var(--color-border-primary);font:var(--ts-body-s)}
.cx-b .cx-incl svg{flex:none;width:22px;height:22px;color:var(--color-brand)}
.cx-b .cx-next{padding:20px 24px;border-top:1px solid var(--color-border-primary)}
.cx-b .cx-next p{margin:0 0 12px;font:var(--ts-caption-1-bold);color:var(--color-content-tertiary)}
.cx-b .cx-next ol{list-style:none;margin:0;padding:0;display:grid;gap:12px;counter-reset:n}
.cx-b .cx-next li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:12px;align-items:center;font:var(--ts-body-s);counter-increment:n}
.cx-b .cx-next li::before{content:counter(n);display:grid;place-items:center;width:24px;height:24px;background:var(--color-bg-secondary);font:var(--ts-caption-1-bold)}

/* c · motion */
.cx-c .who-opt,.cx-c .pp,.cx-c .ck-card,.cx-c .kd-btn{transition:translate .25s var(--ease,ease),box-shadow .25s var(--ease,ease),border-color .2s}
.cx-c .who-opt:hover:not(:disabled):not(.off),.cx-c .pp:hover:not(:disabled){translate:0 -2px;box-shadow:0 8px 20px rgba(9,9,11,.08)}
.cx-c .who-opt:has(input:checked) .who-mark svg,.cx-c .who-opt[aria-checked=true] .who-mark svg,.cx-c .pp[aria-checked=true] .pp-box svg,.cx-c .terms:has(input:checked) .box svg{stroke-dasharray:24;animation:cx-draw .35s ease both}
.cx-c .terms.bad,.cx-c .kids.bad,.cx-c #ppCard.bad,.cx-c .field.bad,.cx-c .kit.bad{animation:cx-shake .4s ease}
.cx-c .guest.on > div > *,.cx-c .kid-pane > *{animation:cx-in .35s ease both}
.cx-c #payBtn{position:relative;overflow:hidden;isolation:isolate}
.cx-c #payBtn::before{content:"";position:absolute;inset:0 auto 0 0;width:40%;z-index:-1;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);translate:-120% 0}
.cx-c #payBtn:hover::before{animation:cx-shine .9s ease}
.cx-c #payBtn:disabled::after{content:"";position:absolute;inset:auto 0 0;height:4px;background:var(--neutral-0);transform-origin:0 50%;animation:cx-fill 2.4s ease-out both}
.cx-c #payBtn svg{transition:translate .25s}
.cx-c #payBtn:hover svg{translate:4px 0}
[dir=rtl] .cx-c #payBtn:hover svg{translate:-4px 0}
.cx-c #total.cx-bump{animation:cx-flash .8s ease}

/* d · friendly words + a pay bar on phones */
.cx-d .cx-lead{margin:0 0 clamp(20px,3vh,28px);font:var(--ts-body-l);color:var(--color-content-secondary)}
.cx-d .cx-bar{display:none}
@media (max-width:960px){
  .cx-d .cx-bar{position:fixed;inset:auto 0 0;z-index:50;display:flex;align-items:center;gap:16px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:var(--color-bg-primary);border-top:1px solid var(--color-border-primary);box-shadow:0 -8px 24px rgba(9,9,11,.08)}
  .cx-d .cx-bar .t{flex:1;min-width:0;display:grid;gap:2px}
  .cx-d .cx-bar small{font:var(--ts-caption-1-bold);color:var(--color-content-tertiary)}
  .cx-d .cx-bar b{font:var(--ts-title-body)}
  .cx-d .cx-bar button{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 24px;border:0;background:var(--color-brand);color:var(--neutral-0);font:var(--ts-body-l-bold);cursor:pointer}
  .cx-d .cx-bar button:disabled{opacity:.6}
  .cx-d .cx-bar svg{width:20px;height:20px}
  [dir=rtl] .cx-d .cx-bar svg{scale:-1 1}
  .cx-d main{padding-bottom:96px}
  .cx-d .cx-tag{bottom:96px}
}
@media (prefers-reduced-motion:reduce){.cx *,.cx *::before,.cx *::after{animation:none!important;transition:none!important}}`;
  document.head.appendChild(css);
  const NAMES = { a: 'Ticket in the making', b: 'Reassurance', c: 'Motion', d: 'Friendly + pay bar' };
  document.body.insertAdjacentHTML('beforeend', `<a class="cx-tag" href="checkout-options.html">Option ${cx.toUpperCase()} · ${NAMES[cx]}</a>`);

  // who's playing, for the ticket (a): me, a child (the dropdown or the form's name), someone else, or the ticked participants
  let me = null; window.SFA_AUTH?.me().then(u => { me = u; refresh(); });
  function whoNow(){
    if (prog) { const n = [...document.querySelectorAll('#ppBody .pp[aria-checked=true] strong')].map(x => x.textContent.replace(/\s*\(.*\)$/, '')); return n.length ? n.join(', ') : ''; }
    const w = document.querySelector('input[name="who"]:checked')?.value;
    if (w === 'me') return me ? me.name : t('You');
    if (w === 'other') return ($('gName')?.value || '').trim();
    if (w === 'child'){ const b = $('kidDdB'); const s = b && b.querySelector('strong'); if (s) return s.textContent; const f = [$('ckfirst')?.value, $('cklast')?.value].filter(Boolean).join(' ').trim(); return f; }
    return '';
  }
  let last = null;
  function refresh(){
    if (cx === 'a'){
      const el = $('cxWho'); if (!el) return; const w = whoNow();
      if (w !== last){ el.textContent = w || t(prog ? 'Tick who is taking part' : 'Choose who is playing'); el.classList.toggle('ph', !w);
        if (last !== null){ const box = el.parentElement; box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); } last = w; }
    }
    // only write when something changed: the page-wide observer below would otherwise call this again forever
    if (cx === 'd'){ const b = $('cxBarT'), pb = $('payBtn'), go = $('cxBarGo'); if (b && $('total') && b.innerHTML !== $('total').innerHTML) b.innerHTML = $('total').innerHTML; if (go && pb && go.disabled !== pb.disabled) go.disabled = pb.disabled; }
  }

  function build(){
    const card = document.querySelector('.pay .ck-card'), main = document.querySelector('.ck-main'), h1 = document.querySelector('.ck-h');
    if (!card || !main) return setTimeout(build, 100);
    // the title sits in the page grid's "head" area; a wrapper there carries whatever a layer adds above or under it
    const head = document.createElement('div'); head.className = 'cx-head'; h1.before(head); head.append(h1);
    if (cx === 'a'){
      const days = $('days');
      days.insertAdjacentHTML('afterend', `<div class="cx-who"><small>${t(prog ? 'Taking part' : 'Playing')}</small><b id="cxWho" class="ph" aria-live="polite"></b></div><div class="cx-cut" aria-hidden="true"></div>
        <div class="cx-stub"><div class="cx-qrw"><div class="cx-qr" aria-hidden="true"></div><span class="cx-lock" aria-hidden="true">${ICON.lock}</span></div><div><b>${t('Your QR code')}</b><small>${t('Unlocks the moment you pay. Show it at reception.')}</small></div></div>`);
    }
    if (cx === 'b'){
      const steps = prog ? [['Program', 1], ['Plan and start day', 1], ['Participants and payment', 0], ['Tickets', -1]] : [['Court', 1], ['Days and times', 1], ['Who and payment', 0], ['Tickets', -1]];
      h1.insertAdjacentHTML('beforebegin', `<ol class="cx-steps" aria-label="${t('Booking steps')}">${steps.map(([n, s], i) => `<li class="${s > 0 ? 'done' : s === 0 ? 'now' : ''}"${s === 0 ? ' aria-current="step"' : ''}><i>${s > 0 ? ICON.check : i + 1}</i>${t(n)}</li>`).join('')}</ol>`);
      document.querySelector('.confirm').insertAdjacentHTML('beforeend', `<ul class="cx-incl">
        <li>${ICON.lock}${t('Secure payment by PayTabs')}</li><li>${ICON.ticket}${t('Tickets in My tickets straight away')}</li>
        <li>${ICON.car}${t('250 parking spots at the domes')}</li><li>${ICON.shower}${t('Changing rooms and showers')}</li></ul>`);
      card.insertAdjacentHTML('beforeend', `<div class="cx-next"><p>${t('What happens next')}</p><ol><li>${t('Pay securely with PayTabs')}</li><li>${t('Your QR tickets arrive in My tickets')}</li><li>${t('Show them at reception and play')}</li></ol></div>`);
    }
    if (cx === 'c'){
      // the total counts to its new value
      const tot = $('total'); let prev = null;
      new MutationObserver(() => { const txt = tot.textContent, n = +txt.replace(/[^\d.]/g, ''); if (prev !== null && n && n !== prev && !tot.dataset.counting){
        const from = prev, t0 = performance.now(), html = tot.innerHTML; tot.dataset.counting = '1'; tot.classList.add('cx-bump');
        const step = now => { const k = Math.min(1, (now - t0) / 500), v = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)));
          tot.innerHTML = html.replace(/[\d,]+(\.\d+)?(?!.*\d)/, v.toLocaleString('en-US')); if (k < 1) requestAnimationFrame(step); else { tot.innerHTML = html; delete tot.dataset.counting; setTimeout(() => tot.classList.remove('cx-bump'), 800); } };
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(step); else delete tot.dataset.counting; }
        if (!tot.dataset.counting) prev = n || prev; }).observe(tot, { childList: true, subtree: true, characterData: true });
    }
    if (cx === 'd'){
      h1.textContent = t('Almost there'); h1.insertAdjacentHTML('afterend', `<p class="cx-lead">${t(prog ? 'Tick who is taking part, agree to the terms, and pay. It takes a minute.' : 'Tell us who is playing, agree to the terms, and pay. It takes a minute.')}</p>`);
      const wt = $('whoTitle'); if (wt) wt.textContent = t("Who's playing?");
      const pt = $('ppTitle'); if (pt) pt.textContent = t("Who's taking part?");
      document.body.insertAdjacentHTML('beforeend', `<div class="cx-bar" role="region" aria-label="${t('Pay')}"><span class="t"><small>${t('Total')}</small><b id="cxBarT"></b></span><button type="button" id="cxBarGo">${t('Pay')}${ICON.arrow}</button></div>`);
      $('cxBarGo').addEventListener('click', () => $('payBtn').click());
    }
    refresh();
  }
  ['click', 'input', 'change', 'kd:pick'].forEach(ev => document.addEventListener(ev, () => setTimeout(refresh, 30), true));
  new MutationObserver(() => refresh()).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'disabled'] });
  addEventListener('sfa:prefs', () => setTimeout(() => location.reload(), 0));   // the review layers are simplest rebuilt in the new language
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', build) : build();
})();
