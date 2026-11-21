-- Backfill path for shops created before coordinates and structured pickup data existed.
create or replace function public.update_self_service_shop_address(
  p_shop_id uuid, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text,
  p_city text, p_district text, p_state text, p_country text, p_pincode text,
  p_latitude double precision, p_longitude double precision
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  if coalesce(length(trim(p_address_line_1)),0) < 3 or coalesce(length(trim(p_city)),0) < 2 or coalesce(length(trim(p_state)),0) < 2 or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete valid pickup address'; end if;
  if p_latitude is null or p_longitude is null then raise exception 'Use your current location to set the pickup point'; end if;
  update public.shops set address = concat_ws(', ',trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),trim(p_city),trim(p_state),trim(p_pincode)), address_line_1 = trim(p_address_line_1), address_line_2 = nullif(trim(p_address_line_2),''), locality = nullif(trim(p_locality),''), landmark = nullif(trim(p_landmark),''), city = trim(p_city), district = nullif(trim(p_district),''), state = trim(p_state), country = coalesce(nullif(trim(p_country),''),'India'), pincode = trim(p_pincode), location = extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography where id = p_shop_id;
end; $$;
revoke all on function public.update_self_service_shop_address(uuid,text,text,text,text,text,text,text,text,text,double precision,double precision) from public;
grant execute on function public.update_self_service_shop_address(uuid,text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
notify pgrst, 'reload schema';
