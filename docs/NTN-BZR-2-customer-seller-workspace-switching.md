# NTN-BZR-2 — Customer and seller workspace switching

## Issue details

- **Issue ID:** NTN-BZR-2
- **Title:** Allow approved sellers to switch between customer and seller workspaces
- **Status:** Planned
- **Priority:** Medium

## Description

Once a customer becomes an approved seller, **Request seller access** is correctly disabled. That account still needs an intentional way to move between the customer marketplace and seller workspace. Customers who have never been approved as sellers must not see this control.

## Desired outcome

Approved active sellers can switch between customer and seller experiences without signing out or changing their role, seller approval, shops, products, or orders. Customer experience remains available to every seller.

## Implementation details

- Add a persistent account/workspace menu for approved, active sellers with **Customer view** and **Seller workspace**.
- Only show the switcher when seller access is both approved and active.
- Show **Request seller access** only to eligible customers who are not already approved sellers. Replace it with seller-status information after approval.
- Define predictable landing pages: customer storefront for customer view and seller overview for seller workspace.
- Preserve the customer cart and session when moving between workspaces.
- For inactive or suspended sellers, retain customer view but block seller workspace, shop management, product management, and seller orders with a clear explanation.
- Keep admin and super-admin management workspaces independent; they must not be treated as sellers merely to access management tools.
- Do not mutate a user's role simply to switch views. Record switches only if analytics or audit requirements demand it.

## UX rules

- Switching is navigation/state selection, not a second login or role change.
- The current mode must be clear in the header/sidebar and provide a one-click route to the other available workspace.
- Deep links to seller pages must redirect ineligible users to a meaningful explanation rather than a blank or broken screen.
- Seller accounts retain normal customer shopping capabilities.

## Acceptance criteria

- An approved active seller switches from customer storefront to seller workspace and back without signing out.
- An ordinary customer never sees the workspace switcher and can still request seller access.
- A suspended seller can shop as a customer but cannot manage shops, products, inventory, or seller orders.
- Admin and super-admin navigation and permissions remain correct after moving between customer and seller views.

