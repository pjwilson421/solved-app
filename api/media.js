// Fetches a generated/uploaded image or video server-side so the board can crop, annotate,
// copy as PNG, extract palettes and download with a filename (browsers block these cross-origin).
import { checkPass } from '../lib/auth.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (!(await checkPass(req, res))) return;
  const url = String(req.query.url || '');
  let u; try { u = new URL(url); } catch (e) { return res.status(400).json({ error: 'Bad URL' }); }
  if (u.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return res.status(400).json({ error: 'Only public https media.' });
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !/^(image|video)\//.test(type)) return res.status(502).json({ error: 'Could not load that file.' });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 60 * 1024 * 1024) return res.status(413).json({ error: 'File too large.' });
    res.setHeader('Content-Type', type);
    if (req.query.name) res.setHeader('Content-Disposition', 'attachment; filename="' + String(req.query.name).replace(/[^\w.-]/g, '_') + '"');
    res.status(200).send(buf);
  } catch (e) { res.status(502).json({ error: 'Could not load that file.' }); }
}
