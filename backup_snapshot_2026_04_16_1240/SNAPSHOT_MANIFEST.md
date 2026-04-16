# Project snapshot manifest

## Snapshot identity

- **Snapshot folder:** `backup_snapshot_2026_04_16_1240`
- **Snapshot date/time (local):** 2026-04-16 12:40
- **Filesystem copy notes:** The backup folder is produced with `rsync` excluding `node_modules/`, `.next/`, common build/cache/output dirs, and all `.git` directories at any depth. All other project files are copied as plain files for restoration.
- **Nested Git warning:** A root-level `backup_snapshot_2026_04_16_1011/` folder contains an embedded/broken `.git`. Its files are still copied into the new backup, but nested `.git` metadata is excluded so the backup can be created safely. Git staging in the main repo excludes that broken root folder for the same reason.

## Current routes / pages

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
| `/settings/help` | Help / support settings |

## Current core features

- Anthropic-backed chat with persisted client-side threads.
- Gemini-backed Create Image flow with prompt bar, settings row, preview, history rail, share/download/edit/upscale actions, and fullscreen expand behavior.
- Create Video generation flow with its own media actions.
- Image Editor handoff via session storage payloads.
- Files catalog, unified history, and liked-item systems.

## Current UI / design direction

- Desktop app shell with left navigation, centered work surface, and right-side history rail.
- Mobile flow keeps the same creation flow in a stacked single-column layout.
- Dense dark-theme product UI with docked prompt/settings controls and image-preview-first workflows.

## Key shared systems

- `lib/app-navigation.ts` primary shell navigation and settings routing.
- `lib/app-data/*` shared app data context, storage, and catalog actions.
- `components/global/GlobalPreviewModal.tsx` shared global preview modal for app-wide preview use.
- `components/create-image/*` Create Image preview, history, prompt dock, and editor handoff flow.

## Persistence / storage systems

- `localStorage`: `solved-app-activity-entries-v1`
- `localStorage`: `solved-app-chat-threads-v1`
- `localStorage`: `solved-app-file-entries-v1`
- `localStorage`: `solved-app-liked-item-keys-v2`
- `sessionStorage`: pending image-editor handoff payload

## Important environment variable names

- `GEMINI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `GEMINI_IMAGE_MODEL`
- `ANTHROPIC_API_KEY`

## Obvious known issues

- The Create Image fullscreen Expand viewer is still reported as visually incorrect by the user at the time of this snapshot.
- Earlier typechecking runs reported unrelated `rowIndex` prop issues in history/liked grid components.
- `.env.local` contains local secrets and is intentionally not committed.

## Simple restore instructions

1. Restore from files:
   - Use `backup_snapshot_2026_04_16_1240/`.
   - Run `npm ci` or `npm install`.
   - Recreate `.env.local` from `.env.example`.
   - Run `npm run dev`.

2. Restore from Git:
   - Checkout commit message `Snapshot: preserve full current app state` or tag `snapshot-2026-04-16-1240`.
   - Reinstall dependencies and restore `.env.local`.

3. Backup portability:
   - Generated folders and `.git` metadata are excluded from the filesystem backup; use the Git tag for exact VCS restoration.
