---
doc_type: archived-plan
project: small-giants-wp
phase: phase-1-universal-extraction
generated: 2026-05-25
archived: 2026-05-26
superseded_by: .claude/plans/2026-05-26-phase-1-spec-22-implementation.md
status: superseded
supersedes: .claude/plans/archive/2026-05-24-phase-1-structural-recovery-superseded-by-phase-1-universal-extraction.md
canonical_register: .claude/reports/2026-05-25-qc-council-issue-register.md
primary_goal: Cloning pipeline delivers ≤30% pixel-diff per body section × 3 viewports for all 7 body sections (Phase 1 gate). Phase 1.5 then closes to ≤1% per-section. Phase 2 (header/footer) opens after.
empirical_baseline: pipeline-state/mamas-munches-homepage-2026-05-25-101222/stage-11-pixel-diff.json (mean 63.2%)
archival_note: |
  SUPERSEDED 2026-05-26 by .claude/plans/2026-05-26-phase-1-spec-22-implementation.md.
  The Spec 22 canonical phase plan absorbs this plan's scope and recalibrates against
  council findings (acceptance gate ≤5% Phase 1 / ≤1% Phase 1.5 stretch; cross-doc
  sync as Commit 0.0 gate; 5-commit walker rewrite cadence per R-22-5).
---

# Phase 1 — Universal-extraction backbone

## Status

NOT STARTED. Plan validated by `/qc-council` on 2026-05-25 with verdict CONDITIONAL APPROVE pending F1 spike (Commit 7 below) before full dispatch.

## Pre-conditions

Before starting Phase 1 work the next session MUST confirm:

1. **Empirical baseline read** — `pipeline-state/mamas-munches-homepage-2026-05-25-101222/` exists; `stage-11-pixel-diff.json` mean = 63.2%; per-section/viewport numbers match the acceptance-gate table below. Re-run `/sgs-clone --deploy-target page:144 --debug-trace` if baseline is stale (older than the F1 spike commit).
2. **Canonical docs read** — Section R + Section Q + Section P of `.claude/reports/2026-05-25-qc-council-issue-register.md`; Spec 16 §FR1+§FR4+§14+§15; Spec 21; cloning-pipeline-flow + cloning-pipeline-stages.
3. **DB integrity check** — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` returns 69 blocks (all dynamic), 2246 attributes, 89 slot_synonyms rows, 19 modifier_suffixes rows.
4. **Branch on `main`** — Phase 1 work commits to main per project CLAUDE.md branch discipline (core SGS framework changes).
5. **Build clean** — `cd plugins/sgs-blocks && npm run build` exits 0.
6. **Sandybrown canary reachable** — page 144 `/rc-fix-verification-mamas-munches/` returns 200 via WP REST API check.

## Parking lot

Items surfaced during Phase 1 that don't belong in the active step sequence — captured here so they don't get lost (move closed items to `.claude/parking.md` archive at Phase close):

(empty at phase start — add entries as they surface during execution)

## What this phase does (one paragraph)

Builds the universal-extraction architectural backbone for the cloning pipeline. Every BEM-class div in any mockup becomes its own emitted block, nested as the mockup nests them (per Spec 16 §15 line 990). Empty `InnerBlocks` arrays fall back to walking direct child div + semantic-tag descendants. The `ATOMIC_TAG_MAP` becomes DB-driven via `blocks.replaces` so bare HTML tags route to their SGS replacement (e.g. `<p>` → sgs/text, not core/paragraph). Hardcoded cheats in `convert.py` + `css_router.py` (20 catalogued in Section Q of the register) are removed throughout the phase — independents in Phase 0 sub-steps, F1-entangled ones at the start of their relevant Phase 1 sub-task. Acceptance is per-section ≤30% × 3 viewports across all 7 body sections.

## Canonical references (read in order before starting)

1. `.claude/reports/2026-05-25-qc-council-issue-register.md` — full evidence base (~110 items). Section R = consolidated plan; Section Q = 20-cheat inventory; Section P = 27 binding design principles; Section J = methodology lessons; Section L15 = hero-not-clean-baseline truth.
2. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — §15 universal walker spec; §FR1/FR2/FR3/FR4 routing topology; §14 G1-G5 gaps + closure status.
3. `.claude/cloning-pipeline-flow.md` + `.claude/cloning-pipeline-stages.md` — stage map.
4. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefacts per Spec 21.
5. `pipeline-state/mamas-munches-homepage-2026-05-25-101222/` — empirical baseline: summary.log, trace.jsonl, leftover-buckets.json, stage-11-pixel-diff.json, extract.json.
6. Recent feedback files in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/` — start with `feedback_phases_never_ship_as_single_commits.md` (blub.db 288).

## Binding rules (every commit obeys all 27 of these)

Per `.claude/reports/2026-05-25-qc-council-issue-register.md` Section P. Highlights gating every commit:

- **P1** — Universally-applicable mechanisms; no per-block hyperfocus
- **P7** — Empty InnerBlocks array → walk direct child div descendants (the architectural primitive)
- **P15** — All div classes are blocks; just some are nested inside others
- **P17** — Pipeline must achieve ≤1% deterministically; allowed manual work = block functionality extension + pipeline scripts only
- **P18** — Universal flat-scanning preserves hierarchy/nesting + accurately assigns CSS rules and content to direct owner
- **P20** — One fix at a time with /verify-loop
- **P26** — Don't agree, disagree, or propose without evidence. Find it first.
- **D73 (blub.db 288)** — Phases never ship as single commits

## Commit cadence (~17 commits; multi-rater /qc-council between high-leverage commits)

Each commit follows the cadence:
1. **Implement** (via `/subagent-driven-development` for non-trivial work; model picked via `/delegate`)
2. **Pre-commit gate** (`/qc-council` for high-leverage commits marked ⚡; `/qc-inline` for low-risk)
3. **Living-docs updates** per trigger table (architecture.md / decisions.md / mistakes.md / parking.md / specs/16 / cloning-pipeline-*.md)
4. **Measurement**: `/sgs-clone --deploy-target page:144 --debug-trace` + Stage 11 pixel-diff capture
5. **Commit message** citing predicted vs actual delta from the experiment frame
6. **`/verify-loop`** 2-attestation per load-bearing claim

### Phase 0 (independent cheats — parallel-safe, low regression risk)

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 1 | **0E independent cheats (Q6+Q7+Q8+Q9+Q10+Q11+Q12+Q16+Q17)** — DB-data migrations + delete; pure-dead-code Q16+Q17 first | Haiku via `/delegate` (mechanical) | `/qc-inline` per file; `/sgs-clone --debug-trace` post-commit | Aggregate mean ±2pp (no architectural change) | LOW |
| 2 | **0A stale doc claims** | Haiku via `/delegate` | `/qc-inline`; `/docscore` | No pipeline effect | LOW |
| 3 | **0C hooks completion + role='content' sync** (existing Step 1.9.A + 1.9.B) | Sonnet via `/delegate` (data layer) | `/sgs-update` Stage 1; `/qc-inline` | No pipeline effect | LOW |
| 4 | **0D 9 NULL canonical_slot array attrs** (existing Phase 1 follow-on F2) | Sonnet | `/qc-inline`; sgs-db verification | Cross-client coverage improves | LOW |
| 5 | **0B allowed-nesting AUTO-DERIVED** from `block_attributes` (array-typed attrs) + `slot_synonyms.standalone_block` + `block_capabilities` — NOT hand-curated per R1. Output: new `block_allowed_children` DB structure populated by /sgs-update Stage 1. | Sonnet via `/subagent-driven-development` | `/qc-inline`; sgs-db verification; `/qc-council` ⚡ pre-commit (HIGH leverage — F1 depends on this) | DB structure ready for F1 | MEDIUM |
| 6 | **0E remainder: Q1+Q2 hero per-slug guard removal** + slot_synonyms split-image rows + modifier_suffixes hero variant rows | Sonnet | `/qc-inline`; `/sgs-clone --section "section.sgs-hero" --debug-trace`; **attribute-count parity check on hero** (per R4 mitigation — NOT just pixel-diff) | Hero unchanged ±2pp; attr-count == pre | MEDIUM |

### Phase 1 (universal-extraction architectural backbone)

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 7 | **F1 SPIKE FIRST** — minimal F1 fallback at `convert.py:1430` on brand only. Implement universal-walk over direct child elements when `_db_children(parent_slug)` returns empty. Measure pre/post per-section. **HARD GATE: if brand doesn't drop ≥20pp at 1440, halt and re-investigate diagnosis before full Phase 1 dispatch.** | Inline (no dispatch — single-section validation) | `/sgs-clone --section "section.sgs-brand" --debug-trace`; per-section pixel-diff capture | Brand 1440: 50.0% → ≤30% | ⚡ HIGH (this is THE pre-dispatch gate per blub.db row 276) |
| 8 | **1A reading discipline + Hidden-Decisions peer review** — every implementer reads canonical references (above); dispatch 2 cold raters pre-Phase-1 per existing Step 1.4 | Inline + 2 cold raters (Sonnet + Haiku via `/dispatching-parallel-agents`) | `/subagent-prompt`; `/qc-inline` | No code; gate for Commit 9 | LOW |
| 9 | **1B F1 full fallback + DB-driven ATOMIC_TAG_MAP via `blocks.replaces`** (extends to `<a>`, `<button>`, `<ul>`, `<ol>`, `<blockquote>`, `<figure>`) + **scope-guard for Stage 2 recogniser boundary** (per R2 mitigation — only fires inside pattern scope, not on out-of-scope WP content). **Cheats removed at commit start: Q14 ATOMIC_TAG_MAP, Q15 per-target-block emit chain.** | Sonnet via `/subagent-driven-development` (one implementer + 2 reviewers) | `/qc-council` ⚡ pre-commit (multi-rater); `/verify-loop`; `/sgs-clone --debug-trace` full Stage 11 | Brand drops ≥15pp; trust-bar drops ≥10pp; hero stays ±2pp | ⚡ HIGH |
| 10 | **1C universal child-block extraction** — generalise sgs/button + sgs/info-box per-block branches at `convert.py:1532+1550`. **Cheat removed at commit start: Q4 `_lift_inner_block_attrs` per-block branches.** Universal walker uses slot_synonyms + 0B allowed-nesting data. | Sonnet via `/subagent-prompt` cold prompt | `/qc-council` ⚡; attribute-count parity vs pre-commit on sgs/button + sgs/info-box | feature-grid/multi-button sections drop ≥5pp; no regression on existing button/info-box attrs | ⚡ HIGH |
| 11 | **1D universal array-attr extraction** — replace `ARRAY_LIFT_PATTERNS` dict at `convert.py:1008-1030` with DB-driven recipes. Use universal COUNT-children-by-slug for star ratings (NOT a "special extractor kind" per R1). **Cheat removed at commit start: Q3 ARRAY_LIFT_PATTERNS.** | Sonnet via `/subagent-driven-development` | `/qc-council` ⚡; social-proof per-section measurement | social-proof drops ≥10pp (testimonial-slider correctly fills) | ⚡ HIGH |
| 12 | **1E G3 visual + structural slot extraction** — Stage 3 + walker recurse into each emitted child block's class → look up `property_suffixes` → lift visual CSS into typed attrs on the CHILD block. Closes residual ~33 visual-only-slot failures per D71. | Sonnet | `/qc-council` ⚡; leftover-buckets.json diff (extraction_failed count drops); per-section measurement | hero stage_3_slot_list failures: 142 → <50; mean pixel-diff drops further | ⚡ HIGH |
| 13 | **1F G1 OPEN-block emission for FR1-matched composite blocks** — extends pattern from sgs/hero to every composite (per P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES). | Sonnet via `/dispatching-parallel-agents` (parallelisable across composites) | Playwright MCP for live-page CTA verification; `/qc-council` ⚡ | trust-bar drops ≥10pp; hero CTAs verified rendering | ⚡ HIGH |
| 14 | **1G G5 per-block DOM fixes — CONDITIONAL** (only fires if post-1B/1C/1E measurement shows specific blocks didn't dissolve per Spec 16 §15 line 982). | Sonnet via `/dispatching-parallel-agents` per-block (different files, no overlap) | `/qc-council` per block; per-section measurement | Determined empirically per surfaced block (named in commit message); CONDITIONAL on prior commit results | MEDIUM |
| 15 | **1H sgs/quote render.php migration to OPEN-InnerBlocks** (β-path) + **deprecated.js v1** + PHP test per R2 HIGH risk mitigation. sgs/label STAYS self-closing (leaf block — verified `parent_block IS NULL` + 22 single-value attrs). | Sonnet via `/subagent-driven-development` | `/qc-council` ⚡; `BlockDeprecationsTest.php` passes; production-content snapshot check pre-merge | Brand drops ≥10pp further (sgs/quote OPEN with InnerBlocks children renders body text) | ⚡ HIGH |
| 16 | **1I populate `patterns.block_composition`** from F1 + 0B discoveries (auto-discovered, NOT manual seed). | Haiku via `/delegate` (mechanical data) | sgs-db verification | DB rows populated; future fast-path enabled | LOW |
| 17 | **1J pattern fast-path extension** — Stage 2 consults `patterns.slug` for FR1 branch (b). **Framework-prefix verification per R4** — ensure `sgs/framework-*` or `sgs/<role>-<client>` shape, not bare half-made patterns. | Sonnet via `/subagent-prompt` | `/qc-council` ⚡; `/sgs-clone --dry-run` for routing audit | FR1 hit rate increases on registered patterns; no double-emission | MEDIUM |
| 18 | **1K delete dead code Q19+Q20** — gated on `trace.jsonl` showing zero `composite_element_flatten` + `essence_match_double_attribution` firings across all 9 sections. | Haiku via `/delegate` (deletion only) | trace.jsonl grep verification; `/qc-inline` | LOC -200 to -500; no behavioural change | LOW |
| 19 | **1L Combined `/qc-council` Stage 5 + `/handoff` close-out** — multi-rater verification on full Phase 1 diff; Phase 1 acceptance gate evaluation; `state.md` → "phase-1.5-residual-closure". | Inline + multi-rater council | `/qc-council`; `/handoff`; living-docs update across 7+ docs | All 7 body sections × 3 viewports ≤30%; no section regresses >5pp from Phase 0 end | ⚡ HIGH (gate evaluation) |

## Phase 1 acceptance gate

**Per-section ≤30% × 3 viewports for all 7 body sections (21 cells must each hit ≤30%).**

Per blub.db row 288 — averaging doesn't hide hidden failures. Each cell measured independently against 2026-05-25 baseline:

| Section | 375 baseline | 768 baseline | 1440 baseline | Target |
|---|---|---|---|---|
| hero | 86.5% | 64.1% | 69.6% | ≤30% × 3 |
| trust-bar | 37.0% | 24.6% | 33.1% | ≤30% × 3 |
| featured-product | 70.4% | 58.7% | 81.9% | ≤30% × 3 |
| brand | 73.8% | 59.4% | 50.0% | ≤30% × 3 |
| ingredients-section | 53.2% | 41.4% | 53.9% | ≤30% × 3 |
| gift-section | 55.2% | 44.8% | 47.5% | ≤30% × 3 |
| social-proof | 75.2% | 80.1% | 60.2% | ≤30% × 3 |

Plus: NO section regresses >5pp from baseline; ≥5 of 7 sections drop ≥10pp; hero attribute-count parity maintained across Phase 0 cheat removal.

## Phase 1.5 (subsequent phase — not in scope here)

Once Phase 1 hits per-section ≤30% × 3 viewports, Phase 1.5 closes residual diff section-by-section to ≤1%. Scope determined empirically by Phase 1 end-results. Likely Phase 1.5 candidates per R3 council: F5 D1 media-field responsive flow, P-INGREDIENTS-1440-REGRESSION root-cause, UTF-8 mojibake fix, border-style enum parity, cross-client generalisation (Indus Foods / helping-doctors). DO NOT pre-plan; wait for Phase 1 measurements.

## Pre-empts (carried from existing Phase 1 plan, per Step 1.4 Hidden Decisions)

1. **FR1 pattern-match conflicts with composite-block-match on same slug** → composite block wins.
2. **Walker pre-pass changes attr counts but Stage 11 regresses** → walker is structural primitive; debug downstream gap, don't revert.
3. **Two per-block G5 fixes touching same file** → sequentialise.
4. **Agent attempts commit despite Binding A** → revert + capture as structural enforcement gap.
5. **Commit 9 F1 fallback breaks current FR1 fast-path (hero conf=1.0)** → STOP, do not commit. F1 must check `if not result_blocks and not _is_fr1_matched_composite(parent_slug)`.
6. **G5 per-block fixes blow universal-extraction discipline** → G5 touches render.php only, walker stays universal per blub.db row 269.

## Dispatch bindings (verbatim in every Agent cold prompt)

Per `feedback_dispatched_agents_no_commit_authority.md` (blub.db row 240):

- **Binding A — NO commit authority.** Agent returns uncommitted artefacts.
- **Binding B — `/sgs-clone` per sub-change** (NOT bundled). Stage 11 auto-captures.
- **Binding C — Living-docs + /capture-lesson inline per change.** Update mistakes/decisions/parking/cloning-pipeline-flow/architecture as work fires.
- **Binding D — TodoWrite breakdown + per-sub-task status.**

## What success looks like (one line)

After Phase 1 close: every body cell on Stage 11 measures ≤30%, the universal-extraction architectural backbone is shipped without per-block special-cases, all 20 catalogued cheats (Section Q) are removed, and the canonical worked example (brand sgs/quote → OPEN with 3 nested core/paragraph children) renders correctly on the live page.
