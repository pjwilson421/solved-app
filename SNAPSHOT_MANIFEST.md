# Snapshot manifest

## Snapshot folder

- **Name:** `backup_snapshot_2026_04_16_1549`
- **Created (local):** 2026-04-16 — wall time stamp encoded in folder name (`1549` = HHMM)
- **UTC reference:** 2026-04-16T21:49:57Z (at snapshot run)

## What was copied

- Full project tree from repository root into the snapshot folder.
- **Excluded from copy:** `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `.vercel/`, `coverage/`, and the destination folder itself (to avoid rsync recursion).
- **Included:** `app/`, `components/`, `lib/`, `public/`, config files, `package.json`, `package-lock.json`, docs, nested historical folders (e.g. older `project-snapshot-*` / `backup_snapshot-*` that existed in the tree), and **`.env.local` if present** (contains secrets — treat the backup as sensitive).

## Nested `.git` directories

- Some older `backup_snapshot_*` trees under this repo have contained their own `.git` folder (e.g. from prior experiments). Those were copied as-is if present in the source tree. The **main** repo `.git` at the project root is included in the backup when present.

## Restore from filesystem backup

1. Copy the snapshot folder to the desired machine or rename it to your project directory.
2. From that directory: `npm ci` or `npm install`
3. Ensure `.env.local` exists (copy from `.env.example` and fill keys, or restore your secrets from a secure store).
4. `npm run dev` for development, or `npm run build` / `npm start` for production.

## Restore via Git

- **Commit message:** `Snapshot: full app state`
- **Tag:** `snapshot-2026-04-16-1549`
- This records the **source tree** at snapshot time. Run `npm install` after checkout. Snapshot folders under `backup_snapshot_*/` are **gitignored** to avoid committing large duplicates; use the filesystem backup folder for a byte-level copy including ignored files.

```bash
git fetch --tags
git checkout snapshot-2026-04-16-1549
npm ci
```

## Main routes / pages

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/chat` | Chat |
| `/create-image` | Create Image |
| `/create-video` | Create Video |
| `/image-editor` | Image editor |
| `/files` | Files |
| `/history` | History |
| `/liked` | Liked items |
| `/settings/appearance` | Settings |
| `/settings/general` | Settings |
| `/settings/help` | Settings |

## Core features (high level)

- **Chat:** docked prompt bar, Claude API (`/api/chat`).
- **Create Image:** generation settings, Gemini image API (`/api/ai/generate-image`), attachments, drag-and-drop on prompt bar, activity/history integration, dimension map + `sharp` normalization.
- **Create Video:** prompt bar, video generation API (`/api/video/generate`), Gemini.
- **Image editor:** handoff from Create Image, tools, history.
- **Files / history / liked:** app data context, localStorage-backed activity entries (metadata-focused persistence).
- **Shared UI:** `PromptBar`, `PromptBarShell`, `FixedPromptBarDock`, shell navigation.

## Data / storage

- **localStorage:** activity entries (`solved-app-activity-entries-v1`), liked keys, pending editor image payload, etc. (see `lib/app-data/`).
- **No server DB** in-tree for core flows; APIs are stateless aside from env keys.

## API integrations

- **Google Gemini** — image generation (`generate-image`), video generation; keys via `GEMINI_API_KEY` and aliases listed in `.env.example`.
- **Anthropic** — chat completions (`ANTHROPIC_API_KEY`).

## Environment variables (names only)

- `GEMINI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (optional alias read by image route)
- `GOOGLE_AI_API_KEY` (optional alias read by image route)
- `GEMINI_IMAGE_MODEL` (optional)
- `ANTHROPIC_API_KEY`

See `.env.example` for a template.

## Known issues / notes

- `next.config.ts` sets `typescript.ignoreBuildErrors: true` (build may skip type validation).
- Repository may contain large nested `backup_snapshot_*` / `project-snapshot-*` trees from earlier exports; they increase disk usage.
- Full-repo `tsc` may report issues in those snapshot trees if included in `tsconfig` `include` globs.

## Verification checklist

- [x] Filesystem backup folder `backup_snapshot_2026_04_16_1549` created
- [x] `SNAPSHOT_MANIFEST.md` at repo root
- [x] `.env.example` at repo root
- [x] `.gitignore` updated to ignore `backup_snapshot_*/` (Git commit tracks source, not duplicate snapshot blobs)
