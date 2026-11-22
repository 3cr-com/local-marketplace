export type UserRole = 'customer' | 'vendor' | 'admin' | 'super_admin'

export type UserProfile = {
  id: string
  full_name: string
  role: UserRole
  seller_enabled: boolean
  seller_requested?: boolean
  phone?: string | null
  preferred_latitude?: number | null
  preferred_longitude?: number | null
}
