import { supabase } from '@/lib/supabase/browser'
import type { CatalogProduct, CatalogRow } from './models/catalog'

export async function loadCatalog(): Promise<CatalogProduct[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('products')
    .select('id,name,description,category,price_paise,stock,image_url,shops!inner(id,name)')
    .eq('is_active', true).gt('stock', 0).limit(48)
  if (error) throw error
  return (data as CatalogRow[]).map((product) => ({
    id: product.id, name: product.name, detail: product.description || 'Available today',
    price: Math.round(product.price_paise / 100), category: product.category,
    shop: product.shops?.name || 'Local shop', shopId: product.shops?.id || '', distance: 'Nearby',
    image: product.image_url || '/images/3cr-fresh-produce.png',
    badge: product.stock <= 5 ? 'Limited stock' : 'Available today', color: 'green',
  }))
}

export async function loadNearbyCatalog(latitude: number, longitude: number, radiusKm = 10, query = ''): Promise<CatalogProduct[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('nearby_catalog', { p_latitude: latitude, p_longitude: longitude, p_radius_meters: radiusKm * 1000, p_query: query })
  if (error) throw error
  return (data || []).map((product: { id: string; name: string; description: string; category: string; price_paise: number; stock: number; image_url: string | null; shop_id: string; shop_name: string; distance_meters: number }) => ({ id: product.id, name: product.name, detail: product.description || 'Available today', price: Math.round(product.price_paise / 100), category: product.category, shop: product.shop_name, shopId: product.shop_id, distance: `${(product.distance_meters / 1000).toFixed(1)} km`, image: product.image_url || '/images/3cr-fresh-produce.png', badge: product.stock <= 5 ? 'Limited stock' : 'Available today', color: 'green' }))
}
