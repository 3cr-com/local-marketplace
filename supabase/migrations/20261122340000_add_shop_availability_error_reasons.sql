-- Make a rejected delivery quote actionable for customers and shop owners.
create or replace function public.shop_order_unavailability_reason(p_shop_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_shop public.shops%rowtype; v_local timestamp; v_time time; v_weekday smallint;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found then return 'This shop no longer exists.'; end if;
  if not v_shop.is_active then return 'This shop is currently inactive. The seller must make it active before accepting orders.'; end if;
  if not public.is_seller_access_active(v_shop.owner_id) then return 'This seller is currently inactive. Please choose another shop.'; end if;
  if v_shop.temporarily_closed then return 'This shop is temporarily closed to new orders.'; end if;
  v_local := now() at time zone v_shop.timezone;
  v_time := v_local::time;
  v_weekday := extract(isodow from v_local)::smallint;
  if v_weekday = any(v_shop.closed_weekdays) then return 'This shop is closed today.'; end if;
  if v_shop.opens_at = v_shop.closes_at then return null; end if;
  if v_shop.opens_at < v_shop.closes_at and not (v_time >= v_shop.opens_at and v_time < v_shop.closes_at) then
    return format('This shop is closed right now. Ordering hours are %s to %s (%s).', to_char(v_shop.opens_at, 'HH24:MI'), to_char(v_shop.closes_at, 'HH24:MI'), v_shop.timezone);
  end if;
  if v_shop.opens_at > v_shop.closes_at and not (v_time >= v_shop.opens_at or v_time < v_shop.closes_at) then
    return format('This shop is closed right now. Ordering hours are %s to %s (%s).', to_char(v_shop.opens_at, 'HH24:MI'), to_char(v_shop.closes_at, 'HH24:MI'), v_shop.timezone);
  end if;
  return null;
end;
$$;
revoke all on function public.shop_order_unavailability_reason(uuid) from public;
grant execute on function public.shop_order_unavailability_reason(uuid) to anon, authenticated, service_role;

create or replace function public.shop_accepting_orders(p_shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.shop_order_unavailability_reason(p_shop_id) is null;
$$;

create or replace function public.prevent_orders_for_unavailable_shop()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_reason text;
begin
  v_reason := public.shop_order_unavailability_reason(new.shop_id);
  if v_reason is not null then raise exception '%', v_reason; end if;
  return new;
end;
$$;

create or replace function public.quote_cod_delivery(p_shop_id uuid, p_address_id uuid default null, p_latitude double precision default null, p_longitude double precision default null)
returns table (distance_meters integer, delivery_fee_paise integer)
language plpgsql security definer set search_path = '' as $$
declare v_location extensions.geography; v_shop_location extensions.geography; v_distance integer; v_reason text;
begin
  if p_address_id is not null then
    if auth.uid() is null then raise exception 'Authentication required for a saved address'; end if;
    select a.location into v_location from public.delivery_addresses a where a.id = p_address_id and a.user_id = auth.uid();
    if v_location is null then raise exception 'Choose a saved address with location'; end if;
  elsif p_latitude is not null and p_longitude is not null then
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Enter a valid delivery location'; end if;
    v_location := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  else raise exception 'Choose a delivery address with location'; end if;
  select location into v_shop_location from public.shops where id = p_shop_id;
  if v_shop_location is null then raise exception 'This shop is unavailable for delivery because its pickup location is missing.'; end if;
  v_reason := public.shop_order_unavailability_reason(p_shop_id);
  if v_reason is not null then raise exception '%', v_reason; end if;
  v_distance := round(extensions.st_distance(v_shop_location, v_location));
  return query select v_distance, case when v_distance <= 5000 then 1000 when v_distance <= 10000 then 2000 else 2000 + ceil((v_distance - 10000)::numeric / 1000) * 500 end::integer;
end;
$$;

notify pgrst, 'reload schema';
