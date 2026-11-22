-- Keep fulfilment and order-history records intact. A shop with orders is archived by
-- setting it inactive; only a shop with no order history can be permanently removed.
create or replace function public.delete_self_service_shop(p_shop_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then
    raise exception 'Shop not found or access denied';
  end if;
  if exists (select 1 from public.orders where shop_id = p_shop_id) then
    raise exception 'This shop has order history and cannot be deleted. Make it inactive instead to preserve those orders.';
  end if;
  if exists (
    select 1 from public.order_items oi
    join public.products p on p.id = oi.product_id
    where p.shop_id = p_shop_id
  ) then
    raise exception 'This shop has fulfilled items and cannot be deleted. Make it inactive instead.';
  end if;
  delete from public.shops where id = p_shop_id;
end;
$$;
revoke all on function public.delete_self_service_shop(uuid) from public;
grant execute on function public.delete_self_service_shop(uuid) to authenticated;
notify pgrst, 'reload schema';
