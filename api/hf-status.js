import { checkPass, hfAuth, HF } from '../lib/auth.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!checkPass(req, res)) return;
  const id = String(req.query.id || '');
  if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) return res.status(400).json({ error: 'bad id' });
  try {
    const r = await fetch(HF + '/requests/' + id + '/status', { headers: { Authorization: hfAuth() } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'Higgsfield status failed (' + r.status + ')' });
    const url = (j.images && j.images[0] && j.images[0].url) || (j.image && j.image.url) || null;
    res.status(200).json({ status: j.status, url });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
