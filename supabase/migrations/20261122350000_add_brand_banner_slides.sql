-- A brand owns an ordered slider rather than one globally hard-coded hero image.
alter table public.marketplace_brands
  add column if not exists hero_slide_urls text[] not null default '{}';

update public.marketplace_brands
set hero_slide_urls = array_remove(array[hero_desktop_url, '/images/notun-bazar-banner2.png', '/images/notun-bazar-banner3.png', '/images/notun-bazar-banner4.png'], null)
where slug = 'notun-bazar' and cardinality(hero_slide_urls) = 0;

create or replace function public.save_marketplace_brand_slides(p_brand_id uuid, p_urls text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_urls text[];
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists (select 1 from public.marketplace_brands where id = p_brand_id) then raise exception 'Brand profile not found'; end if;
  select coalesce(array_agg(trim(url)), '{}') into v_urls
  from unnest(coalesce(p_urls, '{}')) as item(url)
  where trim(url) <> '' and trim(url) ~ '^(/[^[:space:]]*|https://[^[:space:]]+)$';
  if coalesce(array_length(p_urls, 1), 0) <> coalesce(array_length(v_urls, 1), 0) then
    raise exception 'Each banner image must be a relative path or HTTPS URL';
  end if;
  update public.marketplace_brands set hero_slide_urls = v_urls, updated_at = now(), updated_by = auth.uid() where id = p_brand_id;
end;
$$;
revoke all on function public.save_marketplace_brand_slides(uuid, text[]) from public;
grant execute on function public.save_marketplace_brand_slides(uuid, text[]) to authenticated;

create or replace function public.list_public_brand_locations()
returns table (slug text, kind text, parent_city_slug text, name_bn text, name_en text)
language sql stable security definer set search_path = '' as $$
  select l.slug, l.kind, parent.slug, l.name_bn, l.name_en
  from public.brand_locations l
  left join public.brand_locations parent on parent.id = l.parent_city_id
  where l.is_active order by l.kind, l.name_en;
$$;
revoke all on function public.list_public_brand_locations() from public;
grant execute on function public.list_public_brand_locations() to anon, authenticated;

notify pgrst, 'reload schema';
