# SGS Forms — Custom Form System

## Purpose

A form system built into the SGS Blocks plugin that replaces Fluent Forms Pro and SureForms for all Small Giants Studio client sites. Handles multi-step forms, conditional logic, file uploads, payment collection, and notifications — all rendering with the SGS design system and sending notifications via N8N.

**Note:** This is not a standalone plugin — it lives within SGS Blocks as a set of form-related blocks and a shared form processing engine.

---

## What It Replaces

| Feature | Fluent Forms / SureForms | SGS Forms |
|---|---|---|
| Drag-and-drop form builder | Admin UI builder | Gutenberg blocks (native editor) |
| Multi-step forms | Plugin-specific page breaks | `sgs/form` + `sgs/form-step` inner blocks |
| Conditional logic | Plugin-specific rules UI | Attributes on field blocks + `viewScriptModule` |
| File uploads | Built-in with limits | `sgs/form-field-file` block + REST endpoint |
| Payment integration | Plugin-specific Stripe addon | Shared Stripe handler (same as SGS Booking) |
| Email notifications | Plugin-specific email builder | N8N webhooks (same architecture as SGS Booking) |
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
| `formId` | string | Unique form identifier (auto-generated, used for submission storage) |
| `formName` | string | Human-readable form name (for admin reference) |
| `submitLabel` | string | Submit button text (default: "Submit") |
| `submitStyle` | string | Button style: primary, success, accent |
| `successMessage` | string | Message shown after successful submission |
| `successRedirect` | string | URL to redirect to after submission (optional, overrides message) |
| `n8nWebhookUrl` | string | N8N webhook URL for notifications |
| `requireLogin` | boolean | Require WordPress login to submit |
| `honeypot` | boolean | Enable honeypot spam field (default: true) |
| `rateLimit` | integer | Max submissions per IP per hour (default: 5) |
| `storeSubmissions` | boolean | Save to database (default: true) |
| `paymentEnabled` | boolean | Collect payment on submission |
| `paymentAmount` | string | Fixed amount or field reference (e.g., "{field:estimated_spend}") |
| `paymentDescription` | string | Stripe payment description |

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
| `width` | string | full | half | third (responsive: always full on mobile) |
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
- `maxFiles` — max number of files (default: 1)
- `uploadText` — drag-and-drop area label

**Processing:** Files uploaded via REST endpoint (`POST /sgs-forms/v1/upload`) to WordPress media library (or configurable private directory). Returns attachment IDs stored with the submission.

### Address with Postcode Lookup (`sgs/form-field-address`)

**Additional attributes:**
- `enableLookup` — boolean (enable postcode auto-complete)
- `lookupProvider` — getaddress.io | ideal-postcodes (API key stored in settings)
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
7. Payment processing (if enabled) — Stripe Payment Intent
8. Store submission in database
9. Fire N8N webhook with full submission data
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
| `payment_status` | VARCHAR(20) | none, pending, paid, refunded |
| `payment_amount` | DECIMAL(10,2) | Amount charged |
| `stripe_payment_id` | VARCHAR(255) | Stripe Payment Intent ID |
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
- Bulk actions: mark read, archive, delete, export CSV
- Single submission view: all fields rendered in readable format, file download links, admin notes, status update

### GDPR Compliance

- **Data export:** Hooks into WordPress personal data exporter (`wp_privacy_personal_data_exporters`). Exports all submissions matching a given email address.
- **Data erasure:** Hooks into WordPress personal data eraser (`wp_privacy_personal_data_erasers`). Deletes or anonymises submissions matching a given email.
- **Retention:** Configurable auto-delete after N days (default: off).

---

## Notification Architecture (N8N)

When a form is submitted, the plugin fires a POST request to the configured N8N webhook URL with:

```json
{
  "form_id": "indus-trade-application",
  "form_name": "Trade Account Application",
  "site_url": "https://indusfoods.co.uk",
  "submission_id": 42,
  "submitted_at": "2026-02-12T14:30:00Z",
  "fields": {
    "name": "Priya Sharma",
    "email": "priya@bombaykitchen.co.uk",
    "phone": "07700 900123",
    "business_name": "Bombay Kitchen",
    "business_type": "Restaurant",
    "product_interests": ["spices", "rice", "oils"],
    ...
  },
  "files": [
    { "name": "fhrs-certificate.pdf", "url": "https://..." }
  ],
  "payment": {
    "status": "none",
    "amount": 0
  }
}
```

N8N then handles:
- Sending confirmation email to customer
- Sending notification email/Slack/SMS to site owner
- Creating a record in CRM/Notion/Google Sheets (per-client workflow)
- Any follow-up automation (e.g., reminder if not replied within 48h)

This decouples notification logic from WordPress entirely — changes to email templates, recipients, or follow-up sequences happen in N8N without touching the plugin.

---

## Indus Foods Trade Application — Example Implementation

The Indus Foods V2 trade application form maps directly to this system:

```
sgs/form (formId: "indus-trade-application")
├── sgs/form-step (label: "About You")
│   ├── sgs/form-field-radio (fieldName: "account_for", options: ["I'm the account holder", "I'm requesting on behalf of someone"])
│   ├── sgs/form-field-text (fieldName: "name", label: "Your Name", required: true)
│   ├── sgs/form-field-text (fieldName: "role", label: "Your Role", placeholder: "e.g. Owner, Head Chef, Buyer")
│   ├── sgs/form-field-email (fieldName: "email", required: true)
│   ├── sgs/form-field-phone (fieldName: "phone", required: true)
│   └── sgs/form-field-text (fieldName: "postcode", label: "Delivery Postcode", placeholder: "e.g. LE1 5PQ")
│
├── sgs/form-step (label: "Business Details")
│   ├── sgs/form-field-text (fieldName: "business_name", required: true)
│   ├── sgs/form-field-select (fieldName: "business_type", options: [Restaurant, Takeaway, Retail Shop, ...])
│   ├── sgs/form-field-select (fieldName: "trading_duration", options: [Just starting up, Less than 1 year, ...])
│   ├── sgs/form-field-text (fieldName: "vat_number", helpText: "No VAT number? No problem — leave blank.")
│   ├── sgs/form-field-text (fieldName: "crn", helpText: "Limited companies only.")
│   ├── sgs/form-field-address (fieldName: "delivery_address", enableLookup: true)
│   └── sgs/form-field-textarea (fieldName: "access_notes", placeholder: "e.g. Rear entrance, ring bell")
│
├── sgs/form-step (label: "Account Preferences")
│   ├── sgs/form-field-tiles (fieldName: "product_interests", multiSelect: true, columns: 4,
│   │     tiles: [Spices, Rice & Grains, Lentils & Pulses, Oils & Ghee, Frozen, Tinned, Nuts & Dried Fruit, Cleaning])
│   ├── sgs/form-field-select (fieldName: "monthly_spend", options: [Under £500, £500-£1000, ...])
│   ├── sgs/form-field-select (fieldName: "delivery_days", options: [Mon-Wed, Thu-Fri, Any weekday, Specific day])
│   ├── sgs/form-field-select (fieldName: "payment_terms", helpText: "First orders are proforma.")
│   └── sgs/form-field-select (fieldName: "how_heard", options: [Google, Referral, Already know Indus Foods, ...])
│
├── sgs/form-review (label: "Review & Submit")
│   ├── (auto-generated summary of all fields with edit buttons)
│   ├── sgs/form-field-file (fieldName: "fhrs_certificate", allowedTypes: [image/*, application/pdf], maxSize: 10)
│   ├── sgs/form-field-consent (consentType: "terms", consentText: "I agree to the Terms & Conditions")
│   └── sgs/form-field-consent (consentType: "gdpr", consentText: "I consent to Indus Foods storing...")
```

This produces the exact form designed in the V2 mockup — with proper multi-step flow, progress bar, visual tile selector, and review step — using standard Gutenberg blocks rather than SureForms.
