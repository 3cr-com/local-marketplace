-- A safe pre-checkout quote. The order RPC recalculates the same fee at placement
-- time, so the quote is informative rather than a client-controlled price.
create or replace function public.quote_cod_delivery(
  p_shop_id uuid,
  p_address_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns table (distance_meters integer, delivery_fee_paise integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location extensions.geography;
  v_shop_location extensions.geography;
  v_distance integer;
begin
  if p_address_id is not null then
    if auth.uid() is null then raise exception 'Authentication required for a saved address'; end if;
    select a.location into v_location
    from public.delivery_addresses as a
    where a.id = p_address_id and a.user_id = auth.uid();
    if v_location is null then raise exception 'Choose a saved address with location'; end if;
  elsif p_latitude is not null and p_longitude is not null then
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
      raise exception 'Enter a valid delivery location';
    end if;
    v_location := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  else
    raise exception 'Choose a delivery address with location';
  end if;

  select s.location into v_shop_location
  from public.shops as s
  where s.id = p_shop_id and s.is_active;
  if v_shop_location is null then raise exception 'This shop is unavailable for delivery'; end if;

  v_distance := round(extensions.st_distance(v_shop_location, v_location));
  return query select
    v_distance,
    case
      when v_distance <= 5000 then 1000
      when v_distance <= 10000 then 2000
      else 2000 + ceil((v_distance - 10000)::numeric / 1000) * 500
    end::integer;
end;
$$;

revoke all on function public.quote_cod_delivery(uuid, uuid, double precision, double precision) from public;
grant execute on function public.quote_cod_delivery(uuid, uuid, double precision, double precision) to anon, authenticated;
notify pgrst, 'reload schema';
