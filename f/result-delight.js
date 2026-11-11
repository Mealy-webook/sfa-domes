/* Confirmation "delight" review options (result-options.html): result.html?cx=a|b|c|d adds one layer on top of the live
   confirmation once a booking shows as paid. Without ?cx= this file does nothing.
     a · Celebrate        a burst of square confetti from the check mark, the mark pulses, the headline rises in
     b · Ticket reveal    tickets print in one by one, each QR scans in, and a PAID stamp lands on the first stub
     c · Countdown + share  a live countdown to the first session, and "Share with your team" (share sheet or copy)
     d · Personal         the headline greets by name ("Yousef is all set"), at-a-glance chips, and what to bring for that sport
   DS tokens only, square corners (confetti too); every animation stops under prefers-reduced-motion. */
(() => {
  const cx = new URLSearchParams(location.search).get('cx'); if (!/^[abcd]$/.test(cx || '')) return;
  const P = window.SFA_PREFS, t = (s, p) => P.t(s, p), T = window.SFA_TICKETS, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('rx', 'rx-' + cx);
  const NAMES = { a: 'Celebrate', b: 'Ticket reveal', c: 'Countdown + share', d: 'Personal' };
  const css = document.createElement('style');
  css.textContent = `
.rx svg.rx-i{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square}
.rx-tag{position:fixed;inset-inline-start:16px;bottom:16px;z-index:60;padding:8px 12px;background:var(--color-bg-inverse);color:var(--color-content-inverse);font:var(--ts-caption-1-bold);text-decoration:none}
/* a */
.rx-conf{position:fixed;inset:0;z-index:70;pointer-events:none;overflow:hidden}
.rx-conf i{position:absolute;width:10px;height:10px;will-change:transform,opacity}
@keyframes rx-pulse{0%{box-shadow:0 0 0 0 rgba(255,85,0,.45)}100%{box-shadow:0 0 0 28px rgba(255,85,0,0)}}
@keyframes rx-rise{from{opacity:0;translate:0 24px;letter-spacing:.08em}to{opacity:1;translate:0 0;letter-spacing:normal}}
.rx-a .mark{animation:rx-pulse 1.2s ease-out .4s 2}
.rx-a.rx-go h1{animation:rx-rise .8s cubic-bezier(.22,1,.36,1) both}
/* b */
@keyframes rx-print{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes rx-scan{0%{top:0;opacity:1}90%{top:100%;opacity:1}100%{top:100%;opacity:0}}
@keyframes rx-qr{from{opacity:0}to{opacity:1}}
@keyframes rx-stamp{0%{opacity:0;scale:2.2}60%{opacity:1;scale:.92}100%{opacity:1;scale:1}}
.rx-b .cf-tickets .tk{animation:rx-print .7s cubic-bezier(.22,1,.36,1) both!important;animation-delay:calc(.25s + var(--i,0) * .35s)!important}
.rx-b .tk-qr{position:relative;overflow:hidden}
.rx-b .tk-qr svg{animation:rx-qr .3s ease both;animation-delay:calc(1s + var(--i,0) * .35s)}
.rx-b .tk-qr::after{content:"";position:absolute;inset-inline:0;top:0;height:3px;background:var(--color-brand);opacity:0;animation:rx-scan .7s linear both;animation-delay:calc(.35s + var(--i,0) * .35s)}
.rx-b .rx-stamp{position:absolute;top:16px;inset-inline-end:16px;z-index:2;padding:6px 12px;border:3px solid var(--color-brand);color:var(--color-brand);font:var(--ts-title-body);letter-spacing:.08em;rotate:-10deg;background:color-mix(in srgb,var(--color-bg-primary) 85%,transparent);animation:rx-stamp .45s cubic-bezier(.2,1.4,.4,1) 1.6s both}
/* c */
.rx-cd{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px 24px;margin:0 0 clamp(24px,4vh,40px);padding:20px 24px;background:var(--color-bg-inverse);color:var(--color-content-inverse);animation:up .7s cubic-bezier(.22,1,.36,1) .15s both}
.rx-cd small{display:block;font:var(--ts-caption-1-bold);opacity:.7}
.rx-cd .n{display:flex;gap:16px;margin-top:8px}
.rx-cd .n span{display:grid;justify-items:center;min-width:56px}
.rx-cd .n b{font:var(--ts-display-m);font-variant-numeric:tabular-nums;line-height:1}
.rx-cd .n em{font:var(--ts-caption-1-bold);font-style:normal;opacity:.7;margin-top:4px}
.rx-cd .w{margin-top:8px;font:var(--ts-body-default-bold)}
.rx-share{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 20px;border:0;background:var(--color-brand);color:var(--neutral-0);font:var(--ts-body-l-bold);cursor:pointer}
.rx-share:hover{background:var(--color-bg-accent-hover)}
.rx-toast{position:fixed;bottom:72px;left:50%;translate:-50% 0;z-index:80;padding:12px 16px;background:var(--color-bg-inverse);color:var(--color-content-inverse);font:var(--ts-body-default-bold)}
@media (max-width:640px){.rx-cd{grid-template-columns:minmax(0,1fr)}.rx-share{width:100%;justify-content:center}.rx-cd .n{gap:8px}.rx-cd .n span{min-width:48px}}
/* d */
.rx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:-16px 0 clamp(24px,4vh,40px);animation:up .7s cubic-bezier(.22,1,.36,1) .2s both}
.rx-chips > span{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 12px;background:var(--color-bg-primary);border:1px solid var(--color-border-primary);font:var(--ts-body-default-bold)}
.rx-chips .msi{font-size:var(--fs-20);color:var(--color-brand)}
.rx-chips .mi{display:inline-block;width:20px;height:20px;background:var(--color-brand);-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat}
.rx-bring{margin:0}
.rx-bring ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.rx-bring li{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:var(--color-bg-secondary);font:var(--ts-body-s)}
.rx-bring li::before{content:"";width:8px;height:8px;background:var(--color-brand)}
@media (max-width:560px){.rx-chips{margin-top:-8px}}
@media (max-width:760px){.rx-b .rx-stamp{top:12px;inset-inline-end:32px;font:var(--ts-body-l-bold)}}   /* the tilted stamp stays inside a phone-width ticket */
@media (prefers-reduced-motion:reduce){.rx *,.rx *::before,.rx *::after{animation:none!important}}`;
  document.head.appendChild(css);
  document.body.insertAdjacentHTML('beforeend', `<a class="rx-tag" href="result-options.html">Delight ${cx.toUpperCase()} · ${NAMES[cx]}</a>`);

  const cart = new URLSearchParams(location.search).get('cart');
  let done = false;
  const ready = () => { const cf = $('cf'); if (!done && cf && cf.classList.contains('paid') && document.querySelector('#body .box')){ done = true; go(); } };
  new MutationObserver(ready).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  addEventListener('sfa:prefs', () => { done = false; setTimeout(ready, 50); });

  async function go(){
    let b; try { b = await (await fetch('/api/booking?cart=' + encodeURIComponent(cart))).json(); } catch (e) { return; }
    const list = T.sessions(b), s0 = list[0], D = T.describe(s0, b), prog = b.order.kind === 'program', bf = b.order.bookingFor || { type: 'me' };
    const sportKey = prog ? window.SFA_PROGRAMS[b.order.program].sport : b.order.sport;
    const head = document.querySelector('.cf-head');
    if (cx === 'a') celebrate();
    if (cx === 'b'){
      // the stamp sits on the first ticket's details, never over its QR
      const first = document.querySelector('.cf-tickets .tk .tk-main'); if (first){ first.style.position = 'relative'; first.insertAdjacentHTML('beforeend', `<span class="rx-stamp" aria-hidden="true">${t(b.free ? 'Booked' : 'Paid')}</span>`); }
      document.querySelectorAll('.cf-tickets .tk').forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 3)); el.querySelector('.tk-qr')?.style.setProperty('--i', Math.min(i, 3)); });
    }
    if (cx === 'c'){
      const [y, m, d] = s0.date.split('-').map(Number), at = new Date(y, m - 1, d, 0, s0.start);
      const what = `${t(D.sp.name)} · ${D.title}`, when = `${P.date(T.toDate(s0.date), 'full')} · ${P.time(s0.start)}`;
      head.insertAdjacentHTML('afterend', `<section class="rx-cd" aria-labelledby="rxCdT"><div><small id="rxCdT">${t(prog ? 'Your first session starts in' : 'Kick-off in')}</small>
          <div class="n" id="rxN" aria-live="off"></div><p class="w" style="margin:8px 0 0">${esc(what)} · ${esc(when)}</p></div>
        <button type="button" class="rx-share" id="rxShare"><svg class="rx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-5 5 5-5 5 5M5 13v8h14v-8"/></svg>${t('Share with your team')}</button></section>`);
      const tick = () => { const ms = Math.max(0, at - new Date()), dd = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60;
        const n = $('rxN'); if (!n) return; n.innerHTML = [[dd, t('days')], [hh, t('hours')], [mm, t('minutes')], [ss, t('seconds')]].map(([v, l]) => `<span><b>${String(v).padStart(2, '0')}</b><em>${l}</em></span>`).join(''); };
      tick(); setInterval(tick, 1000);
      $('rxShare').addEventListener('click', async () => {
        const text = t('{what} at SFA Domes, {when}. See you there!', { what, when });
        const url = location.origin + (prog ? '/program.html?p=' + encodeURIComponent(b.order.program) : `/court-details.html?sport=${encodeURIComponent(sportKey)}&court=${b.order.court}`);
        try { if (navigator.share){ await navigator.share({ title: 'SFA Domes', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
        try { await navigator.clipboard.writeText(text); toast(t('Copied. Paste it in your team chat.')); } catch (e) { toast(text); }
      });
    }
    if (cx === 'd'){
      const name = prog ? T.people(b).map(x => x.name.split(' ')[0]) : bf.type === 'me' ? null : [String(bf.name).split(' ')[0]];
      const me = await window.SFA_AUTH?.me(), first = me ? String(me.name).split(' ')[0] : '';
      $('title').textContent = name && name.length ? (name.length === 1 ? t('{name} is all set', { name: name[0] }) : t('{names} are all set', { names: name.join(P.lang === 'ar' ? ' و' : ' & ') })) : (first ? t("You're all set, {name}", { name: first }) : t("You're all set"));
      const sp = D.sp, ic = sp.img ? `<span class="mi" style="--m:url(${sp.img})"></span>` : `<span class="msi">${sp.icon}</span>`;
      head.insertAdjacentHTML('afterend', `<div class="rx-chips"><span>${ic}${esc(t(sp.name))}</span><span>${P.date(T.toDate(s0.date), 'full')}</span><span><bdi>${P.time(s0.start)}</bdi></span><span>${esc(D.title)}</span>${list.length > 1 ? `<span>${t('{n} sessions', { n: list.length })}</span>` : ''}</div>`);
      const BRING = { football: ['Turf shoes', 'Shin pads', 'Water bottle', 'Towel'], futsal: ['Indoor court shoes', 'Water bottle', 'Towel'], rugby: ['Turf shoes', 'Mouth guard', 'Water bottle'],
        badminton: ['Your racket', 'Indoor court shoes', 'Water bottle'], tennis: ['Your racket', 'Indoor court shoes', 'Water bottle'], 'table-tennis': ['Your bat', 'Indoor shoes', 'Water bottle'] };
      const items = BRING[sportKey] || ['Indoor court shoes', 'Water bottle', 'Towel'];
      const tips = document.querySelectorAll('#body .box')[1] || document.querySelector('#body .box:last-of-type');
      tips?.insertAdjacentHTML('beforeend', `<div class="rx-bring" style="margin-top:16px"><p style="margin:0 0 8px;font:var(--ts-body-default-bold)">${t('What to bring')}</p><ul>${items.map(x => `<li>${esc(t(x))}</li>`).join('')}</ul></div>`);
    }
  }
  function toast(msg){ const el = document.createElement('div'); el.className = 'rx-toast'; el.setAttribute('role', 'status'); el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2600); }
  // square confetti from the check mark: brand, ink and the programme colours, with gravity and a little spin
  function celebrate(){
    document.body.classList.add('rx-go'); if (calm) return;
    const mark = document.querySelector('.cf-head .mark'), r = mark.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    const cs = getComputedStyle(document.documentElement), cols = ['--color-brand', '--color-content-primary', '--color-programme-women', '--color-programme-youth', '--color-programme-cyan', '--color-warning-content'].map(v => cs.getPropertyValue(v).trim()).filter(Boolean);
    const box = document.createElement('div'); box.className = 'rx-conf'; box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box);
    const parts = Array.from({ length: 90 }, (_, i) => { const el = document.createElement('i'); el.style.background = cols[i % cols.length]; const s = 6 + Math.random() * 8; el.style.width = el.style.height = s + 'px'; box.appendChild(el);
      const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * 9; return { el, x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 7, r: Math.random() * 360, vr: (Math.random() - .5) * 24 }; });
    const t0 = performance.now();
    const step = now => { const k = (now - t0) / 1000;
      parts.forEach(p => { p.vy += .38; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`; p.el.style.opacity = Math.max(0, 1 - Math.max(0, k - 1.4) / .8); });
      if (k < 2.3) requestAnimationFrame(step); else box.remove(); };
    requestAnimationFrame(step);
  }
})();
