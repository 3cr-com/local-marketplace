-- MVP module 3: one-shop, cash-on-delivery checkout.
-- The database, not the browser, owns prices, stock deduction, and order totals.
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column payment_method text not null default 'cod' check (payment_method in ('cod', 'online')),
  add column payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  add column delivery_mode text not null default 'vendor_delivery' check (delivery_mode in ('vendor_delivery', 'platform_delivery', 'pickup'));

alter table public.order_status_history enable row level security;
create policy "order participants view status history" on public.order_status_history for select to authenticated using (
  exists (
    select 1 from public.orders o left join public.shops s on s.id = o.shop_id
    where o.id = order_id and (o.customer_id = (select auth.uid()) or s.owner_id = (select auth.uid()))
  )
);

-- Remove direct browser order inserts. All new orders must use the atomic RPC below.
drop policy if exists "customers place own orders" on public.orders;
drop policy if exists "customers add items to own placed orders" on public.order_items;

create or replace function public.place_cod_order(p_shop_id uuid, p_delivery_address text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid := gen_random_uuid();
  v_total_paise integer := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
begin
  if v_customer_id is null then raise exception 'Authentication required'; end if;
  if coalesce(length(trim(p_delivery_address)), 0) < 10 then raise exception 'A complete delivery address is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart cannot be empty'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    group by product_id having count(*) > 1
  ) then raise exception 'Cart contains duplicate products'; end if;
  if not exists (select 1 from public.shops where id = p_shop_id and is_active) then raise exception 'Shop is unavailable'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity < 1 then raise exception 'Invalid item quantity'; end if;
    select * into v_product from public.products
      where id = (v_item ->> 'product_id')::uuid and shop_id = p_shop_id and is_active
      for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if v_product.stock < v_quantity then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_total_paise := v_total_paise + (v_product.price_paise * v_quantity);
  end loop;

  insert into public.orders (id, customer_id, shop_id, delivery_address, total_paise, payment_method, payment_status, delivery_mode)
  values (v_order_id, v_customer_id, p_shop_id, trim(p_delivery_address), v_total_paise, 'cod', 'unpaid', 'vendor_delivery');

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid for update;
    update public.products set stock = stock - v_quantity, updated_at = now() where id = v_product.id;
    insert into public.order_items (order_id, product_id, quantity, unit_price_paise)
    values (v_order_id, v_product.id, v_quantity, v_product.price_paise);
  end loop;
  insert into public.order_status_history (order_id, status, actor_id) values (v_order_id, 'placed', v_customer_id);
  return v_order_id;
end;
$$;

revoke all on function public.place_cod_order(uuid, text, jsonb) from public;
grant execute on function public.place_cod_order(uuid, text, jsonb) to authenticated;
