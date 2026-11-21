-- Structured delivery addresses, reusable retail categories, and server-calculated COD delivery fees.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, slug text not null unique,
  is_active boolean not null default true, sort_order integer not null default 0
);
insert into public.categories (name, slug, sort_order) values
  ('Groceries','groceries',10),('Fashion','fashion',20),('Footwear','footwear',30),
  ('Electronics','electronics',40),('Home & kitchen','home-kitchen',50),('Personal care','personal-care',60)
on conflict (slug) do nothing;

create table public.subcategories (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id) on delete cascade,
  name text not null, slug text not null, is_active boolean not null default true, sort_order integer not null default 0,
  unique (category_id, slug)
);
create table public.brands (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  is_active boolean not null default true, sort_order integer not null default 0
);
create table public.brand_subcategories (
  brand_id uuid not null references public.brands(id) on delete cascade,
  subcategory_id uuid not null references public.subcategories(id) on delete cascade,
  primary key (brand_id, subcategory_id)
);

insert into public.subcategories (category_id,name,slug,sort_order)
select c.id, value.name, value.slug, value.sort_order from public.categories c join (values
  ('groceries','Dairy & eggs','dairy-eggs',10),('groceries','Packaged foods','packaged-foods',20),('groceries','Beverages','beverages',30),('groceries','Fresh produce','fresh-produce',40),
  ('fashion','Men''s fashion','mens-fashion',10),('fashion','Women''s fashion','womens-fashion',20),('fashion','Kids fashion','kids-fashion',30),
  ('footwear','Men''s footwear','mens-footwear',10),('footwear','Women''s footwear','womens-footwear',20),('footwear','Kids footwear','kids-footwear',30),
  ('electronics','Smartphones','smartphones',10),('electronics','Headphones','headphones',20),('electronics','Laptops','laptops',30),
  ('home-kitchen','Cookware','cookware',10),('home-kitchen','Home decor','home-decor',20),('home-kitchen','Cleaning supplies','cleaning-supplies',30),
  ('personal-care','Skin care','skin-care',10),('personal-care','Hair care','hair-care',20),('personal-care','Bath & body','bath-body',30)
) as value(category_slug,name,slug,sort_order) on c.slug=value.category_slug;

insert into public.brands(name,slug,sort_order) values
  ('Amul','amul',10),('Britannia','britannia',20),('Tata Sampann','tata-sampann',30),('Nike','nike',40),('Adidas','adidas',50),('Puma','puma',60),
  ('Samsung','samsung',70),('Apple','apple',80),('boAt','boat',90),('Lenovo','lenovo',100),('Prestige','prestige',110),('Philips','philips',120),('Nivea','nivea',130),('Dove','dove',140),('Mamaearth','mamaearth',150)
on conflict (slug) do nothing;

insert into public.brand_subcategories(brand_id,subcategory_id)
select b.id,s.id from public.brands b join public.subcategories s on (b.slug,s.slug) in (
 ('amul','dairy-eggs'),('britannia','packaged-foods'),('tata-sampann','packaged-foods'),
 ('nike','mens-fashion'),('nike','mens-footwear'),('adidas','mens-footwear'),('adidas','womens-footwear'),('puma','mens-footwear'),
 ('samsung','smartphones'),('samsung','headphones'),('apple','smartphones'),('apple','laptops'),('boat','headphones'),('lenovo','laptops'),
 ('prestige','cookware'),('philips','cookware'),('nivea','skin-care'),('dove','hair-care'),('dove','bath-body'),('mamaearth','skin-care'),('mamaearth','hair-care')
) on conflict do nothing;

alter table public.shops add column primary_category_id uuid references public.categories(id) on delete set null;
alter table public.products add column category_id uuid references public.categories(id) on delete set null,
  add column subcategory_id uuid references public.subcategories(id) on delete set null,
  add column brand_id uuid references public.brands(id) on delete set null;
create index products_category_idx on public.products(category_id,subcategory_id,brand_id);

create table public.delivery_addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home', recipient_name text not null, phone text not null,
  address_line_1 text not null, address_line_2 text, locality text, landmark text,
  city text not null, district text, state text not null, country text not null default 'India', pincode text not null,
  location extensions.geography(point,4326), is_default boolean not null default false, created_at timestamptz not null default now()
);
create index delivery_addresses_user_idx on public.delivery_addresses(user_id);
create index delivery_addresses_location_gix on public.delivery_addresses using gist(location);
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.brands enable row level security;
alter table public.brand_subcategories enable row level security;
alter table public.delivery_addresses enable row level security;
create policy "active categories are public" on public.categories for select to anon, authenticated using (is_active);
create policy "active subcategories are public" on public.subcategories for select to anon, authenticated using (is_active);
create policy "active brands are public" on public.brands for select to anon, authenticated using (is_active);
create policy "brand subcategories are public" on public.brand_subcategories for select to anon, authenticated using (true);
create policy "users manage own delivery addresses" on public.delivery_addresses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.orders add column if not exists delivery_address_id uuid references public.delivery_addresses(id) on delete set null,
  add column if not exists delivery_address_snapshot jsonb,
  add column if not exists subtotal_paise integer not null default 0,
  add column if not exists delivery_fee_paise integer not null default 0,
  add column if not exists delivery_distance_meters integer;

create or replace function public.place_cod_order(p_shop_id uuid, p_address_id uuid, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_customer_id uuid := auth.uid(); v_order_id uuid := gen_random_uuid(); v_subtotal integer := 0; v_fee integer; v_distance integer; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_address public.delivery_addresses%rowtype; v_shop public.shops%rowtype;
begin
  if v_customer_id is null then raise exception 'Authentication required'; end if;
  select * into v_address from public.delivery_addresses where id=p_address_id and user_id=v_customer_id; if not found or v_address.location is null then raise exception 'Choose a saved address with location'; end if;
  select * into v_shop from public.shops where id=p_shop_id and is_active; if not found or v_shop.location is null then raise exception 'Shop delivery location is unavailable'; end if;
  v_distance := round(extensions.st_distance(v_shop.location,v_address.location));
  v_fee := case when v_distance <= 5000 then 1000 when v_distance <= 10000 then 2000 else 2000 + ceil((v_distance-10000)::numeric/1000)*500 end;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart cannot be empty'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer; if v_qty is null or v_qty < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and shop_id=p_shop_id and is_active for update;
    if not found or v_product.stock < v_qty then raise exception 'Product is unavailable'; end if; v_subtotal := v_subtotal + v_product.price_paise*v_qty;
  end loop;
  insert into public.orders(id,customer_id,shop_id,delivery_address,total_paise,subtotal_paise,delivery_fee_paise,delivery_distance_meters,delivery_address_id,delivery_address_snapshot,payment_method,payment_status,delivery_mode)
  values(v_order_id,v_customer_id,p_shop_id,concat_ws(', ',v_address.address_line_1,v_address.address_line_2,v_address.locality,v_address.city,v_address.state,v_address.pincode),v_subtotal+v_fee,v_subtotal,v_fee,v_distance,v_address.id,to_jsonb(v_address),'cod','unpaid','vendor_delivery');
  for v_item in select value from jsonb_array_elements(p_items) loop v_qty := (v_item->>'quantity')::integer; select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update; update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id; insert into public.order_items(order_id,product_id,quantity,unit_price_paise) values(v_order_id,v_product.id,v_qty,v_product.price_paise); end loop;
  return v_order_id;
end; $$;
revoke all on function public.place_cod_order(uuid,uuid,jsonb) from public;
grant execute on function public.place_cod_order(uuid,uuid,jsonb) to authenticated;
