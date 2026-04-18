# Restore this snapshot

This folder is a **point-in-time copy** of the app source (no `node_modules`, no `.next`).

## 1. Restore files into a clean project

From your machine:

- Copy the contents of this snapshot into an empty folder (or replace an existing project tree), **or**
- Work directly from the repo where this folder lives under `snapshots/snapshot-2026-04-18-0921/` and copy paths as needed.

## 2. Install dependencies

```bash
npm install
```

## 3. Environment variables

1. In the **project root** (parent of `app/`), create `.env.local`.
2. Use `.env.example` (included in this snapshot) and/or `.env.snapshot` (keys-only template in this folder) as a guide.
3. Set at minimum:
   - `GEMINI_API_KEY` — Google AI Studio / Gemini (image and video generation).
   - `ANTHROPIC_API_KEY` — Anthropic (chat).
4. Optional alternates for image routes: `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_AI_API_KEY`; optional `GEMINI_IMAGE_MODEL`.
5. Save the file and **restart** the dev server after any change.

**Never commit** `.env.local` or real secrets to git.

## 4. Run locally

```bash
npm run dev
```

Then open the URL shown in the terminal (default `http://localhost:3000`).

## 5. Production build (optional)

```bash
npm run build
npm start
```

## 6. Deploy (Vercel)

1. Push the restored project to a Git host (GitHub, GitLab, etc.).
2. In [Vercel](https://vercel.com), **Import** the repository.
3. Framework preset: **Next.js** (default).
4. Add the same environment variables in **Project → Settings → Environment Variables** (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).
5. Deploy. Redeploy after changing env vars.

Remote git URLs are not modified by this snapshot; configure remotes in your repo as usual.
