/* Booking journey stepper: Days & times → Checkout (it starts once a court is chosen).
   Put <nav data-stepper data-step="1"></nav> under the page's top bar; steps before the current one link back,
   using the sport and court from the URL (?sport=&court=) or from the order in sessionStorage.
   window.SFA_STEPPER.render() redraws (after data-step changes, or a language switch). Light theme, square corners. */
(() => {
  const CSS = `
.sfa-steps{background:#fff;border-bottom:1px solid #E4E4E7}
.sfa-steps ol{display:flex;align-items:center;gap:0;max-width:1440px;margin:0 auto;padding:14px clamp(16px,6.67vw,96px);list-style:none}
.sfa-steps li{display:flex;align-items:center;flex:1 1 auto;min-width:0}
.sfa-steps li:last-child{flex:0 0 auto}
.sfa-steps li:not(:last-child)::after{content:"";flex:1 1 auto;min-width:28px;height:2px;margin:0 12px;background:#E4E4E7}
.sfa-steps li.done:not(:last-child)::after{background:#FF5A19}
.sfa-steps .s{display:inline-flex;align-items:center;gap:10px;min-width:0;color:#71717A;text-decoration:none;font:600 15px/1.2 "Tusker Grotesk","Oswald","Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
.sfa-steps .n{flex:none;display:grid;place-items:center;width:28px;height:28px;border:1.5px solid #D4D4D8;background:#fff;color:#71717A;font-size:14px;transition:background-color .2s,border-color .2s,color .2s}
.sfa-steps .n svg{width:15px;height:15px}
.sfa-steps .done .s{color:#09090B}
.sfa-steps .done .n{background:#FF5A19;border-color:#FF5A19;color:#fff}
.sfa-steps a.s:hover .n{background:#E85217;border-color:#E85217}
.sfa-steps a.s:hover .t{text-decoration:underline;text-underline-offset:3px}
.sfa-steps .now .s{color:#09090B}
.sfa-steps .now .n{background:#09090B;border-color:#09090B;color:#fff}
.sfa-steps .t{overflow:hidden;text-overflow:ellipsis}
.sfa-steps .bar{display:none}
@media (max-width:760px){
  .sfa-steps ol{padding-block:12px}
  .sfa-steps li:not(.now) .t{display:none}
  .sfa-steps li:not(:last-child)::after{margin:0 8px}
}
@media (max-width:420px){
  .sfa-steps li:not(:last-child)::after{margin:0 5px}
  .sfa-steps .n{width:26px;height:26px}
}
html[lang=ar] .sfa-steps .s{font-family:"Tajawal",sans-serif;letter-spacing:0}
/* inside a page's top bar: no band of its own, just the steps */
.sfa-steps--bar{background:none;border:0}
.sfa-steps--bar ol{max-width:620px;padding:0}
@media (max-width:1100px){.sfa-steps--bar li:not(.now) .t{display:none}}
@media (max-width:760px){.sfa-steps--bar ol{max-width:none;padding:6px 0}.sfa-steps--bar li:not(.now) .t{display:none}}`;
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const t = (s, p) => window.SFA_PREFS ? window.SFA_PREFS.t(s, p) : s.replace(/\{(\w+)\}/g, (m, k) => (p || {})[k] ?? m);

  function where(){
    const q = new URLSearchParams(location.search);
    let sport = q.get('sport'), court = q.get('court');
    if (!sport){ try { const o = JSON.parse(sessionStorage.getItem('sfaOrder')); if (o){ sport = o.sport; court = o.court; } } catch (e) {} }
    return { sport, court };
  }
  function render(){
    const { sport, court } = where(), enc = encodeURIComponent;
    const steps = [
      ['Days & times', sport && court != null ? `court-details.html?sport=${enc(sport)}&court=${enc(court)}#book` : null],
      ['Checkout', 'checkout.html'],
    ];
    document.querySelectorAll('[data-stepper]').forEach(nav => {
      const now = +nav.dataset.step || 1;
      nav.className = 'sfa-steps' + (nav.closest('header') ? ' sfa-steps--bar' : '');
      nav.setAttribute('aria-label', t('Booking steps'));
      nav.innerHTML = `<ol>${steps.map(([label, href], i) => {
        const n = i + 1, state = n < now ? 'done' : n === now ? 'now' : 'next';
        const inner = `<span class="n">${state === 'done' ? CHECK : n}</span><span class="t">${t(label)}</span>`;
        const link = state === 'done' && href;
        return `<li class="${state}"${n === now ? ' aria-current="step"' : ''}>${link ? `<a class="s" href="${href}">${inner}</a>` : `<span class="s">${inner}</span>`}</li>`;
      }).join('')}</ol>`;
      nav.setAttribute('data-no-i18n', '');
    });
  }
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  window.SFA_STEPPER = { render };
  addEventListener('sfa:prefs', render);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', render) : render();
})();
