# Snapshot notes

**Snapshot of app at current state** — captured as `snapshots/snapshot-2026-04-18-0921/` (source copy only: excludes `node_modules`, `.next`, and other build/cache artifacts).

## Major working features (at time of snapshot)

- **Chat** — Claude-powered chat via API routes and in-app UI.
- **Create Image** — Image generation flow, preview, prompts, settings, templates integration where present.
- **Create Video** — Video generation entry points and API wiring (Gemini).
- **Image Editor** — Edit handoff, paint/mask overlay, text tool, tool strip, history/sidebar integration.
- **Templates** — Template assets and UI for create flows (where included in this tree).

## Known issues / caveats

- **Typecheck** — Root `tsconfig` may include other trees (e.g. older `snapshots/` copies); local `tsc` can report errors from nested snapshot folders unless excluded.
- **Env required** — Image/video/chat features need valid API keys in `.env.local` (or Vercel env).
- **Mock paths** — Some editor or file flows may still use mock/demo data in places; verify against production APIs.
- This archive does **not** include secrets, `node_modules`, or `.next`; restore per `RESTORE.md`.
