# Project snapshot manifest

## Snapshot identity

- **Snapshot folder:** `project-snapshot-2026-04-16-1230`
- **Snapshot date/time (local):** 2026-04-16 12:30
- **Filesystem copy notes:** The snapshot folder is produced with `rsync` excluding `node_modules/`, `.next/`, common build/cache dirs, and all `.git` directories. This keeps the snapshot restorable as plain files while Git commit/tag in this repo identify the exact saved version.
- **Git commit notes:** A root-level `backup_snapshot_2026_04_16_1011/` folder currently contains an invalid embedded `.git`, so Git cannot stage that root folder directly. The snapshot folder still contains its files-only copy; use this repo’s snapshot commit/tag for version history.

## App sections / pages

| Route | Purpose |
| --- | --- |
| `/` | Home |
| `/chat` | Chat workspace |
| `/create-image` | Image generation workspace |
| `/create-video` | Video generation workspace |
| `/image-editor` | Image editor |
| `/files` | Files / uploads |
| `/history` | Unified history |
| `/liked` | Liked items |
| `/settings/general` | General settings |
| `/settings/appearance` | Appearance settings |
| `/settings/help` | Help settings |

## Major features

- Chat with Anthropic-backed API route and persisted client-side threads.
- Create Image with Gemini generation, prompt dock, settings controls, preview, history rail, share / expand / edit / upscale actions.
- Create Video generation flow with related preview/media actions.
- Image Editor handoff from generation flows via session storage payload.
- Files catalog with uploads and previews.
- Global history and liked-item systems backed by local storage.

## UI state / design direction

- Desktop shell with left navigation, centered work area, and right history rail.
- Mobile shell preserves the same generation flow in a stacked layout.
- Create Image uses a dense product-style preview surface with persistent docked prompt/settings controls.
- Preview actions are menu-driven and image expansion uses a full-screen overlay viewer.

## Navigation structure

- Chat → `/chat?new=1`
- Create Image → `/create-image`
- Create Video → `/create-video`
- Image Editor → `/image-editor`
- Files → `/files`
- History → `/history`
- Liked → `/liked`
- Settings → `/settings/general`, `/settings/appearance`, `/settings/help`

## Persistence systems

- `localStorage`: `solved-app-activity-entries-v1`
- `localStorage`: `solved-app-chat-threads-v1`
- `localStorage`: `solved-app-file-entries-v1`
- `localStorage`: `solved-app-liked-item-keys-v2`
- `sessionStorage`: pending image-editor handoff payload in `lib/create-image/pending-editor-image.ts`

## Important routes / APIs

- `/api/chat`
- `/api/ai/generate-image`
- `/api/video/generate`
- `/create-image`
- `/create-video`
- `/image-editor`

## Environment variables

See `.env.example` for required variable names only.

## Known issues

- Existing unrelated TypeScript issues have previously been reported in history/liked grid components around `rowIndex` props.
- `.env.local` contains local secrets and is intentionally not committed.

## Restore instructions

1. Restore from files:
   - Use `project-snapshot-2026-04-16-1230/`.
   - Run `npm ci` or `npm install`.
   - Recreate `.env.local` from `.env.example`.
   - Run `npm run dev`.

2. Restore from Git:
   - Checkout commit message `Snapshot: preserve current app state` or tag `snapshot-2026-04-16-1230`.
   - Reinstall dependencies and restore `.env.local`.

3. Snapshot portability:
   - The snapshot excludes generated/dependency folders and `.git`; use the Git tag for exact VCS restoration.
