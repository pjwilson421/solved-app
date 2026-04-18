# Project snapshot manifest

## Snapshot identity

- **Snapshot folder:** `project-snapshot-2026-04-16-1153`
- **Snapshot date/time (local):** 2026-04-16 11:53 (from folder suffix `1153`)
- **Filesystem copy notes:** The snapshot folder is produced with `rsync` excluding `node_modules/`, `.next/`, other common build/cache dirs, and **all `.git` directories** (repo root and nested). That keeps a normal Git tree in this project (no embedded repositories) while this manifest + tag record the exact commit. Nested folders that previously contained a partial `.git` (e.g. older backup trees) are copied **without** those `.git` dirs.
- **Git commit notes:** If a root-level `backup_snapshot_*` folder exists with an invalid/partial embedded `.git`, Git may refuse to `git add` that path. The snapshot folder still contains a copy of that tree (files only). For version control, rely on this repository’s snapshot commit/tag; keep the problematic folder on disk if you need it verbatim.

## App sections / pages (App Router)

| Route | Purpose |
| --- | --- |
| `/` | Home |
| `/chat` | Chat (new session via `?new=1` from shell nav) |
| `/create-image` | Image generation workspace |
| `/create-video` | Video generation workspace |
| `/image-editor` | Image editor (handoff from create flows / pending session storage) |
| `/files` | Files / uploads catalog |
| `/history` | Activity history |
| `/liked` | Liked items |
| `/settings/general` | Settings — general |
| `/settings/appearance` | Settings — appearance |
| `/settings/help` | Settings — help |

## Major features (high level)

- **Chat:** Anthropic-backed API route; thread persistence client-side.
- **Create Image:** Gemini-backed generation, preview/history UI, prompt bar, share/expand/upscale/edit-style flows toward the image editor with session handoff.
- **Create Video:** Video generation UI/API integration; related media actions.
- **Image editor:** Consumes pending image payload (including optional `mode` / metadata) from session handoff.
- **Files:** Upload entries with local persistence.
- **History:** Unified activity feed (image, video, editor, chat) with metadata-focused storage.
- **Liked:** Global liked keys with heart toggles and a dedicated page.
- **Settings:** General, appearance, help subsections.

## UI / design direction

- App shell with consistent primary navigation (desktop sidebar + mobile shell).
- Dense, product-style panels for generation (prompt dock, settings rows, preview, history strip).
- Icon-driven actions on previews (expand, share, upscale, edit) with menus where appropriate.

## Navigation structure

Primary shell IDs / routes (see `lib/app-navigation.ts`):

- Chat → `/chat?new=1` (special: uses new-chat flow)
- Create Image → `/create-image`
- Create Video → `/create-video`
- Image Editor → `/image-editor`
- Files → `/files`
- History → `/history`
- Liked → `/liked`
- Settings → `/settings/general`, `/settings/appearance`, `/settings/help`

## Persistence (client)

- **Activity / history:** `localStorage` key `solved-app-activity-entries-v1` (metadata-oriented; avoids huge `data:` URLs).
- **Chat threads:** `solved-app-chat-threads-v1`
- **File catalog:** `solved-app-file-entries-v1`
- **Liked item keys:** `solved-app-liked-item-keys-v2` (migrates from legacy v1 key on load)
- **Chat assistant feedback:** dedicated key in `ChatClient`
- **Image editor handoff:** `sessionStorage` via `lib/create-image/pending-editor-image.ts` (short-lived navigation payload)

## Important API routes

- `/api/chat` — Anthropic
- `/api/ai/generate-image` — Gemini image generation
- `/api/video/generate` — Gemini video generation

## Environment variables

See root `.env.example` for names (no secrets committed there).

## Known issues (best-effort / not re-validated in this snapshot)

- **Typecheck:** Earlier passes reported unrelated TypeScript issues in history/liked grid components (`rowIndex` / prop typing). Run `npx tsc --noEmit` after restore to see current status.
- **Local secrets:** `.env.local` is not part of the public repo pattern; restore requires copying env from your secure store.

## Restore instructions

1. **From this snapshot folder**
   - Copy `project-snapshot-2026-04-16-1153/` to a new directory (or use it in place).
   - Run `npm ci` or `npm install` to recreate `node_modules`.
   - Add `.env.local` (use `.env.example` as a template).
   - Run `npm run dev` (or your production build command).

2. **From Git (this repo)**
   - Checkout commit with message `Snapshot: preserve current app state` or use tag `snapshot-2026-04-16-1153`.
   - Reinstall dependencies and add `.env.local` as above.

3. **Optional:** Copy the snapshot folder elsewhere as a cold backup; it excludes `node_modules` and `.next` to stay portable and small. It does **not** include `.git`; use the Git tag on this repository for full version history.
