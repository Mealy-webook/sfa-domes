/* Court data for SFA Domes Dammam, matched to the live site sfadomes.com/en/sfa-domes-dammam (2026-11-19):
   10 sports and 28 courts with the live names and prices. Football: Courts 5, 6, 7a, 7b and 8 (5-a-side) and Court 7
   (7-a-side, taken to be 7a + 7b together, so those block each other: SFA_LINKS). Multipurpose sports use Courts 1, 3 and 4
   (Basketball only Court 1). Rugby is "Court 7 - Football - Rugby"; Padel is 2A and 2B; "Other sports" is a sport of its own.
   Each sport lists its own courts and books them independently (Ahmed's call), apart from SFA_LINKS.
   Keys match data-sport in index.html. Each court: [name, type, surface, format, size, price per hour in SAR, image].
   Surface and size are left empty where the venue hasn't given them (pages skip empty specs).
   Court images are AI-generated (Figma, file "SFA Domes — court images"), one per sport in f/courts/ (other.jpg is the
   plain dome court that netball used). Used by courts.html, court-details.html, checkout.html, result.html and server.js. */
(() => {
  // Matched to the live site (sfadomes.com/en/sfa-domes-dammam, 2026-11-19, Ahmed: "courts, names, prices" and "follow
  // live"): 10 sports and 28 courts, named as live. Live prices are per 1.5-hour session (SAR 230; 460 for 7-a-side and
  // rugby); the data keeps the price per hour, so they're stored as session price ÷ 1.5.
  const S1 = 230 / 1.5, S2 = 460 / 1.5;
  // a multipurpose sport on Courts 1, 3 and 4 (live lists no Court 2)
  const mp = (label, format) => ['1', '3', '4'].map(n => [`Court ${n} - ${label}`, 'Multipurpose court', 'Hard court', format, '', S1]);
  const five = n => [`Court ${n} - Football - 5-A-Side`, '5-a-side field', '', '5 v 5', '', S1];
  window.SFA_SPORTS = {
    'football':   { name: 'Football',     icon: 'sports_soccer', area: 'field', courts: [five('5'), five('6'),
                    ['Court 7 - Football - 7-A-Side', '7-a-side (2 fields)', '', '7 v 7', '', S2], five('7a'), five('7b'), five('8')] },
    'badminton':  { name: 'Badminton',    img: 'f/ico-shuttlecock-white.svg', area: 'mp', courts: mp('Badminton X3', 'Singles / doubles') },
    'basketball': { name: 'Basketball',   icon: 'sports_basketball', area: 'mp', courts: [['Court 1 - Basketball', 'Multipurpose court', 'Hard court', '5 v 5', '', S1]] },
    'futsal':     { name: 'Futsal',       icon: 'sports_soccer', area: 'mp', courts: [['Court 1 - Futsal', 'Multipurpose court', 'Hard court', '5 v 5', '', S1],
                    ['Court 3 - Futsal Amateur', 'Multipurpose court', 'Hard court', '5 v 5', '', S1], ['Court 4 - Futsal', 'Multipurpose court', 'Hard court', '5 v 5', '', S1]] },
    'handball':   { name: 'Handball',     icon: 'sports_handball', area: 'mp', courts: mp('Handball', '7 v 7') },
    'volleyball': { name: 'Volleyball',   icon: 'sports_volleyball', area: 'mp', courts: mp('Volleyball', '6 v 6') },
    'tennis':     { name: 'Tennis',       icon: 'sports_tennis', area: 'mp', courts: mp('Tennis', 'Singles / doubles') },
    'rugby':      { name: 'Rugby',        icon: 'sports_rugby', area: 'field', courts: [['Court 7 - Football - Rugby', 'Rugby 7s (2 fields)', '', '7 v 7', '', S2]] },
    'padel':      { name: 'Padel',        icon: 'sports_tennis', area: 'padel', courts: [['Padel - 2A', 'Padel court', '', '2 v 2', '', S1], ['Padel - 2B', 'Padel court', '', '2 v 2', '', S1]] },
    // "Other sports" is a sport of its own on live, with its own Courts 1, 3 and 4
    'other':      { name: 'Other sports', icon: 'exercise', area: 'mp', courts: mp('Other', '') },
  };
  // no sport groups any more: live lists Volleyball and Other sports as sports (the helpers stay for the pages that use them)
  window.SFA_SPORT_GROUPS = {};
  window.SFA_SPORT_GROUP = k => Object.keys(window.SFA_SPORT_GROUPS).find(g => window.SFA_SPORT_GROUPS[g].members.includes(k)) || null;
  window.SFA_TOP_SPORTS = keys => { const tops = [...new Set(keys.map(k => window.SFA_SPORT_GROUP(k) || k))]; return [...tops.filter(k => !window.SFA_SPORT_GROUPS[k]), ...tops.filter(k => window.SFA_SPORT_GROUPS[k])]; };   // groups come last
  window.SFA_SPORT_INFO = k => window.SFA_SPORTS[k] || window.SFA_SPORT_GROUPS[k];
  window.SFA_SPORT_MEMBERS = k => window.SFA_SPORT_GROUPS[k] ? window.SFA_SPORT_GROUPS[k].members : [k];
  // football: Court 7 (7-a-side) is taken to be Courts 7a and 7b together, so a booking on either blocks the other
  window.SFA_LINKS = { football: { 2: [3, 4], 3: [2], 4: [2] } };
})();
// a court's photo: its own image if it has one, else its sport's
window.SFA_COURT_IMG = (key, court) => court[6] || `f/courts/${key}.jpg`;

// Court hours (minutes from midnight; past 24:00 means after midnight). 1.5-hour slots start at opening and must end
// by closing, so a little time can go unused at the end of the day. Bookable up to 90 days ahead.
window.SFA_SCHEDULE = (() => {
  const SLOT = 90, RANGE_DAYS = 90;
  //            Sun          Mon          Tue          Wed          Thu          Fri          Sat
  const HOURS = [[540, 1440], [540, 1440], [540, 1440], [540, 1440], [540, 1500], [480, 1500], [480, 1440]];
  const weekday = dateKey => { const [y, m, d] = dateKey.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  const hoursFor = dateKey => HOURS[weekday(dateKey)];
  const startsFor = dateKey => { const [open, close] = hoursFor(dateKey), out = []; for (let s = open; s + SLOT <= close; s += SLOT) out.push(s); return out; };
  return { SLOT, RANGE_DAYS, HOURS, hoursFor, startsFor };
})();

// Placeholder availability: some slots booked, more in the evening; the same court, day and slot always give the same answer.
// Linked courts (football 7-a-side ↔ F4/F5) count each other's bookings. Shared by the pages (what's shown) and server.js
// (what's accepted at checkout). dateKey is 'YYYY-MM-DD', start is minutes.
window.SFA_HASH = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
window.SFA_IS_BOOKED = (() => {
  const own = (key, ci, dateKey, start) => window.SFA_HASH(`${key}|${ci}|${dateKey}|${start}`) < (start >= 17 * 60 ? 0.42 : start >= 12 * 60 ? 0.22 : 0.14);
  return (key, ci, dateKey, start) => own(key, ci, dateKey, start) || (((window.SFA_LINKS[key] || {})[ci]) || []).some(o => own(key, o, dateKey, start));
})();

// Ladies hours (SAMPLE schedule until the venue sends the real one, Ahmed 2026-11-09): multipurpose Courts 1 and 3 are kept
// for women and girls at these times, for every multipurpose sport. In those hours the court is booked whole, from
// ladies-hours.html only, and every player must be a woman or girl; the regular court pages show those times as
// "Ladies hours". A slot is a ladies slot when it lies wholly inside a window. Shared by the pages and server.js.
window.SFA_LADIES = {
  sample: true,
  courts: [0, 1],                       // court index on every multipurpose sport: Court 1 and Court 3 (Ahmed, 2026-11-19; Basketball has only Court 1)
  //        Sun          Mon                        Tue          Wed                        Thu          Fri  Sat
  hours: [[[540, 720]], [[540, 720], [1080, 1260]], [[540, 720]], [[540, 720], [1080, 1260]], [[540, 720]], [], [[480, 750]]]
};
window.SFA_LADIES_SPORTS = () => Object.keys(window.SFA_SPORTS).filter(k => window.SFA_SPORTS[k].area === 'mp');
window.SFA_LADIES_WINDOWS = dateKey => { const [y, m, d] = dateKey.split('-').map(Number); return window.SFA_LADIES.hours[new Date(y, m - 1, d).getDay()] || []; };
window.SFA_IS_LADIES = (key, ci, dateKey, start) => {
  const sp = window.SFA_SPORTS[key]; if (!sp || sp.area !== 'mp' || !window.SFA_LADIES.courts.includes(+ci)) return false;
  return window.SFA_LADIES_WINDOWS(dateKey).some(([a, b]) => start >= a && start + window.SFA_SCHEDULE.SLOT <= b);
};
// Ladies hours are sold as tickets (Ahmed, 2026-11-19, "user will book a ticket +/-, add addons"): a session is one sport
// at one 1.5-hour ladies time; every ticket costs the same and a session holds up to `capacity` tickets (both SAMPLE
// numbers until the venue sets them). The Training Kit (f/programs-data.js) is the add-on. Ticket orders don't hold a
// court the way a court booking does. Order: { ladies: true, sport, court: SFA_LADIES.courts[0], days: [{ date, starts: [start] }],
// tickets, kit }. Shared by ladies-hours.html, checkout.html, server.js and f/demo-api.js.
Object.assign(window.SFA_LADIES, { ticket: 50, capacity: 16, maxPerOrder: 10, maxKit: 10 });
window.SFA_LADIES_SESSIONS = (sport, dateKey) => window.SFA_SCHEDULE.startsFor(dateKey).filter(s => window.SFA_IS_LADIES(sport, window.SFA_LADIES.courts[0], dateKey, s));
window.SFA_LADIES_KEY = (sport, date, start) => `${sport}|${date}|${start}`;
// the order's price and checks; `held` = tickets already held in that session by other bookings
window.SFA_LADIES_PRICE = (tickets, kit) => Math.round((tickets * window.SFA_LADIES.ticket + kit * ((window.SFA_PROGRAM_KIT || {}).price || 0)) * 100) / 100;
window.SFA_LADIES_CHECK = (order, held, now) => {
  const L = window.SFA_LADIES, fail = error => ({ error });
  if (!window.SFA_LADIES_SPORTS().includes(order.sport)) return fail('Unknown sport.');
  const d = (order.days || [])[0]; if (!d || order.days.length !== 1 || !Array.isArray(d.starts) || d.starts.length !== 1) return fail('Pick one session.');
  const s = d.starts[0], today = new Date(now); today.setHours(0, 0, 0, 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return fail('Bad date.');
  const [y, m, dd] = d.date.split('-').map(Number), date = new Date(y, m - 1, dd), last = new Date(today); last.setDate(last.getDate() + window.SFA_SCHEDULE.RANGE_DAYS - 1);
  if (date < today || date > last) return fail(`${d.date} can't be booked.`);
  if (!window.SFA_LADIES_SESSIONS(order.sport, d.date).includes(s)) return fail("That time isn't in ladies hours.");
  if (date.getTime() === today.getTime() && s <= now.getHours() * 60 + now.getMinutes()) return fail('That session has already started.');
  const n = order.tickets, k = order.kit || 0;
  if (!Number.isInteger(n) || n < 1 || n > L.maxPerOrder) return fail(`Choose 1 to ${L.maxPerOrder} tickets.`);
  if (!Number.isInteger(k) || k < 0 || k > L.maxKit) return fail('Check the add-ons.');
  const left = L.capacity - held;
  if (left <= 0) return { error: 'That session is full.', status: 409 };
  if (n > left) return { error: left === 1 ? 'Only 1 ticket is left in this session.' : `Only ${left} tickets are left in this session.`, status: 409 };
  return { tickets: n, kit: k, amount: window.SFA_LADIES_PRICE(n, k) };
};
