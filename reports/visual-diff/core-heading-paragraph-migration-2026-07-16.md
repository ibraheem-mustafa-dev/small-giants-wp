# Visual-diff report — core/heading → sgs/heading + core/paragraph → sgs/text, 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## What changed
The two biggest pairings swept across the safe zone (Track-A hands-off files
untouched):

| pairing | swept | refused | files |
|---|---|---|---|
| core/heading → sgs/heading | 51 | 0 | 21 |
| core/paragraph → sgs/text | 121 | **4** | 33 |

Safe-zone replaceable instances: **395 → 223** (−172, reconciles exactly).
Theme `style.css` Version 1.5.26 → 1.5.27 (pattern cache + CDN `?ver`).

The 4 refusals are correct, not failures: those `core/paragraph` instances in
`contact-form.php` bind their `content` to `sgs/site-info` via
`metadata.bindings`, and WP resolves bindings ONLY for the core-block allowlist
in `get_block_bindings_supported_attributes()` (read on live WP 7.0.1). Migrating
them would render the binding inert — a silent loss of the live email/phone/
address/hours. The transformer refuses them loudly and they stay `core/paragraph`
until SGS registers the `block_bindings_supported_attributes` filter.

## Schema transformation (not a rename)
- `level: 3` (int) → `"level": "h3"` (string enum). Without this WP fails
  validation and falls back to the `h2` default — every h3 would silently
  demote (D328/D291 coercion class).
- `style.typography.letterSpacing: "0.05em"` → `letterSpacing: 0.05` +
  `letterSpacingUnit: "em"`; fontWeight / textTransform / fontStyle /
  lineHeight likewise mapped to typed attrs (sgs blocks don't declare
  `supports.typography`, so a passthrough would have been a silent loss).
- `textColor` → `textColour`; `align` → `textAlign`; preset `fontSize` slugs
  survive (this session's preset-gap fix); `style.spacing`/`style.border`
  carry 1:1 via the skip-serialised native supports.
- Every emitted attr validated against the target block.json; every source attr
  required an accounting verb — the driver's structural anti-silent-discard gate.

## Live evidence (content-keyed computed styles, rule 4a)
Before = pattern markup at `fdabf3ad` (pre-sweep), after = working tree. Both
rendered live on the canary, caches cleared.

| pattern | text nodes matched | diffs |
|---|---|---|
| faq-section | 9 | 1 — heading letter-spacing only |
| cta-centred | 10 | 1 — heading letter-spacing only |
| about-stats | 17 | 5 — letter-spacing + 3 colour corrections |

**Zero content lost** — every text node present on both sides. Only two diff
classes, both known and accepted:

1. **Heading letter-spacing** `-0.36px`/`-0.5px` → `normal`. Theme rule
   `core-blocks-critical.css:246 .wp-block-heading{letter-spacing:-0.01em}` is
   keyed to core/heading's OWN class. **Bean accepted 2026-07-16** ("never
   usually touched").
2. **Colour `rgb(58,46,38)` → `rgb(230,138,149)` on `500+`/`98%`/`15+`** — these
   are authored `wp:heading {"textColor":"primary"}` (`about-stats.php:31`).
   Core paints them BROWN because the palette slug `text` collides with WP's
   reserved `has-text-color` marker class (`.has-primary-color` and
   `.has-text-color` are both `!important` + equal specificity, the palette rule
   lands later and wins). SGS blocks emit a scoped rule and are immune, so they
   paint the AUTHORED pink. **This is the migration rendering the authored
   intent — the bug losing its victims, exactly as intended.**

Gates: `check-dead-pattern-attrs.py` unchanged at the 6 known hands-off
info-box findings (zero new). No horizontal overflow at 375/768/1440.

## First-paint captures (this directory)
- heading-text-migration-about-stats-2026-07-16-{mobile,tablet,desktop}.png
- heading-text-migration-faq-2026-07-16-{mobile,tablet,desktop}.png
