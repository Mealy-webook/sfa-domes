/* Court details page logic, shared by court-details.html and its design variants (court-details-a…d.html).
   Everything is found by id, so a variant can lay the same pieces out differently. */
(() => {
  const SPORTS = window.SFA_SPORTS, P = window.SFA_PREFS, t = P.t, money = P.money;
  const params = new URLSearchParams(location.search);
  const key = SPORTS[params.get('sport')] ? params.get('sport') : 'basketball';
  const sport = SPORTS[key], n = sport.courts.length;
  const ci = Math.min(Math.max(0, parseInt(params.get('court'), 10) || 0), n - 1);
  const court = sport.courts[ci], [name, kind, surface, format, size, price] = court;   // surface / size may be empty
  const $ = id => document.getElementById(id);
  const q = `sport=${encodeURIComponent(key)}&court=${ci}`;

  document.title = `${name} · ${sport.name} · SFA Domes`;
  $('aboutImg').src = window.SFA_COURT_IMG(key, court);
  $('aboutImg').alt = `${name}, ${kind.toLowerCase()}`;
  $('heroFav').outerHTML = window.SFA_AUTH.heart(`${key}|${ci}`, 'sfa-fav--lg');

  // everything that depends on language or currency; static labels are translated by f/prefs.js
  function paint(){
    $('eyebrow').innerHTML = '<span class="ico" aria-hidden="true">' + (sport.img ? `<img src="${sport.img}" alt="">` : `<span class="msi">${sport.icon}</span>`) + `</span>${t(sport.name)} · ${t('SFA Domes Dammam')}`;
    $('courtName').textContent = t(name);
    $('heroSub').textContent = [kind, surface, format, size].filter(Boolean).map(x => t(x)).join(' · ');
    $('heroPrice').innerHTML = P.money(price);
    $('aboutLead').textContent = sport.area === 'field'
      ? (key === 'rugby'
        ? t('Rugby is played on football fields F4 and F5 joined together, inside the SFA Domes Dammam dome. Book a 1.5-hour slot and check in at the front desk.')
        : t('{court} is part of our 5 indoor football fields. Play 5-a-side on any field, or book F4 and F5 together for 7-a-side. Book a 1.5-hour slot and check in at the front desk.', { court: t(name) }))
      : t('{court} is one of our 4 indoor multipurpose courts, set up for {sport}. Book a 1.5-hour slot and check in at the front desk.', { court: t(name), sport: t(sport.name) });
    $('stType').textContent = t(kind);
    const [o, c] = window.SFA_SCHEDULE.HOURS[new Date().getDay()];
    $('stHours').textContent = `${P.time(o)} – ${P.time(c)}`;
    // court hours for the Open today popup, today in bold
    const DAYS = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(2026, 0, 4 + i).toLocaleDateString(P.locale, { weekday: 'long' }));
    $('hoursPopList').innerHTML = window.SFA_SCHEDULE.HOURS.map(([o2, c2], i) => `<dt${i === new Date().getDay() ? ' class="today"' : ''}>${DAYS[i]}</dt><dd${i === new Date().getDay() ? ' class="today"' : ''} dir="ltr">${P.time(o2)} – ${P.time(c2)}</dd>`).join('');
  }
  // Open today → popup with every day's hours; closes on ×, the backdrop or Esc
  const pop = $('hoursPop'), hoursBtn = $('stHoursBtn');
  const setPop = on => { pop.hidden = !on; if (on) pop.querySelector('.hrs-x').focus(); else hoursBtn.focus(); };
  hoursBtn.addEventListener('click', () => setPop(true));
  hoursBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); setPop(true); } });
  pop.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => setPop(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) setPop(false); });
  paint();
  addEventListener('sfa:prefs', paint);

  // Share: the system share sheet where there is one, otherwise copy the page link
  $('shareBtn').addEventListener('click', async () => {
    const url = location.origin + location.pathname + location.search, title = document.title;
    if (navigator.share){ try { await navigator.share({ title, url }); } catch (e) {} return; }
    // clipboard API first; older browsers (or an unfocused page) fall back to a hidden field + copy command
    const legacy = () => { const f = document.createElement('textarea'); f.value = url; f.setAttribute('readonly', ''); f.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(f); f.select(); const ok = document.execCommand('copy'); f.remove(); return ok; };
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { ok = legacy(); }
    window.SFA_AUTH.toast(P.t(ok ? 'Link copied' : 'Could not copy the link'));
  });

  // Book this court: jump to the calendar on this page. 'sfa:show-book' lets a layout reveal it first (e.g. a Book tab).
  const jumpToBook = () => {
    document.dispatchEvent(new Event('sfa:show-book'));
    $('book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  document.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', jumpToBook));
  // <body data-go-always>: the bottom bar shows from the start ("From" price) and, before any picks, jumps to the calendar
  const goAlways = document.body.hasAttribute('data-go-always');


  // ---- Days & times (moved in from book.html): month calendar, 1.5 hr slots per day, summary
  const { SLOT, RANGE_DAYS, startsFor } = window.SFA_SCHEDULE;   // real court hours per weekday, shared with server.js
  const SLOT_PRICE = price * SLOT / 60;


  // ---- dates
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Date(today); last.setDate(last.getDate() + RANGE_DAYS - 1);
  const pad = n => String(n).padStart(2, '0');
  const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = d => P.date(d, 'short'), fmtLong = d => P.date(d, 'long'), fmtTime = P.time;
  // each time keeps its own words together (no-break spaces), so a narrow slot button wraps only after the dash
  const fmtSlot = s => `${fmtTime(s).replace(/ /g, '\u00a0')}\u00a0– ${fmtTime(s + SLOT).replace(/ /g, '\u00a0')}`;

  // ---- availability: placeholder bookings (f/courts-data.js) plus slots already paid for through checkout (server.js)
  const paid = new Set();             // 'YYYY-MM-DD|start'
  const isBooked = (k, s) => paid.has(`${k}|${s}`) || window.SFA_IS_BOOKED(key, ci, k, s) || !!window.SFA_IS_LADIES?.(key, ci, k, s);
  const isPast = (k, s) => { if (k !== dk(today)) return false; const n = new Date(); return s <= n.getHours() * 60 + n.getMinutes(); };
  const free = (k, s) => !isBooked(k, s) && !isPast(k, s);

  // ---- state: picked slots per day, the day whose times are showing, the month on the calendar
  const picks = new Map();            // 'YYYY-MM-DD' -> Set of slot starts (minutes)
  let active = dk(today);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const minView = new Date(today.getFullYear(), today.getMonth(), 1), maxView = new Date(last.getFullYear(), last.getMonth(), 1);
  // 'sfa:render' tells a layout the open day and the picks changed (court-details-k.html draws its court grid from it)
  const notify = () => document.dispatchEvent(new CustomEvent('sfa:render', { detail: { active, picks } }));

  // ---- calendar: day buttons in weeks of 7; the open day's slots fold out in a row right under its week.
  // A layout can ask for other pickers on #calGrid (the benchmark designs):
  //   data-picker="strip"  a scrolling row of the next 90 days instead of the month, times underneath
  //   data-slots="pill"    start time + slot price · "chip" start times only, no Morning/Afternoon groups
  //                "row"   one row per slot: time, length, price and an Add button
  //   data-times="side"    (month picker) the open day's times go in #sideTimes beside the calendar, not under its week
  //   data-groups="none"   one list of times, without the Morning / Afternoon / Evening headings
  const calGrid = $('calGrid');
  const MODE = calGrid.dataset.picker || 'month', SLOTS = calGrid.dataset.slots || 'grid';
  const SIDE = MODE === 'month' && calGrid.dataset.times === 'side' ? $('sideTimes') : null;
  const FLAT = SLOTS === 'chip' || calGrid.dataset.groups === 'none';
  const dayCell = (date, k) => {
    const out = date < today || date > last, n = picks.has(k) ? picks.get(k).size : 0;
    if (MODE === 'strip'){
      const cls = ['day', 'sday', k === dk(today) ? 'today' : '', n ? 'picked' : '', k === active ? 'active' : ''].join(' ');
      return `<button class="${cls}" type="button" data-k="${k}" aria-pressed="${k === active}" aria-label="${fmtLong(date)}${n ? ` · ${n}` : ''}">` +
        `<small>${P.date(date, { weekday: 'short' })}</small><b>${date.getDate()}</b><small>${P.date(date, { month: 'short' })}</small>${n ? `<i>${n}</i>` : ''}</button>`;
    }
    const cls = ['day', k === dk(today) ? 'today' : '', n ? 'picked' : '', k === active ? 'active' : ''].join(' ');
    return `<button class="${cls}" type="button" data-k="${k}"${out ? ' disabled' : ''} aria-expanded="${k === active}" aria-label="${fmtLong(date)}${n ? ` · ${n}` : ''}">${date.getDate()}${n ? `<small>${n}×</small>` : ''}</button>`;
  };
  function slotsHTML(k){
    const set = picks.get(k);
    const STARTS = startsFor(k);
    const groups = [['Morning', 0, 12 * 60], ['Afternoon', 12 * 60, 17 * 60], ['Evening', 17 * 60, Infinity]];
    let shown = 0;
    const slotBtn = s => {
      // ladies hours (f/courts-data.js): women-only on Courts 1 and 2, booked from ladies-hours.html, so shown as taken here
      const lad = !!window.SFA_IS_LADIES?.(key, ci, k, s), bk = lad || isBooked(k, s), on = !!(set && set.has(s)), why = t(lad ? 'Ladies hours' : 'Booked');
      const cls = bk ? (lad ? ' ladies' : ' booked') : '';
      const attrs = `type="button" data-s="${s}" aria-pressed="${on}"${bk ? ' disabled aria-label="' + fmtSlot(s) + ' · ' + why + '"' : ''}`;
      if (SLOTS === 'pill') return `<button class="slot pill${cls}" ${attrs}><b>${fmtTime(s)}</b><small>${bk ? why : money(SLOT_PRICE)}</small></button>`;
      if (SLOTS === 'chip') return `<button class="slot chip${cls}" ${attrs}>${fmtTime(s)}</button>`;
      if (SLOTS === 'row') return `<button class="slot srow${cls}" ${attrs}><span class="sr-time">${fmtSlot(s)}</span>` +
        `<span class="sr-meta">${t('1.5 hrs')} · ${t(name)}</span><span class="sr-price">${money(SLOT_PRICE)}</span>` +
        `<span class="sr-act">${bk ? why : `<span class="sr-add">${t('Add')}</span><span class="sr-on">${t('Added')}</span>`}</span></button>`;
      return `<button class="slot${cls}" ${attrs}>${lad ? `<span>${fmtSlot(s)}<small class="lad-tag">${why}</small></span>` : fmtSlot(s)}</button>`;
    };
    let html;
    if (FLAT){
      const list = STARTS.filter(s => !isPast(k, s)); shown = list.length;
      html = list.length ? `<div class="slots${SLOTS === 'chip' ? ' chips' : SLOTS === 'row' ? ' rows' : ''}">${list.map(slotBtn).join('')}</div>` : '';
    } else html = groups.map(([label, a, b]) => {
      const list = STARTS.filter(s => s >= a && s < b && !isPast(k, s)); if (!list.length) return '';
      shown += list.length;
      return `<div class="period"><h3>${t(label)}</h3><div class="slots${SLOTS === 'row' ? ' rows' : ''}">${list.map(slotBtn).join('')}</div></div>`;
    }).join('');
    if (!shown) html = `<p class="empty">${t('No more slots today. Pick another day.')}</p>`;
    else if (!STARTS.some(s => free(k, s))) html = `<p class="empty" style="margin-bottom:16px">${t('This day is fully booked. Try another day.')}</p>` + html;
    return `<div class="slots-head"><p class="slots-day">${fmtLong(fromKey(k))}</p><button class="linkbtn" id="clearDay" type="button"${set ? '' : ' hidden'}>${t('Clear this day')}</button></div>${html}`;
  }
  // strip picker: all bookable days in one scrolling row (built once, so its scroll position survives), times below
  function renderStrip(animate, reveal){
    $('calMonth').textContent = P.date(active ? fromKey(active) : today, 'month');
    let strip = calGrid.querySelector('.strip');
    if (!strip){ calGrid.innerHTML = '<div class="strip"></div><div class="cal-times" id="calTimes" role="region"></div>'; strip = calGrid.querySelector('.strip'); reveal = true; }
    const cells = []; for (let d = new Date(today); d <= last; d.setDate(d.getDate() + 1)) cells.push(dayCell(new Date(d), dk(d)));
    const left = strip.scrollLeft; strip.innerHTML = cells.join(''); strip.scrollLeft = left;
    const times = $('calTimes');
    times.innerHTML = active ? slotsHTML(active) : `<p class="empty">${t('Pick a day to see its times.')}</p>`;
    times.setAttribute('aria-label', active ? t('Times for {date}', { date: fmtLong(fromKey(active)) }) : '');
    times.classList.remove('open'); if (animate){ void times.offsetWidth; times.classList.add('open'); }
    if (reveal && active){ const b = strip.querySelector(`[data-k="${active}"]`); if (b) strip.scrollLeft = b.offsetLeft - strip.clientWidth / 2 + b.offsetWidth / 2 - strip.offsetLeft; }
    notify();
  }
  function toggleSlot(k, s){
    let set = picks.get(k); if (!set){ set = new Set(); picks.set(k, set); }
    set.has(s) ? set.delete(s) : set.add(s);
    const on = set.has(s); if (!set.size) picks.delete(k);
    return on;
  }
  function renderCal(animate){
    if (MODE === 'strip') return renderStrip(animate);
    $('calMonth').textContent = P.date(view, 'month');
    $('calPrev').disabled = view <= minView; $('calNext').disabled = view >= maxView;
    const lead = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    // weekday initials in the page language (4 Jan 2026 is a Sunday)
    let html = [0, 1, 2, 3, 4, 5, 6].map(i => `<span class="cal-dow" aria-hidden="true">${new Date(2026, 0, 4 + i).toLocaleDateString(P.locale, { weekday: P.lang === 'ar' ? 'long' : 'short' }).slice(0, P.lang === 'ar' ? 99 : 2)}</span>`).join('');
    for (let w = 0; w < cells.length; w += 7){
      const week = cells.slice(w, w + 7);
      html += week.map(date => date ? dayCell(date, dk(date)) : '<span aria-hidden="true"></span>').join('');
      const open = !SIDE && week.find(date => date && dk(date) === active);
      if (open) html += `<div class="cal-times${animate ? ' open' : ''}" id="calTimes" role="region" aria-label="${t('Times for {date}', { date: fmtLong(open) })}" style="--col:${open.getDay()}">${slotsHTML(active)}</div>`;
    }
    calGrid.innerHTML = html;
    if (SIDE){
      SIDE.innerHTML = active ? slotsHTML(active) : `<p class="empty">${t('Pick a day to see its times.')}</p>`;
      SIDE.classList.remove('open'); if (animate){ void SIDE.offsetWidth; SIDE.classList.add('open'); }
    }
    notify();
  }
  // a day cell's count and colour after its slots change, without rebuilding the calendar (so the open row doesn't replay its animation)
  function refreshDay(k){
    const b = calGrid.querySelector(`.day[data-k="${k}"]`); if (!b) return;
    b.outerHTML = dayCell(fromKey(k), k);
    const c = $('clearDay'); if (c) c.hidden = !picks.has(k);
  }
  const onCalClick = e => {
    const day = e.target.closest('.day'), slot = e.target.closest('.slot');
    if (day && !day.disabled){
      if (MODE === 'strip'){ if (active !== day.dataset.k){ active = day.dataset.k; renderStrip(true); } return; }
      if (SIDE){ if (active !== day.dataset.k){ active = day.dataset.k; renderCal(true); } return; }
      active = active === day.dataset.k ? null : day.dataset.k;   // tapping the open day folds it away
      renderCal(true); return;
    }
    if (slot && !slot.disabled){
      const on = toggleSlot(active, +slot.dataset.s);
      slot.setAttribute('aria-pressed', on);
      refreshDay(active); summary(); return;
    }
    if (e.target.closest('#clearDay')){ picks.delete(active); renderCal(); summary(); }
  };
  calGrid.addEventListener('click', onCalClick);
  if (SIDE) SIDE.addEventListener('click', onCalClick);
  // month arrows; in the strip they scroll it by most of its width (flipped for right-to-left)
  const stripBy = d => { const st = calGrid.querySelector('.strip'); st.scrollBy({ left: d * st.clientWidth * 0.8 * (document.documentElement.dir === 'rtl' ? -1 : 1), behavior: 'smooth' }); };
  $('calPrev').addEventListener('click', () => { if (MODE === 'strip') return stripBy(-1); view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  $('calNext').addEventListener('click', () => { if (MODE === 'strip') return stripBy(1); view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });

  // ---- summary
  // "1 day · 2 slots · 3 hrs" in English (singular where it's 1); Arabic uses its own template
  const counts = (d, s, h) => P.lang === 'ar'
    ? (h == null ? t('{d} days · {s} slots', { d, s }) : t('{d} days · {s} slots · {h} hrs', { d, s, h }))
    : `${d} ${d === 1 ? 'day' : 'days'} · ${s} ${s === 1 ? 'slot' : 'slots'}` + (h == null ? '' : ` · ${h} ${h === 1 ? 'hr' : 'hrs'}`);
  const sorted = () => [...picks.keys()].sort();
  const count = () => [...picks.values()].reduce((a, s) => a + s.size, 0);
  function summary(){
    const keys = sorted(), n = count(), total = n * SLOT_PRICE;
    $('sumCount').textContent = n ? counts(keys.length, n) : '';
    $('sumDays').innerHTML = !keys.length ? `<p class="sum-empty">${t('No times picked yet. Tap a day, then pick one or more slots.')}</p>` :
      `<ul class="sum-days">${keys.map(k => {
        const set = [...picks.get(k)].sort((a, b) => a - b);
        return `<li class="sum-day"><button class="go-day" type="button" data-k="${k}">${fmtDay(fromKey(k))}</button><span class="sub">${money(set.length * SLOT_PRICE)}</span>
          <button class="rm" type="button" data-k="${k}" aria-label="${t('Remove {date}', { date: fmtDay(fromKey(k)) })}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          <ul>${set.map(s => `<li>${fmtSlot(s)}</li>`).join('')}</ul></li>`;
      }).join('')}</ul>`;
    const hrs = n * SLOT / 60;
    $('sumRows').innerHTML = `<dt>${t('Price')}</dt><dd>${money(price)} ${t('/ hr')} · ${money(SLOT_PRICE)} ${t('/ slot')}</dd><dt>${t('Play time')}</dt><dd>${n ? t('{h} hours', { h: hrs }) : '—'}</dd>`;
    $('sumTotal').innerHTML = money(total);
    $('goTotal').innerHTML = n || !goAlways ? money(total) : `<small class="go-from">${t('From')}</small> ${money(price)}`;
    $('goWhen').textContent = n ? counts(keys.length, n, hrs) : t('{name} · pick days and times', { name: t(name) });
    $('go').classList.toggle('on', n > 0 || goAlways); document.body.classList.toggle('has-picks', n > 0);
    [$('bookBtn'), $('goBtn')].forEach(b => { b.disabled = !n; b.innerHTML = n ? `<span>${t('Book · {total}', { total: money(total) })}</span>` : t('Pick a time'); });
    if (goAlways && !n){ $('goBtn').disabled = false; $('goBtn').innerHTML = `<span>${t('Book this court')}</span>`; }
    notify();
  }
  $('sumDays').addEventListener('click', e => {
    const rm = e.target.closest('.rm'), go = e.target.closest('.go-day');
    if (rm){ picks.delete(rm.dataset.k); renderCal(); summary(); return; }
    if (go){ active = go.dataset.k; const d = fromKey(active); view = new Date(d.getFullYear(), d.getMonth(), 1); if (MODE === 'strip') renderStrip(true, true); else renderCal(true); ($('calTimes') || SIDE)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  });

  // ---- book: hand the order to checkout.html (same tab, via sessionStorage); the server re-prices it there.
  // Booking needs an account: signed-out players sign in (or sign up) first.
  async function book(){
    if (!count()){ if (goAlways) jumpToBook(); return; }
    const u = await window.SFA_AUTH.require(t('Sign in or create an account to book {court}.', { court: t(name) })); if (!u) return;
    const order = {
      sport: key, court: ci,
      days: sorted().map(k => ({ date: k, starts: [...picks.get(k)].sort((a, b) => a - b) })),
      bookingFor: prevFor   // chosen on checkout; kept if they come back here to change the times
    };
    try { sessionStorage.setItem('sfaOrder', JSON.stringify(order)); } catch (e) {}
    location.href = 'checkout.html';
  }
  // for layouts with their own slot UI: toggle a slot, check one, open a day
  window.SFA_DETAILS = {
    key, court: ci, free, isBooked, isPast, startsFor, SLOT_PRICE,
    toggle(k, s){ if (!free(k, s) && !(picks.get(k) || new Set()).has(s)) return; toggleSlot(k, s); if (MODE === 'strip') renderStrip(); else renderCal(); summary(); },
    open(k){ active = k; const d = fromKey(k); view = new Date(d.getFullYear(), d.getMonth(), 1); if (MODE === 'strip') renderStrip(true, true); else renderCal(true); }
  };
  $('bookBtn').addEventListener('click', book);
  $('goBtn').addEventListener('click', book);

  // slots already paid through checkout show as booked (only when served by server.js; the static server has no API)
  fetch(`/api/booked?sport=${encodeURIComponent(key)}&court=${ci}`).then(r => r.ok ? r.json() : []).then(list => {
    list.forEach(x => paid.add(x)); if (list.length){ renderCal(); }
  }).catch(() => {});

  // ---- back from checkout ("Edit booking"): put the same order back
  let prevFor;
  try {
    const o = JSON.parse(sessionStorage.getItem('sfaOrder'));
    if (o && o.sport === key && o.court === ci){
      prevFor = o.bookingFor;
      o.days.forEach(d => { const k = d.date, dt = fromKey(k); if (dt >= today && dt <= last) picks.set(k, new Set(d.starts.filter(s => !isPast(k, s)))); });
      [...picks].forEach(([k, set]) => { if (!set.size) picks.delete(k); });
      const firstKey = sorted()[0]; if (firstKey){ active = firstKey; const d = fromKey(firstKey); view = new Date(d.getFullYear(), d.getMonth(), 1); }
    }
  } catch (e) {}

  if (MODE === 'strip') renderStrip(false, true); else renderCal();
  summary();
  addEventListener('sfa:prefs', () => { renderCal(); summary(); });


  // the map only takes clicks and the scroll wheel after you ask for it
  $('locMap').querySelector('.loc-cover').addEventListener('click', () => { $('locMap').classList.add('live'); $('locMap').querySelector('iframe').tabIndex = 0; });
})();
