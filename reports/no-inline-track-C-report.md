# No-inline rollout — TRACK C report (section/layout composites → keep-wrapper)

**Branch:** `feat/no-inline-track-C` (off `main` @ e54eb2ac) · **Generated:** 2026-07-10
**Scope:** EDIT-only (files, block dirs). NO deploy, NO harness, NO DB seed, NO `main` commit.
**Roster (8):** card-grid, feature-grid, cta-section, gallery, post-grid, google-reviews, trustpilot-reviews, modal.

## Result

All 8 migrated to the no-inline contract. **Pattern: KEEP-WRAPPER** for 7 (genuine section/layout
composites wrapping `sgs/container`, verified via DB `container_kind` = layout/section); **KEEP-STRUCTURE**
for `modal` (`containerMirror:false`, uses core `get_block_wrapper_attributes` — like mobile-nav). Zero
wrapper rip-outs. No block version bumps, no deprecations (D293).

### Gate (orchestrator-run in the worktree — STOP-16, subagents cannot build)
- `php -l` — all 8 render.php clean.
- `npm run build` — **green** (converter conformance 180 passed/1 skip, goldens match; webpack compiled both
  editor + view bundles — no STOP-69 `*/`-in-JS-comment trap, no JS parse errors; postbuild copied styles).
- `check-dead-controls.js --check` — 0 net-new (74 blocks).
- `check-hardcoded-render-defaults.js --check` — 0 net-new F3 (Track C added ZERO F3 debt; the 9 baseline
  items are other blocks).
- `check-box-family-guard.py --check` — 0 violations.
- Final static scan — 0 real inline property declarations in any render.php; 0 real `.style.property` writes
  in any view.js (only permitted `--var` VALUES remain).

## Per-block detail

### trustpilot-reviews (LOW) — `block.json`, `render.php`
Skip-serialised `color` + `__experimentalBorder`; re-emitted scoped to `.uid.wp-block-sgs-trustpilot-reviews`
via `wp_style_engine_get_styles`; re-added `has-*-color`/`has-background` preset classes. No inline sites existed
(preventive only). Wrapper `render(..., 'layout', ...)` + `--sgs-tp-cols*` extra_styles untouched. No box attrs.

### feature-grid (LOW) — `block.json`, `render.php`
Skip-serialised `color` + `spacing` + `__experimentalBorder`. Re-emitted `color`/`border` scoped, **reusing the
block's pre-existing `#uid.sgs-feature-grid` selector** (its own grid-engine `<style>`). Spacing left to the
shared wrapper. **The block's own scoped grid `<style>` (display:grid/grid-template-columns/gap/@media) was KEPT
intact** — it is already scoped (not inline), contract-compliant; not moved into the wrapper (out of no-inline
scope). No box attrs. NOTE for integration/fidelity (not a no-inline issue): feature-grid emits its own grid AND
the wrapper (D296) emits grid — the block-own-grid vs shared-wrapper-grid overlap (cf. D270/D296) may want a
future reconcile, but it is NOT part of this no-inline pass.

### google-reviews (LOW) — `block.json`, `render.php`, `style.css`
Skip-serialised `color` + `__experimentalBorder`; re-emitted scoped. **Inline fix:** rating-breakdown bar
`style="width:N%"` → `style="--sgs-gr-pct:N%"` (var VALUE) + `style.css` `.sgs-google-reviews__breakdown-fill{width:var(--sgs-gr-pct,0%)}`.
No box attrs.

### gallery (MED) — `block.json`, `render.php`, `style.css`, `view.js`
Skip-serialised `color` + `spacing` + `__experimentalBorder`; re-emitted scoped. **Inline fix #1:** per-item
`style="aspect-ratio:…"` → `--sgs-item-aspect` var VALUE (sanitised via a `$sgs_css_ratio` closure allowing `/`)
+ `style.css` `.sgs-gallery__item{aspect-ratio:var(--sgs-item-aspect,auto)}`. **Inline fix #2 (view.js):** lightbox
`document.body.style.overflow` → `body.classList.toggle('sgs-gallery-lightbox-open')` + `style.css`
`body.sgs-gallery-lightbox-open{overflow:hidden}`. No box attrs.

### post-grid (MED) — `block.json`, `render.php`  ⚠ PARTIAL (see residual)
Skip-serialised `color` + `typography`(fontSize/lineHeight) + `spacing` + `__experimentalBorder`; re-emitted
scoped (typography → `.uid .sgs-post-grid__title`). Block's own render.php now zero-inline. No box attrs.
**⚠ RESIDUAL FOR INTEGRATION SESSION (out of this track's scope — a SHARED include, off-limits per STOP-2):**
`includes/class-post-grid-rest.php::render_card()` (~lines 304-360) still emits inline `color:` (title/excerpt/
meta/read-more), `background-color:` (category badge), and `aspect-ratio:` (card image). It is shared with the
REST/AJAX pagination endpoint. **Recommended fix:** convert each to a CSS custom-property VALUE on the card element
(`--sgs-pg-title-colour`, `--sgs-pg-aspect`, …) + `style.css` rules — chosen over `#uid`-scoped rules because
AJAX-paginated cards are injected OUTSIDE the block's initial scoped `<style>` and must carry their own var values.

### card-grid (MED) — `block.json`, `render.php`
Skip-serialised `color` + `typography` + `spacing` + `shadow` + `__experimentalBorder`; re-emitted scoped (one
shared `.uid` across all 3 wrapper call sites: wc-product empty, wc-product grid, manual/query grid). **Inline fix:**
title/subtitle `style="color:var(…)"` on 4 elements → scoped `.uid .sgs-card-grid__title{color:…}` /
`…__subtitle{color:…}` (folded into the block's existing typography `<style>`). Only `--sgs-item-index` var remains.
No box attrs.

### modal (MED, OUTLIER — keep-structure) — `render.php`, `style.css`, `view.js`
No `block.json` support change (color support DISABLED — nothing to skip-serialise; no other styling supports).
CLASS uid (anchor-safe, `anchor:true`). **Inline fixes (render.php):** trigger `color`/`background-color` (from
`triggerColour`/`triggerBackground`) → scoped `.uid .sgs-modal__trigger{…}`; dialog `background-color` (from
`modalBackground`) → scoped `.uid .sgs-modal__dialog{…}` (via `sgs_colour_value`). Backdrop `--sgs-modal-backdrop-*`
custom-props kept (var VALUES). **view.js scroll-lock:** `document.body.style.{overflow,position,top,width}` →
`body.classList.toggle('sgs-modal-scroll-locked')` + `--sgs-modal-scroll-y` var VALUE + `style.css`
`body.sgs-modal-scroll-locked{overflow:hidden;position:fixed;width:100%;top:var(--sgs-modal-scroll-y,0)}`. No box attrs.

### cta-section (HIGH — box conversion) — `block.json`, `render.php`, `edit.js`, `style.css`
Skip-serialised `color` + `typography` + `spacing` + `shadow` + `__experimentalBorder`; re-emitted scoped.
**28 flat box attrs → 7 objects** (all `type:"object" default:{}`); flat attrs + `*Unit` companions removed:
- `paddingTop/Right/Bottom/Left{Tablet,Mobile}` (8) → `paddingTablet`, `paddingMobile`
- `marginTop/Right/Bottom/Left{Tablet,Mobile}` (8) → `marginTablet`, `marginMobile`
- `contentBandPaddingTop/Right/Bottom/Left{,Tablet,Mobile}` (12) → `contentBandPadding`, `contentBandPaddingTablet`, `contentBandPaddingMobile`

edit.js: dropped the `<ContainerWrapperControls>` aggregator (its `ResponsiveSpacingPanel`/`ContentBandPanel` write
the removed flat attrs = would be dead controls); replaced with individual container panels + hand-rolled
`ResponsiveBoxControl` "Padding & margin" / "Content band" panels (mirrors `sgs/container`'s edit.js). No dead controls.
**Other inline fixes:** background-image trio (`background-image`/`size`/`position`) moved from wrapper `extra_styles`
(inlined) → scoped `<style>` on `$root_sel`; the `:not([style*="background"])` CSS sniff → a `sgs-cta-section--has-bg-image`
class marker. Overlay `style="opacity:%s"` → `--sgs-cta-overlay-opacity` var VALUE + `style.css` rule. **Shadow:** the
string `shadow` token attr (sm/md/lg/glow) was the live driver via the wrapper's `extra_styles` (native `supports.shadow`
was a phantom no-op) → routed into the scoped `<style>` and nulled in `$cta_helper_attrs` (C3 double-emit guard);
native `supports.shadow` also skip-serialised + wired into the scoped emit for future native use.

## ⚑ FOR THE INTEGRATION SESSION — box_family DB seeds to add centrally (`sgs-update-v2.py` ATTR_CLASSIFICATION_OVERRIDES)
Only `cta-section` introduced box-object attrs. Seed these 7 `(block, attr, box_family)`:
```
(sgs/cta-section, paddingTablet,             padding)
(sgs/cta-section, paddingMobile,             padding)
(sgs/cta-section, marginTablet,              margin)
(sgs/cta-section, marginMobile,              margin)
(sgs/cta-section, contentBandPadding,        contentBandPadding)
(sgs/cta-section, contentBandPaddingTablet,  contentBandPadding)
(sgs/cta-section, contentBandPaddingMobile,  contentBandPadding)
```
(The other 7 blocks added NO box-object attrs — nothing to seed.)
Also run a Stage-10 orphan prune after seeding — cta-section's 28 removed flat attrs will leave orphan rows (STOP-66).

## STOPs / residuals summary
1. **post-grid** — card inline styling lives in the shared `includes/class-post-grid-rest.php` (off-limits + shared with
   REST). Flagged above with the recommended CSS-var fix. NOT fixed in this track.
2. **feature-grid** — block-own grid `<style>` vs shared-wrapper grid overlap (D270/D296) noted for a future fidelity
   reconcile; NOT a no-inline issue, left as-is.

## Hand-off
Branch `feat/no-inline-track-C` is committed and gate-green (files only). Ready for the serial INTEGRATION session
(merge all track branches → add the 7 box_family seeds centrally → build once → deploy once → `/sgs-update` →
harness-LAND all blocks live at 375/768/1440). LANDED verification (live zero-inline + computed box) is the
integration session's job — this track proves `php -l` + `npm run build` + static-scan green only (emit ≠ LANDED, STOP-44).
