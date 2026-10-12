import { hfConfigured } from '../lib/auth.js';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ ok: true, higgsfield: hfConfigured(), claude: !!process.env.ANTHROPIC_API_KEY, password: !!process.env.STUDIO_PASSWORD });
}
