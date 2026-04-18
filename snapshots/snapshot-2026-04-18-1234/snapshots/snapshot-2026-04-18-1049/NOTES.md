# Snapshot notes

**Snapshot of app at current state:** 2026-04-18 (folder `snapshot-2026-04-18-1049`).

## Major working features (as of this snapshot)

- **Chat** — Claude-backed chat flows in the app shell.
- **Create Image** — Image generation UI, prompt bar, settings, history, templates integration.
- **Create Video** — Video creation client and related flows.
- **Image Editor** — Edit handoff, tools (add/remove/draw/text/enhance/regenerate), preview, generation with masks/composite references.
- **Templates** — Template assets and composed preview paths under create-image.

## Known issues / caveats

- The snapshot folder intentionally **does not include a nested `.git` directory** (avoids duplicating the object database inside the main repo’s commit). File contents match the tree at snapshot time; use the main repo’s remote for history.
- Not a full `node_modules` or `.next` backup; restore with `npm install` and `npm run dev` / `npm run build`.
- Prior snapshot and backup folders may be present under this tree from earlier exports (large disk use).
- Local secrets belong only in `.env.local` (not included here).
