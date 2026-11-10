/* Date of birth picker (Ahmed's pick, 2026-11-09: option E of dob-options.html, "Year, then month, then day").
   Upgrades every <input type="date" data-dob> on the page, including ones a page renders later (a MutationObserver
   watches for them): the input becomes a hidden field that keeps its id, name, min, max and YYYY-MM-DD value, so the
   page's own reading, validation and saving don't change. In its place a button opens an in-flow panel (never clipped
   by a form): pick the year (a long adult range first picks the decade), then the month, then the day. Dates outside
   min/max are crossed out. Picking a day fires 'input' and 'change' on the hidden field and closes the panel.
   focus() on the hidden field moves to the button, so "focus the first bad field" code keeps working.
   Styling: the button fills a one-input wrapper (.input, .sa-in); a bare input (profile's .pf) gets its own border.
   Needs f/prefs.js (dates and words in the page language). DS tokens, square corners. */
(() => {
  const P = () => window.SFA_PREFS, t = (s, p) => P() ? P().t(s, p) : s;
  const pad = n => String(n).padStart(2, '0'), ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const daysIn = (y, m) => new Date(y, m, 0).getDate();
  const loc = () => P() && P().lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  const months = () => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(loc(), { month: 'short' }).format(new Date(2020, i, 1)));
  const nice = k => { const [y, m, d] = k.split('-').map(Number); return new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d)); };
  const CAL = '<svg class="dobp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4"/></svg>';
  let uid = 0;

  const css = document.createElement('style');
  css.textContent = `
.dobp-btn{display:flex;align-items:center;gap:12px;width:100%;height:100%;min-height:46px;padding:0 16px;border:0;background:transparent;color:inherit;font:inherit;font-size:var(--fs-16);text-align:start;cursor:pointer}
.dobp-btn span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dobp-btn .ph{color:var(--color-content-tertiary)}
.dobp-btn:focus-visible{outline:2px solid var(--color-brand);outline-offset:-2px}
.dobp-ico{flex:none;width:20px;height:20px;fill:none;stroke:var(--color-content-secondary);stroke-width:2;stroke-linecap:square}
.dobp-btn[aria-expanded=true] .dobp-ico{stroke:var(--color-content-primary)}
.dobp-solo{height:48px;border:1px solid var(--color-border-secondary);background:var(--color-bg-primary)}
.dobp-solo[aria-expanded=true]{border-color:var(--color-content-primary);box-shadow:inset 0 0 0 1px var(--color-content-primary)}
.pf.bad .dobp-solo{border-color:var(--color-danger)}
.dobp-pan{margin-top:8px;padding:12px;border:1px solid var(--color-content-primary);background:var(--color-bg-primary);color:var(--color-content-primary)}
.dobp-pan[hidden]{display:none}
.dobp-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-bottom:12px}
.dobp-steps button{height:44px;padding:0 4px;border:0;border-bottom:2px solid var(--color-border-primary);background:none;color:var(--color-content-tertiary);font:var(--ts-label-m);cursor:pointer}
.dobp-steps button[aria-selected=true]{border-color:var(--color-brand);color:var(--color-content-primary)}
.dobp-steps button:disabled{cursor:default}
.dobp-steps small{display:block;font:var(--ts-caption);color:var(--color-content-secondary)}
.dobp-g{display:grid;gap:4px}
.dobp-g.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.dobp-g.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.dobp-g.d7{grid-template-columns:repeat(7,minmax(0,1fr))}
.dobp-g .wk{display:grid;place-items:center;height:28px;font:var(--ts-label-s);color:var(--color-content-tertiary)}
.dobp-g button{height:40px;border:1px solid transparent;background:var(--color-bg-secondary);color:inherit;font:var(--ts-label-m);font-variant-numeric:tabular-nums;cursor:pointer}
.dobp-g button:hover:not(:disabled){border-color:var(--color-content-primary)}
.dobp-g button:disabled{background:none;color:var(--color-content-disabled);text-decoration:line-through;cursor:default}
.dobp-g button[aria-pressed=true]{background:var(--color-brand);color:var(--neutral-0)}
.dobp-dec{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}
.dobp-dec::-webkit-scrollbar{display:none}
.dobp-dec button{flex:none;height:36px;padding:0 12px;border:1px solid var(--color-border-secondary);background:var(--color-bg-primary);color:inherit;font:var(--ts-label-s);cursor:pointer}
.dobp-dec button[aria-pressed=true]{background:var(--color-content-primary);border-color:var(--color-content-primary);color:var(--neutral-0)}
.dobp-blank{height:40px}`;
  document.head.appendChild(css);

  function enhance(inp){
    inp.dataset.dobp = '1';
    const id = inp.id || 'dob' + (++uid), min = inp.getAttribute('min') || '1900-01-01', max = inp.getAttribute('max') || window.SFA_TODAY?.() || '2100-01-01';
    const Y0 = +min.slice(0, 4), Y1 = +max.slice(0, 4), inRange = k => k >= min && k <= max, LONG = Y1 - Y0 > 15;
    const wrap = inp.parentElement && /(^| )(input|sa-in)( |$)/.test(inp.parentElement.className) ? inp.parentElement : null;
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = id + '-btn';
    btn.className = 'dobp-btn' + (wrap ? '' : ' dobp-solo'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-haspopup', 'true');
    if (inp.getAttribute('aria-describedby')) btn.setAttribute('aria-describedby', inp.getAttribute('aria-describedby'));
    const pan = document.createElement('div'); pan.className = 'dobp-pan'; pan.id = id + '-pan'; pan.hidden = true; pan.setAttribute('role', 'group');
    btn.setAttribute('aria-controls', pan.id);
    const had = document.activeElement === inp;   // a page that just focused the field (e.g. after a failed check) keeps focus on the picker
    inp.type = 'hidden'; inp.before(btn); (wrap || btn).after(pan);
    inp.focus = () => btn.focus();   // "focus the first bad field" lands on the picker
    const lbl = inp.id && document.querySelector(`label[for="${inp.id}"]`); if (lbl){ lbl.htmlFor = btn.id; pan.setAttribute('aria-label', lbl.textContent.trim()); }
    // state: the step showing, and what's picked so far
    let step = 0, y = 0, m = 0, dec = 0;
    const label = () => { const v = inp.value; btn.innerHTML = `<span${v ? '' : ' class="ph"'}>${v ? nice(v) : t('Choose date of birth')}</span>${CAL}`; };
    const okM = (yy, mm) => ymd(yy, mm, daysIn(yy, mm)) >= min && ymd(yy, mm, 1) <= max;
    function paint(){
      const v = inp.value, d = v && +v.slice(0, 4) === y && +v.slice(5, 7) === m ? +v.slice(8) : 0, ms = months();
      const tabs = [[t('Year'), y || ''], [t('Month'), m ? ms[m - 1] : ''], [t('Day'), d || '']];
      let body;
      if (step === 0){
        const yrs = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y1 - i);
        if (LONG){
          const decs = [...new Set(yrs.map(v2 => Math.floor(v2 / 10) * 10))];
          if (!dec) dec = y ? Math.floor(y / 10) * 10 : decs[Math.min(decs.length - 1, 3)];
          body = `<div class="dobp-dec" role="group" aria-label="${t('Decade')}">${decs.map(x => `<button type="button" data-dec="${x}" aria-pressed="${x === dec}">${x}s</button>`).join('')}</div>`
            + `<div class="dobp-g c4">${yrs.filter(v2 => Math.floor(v2 / 10) * 10 === dec).map(v2 => `<button type="button" data-y="${v2}" aria-pressed="${v2 === y}">${v2}</button>`).join('')}</div>`;
        } else body = `<div class="dobp-g c4">${yrs.map(v2 => `<button type="button" data-y="${v2}" aria-pressed="${v2 === y}">${v2}</button>`).join('')}</div>`;
      } else if (step === 1) body = `<div class="dobp-g c3">${ms.map((n, i) => `<button type="button" data-m="${i + 1}"${okM(y, i + 1) ? '' : ' disabled'} aria-pressed="${i + 1 === m}">${n}</button>`).join('')}</div>`;
      else {
        const first = (new Date(y, m - 1, 1).getDay() + 6) % 7, n = daysIn(y, m);
        const wk = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc(), { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
        body = `<div class="dobp-g d7">${wk.map(w => `<span class="wk" aria-hidden="true">${w}</span>`).join('')}${'<span class="dobp-blank"></span>'.repeat(first)}${Array.from({ length: n }, (_, i) => { const k = ymd(y, m, i + 1);
          return `<button type="button" data-d="${k}"${inRange(k) ? '' : ' disabled'} aria-pressed="${i + 1 === d}" aria-label="${nice(k)}">${i + 1}</button>`; }).join('')}</div>`;
      }
      pan.innerHTML = `<div class="dobp-steps" role="tablist">${tabs.map(([n, v2], i) => `<button type="button" role="tab" data-step="${i}" aria-selected="${i === step}"${i > (y ? (m ? 2 : 1) : 0) ? ' disabled' : ''}>${n}<small>${v2 || '–'}</small></button>`).join('')}</div>${body}`;
    }
    const focusIn = () => (pan.querySelector('.dobp-g [aria-pressed=true]') || pan.querySelector('.dobp-g button:not(:disabled)'))?.focus({ preventScroll: true });
    const open = on => {
      pan.hidden = !on; btn.setAttribute('aria-expanded', on);
      if (on){ const v = inp.value; if (v){ y = +v.slice(0, 4); m = +v.slice(5, 7); step = 2; } else step = y ? (m ? 2 : 1) : 0; dec = 0; paint(); focusIn(); }
    };
    btn.addEventListener('click', () => open(pan.hidden));
    pan.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.step){ step = +b.dataset.step; paint(); focusIn(); return; }
      if (b.dataset.dec){ dec = +b.dataset.dec; paint(); pan.querySelector(`[data-dec="${dec}"]`)?.focus(); return; }
      if (b.dataset.y){ y = +b.dataset.y; if (m && !okM(y, m)) m = 0; step = 1; paint(); focusIn(); return; }
      if (b.dataset.m){ m = +b.dataset.m; step = 2; paint(); focusIn(); return; }
      if (b.dataset.d){ inp.value = b.dataset.d; label(); open(false); btn.focus();
        inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    pan.addEventListener('keydown', e => { if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); open(false); btn.focus(); } });   // Escape closes the picker, not a dialog around it
    addEventListener('sfa:prefs', () => { label(); if (!pan.hidden) paint(); });
    label(); if (had) btn.focus({ preventScroll: true });
  }
  const scan = root => (root.querySelectorAll ? root : document).querySelectorAll('input[type="date"][data-dob]:not([data-dobp])').forEach(enhance);
  const start = () => { scan(document); new MutationObserver(list => { for (const r of list) for (const n of r.addedNodes) if (n.nodeType === 1){ if (n.matches?.('input[type="date"][data-dob]:not([data-dobp])')) enhance(n); else scan(n); } }).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  window.SFA_DOB = { enhance };
})();
