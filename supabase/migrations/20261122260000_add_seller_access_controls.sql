-- Seller approval and seller access are different states. Approval grants selling
-- capability; access can be suspended later without erasing seller data.
alter table public.profiles add column if not exists seller_access_active boolean not null default true;

create or replace function public.is_seller_access_active(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user_id and seller_enabled and seller_access_active);
$$;
revoke all on function public.is_seller_access_active(uuid) from public;
grant execute on function public.is_seller_access_active(uuid) to anon, authenticated;

create or replace function public.set_seller_access_status(p_user_id uuid, p_is_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and seller_enabled) then raise exception 'Seller account not found'; end if;
  update public.profiles set seller_access_active = p_is_active, updated_at = now() where id = p_user_id;
  if not p_is_active then update public.shops set is_active = false, updated_at = now() where owner_id = p_user_id; end if;
end;
$$;
revoke all on function public.set_seller_access_status(uuid, boolean) from public;
grant execute on function public.set_seller_access_status(uuid, boolean) to authenticated;

drop policy if exists "approved shops are public" on public.shops;
create policy "approved active shops are public" on public.shops for select to anon, authenticated using ((is_active and public.is_seller_access_active(owner_id)) or (select auth.uid()) = owner_id);
drop policy if exists "shop owners update own shop" on public.shops;
create policy "active sellers update own shops" on public.shops for update to authenticated using ((select auth.uid()) = owner_id and public.is_seller_access_active(owner_id)) with check ((select auth.uid()) = owner_id and public.is_seller_access_active(owner_id));

drop policy if exists "public sees active products" on public.products;
create policy "public sees active seller products" on public.products for select to anon, authenticated using (is_active and exists (select 1 from public.shops s where s.id = shop_id and s.is_active and public.is_seller_access_active(s.owner_id)));
drop policy if exists "shop owners add products" on public.products;
create policy "active sellers add products" on public.products for insert to authenticated with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()) and public.is_seller_access_active(s.owner_id)));
drop policy if exists "shop owners update products" on public.products;
create policy "active sellers update products" on public.products for update to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()) and public.is_seller_access_active(s.owner_id))) with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()) and public.is_seller_access_active(s.owner_id)));
drop policy if exists "shop owners delete products" on public.products;
create policy "active sellers delete products" on public.products for delete to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()) and public.is_seller_access_active(s.owner_id)));

create or replace function public.update_self_service_shop(p_shop_id uuid, p_name text, p_category_ids uuid[], p_is_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_primary uuid; v_category_name text;
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  if not public.is_seller_access_active(auth.uid()) then raise exception 'Seller access is inactive. Contact platform support.'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'Enter a shop name'; end if;
  if coalesce(array_length(p_category_ids, 1), 0) < 1 then raise exception 'Choose at least one category'; end if;
  select id, name into v_primary, v_category_name from public.categories where id = p_category_ids[1] and is_active;
  if v_primary is null or (select count(*) from public.categories where id = any(p_category_ids) and is_active) <> array_length(p_category_ids, 1) then raise exception 'One or more categories are not available'; end if;
  update public.shops set name = trim(p_name), category = v_category_name, primary_category_id = v_primary, is_active = p_is_active where id = p_shop_id;
  delete from public.shop_categories where shop_id = p_shop_id;
  insert into public.shop_categories(shop_id, category_id) select p_shop_id, unnest(p_category_ids);
end; $$;

create or replace function public.update_self_service_shop_address(p_shop_id uuid, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text, p_pincode text, p_latitude double precision, p_longitude double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  if not public.is_seller_access_active(auth.uid()) then raise exception 'Seller access is inactive. Contact platform support.'; end if;
  if coalesce(length(trim(p_address_line_1)),0) < 3 or coalesce(length(trim(p_city)),0) < 2 or coalesce(length(trim(p_state)),0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid pickup address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to set the pickup point'; end if;
  update public.shops set address = concat_ws(', ',trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),trim(p_city),trim(p_state),trim(p_pincode)), address_line_1 = trim(p_address_line_1), address_line_2 = nullif(trim(p_address_line_2),''), locality = nullif(trim(p_locality),''), landmark = nullif(trim(p_landmark),''), city = trim(p_city), district = nullif(trim(p_district),''), state = trim(p_state), country = coalesce(nullif(trim(p_country),''),'India'), pincode = trim(p_pincode), location = extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography where id = p_shop_id;
end; $$;

create or replace function public.create_self_service_shop(p_name text, p_category text, p_category_id uuid, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text, p_pincode text, p_latitude double precision, p_longitude double precision)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_shop_id uuid; v_address text;
begin
  if not public.is_seller_access_active(auth.uid()) then raise exception 'Enable an active seller account before creating a shop'; end if;
  if coalesce(length(trim(p_name)),0) < 2 or p_category_id is null or coalesce(length(trim(p_address_line_1)),0) < 3 or coalesce(length(trim(p_city)),0) < 2 or coalesce(length(trim(p_state)),0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid shop address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to set the pickup point'; end if;
  v_address := concat_ws(', ', trim(p_address_line_1), nullif(trim(p_address_line_2),''), nullif(trim(p_locality),''), trim(p_city), trim(p_state), trim(p_pincode));
  insert into public.shops (owner_id,name,category,primary_category_id,address,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,location,is_active)
  values (auth.uid(),trim(p_name),trim(p_category),p_category_id,v_address,trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),nullif(trim(p_landmark),''),trim(p_city),nullif(trim(p_district),''),trim(p_state),coalesce(nullif(trim(p_country),''),'India'),trim(p_pincode),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,true)
  returning id into v_shop_id;
  return v_shop_id;
end; $$;

notify pgrst, 'reload schema';
