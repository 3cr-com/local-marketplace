-- MVP modules 4, 5 and 7: controlled fulfilment state and durable notification outbox.
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.notification_outbox enable row level security;
create policy "users view own notifications" on public.notification_outbox for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.update_vendor_order_status(p_order_id uuid, p_next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shop_owner uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select owner_id into v_shop_owner from public.shops where id = v_order.shop_id;
  if auth.uid() is distinct from v_shop_owner then raise exception 'Not allowed'; end if;
  if not ((v_order.status = 'placed' and p_next_status in ('accepted', 'cancelled'))
    or (v_order.status = 'accepted' and p_next_status in ('preparing', 'cancelled'))
    or (v_order.status = 'preparing' and p_next_status = 'ready')
    or (v_order.status = 'ready' and p_next_status in ('out_for_delivery', 'delivered'))
    or (v_order.status = 'out_for_delivery' and p_next_status = 'delivered')) then
    raise exception 'Invalid order status transition';
  end if;
  update public.orders set status = p_next_status, updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, status, actor_id) values (p_order_id, p_next_status, auth.uid());
  insert into public.notification_outbox (user_id, event_type, payload)
  values (v_order.customer_id, 'order_status_changed', jsonb_build_object('order_id', p_order_id, 'status', p_next_status));
end;
$$;
revoke all on function public.update_vendor_order_status(uuid, text) from public;
grant execute on function public.update_vendor_order_status(uuid, text) to authenticated;
