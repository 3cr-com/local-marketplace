import { supabase } from '@/lib/supabase/browser'
import type { VendorApplication } from './models/vendor-application'

export type ManagedAdmin = {
  id: string
  full_name: string
  phone: string | null
  role: 'admin' | 'super_admin'
  admin_access_active: boolean
  created_at: string
}

export type AdminCandidate = {
  id: string
  full_name: string
  phone: string | null
}

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

export async function loadManagedAdmins(): Promise<ManagedAdmin[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone,role,admin_access_active,created_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as ManagedAdmin[]
}

export async function loadAdminCandidates(): Promise<AdminCandidate[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone')
    .in('role', ['customer', 'vendor'])
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []) as AdminCandidate[]
}

export async function setAdminRole(userId: string, role: 'customer' | 'admin' | 'super_admin') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('set_admin_role', { p_user_id: userId, p_role: role })
  if (error) throw error
}

export async function setAdminAccessStatus(userId: string, isActive: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('set_admin_access_status', { p_user_id: userId, p_is_active: isActive })
  if (error) throw error
}

export async function loadAdminOperations() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [shopsResult, ordersResult, customersResult, applicationsResult] = await Promise.all([
    supabase.from('shops').select('id,name,category,address,is_active,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('orders').select('id,status,total_paise,created_at,delivery_address,shops(name)').order('created_at', { ascending: false }).limit(100),
    supabase.from('profiles').select('id,full_name,phone,created_at,seller_enabled').eq('role', 'customer').order('created_at', { ascending: false }).limit(100),
    supabase.from('vendor_applications').select('id,status').limit(100),
  ])
  const error = shopsResult.error || ordersResult.error || customersResult.error || applicationsResult.error
  if (error) throw error
  const people = customersResult.data || []
  return {
    shops: shopsResult.data || [],
    orders: ordersResult.data || [],
    customers: people.filter(person => !person.seller_enabled),
    vendors: people.filter(person => person.seller_enabled),
    pendingApplications: (applicationsResult.data || []).filter(item => item.status === 'pending').length,
  }
}
