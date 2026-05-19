---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-pipeline-cleanup-option-A
session_date: 2026-05-21
---

# Session Handoff — 2026-05-21

Option-A cleanup sprint: four waves of cv2 pipeline cleanup + verification + Spec 15→16 absorption + Wave 2b licensing-revert + truth-doc consolidation + multi-model /qc on flow doc & Spec 16. Surfaced 4 universal-extraction root-cause gaps for next session.

## Post-session addendum (2026-05-21 late)

After the initial handoff write, Bean caught two issues + directed additional work:

1. **Wave 2b licensing-reject was wrong** — Bean clarified "no licensing" means don't add validation infrastructure, not "ban the words". A previous incarnation was deliberately stripped 2026-05-14; Wave 2b re-implemented it from stale SKILL.md text. REVERTED same session: validator stripped + tombstone comment + 3 regression-guard tests; SKILL.md Hard Rule 1 retired; memory file clarified; architecture.md stale claim fixed; decisions.md Decision 18 logged; mistakes.md captured `strip-feature-update-docs-same-commit` lesson.

2. **Spec 15 absorbed into Spec 16** (deferred from main session, completed inline). Spec 16 gained §12 Appendix A folding all of Spec 15's canonical content (L0-L5 layers + SGS-BEM + canonical slot/property/modifier vocabularies + /sgs-update 11 stages + upstream conditions + QA gates summary + FR27-FR40). Spec 15 frontmatter flipped to `status: ABSORBED_INTO_SPEC_16`. Docs-registry.yaml updated to mark Spec 15 + 3 sibling docs as `scope: absorbed`.

3. **Multi-model /qc on flow doc + Spec 16** — 5 Sonnet raters (Gemini skipped per established fabrication pattern). Verdicts: flow doc CONDITIONAL-PASS (14/15) + Spec 16 CONDITIONAL-PASS (12/13). 4 concrete findings fixed inline: broken phase-6 link → `archive/`, `property_suffixes` count 99→117, "Full spec" label on Spec 15 retired, missing Stage 7 row added to Spec 16 §12.8. Deferred findings logged to parking.md (P-WAVE-4-DOC-FOLLOWUPS).

4. **Docs-registry trim 28→17** (commit `93048a9b`) — Bean directive: registry should only carry essentials so future-session reads don't waste tokens. Removed 4 absorbed docs, 2 historical plans, 2 secrets files, 4 enforcement hooks (Python not docs). Deleted `.md` sibling (yaml is readable as-is). 39% reduction in registry walk surface. Tombstoned the orphan `tooling-map-drift-check.py` hook (its target was absorbed; script retained for git-history with explicit retirement notice).

5. **Drift-check dispatcher hook shipped** (commit `c0ab7874`) — Bean directive: hooks should catch staleness in real-time rather than wait for /handoff Gate 4.5. Built `.claude/hooks/drift-check-dispatcher.py` as single PostToolUse entry point with 5 checks: (1) Script inventory drift, (2) DB schema drift, (3) Skill dispatch drift, (4) Stage status nudge, (5) Spec 16 FR/R nudge. Mixed posture: A (warn via systemMessage, exit 0) for 1/3/4/5; B (BLOCK via stderr + exit 2) for DB schema drift (silently dangerous). Wired in NEW `.claude/settings.json` with matcher `Edit|Write|Bash`. Smoke-tested with 3 synthetic payloads; tightened DB regex after catching a false-positive (loose pattern matched adjacent table's row count in 5-line window — now requires `(N rows|entries)` parens within 40 chars of table name). **Hooks load at SessionStart so they're inert until Claude Code restart — full acceptance happens next session.**

## Late-session outcome assessment (Gate 3.5)

- Items 1-4 above: **OUTCOME ACHIEVED** — measurable signal hit (tests pass, files committed, registry shrunk, /qc raters confirmed accuracy).
- Item 5 (drift-check dispatcher): **CODE SHIPPED, OUTCOME PARTIAL.** Hooks committed + smoke-tested but inert in current session (hot-swap not supported per `/hook-development` skill doc). True outcome — "hooks fire on real Edit/Bash calls and surface drift" — is verified next session.

## Completed This Session

1. **Audits — 2 rounds, 11 reports.** Round 1 (doc-convergence): 6 panels (3 Sonnet + 2 Gemini + Opus). Round 2 (code-as-evidence): 6 panels. Reports under `reports/2026-05-21-*-audit-*.md`. **Critical methodology finding:** both Gemini panels produced fabricated quotes and line numbers across both rounds. Sonnet + Opus were grounded. Lesson: verify Gemini agent claims by grep before relaying.

2. **Universal-extraction rule captured** at `memory/feedback_universal_extraction_no_per_block_legacy.md`. When an audit finds "cv2 doesn't have X-specific extraction like legacy did", NEVER port X-specific logic — fix universal path instead. Every CSS rule maps to existing attr OR new-attr proposal. No silent drops. Leftover buckets are debug surfaces, not production destinations.

3. **Wave 0 — Pre-deletion safety scan (Sonnet).** Verdict: DEFER-DELETION. `overrides/hero.py:extract_hero()` lifts ~30 hero-specific attrs cv2 doesn't yet handle. Bean's call: don't port hero-specific logic; fix universal extraction so every block (not just hero) gets handled. Legacy files stay on disk this session.

4. **Wave 1 — cv2-only path + Stage 8 stub fix (commit `ee8db653`).**
   - `sgs-clone-orchestrator.py`: `--converter-v2` default flipped False→True; legacy `tools/recogniser-v2/extract.py` subprocess removed (line 1217); non-SGS-BEM boundaries halt-with-clear-error instead of silent fallback
   - Stage 4.5/5/6/7 dead wiring on legacy path (~80 lines) retired; cv2 handles inline
   - `autonomy_gate.py` + `visual_qa_capture.py`: Stage 8 Playwright stub no longer returns silent 0.0; sentinel `{stage_8_skipped: True}`; autonomy decision returns `surface-to-operator` when stub fires
   - 24 tests pass

5. **Wave 2 — Four documented-but-broken gates enforced (commit `7d713ba0`).** All 4 parallel agents:
   - Per-section pixel-diff: `CaptureContext.selector` field threaded through to `page.locator(selector).screenshot()`; `unresolved_slots == 0` deploy gate from Stage 9 coverage
   - Licensing-keyword reject in `uimax-write-validator.py`: 16 forbidden keywords + 1 allowlist (`license-free`)
   - Confidence threshold `STAGE_2_CONFIDENCE_THRESHOLD = 0.7` named constant; magic 0.5 in `leftover-bucket-router.py` retired; auditor discrepancy (0.5 vs 0.0) resolved (different sites — both real)
   - `require_schema=True` default at Stage 6; new `--no-schema-validation` opt-out flag
   - 69/70 tests pass when combined (1 test-pollution issue — `test_licensed_in_description_rejected` fails when run after `test_staged_merge`; passes isolated. Module-level state leak; followup tracked)

6. **Wave 3 — Universal extraction completeness (commit `e60fe58e`).** All 4 parallel agents:
   - **CSS D3 destination wired** in `convert.py walk()` — every unlifted CSS property emits `attribute_gap_candidate` row. New helpers: `seed_gap_context()`, `clear_gap_candidates()`, `_record_gap_candidate()`, `flush_gap_candidates()`, `propose_attr_name()`, `write_attribute_gap_candidate()`. Orchestrator seeds run_id at startup for traceable provenance.
   - **Stage 3 DB-driven canonical_slot lookup** replacing auto-derived. Per-slot `canonical_source: 'db' | 'auto-derived'` annotation + `slot_canonicalisation_gap: true` marker for backfill candidates.
   - **`LEGACY_ROLE_LOOKUP` migrated to DB** (new `legacy_role_lookup` table, 17 entries, idempotent seed, `/sgs-update` wired). **`RETIRED_BLOCK_REMAP` soft-emptied** (consultation branch retained as no-op for safety).
   - **7 Indus Foods files migrated** `heritage-strip → brand` (deploy PHP + 3 pages HTML + 2 mockups HTML + handoff doc). Zero functional refs remaining in Indus.

7. **Wave 3 verification — PARTIAL-PASS** (`reports/2026-05-21-wave-3-verification.md`). D3 fires for 5 of ~30 hero attrs. 6 of 11 spot-checked hero attrs still drop silently. **4 specific root causes identified** with file:line evidence — these are universal-extraction gaps (not hero-specific) so fixing them benefits every block. See Next Priorities.

## Current State

- **Branch:** `main` at `e60fe58e` (4 commits this session pushed to origin)
- **Tests:** all new test files green in isolation. One known test-pollution issue (combined run).
- **Build:** Python imports clean across orchestrator + converter_v2 + recogniser modules.
- **Pipeline status:** `/sgs-clone --converter-v2` is now the only path. Legacy fallback removed. Stage 8 no longer silently passes. CSS D3 surfacing previously-dropped rules. Mama's homepage Wave 3 measurements: 989 attribute_gap_candidate rows, 153/188 Stage 3 slots DB-canonical (81.4%).

## Known Issues / Followups (not blocking next session)

- **4 RC bugs identified by Wave 3 verification** — these ARE the next session's primary work (see next-session-prompt.md)
- **Wave 4 (truth-doc consolidation) deferred** — agent hit context-limit; redispatch with split scope next session
- **Spec 15 → Spec 16 absorption deferred** — focused 30-min task for next session
- **Test pollution:** `test_licensed_in_description_rejected` fails when `test_staged_merge` runs first. Module-level state leak. ~20 min Haiku fix.
- **Mama's `annotated-index.html`** still uses `.sgs-heritage-strip` (canonical `index.html` is clean). Sibling diagnostic file drift. ~10 min Haiku migration.
- **PHP type nit** at `food-service-page.php:413` (`$result` int interpolation in echo) — pre-existing Intelephense diagnostic, not regression.
- **Legacy files `tools/recogniser-v2/extract.py` + `extract_strategies.py` + `overrides/hero.py`** remain on disk but are unreachable from orchestrator. Physical deletion deferred until Phase 3 (next session's `/systematic-debugging` work) verifies hero attrs all surface via D1/D3 universally.

## Next Priorities (in order)

See `.claude/next-session-prompt.md` for the full execution plan. Headline:

1. **Phase 1 (4 parallel agents, ~2 hr):** Fix the 4 root causes from Wave 3 verification
   - RC-3: `slot_synonyms` DB gaps (data-only fix, /sgs-update extension)
   - RC-2: `_SUPPORTS_HANDLED_PROPS` over-exclusion (code fix in convert.py)
   - RC-1: D3 Mode 2 breakpoint coverage (code fix in convert.py)
   - RC-4: grouped-selector bug in `_collect_css_decls_for_element` (5-line fix)
2. **Phase 2 (~15 min):** Re-run `/sgs-clone --converter-v2` end-to-end on Mama's, capture measurements
3. **Phase 3 (~2-3 hr):** Council audit + `/systematic-debugging` on still-above-1% sections
4. **Phase 4 (~45 min):** Truth-doc consolidation (split into 2 sequential agents, not 1)
5. **Phase 5 (~30 min):** Spec 15 → Spec 16 absorption

## Files Modified This Session

| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Wave 1a + 1b + Wave 2d + Wave 3a inline; cv2-only path; non-BEM halt; seed_gap_context call |
| `plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py` | Stage 8 stub sentinel + per-section selector threading + unresolved_slots gate |
| `plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` | stub_capture skip sentinel + selector field in CaptureContext |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | CSS D3 destination wired in walk() + _lift_styling_attrs hooks |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | propose_attr_name() + write_attribute_gap_candidate() + legacy_role_lookup_for() |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | seed_gap_context() exported + clear/flush integration |
| `plugins/sgs-blocks/scripts/orchestrator/staged_merge.py` | Schema validation error messages enriched |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | LEGACY_ROLE_LOOKUP emptied (DB-backed); RETIRED_BLOCK_REMAP emptied (no-op consultation retained) |
| `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` | STAGE_2_CONFIDENCE_THRESHOLD = 0.7 named constant |
| `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` | Magic 0.5 replaced by named constant |
| `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` | Licensing-keyword reject logic (Hard Rule 1) |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py` (NEW) | Idempotent seeder for `legacy_role_lookup` DB table |
| `~/.agents/skills/sgs-wp-engine/scripts/update-db.py` | /sgs-update wired to re-seed legacy_role_lookup |
| `sites/indus-foods/{deploy,pages,mockups}/*.{php,html}` | heritage-strip → brand migration (7 files) |
| 9 new test files | Coverage for non-bem-halt, autonomy-gate, supports-writer, staged-merge, confidence-threshold, uimax-write-validator, voter-db-legacy, stage-3-db-canonical, attribute-gap-candidate |
| 11 audit reports under `reports/2026-05-21-*` | Rounds 1 + 2 audits + bucket audit + Wave 0 safety scan + Wave 3 verification |
| `memory/feedback_universal_extraction_no_per_block_legacy.md` (NEW) | Binding behavioural rule |
| `memory/MEMORY.md` | Index updated with new rule |

## Notes for Next Session

- **Trust hierarchy on audit panels (confirmed twice):** Sonnet + Opus = primary evidence. Gemini panels = leads to verify by grep. Don't relay specific line numbers from Gemini reports without confirming.
- **Wave 3a side-channel:** `attribute_gap_candidate` rows now exist but aren't yet surfaced into the per-section deliverable bundle for autonomy_gate. Threading that through is a small follow-on after Phase 1.
- **The `_SUPPORTS_HANDLED_PROPS` fix (RC-2) may surface MORE gap-candidates** than expected. Currently silently-handled props will start hitting D3 — expect the `attribute_gap_candidates` row count to jump meaningfully after Phase 1.
- **Phase 3 `/systematic-debugging`** should target each section's specific gap with explicit end-goal linkage. Generic "this CSS rule is missing" findings aren't actionable. Use the format: root cause → file:line evidence → proposed fix → which pixel-parity gap this closes.
- **Heritage-strip is now fully retired** in Indus files. If a future block retirement happens, follow the same delete-everywhere pattern (no remap table).

## Next Session Prompt

See `.claude/next-session-prompt.md` — full orchestration plan with per-phase model selection, dispatch patterns, and acceptance criteria.
