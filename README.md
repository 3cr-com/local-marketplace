# 3cr marketplace

An Astro + React hyperlocal marketplace experience for 3cr.com. The repository includes the interactive storefront, vendor/admin workspace views, Supabase authentication hooks, database migrations, and product/security documentation.

## Run locally

Use Node.js 20.19+ (or 22.12+) and pnpm:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open the address printed by Astro (normally `http://localhost:4321`). The catalogue UI works without Supabase credentials; authentication requires the public environment variables shown in `.env.example`.

## Database

Apply the SQL migrations in `supabase/migrations/` to the intended Supabase project before enabling real accounts or orders. Read [docs/marketplace-design.md](docs/marketplace-design.md) and [docs/mvp-remaining-work.md](docs/mvp-remaining-work.md) before production use—payments and checkout intentionally remain guarded until a real provider workflow is implemented.

## Commands

```bash
pnpm dev
pnpm build
pnpm preview
```
