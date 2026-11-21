-- Structured pickup addresses and a safe authenticated API for delivery addresses.
alter table public.shops
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists locality text,
  add column if not exists landmark text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists state text,
  add column if not exists country text not null default 'India',
  add column if not exists pincode text;

create or replace function public.create_delivery_address(
  p_label text, p_recipient_name text, p_phone text, p_address_line_1 text, p_address_line_2 text,
  p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text,
  p_pincode text, p_latitude double precision, p_longitude double precision
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(length(trim(p_address_line_1)), 0) < 3 or coalesce(length(trim(p_city)), 0) < 2 or coalesce(length(trim(p_state)), 0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid delivery address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to save this address'; end if;
  insert into public.delivery_addresses (user_id,label,recipient_name,phone,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,location)
  values (auth.uid(),trim(p_label),trim(p_recipient_name),trim(p_phone),trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),nullif(trim(p_landmark),''),trim(p_city),nullif(trim(p_district),''),trim(p_state),coalesce(nullif(trim(p_country),''),'India'),trim(p_pincode),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.create_self_service_shop(
  p_name text, p_category text, p_category_id uuid, p_address_line_1 text, p_address_line_2 text,
  p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text,
  p_pincode text, p_latitude double precision, p_longitude double precision
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_shop_id uuid; v_address text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer' and seller_enabled) then raise exception 'Enable seller mode before creating a shop'; end if;
  if coalesce(length(trim(p_name)),0) < 2 or p_category_id is null or coalesce(length(trim(p_address_line_1)),0) < 3 or coalesce(length(trim(p_city)),0) < 2 or coalesce(length(trim(p_state)),0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid shop address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to set the pickup point'; end if;
  v_address := concat_ws(', ', trim(p_address_line_1), nullif(trim(p_address_line_2),''), nullif(trim(p_locality),''), trim(p_city), trim(p_state), trim(p_pincode));
  insert into public.shops (owner_id,name,category,primary_category_id,address,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,location,is_active)
  values (auth.uid(),trim(p_name),trim(p_category),p_category_id,v_address,trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),nullif(trim(p_landmark),''),trim(p_city),nullif(trim(p_district),''),trim(p_state),coalesce(nullif(trim(p_country),''),'India'),trim(p_pincode),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,true)
  returning id into v_shop_id;
  return v_shop_id;
end; $$;

revoke all on function public.create_delivery_address(text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision) from public;
grant execute on function public.create_delivery_address(text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
revoke all on function public.create_self_service_shop(text,text,uuid,text,text,text,text,text,text,text,text,text,double precision,double precision) from public;
grant execute on function public.create_self_service_shop(text,text,uuid,text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;

-- Make the new RPC signatures visible to PostgREST immediately.
notify pgrst, 'reload schema';
