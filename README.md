This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend Architecture

The app now includes a TypeScript backend layer under `src/backend` with:

- Supabase as the primary database client
- A secondary Supabase client for failover
- Redis for cache-aside reads, stampede protection, and lock coordination

Architecture status is exposed at `/api/backend/architecture`.

Environment variables:

- `REDIS_URL`
- `REDIS_KEY_PREFIX`
- `REDIS_DEFAULT_TTL_SECONDS`
- `REDIS_STALE_WHILE_REVALIDATE_SECONDS`
- `REDIS_LOCK_TTL_MS`
- `REDIS_BREAKER_FAILURE_THRESHOLD`
- `REDIS_BREAKER_COOLDOWN_MS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BACKUP_URL`
- `SUPABASE_BACKUP_SERVICE_ROLE_KEY`

Recommended Redis settings:

- `maxmemory-policy allkeys-lru`
- TTL-based cache writes for every cached record
- offline queue disabled in the Redis client

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
