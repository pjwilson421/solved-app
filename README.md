This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Hosted app: https://solved-app.vercel.app

## Access control

Every page and `/api` route requires a signed-in session. The gate is `proxy.ts` (Next.js 16 renamed Middleware to Proxy). It allows only:

- `/login`
- `POST /api/auth/login` and `POST /api/auth/logout`
- static assets (`/_next/static`, `/_next/image`, `favicon.ico`, and public images)

Unauthenticated API calls return **401**. Paid routes (Claude chat, Gemini image, Veo video) also check the session inside the handler. If the password or session secret is missing, the app fails closed with **503** and does not serve those routes.

Sign-in uses one shared password. Ten failed attempts from the same IP lock that address out for 15 minutes. A successful sign-in sets an HttpOnly, SameSite=Lax cookie named `solved_session` for 12 hours (`Secure` on HTTPS). This follows the SOLVED Studio login (`solved-studio` branch: `middleware.js`, `lib/session.js`).

### Required environment variables

Set these in the **Vercel project before merging**. Do not commit real values. Copy `.env.example` to `.env.local` for local development.

| Name | Purpose |
| --- | --- |
| `STUDIO_PASSWORD` | Shared password. Same name as SOLVED Studio. |
| `STUDIO_SESSION_SECRET` | HMAC secret for the session cookie. Use a long random value. |

`ANTHROPIC_API_KEY` and `GEMINI_API_KEY` are still required for chat, image, and video. Rotating `STUDIO_SESSION_SECRET` signs everyone out.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
