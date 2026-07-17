# Pipeline Root-Gap Council — Evidence Pack

**Date:** 2026-05-20
**Mockup:** Mama's Munches homepage (`sites/mamas-munches/mockups/homepage/index.html`)
**Live canary:** Page 144 on sandybrown — `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`
**Pipeline run dir:** `pipeline-state/mamas-munches-homepage-2026-05-19-170523/`
**End goal:** ≤ 1% pixel-diff per section regardless of pattern / blocks / nesting / attribute-slot diversity, **for ALL future clones** (universal solution, not Mama-specific patches).

---

## TL;DR (Opus pre-analysis — to be confirmed, refuted, or extended by council)

The framework is structurally sound (cv2 universal-extraction shipped, Rosetta Stone 100%, dynamic blocks deployed). The pipeline runs cleanly with **zero errors, zero warnings, zero chrome-skip events**. Stage 10 successfully patches page 144. Yet every section fails per-section cropped pixel-diff by 25-99×.

**Headline correlation:** sections with more `extraction_failed` entries have worse pixel-diff. Tight, monotonic.

| Section | extraction_failed count | Best pixel-diff (across 3 viewports) |
|---------|------------------------|--------------------------------------|
| trust-bar | 14 | **24.7%** (768) |
| featured-product | 78 | 66.1% (768) |
| hero | 142 | 96.3% (768) |
| gift-section | 165 | 67.3% (375) |
| brand | 191 | 46.1% (768) |
| ingredients-section | 245 | **30.8%** (1440) |
| social-proof | 262 | 88.8% (375) |

Even the best section (trust-bar at 24.7%) is **25× over** the 1% target. Top failing slots are foundational primitives: `letterSpacing`, `textTransform`, `fontFamily`, `fontSize{Mobile,Tablet}`, `borderRadius*`, `boxShadow`, `padding*`, `margin*`, `customWidth`. When these don't lift, sections render with default block styling — visually that produces ~99% mismatch (every pixel different from mockup).

## Council question (binding)

> What's preventing this pipeline from hitting ≤ 1% pixel-diff per section consistently, and what would unlock that for **ALL future clones** — not just Mama's? Identify ROOT CAUSES (not symptoms) and propose UNIVERSAL fixes (not per-section patches).

Each rater produces a gap register with rows of shape:

```json
{
  "issue": "one-line plain-English problem statement",
  "root_cause_class": "converter | theme | template-part | block | DB | orchestration | measurement",
  "severity": "critical | high | medium | low",
  "evidence_file_line": "path/to/file:LINE-or-jsonl-event-shape",
  "proposed_fix": "universal sketch — one paragraph, no code",
  "cross_pattern_impact": "explanation of why this compounds across patterns/blocks/nesting/slots",
  "confidence": "0.0-1.0"
}
```

---

## Pipeline summary

```
[stage-1] voter: 9 boundaries, primary convention=sgs-prefixed-bem
[stage-2] confidence-matrix top: core/group (conf=0.10) across 9 sections
[stage-3] slot list: 186 slots across 9 sections
[stage-4-8] extract: 386 attrs extracted
[stage-9] leftover entries: 1102 across 3 buckets
[stage-9c] surfaced logs: chrome_skip=0 errors=0 warnings=0 -> summary.log
[stage-10] deploy: patched page 144
```

**Critical numbers:**
- Stage 3 finds **186 slots**.
- Stage 4 extracts **386 attrs**.
- Yet leftover-buckets shows **1097 `extraction_failed`** entries (reason: "no value extracted").
- That math implies Stage 9 sees a much wider attribute surface than what Stage 3 surfaced. Where does the 1097 come from? Likely from Stage 5/6/7 cross-checking against the full `block_attributes` table (1755 rows) and flagging every block-attribute slot that has no value as a "miss".

## Leftover-buckets summary

```
unrecognised_class: 0
unrecognised_section: 2     # header + footer (correct — chrome-skipped)
extraction_failed: 1097
animation_unclassified: 0
structural_mismatch_or_orphan: 0
chrome_skipped: 0
cv2_handled_no_top_level_match: 3
```

**Top 10 failing slots (across all sections):**
| Slot | Failures |
|------|---------|
| letterSpacing | 18 |
| textTransform | 18 |
| hoverScale | 16 |
| backgroundColour | 13 |
| fontFamily | 12 |
| fontSizeMobile | 12 |
| fontSizeTablet | 12 |
| letterSpacingUnit | 12 |
| textDecoration | 12 |
| borderRadius{TL,TR,BL,BR} | 11 each |

Every failure has reason **"no value extracted"** — Stage 3 flagged a slot from the role-template DB lookup, but Stage 4 cv2 walker didn't lift a value for it.

## Trace events (cv2 walker telemetry, --debug-trace ON)

Total trace events across all 9 boundaries:

| Stage | Count |
|-------|-------|
| attr_skipped | 425 |
| walker_branch_taken | 55 |
| core_style_lifted | 48 |
| db_lookup_miss | 33 |
| css_decl_skipped | 20 |
| primary_class_picked | 2 |

**attr_skipped reasons:** 420 `value_empty` + 5 `array_no_pattern_match`.

**`css_decl_skipped` reasons (smoking gun #1 and #2):**

```json
// Smoking gun #1 — DOM/CSS class drift
{"stage": "css_decl_skipped", "target_block": "core/heading", "css_prop": "*",
 "reason": "no_sgs_bem_class_on_node", "boundary_id": "b4"}

// Smoking gun #2 — incomplete core-style-map
{"stage": "css_decl_skipped", "target_block": "core/paragraph", "css_prop": "margin",
 "reason": "not_in_core_style_map", "boundary_id": "b4"}
{"stage": "css_decl_skipped", "target_block": "core/paragraph", "css_prop": "max-width",
 "reason": "not_in_core_style_map", "boundary_id": "b4"}
```

**`db_lookup_miss` events (smoking gun #3 — slot_synonyms gaps):**

```json
{"stage": "db_lookup_miss", "lookup": "canonical_slot_for", "token": "price-row"}
{"stage": "db_lookup_miss", "lookup": "canonical_slot_for", "token": "price-note"}
{"stage": "db_lookup_miss", "lookup": "canonical_slot_for", "token": "card-tag"}
{"stage": "db_lookup_miss", "lookup": "standalone_block_for", "canonical_slot": "text"}
```

**Trace instrumentation gap:** `db_lookup_miss` events emit different field shapes depending on the lookup type. Some have `miss_type` field, some have `lookup` + `token`, some have `lookup` + `canonical_slot`. A simple aggregator counting `miss_type` returns "33 of ?". Council should flag this as a trace-completeness issue (not the primary problem, but visibility into root causes is impaired).

## attribute_gap_candidates DB (sgs-framework.db)

Table `attribute_gap_candidates` has 1009 rows already — accumulated from previous runs. Top 10 by block:

```
 87  sgs/button :: new-canonical-slot-needed
 72  sgs/text :: new-canonical-slot-needed
 65  sgs/quote :: new-canonical-slot-needed
 52  sgs/heading :: new-canonical-slot-needed
 38  sgs/post-grid :: new-canonical-slot-needed
 36  sgs/container :: new-canonical-slot-needed
 33  sgs/mobile-nav :: new-canonical-slot-needed
 29  sgs/hero :: new-canonical-slot-needed
 25  sgs/media :: new-canonical-slot-needed
 21  sgs/trustpilot-reviews :: new-canonical-slot-needed
```

Every row's `proposed_action` is `new-canonical-slot-needed` — the recogniser keeps flagging the same gap class without resolution. This is a backlog of unmet canonical-slot needs, not a resolved-issue history.

## Pixel-diff matrix (cropped per section)

CSV: `reports/2026-05-20-pipeline-root-gap-council/pixel-diff-matrix.csv`

All 21 cells captured; selectors confirmed matched (per-section cropped dimensions vary correctly per section/viewport). Zero "falling back to full page" warnings.

| section | 375x812 | 768x1024 | 1440x900 |
|---------|---------|----------|----------|
| hero | 98.6% | 96.3% | 99.1% |
| brand | 57.1% | 46.1% | 64.4% |
| social-proof | 88.8% | 99.5% | 99.9% |
| ingredients-section | 75.1% | 62.7% | 30.8% |
| gift-section | 67.3% | 90.2% | 88.4% |
| featured-product | 76.0% | 66.1% | 81.0% |
| trust-bar | 34.3% | 24.7% | 31.9% |

**Cropped screenshot dimensions** (proves selector match worked):
- hero 1440: mockup 1440x720 / SGS 1408x761
- trust-bar 1440: mockup 1440x88 / SGS 1200x93
- social-proof 1440: mockup 1440x533 / SGS 1200x614

SGS widths at 1440 are 1200px (theme constrained-layout content width) vs mockup at 1440 / 1000. The width mismatch contributes but isn't the whole story — even at sections where heights nearly match (hero), pixel-diff is 99%.

## Binding rules (do not violate during analysis)

1. **`leftover-buckets.json` is the primary classification source** (blub.db row 254). Don't conjecture about converter quality without citing this file.
2. **Multi-rater /qc panel before commit** (blub.db row 255) — that's why we're 5 raters.
3. **Per-section cropped pixel-diff** is the closure unit (blub.db row 256). Full-page is noise.
4. **Schema enumeration before any "missing X" claim** (blub.db row 272). Run `python ~/.claude/hooks/wp-blocks.py dump` first.
5. **Header + footer are template parts, not blocks** (blub.db row 274). Any finding suggesting `sgs/header` or `sgs/footer` Gutenberg blocks: REJECT, route to Spec 17 §S1-2.
6. **No per-block legacy** — fix universal extraction primitives, never port section-specific logic.
7. **`/sgs-clone` Stage 4 lift uses cv2's slot-aware DOM walker** at `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` + `__init__.py`. Stage 3 slot_list comes from `plugins/sgs-blocks/scripts/orchestrator/slot_list.py` (DB-driven). The mismatch between Stage 3's slot list and Stage 4's actual lifts is the universal gap surface.

## Key files to read (for citation)

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — cv2 walker + style lifting
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` — cv2 dispatch + section className guarantee
- `plugins/sgs-blocks/scripts/orchestrator/slot_list.py` — Stage 3 slot enumeration
- `plugins/sgs-blocks/scripts/orchestrator/sgs-clone-orchestrator.py` — overall sequencing
- `pipeline-state/mamas-munches-homepage-2026-05-19-170523/` — all artefacts (trace, slot-list.json, extract.json, leftover-buckets.json, summary.log)
- `reports/2026-05-20-pipeline-root-gap-council/` — pixel-diff matrix + this evidence pack
- `theme/sgs-theme/styles/mamas-munches.json` — client style variation (where lifted client widths land)
- `theme/sgs-theme/styles/mamas-munches.css` — Stage 0.7 css-lift output (23,038 chars from mockup)

## Deliverable

A markdown file at `reports/2026-05-20-pipeline-root-gap-council/rater-<your-id>.md` with:

1. Gap register (3-10 rows of the JSON shape above)
2. Top 3 root gaps with confidence ≥ 0.7
3. Categorisation per gap: converter / theme / template-part / block / DB / orchestration / measurement
4. Universal-fix sketch per gap (one paragraph, no code)
5. Explicit confirm-or-refute on the 3 Opus pre-analysis hypotheses above (smoking guns #1, #2, #3)
6. Any 4th-or-beyond root cause you find that wasn't in the pre-analysis

**Do NOT propose per-section patches. Universal-extraction principle is binding.**
