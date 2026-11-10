# SGS Booking — Claude Code Instructions

Not built yet; this file and the spec describe the planned plugin.

## What This Is

A thin WordPress plugin that connects to the Small Giants Booking System (a standalone Next.js application) via its REST API. Provides Gutenberg blocks for embedding booking forms on WordPress sites. **This plugin is a frontend client only: it stores no booking data and has no database tables.**

Full spec: `.claude/specs/03-SGS-BOOKING.md` (plugin structure, configuration options, terminology, design system, API tables, phases).

## Architecture: Thin API Client

**The plugin NEVER** (the booking system owns all of these, and a second copy in WordPress would drift from it):
- Creates database tables
- Calculates availability
- Syncs calendars
- Processes payments server-side
- Sends emails or notifications
- Stores OAuth tokens

Data flow: `render.php` injects the cached organisation branding as CSS custom properties and outputs data attributes (API URL, org slug, type slug; never the API key); `view.js` (Interactivity API, `viewScriptModule`) calls `GET /api/v1/book/{org}/{type}/availability` and `POST .../create`; payment is Stripe Elements client-side only.

## Design

Visual design inherits the booking system through the API's branding endpoint (`--brand-*` custom properties); never hardcode colours. The spec's Design System section holds the palette, motion and component looks. All customisation comes from the API, not block settings. No-JS fallback links to the hosted booking page.

- No serif heading fonts, no spinning-circle loaders, no thin grey borders on white cards, no uniform card grids (they make the block read as a bolted-on widget).

## Conventions

- Monday is the first day of the week in every calendar UI (UK/ISO 8601). The booking system uses `0 = Sunday` (JS `Date.getDay()`), so reorder when displaying.
- `stepOrder` block attribute: `service-first` (default) or `provider-first` (clinics pick the doctor first).

## Security Rules (Non-Negotiable)

1. **Every API response value is escaped** (`esc_html()`, `esc_attr()`, `esc_url()`, `wp_json_encode()`), and frontend JS uses `textContent` (or Interactivity API templates), never `innerHTML`, for API data. API data is untrusted.
2. **Never inject `customCss`** from the branding response (XSS vector). Discard silently.
3. **API key encrypted in wp_options**: AES-256-CBC via `wp_salt('auth')`.
4. **API key never in frontend**: not in HTML, JS, data attributes, or API responses to browsers.
5. **HTTPS enforced**: refuse API calls to HTTP URLs.
6. **SSRF protection**: validate the API URL resolves to a public IP, not a private or reserved range.
7. **Admin pages require `manage_options`**, with nonce verification on all form submissions.

## Caching

Cached API data (organisation branding, booking types, single type, providers): transients with one lifetime, `sgs_booking_cache_ttl` (default 10 minutes, range 1-60). Availability, booking creation and payments are NEVER cached (stale cache means double bookings).

## Build

Source in `src/` is TypeScript (`.tsx`/`.ts`); `build/` is compiled output.

## Build Order and API Dependency

**This is the LAST component to build.** The booking system must complete its Phase 1 (steps 1-11) and add the missing API endpoints before the WP plugin can function. Phases: spec §Phased Build Plan.

The plugin depends on the booking system's REST API. Existing and missing endpoints, the open security-fix list and phase priorities: spec §Booking System API Requirements (re-check against the booking-system repo first, because it can move).
