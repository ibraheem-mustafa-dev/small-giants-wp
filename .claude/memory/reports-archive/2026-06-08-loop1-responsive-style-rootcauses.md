---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Loop 1 root causes — responsive + style-transfer cluster (evidence-backed, per-issue)"
created: 2026-06-08
status: DIAGNOSIS COMPLETE for the responsive/style cluster. Awaiting council + Bean approval before grouping into universal fixes. Diagnosis only — no fixes applied.
method: "3 parallel systematic-debugging agents. Sources of truth ONLY: draft index.html, clone current-clone-page-source.html, pipeline scripts, DB. Each root cause cited to script file:line + DB + draft line + clone line."
---

# Loop 1 — proven root causes (responsive + style-transfer)

Each is a SEPARATE proven root cause (not merged). Grouping into universal fixes happens AFTER council + Bean approval.

## PROVEN root causes

**RC-1 — Inline-CSS beats @media (UNIVERSAL, highest leverage).**
`includes/class-sgs-container-wrapper.php:~396` unconditionally writes the BASE layout values (`grid-template-columns`, `display`, `gap`) into the INLINE `style=""` array; responsive overrides are emitted as a `<style id=uid>` block using a class selector (specificity 0,1,0) which can NEVER beat inline (1,0,0,0). Proof the fix is feasible: `minHeight` was ALREADY moved off inline onto the uid `<style>` (lines 366-368 / 687-696) — replicate that for the layout props.
- Clone: trust-bar `style="grid-template-columns:repeat(4,1fr)"` + `@media(max-width:599px){...1fr 1fr}` → mobile never collapses. Brand inline `grid-template-columns:1fr` beats its @media.
- Covers: TB (4-col on mobile), compounds BR-A, IN-C, all the inline-beats-@media breaks.

**RC-2 — `gridTemplateColumnsDesktop` / `gapDesktop` slots DON'T EXIST in the DB.**
`convert.py` `_lift_wrapper_css_to_container_attrs` (~line 1055-1065) correctly derives `gridTemplateColumnsDesktop` for a `min-width:768`→Desktop breakpoint, but sgs/container has only `*Tablet` + `*Mobile` responsive attrs in `block_attributes` (NO `*Desktop`) → the desktop value is silently dropped (`continue`). The base mobile `1fr` lands in `gridTemplateColumns` → inline (RC-1). This is why BR-A's desktop slot shows `1fr`.
- DB: confirmed `gridTemplateColumns`(is_responsive=1), `gridTemplateColumnsTablet`, `gridTemplateColumnsMobile` exist; `gridTemplateColumnsDesktop`, `gapDesktop` DO NOT.
- Covers: BR-A (desktop column template wrong).

**RC-3 — `contentWidth` suppressed when `layout` is also set (TB-A.2).**
The fold DOES compute `contentWidth` from the `__inner` `max-width` (`convert.py` `_fold_layout_into_attrs:~3831`, `container_attrs.setdefault("contentWidth", ...)`). BUT `class-sgs-container-wrapper.php:978` renders the inner-wrapper only when `contentWidth != '' AND layout == ''`. The `__inner` fold ALSO sets a grid `layout`, so the gate fails → the 1100px content cap is computed but never rendered → trust-bar badges spread full-width. render.php treats contentWidth + layout as mutually exclusive.
- Covers: TB-A.2 (content-width not applied). TB-A.1 (full-width section) + TB-A.3 (column template) are CORRECTLY handled (no defect).

**RC-4 — Per-grid-item CSS collapses onto one flat parent attrs dict (H-B / TB-A.4).**
`convert.py` `_fold_layout_into_attrs` (called ~2563) merges ALL grid-column children's CSS onto the SINGLE composite `attrs` dict via `setdefault`. There is no attr/mechanism to express per-column CSS (hero content-half `padding:28px 20px 40px` vs media-half no-padding). So the content padding lands on the OUTER section (wrapping BOTH columns) → the image renders padded when it should be flush. Architectural gap: fold collapses N columns → 1 block.
- Covers: H-B (image has padding), and the hero content/media asymmetry.

**RC-5 — `widthMode=custom` never renders `max-width` (R3a — brand 1000px).**
Converter correctly sets `widthMode=custom`, `customWidth=1000` (`convert.py:~2773`). But `class-sgs-container-wrapper.php:488-490` renders custom width as `margin-inline:auto` ONLY — it never emits `max-width:1000px`. The cap lives only in scoped variation CSS, not enforced as a block constraint.
- Covers: brand stretches edge-to-edge on wide screens (R3a).

**RC-6 — Text-align omitted-left becomes centre (H-C, FP-A).**
Draft relies on browser-default LEFT (no explicit `text-align` on hero/featured headings). Converter faithfully emits no `textAlign` (correct faithful-absence). BUT `src/blocks/heading/style.css:7-9` sets `:where(.wp-block-sgs-heading){text-align:center}` as the block default → centre wins. So an omitted-left heading renders centre.
- Covers: H-C, FP-A. Fix candidates: emit explicit `textAlign:left` when draft has none (and no centring ancestor), OR change the heading block default from center to left/unset.

**RC-7 — CSS inheritance not propagated to children (IN-A, IN-E).**
Draft sets `text-align:center` on the `__inner` WRAPPER and children inherit it. `convert.py` `_collect_css_decls_for_element` (~547-681) only collects rules whose LAST selector part targets the node itself — it does NOT propagate inherited properties (text-align) down to child nodes. So label/text/info-box children get no `textAlign` → render left (heading coincidentally centred via the RC-6 block default).
- Covers: IN-A (label+text left, should be centre), IN-E (info-box content left). Fix: an ancestor-inheritance resolver for inherited props (text-align), OR fold the wrapper's centring intent.

**RC-8 — Class-selector match ignores ancestor qualifier → cross-section pollution (GF-A/E). REAL BUG.**
`convert.py:611-613` — the `last_part.startswith(".")` branch matches on the FINAL class part with NO ancestor check (the ancestor walk exists ONLY in the `elif last_part == desc_tag:` tag branch). So `.sgs-social-proof .sgs-section-heading__sub {text-align:center}` WRONGLY matches the GIFT section's `__sub` (which the draft leaves unaligned) → injects `text-align:center` where it shouldn't be. Sibling of the A2 tag-ancestor selector bug fixed earlier this session, but in the CLASS branch.
- Covers: GF-A/E (gift sub-heading wrongly centred). Fix: add the ancestor-class check to the class branch, mirroring the tag branch.

**RC-9 — `min-width:640` breakpoint not registered (SP-A).**
`db_lookup.py:1233-1239` `_BREAKPOINT_RULES` lacks `min-width:640`. The draft's `@media(min-width:640px){ h2 font-size:36px }` is silently dropped → social-proof heading stays 28px. (Gift grid at 640 happened to work via a different path.)
- Covers: SP-A. Fix: add `("min-width: 640", ["Tablet","Desktop"])`.

## CLEARED (NOT real issues — verified from the rendered output)
- **FP-B** — "OUR SIGNATURE" font-size IS carried (`--sgs-label-font-size:12px` present in the emit). Not a defect (matches the block default 12 too).
- **BR heading typography** — `font-size:36px` + `font-family:Fraunces` both present in the emit. Correctly transferred.

## STILL UNPROVEN (need a short follow-up before the approval gate)
- **H-A** (image column too wide / content squashed) — needs the hero render.php column-proportion read; partially traced.
- **R3b/c** (product-card image `height:220px`; brand image `max-height`/`border-radius`) — need a DB check of whether `sgs/media` has `height`/`maxHeight`/`borderRadius` attrs (they land in variation CSS only; native lift may have no slot).

## REMAINING LOOPS (not yet investigated)
- Loop 2 — block ROUTING: FP-D/E (`.product-cards` → why sgs/container not sgs/card-grid; card-grid's true purpose), SP-G (testimonials → should be sgs/trustpilot-reviews not sgs/testimonial).
- Loop 3 — BROKEN-BLOCK binding: FP-F + SP-G ("Error loading block: Invalid parameter(s): attributes" on product-card AND trustpilot-reviews when bound to a product) — a real block bug.
- Loop 4 — CONTENT transfer: IN-D/F (emoji icons → star; notice-banner empty), GF-I (announcement-bar wrong content), TB-C (icon identity), SP-E/F (avatar `?` placeholder; needless card bg), FP-K (added "choose pack size" text).
- Loop 5 — PRODUCT-CARD rebuild (FP-G/H/I/J/L/M/N/O/P) + the container-vs-card-grid decision — reads specs 27/28/02 + DB.
- Draft fixes (separate, do directly with sign-off): FP-DRAFT-FIX (product-card naming), TB-C (truck icon).
