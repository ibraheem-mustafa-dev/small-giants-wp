# SGS Booking — Claude Code Instructions

## What This Is

Appointment scheduling, event ticketing, and multi-provider calendar management. Replaces WP Amelia Premium. Integrates with Google Calendar, Stripe, and N8N.

Full spec: `specs/03-SGS-BOOKING.md`

## Plugin Structure

```
sgs-booking/
├── sgs-booking.php              # Plugin bootstrap
├── uninstall.php                # Clean removal (drop tables, remove options)
├── includes/
│   ├── class-sgs-booking.php    # Main plugin class (singleton)
│   ├── class-installer.php      # Database table creation
│   ├── models/                  # Service, Provider, Booking, Event, Ticket, Schedule, Payment
│   ├── services/                # Availability engine, Calendar sync, Payment, Notifications, ICS
│   ├── api/                     # REST endpoints (sgs-booking/v1/*)
│   ├── admin/                   # Admin pages (bookings, services, providers, events, settings, dashboard)
│   └── blocks/                  # Gutenberg blocks (booking-form, event-list, event-tickets, provider-schedule)
├── assets/
│   ├── js/                      # Frontend (booking-form, calendar-picker, event-tickets) + Admin (calendar-view, settings)
│   ├── css/                     # Frontend + admin styles
│   └── vendor/fullcalendar/     # FullCalendar.js (admin calendar only)
└── templates/                   # Confirmation page, email templates, ICS feed
```

## Database Tables

- `sgs_services` — appointment types with duration, pricing, buffers
- `sgs_providers` — people/resources with Google Calendar links
- `sgs_provider_services` — many-to-many with optional price override
- `sgs_schedules` — recurring weekly availability per provider
- `sgs_schedule_overrides` — date-specific exceptions (holidays, leave)
- `sgs_bookings` — individual bookings with payment and calendar sync
- `sgs_events` — events with capacity
- `sgs_tickets` — event tickets

## Core Complexity: Availability Engine

Calculates available time slots: recurring schedule + overrides + existing bookings + Google Calendar busy times + buffer times + capacity. All datetimes stored in UTC, converted per timezone. Never use manual offset calculation — always PHP DateTimeZone.

## External Integrations

- **Stripe** — Payment Intents for booking payments and deposits. Webhook signature verification required.
- **Google Calendar** — OAuth2 2-way sync. Refresh tokens encrypted at rest (AES-256). Sync every 15 min via WP-Cron + real-time on booking changes.
- **N8N** — All notifications via webhooks. Webhook URLs stored in wp_options.

## Phased Build

- **Phase 1 (= Build Phase 5):** Single-provider appointments, Stripe, N8N notifications
- **Phase 2 (= Build Phase 6):** Multi-provider, Google Calendar sync, events, ticketing

This is the LAST component to build. Features still being refined. See `specs/06-BUILD-ORDER.md`.

## Key Rules

- All REST endpoints: nonces, capability checks, sanitised input, prepared statements
- Public booking endpoints rate-limited (transient-based throttle)
- Stripe webhook signature verification on all payment webhooks
- OAuth tokens encrypted at rest
- IP logging for fraud detection
- Admin endpoints require `manage_options` capability
- No wp_mail — all notifications via N8N webhooks
