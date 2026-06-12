---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "DESIGN GATE — sgs/container padding-family normalisation + converter shorthand-routing fix"
created: 2026-06-12
status: "NO-GO (2026-06-12). /adversarial-council (5 personas) + live page-8 probe converged: section padding ALREADY renders correctly (delivered via WP-native spacing) — the normalisation closes ZERO rows and risks silent regressions on the most-used block. Superseded by the ledger re-baseline (`2026-06-12-ledger-rebaseline-live-dom.md`). Kept as the design-gate record. Do NOT build."
---

# Design gate — container padding-family normalisation + converter shorthand routing

## Architectural primitive (plain English — R-22-10)

Every padding **layer** of `sgs/container` should be a self-describing, **parallel** attribute
family: same prefix scheme, same per-side granularity (Top/Right/Bottom/Left), same per-breakpoint
set (base/Tablet/Mobile). Then the converter — and a human — can unambiguously tell **which layer**
a draft's padding value belongs to, and route it there. Today the three layers use three different
naming + granularity schemes, which is the root cause of the converter dropping section padding.

## Root cause (evidence-confirmed this session)

A folded section's shorthand `padding: 56px 20px` is **dropped** (`no_matching_container_attr`) at
`_lift_wrapper_css_to_attrs` (`convert.py:1112`): the shorthand `padding` resolves to a single
suffix `Padding`→attr `padding`, which `sgs/container` does not expose, and the function never calls
`_expand_box_shorthand` (the hero AREA router does, `convert.py:2167` — which is why **hero is the
only section whose padding survives**, H-B VERIFIED). Confirmed in emitted markup (`stage-4.json`):
**zero** container padding attrs delivered; only hero's AREA-routed `contentPadding*` present.

> **Handoff correction:** the prior next-session-prompt blamed the *cross-node router* mis-routing
> padding "to gridItemPadding/outer instead of contentPadding*". The trace disproves both: wrong
> function (`_lift_wrapper_css_to_attrs`, not `_route_interior_css_to_parent_slot`) and wrong
> mechanism (dropped, not mis-routed). **GF-B.1 "VERIFIED 64/20" is likely a false positive** —
> gift drops padding identically in the trace; its live value is a coincidental default. Re-check
> under Task 3.

## Current state — the 3-layer asymmetry

| Layer | What it pads | Current attrs | Render | Control |
|---|---|---|---|---|
| OUTER | full-width section wrapper | base = **native WP `supports.spacing.padding`** (inline); responsive = bare `padding{Side}Tablet/Mobile` | `class-sgs-container-wrapper.php` + native | native + `ContainerWrapperControls.js` |
| CONTENT band | centred max-width column | `contentBandPadding{Side}` + `{Side}Tablet/Mobile` (**full**) | `class-sgs-container-wrapper.php:245-258` | `ContainerWrapperControls.js` |
| PER-GRID-ITEM | each grid child | `gridItemPadding` (**lone shorthand**) | `class-sgs-container-wrapper.php` | `ContainerWrapperControls.js` |

**Asymmetries:** (1) OUTER base hides in native supports — no `paddingTop` custom attr exists, so
the converter has nowhere to put a base/desktop OUTER value even after shorthand expansion.
(2) GRID is a lone shorthand — no sides, no breakpoints. (3) Only CONTENT band is clean.

## Blast radius (why this is design-gated)

- `sgs/container` is the most-used block.
- `class-sgs-container-wrapper.php` is the **WS-4 shared helper that 29 composite blocks MIRROR**
  (D152/D167 composite-mirror rule). Renaming the container's padding family cascades into all 29
  mirroring blocks + their render + controls + deprecated migrations.
- Existing content uses native OUTER padding + `contentBandPadding*`; any rename/move needs a
  `deprecated.js` migration (currently at v2).

## Candidate fix-shapes (for the council to stress-test — HYPOTHESES, not specs, R-22-7)

**FS-1 — Additive normalisation (keep `contentBandPadding*`).**
- KEEP `contentBandPadding*` (already parallel + mirrored across 29 blocks — zero churn).
- ADD `outerPadding{Side}` + `{Side}Tablet/Mobile` base+responsive custom attrs so OUTER has a full
  family with a base-tier home (base no longer trapped in native inline — fixes Rule 6 too).
- EXPAND `gridItemPadding` → `gridItemPadding{Side}{BP}` (keep old shorthand readable via migration).
- Converter: call `_expand_box_shorthand` in `_lift_wrapper_css_to_attrs`; route OUTER section
  padding → `outerPadding*`.
- Pros: minimal blast radius, no contentBand rename → no 29-block cascade, no hero `contentPadding*`
  collision. Cons: layer prefixes not *perfectly* uniform (`contentBand` vs `outer`/`gridItem`).

**FS-2 — Full parallel rename (`outerPadding*` / `contentPadding*` / `gridItemPadding*`).**
- Bean's literal proposal. Perfectly uniform family.
- Cons: (a) `contentPadding*` **collides with hero's existing per-area `contentPadding*` attrs**;
  (b) renames the 29-block-mirrored `contentBandPadding*` → cascade across the whole mirror roster +
  their deprecated migrations; (c) largest migration surface.

**FS-3 — Full rename but keep `contentBand` token (`outerPadding*` / `contentBandPadding*` /
`gridItemPadding*`).** Middle path: uniform per-side/per-breakpoint granularity on all three, but
keep the descriptive `contentBand` token (avoids hero collision + 29-block rename). Effectively FS-1
framed as a naming standard.

## Open decisions (Rule 9 — Bean ratifies)

1. **FS-1 / FS-2 / FS-3** — recommend **FS-1/FS-3** (same outcome): full per-side/per-breakpoint
   granularity on all three layers, keep `contentBand` token, add `outerPadding*` base family,
   expand `gridItemPadding`. Avoids the hero collision and the 29-block contentBand cascade.
2. **OUTER base: move out of native `supports.spacing.padding` into `outerPadding*`?** Or keep native
   for hand-authored blocks + only ADD `outerPadding*` for converter/responsive use? (Migration +
   Rule-6 cascade hinges on this.)
3. **gridItemPadding back-compat** — migrate lone shorthand → 4 sides via deprecated.js.

## Build sequence (post-approval — subagent-implemented, Opus orchestrates)

1. block.json attrs (+ 28 mirror blocks if any rename) · 2. `class-sgs-container-wrapper.php` render
· 3. `ContainerWrapperControls.js` controls · 4. `deprecated.js` v3 migration · 5. converter
`_expand_box_shorthand` + routing · 6. re-clone + per-row live-DOM probes on featured-product/
ingredients/social-proof · 7. /qc-council on the converter commit · 8. ledger walk.

## Acceptance

featured-product / ingredients / social-proof section padding lands on the correct normalised attrs,
live-verified on page 8 (computed padding matches draft per side per breakpoint); 29-mirror blocks
unbroken (do_blocks render-verify); existing content migrates clean (zero "unexpected content").
