import { supabase } from '@/lib/supabase/browser'

export async function placeCodOrder(shopId: string, addressId: string, items: Array<{ productId: string; quantity: number }>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('place_cod_order', {
    p_shop_id: shopId, p_address_id: addressId,
    p_items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })),
  })
  if (error) throw error
  return data as string
}

export type DeliveryQuote = { distance_meters: number; delivery_fee_paise: number }

export async function quoteCodDelivery(shopId: string, values: { addressId?: string; latitude?: number; longitude?: number }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('quote_cod_delivery', {
    p_shop_id: shopId,
    p_address_id: values.addressId || null,
    p_latitude: values.latitude ?? null,
    p_longitude: values.longitude ?? null,
  })
  if (error) throw error
  return ((data || [])[0] || null) as DeliveryQuote | null
}

export async function updateVendorOrderStatus(orderId: string, nextStatus: string, cancellationReason?: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_vendor_order_status', { p_order_id: orderId, p_next_status: nextStatus, p_cancellation_reason: cancellationReason || null })
  if (error) throw error
}

export type LiveOrder = { id: string; status: string; created_at: string; total_paise: number; subtotal_paise: number; delivery_fee_paise: number; delivery_address: string; payment_status: string; shops: { name: string } | null; order_items: Array<{ quantity: number; unit_price_paise: number; products: { name: string } | null }> }

async function loadOrders() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('orders').select('id,status,created_at,total_paise,subtotal_paise,delivery_fee_paise,delivery_address,payment_status,shops(name),order_items(quantity,unit_price_paise,products(name))').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as LiveOrder[]
}

export async function loadMyCustomerOrders() { return loadOrders() }
export async function loadMyVendorOrders() { return loadOrders() }
