-- A super administrator can pause an administrator without changing their account history.
alter table public.profiles add column if not exists admin_access_active boolean not null default true;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and admin_access_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and admin_access_active
  );
$$;

create or replace function public.set_admin_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  if not public.is_super_admin() then raise exception 'Super administrator access required'; end if;
  if p_role not in ('customer', 'admin', 'super_admin') then raise exception 'Invalid administrator role'; end if;
  select role into v_current_role from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Account not found'; end if;
  if v_current_role = 'super_admin' and p_role <> 'super_admin'
    and (select count(*) from public.profiles where role = 'super_admin' and admin_access_active) <= 1 then
    raise exception 'At least one active super administrator must remain';
  end if;
  update public.profiles
  set role = p_role, admin_access_active = case when p_role in ('admin', 'super_admin') then true else admin_access_active end, updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.set_admin_access_status(p_user_id uuid, p_is_active boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if not public.is_super_admin() then raise exception 'Super administrator access required'; end if;
  select role into v_role from public.profiles where id = p_user_id for update;
  if not found or v_role not in ('admin', 'super_admin') then raise exception 'Administrator account not found'; end if;
  if v_role = 'super_admin' and not p_is_active
    and (select count(*) from public.profiles where role = 'super_admin' and admin_access_active) <= 1 then
    raise exception 'At least one active super administrator must remain';
  end if;
  update public.profiles set admin_access_active = p_is_active, updated_at = now() where id = p_user_id;
end;
$$;
revoke all on function public.set_admin_access_status(uuid, boolean) from public;
grant execute on function public.set_admin_access_status(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
