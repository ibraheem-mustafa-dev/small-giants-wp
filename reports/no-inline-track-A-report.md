---
doc_type: report
title: "No-inline rollout — Track A edit-track report (8 leaf/simple blocks)"
branch: feat/no-inline-track-A
created: 2026-07-10
status: EDIT-COMPLETE (files-only; NOT deployed / NOT LANDED — integration session owns LAND)
governs_handoff_to: the INTEGRATION / LAND session (see .claude/plans/2026-07-10-no-inline-parallel-rollout.md)
---

# Track A — no-inline edit-track report

All 8 Track-A blocks migrated to the no-inline styling contract on `feat/no-inline-track-A`,
files only. Every block: `npm run build` GREEN (all prebuild gates pass), `php -l` clean,
zero inline CSS **property declarations** in server render, view.js free of `.style.<property>`
writes (var-only `setProperty` / classes / text only). **NOT deployed, NOT LANDED, NOT committed
to main** — the integration session merges, seeds the DB centrally, deploys once, and LANDED-verifies.

## Verification done here (files-only bar)
- `npm run build` (worktree) — GREEN after each batch (prebuild: dead-controls / hardcoded-defaults / box-family AST all pass; webpack compiles).
- `php -l` — clean on all 8 render.php.
- Source no-inline sweep — no property-declaration `style="…"` on any root; only allowed var-only styles remain (see per-block notes); view.js sweep clean (only the documented audio measurement probe).
- IDE diagnostics during edits were all WP/WooCommerce function false-positives (intelephense doesn't index WP core) — no real errors.

## CENTRAL DB SEEDS the integrator must add (in `scripts/sgs-update-v2.py`, box_family batch)
Same dict shape as the D298 Wave-2 batches. `(block_slug, attr, box_family)`:

| block_slug | attr | box_family |
|---|---|---|
| sgs/filter-search | marginTablet | margin |
| sgs/filter-search | marginMobile | margin |
| sgs/product-search | paddingTablet | padding |
| sgs/product-search | paddingMobile | padding |
| sgs/product-search | marginTablet | margin |
| sgs/product-search | marginMobile | margin |
| sgs/cart | marginTablet | margin |
| sgs/cart | marginMobile | margin |
| sgs/buybox | marginTablet | margin |
| sgs/buybox | marginMobile | margin |
| sgs/responsive-logo | paddingTablet | padding |
| sgs/responsive-logo | paddingMobile | padding |
| sgs/responsive-logo | marginTablet | margin |
| sgs/responsive-logo | marginMobile | margin |
| sgs/mobile-nav-toggle | paddingTablet | padding |
| sgs/mobile-nav-toggle | paddingMobile | padding |
| sgs/mobile-nav-toggle | marginTablet | margin |
| sgs/mobile-nav-toggle | marginMobile | margin |
| sgs/audio | paddingTablet | padding |
| sgs/audio | paddingMobile | padding |
| sgs/audio | marginTablet | margin |
| sgs/audio | marginMobile | margin |
| sgs/multi-button | — | (none — colour/border only, no new attrs) |

(22 new object attrs across 7 blocks; multi-button adds none.)

## Per-block

### filter-search — block-private (spacing.margin)
- Files: block.json, render.php, edit.js.
- Skip-serialised `spacing`; base margin scoped via `wp_style_engine_get_styles`; `marginTablet/Mobile` tiers @1023/767. Class uid `.sgs-fs-…` (kept distinct from the pre-existing ARIA `wp_unique_id` — the migrator caught + fixed a `$uid` collision → `$style_uid`). Wrapper `<div>` kept (multi-child). view.js untouched (clean). No flat attrs removed (none existed).

### product-search — block-private (spacing.margin+padding)
- Files: block.json, render.php, edit.js.
- Skip-serialised `spacing`; base padding+margin scoped; 4 tiers @1023/767; uid class added on BOTH render branches (icon + inline mode). Wrapper `<div>` kept.
- **Editor-only note (not a frontend violation):** edit.js retains an editor-canvas-only `style={{minWidth,minHeight}}` on the disabled icon-mode PREVIEW button (never rendered on the frontend — render.php's `<summary>` has none). Same editor-preview pattern label uses. Left as-is; flag only if the audit later wants editor-preview inline styles class-ified.

### cart — block-private (spacing.margin; color disabled)
- Files: block.json, render.php, edit.js.
- Skip-serialised `spacing`; base margin + tiers scoped. **Kept the var-only `--sgs-cart-*` root `style`** (icon-size + colours as CSS vars — allowed). `color` support left disabled (no-op). Local `style` var renamed in edit.js to avoid collision. Wrapper kept.

### buybox — block-private (spacing.margin; color disabled)
- Files: block.json, render.php, edit.js.
- Skip-serialised `spacing`; base margin + tiers scoped. `color` disabled (no-op). Wrapper kept.
- **Left untouched (correct):** the static VISUAL layout breakpoints in style.css — `@media (max-width:480px)`, `(min-width:480px)`, `(min-width:768px)`, `(min-width:1024px)` (PDP grid / sticky gallery / option-picker). These are design breakpoints, NOT the device-tier box system (CLAUDE.md device-vs-visual rule). notify-view.js clean.

### responsive-logo — block-private (spacing.margin+padding)
- Files: block.json, render.php, edit.js.
- Skip-serialised `spacing`; base padding+margin + 4 tiers scoped. **Kept:** the var-only `--logo-width` root style; the `<picture><source media="(max-width:600px|1024px)">` ART-DIRECTION attributes (they pick which logo image loads — must not change); the scss `@media (max-width:1024px)` visual/animation-fallback breakpoint. Wrapper kept. view.js clean.

### mobile-nav-toggle — single `<button>` root (color.text + spacing.padding+margin)
- Files: block.json, render.php, edit.js.
- Skip-serialised `color` + `spacing`. Text colour scoped via style engine; preset text slugs re-added as `has-text-color has-{slug}-color`. Icons inherit `currentColor` → the scoped text-colour drives icon colour (no extra attr). Base padding+margin + 4 tiers scoped. Class uid `.sgs-mnt-….wp-block-sgs-mobile-nav-toggle` (single-element → class, no id collision). **Kept** the var-only `--sgs-toggle-icon-size`; **left** the `@media (max-width:782px)` nav-visibility breakpoint (functional show/hide, not device-tier). No wrapper added (button IS the root). No view.js.

### multi-button — KEEP-WRAPPER composite (color + __experimentalBorder)
- Files: block.json, render.php. (edit.js untouched — native Color/Border panels from supports keep working; no dead controls.)
- **Border decision:** skip-serialised `color` + `__experimentalBorder`; colour+border custom values emitted scoped to the EXISTING `#{uid}.sgs-multi-button` `<style>` via the style engine. Border radius/width stay WP-native base objects — **no SGS border-object attrs, no border tiers** (this block has no responsive border design). Preset colour slugs (`backgroundColor`/`textColor`/`gradient`) re-added as `has-*` classes via `extra_classes` into `SGS_Container_Wrapper::render` (verified merged before kind-branching, read-only). Flex CSS + its 1023/767 tiers untouched. `esc_html`→`wp_strip_all_tags` on the `<style>` blob. Wrapper + `kind='content'` kept. Shared wrapper NOT edited.

### audio — block-private (spacing.margin+padding) + view.js var refactor
- Files: block.json, render.php, edit.js, **view.js, style.css**.
- Part 1 (server render): skip-serialised `spacing`; base padding+margin + 4 tiers scoped; class uid `.sgs-au-….wp-block-sgs-audio`; kept the var-only `--sgs-audio-accent/--sgs-audio-spectrum` root style. `color` disabled (no-op). Wrapper kept.
- **Part 2 (view.js runtime-style refactor — Bean-approved best practice):** the visualiser's direct `.style.<property>` writes → `setProperty('--var', …)` + consuming stylesheet rules (values preserved through the indirection):
  - `arc.style.strokeDasharray/strokeDashoffset` → `--sgs-arc-dash` / `--sgs-arc-offset`, consumed by `.sgs-audio__arc { stroke-dasharray/-dashoffset: var(...) }` (fallbacks 251.3 ≈ 2π·40, the full-circle initial state).
  - `glow.style.opacity/transform` → `--sgs-glow-opacity` / `--sgs-glow-scale`, consumed by `.sgs-audio__glow { opacity/transform: scale(var(...)) }`.
  - `viz.style.background = 'linear-gradient(…)'` / `''` → `setProperty('--sgs-viz-bg', …)` / `removeProperty`, consumed by `.sgs-audio__viz--pulse { background: var(--sgs-viz-bg, <original default>) }`.
  - **Left as-is:** `--sgs-progress` setProperty (already correct); the L53 transient off-screen colour-resolution PROBE (`probe.style.cssText`, 0×0, appended+removed — not part of the rendered block); canvas 2D `fillStyle`/`strokeStyle` (paints `<canvas>`, not DOM inline style).

## FLAGS for the INTEGRATION / LAND session
1. **audio visualiser animation** — the `--var` indirection cannot be visually verified files-only. LANDED must confirm the radial arc/glow + gradient-pulse background animate identically (idle→reactive→idle, glow scale/opacity easing) at a live browser check.
2. **Left-in-place static visual breakpoints** (do NOT "normalise" these — they're not the device-tier system): buybox 480/768/1024 (PDP layout); mobile-nav-toggle 782 (nav visibility); responsive-logo scss 1024 + `<picture>` 600/1024 (art-direction).
3. **product-search editor-only preview inline style** (minWidth/minHeight on a disabled canvas preview button) — frontend-clean; only relevant if the audit later targets editor-preview inline styles.
4. **No F3 debt** in this track — zero `hardcoded-render-defaults-baseline.json` rows for any Track-A block (DONE-checklist #6 satisfied by construction).
5. **No version bumps / no deprecations** (D293) — honoured across all 8.

## Commit status
Files are complete + build-green in the worktree. See the operator note re: the pre-commit
visual-diff gate (STOP-67) vs the files-only edit-track model — the LANDED visual-diff reports
are the integration session's deliverable, not this track's.
