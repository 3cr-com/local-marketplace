# NTN-BZR-5 — Customer Search and Shopfronts

## Purpose

Give customers a focused discovery flow: global product/shop search, a full search results page, and a dedicated public storefront for each active shop. A customer can browse across the marketplace, but the cart remains restricted to one shop per order.

## Scope

- Add `/search/` with a sticky search bar, live product and shop matches, category filters, sorting, and a responsive filter panel.
- Add `/shop/?id=<shop-id>` with shop cover image, logo/image, owner identity, address, opening state, categories, and that shop's active products only.
- Make product shop names and global shop results link to that storefront.
- Add public shop cover/image and owner avatar fields.
- Let shop owners upload a shop image; let every authenticated profile upload an avatar.
- Use safe placeholder artwork whenever no image has been uploaded.

## Data and security

- Store only public shop fields in public storefront responses.
- Do not expose phone numbers, private profile fields, or inactive shop/product data.
- Use an RPC for public search/shopfront data so profile RLS remains private.
- Use a public `marketplace-images` storage bucket. Uploads are limited to the authenticated user’s folder; reads are public.

## Acceptance checks

1. A search for a product returns matching products and matching shop names on `/search/`.
2. Clicking a shop opens only that shop's active, in-stock catalogue.
3. Adding an item from a shop still prevents mixing a second shop in the cart.
4. Shop image, owner avatar, owner name, public address, and hours render safely with placeholders.
5. Seller shop editor and profile page upload images without exposing a service key.
6. The search and shopfront layouts work at phone, tablet, and desktop widths.

## Delivery notes

This feature requires migration `20261124000000_add_customer_shopfronts_and_images.sql` before the new public shopfront/search data and uploads work.
