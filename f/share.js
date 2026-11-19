/* Share options (Ahmed, 2026-11-19, on the court page's Share button: "Share options"). A small menu under the button:
   Copy link, WhatsApp, X, Email, and "More options" (the device's own share sheet) where the browser has one.
   window.SFA_SHARE.open(button, { title, url })   opens the menu under the button (toggles when it's already open)
   The menu hangs off <body> so a card's overflow never clips it, closes on Escape, an outside click, scroll or resize,
   and is mirrored in Arabic. Square corners, design-system tokens (f/colors.css, f/fonts.css). */
(() => {
  const t = (s, p) => window.SFA_PREFS ? window.SFA_PREFS.t(s, p) : s;
  const I = {
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.2z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>',
    mail: '<path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/>',
    more: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v9h14v-9"/>',
    ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  const CSS = `
.shm{position:fixed;z-index:80;min-width:240px;margin:0;padding:4px;list-style:none;background:var(--color-bg-primary);border:1px solid var(--color-border-primary);box-shadow:0 18px 40px -16px rgba(0,0,0,.35)}
.shm[hidden]{display:none}
.shm-h{margin:0;padding:12px 12px 8px;font:var(--ts-caption-1-bold);color:var(--color-content-tertiary);text-transform:var(--type-case-label)}
.shm a,.shm button{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:8px 12px;border:0;background:none;color:var(--color-content-primary);font:var(--ts-body-default-bold);text-align:start;text-decoration:none;cursor:pointer}
.shm a:hover,.shm button:hover,.shm a:focus-visible,.shm button:focus-visible{background:var(--color-bg-secondary)}
.shm .ic{display:grid;place-items:center;width:36px;height:36px;flex:none;border:1px solid var(--color-border-secondary)}
.shm .done .ic{border-color:var(--color-brand);color:var(--color-brand)}
`;
  let menu = null, btn = null, data = null;
  function build(){
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    menu = document.createElement('div'); menu.className = 'shm'; menu.id = 'shareMenu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
    document.body.appendChild(menu);
    menu.addEventListener('click', async e => {
      const b = e.target.closest('[data-share]'); if (!b) return;
      const k = b.dataset.share;
      if (k === 'copy'){ e.preventDefault(); copied(b, await copy(data.url)); return; }
      if (k === 'more'){ e.preventDefault(); close(); try { await navigator.share({ title: data.title, url: data.url }); } catch (err) {} return; }
      close();   // the links open in a new tab (WhatsApp, X) or the mail app
    });
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('[data-share]')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      if (e.key === 'Tab') close();
    });
  }
  async function copy(url){
    try { await navigator.clipboard.writeText(url); return true; } catch (e) {
      const f = document.createElement('textarea'); f.value = url; f.setAttribute('readonly', ''); f.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(f); f.select(); const ok = document.execCommand('copy'); f.remove(); return ok; }
  }
  function copied(b, ok){
    if (!ok){ window.SFA_AUTH && window.SFA_AUTH.toast(t('Could not copy the link')); return; }
    b.classList.add('done'); b.querySelector('.ic').innerHTML = svg('ok'); b.querySelector('.lb').textContent = t('Link copied');
    setTimeout(close, 900);
  }
  function fill(){
    const u = encodeURIComponent(data.url), msg = encodeURIComponent(`${data.title} ${data.url}`);
    const row = (k, ic, label, href) => `<li role="none">${href
      ? `<a role="menuitem" data-share="${k}" href="${href}"${k === 'email' ? '' : ' target="_blank" rel="noopener noreferrer"'}><span class="ic">${svg(ic)}</span><span class="lb">${label}</span></a>`
      : `<button type="button" role="menuitem" data-share="${k}"><span class="ic">${svg(ic)}</span><span class="lb">${label}</span></button>`}</li>`;
    menu.setAttribute('aria-label', t('Share'));
    menu.innerHTML = `<p class="shm-h" aria-hidden="true">${t('Share')}</p><ul role="none" style="margin:0;padding:0;list-style:none">
      ${row('copy', 'link', t('Copy link'))}
      ${row('whatsapp', 'chat', 'WhatsApp', `https://wa.me/?text=${msg}`)}
      ${row('x', 'x', 'X', `https://x.com/intent/post?text=${encodeURIComponent(data.title)}&url=${u}`)}
      ${row('email', 'mail', t('Email'), `mailto:?subject=${encodeURIComponent(data.title)}&body=${msg}`)}
      ${navigator.share ? row('more', 'more', t('More options')) : ''}</ul>`;
  }
  // under the button, its end edge lined up with the button's; flips above when there's no room below
  function place(){
    const r = btn.getBoundingClientRect(), rtl = document.documentElement.dir === 'rtl', w = menu.offsetWidth, h = menu.offsetHeight;
    let left = rtl ? r.left : r.right - w; left = Math.max(8, Math.min(left, innerWidth - w - 8));
    const top = r.bottom + 8 + h > innerHeight - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : r.bottom + 8;
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
  }
  function close(){ if (!menu || menu.hidden) return; menu.hidden = true; if (btn){ btn.setAttribute('aria-expanded', 'false'); if (menu.contains(document.activeElement)) btn.focus({ preventScroll: true }); } }
  function open(b, d){
    if (!menu) build();
    if (!menu.hidden && btn === b){ close(); return; }
    btn = b; data = d; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-controls', 'shareMenu');
    fill(); menu.hidden = false; place(); btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('[data-share]').focus({ preventScroll: true });
  }
  document.addEventListener('click', e => { if (menu && !menu.hidden && !menu.contains(e.target) && !(btn && btn.contains(e.target))) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('resize', close); addEventListener('scroll', close, { passive: true });
  window.SFA_SHARE = { open, close };
})();
