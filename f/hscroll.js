/* Sideways filter rows (sport chips, day strips) with arrows and drag (Ahmed, 2026-11-19: "add arrows and swipe interaction").
   SFA_HSCROLL(row, { prev, next }) wraps a horizontally scrolling row in .hs with a Previous and a Next arrow (f/ui.css).
   The arrows only show when the row overflows, each one dims at its end, and both mirror in Arabic. Touch already swipes
   natively; a mouse can drag the row too, and a drag never counts as a click on the chip under it.
   Returns { update } to re-check the arrows after the row's content changes. Used by courts.html and matches.html. */
(() => {
  window.SFA_HSCROLL = (row, labels = {}) => {
    if (!row) return { update(){} };
    if (row.parentElement && row.parentElement.classList.contains('hs')) return row.parentElement._hs;
    const bar = document.createElement('div'); bar.className = 'hs';
    row.before(bar);
    const arrow = (dir, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hs-arr' + (dir > 0 ? ' fwd' : ''); b.dataset.dir = dir; b.setAttribute('aria-label', label); b.innerHTML = '<span class="hs-i" aria-hidden="true"></span>'; return b; };
    const prev = arrow(-1, labels.prev || 'Previous'), next = arrow(1, labels.next || 'Next');
    bar.append(prev, row, next);
    const rtl = () => getComputedStyle(row).direction === 'rtl';
    const update = () => {
      const max = row.scrollWidth - row.clientWidth, x = Math.abs(row.scrollLeft);
      bar.classList.toggle('ovf', max > 2);
      prev.disabled = x <= 2; next.disabled = x >= max - 2;
    };
    [prev, next].forEach(b => b.addEventListener('click', e => { e.stopPropagation(); row.scrollBy({ left: +b.dataset.dir * (rtl() ? -1 : 1) * row.clientWidth * .7, behavior: 'smooth' }); }));
    row.addEventListener('scroll', update, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(update).observe(row);
    // mouse drag: the pointer is only captured once it has moved, so a plain click still lands on the chip
    let down = false, moved = false, sx = 0, sl = 0;
    row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = false; sx = e.clientX; sl = row.scrollLeft; });
    row.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6){ moved = true; row.classList.add('hs-drag'); try { row.setPointerCapture(e.pointerId); } catch (err) {} }
      if (moved) row.scrollLeft = sl - dx;
    });
    const end = () => { if (!down) return; down = false; row.classList.remove('hs-drag'); };
    row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end); row.addEventListener('lostpointercapture', end);
    row.addEventListener('click', e => { if (moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    row.addEventListener('dragstart', e => e.preventDefault());
    const api = { update };
    bar._hs = api;
    update(); requestAnimationFrame(update);   // now, so a caller restoring scrollLeft sees the row's final width
    return api;
  };
})();
