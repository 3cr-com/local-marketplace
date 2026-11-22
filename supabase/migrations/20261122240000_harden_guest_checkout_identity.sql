-- Guest contact details are private service-role data. The mapping lets repeated
-- guest checkout requests reuse the same internal customer without exposing auth users.
create table if not exists public.guest_checkout_identities (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  phone_hash text not null unique,
  email_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guest_checkout_identities enable row level security;

create table if not exists public.guest_checkout_attempts (
  id bigint generated always as identity primary key,
  contact_hash text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists guest_checkout_attempts_contact_time_idx on public.guest_checkout_attempts(contact_hash, attempted_at desc);
alter table public.guest_checkout_attempts enable row level security;

create or replace function public.enforce_guest_checkout_rate_limit(p_contact_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  delete from public.guest_checkout_attempts where attempted_at < now() - interval '30 minutes';
  if (select count(*) from public.guest_checkout_attempts where contact_hash = p_contact_hash and attempted_at >= now() - interval '15 minutes') >= 5 then
    raise exception 'Too many checkout attempts. Please wait 15 minutes and try again.';
  end if;
  insert into public.guest_checkout_attempts(contact_hash) values (p_contact_hash);
end;
$$;

create or replace function public.resolve_guest_checkout_customer(p_candidate_customer_id uuid, p_phone_hash text, p_email_hash text default null)
returns table(customer_id uuid, created boolean)
language plpgsql security definer set search_path='' as $$
declare v_phone_customer uuid; v_email_customer uuid; v_resolved_customer uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if coalesce(length(trim(p_phone_hash)), 0) < 32 then raise exception 'Invalid guest contact'; end if;
  select customer_id into v_phone_customer from public.guest_checkout_identities where phone_hash = p_phone_hash for update;
  if p_email_hash is not null then
    select customer_id into v_email_customer from public.guest_checkout_identities where email_hash = p_email_hash for update;
  end if;
  if v_phone_customer is not null and v_email_customer is not null and v_phone_customer <> v_email_customer then
    raise exception 'Guest contact details belong to different accounts. Use the original email and phone combination.';
  end if;
  if v_phone_customer is not null or v_email_customer is not null then
    v_resolved_customer := coalesce(v_phone_customer, v_email_customer);
    if p_email_hash is not null then
      update public.guest_checkout_identities as g set email_hash = coalesce(g.email_hash, p_email_hash), updated_at = now() where g.customer_id = v_resolved_customer;
    end if;
    customer_id := v_resolved_customer;
    created := false;
    return next;
    return;
  end if;
  begin
    insert into public.guest_checkout_identities(customer_id, phone_hash, email_hash) values (p_candidate_customer_id, p_phone_hash, p_email_hash);
    customer_id := p_candidate_customer_id;
    created := true;
    return next;
  exception when unique_violation then
    select g.customer_id into v_phone_customer
    from public.guest_checkout_identities as g
    where g.phone_hash = p_phone_hash;
    if p_email_hash is not null then
      select g.customer_id into v_email_customer
      from public.guest_checkout_identities as g
      where g.email_hash = p_email_hash;
    end if;
    if v_phone_customer is not null and v_email_customer is not null and v_phone_customer <> v_email_customer then
      raise exception 'Guest contact details belong to different accounts. Use the original email and phone combination.';
    end if;
    customer_id := coalesce(v_phone_customer, v_email_customer);
    if customer_id is null then raise; end if;
    created := false;
    return next;
  end;
end;
$$;

alter table public.orders add column if not exists guest_checkout_key uuid;
create unique index if not exists orders_guest_checkout_key_idx on public.orders(customer_id, guest_checkout_key) where guest_checkout_key is not null;

drop function if exists public.create_guest_delivery_address_and_order(uuid,uuid,jsonb,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision);
create or replace function public.create_guest_delivery_address_and_order(p_customer_id uuid, p_shop_id uuid, p_items jsonb, p_label text, p_recipient_name text, p_phone text, p_address_line_1 text, p_address_line_2 text, p_locality text, p_landmark text, p_city text, p_district text, p_state text, p_country text, p_pincode text, p_latitude double precision, p_longitude double precision, p_guest_checkout_key uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_address_id uuid := gen_random_uuid(); v_order_id uuid := gen_random_uuid(); v_existing_order_id uuid; v_subtotal integer:=0; v_fee integer; v_distance integer; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_shop public.shops%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if p_guest_checkout_key is not null then
    perform pg_advisory_xact_lock(hashtext(p_customer_id::text || p_guest_checkout_key::text));
    select id into v_existing_order_id from public.orders where customer_id = p_customer_id and guest_checkout_key = p_guest_checkout_key;
    if v_existing_order_id is not null then return v_existing_order_id; end if;
  end if;
  if p_latitude is null or p_longitude is null or trim(coalesce(p_pincode,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a complete delivery address with location'; end if;
  select * into v_shop from public.shops where id=p_shop_id and is_active; if not found or v_shop.location is null then raise exception 'Shop is unavailable for delivery'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart cannot be empty'; end if;
  v_distance:=round(extensions.st_distance(v_shop.location,extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography)); v_fee:=case when v_distance<=5000 then 1000 when v_distance<=10000 then 2000 else 2000+ceil((v_distance-10000)::numeric/1000)*500 end;
  for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::integer; if v_qty is null or v_qty<1 then raise exception 'Invalid item quantity'; end if; select * into v_product from public.products where id=(v_item->>'product_id')::uuid and shop_id=p_shop_id and is_active for update; if not found or v_product.stock<v_qty then raise exception 'Product is unavailable'; end if; v_subtotal:=v_subtotal+v_product.price_paise*v_qty; end loop;
  insert into public.delivery_addresses(id,user_id,label,recipient_name,phone,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,location,is_default) values(v_address_id,p_customer_id,trim(p_label),trim(p_recipient_name),trim(p_phone),trim(p_address_line_1),nullif(trim(p_address_line_2),''),nullif(trim(p_locality),''),nullif(trim(p_landmark),''),trim(p_city),nullif(trim(p_district),''),trim(p_state),coalesce(nullif(trim(p_country),''),'India'),trim(p_pincode),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,true);
  insert into public.orders(id,customer_id,shop_id,delivery_address,total_paise,subtotal_paise,delivery_fee_paise,delivery_distance_meters,delivery_address_id,delivery_address_snapshot,payment_method,payment_status,delivery_mode,guest_checkout_key) values(v_order_id,p_customer_id,p_shop_id,concat_ws(', ',p_address_line_1,p_address_line_2,p_locality,p_city,p_state,p_pincode),v_subtotal+v_fee,v_subtotal,v_fee,v_distance,v_address_id,(select to_jsonb(a) from public.delivery_addresses a where a.id=v_address_id),'cod','unpaid','vendor_delivery',p_guest_checkout_key);
  for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::integer; select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update; update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id; insert into public.order_items(order_id,product_id,quantity,unit_price_paise) values(v_order_id,v_product.id,v_qty,v_product.price_paise); end loop;
  insert into public.order_status_history(order_id,status,actor_id) values(v_order_id,'placed',p_customer_id); return v_order_id;
end;
$$;
revoke all on function public.enforce_guest_checkout_rate_limit(text) from public;
revoke all on function public.resolve_guest_checkout_customer(uuid,text,text) from public;
revoke all on function public.create_guest_delivery_address_and_order(uuid,uuid,jsonb,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision,uuid) from public;
grant execute on function public.enforce_guest_checkout_rate_limit(text) to service_role;
grant execute on function public.resolve_guest_checkout_customer(uuid,text,text) to service_role;
grant execute on function public.create_guest_delivery_address_and_order(uuid,uuid,jsonb,text,text,text,text,text,text,text,text,text,text,text,text,double precision,double precision,uuid) to service_role;
notify pgrst,'reload schema';
