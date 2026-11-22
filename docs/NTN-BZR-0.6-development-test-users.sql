-- NTN-BZR-0.6 — Development-only test accounts
-- Run in the Supabase SQL Editor only in a non-production project.
-- All accounts use password: TestPassword123!
-- Do NOT run this script in a customer-facing production database.

do $$
declare
  test_user record;
  user_id uuid;
begin
  for test_user in
    select * from (values
      ('customer.test@notunbazar.local', 'Test Customer', 'customer'),
      ('seller.test@notunbazar.local', 'Test Seller', 'seller'),
      ('admin.test@notunbazar.local', 'Test Admin', 'admin'),
      ('superadmin.test@notunbazar.local', 'Test Super Admin', 'super_admin')
    ) as accounts(email, full_name, account_type)
  loop
    select id into user_id from auth.users where email = test_user.email;

    if user_id is null then
      user_id := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', test_user.email,
        extensions.crypt('TestPassword123!', extensions.gen_salt('bf')), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', test_user.full_name), now(), now(), '', '', '', ''
      );
      insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (user_id, user_id, jsonb_build_object('sub', user_id::text, 'email', test_user.email), 'email', test_user.email, now(), now(), now());
    end if;

    update public.profiles
    set full_name = test_user.full_name,
      role = case when test_user.account_type in ('admin', 'super_admin') then test_user.account_type else 'customer' end,
      seller_enabled = test_user.account_type = 'seller',
      seller_requested = false,
      seller_access_active = true,
      admin_access_active = true,
      updated_at = now()
    where id = user_id;
  end loop;
end $$;

-- Verify created accounts:
select p.full_name, u.email, p.role, p.seller_enabled, p.seller_access_active, p.admin_access_active
from public.profiles p join auth.users u on u.id = p.id
where u.email like '%.test@notunbazar.local'
order by u.email;
