# NTN-BZR-3 — Branding and location backlog

## Document details

- **Issue ID:** NTN-BZR-3
- **Title:** Branding and location backlog
- **Status:** Planned
- **Description:** Multi-brand, location-aware Notun Bazar identity, content, administration, and rollout work.

**Purpose:** plan the multi-brand, location-aware Notun Bazar identity without changing storefront behavior until each item is approved. This backlog is separate from the launch backlog because it affects public identity, content publishing, metadata, and administrator permissions.

## Current implementation status

- [x] A published marketplace-default brand profile with stable ID/slug, Bengali and English identity, colours, logo/icon references, hero content, CTA, and audit metadata.
- [x] A seeded editable **Notun Bazar** default using the assets already in `public/images/`.
- [x] Active admins and super admins can create drafts, edit profiles, preview them, and publish one as the live marketplace default.
- [x] The public storefront loads the published default at runtime and applies its identity, header/footer copy, hero artwork/copy, CTA, and theme colours without a rebuild.
- [x] Draft profiles are not readable by customers; administrator actions are written to the existing audit log.
- [x] City/local-area assignment, inheritance, banner overrides, and brand version snapshots are implemented.
- [ ] A secure storage upload pipeline for new files remains deferred. Admins can select approved `public/images/` assets or enter an approved hosted asset URL without exposing privileged upload credentials in the browser.

## Initial brand direction

| Field | Initial value |
|---|---|
| Primary Bengali name | নতুন বাজার |
| English name | Notun Bazar |
| Bengali tagline | পাড়ার দোকান, হাতের কাছে। |
| English tagline | Neighbourhood shops, within reach. |
| Starting palette | Forest green `#315B42`, dark green `#263B2D`, soft sage `#DCE5DA`, warm cream |

## Available visual assets

The following assets are already present in `public/images/`. Their intended placement must be confirmed before publication; file names alone are not sufficient to decide brand/logo/banner semantics.

| Asset | Dimensions | Planned review/use |
|---|---:|---|
| `notun-bazar-banner.png` | 1774 × 887 | Candidate desktop homepage hero/banner |
| `notun-bazar-banner2.png` | 1774 × 887 | Candidate campaign or location banner |
| `notun-bazar-banner3.png` | 1774 × 887 | Candidate campaign or location banner |
| `notun-bazar-banner4.png` | 2172 × 724 | Candidate wide banner/wordmark artwork |
| `notun-bazar-location-logo.png` | 2172 × 724 | Candidate location/wordmark artwork |
| `notun-bazar-location.png` | 1254 × 1254 | Candidate location pin/icon artwork |

Before implementation, confirm which asset is the approved horizontal wordmark, storefront pin, desktop hero, mobile hero, and any image that already contains embedded text.

## Phase 0 — brand audit and design decisions

- [ ] Inventory every customer-facing hardcoded `3cr`, `Nearby`, and legacy label in storefront UI, Astro metadata, emails, auth pages, checkout, and public documentation.
- [ ] Decide the first public launch locale: Bengali-primary with English support, or locale-selectable Bengali/English.
- [ ] Define final asset usage, copyright/source records, alt text, and whether each banner contains embedded copy.
- [ ] Define desktop/mobile crop rules and image performance limits.
- [ ] Decide whether Notun Bazar replaces the default public brand immediately or is first published as a draft/preview.
- [ ] Preserve internal identifiers, order references, URLs, historical records, and existing data relationships.

## Phase 1 — brand data model and publication safety

- [ ] Add versioned Supabase migrations for stable brand IDs, slugs, localized names/taglines, logo/icon assets, theme colors, and default banner references.
- [ ] Validate slugs, hex colors, CTA destinations, image format/size, and required accessible text.
- [x] Add city and local-area location records with stable IDs; never resolve an assignment from city display text alone.
- [x] Add brand assignments for marketplace default, city, and local area.
- [x] Add location-specific banner overrides that can retain the inherited brand.
- [ ] Model banner placement, desktop/mobile assets, editable headline/tagline, alt/decorative state, CTA label/destination, draft/published status, and version history.
- [x] Enforce one active marketplace default and one active assignment per location.
- [ ] Prevent deletion or unpublishing of the active default before a replacement is published.
- [x] Publish related brand, assignment, and banner changes atomically while retaining the prior published configuration on failure.

## Phase 2 — shared storefront brand resolver

- [x] Build one reusable resolver model/service shared by browser and Astro/server code where possible.
- [x] Resolve brand deterministically: local-area assignment → parent-city assignment → published marketplace default → built-in Notun Bazar fallback.
- [x] Resolve hero separately: area banner → compatible city banner → resolved brand default banner.
- [x] Prevent cross-brand inheritance: an area using another brand must never inherit its city’s artwork.
- [ ] Handle absent, deleted, stale, and unsupported selected locations by falling back safely to the published default.
- [x] Refresh customer-facing brand configuration from selected city/area URL parameters or saved location state.
- [ ] Keep client/server resolution and cache keys consistent by location and locale.

## Phase 3 — public storefront and metadata

- [ ] Replace public hardcoded legacy brand copy through a central brand configuration.
- [ ] Apply resolved identity to header, logo, icon, hero, theme CSS variables, footer, auth/public checkout surfaces, and relevant public copy.
- [ ] Support Bengali and English names/taglines; retain both as editable content even before a full locale selector exists.
- [ ] Render editable banner copy as accessible application text when it is not embedded in the image.
- [ ] Avoid duplicate text when an approved image already contains lettering; provide equivalent accessible text for image-only information.
- [ ] Apply title, description, favicon, and social metadata where Astro rendering mode allows location-aware values.
- [ ] Document static-rendering limits for per-location metadata and define a safe fallback.
- [ ] Verify existing shopping, cart, checkout, and account flows are visually unaffected by a brand change.

## Phase 4 — secured admin branding workspace

- [ ] Add a Branding area to the existing admin workspace, using the current admin/super-admin permission model.
- [ ] Allow authorized admins to create, edit, preview, and publish brand profiles.
- [x] Support approved asset replacement by URL, localized copy, theme colors, optional CTA, and desktop/mobile artwork.
- [x] Allow assignment to marketplace default, city, and local area, plus location-only banner overrides.
- [x] Show inheritance choices and reset-to-inherit controls through the location override editor.
- [x] Provide desktop/mobile artwork fields for a selected city or local area.
- [ ] Restrict draft reads/assets to authorized staff; expose only published branding to customers.
- [ ] Keep privileged upload credentials server-side and validate uploads on a trusted path.
- [ ] Record creator, editor, publisher, and publish time in the existing admin audit model.
- [ ] Prevent self-promotion and preserve existing super-admin restrictions.

## Phase 5 — verification and rollout

- [ ] Verify an unassigned location renders the Notun Bazar default.
- [ ] Verify a city can override its banner without switching brands.
- [ ] Verify an area can override its city banner or select another brand.
- [ ] Verify an area on a different brand never inherits its city brand artwork.
- [ ] Verify clearing an override restores the expected inherited brand/banner.
- [ ] Verify drafts remain invisible to anonymous customers and publishing updates the storefront without a rebuild.
- [ ] Verify a regular customer cannot read or modify draft branding.
- [ ] Verify a failed upload or publish leaves the last published configuration live.
- [ ] Verify mobile layout, performance, accessibility, and existing commerce flows.

## Dependencies and operating rules

- Complete checkout/delivery launch-critical work before a broad multi-location branding rollout.
- Use new ordered migrations only; do not edit applied migrations.
- Implement each phase on a dedicated feature branch and merge through a reviewed pull request.
- Do not publish a brand or location override until asset usage and fallback behavior have been verified.
