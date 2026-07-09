---
doc_type: reference
title: Block no-inline migration — DONE checklist (end conditions only)
status: ACTIVE
created: 2026-07-09
governs: the universal no-inline styling rollout
detail: .claude/plans/2026-07-09-per-block-no-inline-migration-contract.md (the HOW — this doc is the WHAT-DONE-LOOKS-LIKE)
---

# Block migration — DONE checklist

A block is **DONE** when every box below is ticked, verified LANDED on a live page.
The *fixes* differ per block (some are block-private render, some use the shared wrapper,
some have per-area families) — the *end conditions* are identical. Tick these, don't
re-derive them.

## End conditions (per block)

- [ ] **1. Zero inline.** `getAttribute('style')` on the rendered block root AND every
  descendant has NO CSS property declaration (a `--var: value` VALUE is allowed). Verified
  live with `getAttribute('style')` on the whole subtree + `audit-inline-styling.js` = clean.
- [ ] **2. Supports skip-serialised.** Every WP styling support the block declares
  (`spacing`/`color`/`__experimentalBorder`/`typography`/`shadow`) carries
  `__experimentalSkipSerialization: true`; render.php reads `$attributes['style']` and emits
  scoped `#uid`/`.uid` CSS via `wp_style_engine_get_styles`.
- [ ] **3. Box families are objects.** Every qualifying 4-side family (padding/margin/
  borderWidth/per-area) → `{top,right,bottom,left}`; 4-corner (borderRadius) → `{topLeft,…}`
  — INCLUDING Tablet/Mobile tiers. Zero flat per-side/per-corner attrs, zero `*Unit`
  companions. `box_family` seeds in `sgs-update-v2.py`; `check-box-family-guard.py` = 0.
- [ ] **4. Device tiers only.** Responsive `@media` = exactly `max-width:1023px` (Tablet) +
  `max-width:767px` (Mobile). NO other/custom breakpoint hardcoded — custom breakpoints
  live in the block's `sgsCustomCss` attribute only (Spec 31 FR-31-5.2).
- [ ] **5. No useless wrapper.** A single-semantic-element block (heading/text/button/quote/
  label/media) renders that element AS the root — no wrapper `<div>`. Composites keep their
  wrapper. (Anchor-bearing blocks: uid is a CLASS so it doesn't collide with the anchor id.)
- [ ] **6. F3 hardcode drained.** The block has zero rows in
  `hardcoded-render-defaults-baseline.json` — any hardcoded layout/visual literal for a
  property the block exposes a control for is replaced by the attr read / `var()`.
- [ ] **7. Client controls intact.** Every migrated family keeps its editor control
  (BoxControl for box families); `check-dead-controls.js` = 0 net-new; editor preview
  matches the frontend.
- [ ] **8. Security.** Free-text keyword attrs (border-style, etc.) pass
  `preg_replace('/[^a-zA-Z-]/','',$v)`; the `<style>` blob uses `wp_strip_all_tags`.
- [ ] **9. No churn.** No version bump, no `deprecated.js` (pre-production).
- [ ] **10. LANDED + recognised.** Verified on a live page with an ASYMMETRIC test instance
  (4 distinct side values + asymmetric corners) → all computed values correct at 375/768/1440;
  AND a page-8 re-clone runs clean (no `ConservationError`, recognition fires, parity steady).
- [ ] **11. Gate + record.** Build passes (all prebuild gates); a
  `reports/visual-diff/<block>-<date>.md` (repo ROOT `reports/`, NOT `plugins/…/reports/`)
  exists with frontmatter `verdict: PASS` + `first_paint_capture_passed: true`
  (the pre-commit visual-diff gate requires this); commit path-scoped.

## Proven exemplars (copy the pattern)
- **button** (`9f281337`) — block-private, element-as-root, ID uid. Single-element reference.
- **heading + text** (`3e266090`) — block-private single-element, full bar.
- **quote** (`13fd1634`, D294) — **content-KIND composite → BLOCK-PRIVATE** (blockquote root, no `SGS_Container_Wrapper`, class uid, all CSS + box-objects scoped). The reference for content-KIND composites (qc-council-settled: they use only box+width, so drop the wrapper — see Spec 31 FR-31-21.1).
- **media** (`13fd1634`, D294) — block-private atomic (img/figure), radius→WP-native + tiers.
- **container** (D292) — shared wrapper, class uid, base+tier objects. Composite (keep-wrapper) reference.
- **hero** (`74d164c6`, D295) — **section-KIND composite → KEEPS wrapper**; 6 per-area box-object families rendered block-private-scoped + F3-drain. The reference for section/layout composites.
- **shared wrapper** (`class-sgs-container-wrapper.php`) — fully no-inline: base spacing (D292), max-width/contentWidth/band (`13fd1634`/D294), grid/flex (`d65e7d10`/D296). Keep-wrapper composites inherit this.

**Which pattern (D294):** single-element + content-KIND-box+width-only → block-private (quote/heading/text/button); section/layout composites → keep the (scoped) wrapper (hero/container).

## Reference impls / detail
- HOW-TO + rationale: `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`.
- Mechanism spec: Spec 31 §3.A/§4/§13.4 (FR-31-22), Spec 32 §6.1.
