/* Password hashing, tokens, HMAC. WebCrypto only (Workers-safe). */

const enc = new TextEncoder();
const ITER = 30000; // kept modest for Workers CPU budgets; stored per hash so it can rise later

function hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
export function randHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return hex(a.buffer);
}
export async function sha256hex(s) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}
async function derive(password, saltHex, iterations, pepper) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password + '|' + (pepper || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key, 256
  );
  return hex(bits);
}
/* returns { hash: 'pbkdf2$iter$hex', salt } */
export async function hashPassword(password, pepper) {
  const salt = randHex(16);
  const h = await derive(password, salt, ITER, pepper);
  return { hash: 'pbkdf2$' + ITER + '$' + h, salt };
}
export async function verifyPassword(password, stored, salt, pepper) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  const h = await derive(password, salt, iter, pepper);
  return safeEqual(h, parts[2]);
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
