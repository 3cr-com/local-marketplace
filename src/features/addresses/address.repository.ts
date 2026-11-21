import { supabase } from '@/lib/supabase/browser'

export type DeliveryAddressInput = {
  label: string; recipientName: string; phone: string; addressLine1: string; addressLine2?: string
  locality?: string; landmark?: string; city: string; district?: string; state: string; country?: string
  pincode: string; latitude: number; longitude: number
}

export type DeliveryAddress = DeliveryAddressInput & { id: string; is_default: boolean }

export async function loadMyAddresses(): Promise<DeliveryAddress[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('delivery_addresses')
    .select('id,label,recipient_name,phone,address_line_1,address_line_2,locality,landmark,city,district,state,country,pincode,is_default')
    .order('is_default', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(row => ({ id: row.id, label: row.label, recipientName: row.recipient_name, phone: row.phone, addressLine1: row.address_line_1, addressLine2: row.address_line_2 || '', locality: row.locality || '', landmark: row.landmark || '', city: row.city, district: row.district || '', state: row.state, country: row.country || 'India', pincode: row.pincode, latitude: 0, longitude: 0, is_default: row.is_default }))
}

export async function createDeliveryAddress(address: DeliveryAddressInput) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('create_delivery_address', {
    p_label: address.label.trim(), p_recipient_name: address.recipientName.trim(), p_phone: address.phone.trim(),
    p_address_line_1: address.addressLine1.trim(), p_address_line_2: address.addressLine2?.trim() || null,
    p_locality: address.locality?.trim() || null, p_landmark: address.landmark?.trim() || null,
    p_city: address.city.trim(), p_district: address.district?.trim() || null, p_state: address.state.trim(),
    p_country: address.country?.trim() || 'India', p_pincode: address.pincode.trim(),
    p_latitude: address.latitude, p_longitude: address.longitude,
  })
  if (error) throw error
  return data as string
}

export async function setDefaultDeliveryAddress(addressId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('set_default_delivery_address', { p_address_id: addressId })
  if (error) throw error
}

export async function removeDeliveryAddress(addressId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('delivery_addresses').delete().eq('id', addressId)
  if (error) throw error
}
