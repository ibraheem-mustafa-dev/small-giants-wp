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
| Email address | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `hello@example.com`, `owner@acme-bakery.example` |
| UK phone (international) | `\+44\s?[\d\s()-]{7,}` | `+44 (0) 123 456 7890` |
| UK phone (local 07 prefix) | `07[0-9]\s?[\d\s]{7,9}` | `07700 900123` |
| UK phone (area code) | `\(0\d{3,4}\)\s?[\d\s()-]{6,}` | `(0121) 555 1234` |
| Location: Birmingham | `\bBirmingham\b` | "Handmade in Birmingham" |
| Location: London | `\bLondon\b` | "London, EC1A 1BB" |
| Social: Facebook | `facebook\.com/[a-zA-Z0-9._-]+` | `facebook.com/acmefoodsltd` |
| Social: Instagram | `instagram\.com/[a-zA-Z0-9._-]+` | `instagram.com/acmebakery` |
| Social: WhatsApp | `wa\.me/[0-9+]+` | `wa.me/441234567890` |
| Operator: Zainab | `\bZainab\b` | Contact name |
| Operator: the bakery client | `Mama['\s]*s\s+Munches` | Business name |
| Operator: the wholesale-food client | `\bIndus\s+Foods\b` | Business name |
| Operator: the charity client | `Helping\s+Doctors` | Business name |
| Operator: Amir | `\bAmir\b` | Contact name |

### Refactoring Pattern Files

When the linter flags a violation, replace hardcoded values with `sgs/site-info` block bindings:

```html
<!-- BEFORE: hardcoded email -->
<p><a href="mailto:owner@acme-bakery.example">Contact us</a></p>

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

## parity/draft-live-walk.mjs

Draft-versus-live parity walker. A per-page config (an `.mjs` module; the optician client's live in
`sites/eye-care-ward-end/build/qa/parity/`) says how to open the page on the draft and on
live, which states to walk (tabs, steps, panels, filters, modals) and which element pairs
to compare. For every state at 1440, 768 and 375 it compares rendered text, box size,
computed styles (text properties read from the element that paints the text), motion
(keyframes by content, animation and transition timing, what runs right after each action)
and hover end states, writes `report.json`, `report.md` and draft|live side-by-side
screenshots, and exits 1 on any difference the config does not accept.

    NODE_EXTRA_CA_CERTS=<certifi cacert.pem> node scripts/parity/draft-live-walk.mjs <config.mjs> [--widths 1440] [--states a,b] [--out dir]

Negative control: `--inject-live-css "<css>"` plants a known difference on the live side;
the report must turn red on it. `--no-accept` shows the accepted differences as open.
