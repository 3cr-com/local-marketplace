# Guest checkout deployment

Deploy after applying migration `20261122190000_add_profile_discovery_notifications_and_reporting.sql`:

```sh
supabase functions deploy guest-checkout --no-verify-jwt
```

The function uses `SUPABASE_SERVICE_ROLE_KEY`, supplied automatically by the Supabase Edge runtime. It creates a guest customer, delivery address, and COD order through one database transaction. If that transaction fails, it compensates by deleting the newly-created Auth user.

Before enabling this publicly, configure an abuse-control layer (Turnstile or equivalent) at the caller. The function intentionally never exposes the service-role key to the browser.
