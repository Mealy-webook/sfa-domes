/* Demo mode for the static copy of the prototype (GitHub Pages has no server). Answers every /api/… call in the browser
   with the same rules as server.js: accounts (everyone starts signed in as the demo account Sara; sign-in accepts any
   password), My children, saved courts, court / program / open-game checkout with the test payment page, the
   confirmation, My tickets and booked slots. Nothing leaves the browser: the data lives in this browser's localStorage
   (key sfaDemoDB). No real payments; PayTabs is never called.
   On only at *.github.io, or after opening any page with ?demo=1 (sticky; ?demo=0 turns it off). ?demo-reset=1 starts over.
   Seed: window.SFA_DEMO_SEED (f/demo-seed.js, written by the publish script) — Sara, her children and the bookings the
   review pages link to, with their dates moved by whole weeks to the current week so weekdays and "today" still line up.
   The data files (courts, programs, games) are loaded on demand when a page doesn't have them. */
(() => {
  const qs = new URLSearchParams(location.search);
  try { if (qs.get('demo') === '1') localStorage.setItem('sfaDemo', '1'); if (qs.get('demo') === '0') localStorage.removeItem('sfaDemo'); } catch (e) {}
  let flag = false; try { flag = localStorage.getItem('sfaDemo') === '1'; } catch (e) {}
  if (!/\.github\.io$/i.test(location.hostname) && !flag) return;
  window.SFA_DEMO = true;

  const KEY = 'sfaDemoDB', W = window;
  const pad = n => String(n).padStart(2, '0');
  const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const shiftKey = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return dk(d); };
  const fmtTime = m => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : hex(16));

  // ---- the store
  function seed(){
    const S = W.SFA_DEMO_SEED || { users: {}, bookings: {}, ref: dk(new Date()) };
    const today = parse(dk(new Date())), off = Math.round((today - parse(S.ref)) / (7 * 864e5)) * 7, ms = off * 864e5;
    const db = { v: 1, users: JSON.parse(JSON.stringify(S.users)), bookings: {}, session: S.session || null, out: false };
    for (const [id, b0] of Object.entries(S.bookings)){
      const b = JSON.parse(JSON.stringify(b0)), o = b.order;
      (o.days || []).forEach(d => d.date = shiftKey(d.date, off));
      if (o.start) o.start = shiftKey(o.start, off);
      if (o.kind === 'game' && o.game){ const p = o.game.split('|'); if (p[2]) { p[2] = shiftKey(p[2], off); o.game = p.join('|'); } }
      ['createdAt', 'paidAt'].forEach(k => { if (b[k]) b[k] += ms; }); if (o.waiver && o.waiver.at) o.waiver.at += ms;
      db.bookings[id] = b;
    }
    return db;
  }
  let db = null;
  try { if (qs.get('demo-reset') === '1') localStorage.removeItem(KEY); db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const ready = () => { if (!db) { db = seed(); save(); } };

  // ---- the data files the rules need, loaded once if this page doesn't have them
  const loadScript = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = () => ok(); document.head.appendChild(s); });
  let dataP = null;
  const needData = () => dataP || (dataP = (async () => {
    if (!W.SFA_SPORTS) await loadScript('f/courts-data.js');
    if (!W.SFA_PROGRAMS) await loadScript('f/programs-data.js');
    if (!W.SFA_GAME) await loadScript('f/games-data.js');
  })());

  // ---- helpers ported from server.js
  const holding = b => b.status === 'paid' || (b.status === 'pending' && Date.now() - b.createdAt < 20 * 60e3);
  const personKey = x => `${String(x.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${x.dob}`;
  const peopleOf = o => o.participants || (o.player ? [o.player] : []);
  const emailOk = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const pwOk = pw => typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
  const phoneOk = p => /^\+9665\d{8}$/.test(p || '');
  const findByEmail = e => Object.values(db.users).find(u => u.email === String(e || '').trim().toLowerCase());
  const upgrade = u => { if (!u) return u; if (u.first == null) Object.assign(u, W.SFA_SPLIT_NAME(u.name)); if (u.phone == null) u.phone = ''; (u.participants || []).forEach(c => { if (c.first == null) Object.assign(c, W.SFA_SPLIT_NAME(c.name)); }); return u; };
  const publicUser = u => u && (upgrade(u), { id: u.id, name: u.name, first: u.first, last: u.last, email: u.email, phone: u.phone, gender: u.gender, dob: u.dob, since: u.createdAt, participants: u.participants || [] });
  const currentUser = () => (db.session && db.users[db.session]) || null;
  const demoUser = () => Object.values(db.users).find(u => u.demo) || Object.values(db.users)[0];
  function takenSlots(sport, court){
    const set = new Set(), courts = [court, ...(((W.SFA_LINKS[sport] || {})[court]) || [])];
    for (const b of Object.values(db.bookings)) if (b.order.sport === sport && courts.includes(b.order.court) && holding(b))
      for (const d of b.order.days) for (const s of d.starts) set.add(`${d.date}|${s}`);
    return set;
  }
  const STALE_CHILD = 'That child is no longer in My children. Refresh the page to see your current list.';
  const cleanChild = c => ({ first: String(c.first || '').trim().replace(/\s+/g, ' '), last: String(c.last || '').trim().replace(/\s+/g, ' '), dob: String(c.dob || ''), gender: c.gender });
  function whichChild(x, user, on){
    const saved = (user && user.participants) || []; let c;
    if (x.ref){ c = saved.find(s => s.id === x.ref); if (!c) return { error: STALE_CHILD, status: 409 }; c = { ref: c.id, name: c.name, dob: c.dob, gender: c.gender }; }
    else if (x.child && typeof x.child === 'object'){
      const k = cleanChild(x.child), er = W.SFA_CHILD_ERRORS(k, on); if (Object.keys(er).length) return { error: Object.values(er)[0] };
      const name = W.SFA_FULL_NAME(k), m = saved.find(s => personKey(s) === personKey({ name, dob: k.dob }));
      c = m ? { ref: m.id, name: m.name, dob: m.dob, gender: m.gender } : { ref: null, name, dob: k.dob, gender: k.gender };
    }
    else return { error: 'Choose which child is playing.' };
    if (!W.SFA_CHILD_AGE_OK(c.dob, on)) return { error: `${c.name} must be 6 to 17 on the booking date.` };
    return c;
  }
  function checkOrder(order, user){
    const fail = msg => ({ error: msg }), SP = W.SFA_SPORTS, SCH = W.SFA_SCHEDULE;
    if (!order || typeof order !== 'object') return fail('No order.');
    const sport = SP[order.sport]; if (!sport) return fail('Unknown sport.');
    const court = sport.courts[order.court]; if (!Number.isInteger(order.court) || !court) return fail('Unknown court.');
    if (!Array.isArray(order.days) || !order.days.length) return fail('Pick at least one slot.');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = new Date(today); last.setDate(last.getDate() + SCH.RANGE_DAYS - 1);
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), taken = takenSlots(order.sport, order.court), seen = new Set();
    let count = 0;
    for (const d of order.days){
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return fail('Bad date.');
      const date = parse(d.date);
      if (dk(date) !== d.date || date < today || date > last) return fail(`${d.date} can't be booked.`);
      if (!Array.isArray(d.starts) || !d.starts.length) return fail('Empty day.');
      for (const s of d.starts){
        const k = `${d.date}|${s}`;
        if (!SCH.startsFor(d.date).includes(s) || seen.has(k)) return fail('Bad time slot.');
        if (d.date === dk(today) && s <= nowMin) return fail(`${fmtTime(s)} on ${d.date} has already started.`);
        if (taken.has(k) || W.SFA_IS_BOOKED(order.sport, order.court, d.date, s)) return fail(`${fmtTime(s)} on ${d.date} was just booked. Pick another slot.`);
        const lad = W.SFA_IS_LADIES(order.sport, order.court, d.date, s);
        if (lad && !order.ladies) return fail(`${fmtTime(s)} on ${d.date} is ladies hours. Book it from Ladies hours.`);
        if (!lad && order.ladies) return fail(`${fmtTime(s)} on ${d.date} isn't in ladies hours.`);
        seen.add(k); count++;
      }
    }
    const bf = order.bookingFor || { type: 'me' }, first = order.days.map(d => d.date).sort()[0];
    order.ladies = !!order.ladies;
    if (order.ladies && bf.type === 'me' && (user && user.gender) !== 'female') return fail('Ladies hours are for women and girls only.');
    if (bf.type === 'child'){
      const c = whichChild(bf, user, first); if (c.error) return c;
      if (order.ladies && c.gender !== 'female') return fail('Ladies hours are for women and girls only.');
      order.bookingFor = { type: 'child', ref: c.ref, name: c.name, dob: c.dob, gender: c.gender };
    }
    else if (bf.type === 'me') order.bookingFor = { type: 'me' };
    else if (bf.type === 'other'){
      const name = String(bf.name || '').trim().replace(/\s+/g, ' '), email = String(bf.email || '').trim();
      if (name.split(' ').length < 2) return fail("Add the player's full name.");
      if (!/^\+9665\d{8}$/.test(bf.phone || '')) return fail("Add the player's mobile number.");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Check the email address.');
      order.bookingFor = { type: 'other', name, phone: bf.phone, email };
    }
    else return fail('Choose who the booking is for.');
    const slotPrice = court[5] * SCH.SLOT / 60;
    return { sport, court, count, amount: Math.round(slotPrice * count * 100) / 100 };
  }
  function checkProgramOrder(order, user){
    const fail = msg => ({ error: msg }), PR = W.SFA_PROGRAMS, PLANS = W.SFA_PROGRAM_PLANS, KIT = W.SFA_PROGRAM_KIT, MAX = W.SFA_PROGRAM_MAX_PEOPLE;
    const p = PR[order.program]; if (!p) return fail('Unknown program.');
    if (!Object.hasOwn(PLANS, order.plan || '')) return fail('Choose a free trial or a subscription.');
    let renew = null;
    if (order.renew){
      const ob = db.bookings[order.renew];
      if (!ob || ob.userId !== user.id || ob.status !== 'paid' || ob.order.kind !== 'program' || ob.order.program !== order.program || ob.order.plan === 'trial') return fail("That program can't be renewed.");
      if (Object.values(db.bookings).some(b => b.order.renewOf === ob.cartId && b.status === 'paid')) return fail('This program has already been renewed.');
      const R = W.SFA_PROGRAM_RENEW(p, ob.order.days.map(d => d.date).sort().pop());
      if (!R.open) return fail('Renewal opens in the last week of the program and closes 7 days after it ends.');
      if (order.plan !== 'month' || order.start !== R.start || order.time !== ob.order.time) return fail('A renewal is one more month at the same time, from the next training day.');
      renew = ob;
    }
    else if (!W.SFA_PROGRAM_START_DAYS(p).includes(order.start)) return fail('Pick one of the next 3 training days to start.');
    const slot = p.slots.find(s => s.time === order.time); if (!slot) return fail('Pick a time slot.');
    const list = Array.isArray(order.participants) ? order.participants : [];
    if (!list.length) return fail('Add at least one participant.');
    if (list.length > MAX) return fail(`A booking can hold up to ${MAX} participants.`);
    if (slot.enrolled + list.length > p.capacity) return fail(p.capacity - slot.enrolled > 0 ? `Only ${p.capacity - slot.enrolled} places are left at that time.` : 'That time slot is full. Pick another one.');
    const people = [];
    for (const x of list){
      let who;
      if (x && x.ref === 'me') who = { name: user.name, dob: user.dob, gender: user.gender, self: true };
      else if (x && (x.ref || x.child)){ const c = whichChild(x, user, order.start); if (c.error) return c; who = { name: c.name, dob: c.dob, gender: c.gender, ref: c.ref }; }
      else return fail('Choose who is taking each place.');
      if (!who.dob || !who.gender) return fail('Add your date of birth and gender to your account to take part yourself.');
      const why = W.SFA_PROGRAM_ELIGIBLE(p, who, order.start);
      if (why === 'age') return fail(`${who.name} is outside this program's age range (${p.ages}).`);
      if (why === 'gender') return fail(`${p.name.en} is for women and girls only.`);
      if (people.some(o => personKey(o) === personKey(who))) return fail(`${who.name} can't take two places in the same session.`);
      if (order.plan === 'trial' && Object.values(db.bookings).some(b => b.userId === user.id && b.status === 'paid' && b.order.kind === 'program' && b.order.program === order.program && b.order.plan === 'trial' && peopleOf(b.order).some(o => personKey(o) === personKey(who) || (!o.dob && o.name.trim().toLowerCase() === who.name.toLowerCase()))))
        return fail(`${who.name} has already had a free trial of this program.`);
      delete who.self; people.push(who);
    }
    const kits = Math.max(0, Math.min(Array.isArray(order.kits) ? order.kits.length : (+order.kits || 0), 99));   // a quantity; kits have no sizes (Ahmed, 2026-11-11)
    if (kits && order.plan === 'trial') return fail('Add-ons come with a subscription, not a free trial.');
    if (kits > 10) return fail('Up to 10 kits per booking.');
    const dates = W.SFA_PROGRAM_SESSIONS(p, order.start, order.plan);
    const amount = people.length * (renew ? W.SFA_RENEW_PRICE(p) : W.SFA_PROGRAM_PRICE(p, order.plan)) + kits * KIT.price;
    return { amount, order: { kind: 'program', program: order.program, sport: p.sport, plan: order.plan, start: order.start, time: slot.time, participants: people, kit: kits ? { qty: kits } : null, days: dates.map(date => ({ date, starts: [slot.time] })), ...(renew ? { renewOf: renew.cartId } : {}) } };
  }
  const gameBookings = id => Object.values(db.bookings).filter(b => b.order.kind === 'game' && b.order.game === id && holding(b));
  const gamePlayer = b => b.order.bookingFor && b.order.bookingFor.type === 'child' ? 'child:' + (b.order.bookingFor.ref || b.order.bookingFor.name) : 'me';
  function checkGameOrder(order, user){
    const fail = (error, status) => ({ error, status });
    const g = W.SFA_GAME(order && order.game); if (!g) return fail('That game is no longer on.', 409);
    const now = new Date(), today = dk(now);
    if (g.date < today || (g.date === today && g.start <= now.getHours() * 60 + now.getMinutes())) return fail('That game has already started.', 409);
    const ref = order.player && order.player.ref ? order.player.ref : 'me';
    let p;
    if (ref === 'me'){ if (!user.dob) return fail('Add your date of birth in My account to join a game.'); p = { type: 'me', name: user.name, dob: user.dob, gender: user.gender }; }
    else { const c = (user.participants || []).find(x => x.id === ref); if (!c) return fail(STALE_CHILD, 409); p = { type: 'child', ref: c.id, name: c.name, dob: c.dob, gender: c.gender }; }
    if (W.SFA_GAME_FITS(g, p)) return fail(g.who === 'kids' ? (p.type === 'me' ? 'This game is for kids aged 6 to 17.' : `${p.name} can't join: this game is for kids aged 6 to 17.`) : (p.type === 'me' ? 'This game is for adults (18+).' : `${p.name} can't join: this game is for adults (18+).`));
    const key = p.type === 'me' ? 'me' : 'child:' + p.ref, held = gameBookings(g.id);
    if (held.some(b => b.userId === user.id && gamePlayer(b) === key)) return fail(p.type === 'me' ? "You've already joined this game." : `${p.name} is already in this game.`, 409);
    if (g.base + held.length >= g.spots) return fail('That game is full.', 409);
    const firstFree = !Object.values(db.bookings).some(b => b.userId === user.id && b.order.kind === 'game' && b.status === 'paid' && gamePlayer(b) === key);
    return { amount: firstFree ? 0 : g.price, player: p, order: { kind: 'game', game: g.id, sport: g.sport, court: g.court, days: [{ date: g.date, starts: [g.start] }], who: g.who, format: g.format, spots: g.spots, firstFree,
      bookingFor: p.type === 'me' ? { type: 'me' } : { type: 'child', ref: p.ref, name: p.name, dob: p.dob, gender: p.gender } } };
  }
  const pub = b => { const { cartId, status, amount, order, tranRef, message, paidAt, createdAt, test, free, cancelledAt, refund } = b; return { cartId, status, amount, order, tranRef, message, paidAt, createdAt, test: !!test, free: !!free, cancelledAt, refund }; };
  const resets = new Map();

  // ---- the routes
  function route(path, method, body, q){
    const POST = method === 'POST';
    switch (path){
      case '/api/auth/me': {
        let u = currentUser();
        if (!u && !db.out){ u = demoUser(); if (u) db.session = u.id; }
        return [200, { user: u ? publicUser(u) : null }];
      }
      case '/api/auth/signup': {
        const parts = body.first != null || body.last != null ? { first: String(body.first || '').trim().replace(/\s+/g, ' '), last: String(body.last || '').trim().replace(/\s+/g, ' ') } : W.SFA_SPLIT_NAME(body.name);
        const name = W.SFA_FULL_NAME(parts), email = String(body.email || '').trim().toLowerCase(), phone = String(body.phone || '').replace(/\s+/g, ''), errors = {};
        if (!parts.first) errors.first = 'Enter your first name.';
        if (!parts.last) errors.last = 'Enter your last name.';
        if (!phoneOk(phone)) errors.phone = 'Enter a Saudi mobile number starting with 5.';
        if (!emailOk(email)) errors.email = 'Enter a valid email.'; else if (findByEmail(email)) errors.email = 'An account with this email already exists. Sign in instead.';
        if (!['female', 'male'].includes(body.gender)) errors.gender = 'Choose one.';
        const dob = /^\d{4}-\d{2}-\d{2}$/.test(body.dob || '') ? new Date(body.dob + 'T00:00:00') : null;
        if (!dob || isNaN(dob) || dob > new Date() || dob < new Date('1900-01-01')) errors.dob = 'Enter your date of birth.';
        if (!pwOk(body.password)) errors.password = 'Use at least 8 characters with a letter and a number.';
        if (Object.keys(errors).length) return [400, { errors }];
        const id = uuid(); db.users[id] = { id, name, ...parts, email, phone, gender: body.gender, dob: body.dob, createdAt: Date.now() };
        db.session = id; db.out = false; return [200, { user: publicUser(db.users[id]) }];
      }
      case '/api/auth/login': {
        const email = String(body.email || '').trim().toLowerCase() || 'guest@sfa.test';
        let u = findByEmail(email);
        if (!u){
          const words = email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1));
          const name = (words.length > 1 ? words : [words[0] || 'Guest', 'Player']).join(' '), id = uuid();
          u = db.users[id] = { id, name, ...W.SFA_SPLIT_NAME(name), email, phone: '', gender: '', dob: '', createdAt: Date.now(), quick: true };
        }
        db.session = u.id; db.out = false; return [200, { user: publicUser(u) }];
      }
      case '/api/auth/logout': db.session = null; db.out = true; return [200, { ok: true }];
      case '/api/auth/forgot': {
        if (!emailOk(body.email)) return [400, { error: 'Enter a valid email.' }];
        const u = findByEmail(body.email), out = { ok: true, test: true };
        if (u){ const token = hex(24); resets.set(token, { userId: u.id, exp: Date.now() + 15 * 60e3 }); out.testToken = token; }
        return [200, out];
      }
      case '/api/auth/reset': {
        const r = resets.get(body.token);
        if (!r || r.exp < Date.now()) return [400, { error: 'This reset link has expired. Ask for a new one.' }];
        if (!pwOk(body.password)) return [400, { errors: { password: 'Use at least 8 characters with a letter and a number.' } }];
        resets.delete(body.token); db.session = r.userId; db.out = false; return [200, { user: publicUser(db.users[r.userId]) }];
      }
      case '/api/auth/bookings': {
        const u = currentUser(); if (!u) return [401, { error: 'Please sign in.' }];
        return [200, { bookings: Object.values(db.bookings).filter(b => b.userId === u.id && b.status !== 'pending').sort((a, b) => b.createdAt - a.createdAt).map(pub) }];
      }
      case '/api/auth/profile': {
        const u = currentUser(); if (!u) return [401, { error: 'Please sign in.' }];
        upgrade(u);
        if (POST){
          if ((body.email != null && String(body.email).trim().toLowerCase() !== u.email) || (body.phone != null && body.phone !== u.phone)) return [400, { error: "Email and phone can't be changed here." }];
          const first = String(body.first || '').trim().replace(/\s+/g, ' '), last = String(body.last || '').trim().replace(/\s+/g, ' '), dob = String(body.dob || ''), errors = {};
          if (!first) errors.first = 'Enter your first name.';
          if (!last) errors.last = 'Enter your last name.';
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob > W.SFA_TODAY() || dob < '1900-01-01') errors.dob = 'Enter your date of birth.';
          if (!['female', 'male'].includes(body.gender)) errors.gender = 'Choose one.';
          if (Object.keys(errors).length) return [400, { errors }];
          Object.assign(u, { first, last, name: W.SFA_FULL_NAME({ first, last }), dob, gender: body.gender });
        }
        return [200, { user: publicUser(u) }];
      }
      case '/api/auth/participants': {
        const u = currentUser(); if (!u) return [401, { error: 'Please sign in.' }];
        upgrade(u); u.participants = u.participants || [];
        const LIMIT = W.SFA_CHILD.LIMIT, clean = cleanChild, FULL = W.SFA_FULL_NAME, ERR = W.SFA_CHILD_ERRORS;
        const dupe = (c, id) => u.participants.some(x => x.id !== id && personKey(x) === personKey({ name: FULL(c), dob: c.dob }));
        if (POST && body.remove) u.participants = u.participants.filter(x => x.id !== body.remove);
        if (POST && body.ensure){
          const c = clean(body.ensure), errors = ERR(c); if (Object.keys(errors).length) return [400, { errors }];
          const ex = u.participants.find(x => personKey(x) === personKey({ name: FULL(c), dob: c.dob }));
          if (ex) return [200, { participants: u.participants, limit: LIMIT, id: ex.id, existed: true }];
          if (u.participants.length >= LIMIT) return [400, { error: `You can save up to ${LIMIT} children.` }];
          const id = hex(6); u.participants.push({ id, ...c, name: FULL(c) });
          return [200, { participants: u.participants, limit: LIMIT, id, existed: false }];
        }
        if (POST && body.add){
          if (u.participants.length >= LIMIT) return [400, { error: `You can save up to ${LIMIT} children.` }];
          const c = clean(body.add), errors = ERR(c);
          if (!errors.first && !errors.last && !errors.dob && dupe(c)) errors.first = 'This child is already in your list.';
          if (Object.keys(errors).length) return [400, { errors }];
          u.participants.push({ id: hex(6), ...c, name: FULL(c) });
        }
        if (POST && body.edit){
          const x = u.participants.find(y => y.id === body.edit); if (!x) return [404, { error: 'That child is no longer on your account.' }];
          const c = clean(body), errors = ERR(c);
          if (!errors.first && !errors.last && !errors.dob && dupe(c, x.id)) errors.first = 'This child is already in your list.';
          if (Object.keys(errors).length) return [400, { errors }];
          Object.assign(x, c, { name: FULL(c) });
        }
        return [200, { participants: u.participants, limit: LIMIT }];
      }
      case '/api/auth/favorites': {
        const u = currentUser(); if (!u) return [401, { error: 'Please sign in.' }];
        u.favorites = u.favorites || [];
        if (POST){
          const sp = W.SFA_SPORTS[body.sport], c = sp && sp.courts[body.court];
          if (!c || !Number.isInteger(body.court)) return [400, { error: 'Unknown court.' }];
          const k = `${body.sport}|${body.court}`, has = u.favorites.includes(k);
          if (body.on && !has) u.favorites.unshift(k);
          if (!body.on && has) u.favorites = u.favorites.filter(x => x !== k);
        }
        return [200, { favorites: u.favorites }];
      }
      case '/api/auth/cancel': {
        const u = currentUser(); if (!u) return [401, { error: 'Please sign in.' }];
        const b = db.bookings[body.cart]; if (!b || b.userId !== u.id) return [404, { error: 'Booking not found.' }];
        if (b.status !== 'paid') return [400, { error: 'Only confirmed bookings can be cancelled.' }];
        const first = Math.min(...b.order.days.flatMap(d => d.starts.map(s => { const x = parse(d.date); x.setMinutes(s); return x.getTime(); })));
        if (first - Date.now() < 48 * 3600e3) return [400, { error: 'Free cancellation ends 48 hours before the first session.' }];
        b.status = 'cancelled'; b.cancelledAt = Date.now(); b.refund = b.amount || 0;
        return [200, { ok: true, refund: b.refund }];
      }
      case '/api/booked': return [200, [...takenSlots(q.get('sport'), +q.get('court'))]];
      case '/api/games': {
        const days = new Set(String(q.get('days') || '').split(',')), me = currentUser(), out = {};
        for (const b of Object.values(db.bookings)) if (b.order.kind === 'game' && holding(b) && days.has(b.order.days[0].date)){
          const o = out[b.order.game] || (out[b.order.game] = { taken: 0, mine: false }); o.taken++; if (me && b.userId === me.id) o.mine = true;
        }
        return [200, out];
      }
      case '/api/config': return [200, { mode: 'test', demo: true }];
      case '/api/checkout': {
        let { order, terms, waiver } = body;
        if (!terms || !waiver) return [400, { error: 'Please agree to the terms and conditions and the health waiver.' }];
        const user = currentUser(); if (!user) return [401, { error: 'Please sign in to book.' }];
        upgrade(user);
        const payer = { name: user.name, email: user.email }, cartId = `SFA-${Date.now().toString(36).toUpperCase()}-${hex(2).toUpperCase()}`;
        let amount;
        if (order && order.kind === 'game'){
          const gc = checkGameOrder(order, user); if (gc.error) return [gc.status || 400, { error: gc.error }];
          order = gc.order; amount = gc.amount; order.waiver = { acceptedBy: user.name, at: Date.now(), for: [gc.player.name], guardian: gc.player.type === 'child' };
          if (!amount){ db.bookings[cartId] = { cartId, status: 'paid', createdAt: Date.now(), paidAt: Date.now(), amount: 0, order, payer, userId: user.id, free: true }; return [200, { redirect_url: `result.html?cart=${encodeURIComponent(cartId)}`, cartId }]; }
        } else if (order && order.kind === 'program'){
          const pc = checkProgramOrder(order, user); if (pc.error) return [pc.status || 400, { error: pc.error }];
          order = pc.order; amount = pc.amount;
          order.waiver = { acceptedBy: user.name, at: Date.now(), for: order.participants.map(x => x.name), guardian: order.participants.some(x => personKey(x) !== personKey(user)) };
          if (!amount){ db.bookings[cartId] = { cartId, status: 'paid', createdAt: Date.now(), paidAt: Date.now(), amount: 0, order, payer, userId: user.id, free: true }; return [200, { redirect_url: `result.html?cart=${encodeURIComponent(cartId)}`, cartId }]; }
        } else {
          const chk = checkOrder(order, user); if (chk.error) return [chk.status || 400, { error: chk.error }];
          amount = chk.amount; order.waiver = { acceptedBy: user.name, at: Date.now(), for: [order.bookingFor.type === 'me' ? user.name : order.bookingFor.name], guardian: order.bookingFor.type === 'child' };
        }
        db.bookings[cartId] = { cartId, status: 'pending', createdAt: Date.now(), amount, order, payer, userId: user.id, tranRef: 'TEST-' + hex(5).toUpperCase(), test: true };
        return [200, { redirect_url: `test-pay.html?cart=${encodeURIComponent(cartId)}`, cartId }];
      }
      case '/api/test-pay': {
        const b = db.bookings[body.cart];
        if (!b || !b.test) return [404, { error: 'Test payment not found.' }];
        if (b.status !== 'pending') return [200, { redirect_url: `result.html?cart=${encodeURIComponent(body.cart)}` }];
        const R = { approve: ['paid', 'Authorised (test)'], decline: ['failed', 'Declined (test)'], cancel: ['failed', 'Cancelled by the payer (test)'] }[body.outcome];
        if (!R) return [400, { error: 'Unknown outcome.' }];
        [b.status, b.message] = R; if (b.status === 'paid') b.paidAt = Date.now();
        return [200, { redirect_url: `result.html?cart=${encodeURIComponent(body.cart)}` }];
      }
      case '/api/booking': {
        const b = db.bookings[q.get('cart')]; if (!b) return [404, { error: 'Booking not found.' }];
        const { cartId, status, amount, order, tranRef, message, paidAt, test, free, cancelledAt, refund } = b;
        return [200, { cartId, status, amount, order, tranRef, message, paidAt, test: !!test, free: !!free, cancelledAt, refund }];
      }
    }
    return [404, { error: 'Not found.' }];
  }

  const realFetch = W.fetch.bind(W);
  W.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, location.href), at = url.pathname.indexOf('/api/');
    if (url.origin !== location.origin || at < 0) return realFetch(input, init);
    ready(); await needData();
    const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
    let body = {}; try { body = init.body ? JSON.parse(init.body) : {}; } catch (e) {}
    let out;
    try { out = route(url.pathname.slice(at), method, body, url.searchParams); } catch (e) { console.error(e); out = [500, { error: e.message || 'Something went wrong.' }]; }
    save();
    return new Response(JSON.stringify(out[1]), { status: out[0], headers: { 'content-type': 'application/json' } });
  };
})();
