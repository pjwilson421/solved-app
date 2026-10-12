export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ ok: true, higgsfield: !!(process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET), claude: !!process.env.ANTHROPIC_API_KEY, password: !!process.env.STUDIO_PASSWORD });
}
