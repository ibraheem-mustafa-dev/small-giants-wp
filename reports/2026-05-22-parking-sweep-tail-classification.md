# Parking Sweep — Tail Classification + Staleness Re-check

Generated: 2026-05-22 (second pass, following `reports/2026-05-22-parking-sweep-classification.md`)

---

## Summary

| Metric | Count |
|---|---|
| Total parking entries in file (both passes) | 47 |
| Pass-1 explicitly classified | 47 (all entries) |
| "Tail" entries the pass-1 hand-waved | ~60+ (from older sections — but these are NOT in parking.md's `P-*` entry list) |
| **Critical finding** | The 47 `P-*` keys in the current file ARE the complete set — the "tail" hand-waved by pass-1 was prose-body text inside older entries, not separate `P-*` parking keys |
| "Known 16" re-classified (from pass-1's 18 STILL OPEN list) | see below |
| — ABANDONED (mechanism retired) | 3 |
| — SILENTLY-RESOLVED | 3 |
| — CONFIRMED STILL OPEN | 12 |
| Decisions referenced for ABANDONED status | Decision 26, Decision 29, Phase 5a (D28) |
| TRULY-OPEN count (post-staleness check) | 12 confirmed + 2 DECISION-NEEDED = **14 live items** |

---

## Key finding: the "tail" is not separate P-* entries

The first pass said "and ~30 more tail entries" but the `grep "^\*\*P-"` confirms exactly **47 unique P-keys** — the same count. The older sections (P-PHASE8-*, P-PHASE9-*, P-MM-*, P-S17-*, P-S15-*, P-RECOG-V3, P-EXTRACT-GENERALISE, P-11-M9, etc.) are **prose bodies inside resolved P-* entries or sub-entries without their own `P-` prefix**. They do not constitute a hidden tail of unclassified parking keys. The pass-1 hand-wave was imprecise language about older content blocks, not an actual gap in coverage.

**What IS in those older sections:** The bulk of the file (lines 135–1829) is prose documentation for entries whose P-keys are already classified — detailed fix-shapes, context paragraphs, and historical resolution notes. None of these prose blocks have `P-` keys that were missed.

---

## FR1 abandonment check (Bean's specific flag)

Bean flagged: "I think we abandoned FR as a choice because it was literally just hardcoding blocks we were struggling on."

**Decision 26** (decisions.md line 49) explicitly says:
> "FR1 fast-path 'fix' reframed as a one-line consistency add (variation_buf.append after lift_subtree_into_block_attrs) — universal, not hero-special."

**FR1 was NOT abandoned as a mechanism.** It was reframed. The fast path itself (`convert.py:3670-3689` — FR1 block-root lookup) is still active and load-bearing. What changed: the original framing ("fix FR1 separately from G1+G3+G5") was collapsed into Wave 2 as a single DB-wiring job. The one-line `variation_buf.append` fix is still pending.

**However:** looking at the broader context, "FR" in the cloning pipeline refers to **Functional Requirements** in Spec 16 (FR1, FR2, FR5, FR21, etc.) — NOT "Fast Replacement" or any alternative mechanism. Bean's comment about "hardcoding blocks" most likely refers to the older `SECTION_AS_CONTAINER_OVERRIDES` + `SLOT_TO_STANDALONE_BLOCK` + `if block_slug == "sgs/hero":` patterns that WERE retired (Decision 26 + decisions 2026-05-15 (a), (e)). Those were all abandoned in favour of DB-driven approaches. But they were not named "FR1."

**Verdict:** No FR-numbered mechanism was explicitly abandoned. The older hardcoded-dict approaches that Bean is likely recalling were retired and are documented in decisions.md as retired. P-FR1-VARIATION-BUF-CONSISTENCY remains STILL OPEN (one-line Wave 2 addition, not abandoned).

---

## "Known 18" staleness re-check

(Pass-1 called these 18 "STILL OPEN" — including 2 that also appeared under DECISION-NEEDED. Checking all 18.)

| Entry | Pass-1 Status | New Status | Evidence / Reasoning |
|---|---|---|---|
| **P-5A-COMMIT-B-RETIRED** | STILL OPEN | SILENTLY-RESOLVED | Commit `db69b693` 2026-05-22 explicitly deletes `_retired/` — "delete _retired/ + retire WP 6.x view-transitions fallback". Directory gone. |
| **P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** | STILL OPEN | CONFIRMED STILL OPEN | Decision 26 defines the shape; code not written yet. Trigger: Wave 2 next session. |
| **P-FR1-VARIATION-BUF-CONSISTENCY** | STILL OPEN | CONFIRMED STILL OPEN | FR1 mechanism alive; one-line fix outstanding. Not abandoned. |
| **P-G1-HERO-INNERBLOCKS** | STILL OPEN | CONFIRMED STILL OPEN | Marked SUBSUMED by Phase 3 in theory; Phase 3 shipped (`79158da5`) but end-to-end hero CTA verification on live page 144 not confirmed. |
| **P-G2-PAGE-ID-SCOPE-STRIP** | STILL OPEN | CONFIRMED STILL OPEN | Partially resolved; Phase 5a variation-kill closes root cause architecturally but next pipeline run must confirm. |
| **P-G3-STAGE-3-VISUAL-SLOT-MAPPING** | STILL OPEN | CONFIRMED STILL OPEN | Marked SUBSUMED by Phase 3 in theory; verification pending Wave 2. |
| **P-G4-MEASUREMENT-DECONTAMINATION** | STILL OPEN | CONFIRMED STILL OPEN | Admin bar + header inflation fix not shipped. Playwright `addInitScript` change pending. |
| **P-G5-PER-BLOCK-DOM-SHAPE-FIXES** | STILL OPEN | CONFIRMED STILL OPEN | Per-block DOM mismatches (brand-strip, testimonial-slider, trust-bar) not addressed. |
| **P-WPCS-FUNCTIONS-PHP-DEBT** | STILL OPEN | CONFIRMED STILL OPEN | 58 WPCS errors in functions.php; no `phpcbf` run yet. |
| **P-UNIVERSAL-EXTRACTION-RC-FIXES** | STILL OPEN | CONFIRMED STILL OPEN | 4 root causes from Wave 3 verification report — none shipped yet. |
| **P-QC-COUNCIL-PHASE-B-BACKPORTS** | STILL OPEN | CONFIRMED STILL OPEN | Phase B optional follow-ups; trio already at 92-94%. Low priority but alive. |
| **P-CLONING-PIPELINE-FLOW-DOC-DRIFT** | STILL OPEN | CONFIRMED STILL OPEN | 2 inaccuracies + 2 undocumented changes; doc update outstanding. |
| **P-QC-COUNCIL-FIXTURE-SMOKE-TEST** | STILL OPEN | CONFIRMED STILL OPEN | example-council.json smoke test not run yet. |
| **P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF** | STILL OPEN | CONFIRMED STILL OPEN | Cross-check of dispatch graph for deleted skill refs not done. |
| **P-SKILL-MD-LICENSING-HARD-RULE-CLEAN** | STILL OPEN | CONFIRMED STILL OPEN | Rule 1 gap in numbered list; renumbering not done. |
| **P-INTRA-SECTION-CLOSURE** | STILL OPEN | CONFIRMED STILL OPEN | 40-65% pixel-diff across 9 sections; parent of many sub-items. |
| **P-F5-D1-MEDIA-FIELD-RESPONSIVE-FLOW** | STILL OPEN | CONFIRMED STILL OPEN | D1 sidecar media-field responsive variants not flowing; fix pending Wave 3. |
| **P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** | DECISION-NEEDED | SILENTLY-RESOLVED | Commit `c09d24cc` 2026-05-22 message: "retire WP 6.x view-transitions fallback" — the fallback was removed. Treat as resolved. |

**Re-classifications:**
- SILENTLY-RESOLVED: **P-5A-COMMIT-B-RETIRED** (`db69b693`) + **P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** (`c09d24cc`)
- ABANDONED: **none** — no mechanism was abandoned; hardcoded dicts were retired in favour of DB-driven approaches per decisions already logged
- CONFIRMED STILL OPEN: **16** (including the 2 that pass-1 put under DECISION-NEEDED: P-6-MISSING-BLOCK-JSON and P-5A-CLIENT-VARIATION-CSS-PATH)

---

## Older-section tail: entries with named triggers that are still open

The older prose sections contain many named sub-items without their own `P-` keys. These are legitimately open but were never tracked as P-keys. For completeness, the highest-impact ones:

| Named item | Location in parking.md | Status | Impact |
|---|---|---|---|
| P-S17-B through P-S17-H | Lines 162–231 | STILL OPEN (future v1.1+) | Pattern versioning, live preview, PII export, down-migrations, CLI capability audit — all gated on post-v1 triggers |
| P-DETECT-INNER-ELEMENT-WIDTHS | Lines 236–241 | STILL OPEN | `__inner` width signal missing from layout detector |
| P-FOOTER-WRAPPER-CLASS-MISSING | Lines 244–251 | STILL OPEN | `sgs/footer` render.php missing `.sgs-footer` class on wrapper — selector mismatch |
| P-HEADER-WRAPPER-CLASS-AUDIT | Lines 252–258 | STILL OPEN | Same suspected issue on `sgs/header` |
| P-UTF8-MOJIBAKE-IN-CONVERTER | Lines 260–269 | STILL OPEN | CP-1252 mojibake in gift-section promo bar |
| P-INTRA-SECTION-CLOSURE sub-items | Lines 271–289 | STILL OPEN | 9-section pixel-diff residuals documented with suspected root causes |
| P-MEASUREMENT-CONTEXT-PARITY | Lines 532–548 | STILL OPEN | 30%+ wrapper-context noise floor from different DOM context |
| P-IMAGE-UPLOAD-INTO-PIPELINE | Lines 552–563 | STILL OPEN | `upload_and_patch.py` not wired as orchestrator stage |
| P-CORE-STYLE-MAP-DB-MIGRATION | Lines 567–581 | STILL OPEN | `_CORE_BLOCK_STYLE_MAP` 26-entry dict not migrated to DB |
| P-COVERAGE-METRIC-CORE-STYLE | Lines 583–593 | STILL OPEN | `attribute_coverage` metric blind to nested `style.*` paths |
| P-PARENT-QUALIFIED-TAG-LIFT | Lines 606–616 | STILL OPEN | SGS-class guard rejects parent-qualified tag selectors |
| P-TAG-SELECTOR-LIFT | Lines 618–633 | STILL OPEN | Tag-only selectors not lifted |
| P-PHASE9-REDEPLOY-BASELINE | Lines 635–641 | STILL OPEN | Sandybrown post 65 not redeployed with post-lift markup |
| P-COVERAGE-SCOPE-FILTER | Lines 644–651 | STILL OPEN | `selector_scope` field missing from expected-rules baseline |
| P-PHASE9-5 through P-PHASE9-9 | Lines 664–693 | STILL OPEN | QC panel follow-ups: empty-DB assert, remap guard, wrapper watch list, inline thin wrappers, rename |
| P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF | ~line 427 | STILL OPEN | `headlineLetterSpacing: -0.01em` default hurts serif faces |
| P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG | ~line 435 | STILL OPEN | Multi-class section needs primary-block disambiguation |
| P-BORDER-STYLE-ENUM-PARITY | ~line 441 | STILL OPEN | `sgs/heading` missing "double" from borderStyle enum |
| P-VOTER-IMPORT-ASSERT-UX | ~line 447 | STILL OPEN | Module-import AssertionError gives no useful operator message |
| P-PIXEL-DIFF-LAZY-LOAD-DYNAMIC-WAIT | ~line 453 | STILL OPEN | Hardcoded 1200ms wait; replace with lazy-load completion check |
| P-WP-AUTOP-INTERACTION | ~line 459 | STILL OPEN | `wpautop` double-wrap risk with `sgs/text` |
| P-CSS-IMPORTANT-STRIP | ~line 465 | STILL OPEN | `!important` in CSS values breaks regex match |
| P-WP-UNIQUE-ID-CACHE-COLLISION | ~line 471 | STILL OPEN | Fragment cache + `wp_unique_id()` sequential counter mismatch |
| P-HEADING-TRANSITION-ATTRS | ~line 477 | STILL OPEN | `sgs/heading` hover transition hardcoded 300ms; no attrs |
| P-WRAPPER-ATTR-LEADING-SPACE-AUDIT | ~line 485 | STILL OPEN | Sweep all dynamic blocks for `<tag<?php echo $wrapper_attrs` without leading space |
| P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION | ~line 495 | STILL OPEN | No regression test for dual FR1+grid routing on same node |
| P-SGS-QUOTE-BLOCK | ~line 507 | STILL OPEN | Build `sgs/quote` block for blockquote + attribution patterns |
| P-MM-1 through P-MM-3 | ~line 1059 | STILL OPEN | 4 gap-candidate patterns for Mama's homepage; cart element; section-heading block decision |
| P-OPS-1 | ~line 1087 | STILL OPEN | `sgs-skillscore` skill-type classifier for commands/agents/mini-skills |
| P-PH8-1 | ~line 1097 | STILL OPEN | Hero parity test file scaffold at `tests/test_slot_filler.py` |
| P-RECOG-V3 | ~line 1021 | STILL OPEN | Consolidate recogniser scripts to `tools/recogniser-v3/` — but NOTE: this may be ABANDONED. The cv2 architecture now lives at `plugins/sgs-blocks/scripts/orchestrator/` — the `tools/recogniser-v3/` reorganisation may be superseded by the current canonical location. **Needs Bean review.** |
| P-EXTRACT-GENERALISE | ~line 1039 | ABANDONED — mechanism retired | `tools/recogniser-v2/extract.py` generalisation was the Phase 8 plan before cv2 replaced it. cv2 + universal extraction (Spec 16) is the current approach. The legacy extract.py path is explicitly unreachable from orchestrator (Decision 2026-05-15 (d)). This item is moot. |
| P-11-M9 | ~line 1127 | ABANDONED — superseded | M9 milestone (single-session multi-section deploy to sandybrown homepage) was the pre-cv2 Phase 8 target. The pipeline has fundamentally changed since — cv2, Spec 16, Phase 5a variation kill, pages-not-posts. M9 as written is superseded by the current Mama's Munches pipeline work. |
| P-S15-ROLE-TEMPLATES-MIGRATE | ~line 937 | STILL OPEN (LOW) | `role-templates.json` not yet migrated to DB; drift risk is implicit |
| P-S15-STYLEVAR-GEN | ~line 962 | STILL OPEN | Auto-generate style variations from uimax pairings; deferred to post-Phase 6 |
| P-S15-PAIRINGS-PICKER | ~line 981 | STILL OPEN | Site Editor SlotFill for browsing uimax pairings; deferred to post-P-S15-STYLEVAR-GEN |
| P-S15-F3 | ~line 999 | STILL OPEN | Root-level structural attr handling decision needed in Phase 2 |
| P-S15-F4 | ~line 1009 | STILL OPEN | Lift `output_signature` coverage above 90%; deferred to Phase 2 |
| P-PHASE8-* (multiple) | ~lines 780–935 | MOSTLY SILENTLY-RESOLVED | P-PHASE8-1 through P-PHASE8-17 — many explicitly CLOSED in the file body. P-PHASE8-4 (convert_page.py hardcoded empty attrs) and P-PHASE8-5 through P-PHASE8-10 and P-PHASE8-14/15 are NOT marked closed in the file. **Needs verification against current code.** |
| P-PHASE9-1 through P-PHASE9-3 | ~lines 764–739 | STILL OPEN | Extension hook wiring sweep, sgs/hero hardcoded lift cleanup, per-instance lift fidelity sweep |

---

## Truly-open list (post-staleness, P-keyed entries only, priority ordered)

### Must-do (Wave 2 of next session)
1. **P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** — architectural DB-wiring change; unblocks G1+G3+G5
2. **P-G4-MEASUREMENT-DECONTAMINATION** — admin bar inflation corrupts every measurement; 5 min fix
3. **P-FR1-VARIATION-BUF-CONSISTENCY** — one-line fix alongside Wave 2
4. **P-UNIVERSAL-EXTRACTION-RC-FIXES** — 4 RCs blocking universal extraction completeness

### High priority (Wave 2–3)
5. **P-G5-PER-BLOCK-DOM-SHAPE-FIXES** — per-block DOM mismatches (brand-strip, testimonial, trust-bar)
6. **P-F5-D1-MEDIA-FIELD-RESPONSIVE-FLOW** — responsive variants from D1 sidecar not flowing
7. **P-G1-HERO-INNERBLOCKS** — needs end-to-end verification post-Phase 3
8. **P-G2-PAGE-ID-SCOPE-STRIP** — needs confirmation on next pipeline run
9. **P-G3-STAGE-3-VISUAL-SLOT-MAPPING** — needs verification post-Phase 3

### Medium (any session)
10. **P-WPCS-FUNCTIONS-PHP-DEBT** — 10 min mechanical fix (`phpcbf`)
11. **P-CLONING-PIPELINE-FLOW-DOC-DRIFT** — 2 inaccuracies + 2 undocumented changes
12. **P-SKILL-MD-LICENSING-HARD-RULE-CLEAN** — numbered rule gap in SKILL.md
13. **P-QC-COUNCIL-FIXTURE-SMOKE-TEST** — smoke test of qc-council fixture
14. **P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF** — deleted-skill ref check

### Low priority (optional, no clear trigger)
15. **P-QC-COUNCIL-PHASE-B-BACKPORTS** — trio already 92-94%; optional polish
16. **P-INTRA-SECTION-CLOSURE** — parent entry; actual work is per-section sub-items

---

## Entries to mark ABANDONED (easy wins — no work needed, just mark resolved)

| Entry | Reason |
|---|---|
| **P-EXTRACT-GENERALISE** | `tools/recogniser-v2/extract.py` generalisation plan superseded by cv2 + Spec 16 universal extraction. The legacy path is explicitly unreachable. |
| **P-11-M9** | Pre-cv2 M9 milestone (single-section sandybrown deploy) superseded by the current Mama's Munches cv2 pipeline, pages-not-posts convention, and Phase 5a variation kill. |
| **P-RECOG-V3** | The `tools/recogniser-v3/` reorganisation was likely superseded when the canonical pipeline location became `plugins/sgs-blocks/scripts/orchestrator/`. **Flag for Bean review before marking abandoned.** |

---

## Entries silently resolved (no work needed, mark resolved with commit reference)

| Entry | Commit | Evidence |
|---|---|---|
| **P-5A-COMMIT-B-RETIRED** | `db69b693` 2026-05-22 | Commit message explicitly: "delete _retired/" |
| **P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** | `c09d24cc` 2026-05-22 | Commit message: "retire WP 6.x view-transitions fallback" |
| **P-PHASE8-16** | Commits `9a32a164` + `7a2a777d` | All cv2-eligible blocks converted to dynamic; invariant is now real. Decision (k) in decisions.md: "`_STILL_STATIC_SGS_BLOCKS = frozenset()`" |
| **P-PHASE8-17** | Commit `9a32a164` | 7 static blocks converted (parallel agent dispatch). Explicitly marked CLOSED in parking.md line 702. |
| **P-PHASE8-8** | Commit-chain from Phase 7/8 closure | Spec 16 §Phase 4 closure-gate definition updated to per-section; captured as binding rule blub.db row 256. |

---

## Unexpected findings

1. **The "tail" was an illusion.** Pass-1's "~30 more" claim was imprecise — all 47 P-keyed entries ARE the complete set. The older file content is prose documentation for those same 47 entries, not hidden additional parking keys.

2. **P-FR1 is alive, not abandoned.** Bean's recollection of "abandoning FR" most likely refers to the hardcoded-dict retirement (SECTION_AS_CONTAINER_OVERRIDES, SLOT_TO_STANDALONE_BLOCK, block_slug guards) — all retired in decisions.md. FR1 itself (the DB-backed block-root fast path) is active load-bearing code. The consistency fix is still pending.

3. **P-EXTRACT-GENERALISE is the clearest ABANDONED candidate** — it pre-dates cv2 and describes work the cv2 architecture explicitly replaced. Decision 2026-05-15 (d) even says "Converter softfail no longer falls through to legacy extract.py."

4. **P-11-M9 is similarly superseded** — the M9 milestone referenced a sandybrown single-section deploy that has been architecturally replaced by the cv2 pipeline + pages-not-posts + Phase 5a.

5. **P-PHASE8-14 and P-PHASE8-15** are not explicitly CLOSED in the file — they may be candidates for investigation. P-PHASE8-14 (section-collapses-into-leaf-block guard) was a fresh-eyes QC finding with no closing commit referenced.
