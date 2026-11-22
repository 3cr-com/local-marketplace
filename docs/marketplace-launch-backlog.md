# Marketplace launch backlog

**Purpose:** the prioritized source of truth for future marketplace development. This document records review findings and planned work only; it does not authorize implementation without confirmation.

## Current implementation snapshot

- The seller workspace is live and database-backed. Legacy mock seller/admin dashboard code remains in `src/components/MarketplaceApp.jsx`, but the active routes no longer use it.
- Customer browse and search load live products. Nearby ranking works after location capture; manual-location and search experience need refinement.
- Address book, customer profile, shops, product image upload, seller orders, admin listings, and super-admin account controls are implemented.
- Order-status events are written to `notification_outbox`, but no email, SMS, push, or in-app delivery worker consumes those events yet.
- Online payment is deliberately deferred. COD is the launch payment method.
- Older planning documentation must be reconciled with this backlog as work is completed.

## Priority 0 — checkout hardening

- [ ] Test signed-in COD checkout against real shop, product, address, stock, and delivery-distance data.
- [ ] Test guest COD checkout end-to-end.
- [x] Reuse or safely reconcile an existing guest email/phone instead of always creating a new Auth user.
- [x] Make guest user/profile/address/order handling robustly transactional or use an explicit compensation strategy with idempotency.
- [x] Add rate limiting and abuse protection to the public guest-checkout Edge Function.
- [x] Return clear, actionable checkout errors for inactive shops, missing pickup location, out-of-stock items, and invalid addresses.

## Priority 1 — delivery readiness

- [x] Require valid pickup coordinates before a shop can be made customer-visible.
- [ ] Require valid delivery-address coordinates before a location-based order can be placed.
- [x] Show the calculated delivery fee and delivery distance before the customer places a COD order.
- [x] Add seller cancellation and rejection reasons.
- [ ] Define delivery ownership, capacity, service hours, and service-area rules for the pilot.

## Priority 1.5 — identity, addresses, and availability

- [ ] Create a complete profile section for every authenticated role: customer, seller, admin, and super admin.
- [ ] Clearly show the currently signed-in account, its role, email/phone, active status, and relevant workspace access.
- [ ] Auto-populate profile forms from saved data and allow users to update permitted profile fields with role-safe validation.
- [ ] During shop creation, offer a seller's saved pickup/shop addresses as selectable starting points while still allowing a complete new structured address.
- [ ] Auto-populate the current structured pickup address when editing a shop; never replace it with an empty form.
- [ ] Decide and model the relationship between reusable seller/shop addresses and customer delivery addresses without leaking one user's address data to another.
- [x] Add a seller active/inactive status controlled by authorized platform administrators, separate from the existing shop active/inactive status.
- [x] Ensure inactive sellers cannot manage or activate storefronts until reactivated by an authorized administrator.
- [x] Ensure products are customer-visible only when the product is active, its shop is active, and its seller is active.
- [ ] Add customer-facing “open now” status to the existing shop-hours, closed-day, temporary-closure, and timezone controls.
- [x] Prevent checkout from a closed shop unless the future business policy explicitly supports scheduled orders.

## Priority 2 — security and launch validation

- [ ] Test Row Level Security as anonymous, customer, seller, admin, and super-admin users.
- [ ] Add integration coverage for stock deduction, seller approval, shop archive/delete rules, and administrator role changes.
- [ ] Verify guest checkout cannot expose service-role credentials or create duplicate/abusive accounts.
- [ ] Add basic production error monitoring and a pre-launch operational checklist.
- [ ] Remove inactive or dead client-side dashboard code so mock data cannot reappear accidentally.

## Priority 3 — seller operations

- [ ] Surface shop opening hours, closed status, and next-open time in the seller workspace and customer catalogue.
- [ ] Add SKU and product variants.
- [ ] Add bulk stock updates and low-stock actions.
- [ ] Add real per-shop sales, fulfilment, and inventory reporting.
- [ ] Move full shop editing into the seller workspace instead of routing to a separate page.
- [ ] Support seller-side cancellation/refund workflow once business rules are defined.

## Priority 4 — admin operations

- [ ] Add search, filters, pagination, and detail views for customers, sellers, shops, products, and orders.
- [ ] Add product and shop moderation/suspension actions with auditable reasons.
- [ ] Add service-area and delivery-policy management.
- [ ] Add live reports for orders, sales, active shops, fulfilment, and stock.
- [ ] Add a visible super-admin audit-log page sourced from `admin_activity_log`.
- [ ] Add a secure administrator invitation flow through a trusted server-side endpoint.

## Priority 5 — customer experience

- [ ] Deliver customer order-status notifications through a selected channel, with retries and a visible notification history.
- [ ] Add customer cancellation/support requests and seller/admin resolution flow.
- [ ] Persist favourites rather than storing them only in browser state.
- [ ] Improve manual location search, nearby-shop discovery, and no-results guidance.
- [ ] Add product/shop detail views, reviews, and ratings only after moderation policy is defined.

## Priority 6 — payments

- [ ] Select and onboard a payment provider.
- [ ] Create payment intents only through a trusted server-side endpoint.
- [ ] Verify signed webhooks and persist reconciliation/payment states.
- [ ] Add refunds, failed-payment recovery, and seller settlement rules.

## Operating rules

- COD stability and security take priority over online payment.
- Every database change must be a new ordered migration and applied with `supabase db push --remote` after review.
- Every development item must start from a dedicated branch and be merged through a pull request.
- Mark an item complete only after implementation, relevant checks, and a real role-specific verification.
