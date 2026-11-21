-- Open-marketplace seller mode. Email confirmation is the only activation check here;
-- do not use this alone for payouts, lending, regulated goods, or business verification.
alter table public.profiles
  add column if not exists seller_enabled boolean not null default false,
  add column if not exists seller_requested boolean not null default false;

create or replace function public.request_seller_mode()
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_confirmed boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set seller_requested = true, updated_at = now()
    where id = auth.uid() and role = 'customer';
  if not found then raise exception 'Seller mode is unavailable for this account'; end if;
  select email_confirmed_at is not null into v_confirmed from auth.users where id = auth.uid();
  return coalesce(v_confirmed, false);
end;
$$;

create or replace function public.activate_seller_mode()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    raise exception 'Verify your email before enabling seller mode';
  end if;
  update public.profiles set seller_enabled = true, seller_requested = false, updated_at = now()
    where id = auth.uid() and role = 'customer';
  if not found then raise exception 'Seller mode is unavailable for this account'; end if;
  update public.shops set is_active = true, updated_at = now() where owner_id = auth.uid();
end;
$$;

create or replace function public.disable_seller_mode()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set seller_enabled = false, seller_requested = false, updated_at = now()
    where id = auth.uid() and role = 'customer';
  if not found then raise exception 'Seller mode is unavailable for this account'; end if;
  update public.shops set is_active = false, updated_at = now() where owner_id = auth.uid();
end;
$$;

revoke all on function public.request_seller_mode() from public;
revoke all on function public.activate_seller_mode() from public;
revoke all on function public.disable_seller_mode() from public;
grant execute on function public.request_seller_mode() to authenticated;
grant execute on function public.activate_seller_mode() to authenticated;
grant execute on function public.disable_seller_mode() to authenticated;

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
  if exists (select 1 from public.shops where owner_id = auth.uid()) then raise exception 'This account already has a shop'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 or coalesce(length(trim(p_category)), 0) < 2 or coalesce(length(trim(p_address)), 0) < 5 then
    raise exception 'Enter your shop name, category, and address';
  end if;
  insert into public.shops (owner_id, name, category, address, is_active)
    values (auth.uid(), trim(p_name), trim(p_category), trim(p_address), true)
    returning id into v_shop_id;
  return v_shop_id;
end;
$$;

revoke all on function public.create_self_service_shop(text, text, text) from public;
grant execute on function public.create_self_service_shop(text, text, text) to authenticated;
