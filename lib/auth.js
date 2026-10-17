import { validSession } from './session.js';
import { tokenFrom, verifyToken } from './supa.js';
// Shared helpers for SOLVED Studio API routes.
// Accepts a signed-in SOLVED account (Supabase) or, during the transition, the old studio password session.
export async function checkPass(req, res) {
  if (process.env.STUDIO_PASSWORD && validSession(req.headers.cookie)) return true;
  if (await verifyToken(tokenFrom(req.headers))) return true;
  res.status(401).json({ error: 'Sign in required' });
  return false;
}
const clean = v => String(v || '').trim().replace(/^Key\s+/i, '').replace(/\s+/g, '');
// Accepts either HF_CREDENTIALS ("id:secret" or the full key exactly as Higgsfield shows it)
// or the HF_API_KEY_ID + HF_API_KEY_SECRET pair.
export function hfAuth() {
  // Accepts any of: HF_API_KEY_ID + HF_API_KEY_SECRET, a combined "id:secret" in either box,
  // HF_API_KEY / HF_CREDENTIALS (combined), with or without a leading "Key ".
  const clean = v => String(v || '').trim().replace(/^Key\s+/i, '').replace(/^["']|["']$/g, '').trim();
  const id = clean(process.env.HF_API_KEY_ID), secret = clean(process.env.HF_API_KEY_SECRET);
  const combined = clean(process.env.HF_CREDENTIALS) || clean(process.env.HF_API_KEY);
  let cred = '';
  if (id.includes(':')) cred = id;                 // full key pasted into the ID box
  else if (secret.includes(':')) cred = secret;    // full key pasted into the secret box
  else if (id && secret) cred = id + ':' + secret;
  else if (combined) cred = combined;
  if (!cred) throw new Error('Higgsfield keys are not set on the server (HF_API_KEY_ID / HF_API_KEY_SECRET)');
  return 'Key ' + cred;
}
export const HF = 'https://api.higgsfield.ai';
