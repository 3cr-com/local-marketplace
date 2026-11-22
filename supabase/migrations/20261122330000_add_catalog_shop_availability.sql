-- Keep catalogue availability consistent with the checkout gate. The browser
-- receives the database decision rather than recalculating shop hours itself.
create or replace function public.catalog_shop_availability(p_shop_ids uuid[])
returns table (shop_id uuid, accepting_orders boolean)
language sql stable security definer set search_path = '' as $$
  select requested.id, public.shop_accepting_orders(requested.id)
  from unnest(coalesce(p_shop_ids, '{}'::uuid[])) as requested(id);
$$;
revoke all on function public.catalog_shop_availability(uuid[]) from public;
grant execute on function public.catalog_shop_availability(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
