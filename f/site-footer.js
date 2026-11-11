/* SFA Domes site footer, shared by the homepage, the courts list and court details: concept 4 "Kinetic sports" from
   footer-options.html (Ahmed's pick, 2026-11-04). Two rows of sport names slide past in opposite directions and speed
   up while you scroll; hovering a sport shows its photo at the pointer; each name opens that sport's courts.
   Put <div data-site-footer></div> where the footer goes and load this script right after it (or anywhere before
   f/prefs.js, which translates its text). The sport names come from f/courts-data.js, read once the page has loaded. */
(() => {
  const slot = document.querySelector('[data-site-footer]'); if (!slot) return;
  const st = document.createElement('style'); st.textContent = "/* SFA site footer: option 4 \"Kinetic sports\" (picked 2026-11-04) */\n.ft{--l2:var(--neutral-800);--mute:var(--neutral-400);--line:rgba(255,255,255,.16);--ft-ink:var(--neutral-950);--ft-gutter:clamp(16px,6.67vw,96px);--ft-ease:cubic-bezier(.22,1,.36,1);background:var(--ft-ink)}\n.ft{position:relative;overflow:hidden;background:var(--ft-ink);color:var(--neutral-0)}\n.ft-in{max-width:1440px;margin:0 auto;padding-inline:var(--ft-gutter)}\n.ft-cols{display:flex;flex-wrap:wrap;gap:24px 56px}\n.ft-cols ul{display:grid;gap:12px;align-content:start;margin:0;padding:0;list-style:none}\n.ft-cols a{font:var(--ts-body-default-bold);text-decoration:none;transition:color .2s;text-transform:var(--type-case-label)}\n.ft-cols a:hover{color:var(--brand)}\n.ft-soc{display:flex;gap:8px}\n.ft-soc a{display:grid;place-items:center;width:48px;height:48px;background:var(--l2);transition:background-color .2s}\n.ft-soc a:hover{background:var(--brand)}\n.ft-soc img{display:block;width:26px;height:26px}\n.ft-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px 32px;padding-block:24px;border-top:1px solid var(--line)}\n.ft-copy{font:var(--ts-body-default);margin:0;color:var(--mute)}\n.ft-stores{display:flex;flex-wrap:wrap;gap:12px}\n.ft-stores a{display:block;transition:opacity .2s}.ft-stores a:hover{opacity:.75}\n.ft-stores img{display:block;height:40px;width:auto}\n.ft-pow{display:flex;align-items:center;gap:10px;text-decoration:none}\n.ft-pow small{font-size:var(--fs-12);font-weight:400;color:var(--mute)}\n.ft-pow span{display:flex;flex-direction:column;align-items:center}\n.ft-pow img:first-child{height:28px;width:auto}.ft-pow img:last-child{height:9px;width:auto;margin-top:2px}\n.ft-partners{display:flex;flex-wrap:wrap;align-items:center;gap:20px 40px}\n.ft-partners img{display:block;height:44px;width:auto;opacity:.75;transition:opacity .2s}\n.ft-partners img:hover{opacity:1}\n.ft-cta{font:var(--ts-body-l-bold);text-transform:var(--type-case-label);display:inline-flex;align-items:center;gap:12px;height:60px;padding:0 28px;background:var(--brand);color:var(--neutral-0);text-decoration:none;transition:background-color .25s}\n.ft-cta:hover{background:var(--brand-600)}\n.ft-cta svg{width:20px;height:20px;transition:transform .35s var(--ft-ease)}\n.ft-cta:hover svg{transform:translateX(4px)}\n.ft-eyebrow{font:var(--ts-body-default-bold);text-transform:var(--type-case-label);margin:0;color:var(--brand)}\n@media (max-width:640px){.ft-cols{gap:24px 32px}.ft-cols ul{min-width:40%}.ft-stores img{height:36px}}\n\n/* ============ 4 \u00b7 Kinetic: two rows of sport names race by (faster as you scroll); hover shows the sport ============ */\n.f4 .ft-in{padding-top:clamp(48px,8vh,88px)}\n.f4-rows{padding-block:clamp(24px,4vh,48px);border-block:1px solid var(--line)}\n.f4-row{display:flex;width:max-content;will-change:transform}\n.f4-row a{display:flex;align-items:center;gap:.25em;padding-inline:.25em;font-family:var(--type-font);font-weight:var(--type-w-title);font-size:clamp(var(--fs-40),4.6vw,var(--fs-40));line-height:1.05;text-transform:var(--type-case-title);text-decoration:none;white-space:nowrap;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.55);transition:color .25s,-webkit-text-stroke-color .25s}\n.f4-row:nth-child(2) a{color:var(--neutral-0);-webkit-text-stroke-color:transparent}\n.f4-row a::after{content:\"\";width:.22em;height:.22em;background:var(--brand);flex:none}\n.f4-row a:hover{color:var(--brand);-webkit-text-stroke-color:var(--brand)}\n.f4-peek{position:absolute;z-index:3;left:0;top:0;width:clamp(180px,20vw,300px);aspect-ratio:4/5;pointer-events:none;overflow:hidden;opacity:0;transform:translate(-50%,-50%) scale(.85);transition:opacity .25s,transform .35s var(--ft-ease)}\n.f4-peek.on{opacity:1;transform:translate(-50%,-50%) scale(1)}\n.f4-peek img{display:block;width:100%;height:100%;object-fit:cover}\n.f4-peek b{font:var(--ts-body-default-bold);text-transform:var(--type-case-label);position:absolute;left:10px;bottom:10px;padding:4px 8px;background:var(--brand)}\n.f4-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,2fr);gap:40px;padding-block:clamp(40px,7vh,64px)}\n.f4-grid h3{font:var(--ts-title-screen);margin:8px 0 20px;text-transform:var(--type-case-title)}\n@media (max-width:900px){.f4-grid{grid-template-columns:minmax(0,1fr)}}\n@media (hover:none){.f4-peek{display:none}}\n\n.f4-rows{direction:ltr;overflow:hidden}\n/* pages with a fixed booking bar keep the footer's last row clear of it */\nbody[data-go-always] .ft-bar{padding-bottom:calc(24px + 96px)}\n@media (min-width:1024px){body[data-go-always]:not(.has-picks) .ft-bar{padding-bottom:24px}}\nbody.has-picks .ft-bar{padding-bottom:calc(24px + 96px)}\n@media (prefers-reduced-motion:reduce){.f4-row{transform:none!important}}\n"; document.head.appendChild(st);
  slot.outerHTML = "<footer class=\"ft f4\" id=\"footer\">\n  <div class=\"f4-rows\" id=\"f4Rows\"><div class=\"f4-row\"></div><div class=\"f4-row\"></div></div>\n  <figure class=\"f4-peek\" id=\"f4Peek\" aria-hidden=\"true\"><img alt=\"\"><b></b></figure>\n  <div class=\"ft-in\">\n    <div class=\"f4-grid\">\n      <div><p class=\"ft-eyebrow\">SFA Domes Dammam</p><h3>Sport for everyone, under one dome.</h3><div class=\"ft-soc\"><a href=\"#\" aria-label=\"Instagram\"><img src=\"f/footer/soc-instagram.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"Facebook\"><img src=\"f/footer/soc-facebook.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"YouTube\"><img src=\"f/footer/soc-youtube.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"LinkedIn\"><img src=\"f/footer/soc-linkedin.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"X\"><img src=\"f/footer/soc-x.svg\" alt=\"\"></a></div></div>\n      <div style=\"display:grid;gap:32px\">\n        <nav class=\"ft-cols\" aria-label=\"Footer\"><ul><li><a href=\"index.html\">Home</a></li><li><a href=\"#\">About</a></li><li><a href=\"#\">Corporate Events</a></li><li><a href=\"#\">Contact us</a></li></ul><ul><li><a href=\"#\">News</a></li><li><a href=\"#\">Calendar</a></li><li><a href=\"#\">Community Sports Groups</a></li><li><a href=\"#\">Vendar gate</a></li></ul><ul><li><a href=\"#\">Brand Guidelines</a></li><li><a href=\"#\">Annual Report (2020)</a></li><li><a href=\"#\">Privacy Policy &amp; Terms &amp; Conditions</a></li></ul></nav>\n        <div class=\"ft-partners\" aria-label=\"Partners\"><img src=\"f/footer/logo-sfa-domes.svg\" alt=\"SFA Domes\"><img src=\"f/footer/logo-sfa.svg\" alt=\"Saudi Sports for All Federation\"><img src=\"f/footer/logo-vision2030.svg\" alt=\"Saudi Vision 2030\"><img src=\"f/footer/logo-mos.svg\" alt=\"Ministry of Sport\"></div>\n      </div>\n    </div>\n    <div class=\"ft-bar\"><p class=\"ft-copy\">\u00a9 2026 sportsforall.com</p><div class=\"ft-stores\"><a href=\"#\" aria-label=\"Download on the App Store\"><img src=\"f/footer/store-apple.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"Get it on Google Play\"><img src=\"f/footer/store-google.svg\" alt=\"\"></a><a href=\"#\" aria-label=\"Explore it on AppGallery\"><img src=\"f/footer/store-huawei.svg\" alt=\"\"></a></div><a class=\"ft-pow\" href=\"https://webook.com\" target=\"_blank\" rel=\"noopener\" aria-label=\"Powered by webook.com\"><small>Powered by</small><span><img src=\"f/footer/wbk-logo.svg\" alt=\"\"><img src=\"f/footer/wbk-sub.svg\" alt=\"\"></span></a></div>\n  </div>\n</footer>";
  const f = document.getElementById('footer'), rows = [...f.querySelectorAll('.f4-row')], peek = document.getElementById('f4Peek');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const build = () => {
    const S = window.SFA_SPORTS; if (!S) return;
    const list = Object.entries(S).map(([k, s]) => `<a href="courts.html?sport=${k}" data-k="${k}">${s.name}</a>`).join('');
    rows.forEach(r => { r.innerHTML = list + list + list; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  // the rows drift on their own and run faster for a moment after each scroll
  const pos = rows.map(() => 0); let boost = 0, lastY = scrollY, run = false, lastT = 0;
  addEventListener('scroll', () => { boost = Math.min(14, boost + Math.abs(scrollY - lastY) * .06); lastY = scrollY; }, { passive: true });
  const tick = t => {
    if (!run) return; const dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
    boost *= Math.pow(.04, dt);
    rows.forEach((r, i) => { const third = r.scrollWidth / 3; if (!third) return; const v = (60 + boost * 60) * (i ? 1 : -1); pos[i] = ((pos[i] + v * dt) % third + third) % third; r.style.transform = `translateX(${-pos[i]}px)`; });
    requestAnimationFrame(tick);
  };
  if (!reduce) new IntersectionObserver(es => { run = es[0].isIntersecting; if (run){ lastT = performance.now(); requestAnimationFrame(tick); } }).observe(f);
  // the hovered sport's photo follows the pointer
  let tx = 0, ty = 0, cx = 0, cy = 0, follow = false;
  const glide = () => { cx += (tx - cx) * .18; cy += (ty - cy) * .18; peek.style.left = cx + 'px'; peek.style.top = cy + 'px'; if (follow) requestAnimationFrame(glide); };
  const box = document.getElementById('f4Rows');
  box.addEventListener('pointermove', e => {
    const r = f.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
    const a = e.target.closest('a[data-k]');
    if (a){
      if (peek.dataset.k !== a.dataset.k){ peek.dataset.k = a.dataset.k; peek.querySelector('img').src = `f/courts/${a.dataset.k}.jpg`; peek.querySelector('b').textContent = a.textContent; }
      if (!follow){ cx = tx; cy = ty; follow = true; glide(); } peek.classList.add('on');
    } else peek.classList.remove('on');
  });
  box.addEventListener('pointerleave', () => { peek.classList.remove('on'); follow = false; });

  // a page's sticky bottom bar (#go on court details and training programs) rides up with the footer, so it stops
  // right above it instead of covering it. Only while the bar is showing: hidden, it stays tucked below the screen.
  const go = document.getElementById('go');
  if (go){
    let raf = 0;
    const lift = () => {
      raf = 0;
      const hidden = new DOMMatrix(getComputedStyle(go).transform).m42 > 1, over = innerHeight - f.getBoundingClientRect().top;
      go.style.translate = !hidden && over > 0 ? `0 ${-Math.round(over)}px` : '';
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(lift); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
    go.addEventListener('transitionend', ask);
    new MutationObserver(ask).observe(go, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(ask).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    ask();
  }
})();
