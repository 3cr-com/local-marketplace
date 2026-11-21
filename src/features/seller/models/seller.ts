export type VendorShop = { id: string; name: string; category: string; address: string; is_active: boolean; primary_category_id?: string | null; location?: unknown | null; shop_categories?: Array<{ category_id: string; categories: { name: string } | null }> }
export type VendorProduct = {
  id: string; name: string; description: string; category: string; price_paise: number
  stock: number; image_url: string | null; is_active: boolean
  category_id?: string | null; subcategory_id?: string | null; brand_id?: string | null
}

export type SellerShopInput = { name: string; category: string; categoryId: string; address: { addressLine1: string; addressLine2?: string; locality?: string; landmark?: string; city: string; district?: string; state: string; country?: string; pincode: string; latitude: number; longitude: number } }
