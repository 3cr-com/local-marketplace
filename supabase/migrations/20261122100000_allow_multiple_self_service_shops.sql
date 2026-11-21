-- A seller may own many shops. Each shop has its own address and product catalog.
create or replace function public.create_self_service_shop(p_name text, p_category text, p_address text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_shop_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer' and seller_enabled) then
    raise exception 'Enable seller mode before creating a shop';
  end if;
  if coalesce(length(trim(p_name)), 0) < 2 or coalesce(length(trim(p_category)), 0) < 2 or coalesce(length(trim(p_address)), 0) < 5 then
    raise exception 'Enter your shop name, category, and address';
  end if;
  insert into public.shops (owner_id, name, category, address, is_active)
    values (auth.uid(), trim(p_name), trim(p_category), trim(p_address), true)
    returning id into v_shop_id;
  return v_shop_id;
end;
$$;
