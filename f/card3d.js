/* 3D cards (f/card3d.css). Markup:
     <article class="c3d" data-c3d="<id>"><div class="c3d-card">
       <div class="c3d-face c3d-front">…<button data-c3d-flip>…</button><i class="c3d-shine"></i></div>
       <div class="c3d-face c3d-back" inert>…<button data-c3d-flip>…</button><i class="c3d-shine"></i></div></div></article>
     <span class="c3d-mini">…</span>   a small preview that only tilts
   - tilt: a mouse or pen tilts the card toward the pointer; a finger tilts it while pressed (so scrolling still works)
   - flip: [data-c3d-flip] turns the card over; the hidden face is inert, focus moves to the other face's flip button
   - pages re-render their HTML often, so which cards are turned over is remembered by data-c3d id and put back
   - nothing moves with prefers-reduced-motion (the flip then swaps the faces) */
(() => {
  if (window.SFA_CARD3D) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)'), flipped = new Set(), MAX = 9;
  const hosts = '.c3d, .c3d-mini';
  let raf = 0, pend = null;
  function tilt(el, x, y){   // x, y: -1 … 1 from the centre
    el.style.setProperty('--rx', (-y * MAX).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * MAX * (document.dir === 'rtl' ? 1 : 1)).toFixed(2) + 'deg');
    el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3));
    el.style.setProperty('--mx', ((x + 1) * 50).toFixed(1) + '%'); el.style.setProperty('--my', ((y + 1) * 50).toFixed(1) + '%');
  }
  function reset(el){ el.classList.remove('is-tilting'); tilt(el, 0, 0); }
  function at(el, e){ const r = el.getBoundingClientRect(); return [Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))]; }
  function move(el, e){ pend = [el, e.clientX, e.clientY]; if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; if (!pend) return; const [h, cx, cy] = pend; pend = null; h.classList.add('is-tilting'); tilt(h, ...at(h, { clientX: cx, clientY: cy })); }); }
  let over = null;
  document.addEventListener('pointermove', e => {
    if (still.matches || e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest(hosts);
    if (over && over !== el) reset(over);
    over = el; if (el) move(el, e);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (over) reset(over); over = null; });
  document.addEventListener('pointerdown', e => {
    if (still.matches || e.pointerType !== 'touch') return;
    const el = e.target.closest && e.target.closest(hosts); if (!el) return;
    el.classList.add('is-tilting'); tilt(el, ...at(el, e).map(v => v * .6));
    const end = () => { reset(el); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
  }, { passive: true });

  function set(card, on){
    card.classList.toggle('is-flipped', on);
    const f = card.querySelector('.c3d-front'), b = card.querySelector('.c3d-back');
    if (f) f.inert = on; if (b) b.inert = !on;
    card.querySelectorAll('[data-c3d-flip]').forEach(x => x.setAttribute('aria-expanded', String(on)));
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('[data-c3d-flip]'); if (!btn) return;
    const card = btn.closest('.c3d'); if (!card) return;
    const on = !card.classList.contains('is-flipped'), id = card.dataset.c3d;
    if (id){ on ? flipped.add(id) : flipped.delete(id); }
    set(card, on);
    const face = card.querySelector(on ? '.c3d-back' : '.c3d-front');
    setTimeout(() => face && face.querySelector('[data-c3d-flip]')?.focus({ preventScroll: true }), still.matches ? 0 : 300);
  });
  // cards drawn again (innerHTML) come back the way they were
  const restore = root => (root.querySelectorAll ? root.querySelectorAll('.c3d[data-c3d]') : []).forEach(c => { if (flipped.has(c.dataset.c3d)) set(c, true); else { const b = c.querySelector('.c3d-back'); if (b) b.inert = true; } });
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1){ if (n.matches && n.matches('.c3d[data-c3d]')) restore(n.parentNode || n); else restore(n); } })
    .observe(document.documentElement, { childList: true, subtree: true });
  restore(document);
  // [data-c3d-sticky]: a column of cards that stays in view while scrolling, but only when it fits the window (a taller
  // one would hide its last cards)
  const fit = () => document.querySelectorAll('[data-c3d-sticky]').forEach(el => { el.classList.remove('is-sticky'); const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav')) || 90;
    if (el.offsetHeight && el.offsetHeight <= innerHeight - top - 32) el.classList.add('is-sticky'); });
  let fitT = 0; const fitSoon = () => { clearTimeout(fitT); fitT = setTimeout(fit, 60); };
  addEventListener('resize', fitSoon); addEventListener('load', fitSoon);
  new MutationObserver(fitSoon).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('toggle', fitSoon, true);

  // [data-c3d-stack]: several cards one behind the other (Ahmed, 2026-11-18: "show multiple cards behind each other and the
  // user can change using arrow"). The front card is live; up to two peek out behind it; arrows, ← → keys and a swipe
  // change which one is in front. The position is remembered per stack id, so a re-render keeps it.
  const at3 = new Map();
  function lay(st){
    const cards = [...st.querySelectorAll(':scope > .c3d-stack-c > .c3d')], n = cards.length, id = st.dataset.c3dStack;
    let i = Math.max(0, Math.min(n - 1, at3.get(id) || 0)); at3.set(id, i);
    cards.forEach((c, k) => { const pos = k - i; c.dataset.pos = pos < 0 ? 'out' : pos > 2 ? 'far' : String(pos); c.style.setProperty('--pos', Math.max(0, Math.min(3, pos)));
      c.inert = pos !== 0; c.setAttribute('aria-hidden', String(pos !== 0)); });
    const cnt = st.querySelector('[data-c3d-count]'); if (cnt) cnt.textContent = cnt.dataset.c3dCount.replace('{i}', i + 1).replace('{n}', n);
    const pv = st.querySelector('[data-c3d-prev]'), nx = st.querySelector('[data-c3d-next]'); if (pv) pv.disabled = i === 0; if (nx) nx.disabled = i === n - 1;
    const who = st.querySelector('[data-c3d-who]'); if (who) who.textContent = cards[i] ? (cards[i].getAttribute('aria-label') || '').split(' · ').pop() : '';
  }
  function go(st, d){ const id = st.dataset.c3dStack, n = st.querySelectorAll(':scope > .c3d-stack-c > .c3d').length, i = (at3.get(id) || 0) + d;
    if (i < 0 || i >= n) return; at3.set(id, i); lay(st); }
  const layAll = root => (root.querySelectorAll ? root.querySelectorAll('[data-c3d-stack]') : []).forEach(lay);
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-c3d-prev],[data-c3d-next]'); if (!b) return;
    const st = b.closest('[data-c3d-stack]'); if (st){ go(st, b.hasAttribute('data-c3d-next') ? 1 : -1); } });
  document.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; const st = e.target.closest && e.target.closest('[data-c3d-stack]'); if (!st || /input|textarea/i.test(e.target.tagName)) return;
    const fwd = (e.key === 'ArrowRight') !== (document.documentElement.dir === 'rtl'); e.preventDefault(); go(st, fwd ? 1 : -1); });
  let sw = null;   // a sideways swipe on a phone
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; const st = e.target.closest && e.target.closest('[data-c3d-stack]'); sw = st ? { st, x: e.clientX, y: e.clientY } : null; }, { passive: true });
  document.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, st = sw.st; sw = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(st, (dx < 0) !== (document.documentElement.dir === 'rtl') ? 1 : -1); }, { passive: true });
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1){ if (n.matches && n.matches('[data-c3d-stack]')) lay(n); else layAll(n); } })
    .observe(document.documentElement, { childList: true, subtree: true });
  layAll(document);

  const FLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/></svg>';
  const ARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // the markup, for pages that draw cards: front and back are HTML, flip labels in the page's language
  window.SFA_CARD3D = {
    card: ({ id, front, back, cls = '', label = '' }) => `<article class="c3d ${cls}" data-c3d="${esc(id)}"${label ? ` aria-label="${esc(label)}"` : ''}><div class="c3d-card">
      <div class="c3d-face c3d-front">${front}<i class="c3d-shine" aria-hidden="true"></i></div>
      <div class="c3d-face c3d-back" inert>${back}<i class="c3d-shine" aria-hidden="true"></i></div></div></article>`,
    flip: (text, back) => `<button type="button" class="c3d-flip" data-c3d-flip aria-expanded="${!!back}">${FLIP}<span>${esc(text)}</span></button>`,
    // cards: [html]; t: { prev, next, count: 'Card {i} of {n}' } in the page's language. One card: just the card.
    stack: ({ id, cards, cls = '', t }) => cards.length < 2 ? cards.join('') : `<div class="c3d-stack ${cls}" data-c3d-stack="${esc(id)}" role="group" aria-roledescription="carousel">
      <div class="c3d-stack-c">${cards.join('')}</div>
      <div class="c3d-nav"><button type="button" class="c3d-arrow" data-c3d-prev aria-label="${esc(t.prev)}">${ARR}</button><span class="c3d-count" aria-live="polite"><b data-c3d-who></b><small data-c3d-count="${esc(t.count)}"></small></span><button type="button" class="c3d-arrow is-next" data-c3d-next aria-label="${esc(t.next)}">${ARR}</button></div></div>`,
    mini: ({ kind, n, locked, icon = '' }) => `<span class="c3d-mini${n > 1 ? ' is-stack' : ''}${locked ? ' is-locked' : ''}" aria-hidden="true"><span class="c3d-mini-c"><small>${esc(kind)}</small><b>${icon}</b><i class="c3d-shine"></i></span></span>`
  };
})();
