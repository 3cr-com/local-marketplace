# NTN-BZR-1 — Guest order account access

## Issue details

- **Issue ID:** NTN-BZR-1
- **Title:** Let guest customers securely access order status and create an account
- **Status:** Planned
- **Priority:** High — complete before broadly promoting guest checkout

## Description

Guest checkout allows a purchase using an email address or phone number without choosing a password. The guest therefore cannot later sign in to see order status. A normal registration attempt can also fail because the email address or phone number is already associated with the guest identity.

## Desired outcome

After proving they control the original email address or phone number, a guest can see their own order history, set a password, and continue as a normal customer account. The process must not create duplicate accounts or expose order details to anyone else.

## Implementation details

- Add an **Access your orders** entry point on the customer sign-in page and order-confirmation page.
- Ask for the guest email address or phone number, then send a short-lived, rate-limited verification code or magic link to that same contact method.
- After verification, show matching orders and offer **Set a password** to establish persistent sign-in.
- Allow an existing guest identity to set a password after verified ownership instead of treating it as a brand-new registration.
- If the contact belongs to a password account, direct the customer to sign in or reset their password. Do not disclose whether the contact has orders before verification.
- Link matching guest orders, delivery addresses, and profile data to the verified account through a trusted server-side transaction or idempotent Edge Function.
- Handle expired links/codes, mismatched contacts, rate limits, already-claimed accounts, and retry attempts with clear user-facing messages.

## Security and data rules

- Verification and account changes must occur in a trusted server-side path; never expose a service-role key in the browser.
- Rate-limit by IP and normalised contact hash, and record abuse-safe audit events.
- Preserve existing guest-checkout idempotency behaviour.
- Require proof of control of the exact contact stored for the guest order before showing any order data.
- Never auto-merge two verified accounts; route account-merging cases through support or an admin workflow.

## Acceptance criteria

- A guest verifies their original contact, sets a password, signs in, and sees only their own past and future orders.
- A returning guest using the same contact is safely associated with the existing identity.
- An order cannot be claimed with only an order number, guessed email, or guessed phone number.
- A duplicate-contact registration attempt leads to recovery/sign-in guidance rather than a dead end.

