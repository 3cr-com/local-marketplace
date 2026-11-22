import { supabase } from '@/lib/supabase/browser'
import type { UserProfile } from './models/profile'

export async function loadMyProfile(): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null
  const { data, error } = await supabase.from('profiles').select('id,full_name,role,seller_enabled,seller_requested,phone,preferred_latitude,preferred_longitude').eq('id', auth.user.id).maybeSingle()
  if (error) throw error
  return data as UserProfile | null
}

export async function updateMyProfile(values: { fullName: string; phone: string; latitude?: number | null; longitude?: number | null }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('update_my_profile', { p_full_name: values.fullName, p_phone: values.phone, p_latitude: values.latitude ?? null, p_longitude: values.longitude ?? null })
  if (error) throw error
}
