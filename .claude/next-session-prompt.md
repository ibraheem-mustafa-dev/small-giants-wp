---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-spec-22-phase-1.5-systematic-debugging-class-of-failure
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-1.5-measured-empirical-FAILED
primary_goal: "Phase 1.5 dispatched 0/21 body cells PASS ≤5% — universal walker structurally correct but renders ~81.55% mean mismatch (regression +17.94pp from pre-walker 63.61%). Run /systematic-debugging across parallel dispatched agents to find the class-of-failure root causes per section, with full debug-trace artefacts captured at pipeline-state/mamas-munches-144-2026-05-27-124306/. Likely conclusion: Phase 2 (61-block hybrid render.php migration roster) is the path to gap closure; this session diagnoses + confirms."
---

# Next session — Spec 22 Phase 1.5 /systematic-debugging on the empirical FAIL

The universal walker shipped architecturally clean (Phase 1.4b, commit `da3de993`) but Phase 1.5 measurement (run on `2026-05-27-124306`) shows ZERO of 21 body cells hit the ≤5% acceptance gate. Mean mismatch 81.55%, a +17.94pp regression from the pre-walker 63.61% baseline. This is the empirical evidence Phase 1.5 was designed to surface — Spec 16's hardcoded per-block cheats were hiding the gap; the universal walker exposes it.

Per-cell breakdown (sorted worst → best):

| Section | 375 | 768 | 1440 | Verdict |
|---|---|---|---|---|
| sgs/trust-bar | 99.94 | 93.25 | 99.99 | FAIL all 3 |
| sgs/brand | 95.87 | 99.80 | 95.32 | FAIL all 3 |
| sgs/social-proof | 89.57 | 80.01 | 91.07 | FAIL all 3 |
| sgs/hero | 88.90 | 62.67 | 58.19 | FAIL all 3 (least bad) |
| sgs/gift-section | 84.00 | 93.32 | 77.86 | FAIL all 3 |
| sgs/ingredients-section | 69.06 | 83.77 | 65.13 | FAIL all 3 |
| sgs/featured-product | 72.89 | 79.67 | 81.55 | FAIL all 3 |

Chrome (out of Phase 1 scope): header 20-82%, footer 94-99% — Phase 2 sibling spec.

## State recap (plain English)

The walker IS shipped + correct structurally (R-22-3 PASS, 145+ tests PASS, AST self-test runs in `convert.py __main__`). It emits valid WordPress block markup. Stage 10 deploy machinery had a bug (`upload_and_patch.py` aborted when 0 relative URLs existed) that was fixed mid-session. The current `page 144` on sandybrown DOES carry the new walker's output (`extract.patched.json` shipped). The pixel-diff regression is real and reflects the **removed Spec 16 cheats**: the old walker had per-block hardcoded CSS lifting + inner-block synthesis + F1 fallback paths that compensated for missing block infrastructure. The universal walker doesn't cheat — so the gaps that were always there now show up in the pixel-diff measurement.

Next session's work is to **diagnose the class-of-failure per section** + decide whether the right response is (a) Phase 2 hybrid render.php migration (the spec's planned path), (b) walker-level adjustments that don't violate R-22-3, or (c) a hybrid of both.

## Mandatory reading (in order)

1. This file
2. `.claude/handoff.md` — last session full context (8 substantive commits + 3 drift fix rounds + Phase 1.5 measurement run)
3. `.claude/state.md` — current state snapshot (Phase 1.5 MEASURED 0/21 body cells PASS)
4. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-6 (hybrid render.php migration), §FR-22-7 (acceptance gate), §11 success criteria, §6 R-22-1 through R-22-13 binding rules
5. `pipeline-state/mamas-munches-144-2026-05-27-124306/stage-11-pixel-diff.json` — measured per-cell results
6. `pipeline-state/mamas-munches-144-2026-05-27-124306/leftover-buckets.json` — 579 leftover entries across 3 buckets (the cv2 walker's classification of what it couldn't lift)
7. `pipeline-state/mamas-munches-144-2026-05-27-124306/extract.json` + `extract.patched.json` — walker's emitted block markup
8. `pipeline-state/mamas-munches-144-2026-05-27-124306/convert-trace-b1.jsonl` through `convert-trace-b9.jsonl` — per-boundary trace logs (9 boundaries = 9 mockup sections)
9. `pipeline-state/mamas-munches-144-2026-05-27-124306/pixel-diff/` — cropped-pair PNGs (mockup vs sgs) per cell, plus diff.json + heatmap.png
10. `.claude/reports/2026-05-27-hybrid-block-roster.md` — Phase 0.4 audit (61 hybrid blocks needing render.php migration)
11. `.claude/specs/common-wp-styling-errors.md` — sections A-R catalogue (check BEFORE filing new "I've seen this" tickets)

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — Phase 1.5 → Phase 2 decision is architectural |
| `/gap-analysis` | ALWAYS — grade root-cause analysis before delivery |
| `/lifecycle` | ALWAYS — start pipeline before any skill/agent edits |
| `/research` | ALWAYS — auto-routes for unfamiliar failure classes |
| `/strategic-plan` | ALWAYS — if Phase 2 dispatch needs sequencing across 61-block roster |
| `/systematic-debugging` | **PRIMARY** — root-cause investigation BEFORE proposing fixes. 4-phase protocol (Root Cause → Pattern Analysis → Hypothesis → Implementation). No fixes without root cause first. |
| `/sgs-wp-engine` | Any framework code touch |
| `/qc-council` | **MANDATORY** pre-commit gate for any walker/converter edit (blub.db 255) |
| `/qc-inline` | Smaller artefacts; section-by-section readouts |
| `/dispatching-parallel-agents` | Per-section /systematic-debugging — dispatch 7 parallel agents (one per body section) for class-of-failure diagnosis |
| `/subagent-driven-development` | If fix-shape commits are dispatched — 1 implementer + 2 reviewers per blub.db 240 |
| `/delegate` | Pick model per task — Sonnet for diagnosis, Haiku for mechanical traces |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/capture-lesson` | New corrective rules surfaced |
| `/sgs-clone` | Re-measure after any walker change |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` | Live-page DOM verification per R-22-11 (canonical); inspect rendered output cell-by-cell |
| `chrome-devtools-mcp` | Browser inspection for CSS / layout / box-model investigation per section |
| `wp-blocks.py` | DB schema queries (FR-22-8 — block attributes, slot_synonyms, html_tag_to_core_block) |
| `sgs-db.py block <slug>` | Block-level schema lookup |
| `scripts/pixel-diff.py --selector .sgs-{section}` | Per-section re-measurement after fix dispatch (FR-22-7) |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy framework work if walker logic needs adjustment |
| Sonnet via /delegate | Per-section /systematic-debugging dispatch (parallel) |
| Haiku via /delegate | Mechanical trace-file parsing |
| Gemini Flash | Independent cross-family eye on hypotheses |

---

## Task 1 — Parallel /systematic-debugging per FAIL section (7 sections)

**What:** Dispatch 7 parallel /systematic-debugging agents (one per body section) via `/dispatching-parallel-agents`. Each agent has:
- The section's per-cell pixel-diff numbers (3 viewports)
- The section's cropped mockup + sgs PNGs (`pipeline-state/.../pixel-diff/<sel>-<vp>/{mockup,sgs}.png`)
- The section's convert-trace JSONL (`convert-trace-bN.jsonl` where N is the section's boundary index 1-9)
- The section's emitted block markup (`extract.json` section entry)
- The section's leftover-buckets entries (`leftover-buckets.json` filtered by section)
- The section's expected-rules baseline (`expected-rules-bN.jsonl`)
- Read access to the SGS block source code for the blocks the section emits

**Why:** /systematic-debugging's iron law — no fixes without root cause first. 7 sections × class-of-failure diagnosis surfaces whether the regression is (a) CSS routing (FR-22-5), (b) lift-attr coverage (FR-22-2 — block_attributes incomplete for the slug), (c) atomic-emission semantics (FR-22-3 exception 1 — emit_atomic wrong attrs for the resolved slug), (d) pass-through routing (FR-22-11 — walker_passthrough subtree dropping content), (e) sibling-class container resolution (FR-22-2.5 — array-of-objects not finding container), OR (f) the deeper "hybrid block render.php still uses hardcoded attrs not echo $content" class which is exactly what FR-22-6 + Phase 2 migration roster addresses.

**Estimated time:** Per-section diagnosis 30-60 min; 7 agents dispatched in parallel = ~60-90 min wall-time.

**Orchestration:**
- Execution: 7 parallel subagents via /dispatching-parallel-agents
- Model: Sonnet via /delegate (each agent)
- Cold prompt MUST contain (per /subagent-prompt skill):
  - The specific section's pixel-diff numbers + cropped-pair PNG paths
  - The full debug-trace + extract paths the agent should read
  - Class-of-failure taxonomy (5 classes named in Spec 22)
  - Iron-law gate: "NO fix proposals before root cause stated in plain English"
- Per-section agent returns: (i) Root cause stated in plain English; (ii) Class-of-failure label; (iii) Evidence cited (file:line OR pixel-diff PNG observation); (iv) Recommended fix shape (HYPOTHESIS, not spec)

**Acceptance:**
- 7 root-cause statements (one per section)
- Class-of-failure distribution surfaces — e.g. "5 of 7 sections are Class F (hybrid block render.php), 2 are Class A (CSS routing)"
- No fix-shape commits made (those go through /qc-council in Task 3)

## Task 2 — Synthesise + decide direction

**What:** Read the 7 per-section diagnoses. Synthesise into a Phase 1 → Phase 2 transition decision document at `.claude/reports/2026-05-27-phase-1.5-systematic-debugging-synthesis.md`. Decide:
- **Path A — Phase 2 hybrid render.php migrations** (the spec's planned path; Phase 0.4 roster = 61 blocks)
- **Path B — Walker-level adjustments** (only if root causes point at walker bugs not covered by R-22-3 binding rules)
- **Path C — Hybrid path** (some sections need walker work; others need block migrations)

**Why:** Avoid jumping to a Path that doesn't actually address what the diagnoses surface. R-22-10: read full spec + state architectural primitive in plain English before proposing fix-shape.

**Estimated time:** 30-45 min inline.

**Orchestration:**
- Execution: inline (main thread, Opus)
- Depends on: Task 1
- /qc gate after: /qc-inline on the synthesis report

**Acceptance:** Synthesis report exists with: (i) per-section root cause table; (ii) Path decision (A/B/C) with reasoning; (iii) ranked fix-shape priorities; (iv) re-measurement plan.

## Task 3 — Dispatch Path-A or Path-C fix-shapes (only if Task 2 decision is A or C)

**What:** Per Path-A: parallel dispatch /subagent-driven-development on top-priority block render.php migrations (hero, trust-bar, brand based on which has the biggest expected-impact). Per the Phase 1 plan's Phase 2 row, this is the canonical work. Per blub.db 255: /qc-council 4-rater MANDATORY before each commit.

**Estimated time:** ~30-45 min per block × 3-5 blocks = 2-3 hours, parallel-eligible.

**Orchestration:**
- Execution: /subagent-driven-development per block (1 implementer + 2 reviewers)
- Model: Sonnet via /delegate per agent
- Dispatch pattern: parallel via /dispatching-parallel-agents (per FR-22-6.1 coordination protocol — no shared-file edits in parallel)
- Brief: per-block render.php migration to `echo $content` for block-equivalent slots; deprecated.js for old attrs; editor smoke test
- /qc gate after: /qc-council ⚡ 4-rater BEFORE every commit + Stage 11 re-measurement after each block

**Acceptance:** Per block: render.php uses `echo $content` for content-bearing slots; deprecated.js covers attr shape changes; Stage 11 cell for that section drops measurably (predicted -20 to -40pp per top-priority block).

## Task 4 — Phase 1.5 re-measurement after Path-A/B/C fixes

**What:** Full `/sgs-clone --auto-section --debug-trace --converter-v2 --spec-22-acceptance` run after each fix-shape commit. Compare per-cell pre/post. Capture delta. If all 21 cells now ≤5%, Phase 1 CLOSES.

**Estimated time:** 5 min per re-measurement (Stage 1-11 of /sgs-clone) × N runs.

**Orchestration:**
- Execution: inline (main thread)
- /qc gate after: /qc-council Stage 5 multi-rater on the synthesised measurement interpretation

**Acceptance:** Either Phase 1 closes (all 21 cells PASS) OR a clear halt-point with remaining-work scope.

---

## Dependency graph

```
Task 1 — 7 parallel /systematic-debugging agents (Sonnet, 60-90 min wall-time)
  ↓
Task 2 — Synthesise + Path A/B/C decision (inline Opus, 30-45 min)
  ↓
  ├─ Path A → Task 3 parallel block-migration dispatch (2-3 hr) → Task 4 re-measure
  ├─ Path B → walker-level fix-shape (must clear R-22-3 PASS test) → Task 4 re-measure
  └─ Path C → hybrid; sequence per Task 2 plan → Task 4 re-measure
```

Total Phase 1.5 closure time: best case ~3 hr if Path A clean; worst case multi-session if Class F is the wrong direction.

## Methodology guardrails (do not skip)

- **/systematic-debugging iron law** — NO fix proposals before root cause stated in plain English. Per-section agents MUST surface root cause first.
- **R-22-3 PASS test** — convert.py `__main__` AST self-test asserts EXACTLY 3 routing branches, ZERO illegal block-slug literals. Any walker-level fix-shape MUST keep this passing.
- **/qc-council 4-rater BEFORE every converter/walker/SGS-block commit** (blub.db 255)
- **Stage 11 per-section measurement** via `pixel-diff.py --selector .sgs-{section}`, never full-page (blub.db 256)
- **R-22-13** — Bean visual sign-off co-authoritative with script number
- **Root cause before instance fix** — R-22-9 universal mechanisms, not per-block hyperfocus
- **No git stash/reset/restore/checkout** in subagents (blub.db 230)
- **Deploy before measure** — `npm run build` + tar deploy + OPcache reset BEFORE Stage 11 re-runs
- **Read leftover-buckets.json FIRST** before conjecturing about pipeline failures (blub.db 254)
- **Grep-verify spec claims** before dispatch (feedback_grep_verify_handoff_diagnostic_premises + feedback_spec_22_fr_22_2_5_priority_list_drift)

## Guardrails — what must not break

- 145+/145+ test suite MUST stay PASS through every commit
- R-22-3 AST self-test MUST keep passing (3 routing branches, 0 illegal block-slug literals)
- Triple-NULL DB baseline 1101 MUST hold (no behavioural-attr drift)
- `_retired/convert_pre_spec22.py` MUST stay byte-identical (rollback reference)
- `pipeline-state/mamas-munches-144-2026-05-27-124306/` is the **canonical Phase 1.5 baseline** — DO NOT delete or overwrite; future re-measurements compare against this

## Out-of-scope this session

- Phase 2 dispatch of all 61 hybrid blocks (only top-priority 3-5 per Task 3; the rest after Phase 1 closes)
- Header/footer cloner (Phase 2 sibling spec; chrome cells 20-99% are not in Phase 1 scope)
- P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION — SEO regression, separate work
- Dashboard at port 5050 restart — separate ops task
- 5 pre-existing duplicate parking slugs — separate parking cleanup pass
