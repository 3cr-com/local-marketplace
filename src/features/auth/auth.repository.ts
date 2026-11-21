import { supabase } from '@/lib/supabase/browser'
import type { UserProfile } from './models/profile'

export async function loadMyProfile(): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null
  const { data, error } = await supabase.from('profiles').select('id,full_name,role,seller_enabled').eq('id', auth.user.id).maybeSingle()
  if (error) throw error
  return data as UserProfile | null
}
