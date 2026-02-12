# Build Order & Dependencies

## Dependency Graph

```
SGS Theme ◄──── SGS Blocks (reads design tokens from theme.json)
    │               │
    │               ├──── SGS Forms (built into SGS Blocks)
    │               │
    │               └──── SGS Booking (provides its own blocks, uses shared tokens)
    │
    └──────────── SGS Client Notes (independent, loads on any theme but styled for SGS)
```

**Critical path:** SGS Theme must exist first. SGS Blocks depends on the theme's design tokens. Everything else can be built in parallel after those two are stable.

---

## Build Phases

### Phase 1 — Foundation (SGS Theme + SGS Blocks Core)

**Goal:** A working block theme with enough blocks to build a complete page. Deploy Indus Foods as the first site.

#### 1a. SGS Theme — Minimum Viable Theme

Build in this order:

1. `style.css` + `theme.json` — design tokens, typography, spacing, colour palette (Indus Foods as default, but structured for override)
2. `functions.php` — theme setup, font preloading, script/style enqueuing
3. `templates/index.html` + `templates/page.html` — basic page templates
4. `parts/header.html` — site header with logo + nav + CTA
5. `parts/footer.html` — site footer with columns + copyright
6. `assets/fonts/` — self-hosted DM Serif Display + DM Sans (WOFF2)
7. `assets/css/core-blocks.css` — style overrides for WordPress core blocks (paragraph, heading, image, list, columns, group, buttons) so they look right
8. `assets/css/utilities.css` — `.sr-only`, `.container`, `.text-centre`, etc.

**Done when:** Theme activates without errors, a basic page with core WordPress blocks renders correctly with the SGS design tokens, header and footer display properly, fonts load from local files.

#### 1b. SGS Blocks — Core Layout + Content Blocks

Build in this order (each block is independently testable):

1. **Container** (`sgs/container`) — the foundation block, everything depends on it
2. **Hero** (`sgs/hero`) — standard + split variants first, video/SVG later
3. **Info Box** (`sgs/info-box`) — benefit/feature cards (with hover effects)
4. **Counter** (`sgs/counter`) — animated stats
5. **Trust Bar** (`sgs/trust-bar`) — horizontal stats strip (supports text and numeric values)
6. **Icon List** (`sgs/icon-list`) — checkmark/icon lists
7. **Card Grid** (`sgs/card-grid`) — flexible image+content grid (overlay and card variants)
8. **CTA Section** (`sgs/cta-section`) — call-to-action section
9. **Process Steps** (`sgs/process-steps`) — timeline/step visualisation
10. **Testimonial** (`sgs/testimonial`) — single testimonial card
11. **Testimonial Slider** (`sgs/testimonial-slider`) — carousel
12. **Heritage Strip** (`sgs/heritage-strip`) — story section
13. **Brand Strip** (`sgs/brand-strip`) — logo strip
14. **Certification Bar** (`sgs/certification-bar`) — certification/accreditation badges
15. **Notice Banner** (`sgs/notice-banner`) — inline informational banner (MOV, delivery terms)
16. **WhatsApp CTA** (`sgs/whatsapp-cta`) — floating + inline WhatsApp

**Core form blocks** (pulled forward from Phase 2 — needed for Indus Foods trade application):

17. **Form** (`sgs/form`) — form wrapper with multi-step logic, progress bar, submission flow
18. **Form Step** (`sgs/form-step`) — step container for multi-step forms
19. **Form Field: Text** (`sgs/form-field-text`) — single-line text input
20. **Form Field: Email** (`sgs/form-field-email`) — email input with validation
21. **Form Field: Phone** (`sgs/form-field-phone`) — phone input
22. **Form Field: Textarea** (`sgs/form-field-textarea`) — multi-line text
23. **Form Field: Select** (`sgs/form-field-select`) — dropdown select
24. **Form Field: Radio** (`sgs/form-field-radio`) — radio button group
25. **Form Field: Checkbox** (`sgs/form-field-checkbox`) — checkbox group
26. **Form Field: Tiles** (`sgs/form-field-tiles`) — visual tile selector
27. **Form Field: File** (`sgs/form-field-file`) — file upload
28. **Form Field: Consent** (`sgs/form-field-consent`) — GDPR/T&C consent
29. **Form Review** (`sgs/form-review`) — auto-generated review step

Plus form processing engine: submission handling, validation, database storage, N8N webhook.

Plus shared infrastructure:
- Block category registration
- Responsive controls shared component
- Animation extension (scroll-triggered)
- Responsive visibility extension
- `@wordpress/scripts` build toolchain setup (with `--experimental-modules` flag)

**Done when:** All 16 layout/content blocks + 13 form blocks register without errors, render in the editor, produce correct frontend output, and respect theme.json design tokens. Responsive behaviour verified at all three breakpoints. Form submissions stored and N8N webhooks fire.

#### 1c. Deploy Indus Foods

Using SGS Theme + SGS Blocks (including core form blocks), build the Indus Foods pages on the Hostinger test site. This is both the deliverable for the client and the real-world validation of Phase 1.

Pages to build:
1. Food Service page (template for all four — matches V3 mockup exactly)
2. Manufacturing page (same template, different content)
3. Retail page (same template, different content)
4. Wholesale page (same template, different content)
5. Trade Application page (matches V2 mockup — uses container + form blocks + sidebar composition)
6. Homepage (if not already built)

**Done when:** All pages match the HTML mockups, pass PageSpeed Insights with green Core Web Vitals, and look correct on mobile/tablet/desktop.

---

### Phase 2 — Forms Advanced (SGS Forms)

**Goal:** Advanced form features that weren't needed for the basic Indus Foods trade application (core form blocks already built in Phase 1b).

Build in this order:

1. `sgs/form-field-address` — address with postcode lookup (getaddress.io / ideal-postcodes integration)
2. `sgs/form-field-date` — date picker
3. `sgs/form-field-number` — number input with min/max/step
4. `sgs/form-field-hidden` — hidden fields for tracking/attribution
5. Conditional logic engine — show/hide fields based on other field values
6. Admin submissions viewer — list table, single view, CSV export
7. GDPR hooks — data export and erasure integration (`wp_privacy_personal_data_exporters` / `wp_privacy_personal_data_erasers`)
8. Stripe payment integration for form submissions
9. Submission data retention and auto-delete settings

**Done when:** All field types work, conditional logic shows/hides fields, admin can view/export/delete submissions, GDPR hooks fire correctly, and Stripe payments process.

---

### Phase 3 — Client Notes (SGS Client Notes)

**Goal:** Clients can annotate their site pages with visual feedback.

Build in this order:

1. Database schema — notes, replies tables
2. `sgs_client` role + capabilities
3. REST API — create, read, update notes and replies
4. Frontend annotation mode — overlay, element highlighting, pin placement
5. Comment panel — slide-in form with priority selector
6. Pin renderer — display existing notes on page load
7. Admin notes management page
8. N8N notification webhooks
9. Screenshot capture (html2canvas integration)
10. Dashboard widget

**Done when:** A client user can log in, annotate elements on any page, submit comments with priority levels, and the SGS admin can view/reply/resolve them. Notifications fire via N8N.

---

### Phase 4 — Advanced Blocks + Polish

**Goal:** Remaining blocks and enhanced features.

1. Hero video + SVG animation variants
2. Accordion block
3. Tabs block
4. Pricing table block
5. Modal block
6. Announcement bar block
7. SVG background container block
8. Additional style variations for other client sites (Dream Wedding, Workwear Now, etc.)
9. Performance audit and optimisation across all components

---

### Phase 5 — Booking System Core (SGS Booking Phase 1: Core Appointments)

**Goal:** Single-provider appointment booking that works for consultation bookings and simple scheduling. Features still being finalised by Bean — build last.

Build in this order:

1. Database schema — services, providers, schedules, bookings tables
2. Service + provider models and admin CRUD
3. Schedule builder — recurring weekly availability + date overrides
4. Availability engine — time slot calculation with buffer times
5. REST API — services, availability, booking creation
6. `sgs/booking-form` block — frontend booking flow (select service → date → time → details → confirm)
7. Stripe payment integration
8. N8N webhook notifications (confirmed, cancelled, reminder)
9. Admin booking management — list, status updates, calendar view
10. ICS calendar feed generation

**Done when:** A client can book an appointment on a site, pay via Stripe, receive a confirmation email, and the booking appears in the admin calendar. Provider can manage their schedule.

---

### Phase 6 — Booking System Advanced (SGS Booking Phases 2-3)

**Goal:** Multi-provider scheduling and event ticketing.

1. Multi-provider selection in booking flow
2. Google Calendar OAuth integration
3. 2-way Google Calendar sync
4. Event model + admin CRUD
5. Ticket types with capacity tracking
6. `sgs/event-list` block
7. `sgs/event-tickets` block
8. Event ticket purchase flow with Stripe

---

## What Can Be Built in Parallel

Once Phase 1a (theme) is done:

| Can run simultaneously | Why |
|---|---|
| Phase 1b (blocks) + Phase 3 (client notes) | Client notes is independent — doesn't use custom blocks |
| Phase 2 (forms advanced) + Phase 3 (client notes) | Different plugins, different database tables, no shared dependencies |

The bottleneck is Phase 1a — everything needs the theme to exist first. After that, parallelisation is possible across sessions. Booking system (Phases 5-6) is intentionally last — features still being refined.

---

## Testing Strategy

### Per Block

- Activate theme + plugin on WordPress Playground or test site
- Insert block in editor — verify it renders without errors
- Configure all attributes — verify sidebar controls work
- Save and view frontend — verify output matches expected HTML/CSS
- Test at 320px, 768px, and 1200px — verify responsive behaviour
- Test with screen reader (NVDA or VoiceOver) — verify accessibility

### Per Plugin

- Activate on clean WordPress install
- Verify activation creates database tables
- Verify deactivation doesn't lose data
- Verify uninstall removes all plugin data
- Test all REST endpoints with valid and invalid payloads
- Verify nonce/capability checks reject unauthorised requests

### Integration

- Deploy SGS Theme + SGS Blocks + SGS Forms on Hostinger test site
- Build Indus Foods pages — verify everything works together
- Run PageSpeed Insights — verify green Core Web Vitals
- Run WAVE accessibility checker — verify WCAG 2.2 AA compliance
- Test on real devices: iPhone, Android, iPad, desktop

---

## Repository Structure (Recommended)

```
small-giants-wp/                  # Monorepo for the framework
├── theme/                        # SGS Theme
│   └── sgs-theme/
├── plugins/
│   ├── sgs-blocks/               # SGS Blocks (includes forms)
│   ├── sgs-booking/              # SGS Booking
│   └── sgs-client-notes/         # SGS Client Notes
├── specs/                        # These spec documents
├── .claude/                      # Claude Code configuration for this repo
│   └── CLAUDE.md                 # Framework-specific Claude instructions
└── README.md                     # Developer overview
```

Each component is independently deployable via SFTP but developed in a shared repo for consistency.

---

## First Milestone: Indus Foods Live

**What's needed to launch the Indus Foods site:**

1. SGS Theme (Phase 1a) — fully built
2. SGS Blocks: 16 layout/content blocks + 13 core form blocks (Phase 1b) — includes card-grid, notice-banner, and all form fields needed for the trade application
3. Form processing engine — submission storage, validation, N8N webhook
4. Rank Math Free — installed and configured
5. Real content: images, testimonials, certification logos from client

**Not needed for Indus Foods launch:**
- SGS Booking (no booking functionality on this site)
- SGS Client Notes (useful but not launch-blocking)
- Style variations for other sites (Indus Foods is the default)
- Advanced form features (conditional logic, address lookup, payment, GDPR hooks) — Phase 2
- SGS Forms admin submissions viewer — Phase 2

This focuses the initial build on what delivers a client site and validates the framework simultaneously.
