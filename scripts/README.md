# SGS WordPress Framework — Build & Lint Scripts

## Pattern Personal Data Linter

### Purpose

`lint-patterns-for-personal-data.py` scans all pattern PHP files in `theme/sgs-theme/patterns/` for hardcoded personal data that should be bound to the `sgs/site-info` block binding source instead. This prevents data leakage and makes patterns reusable across client sites without manual data removal.

### Usage

```bash
python scripts/lint-patterns-for-personal-data.py
```

Exit codes:
- `0` = no violations found
- `1` = violations found (details printed to stdout/stderr)

### Personal Data Patterns Watched

The linter detects and flags the following personal data classes:

| Pattern | Regex | Example |
|---------|-------|---------|
| Email address | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `hello@example.com`, `Zainab@mamasmunches.com` |
| UK phone (international) | `\+44\s?[\d\s()-]{7,}` | `+44 (0) 123 456 7890` |
| UK phone (local 07 prefix) | `07[0-9]\s?[\d\s]{7,9}` | `07700 900123` |
| UK phone (area code) | `\(0\d{3,4}\)\s?[\d\s()-]{6,}` | `(0121) 555 1234` |
| Location: Birmingham | `\bBirmingham\b` | "Handmade in Birmingham" |
| Location: London | `\bLondon\b` | "London, EC1A 1BB" |
| Social: Facebook | `facebook\.com/[a-zA-Z0-9._-]+` | `facebook.com/indusfoodsltd` |
| Social: Instagram | `instagram\.com/[a-zA-Z0-9._-]+` | `instagram.com/mamasmunches` |
| Social: WhatsApp | `wa\.me/[0-9+]+` | `wa.me/441234567890` |
| Operator: Zainab | `\bZainab\b` | Contact name |
| Operator: Mama's Munches | `Mama['\s]*s\s+Munches` | Business name |
| Operator: Indus Foods | `\bIndus\s+Foods\b` | Business name |
| Operator: Helping Doctors | `Helping\s+Doctors` | Business name |
| Operator: Amir | `\bAmir\b` | Contact name |

### Refactoring Pattern Files

When the linter flags a violation, replace hardcoded values with `sgs/site-info` block bindings:

```html
<!-- BEFORE: hardcoded email -->
<p><a href="mailto:Zainab@mamasmunches.com">Contact us</a></p>

<!-- AFTER: block binding -->
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"email"}}}}} -->
<p><a href="mailto:[email]">Contact us</a></p>
<!-- /wp:paragraph -->
```

Supported Site Info keys (from `class-sgs-site-info-binding.php`):
- `email` — primary contact email
- `phone` — primary phone number
- `address` — physical address
- `opening_hours` — business hours
- `socials.facebook` — Facebook URL (sub-key)
- `socials.instagram` — Instagram URL (sub-key)
- `socials.google` — Google Business URL (sub-key)
- `socials.linkedin` — LinkedIn URL (sub-key)
- `copyright` — copyright notice
- `tagline` — site tagline

### Testing

Run the smoke-test suite:

```bash
python scripts/tests/test_lint_patterns.py
```

Tests:
- **PASS case:** Verifies clean patterns (with block bindings, no hardcoded data) pass with exit 0
- **FAIL case:** Verifies patterns with hardcoded emails, phones, locations, and operator names fail with exit 1 and report violations

### Integration

The linter can be integrated into CI/CD workflows:

```bash
python scripts/lint-patterns-for-personal-data.py || exit 1
```

This prevents merging pattern files with hardcoded personal data to production branches.
