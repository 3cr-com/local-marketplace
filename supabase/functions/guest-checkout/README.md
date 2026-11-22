# Guest checkout deployment

The public function uses the service role internally and must be deployed with JWT verification disabled. Apply migration `20261122240000_harden_guest_checkout_identity.sql` first, then generate and configure the hashing secret before deployment:

```bash
openssl rand -hex 32
supabase secrets set GUEST_CONTACT_HASH_SECRET=<generated-value> --project-ref iseqbjgtyxxmdltooybu
supabase functions deploy guest-checkout --no-verify-jwt --project-ref iseqbjgtyxxmdltooybu
```

The secret is intentionally not committed to a `.env` file. `SUPABASE_SERVICE_ROLE_KEY` is supplied automatically by Supabase's Edge runtime.

The function creates or reuses a private guest identity based on hashed contact details, rate-limits attempts, and creates the address, stock change, and COD order in one database transaction. Repeating a request with the same checkout key returns the original order instead of creating a duplicate.
