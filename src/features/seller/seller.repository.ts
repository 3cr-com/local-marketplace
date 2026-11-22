import { supabase } from '@/lib/supabase/browser'
import type { SellerShopInput, VendorProduct, VendorShop } from './models/seller'

export async function loadMyShops(userId: string): Promise<VendorShop[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('shops').select('id,name,category,address,is_active,opens_at,closes_at,closed_weekdays,temporarily_closed,primary_category_id,location,shop_categories(category_id,categories(name))').eq('owner_id', userId).order('name')
  if (error) throw error
  return data as VendorShop[]
}

export type ShopPickupAddress = { shop_id: string; shop_name: string; address_line_1: string; address_line_2?: string | null; locality?: string | null; landmark?: string | null; city: string; district?: string | null; state: string; country?: string | null; pincode: string; latitude: number; longitude: number }

export async function loadMyShopPickupAddresses() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('list_my_shop_pickup_addresses')
  if (error) throw error
  return (data || []) as ShopPickupAddress[]
}

export async function loadMyShopPickupAddress(shopId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('get_my_shop_pickup_address', { p_shop_id: shopId }).maybeSingle()
  if (error) throw error
  return data as Omit<ShopPickupAddress, 'shop_id' | 'shop_name'> | null
}

export async function loadVendorProducts(shopId: string): Promise<VendorProduct[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('products').select('id,name,description,category,category_id,subcategory_id,brand_id,price_paise,stock,image_url,is_active').eq('shop_id', shopId).order('created_at', { ascending: false })
  if (error) throw error
  return data as VendorProduct[]
}

export async function loadVendorProduct(productId: string): Promise<(VendorProduct & { shop_id: string }) | null> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('products').select('id,shop_id,name,description,category,category_id,subcategory_id,brand_id,price_paise,stock,image_url,is_active').eq('id', productId).maybeSingle()
  if (error) throw error
  return data as (VendorProduct & { shop_id: string }) | null
}

export async function saveVendorProduct(shopId: string, product: Omit<VendorProduct, 'id'> & { id?: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const values = { shop_id: shopId, name: product.name.trim(), description: product.description.trim(), category: product.category.trim(), category_id: product.category_id || null, subcategory_id: product.subcategory_id || null, brand_id: product.brand_id || null, price_paise: product.price_paise, stock: product.stock, image_url: product.image_url?.trim() || null, is_active: product.is_active }
  const query = product.id ? supabase.from('products').update(values).eq('id', product.id).select().single() : supabase.from('products').insert(values).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as VendorProduct
}

export async function removeVendorProduct(productId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('products').delete().eq('id', productId)
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

export async function createSelfServiceShop(shop: SellerShopInput) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const address = shop.address
  const { data, error } = await supabase.rpc('create_self_service_shop', {
    p_name: shop.name, p_category: shop.category, p_category_id: shop.categoryId,
    p_address_line_1: address.addressLine1, p_address_line_2: address.addressLine2 || null, p_locality: address.locality || null, p_landmark: address.landmark || null,
    p_city: address.city, p_district: address.district || null, p_state: address.state, p_country: address.country || 'India', p_pincode: address.pincode,
    p_latitude: address.latitude, p_longitude: address.longitude,
  })
  if (error) throw error
  return data as string
}

export async function updateSelfServiceShopAddress(shopId: string, address: SellerShopInput['address']) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_self_service_shop_address', { p_shop_id: shopId, p_address_line_1: address.addressLine1, p_address_line_2: address.addressLine2 || null, p_locality: address.locality || null, p_landmark: address.landmark || null, p_city: address.city, p_district: address.district || null, p_state: address.state, p_country: address.country || 'India', p_pincode: address.pincode, p_latitude: address.latitude, p_longitude: address.longitude })
  if (error) throw error
}

export async function updateSelfServiceShop(shopId: string, values: { name: string; categoryIds: string[]; isActive: boolean }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_self_service_shop', { p_shop_id: shopId, p_name: values.name, p_category_ids: values.categoryIds, p_is_active: values.isActive })
  if (error) throw error
}

export async function updateSelfServiceShopHours(shopId: string, values: { opensAt: string; closesAt: string; closedWeekdays: number[]; temporarilyClosed: boolean }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_self_service_shop_hours', { p_shop_id: shopId, p_opens_at: values.opensAt, p_closes_at: values.closesAt, p_closed_weekdays: values.closedWeekdays, p_temporarily_closed: values.temporarilyClosed })
  if (error) throw error
}

export async function deleteSelfServiceShop(shopId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('delete_self_service_shop', { p_shop_id: shopId })
  if (error) throw error
}

export async function submitVendorApplication(application: { shopName: string; category: string; address: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in before applying as a shop.')
  const { error } = await supabase.from('vendor_applications').insert({ owner_id: auth.user.id, shop_name: application.shopName.trim(), category: application.category.trim(), address: application.address.trim() })
  if (error) throw error
}
