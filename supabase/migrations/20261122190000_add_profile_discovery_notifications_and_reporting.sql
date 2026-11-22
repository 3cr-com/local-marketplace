-- Final marketplace foundation: profile preferences, editable addresses, storage, discovery,
-- notifications, and protected reporting views.
alter table public.profiles add column if not exists phone text, add column if not exists preferred_latitude double precision, add column if not exists preferred_longitude double precision;

create or replace function public.update_my_profile(p_full_name text, p_phone text, p_latitude double precision default null, p_longitude double precision default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set full_name = trim(coalesce(p_full_name,'')), phone = nullif(trim(coalesce(p_phone,'')),''), preferred_latitude = p_latitude, preferred_longitude = p_longitude, updated_at = now() where id = auth.uid();
end; $$;
grant execute on function public.update_my_profile(text,text,double precision,double precision) to authenticated;

create or replace function public.update_delivery_address(p_address_id uuid, p_label text, p_recipient_name text, p_phone text, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text, p_pincode text, p_latitude double precision, p_longitude double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.delivery_addresses where id = p_address_id and user_id = auth.uid()) then raise exception 'Address not found'; end if;
  if coalesce(length(trim(p_address_line_1)),0) < 3 or coalesce(length(trim(p_city)),0) < 2 or coalesce(length(trim(p_state)),0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid delivery address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to save this address'; end if;
  update public.delivery_addresses set label=trim(p_label),recipient_name=trim(p_recipient_name),phone=trim(p_phone),address_line_1=trim(p_address_line_1),address_line_2=nullif(trim(p_address_line_2),''),locality=nullif(trim(p_locality),''),landmark=nullif(trim(p_landmark),''),city=trim(p_city),district=nullif(trim(p_district),''),state=trim(p_state),country=coalesce(nullif(trim(p_country),''),'India'),pincode=trim(p_pincode),location=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography where id=p_address_id;
end; $$;
grant execute on function public.update_delivery_address(uuid,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public reads product images" on storage.objects;
drop policy if exists "sellers upload product images" on storage.objects;
drop policy if exists "sellers change product images" on storage.objects;
drop policy if exists "sellers remove product images" on storage.objects;
create policy "public reads product images" on storage.objects for select using (bucket_id='product-images');
create policy "sellers upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "sellers change product images" on storage.objects for update to authenticated using (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "sellers remove product images" on storage.objects for delete to authenticated using (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text);

create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, body text not null, href text, read_at timestamptz, created_at timestamptz not null default now());
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "users see own notifications" on public.notifications;
create policy "users see own notifications" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "users read own notifications" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create or replace function public.notify_order_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; begin
  if tg_op='UPDATE' and new.status is distinct from old.status then
    select owner_id into v_owner from public.shops where id=new.shop_id;
    insert into public.notifications(user_id,title,body,href) values (new.customer_id,'Order update','Your order is now ' || replace(new.status,'_',' ') || '.','/orders/');
    if v_owner is not null then insert into public.notifications(user_id,title,body,href) values (v_owner,'Order status updated','Order #' || left(new.id::text,8) || ' is now ' || replace(new.status,'_',' ') || '.','/seller/orders/'); end if;
  end if; return new; end; $$;
drop trigger if exists order_status_notification on public.orders;
create trigger order_status_notification after update of status on public.orders for each row execute function public.notify_order_status();

create or replace function public.nearby_catalog(p_latitude double precision, p_longitude double precision, p_radius_meters integer default 10000, p_query text default '')
returns table(id uuid,name text,description text,category text,price_paise integer,stock integer,image_url text,shop_id uuid,shop_name text,distance_meters integer) language sql stable security invoker set search_path='' as $$
  select p.id,p.name,p.description,p.category,p.price_paise,p.stock,p.image_url,s.id,s.name,round(extensions.st_distance(s.location,extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography))::integer
  from public.products p join public.shops s on s.id=p.shop_id
  where p.is_active and p.stock>0 and s.is_active and s.location is not null and extensions.st_dwithin(s.location,extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,least(greatest(p_radius_meters,1),100000)) and (coalesce(trim(p_query),'')='' or p.name ilike '%'||trim(p_query)||'%' or p.category ilike '%'||trim(p_query)||'%' or s.name ilike '%'||trim(p_query)||'%')
  order by 10,p.created_at desc;
$$;
grant execute on function public.nearby_catalog(double precision,double precision,integer,text) to anon,authenticated;

drop policy if exists "admins view shops" on public.shops;
drop policy if exists "admins view products" on public.products;
drop policy if exists "admins view orders" on public.orders;
drop policy if exists "admins view order items" on public.order_items;
create policy "admins view shops" on public.shops for select to authenticated using ((select public.is_admin()));
create policy "admins view products" on public.products for select to authenticated using ((select public.is_admin()));
create policy "admins view orders" on public.orders for select to authenticated using ((select public.is_admin()));
create policy "admins view order items" on public.order_items for select to authenticated using ((select public.is_admin()));

-- Invoked only by the service-role Edge Function. Keeps the address, stock change,
-- order and order items in one PostgreSQL transaction for guest checkout.
create or replace function public.create_guest_delivery_address_and_order(p_customer_id uuid, p_shop_id uuid, p_items jsonb, p_label text, p_recipient_name text, p_phone text, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text, p_pincode text, p_latitude double precision, p_longitude double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_address_id uuid := gen_random_uuid(); v_order_id uuid := gen_random_uuid(); v_subtotal integer:=0; v_fee integer; v_distance integer; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_shop public.shops%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if p_latitude is null or p_longitude is null or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete delivery address with location'; end if;
  select * into v_shop from public.shops where id=p_shop_id and is_active; if not found or v_shop.location is null then raise exception 'Shop is unavailable for delivery'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart cannot be empty'; end if;
  v_distance:=round(extensions.st_distance(v_shop.location,extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography)); v_fee:=case when v_distance<=5000 then 1000 when v_distance<=10000 then 2000 else 2000+ceil((v_distance-10000)::numeric/1000)*500 end;
  for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::integer; if v_qty is null or v_qty<1 then raise exception 'Invalid item quantity'; end if; select * into v_product from public.products where id=(v_item->>'product_id')::uuid and shop_id=p_shop_id and is_active for update; if not found or v_product.stock<v_qty then raise exception 'Product is unavailable'; end if; v_subtotal:=v_subtotal+v_product.price_paise*v_qty; end loop;
  insert into public.delivery_addresses(id,user_id,label,recipient_name,phone,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,location,is_default) values(v_address_id,p_customer_id,trim(p_label),trim(p_recipient_name),trim(p_phone),trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),nullif(trim(p_landmark),''),trim(p_city),nullif(trim(p_district),''),trim(p_state),coalesce(nullif(trim(p_country),''),'India'),trim(p_pincode),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,true);
  insert into public.orders(id,customer_id,shop_id,delivery_address,total_paise,subtotal_paise,delivery_fee_paise,delivery_distance_meters,delivery_address_id,delivery_address_snapshot,payment_method,payment_status,delivery_mode) values(v_order_id,p_customer_id,p_shop_id,concat_ws(', ',p_address_line_1,p_address_line_2,p_locality,p_city,p_state,p_pincode),v_subtotal+v_fee,v_subtotal,v_fee,v_distance,v_address_id,(select to_jsonb(a) from public.delivery_addresses a where a.id=v_address_id),'cod','unpaid','vendor_delivery');
  for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::integer; select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update; update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id; insert into public.order_items(order_id,product_id,quantity,unit_price_paise) values(v_order_id,v_product.id,v_qty,v_product.price_paise); end loop;
  insert into public.order_status_history(order_id,status,actor_id) values(v_order_id,'placed',p_customer_id); return v_order_id;
end; $$;
revoke all on function public.create_guest_delivery_address_and_order(uuid,uuid,jsonb,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision) from public;
grant execute on function public.create_guest_delivery_address_and_order(uuid,uuid,jsonb,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision) to service_role;
notify pgrst,'reload schema';
