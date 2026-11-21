create or replace function public.set_default_delivery_address(p_address_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.delivery_addresses where id = p_address_id and user_id = auth.uid()) then raise exception 'Address not found'; end if;
  update public.delivery_addresses set is_default = false where user_id = auth.uid();
  update public.delivery_addresses set is_default = true where id = p_address_id and user_id = auth.uid();
end; $$;
revoke all on function public.set_default_delivery_address(uuid) from public;
grant execute on function public.set_default_delivery_address(uuid) to authenticated;
notify pgrst, 'reload schema';
