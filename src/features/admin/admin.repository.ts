import { supabase } from '@/lib/supabase/browser'
import type { VendorApplication } from './models/vendor-application'

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
