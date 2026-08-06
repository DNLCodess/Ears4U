This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Frontend

This is the EARS FOR YOU user app: sign-in/register/verify/forgot-password/recovery under `app/(auth)`, and home/insights/checkin/chat/journal/notifications/you under `app/(app)`, with shared primitives in `components/ui`.

**Required env**

- `API_URL`: base URL of the backend API (set in `.env.local`, for example `https://earsforyou-2.onrender.com`). Nothing in the browser ever talks to it directly; see the proxy note below.

**Scripts**

- `npm run dev`: start the dev server at `http://localhost:3000`
- `npm test`: run the Vitest unit suite
- `npm run lint`: run ESLint

**Proxy architecture**

All API calls go through `/backend/*` on this app's own origin, which keeps the browser same-origin and sidesteps the backend's CORS setup. Auth routes (`/backend/api/v1/auth/*`) are handled by a dedicated route handler in `app/backend/api/v1/auth/[...path]/route.ts` that forwards cookies explicitly for the refresh flow, while every other path falls back to a plain Next.js rewrite straight through to `API_URL` (see `next.config.ts`).

For the full design and behavior spec, see `docs/superpowers/specs/2026-08-06-earsforyou-user-app-design.md`. For known backend quirks and requests to the backend team, see `docs/BACKEND-NOTES.md`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
