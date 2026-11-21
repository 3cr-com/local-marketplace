# 3cr — Hyperlocal Marketplace Design Document

**Purpose:** Product, architecture, security, data, and operations blueprint for a multi-vendor marketplace serving local Indian shops and customers.  
**Status:** Design proposal grounded in the current project and its applied Supabase schema. This document describes both what exists and what must be built before real orders or payments can launch.  
**Last updated:** 2026-11-21

---

## 1. Product vision and scope

3cr helps customers discover independent shops and products close to home, then place orders that are fulfilled by those shops. The platform owns no inventory or warehouses. Initial discovery radius is 10 km; the system should scale toward 10,000 vendors without relying on a single large in-memory catalog.

### Customer-facing scope

- Browse shops and products by category and distance.
- Search, filter, sort, and view availability and delivery estimates.
- Choose a serviceable delivery address and see eligible local shops.
- Maintain a cart, place and track orders, and view order history.
- Receive clear order, payment, cancellation, and delivery updates.

### Vendor-facing scope

- Apply to join and complete shop verification/onboarding.
- Maintain shop profile, service location, opening hours, and fulfilment settings.
- Create products, prices, photos, and stock; pause unavailable items.
- Accept/reject incoming orders and move accepted orders through fulfilment statuses.
- View order history, settlements, returns, and operational summaries.

### Platform-admin scope

- Review vendor applications and verify business information.
- Suspend/reactivate vendors, shops, products, or customer accounts with an audit trail.
- Configure categories, service areas, marketplace policies, and notification templates.
- Monitor orders, payment exceptions, refunds, disputes, and vendor settlements.
- Review abuse, support cases, and platform health.

### Explicit non-goals for the initial release

- Platform-owned inventory or warehouses.
- A custom card vault or collection of card numbers/CVV by the site.
- A fabricated payment-success state or simulated checkout.
- Multi-vendor single-cart checkout unless the platform deliberately implements order splitting, payments, and delivery coordination.

---

## 2. Architecture recommendation

### Practical initial architecture

- **Web client:** Existing Astro + React site, with React client components for authenticated and interactive features.
- **Identity and database:** Supabase Auth + PostgreSQL, Row Level Security (RLS), and PostGIS for geographical queries.
- **Trusted server-side workflows:** Supabase Edge Functions for payment-provider API calls, webhook verification, transactional order creation, notification dispatch, and other privileged integrations. Never put provider secret keys in browser code.
- **Object storage:** Supabase Storage for vendor-uploaded product/store images, with authenticated owner-scoped upload rules and public delivery only for approved catalog media.
- **Payments:** An India-capable marketplace payments provider, selected after commercial/legal onboarding and settlement requirements are confirmed. The provider hosts or tokenizes payment collection; Nearby never handles raw card credentials.
- **Notifications:** Transactional email and SMS/WhatsApp through one or more providers, invoked from trusted server-side workflows and recorded in an outbox/log table.
- **Observability:** Structured event logs, payment webhook records, error monitoring, alerts for stuck orders and failed notifications, and documented support procedures.

The client talks to Supabase using the project's pre-provisioned public client configuration. RLS is the enforcement boundary for user-scoped reads and writes. A browser client is not trusted to calculate authoritative totals, mark payments successful, approve vendors, or change privileged roles.

### Scalability principles

- Index common access paths (shop/category, active product, vendor orders by status/time, customer orders by time, payment provider references, and geography).
- Paginate server-side; do not load all vendors/products into a browser at once.
- Keep product images in object storage/CDN, not database rows.
- Use idempotency keys for order creation and payment-provider requests/webhooks.
- Use an outbox/queue pattern for notifications and retries rather than blocking checkout on email delivery.
- Partition high-volume event tables only when metrics justify it; begin with ordinary indexed PostgreSQL tables.
- Add rate limits and abuse detection to signup, application submission, checkout initiation, and public search.

---

## 3. Authentication and account lifecycle

### Authentication method

Start with Supabase email/password and email confirmation. Add phone OTP only after choosing an India-capable SMS provider and designing recovery/rate limits. Social sign-in is optional and should not be required for marketplace launch.

Required experiences:

- Sign up, sign in, sign out, email confirmation, password reset, session renewal, and account deletion/support process.
- Clear handling of expired sessions and access-denied responses.
- A profile row created automatically on account creation.
- Never expose service-role credentials or provider secrets in frontend code.

### Identity versus marketplace roles

An authenticated identity is not automatically a vendor or administrator. A new account receives the customer role. A vendor role is granted only after an application is reviewed and approved through a trusted admin workflow. Admin status must be assigned by a controlled operator process—not by editing user-editable metadata or accepting a role from the browser.

**Security note about the current schema:** `profiles.role` currently has a role field, while the row-level policy restricts customer self-updates to the customer role. Keep the role field immutable to normal users. For production, use a dedicated role/permission mapping or a trusted admin-only assignment path and add RLS checks based on that source. Do not add a client-side “switch role” control as a security mechanism.

### Session and authorization checks

- Authenticate every write that changes marketplace state.
- RLS verifies row ownership/participation for every direct database operation.
- Privileged operations (approval, refunds, payment status, admin actions) run only in trusted server-side code after explicit authorization.
- Validate request payloads server-side, not just with client-side forms.
- Log changes to sensitive roles and account status with actor, target, reason, and timestamp.

---

## 4. RBAC and permissions

| Capability | Visitor | Customer | Vendor owner/staff | Support | Admin |
|---|---:|---:|---:|---:|---:|
| Browse active shops/products | Yes | Yes | Yes | Yes | Yes |
| Manage own profile/addresses | No | Yes | Yes | No (support view only as authorized) | Yes, audited |
| Submit vendor application | No | Yes | Optional additional shop | No | No |
| View application decision | No | Own only | Own only | Authorized cases | Yes |
| Edit own shop/products/stock | No | No | Yes, own shop only | No | Yes, audited |
| View customer order | No | Own orders | Only orders for own shop | Limited support scope | Yes, audited |
| Change fulfilment status | No | No | Own-shop orders, allowed transitions | Escalation only | Yes, audited |
| Initiate payment | No | Own checkout | No | No | Exceptional support flow only |
| Confirm payment/refund | No | No | No | No | Trusted provider webhook/admin workflow |
| Approve/suspend vendors | No | No | No | No | Yes |
| Manage global categories/areas | No | No | No | No | Yes |

**Implementation guidance:** RLS policies can express owner/participant scope for ordinary queries. Admin and support authorization should use a protected roles table or trusted claims managed server-side. Do not authorize from `user_metadata`, URL parameters, hidden buttons, or a role chosen in the UI. Every admin action should be recorded in an audit log.

---

## 5. Module breakdown

### A. Storefront and discovery

- Category browsing, product search, and shop pages.
- Location capture with explicit permission; manual address/pincode fallback.
- Shop and product availability filters; distance calculation from PostGIS.
- Price/stock display, product details, image gallery, shop hours.
- Pagination and empty/error/loading states.

### B. Customer account

- Registration and login, profile, delivery addresses, order history.
- Saved items (optional), preferences, notification consent.
- Account/data deletion workflow subject to legal record-retention needs.

### C. Vendor onboarding and workspace

- Application form and document/business verification workflow.
- Admin review queue; approve/reject with reason.
- Shop profile and coordinates; operating hours and delivery/pickup configuration.
- Product CRUD, stock changes, product status, bulk import as a later feature.
- Order inbox, accept/reject, preparing/ready/handed-to-courier actions.
- Vendor sales and settlement views sourced from provider reconciliation, not client-calculated data.

### D. Cart and order orchestration

- Cart should be scoped to a single shop at first. If a user adds another shop's item, ask whether to clear/switch or split the cart.
- Revalidate prices, shop status, stock, serviceability, address, and delivery fee on the server at checkout.
- Create one order for one shop in the MVP. Multi-shop carts require an explicit parent checkout plus separate shop orders, separate fulfilment, and a clear payment/refund model.
- Reserve stock atomically or decrement it only after the chosen commitment point; expire abandoned reservations.
- Persist a price snapshot on each order item so later catalog price changes do not rewrite history.

### E. Payments and settlement

- Payment intent/session creation on a trusted server-side endpoint.
- Hosted checkout/SDK from provider; frontend receives only safe session/client identifiers.
- Provider webhook verification, deduplication, state transitions, refunds, and reconciliation.
- Marketplace vendor settlement/split rules, fee/tax accounting, failed payout handling, and statements.

### F. Delivery and fulfilment

- Delivery mode selection (shop delivery, platform courier integration, pickup) based on operational decision.
- Status timeline and estimated windows.
- Courier assignment/tracking is a separate module/integration; do not show live tracking unless it exists.
- Proof of delivery, failed delivery, return/cancellation flow.

### G. Admin, support, and operations

- Vendor/customer/shop/product moderation.
- Service-area management and category configuration.
- Order/payment exception queues, refund controls, dispute escalation.
- Audit history, notification templates, support case management, operational metrics.

---

## 6. Data model and relationships

All money should be stored as integer minor units (paise), never floating-point rupees. Every timestamp should be stored as `timestamptz` in UTC and formatted for the user locally.

### Core entities (recommended production model)

| Entity | Important fields | Relationship / purpose |
|---|---|---|
| `auth.users` | Supabase identity, email/phone | Identity root. One-to-one with `profiles`. |
| `profiles` | `id`, name, contact preferences | Customer/vendor user profile; role assignment must be protected. |
| `user_roles` (recommended) | `user_id`, `role`, `granted_by`, `created_at` | Explicit RBAC mapping; one user may have multiple scoped roles. Do not allow self-grant. |
| `vendor_applications` | applicant, business details, status, review reason, reviewed_by | One user submits applications; approval produces vendor/shop records. |
| `vendors` (recommended) | legal/business identity, verification, payout state | One vendor account can own one or more shops. Avoid assuming user equals shop owner forever. |
| `shops` | vendor, name, category, address, PostGIS point, status, hours | Vendor owns one or many shops; shop has many products/orders. |
| `shop_staff` (later) | shop, user, permission set, invited_by | Many-to-many shop staff memberships for multiple staff per business. |
| `categories` | name, slug, parent, active | Hierarchical marketplace categories; products can belong to one or more categories if needed. |
| `products` | shop, category, title, description, status | Shop has many products. Use soft archive/status for catalog history. |
| `product_variants` (recommended) | product, SKU, options, price, stock | Product can have variants (size/color/weight); one stock quantity per sellable SKU. |
| `addresses` | user, formatted address, pincode, coordinates, default | Customer has many saved addresses. Store only necessary personal data. |
| `service_areas` | name, polygon/center/radius, active | Configured coverage zones; a shop may be eligible for multiple areas. |
| `carts` / `cart_items` (optional persistent cart) | customer, shop, variant, quantity | One active cart per customer/shop; validate against current catalog at checkout. |
| `orders` | customer, shop, address snapshot, status, currency, totals | Customer places many orders; each order belongs to one shop in MVP. |
| `order_items` | order, product/variant references, title/SKU/price snapshot, quantity | Order contains one or more immutable item snapshots. |
| `order_status_history` | order, from/to status, actor, note, timestamp | One order has ordered status events for traceability. |
| `inventory_reservations` (recommended) | item/variant, order, quantity, expiry, status | Short-lived reservations prevent overselling during checkout. |
| `payments` | order, provider, provider reference, amount, currency, status | An order may have payment attempts; never store card credentials. |
| `refunds` | payment, amount, reason, provider reference, status | Payment may have zero or more partial/full refunds. |
| `webhook_events` | provider, event id, received/processed time, payload hash, status | Deduplicates and audits provider events; restrict raw payload access. |
| `vendor_settlements` | vendor, period, gross, fees, net, provider refs, status | Provider payout and reconciliation records. |
| `notification_outbox` | recipient, channel, template, related entity, status, retry count | Durable asynchronous notifications with retry/idempotency. |
| `audit_logs` | actor, action, entity, before/after summary, reason, timestamp | Admin/security-sensitive action history. |

### Entity relationship summary

```text
auth.users 1 ── 1 profiles
profiles 1 ── many vendor_applications
profiles 1 ── many addresses
vendors 1 ── many shops
shops 1 ── many products
products 1 ── many product_variants
profiles 1 ── many orders
shops 1 ── many orders
orders 1 ── many order_items ── 1 product_variant (and product snapshot)
orders 1 ── many order_status_history
orders 1 ── many payments 1 ── many refunds
vendors 1 ── many vendor_settlements
orders/payments/vendors 1 ── many notification_outbox entries
```

### Existing database foundation in this project

The applied migrations currently create `profiles`, `vendor_applications`, `shops`, `products`, `service_areas`, `orders`, and `order_items`; enable RLS; create a signup profile trigger; and provide a PostGIS `nearby_shops(customer_lat, customer_lng, radius_meters)` function. The current schema is a foundation rather than a complete production model:

- `shops.owner_id` is currently one-to-one; a `vendors` entity is preferable for multiple shops per vendor.
- `products` uses one stock/price row; variants and SKUs are needed for size/color/weight inventory.
- Orders do not yet have addresses as normalized address records/snapshots, item title/price snapshots, payment records, refunds, status history, or idempotency keys.
- A browser-side multi-step insert is not an atomic checkout; production order creation should be a trusted transactional operation.
- Current storefront and dashboards still contain sample data and are not wired to these tables.
- `nearby_shops` requires persisted shop coordinates and customer coordinates. The browser location API needs consent and a manual address fallback.

---

## 7. Order and fulfilment state machine

Recommended order statuses:

```text
awaiting_payment → placed → accepted → preparing → ready_for_pickup
                                      ↘ rejected/cancelled
ready_for_pickup → out_for_delivery → delivered
any eligible state → cancellation_requested → cancelled/refund_pending → refunded
```

If using cash on delivery or pay-on-delivery (only if provider/business operations support it), model `payment_status` independently from fulfilment status. Do not overload a single status field to represent both.

### Rules

- A customer can cancel only before a defined fulfilment cutoff; after that, use a cancellation request/refund flow.
- Vendors can update only orders belonging to their shop and only through allowed next transitions.
- Admin overrides require a reason and audit entry.
- `delivered` is not inferred from payment success; payment and fulfilment are separate state machines.
- Each state transition records actor, timestamp, and source (customer/vendor/admin/provider/system).
- Notify after committed state changes; retries must not duplicate user-visible messages.

---

## 8. End-to-end workflows

### Customer registration

1. Customer creates an account with email/password.
2. Auth provider verifies email using a redirect back to the site.
3. Signup trigger creates a customer profile with the least-privileged role.
4. Customer adds a delivery address; geocoding/coordinates are collected only with consent or through a manual pincode/address path.

### Vendor onboarding

1. Signed-in customer submits business/shop application and required information.
2. Application is pending and visible only to applicant and authorized reviewers.
3. Admin verifies identity/business details and records a decision and reason.
4. On approval, trusted server workflow creates vendor/shop records and grants vendor permissions; shop begins inactive until required setup is complete.
5. Vendor completes shop location, hours, fulfilment choices, and catalog; admin or policy checks activate it.
6. Vendor receives an approval/next-step notification.

### Browse and discovery

1. Customer selects a saved address or consents to browser location.
2. Server validates coordinates/radius and runs PostGIS distance search, capped by policy (initially 10 km).
3. Filter shops/products by active status, stock, opening state, category, and supported delivery area.
4. Return paginated results with distance and current price; do not leak inactive/draft catalog data.
5. If precise location is unavailable, use address/pincode search and explain location limits.

### Cart and order placement (single-shop MVP)

1. Customer adds items from one shop; cart remembers product/variant IDs and quantities, not trusted prices.
2. Checkout requires a valid session, address, and serviceable active shop.
3. Trusted order endpoint re-reads current prices/stock, calculates subtotal, delivery fee, discounts, taxes, and total, and checks idempotency key.
4. In one transaction, create pending order and item snapshots, reserve stock, and record the authoritative totals.
5. Create payment session with the selected provider from trusted server code.
6. Return hosted checkout URL/session reference; browser redirects to provider. No card data passes through Nearby.
7. Provider webhook (not the browser redirect) verifies payment and changes payment/order state exactly once.
8. On confirmed payment, commit stock reservation and mark order placed; enqueue customer and vendor notifications.
9. On failure/expiry, release reservation and keep a clear failed/expired attempt record; allow safe retry without duplicate order.

**Important:** For a marketplace checkout, vendor splits/settlement rules are critical. Confirm whether the selected provider supports platform onboarding, connected vendor accounts, split settlements, refunds, and reconciliation in India before choosing a one-shop checkout implementation.

### Vendor fulfilment and customer tracking

1. Vendor receives new-order notification and views order details in their workspace.
2. Vendor accepts/rejects within an agreed response window. Rejection triggers customer update and payment reversal/refund workflow when applicable.
3. Accepted order progresses through preparation, ready, pickup, and delivery states.
4. Each transition is validated and appended to history.
5. Customer sees a timeline; courier tracking appears only when a delivery integration provides trustworthy events.
6. Delivery completion prompts receipt/feedback; disputes and returns follow a documented policy.

### Payment/refund reconciliation

1. Provider sends signed webhook event.
2. Endpoint verifies signature using server-held secret and checks timestamp/replay protections.
3. Persist provider event ID; duplicate event IDs return success without repeating side effects.
4. Validate amount, currency, order/payment reference, and expected transition.
5. Update payment and associated order records transactionally; write audit and outbox events.
6. Scheduled reconciliation compares internal payment/settlement records with provider reports and raises exceptions for missing/mismatched events.

---

## 9. India payment recommendation and decision criteria

The marketplace should not present any checkout as available until a payment provider is selected, eligibility is confirmed, and its integration is fully implemented and tested.

### Recommended evaluation

Shortlist an India-capable provider with explicit **marketplace/platform** capabilities—not merely a standard single-merchant payment gateway. Evaluate, in writing:

- Platform/marketplace onboarding and connected-vendor KYC.
- Split settlement or vendor payouts, fees, payout timing, holds, and reconciliation.
- Hosted checkout/UPI/cards/netbanking/wallet options as appropriate to provider approval.
- Refunds, partial refunds, disputes/chargebacks, and payment retries.
- Webhook signatures, idempotency, sandbox quality, and operational support.
- Supported business model, prohibited goods, geography, tax invoicing, and contractual obligations.

**Potential providers to evaluate:** Razorpay Route and Cashfree Easy Split are examples of marketplace-oriented products in India; PayU may also be evaluated depending on marketplace model. Product availability, approval, pricing, onboarding, and terms change—confirm directly with each provider. Selection is not a guarantee of account eligibility. Prefer hosted checkout/official SDK and provider-managed sensitive payment fields. Do not store PAN/card number/CVV or build a raw payment form.

### Before making a provider selection

Confirm the legal entity, seller-of-record model, whether Nearby or each vendor is the merchant, marketplace KYC requirements, GST/invoice treatment, commission and settlement schedule, refund responsibility, and required seller agreements with qualified legal/accounting advice. India-specific payment, tax, consumer-protection, and data-protection obligations need professional review. The provider and business must approve the exact flow.

### Safe payment lifecycle

Keep `payment_status` distinct from `order_status`, e.g. `created`, `requires_action`, `authorized`, `captured`, `failed`, `cancelled`, `partially_refunded`, `refunded`. Only verified provider webhooks or trusted server-side provider lookups may confirm payment. A success redirect in the browser is not proof of payment.

---

## 10. Notifications

### Event-to-message matrix

| Event | Customer | Vendor | Admin/ops |
|---|---|---|---|
| Vendor application submitted | Confirmation | — | Review queue alert |
| Vendor approved/rejected | Decision and next steps | — | Audit record |
| Order placed/payment confirmed | Receipt and order details | New order alert | Exception monitoring |
| Vendor accepts/rejects | Status update | Confirmation | Rejection monitoring |
| Ready/out for delivery/delivered | Progress and completion | Fulfilment update | — |
| Payment failure/refund | Action/status explanation | Relevant order update | Payment exception if unresolved |
| Low stock / paused item | — | Inventory alert | Optional escalation |

### Channel recommendation

- Start with **transactional email** for account verification, receipts, and durable order information.
- Add **SMS** for time-sensitive order status and delivery updates after provider, consent, sender requirements, and message templates are approved.
- Add **WhatsApp Business** only with approved templates, user opt-in, and a suitable provider; it should not be the only source of order information.
- In-app status/history is the source of truth; messages are notifications, not the record itself.

### Delivery design

Write an outbox record in the same transaction as the state change; a worker/Edge Function sends it asynchronously. Store template/version, recipient, channel, provider message ID, attempts, last error, and delivery status. Use exponential backoff, bounded retries, deduplication keys, and dead-letter/manual retry handling. Respect opt-outs for promotional messages while preserving required transactional notices as permitted by applicable rules. Avoid placing sensitive address/payment data in message content.

---

## 11. Security, privacy, and abuse prevention

- RLS on every exposed table; least-privilege grants and separate user/admin/service access.
- No anonymous inserts/updates/deletes for marketplace state.
- Vendor ownership checked against shop membership; never trust submitted `owner_id` alone.
- Admin actions and role changes are server-gated and audited.
- Payment secrets only in Supabase Edge Function secrets; never in client bundles or logs.
- Webhook signature verification, idempotency, replay protection, amount/currency checks.
- Rate limits on auth, application forms, searches, and payment session creation.
- Validate image type/size and use owner-scoped storage policies; moderate public product images.
- Collect only needed personal/location data; ask for location permission in context and support manual entry.
- Define retention, deletion, export, consent, and breach-response procedures with India-specific legal review.
- Protect against overselling, price tampering, order enumeration, IDOR, CSRF/XSS, and vendor impersonation.
- Use security advisor findings and application tests; never assume “RLS enabled” alone proves policies are correct.

---

## 12. Operational decisions and product policies to settle

Before implementation beyond the prototype, decide:

1. Is each order limited to one shop at launch? (Recommended: yes.)
2. Does the marketplace arrange delivery, shops deliver, or both? Who pays and owns service failures?
3. Which cities/pincodes launch first, and how are service-area boundaries maintained?
4. What vendor verification documents and review SLA are required?
5. Which product categories and restricted/prohibited-goods policies apply?
6. What are cancellation, substitution, refund, return, and failed-delivery policies?
7. Is payment captured at checkout or authorized then captured at fulfilment? Provider and business rules decide.
8. Who is merchant/seller of record, how is commission calculated, and how are vendor payouts reconciled?
9. What customer/vendor support hours and escalation paths exist?
10. Which notification channels are enabled and what consent is required?
11. What tax invoices/receipts are issued and by whom?
12. Which admin users are initial trusted operators and how are they provisioned securely?

---

## 13. Delivery roadmap

### Phase 0 — Product and compliance decisions

Resolve marketplace legal/payment model, vendor verification, delivery ownership, serviceable launch area, refund/cancellation policy, and initial notification channels.

### Phase 1 — Secure marketplace foundation

Harden roles and RLS; create vendors/staff/admin authorization; implement onboarding approval; connect the catalog and shop dashboards to live tables; implement location capture with manual fallback; add image storage and moderation.

### Phase 2 — Order MVP without pretending payment works

Implement a server-validated, atomic one-shop order flow, item snapshots, inventory reservation, order-status history, vendor accept/reject, customer order history, and email notifications. Clearly label any payment-disabled test mode and never accept card credentials.

### Phase 3 — Provider integration and pilot

Choose and onboard marketplace-capable India provider; implement hosted checkout, signed webhooks, idempotency, refunds, reconciliation, vendor settlement reporting, notification retries, and security review. Pilot with a limited set of verified shops and real support coverage.

### Phase 4 — Scale and optimize

Improve catalog search, geographic indexes and pagination, multi-shop cart/split-order design if required, courier integration, operational analytics, bulk vendor tools, and capacity testing toward 10,000 vendors.

---

## 14. Acceptance criteria for a production-ready MVP

- Unauthenticated users can browse only active public shops/products; writes require authenticated authorization.
- Users cannot grant themselves vendor/admin roles or see other users’ private profile/order data.
- Vendor approvals and catalog changes are attributable to authorized actors.
- Location search returns only active, serviceable shops within the configured radius and has a manual-address fallback.
- Prices, stock, totals, shipping, and order ownership are revalidated server-side at checkout.
- Duplicate checkout requests and duplicate webhooks do not create duplicate orders, charges, stock changes, or notifications.
- Payment is considered successful only after trusted verification; refunds and settlement discrepancies are auditable.
- Vendors can only act on their own shop's orders; customers can only view their own orders.
- Notification failure does not lose the order or falsely roll back a committed transaction.
- No screen or API collects/stores raw card numbers, CVV, or payment credentials.
- Automated tests cover RLS boundaries, role escalation, price/stock tampering, order transitions, webhook replay, and failure/retry cases.
- Support, privacy, retention, refunds, and incident procedures are documented before public launch.

---

## 15. Current project implementation versus target

**Already present:** Supabase Auth email/password UI; signup profile trigger; base tables for profiles, vendor applications, shops, products, service areas, orders, and order items; RLS foundation; PostGIS nearby-shop function; a sample storefront/cart and sample vendor/admin dashboard UI.

**Not yet production-connected:** live product/shop queries in the storefront; vendor application and approval interfaces; secure role provisioning/admin access; live vendor inventory/product editing; atomic order creation and order history; payment provider integration; delivery and notification workers; address management and actual device location lookup; vendor payout/reconciliation; end-to-end security and integration tests.

The current checkout is intentionally disabled. For India, payment functionality requires a separately selected and approved marketplace-capable provider; enabling a UI button alone does not create a safe or working payment flow.
