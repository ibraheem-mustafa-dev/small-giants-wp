# Effort PERT — SGS Architecture Programme

**Generated:** 2026-05-21 (strategic-plan Phase 3 effort agent, Sonnet)
**Method:** Three-point PERT `(O + 4R + P) / 6` + ADHD Tax multiplier
**Calibration:** Sonnet implementer 2-4× faster than original estimates on mechanical work (Phase 0 actual: 20 min vs 85 min estimate)

## Per-phase PERT estimates

| Phase | O | R | P | PERT | × ADHD Tax | Time band | Confidence |
|---|---|---|---|---|---|---|---|
| **0.5** Structural QC hook | 10 min | 18 min | 35 min | **~20 min** | **~40 min (×2)** | Quick | HIGH |
| **1** DB merge | 35 min | 65 min | 120 min | **~69 min** | **~138 min** | Session | HIGH |
| **2** Variations indexing | 25 min | 50 min | 90 min | **~53 min** | **~106 min** | Session | MEDIUM |
| **3** INNER_BLOCK_PATTERNS retire | 25 min | 55 min | 105 min | **~59 min** | **~118 min** | Session | HIGH (code-surgery), MED (DB edges) |
| **4** /sgs-update + Option B | 90 min | 220 min | 420 min | **~232 min (~3.8 hr)** | **~456 min (~7.6 hr)** | Multi-session | LOW (scraping), MED (stage wiring) |
| **5a** Variation kill | 30 min | 70 min | 130 min | **~75 min** | **~150 min** | Session | HIGH |
| **5b** Customiser migration | 120 min | 280 min | 540 min | **~297 min (~5 hr)** | **~891 min (~14.9 hr) (×3)** | Multi-session | MEDIUM |
| **6** Backfill + audits + Lucide REST | 60 min | 160 min | 360 min | **~178 min (~3 hr)** | **~356 min (~5.9 hr)** | Multi-session | MEDIUM |
| **7** WP 7.0 alignment | 50 min | 140 min | 280 min | **~151 min (~2.5 hr)** | **~302 min (~5 hr)** | Session | MEDIUM |

## Programme totals

**CORRECTION 2026-05-21 post-Bean review:** The PERT agent applied ADHD Tax × 2 on top of already-conservative "Realistic" estimates that didn't account for the Phase 0 actual (20 min for 4 decisions = ~5 min/decision Sonnet baseline per `~/.claude/rules/time-estimates.md`). Bean caught the double-count. Numbers below revised + QC inter-phase gate budgets added.

### Calibrated estimates (apply time-estimates.md DEFAULT-LOW + Sonnet mechanical baseline ~5 min/decision)

| Phase | Decisions | Sonnet mechanical baseline | QC gate after | Realistic total |
|---|---|---|---|---|
| 0.5 | 1 (hook) | ~10-15 min | ~10 min /qc-inline | ~25 min |
| 1 | 3 (merge + cli docs + indexed_files) | ~30-60 min | ~15 min /qc-council Stage 5 | ~45-75 min |
| 2 | 2 (variations schema + seed) | ~30-50 min | ~10 min /qc-inline | ~40-60 min |
| 3 | 1 (cv2 rewrite + tests) | ~45-90 min (some design) | ~15 min /qc-council + pixel-diff | ~60-105 min |
| 4 | 2 (scraper port + completeness) | ~120-240 min (genuine novel scrape work) | ~20 min /qc-council | ~140-260 min |
| 5a | 5 (variation kill + push CLI) | ~45-90 min | ~15 min /qc-council + eyes-on | ~60-105 min |
| 5b | 3 (Customiser + button presets + view transitions) | ~180-360 min (genuine creative; multiple files) | ~25 min /qc-council + eyes-on | ~205-385 min |
| 6 | 5 (markup examples + audits + Lucide REST) | ~120-200 min (templated audit) | ~15 min /qc-inline per sub-step | ~135-215 min |
| 7 | 2 (AI Connectors + skills audit) | ~60-150 min | ~15 min /qc-inline | ~75-165 min |

### Programme totals (calibrated)

| Estimate | Sum |
|---|---|
| Critical-path (0.5+1+3+5a) sequential, including QC gates | **~190-360 min ≈ 3-6 hrs** |
| Full programme (all 8 unfinished phases) sequential | **~785-1395 min ≈ 13-23 hrs** |
| 4-parallel sessions wall-clock | bottleneck Session C (5a+5b) = **~265-490 min ≈ 4.5-8 hrs** |

**Key insight:** Critical-path live-correctness work (closes hero CTAs empty + wrong-variation bug + INNER_BLOCK_PATTERNS retire) fits in **one long session OR two normal sessions**, not 3+ sessions. Time-estimates.md DEFAULT-LOW rule honoured.

### Old (incorrect) numbers — preserved for accountability

```
PERT × ADHD Tax full programme sequential: 42.6 hr  ← double-counted
PERT × ADHD Tax critical-path sequential: 10.6 hr   ← double-counted
4-parallel wall-clock: ~17.4 hr                     ← double-counted
```

Cause of error: PERT "Realistic" already conservative; ADHD Tax × 2 layered on top inflated total ~2-3×. Bean's directive 2026-05-21: stop inflating; default LOW; Sonnet mechanical baseline ~5 min.

**4 parallel sessions:**
- Session A: 0.5 + 1 + 4 = 634 min (10.6 hr)
- Session B: 2 + 3 = 224 min (3.7 hr)
- Session C: 5a + 5b = 1041 min (17.4 hr) ← **BOTTLENECK**
- Session D: 6 + 7 = 658 min (11 hr)

Wall-clock = max(A, B, C, D) = **~17.4 hr** (Session C dominates due to Phase 5b's ×3 ADHD tax).

## Key insight — Phase 5b is the bottleneck

Phase 5b alone is 14.9 hr (ADHD tax ×3 because Customiser architecture is genuinely creative + WP 7.0 button-property coverage uncertainty). If Phase 5b is **descoped or split into a standalone multi-week project**, the remaining 7 phases (with 4 parallel sessions) finish in **~10.6 hr wall-clock**.

Live-correctness critical path (Phases 0.5 + 1 + 3 + 5a — closes all user-visible bugs from this session's debugging):
- Raw PERT: **~5.5 hr**
- With ADHD tax: **~11 hr**
- Closes hero CTAs empty bug, wrong-variation-active bug, INNER_BLOCK_PATTERNS hardcoding — without touching the Customiser work

## Calibration anchors used

- Wave 2 implementer subagent: 60 min est, 45 min actual (1.3× efficient)
- Phase 0 implementer subagent: 85 min est, 20 min actual (4× efficient — pure data work)
- Decision 24 research subagent: 30-45 min est, ~30 min actual (on target)
- /qc-council 3-rater panel: ~5-10 min wall-clock

**Pattern:** Sonnet implementer on mechanical work (data seeding, code transformations) finishes 2-4× faster than initial estimates. Sonnet on novel design work runs closer to estimate.
