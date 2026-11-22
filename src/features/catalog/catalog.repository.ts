import { supabase } from '@/lib/supabase/browser'
import type { CatalogProduct, CatalogRow } from './models/catalog'

function shopOpenNow(shop: CatalogRow['shops']) {
  if (!shop || shop.temporarily_closed) return false
  const zone = shop.timezone || 'Asia/Kolkata'
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(value('weekday')) + 1
  if ((shop.closed_weekdays || []).includes(day)) return false
  const now = `${value('hour')}:${value('minute')}`
  const opens = (shop.opens_at || '09:00').slice(0, 5)
  const closes = (shop.closes_at || '21:00').slice(0, 5)
  if (opens === closes) return true
  return opens < closes ? now >= opens && now < closes : now >= opens || now < closes
}

export async function loadCatalog(): Promise<CatalogProduct[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('products')
    .select('id,name,description,category,price_paise,stock,image_url,shops!inner(id,name,opens_at,closes_at,closed_weekdays,temporarily_closed,timezone)')
    .eq('is_active', true).gt('stock', 0).limit(48)
  if (error) throw error
  const rows = data as CatalogRow[]
  const fallbackAvailability = new Map(rows.map((product) => [product.shops?.id || '', shopOpenNow(product.shops)]))
  const shopIds = [...new Set(rows.map((product) => product.shops?.id).filter((id): id is string => Boolean(id)))]
  const { data: availability, error: availabilityError } = await supabase.rpc('catalog_shop_availability', { p_shop_ids: shopIds })
  const availabilityByShop = availabilityError
    ? fallbackAvailability
    : new Map((availability || []).map((row: { shop_id: string; accepting_orders: boolean }) => [row.shop_id, row.accepting_orders]))
  return rows.map((product) => {
    const acceptingOrders = availabilityByShop.get(product.shops?.id || '') ?? shopOpenNow(product.shops)
    return ({
    id: product.id, name: product.name, detail: product.description || 'Available today',
    price: Math.round(product.price_paise / 100), category: product.category,
    shop: product.shops?.name || 'Local shop', shopId: product.shops?.id || '', distance: 'Nearby',
    image: product.image_url || '/images/3cr-fresh-produce.png',
    badge: acceptingOrders ? (product.stock <= 5 ? 'Limited stock' : 'Available today') : 'Closed now', color: 'green', shopOpen: acceptingOrders,
  })
  })
}

export async function loadNearbyCatalog(latitude: number, longitude: number, radiusKm = 10, query = ''): Promise<CatalogProduct[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('nearby_catalog', { p_latitude: latitude, p_longitude: longitude, p_radius_meters: radiusKm * 1000, p_query: query })
  if (error) throw error
  return (data || []).map((product: { id: string; name: string; description: string; category: string; price_paise: number; stock: number; image_url: string | null; shop_id: string; shop_name: string; distance_meters: number }) => ({ id: product.id, name: product.name, detail: product.description || 'Available today', price: Math.round(product.price_paise / 100), category: product.category, shop: product.shop_name, shopId: product.shop_id, distance: `${(product.distance_meters / 1000).toFixed(1)} km`, image: product.image_url || '/images/3cr-fresh-produce.png', badge: product.stock <= 5 ? 'Limited stock' : 'Available today', color: 'green' }))
}
