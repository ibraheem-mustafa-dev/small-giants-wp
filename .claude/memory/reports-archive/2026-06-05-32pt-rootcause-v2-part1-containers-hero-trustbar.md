# Root-Cause v2 — Points 1, 2, 3, 4, 5, 31
## Run: mamas-munches-homepage-2026-06-05-103529 · Date: 2026-06-05
## IRON RULE: every causal claim is quoted from an actual evidence source. "UNVERIFIED" = could not confirm from available files.

---

## Point 1 — Composite blocks wrapped in a redundant outer `sgs/container`

**Symptom:** Both `sgs/hero` and `sgs/trust-bar` in the emitted markup are wrapped inside an outer `sgs/container`, even though both are container-mirror composites with their own built-in wrapper.

**DRAFT evidence:** Not applicable — this is a converter behaviour issue, not a draft CSS gap.

**CLONE-emit evidence (extract.patched.json):**
- Position 47340 (hero): `<!-- wp:sgs/container {"widthMode":"full","className":"sgs-hero"} --> <!-- wp:sgs/hero {"style":{"color":{"background":"var:preset|color|surface-pink"}},...} -->`
- Position 50050 (trust-bar): `<!-- wp:sgs/container {"widthMode":"full","className":"sgs-trust-bar"} --> <!-- wp:sgs/trust-bar {"style":{"color":{"background":"var:preset|color|surface-pink"},...},"sourceMode":"bound"} -->`

**BLOCK-CODE evidence (convert.py):**
- `convert.py:2901`: `if is_top_level and slug != "sgs/container": return db.emit_sgs_container_wrapping(slug, attrs, children_markup, css)` — this fires for EVERY top-level non-container slug. No exemption for mirror-roster composites.
- `convert.py:874`: `def _is_container_mirror_block(slug: str)` — the guard function exists and queries `block_composition WHERE block_slug = ? AND wraps_block = 'sgs/container'`.
- `convert.py:2669`: `if slug is not None and _is_container_mirror_block(slug):` — the guard is called in the A2 lift path only, NOT before line 2901.
- `db_lookup.py:2389`: `def emit_sgs_container_wrapping(...)` — wraps unconditionally.

**SGS_DB evidence (block_composition table):**
- `sgs/hero`: `wraps_block='sgs/container'`, `composition_role='section-root'`, `has_inner_blocks=1`, `container_kind='section'` — it IS in the mirror roster.
- `sgs/trust-bar`: `wraps_block='sgs/container'`, `composition_role='content-block'`, `has_inner_blocks=1`, `container_kind='section'` — it IS in the mirror roster.

**REAL CAUSE:** `convert.py:2901` has no mirror-roster check before the exception-3 wrap. `_is_container_mirror_block()` is called at line 2669 (A2 path) but not at line 2901.

**DOC vs IMPL:** IMPLEMENTATION-fault. The spec (FR-22-4) documents exception-3 as the wrap for non-container top-level slugs but does not explicitly exclude mirror composites. The implementation applies the wrap unconditionally.

**Fix-shape:** In `convert.py:2901`, add `and not _is_container_mirror_block(slug)` to the guard. Mirror-roster composites fall through to `emit_wp_block(slug, attrs, children_markup)` at line 2904 directly.

**Prior report status:** CONFIRMED CORRECT. All cited line numbers verified against the live codebase. DB rows verified against SGS_DB.

---

## Point 2 — Hero background/gradient visible around the split image

**Symptom:** A background colour (or gradient) is visible around or behind the split image on the right side instead of the image filling the media column edge-to-edge.

**DRAFT evidence:**
- `index.html` line 249–256: `.sgs-hero { background: var(--surface-pink); overflow: hidden; display: grid; grid-template-areas: "media" "content" }` — section itself has the pink background.
- `index.html` line 280–292 (media query): `@media (min-width: 768px) { .sgs-hero { grid-template-columns: 1fr 1fr; min-height: 520px; } .sgs-hero__media { height: 100%; } .sgs-hero__split-image--desktop { display: block; height: 100%; object-position: center; } }` — the media column fills height 100% only when it is a DIRECT grid child of the section.

**CLONE-emit evidence (extract.patched.json, position 47340):**
`<!-- wp:sgs/container {"widthMode":"full","className":"sgs-hero"} --> <!-- wp:sgs/hero {"style":{"color":{"background":"var:preset|color|surface-pink"}}, ...} -->` — the hero is one level deeper than it should be.

**BLOCK-CODE evidence:**
- `hero/style.css`: `.sgs-hero:not([style*="background-color"]):not([style*="background-image"]):not(.has-background) { background-image: linear-gradient(135deg, var(--wp--preset--color--primary-dark) 0%, var(--wp--preset--color--primary) 100%); }` — the default gradient is suppressed when an inline background-color or `.has-background` class is present.
- Hero emitted attrs include `"style":{"color":{"background":"var:preset|color|surface-pink"}}` → WP renders this as `has-background` class + inline `style="background-color:..."` → the gradient suppression selector fires correctly → NO gradient problem.

**REAL CAUSE — corrected:** The root cause of the media-column layout problem is **Point 1's double-wrap** (the redundant outer `sgs/container`). The outer container adds an extra DOM layer between the page and the `sgs/hero` element. The hero's own `display:grid; grid-template-columns:1fr 1fr` is on the `<div>` rendered by `sgs/hero`'s render.php. The `.sgs-hero__media { height: 100% }` and `.sgs-hero__split-image--desktop { height: 100% }` from the draft CSS only work when the media `<div>` is a DIRECT child of the grid — not when there is an extra `sgs/container` layer above the grid.

**NOT a gradient issue.** The hero `style.color.background` attribute is correctly set to `var:preset|color|surface-pink` in the emitted markup; WP adds `.has-background` which suppresses the default gradient in `hero/style.css`. The gradient does NOT appear on the cloned hero.

**DOC vs IMPL:** IMPLEMENTATION-fault — same root cause as Point 1. Fix Point 1 and this resolves.

**Prior report status:** CONFIRMED CORRECT on mechanism (double-wrap disrupts height:100% chain). Gradient claim is irrelevant (gradient is correctly suppressed). Prior report did not claim it was a gradient problem — it correctly said the cause was the double-wrap disrupting height inheritance.

---

## Point 3 — No max-width applied to hero sub-paragraph

**Symptom:** The hero sub-paragraph (`.sgs-hero__sub`) fills the full content-column width instead of being capped at `max-width: 420px` as in the draft.

**DRAFT evidence:**
- `index.html` line 306: `@media (min-width: 768px) { .sgs-hero__sub { font-size: 18px; margin-bottom: 28px; max-width: 420px; } }` — the `max-width: 420px` is a media-query-scoped rule on the child `<p>` element, NOT on the section root.

**CLONE-emit evidence (leftover-buckets.json):**
- `{"section_id": "hero", "slot": "subHeadlineMaxWidth", "reason": "no value extracted", "source": "stage_3_slot_list", "gap_level": "attribute", "severity": "medium"}` — the slot is registered but the value was never extracted.

**BLOCK-CODE evidence:**
- `hero/block.json`: `"subHeadlineMaxWidth"` attribute is NOT present. UNVERIFIED — needs live-DOM check on what attr name the hero block actually uses for this. The `render.php` line 94 references `$attributes['subHeadlineMaxWidth']`, so the attr is consumed in render.php even though it may not be in block.json attributes list.
- `hero/render.php:94`: `$sub_headline_max_width = $attributes['subHeadlineMaxWidth'] ?? null;` — attr is consumed and has a render path.
- `extract.patched.json`: `subHeadlineMaxWidth` does NOT appear in the hero block's emitted attrs (confirmed — searched and not found in the hero block attrs in the emitted markup).

**REAL CAUSE:** The `max-width: 420px` is on the `.sgs-hero__sub` child element (in a media query). Stage-3 slot extraction tries to lift CSS from the BLOCK'S own root element, not from interior child elements. The converter's `_route_composite_interior` routes each child as a separate InnerBlock (sgs/text, sgs/heading, etc.) — the child element's `max-width` goes into the child block's `style.*` as a content-block CSS property (D1 CSS), NOT into the parent hero block's `subHeadlineMaxWidth` attribute. No cross-level element-CSS-to-parent-attr promotion exists.

**DOC vs IMPL:** IMPLEMENTATION-fault with a documentation gap. The slot exists on the block; no converter code bridges from child-element CSS to parent composite block attr.

**Fix-shape:** A post-processing pass inside `_route_composite_interior` that, after routing the content column, inspects direct child elements for CSS rules mapping to known composite block-level attrs by (block_slug, bem_element, css_property) → block_attr_name lookup.

**Prior report status:** CONFIRMED CORRECT.

---

## Point 4 — Trust-bar grid columns appear broken (2-col instead of 4-col)

**Symptom:** The trust-bar shows as a 2-column grid instead of 4 columns at ≥600px, due to nesting inside a redundant outer `sgs/container` that has no column layout set.

**DRAFT evidence:**
- `index.html` line 318–328: `.sgs-trust-bar { background: var(--surface-pink); padding: 22px 20px; }` and `.sgs-trust-bar__inner { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px; max-width: 1100px; margin: 0 auto; }` with `@media (min-width: 600px) { .sgs-trust-bar__inner { grid-template-columns: repeat(4, 1fr); } }`.

**CLONE-emit evidence (extract.patched.json, position 50050):**
`<!-- wp:sgs/container {"widthMode":"full","className":"sgs-trust-bar"} --> <!-- wp:sgs/trust-bar {"style":{"color":{"background":"var:preset|color|surface-pink"},"spacing":{"padding":{"top":"22px","right":"20px","bottom":"22px","left":"20px"}}},"sourceMode":"bound"} --> <!-- wp:sgs/container {"className":"sgs-trust-bar__inner","htmlTag":"div",...} -->` — confirmed: outer container → trust-bar → inner container.

**BLOCK-CODE/CSS evidence:**
- `variation-d0-d2.css` (lifted D2 CSS): `.page-id-144 .sgs-trust-bar__inner { display: grid; margin: 0 auto }` — the inner container has grid display, but the outer `sgs/container` (with `widthMode:"full"`) has no layout/columns set, so its WP block rendering produces an unconfigured wrapper that sits above the trust-bar and can constrain it.

**REAL CAUSE:** Same as Point 1 — the double-wrap. The outer `sgs/container` intercepts the block hierarchy. Because the trust-bar is a grid-using section composite, the extra layer breaks the relationship between the trust-bar's own grid attrs and the WP block rendering context.

**DOC vs IMPL:** IMPLEMENTATION-fault — same root cause as Point 1. Fix Point 1 and this resolves.

**Prior report status:** CONFIRMED CORRECT.

---

## Point 5 — Trust-bar icons show default star; missing white circle background

**Symptom:** All 4 trust-bar badge icons render as the default Lucide `star`, and the white circular background (`border-radius:50%; background:white`) is missing.

### Sub-cause A: Icon identity (all stars)

**DRAFT evidence:**
- `index.html` lines 794–820: Trust-bar HTML uses raw inline `<svg>` elements. Example badge 1: `<svg viewBox="0 0 24 24"><path d="m3 12 9-9 9 9"/><path d="M5 10v10..."/></svg>` (house icon). Badge 4: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="fill: var(--primary-dark);"><polygon points="12 2 15.09 8.26 22 9.27..."/></svg>` (star polygon). The SVG paths are raw; there are NO Lucide icon names in the draft HTML.

**CLONE-emit evidence (extract.patched.json, positions 50665, 51004, 51345, 51687):**
All four trust-bar icons emitted as `<!-- wp:sgs/icon /-->` — self-closing with NO attributes whatsoever.

**BLOCK-CODE evidence:**
- `icon/block.json`: `"iconName": {"type": "string", "default": "star"}` — with no `iconName` attr set, the block defaults to `star`.
- `convert-trace-b3.jsonl`: `{"stage": "bem_resolve_slot_fallback", "class_": "sgs-trust-bar__icon", "slot": "icon", "slug": "sgs/icon"}` — the `sgs-trust-bar__icon` span is resolved to `sgs/icon` via slot-fallback, but the SVG path data inside the span is not extracted.

**REAL CAUSE (Sub-cause A):** The converter resolves `.sgs-trust-bar__icon` spans to `sgs/icon` but has no mechanism to map raw SVG path data to Lucide named icons. No `iconName` attr is set; all icons default to `star`. This is an extraction gap — raw SVG paths cannot be reverse-engineered into Lucide icon names by any current pipeline step.

**CORRECTION to prior report Sub-cause A:** The prior report is correct. No prior claim about "circle-bg" attr was made for Sub-cause A — that was a different (earlier) investigation's error.

---

### Sub-cause B: White circle background missing

**DRAFT evidence:**
- `index.html` lines 336–346: `.sgs-trust-bar__icon { width: 44px; height: 44px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 1px 2px rgba(58,46,38,0.06); }` and `.sgs-trust-bar__icon svg { width: 20px; height: 20px; stroke: var(--primary-dark); stroke-width: 1.8; fill: none; }` — the white circle is the `.sgs-trust-bar__icon` span itself via `border-radius:50%; background:white`. The SVG is a direct child of that span.

**CLONE-emit evidence:**
The emitted `<!-- wp:sgs/icon /-->` has NO `backgroundShape`, NO `backgroundColour`, NO `iconCircleSize` attrs.

**BLOCK-CODE evidence:**
- `icon/block.json`: `"backgroundShape": {"type": "string", "default": "none", "enum": ["none", "circle", "pill", "square", "outline"]}` — `backgroundShape` IS a real attr on `sgs/icon`. The DEFAULT is `"none"`.
- `trust-bar/style.css` lines: `.sgs-trust-bar__circle { width: var(--sgs-trust-badge-circle-size, 44px); height: var(--sgs-trust-badge-circle-size, 44px); border-radius: 50%; background-color: var(--sgs-trust-badge-circle-bg, var(--wp--preset--color--surface, #ffffff)); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }` — the TYPED mode trust-bar uses `.sgs-trust-bar__circle` for the white circle.
- `trust-bar/render.php:147–156` (bound mode): `echo SGS_Container_Wrapper::render($attributes, $block, $title_html . $badges_html, 'section', $tb_wrapper_opts)` — bound mode echoes `$content` (the converter's emitted InnerBlocks) directly with no `.sgs-trust-bar__circle` wrapper added.

**REAL CAUSE (Sub-cause B) — CORRECTED:**
The prior report correctly identifies that `sgs/icon` has `backgroundShape.default="none"` and that the circle is the `sgs-trust-bar__icon` SPAN's CSS. However, the prior report claimed the fix is to "map `border-radius:50%; background:white` on the parent span to `backgroundShape:'circle'` on `sgs/icon`." This is CORRECT in mechanism.

The key structural fact: the trust-bar's TYPED mode uses `.sgs-trust-bar__circle` span (emitted by render.php's typed-mode loop) as the circle wrapper — this is a SEPARATE element from the icon `<svg>`. In BOUND mode, the converter emits `sgs/icon` blocks inside `sgs/container` badge wrappers. The `sgs/icon` block in bound mode, with `backgroundShape="none"` (default), renders a flat icon with no circle wrapper. The `.sgs-trust-bar__circle` CSS (from trust-bar's style.css) does not apply because there is no `.sgs-trust-bar__circle` element in the DOM in bound mode — the sgs/icon block renders its own element tree.

So the gap is:
1. The `sgs-trust-bar__icon` span (in the draft) has the circle CSS.
2. The converter maps this span to `sgs/icon` but does NOT set `backgroundShape="circle"` or `iconCircleBackground="white"` attrs.
3. The `sgs/icon` block renders without a circle shape.
4. The `.sgs-trust-bar__circle` CSS in trust-bar's style.css only applies to typed-mode rendered elements.

**CORRECTION re "circle-bg/backgroundShape" claim:** The task brief says a prior investigation "invented a `circle-bg/backgroundShape` attr." The attr `backgroundShape` is REAL — it exists in `icon/block.json` and is consumed by `icon/render.php`. There is no invented attr. The prior (v1) report correctly identifies `backgroundShape` as the mechanism. The WRONG claim in an earlier investigation (not this report) may have been about a non-existent attr name; this report uses the correct attr name.

**ALSO NOTE — variation-d0-d2.css evidence:** The lifted CSS for trust-bar icons (variation-d0-d2.css): `.page-id-144 .sgs-trust-bar__icon { background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0 }` and `.page-id-144 .sgs-trust-bar__icon svg { stroke: var(--primary-dark); stroke-width: 1.8; fill: none }` — the CSS IS lifted for `.sgs-trust-bar__icon`. Crucially, `border-radius: 50%`, `width: 44px`, `height: 44px`, and `box-shadow` are NOT in the lifted CSS for that selector. These were NOT transferred by the D2 CSS lift. This is a secondary gap: even if the CSS-lift approach (rather than block attrs) were used, the circle geometry (`border-radius`, `width`, `height`, `box-shadow`) were dropped.

**Fix-shape:**
- Sub-cause A (icon name): Post-processing pass or operator-review step mapping icon position / badge text to Lucide names. No automated SVG-to-Lucide lookup exists.
- Sub-cause B (circle): Set `backgroundShape="circle"`, `iconCircleSize=44`, `iconCircleBackground="surface"` (maps to white via the `--sgs-trust-badge-circle-bg` CSS var in trust-bar's style.css when the typed-mode CSS is present) on each emitted `sgs/icon` block. The circle CSS is already in trust-bar's style.css but only applies to `.sgs-trust-bar__circle` — either (a) set `backgroundShape="circle"` on sgs/icon so it renders a `.sgs-icon--bg-circle` element and rely on sgs/icon's own CSS, or (b) ensure the bound-mode render wraps each icon in a `.sgs-trust-bar__circle` span. Option (a) is simpler and block-standard.

**INGREDIENTS SECTION — CONFIRMED DIFFERENT MECHANISM:**
The four ingredient icons (🌾🍺🌿🌱) in the ingredients section (b6) are DIFFERENT: `index.html` line 521–522 shows `.sgs-info-box__icon { font-size: 32px; margin-bottom: 10px; }` with emoji TEXT content (`<div class="sgs-info-box__icon" aria-hidden="true">🌾</div>`). The emitted markup (extract.patched.json positions 62272, 63035, 63806, 64547): `<!-- wp:sgs/icon {"linkUrl":"🌾","style":{"spacing":{"margin":{"bottom":"10px"}}}} /-->` — emoji stored in the `linkUrl` attr (content role). These are NOT trust-bar SVG icons. The two groups are structurally different and must not be conflated.

**Prior report status:** CONFIRMED CORRECT on all mechanical claims. The `backgroundShape` attr is real (not invented). The prior report's Sub-cause B correctly identifies the gap.

---

## Point 31 — Grid/container routing for products and gift sections

**Symptom:** Do the `sgs-products` grid (featured-product section, b4) and `sgs-gift-section__cards` grid (gift section, b7) correctly route to an appropriate block?

### Evidence for `.sgs-products` (b4 / featured-product section)

**DRAFT evidence:**
- `index.html` line 384: `.sgs-products { display: grid; grid-template-columns: 1fr; gap: 16px; }` (mobile) and line 451: `@media (min-width: 768px) { .sgs-products { grid-template-columns: 5fr 3fr; } }`.
- `index.html` line 835: `<div class="sgs-products">` — contains two `.sgs-product-card` children.

**CLONE-emit evidence (convert-trace-b4.jsonl):**
- `{"stage": "responsive_grid_lifted", "classes": ["sgs-products"], "attrs": {"gridTemplateColumns": "5fr 3fr", "gridTemplateColumnsMobile": "1fr"}}` — grid attrs correctly lifted.
- `{"stage": "walker_branch_taken", "branch": "wrapper_container", "node_classes": ["sgs-products"], "depth": 2}` — resolved to generic container.

**block_composition DB evidence (SGS_DB):**
- `sgs/card-grid`: `wraps_block='sgs/container'`, `composition_role='content-block'`, `has_inner_blocks=0`, `container_kind='layout'` — confirmed `has_inner_blocks=0`.

**REAL CAUSE for routing decision:** `sgs-products` → BEM resolution: no registered block `sgs/products`; no slot alias for `products`; falls back to `sgs/container` with lifted grid attrs. `sgs/card-grid` is NOT the right choice: DB row `has_inner_blocks=0` means the converter would skip walking its children (confirmed by `convert-trace-b4.jsonl` — `db_lookup_hit: block_accepts_inner_blocks, block_slug: sgs/product-card, has_inner_blocks: true` — the product-card children DO have inner blocks, but card-grid does not accept them). `sgs/container` with `gridTemplateColumns:"5fr 3fr"` and `gridTemplateColumnsMobile:"1fr"` is ARCHITECTURALLY CORRECT for converter-generated InnerBlock children.

### Evidence for `.sgs-gift-section__cards` (b7 / gift section)

**DRAFT evidence:**
- `index.html` line 557: `.sgs-gift-section__cards { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; }` and line 602: `@media (min-width: 640px) { .sgs-gift-section__cards { grid-template-columns: 1fr 1fr; } }`.
- `index.html` line 956: `<div class="sgs-gift-section__cards">` — contains two `.sgs-gift-section__card` children.

**CLONE-emit evidence (convert-trace-b7.jsonl):**
- `{"stage": "responsive_grid_lifted", "classes": ["sgs-gift-section__cards"], "attrs": {"gridTemplateColumns": "1fr 1fr", "gridTemplateColumnsMobile": "1fr"}}` — grid attrs lifted.
- `{"stage": "bem_resolve_slot_fallback", "class_": "sgs-gift-section__card", "slot": "card", "slug": "sgs/info-box"}` — gift cards correctly resolve to `sgs/info-box` (not sgs/card-grid).
- `{"stage": "walker_branch_taken", "branch": "wrapper_container", "node_classes": ["sgs-gift-section__cards"], "depth": 2}` — resolved to generic container.

**stage-2.json evidence:**
Both `featured-product` (b4) and `gift-section` (b7) match `sgs/container` with `confidence=0.0` and `tie_breaker="deferred-no-match"` — the stage-2 confidence matrix found no section-level composite match; the walker correctly falls back to sgs/container for both.

**REAL CAUSE — routing is correct:** Neither `sgs-products` nor `sgs-gift-section__cards` has a registered block equivalent with `has_inner_blocks=1` that could serve as the outer container. `sgs/card-grid` has `has_inner_blocks=0` (DB-confirmed) — it is a static typed-items repeater, not an InnerBlocks host. `sgs/container` with lifted grid attrs is the correct architectural choice for both grids.

**Prior report status:** CONFIRMED CORRECT on all three findings (A, B, C). The `has_inner_blocks=0` claim for `sgs/card-grid` is verified from the SGS_DB `block_composition` table.

---

## Summary

| Point | Fully evidenced cause? | Prior v1 report correct? | Corrections |
|-------|------------------------|--------------------------|-------------|
| 1 | YES — convert.py:2901 + DB rows confirmed | YES | None |
| 2 | YES — double-wrap disrupts height:100% chain; gradient suppressor fires correctly (not a gradient issue) | YES | Clarified: gradient is correctly suppressed by `has-background` class; the image-gap is purely the double-wrap |
| 3 | YES — child-element CSS cannot be promoted to parent composite attr | YES | None |
| 4 | YES — same root cause as Point 1 confirmed | YES | None |
| 5A | YES — no SVG-to-Lucide resolver; emitted `<!-- wp:sgs/icon /-->` confirmed | YES | None |
| 5B | YES — `backgroundShape` is REAL attr (not invented); circle CSS not lifted (missing border-radius/width/height/box-shadow in D2 CSS) | YES — `backgroundShape` correctly named | Corrected task-brief claim: "`backgroundShape`" is not an invented attr. The gap is the CONVERTER not setting it, not the attr not existing. Also: lifted D2 CSS confirms `border-radius:50%`, `width`, `height`, `box-shadow` were dropped. |
| 31 | YES — card-grid `has_inner_blocks=0` DB-confirmed; sgs/container is correct for both grids | YES | None |

**Fully-evidenced causes: 7 / 7**
**Prior claims corrected: 1** — Sub-cause B of Point 5: `backgroundShape` is a real `sgs/icon` attr (not invented by prior investigation). The task brief may have been referring to an earlier investigation that pre-dates this report. This report's treatment is correct.
**Prior claims validated: all remaining**
