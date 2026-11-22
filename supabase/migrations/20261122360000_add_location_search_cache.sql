-- Cache explicit seller-initiated geocoding searches. No address search is
-- triggered automatically while typing.
create table if not exists public.location_search_cache (
  normalized_query text primary key,
  results jsonb not null,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
alter table public.location_search_cache enable row level security;
notify pgrst, 'reload schema';
