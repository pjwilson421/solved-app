# Restore this snapshot

This folder is a point-in-time copy of the SOLVED Next.js app (source, public assets, and lockfile). It does **not** include `node_modules`, `.next`, or secret environment files.

## 1. Install dependencies

From **this** directory (the snapshot root):

```bash
npm ci
```

Use `npm install` instead of `npm ci` if you do not need an exact lockfile match.

## 2. Environment variables

1. Copy `.env.example` to `.env.local` in the project root (or merge with your existing file).
2. Fill in values for at least:
   - `GEMINI_API_KEY` — image and video API routes (Google AI Studio).
   - `ANTHROPIC_API_KEY` — chat API route (Anthropic).
3. Optional: `GEMINI_IMAGE_MODEL`, or alternate Gemini key names listed in `.env.example`.
4. Restart the dev server after any change to `.env.local`.

See `.env.snapshot` in this folder for a keys-only checklist (no values).

## 3. Run locally

```bash
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:3000`).

Production build (optional):

```bash
npx next build
npm run start
```

## 4. Deploy to Vercel

1. Push the restored project to a Git host (GitHub, GitLab, Bitbucket) or use the Vercel CLI.
2. In the [Vercel dashboard](https://vercel.com/), import the repository and set the **root directory** to this app root (the folder that contains `package.json` and `app/`).
3. Under **Settings → Environment Variables**, add the same variables as in `.env.local` for **Production** (and Preview/Development if needed). Use the names from `.env.example` / `.env.snapshot`.
4. Deploy. Vercel will run `npm install` / build using the detected Next.js settings.

CLI alternative: install [Vercel CLI](https://vercel.com/docs/cli), run `vercel` from the project root, link the project, then `vercel env pull` for local preview envs if desired.
