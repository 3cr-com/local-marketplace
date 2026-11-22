alter table public.orders add column if not exists cancellation_reason text;

drop function if exists public.update_vendor_order_status(uuid, text);
create function public.update_vendor_order_status(p_order_id uuid, p_next_status text, p_cancellation_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_shop_owner uuid; v_reason text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select owner_id into v_shop_owner from public.shops where id = v_order.shop_id;
  if auth.uid() is distinct from v_shop_owner then raise exception 'Not allowed'; end if;
  if not ((v_order.status = 'placed' and p_next_status in ('accepted', 'cancelled')) or (v_order.status = 'accepted' and p_next_status in ('preparing', 'cancelled')) or (v_order.status = 'preparing' and p_next_status = 'ready') or (v_order.status = 'ready' and p_next_status in ('out_for_delivery', 'delivered')) or (v_order.status = 'out_for_delivery' and p_next_status = 'delivered')) then raise exception 'Invalid order status transition'; end if;
  v_reason := nullif(trim(coalesce(p_cancellation_reason, '')), '');
  if p_next_status = 'cancelled' and v_reason is null then raise exception 'Provide a cancellation reason for the customer'; end if;
  update public.orders set status = p_next_status, cancellation_reason = case when p_next_status = 'cancelled' then v_reason else cancellation_reason end, updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, status, actor_id) values (p_order_id, p_next_status, auth.uid());
  insert into public.notification_outbox (user_id, event_type, payload) values (v_order.customer_id, 'order_status_changed', jsonb_build_object('order_id', p_order_id, 'status', p_next_status, 'cancellation_reason', v_reason));
end;
$$;
revoke all on function public.update_vendor_order_status(uuid, text, text) from public;
grant execute on function public.update_vendor_order_status(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
