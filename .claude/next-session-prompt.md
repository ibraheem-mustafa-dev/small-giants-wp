---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-28-spec-22-phase-1-walker-rewrite
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-0-foundation
primary_goal: "Open Spec 22 Phase 1 — universal walker rewrite. Phase 0 closed 2026-05-27 (7 commits). Phase 1 ships as 5 commits per R-22-5: 1.1 pre-rewrite snapshot, 1.2 atomic-tag map migration, 1.3 ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution, 1.4 universal walker (THE core rewrite), 1.5 measurement + halt/proceed."
---

# Next session — Spec 22 Phase 1 (universal walker rewrite)

You are the SGS framework architect implementing Spec 22's universal walker. The cloning pipeline's foundation is in place (Phase 0 closed); next session opens the walker rewrite that replaces Spec 16's layered FR1/lift_subtree/F1/9-branch architecture with a single recursive function obeying exactly 3 permitted exceptions (atomic-tag swap / chrome-skip / top-level container wrap).

## State recap

Phase 0 closed on `main` at `b62e1660` after 7 commits this session. The DB now carries: positive-allowlist role-exclusion (D85) that closes the FR-22-2.2 NULL-role hole; deleted Tier C (D86) reducing the spec to a 2-tier system; DB-derived `slot_synonyms.role_classification` column replacing hardcoded frozensets; 4 Tier B canonical_slot writes + 94 role-detection writes applied + 1 slot_synonyms gap filled (`role.standalone_block = sgs/label`). `scripts/pixel-diff.py` ships chrome-hide via `visibility:hidden` (D87 — empirical divergence from spec's "crop" wording) + `--wait-fonts` + `--keep-chrome`; orchestrator auto-passes `--wait-fonts` on Spec-22-gated runs (Phase 0.3.b). `wp-blocks.py` exposes the 6 FR-22-8 subcommands with `equivalent-block` wired to `db_lookup.equivalent_block_for()`. Three test suites guard against drift (39/39 PASS total). Wave B baseline at `pipeline-state/mamas-munches-144-2026-05-26-122349/` (mean 58.91% post-chrome-hide). Hybrid roster at `.claude/reports/2026-05-27-hybrid-block-roster.md`: 61 blocks (canonical Phase 2 scope; not consumed by Phase 1).

## Phase 1 pre-conditions — ALL VERIFIED 2026-05-27

- Branch on main ✓
- Spec 22 status: active (§16 ratification gate)
- `sgs-db.py stats` clean (194 blocks / 2,246 attrs)
- `npm run build` exits 0
- Sandybrown canary HTTP 200 (1.89s)
- Pre-rewrite DB snapshot at `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` (SHA256 `d088...0017bc`)
- FR-22-8 perf: cold 3.2ms (≤20ms) / warm 0.0002ms (≤2ms)
- 39/39 tests PASS

## Mandatory reading (in order)

1. This file
2. `.claude/state.md` — current_subphase_step
3. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — §3 FRs (FR-22-1/2/3/5), §6 R-22-1 through R-22-13, §7 Phase 1 commits (1.1-1.5), §13 Appendix A (walker pseudocode), §14 Appendix B (atomic_tag_map algorithm)
4. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — full Phase 1 plan with model routing per commit
5. `.claude/decisions.md` D78-D88
6. `.claude/handoff.md` — last session full context

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — architectural / strategy decisions |
| `/gap-analysis` | ALWAYS INCLUDE — grade outputs before delivery |
| `/lifecycle` | ALWAYS INCLUDE — start pipeline before any skill/agent edits |
| `/research` | ALWAYS INCLUDE — auto-routes to research tier |
| `/strategic-plan` | ALWAYS INCLUDE — plan implementation order |
| `/sgs-wp-engine` | Touch any framework code — invoke first |
| `/qc-council` | Pre-commit gate for Commits 1.3 + 1.4 (converter-adjacent per blub.db 255) |
| `/qc-inline` | Commits 1.2 + 1.5 (smaller change surface) |
| `/delegate` | Pick model per task |
| `/subagent-driven-development` | Commits 1.3 + 1.4 (implementer + 2 reviewers) |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/capture-lesson` | Any new corrective rule surfaced |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` | Live-page DOM verification per R-22-11 (canonical) |
| `wp-blocks.py equivalent-block` | FR-22-8 CLI per-attr lookup |
| `sgs-db.py block <slug>` | Block schema queries |
| `chrome-devtools-mcp` | Browser inspection during walker dev if Playwright is overkill |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy SGS framework work (walker rewrite scope) |
| Sonnet subagents via /delegate | Commits 1.2 / 1.3 / 1.4 implementation |
| `code-reviewer` (via /subagent-driven-development) | Reviewer #1 on Commits 1.3 + 1.4 |
| `test-and-explain` | Post-walker rewrite verification for non-coder readability |

---

## Task 1 — Phase 1.1 Pre-rewrite snapshot

**What:** `git mv plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py plugins/sgs-blocks/scripts/orchestrator/_retired/convert_pre_spec22.py` (after `mkdir -p _retired`). Living-docs note. Commit.
**Why:** Enables true rollback per F-RA-2 — pairs with the pre-rewrite DB snapshot already captured (`pipeline-state/_snapshots/sgs-framework-pre-spec22.db`).
**Estimated time:** 10 min.

**Orchestration:**
- Execution: inline (main thread, Opus)
- Depends on: none
- Parallel with: none (foundational; sequence-gated)
- /qc gate after: `/qc-inline` (trivial structural change)

**Acceptance:** `git log -1` shows the rename commit; `convert_pre_spec22.py` exists in `_retired/`; main session continues to Task 2.

## Task 2 — Phase 1.2 Atomic-tag map migration

**What:** Replace hardcoded `ATOMIC_TAG_MAP` (convert.py:698-704) with DB-driven `db.atomic_tag_map()` per Spec 22 §14 Appendix B (2-tier resolution: `slot_synonyms.html_semantic_tag` then `blocks.replaces` reverse-walk).
**Why:** Eliminates the last hardcoded class-to-block dict per R-22-1; walker reads canonical mapping at startup from DB.
**Estimated time:** 1-2 hours.

**Orchestration:**
- Execution: delegated subagent
- Model: Sonnet via `/delegate` (mechanical refactor; well-scoped)
- Dispatch pattern: single-agent
- Brief: replace the dict with a function reading from sgs-framework.db at module load; LRU cache the result; preserve existing behaviour for the 9 current entries; add tests for the 2-tier resolution.
- Context the subagent needs: `convert.py:698-704` is the current dict; Spec 22 §14 Appendix B has the resolution algorithm; db_lookup.py already has the `equivalent_block_for()` pattern to model on.
- Depends on: Task 1
- Parallel with: none (sequential per Spec 22 §7)
- /qc gate after: `/qc-inline` + `/sgs-clone --debug-trace` Stage 11 measurement (predicted no pixel-diff change)

**Acceptance:** ATOMIC_TAG_MAP dict deleted from convert.py; `db.atomic_tag_map()` returns expected mapping; Stage 11 pixel-diff within ±0.5pp of baseline.

## Task 3 — Phase 1.3 ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution

**What:** Delete `ARRAY_LIFT_PATTERNS` dict (convert.py:1008-1031). Implement FR-22-2.5: walker treats array attrs as sibling-class containers; per-item resolution via FR-22-1 BEM signature.
**Why:** Hardcoded `ARRAY_LIFT_PATTERNS` violates R-22-1; FR-22-2.5 makes array handling universal.
**Estimated time:** 2 hours.

**Orchestration:**
- Execution: delegated subagent via `/subagent-driven-development`
- Model: Sonnet via `/delegate`
- Dispatch pattern: 1 implementer + 2 reviewers (code-reviewer agent + main-session review)
- Brief: delete ARRAY_LIFT_PATTERNS; for any array-typed attr (block_attributes.attr_type='array'), walker finds the sibling-class container in DOM + emits one child block per item; per-item attrs lift via the same role-aware mechanism as scalars.
- Context the subagent needs: Spec 22 §FR-22-2.5 has the algorithm; convert.py:1008-1031 is the current dict; sgs/product-card.packSizes / sgs/timeline.entries are canonical test cases.
- Depends on: Task 2
- Parallel with: none
- /qc gate after: `/qc-council` multi-rater (converter-adjacent per blub.db 255) + Stage 11 measurement (predicted social-proof + featured-product show modest improvement)

**Acceptance:** ARRAY_LIFT_PATTERNS deleted; walker emits one child block per array item on canonical test cases; Stage 11 measurement cited in commit message.

## Task 4 — Phase 1.4 Universal walker (THE core rewrite) ⚡

**What:** Delete `lift_subtree_into_block_attrs` (convert.py:3387), `_lift_inner_blocks` (convert.py:1350), F1 fallback (convert.py:3916), 9-branch walk(), per-block hardcoded branches (convert.py:1532, 1550). Implement single-path walker per FR-22-3 + Appendix A. New helper functions in `converter_v2/db_lookup.py`. LRU cache.
**Why:** Replaces Spec 16's layered architecture with the universal walker. Closes the "double-render" bug structurally. Activates Tier B-applied + role-detection-applied rows.
**Estimated time:** 5-6 hours.

**Orchestration:**
- Execution: delegated subagent via `/subagent-driven-development`
- Model: Sonnet via `/delegate` (one implementer + 2 reviewers)
- Dispatch pattern: implementer + spec-reviewer + quality-reviewer (3 agents per blub.db 240 + Spec 22 R-22-12)
- Brief: implement the universal walker per FR-22-3 (3 permitted exceptions: atomic-tag swap, chrome-skip at top, top-level container wrap). New helper functions (`resolve_slug_from_bem()`, `lift_behavioural_attrs()`, `emit_sgs_container_wrapping()`) in `converter_v2/db_lookup.py`. Walker reads BEM class → resolves slug via DB → emits block. No per-block conditionals (`if slug == 'sgs/X'` patterns BANNED per FR-22-3).
- Context: §13 Appendix A has the pseudocode; pre-rewrite convert.py archived at `_retired/convert_pre_spec22.py`; the 4 Tier B applied rows (sgs/icon.iconSource/iconName/linkTarget + sgs/timeline.entries) now have role populated and will activate via equivalent_block_for() — verify they emit child blocks correctly.
- Depends on: Task 3
- Parallel with: none
- /qc gate after: `/qc-council` ⚡ pre-commit (4-rater multi-model per blub.db 255 — Sonnet + Haiku + Gemini Flash + Cerebras) + `/verify-loop` 2-attestation + `/sgs-clone --debug-trace` full Stage 11

**Acceptance:** All 4 deleted functions gone; walker is single recursive function with exactly 3 branches; brand pixel-diff drops substantially toward ≤5%; product-card double-render closes (-30 to -50pp from current 75%); NO section regresses >2pp from baseline. Per Spec 22 R-22-13 Bean visual sign-off on cropped-pair artefacts co-authoritative.

## Task 5 — Phase 1.5 Measurement + halt/proceed decision ⚡

**What:** Full-page `/sgs-clone --auto-section --debug-trace`. Every body section measured. If all 7 sections × 3 viewports ≤5%, Phase 1 closes. If any > 5%, halt + diagnose.
**Why:** Empirical gate — code shipped ≠ outcome achieved.
**Estimated time:** 1 hour.

**Orchestration:**
- Execution: inline (main thread, Opus) — gate evaluation requires Bean visual sign-off per R-22-13
- Depends on: Task 4
- Parallel with: none
- /qc gate after: `/qc-council` Stage 5 multi-rater on the measurement interpretation

**Acceptance:** Phase 1 close condition met (all 21 cells ≤5%) OR halt with diagnosed root cause + Phase 1.5 territory determination. Bean visual sign-off recorded.

---

## Dependency graph

```
Task 1 — Phase 1.1 snapshot (inline, Opus, 10 min)
  ↓
Task 2 — Phase 1.2 atomic-tag (Sonnet, 1-2h)
  ↓ /qc-inline + Stage 11
Task 3 — Phase 1.3 array-of-objects (Sonnet via /subagent-driven-development, 2h)
  ↓ /qc-council
Task 4 — Phase 1.4 walker rewrite (Sonnet via /subagent-driven-development, 5-6h) ⚡
  ↓ /qc-council multi-rater + /verify-loop
Task 5 — Phase 1.5 measurement (inline, Opus, 1h) ⚡
  ↓ /qc-council Stage 5
Phase 1 closes; Phase 2 (hybrid render.php migrations) opens
```

Total Phase 1 wall-time: ~9-12 hours across 2-3 sessions.

## Methodology guardrails (do not skip)

- **Deploy before measure** — Stage 11 measurement runs against LIVE sandybrown page 144. Build + tar deploy + OPcache reset BEFORE Stage 11 invocation. Stale code = stale measurement.
- **Root cause before instance fix** — if a section regresses, ask "what's the class of failure?" before patching that section. Universal mechanisms (R-22-9), not per-block hyperfocus.
- **Outcome vs completion** — if Phase 1.4 ships but pixel-diff doesn't drop, the task is NOT done. Don't redefine "done" to mean "code shipped".
- **/qc-council multi-rater BEFORE Commits 1.3 + 1.4** (converter-adjacent per blub.db 255)
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256)
- **--converter-v2 + --debug-trace + --spec-22-acceptance** on Phase 1 measurement runs (orchestrator now auto-passes `--wait-fonts`)
- **WP_DEBUG_DISPLAY must stay false** on sandybrown — debug notices contaminate every pixel-diff
- **R-22-3 enforcement** — walker has exactly 3 conditionals; any 4th branch requires spec amendment
- **R-22-13** — Bean visual sign-off co-authoritative with script number for Commit 1.5 close
- **No git stash/reset/restore/checkout** in subagents (blub.db 230)

## Guardrails — what must not break

- `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` rollback target MUST stay byte-identical (read-only).
- 39/39 test suite (db_lookup 5/5 + external-derivation 4/4 + wp-blocks-adversarial 30/30) MUST stay PASS through every commit.
- Triple-NULL DB count = 1090 baseline MUST hold (no behavioural-attr drift).
- `_retired/convert_pre_spec22.py` is the rollback code reference — do NOT modify post-Task 1.

## Out-of-scope this session

- Phase 2 (hybrid render.php migrations across 61-block roster) — opens after Phase 1.5 closes
- Phase 1.5 noise-floor diagnosis — empirically scoped post-Phase-1
- Header/footer cloner — Phase 2 sibling, parked
- Cross-client validation (Indus Foods) — Phase 4.2
