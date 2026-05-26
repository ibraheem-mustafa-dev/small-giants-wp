# Session Handoff — 2026-05-26 (Spec 22 ratification + Spec 16 retirement)

## TL;DR

Spec 22 (Universal Block-Equivalent Extraction) ratified and shipped to main in commit `d9bd1c00`. Replaces Spec 16 in full — single universal walker, 3 permitted exceptions, BEM-only recognition, hybrid render.php migration pattern. Acceptance gate softened to ≤5% Phase 1 + ≤1% Phase 1.5 stretch per Bean directive. 4-rater /gap-analysis council validated; 48 findings absorbed. 31 files in Commit 0.0 cross-doc sync. 22 of 22 scored docs at A 100% post fix-application. Next session begins Spec 22 Phase 0.1 (DB enrichment + golden corpus + pre-rewrite DB snapshot) gating Phase 1 walker rewrite.

## Completed this session

1. **Spec 22 (Universal Block-Equivalent Extraction) drafted v0.1 → v0.4 → ratified v1.0** — replaces Spec 16 in full. Single universal walker with exactly 3 permitted exceptions (atomic-tag swap / top-level chrome skip / top-level container wrap). 13 FRs (FR-22-1 through FR-22-12), 13 binding rules (R-22-1 through R-22-13). docscore Grade A 100%. Frontmatter `status: active` post-Commit-0.0.
2. **4-rater /gap-analysis council on Spec 22 v0.2** — Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor dispatched in parallel. 48 findings: 33 valid+addressed, 10 partial-recalibrated, 5 dropped as category errors. v0.3 + v0.4 absorbed feedback (e.g. role_block_mapping table proposal dropped in favour of querying existing slot_synonyms data).
3. **Spec 16 archived** — `git mv` to `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md` with retirement frontmatter. Same for old phase plan to `.claude/plans/archive/2026-05-25-phase-1-universal-extraction-superseded-by-spec-22.md`.
4. **New Phase 1 plan written** at `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — 5-commit walker rewrite cadence per R-22-5 (1.1 snapshot → 1.2 atomic-tag → 1.3 array-of-objects → 1.4 universal walker → 1.5 measurement+decide). docscore A 100%.
5. **Commit 0.0 cross-doc sync — 31 files** in single commit `d9bd1c00`. Architecture.md decisions #14/#15/#17/#19 rewritten + new #20 added. Decisions.md prepended D78-D83. Parking.md: 6 entries dissolved + P-LEGACY-GAP-CANDIDATES-MIGRATION added. State.md, goals.md, CLAUDE.md trio, cloning-pipeline-flow.md, cloning-pipeline-stages.md, docs-registry.yaml, plus 7 other specs + 3 phase plans + README all updated.
6. **4 subagent audits dispatched in parallel post-Commit-0.0** — Track 1 (state.md + architecture.md structural fixes → A 100%); Track 2 (docs-registry.yaml audit — 27 entries, 7 stale); Track 3 (/qc on 13 updated docs — 6 needs-fix surfaced); Track 4 (stale-ref audit on 80+ non-updated docs — 24 findings). All critical + high + medium fixes applied this commit.
7. **Acceptance gate softened per Bean directive** — Phase 1 ≤5% per-section × 3 viewports + Bean visual sign-off (R-22-13 co-authoritative). Phase 1.5 stretch ≤1% via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing (addresses the 60px chrome-bleed alignment artefact identified on hero-clone-poc page 29).
8. **Empirical validation** — F1 spike commit `a757ff1c` (2026-05-25) is the evidence base for the architecture. Hero-clone-poc page 29 (`/hero-clone-poc/`) is the visual-parity proof-of-concept (54.5% pixel-diff is alignment artefact, not visual divergence).
9. **All scored docs at A 100%** — 22 of 22 docscore-eligible docs at Grade A 100% post-fix-application. 2 custom doc_types (plan.md `master-plan`, cloning-pipeline-flow.md `visual-reference`) intentionally unscored — no templates for them.

## Current state

- **Branch:** main at `d9bd1c00`
- **Tests:** no test suite run (docs-only commit; pipeline tests gate Phase 0+ work)
- **Build:** n/a (no code changes in commit)
- **Uncommitted changes:** none
- **Outcome assessment (Gate 3.5):** OUTCOME ACHIEVED for stated outcome (Spec 22 ratification + Spec 16 retirement + Commit 0.0 cross-doc sync). Next stated outcome (Spec 22 Phase 0.1 DB enrichment + golden corpus) correctly named as pending — work for next session.

## Known Issues / Blockers

- **Phase 0 of Spec 22 implementation is NOT YET STARTED.** Foundation work (DB enrichment, wp-blocks.py extension, pixel-diff.py hardening, hybrid-block audit) gates Phase 1 walker rewrite. Next session begins at Commit 0.1.
- **plan.md + cloning-pipeline-flow.md have custom doc_types** (`master-plan` / `visual-reference`) without docscore templates — unscored but coherent. Could be addressed by adding templates OR re-tagging to canonical types.

## Next priorities (in order)

1. **Spec 22 Phase 0.1 — DB enrichment + golden corpus** — extend `/sgs-update assign-canonical.py` for canonical_slot backfill across 1,214 NULL rows. Verify `slot_synonyms` coverage for content-bearing roles (text-content, image-object, content, link-href, identity, visual). Write golden corpus at `.claude/specs/22-golden-corpus.json`. Pre-rewrite DB snapshot to `pipeline-state/_snapshots/sgs-framework-pre-spec22.db`.
2. **Phase 0.2 — wp-blocks.py extension** — add 6 new subcommands (`equivalent-block`, `recognition-log`, `naming-convention`, `gap-candidate`, `animation`, `component-library-match`) with adversarial test corpus.
3. **Phase 0.3 — pixel-diff.py hardening** — vertical-anchor fix for the 60px chrome-bleed identified on hero-clone-poc + `--wait-fonts` flag.
4. **Phase 0.4 — Hybrid-block audit** — query `equivalent_block_for()` across every block × attr, filter via FR-22-2.2 role-exclusion, produce roster at `.claude/reports/2026-05-26-hybrid-block-roster.md`.
5. **Phase 1 walker rewrite begins** at Commit 1.1 (pre-rewrite snapshot) ONLY after Phase 0 closes.

## Files modified

| File path | What changed |
|---|---|
| `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` | NEW — canonical spec; v1.0 active |
| `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` | NEW — Spec 22 Phase 1 plan |
| `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md` | RENAMED from `.claude/specs/16-*` with retirement header |
| `.claude/plans/archive/2026-05-25-phase-1-universal-extraction-superseded-by-spec-22.md` | RENAMED from `.claude/plans/2026-05-25-*` |
| `CLAUDE.md` + `.claude/CLAUDE.md` + `NEXT-SESSION-PROMPT.md` (root) + `plugins/sgs-blocks/CLAUDE.md` | Active focus + binding rules + canonical pointers updated to Spec 22 |
| `.claude/architecture.md` | Decisions #14/#15/#17/#19 rewritten; new #20 (Spec 22 ratification) |
| `.claude/decisions.md` | D78-D83 prepended (Spec 16 retirement + Spec 22 chain) |
| `.claude/parking.md` | 6 entries dissolved (P-WAVE-2-RESHAPE, P-G1-EXTEND, P-FR1-VARIATION-BUF, P-MATCH-JSON-GATE, P-G3-STAGE-3, P-G5-PER-BLOCK); P-LEGACY-GAP-CANDIDATES-MIGRATION added |
| `.claude/state.md` | current_phase + spec_22_implementation block + Track 1 structural fix |
| `.claude/goals.md` | ≤5% Phase 1 + ≤1% Phase 1.5 + Completed section |
| `.claude/cloning-pipeline-flow.md` + `.claude/cloning-pipeline-stages.md` | Two-route topology retired; Stage 4 Spec 22 note |
| `.claude/docs-registry.yaml` | Spec 22 entry; Spec 16 archived; cold-start reading order updated |
| `.claude/specs/00, 02, 17, 19, 20, 21 + README` | Spec 16 → Spec 22 cross-refs |
| `.claude/plans/2026-05-24-strategic-plan + phase-2/3/4` | Phase 1 supersession banner + pre-condition updates |
| `.claude/dev-setup.md` + `.claude/next-session-prompt.md` + `.claude/plan.md` | Spec 22 pointer + Mandatory READING / Tool bindings / First action sections |

## Notes for Next Session

- **Cold replacement, not feature-flag dual-run** — Bean's call. Pre-rewrite DB snapshot at Phase 0.1 enables rollback (legacy code + legacy DB state). Stage 11 measurement at Commit 1.4 catches walker regression immediately.
- **R-22-13 is novel and load-bearing** — Bean visual sign-off is co-authoritative with pixel-diff. Script numbers + Bean's eye + visual cropped-pair (mockup.png vs sgs.png) BOTH consulted. Numbers alone don't close a section; eye alone doesn't close. Phase 1.5 fixes the measurement methodology — until then the noise floor is real.
- **Role-exclusion rule (FR-22-2.2) is the surprise from Track 4 PE audit** — 63 raw "hybrid blocks" shrinks to ~8-15 true content-bearing hybrids after filtering out typography/spacing/layout roles. Phase 0.4 audit produces the exact roster.
- **F1 commit `a757ff1c` empirical findings preserved** — F1 won mobile/tablet (-23.8pp/-13.0pp brand) but failed desktop 1440 (+0.8pp). The double-render bug on sgs/product-card (8569 chars post-F1 vs 2303 pre-F1, 3.7× explosion) is what drove the Spec 22 architecture — every council finding builds on that diagnostic.
- **Phase 1.5 isn't a vague future thing** — it's specifically the measurement-script hardening + noise-floor diagnosis. Per Bean it's "insurance" — only fired if ≤1% can't be reached via Phase 1 alone.

## Next Session Prompt

See `.claude/next-session-prompt.md` (canonical lowercase path) for the full Phase 0.1 orchestration plan. Highlights:

- **Skills to invoke:** `/autopilot` (auto-injected at SessionStart), `/brainstorming`, `/gap-analysis`, `/lifecycle`, `/research`, `/strategic-plan`, `/sgs-wp-engine`, `/wp-block-development`, `/wordpress-router`, `/qc-council`, `/qc-inline`, `/verify-loop`, `/delegate`, `/capture-lesson`, `/handoff`.
- **MCP & tools:** Playwright MCP (live-page DOM verification for Phase 0.3 measurement-script hardening), `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (canonical_slot backfill audit + DB stats), `~/.claude/hooks/wp-blocks.py` (extended in Phase 0.2; unified data CLI for both DBs).
- **Agents:** `wp-sgs-developer` (heavy SGS WordPress work), `code-reviewer` (per-commit reviewer per `/subagent-driven-development`), Sonnet subagents via `/delegate` for mechanical Phase 0.1-0.4 work.
- **First task:** Phase 0.1 DB enrichment + golden corpus. ETA ~3 hours. Inline main thread for the golden corpus design; Sonnet subagent for the assign-canonical.py extension via `/subagent-driven-development`.

## Guardrails

- Spec 22 binding rules R-22-1 through R-22-13 gate every commit. No exceptions.
- /qc-council pre-commit gate enforced via `pipeline-stage-gate.py` hook on every converter/pipeline/SGS-block commit (blub.db row 255, R-22-12).
- Per-section cropped pixel-diff only — `--selector .sgs-{section}` not full-page (blub.db row 256, R-22-4).
- Phases never ship as single commits — every major task commits separately with predicted vs actual delta in message (blub.db row 288, R-22-5).
- Output-only inference is a trap (R-22-6 + `feedback_grep_verify_handoff_diagnostic_premises.md`). Verify mockup HTML + extract.json + live DOM at each milestone.
- Bean visual sign-off is co-authoritative with pixel-diff (R-22-13). Numbers alone don't close.
