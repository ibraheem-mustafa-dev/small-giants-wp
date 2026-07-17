---
doc_type: reference
project: small-giants-wp
title: No-inline fix-footprint (framework-wide inline-zero rollout)
generated: 2026-07-17
source: proven live on sgs/brand-strip (commit 4926f859) during the Indus Our-Brands session
status: OPEN — feeds the /phase-planner inline-zero plan
---

# No-inline fix-footprint

The repeatable recipe for taking every SGS block to **zero inline `style`** (Bean's
intent: nothing inline except, at most, the `sgsCustomCss` residual). Derived by
doing it end-to-end on `sgs/brand-strip`. Each CASE below = a detection signature +
the exact fix + the gotchas that bite. This is what the bulk script + Haiku agents
follow; the residue (judgment cases) goes to Sonnet.

## The target end-state (per block)

- Block root (and every element the block renders) carries **no `style` attribute** —
  not `style="--var:…"`, not empty `style=""`.
- All per-instance values live in a **scoped `.uid{ --var:…; }` rule** inside the
  block's own `<style>` (the SGS CSS registry, `class-sgs-css-registry.php`, lifts
  that `<style>` on `render_block` priority 99 and consolidates it to the collected
  stylesheet file — this already works; it just needs the block to *emit* there,
  not inline).
- Static/structural CSS stays in the block's `style.css` (shared, cached) — that is
  NOT inline and is out of scope (Spec 32 §5). Do not try to consolidate `style.css`.
- Reference implementations to copy: **`sgs/quote`** (render.php — "everything lives
  in the scoped `<style>`") and **`sgs/brand-strip`** (this session, commit 4926f859).

## CASE 1 — per-instance values in an inline `style="--var:…"` attribute

**Detect (grep, DB-free):** an `sgs/*` block whose render.php builds a `$css_vars`
(or similar) array and passes it to `get_block_wrapper_attributes([... 'style' =>
implode(';', $css_vars) ...])`, OR any element emitted with `style="--sgs-…"`.
Live signature: `grep -oE 'style="--sgs[^"]*"'` on a rendered page returns hits.

**Fix (mechanical, proven):**
1. Build a scoped rule from the same values and push it into the block's scoped-CSS
   array (the one that becomes the `<style>` tag):
   ```php
   if ( ! empty( $css_vars ) ) {
       $scoped_css[] = $root_sel . '{' . implode( ';', $css_vars ) . '}';
   }
   ```
   `$root_sel` = the block's uid selector (e.g. `.$uid.wp-block-sgs-<block>`), the
   same selector the block already uses for its other scoped rules.
2. Remove the `'style'` key from `get_block_wrapper_attributes()` (keep `'class'`).
3. Confirm every native support serialises OFF (see GOTCHA A) so WP does not re-add
   a `style`.

**Verify:** the rendered root has NO `style` attribute; the values appear as
`.uid{ --var:… }` in the collected stylesheet; computed styles unchanged at
375/768/1440.

## CASE 2 — empty `style=""` attribute (pure waste)

**Detect:** live signature `grep -oE 'style=""[^>]*wp-block-sgs'` returns hits
(e.g. `<main style="" class="sgs-container …">`, `<div style="" …>`). Cause: the
render passes `'style' => ''` (or `implode(';', []) . ';'` on an empty array).

**Fix:** conditionally omit the `'style'` key when there is nothing to emit — never
pass an empty string. After CASE 1, this collapses into it (no `style` key at all).

## CASE 3 — WP-native support auto-inlining (color/spacing/border)

**Detect:** the block declares `supports.color` / `supports.spacing` /
`supports.__experimentalBorder` WITHOUT `__experimentalSkipSerialization: true`, so
`get_block_wrapper_attributes()` inlines `style="padding:…;border:…"` (real property
declarations — worse than `--var`).

**Fix:** add `"__experimentalSkipSerialization": true` under each such support in
block.json, then route the value scoped via `wp_style_engine_get_styles($style,
['selector' => $root_sel])` into the scoped `<style>` (the D292/quote pattern).

## CASE 4 — core WP blocks inline their own styles (OUT of SGS no-inline scope)

**Detect:** `wp-block-group`/`wp-block-heading`/`wp-block-columns` etc. with
`style="padding-…"`, `style="color:…"`. These are **core** blocks; SGS's registry
does not (and should not) touch them.

**Fix (judgment — Sonnet):** to remove these, convert the block to its SGS
equivalent (`core/group`→`sgs/container`, `core/heading`→`sgs/heading`) via the
core→SGS migration tool (`plugins/sgs-blocks/scripts/migrate-core-blocks/`). This is
NOT part of the mechanical inline-var sweep — flag per page, don't bulk-convert.

## GOTCHAS (bit us this session)

- **A — skip-serialization is mandatory before dropping the `style` key.** If a
  native support still serialises, removing `'style'` lets WP re-inline it. brand-strip
  already had all three supports `__experimentalSkipSerialization: true`; VERIFY per
  block before the CASE 1 edit.
- **B — the scoped channel is SAFER for colours.** `safecss_filter_attr()` (applied
  to inline `style=`) silently STRIPS functional colours (`rgb()/hsl()/oklch()`);
  the scoped `<style>` channel (only `wp_strip_all_tags`) does not. Moving values
  scoped fixes latent colour drops for free.
- **C — values must already be sanitised at source** (absint/esc_attr/
  sgs_colour_value) because the scoped channel isn't `safecss`-filtered. brand-strip's
  were; check per block.
- **D — editor parity is automatic.** The registry keeps `<style>` inline in the
  editor (ServerSideRender has no `wp_footer`); the scoped-rule change works in both
  because `class-sgs-css-registry.php` already gates on `sgs_is_frontend_render()`.
- **E — `--var` in `style=` is spec-PERMITTED today (FR-32-4).** So this is a
  spec-TIGHTENING, not a bug-fix. FR-32-4 must be amended to forbid inline `--var`
  before/with the rollout, or the gate has no teeth.

## Scale plan (feeds /phase-planner)

1. **Amend FR-32-4** (Spec 32) → forbid inline `--var`; the only permitted inline is
   nothing (or the documented `sgsCustomCss` residual, itself a candidate to scope).
2. **Detector script** — enumerate every `sgs/*` block's render surface for CASE 1/2/3
   signatures (static grep + a live-page scan per built page). Output a per-block
   worklist tagged mechanical (1/2) vs judgment (3/4).
3. **Bulk (Haiku + script)** — CASE 1 + CASE 2 are near-identical mechanical edits;
   apply per block from the worklist, rebuild, assert `0` inline `style="--`/`style=""`
   on a render, computed-style unchanged.
4. **Residue (Sonnet)** — CASE 3 (skip-serialization + style-engine routing) and any
   block whose var-emission isn't the standard `$css_vars`→wrapper shape.
5. **CASE 4** — separate core→SGS migration pass, per page, not part of this sweep.
6. **Gate** — a structural lint (`0` body `style="--"` / `style=""` on `sgs/*`
   elements across the canary pages) wired to prebuild, so it can't regress.
