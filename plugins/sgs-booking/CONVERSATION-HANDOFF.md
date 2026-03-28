# SGS Booking Plugin — Mini Handoff

**Generated:** 2026-03-15
**Project:** SGS Booking WordPress Plugin (thin API client)
**Path:** `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-booking\`
**Status:** Not yet built — spec and CLAUDE.md exist, no code

---

## What This Is

A WordPress plugin that provides Gutenberg blocks for embedding the SGS Booking System's UI on WordPress sites. It's a **thin API client** — it stores no data, calculates no availability, processes no payments server-side, and sends no emails. Everything goes through the booking system's REST API.

## Current State

- **CLAUDE.md:** Complete — architecture, data flow, security rules, conventions, design context, build phases
- **Spec:** `specs/03-SGS-BOOKING.md` — comprehensive specification with design system section added 2026-03-15
- **Code:** None written yet
- **Blocker:** The booking system (Next.js) needs to complete Phase 1 (Steps 14-15) and build missing API endpoints before this plugin can function

## Missing API Endpoints (booking system must build these first)

| Endpoint | Needed for |
|----------|-----------|
| `GET /api/v1/book/{orgSlug}` | Org branding/info |
| `GET /api/v1/book/{orgSlug}/types` | Service listing block |
| `GET /api/v1/book/{orgSlug}/{typeSlug}` | Single service details |
| `POST /api/v1/book/{orgSlug}/{typeSlug}/payment-intent` | Stripe payments |
| `GET /api/v1/bookings/{id}/status?token=` | Booking status check |
| `POST /api/v1/bookings/{id}/cancel?token=` | Self-service cancellation |

Endpoints that already exist: `/availability`, `/create`, `/health`, `/ics`.

## Design System

Inherits "Dark Confidence" from the booking system. Key points for this plugin:

- Public booking flow: cream background (`#FAF8F5`), orange (`#F87A1F`) CTAs, teal (`#0F7E80`) info
- Per-org theming via `--brand-*` CSS variables from API branding endpoint
- ADHD-friendly: focus isolation, spring animations, high-contrast states
- Pill-shaped time slots, floating label inputs, orange dot calendar indicators
- Never inject `customCss` from API (XSS vector)

Full design context in `CLAUDE.md` and `specs/03-SGS-BOOKING.md`.

## Build Phases

1. **Phase 1:** Settings page + API client + booking-form block + booking-types block
2. **Phase 2:** Stripe Elements + multi-provider + provider-schedule block
3. **Phase 3:** Events + ticketing (requires booking system event support)
4. **Phase 4:** Shortcode fallback, admin dashboard widget, webhook receiver

## Skills to Invoke

| Skill | When |
|-------|------|
| `/superpowers:using-superpowers` | Always first |
| `/superpowers:brainstorming` | Before starting any phase |
| `/superpowers:writing-plans` | Before implementation |
| `/sgs-wp-engine` | SGS Framework conventions, block development patterns |
| `/wp-block-development` | Block.json, attributes, render.php, viewScriptModule |
| `/wp-interactivity-api` | data-wp-* directives, store/state/actions for booking flow |
| `/wp-plugin-development` | Plugin architecture, hooks, settings page, security |
| `/wp-rest-api` | If adding any WP REST endpoints |
| `/frontend-design` | Building the booking UI blocks |
| `/interaction-design` | Spring animations, focus isolation in WordPress context |
| `/tailwind-design-system` | If using Tailwind for block styles |
| `/software-architecture` | Plugin class structure decisions |

## Agents to Use

| Agent | When |
|-------|------|
| `wp-developer` | All WordPress development work |
| `design-reviewer` | After building blocks — check WCAG, design consistency |
| `test-and-explain` | After each phase — verify blocks work |
| `ehr-security-reviewer` | Verify API key encryption, output escaping |

## MCP Tools

| Tool | Use for |
|------|---------|
| `firecrawl` | Research WordPress block patterns, Interactivity API examples |
| `context7` | @wordpress/scripts docs, Interactivity API docs, Stripe Elements docs |
| `playwright` | Test blocks visually at breakpoints on a WordPress test site |

## Next Session Prompt

```
/superpowers:using-superpowers
/sgs-wp-engine

Building the SGS Booking WordPress plugin at C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-booking\

Read CLAUDE.md and CONVERSATION-HANDOFF.md in the plugin folder for full context. Read specs/03-SGS-BOOKING.md for the master spec.

This is a thin API client plugin — NO database tables, NO availability calculations, NO server-side payments, NO email sending. Everything goes through the booking system's REST API.

Key skills at point of use:
- /wp-block-development — for block.json, render.php, viewScriptModule
- /wp-interactivity-api — for the interactive booking flow (date picker, time slots, form)
- /wp-plugin-development — for plugin bootstrap, settings page, API client class
- /frontend-design + /interaction-design — for design system compliance (Dark Confidence aesthetic)

Agent: wp-developer for all implementation work.

Check which booking system API endpoints exist before building blocks that depend on them. Missing endpoints are listed in CLAUDE.md.
```
