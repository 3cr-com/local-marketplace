-- Super administrators manage platform administrators. Bootstrap the first one manually,
-- then all further administrator changes are restricted to this migration's RPC.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'vendor', 'admin', 'super_admin'));

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Regular admins can continue to see marketplace customers. Only super admins can
-- read profiles that carry an administrator role.
drop policy if exists "admins view profiles" on public.profiles;
create policy "admins view marketplace profiles" on public.profiles for select to authenticated
using (
  (select public.is_super_admin())
  or ((select public.is_admin()) and role in ('customer', 'vendor'))
);

alter table public.profiles add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.vendor_applications add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.vendor_applications add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.vendor_applications add column if not exists updated_at timestamptz not null default now();
alter table public.shops add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.shops add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists updated_by uuid references auth.users(id) on delete set null;

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log(created_at desc);
create index if not exists admin_activity_log_actor_idx on public.admin_activity_log(actor_id, created_at desc);
alter table public.admin_activity_log enable row level security;
create policy "super admins view activity logs" on public.admin_activity_log for select to authenticated
using ((select public.is_super_admin()));

create or replace function public.set_admin_audit_metadata()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_admin_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_record_id uuid;
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;
  v_record_id = coalesce(new.id, old.id);
  insert into public.admin_activity_log(actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(), lower(tg_op), tg_table_name, v_record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_audit_metadata on public.profiles;
create trigger profiles_audit_metadata before insert or update on public.profiles for each row execute function public.set_admin_audit_metadata();
drop trigger if exists vendor_applications_audit_metadata on public.vendor_applications;
create trigger vendor_applications_audit_metadata before insert or update on public.vendor_applications for each row execute function public.set_admin_audit_metadata();
drop trigger if exists shops_audit_metadata on public.shops;
create trigger shops_audit_metadata before insert or update on public.shops for each row execute function public.set_admin_audit_metadata();
drop trigger if exists products_audit_metadata on public.products;
create trigger products_audit_metadata before insert or update on public.products for each row execute function public.set_admin_audit_metadata();
drop trigger if exists orders_audit_metadata on public.orders;
create trigger orders_audit_metadata before insert or update on public.orders for each row execute function public.set_admin_audit_metadata();

drop trigger if exists profiles_admin_activity on public.profiles;
create trigger profiles_admin_activity after insert or update or delete on public.profiles for each row execute function public.record_admin_activity();
drop trigger if exists vendor_applications_admin_activity on public.vendor_applications;
create trigger vendor_applications_admin_activity after insert or update or delete on public.vendor_applications for each row execute function public.record_admin_activity();
drop trigger if exists shops_admin_activity on public.shops;
create trigger shops_admin_activity after insert or update or delete on public.shops for each row execute function public.record_admin_activity();
drop trigger if exists products_admin_activity on public.products;
create trigger products_admin_activity after insert or update or delete on public.products for each row execute function public.record_admin_activity();
drop trigger if exists orders_admin_activity on public.orders;
create trigger orders_admin_activity after insert or update or delete on public.orders for each row execute function public.record_admin_activity();

create or replace function public.set_admin_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  if not public.is_super_admin() then
    raise exception 'Super administrator access required';
  end if;
  if p_role not in ('customer', 'admin', 'super_admin') then
    raise exception 'Invalid administrator role';
  end if;

  select role into v_current_role from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Account not found';
  end if;
  if v_current_role = 'super_admin' and p_role <> 'super_admin'
    and (select count(*) from public.profiles where role = 'super_admin') <= 1 then
    raise exception 'At least one super administrator must remain';
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id;
end;
$$;
revoke all on function public.set_admin_role(uuid, text) from public;
grant execute on function public.set_admin_role(uuid, text) to authenticated;

-- Bootstrap only the first super administrator in the SQL Editor, replacing the UUID:
-- update public.profiles set role = 'super_admin' where id = '<user-uuid>';
notify pgrst, 'reload schema';
