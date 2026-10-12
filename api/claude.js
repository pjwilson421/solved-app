import { checkPass } from '../lib/auth.js';
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPass(req, res)) return;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server' });
  const { messages, max_tokens } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5', max_tokens: Math.min(Number(max_tokens) || 1024, 4096), messages })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Claude request failed' });
    res.status(200).json({ text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('') });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
