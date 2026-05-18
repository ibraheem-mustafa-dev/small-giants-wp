# Pipeline consistency + requirements audit — Sonnet B
**Generated:** 2026-05-21
**Auditor:** Sonnet (subagent B)

---

## Headline verdict

The pipeline docs are substantially consistent on the high-level shape of the system, but carry three material inconsistencies and several stale references that a new-session engineer would act on incorrectly. Of the 9 stated requirements, 7 are at least partially covered by live code, but Requirement 8 (auto-scaffold a new block on unrecognised sections) is only partially live (classifier + scaffold fire, gap-writers are wired but the "author and promote" loop is still operator-manual), and the 99% pixel-parity target of Requirement 2 is explicitly NOT yet closed — the pipeline is currently gated at ~43% full-page diff on the canary page.

---

## Requirements coverage matrix

| # | Requirement | Verdict | Evidence (file:line or doc-section) | Notes |
|---|---|---|---|---|
| 1 | Scan a full draft HTML page — read mockup HTML end to end | COVERED | `cloning-pipeline-flow.md` Stage 0.1 (R: `sites/<client>/mockups/<page>/index.html`); Stage 1 reads same file; Stage 4 reads same file; Stage 5 reads CSS from same file | All stages that consume the draft use the full file path, not a fragment. No selective-read shortcut found. |
| 2 | Clone to 99% visual accuracy — pixel diff <1% per section at 3 viewports | PARTIAL | `cloning-pipeline-flow.md` Stage 8 ("pass gate currently failing for Mama's"); `spec-16` §closure_gate_definition_v0_3 (≤1% per section, not full-page); `SKILL.md` Hard Rule 10, Rule 12 | The gate is DEFINED correctly (per-section ≤1% at 375/768/1440) but NOT YET PASSING on the Mama's canary. Phase 8 section-by-section work is pending. Current best is ~43.7% full-page; spec 16 correctly separates this into per-section closure units which have not been closed. |
| 3 | Group class sections into `sgs/container` unless header/footer/hero | COVERED | `spec-16` §R1 ("sgs/container MANDATORY at top-level section boundary, one container per section"); FR4 ("For the outermost section element … emit sgs/container"); `cloning-pipeline-flow.md` Stage 0.8 + Stage 7 | R1 explicitly limits auto-container-emission to the top-level section. Header/footer are separately handled via Spec 17 framework patterns (flow doc line 466–475). Hero is a matched composite block that emits its own root, not a container. |
| 4 | Match div classes to equivalent block (except root element of section) | PARTIAL | `spec-16` §R2 (atomic-tag precedence), §R3 (slot-claim precedence), §FR1 (block-root slot harvest); `cloning-pipeline-flow.md` Stage 2 GAP note ("no pattern-level matcher … 6 of 9 sections return core/group") | The logic for matching child class names to blocks is specified and the converter implements it. However Stage 2 (MATCH) operates at block level only — no pattern-level lookup before fallback — meaning 6 of 9 Mama's sections currently fall to `core/group` fallback rather than a named SGS block. |
| 5 | Recognise hierarchy for parent and child blocks — nested DOM → nested SGS block tree | COVERED | `spec-16` §FR1 (block-root slot harvest — descendants lift into parent attrs), §FR3 (pass-through wrapper rule), `SKILL.md` Stage 4 EXTRACT (search_scope field), `converter_v2/convert.py` DOM walker (tooling-map.md:52) | The slot-aware recursive DOM walker in `convert.py` is LIVE. The Spec 16 description of the three-level hierarchy (block-root → slot elements → atomic tags) is consistently described across spec 16, SKILL.md Stage 4, and the flow doc Stage 4. |
| 6 | Find and translate attribute slot names — mockup class → SGS block attribute slot | COVERED | `SKILL.md` Hard Rule 4 + Stage 3 SLOT-LIST; `spec-16` §FR1 + `db_lookup.py` `attr_name_for_slot_or_alias()`; `cloning-pipeline-flow.md` Stage 3 ("reads block.json + block_attributes DB") | Auto-derive from block.json is enforced as a HARD-GATE. `db_lookup.py` routes `canonical_slot_for()` + `attr_name_for_slot_or_alias()` against the sgs-framework.db `block_attributes` table (1406 rows). Consistent across all docs. |
| 7 | Extract and move content of slots — text, image src, link href, etc. | COVERED | `spec-16` §FR1–FR5 (text/image/link/array typed attrs); `cloning-pipeline-flow.md` Stage 4 LIVE note ("hero 42% coverage; partial for atomic blocks"); `SKILL.md` Stage 4 (search_scope, extraction_strategy) | Extraction strategies exist and are LIVE for hero (42% attr coverage at time of last measurement). FR5 covers media-map resolution for images. The flow doc explicitly marks Stage 4 as PARTIAL for non-hero atomic blocks, which is an honest gap statement. |
| 8 | Recognise unmatched block and scaffold new block OR detect attribute extension gap | PARTIAL | `cloning-pipeline-flow.md` Stage 9b ("classifier + scaffold fire, gap-writers don't"); `SKILL.md` Stage 9 (5-bucket router); `spec-16` §FR8 (legacy retirement gate, not new-block creation) | The classifier (`bucket-c-classifier.py`) and scaffold (`atomic-block-scaffold.py`) are LIVE as of Phase 6. The attribute-gap-writer, functionality-gap-detector, and gap-review-report are wired (Phase 6 v2 Steps 4f/4g/4h). However the "author the new block and promote to canonical" loop is still a manual operator action — there is no automated scaffolding-to-promotion path without operator sign-off. |
| 9 | Report what was not converted, with diagnostic info | COVERED | `cloning-pipeline-flow.md` Stage 9 (5-bucket router + `operator-review.html` + `gap-review.md`); `SKILL.md` Stage 9 REPORT; `recognition-log.md` (full schema + 4 action buttons); Hard Rule 8 (coverage gate enforced) | The gap-reporting infrastructure is the most complete part of the pipeline. 5-bucket routing, per-section coverage stats, operator-review HTML, gap-review markdown, attribute_gap_candidates DB rows, and functionality_gap_candidates DB rows are all live. |

---

## Inconsistencies found

### I1 — `--resume` flag: SKILL.md says "no", router-pattern.md says "yes"

**Severity: Medium.** `SKILL.md` line 271 explicitly states "Re-running `/sgs-clone <mockup-folder>` starts a fresh `run_id` — no `--resume` flag (each session is a single unit, per blub.db row 224)." The `references/router-pattern.md` line 28 states the opposite: "re-running `/sgs-clone <mockup-folder> --resume <run_id>` reads the existing artefacts and continues from the first incomplete stage." The orchestrator CLI (`sgs-clone-orchestrator.py` lines 1813–1860) has no `--resume` argument defined. The SKILL.md and orchestrator agree; `router-pattern.md` is stale. An operator reading `router-pattern.md` would attempt a `--resume` invocation that does not exist.

### I2 — `validate-naming.py` referenced but does not exist on disk

**Severity: Medium.** `skills-commands-map.md` lines 119 and 347 reference `tools/recogniser-v2/validate-naming.py` as the BEM naming validator at Stage 0. Disk check confirms `tools/recogniser-v2/` contains: `extract.py`, `extract_strategies.py`, `overrides/`, `utils.py`, `visual_qa_config.json`, `data/`. No `validate-naming.py` exists. The SKILL.md itself (line 301) correctly states this was "the planned filename; the actual implementation shipped as `bem-lint.py` under the lints package". The `skills-commands-map.md` "New scripts surfaced" table was not updated to reflect the correction. Pre-flight checks that reference the SKILL.md are correct; any tool that reads `skills-commands-map.md` would try to invoke a non-existent script.

### I3 — Stage count inconsistency: SKILL.md says "9 stages", flow doc says "10 + 4 tails"

**Severity: Low** (cosmetic, does not affect execution). The SKILL.md description field says "9-stage pipeline" and `references/pipeline-stages.md` defines stages 1–9. The `cloning-pipeline-flow.md` status summary (line 901) says "Pipeline stages defined: 10 + 4 tails" (stages 0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 5, 6, 7, 7b, 8, 9, 9b + DEPLOY/PARITY/REGISTER/UPDATE). The flow doc is more accurate. The SKILL.md "9" refers to the canonical numbered stages and excludes the pre-flight and tail stages; no operational impact, but creates confusion for new contributors.

### I4 — `fingerprints.json` status: only flow doc correctly calls it "legacy v1 seed"

**Severity: Low.** The flow doc (`cloning-pipeline-flow.md`) does not reference `fingerprints.json` at all. `tools/recogniser/data/fingerprints.json` exists on disk. `tooling-map.md` line 254 marks it TO-RETIRE and correctly calls it a data source for Phase 1 seed. `skills-commands-map.md` does not mention it. No contradiction, but the SKILL.md pre-flight section (line 175) references "4-layer fingerprint catalogue" without distinguishing v1 `fingerprints.json` (seed/deprecated) from the live `sgs-framework.db block_attributes` table (canonical). This ambiguity could lead a new session to treat v1 fingerprints as authoritative.

### I5 — Spec 16 module sizes stale (doc claims ~1,140 lines; actual is ~1,900 lines)

**Severity: Low** (doc drift, no operational impact). Spec 16 §5 "Current modules (Phase 1)" states `convert.py` = 681 lines, `db_lookup.py` = 282 lines, `convert_page.py` = 173 lines, total ~1,136 lines. The tooling-map.md entry for Phase 7 (2026-05-15+) states `convert.py` is "~1900 lines after Phase 9 work". The spec was written for the Phase 1 prototype; Phase 7 and Phase 9 expanded the converter significantly. Spec 16 §5 was not updated.

---

## Gaps / missing coverage

### G1 — Pattern-level matching at Stage 2 is absent and documented as a gap

`cloning-pipeline-flow.md` Stage 2 GAP note: "Matches at BLOCK level only — no PATTERN-level matcher consulting patterns table or block_compositions before falling through." For the Mama's canary, 6 of 9 sections fall to `core/group` (no match) and activate the composer fallback. This is the primary reason parity is far from 99%. The gap is correctly documented but no implementation exists yet. Requirement 4 (match div classes to equivalent block) cannot reach full coverage until this gap is closed.

### G2 — Header/footer special-casing is documented as a follow-up, not implemented

`cloning-pipeline-flow.md` lines 466–475 (Stage 6 block) note that Stage 6 "can now target the 9 framework header/footer patterns shipped in Spec 17 … tracked as a follow-up." The converter does not yet contain logic to recognise a captured header/footer mockup as matching a Spec 17 framework pattern. Requirement 3 (group sections into `sgs/container` unless header/footer/hero) partially depends on this — the pipeline currently treats all sections uniformly rather than routing header/footer to their framework patterns.

### G3 — Stage 0.7 CSS lift is wrong-architecture and not in Spec 15

`cloning-pipeline-flow.md` Stage 0.7 explicitly states: "Stage 0.7 isn't in Spec 15 §7 stage list (was added during Phase 5h.1 commit 3dce6084 without spec entry). Dumps ALL CSS into one variation file instead of splitting universal / per-instance / bespoke per the captured feedback_cloning_preserves_intentional_bespoke_detail rule." This is an unregistered stage doing incorrect work (violating the rule that bespoke CSS details should become new tokens in the client style variation, not a monolithic dump). Neither Spec 15 nor Spec 16 describes or governs this stage.

### G4 — `--converter-v2` is still `default=False` — binding rule says it should be used in production

`SKILL.md` Hard Rule 12 canonical invocation explicitly includes `--converter-v2`. The binding rule from 2026-05-18 (`feedback_converter_v2_flag_required_for_cv2.md`) states "without it, every boundary is `_cv2_eligible=False` and the legacy extract path runs." The orchestrator argument definition (line 1858–1859) sets `default=False`. This means the improved converter is effectively opt-in, and a session that runs `/sgs-clone` without consulting Hard Rule 12 will silently use the legacy path. No docs explicitly flag this as dangerous; only the SKILL.md canonical invocation and the memory file capture it.

### G5 — `recognition_log` REST endpoint (`/sgs-blocks/v1/recognition-log/<id>/decide`) is marked TODO

`references/recognition-log.md` line 43 states the REST endpoint for operator actions "TODO for next session per known-issues list." This endpoint backs the four action buttons in `operator-review.html`. Without it, operator decisions from the review page cannot POST to `recognition_log`. The review page can be generated but is not fully interactive.

---

## Items where the pipeline over-covers or has dead code

### O1 — `tools/recogniser/` (v1 pipeline) is entirely dead code, not retired

`tools/recogniser/` contains: `recogniser.py`, `fingerprint_indexer.py`, `output_router.py`, `patch-featured-product.py`, `section_detector.py`, `serialiser.py`, `style_extractor.py`, `test_matchers.py`. `tooling-map.md` marks all of these TO-RETIRE. The orchestrator does not reference any of them. They remain on disk consuming space and creating confusion about which recogniser is canonical.

### O2 — Five dead DB tables in `sgs-framework.db`

`cloning-pipeline-flow.md` DB heat-map section lists: `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` (sgs-framework version) — all with "Empty; no live writers." These are retirement candidates. The `animations` table in sgs-framework.db is superseded by `uimax.animations`; having both tables with the same name in different DBs risks confusion.

### O3 — `tools/recogniser-v2/extract.py`, `extract_strategies.py`, `overrides/` exist and are still used as fallback

`spec-16` §FR8 specifies retirement conditions for `extract.py` (three preconditions; single-client visual QA pass required). All three preconditions are not yet met (Phase 4 visual QA still open). These files remain in the live fallback path for non-SGS-BEM-canonical sections. This is deliberate and documented, but per spec 16 §6 they total ~1,942 lines of code that should eventually retire.

---

## Notable findings outside the 9 requirements

### N1 — Two databases with "patterns" and "component_libraries" tables: no cross-DB transaction guarantee

The +REGISTER tail writes to BOTH `sgs-framework.db` (patterns, block_compositions) AND `ui-ux-pro-max.db` (patterns). `skills-commands-map.md` line 144 for `/uimax-sgs-scrape-pattern` states "Atomic cross-database write — both succeed or both roll back." SQLite does not support cross-database transactions natively. The "atomicity" depends on `uimax_write.validate_and_write` application-level logic, not a DB transaction. If one write succeeds and the server process is killed before the second, both DBs are in inconsistent state. No docs acknowledge this limitation.

### N2 — `router-pattern.md` resume loop contains idempotency claim that contradicts `staged_merge.py` all-or-nothing rollback

`router-pattern.md` (dispatch loop, lines 7–21) implies individual stages can be resumed ("if artefact_path exists and status == 'complete': skip"). `SKILL.md` line 271 correctly states staged_merge.py rolls back on failure as one all-or-nothing operation, so partial runs leave zero canonical changes. These two are not actually contradictory (the resume would re-run from the first incomplete stage using persisted artefacts), but the router-pattern.md description implies granular resume capability that doesn't exist in the current orchestrator.

### N3 — Phase 2A new blocks not yet registered in recogniser target tables

`cloning-pipeline-flow.md` Phase 2A addendum (lines 951–971) lists three new recogniser targets: `.sgs-responsive-logo`, `.sgs-icon`, `.sgs-timeline`. The handoff confirms `/sgs-update` has NOT yet been run since Phase 2A shipped. Until `/sgs-update` runs, `sgs-framework.db` does not contain canonical_slot rows for these blocks, meaning the Stage 3 SLOT-LIST handler will fail to generate slot lists for any mockup section using these blocks. This is a known pending action (handoff.md Priority 1), not a documentation error.

---

## Recommended actions (ordered by impact)

1. **Fix `router-pattern.md` resume section** — replace the `--resume <run_id>` invocation with the SKILL.md-correct description (fresh run_id, no resume flag). This is the highest-confusion item for a cold-start session. Estimated fix: 5 min edit.

2. **Update `skills-commands-map.md` "New scripts surfaced" table** — remove `tools/recogniser-v2/validate-naming.py` and replace with `plugins/sgs-blocks/scripts/lints/bem-lint.py` (the file that actually exists). Fixes a pre-flight mismatch. Estimated fix: 5 min edit.

3. **Run `/sgs-update`** — registers `sgs/responsive-logo`, `sgs/icon`, `sgs/timeline` in `sgs-framework.db`, enabling Stage 3 SLOT-LIST for Phase 2A blocks. Required before any clone run on a mockup using these blocks. Estimated time: 10–15 min (automated pipeline).

4. **Set `--converter-v2` as default-on** — change the orchestrator argument `default=False` to `default=True`, or document the invocation clearly as a mandatory flag. The binding rule from the SKILL.md and memory already mandates this; the orchestrator default contradicts it. Risk of silent regression on every run that omits the flag.

5. **Close Stage 0.7 architecture debt or spec it** — either register the CSS-lift stage in Spec 15 with a proper split strategy (universal / per-instance / bespoke), or extract it to a dedicated module and spec it. Currently it is an unspecced, wrong-architecture stage inside a deterministic pipeline. Low urgency for pipeline correctness, but will cause visual defects for clients whose drafts have bespoke CSS.

6. **Implement REST endpoint for `recognition_log` operator actions** — `references/recognition-log.md` marks this TODO. Until it exists, the operator-review HTML cannot complete the feedback loop. Medium effort; blocks the compounding pattern library growth that is the pipeline's core USP.

7. **Retire `tools/recogniser/` v1 pipeline** — all scripts are TO-RETIRE, none are wired. Remove them to eliminate confusion about which recogniser is canonical. Low risk; no live paths depend on them.

---

## Summary (100 words)

The pipeline's architecture is well-documented and internally consistent on critical execution paths. Three actionable inconsistencies exist: `router-pattern.md` describes a `--resume` flag that was deliberately removed; `skills-commands-map.md` still references `validate-naming.py` (a non-existent file; correct name is `bem-lint.py`); and Spec 16 module size figures are stale by ~760 lines. Of the 9 requirements, 7 are at least partially covered. The primary gap blocking the 99% parity target is Stage 2 pattern-level matching (currently block-level only), causing 6 of 9 Mama's sections to fall to a flat fallback composer. The `--converter-v2` flag defaulting to off is a silent regression risk on every cold-start run.
