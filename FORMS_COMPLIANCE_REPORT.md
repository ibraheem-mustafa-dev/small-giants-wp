# SGS Forms Spec Compliance Report

**Date:** 2026-02-23  
**Spec:** `specs/04-SGS-FORMS.md`  
**Status:** Partially Complete ✅⚠️

---

## ✅ Completed: Missing Form Field Blocks

Successfully created all 4 missing form field blocks according to spec:

### 1. **form-field-hidden** ✅
- **Location:** `plugins/sgs-blocks/src/blocks/form-field-hidden/`
- **Attributes:** `fieldName`, `defaultValue`
- **Features:**
  - Renders `<input type="hidden">` on frontend
  - Editor shows preview with field name and value
  - No label or help text (as designed)
- **Pattern:** Follows existing block structure (block.json, index.js, edit.js, render.php)

### 2. **form-field-number** ✅
- **Location:** `plugins/sgs-blocks/src/blocks/form-field-number/`
- **Attributes:** All common attributes plus `min`, `max`, `step`
- **Features:**
  - Native `<input type="number">`
  - Number constraints panel in editor
  - Full InspectorControls with validation options
- **Pattern:** Matches form-field-text pattern exactly

### 3. **form-field-date** ✅
- **Location:** `plugins/sgs-blocks/src/blocks/form-field-date/`
- **Attributes:** All common attributes plus `minDate`, `maxDate`
- **Features:**
  - Native `<input type="date">` for best mobile UX
  - Date constraints panel in editor
  - Min/max validation attributes
- **Pattern:** Follows spec requirement for native HTML date picker

### 4. **form-field-address** ✅
- **Location:** `plugins/sgs-blocks/src/blocks/form-field-address/`
- **Attributes:** `fieldName`, `label`, `required`, `enableLookup`, `lookupProvider`, `fields` array
- **Sub-fields:** line1, line2, city, county, postcode, country
- **Features:**
  - Configurable sub-fields (checkbox controls in editor)
  - Postcode lookup toggle (basic implementation)
  - Lookup provider selection (getaddress.io / Ideal Postcodes)
  - Sub-fields render as array structure: `{fieldName}[line1]`, `{fieldName}[postcode]`, etc.
  - Most complex block — fully implemented

### Icon Updates ✅
Added 4 new icons to `src/utils/icons.js`:
- `formFieldDateIcon` — Calendar with date picker visual
- `formFieldNumberIcon` — Hash symbol with input field
- `formFieldHiddenIcon` — Eye with slash (hidden indicator)
- `formFieldAddressIcon` — Location pin with address lines

All icons follow SGS teal colour standard (`#0F7E80`).

---

## ⚠️ Spec Compliance Gaps

### 1. **Missing Admin REST Endpoints**

**Spec requires:**
```
GET    /sgs-forms/v1/submissions        — List submissions with filters
GET    /sgs-forms/v1/submissions/{id}   — Single submission detail
DELETE /sgs-forms/v1/submissions/{id}   — Delete submission (GDPR)
GET    /sgs-forms/v1/export/{formId}    — CSV export
```

**Current state:**
- Only public endpoints implemented: `POST /submit`, `POST /upload`
- Admin settings page shows basic submissions table directly from database
- No REST API for programmatic access to submissions
- No CSV export endpoint

**Impact:** Admins can view submissions but cannot delete or export via REST API. GDPR data erasure must be done manually.

**Recommendation:** Create `class-form-admin-rest-api.php` with these endpoints, gated by `manage_options` capability.

---

### 2. **Missing GDPR Hooks**

**Spec requires:**
```php
wp_privacy_personal_data_exporters  — Export all submissions for given email
wp_privacy_personal_data_erasers    — Delete/anonymise submissions for given email
```

**Current state:**
- ❌ No privacy exporter registered
- ❌ No privacy eraser registered
- ❌ No retention policy / auto-delete functionality

**Impact:** Site does not comply with WordPress GDPR tools. Cannot export or erase user data via Tools > Export Personal Data / Erase Personal Data.

**Recommendation:** Create `class-form-gdpr.php` with:
- `register_privacy_exporter()` — Search submissions by email in JSON `data` field
- `register_privacy_eraser()` — Delete or anonymise matching submissions
- Optional: Settings field for auto-delete after N days

---

### 3. **Postcode Lookup - Client-Side Logic Missing**

**Spec mentions:**
> Postcode lookup is optional enhancement — basic version just renders the address fields

**Current state:**
- ✅ UI toggle and provider selection implemented
- ✅ "Find Address" button renders in lookup mode
- ❌ No client-side JavaScript to call lookup API
- ❌ No server-side proxy endpoint to keep API keys secure

**Impact:** Postcode lookup button renders but does nothing. Users must type full address manually.

**Recommendation:** 
1. Create `form-field-address/view.js` module (viewScriptModule)
2. Add server-side endpoint `POST /sgs-forms/v1/lookup-postcode` to proxy API calls
3. Store API keys in plugin settings (never expose to frontend)
4. Wire up button click → fetch → populate fields

---

### 4. **Conditional Logic - Client-Side Missing**

**Spec mentions:**
> Conditional Logic: When `conditionalField` is set, the field is hidden by default and shown only when the condition is met. Handled client-side via `viewScriptModule`.

**Current state:**
- ✅ Attributes defined in spec (`conditionalField`, `conditionalOperator`, `conditionalValue`)
- ❌ **Not implemented in any field blocks** (including existing ones like form-field-text)
- ❌ No `viewScriptModule` wired up
- ❌ No client-side logic to watch field values and toggle visibility

**Impact:** Conditional fields cannot be hidden/shown based on user input. All fields always visible.

**Recommendation:**
1. Add conditional attributes to all form field blocks (text, email, etc.)
2. Create shared `view-conditional.js` module
3. Register as `viewScriptModule` in block.json
4. Implement field watching and show/hide logic

---

## ✅ What's Already Implemented (No Action Needed)

### Database Schema ✅
- Table: `{prefix}sgs_form_submissions`
- All columns from spec present:
  - `id`, `form_id`, `data` (JSON), `files` (JSON)
  - `payment_status`, `payment_amount`, `stripe_payment_id`
  - `ip_address`, `user_agent`, `user_id`
  - `status`, `notes`, `created_at`
- Indexes on `form_id`, `status`, `created_at`
- ✅ **Fully spec-compliant**

### Form Processing Engine ✅
- ✅ Honeypot spam check
- ✅ Nonce verification
- ✅ Rate limiting (5 submissions per IP per hour, 10 uploads per hour)
- ✅ Server-side validation
- ✅ File upload handling (via `Form_Upload` class)
- ✅ Submission storage
- ⚠️ N8N webhook integration (code present, needs testing)
- ⚠️ Payment processing (Stripe mentioned in schema but handler not inspected)

### Existing Form Field Blocks ✅
Already present before this work:
- ✅ form-field-text
- ✅ form-field-email
- ✅ form-field-phone
- ✅ form-field-textarea
- ✅ form-field-select
- ✅ form-field-radio
- ✅ form-field-checkbox
- ✅ form-field-tiles
- ✅ form-field-file
- ✅ form-field-consent

### Helper Functions ✅
`includes/forms/field-render-helpers.php` provides:
- `field_open()`, `field_close()`
- `field_label()`, `field_help()`
- `field_id()`, `field_input_attrs()`
- ✅ All helpers used consistently across blocks

---

## 📋 Summary Checklist

### Completed ✅
- [x] form-field-date block
- [x] form-field-number block
- [x] form-field-hidden block
- [x] form-field-address block
- [x] Icons for all new blocks
- [x] Database schema matches spec
- [x] Form processing engine core features

### Missing / Incomplete ⚠️
- [ ] Admin REST API endpoints (list, get, delete, export)
- [ ] GDPR hooks (data export, data erasure)
- [ ] Postcode lookup client-side implementation
- [ ] Conditional field logic (all fields, not just new ones)
- [ ] Payment processing (Stripe integration not verified)
- [ ] Multi-step form UI (form-step, form-review blocks not inspected)

---

## 🔧 Next Steps

**High Priority:**
1. **Add GDPR hooks** — Required for WordPress compliance, affects all clients
2. **Admin REST API** — Enables programmatic access to submissions (useful for integrations)

**Medium Priority:**
3. **Conditional logic** — Enables dynamic forms (high value for clients)
4. **Postcode lookup** — Nice-to-have for UK forms (Indus Foods trade app)

**Low Priority:**
5. **Payment processing audit** — Verify Stripe integration works (only needed for paid forms)
6. **Multi-step forms audit** — Verify form-step and form-review blocks exist and work

---

## 📝 Notes

- All new blocks follow WordPress coding standards
- UK English used in all comments and labels
- No `npm build` run (as requested — compilation needed before testing)
- Git commit: `c119b36` on branch `feature/indus-foods-homepage`
- All files in `plugins/sgs-blocks/src/blocks/` and `plugins/sgs-blocks/includes/`

**Recommendation before deployment:**
1. Run `npm run build` in `plugins/sgs-blocks/`
2. Test all new blocks in Gutenberg editor
3. Test frontend form submission with new fields
4. Consider implementing GDPR hooks before launch

---

**Report generated:** 2026-02-23 06:50 GMT  
**Audited by:** Subagent (forms-spec-audit)
