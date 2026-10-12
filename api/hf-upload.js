import { checkPass, hfAuth, HF } from '../lib/auth.js';
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };
// Accepts { dataUrl } from the browser, uploads it to Higgsfield storage server-side, returns its public URL.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPass(req, res)) return;
  try {
    const m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/.exec((req.body && req.body.dataUrl) || '');
    if (!m) return res.status(400).json({ error: 'Expected a JPEG/PNG/WebP/GIF data URL' });
    const content_type = m[1], bytes = Buffer.from(m[2], 'base64');
    const g = await fetch(HF + '/files/generate-upload-url', { method: 'POST', headers: { Authorization: hfAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ content_type }) });
    const u = await g.json();
    if (!g.ok || !u.upload_url) return res.status(502).json({ error: 'Higgsfield upload URL failed: ' + JSON.stringify(u).slice(0, 200) });
    const put = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': content_type, ...(u.upload_headers || {}) }, body: bytes });
    if (!put.ok) return res.status(502).json({ error: 'Reference upload failed (' + put.status + ')' });
    res.status(200).json({ url: u.public_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
