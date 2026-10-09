---
doc_type: spec
spec_id: 4
spec_version: 1.1
project: small-giants-wp
title: SGS Forms
status: active
last_verified: 2026-10-09
---

# SGS Forms — Custom Form System

> **Parked, not started (none scheduled; full list in the "Not built" section):** payment collection (Stripe), address-lookup provider, `maxFiles` multi-file upload cap, GDPR retention auto-delete, admin bulk actions.

## Purpose

A form system built into the SGS Blocks plugin that replaces Fluent Forms Pro and SureForms for all Small Giants Studio client sites. Handles multi-step forms, conditional logic, file uploads and notifications (payment collection is specified but not built, see §Not built) — all rendering with the SGS design system and sending its emails through `wp_mail()` over the client's own SMTP mailbox.

**Note:** This is not a standalone plugin — it lives within SGS Blocks as a set of form-related blocks and a shared form processing engine.

---

## What It Replaces

| Feature | Fluent Forms / SureForms | SGS Forms |
|---|---|---|
| Drag-and-drop form builder | Admin UI builder | Gutenberg blocks (native editor) |
| Multi-step forms | Plugin-specific page breaks | `sgs/form` + `sgs/form-step` inner blocks |
| Conditional logic | Plugin-specific rules UI | Attributes on field blocks + `viewScriptModule` |
| File uploads | Built-in with limits | `sgs/form-field-file` block + REST endpoint |
| Payment integration | Plugin-specific Stripe addon | Shared Stripe handler (same as SGS Booking) — **not built** |
| Email notifications | Plugin-specific email builder | `wp_mail()` over the site's SMTP (FluentSMTP), one shared SGS template; optional N8N event for automations |
| Submissions storage | Plugin database tables | Custom table `{prefix}sgs_form_submissions` |
| GDPR compliance | Plugin checkbox + privacy settings | `sgs/form-field-consent` block + data export/erasure hooks |
| Styling | Plugin-specific CSS (often conflicts) | Design tokens from theme.json (always matches site) |

---

## Block Architecture

```
sgs/form                          # Form wrapper (handles submission, validation, steps)
├── sgs/form-step                 # Step container (for multi-step forms)
│   ├── sgs/form-field-text       # Text input (single line)
│   ├── sgs/form-field-email      # Email input (with validation)
│   ├── sgs/form-field-phone      # Phone input (with format hint)
│   ├── sgs/form-field-textarea   # Multi-line text
│   ├── sgs/form-field-select     # Dropdown select
│   ├── sgs/form-field-radio      # Radio button group
│   ├── sgs/form-field-checkbox   # Checkbox group
│   ├── sgs/form-field-tiles      # Visual tile selector (image/emoji + label)
│   ├── sgs/form-field-file       # File upload
│   ├── sgs/form-field-date       # Date picker
│   ├── sgs/form-field-number     # Number input
│   ├── sgs/form-field-hidden     # Hidden field
│   ├── sgs/form-field-consent    # GDPR/T&C consent checkbox
│   ├── sgs/form-field-address    # Address with postcode lookup
│   └── (any SGS block)           # Informational content between fields
├── sgs/form-step                 # Another step...
│   └── ...
└── sgs/form-review               # Review step (auto-generated summary)
```

---

## Form Block (`sgs/form`)

The wrapper block that handles the entire form lifecycle.

### Attributes

| Attribute | Type | Description |
|---|---|---|
| `formId` | string | Unique form identifier (auto-generated, used for submission storage). Form identity, the `sgs_form` CPT and the login requirement are specified in Spec 42; this row is the submission-storage key only. |
| `formName` | string | Human-readable form name (for admin reference) |
| `submitLabel` | string | Submit button text (default: "Submit") |
| `submitStyle` | string | Button style: primary, success, accent |
| Element typography: `label*`, `field*`, `tileIcon*`, `tileLabel*`, `consent*`, `reviewTerm*`, `reviewDetail*`, `reviewHeading*`, `helpText*`, `errorText*`, `fileStatus*`, `stepLabel*`, `submit*`, `navButton*` | the full 15-attr typography family per prefix (`FontSize` / `LineHeight` / `LetterSpacing` are `{desktop,tablet,mobile}` tier objects with a `*Unit` sibling) | One Typography panel (Styles tab) switches between All text and these elements. Each prefix paints its element through `sgs_typography_css_rule` on `.{uid} <element>`: `.sgs-form-field__label`, `.sgs-form-field__input`, `.sgs-form-tile__icon`, `.sgs-form-tile__label`, `.sgs-form-field__consent-text`, `.sgs-form-review__term` and `__detail` (built by `view.js`), `.sgs-form-review__heading`, `.sgs-form-field__help` with `__file-hint`, `.sgs-form-field__error` with `__error-message`, `.sgs-form-file__preview` with `__progress`, `.sgs-form__progress-step-label`, `.sgs-form__button--submit`, and `.sgs-form__button--prev` / `--next`. Unset keeps the stylesheet's `:where()` defaults (buttons 600 weight, small preset size, 1.5 line-height) |
| `submitPadding` / `submitMinHeight` | object (box) / number | Submit button padding and minimum height (px); unset keeps 0.75rem 2rem and 44px |
| `successMessage` | string | Message shown after successful submission |
| `successRedirect` | string | URL to redirect to after submission (optional, overrides message) |
| `notifyEmail` | string | Who receives each submission; blank uses the Site Info email, then `admin_email` |
| `confirmationEmail` | boolean | Also email the submitter a confirmation (only when the form has a valid email field; default false) |
| `confirmationSubject` | string | Confirmation subject; blank sends "Thanks for your submission" |
| `confirmationMessage` | string | Confirmation body, plain text wrapped in paragraphs; blank sends a short thank-you |
| `requireLogin` | boolean | Require WordPress login to submit |
| `honeypot` | boolean | Enable honeypot spam field (default: true) |
| `rateLimit` | integer | Max submissions per IP per hour (default: 5) |
| `storeSubmissions` | boolean | Save to database (default: true) |
| `paymentEnabled` | boolean | **Not built.** Collect payment on submission |
| `paymentAmount` | string | **Not built.** Fixed amount or field reference (e.g., "{field:estimated_spend}") |
| `paymentDescription` | string | **Not built.** Stripe payment description |

### Multi-Step Behaviour

When the form contains `sgs/form-step` inner blocks:
- Progress bar renders at the top showing step labels and completion
- "Next" / "Previous" navigation buttons between steps
- Validation runs per-step before advancing (don't surprise users with errors on submit)
- Step state persisted in `sessionStorage` (survives page refresh)
- Review step (if present) shows all entered data with "Edit" buttons per section

---

## Field Blocks — Common Attributes

All field blocks share these attributes:

| Attribute | Type | Description |
|---|---|---|
| `fieldName` | string | Machine name (used in submission data, e.g., "business_name") |
| `label` | string | Field label |
| `placeholder` | string | Placeholder text |
| `helpText` | string | Hint text below field |
| `required` | boolean | Is this field required? |
| `width` | string | full | half | third (full below a 560px-wide form; a third-width number box stays three across from 300px) |
| `labelStyle` | string | visible | hidden: shown above the field or read by screen readers only (number and file fields; a hidden label leaves no floating-label room and shows the placeholder) |
| `conditionalField` | string | Field name to watch for conditional display |
| `conditionalOperator` | string | equals | not_equals | contains | greater_than | is_empty |
| `conditionalValue` | string | Value to compare against |

### Conditional Logic

When `conditionalField` is set, the field is hidden by default and shown only when the condition is met. Handled client-side via `viewScriptModule` watching field values. Multiple conditions supported (all must be true = AND logic).

Example: Show "VAT Registration Number" field only when "Business Type" is not "Sole Trader".

---

## Specific Field Blocks

### Visual Tile Selector (`sgs/form-field-tiles`)

The visual tile selector inspired by the Indus Foods V2 trade application mockup — used for product categories, cuisines, services, etc.

**Additional attributes:**
- `tiles` — array of { value, label, icon, image } objects
- `multiSelect` — boolean (select multiple tiles)
- `columns` — 2 | 3 | 4 (desktop, always 2 on mobile)
- `selectedStyle` — border | background | checkmark

**Render:** Grid of clickable cards. Selected tiles show accent-colour border + checkmark. Underlying value stored as comma-separated string or JSON array.

### File Upload (`sgs/form-field-file`)

**Additional attributes:**
- `allowedTypes` — array of MIME types (default: image/*, application/pdf)
- `maxSize` — max file size in MB (default: 10)
- `maxFiles` — max number of files (default: 1) — **not built**
- `uploadText` — drag-and-drop area label
- `zoneStyle` — dashed (default) | panel: a 1px dashed panel holding the prompt, the help line and a Choose file cue, the size limit kept for screen readers
- `buttonLabel` — the panel look's button text (empty reads "Choose file")

**Processing:** Files uploaded via REST endpoint (`POST /sgs-forms/v1/upload`) to WordPress media library (or configurable private directory). Returns attachment IDs stored with the submission.

### Number (`sgs/form-field-number`)

**Additional attributes:** `min`, `max`, `step`, and for boxes laid out as a small table (a prescription's SPH / CYL /
AXIS): `columnHeading` (a short heading above the box, set on the first row) and `rowHeading` (a short heading in a
32px gutter to the left, set on the first box of each row). Both are visual only; the label stays the accessible name.
Row-headed boxes sit 8px apart with no spinner arrows (`plugins/sgs-blocks/includes/forms/field-render-helpers.php::field_headings`).

### Address with Postcode Lookup (`sgs/form-field-address`)

**Additional attributes:**
- `enableLookup` — boolean (enable postcode auto-complete)
- `lookupProvider` — getaddress.io | ideal-postcodes (API key stored in settings) — **not built** (no address-lookup provider is wired in)
- `fields` — which sub-fields to show (line1, line2, city, county, postcode, country)

### Consent (`sgs/form-field-consent`)

**Additional attributes:**
- `consentType` — terms | gdpr | marketing
- `consentText` — RichText (supports links to privacy policy, terms pages)
- `required` — always true for terms/gdpr, optional for marketing

---

## Form Processing Engine

### Submission Flow

```
1. Client-side validation (per-step and on submit)
2. Honeypot check (hidden field must be empty)
3. Nonce verification
4. Rate limit check (transient-based, per IP)
5. Server-side validation (all fields)
6. File upload processing (if any)
7. Payment processing (if enabled) — Stripe Payment Intent (**not built**; this step is skipped)
8. Store submission in database
9. Email the owner notification and, when switched on, the submitter's confirmation (`Form_Mailer`), then fire the optional N8N event
10. Return success response (message or redirect URL)
```

### REST API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/sgs-forms/v1/submit` | Public (nonce) | Submit form |
| POST | `/sgs-forms/v1/upload` | Public (nonce) | Upload file |
| GET | `/sgs-forms/v1/submissions` | Admin | List submissions with filters |
| GET | `/sgs-forms/v1/submissions/{id}` | Admin | Single submission detail |
| DELETE | `/sgs-forms/v1/submissions/{id}` | Admin | Delete submission (GDPR) |
| GET | `/sgs-forms/v1/export/{formId}` | Admin | CSV export of submissions |

---

## Database Schema

### `{prefix}sgs_form_submissions`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `form_id` | VARCHAR(100) | Form identifier (matches block attribute) |
| `data` | JSON | All field values as key-value pairs |
| `files` | JSON | Array of attachment IDs |
| `payment_status` | VARCHAR(20) | none, pending, paid, refunded (columns exist; every row stores `none` until payment collection is built) |
| `payment_amount` | DECIMAL(10,2) | Amount charged (not built) |
| `stripe_payment_id` | VARCHAR(255) | Stripe Payment Intent ID (not built) |
| `ip_address` | VARCHAR(45) | Submitter IP |
| `user_agent` | VARCHAR(500) | Browser user agent |
| `user_id` | BIGINT(20) | WordPress user ID (if logged in) |
| `status` | ENUM('new','read','replied','archived','spam') | Submission status |
| `notes` | TEXT | Admin notes on this submission |
| `created_at` | DATETIME | |

---

## Admin Interface

### Submissions View

Accessible at **SGS Forms > Submissions** in wp-admin.

- List table with columns: Date, Form, Name/Email (from common fields), Status, Payment
- Filter by form, date range, status
- Bulk actions: mark read, archive, delete, export CSV (**not built**; the admin REST routes `submissions`, `submissions/{id}` and `export/{formId}` exist, and `plugins/sgs-blocks/includes/forms/class-form-admin.php` renders a basic recent-submissions table under Settings > SGS Forms)
- Single submission view: all fields rendered in readable format, file download links, admin notes, status update

### GDPR Compliance

- **Data export:** Hooks into WordPress personal data exporter (`wp_privacy_personal_data_exporters`). Exports all submissions matching a given email address.
- **Data erasure:** Hooks into WordPress personal data eraser (`wp_privacy_personal_data_erasers`). Deletes or anonymises submissions matching a given email.
- **Retention:** Configurable auto-delete after N days (default: off) — **not built**. `plugins/sgs-blocks/includes/forms/class-form-privacy.php` registers the exporter and the eraser only.

---

## Notification Architecture

Every email goes through `wp_mail()`, which FluentSMTP sends over the client's own mailbox (`.claude/dev-setup.md` §Site email). After a submission is stored, `plugins/sgs-blocks/includes/forms/class-form-mailer.php::send_notifications` sends through `plugins/sgs-blocks/includes/mail/class-sgs-mailer.php::send` (HTML in the shared template plus a plain-text part):

- **Owner notification:** to the form's `notifyEmail`, else the Site Info email, else `admin_email` (`Sgs_Mailer::owner_recipient`). Subject "New form submission: <form name>", every submitted field in an escaped table, `Reply-To` the submitter's email field when it is valid.
- **Confirmation:** only when `confirmationEmail` is on and the submission has a valid email field; `confirmationSubject` and `confirmationMessage`, or their defaults.
- **Header injection:** `Form_Processor::sanitise_fields` blanks any email-named value holding a line break (core `sanitize_email()` would rebuild `a@b.com
Bcc: x@y.com` as the valid-looking `a@b.comBccxy.com`), and `Sgs_Mailer` refuses CR/LF in a recipient or `Reply-To`.
- **Template:** `Sgs_Mail_Template::wrap` uses WooCommerce's email header, footer and CSS inliner when WooCommerce is active, else `plugins/sgs-blocks/includes/mail/templates/email.php` (site name, logo, theme text/surface/primary colours).

The choice-flow email terminal (Spec 43 FR-43-4) goes through the same path. PECR: confirmations and owner notifications are service messages while they carry no promotional copy.

**Optional automation event.** When a site sets `sgs_n8n_webhook_url`, `Form_Processor::send_webhook` also POSTs the submission there for CRM rows, Slack or follow-ups. It is never the email path:

```json
{
  "form_id": "trade-application",
  "submission_id": 42,
  "submitted_at": "2026-02-12T14:30:00Z",
  "site_url": "https://example.co.uk",
  "fields": { "name": "Priya Sharma", "email": "priya@bombaykitchen.co.uk", "business_type": "Restaurant" },
  "files": [ { "name": "fhrs-certificate.pdf" } ]
}
```

Regression check: `php plugins/sgs-blocks/tests/php/run-form-mailer-standalone.php` (includes a check that the real sanitiser blanks a line-break email and goes red without the guard).

---

## Example: a multi-step trade application

```
sgs/form (formId: "trade-application")
├── sgs/form-step (title: "Your business")
│   └── field blocks: name, email, business type (sgs/form-field-tiles)
├── sgs/form-step (title: "Your needs")
│   └── field blocks: products, volumes, delivery address
├── sgs/form-step (title: "Review and consent")
│   └── sgs/form-review, sgs/form-field-consent
```

This gives a multi-step flow with a progress bar, a visual tile selector and a review step, using standard Gutenberg blocks.

---

## Not built

These items are specified above and have no implementation yet. Each stays in the spec as a future feature; none is scheduled.

| Item | Status |
|---|---|
| Payment collection (`paymentEnabled`, `paymentAmount`, `paymentDescription`, submission-flow step 7, Stripe Payment Intent) | Not built. The `payment_*` and `stripe_payment_id` columns exist and hold `none` / null. |
| Address-lookup provider (`lookupProvider` on `sgs/form-field-address`) | Not built. |
| Multi-file upload cap (`maxFiles` on `sgs/form-field-file`) | Not built. |
| Retention auto-delete (GDPR) | Not built. Data export and erasure are built. |
| Admin bulk actions | Not built. |
