---
doc_type: report
generated: 2026-06-02
spec_ref: 22-FR-22-6
replaces_section: "2026-06-01-fr22-6-migration-classification.md §Wave 2A"
method: render.php + block.json read per block (R-22-10 compliant)
---

# FR-22-6 Wave 2 Roster — Re-derived 2026-06-02

Corrects the void Wave-2A list from `2026-06-01-fr22-6-migration-classification.md`.
The original Wave-2A listed five mockup-draft section class names (social-proof, featured-product,
gift-section, footer, header) — none of these have a `block.json` or `render.php`; they are
Mama's Munches mockup HTML section wrappers, not SGS blocks. This report re-derives the real
roster by reading the actual block files.

## Method

1. Enumerated every `plugins/sgs-blocks/src/blocks/*/render.php`.
2. For each: does render.php `echo $content`? Yes → already migrated. No → read the file.
3. Classified each non-migrated block: GENUINE single-text TARGET | multi-content/array TARGET
   (different wave) | NOT-A-TARGET (config / structural / computed attr). Evidence cited inline.
4. Cross-checked against the 2026-06-01 report's buckets; corrected only what was wrong; kept
   what was right.

---

## DONE — already FR-22-6 migrated (echo $content confirmed)

These blocks have a working InnerBlocks render path. Skip entirely for FR-22-6.

| Block | Evidence |
|---|---|
| `sgs/hero` | `printf(…$content…)` line 816 — wraps `$content` in `__content` div |
| `sgs/cta-section` | `printf(…$content…)` line 196 — InnerBlocks output |
| `sgs/info-box` | `echo $content` line 137 — comment: "R-22-14: no scalar fallback" |
| `sgs/testimonial-slider` | iterates `inner_blocks` directly; per FR-22-6 (different render pattern) |
| `sgs/testimonial` | `echo $content` — confirmed migrated |
| `sgs/notice-banner` | `echo $content` — reference implementation for this wave |
| `sgs/trust-bar` | `echo $content` — dual-mode; `sourceMode='bound'` echoes InnerBlocks |
| `sgs/product-card` | `echo $content` — migrated (cta slot; FR-22-6 pioneered here) |
| `sgs/quote` | dual-path: echoes `$content` when non-empty; existing report says PARTIAL |
| `sgs/tab` | `echo $tab['content']` — renders each tab's InnerBlocks |
| `sgs/accordion` | `echo $content` — InnerBlocks are the accordion-item children |
| `sgs/feature-grid` | `echo $content` — InnerBlocks are sgs/info-box children |
| `sgs/form` | `echo $content` — InnerBlocks are form-field children |
| `sgs/mobile-nav` | `echo $content` — InnerBlocks output |
| `sgs/modal` | `echo $content` — InnerBlocks output |
| `sgs/multi-button` | `echo $content` — InnerBlocks are sgs/button children |

---

## NOT-A-TARGET — config, structural, or computed attrs (no FR-22-6 migration)

Carried forward from the 2026-06-01 report where still valid; new entries added.

### Form-field blocks (13 blocks — unchanged from 2026-06-01)
`form-field-text`, `form-field-email`, `form-field-phone`, `form-field-textarea`,
`form-field-checkbox`, `form-field-radio`, `form-field-select`, `form-field-tiles`,
`form-field-file`, `form-field-consent`, `form-field-date`, `form-field-number`,
`form-field-address`, `form-field-hidden`

Evidence (verified 2026-06-01): `label`/`fieldName` = form-field config rendered via
`field_open()`/`field_label()` helpers; conditional-logic attrs = config. Not display content
the converter emits as InnerBlocks.

### form-review — NOT-A-TARGET (unchanged)
`heading` = review-step UI header (structural).

### form-step — NOT-A-TARGET (unchanged)
`label` = ARIA step navigation label.

### container — NOT-A-TARGET (unchanged)
All 5 attrs are background/layout styling config; no display content.

### accordion-item — NOT-A-TARGET
`title` renders in `<summary>` as the collapsible header of a `<details>` element.
Evidence: `render.php` line 97 — `wp_kses_post($title)` inside `<span class="sgs-accordion-item__title">`.
`isOpen` = state boolean.
Classification rationale: `accordion-item` ALREADY echoes `$content` for the panel body (the
InnerBlocks slot). The `title` is a structural UI control (the toggle header), not editorial
prose content — analogous to `accordion-item.isOpen`. A converter extracting `.sgs-accordion-item__title`
text into a child block would break the `<details>/<summary>` semantics. NOT a single-text
FR-22-6 target.

### tab — NOT-A-TARGET (as a parent container)
`tab.label` = navigation button text + ARIA label; `tab` already renders InnerBlocks content
per panel via `(new WP_Block($inner_block->parsed_block))->render()`. No scalar display content.

### tabs — NOT-A-TARGET
`blockLabel` = ARIA label on the tablist (`aria-label`). Content is rendered via InnerBlocks
within each tab child. `tabs` itself echoes those via the tab loop.

### accordion — NOT-A-TARGET (already DONE — see DONE table above)

### counter — NOT-A-TARGET (unchanged)
`number`/`prefix`/`suffix` feed the JS animation `data-target`; migrating breaks the animation.

### star-rating — NOT-A-TARGET (unchanged)
`label` = caption on a PHP-computed SVG/JSON-LD block. Evidence: `render.php` line
`<span class="sgs-star-rating__label"><?php echo esc_html($label); ?>` — it is a text label
alongside computed stars, not primary editorial content.

### whatsapp-cta — NOT-A-TARGET (unchanged)
`message` feeds `rawurlencode()` into the `wa.me` URL. `label` = button label text (structural
UI, not editorial prose).

### mega-menu — NOT-A-TARGET
`label` = nav trigger button text (structural nav UI). `badge` = nav badge. Evidence:
`render.php` line 145 — `wp_kses_post($label)` inside the trigger button element. Panel content
comes from a `template_part`, not a scalar attr.

### mobile-nav-toggle — NOT-A-TARGET
`ariaLabel` = `aria-label` on a `<button>` toggle. Structural ARIA only.

### option-picker — NOT-A-TARGET
`label` = fieldset legend (`<legend>` element, `role="radiogroup"`). Structural form UI.
`items[].label` = per-option pill labels. All functional/config.

### table-of-contents — NOT-A-TARGET
`title` = widget heading rendered in `<summary>` or `<p class="sgs-toc__title">`.
It is a structural widget title for a dynamically computed list, not editorial prose
content. The ToC body is PHP-generated from page headings, not a scalar content attr.

### business-info — NOT-A-TARGET
Reads business data from `Sgs_Site_Info` store (phone/email/address/hours/socials/copyright).
No editorial scalar content attrs — all are display-type config (`displayType`, `iconColour`,
etc.). The rendered value is pulled from a central data store, not an attr.

### breadcrumbs — NOT-A-TARGET
`homeLabel` = "Home" override for the first breadcrumb item. Config for an auto-generated
nav list; not editorial prose content.

### countdown-timer — NOT-A-TARGET
`expiredMessage` IS display text but is a conditional state string shown only when the timer
expires — functional UI state, not primary editorial content. `targetDate` = JS engine data.
Migrating `expiredMessage` to InnerBlocks would break the conditional expired/active toggle.

### google-reviews — NOT-A-TARGET
All display content (reviewer names, review text, dates, ratings) is pulled from the Google
Reviews API cache (`wp_options`), not scalar block attrs. No editorial content attrs to migrate.

### trustpilot-reviews — NOT-A-TARGET
`subtitleText` renders as `<p class="sgs-trustpilot-reviews__subtitle">` — it IS display text
but is a UI config field (show/hide toggle `showSubtitle`), not primary editorial content.
Review content itself comes from the Trustpilot API cache, not block attrs.

### post-grid — NOT-A-TARGET
`readMoreText` = CTA button label config. All review/excerpt/title content is WP query output.
No editorial scalar content attrs.

### responsive-logo — NOT-A-TARGET
`alt` = image alt text (accessibility metadata, not display content). No editorial text attr.

### decorative-image — NOT-A-TARGET
Pure media block; no text scalar attrs. `imageUrl`/`imageId` = media references.

### divider — NOT-A-TARGET
No text attrs; visual separator only (SVG/shape/line variants).

### social-icons — NOT-A-TARGET
`icons[]` array: `url`/`platform`/`label` = structural social links. `label` = `aria-label`
on each `<a>`. No editorial text content.

### icon — NOT-A-TARGET
`iconName`/`wpIconName`/`dashiconName` = icon identifiers. No editorial text.

### icon-list — NOT-A-TARGET
`items[]` array with `text`/`icon`/`url` per item. Array-of-objects — Wave 2C territory if
ever targeted; currently NOT in the single-text FR-22-6 scope.

### brand-strip — NOT-A-TARGET
`logos[]` array of media items. No text scalar attrs; logos only.

### media — NOT-A-TARGET (for FR-22-6; covered by FR-22-19 scalar-media path)
`caption` IS display text (renders as `<figcaption>`) but `sgs/media` is a media block — its
primary slot is the image/video (scalar-media path, FR-22-19), not editorial prose. `caption`
is secondary metadata. If targeted, it would be a separate wave distinct from the text-content
migration.

---

## GENUINE SINGLE-TEXT TARGETS — corrected Wave 2A roster

These are the REAL single-text FR-22-6 targets: blocks whose `render.php` renders exactly one
scalar text/heading attr as primary editorial display content, but does NOT yet `echo $content`.
Ordered low→high blast radius (frequency of use + save.js complexity).

### Wave 2A — Genuine single-text targets (low blast radius)

**3 blocks. Each has exactly one scalar display-content attr.**

| Block | Scalar attr | Rendered as | Blast radius |
|---|---|---|---|
| `sgs/label` | `text` | `wp_kses_post($text)` in `<span class="sgs-label__text">` | LOW — simple wrapper, no complex deprecated chain |
| `sgs/heading` | `content` | `wp_kses_post($content)` in `<hX class="wp-block-sgs-heading__text">` | MEDIUM — `headingRole` tag-selector + anchor; 1 attr |
| `sgs/text` | `text` | `wp_kses_post($text)` in `<p>/<div>` — the `tag` attr picks the wrapper | HIGH — most-used content block; `tag` attr adds complexity |

**Migration shape for each (notice-banner as reference):**
1. Mark `text`/`content` deprecated in `block.json`.
2. Remove attr-driven render branch from `render.php`; replace with `echo $content`.
3. Default `innerBlocks` in `block.json` to `[{ "name": "sgs/text", "attributes": {…} }]`
   (or `core/heading` for `sgs/heading`).
4. `deprecated.js` entry: `save` returns old scalar markup; `migrate` moves scalar attr into
   the child block's attr.
5. One commit per block per R-22-5; `/qc-council` gate before each commit.

**Note on `sgs/text` ordering:** although it is the highest blast radius, it IS the target
child block used in all other migrations (notice-banner, info-box). Migrating it LAST is
correct: migrate `sgs/label` and `sgs/heading` first (they become the patterns), then
`sgs/text` last when the child-block pattern is proven.

---

## Multi-content / array-content blocks — Wave 2C (not Wave 2A)

These blocks have multiple display-content attrs or array-of-objects attrs. They are NOT
single-text targets. They form a separate wave when the single-text wave closes.

| Block | Content structure | Notes |
|---|---|---|
| `sgs/team-member` | `name` (h3) + `role` (p) + `bio` (p) — 3 distinct scalar slots | Multiple slots; needs per-slot child block mapping |
| `sgs/accordion-item` | `title` (summary header) + InnerBlocks body | Structural; `title` is the toggle; body already InnerBlocks |
| `sgs/process-steps` | `steps[]` array — each with `title`/`description`/`icon`/`number` | Array-of-objects; Wave 2C |
| `sgs/timeline` | `entries[]` array — each with `date`/`title`/`description`/`image` | Array-of-objects; Wave 2C |
| `sgs/card-grid` | `items[]` array — each with `title`/`subtitle`/`badge`/`image` | Array-of-objects; Wave 2C |
| `sgs/pricing-table` | `plans[]` array — each with `name`/`description`/`features`/`cta` | Array-of-objects; Wave 2C |
| `sgs/announcement-bar` | `messages[]` array — each with `text`/`ctaText`/`ctaUrl` | Array-of-objects; Wave 2C |
| `sgs/gallery` | `images[]` array — each with media ID + `caption` | Media-array; Wave 2C |

---

## EXCLUDED this wave (other tracks own them — unchanged from 2026-06-01)

`sgs/product-card`, `sgs/icon`, `sgs/button`, `sgs/icon-list` — other track ownership.

---

## Summary: corrected wave structure

| Wave | Blocks | Count | Status |
|---|---|---|---|
| **Wave 2A (corrected)** | `sgs/label`, `sgs/heading`, `sgs/text` | **3** | REAL single-text targets |
| Wave 2A (original 2026-06-01) | social-proof, featured-product, gift-section, footer, header | 0 | VOID — mockup section classes, not blocks |
| Wave 2B (unchanged) | decorative-image (imageUrl→sgs/media), responsive-logo (check alt), icon-block | 3 | Read render.php first; R-22-10 |
| Wave 2C (array-content) | process-steps, timeline, card-grid, pricing-table, announcement-bar, gallery, team-member | 7 | Multi-content; separate wave after 2A closes |
| Wave 3 — HIGH blast radius | heading, text, label | 3 | **Now reclassified as Wave 2A** |

**Correction to Wave 3:** the 2026-06-01 report placed heading/text/label in Wave 3 ("HIGH blast
radius") based on a separate categorisation. This report re-derives them as Wave 2A (the REAL
single-text targets) because they ARE the genuine single-scalar-display-content blocks the
original erroneous Wave 2A was supposed to contain. Wave 3 as a label is retired; these three
blocks ARE the wave.

---

## Cross-cutting finding (unchanged — gates the whole roster)

The `null-save → InnerBlocks auto-migrate gap` (parking `P-FR226-NULL-SAVE-MIGRATION`) affects
every Wave 2A migration. Resolution = WP-CLI batch migration when a production site exists
(Bean's chosen path). Resolve before any Wave 2A migration ships to a live site.
