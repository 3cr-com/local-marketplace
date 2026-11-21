import { supabase } from '@/lib/supabase/browser'

export async function loadTaxonomy() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [{ data: categories, error: categoryError }, { data: subcategories, error: subcategoryError }, { data: brands, error: brandError }, { data: links, error: linkError }] = await Promise.all([
    supabase.from('categories').select('id,name').order('sort_order'),
    supabase.from('subcategories').select('id,category_id,name').order('sort_order'),
    supabase.from('brands').select('id,name').order('sort_order'),
    supabase.from('brand_subcategories').select('brand_id,subcategory_id'),
  ])
  if (categoryError || subcategoryError || brandError || linkError) throw categoryError || subcategoryError || brandError || linkError
  return { categories: categories || [], subcategories: subcategories || [], brands: brands || [], links: links || [] }
}
