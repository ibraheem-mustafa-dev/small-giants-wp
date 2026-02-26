# SGS Booking — Claude Code Instructions

## What This Is

A thin WordPress plugin that connects to the Small Giants Booking System (a standalone Next.js application) via its REST API. Provides Gutenberg blocks for embedding booking forms on WordPress sites. **This plugin is a frontend client only — it stores no booking data and has no database tables.**

Full spec: `specs/03-SGS-BOOKING.md`

## Architecture: Thin API Client

The plugin calls the booking system's REST API for everything:
- Availability slots, booking types, org branding: `GET` requests to the booking system
- Booking creation: `POST` to the booking system
- Payment: Stripe Elements (client-side) + Payment Intent (created by booking system API)
- Emails, reminders, calendar sync, ICS files: all handled by the booking system

**The plugin NEVER:**
- Creates database tables
- Calculates availability
- Syncs calendars
- Processes payments server-side
- Sends emails or notifications
- Stores OAuth tokens

## Plugin Structure

```
sgs-booking/
├── sgs-booking.php              # Plugin bootstrap (singleton)
├── uninstall.php                # Remove wp_options only
├── includes/
│   ├── class-sgs-booking.php    # Main plugin class
│   ├── class-api-client.php     # HTTP client (wp_remote_get/post)
│   ├── class-encryption.php     # API key encryption (AES-256-CBC + wp_salt)
│   ├── admin/
│   │   └── class-admin-settings.php  # Settings page (API URL, key, org slug)
│   └── blocks/
│       ├── booking-form/        # Full booking flow block
│       ├── booking-types/       # Service list block
│       └── provider-schedule/   # Provider availability display block
├── src/                         # TypeScript source (@wordpress/scripts)
│   ├── booking-form/            # edit.tsx, view.ts (Interactivity API), style.css
│   ├── booking-types/
│   ├── provider-schedule/
│   └── shared/                  # api.ts, stripe.ts, types.ts
└── build/                       # Compiled output
```

## Data Flow

```
WordPress Page
  └─ Gutenberg Block (render.php)
       ├─ Injects org branding as CSS custom properties (from cached API response)
       ├─ Outputs data attributes (API URL, org slug, type slug)
       └─ Loads viewScriptModule
            └─ Frontend JS (Interactivity API)
                 ├─ Fetches availability: GET /api/v1/book/{org}/{type}/availability
                 ├─ Submits booking: POST /api/v1/book/{org}/{type}/create
                 └─ Stripe Elements for payment (client-side only)
```

## Configuration (wp_options)

| Key | Value | Encrypted |
|---|---|---|
| `sgs_booking_api_url` | Booking system base URL | No |
| `sgs_booking_api_key` | Organisation API key | Yes |
| `sgs_booking_org_slug` | Organisation slug | No |
| `sgs_booking_default_type_slug` | Default service slug (optional) | No |
| `sgs_booking_cache_ttl` | Cache duration in minutes (default: 10) | No |

## Terminology Mapping

| Booking System (API) | WP Plugin (user-facing) |
|---|---|
| `bookingType` | Service |
| `organiser` / `user` | Provider |
| `organisation` | Organisation |
| `orgSlug` | Organisation slug |
| `typeSlug` | Service slug |

## Conventions

- **Monday is the first day of the week** — all calendar UIs show Mon-Sun (UK/ISO 8601). The booking system uses `0 = Sunday` internally (JS `Date.getDay()`), so reorder when displaying.
- **Provider step order is configurable** — `stepOrder` block attribute: `service-first` (default) or `provider-first`. Clinics pick doctor first, general sites pick service first.
- UK English everywhere (organisation, colour, cancelled)
- 44px minimum touch targets (WCAG 2.2 AA)
- Currency defaults to GBP, timezone to `Europe/London`

## Security Rules (Non-Negotiable)

1. **Every API response value must be escaped** — `esc_html()`, `esc_attr()`, `esc_url()`, `wp_json_encode()`. Never `echo` raw values
2. **Never inject `customCss`** from the branding response — XSS vector. Discard silently
3. **API key encrypted in wp_options** — AES-256-CBC via `wp_salt('auth')`
4. **API key never in frontend** — not in HTML, JS, data attributes, or API responses to browsers
5. **HTTPS enforced** — refuse API calls to HTTP URLs
6. **SSRF protection** — validate API URL resolves to public IP, not private/reserved ranges
7. **Admin pages require `manage_options`** — nonce verification on all form submissions
8. **Frontend JS uses `textContent` not `innerHTML`** for API data — or Interactivity API template system

## Caching

- Organisation branding: 15 min transient
- Booking types list: 10 min transient
- **Availability: NEVER cached** (stale cache = double bookings)
- **Writes: NEVER cached** (booking creation, payment)

## Build Commands

```bash
npm run build         # Production build (TypeScript → JS)
npm run start         # Dev with hot reload
```

Source in `src/` is TypeScript (`.tsx`/`.ts`). The `build/` directory is compiled output.

## Deploy

```bash
# Build first
npm run build

# Deploy plugin files (run from repo root)
scp -r plugins/sgs-booking/sgs-booking.php plugins/sgs-booking/uninstall.php plugins/sgs-booking/includes plugins/sgs-booking/build hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-booking/

# Clear LiteSpeed cache (wp litespeed-purge is broken on this host)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset PHP OPcache after deploying PHP files (CLI reset is a SEPARATE pool — must use HTTP)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

## Phased Build

- **Phase 1:** Settings page + API client + booking-form block (date/time, details, confirmation) + booking-types block
- **Phase 2:** Stripe Elements payment + multi-provider selection + provider-schedule block
- **Phase 3:** Events + ticketing (requires booking system to add event support)
- **Phase 4:** Shortcode fallback, WP admin dashboard widget, webhook receiver

**This is the LAST component to build.** The booking system must complete its Phase 1 (steps 1-11) and add the missing API endpoints before the WP plugin can function.

## Booking System API Dependency

The plugin requires these endpoints. Check the booking system repo to see which exist:

| Endpoint | Status |
|---|---|
| `GET /api/v1/health` | Exists |
| `GET /api/v1/book/{orgSlug}/{typeSlug}/availability` | Exists |
| `POST /api/v1/book/{orgSlug}/{typeSlug}/create` | Exists |
| `GET /api/v1/book/{orgSlug}/{typeSlug}/ics/{bookingId}` | Exists (needs token auth fix) |
| `GET /api/v1/book/{orgSlug}` | Needs building |
| `GET /api/v1/book/{orgSlug}/types` | Needs building |
| `GET /api/v1/book/{orgSlug}/{typeSlug}` | Needs building |
| `POST /api/v1/book/{orgSlug}/{typeSlug}/payment-intent` | Needs building |
| `GET /api/v1/bookings/{id}/status?token=` | Needs building |
| `POST /api/v1/bookings/{id}/cancel?token=` | Needs building |
| `GET /api/v1/book/{orgSlug}/providers` | Needs building (Phase 2) |
| `GET /api/v1/invoices/{id}/pdf?token=` | Being built (invoice PDF download via token) |
