---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-28-spec-22-phase-1.5-pixel-diff-measurement
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-1-architectural-CLOSED
primary_goal: "Phase 1.5 — Stage 11 pixel-diff measurement. Empirical gate for Phase 1 acceptance: every body section ≤5% × 3 viewports (Phase 1) with R-22-13 Bean visual sign-off co-authoritative. Walker rewrite is shipped + council-gated + 145+ tests PASS; now measure rendered output against Mama's canary page 144."
---

# Next session — Spec 22 Phase 1.5 (Stage 11 pixel-diff measurement)

You are the SGS framework architect closing Spec 22 Phase 1. The universal walker rewrite is **shipped + architecturally gated** (Phase 1.4a + 1.4b committed yesterday). What remains is the **empirical gate**: measure the rendered cloning-pipeline output against the Mama's Munches canary page 144 at sandybrown staging. Decide halt-or-proceed based on the per-section pixel-diff results AND Bean's visual sign-off (R-22-13 co-authoritative).

## State recap (plain English)

The Spec 16 walker was retired and replaced by a single universal walker in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (1842 LoC, ~50% reduction). The walker has EXACTLY 3 routing branches per R-22-3, no per-block conditionals, no hardcoded routing dicts. It consumes 8 new DB-driven helpers shipped this session. /qc-council 4-rater multi-model gate found and fixed 5 real bugs before the walker commit. 145+/145+ test suite PASS.

**Now we test it against reality.** The acceptance criterion is per-section ≤5% pixel-diff × 3 viewports (375/768/1440) across 7 body sections (Phase 1 gate). If all 21 cells (7 sections × 3 viewports) hit ≤5% AND Bean visually signs off → Phase 1 closes, Phase 2 opens (61-block hybrid render.php migration roster). If any cell exceeds ≤5% → diagnose root cause; walker is structurally correct so failures are class-of-issue, not per-section bugs.

## Mandatory reading (in order)

1. This file
2. `.claude/handoff.md` — last session full context (8 commits, Phase 1.4 close)
3. `.claude/state.md` — current state snapshot
4. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §11 success criteria + §6 R-22-13 visual sign-off rule + §FR-22-7 body section enumeration
5. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` Task 5 (Phase 1.5 measurement)
6. `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` (Wave B baseline, mean 58.91% — for predicted-vs-actual delta comparison)
7. `.claude/cloning-pipeline-stages.md` Stage 11 detail

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — Phase 1.5 halt/proceed decision is architectural |
| `/gap-analysis` | ALWAYS — grade results before delivery |
| `/lifecycle` | ALWAYS — start pipeline before any skill edit |
| `/research` | ALWAYS — auto-routes if Phase 1.5 reveals an unfamiliar failure class |
| `/strategic-plan` | ALWAYS — only if Phase 1.5 fails + Phase 1.5.1 diagnosis needs sequencing |
| `/sgs-wp-engine` | Touch any framework code |
| `/qc-council` | Pre-commit gate on ANY converter/walker edit (per blub.db 255) |
| `/qc-inline` | Smaller artefacts; final readout summary |
| `/sgs-clone` | THE primary tool for this session — runs the full pipeline + Stage 11 measurement |
| `/sgs-update` | After any block/theme change |
| `/delegate` | Pick model per task (Sonnet for diagnosis, Haiku for mechanical checks) |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/capture-lesson` | Any new corrective rule surfaced |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` | Live-page DOM verification per R-22-11 (canonical); chrome-detection for pixel-diff cells |
| `chrome-devtools-mcp` | Browser inspection during section-level diagnosis if Playwright is overkill |
| `wp-blocks.py equivalent-block` | FR-22-8 per-attr DB lookup during diagnosis |
| `sgs-db.py block <slug>` | Block schema queries |
| `scripts/pixel-diff.py` | Per-section cropped pixel-diff (FR-22-7); already shipped chrome-hide via visibility:hidden |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy framework work if Phase 1.5 fails + walker logic needs adjustment |
| Sonnet via /delegate | Mechanical diagnosis tasks |
| `test-and-explain` | Post-Phase-1.5 readout for non-coder Bean readability |

---

## Task 1 — Build + deploy walker to sandybrown staging

**What:** `npm run build` + tar deploy + OPcache reset on sandybrown staging (`sandybrown-nightingale-600381.hostingersite.com`). The Phase 1.4 walker code is currently sitting on origin/main but the staging server still has the pre-walker code.
**Why:** Pixel-diff measurement against stale code measures stale output — captured rule (`feedback_wp_debug_display_contaminates_pixel_diff`). Deploy MUST precede measurement.
**Estimated time:** 10 min.

**Orchestration:**
- Execution: inline (main thread, Opus)
- Depends on: none
- Parallel with: none (foundational — sequence-gated)
- /qc gate after: trivial; build exit 0 + curl-200 on the canary URL suffices

**Acceptance:** sandybrown page 144 returns HTTP 200 after deploy; `php -r "echo opcache_get_status();"` (or curl reset endpoint) confirms opcache cleared; `WP_DEBUG_DISPLAY` confirmed `false` per blub.db row 263.

## Task 2 — Stage 11 pixel-diff measurement (full body sections × 3 viewports)

**What:** `python plugins/sgs-blocks/scripts/orchestrator/sgs-clone-orchestrator.py --client mamas-munches --target page:144 --auto-section --debug-trace --converter-v2 --spec-22-acceptance` against sandybrown. Captures pre/post pixel-diff for 7 body sections × 3 viewports (375/768/1440) = 21 cells.
**Why:** Empirical gate for Phase 1 acceptance per R-22-4 + R-22-13.
**Estimated time:** 30-45 min wall-time (the pipeline + Playwright + per-section crop measurements).

**Orchestration:**
- Execution: inline (main thread, Opus) — the orchestrator runs the measurement; this task is just invoking it and parsing the output
- Depends on: Task 1
- Parallel with: none
- /qc gate after: none (the measurement IS the gate)

**Acceptance:** `pipeline-state/mamas-munches-144-<timestamp>/stage-11-pixel-diff.json` exists with 21 cells populated. Per-cell deltas captured. Cell-by-cell halt/proceed analysis follows in Task 3.

## Task 3 — Halt/proceed decision + Bean visual sign-off

**What:** Parse Stage 11 output. For each of 21 cells, classify:
- **PASS** (cell ≤5%): acceptable
- **FAIL** (cell >5%): root-cause diagnosis required

Per R-22-13, ALSO surface cropped-pair artefacts (sgs.png + mockup.png + diff.png + heatmap.png) per-section for Bean's visual sign-off. Bean's eye is co-authoritative — if a cell measures ≤5% but Bean's eye says "wrong colour" or "wrong layout", the cell is NOT closed (per `feedback_extend_measurement_set_when_human_eye_disputes`).

**Why:** This is the actual go/no-go for Phase 1.
**Estimated time:** 20-30 min (parsing + cropped-pair review + Bean's sign-off pass).

**Orchestration:**
- Execution: inline (main thread, Opus) — needs Bean's visual sign-off interactively
- Depends on: Task 2
- Parallel with: none

**Acceptance:**
- If all 21 cells PASS measurement AND Bean signs off visually → **Phase 1 CLOSED**, Phase 2 opens (hybrid render.php migration roster from Phase 0.4 audit). Update state.md current_phase to `spec-22-phase-1-closed-2026-05-28`. Commit a small Phase 1.5 close-note commit. Open next-session-prompt for Phase 2.
- If any cell FAILS → escalate to Task 4 (root cause diagnosis).

## Task 4 — Root cause diagnosis (only if Task 3 surfaces FAILs)

**What:** For each FAIL cell, ask: "what's the CLASS of failure?" Walker is structurally correct (council-gated, R-22-3 PASS). Failures will be class-of-issue:
- **Class A — CSS routing:** walker emits block but block-scoped CSS doesn't reach the rendered output. Inspect variation_buf path; cross-check FR-22-5 routing.
- **Class B — Lift-attr coverage:** lift_behavioural_attrs misses an attr that's actually content-bearing. Inspect block_attributes rows for the affected block; cross-check FR-22-2 role classification.
- **Class C — Atomic-emission semantics:** emit_atomic emits wrong attr names for an atomic-target slug. Cross-check `_atomic_attrs_for` per-(slug, tag) maps vs current block.json schema.
- **Class D — Pass-through routing:** walker pass-through subtree drops a block that should emit. Inspect walk_passthrough path; verify variation_buf threading (D1 fix already applied; new regressions likely a different shape).
- **Class E — Sibling-class container resolution (FR-22-2.5):** array-typed attr's sibling-class container not found in the DOM. Inspect array_item_slot_for path.

**Why:** Universal mechanisms, not per-block hyperfocus (R-22-9).
**Estimated time:** Per FAIL cell, 30-60 min diagnosis. /qc-council 4-rater MANDATORY if a fix-shape is dispatched (blub.db 255).

**Orchestration:**
- Execution: per-cell, mostly inline; subagent dispatch only if the fix is well-bounded
- Depends on: Task 3 surfaces FAILs
- Parallel with: per-FAIL diagnosis can parallelise via `/dispatching-parallel-agents`
- /qc gate after: `/qc-council` 4-rater BEFORE any commit (Sonnet + Haiku + Gemini Flash + main-thread)

**Acceptance:** Each FAIL cell either (a) ships a validated fix that drops the cell ≤5% on re-measurement, OR (b) is parked with a clear root-cause classification + Phase 1.5 → Phase 2 escalation note.

---

## Dependency graph

```
Task 1 — Deploy (inline, Opus, 10 min)
  ↓
Task 2 — Stage 11 measurement (inline, Opus, 30-45 min)
  ↓
Task 3 — Halt/proceed decision + Bean visual sign-off (inline, Opus, 20-30 min)
  ↓
  ├─ All 21 cells PASS → Phase 1 CLOSED → Phase 2 opens
  └─ Any FAIL → Task 4 root cause diagnosis (per-cell, /qc-council gated)
```

Total Phase 1.5 wall-time best case: ~60-90 min. Worst case (multiple FAILs requiring diagnosis): 3-5 hours.

## Methodology guardrails (do not skip)

- **Deploy before measure** — Stage 11 measurement runs against LIVE sandybrown page 144. Build + tar deploy + OPcache reset BEFORE Stage 11 invocation. Stale code = stale measurement.
- **Root cause before instance fix** — if a section FAILs, ask "what's the class of failure?" before patching that section. Universal mechanisms (R-22-9), not per-block hyperfocus.
- **Outcome vs completion** — if Phase 1.5 ships measurement but cells stay >5%, the task is NOT done. Don't redefine "done" to mean "measurement captured".
- **/qc-council multi-rater BEFORE any walker fix-shape commit** (converter-adjacent per blub.db 255)
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256)
- **--converter-v2 + --debug-trace + --spec-22-acceptance** on Phase 1.5 measurement runs
- **WP_DEBUG_DISPLAY must stay false** on sandybrown — debug notices contaminate every pixel-diff (blub.db 263)
- **R-22-13** — Bean visual sign-off co-authoritative with script number. Script ≤5% + Bean says "wrong" → not closed. Script >5% + Bean says "visually fine, this is a noise floor issue" → close per Phase 1.5 stretch territory.
- **R-22-3 PASS test self-runs** — convert.py's `__main__` AST-walks walk() and asserts zero illegal block-slug literals. Any walker fix in Task 4 MUST keep this passing.
- **No git stash/reset/restore/checkout** in subagents (blub.db row 230)

## Guardrails — what must not break

- `_retired/convert_pre_spec22.py` rollback target MUST stay byte-identical (read-only)
- 145+ test suite MUST stay PASS through every commit
- Triple-NULL DB baseline = 1101 MUST hold (no behavioural-attr drift)
- The walker's exactly-3-routing-branches structure is binding — adding a 4th is a spec amendment, not a code fix

## Out-of-scope this session

- Phase 2 (hybrid render.php migrations across 61-block roster) — opens after Phase 1.5 closes
- P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION — SEO regression parked; Phase 2 picks it up
- P-SUBHEADING-ROUTING-TO-SGS-HEADING — blocked on walker existing (now exists, but routing change is Phase 2 walker work, not Phase 1.5 measurement)
- 5 pre-existing duplicate parking slugs — separate parking cleanup pass
- Dashboard at port 5050 restart — separate ops task
