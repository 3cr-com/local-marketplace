# Admin workspace backlog

This backlog defines the platform workspace visual and permission model. It intentionally reuses the merchant workspace shell so staff work in one consistent product experience.

## Completed

- [x] Use the existing seller dashboard shell, sidebar, metrics cards, panels, tables, and responsive treatment for admin and super-admin workspaces.
- [x] Remove the separate customer-style admin screen.
- [x] Show live database metrics and listings for shops, seller requests, customers, sellers, and orders.
- [x] Keep seller approval actions in the platform workspace.
- [x] Give regular admins platform operations only; they cannot read the administrator listing.
- [x] Give super admins all regular-admin functionality plus the protected administrator listing.
- [x] Support multiple super admins.
- [x] Allow super admins to promote, demote, activate, and deactivate administrator accounts.
- [x] Prevent deactivating or demoting the final active super admin.
- [x] Audit admin actions in `admin_activity_log` and record `created_by` / `updated_by` on operational tables.

## Later additions

- [ ] Search, filters, pagination, and detail drawers for every platform listing.
- [ ] A dedicated audit-log screen with actor, action, target, timestamp, and change comparison.
- [ ] Admin invitation flow using a trusted server-side Supabase Edge Function.
- [ ] Granular staff permissions beyond admin/super-admin roles.
- [ ] Service-area and delivery-policy management in the platform workspace.
