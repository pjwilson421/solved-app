# Restore this snapshot

## Prerequisites

- Node.js (version compatible with `package.json` / Next.js in this tree)
- npm (lockfile: `package-lock.json`)

## Setup

```bash
cd /path/to/snapshot-2026-04-18-1049
npm install
```

## Environment variables

1. Copy `.env.snapshot` to `.env.local` (or merge keys into `.env.local`).
2. Fill in values for each key (see comments in `.env.snapshot` and `/.env.example` in this tree).
3. **Do not commit** `.env.local` with real secrets.

## Run locally

```bash
npm run dev
```

The app runs at **http://localhost:3000** (Next.js default), unless `PORT` is set.

## Deploy (Vercel)

1. Push this repo (or import the project) to [Vercel](https://vercel.com).
2. In the Vercel project **Settings → Environment Variables**, add the same keys as `.env.snapshot` (production/preview as needed).
3. Connect the Git branch and deploy; build command is typically `npm run build` and output `.next` (Next.js preset).

## Notes

- This snapshot **excludes** `node_modules`, `.next`, `.env.local`, and common build/cache dirs; run `npm install` after copy.
- Root `.env.local` was not copied into the snapshot for safety; use `.env.snapshot` as a template.
