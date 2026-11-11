/* SFA Domes language (English / Arabic, right-to-left) and display currency (SAR / USD / AED), shared by every page.
   Load after f/i18n-ar.js. Choices live in localStorage and apply on load, before the page paints where possible.

   window.SFA_PREFS
     .lang / .currency / .locale       current choices ('en' | 'ar', 'SAR' | 'USD' | 'AED', Intl locale)
     .t(english, params)               Arabic when lang is 'ar' (falls back to the English); {name} placeholders
     .money(sar)                       HTML price in the display currency (payments still charge SAR)
     .time(minutes) .date(d, style)    'short' → Fri 6 Nov · 'long' → Friday 6 November · 'full' → Fri 6 Nov 2026
     .setLang(l) .setCurrency(c)
   'sfa:prefs' fires on window after a change, so pages re-render their own dynamic parts.

   Static text is translated by matching whole English strings (text nodes and alt / aria-label / placeholder / title)
   against SFA_AR, so markup needs no keys; the originals are kept so switching back restores them exactly.
   Headings split into letter spans for animation (.sw > .ch, full text in aria-label) are rebuilt word by word,
   because Arabic letters have to join. [data-sar="210.75"] elements show that SAR amount in the display currency.
   The language toggle renders into [data-prefs-slot]; [data-lang-toggle] elements flip the language.
   (The currency switcher was removed from the header; prices show in SAR. setCurrency stays for testing.) */
(() => {
  const AR = window.SFA_AR || {}, RULES = window.SFA_AR_RULES || [];
  // Arabic → English, for text a page copied from an already-translated node (e.g. a caption that reads a link's label)
  const REV = new Map(Object.entries(AR).filter(([en]) => !en.includes('{')).map(([en, ar]) => [ar, en]));
  const CURRENCIES = { SAR: 1, USD: 1 / 3.75, AED: 3.6725 / 3.75 };   // fixed rates: USD peg 3.75 SAR, AED peg 3.6725 per USD
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let lang = get('sfaLang', 'en') === 'ar' ? 'ar' : 'en';
  let currency = 'SAR';   // the currency switcher was removed: prices always show in SAR (setCurrency still works for testing)
  const locale = () => lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';

  // ---- strings
  function lookup(s){
    if (AR[s] !== undefined) return AR[s];
    for (const [re, rep] of RULES){ if (re.test(s)) return s.replace(re, rep); }
    return null;
  }
  function t(s, params){
    let out = lang === 'ar' ? (lookup(s) ?? s) : s;
    if (params) out = out.replace(/\{(\w+)\}/g, (m, k) => params[k] ?? m);
    return out;
  }

  // ---- money, numbers, dates
  const SAR_ICON = '<span class="sfa-sar" role="img" aria-label="SAR"></span>';
  function money(sar){
    const v = sar * CURRENCIES[currency];
    const n = v.toLocaleString('en-US', currency === 'SAR' ? { maximumFractionDigits: 2 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === 'SAR') return `<span class="sfa-money">${SAR_ICON}${n}</span>`;
    if (currency === 'USD') return `<span class="sfa-money">$${n}</span>`;
    return `<span class="sfa-money">${lang === 'ar' ? `${n} د.إ` : `AED ${n}`}</span>`;
  }
  const pad = n => String(n).padStart(2, '0');
  function time(m){
    const h = Math.floor(m / 60) % 24, mm = pad(m % 60);
    return lang === 'ar' ? `${h % 12 || 12}:${mm} ${h < 12 ? 'ص' : 'م'}` : `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  }
  const STYLES = { short: { weekday: 'short', day: 'numeric', month: 'short' }, long: { weekday: 'long', day: 'numeric', month: 'long' }, full: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, month: { month: 'long', year: 'numeric' } };
  const date = (d, style = 'short') => d.toLocaleDateString(locale(), STYLES[style] || style);

  // ---- page translation
  const SKIP = 'script,style,noscript,svg,.material-symbols-outlined,.msi,.sp-ico,.ch,[data-no-i18n],.sfa-money';
  const ATTRS = ['alt', 'aria-label', 'placeholder', 'title'];
  const origText = new WeakMap(), origAttr = new WeakMap(), origSplit = new WeakMap();
  function doText(n){
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    if (lang === 'ar'){
      const raw = n.nodeValue, key = raw.replace(/\s+/g, ' ').trim(); if (!key) return;
      const tr = lookup(key); if (tr === null) return;
      if (!origText.has(n)) origText.set(n, raw);
      const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
      const next = lead + tr + tail; if (n.nodeValue !== next) n.nodeValue = next;
    } else if (origText.has(n)){ n.nodeValue = origText.get(n); origText.delete(n); }
    else { const key = n.nodeValue.replace(/\s+/g, ' ').trim(); if (REV.has(key)) n.nodeValue = n.nodeValue.replace(key, REV.get(key)); }
  }
  function doAttrs(el){
    if (el.closest && el.closest('svg')) return;
    let saved = origAttr.get(el);
    for (const a of ATTRS){
      if (lang === 'ar'){
        const v = el.getAttribute(a); if (!v) continue;
        const tr = lookup(v.trim()); if (tr === null) continue;
        if (!saved){ saved = {}; origAttr.set(el, saved); }
        if (!(a in saved)) saved[a] = v;
        if (v !== tr) el.setAttribute(a, tr);
      } else if (saved && a in saved){ el.setAttribute(a, saved[a]); delete saved[a]; }
    }
  }
  // letter-split headings: rebuild as one .sw/.ch per Arabic word (keeps the per-item --i reveal timing)
  function doSplit(el){
    if (lang === 'ar'){
      const label = origAttr.get(el)?.['aria-label'] || el.getAttribute('aria-label'); const tr = label && lookup(label.trim());
      if (tr === null || tr === undefined) return;
      if (!origSplit.has(el)) origSplit.set(el, el.innerHTML);
      const first = el.querySelector('.ch'), base = first ? parseInt(getComputedStyle(first).getPropertyValue('--i')) || 0 : 0;
      el.innerHTML = tr.split(/\s+/).map((w, i) => `<span class="sw"><span class="ch" style="--i:${base + i}">${w}</span></span>`).join(' ');
    } else if (origSplit.has(el)){ el.innerHTML = origSplit.get(el); origSplit.delete(el); }
  }
  function translate(root = document.body){
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    const splits = [...root.querySelectorAll('[aria-label]')].filter(e => e.querySelector(':scope > .sw .ch, :scope > .sw'));
    if (root.matches && root.matches('[aria-label]') && root.querySelector(':scope > .sw')) splits.unshift(root);
    splits.forEach(doSplit);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    const nodes = []; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(doText);
    if (root.matches && root.matches('[alt],[aria-label],[placeholder],[title]')) doAttrs(root);
    root.querySelectorAll('[alt],[aria-label],[placeholder],[title]').forEach(doAttrs);
    root.querySelectorAll('[data-sar]').forEach(e => { e.innerHTML = money(+e.dataset.sar); });
  }
  // anything the page adds later (menus, captions, error messages) gets the same treatment
  const mo = new MutationObserver(list => {
    if (lang !== 'ar') { list.forEach(m => m.addedNodes.forEach(x => x.nodeType === 1 && x.querySelectorAll && x.querySelectorAll('[data-sar]').forEach(e => { e.innerHTML = money(+e.dataset.sar); }))); return; }
    mo.disconnect();
    for (const m of list){
      if (m.type === 'characterData') doText(m.target);
      else m.addedNodes.forEach(x => translate(x));
    }
    observe();
  });
  const observe = () => document.body && mo.observe(document.body, { childList: true, subtree: true, characterData: true });

  // ---- direction + Arabic type
  const CSS = `
.sfa-sar{display:inline-block;width:.8em;height:.8em;margin-inline-end:.12em;vertical-align:-.04em;background:currentColor;-webkit-mask:url(f/sar.svg) center/contain no-repeat;mask:url(f/sar.svg) center/contain no-repeat}
.sfa-money{white-space:nowrap;unicode-bidi:isolate}
html[lang=ar] body :not(.material-symbols-outlined):not(.msi):not(.sp-ico):not(.sp-ico *){font-family:"Tajawal","Geeza Pro",system-ui,sans-serif !important;letter-spacing:0 !important}

html[lang=ar] body :is(h1,h2){line-height:1.35 !important}
html[dir=rtl] .sfa-flip,html[dir=rtl] :is(.back,.cta,.arrow,#payBtn,.go-day) svg,html[dir=rtl] .act-arrow{scale:-1 1}
html[dir=rtl] .sp-cap-count{direction:ltr;unicode-bidi:isolate}
.sfa-prefs{display:inline-flex;gap:8px;align-items:center}
.sfa-prefs__btn{font:var(--ts-body-l-bold);text-transform:var(--type-case-label);position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:44px;min-width:44px;padding:0 12px;border:1px solid var(--neutral-300);background:var(--neutral-0);color:var(--neutral-950);cursor:pointer;transition:border-color .2s,background-color .2s,color .2s}
.sfa-prefs__btn:hover{border-color:var(--neutral-950)}
.sfa-prefs__btn svg{width:13px;height:13px}
.sfa-prefs__lang{font-family:"Tajawal",sans-serif;text-transform:none;letter-spacing:0;font-size:var(--fs-15)}
.sfa-cur-menu{position:fixed;z-index:1001;min-width:200px;background:var(--neutral-0);border:1px solid var(--neutral-200);box-shadow:0 18px 40px -20px rgba(9,9,11,.45);padding:6px 0;animation:sfaCurIn .22s cubic-bezier(.22,1,.36,1)}
@keyframes sfaCurIn{from{opacity:0;transform:translateY(-6px)}}
.sfa-cur-menu button{font:var(--ts-body-s);display:flex;width:100%;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border:0;background:none;cursor:pointer;text-align:start;color:var(--neutral-950)}
.sfa-cur-menu button:hover{background:var(--neutral-100)}
.sfa-cur-menu button b{font:var(--ts-body-l-bold);text-transform:var(--type-case-label);letter-spacing:.03em}
.sfa-cur-menu button[aria-checked=true]{color:var(--orange-500)}
.sfa-cur-menu p{font:var(--ts-caption-1);margin:6px 0 0;padding:8px 16px 4px;border-top:1px solid var(--neutral-200);color:var(--neutral-500)}
@media (max-width:560px){.sfa-prefs{gap:6px}.sfa-prefs__btn{padding:0 8px;min-width:36px;height:40px;font-size:var(--fs-13)}.sfa-prefs__btn svg{display:none}.sfa-prefs__lang{font-size:var(--fs-13)}}`;
  function setDoc(){
    const h = document.documentElement;
    h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang === 'ar' && !document.getElementById('sfaArFont')){
      const l = document.createElement('link'); l.id = 'sfaArFont'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'; document.head.appendChild(l);
    }
  }
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  setDoc();

  // ---- header switchers
  const NAMES = { SAR: 'Saudi riyal', USD: 'US dollar', AED: 'UAE dirham' };
  let menu, menuAnchor;
  function renderSlots(){
    document.querySelectorAll('[data-prefs-slot]').forEach(slot => {
      const cls = slot.dataset.btnClass || 'sfa-prefs__btn';
      slot.classList.add('sfa-prefs');
      slot.innerHTML =
        `<button type="button" class="${cls} sfa-prefs__lang" data-lang-toggle lang="${lang === 'ar' ? 'en' : 'ar'}" data-no-i18n>${lang === 'ar' ? 'English' : 'عربي'}</button>`;
    });
    document.querySelectorAll('[data-lang-toggle]:not(.sfa-prefs__lang)').forEach(a => {
      a.textContent = lang === 'ar' ? 'English' : 'عربي'; a.setAttribute('lang', lang === 'ar' ? 'en' : 'ar'); a.setAttribute('aria-label', lang === 'ar' ? 'English' : 'العربية'); a.setAttribute('data-no-i18n', '');
    });
  }
  function closeMenu(){ if (!menu) return; menu.remove(); menu = null; menuAnchor.setAttribute('aria-expanded', 'false'); removeEventListener('click', outside, true); removeEventListener('keydown', key); }
  const outside = e => { if (menu && !menu.contains(e.target) && !menuAnchor.contains(e.target)) closeMenu(); };
  const key = e => { if (e.key === 'Escape'){ closeMenu(); menuAnchor.focus(); } };
  function openMenu(anchor){
    if (menu) return closeMenu();
    menuAnchor = anchor;
    menu = document.createElement('div'); menu.className = 'sfa-cur-menu'; menu.setAttribute('role', 'menu'); menu.dir = lang === 'ar' ? 'rtl' : 'ltr';
    menu.innerHTML = Object.keys(CURRENCIES).map(c => `<button type="button" role="menuitemradio" aria-checked="${c === currency}" data-cur="${c}"><span>${t(NAMES[c])}</span><b>${c}</b></button>`).join('') +
      `<p>${t('Prices are shown at fixed rates. Payment is always charged in SAR.')}</p>`;
    menu.setAttribute('data-no-i18n', '');
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    const left = lang === 'ar' ? r.left : r.right - menu.offsetWidth;
    menu.style.left = Math.round(Math.min(innerWidth - menu.offsetWidth - 12, Math.max(12, left))) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    menu.addEventListener('click', e => { const b = e.target.closest('[data-cur]'); if (b){ closeMenu(); setCurrency(b.dataset.cur); } });
    addEventListener('click', outside, true); addEventListener('keydown', key);
    menu.querySelector('[aria-checked=true]').focus();
  }
  document.addEventListener('click', e => {
    const tog = e.target.closest('[data-lang-toggle]'); if (tog){ e.preventDefault(); setLang(lang === 'ar' ? 'en' : 'ar'); return; }
    const cur = e.target.closest('.sfa-cur-btn'); if (cur){ e.preventDefault(); openMenu(cur); }
  });

  // ---- changes
  const fire = () => dispatchEvent(new CustomEvent('sfa:prefs', { detail: { lang, currency } }));
  function setLang(l){
    if (l === lang) return; lang = l; put('sfaLang', l); setDoc();
    mo.disconnect(); fire(); translate(); renderSlots(); observe();
  }
  function setCurrency(c){
    if (!CURRENCIES[c] || c === currency) return; currency = c; put('sfaCurrency', c);
    mo.disconnect(); fire(); translate(); renderSlots(); observe();
  }

  window.SFA_PREFS = {
    get lang(){ return lang; }, get currency(){ return currency; }, get locale(){ return locale(); },
    t, money, time, date, setLang, setCurrency, rates: CURRENCIES,
  };

  const boot = () => { renderSlots(); translate(); observe(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
