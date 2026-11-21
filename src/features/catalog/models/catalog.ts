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
}

export type CatalogRow = {
  id: string; name: string; description: string; category: string; price_paise: number; stock: number; image_url: string | null
  shops: { id: string; name: string } | null
}
