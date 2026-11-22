# NTN-BZR-0.2 — Marketplace feature backlog

## Document details

- **Issue ID:** NTN-BZR-0.2
- **Title:** Marketplace feature backlog
- **Status:** Historical working backlog
- **Description:** Earlier marketplace feature planning, retained for traceability alongside the newer launch backlog.

This file is the working source of truth for the next development stages. Items are ordered by customer impact and data integrity.

## Current foundation

- Email/password account creation and seller-mode activation exist.
- A customer can keep multiple delivery addresses and a seller can keep multiple shops.
- Product taxonomy supports categories, subcategories, and brands.
- COD orders calculate distance-based delivery fees in PostgreSQL.

## 1. Reliable shop activation and delivery eligibility

- A self-service shop must become active when the seller has provided a valid structured pickup address and GPS location.
- The order RPC must return distinct messages for an inactive shop and a missing pickup location.
- Existing legacy shops need an in-app path to set their pickup location and become active.

## 2. Customer account and ordering

- Customer order history page with live order status, item details, totals, delivery address snapshot, and an empty-state design.
- Customer address-book page: list, add, edit, delete, and choose one default address.
- Checkout supports guest email/phone collection, atomically creates or finds a customer profile, saves the order, adjusts stock, and rolls back everything if any step fails.
- Customer profile supports name, contact information, location-assisted address setup, and delivery preference.

## 3. Seller shop management

- Dedicated Shops page with a grid of all shops, category labels, active/inactive status, and location readiness.
- Edit shop name, multi-category selection, structured pickup address, and status.
- Inactive shops and their products must not appear to customers.
- Delete a shop only through a clear confirmation modal; explain that its products are deleted by cascade.
- Product editor selects the shop and supports image, taxonomy, price, stock, and active status.

## 4. Orders and fulfilment

- Seller Orders page loads real order data for each owned shop.
- Seller can see customer contact/delivery data appropriate to fulfilment, items, COD amount, and live status.
- Provide a designed “No orders yet” state instead of mock rows.
- Customer sees the same real order lifecycle in their order history.

## 5. Discovery and search

- Product and shop search query live Supabase data.
- Customer location automatically filters/ranks shops within the service radius, with a manual location fallback.
- Remove all storefront/demo order data once live data is available.

## 6. Admin operations

- Replace mock admin cards, vendors, and orders with real data.
- Admin can review seller status, shops, products, orders, and operational counts.
- Use protected admin-only repositories/RPCs; no client-side role assumptions.

## Delivery sequence

1. Shop activation bug, real seller orders, and customer order history.
2. Customer address-book and seller shop-management pages.
3. Guest checkout transaction and customer profile/location.
4. Live search/discovery and complete admin workspace.

## Rules

- All stock changes and order creation remain server-side transactions.
- Location-dependent orders require both a delivery-address location and shop pickup location.
- Deleting a shop must be confirmed and cascade only through database foreign keys.
- No dummy orders, vendors, or production metrics appear in live workspaces.
