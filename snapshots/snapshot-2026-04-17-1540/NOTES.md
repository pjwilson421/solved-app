# Snapshot notes — 2026-04-17 (15:40 local)

## What this is

A filesystem snapshot of the SOLVED app at the time the backup was taken: Next.js App Router, chat, create-image flows, file/history areas, and API routes for image generation (Gemini) and chat (Anthropic). Previous nested backup folders under the repo root were **not** copied into this snapshot to avoid duplication.

## Working features (high level)

- **Chat** — server route using Anthropic when `ANTHROPIC_API_KEY` is set.
- **Create image** — UI plus `/api/ai/generate-image` using Gemini; optional model override via env.
- **Create video** — related API route using Gemini where configured.
- **Files, history, liked, settings** — client-side persistence and navigation patterns used elsewhere in the app.
- **Image editor** route — integrates with create-image flows and shared editor image context when enabled in root layout.

## Environment

Runtime expects secrets in `.env.local` (not included here). See `.env.example` and `RESTORE.md`.

## Known issues / caveats

- **Secrets**: This snapshot intentionally omits `.env.local`. If keys were ever committed or shared, rotate them at the provider consoles.
- **Excluded dirs**: `node_modules`, `.next`, `.vercel`, `dist`, `build`, and other snapshot/backup trees at the repo root are excluded; restore with `npm ci` and a local build.
- **Typecheck**: The production build may skip full TypeScript validation depending on project config; run `npx tsc --noEmit` if you need a strict type pass.

## Recent changes detectable at snapshot time

- Root `app/layout.tsx` wraps the tree with `EditorImageProvider` from `components/create-image/editor-image-context.tsx` so selected editor image state can span Create Image and Image Editor.
- Create-image area includes composed social templates, preview/editor clients, and related `lib/create-image` helpers (see git history after restore for exact diffs).
