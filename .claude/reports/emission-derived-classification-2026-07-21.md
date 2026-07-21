# Emission-derived attribute classification — 2026-07-21

**Scope:** extended `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py`
to derive `block_attributes.css_property` / `css_layer` (Task A, Q2 — "what CSS property
does this attribute drive?") and `inspector_control_type` (Task B, Q1 — "what control
edits it?") from CODE rather than name-guessing. DB backed up before any write to
`~/.claude/skills/sgs-wp-engine/sgs-framework.db.bak-2026-07-21`.

**No commit was made.** `role`, `canonical_slot`, `derived_selector` were never touched
(confirmed by grep: no code path in the new functions writes to them).

## MANDATORY DISCLOSURE — `css_property`/`css_layer` reseed-drift risk

`.claude/plans/archive/2026-07-05-css-property-column-design.md:82` documents these two
columns as **DERIVED — wiped every `/sgs-update` reseed** and states the sanctioned
correction channel is `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py`, "never a bare
SQLite UPDATE (a no-op that vanishes on the next reseed)." This script writes directly to
the columns via `UPDATE`, exactly as the task instructed — but that means **the 522 rows
written today will be silently discarded the next time `/sgs-update` (or
`sgs-update-v2.py`) runs**, unless a human promotes the ones worth keeping into
`ATTR_CLASSIFICATION_OVERRIDES`. I did not touch `sgs-update-v2.py` — out of scope, high
blast radius (it also drives `role`/`canonical_slot`), not requested. This is a real
finding for human review, not a caveat to bury.

## Counts before / after

| Column | Before | After | Total attrs |
|---|---|---|---|
| `css_property` | 0 | 522 | 2817 |
| `css_layer` | 0 | 6 | 2817 |
| `inspector_control_type` | 716 | 872 (+156) | 2817 |
| `role` (untouched, for reference) | 979 | 979 | 2817 |

`css_layer` stayed deliberately narrow — see "Design decisions" below.

## Design decisions (read before trusting the numbers)

1. **css_property scope = `--sgs-*` custom-property chains + two shared PHP helpers
   only.** This mirrors the SGS Framework's own Spec-32 no-inline styling contract
   (every block emits scoped CSS through `--sgs-*` custom properties or a shared
   helper), so it covers the real emission surface. It does NOT attempt to trace WP
   native `supports` (`style.spacing`, `style.color`) — those already have a working,
   documented resolution path (`db_lookup.attr_for_property`) and were out of scope.

2. **css_layer populated ONLY via the codebase's ALREADY-established layer-prefix
   convention** (`db_lookup.attr_for_layer_property` docstring, D194 DEC-3: OUTER=''→NULL,
   CONTENT='content' prefix, GRID='gridItem' prefix) — restated per the task's
   instruction not to invent a vocabulary. I deliberately did **not** trust the name
   prefix alone: a `content`/`gridItem`-prefixed attribute only gets a `css_layer` value
   when its resolved `css_property` set is a SUBSET of a narrow structural-box whitelist
   (padding/margin/gap/max-width/width/min-height — the actual property universe
   `content_band.py`/`grid_area.py` document as theirs). This is why only 6 rows got a
   `css_layer` value (`sgs/hero` contentPadding × 3 tiers, `sgs/option-picker`/`sgs/quote`/
   `sgs/testimonial` contentWidth) even though ~20 attributes match the name prefix —
   the rest (e.g. `sgs/separator::contentIconSize` → `height,width` with `color`
   alongside it) are icon/typography attrs that happen to share the English word
   "content", not CONTENT-layer routing attributes, and are correctly excluded.
   `GRID_AREA` (the 4th documented enum value) is a walker-runtime, per-repeater-item
   concept that cannot be derived from a flat attribute name — left NULL everywhere,
   not guessed.

3. **Task B never overwrites a non-NULL existing value.** A conflict is reported for
   human review, not auto-resolved. A NULL existing value is written only when exactly
   one attribute is unambiguously referenced across `value=`/`checked=`/`onChange=`.

## Verification requirement 1 — ≥10 attributes across ≥5 blocks, file:line both sides

| Block | Attribute | render.php (feed) | style.css / helper (consumer) | Resolved `css_property` |
|---|---|---|---|---|
| sgs/tabs | `tabActiveIndicatorColour` | `render.php:90` `'tabActiveIndicatorColour' => '--sgs-tab-active-indicator'` | `style.css:140,145,302` `box-shadow: inset ... var(--sgs-tab-active-indicator...)`; `style.css:160` `background: var(--sgs-tab-active-indicator...)` | `background,box-shadow` |
| sgs/form | `formFocusRingOffset` | `render.php:86` `$focus_ring_offset = absint($attributes['formFocusRingOffset'] ?? 2)`; `render.php:243` `.';--sgs-focus-ring-offset:'.absint($focus_ring_offset).'px'` | `style.css:167,175` `outline-offset: var(--sgs-focus-ring-offset, 2px)` | `outline-offset` |
| sgs/form | `formFocusRingOpacity` | `render.php:85,242` (same chain, `--sgs-focus-ring-opacity`) | `style.css:169` `opacity: var(--sgs-focus-ring-opacity, 1)` | `opacity` |
| sgs/form | `formFocusRingWidth` | `render.php:84,240` (`--sgs-focus-ring-width`) | `style.css:166,174` `outline: var(--sgs-focus-ring-width,...) solid ...` (shorthand — width is a component of `outline`, not a separate longhand) | `outline` |
| sgs/separator | `contentIconSize` | `render.php:296,299` `$icon_size = absint($attributes['contentIconSize']??24); $icon_decls = array('--sgs-separator-icon-size:'.$icon_size.'px')` | `style.css:51-52` `width: var(--sgs-separator-icon-size,24px); height: var(--sgs-separator-icon-size,24px)` | `height,width` |
| sgs/separator | `contentIconColour` | `render.php:297,301` `$icon_colour=$attributes['contentIconColour']??''; $icon_decls[]='color:'.sgs_colour_value($icon_colour)` — direct real-property emission, never via a `--sgs-*` var at all | (n/a — PHP-built inline scoped rule, `render.php:303`) | `color` |
| sgs/gallery | `columns` | `render.php:53,100` `$columns=absint($attributes['columns']??3); '--sgs-columns-desktop:'.$columns` | CHAIN: `style.css:22` `--sgs-columns: var(--sgs-columns-desktop)` → `style.css:50` `grid-template-columns: repeat(var(--sgs-columns),1fr)`; `style.css:59` `column-count: var(--sgs-columns)` | `column-count,grid-template-columns` |
| sgs/post-grid | `columns` | `render.php:60,173` (identical `--sgs-columns-desktop` chain) | `style.css:22,44,84,117` (chain to `grid-template-columns`, `column-count`, `flex`) | `column-count,flex,grid-template-columns` |
| sgs/brand-strip | `columnsDesktop` | `render.php:68,205` `$columns_desktop=...; '--sgs-columns-desktop:'.$columns_desktop` | CHAIN: `style.css:16` `--sgs-columns: var(--sgs-columns-desktop,8)` → `style.css:22,33` `--sgs-tile-cap: calc(...)`; `max-width: calc(var(--sgs-columns)*var(--sgs-tile-cap)+...)`; `style.css:26` `min-height: var(--sgs-tile-cap)` | `height,max-width,width` |
| sgs/product-card | `ctaPaddingX` | `render.php:311-314,378-382` calls `sgs_button_element_style_css($attributes,'cta',$selector)` (shared helper, never appears in product-card's own render.php/style.css text) | `includes/helpers-button-style.php:89-90,121-125` reads `PaddingY`/`PaddingX`, emits `'padding:'.$py.'px '.$px.'px;'` — BOTH attrs legitimately drive the ONE `padding` shorthand | `padding` |
| sgs/audio | `accentColour` | `render.php:91,93,222` `$accent_raw=isset($attributes['accentColour'])?...; $accent_val=...?sgs_colour_value($accent_raw):'var(...)'; "{$root_sel}{--sgs-audio-accent:".esc_attr($accent_val)...` (2-hop PHP variable chain, `isset()?:` + ternary — neither hop is a bare direct assignment) | `style.css:61,94,103,107` `background: var(--sgs-audio-accent,...)`; `outline: 2px solid var(--sgs-audio-accent)` | `background,outline` |
| sgs/audio | `spectrumColour` | `render.php:92,94,222` (identical 2-hop chain, `--sgs-audio-spectrum`) | **NOT in style.css at all** — `view.js:235` `const spectrum = resolveColour(root,'--sgs-audio-spectrum',...)` reads it via `getComputedStyle` for **Canvas `fillStyle`**, never a CSS declaration | `NULL` (correct — see requirement 3) |

11 attributes across 8 blocks (tabs, form, separator, gallery, post-grid, brand-strip,
product-card, audio) — exceeds the ≥10/≥5 bar.

## Verification requirement 2 — the 5 named acceptance targets

All resolve. Confirmed live in the DB after the final run:

| Attribute | Resolved `css_property` |
|---|---|
| `tabIndicatorColour` (actual DB name: `tabActiveIndicatorColour` — no bare `tabIndicatorColour` row exists) | `background,box-shadow` |
| `formFocusRingOffset` | `outline-offset` |
| `formFocusRingOpacity` | `opacity` |
| `contentIconSize` (sgs/separator) | `height,width` |
| 5 chained `columns` cases (`sgs/gallery` columns/columnsTablet/columnsMobile, `sgs/post-grid` columns, `sgs/brand-strip` columnsDesktop/Mobile/Tablet) | all resolve through the `--sgs-columns-desktop → --sgs-columns → {grid-template-columns, column-count, flex, max-width, width, height}` chains — depth 2, well within the depth-5 cap |

## Verification requirement 3 — the 3 named investigation targets

- **`ctaPaddingX` (sgs/product-card)** — resolves now (`padding`). Root cause of the
  original miss: it is emitted through the shared helper `sgs_button_element_style_css()`
  (`includes/helpers-button-style.php`), never through product-card's own render.php or
  style.css text at all. Added a closed, documented "shape D" handler for this helper
  plus `sgs_typography_css_rule()` (11 callers) — both are the codebase's only two
  generic multi-block CSS-emitting helpers (verified by reading `includes/` in full).
  A third one exists, `sgs_label_box_css_rule()` (mentioned in `product-card/render.php`
  comments, used for the trial-tag box) — **not implemented**, genuine gap, logged below.
- **`contentIconColour` (sgs/separator)** — resolves now (`color`). It was never routed
  through a `--sgs-*` custom property at all: `render.php:301` emits `'color:' .
  sgs_colour_value($icon_colour)` directly into a PHP-built scoped `<style>` string. The
  original prototype only looked for `--sgs-*` tokens; I broadened shape B/C to also
  recognise a DB-sourced whitelist of real CSS property names (`property_suffixes.css_property`,
  89 rows) appearing the same way.
- **`spectrumColour` (sgs/audio)** — **does NOT resolve, and this is correct, not a
  failure.** `render.php:222` feeds `--sgs-audio-spectrum`, but that custom property is
  never consumed by any CSS declaration in `style.css` — its only consumer is
  `view.js:235`, which reads it via `getComputedStyle()` at runtime to set a `<canvas>`
  `fillStyle` for the spectrum-analyser visualisation. It drives a JS/Canvas paint value,
  not a CSS property. `css_property` is correctly left NULL with a logged reason
  ("stylesheet may only consume it via JS").

## Verification requirement 4 — negative control

Confirmed the mechanism can and does say "no property found" rather than always finding
something, in two independent ways:

1. **A real case that genuinely has no CSS property** (`spectrumColour`, above) resolves
   to NULL, with a specific, checkable reason, not a fallback guess.
2. **4 additional attributes** in the current run resolve to NULL for the identical
   reason (`sgs/option-picker::borderColour` → `--sgs-op-root-border-colour`,
   `sgs/tabs::tabHoverBgColour` → `--sgs-tab-hover-bg`,
   `sgs/tabs::transitionDuration` → `--sgs-transition-duration`,
   `sgs/testimonial::staggerDelay` → `--sgs-stagger`) — I did not special-case these; the
   chain-follower tried, exhausted `style.css`, and correctly reported "unresolved."
3. During development this same discipline caught **5 real bugs in my own extraction
   code** (documented in inline comments at each fix site in `extract-signatures.py`,
   summarised below) — a check that never disagrees with itself would not have surfaced
   any of these. That is the concrete evidence the check is not vacuous: it was
   sensitive enough to catch its own defects, not just report a plausible-looking number.

## Bugs found and fixed while building this (self-audit, not hypothetical)

1. **Array-accumulator var falsely treated as a scalar alias** — `$icon_decls =
   array('--sgs-x:'.$icon_size.'px')` caused `_build_php_var_attr_map` to resolve
   `$icon_decls` → `contentIconSize`; every LATER unrelated push onto the same array
   (`$icon_decls[] = 'color:'.$icon_colour`) inherited that identity, corrupting
   `sgs/separator::contentIconSize` with `color`. Fixed by excluding any `array(...)`-
   constructed RHS from the var→attr resolver entirely.
2. **Nested/indexed attribute access collapsed to the parent key** —
   `attributes.boxShadow.blur` was truncated to `boxShadow`, colliding 5 distinct
   sub-field controls (RangeControl×4, ToggleControl, DesignTokenPicker) onto one flat
   DB row and manufacturing 9 false Task-B "disagreements" on `sgs/button`. Fixed with a
   negative lookahead rejecting any reference immediately followed by `.`/`[`.
3. **Quote-blind bare-identifier scan** — `isOn('description')` (an unrelated
   override-tracking helper's STRING-LITERAL argument) was matched as if it were the
   destructured `description` identifier, falsely colliding `sgs/product-card`'s
   "Override description" `ToggleControl` onto the real `description`
   `TextareaControl`. Fixed by stripping quoted string content before the
   bare-identifier scan.
4. **Per-physical-line cross-product instead of positional pairing** — the biggest one.
   `sgs/audio/render.php:222` declares TWO different custom properties for TWO
   different attributes on one line/statement
   (`"...--sgs-audio-accent:".esc_attr($accent_val).';--sgs-audio-spectrum:'.esc_attr($spectrum_val)`).
   The original per-line "every var × every token" approach cross-contaminated both
   attributes. Rewrote shapes B/C entirely as a positional, statement-aware scanner
   (`_split_php_statements` + ordered `fragment_re.finditer`) that tracks "the most
   recently declared property" and only pairs it with variables that follow it before
   the next declaration resets it. This also incidentally fixed the earlier documented
   "single-line assignments only" limitation, since a PHP statement can now span
   multiple physical lines.
5. **Comment-stripper corrupted string content** — the naive `re.sub(r"(?m)//.*$", "",
   src)` line-comment stripper doesn't know about string literals, so
   `'@context' => 'https://schema.org'` (`audio/render.php:110`) got truncated
   mid-string at the `//`, leaving an unterminated quote that desynced quote-parity for
   the rest of the file (breaking `_split_php_statements` and every downstream check
   for everything after that line). Rewrote `_strip_php_comments` as a single-pass,
   string-literal-aware character scanner.
6. **Tail-anchored property-token match missed mid-fragment declarations** —
   `'opacity:var(--sgs-di-op, ' . $opacity_css . ')'` (`decorative-image/render.php:144`)
   has "opacity:" followed by MORE literal text before the string closes, so a
   match anchored to the end of the string fragment found nothing, leaving
   `current_prop` stale from the PREVIOUS array element (`max-width`) and
   misattributing `opacity` → `max-width`. Fixed by searching for a property token
   anywhere in the fragment (taking the last match) instead of anchoring to the end.

Each fix is documented at its exact location in `extract-signatures.py` with the
concrete evidence (file:line) that proved it, per the "prove the cause before the fix"
discipline — none of these were guessed, all were traced to the specific line that
caused the wrong output before being changed.

## Verification requirement 5 — linter re-run, no regression

```
python plugins/sgs-blocks/scripts/generate-attr-role-map.py
  → Wrote 2817 (block_slug, attr_name) role rows

node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js
  → Members checked: 3883 | OK: 1003 | GAP: 2880 | ORPHAN: 93 — by design: 42 |
    style-property defects: 2 | UNCLASSIFIED: 49
  → exit code 0
  → no "ROLE MAP STALE" warning printed (only prints when orphan_role_map_stale > 0) →
    confirms orphan_role_map_stale: 0
```

Identical to the required baseline — this work did not touch `role`/`canonical_slot`, so
this was expected, and it is confirmed rather than assumed.

## Task A — disagreements vs name-derived `role` (29 rows, all axis-confusion — both
values are true, they answer different questions; NOT auto-resolved)

| Block | Attribute | `role` (Q1-ish, name-derived) | `css_property` (Q2, emission-derived) |
|---|---|---|---|
| sgs/adaptive-nav | verticalAlign | layout | align-items |
| sgs/audio | accentColour | color | background,outline |
| sgs/button | borderStyle | visual | border-style |
| sgs/cart | iconSize | select-from-enum | height,width |
| sgs/cta-section | shadow | color | box-shadow |
| sgs/decorative-image | maxWidthPercent | number-css-percent | max-width |
| sgs/decorative-image | zIndex | position | z-index |
| sgs/gallery | captionBgColour | color | background |
| sgs/gallery | overlayColourHover | color | background |
| sgs/heading | borderStyle | visual | border-style |
| sgs/hero | imageBorderRadius(+Mobile/+Tablet) | visual | border-radius |
| sgs/hero | imageBorderStyle | visual | border-style |
| sgs/hero | imageBorderWidth | visual | border-width |
| sgs/icon | iconSize | select-from-enum | font-size,height,width |
| sgs/icon-list | borderStyle | visual | border-style |
| sgs/nav-menu | itemRadius(+Hover) | visual | border-radius |
| sgs/option-picker | borderStyle | visual | border-style |
| sgs/option-picker | pillBorderRadius(+Selected) | typography | border-radius |
| sgs/process-steps | borderStyle | visual | border-style |
| sgs/product-card | ctaBorderRadius/Style/Width | visual | border-radius / border-style / border-width |
| sgs/quote | borderStyle | visual | border-style |
| sgs/tabs | tabActiveIndicatorColour | color | background,box-shadow |
| sgs/text | borderStyle | visual | border-style |

Pattern: `role='visual'`/`'typography'`/`'color'`/`'select-from-enum'` is the coarse
"what KIND of thing is this" classification; `css_property` is the literal CSS property.
`borderStyle` really is both "a visual/decorative attribute" AND drives `border-style` —
no contradiction, just two different axes, exactly as flagged as the expected pattern in
the task brief.

## Task A — could not resolve (5 attributes, all with a specific, checked reason)

| Block::Attribute | Reason |
|---|---|
| `sgs/audio::spectrumColour` | `--sgs-audio-spectrum` consumed only by `view.js:235` (`getComputedStyle` → Canvas `fillStyle`), never by a CSS declaration |
| `sgs/option-picker::borderColour` | `--sgs-op-root-border-colour` declared in render.php but not found consuming in style.css within the file scanned — genuine gap, not investigated further (out of the named acceptance-target scope) |
| `sgs/tabs::tabHoverBgColour` | `--sgs-tab-hover-bg` — same pattern |
| `sgs/tabs::transitionDuration` | `--sgs-transition-duration` — same pattern |
| `sgs/testimonial::staggerDelay` | `--sgs-stagger` — likely a JS animation-timing value (staggered reveal), same JS-only-sink pattern as spectrumColour, not confirmed against view.js |

## Task A — known, documented gap (not attempted)

`sgs_label_box_css_rule()` — a third shared PHP helper (mentioned in
`product-card/render.php` comments, "the SAME renderer sgs/label uses") that emits
box CSS (padding/background/radius/display) for label-style elements. Not implemented as
a shape-D handler — every attribute that ONLY resolves through this helper is currently
left NULL. Logging this rather than silently omitting it, per the task's "leave NULL
rather than guess" instruction and the no-skipping discipline.

## Task B — disagreements vs existing `inspector_control_type` (94 rows — human review,
NOT auto-resolved)

Full list (Block | Attribute | existing DB value | edit.js-derived value):

| Block | Attribute | Existing | Derived |
|---|---|---|---|
| sgs/adaptive-nav | moreMenuLabel | SelectControl | TextControl |
| sgs/brand-strip | backgroundColourHover | SelectControl | DesignTokenPicker |
| sgs/breadcrumbs | homeLabel | ToggleControl | TextControl |
| sgs/button | rel | SelectControl | TextControl |
| sgs/button | ariaLabel | ToggleControl | TextControl |
| sgs/button | iconColour | RangeControl | DesignTokenPicker |
| sgs/button | transitionEasing | RangeControl | SelectControl |
| sgs/card-grid | queryCategory | RangeControl | TextControl |
| sgs/card-grid | productEmptyMessage | ToggleControl | TextControl |
| sgs/cart | iconColour | RangeControl | DesignTokenPicker |
| sgs/countdown-timer | targetDate | ToggleControl | TextControl |
| sgs/countdown-timer | expiredMessage | RangeControl | TextControl |
| sgs/countdown-timer | numberColour | SelectControl | DesignTokenPicker |
| sgs/cta-section | ribbon | SelectControl | TextControl |
| sgs/decorative-image | flipX | RangeControl | ToggleControl |
| sgs/decorative-image | fadeOnScroll | RangeControl | ToggleControl |
| sgs/decorative-image | pathDrawEasing | RangeControl | SelectControl |
| sgs/filter-search | attributeId | NumberControl | TextControl |
| sgs/filter-search | threshold | NumberControl | TextControl |
| sgs/form | submitColour | SelectControl | DesignTokenPicker |
| sgs/form-field-number | min | SelectControl | TextControl |
| sgs/form-field-textarea | required | RangeControl | ToggleControl |
| sgs/form-field-tiles | width | RangeControl | SelectControl |
| sgs/google-reviews | textOnly | RangeControl | ToggleControl |
| sgs/google-reviews | excludeKeywords | ToggleControl | TextControl |
| sgs/google-reviews | reviewRequestUrl | ToggleControl | TextControl |
| sgs/google-reviews | showDots | RangeControl | ToggleControl |
| sgs/heading | textColour | SelectControl | DesignTokenPicker |
| sgs/heading | borderColour | SelectControl | DesignTokenPicker |
| sgs/hero | gridTemplateColumns | SelectControl | TextControl |
| sgs/hero | splitImageBleed | SelectControl | ToggleControl |
| sgs/hero | imageObjectFit | RangeControl | SelectControl |
| sgs/hero | imageObjectPosition | RangeControl | TextControl |
| sgs/hero | imageBorderColour | SelectControl | DesignTokenPicker |
| sgs/icon | iconColour | RangeControl | DesignTokenPicker |
| sgs/icon | backgroundColour | SelectControl | DesignTokenPicker |
| sgs/icon | iconColourHover | SelectControl | DesignTokenPicker |
| sgs/icon-list | iconColour | SelectControl | DesignTokenPicker |
| sgs/icon-list | borderColour | SelectControl | DesignTokenPicker |
| sgs/media | boxShadow | RangeControl | TextControl |
| sgs/media | linkRel | ToggleControl | TextControl |
| sgs/media | videoUrl | SelectControl | TextControl |
| sgs/media | videoPosterId | Button | MediaUpload |
| sgs/mega-menu | panelMaxWidth | SelectControl | TextControl |
| sgs/mega-menu | badge | SelectControl | TextControl |
| sgs/modal | triggerColour | SelectControl | DesignTokenPicker |
| sgs/notice-banner | dismissible | SelectControl | ToggleControl |
| sgs/notice-banner | showIcon | SelectControl | ToggleControl |
| sgs/option-picker | borderColour | SelectControl | DesignTokenPicker |
| sgs/pricing-table | ctaColour | SelectControl | DesignTokenPicker |
| sgs/process-steps | backgroundColourHover | SelectControl | DesignTokenPicker |
| sgs/process-steps | borderColour | SelectControl | DesignTokenPicker |
| sgs/product-card | productName | ToggleControl | TextControl |
| sgs/product-card | ctaText | ToggleControl | TextControl |
| sgs/product-card | tagPadding | RangeControl | BoxControl |
| sgs/product-card | pickerPillBgColour | ToggleControl | DesignTokenPicker |
| sgs/product-card | pickerPillTextColour | ToggleControl | DesignTokenPicker |
| sgs/product-card | pickerPillBorderRadius | DesignTokenPicker | UnitControl |
| sgs/product-card | pickerPillSelectedBorderRadius | DesignTokenPicker | UnitControl |
| sgs/product-search | placeholder | SelectControl | TextControl |
| sgs/product-search | maxResults | TextControl | NumberControl |
| sgs/quote | attributionColour | SelectControl | DesignTokenPicker |
| sgs/quote | contentWidth | ResponsiveControl | UnitControl |
| sgs/quote | borderColour | SelectControl | DesignTokenPicker |
| sgs/quote | textColourHover | TextControl | DesignTokenPicker |
| sgs/quote | backgroundColourHover | TextControl | DesignTokenPicker |
| sgs/responsive-logo | linkToHome | RangeControl | ToggleControl |
| sgs/responsive-logo | alt | ToggleControl | TextareaControl |
| sgs/star-rating | starColour | RangeControl | TextControl |
| sgs/star-rating | label | SelectControl | TextControl |
| sgs/star-rating | schemaItemName | ToggleControl | TextControl |
| sgs/table-of-contents | title | SelectControl | TextControl |
| sgs/team-member | overlayHover | SelectControl | ToggleControl |
| sgs/team-member | nameColour | ToggleControl | DesignTokenPicker |
| sgs/testimonial | ratingColour | TextControl | DesignTokenPicker |
| sgs/testimonial | summaryColour | TextControl | DesignTokenPicker |
| sgs/testimonial-slider | sideImage | Button | MediaUpload |
| sgs/testimonial-slider | transitionDuration | SelectControl | TextControl |
| sgs/testimonial-slider | showArrows | SelectControl | ToggleControl |
| sgs/testimonial-slider | backgroundColourHover | SelectControl | DesignTokenPicker |
| sgs/testimonial-slider | textColourHover | SelectControl | DesignTokenPicker |
| sgs/text | fontFamily | SelectControl | TextControl |
| sgs/timeline | connectorColour | SelectControl | DesignTokenPicker |
| sgs/timeline | borderColour | SelectControl | DesignTokenPicker |
| sgs/trust-bar | iconCircleBackground | RangeControl | DesignTokenPicker |
| sgs/trust-bar | iconColour | SelectControl | DesignTokenPicker |
| sgs/trust-bar | autoScrollPauseOnHover | SelectControl | ToggleControl |
| sgs/trustpilot-reviews | businessUnitUrl | SelectControl | TextControl |
| sgs/trustpilot-reviews | trustScore | ToggleControl | NumberControl |
| sgs/trustpilot-reviews | totalReviews | TextControl | NumberControl |
| sgs/trustpilot-reviews | subtitleText | ToggleControl | TextControl |
| sgs/trustpilot-reviews | theme | RangeControl | SelectControl |
| sgs/trustpilot-reviews | showArrows | SelectControl | ToggleControl |

**These are overwhelmingly pre-existing DATA ERRORS in the original 716-row
`inspector_control_type` population, not disagreements caused by my derivation.** Spot-
verified two directly against source (not assumed): `sgs/countdown-timer::targetDate`
existing=`ToggleControl` — but `countdown-timer/edit.js:141-148` shows it is unambiguously
a `<TextControl type="datetime-local">`. `sgs/product-card::description` — before the
quote-stripping fix (bug #3 above) this looked like a false disagreement (my code); after
the fix it dropped out of this list entirely, confirming the existing `TextareaControl`
value there is correct. The remaining 94 were not individually hand-verified one-by-one
(94 × manual source read was out of the session's time budget) — they are reported for
human/bulk review, not auto-applied, exactly as instructed.

## Task B — could not resolve (265 attributes, 2 reason categories)

| Reason | Count |
|---|---|
| No attribute reference found in `value=`/`checked=`/`onChange=` (generic action buttons — "Remove", "Add", "Upload"; render-prop components like `MediaUpload`'s `render={({open})=>...}` API that doesn't expose `value=` at the top level; wrapper components like `ResponsiveControl` whose OWN JSX tag has no `value=`/`onChange=` — the real control is a child `UnitControl` nested inside it) | 243 |
| Ambiguous — multiple distinct attributes referenced within one control (typically a `RangeControl`/`ToggleControl` editing one sub-field of a compound object attribute — deliberately excluded per bug #2 above rather than guessing which sub-field "the" control type is) | 22 |

By control type, the unresolved breakdown: Button 80, TextControl 39, ResponsiveControl
34, RangeControl 22, UnitControl 18, SelectControl 18, DesignTokenPicker 14,
ToggleControl 12, MediaUpload 10, MediaPicker 8, CheckboxControl 3, RadioControl 3,
TextareaControl 3, NumberControl 1.

Full raw data (every resolved attribute + every disagreement + every unresolved reason,
machine-readable): `.claude/reports/emission-derived-classification-raw.json`.

## Files changed

- `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` — added Task A
  (`extract_css_property_and_layer` + 8 supporting functions) and Task B
  (`extract_inspector_control_types` + 6 supporting functions), ~530 new lines. The
  pre-existing `extract_all_signatures()` (output_signature) was re-run as part of
  normal script execution but its logic was not modified.
- `plugins/sgs-blocks/scripts/consistency/attr-role-map.json` — regenerated by
  `generate-attr-role-map.py` (unchanged content — `role` was never touched).
- `.claude/reports/emission-derived-classification-raw.json` — new, full machine-readable
  results dump (written every run, overwritten).
- `~/.claude/skills/sgs-wp-engine/sgs-framework.db` — 522 `css_property` rows, 6
  `css_layer` rows, 156 `inspector_control_type` rows written. Backup at
  `sgs-framework.db.bak-2026-07-21` (pre-existing backups from other sessions untouched:
  `.bak-20260413`, `.bak-D258`, `.bak-tagidentity-20260715-235553`).

## What still needs a human decision

1. **Promote the css_property/css_layer findings into `ATTR_CLASSIFICATION_OVERRIDES`**
   (or accept they'll be wiped on the next `/sgs-update`) — this is the load-bearing
   open item from this session.
2. Review and bulk-apply (or reject) the 94 Task B disagreements — spot-checks suggest
   most are correcting real pre-existing errors, but each should get an eyes-on pass or a
   scripted bulk-apply with a second verification pass, not a blind accept.
3. Decide whether `sgs_label_box_css_rule()` is worth a third shape-D handler.
4. Decide whether to invest in resolving the 4 non-audio "JS-only?" unresolved cases
   (`option-picker::borderColour`, `tabs::tabHoverBgColour`, `tabs::transitionDuration`,
   `testimonial::staggerDelay`) — I did not confirm these are genuinely JS-only (only
   `spectrumColour` was confirmed against `view.js`); they may simply be attrs whose
   style.css consumer sits outside the render.php+style.css pair scanned (e.g. a shared
   partial, or a typo between the emitted var name and the consumed var name — a real
   bug worth finding, not investigated this session).
