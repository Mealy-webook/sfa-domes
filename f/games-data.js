/* Open games (SAMPLE until the venue sends its real schedule, Ahmed 2026-11-09): games SFA Domes runs on its own courts.
   Each game is for adults (18+) or for kids (6–17) (Ahmed, 2026-11-11; levels were removed). A player takes one spot and
   pays their share of the court; you book for yourself (adult games) or for one of your children (kids' games), and each
   person's first open game is free. Each game sits on a slot the
   placeholder availability already shows as booked (SFA_IS_BOOKED), never on a ladies-hours court, so it never clashes
   with a court booking. The same date gives the same games everywhere: the pages and server.js both load this file.

   window.SFA_GAME_SPORTS           sport → { spots, format }
   window.SFA_GAMES_ON(dateKey)     the games on that day, by start time: { id, sport, court, date, start, who, spots, format, price, base }
   window.SFA_GAME_WHO              who → { min, max, label }: 'adults' 18+, 'kids' 6–17
   window.SFA_GAME_FITS(game, person) null when that person (with dob) can play it, else 'age'
   window.SFA_GAME(id)              one game by id ('sport|court|date|start'), or null when there's no such game
   window.SFA_GAME_DAYS(n, from)    the next n days ('YYYY-MM-DD'), today first
   base = spots already taken by players who booked at the desk (placeholder); server.js adds the online bookings.
   Needs f/courts-data.js. */
(() => {
  window.SFA_GAME_SPORTS = {
    football:   { spots: 10, format: '5 v 5' },
    basketball: { spots: 10, format: '5 v 5' },
    volleyball: { spots: 12, format: '6 v 6' },
    futsal:     { spots: 10, format: '5 v 5' },
    badminton:  { spots: 4, format: 'Doubles' },
  };
  window.SFA_GAME_WHO = { adults: { min: 18, max: 120, label: 'Adults (18+)' }, kids: { min: 6, max: 17, label: 'Kids 6–17' } };
  const H = s => window.SFA_HASH('game|' + s);
  const courtsFor = sport => window.SFA_SPORTS[sport].courts.map((c, i) => i)
    .filter(i => !(window.SFA_SPORTS[sport].area === 'mp' && window.SFA_LADIES.courts.includes(i)))   // not Courts 1 and 2 (ladies hours)
    .filter(i => !(sport === 'football' && i === 5));                                                 // 5-a-side fields only
  const make = (sport, court, date, start) => {
    const g = window.SFA_GAME_SPORTS[sport], c = window.SFA_SPORTS[sport].courts[court], id = `${sport}|${court}|${date}|${start}`;
    // kids' games only in the earlier evening slots (before 7 PM), about half of them
    const who = start < 19 * 60 && H(id + 'a') < 0.5 ? 'kids' : 'adults';
    return { id, sport, court, date, start, who, spots: g.spots, format: g.format,
      price: Math.round(c[5] * window.SFA_SCHEDULE.SLOT / 60 / g.spots), base: Math.floor(H(id + 'b') * g.spots * 0.85) };
  };
  // per sport and day: up to two evening games, on booked slots of its courts (none on Fridays before 4 PM, as the schedule)
  window.SFA_GAMES_ON = date => {
    const out = [];
    for (const sport of Object.keys(window.SFA_GAME_SPORTS)){
      if (H(`${sport}|${date}`) > 0.75) continue;                     // not every sport every day
      const starts = window.SFA_SCHEDULE.startsFor(date).filter(s => s >= 16 * 60);
      let n = 0;
      for (const s of starts) for (const ci of courtsFor(sport)){
        if (n >= 2 || !window.SFA_IS_BOOKED(sport, ci, date, s) || H(`${sport}|${ci}|${date}|${s}`) > 0.35) continue;
        if (out.some(g => g.sport === sport && g.start === s)) continue;
        out.push(make(sport, ci, date, s)); n++;
      }
    }
    return out.sort((a, b) => a.start - b.start || a.sport.localeCompare(b.sport));
  };
  window.SFA_GAME = id => {
    const [sport, court, date, start] = String(id || '').split('|');
    if (!window.SFA_GAME_SPORTS[sport] || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    return window.SFA_GAMES_ON(date).find(g => g.id === id) || null;
  };
  window.SFA_GAME_FITS = (g, person) => { const r = window.SFA_GAME_WHO[g.who], a = person && person.dob ? window.SFA_AGE(person.dob, g.date) : null; return a != null && a >= r.min && a <= r.max ? null : 'age'; };
  window.SFA_GAME_DAYS = (n = 14, from = new Date()) => Array.from({ length: n }, (_, i) => { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i); return window.SFA_TODAY(d); });
})();
