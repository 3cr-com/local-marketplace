-- NTN-BZR-5: public customer shopfronts, global search, and profile/shop images.
alter table public.profiles add column if not exists avatar_url text;
alter table public.shops add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketplace-images', 'marketplace-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "public reads marketplace images" on storage.objects;
drop policy if exists "users upload marketplace images" on storage.objects;
drop policy if exists "users update marketplace images" on storage.objects;
drop policy if exists "users remove marketplace images" on storage.objects;
create policy "public reads marketplace images" on storage.objects for select using (bucket_id = 'marketplace-images');
create policy "users upload marketplace images" on storage.objects for insert to authenticated with check (bucket_id = 'marketplace-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update marketplace images" on storage.objects for update to authenticated using (bucket_id = 'marketplace-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'marketplace-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users remove marketplace images" on storage.objects for delete to authenticated using (bucket_id = 'marketplace-images' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.update_my_avatar(p_avatar_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''), updated_at = now() where id = auth.uid();
end;
$$;
revoke all on function public.update_my_avatar(text) from public;
grant execute on function public.update_my_avatar(text) to authenticated;

create or replace function public.update_shop_public_image(p_shop_id uuid, p_image_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found'; end if;
  update public.shops set image_url = nullif(trim(coalesce(p_image_url, '')), ''), updated_at = now() where id = p_shop_id;
end;
$$;
revoke all on function public.update_shop_public_image(uuid, text) from public;
grant execute on function public.update_shop_public_image(uuid, text) to authenticated;

create or replace function public.search_marketplace(p_query text, p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_products jsonb;
  v_shops jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into v_products from (
    select p.id, p.name, p.description, p.category, p.price_paise, p.stock, p.image_url,
      s.id as shop_id, s.name as shop_name
    from public.products p
    join public.shops s on s.id = p.shop_id
    join public.profiles owner on owner.id = s.owner_id
    where p.is_active and p.stock > 0 and s.is_active and coalesce(s.temporarily_closed, false) = false
      and owner.seller_enabled and coalesce(owner.seller_access_active, true)
      and (v_query = '' or p.name ilike '%' || v_query || '%' or p.category ilike '%' || v_query || '%' or s.name ilike '%' || v_query || '%')
    order by case when lower(p.name) = lower(v_query) then 0 else 1 end, p.created_at desc
    limit v_limit
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into v_shops from (
    select s.id, s.name, s.category, s.address, s.city, s.state, s.pincode, s.image_url,
      owner.full_name as owner_name, owner.avatar_url as owner_avatar_url
    from public.shops s
    join public.profiles owner on owner.id = s.owner_id
    where s.is_active and coalesce(s.temporarily_closed, false) = false
      and owner.seller_enabled and coalesce(owner.seller_access_active, true)
      and (v_query = '' or s.name ilike '%' || v_query || '%' or s.category ilike '%' || v_query || '%' or s.address ilike '%' || v_query || '%')
    order by case when lower(s.name) = lower(v_query) then 0 else 1 end, s.name
    limit v_limit
  ) row_data;

  return jsonb_build_object('products', v_products, 'shops', v_shops);
end;
$$;
revoke all on function public.search_marketplace(text, integer) from public;
grant execute on function public.search_marketplace(text, integer) to anon, authenticated;

create or replace function public.get_public_shopfront(p_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_shop jsonb;
  v_products jsonb;
begin
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'description', s.description, 'category', s.category,
    'address', s.address, 'city', s.city, 'state', s.state, 'pincode', s.pincode,
    'image_url', s.image_url, 'opens_at', s.opens_at, 'closes_at', s.closes_at,
    'closed_weekdays', s.closed_weekdays, 'temporarily_closed', s.temporarily_closed,
    'timezone', s.timezone, 'owner_name', owner.full_name, 'owner_avatar_url', owner.avatar_url,
    'categories', coalesce((select jsonb_agg(category_row.name order by category_row.name) from (
      select distinct c.name from public.shop_categories sc join public.categories c on c.id = sc.category_id where sc.shop_id = s.id
    ) category_row), '[]'::jsonb)
  ) into v_shop
  from public.shops s
  join public.profiles owner on owner.id = s.owner_id
  where s.id = p_shop_id and s.is_active and coalesce(s.temporarily_closed, false) = false
    and owner.seller_enabled and coalesce(owner.seller_access_active, true);
  if v_shop is null then return null; end if;

  select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into v_products from (
    select p.id, p.name, p.description, p.category, p.price_paise, p.stock, p.image_url
    from public.products p where p.shop_id = p_shop_id and p.is_active and p.stock > 0
    order by p.created_at desc
  ) row_data;
  return jsonb_build_object('shop', v_shop, 'products', v_products);
end;
$$;
revoke all on function public.get_public_shopfront(uuid) from public;
grant execute on function public.get_public_shopfront(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
