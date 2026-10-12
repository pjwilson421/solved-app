// Shared helpers for SOLVED Studio API routes.
export function checkPass(req, res) {
  const want = process.env.STUDIO_PASSWORD;
  if (!want) return true; // no password set = open (not recommended in production)
  if ((req.headers['x-studio-pass'] || '') === want) return true;
  res.status(401).json({ error: 'Password required' });
  return false;
}
const clean = v => String(v || '').trim().replace(/^Key\s+/i, '').replace(/\s+/g, '');
// Accepts either HF_CREDENTIALS ("id:secret" or the full key exactly as Higgsfield shows it)
// or the HF_API_KEY_ID + HF_API_KEY_SECRET pair.
export function hfAuth() {
  const combined = clean(process.env.HF_CREDENTIALS || process.env.HF_API_KEY);
  if (combined) return 'Key ' + combined;
  const id = clean(process.env.HF_API_KEY_ID), secret = clean(process.env.HF_API_KEY_SECRET);
  if (!id || !secret) throw new Error('Higgsfield keys are not set on the server (HF_CREDENTIALS, or HF_API_KEY_ID + HF_API_KEY_SECRET)');
  return 'Key ' + (id.includes(':') ? id : id + ':' + secret);
}
export function hfConfigured() {
  return !!(process.env.HF_CREDENTIALS || process.env.HF_API_KEY || (process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET));
}
export const HF = 'https://api.higgsfield.ai';
