export type MarketplaceBrand = {
  id: string
  slug: string
  name_bn: string
  name_en: string
  tagline_bn: string
  tagline_en: string
  primary_color: string
  accent_color: string
  surface_color: string
  logo_url: string | null
  icon_url: string | null
  hero_desktop_url: string | null
  hero_mobile_url: string | null
  hero_eyebrow: string
  hero_headline: string
  hero_description: string
  hero_cta_label: string
  hero_cta_url: string
  hero_alt_text: string
  status: 'draft' | 'published'
  is_default: boolean
  published_at: string | null
  updated_at: string
}

export const fallbackMarketplaceBrand: MarketplaceBrand = {
  id: 'built-in-notun-bazar',
  slug: 'notun-bazar',
  name_bn: 'নতুন বাজার',
  name_en: 'Notun Bazar',
  tagline_bn: 'পাড়ার দোকান, হাতের কাছে।',
  tagline_en: 'Neighbourhood shops, within reach.',
  primary_color: '#315B42',
  accent_color: '#89A653',
  surface_color: '#F7F8F3',
  logo_url: null,
  icon_url: '/images/notun-bazar-location.png',
  hero_desktop_url: '/images/notun-bazar-banner.png',
  hero_mobile_url: '/images/notun-bazar-banner2.png',
  hero_eyebrow: 'আপনার পাড়ার বাজার',
  hero_headline: 'Little shops. Big discoveries.',
  hero_description: 'Shop independent stores around you and get it delivered today.',
  hero_cta_label: 'Explore nearby finds',
  hero_cta_url: '#nearby-finds',
  hero_alt_text: 'Notun Bazar neighbourhood marketplace',
  status: 'published',
  is_default: true,
  published_at: null,
  updated_at: '',
}
