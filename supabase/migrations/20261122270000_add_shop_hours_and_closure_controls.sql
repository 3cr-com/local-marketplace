-- Pilot shops use a single local daily opening window. A matching close time means
-- 24-hour service; overnight windows are supported.
alter table public.shops
  add column if not exists opens_at time not null default '09:00',
  add column if not exists closes_at time not null default '21:00',
  add column if not exists closed_weekdays smallint[] not null default '{}',
  add column if not exists temporarily_closed boolean not null default false,
  add column if not exists timezone text not null default 'Asia/Kolkata';

create or replace function public.shop_accepting_orders(p_shop_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_shop public.shops%rowtype; v_local timestamp; v_time time; v_weekday smallint;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found or not v_shop.is_active or not public.is_seller_access_active(v_shop.owner_id) or v_shop.temporarily_closed then return false; end if;
  v_local := now() at time zone v_shop.timezone;
  v_time := v_local::time;
  v_weekday := extract(isodow from v_local)::smallint;
  if v_weekday = any(v_shop.closed_weekdays) then return false; end if;
  if v_shop.opens_at = v_shop.closes_at then return true; end if;
  if v_shop.opens_at < v_shop.closes_at then return v_time >= v_shop.opens_at and v_time < v_shop.closes_at; end if;
  return v_time >= v_shop.opens_at or v_time < v_shop.closes_at;
end;
$$;
revoke all on function public.shop_accepting_orders(uuid) from public;
grant execute on function public.shop_accepting_orders(uuid) to anon, authenticated, service_role;

create or replace function public.update_self_service_shop_hours(p_shop_id uuid, p_opens_at time, p_closes_at time, p_closed_weekdays smallint[], p_temporarily_closed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  if not public.is_seller_access_active(auth.uid()) then raise exception 'Seller access is inactive. Contact platform support.'; end if;
  if exists (select 1 from unnest(coalesce(p_closed_weekdays, '{}')) as day where day < 1 or day > 7) then raise exception 'Invalid closed day'; end if;
  update public.shops set opens_at = coalesce(p_opens_at, opens_at), closes_at = coalesce(p_closes_at, closes_at), closed_weekdays = coalesce(p_closed_weekdays, '{}'), temporarily_closed = coalesce(p_temporarily_closed, false), updated_at = now() where id = p_shop_id;
end;
$$;
revoke all on function public.update_self_service_shop_hours(uuid, time, time, smallint[], boolean) from public;
grant execute on function public.update_self_service_shop_hours(uuid, time, time, smallint[], boolean) to authenticated;

create or replace function public.prevent_orders_for_unavailable_shop()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.shop_accepting_orders(new.shop_id) then
    raise exception 'This shop is currently closed or unavailable for delivery';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_require_available_shop on public.orders;
create trigger orders_require_available_shop before insert on public.orders for each row execute function public.prevent_orders_for_unavailable_shop();

create or replace function public.quote_cod_delivery(p_shop_id uuid, p_address_id uuid default null, p_latitude double precision default null, p_longitude double precision default null)
returns table (distance_meters integer, delivery_fee_paise integer)
language plpgsql security definer set search_path = '' as $$
declare v_location extensions.geography; v_shop_location extensions.geography; v_distance integer;
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
  if v_shop_location is null then raise exception 'This shop is unavailable for delivery'; end if;
  if not public.shop_accepting_orders(p_shop_id) then raise exception 'This shop is currently closed or unavailable for delivery'; end if;
  v_distance := round(extensions.st_distance(v_shop_location, v_location));
  return query select v_distance, case when v_distance <= 5000 then 1000 when v_distance <= 10000 then 2000 else 2000 + ceil((v_distance - 10000)::numeric / 1000) * 500 end::integer;
end;
$$;

notify pgrst, 'reload schema';
