-- A seller choice is onboarding intent only. It never grants vendor permissions by itself.
alter table public.profiles
  add column if not exists account_type text not null default 'buyer'
  check (account_type in ('buyer', 'seller'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer',
    case when new.raw_user_meta_data ->> 'account_type' = 'seller' then 'seller' else 'buyer' end
  );
  return new;
end;
$$;

-- Do not change the role here. Only review_vendor_application may grant vendor access.
