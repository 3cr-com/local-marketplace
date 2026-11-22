# NTN-BZR-0.0 — MVP implementation tracker

## Document details

- **Issue ID:** NTN-BZR-0.0
- **Title:** MVP implementation tracker
- **Status:** Active reference
- **Description:** The primary delivery plan for the marketplace MVP and its module-level completion criteria.

**Purpose:** the single working plan for future development. Update the status and acceptance checks whenever a module changes.

## MVP assumptions

- Launch in one defined local service area at a time.
- 3cr owns neither inventory nor a warehouse; shops own stock and fulfil orders.
- An order contains items from exactly one shop in the first release.
- Start with shop-managed delivery and cash on delivery (COD). Online payment and courier partners are separate, later integrations.

## Delivery roadmap

| # | Module | Status | Definition of done |
|---:|---|---|---|
| 1 | Backend foundation and identity | In code; needs Supabase deployment | Supabase project configured, migrations applied, email confirmation and protected admin provisioning tested. |
| 2 | Live catalogue and vendor inventory | In code; needs Supabase deployment | Customer catalogue reads active products/shops; vendor can manage only their own products and stock. |
| 3 | Single-shop COD orders | In code; needs Supabase deployment | Signed-in customer can submit one-shop COD order; server recalculates price/stock atomically; vendor can see it. |
| 4 | Vendor onboarding and operations | Foundation in code | Application, review, shop activation, opening hours, service area, and fulfilment status controls work. |
| 5 | Delivery and customer order tracking | Foundation in code | Address validation, vendor delivery workflow, status history, cancellation/rejection, and customer order history work. |
| 6 | Online payments | Not started | Selected provider onboarding, server-side payment intent, signed webhooks, reconciliation, refunds, and payment state work. |
| 7 | Notifications and support | Foundation in code | Durable notification outbox, templates, retries, and support workflows work. |
| 8 | Pilot hardening and launch | Not started | RLS/security tests, end-to-end tests, monitoring, policies, vendor contracts, and a limited live pilot are complete. |

## Module 1 — backend foundation and identity

### Implemented

- Supabase client uses public browser credentials only.
- Email/password sign-up and sign-in UI exists.
- Profile-creation trigger and baseline Row Level Security migrations exist.
- Production URL is configured through `PUBLIC_SITE_URL`.

### Required setup

- [ ] Create a Supabase project.
- [ ] Add `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `PUBLIC_AUTH_DOMAIN`, and `PUBLIC_SITE_URL` to `.env`.
- [ ] Apply every migration in `supabase/migrations/` in filename order.
- [ ] Set Supabase Auth site URL and redirect URLs.
- [ ] Provision the first admin through a controlled server-side process; never change roles from the browser.

## Module 2 — catalogue and inventory

### Implemented

- `src/lib/marketplace.ts` loads active products with their active shop.
- The customer storefront uses live catalogue data when Supabase is configured, and shows local demo data only when it is not.
- Existing RLS policies scope product writes to the owning shop.

### Next checks

- [ ] Build the vendor product create/edit/archive UI.
- [ ] Add SKU, variants, image upload, delivery fee, shop hours, and serviceability fields.
- [ ] Seed at least one approved shop and products for pilot testing.

## Module 3 — single-shop COD orders

### Implemented

- Cart prevents items from different shops being combined.
- The cart collects a delivery address and submits a COD order only for an authenticated user.
- Database function `place_cod_order` locks product rows, rechecks active status and stock, calculates the total from database prices, creates immutable order items, and reduces stock atomically.
- Order status history and payment/delivery fields are introduced in the new migration.

### Next checks

- [ ] Apply and test the migration using real customer and vendor accounts.
- [ ] Add vendor accept/reject and status-transition controls backed by a trusted server function.
- [ ] Decide whether delivery is vendor-managed or platform-managed before enabling customer checkout publicly.

## Non-negotiable security rules

- Never trust cart totals, stock, roles, payment success, or an order status supplied by a browser.
- Keep service-role and payment-provider secrets out of `.env` files exposed to the client and out of Git.
- Online payment comes only after a provider account, server-side payment creation, and verified webhooks are in place.
- Test every RLS policy using customer, vendor, admin, and anonymous sessions before a public pilot.
