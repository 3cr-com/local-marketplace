-- Sellers may reuse any address from a shop they own. These functions expose only
-- structured pickup data belonging to the signed-in seller.
create or replace function public.list_my_shop_pickup_addresses()
returns table (shop_id uuid, shop_name text, address_line_1 text, address_line_2 text, locality text, landmark text, city text, district text, state text, country text, pincode text, latitude double precision, longitude double precision)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.address_line_1, s.address_line_2, s.locality, s.landmark, s.city, s.district, s.state, s.country, s.pincode,
    extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry)
  from public.shops s
  where s.owner_id = auth.uid() and s.location is not null
  order by s.name;
$$;
revoke all on function public.list_my_shop_pickup_addresses() from public;
grant execute on function public.list_my_shop_pickup_addresses() to authenticated;

create or replace function public.get_my_shop_pickup_address(p_shop_id uuid)
returns table (address_line_1 text, address_line_2 text, locality text, landmark text, city text, district text, state text, country text, pincode text, latitude double precision, longitude double precision)
language sql stable security definer set search_path = '' as $$
  select s.address_line_1, s.address_line_2, s.locality, s.landmark, s.city, s.district, s.state, s.country, s.pincode,
    extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry)
  from public.shops s
  where s.id = p_shop_id and s.owner_id = auth.uid();
$$;
revoke all on function public.get_my_shop_pickup_address(uuid) from public;
grant execute on function public.get_my_shop_pickup_address(uuid) to authenticated;
notify pgrst, 'reload schema';
