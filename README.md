# Host Marketplace Application

## Architecture
- Backend: Node.js, Fastify, Drizzle ORM, PostgreSQL
- Customer Frontend: Next.js
- Admin Frontend: Next.js

## Run Locally
**Prerequisites:** Node.js, PostgreSQL

1. Install dependencies in backend, frontend, and admin directories.
2. Set up environment variables based on `.env.example`.
3. Run database migrations: `cd backend && npm run db:migrate`
4. Run the apps using `npm run dev` in each respective directory.

## Deployment
- **Database**: Run migrations using the production migration script: `npm run db:migrate:prod`.
- **Storage**: Production environment requires S3-compatible storage. Set `STORAGE_DRIVER=s3` and configure credentials. Local storage fallback is disabled in production.
- **Payments**: Requires Razorpay keys and webhook secret.
