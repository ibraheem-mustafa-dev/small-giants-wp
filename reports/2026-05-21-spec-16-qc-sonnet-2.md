# QC Report — Spec 16 §12 Absorption Audit (Sonnet Rater 2)

**Target:** `C:/Users/Bean/Projects/small-giants-wp/.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §12 Appendix A  
**Source:** `C:/Users/Bean/Projects/small-giants-wp/.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`  
**Date:** 2026-05-21  
**Rater:** Sonnet 2 (independent — no other rater reports read)

---

## Headline Verdict

**PASS with two noted discrepancies.** The §12 absorption is substantively complete and accurate. All major content from Spec 15's owned scope (L0–L3, Stages 0–2, 8–9, /sgs-update, FR27–FR40) is present in Spec 16 §12. Both discrepancies are factual errors in row-count claims that are verifiable against the live DB and the original spec text; neither invalidates the functional content of the absorbed sections.

---

## Rubric Table

| Item | Check | Verdict | Notes |
|------|-------|---------|-------|
| A.1 §12.1 — 6 layers L0–L5 | Spec 16 §12.1 (line 543–562) lists all six layers, matching Spec 15 §2 | PASS | L2 correctly updated to include `legacy_role_lookup [added Wave 3c 2026-05-21]`; Spec 15 §2 (line 80–84) did not include this table as it post-dates the original. |
| A.2 §12.2 — SGS-BEM regex + behavioural canon + decomposition template | Spec 16 §12.2 (lines 566–568) matches Spec 15 §3.1–§3.3 on all three elements: regex identical, behavioural rule present, decomposition template present with examples | PASS | |
| A.3 §12.3 — 20 v1 canonical slots | Spec 16 §12.3 (lines 573–596) lists 20 canonical slots in the same table structure as Spec 15 §3.4 (lines 153–174). Row-by-row match confirmed. | PASS | Phase 3.5 extension note (layout primitives/state/motion as first-class design slots) is correctly folded in at line 596–597. |
| A.4 §12.4 — 32 property suffixes | Spec 16 §12.4 (lines 601–608) says "32 canonical property suffixes frozen after Phase 1… 99 rows as of 2026-05-17". The 32 listed categories match Spec 15 §3.5 exactly. | **ISSUE — SEE BELOW** | DB actual: 117 rows, not 99. Spec 16 line 601 says "99 rows as of 2026-05-17" — stale count. |
| A.5 §12.5 — 19 modifier suffixes (6 kinds) | Spec 16 §12.5 (lines 613–620) table lists 19 rows across 6 kinds (Breakpoint 3, Side 4, Corner 4, State 4, Variant 3, Unit 1 = 19). DB confirmed: 19 rows. | PASS | Note: Spec 15 §3.6 (line 191) says "16 canonical" — that is a pre-seeding figure from the original spec. §12.5 correctly reflects the shipped count of 19. No discrepancy between §12.5 and DB. |
| A.6 §12.6 — /sgs-update 11 stages | Spec 16 §12.6 (lines 628–641) lists all 11 stages matching Spec 15 §6. Stage 0 (Wave 3c) addition is present. | PASS | Stage 0 correctly noted as "Added 2026-05-21" at line 641. |
| A.7 §12.7 — Upstream conditions table | Spec 16 §12.7 (lines 646–656) reproduces the 6-source table from Spec 15 §8. Column labels simplified ("Enforcement" → "Enforcement" vs Spec 15's "Enforcement point") — acceptable editorial change. Wave 1 halt-on-error note at line 656–657 is an accurate addendum. | PASS | |
| A.8 §12.8 — QA gates summary (Wave 2/3 status reflected) | Spec 16 §12.8 (lines 659–672) has the gate table with Wave 2 status column, showing LIVE entries for Stages 0.1, 0.5, 2, 3, 6, 8, 9. Spec 15 §9 (lines 527–537) did not have the Wave 2 column — this is a correct forward update. Stage 7 (WP block markup parse) from Spec 15 is absent from the §12.8 table. | **ISSUE — SEE BELOW** | Stage 7 QA gate (WP markup parse) present in Spec 15 §9 line 534 is not listed in §12.8 table. May be intentional (Wave 2 not addressing Stage 7) but no note explains the omission. |
| A.9 §12.9 — FR27–FR40 inventory | Spec 16 §12.9 (lines 674–689) covers FR21–FR22 and FR27–FR40 status. Each FR is present: FR27–FR35 LIVE, FR38–FR39 SHIPPED, no status on FR36, FR37, FR40. | PASS | FR36 (polymorphic media), FR37 (cross-platform), FR40 (hero override deletion) are unlisted — those are sequenced for later phases. Consistent with Spec 15 §10 which shows FR36=Phase3, FR37=Phase6, FR40=Phase3. Not a gap in coverage; appropriate staging deferral. |
| B.10 Spec 15 frontmatter absorption markers | Spec 15 frontmatter (lines 7–10): `status: ABSORBED_INTO_SPEC_16`, `absorbed_into: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`, `absorbed_at_section: "§12 Appendix A — Spec 15 absorbed content"`, `absorption_date: 2026-05-21` | PASS | All four required fields present and accurate. |
| B.11 Spec 16 frontmatter references Spec 15 absorption | Spec 16 frontmatter has `relationship_to_spec_15` key (lines 36–50). §12 opens at line 534 with an explicit absorption statement naming Spec 15 and the date. `references` block at line 52 names Spec 15. | PASS | No single `absorbed_from` key in Spec 16 frontmatter (the inverse of Spec 15's `absorbed_into`) — not required by rubric, but would aid automated tooling. |
| C.12 Cross-references in §12 accurate | §12.4 references "Spec 15 §3.5" (matches). §12.3 references "Spec 15 §3.4" (matches). §12.6 references "Spec 15 §6" (matches). §12.8 references "Spec 16 §FR6 + §FR7" — FR6 is at Spec 16 §3 lines 189–227 (confirmed). §12.9 references "Spec 15 §10" (matches). | PASS | All internal and cross-doc references verified. |

---

## Confirmed Clean

- All 20 canonical slots in §12.3 match Spec 15 §3.4 row-for-row (Spec 16 lines 576–595 vs Spec 15 lines 153–174).
- The 6-kind modifier vocabulary in §12.5 matches the live DB exactly (19 rows confirmed).
- /sgs-update Stage 0 (Wave 3c) wiring claim verified: `update-db.py` (C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/update-db.py) at line 233 calls `run_seed_legacy_role_lookup(repo_path)` which invokes `seed-legacy-role-lookup.py` at `plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py` (confirmed present). The function is called unconditionally at line 233 (not only on change detection), consistent with the "always run, idempotent" claim at Spec 16 line 641.
- Spec 15 §3.7 (polymorphic media discriminator schema) is NOT reproduced in §12 — this is acceptable because it is owned by FR36, which is a deferred phase. The absence is not a gap in the absorbed content scope.
- Spec 15 §5 (mapping layer detail — selector derivation, output-signature comparison) is not reproduced in §12 — Spec 16 §12 covers L3 at the vocabulary level (slots, suffixes, modifiers), not at the full algorithmic level. This is consistent with §12's stated scope ("canonical content Spec 15 owned") and the fact that the full algorithms are referenced in Spec 16 §2–§3.

---

## Issues

### Issue 1 — property_suffixes row count stale (A.4)

**Location:** Spec 16 §12.4, line 601  
**Claim:** "99 rows as of 2026-05-17"  
**DB actual:** 117 rows (queried `C:/Users/Bean/.agents/skills/sgs-wp-engine/sgs-framework.db`)  
**Spec 15 source:** Spec 15 §4.1 table (line 234) said "0 → 32" at seeding time; post-Phase-1 the DB grew as 18 per-side longhand rows were added (noted in Spec 16 line 601 itself: "18 per-side longhand rows added"). The 99 figure was accurate as of 2026-05-17 but the DB has since grown to 117. The count in the spec is a snapshot, not a live claim, so this is a low-severity documentation drift rather than a functional error.  
**Recommended fix:** Update Spec 16 §12.4 line 601 to say "117 rows as of 2026-05-21" or drop the count claim and link to the DB instead.

### Issue 2 — Stage 7 QA gate absent from §12.8 table (A.8)

**Location:** Spec 16 §12.8, lines 662–671  
**Missing entry:** Spec 15 §9 (line 534) lists Stage 7 — "WP block markup parse" — as a QA gate. §12.8 has no entry for Stage 7.  
**Impact:** Low. The stage 7 gate is a converter-layer gate (output validity), not a Spec 15-owned pipeline gate, and Spec 16 §12.8 explicitly says it covers "Spec 15-owned Stage 0/0.1/0.5 + Stage 2 + Stage 8/9". However, the Spec 15 table includes it, so strict absorption completeness is not met.  
**Recommended fix:** Either add a Stage 7 row to the §12.8 table with a note pointing to Spec 16 §FR6 as its owner, or add a footer line explaining the deliberate omission.

---

## Spot-Check Results

| Check | Claim in Spec 16 | Actual | Verdict |
|-------|-----------------|--------|---------|
| 1 — property_suffixes row count | "99 rows as of 2026-05-17" (§12.4 line 601) | 117 rows (DB query 2026-05-21) | FAIL — stale count |
| 2 — modifier_suffixes row count | "19 rows across 6 kinds" (§12.5 line 613) | 19 rows, 6 kinds (DB confirmed) | PASS |
| 3 — /sgs-update Stage 0 legacy_role_lookup wiring | "Stage 0 — legacy_role_lookup seeding via seed-legacy-role-lookup.py (idempotent)" (§12.6 line 641) | update-db.py line 233 calls `run_seed_legacy_role_lookup()` unconditionally; script at `plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py` confirmed present | PASS |

---

## Caveats

- The main `plugins/sgs-blocks/scripts/sgs-framework.db` in the repo is 0 bytes (empty). The populated DB used for spot-checks is at `C:/Users/Bean/.agents/skills/sgs-wp-engine/sgs-framework.db` (1.4 MB). If the skill bundle DB diverges from the repo DB in future, row count claims in the spec should reference the skill bundle path explicitly.
- Spec 15 §12 (Appendices — Glossary + Resolved decisions) is not reproduced in Spec 16 §12. The glossary was deliberately excluded per the absorption scope ("canonical content Spec 15 owned" = L0–L3 + Stages 0-2 + 8-9 + /sgs-update + FR27–FR40). This is acceptable; the glossary terms are defined inline across both specs. UNVERIFIABLE whether this was an explicit decision or an oversight — no note in Spec 16 states the glossary was intentionally excluded.

---

*Report generated by Sonnet Rater 2. READ-ONLY audit — no changes made to source files.*
