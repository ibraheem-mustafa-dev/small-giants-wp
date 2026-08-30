# Triage T6 — Shared-helper adoption (tier-media, borderRow, hover shape)

**Date:** 2026-08-30
**Method:** every number below is the output of a command actually run against the working
tree (not `build/`), listed inline. Zero counts are paired with a positive control from the
same file per the method-discipline brief.

---

## TASK A — `sgs_tier_media_render()`

### Numbers

```
grep -rln "sgs_tier_media_render(" plugins/sgs-blocks/src --include=*.php
```
→ `src/blocks/hero/render.php`, `src/blocks/timeline/render.php` — **2 callers, confirmed.**

```
grep -rl "<img" plugins/sgs-blocks/src/blocks/*/render.php
```
→ **17 blocks** render a raw `<img>` in `src/`: card-grid, decorative-image,
form-field-tiles, gallery, google-reviews, hero, image-sequence, media, option-picker,
product-card, responsive-logo, social-icons, star-rating, team-member, testimonial,
trust-bar, trustpilot-reviews.

(The brief's "~19" is in the right neighbourhood — hero and timeline themselves are
excluded from this list since they're the adopters, and the ~19 figure likely also counted
`build/` duplicates or a slightly different scan; 17 non-adopter `<img>`-rendering blocks in
`src/` is the verified figure.)

### Every non-adopter, what it does instead, and whether the helper actually fits

| Block | What it does instead | Genuine tier-media candidate? |
|---|---|---|
| **card-grid** | Single media slot per card via the shared `sgs_render_media()` (image OR video, one asset, no per-device swap) + `sgs_media_position_css()` for crop. | **No.** This is a different concern — same image at every width, cropped via `object-position`, not an art-direction swap. Nothing to adopt. |
| **gallery** | `wp_get_attachment_image()` (native WP `srcset`/`sizes`, size-based responsiveness) for items with an attachment ID, else the same `sgs_render_media()` helper as card-grid for video/no-ID items. | **No.** Native `srcset` responsiveness (same image, browser picks resolution) is a different mechanism from per-device DIFFERENT images. Adopting would mean giving up native `srcset` for no gain. |
| **google-reviews**, **star-rating**, **trust-bar**, **social-icons**, **option-picker** | Each renders exactly one static `<img>` (reviewer avatar, Trustpilot badge, badge icon, custom SVG-as-`<img>` glyph, swatch thumbnail). No responsive tiers of any kind exist in these blocks today. | **No.** There is no tiering behaviour to replace — adopting the helper here would mean *inventing* a feature nobody asked for, not consolidating one that exists. |
| **product-card** | Several `<img>` tags for product photo/gallery/thumbnail, driven by WooCommerce product data and zoom/gallery state, not device tiers. | **No.** Different domain (product image resolution/zoom, not art direction). |
| **trustpilot-reviews** | Static reviewer avatar/logo `<img>`s, no tiers. | **No.** |
| **form-field-tiles** | One static `<img>` per repeater tile (`sgs-form-tile__image`), no responsive variation. | **No.** Same reasoning as the static-icon group above. |
| **decorative-image** | Hand-built per-tier art direction via `sgs_responsive_image()` + sibling `<img>` tags with a **compound-class toggle CSS it authors itself**, in **NAKED MODE**: the `<img>` IS the block root (`el` in JS = the `<img>`), so tier siblings must ALSO be root-level, each carrying the uid class itself. | **Real duplicate, but genuinely blocked.** `sgs_tier_media_render()` assumes a wrapping container that owns `$uid`/`$base_class` as descendant selectors (`sgs_tier_media_toggle_css()` builds `.{uid} .{base_class}`). Naked mode has no ancestor to descend from — the block's own root note in its render.php spells this out. Adopting would need either a helper variant that emits compound (not descendant) selectors, or converting the block off naked mode — the latter is a bigger, riskier change than this triage should trigger. **Named blocker, not a false one.** |
| **responsive-logo** | Its OWN per-device art-direction system (`logoId`/`logoIdTablet`/`logoIdMobile`), but shaped as `<picture><source media>` alternates, not sibling `<img>` + `display:none` toggle CSS. | **Real duplicate, structurally incompatible today.** `<picture>` is arguably the *more correct* HTML for this (no `display:none` element sits in the DOM, browser picks the source before paint), and the block's own docblock treats this as deliberate. Migrating it onto `sgs_tier_media_render()` would be a net downgrade in markup shape unless the helper grows a `<picture>` mode — not a drop-in win. |
| **team-member** | Same `<picture><source media>` pattern, and its own comment says explicitly: *"same pattern as sgs/responsive-logo render.php"* — i.e. this is a second hand-copy of responsive-logo's shape, not of the shared helper. | **Real duplicate of responsive-logo, not of the helper.** Same structural mismatch as above. |
| **image-sequence** | Its own `tierDesktop`/`tierTablet`/`tierMobile` fail-open `<img>` (the fallback image behind the scroll-scrubbed canvas), with sibling `<img>`s + hand-written `@media` toggle CSS built directly in render.php. Explicitly agency-only (`inserter:false`). | **Real duplicate, and the closest architectural match to hero/timeline** (sibling `<img>`, BEM tier modifier, `display:none` toggle) — but it is a single-type (image-only) case, so the helper's per-tier-TYPE feature is unused, and the block is agency-only/low-traffic, so a conversion here teaches little and reaches few pages. |
| **testimonial** | Its own avatar tier system (`avatarMediaTablet`/`avatarMediaMobile`), built 2026-08-07 — **6 days before** the shared helper existed (2026-08-13) — with its own per-tier wrapper `<div class="sgs-testimonial__avatar--{tier}">`. The block's own CLAUDE.md entry says it is *deliberately NOT* `sgs_render_media()`'s `<picture>` path — that note is about a different helper, not about `sgs_tier_media_render()`. | **Real duplicate, timing-explained.** It predates the shared helper, so this isn't neglect — it's simply the case the helper was extracted FROM (like hero) but never folded back in. A legitimate adoption candidate, structurally close to hero's shape. |
| **media** | ⚠ **The standout finding.** `sgs/media` already renders sibling `<img>` tags with BEM tier modifiers for BOTH its image tiers (`imageId/imageUrl` + `Tablet`/`Mobile`) and, separately, its SVG tiers (`svgContent` + `Tablet`/`Mobile`) — same shape as hero, same tier types the helper handles. But instead of calling `sgs_tier_media_render()`, it defines and calls **its own local closure**, `$sgs_tier_visibility_css` (`render.php:484`, called at `:737` for images and `:1298` for SVG), which does the exact same job as the shared helper's `sgs_tier_media_toggle_css()` — including having independently fixed **the identical cascade bug** (tablet-set/mobile-empty falling back to desktop instead of inheriting tablet) that the shared helper's own docblock calls out as its 2026-08-13 fix. | **The clearest "hand-rolled a third time" case in the codebase.** Two independent implementations of the same toggle-CSS algorithm exist today, and one of them (media's local closure) is called TWICE in the same file for two different tier families it isn't even sharing between itself. |

### Recommended pilot block: **`sgs/media`**

Reasoning:
1. It is not a "could maybe adopt" case — it is running a **local re-implementation of the
   helper's own core algorithm**, twice, in one file. Converting it doesn't invent new
   behaviour, it deletes duplicate code.
2. It exercises **both** of the helper's non-trivial cases in one block: image tiers AND SVG
   tiers (video isn't used here, but image+SVG already proves the type-agnostic dispatch
   works beyond hero's single-type-per-instance usage).
3. Its markup shape (sibling `<img>`/`<span>`, BEM tier modifier, compound-selector toggle,
   `768/1024` breakpoints) is **byte-for-byte the same convention** `sgs_tier_media_render()`
   already implements — this is the lowest-risk conversion available, and a near-drop-in
   replacement of `$sgs_tier_visibility_css(...)` calls with the shared helper's return
   value.
4. Doing it teaches the codemod the one shape that generalises: "collapse N locally-defined
   tier-toggle implementations that already look like the shared helper into calls to it,"
   which is directly transferable to `testimonial`'s avatar tiers next, and to
   `image-sequence`'s fail-open image after that.

**Not** recommended as pilot: `decorative-image` (blocked by naked-mode structural
incompatibility — would need a helper change first, not a caller change) or
`responsive-logo`/`team-member` (blocked by `<picture>` vs sibling-`<img>` shape mismatch —
also needs a helper change, not a caller change).

### Real blockers, summarised

- **Naked-mode root-is-the-image blocks** (`decorative-image`) — the helper's descendant-selector
  toggle CSS has no ancestor to descend from. Needs a helper option, not just a caller change.
- **`<picture>`-shaped blocks** (`responsive-logo`, `team-member`) — architecturally different
  (and arguably better) HTML than the helper emits. Adopting would be a markup downgrade unless
  the helper grows a `<picture>` mode.
- **Static single-asset blocks** (card-grid, gallery, google-reviews, star-rating, trust-bar,
  social-icons, option-picker, product-card, trustpilot-reviews, form-field-tiles) — genuinely
  nothing to adopt; there is no tiering behaviour in these blocks to replace.
- **No structural blocker at all** (media, testimonial, image-sequence) — these three are pure
  "hand-rolled it before/instead of using the shared helper" cases, ranked by conversion value:
  media (highest — active duplicate code, two tier types) > testimonial (predates the helper,
  single type) > image-sequence (agency-only, low reach).

---

## TASK B — `borderRow` (confirming a deletion)

### Numbers

```
grep -l "<SgsBorderControl" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l
```
→ **45 adopters** (the brief cited 44 — one more block adopted it since that count was taken
this same day; the direction and conclusion are unaffected either way). Full list: accordion,
accordion-item, before-after, brand-strip, button, buybox, container, countdown-timer, counter,
cta-section, feature-grid, form, form-field-tiles, form-step, gallery, google-reviews, heading,
hero, icon-list, info-box, multi-button, nav-drawer, notice-banner, option-picker,
physics-canvas, post-grid, pricing-table, process-steps, product-card, product-faq,
product-faq-item, quote, site-footer, site-footer-row, site-header, site-header-row, tab,
table-of-contents, tabs, team-member, testimonial, testimonial-slider, text, timeline,
trustpilot-reviews.

```
grep -rl "borderRow" plugins/sgs-blocks/src --include=*.js
```
→ **0 live call sites.** Only two hits, both non-consuming:
- `src/components/colour-variants/borderRow.js` — the definition itself.
- `src/components/index.js:19` — `export { default as borderRow } from './colour-variants/borderRow';`

### Whole-tree search (not just `src/blocks/*/edit.js`)

```
grep -rn "borderRow" plugins/sgs-blocks .claude sites theme --include=*.js --include=*.php --include=*.md --include=*.json
```
Every hit falls into one of these buckets — **no live consumer anywhere**:
- The definition file and its barrel export (the two files above — these are what deletion targets).
- Tooling that *documents the zero*, doesn't consume it: `scripts/colour-codemod/adopt.js` (the
  codemod that WOULD adopt it if a caller matched the pattern — it's the tool for a future
  migration, not evidence of a current one), `scripts/inspector-scan/core/golden.js` +
  its fixture `scripts/inspector-scan/fixtures/31-golden-colour-control/...`,
  `scripts/scan-component-adoption.js`, `scripts/consistency/golden-controls.json` (an explicit
  `"helperAdoption"` note recording "ZERO adopters tree-wide as of 2026-08-30").
- Docs recording the same fact: `plugins/sgs-blocks/CLAUDE.md`, `.claude/decisions.md`,
  `.claude/dev-setup.md`, `.claude/memory/session-2026-08-24-colour-golden-tooling.md`,
  `.claude/plans/archive/2026-08-22-colour-control-bundles-BRIEF.md`,
  `.claude/plans/archive/2026-08-23-colour-capability-grant-design.md`,
  `.claude/plans/phase-colour-conformance.md`.
- No hits at all in `tests/`, the DB seed, or `sites/`/`theme/`.

### Verdict: **SAFE TO DELETE.**

No live consumer exists anywhere in the tree — not in a block, not in a test, not in a
fixture that executes it (the inspector-scan fixture only asserts that the scanner correctly
reports it as ZERO, it does not call `borderRow()` itself), not in generated/theme content.
The 45-vs-0 gap plus `SgsBorderControl`'s composite (width+colour+style+radius in one control)
directly explaining WHY nothing routes through the older row-builder confirms this is
**superseded, not merely unadopted** — exactly the conclusion already drawn.

**What must be removed together** (both in the same commit, or the export dangles):
1. `plugins/sgs-blocks/src/components/colour-variants/borderRow.js` — delete the file.
2. `plugins/sgs-blocks/src/components/index.js:19` — remove the
   `export { default as borderRow } from './colour-variants/borderRow';` line.

Leave untouched (they reference the *fact* of zero adoption, not the function, and stay
correct/historical after deletion — or would need a one-line "removed 2026-08-30" note at
most, not a functional change): the codemod's `ROW_HELPERS` list and `borderRow`-branch
logic in `scripts/colour-codemod/adopt.js` (it becomes permanently unreachable rather than
broken — no row will ever classify as `helper: 'borderRow'` once nothing feeds it that
shape, but leaving the branch is harmless dead code in a script, not a build risk), the
`golden.js` scanner's `ROW_HELPER_NAMES` set, and the historical docs/decisions/plans.

⛔ No reversal signal found. If a caller is later discovered outside the directories
searched here, that would reverse this verdict — none was found in `plugins/sgs-blocks`,
`.claude`, `sites`, or `theme`.

---

## TASK C — hover shape (confirmation only, D752 already owns the fix)

```
grep -l "ShadowControl" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l
```
→ **15 blocks mount `ShadowControl`**, confirmed: before-after, brand-strip, button,
card-grid, container, cta-section, hero, info-box, media, physics-canvas, post-grid, quote,
team-member, testimonial, trust-bar.

```
grep -n "valueHover\|onValueHoverChange" plugins/sgs-blocks/src/components/ShadowControl.js
```
→ **Positive control confirmed** — 7 matches inside `ShadowControl.js` itself (`valueHover`
appears in the prop signature at line 227, the `bind('hover', ...)` call at 257, the JSX
`value={ valueHover }` at 350; `onValueHoverChange` appears in the prop signature at 228, the
same `bind()` call at 257, the missing-prop warning at 294/298, and the `typeof` check at
305). This proves the search pattern is live and would match a real caller if one existed.

```
grep -rn "valueHover\|onValueHoverChange" plugins/sgs-blocks/src/blocks/*/edit.js
```
→ **0 matches.** None of the 15 blocks that mount `ShadowControl` pass `valueHover` or
`onValueHoverChange` — every one wires only the resting-state shadow.

### Confirmed: 0 of 15 wire a hover shape, against a proven-live search pattern (7 hits in the
component itself). Per the brief, this is already D752 codemod work — no design proposed here.
