---
rater: Sonnet (primary)
audit_target: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md §12 Appendix A
audit_date: 2026-05-21
verdict: CONDITIONAL-PASS
---

# Spec 16 §12 Absorption Audit — Sonnet Rater Report

## Headline verdict: CONDITIONAL-PASS

§12 is substantially complete and accurate. The absorption covers all six layers, all 11 /sgs-update stages, all upstream conditions, and all key FR statuses. Three issues prevent a clean PASS: (1) a property_suffixes count discrepancy between the §12 claim and the live DB; (2) the modifier suffix vocabulary count in §12.4's FR28 status line is internally inconsistent; (3) the Phase 1-6 execution status table from Spec 15 §11 is not folded in as its own sub-section.

---

## Rubric table

| Check | Result | Notes |
|-------|--------|-------|
| A.1 §12.1 — All 6 layers (L0–L5) | PASS | Spec 16:542–562. All six layers present with concrete content (table names, data sources). L2 additionally notes `legacy_role_lookup` added Wave 3c — accurate update. |
| A.2 §12.2 — Convention layer completeness | PASS | Spec 16:566–568. SGS-BEM regex present; behavioural canonicalisation rule present; canonical attribute decomposition template with examples present. All three elements folded in. |
| A.3 §12.3 — Canonical slot vocabulary (20 v1 slots) | PASS | Spec 16:574–595. All 20 rows from Spec 15 §3.4 reproduced accurately. Phase 3.5 extension note (layout primitives, state slots, motion concepts) added at line 597 — this is a legitimate and accurate addendum beyond the v1 seed. |
| A.4 §12.4 — Property suffix vocabulary (32 canonical) | CONDITIONAL | Spec 16:601 claims "99 rows as of 2026-05-17". DB query returns 117. See Issue 1. The 32 canonical suffixes themselves are correctly reproduced from Spec 15 §3.5. |
| A.5 §12.5 — Modifier suffix vocabulary (19 rows) | PASS | Spec 16:612 claims "19 rows across 6 kinds". DB confirms 19. Table reproduced correctly from Spec 15 §3.6 (with the original 16 canonical rows expanded to 19 post-Phase-1 — consistent with Spec 15 §11 Phase 1 success criteria which already stated 19 rows). |
| A.6 §12.6 — /sgs-update 11-stage pipeline | PASS | Spec 16:627–641. All 11 stages present with function descriptions. Wave 3c Stage 0 addition documented. Matches Spec 15 §6 table accurately. |
| A.7 §12.7 — Upstream conditions | PASS | Spec 16:647–656. All 6 source-of-draft rows from Spec 15 §8 reproduced. Wave 1 update (non-SGS-BEM input now HALTS-WITH-CLEAR-ERROR) is a legitimate addition, not a contradiction of Spec 15. |
| A.8 §12.8 — QA gates summary | PASS | Spec 16:662–672. Stage 0.1, 0.5, 2, 3, 6, 8, 9 all listed with Wave 2/3 statuses. STAGE_2_CONFIDENCE_THRESHOLD ≥ 0.7 correct. require_schema default-True correct. --selector per-section correct. unresolved_slots gate present. Matches Spec 15 §9 intent. |
| A.9 §12.9 — FR27–FR40 inventoried | CONDITIONAL | Spec 16:677–689 covers post-2026-05-21 statuses. Notable omissions: FR29, FR34, FR35, FR36, FR37 not listed with explicit LIVE/OPEN status (only implicitly covered). FR28 status line at 681 cites "99 property_suffixes + 19 modifier_suffixes" — property_suffixes count is stale (see Issue 1). See Issue 2. |
| B.10 Spec 15 frontmatter — absorption marker | PASS | Spec 15:4–10. `status: ABSORBED_INTO_SPEC_16`, `absorbed_into: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`, `absorbed_at_section: "§12 Appendix A"`, `absorption_date: 2026-05-21` — all four required fields present and correct. |
| B.11 Spec 16 frontmatter — references Spec 15 | PASS | Spec 16:36–50 (`relationship_to_spec_15` block) explicitly describes the predecessor relationship. The `references` list at line 52 cites Spec 15. No explicit "absorbed" label in frontmatter, but the §12 preamble (line 536) and the `relationship_to_spec_15` section make the status unambiguous. Acceptable. |
| C.12 Cross-references internal to §12 | CONDITIONAL | Spec 16:660 cites "Spec 16 §FR6 + §FR7" — these are not section headings in Spec 16; the actual section headings are "FR6 — CSS routing" and "FR7 — Visual QA verification" in §3. The reference is intelligible but not navigable as written. See Issue 3. |

---

## Spot-check fact validations

| Check | §12 claim | Live evidence | Result |
|-------|-----------|---------------|--------|
| SC1 — property_suffixes count | "99 rows as of 2026-05-17" (Spec 16:601) | DB query: `SELECT COUNT(*) FROM property_suffixes` → **117** | FAIL — 18-row discrepancy |
| SC2 — modifier_suffixes count | "19 rows across 6 kinds" (Spec 16:612) | DB query: `SELECT COUNT(*) FROM modifier_suffixes` → **19** | PASS |
| SC3 — Stage 0 legacy_role_lookup seeding in update-db.py | "Wave 3c added Stage 0 to /sgs-update" (Spec 16:641) | `update-db.py` lines 231–249: `run_seed_legacy_role_lookup(repo_path)` called unconditionally, function defined at line 238 | PASS |

---

## Confirmed-clean items

- Spec 15 frontmatter absorption marker: fully compliant (B.10).
- All six architectural layers reproduced accurately with concrete table names and data sources (A.1).
- SGS-BEM regex reproduced verbatim and correctly (A.2).
- All 20 v1 canonical slot vocabulary rows present and accurately reproduced (A.3).
- All 11 /sgs-update stages present with accurate function descriptions; Wave 3c Stage 0 addition accurate (A.6).
- All 6 upstream condition rows present; Wave 1 halt-on-non-BEM addition is a legitimate status update (A.7).
- QA gates table correctly reflects Wave 2/3 statuses including the per-section --selector threading and unresolved_slots gate (A.8).
- modifier_suffixes live DB count (19) matches §12.5 claim exactly (SC2).
- legacy_role_lookup seeding wired correctly in update-db.py (SC3).

---

## Issues found

**Issue 1 — property_suffixes count stale (MEDIUM).**
Spec 16 §12.4 (line 601) states "99 rows as of 2026-05-17 — 18 per-side longhand rows added". The live DB contains 117 rows. The gap is 18, which ironically matches the "18 per-side longhand rows added" annotation — suggesting the baseline count was 81 pre-addition and 99 post-addition at 2026-05-17, but further rows were added between 2026-05-17 and today. The annotation is internally consistent but the total is outdated. §12.9 FR28 status line (line 681) also repeats "99 property_suffixes" — same stale figure. Fix: update both lines to reflect current count (117) or remove the row-count assertion and describe it as "seeded from 32 canonical suffixes, extended with per-side longhand variants — see DB for current count".

**Issue 2 — FR27–FR40 coverage incomplete in §12.9 (LOW).**
§12.9 (lines 677–689) lists LIVE/SHIPPED status for FR21, FR22, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR38, FR39. FR36 (polymorphic media migration), FR37 (cross-platform composition), and FR40 (hero override deletion) have no explicit status entry. Spec 15 §10 listed all 14 new FRs (FR27–FR40); the absorption should account for each. Even a brief "OPEN — Phase 3" or "OPEN — Phase 6" line per FR would satisfy completeness. The omission is not a factual error but leaves the inventory partial.

**Issue 3 — Cross-reference "§FR6 + §FR7" not navigable (LOW).**
Spec 16 §12.8 (line 660) reads "See Spec 16 §FR6 + §FR7 for the converter-layer gates". There are no section headings labelled §FR6 or §FR7 in Spec 16. The actual locations are §3's FR6 and FR7 subsections (lines 188 and 236 respectively). A reader following the cross-reference would need to search manually. Fix: change to "See Spec 16 §3 FR6 + FR7".

**Issue 4 — Phase 1–6 execution status not folded in (LOW).**
Spec 15 §11 contained a detailed six-phase execution status table (phases shipped, acceptance criteria met/failed, root-cause notes). This is not reproduced in §12 as a sub-section. The pre-absorption scope definition for §12 listed "Phase 1-6 execution status — Spec 15 §11" as required content. §12 has no §12.11 or equivalent covering this. It is worth noting that execution status is inherently time-bound and arguably belongs in handoff/state docs rather than a spec appendix; however, given the rubric explicitly lists it, the absence is a gap.

---

## Confidence + caveats

- **Confidence: High** on A.1–A.3, A.5–A.8, B.10, B.11, SC2, SC3 — directly verified against both spec files and live DB.
- **Confidence: High** on Issue 1 — DB query is deterministic; the 117 vs 99 discrepancy is unambiguous.
- **Confidence: Medium** on Issue 4 — the rubric specifies "Phase 1-6 execution status" as required content, but execution status tables are not traditionally part of a spec appendix. If the intent was to summarise shipped vs open, §12.9 partially covers this via FR status lines. Treated as a gap per the rubric, but flagged as potentially intentional omission.
- **UNVERIFIABLE:** Whether the 18 additional rows in property_suffixes (beyond the 2026-05-17 count of 99) were added intentionally and are correctly modelled. Only that the count discrepancy exists is verifiable from this audit.
