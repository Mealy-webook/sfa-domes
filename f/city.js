/* City picker (Ahmed, 2026-11-19: "the domes will take place in different cities, I want a global location option which
   will affect the listing of the page"). Load right after the menu bar (f/site-nav.js, or index.html's own bar).
   window.SFA_CITY
     .list                 the cities: Dammam is open; Riyadh and Jeddah are opening soon (no listings yet)
     .id / .city()         the chosen city (localStorage 'sfaCity', Dammam by default)
     .open()               does the chosen city have a dome open? Listing pages show their listings only when it does
     .set(id)              choose a city; the page reloads so every listing follows it
     .soonPage(title, extra)  a page's "opening soon" state: eyebrow, the page title, optional extra markup (the courts
                           page's dome chips), and a panel with a way back to Dammam
     .soonBox()            just the panel (the home page puts it in place of its sports and programmes)
   The picker sits in the menu bar beside the language switch (on phones it is the first row of the open menu).
   Square corners, design-system tokens (f/colors.css, f/fonts.css). */
(() => {
  const CITIES = [
    { id: 'dammam', name: 'Dammam', open: true },
    { id: 'riyadh', name: 'Riyadh', open: false },
    { id: 'jeddah', name: 'Jeddah', open: false },
  ];
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let id = CITIES.some(c => c.id === get('sfaCity')) ? get('sfaCity') : 'dammam';
  const city = () => CITIES.find(c => c.id === id);
  const t = (s, p) => window.SFA_PREFS ? window.SFA_PREFS.t(s, p) : String(s).replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? p[k] : m));
  const PIN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const CHEV = '<svg class="cn-city-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const soonBox = () => { const c = city(), n = t(c.name);
    return `<div class="cs-box" role="status"><span class="cs-tag">${t('Opening soon')}</span><h2 class="cs-h2">${t('{city} is opening soon', { city: n })}</h2>
      <p>${t('Courts, programs, games and ladies hours in {city} will show here as soon as the dome opens. Until then you can book in Dammam.', { city: n })}</p>
      <button type="button" class="cs-go" data-city-set="dammam">${PIN}<span>${t('Show Dammam')}</span></button></div>`; };
  const soonPage = (title, extra = '') => `<section class="cs" aria-labelledby="csH"><div class="cs-in"><p class="cs-eb"><span class="cs-ic" aria-hidden="true">${PIN}</span>${t('SFA Domes {city}', { city: t(city().name) })}</p>
      <h1 id="csH" class="cs-h">${title}</h1>${extra}${soonBox()}</div></section>`;

  window.SFA_CITY = { list: CITIES, get id(){ return id; }, city, open: () => city().open, soonBox, soonPage,
    set(next){ if (!CITIES.some(c => c.id === next) || next === id) return close(); id = next; put('sfaCity', id); location.reload(); } };

  const CSS = `
.cn-city{position:relative;flex:none}
.cn-city-btn{gap:8px;cursor:pointer;background:none;font:var(--ts-body-default-bold)}
.cn-city-btn .cn-city-chev{transition:transform .2s ease}
.cn-city-btn[aria-expanded=true] .cn-city-chev{transform:rotate(180deg)}
.cn-city-menu{position:fixed;z-index:60;min-width:220px;margin:0;padding:4px;list-style:none;background:var(--neutral-950);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 40px -16px rgba(0,0,0,.5)}
.cn-city-menu[hidden]{display:none}
.cn-city-menu button,.cn-city-m button{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:8px 12px;border:0;background:none;color:var(--neutral-0);font:var(--ts-body-default-bold);text-align:start;cursor:pointer}
.cn-city-menu button:hover,.cn-city-menu button:focus-visible{background:rgba(255,255,255,.08)}
.cn-city-menu small,.cn-city-m small{margin-inline-start:auto;font:var(--ts-caption-1-bold);color:var(--neutral-400);white-space:nowrap}
/* in the phone menu the row follows the bar's light or dark theme (f/site-nav.js --cn-* colours) */
.cn-city-m button{color:var(--cn-text,var(--neutral-0))}
.cn-city-m small{color:var(--cn-muted,var(--neutral-400))}
.cn-city-m button:hover{background:var(--cn-hover,transparent)}
.cn-city-menu .tick,.cn-city-m .tick{display:grid;place-items:center;width:16px;flex:none;color:var(--orange-500)}
.cn-city-m{display:none}
@media (max-width:639px){
  .card-nav__end .cn-city{display:none}
  .cn-city-m{display:block;margin:0 0 12px;padding:12px;border:1px solid var(--cn-line,rgba(255,255,255,.12))}
  .cn-city-m p{margin:0 0 4px;font:var(--ts-caption-1-bold);color:var(--cn-muted,var(--neutral-400));text-transform:var(--type-case-label)}
  .cn-city-m ul{margin:0;padding:0;list-style:none;display:grid}
  .cn-city-m button{padding-inline:0}
}
/* a listing page in a city that hasn't opened yet */
.cs{padding:calc(90px + clamp(32px,7vh,72px)) clamp(16px,6.67vw,96px) clamp(56px,9vh,96px)}
.cs-in{max-width:1440px;margin:0 auto;display:grid;gap:16px}
.cs-eb{display:flex;align-items:center;gap:8px;margin:0;font:var(--ts-body-l-bold)}
.cs-ic{display:grid;place-items:center;width:32px;height:32px;background:var(--color-brand);color:var(--neutral-0)}
.cs-h{margin:0;font:var(--ts-display-l);text-transform:var(--type-case-display)}
.cs-box{display:grid;justify-items:start;gap:12px;max-width:640px;margin-top:24px;padding:32px;border:1px solid var(--color-border-primary);background:var(--color-bg-secondary)}
.cs-tag{padding:4px 8px;background:var(--color-bg-accent-tag);color:var(--color-content-accent);font:var(--ts-caption-1-bold)}
.cs-h2{margin:0;font:var(--ts-title-section);text-transform:var(--type-case-title)}
.cs-box p{margin:0;font:var(--ts-body-l);color:var(--color-content-secondary)}
.cs-go{display:inline-flex;align-items:center;gap:8px;height:56px;margin-top:8px;padding:0 24px;border:0;background:var(--color-brand);color:var(--neutral-0);font:var(--ts-body-l-bold);cursor:pointer}
.cs-go:hover{filter:brightness(.92)}
@media (max-width:639px){.cs-box{padding:24px}.cs-h{font:var(--ts-display-s)}}
.cs.cs-home{position:relative;z-index:3;padding-top:clamp(56px,9vh,96px);background:var(--color-bg-primary)}
.cs.cs-home .cs-box{margin-top:0}
html.city-soon #sports,html.city-soon #programs{display:none!important}
`;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

  // ---- the picker: a button with a small menu in the bar, and a row of choices in the phone menu
  const opts = () => CITIES.map(c => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${c.id === id}" data-city-set="${c.id}"><span class="tick">${c.id === id ? TICK : ''}</span><span>${t(c.name)}</span>${c.open ? '' : `<small>${t('Opening soon')}</small>`}</button></li>`).join('');
  // the menu hangs off <body> (the bar's panel clips its overflow) and is placed under the button when it opens
  let wrap = null, menu = null;
  const btn = () => wrap && wrap.querySelector('.cn-city-btn');
  function close(){ if (!menu || menu.hidden) return; menu.hidden = true; btn()?.setAttribute('aria-expanded', 'false'); }
  function place(){ const r = btn().getBoundingClientRect(), rtl = document.documentElement.dir === 'rtl';
    menu.style.top = r.bottom + 8 + 'px'; menu.style.left = rtl ? r.left + 'px' : 'auto'; menu.style.right = rtl ? 'auto' : innerWidth - r.right + 'px'; }
  function mount(){
    const end = document.querySelector('.card-nav__end'); if (!end) return;
    if (!wrap){ wrap = document.createElement('div'); wrap.className = 'cn-city'; end.insertBefore(wrap, end.querySelector('[data-lang-toggle]') || null); }
    wrap.innerHTML = `<button type="button" class="card-nav__lang cn-city-btn" aria-haspopup="true" aria-expanded="false" aria-controls="cnCityMenu" aria-label="${t('City: {city}', { city: t(city().name) })}">${PIN}<span>${t(city().name)}</span>${CHEV}</button>`;
    if (!menu){ menu = document.createElement('ul'); menu.className = 'cn-city-menu'; menu.id = 'cnCityMenu'; menu.setAttribute('role', 'menu'); menu.hidden = true; document.body.appendChild(menu); }
    menu.setAttribute('aria-label', t('City')); menu.innerHTML = opts();
    const content = document.querySelector('.card-nav__content');
    if (content){ let m = content.querySelector('.cn-city-m'); if (!m){ m = document.createElement('div'); m.className = 'cn-city-m'; content.prepend(m); }
      m.innerHTML = `<p id="cnCityMH">${t('City')}</p><ul role="group" aria-labelledby="cnCityMH">${opts()}</ul>`; }
  }
  document.addEventListener('click', e => {
    const set = e.target.closest('[data-city-set]'); if (set){ e.preventDefault(); window.SFA_CITY.set(set.dataset.citySet); return; }
    const b = e.target.closest('.cn-city-btn');
    if (b){ const open = menu.hidden; if (open) place(); menu.hidden = !open; b.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('[aria-checked="true"]')?.focus(); return; }
    if (menu && !e.target.closest('.cn-city, .cn-city-menu')) close();
  });
  document.addEventListener('keydown', e => {
    if (!menu || menu.hidden) return;
    const m = menu;
    if (e.key === 'Escape'){ close(); btn()?.focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); const items = [...m.querySelectorAll('button')], i = items.indexOf(document.activeElement); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  addEventListener('sfa:prefs', mount);
  addEventListener('resize', close); addEventListener('scroll', close, { passive: true });
})();
