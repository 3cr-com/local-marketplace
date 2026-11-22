import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { query, scope = 'delivery' } = await request.json() as { query?: string; scope?: 'shop' | 'delivery' }
    if (scope !== 'shop' && scope !== 'delivery') throw new Error('Invalid address-search scope')
    if (scope === 'shop') {
      const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
      const { data: { user }, error: authError } = await authClient.auth.getUser()
      if (authError || !user) throw new Error('Sign in as a seller to search a shop address')
      const { data: profile } = await admin.from('profiles').select('seller_enabled,seller_access_active').eq('id', user.id).maybeSingle()
      if (!profile?.seller_enabled || profile.seller_access_active === false) throw new Error('An active seller account is required to search shop addresses')
    }
    const normalized = String(query || '').trim().replace(/\s+/g, ' ').toLowerCase()
    if (normalized.length < 6) throw new Error('Enter a more complete address before searching')
    const { data: cached } = await admin.from('location_search_cache').select('results').eq('normalized_query', normalized).gt('expires_at', new Date().toISOString()).maybeSingle()
    if (cached?.results) return Response.json({ results: cached.results, cached: true }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(normalized)}`, { headers: { 'User-Agent': 'NotunBazar/1.0 (seller-address-search)' } })
    if (!response.ok) throw new Error('Address search is temporarily unavailable. Enter coordinates manually or try again later.')
    const raw = await response.json() as Array<{ display_name: string; lat: string; lon: string; address?: Record<string, string> }>
    const results = raw.map((item) => ({ displayName: item.display_name, latitude: Number(item.lat), longitude: Number(item.lon), city: item.address?.city || item.address?.town || item.address?.village || '', state: item.address?.state || '', pincode: item.address?.postcode || '' }))
    await admin.from('location_search_cache').upsert({ normalized_query: normalized, results, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
    return Response.json({ results, cached: false }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Address search failed' }, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
