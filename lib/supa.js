// Supabase account check for SOLVED Studio (server side).
// The URL and publishable key are public by design; access is enforced by row-level security.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wetzjfsdumraslfojcva.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bw0_xjD26NDCDCUAYKM0TA_NS9DE_D1';
const ALLOWED = (process.env.STUDIO_ALLOWED_EMAILS || 'pj@pjwilson.me').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const cache = new Map();
export function tokenFrom(headers) {
  const auth = String(headers.authorization || headers.Authorization || '');
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  const c = String(headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('sb_at='));
  return c ? decodeURIComponent(c.slice(6)) : '';
}
export async function verifyToken(token) {
  if (!token || token.length > 4096 || token.split('.').length !== 3) return null;
  const hit = cache.get(token), now = Date.now();
  if (hit && hit.until > now) return hit.user;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const u = await r.json();
    const user = u && u.id && ALLOWED.includes(String(u.email || '').toLowerCase()) ? { id: u.id, email: u.email } : null;
    if (cache.size > 500) cache.clear();
    cache.set(token, { user, until: now + 60000 });
    return user;
  } catch { return null; }
}
