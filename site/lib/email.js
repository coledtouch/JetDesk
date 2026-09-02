/* Transactional email.
   Preferred: Cloudflare Email Service binding (env.EMAIL, domain jetdesk.ai onboarded).
   Fallback: Resend (RESEND_API_KEY). Returns {skipped:true} when neither is configured. */
export function emailConfigured(env) {
  return !!(env.EMAIL_FROM && ((env.EMAIL_API_TOKEN && env.CF_ACCOUNT_ID) || env.EMAIL || env.RESEND_API_KEY));
}

export async function sendEmail(env, to, subject, html, text) {
  if (!env.EMAIL_FROM) return { skipped: true };
  const plain = text || String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  /* Cloudflare Email Service REST API (Pages Functions cannot hold the binding) */
  if (env.EMAIL_API_TOKEN && env.CF_ACCOUNT_ID) {
    try {
      const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID + '/email/sending/send', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + env.EMAIL_API_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ to, from: env.EMAIL_FROM, subject, html, text: plain }),
      });
      const j = await r.json().catch(() => ({}));
      const ok = r.ok && j.success !== false;
      return { ok, via: 'cloudflare', error: ok ? null : JSON.stringify(j.errors || j).slice(0, 200) };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e), via: 'cloudflare' };
    }
  }
  if (env.EMAIL && typeof env.EMAIL.send === 'function') {
    try {
      const r = await env.EMAIL.send({ from: env.EMAIL_FROM, to, subject, html, text: plain });
      return { ok: true, id: r && r.messageId, via: 'cloudflare' };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e), via: 'cloudflare' };
    }
  }
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text: plain }),
      });
      return { ok: r.ok, status: r.status, via: 'resend' };
    } catch (e) {
      return { ok: false, via: 'resend' };
    }
  }
  return { skipped: true };
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Brand kit for email (Midnight + Ion): table layout so Gmail, Outlook and Apple Mail agree.
   Fonts fall back to system faces since mail clients strip web fonts; colors and spacing follow brand/tokens. */
const MARK_URL = 'https://www.jetdesk.ai/mark-email.png';
const WRAP_OPEN = '<div style="background:#F4F6FA;padding:24px 12px;font-family:Manrope,-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.55">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;margin:0 auto;border-collapse:separate">' +
  '<tr><td style="background:#070B14;border:1px solid #1E2A40;border-bottom:0;border-radius:18px 18px 0 0;padding:20px 26px">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="padding-right:12px;vertical-align:middle"><img src="' + MARK_URL + '" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:11px"></td>' +
      '<td style="vertical-align:middle">' +
        '<div style="font-family:Michroma,Arial Black,Arial,sans-serif;font-weight:700;letter-spacing:.10em;font-size:17px;line-height:1;color:#E6EAF2">JETDESK<span style="color:#4CC9FF;font-size:10px;letter-spacing:.18em;margin-left:4px">.AI</span></div>' +
        '<div style="font-family:B612 Mono,ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.10em;color:#A7B2C3;margin-top:6px">TRIP COST &middot; FUEL &middot; RUNWAYS</div>' +
      '</td></tr></table>' +
  '</td></tr>' +
  '<tr><td style="height:3px;background:#4CC9FF;font-size:0;line-height:0">&nbsp;</td></tr>' +
  '<tr><td style="background:#FFFFFF;border:1px solid #DCE3EC;border-top:0;border-radius:0 0 18px 18px;padding:26px 26px 22px;font-size:15px;color:#475569">';
const WRAP_CLOSE = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:26px;border-top:1px solid #DCE3EC"><tr><td style="padding-top:14px;font-size:12px;line-height:1.6;color:#5B6779">' +
    '<span style="font-family:B612 Mono,ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.12em;color:#5B6779">PLANNING AID ONLY, NOT FOR NAVIGATION.</span><br>' +
    '<a href="https://www.jetdesk.ai/" style="color:#0B5FCC;text-decoration:none">www.jetdesk.ai</a> &middot; <a href="mailto:hello@jetdesk.ai" style="color:#0B5FCC;text-decoration:none">hello@jetdesk.ai</a> &middot; ' +
    '<a href="https://www.jetdesk.ai/terms/" style="color:#5B6779">Terms</a> &middot; <a href="https://www.jetdesk.ai/privacy/" style="color:#5B6779">Privacy</a>' +
  '</td></tr></table></td></tr></table>' +
  '<div style="max-width:560px;margin:10px auto 0;font-size:11px;color:#8492A6;text-align:center">You are receiving this because you have a JetDesk account. Reply to reach a human.</div></div>';
const H2 = 'margin:0 0 12px;font-size:23px;line-height:1.2;font-weight:800;letter-spacing:-.01em;color:#0F172A';
const CODE = 'font-size:32px;letter-spacing:.20em;font-weight:700;margin:16px 0;padding:14px 16px;background:#EEF2F7;border:1px solid #DCE3EC;border-radius:10px;font-family:B612 Mono,ui-monospace,Menlo,Consolas,monospace;color:#0F172A;text-align:center';
const BTN = 'display:inline-block;background:#0F172A;color:#F4F6FA;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:10px;font-size:14px';
const FINE = 'color:#5B6779;font-size:13px';

export function verifyEmailHtml(brand, code) {
  brand = escHtml(brand); code = escHtml(code);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Your ' + brand + ' verification code</h2>' +
    '<p>Enter this code in the app to verify your email:</p>' +
    '<p style="' + CODE + '">' + code + '</p>' +
    '<p style="' + FINE + '">The code expires in 30 minutes. If you did not create a ' + brand + ' account, ignore this email.</p>' +
    WRAP_CLOSE;
}

export function welcomeEmailHtml(brand, name, trialDays) {
  brand = escHtml(brand); name = escHtml(name); trialDays = escHtml(trialDays);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Welcome aboard' + (name ? ', ' + name : '') + '.</h2>' +
    '<p>Your ' + brand + ' account is live and your ' + trialDays + '-day Pro trial is running: unlimited trips, winds-aloft groundspeeds, live crosswind and best-runway picks, market reference, FBO and crew-car intel, and crew sharing.</p>' +
    '<p>Add it to your phone from <a href="https://www.jetdesk.ai" style="color:#0B5FCC">www.jetdesk.ai</a> (Share, then Add to Home Screen on iPhone; Install on Android). It works offline in the airplane.</p>' +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai" style="' + BTN + '">Open JetDesk</a></p>' +
    '<p>Questions or a feature you want? Reply to this email, it lands with a human.</p>' +
    WRAP_CLOSE;
}

export function testEmailHtml(brand) {
  brand = escHtml(brand);
  return WRAP_OPEN + '<h2 style="' + H2 + '">' + brand + ' email is working.</h2>' +
    '<p>This test was sent through Cloudflare Email Service from hello@jetdesk.ai.</p>' + WRAP_CLOSE;
}

export function resetEmailHtml(brand, code) {
  brand = escHtml(brand); code = escHtml(code);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Reset your ' + brand + ' password</h2>' +
    '<p>Enter this code in the app, then choose a new password:</p>' +
    '<p style="' + CODE + '">' + code + '</p>' +
    '<p style="' + FINE + '">The code expires in 30 minutes. If you did not ask to reset your password, ignore this email; your password has not changed.</p>' +
    WRAP_CLOSE;
}

export function changeEmailHtml(brand, code) {
  brand = escHtml(brand); code = escHtml(code);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Confirm your new ' + brand + ' email</h2>' +
    '<p>Enter this code in the app to move your account to this address:</p>' +
    '<p style="' + CODE + '">' + code + '</p>' +
    '<p style="' + FINE + '">The code expires in 30 minutes. If you did not request this, you can ignore it.</p>' +
    WRAP_CLOSE;
}

export function trialEndingHtml(brand, name, days) {
  brand = escHtml(brand); name = escHtml(name); days = escHtml(days);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">' + days + ' day' + (String(days) === '1' ? '' : 's') + ' left on your Pro trial' + (name ? ', ' + name : '') + '</h2>' +
    '<p>When the trial ends your account moves to Free: one saved trip, no winds aloft on legs, no crosswind picks, no market reference and no crew sharing. Everything you entered stays.</p>' +
    '<p>Pro is $9.99 a month or $79 a year, less than one ramp fee, and it pays for itself the first time it says skip the stop.</p>' +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/" style="' + BTN + '">Keep Pro</a></p>' +
    '<p style="' + FINE + '">Open the app, tap Account, and pick a plan. Cancel any time.</p>' +
    WRAP_CLOSE;
}

export function trialEndedHtml(brand, name) {
  brand = escHtml(brand); name = escHtml(name);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Your Pro trial has ended' + (name ? ', ' + name : '') + '</h2>' +
    '<p>Your account is on the Free plan now. Airport lookup, weather, the calculators, your price log and one saved trip keep working. Your other trips and crew data are kept and unlock again the moment you go Pro.</p>' +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/" style="' + BTN + '">Go Pro</a></p>' +
    '<p>Not the right time? No problem. Reply to this email if something did not work the way you expected; it lands with a human.</p>' +
    WRAP_CLOSE;
}

export function reportEmailHtml(brand, r, url) {
  brand = escHtml(brand);
  const t = r.totals;
  const money = (x) => '$' + Math.round(Math.abs(x)).toLocaleString('en-US');
  const hh = (m) => Math.floor(m / 60) + ':' + (Math.round(m) % 60 < 10 ? '0' : '') + (Math.round(m) % 60);
  const who = [r.tail, r.aircraft].filter(Boolean).map(escHtml).join(' · ');
  const cell = (n, l) => '<td style="padding:10px 8px;text-align:center;border:1px solid #DCE3EC;border-radius:10px;background:#F4F6FA"><div style="font-size:22px;font-weight:800;color:#0F172A;font-family:B612 Mono,ui-monospace,Menlo,Consolas,monospace">' + n + '</div><div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#5B6779;font-weight:700;margin-top:3px">' + l + '</div></td>';
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">' + escHtml(r.label) + ' owner report' + (who ? ' · ' + who : '') + '</h2>' +
    '<p>' + t.legs + ' leg' + (t.legs === 1 ? '' : 's') + ' logged across ' + r.tripCount + ' trip' + (r.tripCount === 1 ? '' : 's') + '.</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="6" border="0" width="100%"><tr>' +
      cell(money(t.spend), 'Fuel bought') + cell(hh(t.blk), 'Block hrs') + cell(Math.round(t.used).toLocaleString('en-US'), 'Gal burned') + cell(t.avgPpg ? '$' + t.avgPpg.toFixed(2) : '–', 'Avg $/gal') +
    '</tr></table>' +
    (t.estCost && t.burnCost ? '<p style="' + FINE + '">The fuel burned cost ' + money(t.burnCost) + ' at the prices paid, ' + (t.burnCost <= t.estCost ? 'under' : 'over') + ' the ' + money(t.estCost) + ' planned by ' + money(t.burnCost - t.estCost) + '.</p>' : '') +
    '<p style="margin:22px 0"><a href="' + escHtml(url) + '" style="' + BTN + '">Open the full report</a></p>' +
    '<p style="' + FINE + '">The link prints to a clean one-page PDF and stays valid for a year. Figures come from the flight log in ' + brand + '; fees, hangar and crew costs are not included.</p>' +
    WRAP_CLOSE;
}

export function inviteEmailHtml(brand, inviter, opName, role, alreadyMember) {
  brand = escHtml(brand); inviter = escHtml(inviter); opName = escHtml(opName);
  const what = role === 'viewer'
    ? 'You have owner view: every trip, cost estimate, fuel price and note the crew keeps, read only.'
    : 'You can add fuel prices, FBO notes and trips, and everything the crew logs shows up on your phone too.';
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">' + inviter + ' added you to ' + opName + '</h2>' +
    '<p>' + brand + ' is the trip cost, fuel and runway desk for pilots who manage the airplane. ' + what + '</p>' +
    (alreadyMember
      ? '<p>You already have a ' + brand + ' account with this address. Open the app and the shared operation is in your Account tab.</p>'
      : '<p>Create a free account with this email address and the shared operation appears automatically. No credit card, and it installs on your phone.</p>') +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/" style="' + BTN + '">' + (alreadyMember ? 'Open ' + brand : 'Join on ' + brand) + '</a></p>' +
    '<p style="' + FINE + '">If you were not expecting this, you can ignore it; nothing is shared until you sign in.</p>' +
    WRAP_CLOSE;
}

/* Trial onboarding sequence (day 1, 3, 10). Each one teaches a single habit and links straight to it. */
const STEP = (n, t, d) => '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0"><tr><td style="vertical-align:top;padding-right:10px"><span style="display:inline-block;min-width:26px;height:26px;line-height:26px;text-align:center;border-radius:13px;background:#E3F0FF;color:#0B5FCC;font-weight:800;font-size:13px">' + n + '</span></td><td><div style="font-weight:700;color:#0F172A">' + t + '</div><div style="' + FINE + '">' + d + '</div></td></tr></table>';

export function onboard1Html(brand, name, home) {
  brand = escHtml(brand); name = escHtml(name); home = escHtml(home || 'your home base');
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Day one: the fuel stop math' + (name ? ', ' + name : '') + '</h2>' +
    '<p>The napkin version says a $2.30 gap on 150 gallons saves $345. It does not. The stop burns fuel, the detour burns fuel, and the FBO charges a fee. ' + brand + ' runs the real number in five seconds:</p>' +
    STEP(1, 'Open the Fuel Stop tab', 'Enter the price where you land, the price at the stop, and the gallons you need.') +
    STEP(2, 'Read the verdict', 'Net savings after the extra burn, the break-even price gap, and the minutes it costs you.') +
    STEP(3, 'Rank the stops on a route', 'Type ' + home + ' and a destination; every Jet A field in the corridor is scored by what it really saves.') +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/?go=fuel" style="' + BTN + '">Run the fuel stop math</a></p>' +
    '<p style="' + FINE + '">Tomorrow: nothing. Day three: how one logged flight makes every estimate after it sharper.</p>' +
    WRAP_CLOSE;
}

export function onboard3Html(brand, name) {
  brand = escHtml(brand); name = escHtml(name);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Day three: log one flight</h2>' +
    '<p>Book numbers are a starting point. Your airplane, your altitudes and your ATC do something else. After a flight, tap the pencil on the leg and enter three things:</p>' +
    STEP(1, 'Block time', 'Compared to the plan on the spot; three legs in, ' + brand + ' suggests a corrected block overhead.') +
    STEP(2, 'Fuel used', 'Same idea for burn: it learns your real gallons per hour and offers to update Settings.') +
    STEP(3, 'Fuel bought and the price', 'The receipt lands in your crew\'s price log automatically and feeds the owner report.') +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/?go=trip" style="' + BTN + '">Open your trips</a></p>' +
    '<p style="' + FINE + '">While you are there: set an alternate and departure fuel on a leg. The card tells you whether you land with reserve, before you file.</p>' +
    WRAP_CLOSE;
}

export function onboard10Html(brand, name, left) {
  brand = escHtml(brand); name = escHtml(name);
  return WRAP_OPEN +
    '<h2 style="' + H2 + '">Day ten: the owner report</h2>' +
    '<p>This is the part the owner sees. On the first of each month ' + brand + ' emails a one-page report: hours, gallons, fuel spend, the average price paid against your plan, and where the fuel came from. It prints clean, and it is built from the flights you logged.</p>' +
    STEP(1, 'Invite the owner with view-only access', 'Account, Crew, pick "Owner (view only)". They see every trip and estimate, and edit nothing.') +
    STEP(2, 'Share a trip brief before the next flight', 'Trip total, "Share owner brief". A link that prints, so the number is agreed before the fuel is bought.') +
    STEP(3, 'Build this month\'s report any time', 'Trip tab, Flight log, "Owner report".') +
    '<p style="margin:22px 0"><a href="https://www.jetdesk.ai/?go=account" style="' + BTN + '">Invite the owner</a></p>' +
    '<p style="' + FINE + '">' + (left > 0 ? left + ' day' + (left === 1 ? '' : 's') + ' left on your Pro trial. ' : '') + 'Pro is $9.99 a month or $79 a year; one skipped fuel stop pays for the year.</p>' +
    WRAP_CLOSE;
}
