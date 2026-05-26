# Session Handoff — 2026-05-27

## Completed This Session

1. **D84 scope correction (884d13e9)** — DB audit verified 1,142 of 1,214 "NULL canonical_slot" rows are correctly-NULL behavioural attrs by design; real backfill scope = ≤72 Tier B candidates. Golden corpus dropped; structural script guardrail replaced it.
2. **Phase 0.1 + 0.3.a bundle (49bd2f24)** — D85 role-exclusion positive-allowlist closes FR-22-2.2 NULL-role hole (171 rows audited; 3 confirmed misroutes closed). D86 Tier C deleted (40+ LoC, 0 inputs) + Spec 22 amended to 2-tier. DB-derive `slot_synonyms.role_classification` column added. D87 pixel-diff chrome-hide via `visibility:hidden` (architectural divergence from spec "crop" wording — empirically falsified). D88 Mama's brand-375 +2.4pp confirmed methodology shift not flake.
3. **Phase 0.3.b orchestrator (82821922)** — `sgs-clone-orchestrator.py` auto-passes `--wait-fonts` to Stage 11 on Spec-22-gated runs; per-cell `wait_fonts` audit in results[]; `--strict-spec-22-gate` for hard-exit on missing.
4. **Phase 0.2 test infra (c417b7a4)** — `_tests/wp-blocks-adversarial.py` (30 tests including 6 equivalent-block cases) + `_tests/wp-blocks-bench.py` (latency benchmark). `wp-blocks.py cmd_equivalent_block()` wired post Phase 0.1 to `db_lookup.equivalent_block_for()`; 30/30 PASS.
5. **Wave B Mama's re-capture (6f565b13)** — full-page baseline re-captured with new pixel-diff.py at `pipeline-state/mamas-munches-144-2026-05-26-122349/`. Overall mean 62.99% → 58.91% (-4.08pp); hero 1440 -8.8pp honest correction. 23/23 cells chrome-detected + wait_fonts=true.
6. **Phase 0.4 hybrid roster (de300eb2)** — Haiku audit at `.claude/reports/2026-05-27-hybrid-block-roster.md`: 61 hybrid blocks across 77 SGS audited (1,740 attrs scanned). Top: sgs/hero (11), sgs/media (8), sgs/icon-list (7), sgs/cta-section (6), sgs/form-field-number (6). Classifications validated against block.json source.
7. **Phase 1 pre-condition audit (b62e1660)** — slot_synonyms gap audit: 10 of 11 NULL standalone_block rows correctly NULL by design. 1 gap filled: `role.standalone_block = sgs/label` (activates team-member + testimonial routing). FR-22-8 perf re-verified cleanly: cold 3.2ms / warm 0.0002ms.

## Current State

- **Branch:** main at `b62e1660`
- **Tests:** 39/39 PASS (db_lookup 5/5 + external-derivation 4/4 + wp-blocks-adversarial 30/30)
- **Build:** npm webpack compiles clean (98 styles)
- **Uncommitted changes:** 1 file (`plugins/sgs-blocks/includes/lucide-icons.php` — build timestamp drift, non-substantive)
- **Sandybrown canary:** HTTP 200 (1.89s)
- **DB:** triple-NULL = 1,090 (baseline); canonical_slot populated = 1,036; role populated = 962

## Known Issues / Blockers

None blocking Phase 1.1. Two soft items remain deferred:
- **P-SGS-UPDATE-ROLE-DETECTION-IMPROVE** OPEN MEDIUM — role detection shipped 94 writes but more rows may need role assignment over time.
- **P-D85-ROLE-EXCLUSION-DB-DERIVE** OPEN — `_ROLE_CLASSIFICATION_MAP` is one-time-seed Python dict (R-22-1 compliant but ideally future `role_classification` table).

## Next Priorities (in order)

1. **Phase 1.1 — Pre-rewrite snapshot** (~10 min, inline). `git mv plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py plugins/sgs-blocks/scripts/orchestrator/_retired/convert_pre_spec22.py`. Commit. Living-docs note.
2. **Phase 1.2 — Atomic-tag map migration** (~1-2h, Sonnet). Replace hardcoded `ATOMIC_TAG_MAP` (convert.py:698-704) with DB-driven `db.atomic_tag_map()` per Spec 22 §14 Appendix B.
3. **Phase 1.3 — ARRAY_LIFT_PATTERNS retirement** (~2h, Sonnet via /subagent-driven-development). Delete dict; implement FR-22-2.5 array-of-objects resolution. /qc-council gate.
4. **Phase 1.4 — Universal walker (core)** (~5-6h, Sonnet via /subagent-driven-development). Delete `lift_subtree_into_block_attrs` + `_lift_inner_blocks` + F1 + 9-branch walk(). Implement FR-22-3 single-path walker. ⚡ HIGH; /qc-council multi-rater.
5. **Phase 1.5 — Measurement + halt/proceed** (~1h, inline). Full-page `/sgs-clone --auto-section --debug-trace`. Every body section ≤5% × 3 viewports gates close.

## Files Modified

| File | What changed |
|------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | +equivalent_block_for() 2-tier + positive-allowlist + DB-derive role_classification + Tier C deleted + 5 unit tests |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | +Tier B backfill + structural guardrail + role detection from block.json + snapshot baseline |
| `scripts/pixel-diff.py` | +chrome-hide (visibility:hidden) + --wait-fonts + --keep-chrome + diff.json telemetry |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | +auto-pass --wait-fonts + per-cell audit + --strict-spec-22-gate |
| `~/.claude/hooks/wp-blocks.py` (out of repo) | +6 FR-22-8 subcommands; cmd_equivalent_block wired |
| `plugins/sgs-blocks/scripts/orchestrator/_tests/external-derivation-regression.py` | NEW — 4 assertions defending Tier B SQL filter |
| `plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-adversarial.py` | NEW — 30 adversarial tests |
| `plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-bench.py` | NEW — latency benchmark |
| `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` | §FR-22-2.1 2-tier + §FR-22-2.3 retired + §10/§15 RESOLVED + §7 Commit 0.3/0.4 wording |
| `.claude/decisions.md` | D84-D88 prepended |
| `.claude/parking.md` | Multiple closures (P-G4 / P-PIXEL-DIFF-VERTICAL / P-SLOT-SYNONYMS-CONTENT / P-SGS-UPDATE-ROLE / P-D85-BASELINE-CONSTANT) |
| `.claude/state.md` | current_subphase_step rewritten + empirical_baseline pointer updated |
| `.claude/next-session-prompt.md` | Rewritten for Phase 1.1 orchestration plan |
| `.claude/reports/2026-05-27-hybrid-block-roster.md` | NEW — 61 hybrid blocks |
| `pipeline-state/_snapshots/` | +triple-null-baseline.json + tier-b-backfill-approved + role-detection-diff |

## Notes for Next Session

- **DB mutated this session.** Pre-rewrite snapshot at `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` (SHA256 `d088...0017bc`) is the rollback target. Live DB now has 4 Tier B + 94 role-detection writes. Per-row reversibility via `_snapshots/` diff files.
- **block.json `role: "content"` is canonical truth** for content-attr classification per WordPress core. Used in Phase 0.4 audit validation. Future Phase 2 migrations cite this directly; do not infer.
- **8-15 hybrid block estimate was wrong.** Actual = 61 per FR-22-6 canonical criterion. Phase 2 prioritises by `hybrid_attr_count` descending — not "61 migrations".
- **/qc-council Task 2 Rater A's adversarial 5th test paid for the protocol.** Caught role-exclusion NULL-role hole no single dispatch would have surfaced. Pattern: bind every load-bearing classification to an external regression test.
- **Wave A Sonnet 2 self-reported `git stash` Binding E violation** mid-session. No state loss. Honesty-on-violation pattern worth preserving in future dispatch briefs.

## Next Session Prompt

See `.claude/next-session-prompt.md` — full orchestration plan with per-task model routing, dispatch patterns, dependency graph, and methodology guardrails for the 5-commit Phase 1 walker rewrite cadence (1.1 → 1.5).
