# Visual-diff report — SGS block-bindings support + the last 4 bound paragraphs, 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## Problem
WordPress resolves `metadata.bindings` ONLY for a hardcoded core-block allowlist
(`wp-includes/block-bindings.php:141 get_block_bindings_supported_attributes()`,
read on live WP 7.0.1; `class-wp-block.php:279 process_block_bindings()` returns
early when the list is empty). So 4 `core/paragraph` in `contact-form.php` that
bind `content` → `sgs/site-info` (email / phone / address / opening hours) could
not migrate: an SGS block would render the binding INERT and the live value would
silently vanish. The transformer refused them; this closes the gap properly.

## Fix
`includes/class-sgs-block-bindings-support.php` registers SGS blocks on WP 6.9's
per-block filter `block_bindings_supported_attributes_{$block_type}` — the
official extension point, no core hack:

| block | attrs | verified consumed at |
|---|---|---|
| `sgs/text` | `text` | `text/render.php:47` `$text = $attributes['text']` |
| `sgs/heading` | `content` | `heading/render.php:88` |
| `sgs/button` | `url`, `label`, `linkTarget`, `rel` | `button/render.php:27-31` |

Attr names verified against each block.json — note `sgs/text` uses `text` (not
core's `content`) and `sgs/button` uses `label` (not core's `text`). A binding
left under the core name would target an attr the block doesn't have and render
nothing — the textColor/textColour naming class, one layer up. So
`paragraph_pairing.py` REBINDS `bindings.content` → `bindings.text` on migration.

## Live proof (canary, OPcache + CDN cleared)
`/tc-contact-form-before/` (1481, core markup at `4c120f0e`) vs
`/tc-contact-form-after/` (1482, migrated). Rendered output, byte-identical:

| bound value | core/paragraph (before) | sgs/text (after) |
|---|---|---|
| email | `mailto:Zainab@mamasmunches.com` | `mailto:Zainab@mamasmunches.com` |
| phone | `tel:0121%20496%200123` | `tel:0121%20496%200123` |
| address | `Birmingham&lt;br&gt;United Kingdom` | `Birmingham&lt;br&gt;United Kingdom` |

Migration is LOSSLESS. `sgs/site-info` confirmed genuinely alive on the live
registry (the core control resolves), which D325 warns is not a given.

Safe-zone `core/paragraph` remaining: **0**.
`check-dead-pattern-attrs.py`: unchanged at the 6 known hands-off findings.

## ⚠ TWO PRE-EXISTING BUGS THIS SURFACED (not caused by it — identical on both sides)
Both are user-visible on the live contact section and belong to
`Sgs_Site_Info_Binding`, not to this change or the migration:

1. **`is_url_field()` prefixes `tel:`/`mailto:` unconditionally.** `URL_KEYS =
   ['email','phone']` applies `tel:` + `esc_url()` regardless of whether the
   value lands in an `href` or in text content — so a phone bound into a
   paragraph renders the literal string `tel:0121%20496%200123`, percent-encoded
   space and all. The source needs to distinguish "used as href" from "used as
   text".
2. **The address `<br>` is escaped** and prints literally as `&lt;br&gt;`.

Fixing either changes rendered output on a client site → Bean's call, separate
from Track C.

## Driver hardening shipped alongside (qc-council Rater A)
`transform_file` rewritten to LEAF-FIRST + RE-PARSE-PER-SWAP. The old
single-parse back-to-front loop could not survive same-type nesting (53
`core/group` nodes nest inside another `core/group`) for two independent
reasons — stale offsets after a nested splice, and, worse, `transform()` being
handed the ORIGINAL text so an outer node would rebuild itself from
still-core inner markup, silently discarding the inner swap. Plus a new
TERMINATING INVARIANT: every remaining core node must be one we deliberately
refused, else the run aborts before writing — the round-trip parse only proved
the file still *parses*, not that a conversion survived.
