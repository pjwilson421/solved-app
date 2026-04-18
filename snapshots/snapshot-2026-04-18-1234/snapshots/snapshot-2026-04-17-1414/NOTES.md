# Snapshot notes — 2026-04-17 (local time folder: `snapshot-2026-04-17-1414`)

## Description

State of the **solved-app** Next.js codebase at the time this snapshot was taken: working dev setup with Create Image, Image Editor, chat, templates, and related UI flows.

## Major areas (expected working)

- **Chat** — Claude-backed chat flows (requires `ANTHROPIC_API_KEY`).
- **Create Image** — generation UI, templates, preview, prompt bar, history rail (requires `GEMINI_API_KEY` for API routes).
- **Create Video** — create-video client shell (same app shell patterns).
- **Image Editor** — edit/upscale handoff, tools strip (e.g. Add mask tool), templates, history.
- **Templates system** — `TemplatesPanel` (click toggle, outside close, shared chevron), desktop/mobile responsive instances.

## Excluded from this folder (by design)

- `node_modules`, `.next`, `.git`
- Historical duplicate trees: `backup_snapshot_*`, `project-snapshot-*`
- **`.env.local`** (secrets). Use `.env.example` + `.env.snapshot` (keys only) to recreate env safely.

## Known issues

- None recorded at snapshot time; treat as “best effort” copy — run `npm run dev` after restore to verify.

## Recent changes (detectable at snapshot)

- Templates: single open state, desktop/mobile column fix for outside-dismiss, SVG chevron rotation for open/closed.
- Image Editor: Add tool mask painting with stroke-based undo/redo, brush dropdown.
- Tailwind v4 via `@tailwindcss/postcss` (no root `tailwind.config.js` in this tree).

## Agent / editor rules

- See `AGENTS.md` and `CLAUDE.md` in this snapshot for Next.js and tooling notes.
