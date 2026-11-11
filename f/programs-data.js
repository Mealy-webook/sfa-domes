/* Training programs: coached sessions on fixed weekdays and time slots. A player picks a start day and a time slot, then
   either a free trial session or a one-month subscription (4 weeks of the program's training days), and can add the
   Training Kit. Ahmed's 6–8 Football Program is the real example (about, instructions and terms are his text; it trains
   3 days a week, so a month is its 12 sessions); the other four are realistic samples until the real programs arrive.
   Every text has en and ar. The SAR 400 month and SAR 150 kit are confirmed; other prices are placeholders. Shared by program.html, index.html's
   Training programs row, f/tickets.js and server.js (which re-prices and checks every program order).

   window.SFA_PROGRAMS[id] = { sport, img | court, focus, photos[{ src, focus }], name, ages, level, minutes, capacity, month (SAR), women?,
     days [0 = Sun … 6 = Sat], slots [{ time (minutes), coach, enrolled }], about, learn[] }
   window.SFA_PROGRAM_KIT = { price, sizes[], name, items }
   window.SFA_PROGRAM_INSTRUCTIONS / SFA_PROGRAM_TERMS: shared by every program.
   window.SFA_PROGRAM_SESSIONS(program, start, plan) → the session dates ('YYYY-MM-DD') a plan covers from the start day.
   window.SFA_PROGRAM_PLANS / _PRICE(program, plan) / _FULL_PRICE → plans trial | month | month2 | month3 and their prices.
   window.SFA_PROGRAM_START_DAYS(program) → the next 3 training days ('YYYY-MM-DD'), the only days a plan can start.
   window.SFA_PROGRAM_ELIGIBLE(program, { dob, gender }, start) → null, or 'age' / 'gender' when that person can't take part.
   photos is the program page's gallery (first one leads); img / court + focus is the single photo on cards and tickets. */
(() => {
  const coach = {
    faisal: { en: 'Coach Faisal Al-Harbi', ar: 'المدرب فيصل الحربي' },
    omar: { en: 'Coach Omar Al-Dossary', ar: 'المدرب عمر الدوسري' },
    khaled: { en: 'Coach Khaled Al-Shehri', ar: 'المدرب خالد الشهري' },
    noura: { en: 'Coach Noura Al-Mutairi', ar: 'المدربة نورة المطيري' },
    reem: { en: 'Coach Reem Al-Ghamdi', ar: 'المدربة ريم الغامدي' },
  };

  window.SFA_PROGRAMS = {
    'football-6-8': {
      sport: 'football', img: 'f/sports-photos/football.jpg', focus: '50% 22%',
      photos: [{ src: 'f/sports-photos/football.jpg', focus: '50% 22%' }, { src: 'f/courts/football.jpg', focus: '50% 50%' }, { src: 'f/a_040.webp', focus: '50% 60%' }, { src: 'f/a_001.webp', focus: '50% 50%' }],
      name: { en: '6–8 Football Program', ar: 'برنامج كرة القدم للأعمار من 6 إلى 8' },
      ages: '6–8', level: { en: 'Beginner', ar: 'مبتدئ' }, minutes: 90, capacity: 16, month: 400, days: [0, 2, 4],
      about: {
        en: 'The 6 to 8 Football Program offers 12 engaging sessions, each 90 minutes long, for children under 8 years old. The program focuses on refining fundamental individual skills such as ball control and dribbling and understanding the game through simple group activities. The goal is to build a strong foundation for players in a safe, stimulating environment that encourages discovery and cooperation.',
        ar: 'يقدّم برنامج كرة القدم لأعمار 6 إلى 8 سنوات 12 جلسة ممتعة، مدة كل منها 90 دقيقة، للأطفال دون سن الثامنة. يركّز البرنامج على صقل المهارات الفردية الأساسية مثل التحكم بالكرة والمراوغة، وفهم اللعبة من خلال أنشطة جماعية بسيطة. والهدف بناء أساس متين للاعبين في بيئة آمنة ومحفّزة تشجّع على الاستكشاف والتعاون.',
      },
      learn: [
        { en: 'Ball control', ar: 'التحكم بالكرة' },
        { en: 'Dribbling', ar: 'المراوغة' },
        { en: 'Understanding the game through simple group activities', ar: 'فهم اللعبة من خلال أنشطة جماعية بسيطة' },
        { en: 'Cooperation in a safe, encouraging environment', ar: 'التعاون في بيئة آمنة ومشجّعة' },
      ],
      slots: [{ time: 990, coach: coach.faisal, enrolled: 11 }, { time: 1080, coach: coach.omar, enrolled: 16 }],
    },
    'football-9-12': {
      sport: 'football', court: 0, focus: '50% 50%',
      photos: [{ src: 'f/courts/football.jpg', focus: '50% 50%' }, { src: 'f/sports-photos/football.jpg', focus: '50% 22%' }, { src: 'f/a_040.webp', focus: '50% 60%' }, { src: 'f/a_001.webp', focus: '50% 50%' }],
      name: { en: '9–12 Football Program', ar: 'برنامج كرة القدم للأعمار من 9 إلى 12' },
      ages: '9–12', level: { en: 'Intermediate', ar: 'متوسط' }, minutes: 90, capacity: 18, month: 400, days: [1, 3],
      about: {
        en: 'The 9 to 12 Football Program trains twice a week, in 90-minute sessions, for players who already know the basics. Sessions build passing, receiving and positioning, then put them to work in small-sided games, so players learn to read the game and play as a team.',
        ar: 'يُقام برنامج كرة القدم لأعمار 9 إلى 12 سنة مرتين أسبوعيًا، في جلسات مدة كل منها 90 دقيقة، للاعبين الذين يعرفون الأساسيات. تطوّر الجلسات التمرير والاستلام والتمركز، ثم تطبّقها في مباريات مصغّرة، ليتعلم اللاعبون قراءة اللعب واللعب كفريق.',
      },
      learn: [
        { en: 'Passing and receiving under pressure', ar: 'التمرير والاستلام تحت الضغط' },
        { en: 'Positioning and moving off the ball', ar: 'التمركز والتحرك دون كرة' },
        { en: 'Small-sided games', ar: 'مباريات مصغّرة' },
        { en: 'Playing as a team', ar: 'اللعب كفريق' },
      ],
      slots: [{ time: 1080, coach: coach.omar, enrolled: 9 }, { time: 1170, coach: coach.faisal, enrolled: 14 }],
    },
    'basketball-skills': {
      sport: 'basketball', img: 'f/sports-photos/basketball.jpg', focus: '55% 34%',
      photos: [{ src: 'f/sports-photos/basketball.jpg', focus: '55% 34%' }, { src: 'f/courts/basketball.jpg', focus: '50% 50%' }, { src: 'f/a_040.webp', focus: '50% 60%' }, { src: 'f/a_001.webp', focus: '50% 50%' }],
      name: { en: 'Basketball Skills Program', ar: 'برنامج مهارات كرة السلة' },
      ages: '10–14', level: { en: 'Beginner to intermediate', ar: 'مبتدئ إلى متوسط' }, minutes: 60, capacity: 14, month: 350, days: [2, 4],
      about: {
        en: 'Two 60-minute sessions a week on the fundamentals of basketball: ball handling, shooting form, passing and defence, finishing every session with a coached game. Players leave with the skills and confidence to join a team.',
        ar: 'جلستان أسبوعيًا مدة كل منها 60 دقيقة على أساسيات كرة السلة: التحكم بالكرة، وأسلوب التصويب، والتمرير، والدفاع، وتنتهي كل جلسة بمباراة بإشراف المدرب. يغادر اللاعبون بالمهارات والثقة للانضمام إلى فريق.',
      },
      learn: [
        { en: 'Ball handling with both hands', ar: 'التحكم بالكرة باليدين' },
        { en: 'Shooting form', ar: 'أسلوب التصويب' },
        { en: 'Passing and defence', ar: 'التمرير والدفاع' },
        { en: 'A coached game every session', ar: 'مباراة بإشراف المدرب في كل جلسة' },
      ],
      slots: [{ time: 1020, coach: coach.khaled, enrolled: 8 }, { time: 1110, coach: coach.khaled, enrolled: 2 }],
    },
    'ladies-badminton': {
      sport: 'badminton', img: 'f/sports-photos/badminton.jpg', focus: '50% 28%', women: true,
      photos: [{ src: 'f/sports-photos/badminton.jpg', focus: '50% 28%' }, { src: 'f/courts/badminton.jpg', focus: '50% 50%' }, { src: 'f/a_040.webp', focus: '50% 60%' }, { src: 'f/a_001.webp', focus: '50% 50%' }],
      name: { en: 'Ladies Badminton Program', ar: 'برنامج الريشة الطائرة للسيدات' },
      ages: '16+', level: { en: 'All levels', ar: 'جميع المستويات' }, minutes: 90, capacity: 12, month: 380, days: [3, 6],
      about: {
        en: 'Two 90-minute sessions a week during Ladies hours, run by a female coach. Learn the grips, footwork and strokes, then play doubles in every session. Open to beginners and returning players.',
        ar: 'جلستان أسبوعيًا مدة كل منها 90 دقيقة خلال ساعات السيدات، بإشراف مدرّبة. تعلّمي طرق المسك وحركة القدمين والضربات، ثم العبي الزوجي في كل جلسة. مناسب للمبتدئات والعائدات إلى اللعب.',
      },
      learn: [
        { en: 'Grips and footwork', ar: 'طرق المسك وحركة القدمين' },
        { en: 'Clears, drops and smashes', ar: 'الضربات العالية والساقطة والساحقة' },
        { en: 'Doubles play', ar: 'اللعب الزوجي' },
        { en: 'Fitness and agility', ar: 'اللياقة والرشاقة' },
      ],
      slots: [{ time: 600, coach: coach.noura, enrolled: 7 }, { time: 1020, coach: coach.noura, enrolled: 12 }],
    },
    'girls-volleyball': {
      sport: 'volleyball', img: 'f/sports-photos/volleyball.jpg', focus: '50% 26%', women: true,
      photos: [{ src: 'f/sports-photos/volleyball.jpg', focus: '50% 26%' }, { src: 'f/courts/volleyball.jpg', focus: '50% 50%' }, { src: 'f/a_040.webp', focus: '50% 60%' }, { src: 'f/a_001.webp', focus: '50% 50%' }],
      name: { en: 'Girls Volleyball Program', ar: 'برنامج الكرة الطائرة للفتيات' },
      ages: '13–17', level: { en: 'Beginner', ar: 'مبتدئ' }, minutes: 90, capacity: 14, month: 300, days: [4],
      about: {
        en: 'A weekly 90-minute session for girls new to volleyball. Players learn to pass, set and serve, how a rotation works, and play a short match at the end of every session with a female coach.',
        ar: 'جلسة أسبوعية مدة كل منها 90 دقيقة للفتيات الجديدات على الكرة الطائرة. تتعلّم اللاعبات الاستقبال والإعداد والإرسال وطريقة الدوران، ويلعبن مباراة قصيرة في نهاية كل جلسة بإشراف مدرّبة.',
      },
      learn: [
        { en: 'Passing and setting', ar: 'الاستقبال والإعداد' },
        { en: 'Serving', ar: 'الإرسال' },
        { en: 'How a rotation works', ar: 'طريقة الدوران' },
        { en: 'A short match every session', ar: 'مباراة قصيرة في كل جلسة' },
      ],
      slots: [{ time: 1020, coach: coach.reem, enrolled: 5 }],
    },
  };

  // Ahmed's text, lightly copy-edited (capitals, punctuation); the same for every program
  window.SFA_PROGRAM_INSTRUCTIONS = [
    { en: 'Wear the official training kit during all sessions.', ar: 'ارتدِ زي التدريب الرسمي في جميع الجلسات.' },
    { en: 'Wear suitable sports shoes for the courts and halls.', ar: 'ارتدِ أحذية رياضية مناسبة للملاعب والصالات.' },
    { en: 'Arrive at least 15 minutes before the training session to ensure full readiness.', ar: 'احضر قبل موعد الجلسة التدريبية بـ 15 دقيقة على الأقل لتكون جاهزًا تمامًا.' },
    { en: 'Eat at least two hours before training to ensure optimal performance.', ar: 'تناول الطعام قبل التدريب بساعتين على الأقل لتحقيق أفضل أداء.' },
  ];
  window.SFA_PROGRAM_TERMS = [
    { en: 'You can cancel for free, with a full refund, up to 48 hours before the first session. After that, subscriptions are non-refundable.', ar: 'يمكنك الإلغاء مجانًا مع استرداد كامل المبلغ حتى 48 ساعة قبل الجلسة الأولى. بعد ذلك، تكون الاشتراكات غير قابلة للاسترداد.' },
    { en: 'Renew within the last week of your program, or up to 7 days after it ends, to get 20% off the next month.', ar: 'جدّد خلال الأسبوع الأخير من برنامجك أو حتى 7 أيام بعد انتهائه لتحصل على خصم 20% على الشهر التالي.' },
    { en: 'Registration is confirmed only upon issuing the payment receipt and sending the confirmation to your registered email.', ar: 'لا يُؤكَّد التسجيل إلا بعد إصدار إيصال الدفع وإرسال التأكيد إلى بريدك الإلكتروني المسجّل.' },
    { en: 'Please ensure that the child participant arrives before the start of the training session to fully benefit from the program.', ar: 'يرجى التأكد من وصول الطفل المشارك قبل بدء الجلسة التدريبية ليستفيد من البرنامج بالكامل.' },
    { en: 'Late arrivals will not be compensated.', ar: 'لن يُعوَّض التأخير عن الحضور.' },
    { en: 'Out of respect for other participants, please do not enter the courts before the start of the session.', ar: 'احترامًا للمشاركين الآخرين، يرجى عدم دخول الملاعب قبل بدء الجلسة.' },
    { en: 'Participants must also leave the courts at the end of the session.', ar: 'ويجب على المشاركين مغادرة الملاعب عند انتهاء الجلسة.' },
    { en: 'Set-up, preparation and planning are included within the session time.', ar: 'التجهيز والإعداد والتخطيط ضمن وقت الجلسة.' },
    { en: 'All participants must cooperate and follow the instructions of the coach or staff on duty to ensure a safe and organized environment.', ar: 'يجب على جميع المشاركين التعاون واتباع تعليمات المدرب أو الموظف المناوب لضمان بيئة آمنة ومنظّمة.' },
    { en: 'The volume of music or any announcements inside the courts must be kept low.', ar: 'يجب إبقاء صوت الموسيقى أو أي إعلانات داخل الملاعب منخفضًا.' },
    { en: 'The duty manager has the right to control or remove any disruptive audio equipment.', ar: 'يحق للمدير المناوب التحكم في أي جهاز صوتي مزعج أو إزالته.' },
    { en: 'All participants and parents must comply with the Domes entry and registration procedures at the gate.', ar: 'يجب على جميع المشاركين وأولياء الأمور الالتزام بإجراءات الدخول والتسجيل عند بوابة القباب.' },
    { en: 'The use of electronic shisha, vapes or smoking is prohibited.', ar: 'يُمنع استخدام الشيشة الإلكترونية أو السجائر الإلكترونية أو التدخين.' },
    { en: 'SFA Domes management reserves the right to cancel a subscription in case of non-compliance with SFA Domes or coach rules, or in case of ethical or behavioral issues.', ar: 'تحتفظ إدارة قباب الاتحاد السعودي للرياضة للجميع بحق إلغاء الاشتراك في حال عدم الالتزام بقواعد القباب أو المدرب، أو في حال وجود مشكلات أخلاقية أو سلوكية.' },
  ];

  // the add-on everyone can buy with a plan (SAR 150, confirmed by Ahmed)
  window.SFA_PROGRAM_KIT = {
    price: 150, sizes: ['6–7 Y', '8–9 Y', '10–11 Y', '12–13 Y', 'S', 'M', 'L', 'XL'],
    name: { en: 'Training Kit', ar: 'طقم التدريب' },
    items: { en: 'A sports T-shirt, shorts and socks', ar: 'قميص رياضي وشورت وجوارب' },
  };
  // plans: a free trial, or 1, 2 or 3 months (4 weeks each); longer plans are 5% and 10% off (Ahmed's pick)
  window.SFA_PROGRAM_PLANS = {
    trial:  { months: 0, off: 0 },
    month:  { months: 1, off: 0 },
    month2: { months: 2, off: 0.05 },
    month3: { months: 3, off: 0.10 },
  };
  window.SFA_PROGRAM_PRICE = (p, plan) => { const x = window.SFA_PROGRAM_PLANS[plan]; return x ? Math.round(p.month * x.months * (1 - x.off)) : 0; };
  window.SFA_PROGRAM_FULL_PRICE = (p, plan) => { const x = window.SFA_PROGRAM_PLANS[plan]; return x ? p.month * x.months : 0; };
  // a program starts on one of its next 3 training days (from tomorrow), so new players join a group that is running
  window.SFA_PROGRAM_START_COUNT = 3;
  const key = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  window.SFA_PROGRAM_START_DAYS = (p, now = new Date()) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), out = [];
    if (!p.days.length) return out;
    while (out.length < window.SFA_PROGRAM_START_COUNT){ if (p.days.includes(day.getDay())) out.push(key(day)); day.setDate(day.getDate() + 1); }
    return out;
  };
  // who can take part: the program's age range on the start day, and women/girls-only programs take women and girls
  window.SFA_PROGRAM_AGES = p => { const m = String(p.ages).match(/(\d+)\D+(\d+)/), plus = String(p.ages).match(/(\d+)\+/);
    return m ? { min: +m[1], max: +m[2] } : plus ? { min: +plus[1], max: 120 } : { min: 0, max: 120 }; };
  window.SFA_AGE = (dob, on) => { const [y, m, d] = String(dob).split('-').map(Number), [Y, M, D] = String(on).split('-').map(Number);
    return Y - y - (M < m || (M === m && D < d) ? 1 : 0); };
  // → null when they can take part, else 'age' or 'gender'
  window.SFA_PROGRAM_ELIGIBLE = (p, person, start) => {
    const r = window.SFA_PROGRAM_AGES(p), age = window.SFA_AGE(person.dob, start);
    if (!(age >= r.min && age <= r.max)) return 'age';
    if (p.women && person.gender !== 'female') return 'gender';
    return null;
  };
  // renewing (Ahmed, 2026-11-11): a subscription can be renewed for another month at 20% off, from the last week of the
  // program until 7 days after its last session. The same program, time and participants start again on the next training
  // day after the last session (or after today, if that's later). → { open, from, until, start } (dates 'YYYY-MM-DD')
  window.SFA_RENEW_OFF = 0.2;
  window.SFA_RENEW_PRICE = p => Math.round(p.month * (1 - window.SFA_RENEW_OFF));
  window.SFA_PROGRAM_RENEW = (p, lastDate, now = new Date()) => {
    const at = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }, add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const today = key(now), last = at(lastDate), from = key(add(last, -6)), until = key(add(last, 7));
    let d = add(lastDate > today ? last : at(today), 1); while (p.days.length && !p.days.includes(d.getDay())) d = add(d, 1);
    return { open: today >= from && today <= until, from, until, start: key(d) };
  };
  // the most participants one booking can hold
  window.SFA_PROGRAM_MAX_PEOPLE = 6;
  // children on an account (My account → My children): first + last name, gender, and aged 6 to 17 (inclusive) today
  // (at booking: on the booking date — the first booked day for a court, the start day for a program);
  // at most 20 per account. The same rules run in the browser and in server.js, so the messages match everywhere.
  window.SFA_CHILD = { MIN: 6, MAX: 17, LIMIT: 20 };
  window.SFA_TODAY = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  window.SFA_FULL_NAME = x => [x.first, x.last].map(v => String(v || '').trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ');
  // a name saved before first/last existed: first word, then the rest
  window.SFA_SPLIT_NAME = name => { const w = String(name || '').trim().split(/\s+/).filter(Boolean); return { first: w[0] || '', last: w.slice(1).join(' ') }; };
  window.SFA_CHILD_AGE_OK = (dob, today = window.SFA_TODAY()) => { const a = window.SFA_AGE(dob, today); return a >= window.SFA_CHILD.MIN && a <= window.SFA_CHILD.MAX; };
  // → {} when the child can be saved, else { first | last | dob | gender: message }
  window.SFA_CHILD_ERRORS = (c, today = window.SFA_TODAY()) => {
    const e = {}, dob = String(c.dob || '');
    // names: letters (any script), spaces, hyphens and apostrophes; digits and symbols are rejected (story AC01 edge cases)
    const ok = v => /^[\p{L}\p{M}][\p{L}\p{M}' \-’]*$/u.test(String(v).trim());
    if (!String(c.first || '').trim()) e.first = 'Enter their first name.';
    else if (!ok(c.first)) e.first = 'Use letters only in their first name.';
    if (!String(c.last || '').trim()) e.last = 'Enter their last name.';
    else if (!ok(c.last)) e.last = 'Use letters only in their last name.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob > today || dob < '1900-01-01') e.dob = 'Enter their date of birth.';
    else if (!window.SFA_CHILD_AGE_OK(dob, today)) e.dob = 'Children must be 6 to 17 years old.';
    if (!['female', 'male'].includes(c.gender)) e.gender = 'Choose their gender.';
    return e;
  };
  // a free trial is the start day's session; a plan is every training day in its 4, 8 or 12 weeks from the start day
  window.SFA_PROGRAM_SESSIONS = (p, start, plan) => {
    const [y, m, d] = start.split('-').map(Number), day = new Date(y, m - 1, d), out = [];
    if (plan === 'trial') return [key(day)];
    const span = 28 * ((window.SFA_PROGRAM_PLANS[plan] || { months: 1 }).months);
    for (let i = 0; i < span; i++, day.setDate(day.getDate() + 1)) if (p.days.includes(day.getDay())) out.push(key(day));
    return out;
  };
})();
