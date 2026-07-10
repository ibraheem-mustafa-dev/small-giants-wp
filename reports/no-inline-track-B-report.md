---
doc_type: report
title: "Track B — no-inline rollout: content-KIND composites → BLOCK-PRIVATE (edit-track report for the integrator)"
branch: feat/no-inline-track-B
created: 2026-07-10
status: READY-FOR-INTEGRATION
governs: .claude/plans/2026-07-10-no-inline-parallel-rollout.md (Track B) + block-migration-DONE-checklist.md
---

# Track B — no-inline edit-track report

**7 blocks migrated to the no-inline / box-object contract on `feat/no-inline-track-B`, files-only.**
All 7 render.php `php -l`-clean; `npm run build` green in the worktree (full prebuild gate chain
passed: dead-controls, hardcoded-defaults, control-ux, db-consistency, cheat-gate, atomic-slug,
oracle tests). NO deploy, NO `/sgs-update`, NO harness, NO `main` commit, NO central DB seed —
those are the INTEGRATION session's job.

**Pattern for all 7 (verified per block, not assumed):** DB `container_kind='content'`,
`wraps_block='sgs/container'` → **BLOCK-PRIVATE** per D294 — dropped `SGS_Container_Wrapper`, the
block's own semantic element is the root, ALL styling emitted into the block's own scoped
`.{uid}` `<style>` via `wp_style_engine_get_styles(..., ['selector'=>$root_sel])` + hand-built
`@media(max-width:1023px)`/`(max-width:767px)` tiers. uid is a CLASS (`sgs-<block>-<8-char md5>`),
never an id, so it never collides with `anchor`. Preset colour classes (`has-*-color` /
`has-background`) re-added manually (skip-serialisation drops them); `has-text-align-*` re-added
manually where relevant (WP doesn't reliably merge it for dynamic blocks). Hover/transition values
stay as VAR-ONLY `style="--x:y"` on the root (a var value is contract-allowed; no real property
declaration reaches any element). No version bump, no `deprecated.js` (D293).

## ⛑ CENTRAL box_family SEEDS TO ADD (integrator → `scripts/sgs-update-v2.py`)

Every block added the same 4 tier attrs (base padding/margin ride WP-native `style.spacing.*`
objects; these are the SGS tier objects). Seed each `(block_slug, attr, family)`:

| block_slug | attr | family |
|---|---|---|
| sgs/info-box | paddingTablet, paddingMobile | padding |
| sgs/info-box | marginTablet, marginMobile | margin |
| sgs/testimonial | paddingTablet, paddingMobile | padding |
| sgs/testimonial | marginTablet, marginMobile | margin |
| sgs/team-member | paddingTablet, paddingMobile | padding |
| sgs/team-member | marginTablet, marginMobile | margin |
| sgs/notice-banner | paddingTablet, paddingMobile | padding |
| sgs/notice-banner | marginTablet, marginMobile | margin |
| sgs/option-picker | paddingTablet, paddingMobile | padding |
| sgs/option-picker | marginTablet, marginMobile | margin |
| sgs/product-faq | paddingTablet, paddingMobile | padding |
| sgs/product-faq | marginTablet, marginMobile | margin |

(No new tier attrs on `sgs/product-faq-item` — child migrated colour+border only.)
After seeding, run `sgs-update-v2.py --stage 1` (apply seeds + new attrs) + `--stage 10` (prune the
orphaned flat/removed attrs, STOP-66). Then `check-box-family-guard.py --check` should pass (it was
NOT run in this edit track — it depends on the central seeds above).

## Per-block detail

### 1. info-box  — files: block.json, edit.js, render.php
- Supports skip-serialised: color, typography, spacing, **shadow**, `__experimentalBorder`.
- Root: own `<div>` box wrapping `$content` (InnerBlocks); optional `<a class="sgs-block-link-wrapper">` kept.
- **Border kept WP-native** (block already declared full native `__experimentalBorder`) — `style.border`
  passed wholesale to the style engine (faithful, matches container residual). NOT objectified.
- Shadow: `style.shadow` passed into the same style-engine call (native `shadow` key, proven on process-steps/timeline).
- Elements-API link colour (`style.elements.link.color.text`) resolved via a 2nd scoped style-engine call.
- edit.js: `ContainerWrapperControls` (would-be-dead flat attrs) → hand-rolled Width + Spacing panels
  (`ResponsiveBoxControl`) + `buildPreviewStyle()` editor-canvas preview. Hover colours stay CSS-vars.

### 2. testimonial  — files: block.json, edit.js, render.php  (HEAVIEST)
- Supports skip-serialised: color, typography, spacing, **shadow**, `__experimentalBorder`.
- Root: own `<div>` (typed leaf); 7 variant modifier classes preserved.
- **All 6 per-element inline typography groups → scoped rules** (the `$sgs_testimonial_style_attr`
  closure removed): `.__quote` (colour/font-size/font-style/line-height/margin-bottom), `.__summary`
  (colour/font-size), `.__name` (colour/font-weight), `.__role`, `.__org`, `.__rating` (colour).
- Hover/stagger vars var-only. No F3 baseline row existed.

### 3. team-member  — files: block.json, edit.js, render.php  (view.js untouched)
- Supports skip-serialised: color, typography, spacing, `__experimentalBorder` (NO shadow support).
- Root: own `<div>` (typed leaf); optional block-link wrap kept.
- `nameColour`/`roleColour` inline `color:` → scoped `.__name`/`.__role` rules. Hover vars var-only.
- view.js confirmed safe (pure `classList` toggle) — not modified.

### 4. notice-banner  — files: block.json, edit.js, render.php  (view.js untouched; style.css NOT edited)
- Supports skip-serialised: color, typography, spacing, `__experimentalBorder` (NO shadow).
- **Both modes now block-private:** inline mode (own `<div role="note">` echoing `$content`) +
  announcement mode (own `<div>` with WP-Interactivity attrs). `iconColour` inline → scoped `.__icon`.
- **Anti-flash wrinkle FIXED:** the pre-paint `<script>` now does
  `parentElement.classList.add('is-dismissed')` instead of `.style.display='none'`. The matching CSS
  rule `.sgs-notice-banner--announcement.is-dismissed{display:none}` PRE-EXISTED in style.css
  (no style.css edit needed). `data-wp-class--is-dismissed` toggles the same class post-hydration.
- view.js confirmed safe (sets `ctx.isDismissed` + storage only).

### 5. option-picker  — files: block.json, edit.js, render.php, style.css  (view.js untouched)
- Supports skip-serialised: color, spacing, `__experimentalBorder` (typography is NOT a native
  support here — stays custom-attr + `sgs_typography_css_rule`, preserved).
- Root: own `<fieldset>`; colour CSS-vars + scoped typography preserved. `sgs.scalarStylingLift` kept.
- **2 inline surfaces fixed:** `<legend>` inline (`labelColour`+`labelMarginBottom`) → scoped
  `.__label` rule; WooCommerce swatch `<span style="background:#hex">` → `style="--sgs-op-swatch:#hex"`
  + `background:var(--sgs-op-swatch)` scoped in style.css (`.sgs-option-picker__swatch--colour`).
- `pillBorderRadius` (single-value per-element radius) kept SCALAR per contract §C (not objectified).

### 6+7. product-faq (parent) + product-faq-item (child)  — done together (shared style.css; view.js untouched)
- Parent supports skip-serialised: color, typography, spacing, `__experimentalBorder`; root own
  `<section>`. **FAQPage JSON-LD `wp_footer` collector byte-identical** (untouched).
- Child supports skip-serialised: color, `__experimentalBorder` (border migrated WHOLESALE — the
  child declares all 4 native border sub-props; radius-only would have silently dropped
  width/colour/style). Root own `<details>`.
- **Dead attrs removed:** `contentWidth`/`maxWidth` deleted from `product-faq-item/block.json`
  (unconsumed — the item renders `<details>` directly, not via the container wrapper). No edit.js
  control existed for either (verified).
- **3 genuinely-dead parent attrs removed** (`gap`/`gapTablet`/`gapMobile`): the shared wrapper only
  emits gap CSS for section/layout kinds — a content-kind block never received gap CSS, so these were
  dead since the block was built (no editor control ever existed). Reported here for transparency.
- Parent `maxWidth`/`contentWidth` folded onto the root selector (max-width+margin-inline:auto /
  width) — matches quote; the block never used a band `__inner` div. Both currently empty-default.
- style.css NOT edited (all its breakpoints are 600px design-driven, not device-tier — left alone).

## Clauses NOT met / STOP items
**None.** Every flagged inline surface (testimonial per-element, team-member name/role, notice-banner
icon + anti-flash, option-picker legend + swatch) was fully converted. No wrapper-drop was
structurally unsafe (all 7 are box+width content-kind). No F3 baseline rows involved. No guess-wiring.

## Editor-canvas note (not a violation)
Several edit.js files add an editor-canvas preview `style` (inline) because skip-serialisation also
stops WP auto-previewing supports in the editor. This is the documented editor-only exception — it
never persists to `post_content` or the frontend render.php output. DONE-checklist item 7 satisfied.

## What the INTEGRATION session still owes these 7 blocks
1. Add the box_family seeds above centrally + `sgs-update-v2.py --stage 1` + `--stage 10`.
2. Build once + deploy once (sandybrown) + purge (OPcache + LiteSpeed).
3. LANDED-verify each via the harness (`no-inline-land-verify.js`) — asymmetric instance (4 distinct
   sides + asymmetric corners) at 375/768/1440, zero-inline subtree + computed box. Several are on
   page 8 (info-box, testimonial) → re-clone page 8 after the attr-shape change.
4. `check-box-family-guard.py --check` = 0 (depends on the seeds).
5. `reports/visual-diff/<block>-<date>.md` per block (repo ROOT, verdict PASS + first_paint true).
