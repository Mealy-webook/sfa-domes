/* SFA Domes sign-in / sign-up: one centered modal shared by every page (email + password, accounts live in server.js).
   Views: sign in · create account (name, email, gender, date of birth, password) · forgot password · new password.
   Password reset runs in test mode: no email is sent, so the server hands the reset step straight back.

   window.SFA_AUTH
     .me()                    → Promise<user | null>
     .open({ view, reason })  → Promise<user | null>   (null if closed without signing in)
     .require(reason)         → Promise<user | null>   (opens the modal only when signed out)
     .signOut()
   Pages put <span data-auth-slot></span> where the account button goes; [data-auth-open] elements open the modal.
   'sfa:auth' fires on window whenever the signed-in user changes. Light theme, square corners. */
// every date of birth on the site uses the Year → Month → Day picker (f/dob-pick.js); auth.js is on every page, so it loads it
if (!document.querySelector('script[src$="f/dob-pick.js"]')){ const s = document.createElement('script'); s.src = 'f/dob-pick.js'; document.head.appendChild(s); }
(() => {
  const CSS = `
.sfa-auth{font:var(--ts-body-m);--a-brand:var(--orange-500);--a-brand-600:var(--orange-600);--a-bg:var(--neutral-0);--a-soft:var(--neutral-100);--a-line:var(--neutral-200);--a-line-2:var(--neutral-300);--a-ink:var(--neutral-950);--a-ink-2:var(--neutral-600);--a-ink-3:var(--neutral-500);--a-danger:var(--red-600);--a-ok:#16A34A;
  position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px 16px;background:rgba(9,9,11,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s;color:var(--a-ink);-webkit-font-smoothing:antialiased;color-scheme:light}
.sfa-auth.on{opacity:1;visibility:visible;transition:opacity .3s}
.sfa-auth *{box-sizing:border-box}
.sfa-auth__card{position:relative;width:min(100%,460px);max-height:100%;overflow:auto;background:var(--a-bg);transform:translateY(18px) scale(.98);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.sfa-auth.on .sfa-auth__card{transform:none}
.sfa-auth__top{display:flex;align-items:center;justify-content:space-between;padding:18px 24px 0}
.sfa-auth__top img{height:40px;width:auto;display:block}
.sfa-auth__x{width:40px;height:40px;display:grid;place-items:center;padding:0;border:1px solid var(--a-line-2);background:var(--a-bg);color:var(--a-ink);cursor:pointer;transition:background-color .2s,color .2s,border-color .2s}
.sfa-auth__x:hover{background:var(--a-ink);border-color:var(--a-ink);color:var(--neutral-0)}
.sfa-auth__x svg{width:18px;height:18px}
.sfa-auth__tabs{display:grid;grid-template-columns:1fr 1fr;margin:20px 24px 0;border:1px solid var(--a-line-2)}
.sfa-auth__tabs button{font:var(--ts-label-l);text-transform:var(--type-case-label);height:46px;padding:0;border:0;background:var(--a-bg);cursor:pointer;color:var(--a-ink-2);transition:background-color .2s,color .2s}
.sfa-auth__tabs button + button{border-left:1px solid var(--a-line-2)}
.sfa-auth__tabs button[aria-selected="true"]{background:var(--orange-a8);color:var(--a-ink);box-shadow:inset 0 0 0 2px var(--a-brand)}   /* the plan card's selected style */
.sfa-auth__tabs[hidden]{display:none}
.sfa-auth form{padding:22px 24px 24px}
.sfa-auth form[hidden]{display:none}
.sfa-auth h2{font:var(--ts-title-l);text-transform:var(--type-case-title);margin:0}
.sfa-auth .sa-sub{margin:8px 0 18px;font-size:var(--fs-14);line-height:20px;color:var(--a-ink-2)}
.sfa-auth .sa-reason{display:flex;gap:10px;align-items:center;margin:0 0 18px;padding:10px 12px;background:rgba(255,90,25,.08);border-left:3px solid var(--a-brand);font-size:var(--fs-14);line-height:18px;color:var(--a-ink)}
.sfa-auth .sa-reason svg{flex:none;width:16px;height:16px;color:var(--a-brand)}
.sfa-auth .sa-note{margin:0 0 16px;padding:10px 12px;background:var(--amber-100);border-left:3px solid #F59E0B;font-size:var(--fs-14);line-height:18px;color:var(--amber-800)}
.sfa-auth .sa-f{margin:0 0 14px}
.sfa-auth .sa-f > label,.sfa-auth .sa-f > .sa-lab{font:var(--ts-label-m);text-transform:var(--type-case-label);display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;color:var(--a-ink-2)}
.sfa-auth .sa-link{font:var(--ts-body-s);padding:0;border:0;background:none;cursor:pointer;letter-spacing:0;color:var(--a-ink-2);text-decoration:underline;text-underline-offset:3px}
.sfa-auth .sa-link:hover{color:var(--a-brand)}
.sfa-auth .sa-in{display:flex;align-items:center;height:48px;background:var(--a-bg);border:1px solid var(--a-line-2);transition:border-color .2s,box-shadow .2s}
.sfa-auth .sa-in:focus-within{border-color:var(--a-ink);box-shadow:inset 0 0 0 1px var(--a-ink)}
.sfa-auth .sa-in input{flex:1;min-width:0;height:100%;padding:0 14px;border:0;background:transparent;outline:0;font:inherit;color:inherit}
.sfa-auth .sa-in input[type=date]{padding-right:10px}
.sfa-auth .sa-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}
.sfa-auth .sa-two .sa-f:has(> .dobp-pan:not([hidden])){grid-column:1/-1}
.sfa-auth .sa-pre{flex:none;display:flex;align-items:center;height:100%;padding:0 12px;border-inline-end:1px solid var(--a-line);background:var(--a-soft);font:var(--ts-body-m);color:var(--a-ink-2)}
.sfa-auth .sa-eye{font:var(--ts-label-m);text-transform:var(--type-case-label);flex:none;height:100%;padding:0 14px;border:0;border-left:1px solid var(--a-line);background:var(--a-soft);cursor:pointer;color:var(--a-ink-2)}
.sfa-auth .sa-eye:hover{color:var(--a-ink)}
.sfa-auth .sa-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sfa-auth .sa-seg label{font:var(--ts-label-l);text-transform:var(--type-case-label);position:relative;display:flex;align-items:center;justify-content:center;gap:10px;height:48px;border:1px solid var(--a-line-2);cursor:pointer;transition:border-color .2s,box-shadow .2s,background-color .2s}
.sfa-auth .sa-seg label:hover{border-color:var(--a-ink)}
.sfa-auth .sa-seg input{position:absolute;opacity:0;pointer-events:none}
.sfa-auth .sa-seg label:has(input:checked){border-color:var(--a-brand);box-shadow:inset 0 0 0 1px var(--a-brand);background:rgba(255,90,25,.06)}
.sfa-auth .sa-seg label:has(input:focus-visible){outline:2px solid var(--a-brand);outline-offset:2px}
.sfa-auth .sa-rules{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 0;padding:0;list-style:none;font-size:var(--fs-12);line-height:16px;color:var(--a-ink-3)}
.sfa-auth .sa-rules li::before{content:"";display:inline-block;width:8px;height:8px;margin-right:6px;border:1.5px solid currentColor;vertical-align:0}
.sfa-auth .sa-rules li.ok{color:var(--a-ok)}
.sfa-auth .sa-rules li.ok::before{background:currentColor}
.sfa-auth .sa-err{display:none;margin:6px 0 0;font-size:var(--fs-14);line-height:18px;color:var(--a-danger)}
.sfa-auth .sa-f.bad .sa-in,.sfa-auth .sa-f.bad .sa-seg label{border-color:var(--a-danger)}
.sfa-auth .sa-f.bad .sa-err{display:block}
.sfa-auth .sa-formerr{margin:0 0 14px;padding:10px 12px;background:#FEF2F2;border-left:3px solid var(--a-danger);font-size:var(--fs-14);line-height:18px;color:#991B1B}
.sfa-auth .sa-formerr[hidden]{display:none}
.sfa-auth .sa-go{font:var(--ts-label-l);text-transform:var(--type-case-label);display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:56px;margin-top:6px;border:0;background:var(--a-brand);color:var(--neutral-0);cursor:pointer;transition:background-color .2s}
.sfa-auth .sa-go:hover:not(:disabled){background:var(--a-brand-600)}
.sfa-auth .sa-go:disabled{opacity:.6;cursor:progress}
.sfa-auth .sa-go .sa-spin{width:18px;height:18px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sfaSpin .7s linear infinite}
@keyframes sfaSpin{to{transform:rotate(360deg)}}
.sfa-auth .sa-switch{margin:16px 0 0;text-align:center;font-size:var(--fs-14);color:var(--a-ink-2)}
.sfa-auth .sa-switch .sa-link{font-size:var(--fs-14);font-weight:600;color:var(--a-ink)}
.sfa-auth :focus-visible{outline:2px solid var(--a-brand);outline-offset:2px}
@media (max-width:480px){.sfa-auth{padding:0;place-items:stretch}.sfa-auth__card{width:100%;min-height:100%}}
@media (prefers-reduced-motion:reduce){.sfa-auth,.sfa-auth__card{transition:none}}

.sfa-acct{position:relative;display:inline-flex}
.sfa-acct__btn{font:var(--ts-label-l);text-transform:var(--type-case-label);display:inline-flex;align-items:center;gap:8px;height:44px;white-space:nowrap;padding:0 14px 0 6px;border:1px solid var(--neutral-300);background:var(--neutral-0);color:var(--neutral-950);cursor:pointer;transition:background-color .2s,color .2s,border-color .2s}
.sfa-acct__btn:hover{border-color:var(--neutral-950)}
.sfa-acct__btn.out{padding:0 16px;background:var(--orange-500);border-color:var(--orange-500);color:var(--neutral-0)}
.sfa-acct__btn.out:hover{background:var(--orange-600);border-color:var(--orange-600)}
.sfa-acct__av{display:grid;place-items:center;width:32px;height:32px;background:var(--orange-500);color:var(--neutral-0);font-size:var(--fs-14);letter-spacing:0}
.sfa-acct__btn svg{width:14px;height:14px}
@media (max-width:560px){.sfa-acct__name,.sfa-acct__btn:not(.out) svg{display:none}.sfa-acct__btn{height:40px;padding:0 4px}.sfa-acct__btn.out{padding:0 10px;font-size:var(--fs-14)}}
.sfa-pop{font:var(--ts-body-s);position:fixed;z-index:1001;min-width:240px;background:var(--neutral-0);border:1px solid var(--neutral-200);box-shadow:0 18px 40px -20px rgba(9,9,11,.45);color:var(--neutral-950);animation:sfaPop .25s cubic-bezier(.22,1,.36,1)}
@keyframes sfaPop{from{opacity:0;transform:translateY(-6px)}}
.sfa-pop p{margin:0;padding:14px 16px;border-bottom:1px solid var(--neutral-200)}
.sfa-pop strong{font:var(--ts-label-l);text-transform:var(--type-case-label);display:block}
.sfa-pop small{display:block;color:var(--neutral-500);word-break:break-all}
.sfa-pop{width:min(340px,calc(100vw - 24px))}
.sfa-pop__links{display:grid;padding:6px 0;border-bottom:1px solid var(--neutral-200)}
.sfa-pop__links a{font:var(--ts-label-l);text-transform:var(--type-case-label);display:flex;align-items:center;justify-content:space-between;padding:10px 16px;color:var(--neutral-950);text-decoration:none}
.sfa-pop__links a::after{content:"";width:8px;height:8px;border-top:2px solid currentColor;border-inline-end:2px solid currentColor;rotate:45deg}
[dir=rtl] .sfa-pop__links a::after{rotate:-45deg}
.sfa-pop__links a:hover{background:var(--neutral-100);color:var(--color-brand)}
.sfa-pop__out{font:var(--ts-label-l);text-transform:var(--type-case-label);display:block;width:100%;padding:12px 16px;border:0;background:none;text-align:start;cursor:pointer;color:var(--neutral-950)}
.sfa-pop__out:hover{background:var(--neutral-100);color:var(--red-600)}
.sfa-pop__head{font:var(--ts-label-m);text-transform:var(--type-case-label);display:flex;justify-content:space-between;align-items:baseline;padding:12px 16px 6px;color:var(--neutral-600)}
.sfa-pop__head span{font:var(--ts-caption);color:var(--neutral-500);letter-spacing:0}
.sfa-pop__favs{list-style:none;margin:0;padding:0 8px 8px;max-height:min(50vh,320px);overflow:auto;border-bottom:1px solid var(--neutral-200)}
.sfa-pop__favs li{display:flex;align-items:center;gap:4px}
.sfa-pop__favs a{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:6px 8px;text-decoration:none;color:var(--neutral-950)}
.sfa-pop__favs a:hover{background:var(--neutral-100)}
.sfa-pop__favs img{flex:none;width:56px;height:40px;object-fit:cover;display:block}
.sfa-pop__favs b{font:var(--ts-label-l);text-transform:var(--type-case-label);display:block}
.sfa-pop__favs small{display:block;font-size:var(--fs-12);color:var(--neutral-500)}
.sfa-pop__favs .sfa-fav{width:32px;height:32px;border:0;background:none}
.sfa-pop__empty{margin:0;padding:4px 16px 14px;font-size:var(--fs-14);line-height:18px;color:var(--neutral-500);border-bottom:1px solid var(--neutral-200)}

/* heart: save a court to the account */
.sfa-fav{display:inline-grid;place-items:center;flex:none;width:40px;height:40px;padding:0;border:1px solid var(--neutral-300);background:rgba(255,255,255,.94);color:var(--neutral-950);cursor:pointer;transition:border-color .2s,color .2s,background-color .2s}
.sfa-fav svg{width:20px;height:20px;overflow:visible}
.sfa-fav path{fill:transparent;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;transition:fill .2s}
.sfa-fav:hover{border-color:var(--neutral-950)}
.sfa-fav[aria-pressed=true]{color:var(--orange-500);border-color:var(--orange-500)}
.sfa-fav[aria-pressed=true] path{fill:var(--orange-500)}
.sfa-fav.bump svg{animation:sfaFavBump .45s cubic-bezier(.22,1,.36,1)}
@keyframes sfaFavBump{40%{transform:scale(1.3)}}
.sfa-fav--lg{width:56px;height:56px}
.sfa-fav--lg svg{width:24px;height:24px}
@media (prefers-reduced-motion:reduce){.sfa-fav.bump svg{animation:none}}
.sfa-toast{font:var(--ts-body-s);position:fixed;left:50%;top:84px;z-index:1002;transform:translate(-50%,-12px);max-width:calc(100% - 32px);padding:12px 18px;background:var(--neutral-950);color:var(--neutral-0);opacity:0;transition:opacity .3s,transform .4s cubic-bezier(.22,1,.36,1);pointer-events:none}
.sfa-toast.on{opacity:1;transform:translate(-50%,0)}
`;

  const EYE = '<button type="button" class="sa-eye" aria-label="Show password">Show</button>';
  const ERR = m => `<p class="sa-err">${m}</p>`;
  const today = new Date().toISOString().slice(0, 10);
  const HTML = `
<div class="sfa-auth__card">
  <div class="sfa-auth__top"><img src="f/domes-logo-orange.svg" alt="SFA Domes" width="77" height="61"><button class="sfa-auth__x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="sfa-auth__tabs" role="tablist" aria-label="Sign in or create an account">
    <button type="button" role="tab" data-tab="login" aria-selected="true">Sign in</button><button type="button" role="tab" data-tab="signup" aria-selected="false">Create account</button>
  </div>

  <form data-view="login" novalidate>
    <h2 id="sfaAuthTitle">Welcome back</h2><p class="sa-sub">Sign in to book courts at SFA Domes.</p>
    <div class="sa-reason-slot"></div><p class="sa-formerr" role="alert" hidden></p>
    <div class="sa-f" data-f="email"><label for="sfaLE">Email</label><div class="sa-in"><input id="sfaLE" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>${ERR('Enter a valid email.')}</div>
    <div class="sa-f" data-f="password"><div class="sa-lab"><label for="sfaLP">Password</label><button type="button" class="sa-link" data-go="forgot">Forgot password?</button></div><div class="sa-in"><input id="sfaLP" name="password" type="password" autocomplete="current-password">${EYE}</div>${ERR('Enter your password.')}</div>
    <button class="sa-go" type="submit">Sign in</button>
    <p class="sa-switch">New to SFA Domes? <button type="button" class="sa-link" data-go="signup">Create an account</button></p>
  </form>

  <form data-view="signup" novalidate hidden>
    <h2>Create account</h2><p class="sa-sub">One account for every court, class and program.</p>
    <div class="sa-reason-slot"></div><p class="sa-formerr" role="alert" hidden></p>
    <div class="sa-two"><div class="sa-f" data-f="first"><label for="sfaSF">First name</label><div class="sa-in"><input id="sfaSF" name="first" type="text" autocomplete="given-name" placeholder="e.g. Sara"></div>${ERR('Enter your first name.')}</div>
      <div class="sa-f" data-f="last"><label for="sfaSL">Last name</label><div class="sa-in"><input id="sfaSL" name="last" type="text" autocomplete="family-name" placeholder="e.g. Al-Qahtani"></div>${ERR('Enter your last name.')}</div></div>
    <div class="sa-f" data-f="email"><label for="sfaSE">Email</label><div class="sa-in"><input id="sfaSE" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>${ERR('Enter a valid email.')}</div>
    <div class="sa-f" data-f="phone"><label for="sfaSM">Mobile</label><div class="sa-in"><span class="sa-pre" dir="ltr">+966</span><input id="sfaSM" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="5X XXX XXXX" maxlength="11" dir="ltr"></div>${ERR('Enter a Saudi mobile number starting with 5.')}</div>
    <div class="sa-f" data-f="gender"><span class="sa-lab" id="sfaSG">Gender</span><div class="sa-seg" role="radiogroup" aria-labelledby="sfaSG"><label><input type="radio" name="gender" value="female">Female</label><label><input type="radio" name="gender" value="male">Male</label></div>${ERR('Choose one.')}</div>
    <div class="sa-f" data-f="dob"><label for="sfaSD">Date of birth</label><div class="sa-in"><input id="sfaSD" name="dob" type="date" data-dob max="${today}" min="1900-01-01" autocomplete="bday"></div>${ERR('Enter your date of birth.')}</div>
    <div class="sa-f" data-f="password"><label for="sfaSP">Password</label><div class="sa-in"><input id="sfaSP" name="password" type="password" autocomplete="new-password">${EYE}</div>
      <ul class="sa-rules" aria-live="polite"><li data-r="len">8+ characters</li><li data-r="let">A letter</li><li data-r="num">A number</li></ul>${ERR('Use at least 8 characters with a letter and a number.')}</div>
    <button class="sa-go" type="submit">Create account</button>
    <p class="sa-switch">Already have an account? <button type="button" class="sa-link" data-go="login">Sign in</button></p>
  </form>

  <form data-view="forgot" novalidate hidden>
    <h2>Reset password</h2><p class="sa-sub">Enter your account email and we'll help you set a new password.</p>
    <p class="sa-formerr" role="alert" hidden></p>
    <div class="sa-f" data-f="email"><label for="sfaFE">Email</label><div class="sa-in"><input id="sfaFE" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>${ERR('Enter a valid email.')}</div>
    <button class="sa-go" type="submit">Continue</button>
    <p class="sa-switch"><button type="button" class="sa-link" data-go="login">Back to sign in</button></p>
  </form>

  <form data-view="reset" novalidate hidden>
    <h2>New password</h2><p class="sa-sub">Choose a new password for your account.</p>
    <p class="sa-note">Test mode: no email is sent, so you can set the new password right here.</p>
    <p class="sa-formerr" role="alert" hidden></p>
    <div class="sa-f" data-f="password"><label for="sfaRP">New password</label><div class="sa-in"><input id="sfaRP" name="password" type="password" autocomplete="new-password">${EYE}</div>
      <ul class="sa-rules" aria-live="polite"><li data-r="len">8+ characters</li><li data-r="let">A letter</li><li data-r="num">A number</li></ul>${ERR('Use at least 8 characters with a letter and a number.')}</div>
    <button class="sa-go" type="submit">Save and sign in</button>
  </form>
</div>`;

  const tr = (s, p) => window.SFA_PREFS ? window.SFA_PREFS.t(s, p) : s.replace(/\{(\w+)\}/g, (m, k) => (p || {})[k] ?? m);

  // ---- state + API
  let user, mePromise, root, resolver = null, lastFocus = null, resetToken = null;
  const emit = () => dispatchEvent(new CustomEvent('sfa:auth', { detail: user }));
  const api = async (path, body) => {
    const r = await fetch('/api/auth/' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  };
  function me(){
    if (!mePromise) mePromise = api('me').then(r => (user = r.ok ? r.data.user : null)).catch(() => (user = null));
    return mePromise;
  }
  const setUser = u => { user = u; mePromise = Promise.resolve(u); favs = null; favsPromise = null; emit(); renderSlots(); loadFavs().then(paintFavs); };

  // ---- modal
  let styled = false;
  const style = () => { if (styled) return; styled = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); };
  function build(){
    if (root) return;
    style();
    root = document.createElement('div'); root.className = 'sfa-auth'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'sfaAuthTitle');
    root.innerHTML = HTML; document.body.appendChild(root);
    root.addEventListener('click', e => {
      if (e.target === root || e.target.closest('.sfa-auth__x')) return close(null);
      const tab = e.target.closest('[data-tab]'); if (tab) return show(tab.dataset.tab);
      const go = e.target.closest('[data-go]'); if (go) return show(go.dataset.go);
      const eye = e.target.closest('.sa-eye');
      if (eye){ const i = eye.previousElementSibling, on = i.type === 'password'; i.type = on ? 'text' : 'password'; eye.textContent = on ? 'Hide' : 'Show'; eye.setAttribute('aria-label', on ? 'Hide password' : 'Show password'); }
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') return close(null);
      if (e.key === 'Tab'){   // keep focus inside the dialog
        const f = [...root.querySelectorAll('button, input, [href]')].filter(x => !x.disabled && x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
      }
    });
    root.addEventListener('input', e => {
      const f = e.target.closest('.sa-f'); if (f) f.classList.remove('bad');
      const form = e.target.closest('form'); form.querySelector('.sa-formerr').hidden = true;
      if (e.target.name === 'password' && form.querySelector('.sa-rules')) rules(form, e.target.value);
      // mobile: digits only, shown as 5X XXX XXXX
      if (e.target.name === 'phone'){ const v = e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 9); e.target.value = [v.slice(0, 2), v.slice(2, 5), v.slice(5)].filter(Boolean).join(' '); }
    });
    root.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); submit(f); }));
  }
  function rules(form, v){
    const ok = { len: v.length >= 8, let: /[A-Za-z]/.test(v), num: /\d/.test(v) };
    form.querySelectorAll('.sa-rules li').forEach(li => li.classList.toggle('ok', ok[li.dataset.r]));
  }
  function show(view){
    root.querySelectorAll('form').forEach(f => f.hidden = f.dataset.view !== view);
    const tabbed = view === 'login' || view === 'signup';
    root.querySelector('.sfa-auth__tabs').hidden = !tabbed;
    root.querySelectorAll('[data-tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === view));
    const form = root.querySelector(`form[data-view="${view}"]`);
    root.querySelectorAll('h2').forEach(h => h.removeAttribute('id')); form.querySelector('h2').id = 'sfaAuthTitle';
    // carry the email across views
    const email = [...root.querySelectorAll('input[name=email]')].map(i => i.value).find(Boolean);
    if (email) form.querySelectorAll('input[name=email]').forEach(i => { if (!i.value) i.value = email; });
    setTimeout(() => (form.querySelector('input:not([type=radio])') || form).focus(), 60);
  }
  function open(opts = {}){
    build();
    root.querySelectorAll('form').forEach(f => { f.reset(); f.querySelectorAll('.sa-f').forEach(x => x.classList.remove('bad')); f.querySelector('.sa-formerr').hidden = true; rules(f, ''); });
    root.querySelectorAll('.sa-reason-slot').forEach(s => s.innerHTML = opts.reason ? `<p class="sa-reason"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span>${opts.reason.replace(/</g, '&lt;')}</span></p>` : '');
    lastFocus = document.activeElement;
    show(opts.view || 'login');
    requestAnimationFrame(() => root.classList.add('on'));
    document.documentElement.style.overflow = 'hidden';
    if (resolver) resolver(null);
    return new Promise(res => { resolver = res; });
  }
  function close(u){
    if (!root || !root.classList.contains('on')) return;
    root.classList.remove('on'); document.documentElement.style.overflow = '';
    const r = resolver; resolver = null; if (r) r(u || null);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function busy(form, on){
    const b = form.querySelector('.sa-go');
    if (on){ b.dataset.label = b.textContent; b.disabled = true; b.innerHTML = '<span class="sa-spin" aria-hidden="true"></span>'; }
    else { b.disabled = false; b.textContent = b.dataset.label; }
  }
  const val = (form, name) => {
    const i = form.querySelector(`[name="${name}"]`); if (!i) return '';
    if (i.type === 'radio'){ const c = form.querySelector(`[name="${name}"]:checked`); return c ? c.value : ''; }
    return i.value.trim();
  };
  function mark(form, errors){
    Object.entries(errors).forEach(([k, m]) => { const f = form.querySelector(`[data-f="${k}"]`); if (!f) return; f.classList.add('bad'); f.querySelector('.sa-err').textContent = m; });
    const first = form.querySelector('.sa-f.bad input'); if (first) first.focus();
  }
  const pwOk = v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  async function submit(form){
    const view = form.dataset.view, errors = {}, fe = form.querySelector('.sa-formerr');
    form.querySelectorAll('.sa-f').forEach(x => x.classList.remove('bad')); fe.hidden = true;
    const email = val(form, 'email'), password = form.querySelector('[name=password]') ? form.querySelector('[name=password]').value : '';
    if (form.querySelector('[name=email]') && view !== 'login' && !emailOk(email)) errors.email = 'Enter a valid email.';   // prototype: sign-in takes anything
    if ((view === 'signup' || view === 'reset') && !pwOk(password)) errors.password = 'Use at least 8 characters with a letter and a number.';
    if (view === 'signup'){
      if (!val(form, 'first')) errors.first = 'Enter your first name.';
      if (!val(form, 'last')) errors.last = 'Enter your last name.';
      if (!/^5\d{8}$/.test(val(form, 'phone').replace(/\D/g, ''))) errors.phone = 'Enter a Saudi mobile number starting with 5.';
      if (!val(form, 'gender')) errors.gender = 'Choose one.';
      const d = val(form, 'dob'); if (!d || d > today || d < '1900-01-01') errors.dob = 'Enter your date of birth.';
    }
    if (Object.keys(errors).length) return mark(form, errors);

    busy(form, true);
    let r;
    try {
      if (view === 'login') r = await api('login', { email, password });
      if (view === 'signup') r = await api('signup', { first: val(form, 'first'), last: val(form, 'last'), phone: '+966' + val(form, 'phone').replace(/\D/g, ''), email, gender: val(form, 'gender'), dob: val(form, 'dob'), password });
      if (view === 'forgot') r = await api('forgot', { email });
      if (view === 'reset') r = await api('reset', { token: resetToken, password });
    } catch (e) { r = { ok: false, data: { error: 'Could not reach the server. Try again.' } }; }
    busy(form, false);

    if (!r.ok){
      if (r.data.errors) return mark(form, r.data.errors);
      fe.textContent = tr(r.data.error || 'Something went wrong. Try again.'); fe.hidden = false; return;
    }
    if (view === 'forgot'){
      if (r.data.testToken){ resetToken = r.data.testToken; return show('reset'); }
      fe.textContent = tr("If there's an account for that email, you'll get a link to reset your password."); fe.hidden = false; return;
    }
    setUser(r.data.user);
    toast(tr(view === 'signup' ? 'Welcome to SFA Domes, {name}' : 'Welcome back, {name}', { name: first(r.data.user) }));
    close(r.data.user);
  }
  const first = u => (u && (u.first || u.name) || '').split(/\s+/)[0];

  async function require(reason){
    const u = await me(); if (u) return u;
    return open({ view: 'login', reason });
  }
  async function signOut(){
    await api('logout', {}); setUser(null); toast(tr('Signed out'));
  }

  // ---- toast
  let toastEl, toastT;
  function toast(msg){
    if (!toastEl){ build(); toastEl = document.createElement('div'); toastEl.className = 'sfa-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
  }

  // ---- account button in page headers ([data-auth-slot]) and an account menu
  let pop;
  const initials = u => u.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  function renderSlots(){
    document.querySelectorAll('[data-auth-slot]').forEach(slot => {
      slot.className = 'sfa-acct';
      slot.innerHTML = user
        ? `<button class="sfa-acct__btn" type="button" aria-haspopup="menu" aria-expanded="false"><span class="sfa-acct__av" aria-hidden="true">${initials(user)}</span><span class="sfa-acct__name">${first(user).replace(/</g, '&lt;')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
        : '<button class="sfa-acct__btn out" type="button">Sign in</button>';
    });
    // existing "Login / Signup" links (homepage) show the first name once signed in
    document.querySelectorAll('[data-auth-open]').forEach(a => {
      if (!a.dataset.label) a.dataset.label = a.textContent;
      a.textContent = user ? tr('Hi, {name}', { name: first(user) }) : tr(a.dataset.label);
    });
  }
  let popAnchor;
  function closePop(){
    if (!pop) return;
    pop.remove(); pop = null; popAnchor.setAttribute('aria-expanded', 'false');
    removeEventListener('click', outside, true); removeEventListener('keydown', popKey);
  }
  const outside = e => { if (pop && !pop.contains(e.target) && !popAnchor.contains(e.target)) closePop(); };
  const popKey = e => { if (e.key === 'Escape'){ closePop(); popAnchor.focus(); } };
  async function menu(anchor){
    if (pop) return closePop();
    build(); popAnchor = anchor;
    await loadFavs();
    const r = anchor.getBoundingClientRect();
    pop = document.createElement('div'); pop.className = 'sfa-pop'; pop.setAttribute('role', 'menu');
    pop.innerHTML = `<p><strong>${user.name.replace(/</g, '&lt;')}</strong><small>${user.email.replace(/</g, '&lt;')}</small></p><nav class="sfa-pop__links"><a role="menuitem" href="profile.html#tickets">${tr('My tickets')}</a><a role="menuitem" href="profile.html#account">${tr('My account')}</a></nav><div class="sfa-pop__saved">${favList()}</div><button class="sfa-pop__out" type="button" role="menuitem" data-out>${tr('Sign out')}</button>`;
    pop.dir = document.documentElement.dir;
    document.body.appendChild(pop);
    paintFavs();
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    pop.style.left = Math.round(Math.min(innerWidth - pop.offsetWidth - 12, Math.max(12, r.right - pop.offsetWidth))) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    pop.querySelector('[data-out]').addEventListener('click', () => { closePop(); signOut(); });
    addEventListener('click', outside, true); addEventListener('keydown', popKey);
  }
  // ---- saved courts ("sport|court" keys on the account). Any [data-fav] button toggles; the list sits in the account menu
  let favs = null, favsPromise = null;
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.4-4.5-9.1-9.2C1.7 7.6 4 4.6 7.3 4.6c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.6 3 4.4 6.5-1.7 4.7-9.1 9.2-9.1 9.2Z"/></svg>';
  const heart = (key, cls = '') => `<button type="button" class="sfa-fav ${cls}" data-fav="${key}" aria-pressed="false" aria-label="${tr('Save court')}">${HEART}</button>`;
  function loadFavs(){
    if (!favsPromise) favsPromise = me().then(u => u ? api('favorites').then(r => (favs = new Set(r.ok ? r.data.favorites : []))) : (favs = new Set()));
    return favsPromise;
  }
  function paintFavs(){
    document.querySelectorAll('[data-fav]').forEach(b => {
      const on = !!(favs && favs.has(b.dataset.fav));
      b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', tr(on ? 'Remove from saved courts' : 'Save court')); b.title = b.getAttribute('aria-label');
    });
  }
  function favList(){
    const SP = window.SFA_SPORTS || {}, keys = favs ? [...favs] : [];
    const rows = keys.map(k => {
      const [sp, ci] = k.split('|'), sport = SP[sp], c = sport && sport.courts[+ci]; if (!c) return '';
      return `<li><a href="court-details.html?sport=${encodeURIComponent(sp)}&court=${+ci}"><img src="${window.SFA_COURT_IMG ? window.SFA_COURT_IMG(sp, c) : ''}" alt=""><span><b>${tr(c[0])}</b><small>${tr(sport.name)}</small></span></a>${heart(k)}</li>`;
    }).join('');
    return `<div class="sfa-pop__head">${tr('Saved courts')}<span>${keys.length}</span></div>` +
      (rows ? `<ul class="sfa-pop__favs">${rows}</ul>` : `<p class="sfa-pop__empty">${tr('No saved courts yet. Tap the heart on a court to save it.')}</p>`);
  }
  async function toggleFav(key, btn){
    const u = await require(tr('Sign in to save courts.')); if (!u) return;
    await loadFavs();
    const on = !favs.has(key), [sport, court] = key.split('|');
    on ? favs.add(key) : favs.delete(key); paintFavs();          // show it straight away, then confirm with the server
    if (btn){ btn.classList.remove('bump'); void btn.offsetWidth; if (on) btn.classList.add('bump'); }
    const r = await api('favorites', { sport, court: +court, on });
    if (r.ok) favs = new Set(r.data.favorites);
    paintFavs();
    const box = pop && pop.querySelector('.sfa-pop__saved'); if (box){ box.innerHTML = favList(); paintFavs(); }   // menu open: refresh its list
    toast(tr(on ? 'Saved to your courts' : 'Removed from saved courts'));
  }
  // capture phase: a heart inside a clickable card toggles without opening the card
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); toggleFav(b.dataset.fav, b);
  }, true);

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-auth-open], [data-auth-slot] .sfa-acct__btn');
    if (!opener) return;
    e.preventDefault();
    if (user) menu(opener); else open({ view: opener.dataset.authOpen || 'login' });
  });

  addEventListener('sfa:prefs', () => { renderSlots(); paintFavs(); });
  window.SFA_AUTH = { me, open, require, signOut, toast, heart, paintFavs };
  const boot = () => { style(); me().then(renderSlots); loadFavs().then(paintFavs); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
