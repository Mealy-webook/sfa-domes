// SFA Domes local server: serves the site and talks to PayTabs (Hosted Payment Page, Saudi region, SAR).
// No dependencies; Node 18+. Run: node server.js   (PORT defaults to 4788)
//
// Keys live in .env next to this file (see .env.example) and never reach the browser:
//   PAYTABS_PROFILE_ID, PAYTABS_SERVER_KEY, PAYTABS_BASE_URL (default https://secure.paytabs.sa), PUBLIC_URL (optional)
//
// Payments run in test mode unless .env sets PAYMENT_MODE=paytabs (see testMode below).
//
// Flow: checkout.html POSTs the order to /api/checkout → the server re-prices it from f/courts-data.js, checks every slot,
// creates a PayTabs payment page and answers with its redirect_url → the payer pays on PayTabs → PayTabs sends the browser
// back to /paytabs/return → the server asks PayTabs for the real result (payment/query) → result.html shows it.
// /paytabs/callback takes PayTabs' server-to-server notice too, but PayTabs can only reach it on a public URL (PUBLIC_URL).

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = +process.env.PORT || 4788;

// ---- .env (KEY=value lines; real environment variables win)
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')){
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || line.trim().startsWith('#')) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (e) {}
const PT = {
  profileId: process.env.PAYTABS_PROFILE_ID,
  serverKey: process.env.PAYTABS_SERVER_KEY,
  base: (process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa').replace(/\/$/, ''),
};
const configured = () => !!(PT.profileId && PT.serverKey);
// Test mode (the default): Pay goes to the built-in test-pay.html, where the tester approves or declines. No money moves.
// Real PayTabs only when .env has PAYMENT_MODE=paytabs and both keys.
const testMode = () => process.env.PAYMENT_MODE !== 'paytabs' || !configured();

// ---- court data, schedule and placeholder availability: the same file the pages load
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'f/courts-data.js'), 'utf8'), ctx);
const { SFA_SPORTS: SPORTS, SFA_SCHEDULE: SCHEDULE, SFA_IS_BOOKED: IS_BOOKED, SFA_LINKS: LINKS, SFA_IS_LADIES: IS_LADIES } = ctx.window;
// training programs (f/programs-data.js): plans, training days, time slots and the kit, re-priced here for every order
vm.runInContext(fs.readFileSync(path.join(ROOT, 'f/programs-data.js'), 'utf8'), ctx);
// open games (f/games-data.js): the venue's own games; one spot per adult, priced per spot
vm.runInContext(fs.readFileSync(path.join(ROOT, 'f/games-data.js'), 'utf8'), ctx);
const { SFA_GAME: GAME } = ctx.window;
const { SFA_PROGRAMS: PROGRAMS, SFA_PROGRAM_KIT: KIT, SFA_PROGRAM_SESSIONS: PROGRAM_SESSIONS, SFA_PROGRAM_START_DAYS: START_DAYS, SFA_PROGRAM_PLANS: PLANS, SFA_PROGRAM_PRICE: PRICE, SFA_PROGRAM_ELIGIBLE: ELIGIBLE, SFA_PROGRAM_MAX_PEOPLE: MAX_PEOPLE, SFA_CHILD: CHILD, SFA_CHILD_ERRORS: CHILD_ERRORS, SFA_CHILD_AGE_OK: CHILD_AGE_OK, SFA_FULL_NAME: FULL_NAME, SFA_SPLIT_NAME: SPLIT_NAME, SFA_TODAY: TODAY } = ctx.window;

// ---- bookings: a JSON file is plenty for a prototype
const DB = path.join(ROOT, 'data', 'bookings.json');
let bookings = {};
try { bookings = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}
const save = () => { fs.mkdirSync(path.dirname(DB), { recursive: true }); fs.writeFileSync(DB, JSON.stringify(bookings, null, 2)); };
const HOLD_MS = 20 * 60 * 1000;   // a pending payment holds its slots for 20 minutes
const holding = b => b.status === 'paid' || (b.status === 'pending' && Date.now() - b.createdAt < HOLD_MS);
// slots held or paid on this court, or on a court linked to it (football 7-a-side uses fields F4 + F5)
function takenSlots(sport, court){
  const set = new Set(), courts = [court, ...(((LINKS[sport] || {})[court]) || [])];
  for (const b of Object.values(bookings)) if (b.order.sport === sport && courts.includes(b.order.court) && holding(b))
    for (const d of b.order.days) for (const s of d.starts) set.add(`${d.date}|${s}`);
  return set;
}

// online spots held or paid in an open game, and whether this user already has one
const gameBookings = id => Object.values(bookings).filter(b => b.order.kind === 'game' && b.order.game === id && holding(b));
function checkGameOrder(order, user){
  const fail = (error, status) => ({ error, status });
  const g = GAME(order && order.game); if (!g) return fail('That game is no longer on.', 409);
  const now = new Date(), today = dk(now);
  if (g.date < today || (g.date === today && g.start <= now.getHours() * 60 + now.getMinutes())) return fail('That game has already started.', 409);
  if (!user.dob) return fail('Add your date of birth in My account to join a game.');
  if (ctx.window.SFA_AGE(user.dob, g.date) < 18) return fail('Open games are for adults (18+).');
  const held = gameBookings(g.id);
  if (held.some(b => b.userId === user.id)) return fail("You've already joined this game.", 409);
  if (g.base + held.length >= g.spots) return fail('That game is full.', 409);
  const sport = SPORTS[g.sport], court = sport.courts[g.court];
  return { amount: g.price, desc: `Open game · ${sport.name} · ${court[0]} · ${g.level} · SFA Domes Dammam`,
    order: { kind: 'game', game: g.id, sport: g.sport, court: g.court, days: [{ date: g.date, starts: [g.start] }], level: g.level, format: g.format, spots: g.spots, bookingFor: { type: 'me' } } };
}

// ---- helpers
const pad = n => String(n).padStart(2, '0');
const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = m => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };
const send = (res, code, body, headers = {}) => {
  const json = typeof body !== 'string';
  res.writeHead(code, { 'content-type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(json ? JSON.stringify(body) : body);
};
const readBody = req => new Promise((resolve, reject) => {
  let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', () => resolve(raw)); req.on('error', reject);
});
async function paytabs(endpoint, payload){
  const r = await fetch(`${PT.base}/payment/${endpoint}`, {
    method: 'POST', headers: { authorization: PT.serverKey, 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.message || `PayTabs answered ${r.status}`), { status: r.status, data });
  return data;
}
const baseUrl = req => (process.env.PUBLIC_URL || `http://${req.headers.host}`).replace(/\/$/, '');
// the payer's IP for PayTabs' fraud checks, only when it's a real public address (not localhost or a LAN)
const publicIp = req => {
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  return !ip || /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fe80:|fc|fd)/i.test(ip) ? {} : { ip };
};

// ---- order check: everything the browser sent is re-derived or validated here
function checkOrder(order, user){
  const fail = msg => ({ error: msg });
  if (!order || typeof order !== 'object') return fail('No order.');
  const sport = SPORTS[order.sport]; if (!sport) return fail('Unknown sport.');
  const court = sport.courts[order.court]; if (!Number.isInteger(order.court) || !court) return fail('Unknown court.');
  if (!Array.isArray(order.days) || !order.days.length) return fail('Pick at least one slot.');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Date(today); last.setDate(last.getDate() + SCHEDULE.RANGE_DAYS - 1);
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const taken = takenSlots(order.sport, order.court), seen = new Set();
  let count = 0;
  for (const d of order.days){
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return fail('Bad date.');
    const [y, m, dd] = d.date.split('-').map(Number), date = new Date(y, m - 1, dd);
    if (dk(date) !== d.date || date < today || date > last) return fail(`${d.date} can't be booked.`);
    if (!Array.isArray(d.starts) || !d.starts.length) return fail('Empty day.');
    for (const s of d.starts){
      const k = `${d.date}|${s}`;
      if (!SCHEDULE.startsFor(d.date).includes(s) || seen.has(k)) return fail('Bad time slot.');
      if (d.date === dk(today) && s <= nowMin) return fail(`${fmtTime(s)} on ${d.date} has already started.`);
      if (taken.has(k) || IS_BOOKED(order.sport, order.court, d.date, s)) return fail(`${fmtTime(s)} on ${d.date} was just booked. Pick another slot.`);
      // ladies hours: those slots are booked only as a ladies order, and a ladies order holds only those slots
      const lad = IS_LADIES(order.sport, order.court, d.date, s);
      if (lad && !order.ladies) return fail(`${fmtTime(s)} on ${d.date} is ladies hours. Book it from Ladies hours.`);
      if (!lad && order.ladies) return fail(`${fmtTime(s)} on ${d.date} isn't in ladies hours.`);
      seen.add(k); count++;
    }
  }
  // booking for (stories AC01–AC03): yourself, or a child aged 6 to 17 on the first booked day. A saved child is read from
  // the account, never the page; a child entered for this booking only is checked with the same rules as My children, and
  // one matching a saved child (same name and date of birth) uses the saved profile. Courts also take "someone else".
  const bf = order.bookingFor || { type: 'me' }, first = order.days.map(d => d.date).sort()[0];
  order.ladies = !!order.ladies;
  // ladies hours are for women and girls: yourself only if your account says female, a child only if she's a girl
  // (someone else is taken on the booker's word; checkout tells them the rule)
  if (order.ladies && bf.type === 'me' && (user && user.gender) !== 'female') return fail('Ladies hours are for women and girls only.');
  if (bf.type === 'child'){
    const c = whichChild(bf, user, first); if (c.error) return c;
    if (order.ladies && c.gender !== 'female') return fail('Ladies hours are for women and girls only.');
    order.bookingFor = { type: 'child', ref: c.ref, name: c.name, dob: c.dob, gender: c.gender };
  }
  else if (bf.type === 'me') order.bookingFor = { type: 'me' };
  else if (bf.type === 'other'){   // someone else: their full name and a Saudi mobile; email optional
    const name = String(bf.name || '').trim().replace(/\s+/g, ' '), email = String(bf.email || '').trim();
    if (name.split(' ').length < 2) return fail("Add the player's full name.");
    if (!/^\+9665\d{8}$/.test(bf.phone || '')) return fail("Add the player's mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Check the email address.');
    order.bookingFor = { type: 'other', name, phone: bf.phone, email };
  }
  else return fail('Choose who the booking is for.');
  const slotPrice = court[5] * SCHEDULE.SLOT / 60;
  return { sport, court, count, amount: Math.round(slotPrice * count * 100) / 100 };
}

// a child at checkout: { ref } (saved) or { child: { first, last, dob, gender } } (this booking only), aged 6 to 17 on `on`
const STALE_CHILD = 'That child is no longer in My children. Refresh the page to see your current list.';
const cleanChild = c => ({ first: String(c.first || '').trim().replace(/\s+/g, ' '), last: String(c.last || '').trim().replace(/\s+/g, ' '), dob: String(c.dob || ''), gender: c.gender });
function whichChild(x, user, on){
  const saved = (user && user.participants) || [];
  let c;
  if (x.ref){ c = saved.find(s => s.id === x.ref); if (!c) return { error: STALE_CHILD, status: 409 }; c = { ref: c.id, name: c.name, dob: c.dob, gender: c.gender }; }
  else if (x.child && typeof x.child === 'object'){
    const k = cleanChild(x.child), er = CHILD_ERRORS(k, on); if (Object.keys(er).length) return { error: Object.values(er)[0] };
    const name = FULL_NAME(k), m = saved.find(s => personKey(s) === personKey({ name, dob: k.dob }));
    c = m ? { ref: m.id, name: m.name, dob: m.dob, gender: m.gender } : { ref: null, name, dob: k.dob, gender: k.gender };
  }
  else return { error: 'Choose which child is playing.' };
  if (!CHILD_AGE_OK(c.dob, on)) return { error: `${c.name} must be 6 to 17 on the booking date.` };
  return c;
}

// ---- static files: only what the site needs, never .env, server.js or data/
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon',
  '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
// a program order: { kind: 'program', program, plan: 'trial' | 'month' | 'month2' | 'month3', start, time,
//   participants: [{ ref: 'me' | <saved child id> } | { child: { first, last, dob, gender } }], kits: [<size>, …] }.
// Everyone in it pays the plan; kits are a quantity of their own. 'me' and saved children are read from the account, never the
// page; a child entered for this booking only is checked like My children (saving happens before checkout, through the
// "Save this child to your account?" prompt). Only you and children: no other adults (Ahmed). The server works out the
// sessions and stores them as days, like a court order, so tickets and the profile read both.
const personKey = x => `${String(x.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${x.dob}`;
const peopleOf = o => o.participants || (o.player ? [o.player] : []);
function checkProgramOrder(order, user){
  const fail = msg => ({ error: msg });
  const p = PROGRAMS[order.program]; if (!p) return fail('Unknown program.');
  if (!Object.hasOwn(PLANS, order.plan || '')) return fail('Choose a free trial or a subscription.');
  if (!START_DAYS(p).includes(order.start)) return fail('Pick one of the next 3 training days to start.');
  const slot = p.slots.find(s => s.time === order.time); if (!slot) return fail('Pick a time slot.');
  const list = Array.isArray(order.participants) ? order.participants : [];
  if (!list.length) return fail('Add at least one participant.');
  if (list.length > MAX_PEOPLE) return fail(`A booking can hold up to ${MAX_PEOPLE} participants.`);
  if (slot.enrolled + list.length > p.capacity) return fail(p.capacity - slot.enrolled > 0 ? `Only ${p.capacity - slot.enrolled} places are left at that time.` : 'That time slot is full. Pick another one.');
  const people = [];
  for (const x of list){
    let who;
    if (x && x.ref === 'me') who = { name: user.name, dob: user.dob, gender: user.gender, self: true };
    else if (x && (x.ref || x.child)){ const c = whichChild(x, user, order.start); if (c.error) return c; who = { name: c.name, dob: c.dob, gender: c.gender, ref: c.ref }; }
    else return fail('Choose who is taking each place.');
    if (!who.dob || !who.gender) return fail('Add your date of birth and gender to your account to take part yourself.');
    const why = ELIGIBLE(p, who, order.start);
    if (why === 'age') return fail(`${who.name} is outside this program's age range (${p.ages}).`);
    if (why === 'gender') return fail(`${p.name.en} is for women and girls only.`);
    if (people.some(o => personKey(o) === personKey(who))) return fail(`${who.name} can't take two places in the same session.`);
    if (order.plan === 'trial' && Object.values(bookings).some(b => b.userId === user.id && b.status === 'paid' && b.order.kind === 'program' && b.order.program === order.program && b.order.plan === 'trial' && peopleOf(b.order).some(o => personKey(o) === personKey(who) || (!o.dob && o.name.trim().toLowerCase() === who.name.toLowerCase()))))
      return fail(`${who.name} has already had a free trial of this program.`);
    delete who.self; people.push(who);
  }
  // the Training Kit: a quantity of its own (Ahmed), each kit with its size; subscriptions only
  const sizes = Array.isArray(order.kits) ? order.kits : [];
  if (sizes.length && order.plan === 'trial') return fail('Add-ons come with a subscription, not a free trial.');
  if (sizes.length > 10) return fail('Up to 10 kits per booking.');
  if (sizes.some(z => !KIT.sizes.includes(z))) return fail('Choose a size for each kit.');
  const dates = PROGRAM_SESSIONS(p, order.start, order.plan), kits = sizes.length;
  const amount = people.length * PRICE(p, order.plan) + kits * KIT.price;
  const clean = { kind: 'program', program: order.program, sport: p.sport, plan: order.plan, start: order.start, time: slot.time, participants: people,
    kit: kits ? { qty: kits, sizes } : null, days: dates.map(date => ({ date, starts: [slot.time] })) };
  const months = PLANS[order.plan].months;
  return { order: clean, amount, desc: `${p.name.en} · ${order.plan === 'trial' ? 'Free trial' : `${months} month${months > 1 ? 's' : ''}`} × ${people.length}${kits ? ` · Training Kit × ${kits}` : ''} · SFA Domes Dammam` };
}

function serveStatic(req, res, pathname){
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || /^(data|node_modules)([\\/]|$)|^\.|^server\.js$/.test(rel) || !TYPES[path.extname(file).toLowerCase()])
    return send(res, 404, 'Not found');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()], 'cache-control': 'no-cache' }); res.end(buf);   // always revalidate, so edits show on reload
  });
}

// ---- accounts: email + password (scrypt), sign-in cookie, test-mode password reset (no email is sent)
const USERS = path.join(ROOT, 'data', 'users.json'), SESSIONS = path.join(ROOT, 'data', 'sessions.json');
const load = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return {}; } };
let users = load(USERS), sessions = load(SESSIONS);
const resets = new Map();   // token -> { userId, exp }
const persist = () => { fs.mkdirSync(path.dirname(USERS), { recursive: true }); fs.writeFileSync(USERS, JSON.stringify(users, null, 2)); fs.writeFileSync(SESSIONS, JSON.stringify(sessions)); };
const SESSION_DAYS = 30;
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const pwOk = pw => typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const emailOk = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const findByEmail = e => Object.values(users).find(u => u.email === String(e || '').trim().toLowerCase());
// first / last / phone came later: older accounts and children get first + last from their full name
function upgrade(u){
  if (!u) return u;
  if (u.first == null){ Object.assign(u, SPLIT_NAME(u.name)); }
  if (u.phone == null) u.phone = '';
  (u.participants || []).forEach(c => { if (c.first == null) Object.assign(c, SPLIT_NAME(c.name)); });
  return u;
}
const phoneOk = p => /^\+9665\d{8}$/.test(p || '');
const publicUser = u => u && (upgrade(u), { id: u.id, name: u.name, first: u.first, last: u.last, email: u.email, phone: u.phone, gender: u.gender, dob: u.dob, since: u.createdAt, participants: u.participants || [] });
function currentUser(req){
  const m = String(req.headers.cookie || '').match(/(?:^|;\s*)sfa_session=([a-f0-9]{64})/);
  const sx = m && sessions[m[1]];
  if (!sx || sx.exp < Date.now()) return null;
  return users[sx.userId] || null;
}
const DEMO = { email: 'sara@sfadomes.test', name: 'Sara Al-Qahtani', first: 'Sara', last: 'Al-Qahtani', phone: '+966551234567', gender: 'female', dob: '1996-04-12' };
// the demo account's children, so checkout has a saved list to pick from
const DEMO_KIDS = [{ id: 'kid-yousef', first: 'Yousef', last: 'Al-Qahtani', name: 'Yousef Al-Qahtani', dob: '2019-03-14', gender: 'male' }, { id: 'kid-faisal', first: 'Faisal', last: 'Al-Qahtani', name: 'Faisal Al-Qahtani', dob: '2016-10-02', gender: 'male' }, { id: 'kid-lana', first: 'Lana', last: 'Al-Qahtani', name: 'Lana Al-Qahtani', dob: '2012-06-21', gender: 'female' }];
function demoUser(){
  let u = findByEmail(DEMO.email);
  if (!u){ const id = crypto.randomUUID(), salt = crypto.randomBytes(16).toString('hex'); u = users[id] = { id, ...DEMO, salt, hash: hashPw('demo', salt), createdAt: Date.now(), demo: true }; persist(); }
  if (!u.participants){ u.participants = DEMO_KIDS.map(k => ({ ...k })); persist(); }
  if (!u.phone){ u.phone = DEMO.phone; persist(); }   // the demo account predates the phone field
  return u;
}
function startSession(res, user){
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { userId: user.id, exp: Date.now() + SESSION_DAYS * 864e5 }; persist();
  res.setHeader('set-cookie', [`sfa_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`, 'sfa_out=; Path=/; SameSite=Lax; Max-Age=0']);
}
async function authRoute(req, res, url){
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};
  switch (url.pathname){
    // prototype: everyone starts signed in as the demo account, unless they signed out (sfa_out cookie)
    case '/api/auth/me': {
      let u = currentUser(req);
      if (!u && !/(?:^|;\s*)sfa_out=1/.test(String(req.headers.cookie || ''))){ u = demoUser(); startSession(res, u); }
      if (u && u.demo && !u.participants){ u.participants = DEMO_KIDS.map(k => ({ ...k })); persist(); }
      return send(res, 200, { user: u ? publicUser(u) : null });
    }
    case '/api/auth/signup': {
      const parts = body.first != null || body.last != null ? { first: String(body.first || '').trim().replace(/\s+/g, ' '), last: String(body.last || '').trim().replace(/\s+/g, ' ') } : SPLIT_NAME(body.name);
      const name = FULL_NAME(parts), email = String(body.email || '').trim().toLowerCase(), phone = String(body.phone || '').replace(/\s+/g, '');
      const errors = {};
      if (!parts.first) errors.first = 'Enter your first name.';
      if (!parts.last) errors.last = 'Enter your last name.';
      if (!phoneOk(phone)) errors.phone = 'Enter a Saudi mobile number starting with 5.';
      if (!emailOk(email)) errors.email = 'Enter a valid email.';
      else if (findByEmail(email)) errors.email = 'An account with this email already exists. Sign in instead.';
      if (!['female', 'male'].includes(body.gender)) errors.gender = 'Choose one.';
      const dob = /^\d{4}-\d{2}-\d{2}$/.test(body.dob || '') ? new Date(body.dob + 'T00:00:00') : null;
      if (!dob || isNaN(dob) || dob > new Date() || dob < new Date('1900-01-01')) errors.dob = 'Enter your date of birth.';
      if (!pwOk(body.password)) errors.password = 'Use at least 8 characters with a letter and a number.';
      if (Object.keys(errors).length) return send(res, 400, { errors });
      const id = crypto.randomUUID(), salt = crypto.randomBytes(16).toString('hex');
      users[id] = { id, name, ...parts, email, phone, gender: body.gender, dob: body.dob, salt, hash: hashPw(body.password, salt), createdAt: Date.now() };
      startSession(res, users[id]);
      return send(res, 200, { user: publicUser(users[id]) });
    }
    // prototype: sign-in accepts anything. A known email signs in whatever the password; an unknown one gets an account on
    // the spot, named from the email (sara.alqahtani@… → Sara Alqahtani). Signup keeps its checks.
    case '/api/auth/login': {
      const email = String(body.email || '').trim().toLowerCase() || 'guest@sfa.test';
      let u = findByEmail(email);
      if (!u){
        const words = email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1));
        const name = (words.length > 1 ? words : [words[0] || 'Guest', 'Player']).join(' ');
        const id = crypto.randomUUID(), salt = crypto.randomBytes(16).toString('hex');
        u = users[id] = { id, name, ...SPLIT_NAME(name), email, phone: '', gender: '', dob: '', salt, hash: hashPw(String(body.password || ''), salt), createdAt: Date.now(), quick: true };
      }
      startSession(res, u);
      return send(res, 200, { user: publicUser(u) });
    }
    case '/api/auth/logout': {
      const m = String(req.headers.cookie || '').match(/(?:^|;\s*)sfa_session=([a-f0-9]{64})/);
      if (m){ delete sessions[m[1]]; persist(); }
      res.setHeader('set-cookie', ['sfa_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0', `sfa_out=1; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`]);
      return send(res, 200, { ok: true });
    }
    // no email service yet: in test mode the reset token comes straight back, so the modal can go to "new password"
    case '/api/auth/forgot': {
      if (!emailOk(body.email)) return send(res, 400, { error: 'Enter a valid email.' });
      const u = findByEmail(body.email), out = { ok: true, test: true };
      if (u){ const token = crypto.randomBytes(24).toString('hex'); resets.set(token, { userId: u.id, exp: Date.now() + 15 * 60e3 }); out.testToken = token; }
      return send(res, 200, out);
    }
    case '/api/auth/reset': {
      const r = resets.get(body.token);
      if (!r || r.exp < Date.now()) return send(res, 400, { error: 'This reset link has expired. Ask for a new one.' });
      if (!pwOk(body.password)) return send(res, 400, { errors: { password: 'Use at least 8 characters with a letter and a number.' } });
      const u = users[r.userId]; u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(body.password, u.salt); resets.delete(body.token);
      for (const [t, sx] of Object.entries(sessions)) if (sx.userId === u.id) delete sessions[t];   // sign out everywhere else
      startSession(res, u);
      return send(res, 200, { user: publicUser(u) });
    }
    // the signed-in account's bookings, for the tickets on profile.html (newest first; unfinished payments left out)
    case '/api/auth/bookings': {
      const u = currentUser(req); if (!u) return send(res, 401, { error: 'Please sign in.' });
      const list = Object.values(bookings).filter(b => b.userId === u.id && b.status !== 'pending').sort((a, b) => b.createdAt - a.createdAt)
        .map(({ cartId, status, amount, order, tranRef, message, paidAt, createdAt, test, free }) => ({ cartId, status, amount, order, tranRef, message, paidAt, createdAt, test: !!test, free: !!free }));
      return send(res, 200, { bookings: list });
    }
    // My profile: first and last name, date of birth and gender can change; email and phone are locked
    case '/api/auth/profile': {
      const u = currentUser(req); if (!u) return send(res, 401, { error: 'Please sign in.' });
      upgrade(u);
      if (req.method === 'POST'){
        if ((body.email != null && String(body.email).trim().toLowerCase() !== u.email) || (body.phone != null && body.phone !== u.phone))
          return send(res, 400, { error: "Email and phone can't be changed here." });
        const first = String(body.first || '').trim().replace(/\s+/g, ' '), last = String(body.last || '').trim().replace(/\s+/g, ' '), dob = String(body.dob || ''), errors = {};
        if (!first) errors.first = 'Enter your first name.';
        if (!last) errors.last = 'Enter your last name.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob > TODAY() || dob < '1900-01-01') errors.dob = 'Enter your date of birth.';
        if (!['female', 'male'].includes(body.gender)) errors.gender = 'Choose one.';
        if (Object.keys(errors).length) return send(res, 400, { errors });
        Object.assign(u, { first, last, name: FULL_NAME({ first, last }), dob, gender: body.gender }); persist();
      }
      return send(res, 200, { user: publicUser(u) });
    }
    // My children: list, add, edit or remove one. Same rules as the page (f/programs-data.js SFA_CHILD_ERRORS), at most
    // CHILD.LIMIT. Edits apply to future bookings only: a booking keeps the name it was made with, so tickets of a
    // removed or renamed child still show the name they were booked under.
    case '/api/auth/participants': {
      const u = currentUser(req); if (!u) return send(res, 401, { error: 'Please sign in.' });
      upgrade(u); u.participants = u.participants || [];
      const clean = c => ({ first: String(c.first || '').trim().replace(/\s+/g, ' '), last: String(c.last || '').trim().replace(/\s+/g, ' '), dob: String(c.dob || ''), gender: c.gender });
      const dupe = (c, id) => u.participants.some(x => x.id !== id && personKey(x) === personKey({ name: FULL_NAME(c), dob: c.dob }));
      if (req.method === 'POST' && body.remove){ u.participants = u.participants.filter(x => x.id !== body.remove); persist(); }
      // from the booking prompt: the same child twice (name + date of birth) returns the saved one, never a second profile
      if (req.method === 'POST' && body.ensure){
        const c = clean(body.ensure), errors = CHILD_ERRORS(c);
        if (Object.keys(errors).length) return send(res, 400, { errors });
        const ex = u.participants.find(x => personKey(x) === personKey({ name: FULL_NAME(c), dob: c.dob }));
        if (ex) return send(res, 200, { participants: u.participants, limit: CHILD.LIMIT, id: ex.id, existed: true });
        if (u.participants.length >= CHILD.LIMIT) return send(res, 400, { error: `You can save up to ${CHILD.LIMIT} children.` });
        const id = crypto.randomBytes(6).toString('hex');
        u.participants.push({ id, ...c, name: FULL_NAME(c) }); persist();
        return send(res, 200, { participants: u.participants, limit: CHILD.LIMIT, id, existed: false });
      }
      if (req.method === 'POST' && body.add){
        if (u.participants.length >= CHILD.LIMIT) return send(res, 400, { error: `You can save up to ${CHILD.LIMIT} children.` });
        const c = clean(body.add), errors = CHILD_ERRORS(c);
        if (!errors.first && !errors.last && !errors.dob && dupe(c)) errors.first = 'This child is already in your list.';
        if (Object.keys(errors).length) return send(res, 400, { errors });
        u.participants.push({ id: crypto.randomBytes(6).toString('hex'), ...c, name: FULL_NAME(c) }); persist();
      }
      if (req.method === 'POST' && body.edit){
        const x = u.participants.find(y => y.id === body.edit); if (!x) return send(res, 404, { error: 'That child is no longer on your account.' });
        const c = clean(body), errors = CHILD_ERRORS(c);
        if (!errors.first && !errors.last && !errors.dob && dupe(c, x.id)) errors.first = 'This child is already in your list.';
        if (Object.keys(errors).length) return send(res, 400, { errors });
        Object.assign(x, c, { name: FULL_NAME(c) }); persist();
      }
      return send(res, 200, { participants: u.participants, limit: CHILD.LIMIT });
    }
    // saved courts ("sport|court" keys) on the signed-in account
    case '/api/auth/favorites': {
      const u = currentUser(req); if (!u) return send(res, 401, { error: 'Please sign in.' });
      u.favorites = u.favorites || [];
      if (req.method === 'POST'){
        const sp = SPORTS[body.sport], c = sp && sp.courts[body.court];
        if (!c || !Number.isInteger(body.court)) return send(res, 400, { error: 'Unknown court.' });
        const k = `${body.sport}|${body.court}`, has = u.favorites.includes(k);
        if (body.on && !has) u.favorites.unshift(k);
        if (!body.on && has) u.favorites = u.favorites.filter(x => x !== k);
        persist();
      }
      return send(res, 200, { favorites: u.favorites });
    }
  }
  return send(res, 404, { error: 'Not found.' });
}

// ---- routes
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/auth/')) return await authRoute(req, res, url);

    // slots held or paid through checkout, so the court details calendar can show them as booked
    if (req.method === 'GET' && url.pathname === '/api/booked'){
      return send(res, 200, [...takenSlots(url.searchParams.get('sport'), +url.searchParams.get('court'))]);
    }

    // open games: online spots taken per game on these days (?days=YYYY-MM-DD,…), and which ones you're in
    if (req.method === 'GET' && url.pathname === '/api/games'){
      const days = new Set(String(url.searchParams.get('days') || '').split(',')), me = currentUser(req), out = {};
      for (const b of Object.values(bookings)) if (b.order.kind === 'game' && holding(b) && days.has(b.order.days[0].date)){
        const o = out[b.order.game] || (out[b.order.game] = { taken: 0, mine: false }); o.taken++; if (me && b.userId === me.id) o.mine = true;
      }
      return send(res, 200, out);
    }

    if (req.method === 'GET' && url.pathname === '/api/config'){
      return send(res, 200, { mode: testMode() ? 'test' : 'paytabs' });
    }

    // create the PayTabs payment page for an order
    if (req.method === 'POST' && url.pathname === '/api/checkout'){
      let { order, terms, waiver } = JSON.parse(await readBody(req) || '{}');
      if (!terms || !waiver) return send(res, 400, { error: 'Please agree to the terms and conditions and the health waiver.' });
      const user = currentUser(req); if (!user) return send(res, 401, { error: 'Please sign in to book.' });
      const payer = { name: user.name, email: user.email };   // the payer is the signed-in account
      const cartId = `SFA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      let chk;
      if (order && order.kind === 'game'){
        const gc = checkGameOrder(order, user); if (gc.error) return send(res, gc.status || 400, { error: gc.error });
        order = gc.order; chk = { amount: gc.amount, desc: gc.desc };
        order.waiver = { acceptedBy: user.name, at: Date.now(), for: [user.name], guardian: false };
      } else if (order && order.kind === 'program'){
        const pc = checkProgramOrder(order, user); if (pc.error) return send(res, pc.status || 400, { error: pc.error });
        order = pc.order; chk = { amount: pc.amount, desc: pc.desc };
        // the program waivers, accepted by the payer (as guardian when a child takes part), with each participant's name
        order.waiver = { acceptedBy: user.name, at: Date.now(), for: order.participants.map(x => x.name), guardian: order.participants.some(x => personKey(x) !== personKey(user)) };
        // nothing to pay (a free trial without the kit): confirmed straight away
        if (!chk.amount){
          bookings[cartId] = { cartId, status: 'paid', createdAt: Date.now(), paidAt: Date.now(), amount: 0, order, payer, userId: user.id, free: true };
          save();
          return send(res, 200, { redirect_url: `/result.html?cart=${encodeURIComponent(cartId)}`, cartId });
        }
      } else {
        chk = checkOrder(order, user); if (chk.error) return send(res, chk.status || 400, { error: chk.error });
        order.waiver = { acceptedBy: user.name, at: Date.now(), for: [order.bookingFor.type === 'me' ? user.name : order.bookingFor.name], guardian: order.bookingFor.type === 'child' };
        chk.desc = `${chk.sport.name} · ${chk.court[0]} · ${chk.count} × 1.5 hr · SFA Domes Dammam`;
      }
      if (testMode()){
        const tranRef = 'TEST-' + crypto.randomBytes(5).toString('hex').toUpperCase();
        bookings[cartId] = { cartId, status: 'pending', createdAt: Date.now(), amount: chk.amount, order, payer, userId: user.id, tranRef, test: true };
        save();
        return send(res, 200, { redirect_url: `/test-pay.html?cart=${encodeURIComponent(cartId)}`, cartId });
      }
      const base = baseUrl(req), isPublic = !!process.env.PUBLIC_URL;
      const payload = {
        profile_id: +PT.profileId, tran_type: 'sale', tran_class: 'ecom',
        cart_id: cartId, cart_currency: 'SAR', cart_amount: chk.amount,
        cart_description: chk.desc.slice(0, 120),
        paypage_lang: 'en', hide_shipping: true,
        customer_details: { name: payer.name, email: payer.email, country: 'SA', ...publicIp(req) },
        return: `${base}/paytabs/return`,
        ...(isPublic ? { callback: `${base}/paytabs/callback` } : {}),
      };
      const pt = await paytabs('request', payload);
      if (!pt.redirect_url) return send(res, 502, { error: pt.message || 'PayTabs did not return a payment page.' });
      bookings[cartId] = { cartId, status: 'pending', createdAt: Date.now(), amount: chk.amount, order, payer, userId: user.id, tranRef: pt.tran_ref };
      save();
      return send(res, 200, { redirect_url: pt.redirect_url, cartId });
    }

    // PayTabs sends the payer's browser back here (form POST). Never trust the posted status: ask PayTabs.
    if ((req.method === 'POST' || req.method === 'GET') && url.pathname === '/paytabs/return'){
      const form = new URLSearchParams(req.method === 'POST' ? await readBody(req) : url.search);
      const tranRef = form.get('tranRef') || form.get('tran_ref'), cartId = form.get('cartId') || form.get('cart_id');
      const b = bookings[cartId];
      if (b && tranRef && configured()){
        try {
          const q = await paytabs('query', { profile_id: +PT.profileId, tran_ref: tranRef });
          applyResult(b, q);
        } catch (e) { b.status = 'unknown'; b.message = e.message; save(); }
      }
      return send(res, 303, '', { location: `/result.html?cart=${encodeURIComponent(cartId || '')}` });
    }

    // PayTabs' server-to-server notice (needs PUBLIC_URL). Signed with the server key over the raw body.
    if (req.method === 'POST' && url.pathname === '/paytabs/callback'){
      const raw = await readBody(req);
      const sig = crypto.createHmac('sha256', PT.serverKey || '').update(raw).digest('hex');
      const given = String(req.headers.signature || '');
      if (!configured() || given.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(sig))) return send(res, 401, 'Bad signature');
      const q = JSON.parse(raw), b = bookings[q.cart_id];
      if (b) applyResult(b, q);
      return send(res, 200, 'OK');
    }

    // test mode: the test payment page reports how the tester ended the payment
    if (req.method === 'POST' && url.pathname === '/api/test-pay'){
      const { cart, outcome } = JSON.parse(await readBody(req) || '{}');
      const b = bookings[cart];
      if (!b || !b.test) return send(res, 404, { error: 'Test payment not found.' });
      if (b.status !== 'pending') return send(res, 200, { redirect_url: `/result.html?cart=${encodeURIComponent(cart)}` });
      const R = { approve: ['paid', 'Authorised (test)'], decline: ['failed', 'Declined (test)'], cancel: ['failed', 'Cancelled by the payer (test)'] }[outcome];
      if (!R) return send(res, 400, { error: 'Unknown outcome.' });
      [b.status, b.message] = R; if (b.status === 'paid') b.paidAt = Date.now(); save();
      return send(res, 200, { redirect_url: `/result.html?cart=${encodeURIComponent(cart)}` });
    }

    // what result.html shows
    if (req.method === 'GET' && url.pathname === '/api/booking'){
      const b = bookings[url.searchParams.get('cart')]; if (!b) return send(res, 404, { error: 'Booking not found.' });
      const { cartId, status, amount, order, tranRef, message, paidAt, test, free } = b;
      return send(res, 200, { cartId, status, amount, order, tranRef, message, paidAt, test: !!test, free: !!free });
    }

    if (req.method === 'GET') return serveStatic(req, res, url.pathname);
    send(res, 405, 'Method not allowed');
  } catch (e) {
    console.error(e);
    send(res, e.status ? 502 : 500, { error: e.data?.message || e.message || 'Something went wrong.' });
  }
});

// PayTabs result → booking status. response_status: A authorised, H hold, P pending, V voided, E error, D declined, X expired
function applyResult(b, q){
  const r = q.payment_result || {};
  if (q.cart_id && q.cart_id !== b.cartId) return;
  if (r.response_status === 'A' && +q.cart_amount === b.amount && q.cart_currency === 'SAR'){ b.status = 'paid'; b.paidAt = Date.now(); }
  else if (['D', 'E', 'X', 'V'].includes(r.response_status)) b.status = 'failed';
  else b.status = 'pending';
  b.tranRef = q.tran_ref || b.tranRef; b.message = r.response_message || ''; save();
}

server.listen(PORT, () => console.log(`SFA Domes on http://localhost:${PORT} · payments: ${testMode() ? 'TEST MODE (no money moves)' : 'PayTabs ' + PT.base}`));
