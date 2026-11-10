/* Booking for a child (stories AC01–AC03): the pieces court and program checkout share.
   - SFA_KIDS.fresh()            → the account's saved children, read fresh from the server (never a cached copy), so a child
                                   added or removed in My account (or in another tab) shows straight away
   - SFA_KIDS.dropdown(o)        → HTML for the "Which child?" dropdown: each saved child by full name and date of birth,
                                   unavailable ones greyed with the reason, then "Add a new child". Fires kd:pick / kd:open
   - SFA_KIDS.formHTML(p, f, er) → the child form (first name, last name, date of birth, gender); SFA_KIDS.read(p) reads it
   - SFA_KIDS.errors(c, on)      → SFA_CHILD_ERRORS against the booking date (ages 6 to 17 on that day, both ends inclusive)
   - SFA_KIDS.settle(c)          → after a valid form: a child matching a saved one (same name and date of birth) uses the saved
                                   profile; otherwise "Save this child to your account?" (Save / Not now; closing it is Not now).
                                   Resolves { ref, name } for a saved child or { child, name } for this booking only.
   One rule set: f/programs-data.js (SFA_CHILD_*), which server.js runs too. */
(() => {
  const P = () => window.SFA_PREFS, t = (s, v) => (P() && P().t ? P().t(s, v) : s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const key = x => `${String(x.name || window.SFA_FULL_NAME(x)).trim().toLowerCase().replace(/\s+/g, ' ')}|${x.dob}`;
  const toDate = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
  const born = dob => P().date(toDate(dob), { day: 'numeric', month: 'short', year: 'numeric' });
  const initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  // ---- styles (DS tokens, square corners)
  const css = document.createElement('style');
  css.textContent = `
.kd{position:relative;display:grid;gap:8px}
.kd-l{font:var(--ts-label-m);text-transform:var(--type-case-label);color:var(--ink-2)}
.kd-btn{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:8px 16px;border:1px solid var(--line-strong);background:var(--bg);color:var(--ink);text-align:start;cursor:pointer;transition:border-color .2s,box-shadow .2s}
.kd-btn:hover{border-color:var(--ink)}
.kd-btn[aria-expanded=true]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.kd-btn > svg{flex:none;width:20px;height:20px;margin-inline-start:auto;transition:transform .2s}
.kd-btn[aria-expanded=true] > svg{transform:rotate(180deg)}
.kd-v{display:flex;align-items:center;gap:12px;min-width:0}
.kd-ph{font:var(--ts-body-m);color:var(--ink-3)}
.kd-av{flex:none;display:grid;place-items:center;width:40px;height:40px;background:var(--bg-soft);font:var(--ts-label-m);color:var(--ink-2)}
.kd-t{display:grid;gap:2px;min-width:0}
.kd-t strong{font:var(--ts-label-l);overflow-wrap:anywhere}
.kd-t small{font:var(--ts-body-s);color:var(--ink-2)}
.kd-list{margin:0;padding:4px 0;list-style:none;max-height:min(360px,50vh);overflow:auto;overscroll-behavior:contain;background:var(--bg);border:1px solid var(--ink)}
.kd-list[hidden]{display:none}
.kd-list:focus-visible{outline:none}   /* the active option carries the highlight */
.kd-list li{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer}
.kd-list li.act{background:var(--bg-soft)}
.kd-list li[aria-selected=true]{background:var(--color-bg-accent-subtle)}
.kd-list li[aria-selected=true] .kd-av{background:var(--bg);color:var(--ink)}
.kd-list li[aria-disabled=true]{cursor:not-allowed}
.kd-list li[aria-disabled=true] .kd-t strong,.kd-list li[aria-disabled=true] .kd-av{opacity:.45}
.kd-list li[aria-disabled=true] .kd-t small{color:var(--danger)}
.kd-list .kd-new{margin-top:4px;border-top:1px solid var(--line);padding-block:14px;font:var(--ts-label-m)}
.kd-list .kd-new svg{flex:none;width:18px;height:18px}
.kd .err{margin:0}
.kd.bad .kd-btn{border-color:var(--danger);box-shadow:inset 0 0 0 1px var(--danger)}
.kd.bad .err{display:block}
.kd-note{margin:0;font:var(--ts-body-s);color:var(--ink-2)}
.kf{display:grid;gap:16px;padding:16px;border:1px solid var(--ink);background:var(--bg)}
.kf-h{margin:0;font:var(--ts-label-l)}
.kf-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.kf .field{margin:0}
.kf-row .field:has(> .dobp-pan:not([hidden])){grid-column:1/-1}   /* the open date-of-birth picker takes the full row */
.kf-hint{margin:8px 0 0;font:var(--ts-body-s);color:var(--ink-3)}
.kf .field.bad .kf-hint{display:none}
.kf-gen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.kf-gen button{height:48px;border:1px solid var(--line-strong);background:var(--bg);font:var(--ts-label-m);cursor:pointer}
.kf-gen button[aria-checked=true]{border-color:var(--color-brand);box-shadow:inset 0 0 0 1px var(--color-brand);background:var(--color-bg-accent-subtle);color:var(--color-content-primary)}
.kf .field.bad .kf-gen button{border-color:var(--danger)}
.kf-why{margin:0;font:var(--ts-body-s);color:var(--danger)}
.kf-acts{display:flex;align-items:center;gap:16px}
.kf-go{height:44px;padding:0 20px;border:0;background:var(--ink);color:var(--neutral-0);font:var(--ts-label-m);cursor:pointer}
.kf-go:disabled{background:var(--line);color:var(--ink-3);cursor:progress}
.kf-x{padding:0;border:0;background:none;color:var(--ink-2);font:var(--ts-label-m);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
@media (max-width:640px){.kf{padding:12px}.kf-row{grid-template-columns:minmax(0,1fr)}}
.kp{width:min(480px,calc(100vw - 32px));padding:0;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.kp::backdrop{background:var(--color-overlay,rgba(9,9,11,.6))}
.kp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 0}
.kp-head h2{margin:0;font:var(--ts-title-s);text-transform:var(--type-case-title)}
.kp-x{flex:none;display:grid;place-items:center;width:40px;height:40px;padding:0;border:1px solid var(--line-strong);background:var(--bg);cursor:pointer}
.kp-x svg{width:18px;height:18px}
.kp-body{display:grid;gap:16px;padding:16px 20px 20px}
.kp-body p{margin:0;font:var(--ts-body-m);color:var(--ink-2)}
.kp-who{display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--line)}
.kp-err{color:var(--danger)!important;font:var(--ts-body-s)!important}
.kp-acts{display:flex;gap:8px;padding:0 20px 20px}
.kp-acts button{flex:1;height:52px;font:var(--ts-label-l);text-transform:var(--type-case-label);cursor:pointer}
.kp-save{border:0;background:var(--brand);color:var(--neutral-0)}
.kp-save:hover:not(:disabled){background:var(--brand-600)}
.kp-save:disabled{background:var(--line);color:var(--ink-3);cursor:progress}
.kp-later{border:1px solid var(--line-strong);background:var(--bg);color:var(--ink)}
.kp-later:hover{border-color:var(--ink)}`;
  document.head.appendChild(css);

  // ---- the saved children, fresh from the server
  async function fresh(){
    try {
      const r = await fetch('/api/auth/participants', { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) return { status: 401, list: [] };
      const d = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, list: d.participants || [], limit: d.limit || window.SFA_CHILD.LIMIT } : { list: [], failed: true };
    } catch (e) { return { list: [], failed: true }; }
  }
  // tell other tabs (checkout, My account) that the list changed
  const ping = () => { try { localStorage.setItem('sfaKidsRev', String(Date.now())); } catch (e) {} };

  // ---- the dropdown. o: { id, label, value, placeholder, options: [{ value, name, sub, off }], add: label | null, err }
  function opt(x, on){ return `<span class="kd-av" aria-hidden="true">${esc(initials(x.name))}</span><span class="kd-t"><strong>${esc(x.name)}</strong><small>${esc(x.off || x.sub)}</small></span>`; }
  function dropdown(o){
    const sel = o.options.find(x => x.value === o.value && !x.off);
    return `<div class="kd" id="${o.id}" data-kd><span class="kd-l" id="${o.id}L">${esc(o.label)}</span>
      <button type="button" class="kd-btn" id="${o.id}B" aria-haspopup="listbox" aria-expanded="false" aria-controls="${o.id}List" aria-labelledby="${o.id}L ${o.id}B">
        <span class="kd-v">${sel ? opt(sel) : `<span class="kd-ph">${esc(o.placeholder)}</span>`}</span>${CHEV}</button>
      <ul class="kd-list" id="${o.id}List" role="listbox" tabindex="-1" aria-labelledby="${o.id}L" hidden>
        ${o.options.map((x, i) => `<li role="option" id="${o.id}-o${i}" data-v="${esc(x.value)}" aria-selected="${x === sel}"${x.off ? ' aria-disabled="true"' : ''}>${opt(x)}</li>`).join('')}
        ${o.add ? `<li role="option" class="kd-new" id="${o.id}-new" data-v="__new" aria-selected="false">${PLUS}<span>${esc(o.add)}</span></li>` : ''}
      </ul>${o.err ? `<p class="err">${esc(o.err)}</p>` : ''}</div>`;
  }
  // one set of listeners for every dropdown on the page
  const items = kd => [...kd.querySelectorAll('.kd-list li')];
  const enabled = kd => items(kd).filter(li => li.getAttribute('aria-disabled') !== 'true');
  function setAct(kd, li){ items(kd).forEach(x => x.classList.toggle('act', x === li)); const list = kd.querySelector('.kd-list');
    if (li){ list.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } else list.removeAttribute('aria-activedescendant'); }
  function open(kd){
    document.querySelectorAll('.kd-btn[aria-expanded=true]').forEach(b => b.closest('.kd') !== kd && close(b.closest('.kd')));
    const b = kd.querySelector('.kd-btn'), list = kd.querySelector('.kd-list');
    b.setAttribute('aria-expanded', 'true'); list.hidden = false;
    setAct(kd, items(kd).find(li => li.getAttribute('aria-selected') === 'true') || enabled(kd)[0]); list.focus({ preventScroll: true });
    kd.dispatchEvent(new CustomEvent('kd:open', { bubbles: true }));
  }
  function close(kd, focus){ if (!kd) return; const b = kd.querySelector('.kd-btn'), list = kd.querySelector('.kd-list'); if (!b) return;
    b.setAttribute('aria-expanded', 'false'); list.hidden = true; if (focus) b.focus(); }
  function pick(kd, li){ if (!li || li.getAttribute('aria-disabled') === 'true') return; close(kd, true);
    kd.dispatchEvent(new CustomEvent('kd:pick', { bubbles: true, detail: { value: li.dataset.v } })); }
  document.addEventListener('click', e => {
    const b = e.target.closest('.kd-btn');
    if (b){ const kd = b.closest('.kd'); b.getAttribute('aria-expanded') === 'true' ? close(kd, true) : open(kd); return; }
    const li = e.target.closest('.kd-list li'); if (li){ pick(li.closest('.kd'), li); return; }
    document.querySelectorAll('.kd-btn[aria-expanded=true]').forEach(x => close(x.closest('.kd')));
  });
  document.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.kd-btn');
    if (b && ['ArrowDown', 'ArrowUp'].includes(e.key)){ e.preventDefault(); open(b.closest('.kd')); return; }
    const list = e.target.closest && e.target.closest('.kd-list'); if (!list) return;
    const kd = list.closest('.kd'), en = enabled(kd), cur = kd.querySelector('.kd-list li.act'), i = en.indexOf(cur);
    if (e.key === 'ArrowDown'){ e.preventDefault(); setAct(kd, en[Math.min(en.length - 1, i + 1)]); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); setAct(kd, en[Math.max(0, i - 1)]); }
    else if (e.key === 'Home'){ e.preventDefault(); setAct(kd, en[0]); }
    else if (e.key === 'End'){ e.preventDefault(); setAct(kd, en[en.length - 1]); }
    else if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pick(kd, cur); }
    else if (e.key === 'Escape'){ e.preventDefault(); close(kd, true); }
    else if (e.key === 'Tab') close(kd);
  });

  // ---- the child form. p = id prefix, f = values, er = { first, last, dob, gender, _ }, o = { title, cancel, hint, go }
  function formHTML(p, f, er = {}, o = {}){
    const field = (k, label, extra) => `<div class="field${er[k] ? ' bad' : ''}" id="${p}${k}F"><label for="${p}${k}">${t(label)}</label><div class="input"><input id="${p}${k}" ${extra}></div>${k === 'dob' && o.hint ? `<p class="kf-hint" id="${p}dobH">${esc(o.hint)}</p>` : ''}<p class="err">${t(er[k] || '')}</p></div>`;
    return `<div class="kf" id="${p}Form" role="group" aria-labelledby="${p}H"><p class="kf-h" id="${p}H">${esc(o.title || t('Child details'))}</p>
      <div class="kf-row">${field('first', 'First name', `type="text" autocomplete="off" placeholder="${t('e.g. Yousef')}" value="${esc(f.first)}"`)}${field('last', 'Last name', `type="text" autocomplete="off" placeholder="${t('e.g. Al-Qahtani')}" value="${esc(f.last)}"`)}</div>
      <div class="kf-row">${field('dob', 'Date of birth', `type="date" data-dob value="${esc(f.dob)}"${o.min ? ` min="${o.min}"` : ''}${o.max ? ` max="${o.max}"` : ''}${o.hint ? ` aria-describedby="${p}dobH"` : ''}`)}
        <div class="field${er.gender ? ' bad' : ''}" id="${p}genderF"><span class="kd-l" id="${p}GL" style="display:block;margin-bottom:8px">${t('Gender')}</span><div class="kf-gen" role="radiogroup" aria-labelledby="${p}GL">${['female', 'male'].map(g => `<button type="button" role="radio" aria-checked="${f.gender === g}" data-kgen="${g}">${t(g === 'female' ? 'Female' : 'Male')}</button>`).join('')}</div><p class="err">${t(er.gender || '')}</p></div></div>
      ${er._ ? `<p class="kf-why" role="alert">${esc(er._)}</p>` : ''}
      <div class="kf-acts"><button type="button" class="kf-go" data-kgo>${esc(o.go || t('Continue'))}</button>${o.cancel ? `<button type="button" class="kf-x" data-kx>${t('Cancel')}</button>` : ''}</div></div>`;
  }
  const read = (p, f) => Object.assign(f, { first: document.getElementById(p + 'first').value, last: document.getElementById(p + 'last').value, dob: document.getElementById(p + 'dob').value });
  const tidy = f => ({ first: String(f.first || '').trim().replace(/\s+/g, ' '), last: String(f.last || '').trim().replace(/\s+/g, ' '), dob: f.dob, gender: f.gender });
  const errors = (c, on) => window.SFA_CHILD_ERRORS(c, on);
  // the youngest and oldest birthdays a 6–17-year-old can have on a given day
  const dobRange = on => { const d = toDate(on), k = x => window.SFA_TODAY(x), C = window.SFA_CHILD;
    return { max: k(new Date(d.getFullYear() - C.MIN, d.getMonth(), d.getDate())), min: k(new Date(d.getFullYear() - C.MAX - 1, d.getMonth(), d.getDate() + 1)) }; };

  // ---- "Save this child to your account?"
  let dlg = null, answer = null;
  function ensureDlg(){
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.className = 'kp'; dlg.id = 'kpDlg'; dlg.setAttribute('aria-labelledby', 'kpT'); dlg.setAttribute('aria-describedby', 'kpD');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { const b = e.target.closest('[data-kp]'); if (b && !b.disabled) done(b.dataset.kp); else if (e.target === dlg) done('later'); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); done('later'); });   // Esc = Not now
    return dlg;
  }
  function done(v){ if (!answer) return; const a = answer; answer = null; a(v); }
  function ask(c, err){
    const d = ensureDlg(); d.dir = document.documentElement.dir; const name = window.SFA_FULL_NAME(c);
    d.innerHTML = `<div class="kp-head"><h2 id="kpT">${t('Save this child to your account?')}</h2><button type="button" class="kp-x" data-kp="later" aria-label="${t('Close')}">${X}</button></div>
      <div class="kp-body"><p id="kpD">${t("Save them to My children and next time just pick them, without typing their details again.")}</p>
        <div class="kp-who"><span class="kd-av" aria-hidden="true">${esc(initials(name))}</span><span class="kd-t"><strong>${esc(name)}</strong><small>${t(c.gender === 'female' ? 'Female' : 'Male')} · ${t('Born {date}', { date: born(c.dob) })}</small></span></div>
        ${err ? `<p class="kp-err" role="alert">${esc(err)}</p>` : ''}</div>
      <div class="kp-acts"><button type="button" class="kp-save" data-kp="save">${t('Save')}</button><button type="button" class="kp-later" data-kp="later">${t('Not now')}</button></div>`;
    if (!d.open) d.showModal();
    d.querySelector('.kp-save').focus();
    return new Promise(res => { answer = res; });
  }
  const closeDlg = () => { if (dlg && dlg.open) dlg.close(); };

  // after a valid form: reuse a matching saved child, or ask, save (or not) and say which
  async function settle(c){
    const name = window.SFA_FULL_NAME(c), cur = await fresh();
    const match = cur.list.find(s => key(s) === key({ name, dob: c.dob }));
    if (match) return { ref: match.id, name: match.name, matched: true };
    if (cur.ok && cur.list.length >= cur.limit) return { child: c, name, note: t('You have {n} children saved, the most an account can hold, so {name} is booked without saving.', { n: cur.limit, name }) };
    let err = '';
    for (;;){
      const a = await ask(c, err);
      if (a !== 'save'){ closeDlg(); return { child: c, name }; }
      const btn = dlg.querySelector('.kp-save'); btn.disabled = true; btn.textContent = t('Saving…');
      let r, d = {};
      try { r = await fetch('/api/auth/participants', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ensure: c }) }); d = await r.json().catch(() => ({})); }
      catch (e) { err = t('Could not reach the server. Try again.'); continue; }
      if (r.status === 401){
        // the session ended while the prompt was open: keep the details, sign in, then ask again
        closeDlg();
        const u = await window.SFA_AUTH.open({ view: 'login', reason: t('Your session ended. Sign in to save {name}.', { name }) });   // not require(): its cached user is the expired one
        if (!u) return { child: c, name };
        err = ''; continue;
      }
      if (!r.ok){ const m = d.error || (d.errors && Object.values(d.errors)[0]) || 'Could not save. Try again.'; closeDlg(); return { child: c, name, note: t(m) }; }
      ping(); closeDlg();
      return { ref: d.id, name: (d.participants.find(x => x.id === d.id) || {}).name || name, saved: !d.existed, matched: !!d.existed };
    }
  }

  window.SFA_KIDS = { fresh, ping, dropdown, close, formHTML, read, tidy, errors, dobRange, settle, ask, key, born, initials, esc };
})();
