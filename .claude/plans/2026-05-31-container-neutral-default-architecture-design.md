---
doc_type: spec
spec_id: 23
spec_version: 0.1-design
project: small-giants-wp
title: Neutral-Default Container Architecture
generated: 2026-05-31
status: design — awaiting strategic-plan
parent: Spec 22 (Universal Block-Equivalent Extraction); Task 1 XS-3 walker
research: memory/research/2026-05-31-container-neutral-default-attributes.md (16 sources)
---

> **SUPERSEDED 2026-06-02 by `.claude/plans/2026-06-02-container-wrapper-standardisation.md` (D152)** — the inner-wrapper model replaces the "neutral default" framing (contentWidth moved to inner `__inner` wrapper; outer container goes full-bleed by default). Spec 22 §FR-22-21 is the canonical procedure. This doc is retained for historical reasoning only.

# Spec 23 — Neutral-Default Container Architecture

## §0 Purpose (plain English)

`sgs/container` must express **only the styling that was explicitly set**. An unset
attribute means *do nothing* — never "apply the framework's house style." Clients opt
**in** to constraints (a "use content width" toggle); they never have to opt out of a
default they didn't ask for. This is the gold-standard model (WordPress core flow layout,
GenerateBlocks 1.4+/2.0) and the only model compatible with non-technical clients who use
the block editor exclusively.

## §1 Problem (root cause — empirically traced 2026-05-31)

When the clone walker re-emits a layout-bearing mockup wrapper (e.g. `<div class="sgs-products">`
— a 2-col grid via deployed CSS `grid-template-columns:5fr 3fr`) as an `sgs/container`, the
container **over-paints** styling the mockup never had:

- `render.php:146` emits `gap:var(--wp--preset--spacing--40)` **unconditionally**.
- `render.php:260-263` emits `sgs-container--width-{maxWidth}` **unconditionally**; `maxWidth`
  defaults to `wide` → `style.css:57-59` paints `max-width:1200px; margin:auto` (caps + centres).

This over-paint — not the wrapping itself — caused the **+13pp (featured-product) / +10pp
(social-proof)** pixel-diff regression that reverted the XS-3 walker (commit `c76aa107`).

Two structural faults underlie it:
- **Two competing width systems** — `maxWidth` (default `wide`) and `widthMode` (default
  `default`) both exist and fight; `maxWidth` is kept only "for backwards-compat."
- **No true neutral width state** — even `full` stamps `sgs-container--width-full` (a class with
  specificity that can beat the mockup's own CSS).

The block already follows "emit only if set" for ~38 of its style outputs; **only `gap` and the
width class break the pattern.** This is *finishing* an existing philosophy.

## §2 Gold-standard evidence (research 2026-05-31)

- **core/group**: flow layout imposes no width; `constrained` is opt-in via theme.json
  `contentSize`. SGS `widthMode:'full'` ≈ core flow.
- **GenerateBlocks 1.4.0**: removed hardcoded 40px padding default ("defaults generate
  unavoidable CSS debt"); 2.0 imposes nothing. Lazy materialise-on-edit migration.
- **Kadence/Spectra**: opt-out defaults → most support complaints + code-escape overrides
  (disqualified for non-technical clients).
- **Consensus**: neutral at block level + helpful starting-state via variations/patterns.

## §3 Functional requirements

- **FR-23-1** — Guard the two unconditional emitters (`gap`, width class) so each emits only
  when the value was explicitly set, matching the existing ~38 guarded emitters.
- **FR-23-2** — Add a genuine neutral width state that emits **no width class and no max-width
  style**. Make it the default for new inserts and for pipeline-emitted containers.
- **FR-23-3** — Establish `widthMode` as the single source of truth for width; retire `maxWidth`
  via `deprecated.js` migration. Existing instances that relied on the implicit `wide` default
  are pinned to an **explicit** `wide`/constrained value so their rendered look is preserved.
- **FR-23-4** — Migrate existing content deterministically (WP-CLI batch backfill walking every
  container instance on every production site), not via lazy editor re-saves only — per R-22-14
  (no server-side fallback hacks).
- **FR-23-5** — Editor UX: the width control's default option is labelled neutrally
  ("Inherit / none — no width limit") with opt-in "Use content width" / "Use wide width".
- **FR-23-6** — The walker (Task 1 / XS-3) preserves layout-bearing mockup wrappers by emitting
  them as neutral `sgs/container` instances, firing correctly through `__inner` passthrough
  wrappers (the real targets sit at depth-2 under the section, not as immediate children).
- **FR-23-7 (lateral, R-22-9)** — "Unset attribute = emit no CSS" becomes a walker-wide emission
  contract. Audit all 67 blocks' `render.php` for unconditional `$styles[] =` emitters; guard each.

## §4 Open questions for the strategic-plan research pre-gate

1. **Dynamic-block deprecation**: `sgs/container` is dynamic (render.php). Does a pure
   default-value change need a `deprecated.js` entry at all, or does a WP-CLI attribute backfill
   suffice? Dynamic blocks don't serialise markup into post_content. (Materially changes effort.)
2. **Pattern coupling**: do the 47 patterns + `sites/*/` write `maxWidth`? If so, retiring it must
   update them too (comprehensive-fix rule).
3. **Specificity / pixel-sample**: confirm the +13pp was max-width clipping the grid's available
   width (vs gap/centring) — pixel-sample, don't assume (measurement-vs-eye rule).
4. **core/group flow**: does it emit truly zero width CSS, or an `is-layout-flow` class? Decides
   whether "neutral" = "no class" or "a class that explicitly resets." (R-22-11 rendered DOM.)

## §5 Constraints / binding rules

- R-22-3 (walker may only use `sgs/container` as its container primitive — no `core/group`).
- R-22-4 (pixel-diff gates every commit) + blub.db 276 (one change at a time, never batched).
- R-22-9 (universal mechanism — FR-23-7 is the test).
- R-22-11 (verify rendered output) + R-22-13 (Bean visual sign-off co-authoritative).
- R-22-14 (no server-side legacy fallback hacks; full-roster + WP-CLI batch migration).
- Client-experience-primary (every control exposed in the inspector; clients never touch code).

## §6 Acceptance

- featured-product + social-proof pixel-diff improve (toward the deployed mockup CSS reproducing
  the grid/flex layout), no section regresses > +1pp, mean < 59.83% baseline.
- Existing client-page containers render unchanged after migration (visual sign-off).
- Each step ships separately with pre/post `/sgs-clone --debug-trace` Stage 11 measurement.
