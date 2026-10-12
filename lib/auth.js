// Shared helpers for SOLVED Studio API routes.
export function checkPass(req, res) {
  const want = process.env.STUDIO_PASSWORD;
  if (!want) return true; // no password set = open (not recommended in production)
  if ((req.headers['x-studio-pass'] || '') === want) return true;
  res.status(401).json({ error: 'Password required' });
  return false;
}
export function hfAuth() {
  const id = process.env.HF_API_KEY_ID, secret = process.env.HF_API_KEY_SECRET;
  if (!id || !secret) throw new Error('Higgsfield keys are not set on the server (HF_API_KEY_ID / HF_API_KEY_SECRET)');
  return 'Key ' + id + ':' + secret;
}
export const HF = 'https://api.higgsfield.ai';
