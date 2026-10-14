import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
export const COOKIE = '__Host-solved_session';
export const TTL = 60 * 60 * 12;
export function equal(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
function sign(value) { return createHmac('sha256', process.env.STUDIO_SESSION_SECRET || '').update(value).digest('base64url'); }
export function issueSession() {
  const value = String(Math.floor(Date.now() / 1000) + TTL) + '.' + randomBytes(24).toString('base64url');
  return value + '.' + sign(value);
}
export function validSession(cookie) {
  if (!process.env.STUDIO_PASSWORD || !process.env.STUDIO_SESSION_SECRET) return false;
  const token = String(cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const expires = Number(parts[0]), now = Math.floor(Date.now()/1000);
  return expires > now && expires <= now + TTL && equal(parts[2], sign(parts[0] + '.' + parts[1]));
}
