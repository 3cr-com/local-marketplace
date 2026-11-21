export type UserRole = 'customer' | 'vendor' | 'admin'

export type UserProfile = {
  id: string
  full_name: string
  role: UserRole
  seller_enabled: boolean
}
