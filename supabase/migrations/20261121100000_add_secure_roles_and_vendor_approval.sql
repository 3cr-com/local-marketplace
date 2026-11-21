-- Secure role routing and vendor approval. Run this migration before enabling admin or vendor workspaces.
alter table public.vendor_applications
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_reason text;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "admins view profiles" on public.profiles for select to authenticated
using ((select public.is_admin()));

create policy "admins view vendor applications" on public.vendor_applications for select to authenticated
using ((select public.is_admin()));

create or replace function public.review_vendor_application(
  p_application_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_application public.vendor_applications%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;

  select * into v_application from public.vendor_applications where id = p_application_id for update;
  if not found then raise exception 'Vendor application not found'; end if;
  if v_application.status <> 'pending' then raise exception 'This application has already been reviewed'; end if;

  update public.vendor_applications
    set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = nullif(trim(p_reason), '')
    where id = p_application_id;

  if p_decision = 'approved' then
    update public.profiles set role = 'vendor', updated_at = now() where id = v_application.owner_id;
    insert into public.shops (owner_id, name, category, address, is_active)
      values (v_application.owner_id, v_application.shop_name, v_application.category, v_application.address, false);
  end if;
end;
$$;

revoke all on function public.review_vendor_application(uuid, text, text) from public;
grant execute on function public.review_vendor_application(uuid, text, text) to authenticated;

-- Bootstrap the first administrator manually in Supabase SQL Editor, after that user has signed up:
-- update public.profiles set role = 'admin' where id = '<that-user-uuid>';
