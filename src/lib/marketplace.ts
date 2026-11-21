// Backwards-compatible facade. New code should import from src/features/* repositories.
export { loadCatalog } from '@/features/catalog/catalog.repository'
export type { CatalogProduct } from '@/features/catalog/models/catalog'
export { placeCodOrder, updateVendorOrderStatus } from '@/features/orders/order.repository'
export {
  activateSellerMode,
  createSelfServiceShop,
  disableSellerMode,
  loadMyShops,
  loadVendorProducts,
  removeVendorProduct,
  requestSellerMode,
  saveVendorProduct,
  submitVendorApplication,
} from '@/features/seller/seller.repository'
export type { VendorProduct, VendorShop } from '@/features/seller/models/seller'
export { loadMyProfile } from '@/features/auth/auth.repository'
export type { UserProfile } from '@/features/auth/models/profile'
export { loadVendorApplications, reviewVendorApplication } from '@/features/admin/admin.repository'
export type { VendorApplication } from '@/features/admin/models/vendor-application'
