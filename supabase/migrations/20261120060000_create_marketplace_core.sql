-- migration: create the secure core for the nearby multi-vendor marketplace
-- affected tables: profiles, vendor_applications, shops, products, service_areas, orders, order_items
create extension if not exists postgis with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vendor_applications (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
  shop_name text not null, category text not null, address text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')), created_at timestamptz not null default now()
);
create table public.shops (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null, category text not null, description text not null default '', address text not null,
  location extensions.geography(point, 4326), is_active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index shops_location_gix on public.shops using gist (location);
create table public.products (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null, description text not null default '', category text not null, price_paise integer not null check (price_paise >= 0),
  stock integer not null default 0 check (stock >= 0), image_url text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_shop_active_idx on public.products(shop_id, is_active);
create table public.service_areas (
  id uuid primary key default gen_random_uuid(), name text not null, center extensions.geography(point, 4326) not null,
  radius_meters integer not null default 10000 check (radius_meters between 1 and 100000), is_active boolean not null default true, created_at timestamptz not null default now()
);
create index service_areas_center_gix on public.service_areas using gist (center);
create table public.orders (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  status text not null default 'placed' check (status in ('placed','accepted','preparing','ready','out_for_delivery','delivered','cancelled')),
  delivery_address text not null, total_paise integer not null default 0 check (total_paise >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_shop_idx on public.orders(shop_id, created_at desc);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict, quantity integer not null check (quantity > 0),
  unit_price_paise integer not null check (unit_price_paise >= 0)
);
alter table public.profiles enable row level security;
alter table public.vendor_applications enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.service_areas enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "profiles readable by owner" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users create own customer profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id and role = 'customer');
create policy "users update own customer details" on public.profiles for update to authenticated using ((select auth.uid()) = id and role = 'customer') with check ((select auth.uid()) = id and role = 'customer');
create policy "applicants view own application" on public.vendor_applications for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users submit own vendor application" on public.vendor_applications for insert to authenticated with check ((select auth.uid()) = owner_id and status = 'pending');
create policy "approved shops are public" on public.shops for select to anon, authenticated using (is_active or (select auth.uid()) = owner_id);
create policy "shop owners update own shop" on public.shops for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "public sees active products" on public.products for select to anon, authenticated using (is_active and exists (select 1 from public.shops s where s.id = shop_id and s.is_active));
create policy "owners see all own products" on public.products for select to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "shop owners add products" on public.products for insert to authenticated with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "shop owners update products" on public.products for update to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()))) with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "shop owners delete products" on public.products for delete to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "active service areas are public" on public.service_areas for select to anon, authenticated using (is_active);
create policy "customers view own orders" on public.orders for select to authenticated using ((select auth.uid()) = customer_id);
create policy "vendors view shop orders" on public.orders for select to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "customers place own orders" on public.orders for insert to authenticated with check ((select auth.uid()) = customer_id and status = 'placed');
create policy "vendors update shop order status" on public.orders for update to authenticated using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid()))) with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = (select auth.uid())));
create policy "order participants view items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o left join public.shops s on s.id = o.shop_id where o.id = order_id and (o.customer_id = (select auth.uid()) or s.owner_id = (select auth.uid()))));
create policy "customers add items to own placed orders" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o join public.products p on p.id = product_id and p.shop_id = o.shop_id where o.id = order_id and o.customer_id = (select auth.uid()) and o.status = 'placed'));
create or replace function public.nearby_shops(customer_lat double precision, customer_lng double precision, radius_meters integer default 10000)
returns table (id uuid, name text, category text, address text, distance_meters double precision)
language sql stable security invoker set search_path = '' as $$
 select s.id, s.name, s.category, s.address, extensions.st_distance(s.location, extensions.st_setsrid(extensions.st_makepoint(customer_lng,customer_lat),4326)::extensions.geography)
 from public.shops s where s.is_active and s.location is not null
 and extensions.st_dwithin(s.location,extensions.st_setsrid(extensions.st_makepoint(customer_lng,customer_lat),4326)::extensions.geography,least(greatest(radius_meters,1),100000)) order by 5;
$$;
revoke execute on function public.nearby_shops(double precision,double precision,integer) from public;
grant execute on function public.nearby_shops(double precision,double precision,integer) to anon, authenticated;
