# SGS Booking — WordPress API Client Plugin

## Purpose

A thin WordPress plugin that connects to the Small Giants Booking System (a standalone Next.js application) via its REST API. The plugin provides Gutenberg blocks and shortcodes for embedding booking forms on any WordPress site.

**The plugin does NOT store booking data, calculate availability, sync calendars, process payments server-side, or send emails.** All of that is handled by the booking system. This plugin is a frontend client only.

### Why This Architecture

The booking system is a separate Next.js application (`booking-system` repo) with:
- PostgreSQL database (12 tables via Drizzle ORM)
- Availability calculation engine (pure function, 23 tests)
- Google Calendar + Outlook OAuth sync
- BullMQ job queue for email reminders
- Resend + React Email for transactional email
- Supabase Auth for dashboard login
- tRPC dashboard for org owners

Rebuilding any of this in PHP would create two sources of truth, two availability engines that can disagree, and double the maintenance. Instead, the WP plugin calls the booking system's public REST API — the same API that the hosted booking pages and the planned embed widget use.

---

## Use Cases Across Projects

| Client/Project | Booking type | Providers | Payment |
|---|---|---|---|
| **ibraheemmustafa.com** | Consultation bookings, online and in-person | 1 (Bean) | Stripe |
| **All Purpose Maintenance** | Tenant booking slots + contractor calendars | Multiple contractors | None (internal) |
| **GP/Doctor appointments** | Patient appointment booking | Multiple doctors | None or Stripe |
| **Mosque Web Design** | Performance, nikah, and more booking enquiries | 1 | Deposit via Stripe |
| **Muslims in Construction** | Event tickets (replacing MEC Pro) | N/A (event-based) | Stripe / Mollie |
| **HelpingDoctors EHR** | Patient appointments, online and in-person | Multiple clinicians | N/A |

**Note on events:** The booking system does not yet support events/ticketing. The Muslims in Construction use case is deferred until event support is added to the booking system. See Phase 3 below.

---

## Responsibility Split

### Booking System Handles (Next.js)

- All data storage (PostgreSQL)
- Availability calculation (working hours + overrides + calendar busy + bookings + buffer)
- Google Calendar and Outlook OAuth and 2-way sync
- Booking creation with double-booking prevention
- Email sending (Resend) and reminder scheduling (BullMQ)
- ICS calendar file generation
- Stripe Payment Intent creation and webhook processing
- Invoice/receipt generation
- Admin dashboard (tRPC + React)
- Multi-tenant data isolation (org-scoped)
- Rate limiting and bot protection on public endpoints

### WP Plugin Handles

- Gutenberg blocks for embedding booking UI on WordPress pages
- Admin settings page (API URL, API key, org slug)
- Frontend JavaScript for the booking flow (date picker, time slots, form, payment)
- Stripe Elements rendering on the frontend (client-side only — no server-side Stripe)
- Transient-based caching of API responses (org branding, booking types)
- Output escaping of all data received from the API
- Progressive enhancement fallback (link to hosted page when JS is unavailable)

---

## Terminology Mapping

The booking system and this plugin use different terms for the same concepts. This table is the canonical reference.

| Booking System (API) | WP Plugin (user-facing) | Description |
|---|---|---|
| `bookingType` | Service | An appointment type (e.g., "30-min Consultation") |
| `organiser` / `user` | Provider | The person conducting the appointment |
| `organisation` | Organisation | The business/tenant account |
| `orgSlug` | Organisation slug | URL-safe identifier for the business |
| `typeSlug` | Service slug | URL-safe identifier for the booking type |
| `customFields` | Custom form fields | Dynamic fields configured per booking type |
| `branding` | Theme/branding | Colours, logo, font per organisation |

The plugin's PHP code and admin UI use the WP terms (service, provider). API calls use the booking system's terms (bookingType, organiser). The mapping happens inside `SGS_API_Client`.

---

## Design System — "Dark Confidence" (inherited from booking system)

The booking system established a design system called "Dark Confidence" (2026-03-15). The WordPress plugin inherits this for all client-facing booking UI. Full spec in the booking system's `CLAUDE.md` and in `plugins/sgs-booking/CLAUDE.md`.

**Key constraints for the WP plugin:**

- **Public booking flow:** Warm cream background (`#FAF8F5`), orange (`#F87A1F`) CTAs, teal (`#0F7E80`) for info/confirmation
- **Per-org theming:** The API branding endpoint returns colours, logo, font. Plugin injects these as `--brand-*` CSS custom properties. Never hardcode colours.
- **ADHD-friendly UX:** Focus isolation (hovered element brightens, siblings dim to ~60%), spring-based animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`), high-contrast hover/focus/active states
- **Calendar:** Orange dot indicator on available dates, not highlighted backgrounds
- **Time slots:** Pill-shaped, flex-wrap layout, hover slides right with orange border
- **Form inputs:** Bottom-border only, floating labels on focus
- **Loading:** Pulsing orange dot sequence — never spinning circles
- **Confirmation:** Teal circle + white tick with pop animation, copy says "You're booked in"
- **Anti-patterns:** No serif fonts, no grey-on-white cards, no `ease-in-out` transitions, no uniform grids, no `innerHTML` for API data (XSS risk)

**Product vision (future phases):**
- Phase B: Onboarding wizards, guided tutorials, contextual tooltips
- Phase C: AI chatbot for guidance/support/booking automation (N8N + RAG)
- Phase D: Freemium model with paid extras (chatbot automation, advanced analytics)

---

## Conventions

- **Monday is the first day of the week.** All calendar UIs (date pickers, schedule tables, working hours displays) show Monday first, Sunday last. This is the UK/ISO 8601 convention. The booking system internally uses `0 = Sunday` (JavaScript `Date.getDay()`), so the WP plugin must reorder when displaying. The mapping: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0.
- **UK English** in all user-facing text, code comments, and variable names (organisation, colour, cancelled).
- **44px minimum touch targets** on all interactive elements (WCAG 2.2 AA).
- **Currency defaults to GBP**, displayed with `£` symbol.
- **Timezone defaults to `Europe/London`.**

---

## Plugin Structure

```
sgs-booking/
├── sgs-booking.php                  # Plugin bootstrap (singleton loader)
├── uninstall.php                    # Remove wp_options entries on uninstall
├── package.json                     # @wordpress/scripts for block builds
│
├── includes/
│   ├── class-sgs-booking.php        # Main plugin class (singleton, hooks registration)
│   ├── class-api-client.php         # HTTP client for booking system REST API
│   ├── class-encryption.php         # API key encryption/decryption using wp_salt()
│   │
│   ├── admin/
│   │   └── class-admin-settings.php # Settings page: API URL, API key, org slug, connection test
│   │
│   └── blocks/
│       ├── booking-form/
│       │   ├── block.json           # Block metadata (attributes, viewScriptModule)
│       │   └── render.php           # Server-side render: data attributes + no-JS fallback
│       │
│       ├── booking-types/
│       │   ├── block.json
│       │   └── render.php           # Server-side render: list of services
│       │
│       └── provider-schedule/
│           ├── block.json
│           └── render.php           # Server-side render: provider availability display
│
├── src/                             # Source files compiled by @wordpress/scripts
│   ├── booking-form/
│   │   ├── index.ts                 # Block registration
│   │   ├── edit.tsx                 # Editor preview component
│   │   ├── view.ts                  # viewScriptModule: booking flow (Interactivity API)
│   │   └── style.css                # Frontend styles
│   │
│   ├── booking-types/
│   │   ├── index.ts
│   │   ├── edit.tsx
│   │   ├── view.ts
│   │   └── style.css
│   │
│   ├── provider-schedule/
│   │   ├── index.ts
│   │   ├── edit.tsx
│   │   ├── view.ts
│   │   └── style.css
│   │
│   └── shared/
│       ├── api.ts                   # Fetch wrapper (builds URLs, handles errors)
│       ├── stripe.ts                # Stripe Elements loader and payment flow
│       └── types.ts                 # TypeScript types matching the booking system API
│
├── build/                           # Compiled output (@wordpress/scripts)
│
└── assets/
    └── css/
        └── admin.css                # Admin settings page styles
```

### What Is NOT in This Plugin

- **No `models/` directory** — no local data models, no database tables
- **No `services/` directory** — no availability engine, calendar sync, payment handler, notification sender, or ICS generator
- **No `api/` directory** — no WordPress REST endpoints (the booking system provides the API)
- **No `templates/email/` directory** — the booking system sends all emails
- **No `vendor/fullcalendar/`** — no admin calendar view (use the booking system dashboard)
- **No `class-installer.php`** — no database tables to create

---

## Database

**None.** This plugin creates zero database tables.

All data is stored in the booking system's PostgreSQL database. The WP plugin stores only configuration in `wp_options`:

| Option Key | Value | Encrypted |
|---|---|---|
| `sgs_booking_api_url` | Base URL of the booking system (e.g., `https://booking.example.com`) | No |
| `sgs_booking_api_key` | Organisation API key | Yes (AES-256-CBC via `wp_salt()`) |
| `sgs_booking_org_slug` | Organisation slug | No |
| `sgs_booking_default_type_slug` | Default service slug (optional, for single-service sites) | No |
| `sgs_booking_cache_ttl` | Cache duration in minutes (default: 10) | No |

---

## API Client (`SGS_API_Client`)

A single PHP class that wraps all HTTP calls to the booking system. Used by `render.php` files and the admin settings page.

### Methods

```php
class SGS_API_Client {

    // Connection
    public function test_connection(): bool|WP_Error;

    // Organisation
    public function get_organisation(): array|WP_Error;

    // Booking Types (Services)
    public function get_booking_types(): array|WP_Error;
    public function get_booking_type( string $type_slug ): array|WP_Error;

    // Availability
    public function get_availability( string $type_slug, string $date, string $timezone ): array|WP_Error;

    // Bookings
    public function create_booking( string $type_slug, array $data ): array|WP_Error;
    public function get_booking_status( string $booking_id, string $token ): array|WP_Error;
    public function cancel_booking( string $booking_id, string $token ): array|WP_Error;

    // Payment
    public function create_payment_intent( string $type_slug, array $data ): array|WP_Error;

    // Providers (Phase 2)
    public function get_providers(): array|WP_Error;
}
```

### Implementation Rules

1. **All HTTP calls via `wp_remote_get()` / `wp_remote_post()`** — never `file_get_contents()` or cURL directly
2. **API key sent as `Authorization: Bearer {key}` header** on all requests
3. **HTTPS enforced** — refuse to make requests to HTTP URLs
4. **Timeouts:** 10 seconds for reads, 30 seconds for writes (booking creation, payment)
5. **Error handling:** return `WP_Error` on failure, never throw
6. **Response parsing:** `json_decode()` with `true` for associative arrays, validate structure before returning
7. **Every string value escaped before returning to caller** — `sanitize_text_field()` on all scalar values in the response

### Caching Strategy

Uses WordPress transients (`set_transient()` / `get_transient()`).

| Data | Cache Key Pattern | TTL | Reason |
|---|---|---|---|
| Organisation branding | `sgs_org_{slug}` | 15 minutes | Rarely changes |
| Booking types list | `sgs_types_{slug}` | 10 minutes | Changes infrequently |
| Single booking type | `sgs_type_{slug}_{typeSlug}` | 10 minutes | Changes infrequently |
| Provider list | `sgs_providers_{slug}` | 10 minutes | Changes infrequently |
| Availability slots | **Never cached** | N/A | Real-time data — stale cache = double bookings |
| Booking creation | **Never cached** | N/A | Write operation |
| Payment intents | **Never cached** | N/A | Write operation |

The admin settings page includes a "Clear Cache" button that deletes all `sgs_*` transients.

---

## Admin Settings Page

A single page under **Settings > SGS Booking** in the WordPress admin.

### Fields

1. **API URL** — text field, required. Validated:
   - Must start with `https://` (HTTP rejected with error notice)
   - Must not contain path (just the base URL)
   - Must not point to a private/reserved IP range (SSRF protection)
   - Trailing slash stripped automatically
2. **API Key** — password field, required. Stored encrypted in `wp_options` via `SGS_Encryption`
3. **Organisation Slug** — text field, required. Alphanumeric + hyphens only
4. **Default Service Slug** — text field, optional. If set, the booking form block defaults to this service instead of showing the service selection step
5. **Cache Duration** — number field, default 10 minutes. Range: 1-60

### Connection Status

On page load and on "Test Connection" button click:
1. Call `SGS_API_Client::test_connection()` (hits the booking system's `/api/v1/health` endpoint)
2. If successful, call `SGS_API_Client::get_organisation()` to verify the API key and org slug are valid
3. Display:
   - Green: "Connected to {org name}" with branding preview (logo, primary colour)
   - Red: "Connection failed: {error message}" with specific guidance (wrong URL, invalid API key, org not found)

### Security

- Page requires `manage_options` capability
- All fields processed through `sanitize_text_field()` before saving
- Nonce verification on form submission (`wp_nonce_field()` / `wp_verify_nonce()`)
- API key displayed as masked dots after saving (never shown in plaintext)

---

## Gutenberg Blocks

### Booking Form Block (`sgs/booking-form`)

The primary block. Renders the full booking flow on any WordPress page.

#### Block Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `typeSlug` | `string` | `""` | If set, locks to a single service (skips service selection step). If empty, shows service selection |
| `showProviderSelection` | `boolean` | `true` | Show provider selection step when multiple providers are available |
| `stepOrder` | `string` | `"service-first"` | `service-first`: Select Service then Provider. `provider-first`: Select Provider then Service. Controls which selection appears first in the flow. Useful for clinic sites where patients pick a doctor first, vs. general sites where customers pick a service first |
| `layout` | `string` | `"card"` | Visual layout: `card` (contained) or `inline` (full-width) |

#### Editor Preview (`edit.tsx`)

In the block editor, shows:
- Block controls for selecting `typeSlug` from a dropdown (fetched from the API)
- Toggle for `showProviderSelection`
- Step order selector (`service-first` or `provider-first`)
- Layout selector
- A non-interactive preview of the booking form's first step, styled with the org's branding

If the API connection is not configured, shows a notice: "Configure SGS Booking in Settings > SGS Booking to use this block."

#### Server-Side Render (`render.php`)

Outputs a container `<div>` with data attributes that the frontend JS reads:

```php
<?php
$api = SGS_API_Client::instance();
$org = $api->get_organisation();

if ( is_wp_error( $org ) ) {
    return; // Fail silently on frontend — no broken UI for visitors
}

$type_slug = $attributes['typeSlug'] ?: get_option( 'sgs_booking_default_type_slug', '' );
$api_url   = esc_url( get_option( 'sgs_booking_api_url' ) );
$org_slug  = sanitize_text_field( get_option( 'sgs_booking_org_slug' ) );

// Inject branding as CSS custom properties
$branding = $org['branding'] ?? [];
?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-sgs-booking-form
    data-api-url="<?php echo esc_attr( $api_url ); ?>"
    data-org-slug="<?php echo esc_attr( $org_slug ); ?>"
    data-type-slug="<?php echo esc_attr( $type_slug ); ?>"
    data-show-provider="<?php echo esc_attr( $attributes['showProviderSelection'] ? 'true' : 'false' ); ?>"
    data-step-order="<?php echo esc_attr( $attributes['stepOrder'] ); ?>"
    data-layout="<?php echo esc_attr( $attributes['layout'] ); ?>"
    style="
        --brand-primary: <?php echo esc_attr( $branding['primaryColour'] ?? '#1B6B6B' ); ?>;
        --brand-accent: <?php echo esc_attr( $branding['accentColour'] ?? '#E8B931' ); ?>;
        --brand-text: <?php echo esc_attr( $branding['textColour'] ?? '#1a1a1a' ); ?>;
        --brand-background: <?php echo esc_attr( $branding['backgroundColour'] ?? '#ffffff' ); ?>;
        --brand-radius: <?php echo esc_attr( $branding['borderRadius'] ?? 'md' ); ?>;
    "
>
    <!-- No-JS fallback: link to hosted booking page -->
    <noscript>
        <a href="<?php echo esc_url( $api_url . '/book/' . $org_slug . '/' . $type_slug ); ?>"
           class="sgs-booking-fallback-link">
            Book an appointment
        </a>
    </noscript>
</div>
```

**Critical:** `customCss` from the branding object is NEVER injected. It is an XSS vector. Only the predefined CSS custom properties are used.

#### Frontend Booking Flow (`view.ts`)

Client-side application using the WordPress Interactivity API. The flow has up to 6 steps, but steps are skipped when not needed, so a minimal booking (single service, single provider, free) is just 3 steps.

#### Selection Steps (order controlled by `stepOrder` attribute)

**Select Service** (skipped if `typeSlug` is set)
- Fetches `GET /api/v1/book/{orgSlug}/types` from the booking system
- Renders service cards: name, duration, price, description
- Customer taps a service to proceed

**Select Provider** (skipped if `showProviderSelection` is `false` or only one provider)
- Fetches `GET /api/v1/book/{orgSlug}/providers`
- Renders provider cards: name, avatar, bio
- Customer taps a provider to proceed

When `stepOrder` is `service-first` (default): Select Service appears first, then Select Provider. This is the natural flow for most sites — "I want a consultation, who's available?"

When `stepOrder` is `provider-first`: Select Provider appears first, then Select Service. This is better for clinics, salons, or any site where customers choose a person first — "I want to see Dr. Khan, what appointments does she offer?"

If both steps are skipped (single service via `typeSlug` + single/no provider), the flow starts directly at Select Date and Time.

#### Remaining Steps (always in this order)

**Select Date and Time**
- Date picker: calendar grid showing the current month, with available dates highlighted
- On date selection, fetches `GET /api/v1/book/{orgSlug}/{typeSlug}/availability?date=YYYY-MM-DD&timezone=...`
- Time slot grid: available slots as tappable buttons
- Customer's timezone detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Step 4: Your Details**
- Fields: name (required), email (required), phone (optional), notes (optional)
- Dynamic custom fields rendered from `bookingType.customFields` in the API response
- Custom field types: text, textarea, select, checkbox, radio, file, email, phone, number
- Client-side validation before submission
- All inputs have minimum 44px touch targets (WCAG 2.2 AA)

**Step 5: Payment** (skipped if service is free / `requiresPayment` is `false`)
- Calls `POST /api/v1/book/{orgSlug}/{typeSlug}/payment-intent` to create a Stripe Payment Intent
- Loads Stripe.js (`https://js.stripe.com/v3/`) and mounts Stripe Elements (card input)
- Customer completes payment
- On success, proceeds to step 6
- On failure, shows error and lets customer retry
- The Stripe publishable key is returned by the booking system API in the payment intent response

**Step 6: Confirmation**
- Calls `POST /api/v1/book/{orgSlug}/{typeSlug}/create` with all collected data
- Displays:
  - Booking reference (booking ID)
  - Date, time, duration, service name
  - "Add to Google Calendar" link (constructed client-side)
  - "Download .ics file" link (points to booking system's ICS endpoint, authenticated via token)
  - "Cancel booking" link (points to booking system's cancel URL with cancellation token)
- Animated transition between steps (CSS transitions, no heavy animation library)

#### Accessibility

- All steps are within a single `<form>` element with `aria-live="polite"` region
- Step transitions announced to screen readers via `aria-label` on the active step
- Focus moved to the first interactive element of each new step
- All interactive elements have visible focus indicators
- Colour contrast meets WCAG 2.2 AA (4.5:1 for text, 3:1 for large text/UI components)
- Error messages associated with inputs via `aria-describedby`
- Calendar date picker supports keyboard navigation (arrow keys, Enter, Escape)
- 44px minimum touch targets on all buttons and inputs

---

### Booking Types Block (`sgs/booking-types`)

Displays a grid/list of available services. Each card links to the booking form (either on the same page via anchor, or on a separate page).

#### Block Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `layout` | `string` | `"grid"` | `grid` (cards) or `list` (rows) |
| `columns` | `number` | `3` | Grid columns (2-4) |
| `showPrice` | `boolean` | `true` | Display price on each card |
| `showDuration` | `boolean` | `true` | Display duration on each card |
| `bookingPageUrl` | `string` | `""` | URL of the page containing the booking form block. Cards link here with `?service={slug}` |

#### Server-Side Render (`render.php`)

Fetches booking types from the API via `SGS_API_Client::get_booking_types()` (cached). Renders a grid of cards with:
- Service name
- Description (truncated to 120 characters)
- Duration (e.g., "30 minutes")
- Price (e.g., "£45.00" or "Free")
- "Book now" button linking to the booking page

All text values escaped with `esc_html()`. URLs escaped with `esc_url()`.

---

### Provider Schedule Block (`sgs/provider-schedule`)

Displays a provider's general availability for "Meet our team" or "Our hours" pages. Does NOT show real-time slot availability — that would require the full booking form.

#### Block Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `providerId` | `string` | `""` | Specific provider to show (empty = first/default) |
| `showBio` | `boolean` | `true` | Display provider bio |
| `showAvatar` | `boolean` | `true` | Display provider avatar |

#### Server-Side Render

Fetches provider details from the API. Renders:
- Provider name, avatar, bio
- Weekly schedule table (Mon-Sun with hours)
- "Book with {name}" button linking to the booking form

---

## Payment Integration (Stripe Elements)

### Architecture

The WP plugin handles **only the client-side payment UI**. All server-side Stripe operations happen in the booking system.

### Flow

```
1. Customer completes steps 1-4 (service, provider, date/time, details)
2. WP frontend JS calls booking system API:
   POST /api/v1/book/{orgSlug}/{typeSlug}/payment-intent
   Body: { amount, currency, customerEmail }
3. Booking system creates Stripe Payment Intent server-side
4. API returns: { clientSecret, publishableKey }
5. WP frontend loads Stripe.js, initialises with publishableKey
6. Stripe Elements card form rendered in the payment step
7. Customer enters card details and confirms
8. stripe.confirmCardPayment(clientSecret) called client-side
9. On success: WP frontend calls the create booking endpoint
10. Stripe webhook (to the booking system, NOT WordPress) confirms payment
11. Booking system updates booking status and sends confirmation email
```

### What the Plugin Does NOT Do

- Does not store Stripe keys (publishable key comes from the API, secret key never leaves the booking system)
- Does not handle Stripe webhooks (those go to the booking system)
- Does not process refunds (done via the booking system dashboard)
- Does not create Payment Intents (done by the booking system API)

---

## Security

### Output Escaping (Critical)

Every value received from the booking system API is untrusted. The API may return user-submitted data (client names, notes, custom field responses) that could contain HTML/JS.

| Context | Escaping function | Example |
|---|---|---|
| HTML text content | `esc_html()` | `<span><?php echo esc_html( $booking['clientName'] ); ?></span>` |
| HTML attributes | `esc_attr()` | `<input value="<?php echo esc_attr( $value ); ?>">` |
| URLs | `esc_url()` | `<a href="<?php echo esc_url( $url ); ?>">` |
| CSS custom property values | `esc_attr()` | Colour hex codes only — reject non-hex values |
| JavaScript data | `wp_json_encode()` | `<script>const data = <?php echo wp_json_encode( $data ); ?>;</script>` |

**Never** `echo` raw API response values. **Never** inject the API's `customCss` field into the page.

In the frontend JavaScript (`view.ts`), all API response strings must be set via `textContent` (not `innerHTML`) or rendered through the Interactivity API's template system (which auto-escapes).

### API Key Protection

1. **Encrypted at rest** — the API key is encrypted using AES-256-CBC with `wp_salt('auth')` as the key before storing in `wp_options`. The `SGS_Encryption` class handles this
2. **Never exposed to the frontend** — the API key is used only in server-side PHP (`render.php` and `SGS_API_Client`). It never appears in HTML, JavaScript, or data attributes
3. **Masked in admin UI** — after saving, the settings page shows `••••••••{last4}` instead of the full key
4. **Transmitted over HTTPS only** — the plugin refuses to make API calls to HTTP URLs

### SSRF Protection

The API URL field in admin settings is validated:
1. Must use `https://` protocol
2. Must resolve to a public IP (not `127.0.0.1`, `10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `::1`, `fc00::/7`)
3. Must not be a bare IP address (require a domain name)
4. Validated on save AND before each API call

### CSRF Protection

- Admin settings form uses `wp_nonce_field()` / `wp_verify_nonce()`
- The plugin does not register any WordPress REST endpoints, so WordPress REST nonce handling is not applicable
- The frontend booking form submits to the booking system's API (cross-origin), not to WordPress

### Capability Checks

- Settings page: `manage_options` (site administrators only)
- No other admin pages or capabilities needed (booking management happens in the booking system dashboard)

### Content Security

- Stripe.js loaded from `https://js.stripe.com/v3/` only — no other external scripts
- No inline `<script>` tags — all JS compiled via `@wordpress/scripts` and enqueued properly
- All CSS custom properties validated as hex colour codes or predefined token values before injection
- `customCss` from the booking system's branding response is **silently discarded** — never rendered

### Request Integrity

- All API requests include `Authorization: Bearer {api_key}` header
- Request signing (HMAC) is not implemented in Phase 1 — acceptable risk given HTTPS transport and API key rotation capability
- The booking system should implement API key rotation and the plugin should support updating the key without downtime

---

## Booking System API Requirements

The WP plugin depends on these booking system REST API endpoints. Some exist, some need building.

### Existing Endpoints (already built)

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/v1/health` | Done |
| `GET` | `/api/v1/book/{orgSlug}/{typeSlug}/availability?date=&timezone=` | Done |
| `POST` | `/api/v1/book/{orgSlug}/{typeSlug}/create` | Done |
| `GET` | `/api/v1/book/{orgSlug}/{typeSlug}/ics/{bookingId}` | Done (needs security fix — see below) |

### New Endpoints Required

| Method | Path | Purpose | Priority |
|---|---|---|---|
| `GET` | `/api/v1/book/{orgSlug}` | Organisation info + branding | Phase 1 |
| `GET` | `/api/v1/book/{orgSlug}/types` | List active booking types (name, slug, duration, price, custom fields, colour) | Phase 1 |
| `GET` | `/api/v1/book/{orgSlug}/{typeSlug}` | Single booking type details | Phase 1 |
| `GET` | `/api/v1/book/{orgSlug}/providers` | List providers (Phase 2 multi-provider) | Phase 2 |
| `POST` | `/api/v1/book/{orgSlug}/{typeSlug}/payment-intent` | Create Stripe Payment Intent | Phase 1 (payment) |
| `GET` | `/api/v1/bookings/{id}/status?token={cancellationToken}` | Booking status lookup | Phase 1 |
| `POST` | `/api/v1/bookings/{id}/cancel?token={cancellationToken}` | Cancel booking via email token | Phase 1 |
| `POST` | `/api/v1/bookings/{id}/reschedule?token={rescheduleToken}` | Reschedule booking via email token | Phase 2 |
| `GET` | `/api/v1/invoices/{id}/pdf?token={downloadToken}` | Download invoice PDF via token (for customer portal / email links) | Phase 1 |

### Booking System Security Fixes Required Before WP Integration

These are vulnerabilities in the booking system that must be fixed before the WP plugin can safely consume its API.

1. **ICS endpoint must require a token** — currently uses the booking UUID as access control. Must require `?token={cancellationToken}` or a dedicated ICS token. Without this, anyone who discovers a booking UUID can access PII (organiser email, attendee email, time, location)

2. **Rate limiting on public endpoints** — `/availability` and `/create` accept unlimited requests. Implement per-IP rate limiting (e.g., 60 requests/minute for reads, 5 bookings/minute for writes)

3. **Bot protection on booking creation** — add a honeypot field and/or Cloudflare Turnstile verification to the create endpoint

4. **Validate `clientTimezone`** — currently accepts any string up to 64 characters. Must validate against `Intl.supportedValuesOf('timeZone')` or a hardcoded IANA timezone list

5. **Remove `organisation.id` from public API responses** — the internal UUID is unnecessary for public consumers. Return only name, slug, and branding

6. **Add `customCss` to a denied-fields list** — the availability endpoint returns full branding including `customCss`. Either strip it from public responses or add a `publicBranding` projection that excludes it

7. **API key authentication** — add an `api_key` (hashed) column to the `organisations` table. Validate `Authorization: Bearer {key}` on endpoints that return sensitive data (org details, booking status). Public read endpoints (availability, booking types) may remain unauthenticated

8. **Token expiry** — `cancellationToken` and `rescheduleToken` should expire (e.g., 90 days after booking creation, or 30 days after the booking date, whichever is later)

---

## Phased Build Plan

### Phase 1 — Single Service Booking (MVP)

**Depends on:** Booking system steps 1-11 complete (scaffolding through ICS generation) + new API endpoints listed above.

- Plugin bootstrap (`sgs-booking.php`, singleton class)
- `SGS_Encryption` class (AES-256-CBC with `wp_salt()`)
- `SGS_API_Client` class (all methods except providers and payment)
- Transient caching layer
- Admin settings page (API URL, API key, org slug, connection test, cache clear)
- `sgs/booking-form` block — steps 3, 4, 6 only (date/time, details, confirmation)
  - `typeSlug` required (no service selection yet)
  - No payment step
  - No provider selection
- `sgs/booking-types` block — list of services from the API
- Accessibility audit of all blocks
- No-JS fallback (link to hosted booking page)

### Phase 2 — Payment and Multi-Provider

**Depends on:** Booking system Stripe integration + multi-provider (Phase 2 of booking system).

- Stripe Elements integration (`stripe.ts`)
- Step 5 (Payment) in booking form
- Step 1 (Select Service) in booking form — when `typeSlug` is not set
- Step 2 (Select Provider) in booking form
- `SGS_API_Client::get_providers()` and `::create_payment_intent()` methods
- `sgs/provider-schedule` block

### Phase 3 — Events and Ticketing

**Depends on:** Booking system adding event tables and API endpoints (currently not planned until Phase 4 of booking system).

- `sgs/event-list` block
- `sgs/event-tickets` block
- Event-specific booking flow

### Phase 4 — Advanced

- Deposit support (booking system returns `depositAmount` + `fullPrice` in payment intent response; WP frontend shows "Deposit: £X.XX" and charges only the deposit. Niche use case — wedding pianists, large event bookings)
- Shortcode fallback (`[sgs_booking]`) for classic editor sites
- Booking status page (customer enters reference + email to view/cancel)
- Customer invoice download (via `downloadToken` — link provided in booking confirmation emails, can be stored by plugin for logged-in customer portals)
- WP admin dashboard widget (today's bookings, fetched from API)
- Read-only booking list in WP admin (fetched from API, for sites that don't want to use the booking system dashboard)
- Webhook receiver: booking system notifies WP on booking create/cancel (for cache invalidation or WP-side actions)

---

## N8N Integration

The WP plugin does NOT interact with N8N directly. All notifications (email, SMS, WhatsApp) are triggered by the booking system when bookings are created, cancelled, or when reminders are due.

However, N8N can optionally be used for WordPress-specific automations (contact form submissions, page notifications, etc.) — these are unrelated to the booking flow and configured separately in the SGS Framework's core settings.

---

## Testing

### Manual Test Checklist (Phase 1)

1. Install plugin, navigate to Settings > SGS Booking
2. Enter invalid API URL (HTTP) — verify error message
3. Enter valid API URL, wrong API key — verify "invalid key" error
4. Enter valid API URL, valid API key, wrong org slug — verify "org not found" error
5. Enter all correct values — verify green "Connected to {org name}" status
6. Add `sgs/booking-form` block to a page with `typeSlug` set
7. Visit the page — verify date picker loads and shows available dates
8. Select a date — verify time slots load
9. Select a time, fill in details, submit — verify booking confirmed
10. Verify confirmation email received (sent by the booking system, not WP)
11. Click "Download .ics" — verify calendar file downloads
12. Click "Cancel booking" — verify cancellation page loads
13. Test with JavaScript disabled — verify fallback link appears
14. Test keyboard navigation through all steps
15. Test with screen reader (NVDA or VoiceOver)
16. Test on mobile (375px viewport) — verify 44px touch targets
17. Add `sgs/booking-types` block — verify service grid renders with correct data
18. Clear cache in settings — verify fresh data loads on next page visit

### Automated Tests (Future)

- PHPUnit for `SGS_API_Client` (mock HTTP responses)
- PHPUnit for `SGS_Encryption` (encrypt/decrypt round-trip)
- Playwright for end-to-end booking flow
