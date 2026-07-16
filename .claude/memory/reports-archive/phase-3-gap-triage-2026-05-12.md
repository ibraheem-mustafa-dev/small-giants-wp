# Spec 31 Phase 3 §3.8 — Gap Triage Report

**Date:** 2026-05-12

## Vocabulary additions

Inserted 13 new rows into `property_suffixes` covering motion (Duration/Easing/Delay/StaggerDelay/Animation), layout primitives (Columns/Min/Max), visual (Radius), and hover-state colour pairs (Bg/HoverBg/HoverText/HoverBorder).

## Instance-data flagging

Marked 96 gap rows as `instance-data-not-canonicalisable` (form-field per-instance attrs: fieldName, conditionalValue, conditionalOperator, required, placeholder, helpText, etc.).

## Counts

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| block_attributes total | 1343 | 1343 | 0 |
| canonicalised (canonical_slot NOT NULL) | 307 | 309 | 2 |
| gap_candidates total | 1038 | 1038 | 0 |
| gap canonicalisable (queue) | 1038 | 942 | -96 |
| gap instance-data flagged | 0 | 96 | 96 |

## Deferred — Phase 4 per-block triage

The residual gap-canonicalisable queue contains block-specific structural attrs (mobile-nav: 65, post-grid: 56, button: hover-state explosion) that need either:

1. Per-block slot vocabulary expansion (some blocks have unique slot names    the content-identity vocab doesn't cover)
2. Promotion to `instance-data-not-canonicalisable` (query filters,    conditional logic operators)

Tracked for Phase 4 (draft convention enforcement) where the BEM + token lints will surface the actual usage patterns.
