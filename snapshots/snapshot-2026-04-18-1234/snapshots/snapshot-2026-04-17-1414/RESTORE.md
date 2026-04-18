# Restore this snapshot

This folder is a **point-in-time copy** of the app source (no `node_modules`, no `.next`, no `.git`). Use it to recover the project on a new machine or after experiments.

## 1. Copy files

Copy the contents of this snapshot directory into a new folder (or replace an empty project folder), e.g.:

```bash
cp -R /path/to/snapshot-2026-04-17-1414/* /path/to/my-restored-app/
cd /path/to/my-restored-app
```

## 2. Install dependencies

```bash
npm ci
```

(Or `npm install` if you do not need a lockfile-perfect install.)

## 3. Environment variables

- Copy **`.env.example`** to **`.env.local`** (or use **`.env.snapshot`** as a key checklist only — it has **no values**).
- Fill in at least:
  - **`GEMINI_API_KEY`** — image/video generation (Gemini)
  - **`ANTHROPIC_API_KEY`** — chat (Claude)
- Optional overrides are documented in `.env.example`.

Restart the dev server after any env change.

## 4. Run the development server

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:3000`).

## 5. Build (optional)

```bash
npm run build
npm start
```

## 6. Deploy (Vercel)

1. Push the restored project to a Git repository (GitHub, GitLab, etc.).
2. In [Vercel](https://vercel.com), **Add New Project** → import that repo.
3. Framework preset: **Next.js** (default).
4. Add the same environment variables as in `.env.local` under **Project → Settings → Environment Variables** (production/preview as needed).
5. Deploy. No special output directory is required for a standard Next.js app.

---

**Note:** This snapshot does **not** include `node_modules`, `.next`, or `.git`. You must run `npm ci` and configure env before the app runs.
