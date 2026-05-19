# Flow Doc QC — Sonnet 3 Rater
## `C:/Users/Bean/Projects/small-giants-wp/.claude/cloning-pipeline-flow.md`
**Date:** 2026-05-21 | **Rater:** Sonnet 3 (independent) | **Doc length:** 1301 lines

---

## Headline Verdict

**CONDITIONAL PASS — 1 critical discrepancy, 2 minor issues, 1 broken link.**

The doc is structurally sound and accurate on all wave statuses except one: the Wave 2b "licensing revert" claim is factually wrong. The `FORBIDDEN_KEYWORDS` block was added in commit `7d713ba0` and exists at HEAD in the committed codebase. The revert is only present as an **unstaged working-tree modification** — it was never committed. The doc states the revert happened "same session" and treats it as complete, but git history (`git status`) proves otherwise. All other checks pass or are confirmably accurate.

---

## Rubric Table

| Check | Result | Evidence |
|---|---|---|
| **A.1 Script inventory completeness** | PASS | 10 spot-checks performed. `autonomy_gate.py`, `convert.py`, `per-section-convention-voter.py`, `bem-lint.py`, `token-lint.py`, `uimax_write.py`, `uimax-write-validator.py`, `register_patterns.py`, `staged_merge.py`, `confidence-matrix.py` — all listed; wiring statuses verified against codebase grep. |
| **A.2 Skill dispatch chain completeness** | PASS | Lines 938–952 + 1169–1199 enumerate 17 commands/skills. Stage-to-skill index at lines 1171–1181 present and consistent. `/visual-qa` correctly marked as sibling (not in /sgs-clone path). Known bug at `run-audit.js:137` documented at line 951. |
| **A.3 DB heat-map completeness** | PASS | Stage-to-tables matrix at lines 1229–1250 covers all 10+ pipeline stages. sgs-framework.db (29 tables, ~4,050 rows) and uimax (48 tables, ~10,353 rows) both inventoried. Dead tables (5), legacy_role_lookup (Wave 3 new), and cross-DB sync flows all present. |
| **A.4 Sibling-doc stubs in place** | PASS | `.claude/tooling-map.md`, `.claude/skills-commands-map.md`, `.claude/db-tables-map.md` all exist and contain correct redirect stubs pointing at this doc. Stub line counts match doc claims (tooling-map: 9 lines; skills-commands-map: 9 lines; db-tables-map: 9 lines). |
| **A.5 Spec 15 absorption in companion_docs + truth-doc structure** | PASS WITH CAVEAT | Frontmatter at line 55–56 correctly lists Spec 15 as `ABSORBED 2026-05-21 → see Spec 16 §12 Appendix A`. Truth-doc structure table at lines 66–69 correctly identifies Spec 16 as the single end-goal spec. Spec 15 frontmatter at line 7 has `status: ABSORBED_INTO_SPEC_16 (2026-05-21)`. Caveat: "See also" at line 1008 still lists Spec 15 as "Full spec" rather than pointing at Spec 16 — this is misleading for cold-start readers. |
| **B.6 Wave 1 (ee8db653) status reflected** | PASS | Commit `ee8db653` verified in git log. Doc claims: `--converter-v2` default flipped TRUE, legacy subprocess retired, stub sentinel fix. All three confirmed against `git show ee8db653 --stat` and grep of orchestrator (`--converter-v2` default TRUE at line 1765 of `sgs-clone-orchestrator.py`; `stage_8_skipped` sentinel confirmed at `autonomy_gate.py:148,153`). |
| **B.7 Wave 2 (7d713ba0) status — no live "licensing reject" claim** | **FAIL** | This is the critical discrepancy. Doc at lines 797–804 states: "a 16-keyword licensing-reject gate was added in commit 7d713ba0... then REVERTED same session." However: (1) `git log --all` shows NO separate revert commit between `7d713ba0` and `e60fe58e`. (2) `git show HEAD:uimax-write-validator.py` shows `FORBIDDEN_KEYWORDS` still present in the committed codebase. (3) `git status` shows `uimax-write-validator.py` is modified in the working tree — the tombstone comment exists only as an UNSTAGED change. The "revert" was drafted but never committed. The live codebase still enforces the licensing-reject gate. Doc claim is inaccurate. |
| **B.8 Wave 3 (e60fe58e) status reflected** | PASS | Commit `e60fe58e` verified. Doc claims: CSS D3 gap-candidate emission, Stage 3 DB canonical_slot, LEGACY_ROLE_LOOKUP→DB, RETIRED_BLOCK_REMAP emptied. All confirmed: `per-section-convention-voter.py:136` shows `LEGACY_ROLE_LOOKUP: dict[str, str] = {}` with DB helper wired; `convert.py` listed as LIVE with Wave 3 D3 emission; test files `test_attribute_gap_candidate.py`, `test_stage_3_db_canonical.py`, `test_voter_db_legacy.py` listed at lines 1145–1147. |
| **B.9 uimax-write-validator.py tombstone + no FORBIDDEN_KEYWORDS** | **FAIL** | Directly linked to B.7. The doc at line 1130 states the validator "has a tombstone comment" and has "no FORBIDDEN_KEYWORDS". This is only true in the unstaged working-tree file. The committed HEAD version still contains `FORBIDDEN_KEYWORDS` (confirmed: `git show HEAD:plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py | grep FORBIDDEN_KEYWORDS` returns 16 entries). The tombstone state is real but uncommitted. |
| **B.10 Spec 15 frontmatter has ABSORBED_INTO_SPEC_16 status** | PASS | Confirmed. Spec 15 frontmatter at line 7: `status: ABSORBED_INTO_SPEC_16 (2026-05-21)`. File retained for historical reference. `absorbed_into` field present. |
| **C.11 All pipeline stages have status blocks** | PASS | All stages verified: Stage 0, 0.1, 0.5, 0.7, 0.8, 1, 2, 3, 4, 4.5, 5, 6, 7, 7b, Pre-deploy gate, 8, 9, 9b, +REGISTER, Final acceptance harness — all have `STATUS:` lines. Sister pipeline (/sgs-update) included. |
| **C.12 No broken markdown links** | FAIL (minor) | Line 1010: `[.claude/plans/phase-6-pattern-fidelity.md](plans/phase-6-pattern-fidelity.md)` — this file does not exist. `ls .claude/plans/` confirms only `phase-2-header-behaviours-and-responsive-logo.md`, `phase-2a-step-breakdown.md`, and `phase-7-spec-16-converter-rollout.md`. The Phase 6 plan is gone (likely absorbed or renamed). Also line 1008 "Full spec" link to Spec 15 is technically functional but misleading (see A.5 caveat). |
| **C.13 Wave-commit-ID accuracy** | PASS | All five commit IDs verified against `git log --all --oneline`: `62ee8b87` (session audit+foundation), `ee8db653` (Wave 1), `7d713ba0` (Wave 2), `e60fe58e` (Wave 3), `13dc3161` (session close + Wave 4 doc consolidation). All present and match the described scope. |
| **C.14 Stage-status accuracy (spot-check)** | PASS | Three spot-checks: (1) `autonomy_gate.py` — doc says `stage_8_skipped` sentinel + `surface-to-operator` on skip. Confirmed at `autonomy_gate.py:148,153,155` and docstring lines 15–24. (2) `convert.py` — doc says LIVE + Wave 3 D3 gap-candidate emission. `git show e60fe58e --stat` confirms Wave 3 touched `convert.py`. (3) `per-section-convention-voter.py` — doc says LEGACY_ROLE_LOOKUP migrated to DB (Wave 3). Confirmed at `per-section-convention-voter.py:136` (empty dict) + lines 128–135 (migration comment). |
| **C.15 End-goal alignment** | PASS | Truth-doc structure (lines 64–77) correctly frames this doc as implementation-state and Spec 16 as end-goal. Spec 16 frontmatter confirms it is the architecture authority. The doc does not overreach into spec territory. Phase 8 section-by-section pixel-diff workflow is correctly marked as pending next session (frontmatter `phase_8_status`). |

---

## Confirmed Clean

- All five wave commit IDs present in git history and match described scope.
- Three sibling-doc stubs are correct redirect stubs, no residual content.
- Spec 15 frontmatter correctly marked `ABSORBED_INTO_SPEC_16`.
- Spec 16 frontmatter is the live end-goal authority.
- `--converter-v2` default TRUE confirmed in orchestrator source.
- `LEGACY_ROLE_LOOKUP` confirmed empty dict, DB-backed in voter.
- `stage_8_skipped` sentinel confirmed in `autonomy_gate.py`.
- Stage 3 `canonical_source: 'db' | 'auto-derived'` annotation confirmed in voter and doc.
- Dead tables list (5 entries) consistent with sgs-framework.db sections.
- All pipeline stages have STATUS blocks.

---

## Issues

### CRITICAL — B.7/B.9: Wave 2b "licensing revert" is uncommitted

**Location:** Lines 797–804 (+REGISTER tail stage block), line 1130 (Script inventory uimax tools section).

**Problem:** The doc states the 16-keyword `FORBIDDEN_KEYWORDS` licensing gate was "REVERTED same session" after commit `7d713ba0`. This is inaccurate. `git log --all` shows no revert commit. `git show HEAD:plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` confirms `FORBIDDEN_KEYWORDS` is present at HEAD. `git status` shows the file has an unstaged working-tree modification (the tombstone version) that was never staged or committed.

**Effect:** Any agent reading the doc believes the licensing gate is gone. In practice, `uimax_write.py`'s `validate_and_write` will reject payloads containing the 16 forbidden tokens (including "license", "copyright", etc.), which could silently block legitimate pattern writes. The doc's claim that the validator has "no FORBIDDEN_KEYWORDS" and a tombstone comment is only true on disk in the working tree, not in the repo HEAD.

**Fix:** Commit the working-tree version of `uimax-write-validator.py` (the tombstone version already drafted) so HEAD matches the doc's claim.

### MINOR — C.12: Broken link to `phase-6-pattern-fidelity.md`

**Location:** Line 1010: `[.claude/plans/phase-6-pattern-fidelity.md](plans/phase-6-pattern-fidelity.md)`

**Problem:** File does not exist. `ls .claude/plans/` confirms it is absent. The closest surviving plan is `phase-7-spec-16-converter-rollout.md`.

**Fix:** Update line 1010 to point at `phase-7-spec-16-converter-rollout.md` or remove the stale link.

### MINOR — A.5/C.12: "See also" still labels Spec 15 as "Full spec"

**Location:** Line 1008: `- Full spec: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md]`

**Problem:** Spec 15 is now an absorbed historical stub. The "Full spec" label is misleading for cold-start readers — the live end-goal spec is Spec 16. Spec 15's own frontmatter states `ABSORBED_INTO_SPEC_16`.

**Fix:** Update line 1008 label to "Spec 15 (historical, absorbed):" and add a line pointing at Spec 16 as the live full spec.

---

## Caveats

- **B.7/B.9 verification methodology:** The working tree file was read via the Read tool (which reads the filesystem, not git HEAD). The committed HEAD was verified via `git show HEAD:...`. The discrepancy is confirmed by `git status` showing an unstaged modification. This is not a measurement ambiguity.
- **Script inventory spot-checks** were performed against file existence and key grep patterns, not full function-by-function code audits. The 107-script total count was not independently verified — it was taken as stated.
- **DB row counts** (e.g. block_attributes: 1,349; slot_synonyms: 82; property_suffixes: 117) were not independently queried against the SQLite databases. Taken as stated.
- **Stage 6 Spec 17 framework pattern targets** (lines 491–500) add a forward-looking note about header/footer pattern targets. The claim "tracked as a follow-up" is not independently verified against parking.md, but is not a structural accuracy concern.
- This report was produced without reading other raters' parallel reports as instructed.
