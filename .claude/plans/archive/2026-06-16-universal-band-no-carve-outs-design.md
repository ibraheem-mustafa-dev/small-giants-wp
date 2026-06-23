---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Design: universal 3-layer band absorption — remove the 3 wrapper carve-outs"
created: 2026-06-16
status: ARCHIVED 2026-06-23 (doc audit) — Stage 1 (band A+C) + grid de-cheat SHIPPED (D228); Stages 2-4 (hero fold / product-card / remove wrap_inner) are converter-touching and now owned by the clean modular rebuild (Spec 31 §12, convert.py FROZEN per D229 D-MODULAR). The hero-fold architecture captured here is reference for the rebuild. ORIGINAL: PARTIAL 2026-06-16 (D228). Stage 1 (band A+C) SHIPPED + the grid DE-CHEAT prerequisite SHIPPED. Stages 2-4 (hero fold / product-card / remove wrap_inner) PENDING — now unblocked.
supersedes_conception: "$grid_on_inner gated on contentWidth + wrap_inner + block-kind (commit 9dde2f2d)"
inputs:
  - Bean correction 2026-06-15/16 (foundational L1/L2/L3 rule)
  - class-sgs-container-wrapper.php ground-truth reads (L405/411/450/1180/1197-1218/268)
  - Spec 22 FR-22-21 + WRAPPER-CSS-ROUTING-DESIGN-GATE.md (DEC-3)
  - hero/render.php:297-301,874 + product-card/render.php:136
---

# Universal 3-layer band absorption — remove the 3 carve-outs

## Foundational rule (Bean, locked 2026-06-16)

L1/L2/L3 exist ONLY on the **extraction side** — they map the draft's nested wrapper
classes to the equivalent WP/SGS structure. On the **clone/render side they dissolve**:
each draft layer's content + CSS rules are absorbed into the chosen block's **attribute
slots**. A block's `__inner` is the *rendered form of the absorbed L2*, not a foreign div.
**If a CSS rule exists in the draft, it survives the cloning process — regardless of which
layer it came from or the block's kind.** Band emission is driven by "is there ANY
band-level CSS to place", never by a single property or block-kind.

## Carve-out verdicts (empirical, against the committed wrapper)

| Carve-out | Code | Verdict |
|---|---|---|
| **A — contentWidth must be set** | `$do_wrap` needs `'' !== $content_width` (L1180); band padding/bg emit only inside `$do_wrap` (L1197-1218) | **REAL CSS-DROP.** Band padding/background with no max-width → no `__inner` → CSS lost. |
| **C — content-kind excluded** | band bg read-gated `$is_section\|\|$is_layout` (L268); band padding emit-gated (L1200); gap (L411) + grid (L450) gated | **REAL.** Block-kind gates CSS transfer — forbidden by the rule. |
| **B — wrap_inner override** | `null === $opt_wrap_inner` (L405/1180); hero-split (render.php:874) + product-card (136) force false | **DIVERGENCE, not contract.** Hero-split renders its grid on L1/outer (`$styles`, render.php:300) instead of folding into L2 — `wrap_inner=false` masks that. The divergence is the bug. |

## Staged build (each = own commit R-22-5, live-verified on real page 8 before next)

1. **Container-wrapper (fixes A+C).** Band emits on `$has_band_props` = contentWidth OR any
   `contentBandPadding{Top,Right,Bottom,Left}` OR `contentBandBackground` OR grid-on-inner.
   `$grid_on_inner` drops the `'' !== $content_width` hard requirement (folds to `__inner`
   whenever a content band exists). Remove the `$is_section||$is_layout` kind gates on band
   padding (read+emit), band background (read L268), so content-kind keeps its band CSS.
   **Keep `wrap_inner` working** (hero/product-card still depend on it until folded). LOW risk.
2. **Hero-split fold.** Route the split grid through the shared layer (layout-driven → lands
   on `__inner` via grid-on-inner); `__content`/`__media` become `__inner` grid items; retarget
   hero's responsive grid + order-swap CSS to `.uid > .sgs-container__inner`. HIGH risk.
3. **Product-card.** Drop `wrap_inner=false`; confirm the flat card renders (with/without band). LOW.
4. **Remove the `wrap_inner` option entirely** (both callers folded) → carve-out B gone. LOW.

## Verification gate per stage

- `php -l` + a live `do_blocks()` render of an affected container.
- Real page 8 (palestine-lives canary / Mama's page 144): Playwright live DOM + computed style
  — a no-contentWidth band keeps its padding; a content-kind clone keeps its inner CSS;
  hero-split renders correctly at 375/768/1440; no full-bleed section loses its background span.
- Pixel-diff pre/post (R-22-4); commit cites predicted vs actual delta.

## Build progress (D228, 2026-06-16)

- **Stage 1 (band A+C) — SHIPPED** (commit `69ee706e`, on main): band emits on `$has_band_props`; content-kind kind-gates removed; live-verified A (padding survives no-contentWidth) + B (content-kind band bg) + C (full-bleed grid no regression).
- **Grid DE-CHEAT — SHIPPED** (commit `e66f8973`, NEW prerequisite discovered this session): attempting Stage 2 (hero fold) surfaced that the shared wrapper's grid had TWO hardcoded cheats that would crush a folded hero's split ratio — (1) `sgs-cols-tablet/mobile-N` classes forcing `grid-template-columns:repeat(N,1fr) !important` over the faithful explicit `gridTemplateColumns*` ratio, and (2) a 599px device-tier mobile breakpoint inconsistent with the `sgs-cols-*` 767. Per Bean (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`) these are R-22-1 cheats to REMOVE, not blockers: gated `sgs-cols-*` on empty-ratio (faithful ratio now wins) + unified device-tier breakpoints to **768/1024** (wrapper 599→767 + converter `_GRID_TABLET_BP` 600→768, commit `f997af25`). **The hero fold (Stage 2) is now unblocked** — the helper renders a passed `gridTemplateColumns*` faithfully.
- **Stages 2-4 — PENDING.** First step of the next session's grid/container-extraction rebuild. Ground the hero's split setup in the variant DB (`variant_slots`: sgs/hero split = gridTemplateColumns/splitGap), route the split grid through the now-faithful helper, keep the order-swap @media, drop `wrap_inner=false`, then product-card (Stage 3) + remove the option (Stage 4). Verify the split hero renders IDENTICALLY at 375/768/1440.
- Carve-out B verdict refined: `wrap_inner=false` masks the hero rendering its grid on L1 outer; the fold needs the faithful helper (now shipped) before it can land without regressing the split hero's bespoke responsive ratio/order-swap.
