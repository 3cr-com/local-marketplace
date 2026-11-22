import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
type GuestCheckout = { email?: string; phone: string; fullName: string; shopId: string; addressId?: string; address?: Record<string, unknown>; items: Array<{ productId: string; quantity: number }> }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const input = await request.json() as GuestCheckout
    if (!input.phone?.trim() || !input.fullName?.trim() || !input.shopId || !Array.isArray(input.items) || !input.items.length) throw new Error('Name, phone, shop, and cart items are required')
    const url = Deno.env.get('SUPABASE_URL')!; const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const email = input.email?.trim().toLowerCase() || `guest-${crypto.randomUUID()}@guest.local`
    const digits = input.phone.replace(/\D/g, '')
    const phone = input.phone.trim().startsWith('+') ? input.phone.trim() : digits.length === 10 ? `+91${digits}` : `+${digits}`
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter a valid phone number with country code, for example +91 98765 43210')
    const { data: userResult, error: userError } = await admin.auth.admin.createUser({ email, phone, email_confirm: Boolean(input.email), phone_confirm: false, user_metadata: { full_name: input.fullName.trim(), guest: true } })
    if (userError || !userResult.user) throw new Error(userError?.message || 'Unable to create guest customer')
    try {
      const { error: profileError } = await admin.from('profiles').update({ full_name: input.fullName.trim(), phone }).eq('id', userResult.user.id)
      if (profileError) throw profileError
      let addressId = input.addressId
      if (!addressId || input.address) {
        const a = input.address || {}; const { data, error } = await admin.rpc('create_guest_delivery_address_and_order', { p_customer_id: userResult.user.id, p_shop_id: input.shopId, p_items: input.items.map(item => ({ product_id: item.productId, quantity: item.quantity })), p_label: a.label || 'Delivery', p_recipient_name: input.fullName, p_phone: phone, p_address_line_1: a.addressLine1, p_address_line_2: a.addressLine2 || null, p_locality: a.locality || null, p_landmark: a.landmark || null, p_city: a.city, p_district: a.district || null, p_state: a.state, p_country: a.country || 'India', p_pincode: a.pincode, p_latitude: a.latitude, p_longitude: a.longitude })
        if (error) throw error
        return Response.json({ orderId: data, customerId: userResult.user.id }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      throw new Error('A complete delivery address is required for guest checkout')
    } catch (error) { await admin.auth.admin.deleteUser(userResult.user.id); throw error }
  } catch (error) {
    const failure = error as { message?: string; code?: string; details?: string; hint?: string }
    return Response.json({ error: failure?.message || 'Guest checkout failed', code: failure?.code || null, details: failure?.details || null, hint: failure?.hint || null }, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
