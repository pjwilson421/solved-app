# Restore this snapshot

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

- Copy `.env.example` to `.env.local` (or use `.env.snapshot` in this folder as a key checklist).
- Add your API keys. Restart the dev server after any change.

Required for full functionality:

- `GEMINI_API_KEY` — image and video generation
- `ANTHROPIC_API_KEY` — chat

## 3. Run locally

```bash
npm run dev
```

Open **http://localhost:3000** (default Next.js port).

## 4. Deploy to Vercel

1. Push this project to a Git host (GitHub, GitLab, etc.) if it is not already there.
2. In [Vercel](https://vercel.com), import the repository.
3. Add the same environment variables in the project **Settings → Environment Variables** (Production / Preview as needed).
4. Deploy. Vercel will run the build from `package.json` automatically.
