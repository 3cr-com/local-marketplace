# NTN-BZR-4 — Shop address search and map pinning

## Issue details

- **Issue ID:** NTN-BZR-4
- **Title:** Capture the actual shop location without assuming the seller's device location
- **Status:** Planned
- **Priority:** High before broad multi-city seller onboarding

## Description

Browser geolocation returns the seller's current device position. That is useful only when the seller is physically at the shop. It must not silently become the pickup location for a shop at another address.

## Planned implementation

- Ask whether the seller is currently at the shop before enabling **Use current location**.
- Add an address-search flow that runs only after an explicit search action, never autocomplete on each keystroke.
- Let the seller confirm the result by placing or dragging a pin on a map.
- Save the selected latitude/longitude with the structured pickup address; show the saved point when editing.
- Use OpenStreetMap map data with visible attribution and cache successful searches.
- If public Nominatim is used for the pilot, respect its 1-request-per-second application-wide limit, use an identifying User-Agent via a server proxy, and provide a provider-switch boundary.
- Do not send personal address data to a third-party geocoder without a clear user action and privacy disclosure.
- Provide manual latitude/longitude entry as a fallback when search or map loading is unavailable.

## Acceptance criteria

- A seller opening a shop at a remote address cannot accidentally save their own current-device coordinates as the shop location.
- A seller can search, verify, and save the actual shop position.
- Delivery-distance calculations use the confirmed pickup coordinates.
- OSM attribution is visible and public Nominatim policy limits are observed.
