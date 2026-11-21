# Nearby MVP — Remaining Work and Launch Plan

**Status:** Planning checklist based on the current project as of 2026-11-21. This is a gap list, not a claim that the listed features are already working.  
**Payment direction:** Razorpay Route is the planned first marketplace provider, behind a provider-neutral adapter so another approved provider can replace it. This choice is not evidence of provider approval or a live integration.

## Current baseline

Present in the project: visual storefront and sample dashboards; Supabase Auth email/password UI; signup profile trigger; foundational tables and RLS for profiles, vendor applications, shops, products, service areas, orders and order items; PostGIS nearby-shop query; marketplace architecture document; and a disabled cart checkout with a safe payment-provider adapter boundary.

Not present: live catalog wiring, trusted order creation, provider API integration, verified webhook persistence, real notifications, production-grade roles/vendor approval, or a tested full workflow. The existing sample cards and dashboard metrics must not be represented as live marketplace data.

## P0 — Must do before a real customer pilot

### Product, legal, and operating model

- [ ] Confirm the launch city/coverage area, vendor categories, and service-radius rules.
- [ ] Decide seller-of-record, vendor agreement, commission, GST/invoice responsibilities, refunds, cancellations, returns, substitutions, and delivery liability with qualified India-specific legal/accounting advice.
- [ ] Confirm delivery model: vendor delivery, platform courier, pickup, or a defined combination.
- [ ] Obtain written confirmation that the chosen payment provider supports this exact marketplace model and vendor payouts/split settlement.
- [ ] Complete vendor identity/business verification process, support escalation ownership, and operating hours.

### Secure identity and permissions

- [ ] Finish auth flows: confirmation/callback page, password reset, account recovery, session expiry handling, and privacy/account deletion process.
- [ ] Implement protected `vendors`, `user_roles`, and shop-staff membership records. A browser user must never self-promote to vendor/admin.
- [ ] Establish initial admin provisioning and MFA/strong account protection; log and audit all role grants and administrative actions.
- [ ] Test every RLS policy with visitor, customer, vendor, and admin identities; review Supabase Security Advisor findings.

### Live shop/catalog and onboarding

- [ ] Build vendor application UI and admin approval/rejection queue with recorded reviewer and reason.
- [ ] Create vendor/shop records only through approved trusted workflow; configure coordinates, hours, service area, and shop activation.
- [ ] Replace hardcoded storefront products, categories, distances, counts, vendor orders, and admin metrics with paginated live queries.
- [ ] Build vendor product CRUD, inventory management, price changes, availability toggles, and validation.
- [ ] Add product variants/SKUs for sizes/weights where needed; define how stock is reserved and released.
- [ ] Add image storage with file validation, owner-scoped upload policies, and moderation.
- [ ] Implement location consent plus manual address/pincode fallback; verify 10 km distance filtering against real coordinates.

### Order lifecycle (required even if payments are initially disabled)

- [ ] Start with one-shop-per-order and clearly prevent or split multi-shop carts.
- [ ] Add delivery addresses and immutable order/item snapshots.
- [ ] Implement a trusted, atomic order-creation operation that recalculates current price, stock, fees, taxes and total; never accept client-submitted totals as authoritative.
- [ ] Add idempotency, inventory reservation/expiry, order status history, and controlled status-transition rules.
- [ ] Build real customer order history/details and vendor order inbox/accept/reject/fulfilment screens.
- [ ] Define cancellation, rejection, out-of-stock, failed-delivery, refund, and support paths.

### Razorpay Route and payments

- [ ] Complete Razorpay marketplace/Route onboarding and vendor KYC approval; verify the account supports the intended split settlement flow.
- [ ] Provide credentials through the secure secrets configuration flow only; never put secrets in browser code or this repository.
- [ ] Implement a server-side payment-session/order endpoint, authenticated against the owned pending order and provider-verified amount/currency.
- [ ] Integrate Razorpay hosted/official checkout using a public key and server-created order ID; never build a raw card-number/CVV form.
- [ ] Implement signed webhook verification, replay protection, event deduplication, and trusted persistence of payment state; the browser success redirect must not mark an order paid.
- [ ] Add `payments`, provider-event/idempotency, refund, and settlement/reconciliation records with RLS and least-privilege server access.
- [ ] Model `payment_status` separately from fulfilment `order_status`; test pending, captured, failed, expired, cancelled, partial/full refund, duplicate webhook, and mismatch scenarios.
- [ ] Keep provider selection isolated behind `src/lib/payment-provider.ts`; add another adapter (for example Cashfree Easy Split) only after its eligibility and business terms are checked.
- [ ] Start in provider sandbox. Go live only after onboarding, webhook endpoint registration, security review, reconciliation, and end-to-end test transactions pass.

**Important integration blocker:** The current code has not activated a payment provider and cannot accept real payments. A safe production integration needs the provider account plus a trusted webhook-to-database update path with narrowly scoped authorization. Do not enable the cart CTA or claim payment success until that full path is tested.

### Notifications and support

- [ ] Implement transactional email for order/application events and a durable notification outbox with retries and deduplication.
- [ ] Add SMS or WhatsApp only after provider choice, consent, sender/template requirements, and message-cost/operations decisions.
- [ ] Build support workflows for order exceptions, payments, refunds, vendor onboarding, and privacy requests.
- [ ] Keep in-app order history as the source of truth; notifications should link to it and avoid sensitive data.

### Testing and release readiness

- [ ] Unit/integration tests for role escalation, RLS isolation, cart tampering, stock races, order transitions, and provider events.
- [ ] End-to-end test signup → address → browse → cart → checkout → provider sandbox → webhook → vendor fulfilment → customer completion/refund.
- [ ] Accessibility, mobile/responsive, performance, SEO, error/empty/loading state, and security reviews.
- [ ] Configure production domain/redirect URLs, provider webhook URL, environment secrets, monitoring, backups, and incident response.
- [ ] Conduct a limited pilot with verified vendors and support coverage before public launch.

## P1 — After the first stable pilot

- [ ] Vendor staff accounts and per-shop permissions.
- [ ] Multi-shop cart with explicit parent checkout and child shop orders (only if customer demand warrants the operational complexity).
- [ ] Courier integration and trustworthy delivery tracking.
- [ ] Vendor analytics, settlement statements, reconciliation dashboards, and bulk catalog tools.
- [ ] Customer reviews/favourites backed by the database; offers/discounts with server-side validation.
- [ ] Operational scale testing and query/index tuning toward 10,000 vendors.

## Suggested MVP release gate

Do not market the app as a functioning marketplace until all P0 security, live catalog, order, support, legal/operational, and payment decisions are complete. If provider onboarding delays payment, launch only if a clearly disclosed, operationally supported alternative (such as pickup/payment-on-delivery) is approved and implemented end-to-end—never as a simulated card payment.

## Suggested execution order

1. Decide vendor, delivery, legal/tax, and payment operating model.
2. Secure RBAC/admin/vendor onboarding; remove role-preview controls from production.
3. Connect shop/product/location data and build real vendor management screens.
4. Implement atomic one-shop orders and fulfilment status/history.
5. Add notifications and support/exception operations.
6. Complete Razorpay Route sandbox and webhook integration, then reconcile and pilot.
7. Review metrics and expand from the pilot toward broader service areas and vendor capacity.
