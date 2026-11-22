import { supabase } from '@/lib/supabase/browser'
import { fallbackMarketplaceBrand, type MarketplaceBrand } from './models/marketplace-brand'

const brandFields = 'id,slug,name_bn,name_en,tagline_bn,tagline_en,primary_color,accent_color,surface_color,logo_url,icon_url,hero_desktop_url,hero_mobile_url,hero_slide_urls,hero_eyebrow,hero_headline,hero_description,hero_cta_label,hero_cta_url,hero_alt_text,status,is_default,published_at,updated_at'

export type BrandInput = Omit<MarketplaceBrand, 'id' | 'status' | 'is_default' | 'published_at' | 'updated_at'>

export async function loadPublishedMarketplaceBrand(): Promise<MarketplaceBrand> {
  if (!supabase) return fallbackMarketplaceBrand
  const { data, error } = await supabase.from('marketplace_brands').select(brandFields).eq('status', 'published').eq('is_default', true).maybeSingle()
  if (error || !data) return fallbackMarketplaceBrand
  return data as MarketplaceBrand
}

export async function resolveMarketplaceBrand(citySlug?: string | null, areaSlug?: string | null): Promise<MarketplaceBrand> {
  if (!supabase) return fallbackMarketplaceBrand
  const { data, error } = await supabase.rpc('resolve_marketplace_brand', { p_city_slug: citySlug || null, p_area_slug: areaSlug || null })
  if (error || !data) return fallbackMarketplaceBrand
  return data as MarketplaceBrand
}

export type BrandLocation = { id: string; slug: string; kind: 'city' | 'area'; parent_city_id: string | null; name_bn: string; name_en: string; is_active: boolean }
export type BrandLocationOverride = { location_id: string; brand_id: string | null; hero_desktop_url: string | null; hero_mobile_url: string | null; hero_eyebrow: string | null; hero_headline: string | null; hero_description: string | null; hero_cta_label: string | null; hero_cta_url: string | null; hero_alt_text: string | null; status: 'draft' | 'published' }

export async function loadBrandLocations(): Promise<BrandLocation[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('brand_locations').select('id,slug,kind,parent_city_id,name_bn,name_en,is_active').order('kind').order('name_en')
  if (error) throw error
  return (data || []) as BrandLocation[]
}

export async function loadBrandLocationOverrides(): Promise<BrandLocationOverride[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('brand_location_overrides').select('location_id,brand_id,hero_desktop_url,hero_mobile_url,hero_eyebrow,hero_headline,hero_description,hero_cta_label,hero_cta_url,hero_alt_text,status')
  if (error) throw error
  return (data || []) as BrandLocationOverride[]
}

export async function saveBrandLocation(location: Omit<BrandLocation, 'id'>, id?: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('save_brand_location', { p_id: id || null, p_slug: location.slug, p_kind: location.kind, p_parent_city_id: location.parent_city_id, p_name_bn: location.name_bn, p_name_en: location.name_en, p_is_active: location.is_active })
  if (error) throw error
  return data as string
}

export async function saveBrandLocationOverride(override: BrandLocationOverride) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('save_brand_location_override', { p_location_id: override.location_id, p_brand_id: override.brand_id, p_hero_desktop_url: override.hero_desktop_url || '', p_hero_mobile_url: override.hero_mobile_url || '', p_hero_eyebrow: override.hero_eyebrow || '', p_hero_headline: override.hero_headline || '', p_hero_description: override.hero_description || '', p_hero_cta_label: override.hero_cta_label || '', p_hero_cta_url: override.hero_cta_url || '', p_hero_alt_text: override.hero_alt_text || '', p_status: override.status })
  if (error) throw error
}

export async function loadMarketplaceBrands(): Promise<MarketplaceBrand[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('marketplace_brands').select(brandFields).order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []) as MarketplaceBrand[]
}

export async function saveMarketplaceBrand(brand: BrandInput, id?: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('save_marketplace_brand', {
    p_id: id || null,
    p_slug: brand.slug,
    p_name_bn: brand.name_bn,
    p_name_en: brand.name_en,
    p_tagline_bn: brand.tagline_bn,
    p_tagline_en: brand.tagline_en,
    p_primary_color: brand.primary_color,
    p_accent_color: brand.accent_color,
    p_surface_color: brand.surface_color,
    p_logo_url: brand.logo_url || '',
    p_icon_url: brand.icon_url || '',
    p_hero_desktop_url: brand.hero_desktop_url || '',
    p_hero_mobile_url: brand.hero_mobile_url || '',
    p_hero_eyebrow: brand.hero_eyebrow,
    p_hero_headline: brand.hero_headline,
    p_hero_description: brand.hero_description,
    p_hero_cta_label: brand.hero_cta_label,
    p_hero_cta_url: brand.hero_cta_url,
    p_hero_alt_text: brand.hero_alt_text,
  })
  if (error) throw error
  return data as string
}

export async function saveMarketplaceBrandSlides(brandId: string, urls: string[]) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('save_marketplace_brand_slides', { p_brand_id: brandId, p_urls: urls })
  if (error) throw error
}

export async function publishMarketplaceBrand(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('publish_marketplace_brand', { p_id: id, p_make_default: true })
  if (error) throw error
}
