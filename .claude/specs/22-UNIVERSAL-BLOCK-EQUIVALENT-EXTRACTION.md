---
doc_type: spec-redirect
spec_id: 22
status: merged-into-31
merged: 2026-06-30 (D253)
---

# Spec 22 — MERGED into Spec 31 (redirect stub)

**Spec 22 was merged in full into [Spec 31](31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md) on 2026-06-30 (D253).** Spec 31 is now the single canonical cloning-pipeline spec.

- **Binding rules + functional requirements** (the load-bearing architecture) are absorbed into **Spec 31 §13** (`Absorbed pipeline architecture`), harmonised into Spec 31's structure.
- **ID mapping:** every `R-22-N` ≡ `R-31-N` and `FR-22-N` ≡ `FR-31-N` (same N). Citations were renumbered to the `31` series in active docs + the new `converter/` engine; the frozen `convert.py` (D-MODULAR) + archived/historical files keep the `22` series — they map 1:1, so any `R-22-N`/`FR-22-N` reference still resolves.
- **Implementation history** (phases, risks, council findings, ratification, per-FR `built_status`) is preserved verbatim in the archived original: [`archive/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`](archive/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md).

Where to look in Spec 31:
- Binding rules R-31-1..15 → §13.1
- Recognition + 3-exception walker (FR-31-1/3/16/15), `sgs/container` default (FR-31-4/4.1) → §13.2
- Content fork (FR-31-2/2.1/2.2/2.5) → §13.3
- CSS routing (FR-31-5/5.1/5.3) → §13.4 + §3.A
- Variant detection (FR-31-20) → §13.5 + §2 Axis-4
- Composite-mirror + render.php migration (FR-31-21.1/21.2/6) → §13.6
- Walker pseudocode + atomic_tag_map → §13.8 appendices
