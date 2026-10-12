import { checkPass, hfAuth, HF } from '../lib/auth.js';
import crypto from 'node:crypto';
// Submits one image generation. Model + reference field are configurable in Vercel env vars:
//   HF_IMAGE_MODEL      text-to-image model path        (default higgsfield-ai/soul/v2/standard)
//   HF_REF_MODEL        model used when reference photos are sent (optional)
//   HF_REF_FIELD        body field for reference URLs on that model, e.g. image_urls or image_url (optional)
//   HF_RESOLUTION       resolution value for the model  (default 1080p)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPass(req, res)) return;
  try {
    const { prompt, aspect_ratio, references } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const refs = Array.isArray(references) ? references.filter(u => /^https:\/\//.test(u)).slice(0, 4) : [];
    const useRef = refs.length && process.env.HF_REF_MODEL && process.env.HF_REF_FIELD;
    const model = useRef ? process.env.HF_REF_MODEL : (process.env.HF_IMAGE_MODEL || 'higgsfield-ai/soul/v2/standard');
    const body = { prompt: String(prompt).slice(0, 5000), aspect_ratio: aspect_ratio || '1:1', resolution: process.env.HF_RESOLUTION || '1080p' };
    if (/soul/.test(model)) { body.batch_size = 1; body.enhance_prompt = false; }
    if (useRef) body[process.env.HF_REF_FIELD] = /s$/.test(process.env.HF_REF_FIELD) ? refs : refs[0];
    const r = await fetch(HF + '/' + model.replace(/^\/+/, ''), { method: 'POST', headers: { Authorization: hfAuth(), 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.request_id) return res.status(502).json({ error: 'Higgsfield: ' + ((j && (j.detail || j.error || j.message)) ? JSON.stringify(j.detail || j.error || j.message).slice(0, 300) : 'request failed (' + r.status + ')') });
    res.status(200).json({ request_id: j.request_id, used_reference: !!useRef });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
