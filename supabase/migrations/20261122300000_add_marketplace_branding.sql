-- NTN-BZR-3: managed public marketplace branding. Brand profiles are editable by
-- active platform administrators only; anonymous visitors can read the published
-- default profile and never drafts.
create table if not exists public.marketplace_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_bn text not null check (char_length(btrim(name_bn)) between 1 and 120),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  tagline_bn text not null default '' check (char_length(tagline_bn) <= 240),
  tagline_en text not null default '' check (char_length(tagline_en) <= 240),
  primary_color text not null default '#315B42' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#89A653' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  surface_color text not null default '#F7F8F3' check (surface_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  icon_url text,
  hero_desktop_url text,
  hero_mobile_url text,
  hero_eyebrow text not null default '',
  hero_headline text not null default '',
  hero_description text not null default '',
  hero_cta_label text not null default '',
  hero_cta_url text not null default '',
  hero_alt_text text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_default boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null
);

create unique index if not exists marketplace_brands_one_published_default_idx
  on public.marketplace_brands ((is_default)) where is_default and status = 'published';

alter table public.marketplace_brands enable row level security;

create policy "public reads published default marketplace brand"
  on public.marketplace_brands for select to anon, authenticated
  using (status = 'published' and is_default);

create policy "admins read all marketplace brands"
  on public.marketplace_brands for select to authenticated
  using ((select public.is_admin()));

-- Reuse the platform audit infrastructure created for administrator-managed data.
drop trigger if exists marketplace_brands_audit_metadata on public.marketplace_brands;
create trigger marketplace_brands_audit_metadata
  before insert or update on public.marketplace_brands
  for each row execute function public.set_admin_audit_metadata();
drop trigger if exists marketplace_brands_admin_activity on public.marketplace_brands;
create trigger marketplace_brands_admin_activity
  after insert or update or delete on public.marketplace_brands
  for each row execute function public.record_admin_activity();

create or replace function public.save_marketplace_brand(
  p_id uuid,
  p_slug text,
  p_name_bn text,
  p_name_en text,
  p_tagline_bn text,
  p_tagline_en text,
  p_primary_color text,
  p_accent_color text,
  p_surface_color text,
  p_logo_url text,
  p_icon_url text,
  p_hero_desktop_url text,
  p_hero_mobile_url text,
  p_hero_eyebrow text,
  p_hero_headline text,
  p_hero_description text,
  p_hero_cta_label text,
  p_hero_cta_url text,
  p_hero_alt_text text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Brand slug must use lowercase letters, numbers, and hyphens';
  end if;
  if coalesce(p_primary_color, '') !~ '^#[0-9A-Fa-f]{6}$'
    or coalesce(p_accent_color, '') !~ '^#[0-9A-Fa-f]{6}$'
    or coalesce(p_surface_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Theme colours must be six-digit hex values';
  end if;
  if coalesce(p_hero_cta_url, '') <> '' and p_hero_cta_url !~ '^(/[^[:space:]]*|https://[^[:space:]]+)$' then
    raise exception 'CTA destination must be a relative path or HTTPS URL';
  end if;

  if p_id is null then
    insert into public.marketplace_brands (
      slug, name_bn, name_en, tagline_bn, tagline_en, primary_color, accent_color, surface_color,
      logo_url, icon_url, hero_desktop_url, hero_mobile_url, hero_eyebrow, hero_headline,
      hero_description, hero_cta_label, hero_cta_url, hero_alt_text, created_by, updated_by
    ) values (
      v_slug, btrim(p_name_bn), btrim(p_name_en), btrim(coalesce(p_tagline_bn, '')),
      btrim(coalesce(p_tagline_en, '')), upper(p_primary_color), upper(p_accent_color), upper(p_surface_color),
      nullif(btrim(coalesce(p_logo_url, '')), ''), nullif(btrim(coalesce(p_icon_url, '')), ''),
      nullif(btrim(coalesce(p_hero_desktop_url, '')), ''), nullif(btrim(coalesce(p_hero_mobile_url, '')), ''),
      btrim(coalesce(p_hero_eyebrow, '')), btrim(coalesce(p_hero_headline, '')),
      btrim(coalesce(p_hero_description, '')), btrim(coalesce(p_hero_cta_label, '')),
      btrim(coalesce(p_hero_cta_url, '')), btrim(coalesce(p_hero_alt_text, '')), auth.uid(), auth.uid()
    ) returning id into v_id;
  else
    update public.marketplace_brands
    set slug = v_slug, name_bn = btrim(p_name_bn), name_en = btrim(p_name_en),
      tagline_bn = btrim(coalesce(p_tagline_bn, '')), tagline_en = btrim(coalesce(p_tagline_en, '')),
      primary_color = upper(p_primary_color), accent_color = upper(p_accent_color), surface_color = upper(p_surface_color),
      logo_url = nullif(btrim(coalesce(p_logo_url, '')), ''), icon_url = nullif(btrim(coalesce(p_icon_url, '')), ''),
      hero_desktop_url = nullif(btrim(coalesce(p_hero_desktop_url, '')), ''),
      hero_mobile_url = nullif(btrim(coalesce(p_hero_mobile_url, '')), ''),
      hero_eyebrow = btrim(coalesce(p_hero_eyebrow, '')), hero_headline = btrim(coalesce(p_hero_headline, '')),
      hero_description = btrim(coalesce(p_hero_description, '')), hero_cta_label = btrim(coalesce(p_hero_cta_label, '')),
      hero_cta_url = btrim(coalesce(p_hero_cta_url, '')), hero_alt_text = btrim(coalesce(p_hero_alt_text, '')),
      updated_at = now(), updated_by = auth.uid()
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Brand profile not found'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_marketplace_brand(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.save_marketplace_brand(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.publish_marketplace_brand(p_id uuid, p_make_default boolean default true)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_brand public.marketplace_brands%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_brand from public.marketplace_brands where id = p_id for update;
  if not found then raise exception 'Brand profile not found'; end if;
  if v_brand.name_bn = '' or v_brand.name_en = '' then raise exception 'Bengali and English names are required'; end if;

  if p_make_default then
    update public.marketplace_brands set is_default = false, updated_at = now(), updated_by = auth.uid()
    where is_default and id <> p_id;
  end if;
  update public.marketplace_brands
  set status = 'published', is_default = p_make_default or is_default, published_at = now(),
    published_by = auth.uid(), updated_at = now(), updated_by = auth.uid()
  where id = p_id;
end;
$$;
revoke all on function public.publish_marketplace_brand(uuid, boolean) from public;
grant execute on function public.publish_marketplace_brand(uuid, boolean) to authenticated;

-- Seed the editable Notun Bazar identity as the first safe public fallback.
insert into public.marketplace_brands (
  slug, name_bn, name_en, tagline_bn, tagline_en, primary_color, accent_color, surface_color,
  icon_url, hero_desktop_url, hero_mobile_url, hero_eyebrow, hero_headline, hero_description,
  hero_cta_label, hero_cta_url, hero_alt_text, status, is_default, published_at
) values (
  'notun-bazar', 'নতুন বাজার', 'Notun Bazar', 'পাড়ার দোকান, হাতের কাছে।', 'Neighbourhood shops, within reach.',
  '#315B42', '#89A653', '#F7F8F3', '/images/notun-bazar-location.png',
  '/images/notun-bazar-banner.png', '/images/notun-bazar-banner2.png', 'আপনার পাড়ার বাজার',
  'Little shops. Big discoveries.', 'Shop independent stores around you and get it delivered today.',
  'Explore nearby finds', '#nearby-finds', 'Notun Bazar neighbourhood marketplace', 'published', true, now()
) on conflict (slug) do nothing;

notify pgrst, 'reload schema';
