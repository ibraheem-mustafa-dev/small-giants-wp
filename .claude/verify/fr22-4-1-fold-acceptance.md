# FR-22-4.1 Recursive-Fold — Acceptance Gate (hard)

**Branch:** `feat/fr22-4-1-universal-wrapper` · **Baseline:** main run `mamas-munches-homepage-2026-05-31-102445` (mean 64.60%) · **Set:** 2026-05-31

Every criterion needs **2 independent evidence sources** (/verify-loop): (A) the walker **trace** (`convert-trace-bN.jsonl` `walker_branch_taken` events) and (B) the **live DOM** (Playwright `getComputedStyle` / textLen / layout). Pixel-diff is a third signal but is NOT authoritative alone (R-22-11 / STOP #24).

| # | Criterion | Evidence A (trace) | Evidence B (live DOM) |
|---|-----------|--------------------|------------------------|
| G1 | **Brand 2-col grid renders** (the +33pp break is fixed) | `fold_into_container` fired for brand's inner wrapper; section container carries `layout`/grid attrs | `getComputedStyle(section.sgs-brand container).display` ∈ {grid,flex} with ≥2 columns; text + media side-by-side; not +33pp |
| G2 | **No per-section regression >1pp** vs baseline on 7 body sections × 3 vp (header/footer excluded — template parts) | n/a | `stage-11-pixel-diff.json` Δ ≤ +1pp each (false-loss reflow noise reconciled against live DOM) |
| G3 | **Trust-bar = 4 icon+text grid items** | `leaf_misresolution_guard` fired ×4 for `__badge`; `fold_into_container` for `__inner`; `wrapper_container` ×4 | section container `display:grid`; 4 badge containers each with an icon + text node; textLen ≈ 104 |
| G4 | **Leaf-guard preserved** (badges/body render their content) | `leaf_misresolution_guard` events present | card bodies show heading/price/CTA, not collapsed |
| G5 | **No over-nesting explosion** | container counts bounded (social-proof ≤ ~3, not 13) | extra neutral containers don't shift layout |
| G6 | **/qc-council on the code diff** PASS before commit | — | multi-model raters on `convert.py` fold diff |

**Gate:** all of G1–G6. On any regression → root-cause from the trace first (not pixel alone), then iterate or roll back fast (STOP #19). Commit only when G1–G6 hold; commit message cites predicted-vs-actual per-section delta (R-22-4).
