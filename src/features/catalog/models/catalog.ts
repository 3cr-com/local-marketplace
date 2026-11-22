export type CatalogProduct = {
  id: string
  name: string
  detail: string
  price: number
  category: string
  shop: string
  shopId: string
  distance: string
  image: string
  badge: string
  color: string
  shopOpen?: boolean
}

export type CatalogRow = {
  id: string; name: string; description: string; category: string; price_paise: number; stock: number; image_url: string | null
  shops: { id: string; name: string; opens_at?: string; closes_at?: string; closed_weekdays?: number[]; temporarily_closed?: boolean; timezone?: string } | null
}
