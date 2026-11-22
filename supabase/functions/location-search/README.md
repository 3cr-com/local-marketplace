# Address search deployment

Apply migration `20261122360000_add_location_search_cache.sql`, then deploy the Edge Function:

```bash
supabase functions deploy location-search --no-verify-jwt --project-ref iseqbjgtyxxmdltooybu
```

Shop searches require an active signed-in seller. Delivery-address searches support signed-in and guest checkout, and are only made after the user presses **Search and choose address**. Results are cached for 30 days. Do not add typing autocomplete requests; public Nominatim limits apply.
