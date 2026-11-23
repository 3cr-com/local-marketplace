import { supabase } from '@/lib/supabase/browser'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxBytes = 5 * 1024 * 1024

export async function uploadMarketplaceImage(file: File, kind: 'profile' | 'shop') {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!allowedTypes.includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.')
  if (file.size > maxBytes) throw new Error('Image must be 5 MB or smaller.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in before uploading an image.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${auth.user.id}/${kind}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('marketplace-images').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from('marketplace-images').getPublicUrl(path).data.publicUrl
}
