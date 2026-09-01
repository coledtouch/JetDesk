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
