# Database migration workflow

Supabase migrations are an ordered change history. Do not execute migration files manually or in an arbitrary order.

## Normal workflow

1. Create a new timestamped file in `supabase/migrations/` for every schema, RLS, RPC, or data change.
2. Review pending and remote migration state:

   ```bash
   supabase migration list
   ```

3. Apply only pending migrations, in version order:

   ```bash
   supabase db push
   ```

4. Verify the feature and migration result before opening or approving its pull request.

The Supabase migration ledger records applied versions. `supabase db push` uses that ledger, so already-applied migrations are skipped.

## If a migration was run manually

Do not run it again and do not guess its status. First verify that the database schema/function/policy matches the file. Only then reconcile the ledger:

```bash
supabase migration repair --status applied <migration-version>
```

Use the numeric filename prefix as `<migration-version>`, for example `20261122230000`.

## Rules

- Never edit, rename, or delete an applied migration.
- Create a new migration to correct an earlier one.
- Prefer idempotent SQL (`if exists`, `if not exists`, `create or replace`) for safer recovery, but do not use that as a reason to bypass the migration ledger.
- Production migrations must be run from a reviewed pull request branch, never as random dashboard SQL.
