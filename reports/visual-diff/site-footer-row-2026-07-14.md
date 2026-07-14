---
block: sgs/site-footer-row
date: 2026-07-14
decision: D327
verdict: PASS
first_paint_capture_passed: true
site: sandybrown canary (Mama's Munches homepage footer)
change: "gap + grid columns → FR-S9-6 {desktop,tablet,mobile} object model via the SGS_Container_Wrapper opt-in object branch"
---

# Visual-diff / live-verify — sgs/site-footer-row (D327, FR-S9-6)

## What changed
`gap` → object `{desktop:"48px", mobile:"32px"}`; the columns/`gridTemplateColumns`
flat attrs → one `gridTemplateColumns` object `{desktop:"repeat(3, 1fr)", mobile:"1fr"}`
(preserves the D325 3→1 collapse). `render.php` passes `responsive_model=object`; the
shared `SGS_Container_Wrapper` emits the responsive grid + gap via `sgs_emit_responsive_css()`
(wrapper-owned, R-31-9 mirror). `edit.js` columns + gap controls → `ResponsiveOverride`
(columns exposed as a client-friendly number mapped to the grid template).

## Live verification (sandybrown homepage footer; caches cleared OPcache+LiteSpeed+CDN)

| Check | 1440px | 375px |
|-------|--------|-------|
| Columns row `display` | `grid` ✅ | `grid` ✅ |
| `grid-template-columns` | 3 cols (`394 394 394`) ✅ | **1 col** (`312px`) ✅ — collapse works |
| `gap` | `48px` ✅ | **`32px`** ✅ — mobile override |
| `.sgs-container__inner` renders | yes ✅ | yes ✅ |
| Reflow (`scrollWidth <= innerWidth`) | no overflow ✅ | no overflow ✅ |
| Console errors | none ✅ | none ✅ |

## Graceful migration
The wrapper's legacy columns/grid suppression is gated on `$object_grid` (object model
AND an object `gridTemplateColumns` actually present), so this block renders correctly
whether the stored instance carries the object default or still-flat D325 attrs — the
3→1 collapse + 48→32px gap hold either way. Un-migrated instances switch to the object
path on re-save (D270 re-clone).

## Verdict: PASS — footer row wired to the FR-S9-6 engine, live-verified per tier, no regression.

---

# ADDENDUM — D328 Task 1: live pattern instances migrated flat→object (fidelity bug fixed)

## What changed (D328)
The D327 work made the BLOCK support the object model, but the live pattern INSTANCES still
stored **flat** legacy values (`gap:"48px"`, `gridTemplateColumns:"2fr 1fr 1fr"`, bottom
`gap:"8px"`, nav `gap:"28px"`). Because the attrs are declared object-type, WP's
`prepare_attributes_for_render` rejected the flat strings and **substituted the block.json
defaults** — silently discarding the authored values. Converted the pattern markup to the
object shape (values preserved):
- `theme/sgs-theme/patterns/framework-footer-default.php` (columns + bottom rows)
- `theme/sgs-theme/patterns/framework-header-default.php` + `parts/header.html` (adaptive-nav)
- `theme/sgs-theme/style.css` Version 1.5.12 → 1.5.13 (cache-bust)

## Fidelity bug this exposed + fixed (draft-backed)
Draft ground truth `sites/mamas-munches/mockups/homepage/index.html:711` = `grid-template-columns: 2fr 1fr 1fr`.
The D327 table above recorded `394 394 394` (equal thirds) as PASS — that was the **coerced
default `repeat(3,1fr)`, NOT the draft's asymmetric layout**. Now corrected:

| Element | BEFORE (D327, coerced default) | AFTER (D328, authored/draft) |
|---|---|---|
| Footer columns @1440 | `394 394 394px` (equal thirds) | **`592 296 296px` = 2fr 1fr 1fr** ✓ draft-faithful |
| Footer bottom-bar gap @1440 | `48px` | **`8px`** ✓ authored |
| Footer columns @375 | `312px` / gap 32px | unchanged ✓ |
| Nav `<ul>` gap | 28px | 28px (unchanged; now explicit object) |

## Live verification (sandybrown, full cache clear OPcache+LiteSpeed+CDN, 2026-07-14)
1440: cols `592 296 296px`, gap 48px; bottom gap 8px; nav 28px. 375: cols `312px` (1 col),
gap 32px; bottom gap 8px (inherits desktop — null-inherit cascade proven live); no overflow
(360 ≤ 375); 0 console errors. Tier-diff proven live (bottom 8px inherits to mobile; columns
gap diverges 48→32).

## uid note (STOP-NO-KSORT)
uids changed (footer cols `bfbbac9b`→`dfc82464`) because the stored attributes genuinely
changed shape + values — an EXPECTED content-driven hash change, NOT ksort churn.

## Verdict (D328 Task 1): PASS — instances on the object path; footer layout now draft-faithful.

---

# ADDENDUM 2 — D328 Task 2: box/width props → object model + one-system padding

## What changed (D328 Task 2)
- block.json: removed `supports.spacing` (R1); removed 16 flat padding/margin tier orphans + maxWidth/contentWidth flat tiers; added object `padding`/`margin`/`maxWidth`/`contentWidth`.
- edit.js: `ResponsiveSpacingPanel` → shared `ResponsiveBoxControls`.
- **R2 (footer-only, qc-council):** the bottom row's WP-native `style.spacing.padding{top,bottom}` + `margin.top` migrated to the object model (`padding:{desktop:{top,bottom}}` + `margin:{desktop:{top}}`), with `var:preset|spacing|N` → `var(--wp--preset--spacing--N)` so the object-emit sanitiser renders it. Removing `supports.spacing` had zeroed the bottom-bar padding (live-caught regression) — R2 restores it via the object model = one system.

## Live verification (sandybrown, full cache clear, D328)
- 1440: bottom row OUTER padding-top/bottom 24px (`spacing--40`) ✓, margin-top 32px (`spacing--50`) ✓; INNER flex + gap 8px ✓ (object mode forces `.sgs-container__inner` for container-queries); columns 2fr/1fr/1fr + gap 48px intact.
- 375: bottom padding 24px + margin 32px INHERIT desktop (no mobile override — null-inherit cascade proven live); inner gap 8px; columns 1fr + gap 32px; no overflow. 0 console errors.
- No double-emit: padding renders once at 24px (style.spacing removed from block + pattern; wrapper `$has_base_spacing` false by construction).

## Pre-existing gap (NOT a Task-2 regression, out of FR-S9-6 scope)
The bottom bar's `style.border.top` (1px accent divider) does not render — the shared `SGS_Container_Wrapper` has NO `style.border` emission code at all (grep = 0 hits), so it never rendered on any of these blocks (border support is declared `SkipSerialization` but nothing emits it). Flagged for the §S9 coverage audit / a block-quality follow-up.

## Verdict (D328 Task 2): PASS — footer box/width on the object model, one-system padding, no regression.
