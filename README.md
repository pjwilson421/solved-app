# SOLVED Studio — hosted build

Served at **https://www.solvedmedia.xyz/studio** (the solvedmedia project proxies `/studio/*` to this project).

## Structure
- `studio/index.html` — the full SOLVED Studio app (self-contained bundle; same design and behavior as the Claude artifact).
- `studio-src/` — readable sources: `app-template.html` (app markup + logic) and `hf-client.js` (Higgsfield/Claude client used in the hosted build).
- `api/` — Vercel serverless functions. All keys stay on the server.
  - `claude.js` — Claude (photo reading, brief extraction)
  - `hf-upload.js` — uploads a reference photo to Higgsfield storage
  - `hf-generate.js` / `hf-status.js` — submit + poll Higgsfield image generations
  - `health.js` — reports which keys are configured (never the values)

## Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Required | What |
|---|---|---|
| `HF_API_KEY_ID` | yes | Higgsfield API key ID (cloud.higgsfield.ai → API Keys) |
| `HF_API_KEY_SECRET` | yes | Higgsfield API key secret |
| `ANTHROPIC_API_KEY` | yes | Anthropic API key (console.anthropic.com) |
| `STUDIO_PASSWORD` | strongly recommended | Password the app asks for once per browser; blocks strangers from spending your credits |
| `HF_IMAGE_MODEL` | no | Higgsfield model path, default `higgsfield-ai/soul/v2/standard` |
| `HF_REF_MODEL` / `HF_REF_FIELD` | no | Model + body field to use when reference photos are sent (enables face-reference generation) |
| `HF_RESOLUTION` | no | default `1080p` |
| `CLAUDE_MODEL` | no | default `claude-sonnet-5-5` |

Redeploy after changing environment variables.
