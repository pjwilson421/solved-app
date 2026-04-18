# Snapshot notes — 2026-04-18 (snapshot-2026-04-18-1234)

## What this is

Frozen copy of the **solved-app** working tree at backup time: Next.js 16 app with chat, media creation flows, and client-side catalog/history patterns.

## Major feature areas (as of this snapshot)

- **Chat** — Anthropic-backed chat UI and API routes.
- **Create Image** — Prompt bar, templates, aspect ratio / resolution, image generation (Gemini), preview and history.
- **Create Video** — Video creation flow aligned with shared shell/navigation.
- **Image Editor** — Edit/upscale handoff from Create Image, tools, preview, generation.
- **Templates** — Template selection and composed layouts (e.g. social templates) on Create Image.

## Technical notes

- App data (activity, files, chats) uses browser **localStorage** in places; large `data:` URLs may be stripped on persist (see `lib/app-data/*-persistence.ts`).
- Snapshot **excludes** `node_modules`, `.next`, `.vercel`, build outputs, and `.env.local` (secrets). Use `.env.snapshot` + `.env.example` for env shape.

## Known limitations / issues (general)

- Restoring **only** from this folder does not restore Git history (`.git` was excluded from the copy).
- Older backup folders (`backup_snapshot_*`, `project-snapshot-*`, nested `snapshots/*`) are included in this archive and can be large; they are not required to run the app.
