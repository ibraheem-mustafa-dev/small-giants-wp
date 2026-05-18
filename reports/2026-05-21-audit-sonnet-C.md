# SGS Cloning Pipeline — Consistency + Coverage Audit

**Audit date:** 2026-05-21
**Auditor:** Sonnet (independent read-only pass, sub-agent C)
**Scope:** Internal consistency across 17 specified documents + requirements coverage against 9 defined criteria.
**Status at time of audit:** Phase 2A complete on `main` (0201c0d9). Cloning pipeline paused; next session returns to Spec 16 Phase 7 / orchestrator work.

---

## Headline Verdict

The pipeline documentation is substantially consistent with the orchestrator code. The most significant verified discrepancy is the `--resume` flag: it is documented as a supported CLI option in `router-pattern.md` but does not exist in the orchestrator argument parser, and a captured memory rule (`feedback_no_resume_no_stage_resume_in_pipelines.md`) explicitly bans it. For the 9 requirements, 6 are fully covered, 2 are partial (container-grouping and new-block creation), and 1 contains an internal spec contradiction. The 99% pixel-parity gate is architecturally defined but not yet passed in practice -- Stage 8 currently fails the gate for Mama's Munches sections.

---

## Requirements Coverage Matrix

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Scan a full draft HTML page | COVERED | Stage 0.1 / 0.5 / 0.7 read `sites/<client>/mockups/<page>/index.html`; Stage 1 boundary detection walks the full document. `cloning-pipeline-flow.md` Stage 1 + orchestrator line 536. |
| 2 | Clone exact visual to 99% accuracy (pixel-diff <1% per section, 3 viewports) | PARTIAL | Gate defined in Spec 16 `closure_gate_definition_v0_3` and Stage 8 of `cloning-pipeline-flow.md`. Infrastructure exists (`scripts/pixel-diff.py --selector`, autonomy_gate.py). Gate currently failing for Mama's Munches: `cloning-pipeline-flow.md` Stage 8 status "LIVE for matched; pass gate currently failing". No evidence any section has yet closed at <=1%. |
| 3 | Group class sections into sgs/container UNLESS header/footer/hero | PARTIAL | Spec 16 FR4 defines top-level `sgs/container` emission. Spec 16 R1 says sgs/container is "mandatory at top-level section boundary". Spec 16 FR3 explicitly says no sgs/container for pass-through wrappers. However: the spec does not explicitly exempt header, footer, or hero -- they are treated as matched registered blocks, not as container-grouping exceptions. Requirement 3's "UNLESS header/footer/hero" caveat has no explicit treatment in any spec or orchestrator code reviewed. |
| 4 | Match div classes to equivalent block (except the div directly under the section) | COVERED | Spec 16 R2 (atomic-tag precedence) + FR2 (atomic-tag emission) cover this. Stage 2 confidence-matrix.py scores candidate blocks. The direct-under-section div becomes sgs/container via FR4. DB-first lookups via `block_attrs()` in db_lookup.py route to the correct block slug. `cloning-pipeline-flow.md` Stage 2. |
| 5 | Recognise hierarchy for parent and child blocks | COVERED | Spec 16 R3 (slot-claim precedence) + FR1 (block-root slot harvest) define parent/child composition. `convert.py` implements recursive DOM walker. `stage1_boundary_hook.py` + `lingua_franca.py` enrich boundary payloads with hierarchy context. `cloning-pipeline-flow.md` Stages 3-4. |
| 6 | Find and translate attribute slot names | COVERED | Spec 15 §3.4 canonical slot vocabulary + `slot_synonyms` DB table. `db_lookup.py canonical_slot_for()` and `attr_name_for_slot_or_alias()`. Stage 3 reads `block_attributes` table (canonical_slot, role). `property_suffixes` table (117 rows) drives CSS-property-to-attr mapping. `cloning-pipeline-flow.md` Stage 3 + Stage 4.5. |
| 7 | Extract and move over slot content | COVERED | Stage 4 extraction via `tools/recogniser-v2/extract.py` (legacy) or `converter_v2/convert.py` (cv2, when `--converter-v2` flag active). Media-map resolves image references. Token snapping at Stage 4.5. `cloning-pipeline-flow.md` Stages 4-5. |
| 8 | (Optional) Recognise unmatched block → create new block, OR existing-block extension → add functionality/attribute | PARTIAL | Stage 9b autonomy chain scaffolds new blocks via `atomic-block-scaffold.py`. `attribute-gap-writer.py` and `functionality-gap-detector.py` are wired. However: `cloning-pipeline-flow.md` Stage 9b explicitly states "2 of N rails laid (classifier + scaffold). Missing rails: attribute-gap-writer + functionality-gap-detector + gap-review-report". The existing-block-extension path (adding a new attribute to an existing block) surfaces gaps to `attribute_gap_candidates` but has no automated promotion path beyond operator action. |
| 9 | (Minimum) Report unconverted items with diagnostic info | COVERED | Stage 9 five-bucket router (`leftover-bucket-router.py`), `simple_html_review_report.py`, `gap-review-report.py`, operator-review.html. `recognition_log` uimax table. `cloning-pipeline-flow.md` Stage 9. `references/recognition-log.md`. |

---

## Inconsistencies Found

**1. `--resume` flag: documented but not implemented and explicitly banned.**

`references/router-pattern.md` lines 13-15 documents `--resume <run_id>` as a supported CLI flag for resuming a halted pipeline. The orchestrator argument parser (`sgs-clone-orchestrator.py` lines 1857-1861) has no `--resume` argument. Memory rule `feedback_no_resume_no_stage_resume_in_pipelines.md` (CLAUDE.md project memory) explicitly bans this flag because "sessions are atomic". `router-pattern.md` is authoritative for skill behaviour but is incorrect on this point. The memory rule and the orchestrator code agree; `router-pattern.md` disagrees.

**Authoritative:** memory rule + orchestrator. `router-pattern.md` needs correction.

**2. Stage numbering mismatch between `pipeline-stages.md` and `cloning-pipeline-flow.md`.**

`references/pipeline-stages.md` (the SKILL.md companion) describes stages 1-9 with no stage 0.x sub-stages. `cloning-pipeline-flow.md` (the project doc) describes stages 0, 0.1, 0.5, 0.7, 0.8, 1-9, 9b, plus tail stages (+REGISTER, +DEPLOY, +PARITY). `pipeline-stages.md` does not mention stages 0.1, 0.5, 0.7, 0.8, 9b at all. The SKILL.md `## Goal` section references `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` which has been absorbed into Spec 15 -- the reference is stale.

**Authoritative:** `cloning-pipeline-flow.md` (project doc, last verified 2026-05-18). `pipeline-stages.md` is an older snapshot.

**3. `converter_v2` / legacy extract.py retirement: spec says retired, code says still present.**

Spec 16 states the legacy code (`tools/recogniser-v2/extract.py`, `extract_strategies.py`, `overrides/hero.py`) is "replaced" by converter_v2. `tools/recogniser-v2/overrides/hero.py` exists on disk (confirmed via directory listing). `cloning-pipeline-flow.md` Stage 4 also documents `tools/recogniser-v2/extract.py` as the `✓ LIVE` dispatch for Stage 4. Spec 16 planned retirement of the legacy path in Phase 6 but `cloning-pipeline-flow.md` notes retirement is "deferred to Phase 8 + only after visual gate closes". The legacy path remains active when `--converter-v2` is not passed.

**Authoritative:** `cloning-pipeline-flow.md` on current status. Spec 16 describes the intended end-state.

**4. `--converter-v2` default is OFF; binding rule says it MUST be used for cv2 output.**

The orchestrator argument definition (line 1858) sets `default=False`. Memory rule `feedback_converter_v2_flag_required_for_cv2.md` states the flag MUST be used for production runs; without it, every boundary is `_cv2_eligible=False` and the legacy extract path runs. `SKILL.md` Hard Gate 12 (`full-pipeline-for-lift-fidelity`) is not shown in the portion read, but the handoff note says "binding rule from 2026-05-18". A user who runs the orchestrator without `--converter-v2` gets the legacy behaviour silently. This is a usability gap: the "production default" is the legacy path, not the spec-compliant cv2 path.

**Authoritative:** memory rule + handoff. Risk: next session may forget the flag.

**5. SKILL.md references `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` but that spec has been absorbed.**

`SKILL.md` `## Goal` section line 23: "run the canonical 9-stage Draft-to-SGS pipeline (per `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md`)". Spec 12 was absorbed into Spec 15 and moved to `.claude/scratch/absorbed/`. The live spec is Spec 15 (Stages 0-2, 8-9) + Spec 16 (Stages 3-7).

**Authoritative:** Spec 15 header + CLAUDE.md architecture section. SKILL.md needs the reference updated.

**6. `pipeline-stages.md` +DEPLOY describes LiteSpeed cache flush; LiteSpeed removed from dev sites.**

`references/pipeline-stages.md` +DEPLOY tail: "Litespeed dual-purge if active". Root CLAUDE.md "Deploy Commands" section (updated 2026-05-05) documents LiteSpeed was removed from `palestine-lives.org` and `sandybrown-nightingale-600381.hostingersite.com`. The pipeline-stages tail step will execute a no-op or fail silently; it is not harmful but is stale.

**Authoritative:** root CLAUDE.md.

**7. Stage 0.7 architecture debt not reflected in any spec.**

`cloning-pipeline-flow.md` Stage 0.7 explicitly calls this "LIVE - working but wrong-architecture" and "isn't in Spec 15 §7 stage list". Spec 15's stage list does not include Stage 0.7. There is no spec entry for this stage anywhere in the 17 reviewed files. It is an undocumented production stage.

**Authoritative:** `cloning-pipeline-flow.md` (only document that acknowledges it). No spec exists for this stage.

---

## Gaps / Missing Coverage

**Requirement 2 (99% accuracy):** The per-section pixel-diff infrastructure exists. No section of the Mama's Munches homepage has yet closed at <=1% per `cloning-pipeline-flow.md` Stage 8. Phase 9 is active but incomplete. The gap is execution, not architecture.

**Requirement 3 (sgs/container grouping, header/footer/hero exception):** No spec or orchestrator code reviewed explicitly describes what happens to the top-level section when the matched block IS the header, footer, or hero. Spec 16 FR4 says sgs/container is emitted at top-level, period. If the section IS `sgs/hero`, the converter emits the hero block directly (FR1), not wrapped in a sgs/container. This may be the implicit behaviour, but it is not stated as a named rule anywhere. The requirement as stated contains an ambiguity the docs do not resolve.

**Requirement 8 (new block creation path):** The autonomy chain (Stage 9b) scaffolds a new block, but the wiring between the gap-writers and the scaffold output is described as incomplete in `cloning-pipeline-flow.md` Stage 9b ("2 of N rails laid"). The existing-block-extension path (adding a new attribute rather than a new block) surfaces to `attribute_gap_candidates` but the promotion loop from there back to a shipped attribute is manual.

**Pattern-level Stage 2 lookup:** `cloning-pipeline-flow.md` Stage 2 explicitly documents this as a known gap: "Matches at BLOCK level only - no PATTERN-level matcher consulting patterns table or block_compositions before falling through." For Mama's Munches, 6 of 9 sections return `core/group` (no match). This is a significant fidelity limiter: the recogniser cannot match composite patterns (header, footer, product grid) as named patterns; it can only match atomic blocks.

---

## Over-Coverage / Dead Code

**Five dead DB tables** identified in `cloning-pipeline-flow.md` DB heat-map: `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` (sgs-framework.db copy -- superseded by `uimax.animations`). Zero rows, no active writers. These add schema noise without contributing to any live stage.

**`tools/recogniser/` (v1):** The `tools/recogniser/` directory (distinct from `tools/recogniser-v2/` and `plugins/sgs-blocks/scripts/recogniser/`) contains `recogniser.py`, `section_detector.py`, `serialiser.py`, `style_extractor.py`, `fingerprint_indexer.py`, `output_router.py`. None of these appear in `cloning-pipeline-flow.md` as live stage scripts. `tools/recogniser-v2/` is the active legacy path. v1 appears to be retired dead code. `tooling-map.md` (not fully read due to size) may catalogue its status; it should be confirmed then deleted.

**`composer_fallback.py`:** `cloning-pipeline-flow.md` Stage 7 documents this as "FALLBACK ONLY - fires when matched block is core/group or confidence == 0". Separately, comments in the orchestrator (line 1011-1022) state "the retirement of composer_fallback" and that it "short-circuited" the autonomy chain with wrong markup. If it has been retired, the `cloning-pipeline-flow.md` entry is stale and the file should be confirmed absent or marked deprecated.

---

## Notable Findings Outside the 9 Requirements

**Spec 15 property suffix vocabulary count is stale.** Spec 15 §3.5 states "32 canonical" property suffixes. The live `property_suffixes` table has 117 rows (per `cloning-pipeline-flow.md` Stage 0.8 + SKILL.md Rule 11). The vocabulary has grown more than 3x since the spec was written; the spec number is not authoritative.

**sgs-framework.db path inconsistency.** `sgs-clone-orchestrator.py` line 83 sets `SGS_FRAMEWORK_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"`. `skills-commands-map.md` notes the canonical DB is "at `~/.agents/skills/sgs-wp-engine/sgs-framework.db`". These are two different locations on disk. If both exist as separate files, they may diverge. The orchestrator reads from `.claude/`; the skills-commands-map says `.agents/` is canonical. This is a potential stale-data risk.

**`pipeline-state/sgs-clone/` vs `pipeline-state/` path inconsistency.** `references/pipeline-stages.md` uses `pipeline-state/<run_id>/` as the run directory path. `cloning-pipeline-flow.md` uses both `pipeline-state/<run_id>/` and `pipeline-state/sgs-clone/<run_id>/` in different sections. The orchestrator code (line 1868) creates `REPO / "pipeline-state" / run_id` (no `sgs-clone` intermediate). `cloning-pipeline-flow.md` Stage 9 gap writers use `pipeline-state/sgs-clone/<run_id>/gap-review.md`. This suggests some artefacts go to different paths than others.

**Phase 2A blocks (sgs/responsive-logo, sgs/icon, sgs/timeline) not yet in sgs-framework.db.** `handoff.md` and `state.md` both note that `/sgs-update` has not been run since these blocks were added. Until run, the recogniser's DB-backed lookups will not find these blocks, and Stage 2 cannot match them. This is a known pending task.

---

## Recommended Actions (ordered by impact)

1. **Run `/sgs-update` immediately at next session start.** Three new blocks (sgs/responsive-logo, sgs/icon, sgs/timeline) added in Phase 2A are invisible to the DB-backed recogniser until the DB is refreshed. Every clone run until this is done will miss these blocks. Impact: high (unblocks pipeline accuracy for any mockup using these blocks).

2. **Fix the `--converter-v2` default.** Change `default=False` to `default=True` in the orchestrator argument parser (line 1858), or add a prominent warning when the flag is omitted. The binding rule says it MUST be used for production. The current default silently routes every run through the legacy path. Impact: high (every accidental legacy-path run misses widthMode emission, style-variation lift, and all Phase 8 improvements).

3. **Correct `router-pattern.md` `--resume` documentation.** Remove the `--resume <run_id>` invocation from lines 13-15 and the "Resume support" section. Replace with one sentence: "Pipeline runs are atomic per session; re-run the full pipeline from scratch if a run is interrupted." This prevents a future session from assuming resume support exists. Impact: medium (prevents wasted debugging time).

4. **Document the header/footer/hero exception for Requirement 3 explicitly.** Add a sentence to Spec 16 FR4 stating that when the top-level section matches a registered block directly (sgs/hero, framework header/footer pattern), that block is emitted without an outer sgs/container wrapper -- FR1 takes precedence over FR4. Currently the spec implies this via the precedence rules but never states it as a named exception. Impact: medium (removes ambiguity for future auditors and agents).

5. **Resolve the sgs-framework.db path inconsistency.** Confirm whether `.claude/skills/sgs-wp-engine/sgs-framework.db` and `~/.agents/skills/sgs-wp-engine/sgs-framework.db` are the same file (symlink or copy) or genuinely separate files. If separate, standardise the orchestrator to the canonical agents path. Impact: medium (a stale secondary DB causes silent wrong-data bugs in Stage 2-5 DB lookups).

---

## What Was Not Verified

- The actual row counts in `sgs-framework.db` tables (slot_synonyms, property_suffixes, block_attributes) against claimed counts in the docs. Claimed counts are taken at face value.
- Whether `composer_fallback.py` has actually been deleted or is still present on disk.
- The full `tooling-map.md` (truncated at 80 lines due to size limit; status entries for the 107 catalogued scripts were not all reviewed).
- Whether the `tools/recogniser/` v1 directory has a "DEPRECATED" marker or active test coverage that would explain its retention.
- The `decisions.md` entries beyond the portion read (skimmed for pipeline-relevant decisions only).
- Whether `pipeline-state/` vs `pipeline-state/sgs-clone/` path inconsistency reflects a runtime branching decision or a documentation error.
