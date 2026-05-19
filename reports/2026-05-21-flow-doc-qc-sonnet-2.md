# Flow Doc QC — Rater: Sonnet 2
**Target:** `.claude/cloning-pipeline-flow.md` (1301 lines)
**Date:** 2026-05-21
**Scope:** 15-check rubric across absorption completeness (A), wave accuracy (B), and internal consistency (C)

---

## Headline Verdict

**PASS with 3 findings.** The doc is accurate, well-structured, and absorbs its three sibling docs correctly. All five commits cited are real and match their described changes. The three findings are a missing dedicated stage block for +DEPLOY and +PARITY tails (C.11 gap), a broken "See also" link (C.12), and an omission of the Indus heritage-strip migration from the Wave 3 summary (B.8 minor gap). None are blocking — the document is fit to serve as the canonical implementation reference.

---

## Rubric table

| Check | ID | Result | Evidence / Notes |
|---|---|---|---|
| Script inventory covers convert.py, autonomy_gate.py, bem-lint.py, confidence-matrix.py, leftover-bucket-router.py, uimax-write-validator.py, attribute-gap-writer.py, staged_merge.py, pixel-diff.py, seed-legacy-role-lookup.py | A.1 | PASS | All 10 scripts present. convert.py: line 1051; autonomy_gate.py: line 1072; bem-lint.py: line 1120; confidence-matrix.py: line 1095; leftover-bucket-router.py: line 1096; uimax-write-validator.py: line 1130; attribute-gap-writer.py: line 1099; staged_merge.py: line 1070; pixel-diff.py: line 1059+1134; seed-legacy-role-lookup.py: line 1130. |
| Skill dispatch chain covers /uimax-classify-naming, /uimax-sgs-scrape-pattern, /uimax-scrape-animation, /sgs-wp-engine, /visual-qa, /research-buddies | A.2 | PARTIAL | /uimax-classify-naming (line 939, 1175, 1193), /uimax-sgs-scrape-pattern (line 793, 1188), /uimax-scrape-animation (line 795, 1196), /sgs-wp-engine (line 1191), /visual-qa (line 647, 946, 1199) — all present. **/research-buddies is absent from the flow doc.** Not referenced anywhere in the 1301 lines. Whether this is an absorption gap from skills-commands-map.md or was never in scope is UNVERIFIABLE without reading the original 459-line stub (which now contains only a redirect). |
| DB heat-map covers blocks, block_attributes, slot_synonyms, property_suffixes, modifier_suffixes, design_tokens, patterns, block_compositions, attribute_gap_candidates, legacy_role_lookup, plus uimax: component_libraries, patterns, animations, naming_conventions, recognition_log, functionality_gap_candidates | A.3 | PASS | All 16 tables present. blocks: line 1264; block_attributes: line 1260; slot_synonyms: line 913, 1261; property_suffixes: line 1263; modifier_suffixes: line 1269; design_tokens: line 1270; patterns (both DBs): line 917–921; block_compositions: line 917; attribute_gap_candidates: line 1267; legacy_role_lookup: line 1268; component_libraries: line 921, 1280; animations: line 923, 1281; naming_conventions: line 1234, 1283; recognition_log: line 919, 1279; functionality_gap_candidates: line 920, 1284. |
| Three sibling stubs are ~9-line redirect files | A.4 | PASS | All three confirmed at 9 lines each (verified by wc -l). tooling-map.md: 9 lines + correct redirect; skills-commands-map.md: 9 lines + correct redirect; db-tables-map.md: 9 lines + correct redirect. All state original stats and point to the correct absorbed section. |
| Spec 15 absorption note in companion_docs + truth-doc-structure | A.5 | PASS | companion_docs field at line 54–57 lists Spec 15 with "ABSORBED 2026-05-21 → see Spec 16 §12 Appendix A". truth-doc-structure table at lines 62–77 names both documents and lists all four absorbed items. Spec 15 frontmatter itself verified: `status: ABSORBED_INTO_SPEC_16`, `absorbed_into: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`. |
| Wave 1 (ee8db653): cv2-only path + Stage 8 stub skip sentinel | B.6 | PASS | cv2-only path: line 386 "default flipped True (Wave 1 2026-05-21)"; line 1066 "Non-SGS-BEM halt replaces legacy subprocess". Stub sentinel: line 659 "`stub_capture()` no longer silently returns 0.0. Returns {diff_ratio: None, stage_8_skipped: True} sentinel. autonomy_gate returns surface-to-operator on skip." Both accurately describe ee8db653. |
| Wave 2 (7d713ba0): --selector pixel-diff, unresolved_slots gate, STAGE_2_CONFIDENCE_THRESHOLD=0.7, require_schema default-True. No live "Wave 2 licensing reject" claim. | B.7 | PASS | --selector: line 651–653. unresolved_slots: line 655–657. STAGE_2_CONFIDENCE_THRESHOLD=0.7: line 719–723 and confirmed in confidence-matrix.py:80. require_schema default-on: line 566–570 and confirmed in staged_merge.py:96. Licensing: the doc correctly characterises this as a Wave 2b regression that was "REVERTED same session" (line 797–804). No claim that licensing rejection is live. |
| Wave 3 (e60fe58e): CSS D3 + Stage 3 DB canonical_slot + LEGACY_ROLE_LOOKUP→DB + RETIRED_BLOCK_REMAP empty + Indus migration | B.8 | PARTIAL | CSS D3: line 362–365 (Stage 3) and line 414–415 (Stage 4). Stage 3 DB canonical_slot: lines 362–368 ("canonical_source: 'db' \| 'auto-derived'"). LEGACY_ROLE_LOOKUP→DB: line 724–727, confirmed in leftover-bucket-router.py:52. RETIRED_BLOCK_REMAP emptied: line 728–729. **Indus heritage-strip migration is NOT mentioned anywhere in the flow doc.** The git commit subject (e60fe58e) explicitly calls it out as a Wave 3 item. The flow doc omits it entirely. This is a coverage gap, though likely minor in operational terms. |
| Wave 2b licensing revert: tombstone comment + no FORBIDDEN_KEYWORDS + no check_licensing_keywords() | B.9 | PASS | Verified in uimax-write-validator.py directly. Lines 42–43: "This validator does NOT check for licensing keywords … Web designs and component patterns aren't licenseable". Lines 52–53: "tombstone — re-implementing licensing scans here is a regression". Lines 139–141: second tombstone comment. `FORBIDDEN_KEYWORDS` and `check_licensing_keywords` are absent from the file. |
| Spec 15 frontmatter: status=ABSORBED_INTO_SPEC_16 + absorbed_into pointer | B.10 | PASS | Confirmed: `status: ABSORBED_INTO_SPEC_16 (2026-05-21)` at line 7 of Spec 15. `absorbed_into: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` at line 8. `absorbed_at_section: "§12 Appendix A — Spec 15 absorbed content"` also present. |
| All pipeline stages have their own block with status | C.11 | PARTIAL | Documented stage blocks: 0, 0.1, 0.5, 0.7, 0.8, 1, 2, 3, 4, 4.5, 5, 6, 7, 7b, Pre-deploy gate, 8, 9, 9b, +REGISTER, Final acceptance harness. The status summary at line 966 lists four tails: "DEPLOY/PARITY/REGISTER/UPDATE". **+REGISTER and Final acceptance harness have dedicated blocks. +DEPLOY and +PARITY do NOT have dedicated blocks** — they are only mentioned in the skill dispatch quick index table (line 1179) with no wiring details, no FILES block, no DB tables, no STATUS line. /sgs-update (the UPDATE tail) is covered under "Sister pipeline" at line 835, which does have an 11-stage block. This is a genuine gap: +DEPLOY and +PARITY are listed as tails in the summary count but have no corresponding block with status. Stage 0.8 has a STATUS line ("LIVE (Branch B 2026-05-18)") so it passes individually. |
| No broken cross-doc markdown links | C.12 | FAIL | `.claude/plans/phase-6-pattern-fidelity.md` is referenced at line 1010 ("See also" section). The file does not exist on disk. The plans directory contains `phase-7-spec-16-converter-rollout.md` and others but no `phase-6-pattern-fidelity.md`. All other "See also" links checked (Spec 15, spec-15-master-execution-plan.md, state.md, decisions.md) are present on disk. |
| Wave N (commit X) references cite correct commits | C.13 | PASS | All five commits verified against git log: 62ee8b87 (session audit+foundation, line cited in Pattern-key section), ee8db653 (Wave 1, line 36, 378, 659), 7d713ba0 (Wave 2, line 566, 652, 719, 797), e60fe58e (Wave 3, line 362, 414, 724), 13dc3161 (Wave 4, appears in state.md as the session-close commit). The flow doc does not directly cite 62ee8b87 or 13dc3161 by hash in the main body — Wave 4 is described as "truth-doc consolidation" rather than given a Wave N block — but this matches the state.md description that Wave 4 was the absorption pass. Commit hashes cited ARE all valid. |
| Stage-status spot-check: autonomy_gate.py, convert.py walk(), per-section-convention-voter.py | C.14 | PASS | autonomy_gate.py: doc says "decision logic (PASS / FAIL / SURFACE)" + "CURRENT/YES" (line 1072). Confirmed: autonomy_gate.py lines 22, 28, 464 show PASS/FAIL/SURFACE logic and post-PASS /sgs-update trigger. convert.py walk(): doc says "Slot-aware DOM-to-WP-blocks converter. Wave 3 D3 gap-candidate emission" (line 1051). Confirmed: convert.py line 2859 `def walk(node, css_rules, ...)` exists; Wave 3 D3 helpers (seed_gap_context, flush_gap_candidates) confirmed in commit e60fe58e. per-section-convention-voter.py: doc says "LEGACY_ROLE_LOOKUP migrated to DB (Wave 3)" (line 1094). Confirmed: leftover-bucket-router.py line 52 `STAGE_2_CONFIDENCE_THRESHOLD = 0.7`, line 48–49 describes the wave. |
| End-goal alignment: <1% pixel parity per section + deterministic + no legacy fallback + universal extraction | C.15 | PASS | <1% per section: line 651 "pixel-diff ≤ 1% at 375/768/1440 viewports — per SECTION via --selector". Deterministic: line 352 "deterministic not inline architectural rule" referenced. No legacy fallback: line 378–380, Stage 4 block explicitly marks extract.py as UNREACHABLE and non-SGS-BEM boundaries halt with operator note. Universal extraction: line 41 "after universal-extraction verification"; Wave 3 commit (e60fe58e) subject: "universal extraction completeness". All four end-goal criteria covered in the document. |

---

## Confirmed-clean items

- All three sibling-doc stubs are correctly sized (9 lines each) with accurate redirect text and original stats.
- Wave 2b licensing revert is fully documented with two tombstone comments in the actual validator file — no live licensing gate exists.
- All five commit hashes appear in git log and their attributed changes match what the doc describes.
- Stage 8 stub sentinel (Wave 1) is accurately described — autonomy_gate.py confirms the `surface-to-operator` on skip behaviour.
- Spec 15 absorption markers in both the flow doc frontmatter and Spec 15 itself are present and consistent.
- uimax-write-validator.py: no FORBIDDEN_KEYWORDS, no check_licensing_keywords(), two tombstone comments confirming the revert.
- Stage 3 Wave 3 change (DB canonical_slot annotation with `canonical_source` field) is accurately described.
- The Rosetta Stone gate (+REGISTER tail) is correctly described as active with the validator wired via uimax_write.validate_and_write.
- End-goal criteria (≤1% per-section, deterministic, cv2-only, universal extraction) are all represented.
- The /sgs-update sister pipeline 11-stage block is present and accurately lists scripts per stage.

---

## Issues found

### Issue 1 — Missing /research-buddies in skill dispatch chain (A.2 — MINOR)
**Location:** Skill dispatch chain (full) section, absorbed from skills-commands-map.md.

The rubric requires verification of `/research-buddies` in the absorbed content. It is absent from the entire 1301-line document. The original skills-commands-map.md is now a 9-line redirect stub, making it impossible to verify whether this omission was in the original or was dropped during absorption. Given the doc correctly includes all other checked skills, this is likely a genuine absorption gap rather than a pre-existing omission — but the evidence trail is gone. **Risk: low** (research-buddies is not a pipeline-stage skill; it is a cross-cutting research aid).

### Issue 2 — Wave 3 omits Indus heritage-strip migration (B.8 — MINOR)
**Location:** Stage 9 block Wave 3 entry (line 724–729), Stage 4 block Wave 3 entry (line 362–368), and Script inventory table.

The Wave 3 commit (e60fe58e) explicitly lists "Indus heritage-strip migration" in its subject line as a fourth parallel agent. The flow doc covers Wave 3a (CSS D3), Wave 3b (Stage 3 DB canonical_slot), and Wave 3c (LEGACY_ROLE_LOOKUP→DB + RETIRED_BLOCK_REMAP), but does not document Wave 3d at all. Whether this was a one-off data operation (not requiring a stage block) or a structural pipeline change is UNVERIFIABLE from the flow doc alone. The omission means an agent reading the flow doc would not know that heritage-strip ran in Wave 3. **Risk: medium** if the operation left pipeline-state artefacts that affect subsequent runs; low if it was a pure data migration with no pipeline wiring change.

### Issue 3 — Broken "See also" link to phase-6-pattern-fidelity.md (C.12 — MINOR)
**Location:** Line 1010, "See also" section.

`[.claude/plans/phase-6-pattern-fidelity.md](plans/phase-6-pattern-fidelity.md)` resolves to a file that does not exist on disk. The plans directory contains `phase-7-spec-16-converter-rollout.md` but no phase-6 plan. This plan may have been renamed, archived, or superseded. **Risk: low** for day-to-day use (the link is in a "See also" section, not a live pipeline reference), but an agent cold-starting from this doc would attempt to read a nonexistent file.

### Issue 4 — +DEPLOY and +PARITY tails have no dedicated blocks (C.11 — MINOR)
**Location:** Status summary at line 966 lists "+DEPLOY/+PARITY/+REGISTER/+UPDATE" as the four tails. Only +REGISTER (line 765–810) and /sgs-update (line 835–873) have proper documented blocks. +DEPLOY and +PARITY appear only as a combined entry in the skill dispatch quick index (line 1179) with no FILES, DB tables, STATUS, or script wiring detail.

The doc's own update-trigger list says "Pipeline stage change (new stage, retired stage, renumbered)" should trigger an update. If +DEPLOY and +PARITY are real execution tails with their own scripts and artefacts, they need stage blocks. If they are conceptual labels for operations already documented inside Stage 8, the status summary count should be corrected. **Risk: medium** — a developer reading the summary count of "10 + 4 tails" would expect to find four documented tail blocks and can only locate two.

---

## Confidence and caveats

**Confidence: 88%.**

- All code-level verifications (validator tombstones, STAGE_2_CONFIDENCE_THRESHOLD value, autonomy_gate PASS/FAIL/SURFACE, walk() function existence, require_schema default) were confirmed against actual source files.
- Commit hashes all verified against git log — descriptions match.
- The /research-buddies gap (A.2) and Indus migration omission (B.8) are genuine absences but were not verifiable against the now-destroyed original stubs.
- I did not read other raters' reports as instructed.
- Wave 4 is not given its own Wave block in the flow doc — the doc treats it as the absorption/cleanup session rather than a code wave. This is arguably correct given state.md's description, but a future reader may be confused by the discontinuity between Waves 1-3 (each with a commit hash) and Wave 4 (present only in state.md and handoff.md).
