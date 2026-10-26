# SOLVED Studio

Live app: https://www.solvedmedia.xyz/studio

Source lives on the `solved-studio` GitHub branch; `main` belongs to a different app — don't work there unless explicitly asked.

## What's live

One simple studio to go from a prompt to a finished image or video:

- **Create** — one prompt box, one Generate button, style presets, an Image/Video toggle, and one settings control (model/ratio/size/quality). Images via Higgsfield's GPT Image 2.5; video via Kling 3.0 Standard (image-to-video) and Seedance 2.5 (text-to-video), both through the Higgsfield API.
- **Look** — Products, Characters and Locations, each with the full 7/12-view consistency-sheet flow available as an advanced path (reached from a generated image's "Save as character" action, or by opening the tab directly) — not the default landing.
- **Keyframes** — mark a generated image as a shot's start frame (the keyframe toggle) or end frame ("Use as end frame"), reorder shots, and generate video from the pair — both frames are wired into Kling/Seedance's image-to-video call.
- **Produce** — Videos and Editing (Image Editor, Video Editor) under one nav group.
- **Deliver** — ZIP download and a private client share link (7-day expiry).
- **Library** — every generated/uploaded file in the project, searchable.

Not yet built (and not shown as dead "Coming soon" tiles): Motion Designer, 3D Animator, Sound Designer, Colorist, and cloud delivery destinations (Google Drive, Dropbox, Frame.io). The Editing page shows one honest line instead: "3D & motion graphics — desktop / render queue (planned)."

## Repo layout

- `studio/index.html` (mirrored byte-for-byte at `studio-src/app-template.html`) — the entire frontend: a single-file SPA using a small custom templating runtime (`studio/assets/*.js`). Both copies must stay identical; always edit one and `cp` over the other.
- `studio/assets/cloud-sync.js` — mirrors local `localStorage`/IndexedDB writes to the signed-in user's Supabase account (`kv_store` table), so projects survive a cleared or different browser.
- `api/*.js`, `api/brief-import.py` — Vercel serverless routes: Higgsfield image/video generation and status, Claude-based brief import and text/photo analysis, and a health check.
- `lib/*.js` — shared server helpers: Higgsfield auth (`hf.js`, `auth.js`), Supabase account verification (`supa.js`), legacy password sessions (`session.js`).
- `middleware.js` — gates every route behind either a signed-in Supabase account or the legacy studio password.

## Auth

Two paths, both handled in `middleware.js`:

1. **SOLVED account (Supabase email + password)** — the primary path. A server-side allowlist (`STUDIO_ALLOWED_EMAILS`) gates which verified accounts actually get access, independent of whether sign-up succeeds.
2. **Legacy studio password** (`STUDIO_PASSWORD` + `STUDIO_SESSION_SECRET`) — kept available during the transition off password-only access; disabled automatically if either env var is unset.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude text/photo analysis and brief import. |
| `HF_CREDENTIALS` (or `HF_API_KEY_ID` + `HF_API_KEY_SECRET`) | Yes | Higgsfield API key — image/video generation. Accepts a combined `id:secret` or the split pair; see `lib/auth.js`. |
| `STUDIO_PASSWORD` | Legacy, optional | Enables the old password sign-in page alongside Supabase accounts. Leave unset once every real user has a SOLVED account. |
| `STUDIO_SESSION_SECRET` | Required if `STUDIO_PASSWORD` is set | Signs the legacy password session cookie. |
| `STUDIO_ALLOWED_EMAILS` | Optional | Comma-separated allowlist of emails permitted to use a Supabase account. Defaults to a single address — set this for any additional real users. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Optional | Override the project's Supabase instance; both have working defaults baked in. |
| `CLAUDE_MODEL` | Optional | Defaults to `claude-sonnet-5-5`. |

Do not commit secrets — these all come from Vercel environment variables.

## Data

Local `localStorage` + IndexedDB are a cache, not the source of truth for signed-in users: `cloud-sync.js` mirrors every write to Supabase and pulls on first load per browser tab, so a project opened on a new device picks up where it left off. Large payloads (images, videos) upload to Supabase Storage and get replaced by a reference in the synced JSON.
