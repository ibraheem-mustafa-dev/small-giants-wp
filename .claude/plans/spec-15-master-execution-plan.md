---
doc_type: master-execution-plan
parent_spec: .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
project: small-giants-wp
title: Spec 15 — Master Execution Plan (Phases 1–5)
session_date: 2026-05-12
status: APPROVED — execution starts next session
recommended_model_session_default: opus (architectural judgement at phase transitions); steps explicitly dispatch to lower-cost models per the per-step assignment
---

# Spec 15 Master Execution Plan

Synced phase-by-phase build plan for the unified architecture defined in `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`. Phase 6 (cross-platform output extension) is deferred per spec — planned at the end of Phase 5.

## Global rules

| Rule | What it means |
|---|---|
| **Inline = main thread** | Opus 4.7 in the conversation. Used for architectural decisions, destructive operations, novel design, debugging, anything Bean needs to see live. |
| **Sonnet subagent** | Mechanical code-gen with judgement (parsing, refactoring, structured authoring). Dispatched via Agent tool with model=sonnet. |
| **Haiku subagent** | Deterministic classification, schema validation, formatting, sanity checks. Fast + cheap. |
| **Cerebras** | Small bounded code-gen tasks (single function, single file). FREE. 12 tool-round ceiling, 16K output cap — keep tasks bounded. |
| **Gemini Flash** | Persona panels, breadth reviews, multi-rater QC, large-file reads (1M context). FREE. |
| **Gemini Pro** | EXCLUDED currently per /delegate canon (503 retry loop). Skip until upstream fix. |
| **Strategic work stays inline** | gap analysis, synthesis, spec rewrites, research decisions, strategic planning — never delegated. |
| **/delegate before every dispatch** | Skill-tool call returns model + fallback chain + requires block. Honour returned answer. |
| **Pre-commit QC after every phase** | Multi-rater panel (Haiku + Sonnet + Gemini Flash) via /qc. Phase 5 sub-phases each get their own QC. |
| **Branch discipline** | Per CLAUDE.md: framework work (touches plugins/sgs-blocks, theme/sgs-theme, tools/) → feature branch `feat/spec-15-pN-...` + PR. Small fixes → main. |
| **Time estimates low** | Per global rule `time-estimates-default-low`. Quote smallest plausible figure. Recalibrate downward when steps finish 3× faster. |

## Phase 1 — Foundation (~6 hr)

**Goal:** Behavioural analyser, three new vocabulary tables, block_attributes extended, token value-matcher, default-inheritance lookup. Everything every later phase depends on.

| # | Step | Model | Time | Subagent prompt template |
|---|---|---|---:|---|
| 1.1 | DB schema migration — `CREATE TABLE slot_synonyms / property_suffixes / modifier_suffixes` + `ALTER TABLE block_attributes ADD 6 columns` | **Cerebras** (deterministic SQL, single file) | 15 min | Create `~/.claude/skills/sgs-wp-engine/scripts/migrate-spec-15-p1.py`. Run idempotent ALTER + CREATE per spec 15 §4.3-4.6. Add a `schema_version` row to sgs-framework.db. Output: SQL applied + verification print. |
| 1.2 | Seed `slot_synonyms` (20 rows) + `property_suffixes` (32 rows) + `modifier_suffixes` (16 rows) | **Cerebras** (rote insert from spec §3.4–3.6) | 15 min | Bulk INSERT scripted from spec §3.4 / §3.5 / §3.6 tables verbatim. Idempotent via ON CONFLICT. |
| 1.3 | **Static analyser** — `render.php` + `save.js` parser → per-attribute `output_signature` | **Sonnet** (code-gen with judgement) | 60 min | Create `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py`. For each of 65 blocks: parse render.php (regex for `echo` + `esc_*` + class context) AND save.js (regex for JSX `<element className="...">{attrs.X}</element>` patterns). Emit per-attribute signature JSON matching spec §5.3 schema. Output: `output_signature` column populated on every `block_attributes` row + a per-block coverage report. |
| 1.4 | Backfill `canonical_slot` + `role` + `derived_selector` for all 1343 attrs | **Sonnet** (deterministic logic, decompose name + lookup synonym table) | 30 min | Create `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py`. For each attr: decompose name per spec §3.3 template; look up slot in slot_synonyms; assign role from property_suffixes; derive selector from spec §5.2 formula. Special-case: also ingest seed from v1 `tools/recogniser/data/fingerprints.json` `attr_extractors` where present (10 blocks have rich entries). UPDATE block_attributes. |
| 1.5 | **Token value-matcher** — ΔE2000 colour + percent-deviation spacing | **Sonnet** (numerical implementation, library use) | 45 min | Create `plugins/sgs-blocks/scripts/value-matcher/match.py`. Functions: `snap_color(hex, palette)`, `snap_spacing(px, scale)`, `snap_font_size(px, scale)`, `snap_shadow(value, presets)`. ΔE2000 via `colormath` lib (`pip install colormath`). Confidence tiers per spec §5.4. Self-tests: red/orange snap test, 32px spacing snap test, etc. |
| 1.6 | **Default-inheritance lookup** against `theme.json` `styles.elements` / `styles.blocks` | **Sonnet** (theme.json parser + precedence logic) | 30 min | Create `plugins/sgs-blocks/scripts/value-matcher/inheritance.py`. Function: `inherits_global_default(block_slug, slot, value)`. Reads `theme/sgs-theme/theme.json` via WP-style resolution. Precedence per spec §5.4 + FR35: blocks > elements > root. Self-test: hero h1 colour matches `styles.elements.h1.color`. |
| 1.7 | Unit tests for 1.3 / 1.4 / 1.5 / 1.6 | **Sonnet** (test authoring) | 30 min | Pytest suite at `plugins/sgs-blocks/scripts/tests/test_behavioural_analyser.py`. Coverage: at least 1 happy-path + 1 edge case per function. Target: all green. |
| 1.8 | Commit + push (feature branch `feat/spec-15-p1-foundation`) | **Inline** | 5 min | git checkout -b feat/spec-15-p1-foundation; commit msg per spec; push; gh pr create. |
| 1.9 | **Phase 1 QC** — multi-rater panel | **Gemini Flash ×3 (persona_panel)** + Inline synthesis | 15 min | /qc on the Phase 1 deliverables. Scenarios: schema migration applied cleanly, vocab tables populated, every attr has canonical_slot + role + derived_selector, value-matcher self-tests green, default-inheritance precedence correct. Confirm: zero attrs with NULL canonical_slot (drift validator passes). |

**Phase 1 success criteria** (also in spec §11):
- [ ] 3 new vocab tables exist + seeded
- [ ] `block_attributes` has 6 new columns populated for all 1343 rows
- [ ] Static analyser parses 100% of render.php + save.js
- [ ] Token matcher handles colours / spacing / fonts / shadows with self-tests green
- [ ] Default-inheritance lookup works against theme.json (precedence test green)
- [ ] Commit `feat(spec-15-p1): foundation — vocabulary tables + behavioural analyser` on origin/main (after PR merge)

**Phase 1 dispatch summary:** 2× Cerebras (SQL), 5× Sonnet (code), 1× inline (commit), 1× Gemini Flash panel (QC). Total estimated subagent cost: ~$0.10 (Cerebras + Gemini Flash are free; Sonnet steps ~$0.05 each).

---

## Phase 2 — /sgs-update unified (~2 hr)

**Goal:** `/sgs-update` runs 11 stages in one idempotent pass. Drift validator gates new attributes. Gap detection writes to uimax.

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 2.1 | Add Stage 3 (behavioural analysis) to `update-db.py` | **Sonnet** | 20 min | Wire in the Phase 1 analyser. Idempotent — re-running produces no diffs. |
| 2.2 | Add Stage 4 (canonical assignment) | **Sonnet** | 20 min | Wire in the Phase 1 assign-canonical script. |
| 2.3 | Add Stage 9 (drift validator) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/drift-validator/validate.py`. For each attr in block_attributes, decompose into known canonicals. Report violations. Exit code 1 on --strict flag. |
| 2.4 | Add Stage 10 (gap detection) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/gap-detection/detect.py`. Reads `recognition_log` for `extraction_failed` events. Reads `block_attributes` for NULL canonical_slot. Writes to `attribute_gap_candidates` (uimax FR8 table — schema exists from Spec 14 P2). |
| 2.5 | Update reference doc regen to include canonical vocabulary appendix | **Sonnet** | 15 min | Update `~/.claude/skills/sgs-wp-engine/scripts/regenerate-blocks-reference.py` (or wherever) to append a "Canonical Vocabulary" section to `02-SGS-BLOCKS-REFERENCE.md`. |
| 2.6 | Idempotency test — run `/sgs-update` twice, diff outputs | **Inline** | 5 min | Verify byte-identical re-runs (the regression contract). |
| 2.7 | Commit + push (`feat/spec-15-p2-sgs-update-unified`) | **Inline** | 5 min | Same branch flow as Phase 1. |
| 2.8 | Phase 2 QC | **Gemini Flash ×3 panel** + Inline | 10 min | /qc with scenarios: idempotency green, drift validator reports zero violations on current codebase OR surfaces them, gap detection writes to attribute_gap_candidates. |

**Phase 2 success criteria:**
- [ ] `/sgs-update` runs Stages 1–11 idempotently
- [ ] Drift validator reports zero violations OR surfaces real drift
- [ ] `attribute_gap_candidates` populated where canonical_slot is NULL or signature has no match
- [ ] `02-SGS-BLOCKS-REFERENCE.md` regen includes canonical vocabulary appendix
- [ ] Commit `feat(spec-15-p2): /sgs-update unified pipeline` on origin/main

---

## Phase 3 — Catalogue + extractor rewires (~2 hr)

**Goal:** `extract.py` reads canonical-slot data from sgs-db. Hero override deleted. Spec 14 P3 catalogue scripts retired.

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 3.1 | Update `tools/recogniser-v2/extract.py` dispatcher to read `block_attributes.canonical_slot` / `role` / `derived_selector` directly from sgs-db | **Sonnet** | 30 min | Replace `load_layer3()` + `load_role_templates()` with sgs-db queries. Keep the public function signature stable. |
| 3.2 | Delete `tools/recogniser-v2/overrides/hero.py` + `overrides/__init__.py`'s HERO_OVERRIDE entry | **Inline** (destructive — verify rigorously before delete) | 15 min | Pre-delete: run `--verify-against tests/golden/hero-extraction-baseline.json` (must pass). Then delete. Re-run verify post-delete: hero extraction must STILL pass against baseline using only canonical path. |
| 3.3 | Retire `plugins/sgs-blocks/scripts/fingerprint-builder/` (move to `scratch/retired-by-spec-15-p3/`) | **Cerebras** (mechanical git mv) | 5 min | Includes: build-catalogue.py, qa-gate.py, step2_3_4_layer1_3_4.py, step6_layer3.py, output/*.json. Keep audit-attr-vocabulary scripts (still useful). |
| 3.4 | Verify trust-bar + heritage-strip extraction coverage improves | **Inline** (Playwright + diff) | 15 min | Run extract.py against both sections in Mama's mockup. Expect trust-bar coverage ≥40% (was 27%), heritage-strip ≥30% (was 8%) — actual targets depend on Phase 1's canonical assignment quality. |
| 3.5 | Commit + push (`feat/spec-15-p3-catalogue-rewire`) | **Inline** | 5 min | |
| 3.6 | Phase 3 QC | **Gemini Flash ×3 panel** + Inline | 10 min | /qc scenarios: hero baseline preserved, hero override deleted, fingerprint-builder retired, trust-bar/heritage-strip coverage measurably improved. |

**Phase 3 success criteria:**
- [ ] `extract.py` reads sgs-db (no JSON catalogue file dependency)
- [ ] `overrides/hero.py` deleted; hero extraction via canonical path matches `tests/golden/hero-extraction-baseline.json`
- [ ] Fingerprint-builder retired to scratch
- [ ] Trust-bar + heritage-strip coverage measurably improves
- [ ] Commit `feat(spec-15-p3): catalogue + extractor rewire to canonical slots` on origin/main

---

## Phase 4 — Draft convention enforcement (~3 hr)

**Goal:** Stage 0.1 BEM lint + Stage 0.5 token-usage lint in `/sgs-clone`. Pre-commit hook for drafts. `/innovative-design` updated.

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 4.1 | Implement Stage 0.1 BEM lint | **Sonnet** | 30 min | Add to `/sgs-clone` orchestrator (find existing dispatcher). New module: `plugins/sgs-blocks/scripts/lints/bem-lint.py`. Reads HTML, validates every class against the regex from spec §3.1. Reports violations with line numbers. |
| 4.2 | Implement Stage 0.5 token-usage lint | **Sonnet** | 30 min | Module: `plugins/sgs-blocks/scripts/lints/token-lint.py`. Reads CSS in draft. For each value, calls the Phase 1 value-matcher. Surfaces values that don't snap to any token. Flags as gap candidates. |
| 4.3 | Wire both lints into `/sgs-clone` Stage 0 with `--draft-mode` / `--strict` / `--legacy` flag modes | **Sonnet** | 20 min | Three modes per spec §9: strict halts, draft-mode warns, legacy bypasses. |
| 4.4 | Pre-commit hook | **Cerebras** (bounded — single shell script) | 15 min | Create `.git/hooks/pre-commit` (or use husky-style config). Runs Stage 0.1 + 0.5 on any staged file matching `sites/*/mockups/`. Non-blocking warning by default; strict mode via env var. |
| 4.5 | Update `/innovative-design` skill description to require SGS-BEM + theme.json tokens in output | **Inline** (skill authoring is strategic) | 15 min | Update `~/.claude/skills/innovative-design/SKILL.md`. Add hard rule + reference Spec 15 §3 + §8. |
| 4.6 | Test against Mama's mockup (should pass since spec 13 P6 migrated it) | **Inline** (Playwright + scripted) | 15 min | Run lints; expect zero violations on Mama's mockup. |
| 4.7 | Commit + push (`feat/spec-15-p4-convention-enforcement`) | **Inline** | 5 min | |
| 4.8 | Phase 4 QC | **Gemini Flash ×3 panel** + Inline | 10 min | /qc scenarios: lints reject malformed BEM, accept compliant; token lint snaps known values; pre-commit hook fires; /innovative-design updated. |

**Phase 4 success criteria:**
- [ ] BEM lint + token lint integrated into `/sgs-clone` Stage 0
- [ ] Pre-commit hook fires on `sites/*/mockups/` changes
- [ ] `/innovative-design` skill updated + output verified compliant
- [ ] Mama's mockup passes lints with zero violations
- [ ] Commit `feat(spec-15-p4): draft convention enforcement gates` on origin/main

---

## Phase 5 — Clone pipeline E2E (~8 hr — absorbs Spec 14 P5–P10)

**Goal:** `/sgs-clone` runs end-to-end on Mama's mockup with ≥90% block attribute coverage + ≤1% visual parity diff. Six sub-phases mirror Spec 14's P5–P10.

### Sub-phase 5a — Gap detection (~1 hr)

**Source plan:** `.claude/plans/phase-5-gap-detection.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5a.1 | Gap detection wiring into `/sgs-clone` Stage 9 | **Sonnet** | 30 min | Plan file has detail. Consumes recognition_log + attribute_gap_candidates. |
| 5a.2 | Operator-review interface for surfaced gaps | **Sonnet** | 20 min | Markdown output with proposed_action column + decided_at timestamp. |
| 5a.3 | Commit + QC sub-phase | **Inline** | 10 min | `feat(spec-15-p5-gap-detection): ...` |

### Sub-phase 5b — Staged scaffolding (~1.5 hr)

**Source plan:** `.claude/plans/phase-6-staged-scaffolding.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5b.1 | Staged-output directory + file-naming pattern | **Sonnet** | 20 min | `pipeline-state/sgs-clone/<run-id>/stage-N-*.json` |
| 5b.2 | Per-stage artifact validator | **Sonnet** | 30 min | JSON schema validation between stages. |
| 5b.3 | Resume-flag REMOVED per blub.db row "no-resume-no-stage-resume-in-pipelines" | **Inline** (architectural reaffirm) | 5 min | Verify no `--resume` flag in /sgs-clone. |
| 5b.4 | Commit + QC sub-phase | **Inline** | 15 min | `feat(spec-15-p5-staged-scaffolding): ...` |

### Sub-phase 5c — Lingua-franca (~1.5 hr)

**Source plan:** `.claude/plans/phase-7-lingua-franca.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5c.1 | `/uimax-sgs-scrape-pattern` lingua-franca conversion logic | **Sonnet** | 45 min | Convert source-convention classes (BEM-bare, Tailwind, Bootstrap) to SGS-BEM primary; store source as sibling in equivalent_implementations. |
| 5c.2 | Round-trip test (BEM-bare → SGS-BEM → BEM-bare) | **Sonnet** | 20 min | Verify lossless conversion. |
| 5c.3 | Commit + QC sub-phase | **Inline** | 10 min | `feat(spec-15-p5-lingua-franca): ...` |

### Sub-phase 5d — WP integration wiring (~1.5 hr)

**Source plan:** `.claude/plans/phase-8-wp-integration-wiring.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5d.1 | Block markup serialisation (FR12) | **Sonnet** | 30 min | Output WP block-comment markup with InnerBlocks (existing — Spec 14 P3 partial). |
| 5d.2 | WP-CLI eval-file deployment helper | **Sonnet** | 30 min | Push generated post_content to live site via wp-cli. |
| 5d.3 | Commit + QC sub-phase | **Inline** | 15 min | `feat(spec-15-p5-wp-integration): ...` |

### Sub-phase 5e — Autonomy + visual QA (~2 hr)

**Source plan:** `.claude/plans/phase-9-autonomy-and-visual-qa.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5e.1 | Playwright visual parity QA (Stage 8) | **Sonnet** (CLI script) | 45 min | Multi-breakpoint screenshot capture + diff. Tolerance per spec §7 (1% pass; 0.5–1% regions surfaced). |
| 5e.2 | Visual diff thumbnails for operator review | **Sonnet** | 30 min | Generate side-by-side PNG diffs for surfaced regions. |
| 5e.3 | Autonomy gate — auto-proceed past Stage 8 if diff < 1% AND no critical errors | **Sonnet** | 20 min | Reduces operator decision frequency. |
| 5e.4 | Commit + QC sub-phase | **Inline** | 15 min | `feat(spec-15-p5-visual-qa): ...` |

### Sub-phase 5f — Acceptance harness (~30 min)

**Source plan:** `.claude/plans/phase-10-acceptance-harness.md` (absorbed).

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5f.1 | `critical-fix-verification.py` — 5 canonical-mutation-boundary checks | **Cerebras** (bounded scoped script) | 25 min | Per spec 14 FR18 P1 KJC2 decision. Five checks: no root theme.json mutation, no canonical-block files mutated outside FR21, no licensing strings in uimax writes, idempotency green, staging dir empty post-success. |
| 5f.2 | Run harness E2E against Mama's mockup | **Inline** | 30 min | Full /sgs-clone E2E run. Target: ≥90% block attr coverage + ≤1% visual parity diff at 3 breakpoints. |
| 5f.3 | Commit + Phase 5 final QC | **Inline + Gemini Flash ×3** | 30 min | `feat(spec-15-p5-acceptance-harness): ...` + full /qc panel against the entire Phase 5 deliverable. |

**Phase 5 success criteria:**
- [ ] All 6 sub-phases shipped on origin/main
- [ ] `/sgs-clone` runs E2E on Mama's mockup with ≥90% block attribute coverage
- [ ] Visual parity ≤1% pixel diff at 3 viewports (regions > 0.5% surfaced as thumbnails)
- [ ] Operator interface surfaces ambiguous cases
- [ ] Acceptance harness 5/5 checks green

---

## Subagent prompt templates (pre-written for next session)

These are ready-to-dispatch cold prompts. Each is self-contained — agent has no prior context.

### Template A — Sonnet code-gen with file context

```
You are a cold subagent. Task: <one-line task description>.

Context files to read first (in order):
1. <path 1>
2. <path 2>

Read those files to understand the existing structure + conventions. Then implement <specific function/module>.

Output requirements:
- File at <exact target path>
- Function signature: <signature>
- Behaviour: <bullet list>
- Edge cases: <bullet list>
- Self-tests: at least 1 happy-path + 1 edge case at the bottom of the file under `if __name__ == '__main__':`

Project conventions (read .claude/CLAUDE.md if you need more):
- UK English in comments + strings
- Type hints on every function
- Python 3.13, sqlite3 stdlib, no extra deps unless required (declare via comment)
- No emojis unless asked
- No mocking in tests — real assertions only

When done, run the self-test and confirm it passes. Return the file path + the self-test stdout.
```

### Template B — Cerebras bounded SQL / config

```
You are a cold Cerebras subagent. Task: <bounded task description>.

Read: <input data file path>
Write to: <output file path>

The work is purely mechanical — no judgement needed. Apply the rules below and emit the result.

Rules:
<numbered list of deterministic rules>

Verification: <how to verify the output is correct>

Hard limits:
- Stay under 12 tool rounds
- Output cap 16K tokens
- If you need more rounds, surface the blocker — don't truncate output silently
```

### Template C — Gemini Flash persona-panel QC

```
You are reviewer #<n> on a multi-rater panel. Read this artifact end-to-end:

File: <path>

Grade against these scenarios. Return ONLY valid JSON:

{
  "overall_grade": "pass | partial | fail",
  "confidence": 0-100,
  "scenarios": { ... },
  "concerns": [...],
  "recommendation": "ship | fix-then-ship | hold"
}

<scenarios list with success criteria per scenario>

Be critical. Honest assessment. Diversity of opinion welcome.
```

---

## Cost + duration summary

| Phase | Wall time | Dispatch model spend |
|---|---:|---|
| Phase 1 — Foundation | ~6 hr | ~$0.30 (5× Sonnet steps; Cerebras + Gemini Flash free) |
| Phase 2 — /sgs-update unified | ~2 hr | ~$0.25 (5× Sonnet) |
| Phase 3 — Catalogue + extractor rewires | ~2 hr | ~$0.10 (1× Sonnet + inline destructive) |
| Phase 4 — Draft convention enforcement | ~3 hr | ~$0.20 (4× Sonnet + Cerebras) |
| Phase 5 — Clone pipeline E2E | ~8 hr | ~$0.80 (12-15× Sonnet across sub-phases) |
| **Total Phases 1–5** | **~21 hr** | **~$1.65** |

Phase 6 (cross-platform output) deferred + planned at end of Phase 5.

---

## Next-session entry

1. Re-invoke `/autopilot` first.
2. Read `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (especially §3, §5, §11).
3. Read this plan end-to-end.
4. Start at Phase 1 Step 1.1 (Cerebras SQL migration).
5. Use `/delegate` before each dispatch. Honour returned model.
6. Pre-commit QC after every phase (multi-rater panel via /qc + Gemini Flash).
7. Update `.claude/state.md` current_step after each phase ships.
