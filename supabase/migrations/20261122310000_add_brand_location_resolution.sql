-- NTN-BZR-3 follow-up: stable city/area records and published brand/banner overrides.
create table if not exists public.brand_locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  kind text not null check (kind in ('city', 'area')),
  parent_city_id uuid references public.brand_locations(id) on delete restrict,
  name_bn text not null default '', name_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  check ((kind = 'city' and parent_city_id is null) or (kind = 'area' and parent_city_id is not null))
);
create index if not exists brand_locations_parent_city_idx on public.brand_locations(parent_city_id);
alter table public.brand_locations enable row level security;
create policy "admins read brand locations" on public.brand_locations for select to authenticated using ((select public.is_admin()));

create table if not exists public.brand_location_overrides (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null unique references public.brand_locations(id) on delete cascade,
  brand_id uuid references public.marketplace_brands(id) on delete restrict,
  hero_desktop_url text, hero_mobile_url text, hero_eyebrow text, hero_headline text,
  hero_description text, hero_cta_label text, hero_cta_url text, hero_alt_text text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null
);
alter table public.brand_location_overrides enable row level security;
create policy "admins read location brand overrides" on public.brand_location_overrides for select to authenticated using ((select public.is_admin()));

create table if not exists public.marketplace_brand_versions (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.marketplace_brands(id) on delete cascade,
  snapshot jsonb not null, changed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.marketplace_brand_versions enable row level security;
create policy "admins read brand history" on public.marketplace_brand_versions for select to authenticated using ((select public.is_admin()));

create or replace function public.record_marketplace_brand_version() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.marketplace_brand_versions(brand_id, snapshot, changed_by) values (old.id, to_jsonb(old), auth.uid());
  end if;
  return new;
end; $$;
drop trigger if exists marketplace_brand_versions_trigger on public.marketplace_brands;
create trigger marketplace_brand_versions_trigger after update on public.marketplace_brands for each row execute function public.record_marketplace_brand_version();

drop trigger if exists brand_locations_audit_metadata on public.brand_locations;
create trigger brand_locations_audit_metadata before insert or update on public.brand_locations for each row execute function public.set_admin_audit_metadata();
drop trigger if exists brand_locations_admin_activity on public.brand_locations;
create trigger brand_locations_admin_activity after insert or update or delete on public.brand_locations for each row execute function public.record_admin_activity();
drop trigger if exists brand_location_overrides_audit_metadata on public.brand_location_overrides;
create trigger brand_location_overrides_audit_metadata before insert or update on public.brand_location_overrides for each row execute function public.set_admin_audit_metadata();
drop trigger if exists brand_location_overrides_admin_activity on public.brand_location_overrides;
create trigger brand_location_overrides_admin_activity after insert or update or delete on public.brand_location_overrides for each row execute function public.record_admin_activity();

create or replace function public.save_brand_location(p_id uuid, p_slug text, p_kind text, p_parent_city_id uuid, p_name_bn text, p_name_en text, p_is_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Location slug must use lowercase letters, numbers, and hyphens'; end if;
  if p_kind not in ('city','area') then raise exception 'Location kind must be city or area'; end if;
  if p_kind = 'area' and not exists (select 1 from public.brand_locations where id = p_parent_city_id and kind = 'city') then raise exception 'An area requires an existing city'; end if;
  if p_kind = 'city' then p_parent_city_id := null; end if;
  if p_id is null then
    insert into public.brand_locations(slug,kind,parent_city_id,name_bn,name_en,is_active,created_by,updated_by) values(v_slug,p_kind,p_parent_city_id,btrim(coalesce(p_name_bn,'')),btrim(p_name_en),coalesce(p_is_active,true),auth.uid(),auth.uid()) returning id into v_id;
  else
    update public.brand_locations set slug=v_slug,kind=p_kind,parent_city_id=p_parent_city_id,name_bn=btrim(coalesce(p_name_bn,'')),name_en=btrim(p_name_en),is_active=coalesce(p_is_active,true),updated_at=now(),updated_by=auth.uid() where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Location not found'; end if;
  end if; return v_id;
end; $$;
revoke all on function public.save_brand_location(uuid,text,text,uuid,text,text,boolean) from public;
grant execute on function public.save_brand_location(uuid,text,text,uuid,text,text,boolean) to authenticated;

create or replace function public.save_brand_location_override(p_location_id uuid, p_brand_id uuid, p_hero_desktop_url text, p_hero_mobile_url text, p_hero_eyebrow text, p_hero_headline text, p_hero_description text, p_hero_cta_label text, p_hero_cta_url text, p_hero_alt_text text, p_status text default 'draft')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.brand_locations where id=p_location_id and is_active) then raise exception 'Active location not found'; end if;
  if p_brand_id is not null and not exists(select 1 from public.marketplace_brands where id=p_brand_id and status='published') then raise exception 'Location assignments require a published brand'; end if;
  if p_status not in ('draft','published') then raise exception 'Invalid publication status'; end if;
  if coalesce(p_hero_cta_url,'') <> '' and p_hero_cta_url !~ '^(/[^[:space:]]*|https://[^[:space:]]+)$' then raise exception 'CTA destination must be a relative path or HTTPS URL'; end if;
  insert into public.brand_location_overrides(location_id,brand_id,hero_desktop_url,hero_mobile_url,hero_eyebrow,hero_headline,hero_description,hero_cta_label,hero_cta_url,hero_alt_text,status,published_at,created_by,updated_by,published_by)
  values(p_location_id,p_brand_id,nullif(btrim(coalesce(p_hero_desktop_url,'')),''),nullif(btrim(coalesce(p_hero_mobile_url,'')),''),nullif(btrim(coalesce(p_hero_eyebrow,'')),''),nullif(btrim(coalesce(p_hero_headline,'')),''),nullif(btrim(coalesce(p_hero_description,'')),''),nullif(btrim(coalesce(p_hero_cta_label,'')),''),nullif(btrim(coalesce(p_hero_cta_url,'')),''),nullif(btrim(coalesce(p_hero_alt_text,'')),''),p_status,case when p_status='published' then now() else null end,auth.uid(),auth.uid(),case when p_status='published' then auth.uid() else null end)
  on conflict(location_id) do update set brand_id=excluded.brand_id,hero_desktop_url=excluded.hero_desktop_url,hero_mobile_url=excluded.hero_mobile_url,hero_eyebrow=excluded.hero_eyebrow,hero_headline=excluded.hero_headline,hero_description=excluded.hero_description,hero_cta_label=excluded.hero_cta_label,hero_cta_url=excluded.hero_cta_url,hero_alt_text=excluded.hero_alt_text,status=excluded.status,published_at=case when excluded.status='published' then now() else brand_location_overrides.published_at end,updated_at=now(),updated_by=auth.uid(),published_by=case when excluded.status='published' then auth.uid() else brand_location_overrides.published_by end;
end; $$;
revoke all on function public.save_brand_location_override(uuid,uuid,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.save_brand_location_override(uuid,uuid,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.resolve_marketplace_brand(p_city_slug text default null, p_area_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_default public.marketplace_brands%rowtype; v_city public.brand_locations%rowtype; v_area public.brand_locations%rowtype; v_city_override public.brand_location_overrides%rowtype; v_area_override public.brand_location_overrides%rowtype; v_brand public.marketplace_brands%rowtype; v_override public.brand_location_overrides%rowtype;
begin
  select * into v_default from public.marketplace_brands where status='published' and is_default limit 1;
  if not found then return null; end if;
  if p_city_slug is not null then select * into v_city from public.brand_locations where slug=lower(p_city_slug) and kind='city' and is_active; end if;
  if p_area_slug is not null then select * into v_area from public.brand_locations where slug=lower(p_area_slug) and kind='area' and is_active and (v_city.id is null or parent_city_id=v_city.id); end if;
  if v_city.id is not null then select * into v_city_override from public.brand_location_overrides where location_id=v_city.id and status='published'; end if;
  if v_area.id is not null then select * into v_area_override from public.brand_location_overrides where location_id=v_area.id and status='published'; end if;
  select * into v_brand from public.marketplace_brands where id=coalesce(v_area_override.brand_id,v_city_override.brand_id,v_default.id) and status='published';
  if not found then v_brand:=v_default; end if;
  if v_area_override.id is not null then v_override:=v_area_override;
  elsif v_city_override.id is not null and (v_city_override.brand_id is null or v_city_override.brand_id=v_brand.id) then v_override:=v_city_override;
  end if;
  return to_jsonb(v_brand) || jsonb_build_object('resolved_city_slug',v_city.slug,'resolved_area_slug',v_area.slug,'hero_desktop_url',coalesce(v_override.hero_desktop_url,v_brand.hero_desktop_url),'hero_mobile_url',coalesce(v_override.hero_mobile_url,v_brand.hero_mobile_url),'hero_eyebrow',coalesce(v_override.hero_eyebrow,v_brand.hero_eyebrow),'hero_headline',coalesce(v_override.hero_headline,v_brand.hero_headline),'hero_description',coalesce(v_override.hero_description,v_brand.hero_description),'hero_cta_label',coalesce(v_override.hero_cta_label,v_brand.hero_cta_label),'hero_cta_url',coalesce(v_override.hero_cta_url,v_brand.hero_cta_url),'hero_alt_text',coalesce(v_override.hero_alt_text,v_brand.hero_alt_text));
end; $$;
revoke all on function public.resolve_marketplace_brand(text,text) from public;
grant execute on function public.resolve_marketplace_brand(text,text) to anon,authenticated;

notify pgrst, 'reload schema';
