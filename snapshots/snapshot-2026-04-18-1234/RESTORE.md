# Restore this snapshot

This folder is a point-in-time copy of the **solved-app** source tree (no `node_modules`, `.next`, or `.git`).

## 1. Copy out of snapshots (optional)

To work on it as a normal project:

```bash
cp -R /path/to/solved-app/snapshots/snapshot-2026-04-18-1234 /path/to/solved-app-restored
cd /path/to/solved-app-restored
```

## 2. Install dependencies

```bash
npm install
```

## 3. Environment variables

1. Copy `.env.example` to `.env.local`, **or** use `.env.snapshot` in this folder as a key checklist.
2. Set real values for at least:
   - `GEMINI_API_KEY` (image / video generation)
   - `ANTHROPIC_API_KEY` (chat)
3. Restart the dev server after any change.

## 4. Run locally

```bash
npm run dev
```

Open **http://localhost:3000** (Next.js default; use another port if `3000` is busy, e.g. `npx next dev -p 3001`).

## 5. Production build (optional)

```bash
npm run build
npm run start
```

## 6. Deploy (Vercel)

1. Push the restored project to a Git host (GitHub, GitLab, etc.).
2. In [Vercel](https://vercel.com), **Add New Project** and import the repo.
3. Framework preset: **Next.js** (defaults usually work).
4. Add the same environment variables in **Project → Settings → Environment Variables** (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).
5. Deploy. Vercel will run `npm run build` and serve the app.
