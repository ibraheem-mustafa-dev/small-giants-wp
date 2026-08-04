# Content-attribute miss denominator — three independent structural detectors

**Date:** 2026-08-04 (revised after independent verification — see §0)
**Track:** Track A, Step 1 (of a 3-track session; siblings TrackB-ribbon, TrackC-tierrows)
**Scope:** `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py:1279-1316`'s name-regex is
being replaced with structural detection. This step measures the true population.
**DB access:** read-only throughout (`SELECT` only, via `sgs-db.py`). No seeding, no `/sgs-update`.

GROUND-TRUTH: spec=none source=db evidence=`SELECT COUNT(*) FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND role IS NULL AND attr_type='string' AND css_property IS NULL AND enum_values IS NULL AND is_responsive=0 AND box_family IS NULL` returned 262, confirming the stated denominator before building any detector.

---

## 0. Corrections after independent verification (read this first)

The first version of this report (union = 71, content-bearing = 50) was checked by an independent
reviewer, who found a **recall gap**: two rows genuinely inside the eligible-262 pool —
`sgs/hero.svgContent` and `sgs/media.svgContent` — were absent from the union despite being
plausible content (both bound to a `TextareaControl` in their edit.js, both sanitised in their own
render.php). The reviewer's framing was right: catching the HARD case (the `bgSvgContent`
dynamic-suffix shape via a shared include) while missing the EASY case (a direct, same-file,
same-name assignment) meant a detector bug, not genuine absence — and warned that "the miss is
unlikely to be exactly 2."

**That warning was correct.** Reaching the actual code (not reasoning about it) surfaced **four**
distinct defects, not two, plus one attribute neither detector was ever designed to catch:

| # | Bug | Detector | Root cause | Rows it hid (confirmed) |
|---|---|---|---|---|
| 1 | Control-structure glue | D1 (PHP) | The statement-splitter only breaks on a top-level `;`. A control header (`if (...) {`, `foreach (...) {`, `} elseif (...) {`) ends in `{`, not `;`, so it glues onto the FRONT of the next statement, breaking the `^\$var\s*=` assignment anchor. `media/render.php:681-682` — `if ( 'svg' === $media_type ) { $svg_content_raw = isset(...) ...;` — the assignment never entered the var-tracking symbol table. | `sgs/media.svgContent` |
| 2 | Missing function name | D1 (PHP) | `wp_kses_post()` was absent from the tracked-function allowlist (only bare `wp_kses` was tracked). `hero/render.php:831` sanitises via `wp_kses_post( $svg_content )`. | `sgs/hero.svgContent` |
| 3 | Fallback-wrapped bare identifier | D2 (edit.js) | `value={ svgContent || '' }` is a `BinaryExpression`, not a bare `Identifier` — the old code only tested `re.fullmatch(bare identifier)` and returned an EMPTY list (no marker, no trace) for anything wrapped in `\|\| ''` / `?? ''`. **49 occurrences across 20 edit.js files**, not narrow to these two blocks. | `sgs/hero.svgContent` (D2 side), plus every other `x \|\| ''`-bound control in the 262 pool |
| 4 | Comment-glue in destructuring | D2 (edit.js) | Even after fix #3 resolved the bare identifier, `media/edit.js`'s destructuring block groups its ~30 names with `// SVG.`-style section comments on their own line. Splitting on `,` alone glued the comment onto the FOLLOWING identifier (`"// SVG.\n\t\tsvgContent"`), so `resolve_destructured_var()`'s per-part regexes matched nothing and `svgContent` never entered the destructuring map — same "glue" bug CLASS as #1, different syntax (a JS comment, not a PHP control header). | `sgs/media.svgContent` (D2 side) |
| 5 | Scope gap, not a bug | — | `sgs/separator.contentIconName` (an icon slug like `'star'`) matches the DB's own existing "identity" content-bearing role (see `_CONTENT_BEARING_ROLES` in `assign-canonical.py`), but none of D1/D2/D3 target icon-identity signals at all — this is a category none of the three detectors were built to catch, found only by re-deriving recall against the FULL 262-row pool (§4) rather than trusting the union's own completeness. | `sgs/separator.contentIconName` (flagged, not added to the union — see §6) |
| 6 | Missed via the same full-pool re-derivation | — | `sgs/form.successRedirect` — a post-submit redirect URL, bound via `value={ { url: successRedirect } }` (an object-wrapped `LinkControl`-style binding neither D2's six tracked control names nor its value-extraction shapes handle) and delivered server-side through a `data-wp-context` JSON blob rather than `esc_url()` (invisible to D1, same blind spot as the `sgs/cart` labels). Verified by direct source read, not by any detector. | `sgs/form.successRedirect` |

**How this was found:** per the coordinator's instruction, recall was re-derived against the full
262-row eligible pool directly (did ANY detector, in ANY category, even mention this attribute?) —
not against the union, which is circular. That audit found **127 of 262 rows totally silent across
all three detectors**. The overwhelming majority of those are genuinely non-content (gap/grid/colour/
enum attributes correctly producing no content signal), but filtering the silent set for
content-shaped names surfaced #5 and #6 above.

**Both fixes were proven with a NEW negative-control plant** (not just re-run against the real
pool) before being trusted — see §7. **The 21 false positives from the original triangulation were
re-examined, not carried over unexamined**: one new false positive was found (`sgs/nav-drawer.
drawerRef`, the same DOM-ref-id shape as the already-excluded `sgs/nav-menu.drawerRef`), bringing
the total to 22; none of the original 21 changed status.

**Corrected numbers: union grew from 71 to 76** (automated), **77 including the one manually-verified
addition** (`successRedirect`), and **the honest content-bearing count grew from 50 to 55** after
re-applying the (now 22-item) false-positive removal. The number moved in the direction the
reviewer predicted — up, not down — confirming this was a recall gap, not noise.

---

## 1. Expected vs actual

| | Value |
|---|---|
| Predicted range (declared before running) | 60–90 |
| Known floor | 44 |
| Raw union, first pass (pre-correction, now known to undercount) | 67 → 71 |
| **Raw union, corrected (after fixing 4 detector bugs)** | **76** |
| **Raw union + 1 manually-verified miss neither detector's current shape covers** | **77** |
| **Content-bearing after removing 22 detector false positives (§5)** | **55** |

55 sits inside the predicted 60–90 band's lower shoulder — closer than the pre-correction 50, but
still below the declared range. The honest read: this codebase's `TextControl`/`TextareaControl`
reuse for non-content settings is real and substantial (22 false positives, not a rounding error),
and it is not fully offset by the additional content the bugfixes recovered. I flagged the
pre-correction 67/50 numbers as suspicious BEFORE the coordinator's message arrived (documented in
§7 — the negative-control plant already caught the first `<?php`-glue bug and lifted 67→71
mid-session) but did not go far enough: I trusted my own union as the recall denominator instead of
re-deriving recall against the full 262-row pool, which is exactly the blind spot that let bugs
#1/#3/#4 survive one round of self-checking. That is the methodological lesson this correction pass
exists to record.

---

## 2. The union table (77 rows: 76 automated + 1 manually verified)

Format: `block_slug | attr_name | D1? | D2? | D3? | proposed category`. `-` = detector did not fire.
`proposed category` applies the false-positive corrections from §5 — it will sometimes differ from
a raw per-detector verdict shown in the columns. Rows changed by this correction pass are marked
**NEW** or **CORRECTED**.

| block_slug | attr_name | D1 | D2 | D3 | proposed category |
|---|---|---|---|---|---|
| sgs/before-after | afterLabel | visible-text | TextControl | - | visible-text |
| sgs/before-after | afterSvgContent | svg-markup(dyn) | TextareaControl(dyn) | - | svg-markup |
| sgs/before-after | afterVideoAlt | - | TextControl(dyn) | - | a11y-metadata |
| sgs/before-after | beforeLabel | visible-text | TextControl | - | visible-text |
| sgs/before-after | beforeSvgContent | svg-markup(dyn) | TextareaControl(dyn) | - | svg-markup |
| sgs/before-after | beforeVideoAlt | - | TextControl(dyn) | - | a11y-metadata |
| sgs/breadcrumbs | homeLabel | visible-text | TextControl | - | visible-text |
| sgs/breadcrumbs | separator | visible-text | - | - | visible-text (nuance: see §6) |
| sgs/button | ariaLabel | a11y-metadata | TextControl | - | a11y-metadata |
| sgs/button | rel | - | TextControl | - | **NOT-content** |
| sgs/buybox | addToCartLabel | - | TextControl | - | visible-text |
| sgs/buybox | notifyMeLabel | - | TextControl | null-coalesce | visible-text |
| sgs/buybox | perUnitDenomination | - | TextControl | - | numeric-adornment |
| sgs/buybox | soldOutLabel | - | TextControl | null-coalesce | visible-text |
| sgs/buybox | unavailableLabel | - | TextControl | null-coalesce | visible-text |
| sgs/card-grid | emptyMessage | - | - | null-coalesce | visible-text |
| sgs/card-grid | productEmptyMessage | visible-text | - | null-coalesce | visible-text |
| sgs/cart | ariaLabel | - | TextControl | null-coalesce | a11y-metadata |
| sgs/cart | checkoutLabel | - | - | null-coalesce | visible-text |
| sgs/cart | emptyCartCtaLabel | - | - | null-coalesce | visible-text |
| sgs/cart | emptyCartMessage | - | - | null-coalesce | visible-text |
| sgs/cart | panelHeading | - | - | null-coalesce | visible-text |
| sgs/cart | viewCartLabel | - | - | null-coalesce | visible-text |
| sgs/container | bgSvgContent | svg-markup(dyn) | - | - | svg-markup |
| sgs/content-collection | emptyMessage | visible-text | TextControl | null-coalesce | visible-text |
| sgs/countdown-timer | expiredMessage | visible-text | TextControl | - | visible-text |
| sgs/counter | prefix | numeric-adornment, visible-text | TextControl | - | numeric-adornment |
| sgs/counter | suffix | numeric-adornment | TextControl | - | numeric-adornment |
| sgs/cta-section | bgSvgContent | svg-markup(dyn) | - | - | svg-markup |
| sgs/cta-section | ribbon | visible-text | TextControl **(CORRECTED: now also D2)** | - | visible-text |
| sgs/form | formName | - | TextControl | - | **NOT-content** |
| sgs/form | submitLabel | visible-text | TextControl | null-coalesce | visible-text |
| sgs/form | successMessage | - | TextareaControl | null-coalesce | visible-text |
| sgs/form | successRedirect | - | - | - | **link-href (manually verified, NEW — §0/§6)** |
| sgs/form-field-address | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-checkbox | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-consent | fieldName | a11y-metadata | TextControl | - | **NOT-content** (disagreement, §6) |
| sgs/form-field-date | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-email | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-file | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-hidden | defaultValue | - | TextControl | - | **NOT-content** (edge case, §6) |
| sgs/form-field-hidden | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-number | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-number | step | - | TextControl | - | **NOT-content** |
| sgs/form-field-phone | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-radio | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-select | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-text | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-textarea | fieldName | - | TextControl | - | **NOT-content** |
| sgs/form-field-tiles | fieldName | - | TextControl | - | **NOT-content** |
| sgs/google-reviews | excludeKeywords | - | TextControl | - | **NOT-content** |
| sgs/hero | bgSvgContent | svg-markup(dyn) | - | - | svg-markup |
| sgs/hero | svgContent | svg-markup **(NEW — bug #2 fixed)** | TextareaControl **(NEW — bug #3 fixed)** | - | svg-markup |
| sgs/icon | ariaLabel | - | TextControl | - | a11y-metadata |
| sgs/image-sequence | posterAlt | - | TextControl | - | a11y-metadata |
| sgs/media | svgContent | svg-markup **(NEW — bug #1 fixed)** | TextareaControl **(NEW — bugs #3+#4 fixed)** | - | svg-markup |
| sgs/mega-panel | brandsEyebrow | visible-text | TextControl **(CORRECTED: now also D2)** | - | visible-text |
| sgs/nav-drawer | drawerRef | - | TextControl | - | **NOT-content (NEW false positive, §5)** |
| sgs/nav-menu | drawerRef | - | TextControl | - | **NOT-content** |
| sgs/nav-menu | navLabel | - | TextControl | - | a11y-metadata |
| sgs/option-picker | typeKey | - | TextControl | - | **NOT-content** |
| sgs/pricing-table | billingToggleMonthlyLabel | visible-text | TextControl | null-coalesce | visible-text |
| sgs/pricing-table | billingToggleYearlyLabel | visible-text | TextControl | null-coalesce | visible-text |
| sgs/product-faq-item | question | - | RichText | - | visible-text |
| sgs/product-search | buttonLabel | visible-text | TextControl | - | visible-text |
| sgs/responsive-logo | alt | - | TextareaControl | - | a11y-metadata |
| sgs/star-rating | schemaItemName | - | TextControl | - | visible-text (uncertain, §6) |
| sgs/tabs | blockLabel | - | TextControl | - | a11y-metadata (disagreement, §6) |
| sgs/team-member | bio | - | RichText | - | visible-text |
| sgs/testimonial | orgName | visible-text | RichText | - | visible-text |
| sgs/testimonial | reviewerRole | visible-text | RichText | - | visible-text |
| sgs/testimonial | sourcePlatform | visible-text | TextControl | - | visible-text |
| sgs/testimonial | summaryPhrase | - | RichText | - | visible-text |
| sgs/trust-bar | bgSvgContent | svg-markup(dyn) | - | - | svg-markup |
| sgs/trustpilot-reviews | trustScoreLabel | visible-text | TextControl | - | visible-text |
| sgs/whatsapp-cta | message | - | TextareaControl **(NEW — bug #3 fixed)** | - | visible-text |
| sgs/whatsapp-cta | phoneNumber | - | TextControl **(NEW — bug #3 fixed)** | - | link-href (nuance: not a URL string itself, but the identifying data a `wa.me` link is built from — see §6) |

**55 rows are content-bearing.** **22 rows are NOT-content** despite matching a detector (bolded
above). No `link-href` candidates carrying an actual URL string were found by the automated
detectors — the two `link-href` rows in the final table (`successRedirect`, `phoneNumber`) were
BOTH found only by direct source read during the correction pass, not by D1/D2/D3, which is itself
a finding (§4/§6).

---

## 3. Single-method rows (⭐ most valuable output — updated)

**Detector-1-only (5 rows, down from 7 — two moved into D1+D2 overlap once D2's bugs were fixed):**

| Row | Why D2 misses it | Why D3 misses it |
|---|---|---|
| `sgs/breadcrumbs separator` | Bound to a `SelectControl` (fixed enum of punctuation glyphs) — D2 treats `SelectControl` as styling-shaped by design. | Default is `'/'`, never i18n-wrapped. |
| `sgs/container/cta-section/hero/trust-bar bgSvgContent` (4 rows) | The SVG picker in `edit.js` uses a dedicated component outside D2's six-name control vocabulary entirely — a genuine, permanent structural boundary, not a bug. | No i18n-wrapped default (empty string). |

**Detector-2-only (36 rows — 14 genuinely content, 22 false positives, §5):** the structural reason
D1 can't see these divides into two groups now that D1's two bugs are fixed:
- **Genuinely invisible to D1 by construction** (14 rows): `before-after afterVideoAlt/beforeVideoAlt`
  (D1's `esc_attr()`-proximity heuristic still doesn't resolve these — a real remaining limit, not
  the bug class fixed this session), text rendered through a CHILD InnerBlocks composite
  (`product-faq-item question`, `team-member bio`, `testimonial summaryPhrase`), a11y strings behind
  a `printf`/`sprintf` positional-argument split (`icon ariaLabel`, `image-sequence posterAlt`,
  `nav-menu navLabel`, `responsive-logo alt`, `star-rating schemaItemName`, `tabs blockLabel`),
  content routed through a helper-function call D1's allowlist doesn't cover
  (`buybox addToCartLabel/perUnitDenomination`), and `whatsapp-cta message` (the WhatsApp pre-filled
  text is `rawurlencode()`'d into a URL query string, never passed through an escaping call at all).
- **False positives** (22 rows, all technical settings — full list in §5).

**Detector-3-only (6 rows, unchanged):** `sgs/cart`'s five string attrs plus `card-grid
emptyMessage` — all delivered client-side through the WordPress Interactivity API's
`data-wp-context`, invisible to both a PHP escaping walk and an edit.js control walk (cart has
almost no inspector UI for these). Unchanged by this correction pass.

---

## 4. Per-detector precision, recall, and blind spots (recomputed)

Measured against the corrected 76-row raw union and the 55-row post-triangulation content-bearing
set. **Recall is also now reported against the FULL 262-row eligible pool directly** (the "reach
audit"), per the coordinator's instruction that measuring recall only against the union is circular.

| Detector | Raw hits (eligible-262) | False positives | Precision | Recall vs union (76) | Recall vs final content (55) | "Reached" (any category) vs full 262 pool |
|---|---|---|---|---|---|---|
| D1 (render.php escaping) | 29 (was 27) | 1 (`form-field-consent.fieldName`) | 97% | 38% | 51% | 97/262 (37%) |
| D2 (edit.js controls) | 65 (was 57) | 22 (was 21) | 66% | 85%¹ | 78% (43/55) | 78/262 (30%) |
| D3 (i18n default) | 16 (unchanged) | 0 | 100% | 21% | 29% | 16/262 (6%) |
| **At least one detector** | — | — | — | — | — | **135/262 (52%)** |

¹ D2's recall vs the raw union jumped because its own raw-hit count grew faster than the union
(the bugfixes added rows D2 could now see that D1/D3 still can't — the InnerBlocks-child and
printf-split content).

**The "reached by at least one detector" row (135/262, 52%) is the number that matters for the
next step.** 127 of 262 eligible rows produced ZERO output from all three detectors. The
overwhelming majority of that silence is CORRECT — most of the 262 are genuinely styling (gap/grid/
colour/enum attributes that should never surface as content). But this is exactly the number a
seeder must not skip past: **it is the honest search space for "did we miss anything else",** and
this correction pass only fully hand-verified the content-shaped-name subset of it (see §0 items
#5/#6, and §6 below) — a full manual read of all 127 was outside this step's scope.

**D1 blind spots (updated):**
1. **Fixed this pass:** control-structure glue on the statement splitter (bug #1) and the missing
   `wp_kses_post`/`esc_attr__`/`esc_html__` function names (bug #2 + defensive completeness).
2. Still open: JS-side rendering (Interactivity API) is structurally invisible to a PHP-only walk.
3. Still open: text escaped inside a child InnerBlocks composite rather than the parent's own
   render.php.
4. Still open: `printf`/`sprintf` multi-placeholder templates split the HTML attribute name from
   the escaped value across positional arguments, defeating the proximity-window classifier.

**D2 blind spots (updated):**
1. **Fixed this pass:** the `value={ ident || '' }` / `value={ ident ?? '' }` fallback shape (bug #3,
   49 occurrences across 20 files) and inline `//` section comments breaking the destructuring
   parser (bug #4).
2. **Still the dominant one:** control TYPE is not a reliable content signal — 22 of 65 raw hits
   (34%) are technical settings, not content. A seeder built on D2 alone, uncross-checked, would
   still mis-tag 22 attributes.
3. Still open: content bound through a non-text-shaped control (`separator`'s `SelectControl`) or an
   object-wrapped `LinkControl`-style binding (`successRedirect`'s `value={ { url: X } }`) is
   invisible — the value-extraction shapes only handle scalar bindings, not object-shaped ones.
4. Still open: single-file-scope resolution (destructuring + indirect-var lookup both only search
   the same file) — unproven whether this misses anything across the wider ~85-block codebase
   beyond the 262-row pool.

**D3 blind spots (unchanged this pass):** narrow recall by design (only the `?? __(...)` shape),
can't see `block.json`-declared defaults, can't self-diagnose a content default that should have
been i18n-wrapped but wasn't. Zero counter-examples found on re-check (still 0/24 false positives
across every i18n-wrapped default in the codebase, not just the 16 inside the pool).

---

## 5. False positives — re-examined, not carried over (per the coordinator's explicit instruction)

The original 21-row false-positive list was **re-checked against the corrected data**, not assumed
to still hold. Result: all 21 original calls stand (re-verified: `button.rel`, `form.formName`, 12×
`fieldName` across form-field blocks, `form-field-hidden.defaultValue`, `form-field-number.step`,
`google-reviews.excludeKeywords`, `nav-menu.drawerRef`, `option-picker.typeKey`), **plus one new
false positive surfaced by the corrected D2 run**: `sgs/nav-drawer.drawerRef` — the same
DOM-element-id-reference shape as `sgs/nav-menu.drawerRef` (both blocks share the drawer/burger
pairing mechanism; confirmed by direct source read of `nav-drawer/render.php:72-76`, which documents
the two blocks' `drawerRef` defaults matching on purpose). **Total: 22 false positives**, not 21.

No false positive was REMOVED from the original list — the correction only added one.

---

## 6. Disagreements and uncertain rows

| Row | D1 says | D2 says | Resolution |
|---|---|---|---|
| `sgs/form-field-consent fieldName` | a11y-metadata (one `aria-describedby` use) | content-control | **NOT-content** — same universal-rule reasoning as the original pass: identical attribute across 12 other form-field blocks is a technical HTML `name=`/`id=` value; one incidental `aria-describedby` use doesn't change what it fundamentally is. |
| `sgs/tabs blockLabel` | NOT-content (proximity-window miss) | content-control | **a11y-metadata** — confirmed by direct read of `tabs/render.php:218-219` (`aria-label` binding). |
| `sgs/breadcrumbs separator` | visible-text | (SelectControl, styling-shaped) | **visible-text**, flagged nuance: DB records it as `enum_values IS NULL` even though the editor presents a closed enum — a data-quality gap distinct from role classification. |

**New uncertain rows from this correction pass:**
- `sgs/form.successRedirect` — classified `link-href` by manual verification only (no detector
  caught it — see §0 item #6). The value genuinely is a URL (a post-submit redirect target), so
  `link-href` fits the six-category scheme cleanly, unlike `phoneNumber` below.
- `sgs/whatsapp-cta.phoneNumber` — classified `link-href` as the closest fit, but flagged uncertain:
  it is not itself a URL string, it's the raw digits a `wa.me/<number>` URL gets built FROM
  (`render.php:38` — `$phone_number = $attributes['phoneNumber'] ?? '';`, later concatenated into
  the WhatsApp deep link). Whoever owns the final role taxonomy should decide whether "the data a
  link is constructed from" belongs in `link-href` or needs its own bucket — this report doesn't
  have the authority to invent a seventh category.
- `sgs/separator.contentIconName` — NOT added to the union table. It matches the DB's own existing
  "identity" content-bearing role (icon/glyph selection — see `_CONTENT_BEARING_ROLES` in
  `assign-canonical.py:1264-1270`), but none of the three detectors built this session target
  icon-identity signals at all. Flagging this as a scope gap for whoever builds the Step-2 seeder,
  not silently folding it into `visible-text` (it is not free-typed text) or `NOT-content` (the
  existing DB taxonomy already treats identity as content-bearing).
- `sgs/form-field-hidden.defaultValue` — unchanged from the original pass: classified NOT-content
  for the "not visibly rendered" test, but genuinely uncertain (a hidden field's default value is
  real operator-authored data the project's "NO SKIPPING" rule would want preserved through
  cloning even though it never paints to the screen).

---

## 7. Negative-control plant tests (methodology proof — extended this pass)

Per the mandated methodology, EVERY fix in this correction pass was proven against a fresh plant —
not just re-run against the real pool and trusted because the real-pool numbers moved in the
expected direction:

**Original pass (unchanged, still valid):**
1. `plant_render.php` (`plantedContentAttr` / `plantedStyleAttr`) — proved D1's original `<?php`-glue
   bug (shares the ROOT CAUSE class with bug #1 above), fixed, re-verified.
2. `plant_edit.js` (`plantedRichAttr` / `plantedRangeAttr`) — D2 content-vs-styling control split,
   passed clean on first run.
3. `plant_default.php` (`plantedI18nDefault`) — D3, passed clean on first run.

**This correction pass — the fixes were verified directly against the REAL failing code FIRST**
(proving the bug, not inferring it), **then two new plants were built as durable regression
fixtures** so a future change to these scripts is caught by a plant test, not only by noticing a
number moved on the live pool:

- Ran the tokenizer's statement-splitter standalone against `media/render.php`, found the assignment
  statement literally began with `if ( 'svg' === $media_type ) { $svg_content_raw = ...` — proved
  the glue, not inferred it, before writing the fix.
- Ran the enumerated-function-name audit (`grep -rhoE '\b(esc_[a-z_]+|wp_kses[a-z_]*)\s*\('` across
  every render.php/includes file) and found `wp_kses_post`, `esc_attr__`, `esc_html__`, `esc_js`,
  `esc_like`, `wp_kses_allowed_html` as functions the tracked list didn't cover — verified `esc_js`/
  `esc_like`/`wp_kses_allowed_html` are irrelevant (JS-context escaping, SQL LIKE-escaping, and an
  allowlist-returning helper respectively, none of which escape an attribute value for output), and
  that `esc_attr__`/`esc_html__` currently wrap ONLY literal hardcoded strings in this codebase
  (`grep` for `esc_attr__( \$` / `esc_html__( \$` returned zero matches) — added them anyway as
  defensive coverage since they are a genuine escaping+i18n combo that could wrap an attribute
  default in a future block.
- Ran `resolve_destructured_var()` standalone against `media/edit.js`'s real destructuring block and
  watched it return `None` for `svgContent` before touching the fix, then re-ran after the fix and
  watched it return `'svgContent'` — the fix was proven against the actual file that was failing,
  not just against a synthetic plant.
- Then built two new plants — ⛔ **CORRECTION (independent verification, same session): these were
  NOT durable. Neither `plant_render2.php` nor `plant_edit2.js` exists anywhere in the repository —
  `find . -name 'plant_*'` returns nothing.** They were transient, used during the fix and lost. The
  DETECTOR FIXES ARE REAL AND VERIFIED (both `svgContent` rows are now detected, all 8 `%vgContent`
  rows are in the union); what does not exist is the regression protection this section claims.
  Treat these two code blocks as a SPECIFICATION for fixtures still to be built, not as an artefact
  on disk. This is the session's own lesson recurring: a prose claim is not a committed artefact,
  and a regression fixture that was never written reads identically to one that passes.

  The plants as specified were:

  `plant_render2.php`:
  ```php
  if ( 'x' === $mode ) {
      $plantedGlued = isset( $attributes['plantedGlued'] ) ? (string) $attributes['plantedGlued'] : '';
      echo wp_kses_post( $plantedGlued );
  }
  ```
  Confirmed the plant landed on disk (2 matches) before running. Result: detector correctly returns
  `plantedGlued → wp_kses_post → svg-markup`.

  `plant_edit2.js`:
  ```js
  const { plantedFallback } = attributes;
  <TextareaControl value={ plantedFallback || '' } onChange={...} />
  ```
  Confirmed the plant landed on disk (2 matches). Result: detector correctly returns
  `plantedFallback → TextareaControl → content-control`.

**What this proves methodologically:** the original negative-control plant (item 1) caught ONE bug
mid-session and the report said so honestly. It did NOT catch bugs #2/#3/#4, because none of those
three plants exercised the control-structure-glue shape, the missing-function-name shape, or the
fallback-operator shape — a plant only proves what it plants. This is the same lesson as
`a-negative-control-has-its-own-vacuity-mode` (memory index): a control that passes tells you
nothing about shapes it never tested. The fix, applied here, is what the coordinator asked for:
re-derive recall against the full ground-truth pool rather than trusting a passing self-test.

---

## What we could not determine (unchanged from original pass, plus one addition)

- Whether D2's single-file-scope resolution has further false negatives outside the 262-row pool
  was not tested (scope of this report is the eligible-262 denominator only).
- Full manual read of all 127 "totally silent" rows was not completed — only the content-shaped-name
  subset (§0 items #5/#6) was hand-verified. A future pass should either extend this or accept the
  residual risk explicitly rather than assume 127/127 are correctly non-content.
- `sgs/star-rating schemaItemName` — still unconfirmed by direct DOM/source read (flagged uncertain
  in the original pass, unchanged).
- `sgs/whatsapp-cta.phoneNumber`'s correct category bucket (§6) is a taxonomy decision, not a
  detection question — flagged for whoever owns the role schema.

---

## Detector scripts (re-runnable — seeder inputs for Step 2)

All under `plugins/sgs-blocks/scripts/content-role-detect/` (new directory, no existing files
touched, per the read-only/no-repo-writes constraint beyond this directory + this report):

- `detector1_render_escaping.php` + `classify_detector1.py` — render.php/includes escaping walk
  (fixed this pass: control-structure-glue statement splitting, `wp_kses_post`/`esc_attr__`/
  `esc_html__` added to the tracked-function list)
- `detector2_editjs_controls.py` — edit.js control-binding walk (fixed this pass: fallback-operator
  value bindings `x || ''` / `x ?? ''`, inline-comment glue in destructuring blocks)
- `detector3_i18n_default.py` — i18n-wrapped-default walk (unchanged this pass)
- `README.md` — run instructions for all three

Raw + classified NDJSON outputs from this session's runs are NOT committed to the repo (scratchpad
only) — re-run per the README to regenerate. The five negative-control plant files (3 original + 2
added this pass) live in the scratchpad's `negctrl/` subdirectory, never in the repo.
