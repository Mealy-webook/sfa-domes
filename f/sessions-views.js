/* Review: layouts for checkout's "Your sessions" block (training programs), shared by sessions-options.html and
   checkout.html?sv=a…j so both show exactly the same thing. Styles: f/sessions-views.css. Remove once Ahmed has picked.

   window.SFA_SESSION_VIEWS
     .list                 [[key, name, why]] in order (a…j)
     .render(key, ctx)     the card body's HTML. ctx = { list: ['YYYY-MM-DD'…], p: program, time: start minute,
                           t(s, params), date(Date, opts | 'month'), timeFmt(min), locale, lang }
   "Show all" buttons carry data-svmore + data-label; the page toggles the [data-fold] items inside the same body. */
(() => {
  const toDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const more = label => `<button type="button" class="pk-more sv-more" data-svmore data-label="${label}">${label}</button>`;

  const LIST = [
    ['a', 'Summary first', 'The four facts that matter up front; the dates only when asked for. Shortest at any plan length.'],
    ['b', 'Month calendar', 'A small month grid per month with every session day marked; the start day is solid.'],
    ['c', 'Week by week', 'One row per week with its dates as chips. Shows the rhythm and keeps 36 sessions to 12 rows.'],
    ['d', 'Date strip', 'A swipeable row of date tiles, like the court page’s day strip. Compact, but the full run needs scrolling.'],
    ['e', 'Grouped by month', 'Today’s numbered list, grouped under month headings with a count each; the time is said once.'],
    ['f', 'Weekly pattern', 'Leads with the habit (“every Sun, Tue & Thu”) on a 7-day row, then the first and last session. Dates on request.'],
    ['g', 'Timeline', 'One track from the first session to the last, a tick per session and the months marked. Shows length at a glance.'],
    ['h', 'Soonest first', 'The next three sessions in full (what you need first), then “+ 33 more until …”. The rest on request.'],
    ['i', 'Week × day table', 'Weeks as rows, training days as columns, the date in each cell. Scans like a timetable.'],
    ['j', 'Season grid', 'Every week as a column of seven days, sessions filled, months labelled. The whole run in one small block.'],
  ];

  function render(v, c){
    const { list, p, time, t, date } = c, first = list[0], last = list[list.length - 1], n = list.length;
    const fmt = (k, o) => date(toDate(k), o);
    const range = `<bdi>${c.timeFmt(time)}</bdi> – <bdi>${c.timeFmt(time + p.minutes)}</bdi>`;
    const dayLabel = d => date(new Date(2026, 10, 1 + d), { weekday: 'short' });   // 1 Nov 2026 is a Sunday
    const dayNames = () => { const a = p.days.map(dayLabel); return a.length > 1 ? `${a.slice(0, -1).join(c.lang === 'ar' ? '، ' : ', ')} ${c.lang === 'ar' ? 'و' : '&'} ${a[a.length - 1]}` : a[0]; };
    const lead = `<p class="pk-note">${n > 1 ? t('{n} sessions', { n }) : t('Your free trial session.')} · ${range}</p>`;
    const chips = (fold) => `<div class="sv-chips${fold ? ' sv-gap' : ''}"${fold ? ' data-fold hidden' : ''}>${list.map(k => `<span${k === first ? ' class="on"' : ''}>${fmt(k, { weekday: 'short', day: 'numeric', month: 'short' })}</span>`).join('')}</div>`;
    const weeks = () => { const w = {}; list.forEach(k => { const d = toDate(k), s = new Date(d); s.setDate(d.getDate() - d.getDay()); (w[key(s)] = w[key(s)] || { s, l: [] }).l.push(k); }); return Object.values(w); };
    const span = (a, b) => `${fmt(a, { day: 'numeric', month: 'short' })}${b && b !== a ? ` – ${fmt(b, { day: 'numeric', month: 'short' })}` : ''}`;

    switch (v){
      case 'a': return `<dl class="sv-facts"><div><dt>${t('Sessions')}</dt><dd>${t('{n} × {m} min', { n, m: p.minutes })}</dd></div><div><dt>${t('Days')}</dt><dd>${dayNames()}</dd></div>
          <div><dt>${t('Time')}</dt><dd>${range}</dd></div><div><dt>${t('Dates')}</dt><dd>${span(first, last)}</dd></div></dl>
        ${n > 1 ? chips(true) + more(t('Show all {n} dates', { n })) : ''}`;

      case 'b': { const set = new Set(list), months = [...new Set(list.map(k => k.slice(0, 7)))];
        return lead + `<div class="sv-months">${months.map(mk => { const [y, m] = mk.split('-').map(Number), f1 = new Date(y, m - 1, 1), dn = new Date(y, m, 0).getDate();
          let g = [0, 1, 2, 3, 4, 5, 6].map(i => `<span class="dow">${new Date(2026, 0, 4 + i).toLocaleDateString(c.locale, { weekday: 'narrow' })}</span>`).join('') + '<span></span>'.repeat(f1.getDay());
          for (let d = 1; d <= dn; d++){ const k = `${mk}-${String(d).padStart(2, '0')}`; g += `<span class="${set.has(k) ? (k === first ? 'on first' : 'on') : ''}">${d}</span>`; }
          return `<div class="sv-mo"><h3>${date(f1, 'month')}</h3><div class="sv-grid">${g}</div></div>`; }).join('')}</div>
          <div class="sv-key"><span><i class="k1"></i>${t('First session')}</span><span><i class="k2"></i>${t('Session')}</span></div>`; }

      case 'c': { const rows = weeks(), fold = rows.length > 4;
        return lead + `<ol class="sv-weeks">${rows.map((r, i) => { const e = new Date(r.s); e.setDate(e.getDate() + 6);
          return `<li${fold && i >= 4 ? ' data-fold hidden' : ''}><span><b>${t('Week {n}', { n: i + 1 })}</b><small>${span(key(r.s), key(e))}</small></span><div class="sv-chips">${r.l.map(k => `<span${k === first ? ' class="on"' : ''}>${fmt(k, { weekday: 'short', day: 'numeric' })}</span>`).join('')}</div></li>`; }).join('')}</ol>
          ${fold ? more(t('Show all {n} weeks', { n: rows.length })) : ''}`; }

      case 'd': return lead + `<div class="sv-strip">${list.map(k => { const d = toDate(k); return `<div class="sv-tile${k === first ? ' on' : ''}"><small>${date(d, { weekday: 'short' })}</small><b>${d.getDate()}</b><em>${date(d, { month: 'short' })}</em></div>`; }).join('')}</div>
        ${n > 1 ? `<div class="sv-ends"><span>${t('First: {d}', { d: fmt(first, { weekday: 'short', day: 'numeric', month: 'short' }) })}</span><span>${t('Last: {d}', { d: fmt(last, { weekday: 'short', day: 'numeric', month: 'short' }) })}</span></div>` : ''}`;

      case 'e': { const by = {}; list.forEach((k, i) => (by[k.slice(0, 7)] = by[k.slice(0, 7)] || []).push([k, i])); const fold = n > 12;
        return lead + `<div class="sv-tl">${Object.entries(by).map(([mk, l]) => `<div${fold && l[0][1] >= 12 ? ' data-fold hidden' : ''}><h3>${date(toDate(mk + '-01'), 'month')}<small>${t('{n} sessions', { n: l.length })}</small></h3><ol>${l.map(([k, i]) => `<li><i>${String(i + 1).padStart(2, '0')}</i><b>${fmt(k, { weekday: 'short', day: 'numeric' })}</b><span><bdi>${c.timeFmt(time)}</bdi></span></li>`).join('')}</ol></div>`).join('')}</div>
          ${fold ? more(t('Show all {n} sessions', { n })) : ''}`; }

      case 'f': { const on = new Set(n > 1 ? p.days : [toDate(first).getDay()]);
        return `<div class="sv-pat"><div class="sv-week" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6].map(d => `<span${on.has(d) ? ' class="on"' : ''}>${new Date(2026, 0, 4 + d).toLocaleDateString(c.locale, { weekday: 'narrow' })}</span>`).join('')}</div>
            <div class="sv-pat-txt"><b>${n > 1 ? t('Every {days}', { days: dayNames() }) : fmt(first, { weekday: 'long', day: 'numeric', month: 'long' })}</b><span>${range} · ${t('{m} min', { m: p.minutes })}</span></div></div>
          ${n > 1 ? `<div class="sv-run"><div><small>${t('First session')}</small><b>${fmt(first, { weekday: 'short', day: 'numeric', month: 'short' })}</b></div><div class="sv-run-mid"><span>${t('{n} sessions', { n })}</span></div><div><small>${t('Last session')}</small><b>${fmt(last, { weekday: 'short', day: 'numeric', month: 'short' })}</b></div></div>
            ${chips(true)}${more(t('Show all {n} dates', { n }))}` : ''}`; }

      case 'g': { const a = toDate(first).getTime(), z = toDate(last).getTime(), len = Math.max(1, z - a), at = k => ((toDate(k).getTime() - a) / len) * 100;
        const months = []; for (let d = new Date(toDate(first).getFullYear(), toDate(first).getMonth() + 1, 1); d.getTime() <= z; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
        return lead + `<div class="sv-track"><div class="sv-line"></div>${n > 1 ? list.map(k => `<i class="${k === first ? 'on' : ''}" style="inset-inline-start:${at(k).toFixed(2)}%"></i>`).join('') : '<i class="on" style="inset-inline-start:0"></i>'}
            ${months.map(m => `<span class="sv-mk" style="inset-inline-start:${at(key(m)).toFixed(2)}%">${date(m, { month: 'short' })}</span>`).join('')}</div>
          <div class="sv-ends"><span>${fmt(first, { weekday: 'short', day: 'numeric', month: 'short' })}</span>${n > 1 ? `<span>${t('{w} weeks', { w: Math.ceil((z - a + 864e5) / 6048e5) })}</span><span>${fmt(last, { weekday: 'short', day: 'numeric', month: 'short' })}</span>` : ''}</div>`; }

      case 'h': { const top = list.slice(0, 3), rest = list.slice(3);
        return `<ol class="sv-next">${top.map((k, i) => `<li${i ? '' : ' class="on"'}><span class="sv-n">${i + 1}</span><span><b>${fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })}</b><small>${range}</small></span>${i ? '' : `<em>${t('First')}</em>`}</li>`).join('')}
            ${rest.map((k, i) => `<li data-fold hidden><span class="sv-n">${i + 4}</span><span><b>${fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })}</b><small>${range}</small></span></li>`).join('')}</ol>
          ${rest.length ? `<p class="sv-rest">${t('+ {n} more sessions until {d}', { n: rest.length, d: fmt(last, { weekday: 'short', day: 'numeric', month: 'short' }) })}</p>${more(t('Show all {n} sessions', { n }))}` : ''}`; }

      case 'i': { const rows = weeks(), cols = n > 1 ? p.days : [toDate(first).getDay()], fold = rows.length > 4;
        return lead + `<table class="sv-table"><thead><tr><th scope="col">${t('Week')}</th>${cols.map(d => `<th scope="col">${dayLabel(d)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r, i) => `<tr${fold && i >= 4 ? ' data-fold hidden' : ''}><th scope="row">${i + 1}</th>${cols.map(d => { const k = r.l.find(x => toDate(x).getDay() === d); return `<td${k === first ? ' class="on"' : ''}>${k ? fmt(k, { day: 'numeric', month: 'short' }) : '–'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
          ${fold ? more(t('Show all {n} weeks', { n: rows.length })) : ''}`; }

      case 'j': { const rows = weeks(), set = new Set(list);
        let lastM = -1;
        const cols = rows.map(r => { const m = r.s.getMonth(), lab = m !== lastM ? date(new Date(r.s.getFullYear(), m, 1), { month: 'short' }) : ''; lastM = m;
          return `<div class="sv-col"><small>${lab}</small>${[0, 1, 2, 3, 4, 5, 6].map(d => { const x = new Date(r.s); x.setDate(x.getDate() + d); const k = key(x); return `<i class="${set.has(k) ? (k === first ? 'on first' : 'on') : ''}" title="${set.has(k) ? fmt(k, { weekday: 'short', day: 'numeric', month: 'short' }) : ''}"></i>`; }).join('')}</div>`; }).join('');
        return lead + `<div class="sv-season"><div class="sv-col sv-days"><small></small>${[0, 1, 2, 3, 4, 5, 6].map(d => `<span>${p.days.includes(d) ? dayLabel(d) : ''}</span>`).join('')}</div>${cols}</div>
          <div class="sv-key"><span><i class="k1"></i>${t('First session')}</span><span><i class="k2"></i>${t('Session')}</span><span>${span(first, last)}</span></div>`; }
    }
    return '';
  }
  window.SFA_SESSION_VIEWS = { list: LIST, render };
})();
