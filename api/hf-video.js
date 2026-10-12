import { checkPass } from '../lib/auth.js';
import { generateSeedance, seedanceExample } from '../lib/seedance.js';
export const config = { maxDuration: 300 };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPass(req, res)) return;
  try {
    const url = await generateSeedance(seedanceExample);
    return res.status(200).json({ status: 'completed', url });
  } catch {
    return res.status(502).json({ error: 'Seedance generation failed, was canceled or moderated, or returned no video. No success verified.' });
  }
}
