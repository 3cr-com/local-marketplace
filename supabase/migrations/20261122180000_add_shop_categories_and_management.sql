-- A shop may serve multiple retail categories while retaining a primary category for display.
create table if not exists public.shop_categories (
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (shop_id, category_id)
);
create index if not exists shop_categories_category_idx on public.shop_categories(category_id);
insert into public.shop_categories(shop_id, category_id)
select id, primary_category_id from public.shops where primary_category_id is not null
on conflict do nothing;
alter table public.shop_categories enable row level security;
drop policy if exists "active shop categories are public" on public.shop_categories;
create policy "active shop categories are public" on public.shop_categories for select to anon, authenticated using (exists (select 1 from public.shops s where s.id = shop_id and (s.is_active or s.owner_id = auth.uid())));

create or replace function public.update_self_service_shop(p_shop_id uuid, p_name text, p_category_ids uuid[], p_is_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_primary uuid; v_category_name text;
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'Enter a shop name'; end if;
  if coalesce(array_length(p_category_ids, 1), 0) < 1 then raise exception 'Choose at least one category'; end if;
  select id, name into v_primary, v_category_name from public.categories where id = p_category_ids[1] and is_active;
  if v_primary is null or (select count(*) from public.categories where id = any(p_category_ids) and is_active) <> array_length(p_category_ids, 1) then raise exception 'One or more categories are not available'; end if;
  update public.shops set name = trim(p_name), category = v_category_name, primary_category_id = v_primary, is_active = p_is_active where id = p_shop_id;
  delete from public.shop_categories where shop_id = p_shop_id;
  insert into public.shop_categories(shop_id, category_id) select p_shop_id, unnest(p_category_ids);
end; $$;

create or replace function public.delete_self_service_shop(p_shop_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then raise exception 'Shop not found or access denied'; end if;
  delete from public.shops where id = p_shop_id;
end; $$;

revoke all on function public.update_self_service_shop(uuid,text,uuid[],boolean) from public;
grant execute on function public.update_self_service_shop(uuid,text,uuid[],boolean) to authenticated;
revoke all on function public.delete_self_service_shop(uuid) from public;
grant execute on function public.delete_self_service_shop(uuid) to authenticated;
notify pgrst, 'reload schema';
