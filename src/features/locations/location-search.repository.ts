import { supabase } from '@/lib/supabase/browser'

export type LocationSearchResult = { displayName: string; latitude: number; longitude: number; city?: string; state?: string; pincode?: string }

export async function searchShopAddress(query: string, scope: 'shop' | 'delivery' = 'shop'): Promise<LocationSearchResult[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('location-search', { body: { query, scope } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return (data?.results || []) as LocationSearchResult[]
}
