-- Email verification proves account ownership; platform approval grants seller capability.
create or replace function public.request_seller_mode()
returns boolean language plpgsql security definer set search_path='' as $$
declare v_confirmed boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select email_confirmed_at is not null into v_confirmed from auth.users where id=auth.uid();
  if not coalesce(v_confirmed,false) then raise exception 'Verify your email before requesting seller access'; end if;
  update public.profiles set seller_requested=true, updated_at=now() where id=auth.uid() and role='customer';
  if not found then raise exception 'Seller mode is unavailable for this account'; end if;
  insert into public.vendor_applications(owner_id,shop_name,category,address,status) values(auth.uid(),'Seller access request','To be provided after approval','To be provided after approval','pending') on conflict(owner_id) do update set status=case when public.vendor_applications.status='rejected' then 'pending' else public.vendor_applications.status end, created_at=case when public.vendor_applications.status='rejected' then now() else public.vendor_applications.created_at end;
  return true;
end; $$;

create or replace function public.activate_seller_mode()
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Administrator approval is required'; end if;
end; $$;

create or replace function public.review_vendor_application(p_application_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_application public.vendor_applications%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into v_application from public.vendor_applications where id=p_application_id for update;
  if not found then raise exception 'Seller request not found'; end if;
  if v_application.status <> 'pending' then raise exception 'This seller request has already been reviewed'; end if;
  update public.vendor_applications set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=nullif(trim(p_reason),'') where id=p_application_id;
  update public.profiles set seller_enabled=(p_decision='approved'),seller_requested=false,updated_at=now() where id=v_application.owner_id;
end; $$;
notify pgrst,'reload schema';
