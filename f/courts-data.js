/* Court data for SFA Domes Dammam, from the venue's facility sheet (2026-11-02):
   all indoor · 4 multipurpose courts (basketball, volleyball, tennis, badminton, handball, futsal and other hard-court
   activities) · 5 football fields (5 × 5-a-side, or 3 × 5-a-side + 1 × 7-a-side) · clubhouse washrooms and showers for
   men and women · 250 parking spots. Netball, GFX and Table Tennis use the multipurpose courts; Rugby uses the fields.
   Each sport lists its own courts and books them independently (Ahmed's call), except that football's 7-a-side setup
   is fields F4 + F5 together, so those block each other (SFA_LINKS).
   Keys match data-sport in index.html. Each court: [name, type, surface, format, size, price per hour in SAR, image].
   Surface and size are left empty where the venue hasn't given them (pages skip empty specs). Prices are placeholders.
   Court images are AI-generated (Figma, file "SFA Domes — court images"), one per sport in f/courts/.
   Used by courts.html, court-details.html, checkout.html, result.html and server.js. */
(() => {
  // the 4 multipurpose courts, set up for one sport
  const mp = (format, price) => [1, 2, 3, 4].map(i => [`Court ${i}`, 'Multipurpose court', 'Hard court', format, '', price]);
  // the 5 football fields, plus the 7-a-side setup that joins F4 and F5
  const fields = (fivePrice, sevenPrice) => [
    ...[1, 2, 3, 4, 5].map(i => [`Field F${i}`, '5-a-side field', '', '5 v 5', '', fivePrice]),
    ['Fields F4 + F5', '7-a-side (2 fields)', '', '7 v 7', '', sevenPrice],
  ];
  window.SFA_SPORTS = {
    'basketball':   { name: 'Basketball',   icon: 'sports_basketball', area: 'mp', courts: mp('5 v 5', 220) },
    'badminton':    { name: 'Badminton',    img: 'f/ico-shuttlecock-white.svg', area: 'mp', courts: mp('Singles / doubles', 80) },
    'football':     { name: 'Football',     icon: 'sports_soccer', area: 'field', courts: fields(300, 450) },
    'futsal':       { name: 'Futsal',       icon: 'sports_soccer', area: 'mp', courts: mp('5 v 5', 300) },
    'gfx':          { name: 'GFX',          icon: 'fitness_center', area: 'mp', courts: mp('Up to 12 people', 150) },
    'handball':     { name: 'Handball',     icon: 'sports_handball', area: 'mp', courts: mp('7 v 7', 250) },
    'netball':      { name: 'Netball',      icon: 'sports_basketball', area: 'mp', courts: mp('7 v 7', 200) },
    'rugby':        { name: 'Rugby',        icon: 'sports_rugby', area: 'field', courts: [['Fields F4 + F5', 'Rugby 7s (2 fields)', '', '7 v 7', '', 500]] },
    'volleyball':   { name: 'Volleyball',   icon: 'sports_volleyball', area: 'mp', courts: mp('6 v 6', 180) },
    'tennis':       { name: 'Tennis',       icon: 'sports_tennis', area: 'mp', courts: mp('Singles / doubles', 160) },
    'table-tennis': { name: 'Table Tennis', icon: 'pickleball', area: 'mp', courts: mp('1–2 a side', 50) },
  };
  // football: the 7-a-side setup (index 5) uses F4 (3) and F5 (4), so a booking on either side blocks the other
  window.SFA_LINKS = { football: { 3: [5], 4: [5], 5: [3, 4] } };
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

// Ladies hours (SAMPLE schedule until the venue sends the real one, Ahmed 2026-11-09): multipurpose Courts 1 and 2 are kept
// for women and girls at these times, for every multipurpose sport. In those hours the court is booked whole, from
// ladies-hours.html only, and every player must be a woman or girl; the regular court pages show those times as
// "Ladies hours". A slot is a ladies slot when it lies wholly inside a window. Shared by the pages and server.js.
window.SFA_LADIES = {
  sample: true,
  courts: [0, 1],                       // court index on every multipurpose sport (Court 1, Court 2)
  //        Sun          Mon                        Tue          Wed                        Thu          Fri  Sat
  hours: [[[540, 720]], [[540, 720], [1080, 1260]], [[540, 720]], [[540, 720], [1080, 1260]], [[540, 720]], [], [[480, 750]]]
};
window.SFA_LADIES_SPORTS = () => Object.keys(window.SFA_SPORTS).filter(k => window.SFA_SPORTS[k].area === 'mp');
window.SFA_LADIES_WINDOWS = dateKey => { const [y, m, d] = dateKey.split('-').map(Number); return window.SFA_LADIES.hours[new Date(y, m - 1, d).getDay()] || []; };
window.SFA_IS_LADIES = (key, ci, dateKey, start) => {
  const sp = window.SFA_SPORTS[key]; if (!sp || sp.area !== 'mp' || !window.SFA_LADIES.courts.includes(+ci)) return false;
  return window.SFA_LADIES_WINDOWS(dateKey).some(([a, b]) => start >= a && start + window.SFA_SCHEDULE.SLOT <= b);
};
