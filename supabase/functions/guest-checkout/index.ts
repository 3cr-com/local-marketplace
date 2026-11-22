import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
type GuestCheckout = { email?: string; phone: string; fullName: string; shopId: string; address?: Record<string, unknown>; idempotencyKey: string; items: Array<{ productId: string; quantity: number }> }

async function contactHash(value: string, secret: string) {
  const data = new TextEncoder().encode(`${secret}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  let candidateCustomerId: string | null = null
  try {
    const input = await request.json() as GuestCheckout
    if (!input.phone?.trim() || !input.fullName?.trim() || !input.shopId || !Array.isArray(input.items) || !input.items.length) throw new Error('Name, phone, shop, and cart items are required')
    if (!isUuid(input.idempotencyKey || '')) throw new Error('Invalid checkout session. Refresh the page and try again.')
    const url = Deno.env.get('SUPABASE_URL')!; const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const contactSecret = Deno.env.get('GUEST_CONTACT_HASH_SECRET')
    if (!url || !serviceKey || !contactSecret) throw new Error('Guest checkout is temporarily unavailable. Please try again later.')
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const digits = input.phone.replace(/\D/g, '')
    const phone = input.phone.trim().startsWith('+') ? input.phone.trim() : digits.length === 10 ? `+91${digits}` : `+${digits}`
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter a valid phone number with country code, for example +91 98765 43210')
    const email = input.email?.trim().toLowerCase() || null
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
    const phoneHash = await contactHash(phone, contactSecret)
    const emailHash = email ? await contactHash(email, contactSecret) : null
    const { error: limitError } = await admin.rpc('enforce_guest_checkout_rate_limit', { p_contact_hash: phoneHash })
    if (limitError) throw limitError
    const { data: candidate, error: candidateError } = await admin.auth.admin.createUser({
      email: `guest-${crypto.randomUUID()}@guest.local`,
      email_confirm: true,
      user_metadata: { full_name: input.fullName.trim(), guest: true },
    })
    if (candidateError || !candidate.user) throw new Error(candidateError?.message || 'Unable to start guest checkout')
    candidateCustomerId = candidate.user.id
    const { data: identity, error: identityError } = await admin.rpc('resolve_guest_checkout_customer', {
      p_candidate_customer_id: candidateCustomerId, p_phone_hash: phoneHash, p_email_hash: emailHash,
    }).single()
    if (identityError || !identity?.customer_id) throw identityError || new Error('Unable to resolve guest customer')
    if (!identity.created) {
      await admin.auth.admin.deleteUser(candidateCustomerId)
      candidateCustomerId = null
    }
    const customerId = identity.customer_id as string
    const { error: profileError } = await admin.from('profiles').update({ full_name: input.fullName.trim(), phone }).eq('id', customerId)
    if (profileError) throw profileError
    if (!input.address) throw new Error('A complete delivery address is required for guest checkout')
    const a = input.address
    if (!a.addressLine1 || !a.city || !a.state || !a.pincode || a.latitude == null || a.longitude == null) {
      throw new Error('Enter a complete delivery address with your current location')
    }
    const { data: orderId, error: orderError } = await admin.rpc('create_guest_delivery_address_and_order', {
      p_customer_id: customerId, p_shop_id: input.shopId,
      p_items: input.items.map(item => ({ product_id: item.productId, quantity: item.quantity })),
      p_label: a.label || 'Delivery', p_recipient_name: input.fullName.trim(), p_phone: phone,
      p_address_line_1: a.addressLine1, p_address_line_2: a.addressLine2 || null,
      p_locality: a.locality || null, p_landmark: a.landmark || null, p_city: a.city,
      p_district: a.district || null, p_state: a.state, p_country: a.country || 'India',
      p_pincode: a.pincode, p_latitude: a.latitude, p_longitude: a.longitude,
      p_guest_checkout_key: input.idempotencyKey,
    })
    if (orderError) throw orderError
    return Response.json({ orderId, customerId }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    if (candidateCustomerId) {
      const url = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (url && serviceKey) await createClient(url, serviceKey).auth.admin.deleteUser(candidateCustomerId)
    }
    const failure = error as { message?: string; code?: string; details?: string; hint?: string }
    return Response.json({ error: failure?.message || 'Guest checkout failed', code: failure?.code || null, details: failure?.details || null, hint: failure?.hint || null }, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
