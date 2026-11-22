# Seller address search deployment

Apply migration `20261122360000_add_location_search_cache.sql`, then deploy the authenticated Edge Function:

```bash
supabase functions deploy location-search --project-ref iseqbjgtyxxmdltooybu
```

The function queries Nominatim only after a seller presses **Search actual shop address**. Results are cached for 30 days. Do not add autocomplete requests; public Nominatim limits apply.
