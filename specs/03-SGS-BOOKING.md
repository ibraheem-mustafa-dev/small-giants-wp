# SGS Booking — Appointment & Event Booking System

## Purpose

A custom WordPress booking plugin that handles appointment scheduling, event ticketing, and multi-provider calendar management across all Small Giants Studio client sites. Replaces WP Amelia Premium with a purpose-built system that integrates with Google Calendar, Stripe, and N8N.

---

## Use Cases Across Projects

| Client/Project | Booking type | Providers | Payment |
|---|---|---|---|
| **ibraheemmustafa.com** | Consultation bookings | 1 (Bean) | Stripe |
| **Muslims in Construction** | Event tickets (replacing MEC Pro) | N/A (event-based) | Stripe |
| **All Purpose Maintenance** | Tenant booking slots + contractor calendars | Multiple contractors | None (internal) |
| **GP/Doctor appointments** | Patient appointment booking | Multiple doctors | None or Stripe |
| **Dream Wedding Pianist** | Performance booking enquiries | 1 | Deposit via Stripe |
| **HelpingDoctors EHR** | Patient appointments (future) | Multiple clinicians | N/A |

---

## Plugin Structure

```
sgs-booking/
├── sgs-booking.php              # Plugin bootstrap
├── uninstall.php                # Clean uninstall (remove tables, options)
│
├── includes/
│   ├── class-sgs-booking.php    # Main plugin class (singleton)
│   ├── class-installer.php      # Database table creation, default options
│   │
│   ├── models/
│   │   ├── class-service.php    # Service/appointment type model
│   │   ├── class-provider.php   # Service provider (person/resource) model
│   │   ├── class-booking.php    # Individual booking model
│   │   ├── class-event.php      # Event model (date, capacity, tickets)
│   │   ├── class-ticket.php     # Event ticket model
│   │   ├── class-schedule.php   # Provider availability schedule model
│   │   └── class-payment.php    # Payment record model
│   │
│   ├── services/
│   │   ├── class-availability.php     # Time slot calculation engine
│   │   ├── class-calendar-sync.php    # Google Calendar 2-way sync
│   │   ├── class-payment-handler.php  # Stripe payment processing
│   │   ├── class-notification.php     # N8N webhook notifications
│   │   └── class-ical-export.php      # ICS feed generation
│   │
│   ├── api/
│   │   ├── class-rest-services.php    # REST: /sgs-booking/v1/services
│   │   ├── class-rest-providers.php   # REST: /sgs-booking/v1/providers
│   │   ├── class-rest-availability.php# REST: /sgs-booking/v1/availability
│   │   ├── class-rest-bookings.php    # REST: /sgs-booking/v1/bookings
│   │   ├── class-rest-events.php      # REST: /sgs-booking/v1/events
│   │   └── class-rest-webhooks.php    # REST: /sgs-booking/v1/webhooks (N8N)
│   │
│   ├── admin/
│   │   ├── class-admin-menu.php       # Admin menu pages
│   │   ├── class-admin-bookings.php   # Bookings list/management
│   │   ├── class-admin-services.php   # Service configuration
│   │   ├── class-admin-providers.php  # Provider management
│   │   ├── class-admin-events.php     # Event management
│   │   ├── class-admin-settings.php   # Plugin settings page
│   │   └── class-admin-dashboard.php  # Dashboard widget (today's bookings)
│   │
│   └── blocks/
│       ├── booking-form/              # Gutenberg block: booking form
│       ├── event-list/                # Gutenberg block: upcoming events
│       ├── event-tickets/             # Gutenberg block: ticket purchase
│       └── provider-schedule/         # Gutenberg block: provider availability display
│
├── assets/
│   ├── js/
│   │   ├── booking-form.js            # Frontend booking form logic
│   │   ├── calendar-picker.js         # Date/time picker component
│   │   ├── event-tickets.js           # Ticket selection + checkout
│   │   └── admin/
│   │       ├── calendar-view.js       # Admin calendar (FullCalendar.js)
│   │       └── settings.js            # Admin settings UI
│   ├── css/
│   │   ├── booking-form.css           # Frontend form styles
│   │   ├── calendar-picker.css        # Date/time picker styles
│   │   └── admin.css                  # Admin styles
│   └── vendor/
│       └── fullcalendar/              # FullCalendar.js (admin calendar view only)
│
└── templates/
    ├── booking-confirmation.php       # Confirmation page template
    ├── email/
    │   ├── booking-confirmed.php      # Customer confirmation email
    │   ├── booking-reminder.php       # Reminder email template
    │   └── booking-cancelled.php      # Cancellation email template
    └── ical/
        └── feed.php                   # ICS calendar feed endpoint
```

---

## Database Schema

### `{prefix}sgs_services`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(255) | Service name (e.g., "30-min Consultation") |
| `slug` | VARCHAR(255) | URL-safe slug |
| `description` | TEXT | Service description |
| `duration` | INT | Duration in minutes |
| `buffer_before` | INT | Buffer time before appointment (minutes) |
| `buffer_after` | INT | Buffer time after appointment (minutes) |
| `price` | DECIMAL(10,2) | Price (0 for free services) |
| `currency` | VARCHAR(3) | ISO currency code (default: GBP) |
| `deposit_amount` | DECIMAL(10,2) | Required deposit (0 for full payment or no payment) |
| `max_capacity` | INT | Maximum concurrent bookings per slot (default: 1) |
| `colour` | VARCHAR(7) | Hex colour for calendar display |
| `status` | ENUM('active','inactive') | Service status |
| `meta` | JSON | Extensible metadata (custom fields per service) |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `{prefix}sgs_providers`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `user_id` | BIGINT(20) | WordPress user ID (nullable for non-WP providers) |
| `name` | VARCHAR(255) | Provider display name |
| `email` | VARCHAR(255) | Provider email |
| `phone` | VARCHAR(50) | Provider phone |
| `bio` | TEXT | Provider bio/description |
| `avatar_url` | VARCHAR(500) | Profile image URL |
| `google_calendar_id` | VARCHAR(255) | Google Calendar ID for sync |
| `google_refresh_token` | TEXT | Encrypted OAuth refresh token |
| `timezone` | VARCHAR(100) | Provider timezone (default: Europe/London) |
| `status` | ENUM('active','inactive') | |
| `meta` | JSON | Extensible metadata |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `{prefix}sgs_provider_services`

| Column | Type | Description |
|---|---|---|
| `provider_id` | BIGINT(20) | FK to providers |
| `service_id` | BIGINT(20) | FK to services |
| `custom_price` | DECIMAL(10,2) | Override price (nullable, uses service default if null) |

### `{prefix}sgs_schedules`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `provider_id` | BIGINT(20) | FK to providers |
| `day_of_week` | TINYINT | 0 (Mon) to 6 (Sun) |
| `start_time` | TIME | Slot start time |
| `end_time` | TIME | Slot end time |
| `is_available` | BOOLEAN | Available or blocked |
| `valid_from` | DATE | Schedule start date (nullable for recurring) |
| `valid_until` | DATE | Schedule end date (nullable for indefinite) |

### `{prefix}sgs_schedule_overrides`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `provider_id` | BIGINT(20) | FK to providers |
| `date` | DATE | Specific date override |
| `start_time` | TIME | Nullable (null = entire day) |
| `end_time` | TIME | Nullable |
| `is_available` | BOOLEAN | Available or blocked (e.g., holiday = blocked) |
| `reason` | VARCHAR(255) | "Bank holiday", "Annual leave", etc. |

### `{prefix}sgs_bookings`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `uuid` | CHAR(36) | Public-facing booking reference |
| `service_id` | BIGINT(20) | FK to services |
| `provider_id` | BIGINT(20) | FK to providers |
| `customer_name` | VARCHAR(255) | |
| `customer_email` | VARCHAR(255) | |
| `customer_phone` | VARCHAR(50) | |
| `start_datetime` | DATETIME | Booking start (UTC) |
| `end_datetime` | DATETIME | Booking end (UTC) |
| `timezone` | VARCHAR(100) | Customer's timezone |
| `status` | ENUM('pending','confirmed','cancelled','completed','no_show') | |
| `payment_status` | ENUM('none','pending','paid','refunded','partial') | |
| `payment_amount` | DECIMAL(10,2) | Amount charged |
| `payment_method` | VARCHAR(50) | 'stripe', 'manual', 'none' |
| `stripe_payment_id` | VARCHAR(255) | Stripe Payment Intent ID |
| `google_event_id` | VARCHAR(255) | Google Calendar event ID (for sync) |
| `notes` | TEXT | Customer notes |
| `internal_notes` | TEXT | Admin-only notes |
| `meta` | JSON | Custom field values |
| `ip_address` | VARCHAR(45) | For rate limiting / fraud prevention |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `{prefix}sgs_events`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `title` | VARCHAR(255) | Event title |
| `slug` | VARCHAR(255) | URL slug |
| `description` | TEXT | Event description |
| `venue` | VARCHAR(255) | Venue name |
| `address` | TEXT | Venue address |
| `start_datetime` | DATETIME | Event start (UTC) |
| `end_datetime` | DATETIME | Event end (UTC) |
| `timezone` | VARCHAR(100) | |
| `total_capacity` | INT | Maximum attendees |
| `image_url` | VARCHAR(500) | Event image |
| `status` | ENUM('draft','published','cancelled','completed') | |
| `meta` | JSON | Custom fields |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `{prefix}sgs_tickets`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `uuid` | CHAR(36) | Public-facing ticket reference |
| `event_id` | BIGINT(20) | FK to events |
| `ticket_type` | VARCHAR(100) | "Standard", "VIP", "Early Bird" |
| `customer_name` | VARCHAR(255) | |
| `customer_email` | VARCHAR(255) | |
| `quantity` | INT | Number of tickets |
| `unit_price` | DECIMAL(10,2) | Price per ticket |
| `total_price` | DECIMAL(10,2) | Total charged |
| `status` | ENUM('pending','confirmed','cancelled','refunded','checked_in') | |
| `stripe_payment_id` | VARCHAR(255) | |
| `meta` | JSON | |
| `created_at` | DATETIME | |

---

## Availability Engine

The core complexity. Calculates available time slots for a given service + provider + date.

### Algorithm

```
1. Get provider's recurring schedule for the requested day_of_week
2. Apply any schedule_overrides for the specific date
3. Get all existing confirmed bookings for that provider + date
4. Get Google Calendar events for that provider + date (if synced)
5. Generate time slots based on service duration + buffer times
6. Remove slots that overlap with existing bookings or calendar events
7. Remove slots that fall outside the available windows
8. Return remaining available slots
```

### Edge Cases Handled

- **Timezone conversion** — all datetimes stored in UTC, converted to provider's timezone for schedule matching and customer's timezone for display
- **Daylight saving transitions** — use PHP DateTimeZone, never manual offset calculation
- **Buffer times** — configurable per service (e.g., 15 min cleanup between appointments)
- **Concurrent bookings** — respects `max_capacity` per slot (e.g., 3 people can book the same yoga class time)
- **Google Calendar blocking** — busy events from Google Calendar block booking slots even if they weren't created in SGS Booking
- **Advance booking window** — configurable minimum/maximum advance notice (e.g., "book at least 2 hours ahead, up to 60 days ahead")

---

## Google Calendar Integration

### 2-Way Sync

1. **SGS Booking → Google Calendar:** When a booking is confirmed, create a Google Calendar event. When cancelled, delete it. When rescheduled, update it.
2. **Google Calendar → SGS Booking:** Periodically fetch busy times from Google Calendar to block those slots in availability calculations. Uses Google Calendar API `freebusy` endpoint.

### OAuth Flow

- Provider clicks "Connect Google Calendar" in admin
- Redirected to Google OAuth consent screen
- On callback, store encrypted refresh token in `sgs_providers.google_refresh_token`
- Access tokens refreshed automatically (short-lived, never stored)

### Sync Frequency

- **Real-time on booking creation/update/cancellation** (push to Google)
- **Every 15 minutes via WP-Cron** (pull busy times from Google)
- **On-demand** when calculating availability for a specific date

---

## Payment Integration (Stripe)

### Flow

1. Customer selects service, provider, date/time
2. Frontend creates a Stripe Payment Intent via REST API (`POST /sgs-booking/v1/bookings`)
3. Backend creates booking with `status: pending`, `payment_status: pending`
4. Frontend renders Stripe Elements card form
5. Customer confirms payment
6. Stripe webhook (`payment_intent.succeeded`) hits `/sgs-booking/v1/webhooks/stripe`
7. Backend updates booking to `status: confirmed`, `payment_status: paid`
8. Confirmation notification sent via N8N webhook

### Deposit Support

For services requiring a deposit (e.g., wedding pianist booking):
- Charge deposit amount at booking time
- Store remaining balance in booking meta
- Manual or automated collection of remaining balance before service date

### Refund Support

- Admin can trigger full or partial refund from booking management screen
- Calls Stripe Refund API
- Updates `payment_status` to `refunded` or `partial`

---

## Notification System (N8N)

All notifications are sent via N8N webhooks rather than WordPress `wp_mail()`. This allows:
- Email + SMS from the same trigger
- Template management outside WordPress
- Retry logic and logging in N8N
- WhatsApp notifications (via N8N Twilio/WhatsApp node)

### Webhook Events

| Event | N8N webhook URL | Payload |
|---|---|---|
| Booking confirmed | `{n8n_base}/webhook/sgs-booking-confirmed` | Booking object + customer + provider + service details |
| Booking cancelled | `{n8n_base}/webhook/sgs-booking-cancelled` | Booking object + cancellation reason |
| Booking reminder | `{n8n_base}/webhook/sgs-booking-reminder` | Booking object (triggered by WP-Cron, configurable hours before) |
| Event ticket purchased | `{n8n_base}/webhook/sgs-ticket-purchased` | Ticket + event + customer details |
| Provider schedule changed | `{n8n_base}/webhook/sgs-schedule-changed` | Provider + affected dates |

N8N webhook URLs stored in plugin settings (wp_options). Different URLs per site/environment.

---

## REST API Endpoints

All endpoints under namespace `sgs-booking/v1`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/services` | Public | List active services |
| GET | `/services/{id}` | Public | Service details |
| GET | `/providers` | Public | List active providers |
| GET | `/providers/{id}` | Public | Provider details + services |
| GET | `/availability/{provider_id}/{service_id}` | Public | Available dates for next N days |
| GET | `/availability/{provider_id}/{service_id}/{date}` | Public | Available time slots for a specific date |
| POST | `/bookings` | Public (nonce) | Create a new booking |
| GET | `/bookings/{uuid}` | Public (nonce) | Get booking status (customer-facing) |
| PATCH | `/bookings/{uuid}/cancel` | Public (nonce) | Cancel a booking |
| GET | `/events` | Public | List upcoming events |
| GET | `/events/{id}` | Public | Event details + ticket availability |
| POST | `/events/{id}/tickets` | Public (nonce) | Purchase event tickets |
| POST | `/webhooks/stripe` | Stripe signature | Stripe payment webhook |
| GET | `/admin/bookings` | Admin (nonce + capability) | Admin booking list with filters |
| PATCH | `/admin/bookings/{id}` | Admin | Update booking status/notes |

---

## Frontend Blocks

### Booking Form Block (`sgs/booking-form`)

Embeddable block that renders the full booking flow:

**Step 1: Select Service** — cards/list of available services with duration and price
**Step 2: Select Provider** — provider cards (skipped if only one provider)
**Step 3: Select Date/Time** — calendar date picker + time slot grid
**Step 4: Your Details** — name, email, phone, notes
**Step 5: Payment** — Stripe Elements (skipped if free service)
**Step 6: Confirmation** — booking reference, calendar add link, cancellation link

All steps rendered client-side (single-page app feel) via `viewScriptModule`. Progressive enhancement: without JS, form posts to a server-rendered fallback.

### Event List Block (`sgs/event-list`)

Displays upcoming events with image, title, date, venue, and "Get Tickets" button.

### Event Tickets Block (`sgs/event-tickets`)

For single event pages — shows ticket types, quantities, and purchase flow.

---

## Admin Interface

- **Dashboard widget:** Today's bookings at a glance
- **Calendar view:** FullCalendar.js monthly/weekly/daily view of all bookings (admin only, not frontend)
- **Booking management:** List table with filters (date range, provider, service, status), inline status updates
- **Service management:** CRUD for services with duration, pricing, provider assignment
- **Provider management:** CRUD for providers with schedule builder, Google Calendar connection
- **Event management:** CRUD for events with ticket type configuration
- **Settings:** Stripe keys, N8N webhook URLs, timezone, booking rules, email templates

---

## Phased Build Plan

### Phase 1 — Core Appointments (MVP)

- Single-provider appointment booking (covers consultations, pianist enquiries)
- Service and schedule management
- REST API for availability and booking
- Frontend booking form block
- Email confirmations via N8N
- Stripe payment processing
- Admin booking management

### Phase 2 — Multi-Provider

- Multiple providers per service
- Individual schedules and overrides
- Google Calendar 2-way sync
- Provider selection step in booking form
- Admin calendar view (FullCalendar.js)

### Phase 3 — Events & Ticketing

- Event creation and management
- Ticket types with capacity tracking
- Event list and ticket purchase blocks
- Event reminders via N8N

### Phase 4 — Advanced Features

- Recurring bookings (weekly/monthly appointments)
- Waitlist when slots are full
- Group bookings with per-person pricing
- SMS/WhatsApp reminders via N8N + Twilio
- Customer booking history (logged-in users)
- Booking analytics dashboard

---

## Security

- All REST endpoints use WordPress nonces for CSRF protection
- Public booking endpoints rate-limited (via transient-based throttle)
- Stripe webhook signature verification on all payment webhooks
- Google OAuth tokens encrypted at rest (AES-256)
- All database queries via `$wpdb->prepare()`
- Input sanitisation on all customer-submitted fields
- Email addresses validated server-side before booking creation
- Admin endpoints require `manage_options` capability
- IP logging for fraud detection (stored, not exposed)
