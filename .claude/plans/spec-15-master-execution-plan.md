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
| **Branch discipline** | Per CLAUDE.md: framework work (touches plugins/sgs-blocks, theme/sgs-theme, tools/) → feature branch `feat/spec-15-pN-...` + PR. Small fixes → main. |
| **Time estimates low** | Per global rule `time-estimates-default-low`. Quote smallest plausible figure. Recalibrate downward when steps finish 3× faster. |

## Verification discipline (CRITICAL — autonomous execution rule)

The session runs without Bean's input between checkpoints. The blast radius of a bad subagent step compounds. Therefore:

### Rule 1 — Subagent reports are claims, not evidence

> **Never trust a subagent's "I did X and it works" report. After every subagent dispatch, run `/qc-inline` on the actual artefact (file contents, DB row state, test stdout, screenshot) before marking the step complete.**

Examples of independent verification per dispatch type:

| Subagent dispatch produced | /qc-inline verification |
|---|---|
| Cerebras SQL migration | `python -c "import sqlite3; …"` actually queries the table; confirms columns exist + row counts match expected |
| Sonnet wrote a Python module | Read the file. Run its self-test inline. Run a Bean-side smoke test against real data. |
| Sonnet wrote a parser | Feed it 3 real input files. Confirm outputs structurally + content-wise match the spec. |
| Cerebras bulk INSERTs | Re-query the table; confirm row counts; spot-check 3 random rows against source data. |
| Sonnet wrote unit tests | Run pytest inline. Verify exit code 0. Read the test output to confirm tests actually exercise the right code paths (not just smoke). |

If `/qc-inline` finds the subagent's claim doesn't match reality: STOP. Do not advance to the next step. Fix the gap (re-dispatch with refined prompt, or take over inline) before continuing.

### Rule 2 — Inline work gets multi-rater QC before phase advance

> **At the end of every phase, run the full multi-rater `/qc` panel (Haiku + Sonnet + Gemini Flash) against the phase deliverable. Need pass/ship verdict from at least 2 of 3 raters before opening the phase PR or marking complete.**

This catches what one rater (the main thread) misses. Documented this session — Spec 15 v0.1 went from `pass/100` (main-thread-only) to `partial/88` (Sonnet) to `pass/96` (Sonnet, post-fix). The first single-rater score was overconfident.

Cross-model panel composition:
- **Haiku** — fast, lower-rigour sanity check
- **Sonnet** — deepest critic (catches what others miss; this was the one who found the v0.1 issues)
- **Gemini Flash** — third independent rater (free, 1M context; literal-naming bias is a known feature, not a bug)
- Exclude Gemini Pro (503 retry issue)
- Don't include main-thread (biased toward what it wrote)

If the panel finds real issues (≥2 raters agree on a fail): treat as Sonnet-found-real-issues. Apply fixes; re-run the panel; repeat until clean.

### Rule 3 — Stop conditions (halt + surface to Bean)

**Session timer instrumentation (set up at session start):**

```bash
# Record session start so per-step elapsed-time checks are testable
mkdir -p .claude/scratch
date +%s > .claude/scratch/spec-15-session-start.txt
echo "Session start: $(date -Iseconds)" > .claude/scratch/spec-15-session-log.txt
```

For each step, log start + end timestamps + estimated minutes to the session log. The 3× stop condition (below) is then a `now - step_start_ts > 3 * estimated_minutes * 60` check.

The session keeps moving autonomously UNTIL:

1. **Subagent verification fails irrecoverably** (same dispatch fails 2 times with refined prompts) — halt; surface the artefact + error to Bean
2. **Multi-rater QC returns fail/hold from 2+ raters** — halt; surface fail reasons; fix or escalate
3. **Architectural decision needed** (e.g. an attribute name doesn't decompose cleanly + needs a new canonical entry) — halt; surface the case + recommendation; wait for Bean's call
4. **Destructive operation on shared state** (live DB write outside expected path, force-push, deleting a file not in the inventory) — halt; surface intent; wait for explicit go
5. **Pipeline state corruption** (sgs-framework.db lock, /sgs-update partial run that left mixed state) — halt; surface diagnostic; recover before continuing
6. **Step exceeds 3× its estimated time** — recognisable per-step using the session timer above (`now - step_start_ts > 3 * estimated_minutes * 60`). Halt; surface what's stuck; Bean decides continue / pivot / park. Whole-phase doubling is also surfaced but per-step is the leading indicator.

On halt: write a stop-note to `.claude/scratch/spec-15-session-{date}-stop.md` summarising why and what's needed to unblock. Continue with anything that's orthogonal in the meantime.

### Rule 4 — Recovery paths per dispatch type

| Failure mode | Recovery |
|---|---|
| Subagent returns no output / errors out | Retry once with refined prompt (more context, smaller scope). If second attempt fails, take over inline. |
| Cerebras hits 12-tool-round ceiling | Task was too big — split into 2 dispatches OR move to Sonnet. |
| Gemini Flash returns malformed JSON | Re-prompt with explicit JSON-only instruction. If second attempt malformed, count as a vote of "unable to render verdict" — treat as absent rater in the panel. |
| `/qc-inline` discovers structural mismatch (wrong selector, wrong column type, etc.) | Surface the actual vs expected gap; re-dispatch with the diff embedded in the prompt. |
| Multi-rater QC dissent — 1 rater partial, 2 pass | Sonnet's reading wins on the dissent; apply Sonnet's fixes; re-run panel. |
| Test suite green but Bean's eye disputes the output | Per blub.db row 207 `extend-measurement-set-when-human-eye-disputes` — extend measurement set OR pixel-sample before declaring user wrong. |

## Phase 1 — Foundation (~6 hr)

**Goal:** Behavioural analyser, three new vocabulary tables, block_attributes extended, token value-matcher, default-inheritance lookup. Everything every later phase depends on.

**Step 0 (MANDATORY before Step 1.1):** Initialise session timer per Verification Discipline Rule 3. Without this the per-step time-exceeded check (SC6) is structurally unenforceable.

```bash
mkdir -p .claude/scratch
date +%s > .claude/scratch/spec-15-session-start.txt
echo "Session start: $(date -Iseconds)" > .claude/scratch/spec-15-session-log.txt
```

| # | Step | Model | Time | Subagent prompt template |
|---|---|---|---:|---|
| 1.1 | DB schema migration — `CREATE TABLE slot_synonyms / property_suffixes / modifier_suffixes` + `ALTER TABLE block_attributes ADD 6 columns` | **Cerebras** (deterministic SQL, single file) | 15 min | Create `~/.claude/skills/sgs-wp-engine/scripts/migrate-spec-15-p1.py`. Run idempotent ALTER + CREATE per spec 15 §4.3-4.6. Add a `schema_version` row to sgs-framework.db. Output: SQL applied + verification print. **Post-dispatch `/qc-inline`:** query `PRAGMA table_info` for each new table + the extended `block_attributes`; confirm columns + types match spec §4.3-4.6 exactly. Re-run script; confirm zero changes (idempotency). |
| 1.2 | Seed `slot_synonyms` (20 rows) + `property_suffixes` (32 rows) + `modifier_suffixes` (16 rows) | **Cerebras** (rote insert from spec §3.4–3.6) | 15 min | Bulk INSERT scripted from spec §3.4 / §3.5 / §3.6 tables verbatim. Idempotent via ON CONFLICT. **Post-dispatch `/qc-inline`:** `SELECT COUNT(*)` from each — expect 20 / 32 / 16. Spot-check 3 random rows per table against the spec to confirm no transcription errors. Re-run; confirm row counts unchanged. |
| 1.3 | **Static analyser** — `render.php` + `save.js` parser → per-attribute `output_signature` | **Sonnet** (code-gen with judgement) | 60 min | Create `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py`. For each of 65 blocks: parse render.php (regex for `echo` + `esc_*` + class context) AND save.js (regex for JSX `<element className="...">{attrs.X}</element>` patterns). Emit per-attribute signature JSON matching spec §5.3 schema. Output: `output_signature` column populated on every `block_attributes` row + a per-block coverage report. **Post-dispatch `/qc-inline`:** Pick 3 well-known blocks (hero, info-box, trust-bar). For each, read its actual render.php, manually identify the expected output_signature for one attribute, query the DB for what the analyser wrote, diff. Also count: `SELECT COUNT(*) FROM block_attributes WHERE output_signature IS NULL` — should be < 5% (some attrs may legitimately not have a render path). |
| 1.4 | Backfill `canonical_slot` + `role` + `derived_selector` for all 1343 attrs | **Sonnet** (deterministic logic, decompose name + lookup synonym table) | 30 min | Create `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py`. For each attr: decompose name per spec §3.3 template; look up slot in slot_synonyms; assign role from property_suffixes; derive selector from spec §5.2 formula. Special-case: also ingest seed from v1 `tools/recogniser/data/fingerprints.json` `attr_extractors` where present (10 blocks have rich entries). UPDATE block_attributes. **Post-dispatch `/qc-inline`:** `SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NULL` — expect 0. Pick 5 random attrs across different blocks; verify each canonical_slot + role + derived_selector matches what the spec §3.3 + §5.2 rules would produce by hand. Run `audit-attr-vocabulary-v2.py`; confirm zero drift violations after canonical assignment. |
| 1.5 | **Token value-matcher** — ΔE2000 colour + percent-deviation spacing | **Sonnet** (numerical implementation, library use) | 45 min | Create `plugins/sgs-blocks/scripts/value-matcher/match.py`. Functions: `snap_color(hex, palette)`, `snap_spacing(px, scale)`, `snap_font_size(px, scale)`, `snap_shadow(value, presets)`. ΔE2000 via `colormath` lib (`pip install colormath`). Confidence tiers per spec §5.4. Self-tests: red/orange snap test, 32px spacing snap test, etc. **Post-dispatch `/qc-inline`:** Don't trust the self-tests alone. Inline run: 5 colour inputs (3 should snap to primary/accent/text; 2 should flag as gap candidates because they're far from any token); verify confidence values are in correct tiers (1.0 / 0.85 / 0.6); verify gap candidates return `(raw_value, 0.0)`. Same drill for spacing + font-size. |
| 1.6 | **Default-inheritance lookup** against `theme.json` `styles.elements` / `styles.blocks` | **Sonnet** (theme.json parser + precedence logic) | 30 min | Create `plugins/sgs-blocks/scripts/value-matcher/inheritance.py`. Function: `inherits_global_default(block_slug, slot, value)`. Reads `theme/sgs-theme/theme.json` via WP-style resolution. Precedence per spec §5.4 + FR35: blocks > elements > root. Self-test: hero h1 colour matches `styles.elements.h1.color`. **Post-dispatch `/qc-inline`:** Construct a deliberate precedence test where `styles.elements.h1.color = primary` but `styles.blocks.sgs/hero.heading.color = accent`. Confirm the function returns "use accent" (blocks override elements). Then test the reverse: only `styles.elements.h1.color = primary` defined, no block override — confirm "use primary". Then test root fallback. |
| 1.7 | Unit tests for 1.3 / 1.4 / 1.5 / 1.6 | **Sonnet** (test authoring) | 30 min | Pytest suite at `plugins/sgs-blocks/scripts/tests/test_behavioural_analyser.py`. Coverage: at least 1 happy-path + 1 edge case per function. Target: all green. **Post-dispatch `/qc-inline`:** Run pytest with `-v --cov` flags. Verify exit code 0 AND coverage ≥ 80% on the modules from steps 1.3-1.6. Read test output to confirm tests actually exercise the documented behaviours (not just smoke). |
| 1.8 | Commit + push (feature branch `feat/spec-15-p1-foundation`) | **Inline** | 5 min | git checkout -b feat/spec-15-p1-foundation; commit msg per spec; push; gh pr create. Pre-commit: verify no `.bak` files, no secrets, no oversized binaries staged. |
| 1.9 | **Phase 1 QC — multi-rater panel** | **Gemini Flash ×3 (persona_panel) + Sonnet subagent + Haiku subagent** + Inline synthesis | 20 min | Dispatch the 3-rater panel via `/qc` against the Phase 1 deliverable. Each rater reads the migration + analyser + value-matcher code + the populated DB state. Scenarios: schema applied cleanly (PRAGMA matches spec), 3 vocab tables seeded (counts match), every block_attributes row has canonical_slot populated, value-matcher self-tests pass, default-inheritance precedence test green, unit-test coverage ≥80%, drift validator zero violations. **Gate to advance:** ≥2 of 3 raters return `pass/ship`. If Sonnet (the strict critic) returns `partial`, treat its concerns as real; apply fixes; re-run the panel until clean. |

**Phase 1 success criteria** (also in spec §11):
- [ ] 3 new vocab tables exist + seeded
- [ ] `block_attributes` has 6 new columns populated for all 1343 rows
- [ ] Static analyser parses 100% of render.php + save.js
- [ ] Token matcher handles colours / spacing / fonts / shadows with self-tests green
- [ ] Default-inheritance lookup works against theme.json (precedence test green)
- [ ] Commit `feat(spec-15-p1): foundation — vocabulary tables + behavioural analyser` on origin/main (after PR merge)

**Phase 1 dispatch summary:** 2× Cerebras (SQL), 5× Sonnet (code), 1× inline (commit), 1× Gemini Flash panel (QC). Total estimated subagent cost: ~$0.10 (Cerebras + Gemini Flash are free; Sonnet steps ~$0.05 each).

---

**Note on Phases 2–5:** the per-step `/qc-inline` discipline shown in Phase 1's "Notes" column applies identically to every dispatch in Phases 2–5. Verification is mandatory before advancing — even where the per-step notes don't spell it out explicitly. The "Verification discipline" section above is the source of truth; the Phase 1 detail is the worked example for how to apply it.

## Phase 2 — /sgs-update unified (~2 hr)

**Goal:** `/sgs-update` runs 11 stages in one idempotent pass. Drift validator gates new attributes. Gap detection writes to uimax.

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 2.1 | Add Stage 3 (behavioural analysis) to `update-db.py` | **Sonnet** | 20 min | Wire in the Phase 1 analyser. Idempotent — re-running produces no diffs. **/qc-inline:** read `update-db.py` and confirm the Phase 1 analyser is called inside the run loop with the correct argument order. Run `python ~/.claude/skills/sgs-wp-engine/scripts/update-db.py --dry-run` and assert Stage 3 logs "behavioural analysis" without writing. |
| 2.2 | Add Stage 4 (canonical assignment) | **Sonnet** | 20 min | Wire in the Phase 1 assign-canonical script. **/qc-inline:** confirm Stage 4 runs after Stage 3 + before Stage 5 in the update-db.py main loop. Dry-run as above. Spot-check 3 random `block_attributes` rows; their `canonical_slot` should match what Phase 1 backfilled (no overwrite to NULL). |
| 2.3 | Add Stage 9 (drift validator) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/drift-validator/validate.py`. For each attr in block_attributes, decompose into known canonicals. Report violations. Exit code 1 on --strict flag. **/qc-inline:** run validator on current codebase. Expect zero violations (Phase 1 already populated all canonical_slot values). Manually insert a deliberate violation row into `block_attributes` (e.g. unknown slot `widget`); confirm validator catches it; remove the test row. |
| 2.4 | Add Stage 10 (gap detection) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/gap-detection/detect.py`. Reads `recognition_log` for `extraction_failed` events. Reads `block_attributes` for NULL canonical_slot. Writes to `attribute_gap_candidates` (uimax FR8 table — schema exists from Spec 14 P2). **/qc-inline:** before running, count rows in `attribute_gap_candidates` (expected: 0). Run Stage 10. Count again; expect new rows only if there are genuine gaps. Manually trigger a fake `extraction_failed` log entry; confirm gap-detection picks it up; remove the test entry. |
| 2.5 | Update reference doc regen to include canonical vocabulary appendix | **Sonnet** | 15 min | Update `~/.claude/skills/sgs-wp-engine/scripts/regenerate-blocks-reference.py` (or wherever) to append a "Canonical Vocabulary" section to `02-SGS-BLOCKS-REFERENCE.md`. **/qc-inline:** open the regenerated `02-SGS-BLOCKS-REFERENCE.md`. Confirm "Canonical Vocabulary" section exists with 20 slot synonyms + 32 property suffixes + 16 modifier suffixes listed. |
| 2.6 | Idempotency test — run `/sgs-update` twice, diff outputs | **Inline** | 5 min | Verify byte-identical re-runs (the regression contract). **/qc-inline:** `diff` the two run outputs; expect empty diff. `git diff` after second run; expect empty. |
| 2.7 | Commit + push (`feat/spec-15-p2-sgs-update-unified`) | **Inline** | 5 min | Same branch flow as Phase 1. Pre-commit: verify no `.bak`, `.pyc`, or temp files staged. |
| 2.8 | Phase 2 QC | **Gemini Flash ×3 panel** + Inline | 15 min | Dispatch 3-rater /qc panel (Haiku + Sonnet + Gemini Flash). Scenarios: idempotency green, drift validator zero violations on current codebase, gap detection writes correctly to `attribute_gap_candidates`, `02-SGS-BLOCKS-REFERENCE.md` regen includes vocab appendix, all 11 stages run cleanly in order. Gate: ≥2 of 3 raters pass/ship. |

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
| 3.1 | Update `tools/recogniser-v2/extract.py` dispatcher to read `block_attributes.canonical_slot` / `role` / `derived_selector` directly from sgs-db | **Sonnet** | 30 min | Replace `load_layer3()` + `load_role_templates()` with sgs-db queries. Keep the public function signature stable. **/qc-inline:** read updated `extract.py`; grep for `load_layer3` (should be gone) + new `sqlite3.connect(...)` references. Run `python tools/recogniser-v2/extract.py --mockup sites/mamas-munches/mockups/homepage/index.html --section "section.sgs-hero" --block sgs/hero --media-map sites/mamas-munches/research/sandybrown-media-map.json --verify-against tests/golden/hero-extraction-baseline.json`; expect PASS no-regression. |
| 3.2 | Delete `tools/recogniser-v2/overrides/hero.py` + `overrides/__init__.py`'s HERO_OVERRIDE entry | **Inline** (destructive — verify rigorously before delete) | 15 min | Pre-delete: run hero `--verify-against` (must pass). Then `git rm overrides/hero.py` + edit `__init__.py` to drop the import + registry entry. **/qc-inline:** re-run hero `--verify-against tests/golden/hero-extraction-baseline.json`. MUST pass (canonical path now drives the extraction). If verify fails, IMMEDIATELY `git restore` the deletion — hero override deletion is gated on canonical path proving equivalence. |
| 3.3 | Retire `plugins/sgs-blocks/scripts/fingerprint-builder/` (move to `scratch/retired-by-spec-15-p3/`) | **Cerebras** (mechanical git mv) | 5 min | Includes: build-catalogue.py, qa-gate.py, step2_3_4_layer1_3_4.py, step6_layer3.py, output/*.json. Keep audit-attr-vocabulary scripts (still useful). **/qc-inline:** `ls plugins/sgs-blocks/scripts/fingerprint-builder/` — confirm only the audit scripts remain. `ls .claude/scratch/retired-by-spec-15-p3/` — confirm retired files arrived. |
| 3.4 | Verify trust-bar + heritage-strip extraction coverage improves | **Inline** (Playwright + diff) | 15 min | Run `extract.py` against both sections. Expect trust-bar coverage ≥40% (was 27%), heritage-strip ≥30% (was 8%). **/qc-inline:** record actual coverage numbers; compare to pre-Phase-3 baselines (27% / 8%); confirm improvement OR surface the gap as a real finding to Bean (canonical assignment may need refinement). |
| 3.5 | Commit + push (`feat/spec-15-p3-catalogue-rewire`) | **Inline** | 5 min | Pre-commit: no `.bak` files staged. |
| 3.6 | Phase 3 QC | **Gemini Flash ×3 panel** + Inline | 15 min | 3-rater /qc panel. Scenarios: hero baseline preserved, hero override deleted, fingerprint-builder retired, trust-bar/heritage-strip coverage measurably improved, extract.py reads from sgs-db not JSON files. Gate: ≥2 of 3 raters pass/ship. |

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
| 4.1 | Implement Stage 0.1 BEM lint | **Sonnet** | 30 min | Add to `/sgs-clone` orchestrator. New module: `plugins/sgs-blocks/scripts/lints/bem-lint.py`. Reads HTML, validates every class against the regex from spec §3.1. Reports violations with line numbers. **/qc-inline:** feed lint 3 inputs — a compliant mockup file (Mama's homepage; expect 0 violations), a deliberately-malformed `.hero-copy` (expect 1 violation flagging unprefixed BEM), and a mixed file (expect violations only on bad classes). |
| 4.2 | Implement Stage 0.5 token-usage lint | **Sonnet** | 30 min | Module: `plugins/sgs-blocks/scripts/lints/token-lint.py`. Reads CSS in draft. For each value, calls the Phase 1 value-matcher. Surfaces values that don't snap to any token. Flags as gap candidates. **/qc-inline:** feed lint a CSS file with 5 values — 3 known palette colours (expect snap), 1 arbitrary `#abcdef` (expect gap-candidate flag), 1 non-token spacing like `37px` (expect snap to nearest with confidence < 1.0 OR gap-candidate flag). Confirm output structure matches spec §9. |
| 4.3 | Wire both lints into `/sgs-clone` Stage 0 with `--draft-mode` / `--strict` / `--legacy` flag modes | **Sonnet** | 20 min | Three modes per spec §9: strict halts, draft-mode warns, legacy bypasses. **/qc-inline:** for each mode, run `/sgs-clone` against a deliberately-broken draft. Strict mode exits non-zero. Draft-mode logs warning + exits 0. Legacy bypasses entirely. |
| 4.4 | Pre-commit hook | **Cerebras** (bounded — single shell script) | 15 min | Create `.git/hooks/pre-commit` (or husky-style config). Runs Stage 0.1 + 0.5 on any staged file matching `sites/*/mockups/`. Non-blocking warning by default; strict mode via env var. **/qc-inline:** test by `git add`-ing a deliberately-broken mockup file; run `git commit --dry-run`; confirm hook fires + reports violation. Restore file. |
| 4.5 | Update `/innovative-design` skill description to require SGS-BEM + theme.json tokens in output | **Inline** (skill authoring is strategic) | 15 min | Update `~/.claude/skills/innovative-design/SKILL.md`. Add hard rule + reference Spec 15 §3 + §8. **/qc-inline:** read updated SKILL.md; confirm new rule visible in description (so autopilot picks it up); test by invoking /innovative-design with a sample brief and check output classes for SGS-BEM compliance. |
| 4.6 | Test against Mama's mockup (should pass since spec 13 P6 migrated it) | **Inline** (Playwright + scripted) | 15 min | Run lints; expect zero violations on Mama's mockup. **/qc-inline:** capture lint output; assert violation count = 0. If non-zero: surface real finding (spec 13 P6 may have left residual drift). |
| 4.7 | Commit + push (`feat/spec-15-p4-convention-enforcement`) | **Inline** | 5 min | Pre-commit: no `.bak` files. |
| 4.8 | Phase 4 QC | **Gemini Flash ×3 panel** + Inline | 15 min | 3-rater /qc panel. Scenarios: lints reject malformed BEM, accept compliant; token lint snaps known values; pre-commit hook fires; /innovative-design updated + tested; Mama's mockup passes with 0 violations. Gate: ≥2 of 3 raters pass/ship. |

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

**Source plan (absorbed):** `.claude/plans/phase-5-gap-detection.md`.

**Entry preconditions** (verify before dispatching 5a.1):
- Spec 14 FR9 + FR10 wired (verifiable: `extract_strategies.py` exists at `tools/recogniser-v2/`)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` exists (Spec 14 P1/P7 ship)
- Layer 2 role-templates DATA migrated to `property_suffixes` table (Phase 1 output)
- `attribute_gap_candidates` + `functionality_gap_candidates` uimax tables exist (Spec 14 P2 ship)
- `recursion-guard.py` available at `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py`

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5a.1 | Gap detection wiring into `/sgs-clone` Stage 9 | **Sonnet** | 30 min | Consumes recognition_log (385 rows) + attribute_gap_candidates. Reads each `extraction_failed` bucket and classifies. **/qc-inline:** dispatch on a known recognition_log row; confirm correct classification + write to attribute_gap_candidates. |
| 5a.2 | Operator-review interface for surfaced gaps | **Sonnet** | 20 min | Markdown output with `proposed_action` column + `decided_at` timestamp. **/qc-inline:** run on a populated gap_candidates table; confirm markdown renders correctly + each row has all required columns. |
| 5a.3 | Commit + QC sub-phase | **Inline + Gemini Flash ×3** | 10 min | `feat(spec-15-p5-gap-detection): wire gap detection + operator review`. 3-rater /qc on the sub-phase deliverable. |

### Sub-phase 5b — Staged scaffolding (~1.5 hr)

**Source plan (absorbed):** `.claude/plans/phase-6-staged-scaffolding.md`.

**Entry preconditions** (verify before dispatching 5b.1):
- Spec 14 FR11/12/13/14/19/20 referenced + understood (read Spec 15 §7)
- P1 static-block snapshots exist at `tests/golden/static-block-snapshots/` (9 JSON files, Spec 14 P1 ship)
- Phase 3 catalogue retired (canonical_slot in sgs-db) — verify via Sub-phase 5a entry
- `/sgs-db impact` + `/wp-blocks validate` + `/wp-hook-graph validate` CLI tools available
- WP REST API credentials in `~/.openclaw/.env` (for FR19 media sideload)

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5b.1 | Staged-output directory + file-naming pattern | **Sonnet** | 20 min | Pattern: `pipeline-state/sgs-clone/<run-id>/stage-N-*.json`. **/qc-inline:** create a dummy run; confirm dir layout + file naming match. |
| 5b.2 | Per-stage artifact validator | **Sonnet** | 30 min | JSON schema validation between stages (similar pattern to existing `validate-pipeline-artifact.py`). **/qc-inline:** feed validator a malformed stage artifact; confirm it rejects. Feed valid artifact; confirm it accepts. |
| 5b.3 | Confirm no `--resume` flag in /sgs-clone | **Inline** (architectural reaffirm per blub.db row 224) | 5 min | `grep -nE 'resume\|--resume' tools/recogniser-v2/*.py plugins/sgs-blocks/scripts/orchestrator/*.py` — expect zero hits. **/qc-inline:** if any found, surface as architectural violation. |
| 5b.4 | Build mutex + media sideloader + pattern auto-scaffold | **Sonnet** | 35 min | Sub-phase P6a from absorbed plan. Mutex prevents parallel /sgs-update + /sgs-clone (FR20). Media sideloader uploads attachments via WP REST. **/qc-inline:** run mutex test (try to start two concurrent clones — second should block). Test media sideloader with a known image. |
| 5b.5 | Commit + QC sub-phase | **Inline + Gemini Flash ×3** | 15 min | `feat(spec-15-p5-staged-scaffolding): staged artefacts + validator + mutex + sideloader`. 3-rater /qc. |

### Sub-phase 5c — Lingua-franca (~1.5 hr)

**Source plan (absorbed):** `.claude/plans/phase-7-lingua-franca.md`.

**Entry preconditions** (verify before dispatching 5c.1):
- Spec 14 FR6 referenced (read Spec 15 §8.1 absorbed text)
- uimax `naming_conventions` table populated (16 rows; query: `SELECT COUNT(*) FROM naming_conventions` = 16)
- `/uimax-classify-naming` skill exists at `~/.claude/skills/uimax-classify-naming/`
- Property suffixes table (Phase 1 output) populated

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5c.1 | `/uimax-sgs-scrape-pattern` lingua-franca conversion logic | **Sonnet** | 45 min | Convert source-convention classes (BEM-bare, Tailwind utility, Bootstrap) to SGS-BEM primary; store source as sibling in `equivalent_implementations`. Per spec §8.1. **/qc-inline:** feed 3 source examples (one BEM-bare `.hero-copy`, one Tailwind `flex items-center`, one Bootstrap `.btn-primary`); confirm each converts correctly + source preserved in equivalent_implementations. |
| 5c.2 | Round-trip test (BEM-bare → SGS-BEM → BEM-bare) | **Sonnet** | 20 min | Verify lossless conversion. **/qc-inline:** automate round-trip on 5 known patterns; assert byte-identical recovery. |
| 5c.3 | Commit + QC sub-phase | **Inline + Gemini Flash ×3** | 15 min | `feat(spec-15-p5-lingua-franca): SGS-BEM as primary + source preserved`. 3-rater /qc. |

### Sub-phase 5d — WP integration wiring (~1.5 hr)

**Source plan (absorbed):** `.claude/plans/phase-8-wp-integration-wiring.md`.

**Entry preconditions** (verify before dispatching 5d.1):
- Spec 14 FR22/23/24/25/27/28/30/34 understood (read Spec 15 §10 FR table)
- Phase 3 catalogue retired (canonical_slot in sgs-db) — sub-phase 5a entry verified this
- Phase 1 token value-matcher + default-inheritance available — call sites need both
- `/wp-blocks` + `/wp-theme-check` CLI tools available
- SSH access to palestine-lives.org confirmed (Hostinger key at `~/.ssh/id_ed25519`)

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5d.1 | Token surface inventory capture | **Inline** | 10 min | Run `/wp-theme-check presets theme/sgs-theme/theme.json --json > pipeline-state/p8-token-inventory.json`. **/qc-inline:** confirm JSON parses + contains expected palette/spacing/font-size token slugs. |
| 5d.2 | Block markup serialisation (FR12) | **Sonnet** | 30 min | Output WP block-comment markup with InnerBlocks. Builds on existing `serialize_block()` from Spec 14 P3. **/qc-inline:** serialise a synthesised sgs/hero with known attrs; parse the output with `wp.blocks.parse` via Playwright; confirm round-trip. |
| 5d.3 | WP-CLI deployment helper | **Sonnet** | 30 min | Push generated post_content to live site via `wp eval-file` + `scp` (the working pattern from CLAUDE.md). **/qc-inline:** dry-run with `--dry-run` flag; confirm command sequence matches established deploy pattern. NEVER push to production without explicit go. |
| 5d.4 | Commit + QC sub-phase | **Inline + Gemini Flash ×3** | 15 min | `feat(spec-15-p5-wp-integration): block serialisation + wp-cli deploy helper`. 3-rater /qc. |

### Sub-phase 5e — Autonomy + visual QA (~2 hr)

**Source plan (absorbed):** `.claude/plans/phase-9-autonomy-and-visual-qa.md`.

**Entry preconditions** (verify before dispatching 5e.1):
- Spec 14 FR15/16/21/31/32/33 referenced (read Spec 15 §10 FR table)
- Sub-phase 5b staged-output dir exists (`pipeline-state/sgs-clone/<run-id>/`)
- `/visual-qa` skill available at `~/.claude/skills/visual-qa/`
- Playwright installed + chromium browser ready (`playwright install chromium`)
- Deploy infrastructure (tar/scp) working — test with a known good deploy first

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5e.0 | Define `visual_qa_config.json` thresholds | **Sonnet** | 15 min | Per absorbed plan Step 0. Author `tools/recogniser-v2/visual_qa_config.json` with: pass_threshold (1%), surface_threshold (0.5%), viewports [375, 768, 1440], scope (full-page vs section). **/qc-inline:** schema validate the JSON; assert all 4 fields present with correct types. |
| 5e.1 | Playwright visual parity QA (Stage 8) | **Sonnet** (CLI script) | 45 min | Multi-breakpoint screenshot capture + diff. Tolerance from `visual_qa_config.json` (Spec 15 §7 / §9: 1% pass; 0.5–1% regions surfaced). **/qc-inline:** run against Mama's mockup pre-deploy; capture screenshots; assert 3 viewport PNGs written; assert diff JSON produced. |
| 5e.2 | Visual diff thumbnails for operator review | **Sonnet** | 30 min | Generate side-by-side PNG diffs for surfaced regions. **/qc-inline:** force a deliberate diff (modify 1 pixel); confirm thumbnail generation; confirm thumbnail format is human-readable side-by-side. |
| 5e.3 | Autonomy gate — auto-proceed past Stage 8 if diff < 1% AND no critical errors | **Sonnet** | 20 min | Reduces operator decision frequency. **/qc-inline:** test 4 scenarios — diff 0.3% no errors (auto-proceed), diff 0.8% no errors (surface for review but proceed), diff 1.2% (halt), diff 0.5% with console error (halt). |
| 5e.4 | Commit + QC sub-phase | **Inline + Gemini Flash ×3** | 15 min | `feat(spec-15-p5-visual-qa): playwright parity + diff thumbnails + autonomy gate`. 3-rater /qc. |

### Sub-phase 5f — Acceptance harness (~30 min)

**Source plan (absorbed):** `.claude/plans/phase-10-acceptance-harness.md`.

**Entry preconditions** (verify before dispatching 5f.1):
- Sub-phases 5a-5e shipped on origin/main (all `feat(spec-15-p5-*)` commits visible)
- Spec 14 FR18 + P1 KJC2 understood (`grep "FR18\|KJC2" .claude/decisions.md` — should return the 5 named checks)
- sgs-framework.db + uimax accessible

| # | Step | Model | Time | Notes |
|---|---|---|---:|---|
| 5f.1 | `critical-fix-verification.py` — 5 canonical-mutation-boundary checks | **Cerebras** (bounded scoped script) | 25 min | Per Spec 14 FR18 P1 KJC2 decision. Five checks: (1) no root `theme.json` mutation outside spec 15 §4.7 channels, (2) no canonical-block files mutated outside FR21 commit, (3) no licensing strings in uimax writes, (4) `/sgs-update` idempotency green (re-run produces 0 diffs), (5) `pipeline-state/<run-id>/` staging dir empty post-success. **/qc-inline:** run harness against current main branch; all 5 should pass. Deliberately mutate `theme.json` non-trivially; rerun; check 1 should fail. Restore. |
| 5f.2 | Run harness E2E against Mama's mockup | **Inline** | 30 min | Full /sgs-clone E2E run on `sites/mamas-munches/mockups/homepage/index.html`. Target: ≥90% block attr coverage + ≤1% visual parity diff at 3 breakpoints. **/qc-inline:** capture coverage numbers per section + visual diff %; surface to operator if below thresholds; do not auto-pass without ≥90% / ≤1%. |
| 5f.3 | Commit + Phase 5 final QC | **Inline + Gemini Flash ×3** | 30 min | `feat(spec-15-p5-acceptance-harness): 5-check harness + E2E Mama's clone`. 3-rater /qc against the entire Phase 5 deliverable (all 6 sub-phases together). Gate: ≥2 of 3 raters pass/ship + 5/5 harness checks green + E2E target met. |

**Phase 5 success criteria:**
- [ ] All 6 sub-phases shipped on origin/main
- [ ] `/sgs-clone` runs E2E on Mama's mockup with ≥90% block attribute coverage
- [ ] Visual parity ≤1% pixel diff at 3 viewports (regions > 0.5% surfaced as thumbnails)
- [ ] Operator interface surfaces ambiguous cases
- [ ] Acceptance harness 5/5 checks green

---

## Ready-to-dispatch prompts for Phase 1 (concrete, paste-and-go)

These are the actual prompts for Phase 1 dispatches. They embed real paths, real spec section references, real schema fragments. Operator pastes verbatim into the Agent / Bash invocation.

### Prompt 1.1 — Cerebras SQL migration

Invocation: `python C:/Users/Bean/.claude/agents/cerebras-agent/agent.py --prompt "<PROMPT>" --cwd "C:/Users/Bean/Projects/small-giants-wp"`

```
You are a cold Cerebras subagent. Task: create an idempotent SQL migration script for sgs-framework.db.

Read: C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §4.3 / §4.4 / §4.5 / §4.6.

Target sqlite3 DB at: ~/.claude/skills/sgs-wp-engine/sgs-framework.db

Write to: ~/.claude/skills/sgs-wp-engine/scripts/migrate-spec-15-p1.py

The script must (idempotently, using IF NOT EXISTS / try-except):
1. CREATE TABLE slot_synonyms with columns per spec §4.3 (canonical_slot PK TEXT, aliases TEXT NOT NULL, role TEXT, description TEXT, wp_canonical TEXT, html_semantic_tag TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)
2. CREATE TABLE property_suffixes with columns per spec §4.4 (suffix PK TEXT, role TEXT NOT NULL, css_property TEXT, is_token_matched INTEGER DEFAULT 1, token_source TEXT, notes TEXT)
3. CREATE TABLE modifier_suffixes with columns per spec §4.5 (suffix PK TEXT, kind TEXT NOT NULL, notes TEXT)
4. ALTER TABLE block_attributes ADD COLUMN canonical_slot TEXT (and the other 5 cols per §4.6: role TEXT, derived_selector TEXT, output_signature TEXT, equivalent_implementations TEXT, signature_confidence REAL)
5. Add a `_meta_schema_version` table with the row `('spec-15-p1', NOW())`

Run the script. Verify by querying PRAGMA table_info on each new/extended table; print the column list.

Hard limits: stay under 12 tool rounds. Single Python file. Use stdlib sqlite3 only.
```

### Prompt 1.2 — Cerebras vocab seed

Invocation: same as 1.1.

```
You are a cold Cerebras subagent. Task: seed three vocabulary tables in sgs-framework.db from Spec 15.

Read: C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §3.4 (20 slot synonyms) + §3.5 (32 property suffixes) + §3.6 (16 modifier suffixes).

Target sqlite3 DB at: ~/.claude/skills/sgs-wp-engine/sgs-framework.db

Write to: ~/.claude/skills/sgs-wp-engine/scripts/seed-spec-15-p1-vocab.py

The script must:
1. INSERT INTO slot_synonyms one row per concept in §3.4. Use ON CONFLICT DO NOTHING for idempotency. Fields: canonical_slot, aliases (JSON array), role, description, wp_canonical, html_semantic_tag.
2. INSERT INTO property_suffixes one row per suffix in §3.5 (32 rows). Fields: suffix, role, css_property, is_token_matched, token_source.
3. INSERT INTO modifier_suffixes one row per modifier in §3.6 (16 rows). Fields: suffix, kind.

Verify by SELECT COUNT(*) on each table. Expect 20 / 32 / 16. Print the counts. Run script twice; confirm second run produces no new rows (idempotency).

Hard limits: stay under 12 tool rounds. Single file. stdlib only.
```

### Prompt 1.3 — Sonnet behavioural static analyser

Invocation: Agent tool, model=sonnet, subagent_type=general-purpose.

```
You are a cold subagent. Task: build a static analyser that extracts per-attribute output_signature for every SGS block.

Read first (in order):
1. C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §3.2 (behavioural canonicalisation rule) + §5.3 (signature JSON schema)
2. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/hero/render.php (canonical example of an SGS render.php)
3. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/heritage-strip/render.php (the body→text drift example)

Write to: C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py

For each block in sgs-framework.db `blocks` table (slug LIKE 'sgs/%' — 65 rows):
1. Locate render.php at plugins/sgs-blocks/src/blocks/<short-slug>/render.php
2. AND save.js at the same dir
3. Parse for each $attrs[X] or attributes.X reference: find the HTML element wrapping it, the escape function (esc_html / esc_attr / esc_url / wp_kses_post), the BEM class on the wrapper, any conditional gates
4. Emit a signature dict per spec §5.3 schema:
   {type, output_function, output_element, output_class, output_role, is_content_or_design, conditional_gates}
5. UPDATE sgs-framework.db block_attributes SET output_signature = <json> WHERE block_slug = ? AND attr_name = ?

Output: write the script + run it + print per-block coverage report (how many attrs had output_signature populated vs total).

Project conventions: Python 3.13, stdlib sqlite3, BeautifulSoup4 for HTML, regex for the PHP/JSX scanning. UK English. Type hints everywhere. No mocking. Self-tests at the bottom of the file.

When done, run the script; report: 65 blocks processed, N% of attrs got non-null output_signature. Surface any blocks where 0 attrs got signatures (those are real anomalies to flag).
```

### Prompt 1.4 — Sonnet canonical assignment

Invocation: Agent tool, model=sonnet.

```
You are a cold subagent. Task: backfill canonical_slot + role + derived_selector for every row in block_attributes.

Read first:
1. C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §3.3 (decomposition template) + §3.4 (slot synonyms) + §5.2 (selector derivation formula)
2. C:/Users/Bean/Projects/small-giants-wp/tools/recogniser/data/fingerprints.json (v1 seed data — has attr_extractors with selectors for ~10 blocks)

Write to: C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py

For each row in sgs-framework.db block_attributes (1343 rows):
1. Decompose attr_name per §3.3 template: peel off breakpoint (Mobile/Tablet/Desktop), corner (TL/TR/BL/BR), side (Top/Right/Bottom/Left), state (Hover/Active), variant (Primary/Secondary), unit (Unit), then ONE property suffix. The residue is the slot base word.
2. Look up base word in slot_synonyms (either as canonical_slot or in aliases JSON array). Resolve to canonical_slot.
3. Look up the stripped property suffix in property_suffixes → assign role.
4. Derive selector per §5.2: ".sgs-<block_slug_without_namespace>__<canonical_slot>".
5. Special-case: if v1 fingerprints.json has an attr_extractor entry for this (block, attr), use the v1 selector as the authoritative override (fallback chains like ".sgs-hero__headline, h1, h2" are valuable).
6. UPDATE block_attributes SET canonical_slot=?, role=?, derived_selector=? WHERE block_slug=? AND attr_name=?

If a base word doesn't match any slot in slot_synonyms: write to attribute_gap_candidates (FR8 table) with proposed_action='new-canonical-slot-needed'. Do NOT fail the row.

Output: run the script + report counts — total attrs processed, attrs with canonical_slot assigned, attrs with role assigned, gap candidates surfaced. Expect: 1343 / 1343 / 1343 (full coverage) / 0-50 (small number of genuinely novel slots).

Project conventions: as in Prompt 1.3. Self-tests included.
```

### Prompt 1.5 — Sonnet token value-matcher

Invocation: Agent tool, model=sonnet.

```
You are a cold subagent. Task: implement the token value-matcher for the SGS converter pipeline.

Read first:
1. C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §5.4 (value-matcher rules + confidence tiers)
2. C:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/theme.json (the canonical theme — has settings.color.palette, settings.spacing.spacingSizes, settings.typography.fontSizes, settings.shadow.presets)

Write to: C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/value-matcher/match.py

Implement functions:
- snap_color(hex_or_rgb: str, palette: list[dict]) -> (token_slug_or_raw, confidence): use ΔE2000 from `colormath` lib. Tiers per spec §5.4: ΔE ≤ 2.0 → conf 1.0; ΔE ≤ 5.0 → conf 0.85; ΔE ≤ 10.0 → conf 0.6; else (raw_value, 0.0) + flag is_gap_candidate.
- snap_spacing(px_str: str, scale: list[dict]) -> (token_slug_or_raw, confidence): percent-deviation. Within ±5% → 1.0; ±15% → 0.6; else gap.
- snap_font_size(px_str: str, scale: list[dict]) -> same shape as snap_spacing.
- snap_shadow(value: str, presets: list[dict]) -> discrete match (exact string or normalised whitespace).
- snap_family(font_stack: str, families: list[dict]) -> discrete match.

Self-tests: at least 2 happy-path + 2 edge cases per function. Run + verify all pass.

Install dependency: `pip install colormath` (add to script header as a one-line shell instruction).

Project conventions: as in Prompt 1.3.
```

### Prompt 1.6 — Sonnet default-inheritance lookup

Invocation: Agent tool, model=sonnet.

```
You are a cold subagent. Task: implement the default-inheritance check for theme.json styles.elements / styles.blocks.

Read first:
1. C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md §4.7 (theme.json mapping) + §5.4 (inherits_global_default function spec) + §10 FR35 (WP precedence: blocks > elements > root)
2. C:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/theme.json (the canonical theme — has settings + styles.elements + styles.blocks)

Write to: C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/value-matcher/inheritance.py

Implement: `inherits_global_default(block_slug: str, slot: str, value: dict) -> Literal['INHERIT', 'OVERRIDE']`.

The function:
1. Resolves the HTML element for the slot (heading→h1-h6, text→p, button→a, etc. — look up via slot_synonyms.html_semantic_tag).
2. Reads styles.blocks.<block_slug>.<slot>.<property> if present.
3. Falls back to styles.elements.<html_tag>.<property>.
4. Falls back to root defaults.
5. Compares the supplied value against the resolved default.
6. Returns 'INHERIT' if exact match (per WP precedence); 'OVERRIDE' otherwise.

Self-tests: 4 cases — (a) block-level override beats element-level (blocks > elements), (b) element-level applies when no block override, (c) root fallback when neither defined, (d) OVERRIDE when value differs.

Project conventions: as in Prompt 1.3.
```

### Prompt 1.7 — Sonnet pytest suite

Invocation: Agent tool, model=sonnet.

```
You are a cold subagent. Task: write a pytest suite covering the four Phase 1 modules.

Read first:
1. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py
2. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py
3. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/value-matcher/match.py
4. C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/value-matcher/inheritance.py

Write to: C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/tests/test_spec_15_phase_1.py

Test coverage:
- extract_signatures: at least 3 tests (happy path on hero, edge case where save.js exists but render.php doesn't, edge case for blocks with 0 attrs).
- assign_canonical: at least 4 tests (a heading attr, a text attr, a colour attr, a corner-border-radius attr — all should decompose correctly).
- match.snap_color: 3 tests (exact palette match conf 1.0, close match conf 0.85, far-from-palette gap candidate).
- match.snap_spacing: 3 tests (exact, 5% off, gap).
- inherits_global_default: 4 tests covering the WP precedence chain.

Use pytest fixtures for the test sgs-framework.db (copy to /tmp and tear down).

Run pytest + report exit code. Target: all green. If any fail, surface the failure inline with the test name + error + relevant code section.

Project conventions: as in Prompt 1.3. No mocking of the strategies themselves — test against real data where possible.
```

---

## Generic subagent prompt templates (for Phases 2-5 dispatches)

For each Phase 2-5 dispatch, **invoke `/subagent-prompt` first** with the step description as input. The skill produces a self-contained cold prompt (6-section base template: Role / Task / Context / Instructions / Output / Criteria, plus a 7th "Key Judgement Calls" section for high-stakes work). It will:

- Pull the relevant spec section references
- Embed real file paths from the asset inventory (Spec 15 §12E)
- Include project conventions (UK English, no mocking, etc.)
- Enforce the dispatch-justification gate (refuses to write a prompt for inline work)

The fallback templates below are for when `/subagent-prompt` is unavailable.

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
