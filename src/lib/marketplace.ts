import { supabase } from './supabase'

export type CatalogProduct = {
  id: string
  name: string
  detail: string
  price: number
  category: string
  shop: string
  shopId: string
  distance: string
  image: string
  badge: string
  color: string
}

type CatalogRow = {
  id: string; name: string; description: string; category: string; price_paise: number; stock: number; image_url: string | null
  shops: { id: string; name: string } | null
}

export async function loadCatalog(): Promise<CatalogProduct[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,category,price_paise,stock,image_url,shops!inner(id,name)')
    .eq('is_active', true)
    .gt('stock', 0)
    .limit(48)
  if (error) throw error
  return (data as CatalogRow[]).map((product) => ({
    id: product.id,
    name: product.name,
    detail: product.description || 'Available today',
    price: Math.round(product.price_paise / 100),
    category: product.category,
    shop: product.shops?.name || 'Local shop',
    shopId: product.shops?.id || '',
    distance: 'Nearby',
    image: product.image_url || '/images/3cr-fresh-produce.png',
    badge: product.stock <= 5 ? 'Limited stock' : 'Available today',
    color: 'green',
  }))
}

export async function placeCodOrder(shopId: string, deliveryAddress: string, items: Array<{ productId: string; quantity: number }>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('place_cod_order', {
    p_shop_id: shopId,
    p_delivery_address: deliveryAddress.trim(),
    p_items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })),
  })
  if (error) throw error
  return data as string
}

export async function submitVendorApplication(application: { shopName: string; category: string; address: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in before applying as a shop.')
  const { error } = await supabase.from('vendor_applications').insert({
    owner_id: auth.user.id,
    shop_name: application.shopName.trim(),
    category: application.category.trim(),
    address: application.address.trim(),
  })
  if (error) throw error
}

export async function updateVendorOrderStatus(orderId: string, nextStatus: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_vendor_order_status', { p_order_id: orderId, p_next_status: nextStatus })
  if (error) throw error
}

export type VendorShop = { id: string; name: string }
export type VendorProduct = {
  id: string; name: string; description: string; category: string; price_paise: number
  stock: number; image_url: string | null; is_active: boolean
}

export async function loadMyShops(userId: string): Promise<VendorShop[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('shops').select('id,name').eq('owner_id', userId).order('name')
  if (error) throw error
  return data as VendorShop[]
}

export async function loadVendorProducts(shopId: string): Promise<VendorProduct[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('products').select('id,name,description,category,price_paise,stock,image_url,is_active').eq('shop_id', shopId).order('created_at', { ascending: false })
  if (error) throw error
  return data as VendorProduct[]
}

export async function saveVendorProduct(shopId: string, product: Omit<VendorProduct, 'id'> & { id?: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const values = {
    shop_id: shopId, name: product.name.trim(), description: product.description.trim(), category: product.category.trim(),
    price_paise: product.price_paise, stock: product.stock, image_url: product.image_url?.trim() || null, is_active: product.is_active,
  }
  const query = product.id
    ? supabase.from('products').update(values).eq('id', product.id).select().single()
    : supabase.from('products').insert(values).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as VendorProduct
}

export async function removeVendorProduct(productId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export type UserProfile = { id: string; full_name: string; role: 'customer' | 'vendor' | 'admin'; account_type: 'buyer' | 'seller'; seller_enabled: boolean }
export type VendorApplication = { id: string; owner_id: string; shop_name: string; category: string; address: string; status: string; created_at: string }

export async function loadMyProfile(): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.from('profiles').select('id,full_name,role,account_type,seller_enabled').eq('id', auth.user.id).maybeSingle()
  if (error) throw error
  return data as UserProfile | null
}

export async function loadVendorApplications(): Promise<VendorApplication[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('vendor_applications').select('id,owner_id,shop_name,category,address,status,created_at').order('created_at', { ascending: true })
  if (error) throw error
  return data as VendorApplication[]
}

export async function reviewVendorApplication(applicationId: string, decision: 'approved' | 'rejected', reason = '') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('review_vendor_application', { p_application_id: applicationId, p_decision: decision, p_reason: reason.trim() || null })
  if (error) throw error
}

export async function requestSellerMode() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('request_seller_mode')
  if (error) throw error
  return data as boolean
}

export async function activateSellerMode() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('activate_seller_mode')
  if (error) throw error
}

export async function disableSellerMode() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('disable_seller_mode')
  if (error) throw error
}

export async function createSelfServiceShop(shop: { name: string; category: string; address: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('create_self_service_shop', { p_name: shop.name, p_category: shop.category, p_address: shop.address })
  if (error) throw error
  return data as string
}
