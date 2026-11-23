import { supabase } from '@/lib/supabase/browser'

export type DiscoveryProduct = {
  id: string
  name: string
  description: string | null
  category: string
  price_paise: number
  stock: number
  image_url: string | null
  shop_id: string
  shop_name: string
}

export type DiscoveryShop = {
  id: string
  name: string
  category: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  image_url: string | null
  owner_name: string | null
  owner_avatar_url: string | null
}

export type PublicShopfront = {
  shop: DiscoveryShop & {
    description?: string | null
    opens_at?: string | null
    closes_at?: string | null
    timezone?: string | null
    categories?: string[]
  }
  products: DiscoveryProduct[]
}

function asProduct(value: Record<string, unknown>): DiscoveryProduct {
  return {
    id: String(value.id), name: String(value.name || 'Untitled product'), description: typeof value.description === 'string' ? value.description : null,
    category: String(value.category || 'General'), price_paise: Number(value.price_paise || 0), stock: Number(value.stock || 0),
    image_url: typeof value.image_url === 'string' ? value.image_url : null, shop_id: String(value.shop_id || ''), shop_name: String(value.shop_name || 'Local shop'),
  }
}

function asShop(value: Record<string, unknown>): DiscoveryShop {
  return {
    id: String(value.id), name: String(value.name || 'Local shop'), category: typeof value.category === 'string' ? value.category : null,
    address: typeof value.address === 'string' ? value.address : null, city: typeof value.city === 'string' ? value.city : null,
    state: typeof value.state === 'string' ? value.state : null, pincode: typeof value.pincode === 'string' ? value.pincode : null,
    image_url: typeof value.image_url === 'string' ? value.image_url : null, owner_name: typeof value.owner_name === 'string' ? value.owner_name : null,
    owner_avatar_url: typeof value.owner_avatar_url === 'string' ? value.owner_avatar_url : null,
  }
}

export async function searchMarketplace(query: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('search_marketplace', { p_query: query.trim(), p_limit: 50 })
  if (error) throw error
  const result = (data || {}) as { products?: Record<string, unknown>[]; shops?: Record<string, unknown>[] }
  return { products: (result.products || []).map(asProduct), shops: (result.shops || []).map(asShop) }
}

export async function loadPublicShopfront(shopId: string): Promise<PublicShopfront | null> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('get_public_shopfront', { p_shop_id: shopId })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  const result = data as { shop?: Record<string, unknown>; products?: Record<string, unknown>[] }
  if (!result.shop) return null
  const shop = asShop(result.shop) as PublicShopfront['shop']
  shop.description = typeof result.shop.description === 'string' ? result.shop.description : null
  shop.opens_at = typeof result.shop.opens_at === 'string' ? result.shop.opens_at : null
  shop.closes_at = typeof result.shop.closes_at === 'string' ? result.shop.closes_at : null
  shop.timezone = typeof result.shop.timezone === 'string' ? result.shop.timezone : null
  shop.categories = Array.isArray(result.shop.categories) ? result.shop.categories.filter((item): item is string => typeof item === 'string') : []
  return { shop, products: (result.products || []).map((product) => asProduct({ ...product, shop_id: shop.id, shop_name: shop.name })) }
}
