---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-24-phase-1-G-gap-closure
generated: 2026-05-23
parent_session: small-giants-wp-2026-05-23-phase-1-reframe-and-revert
primary_goal: "Execute Phase 1 of the 4-phase recovery plan. Phase 1 closes G1+G3+G5 ENTIRELY by shipping the universal walker (Spec 16 §15 steps 1-3 = normal-route build-up path) + FR1 pattern fast-path branch + OPEN-block emit for FR1-matched composite blocks + slot_list visual-slot extension + per-block DOM-shape fixes + hooks completion + role='content' DB sync."
---

# Next session — Phase 1: G1+G3+G5 closure + universal walker

**Invoke `/autopilot` before anything else.**

## STOP — READING DISCIPLINE (mandatory, enforced)

The previous session burned ~6 hours of work on the wrong architectural framing because it SKIMMED the docs instead of reading them. The result: an agent dispatch that built the wrong primitive, a revert, and a half-day of rework. This will not happen again.

**Before executing any Step 1.X, the session MUST:**

1. **Read every doc in the reading list below IN FULL** (not just the section the plan cites — the FULL doc). Phase 1 plan + Spec 16 + cloning-pipeline-flow + architecture-staging plan + the lessons in mistakes.md.
2. **Cite specific line numbers** in your summary back to Bean. Format: "Spec 16 §FR1 (lines X-Y) says ... Spec 16 §FR4 (lines A-B) says ..." Don't paraphrase without citing.
3. **Summarise each doc back in ≤ 200 words per doc**, in your own words. Include the architectural concepts (FR1 fast-path vs normal-route, two-route topology, walker = normal-route builder, NOT section recogniser).
4. **Confirm the 5 framing pitfalls** in `.claude/handoff.md` "Known framing pitfalls (do NOT repeat)" — restate each one in your summary back.
5. **Wait for Bean's go-ahead** before dispatching any agent or making any code edit.

If you skip the reading discipline and start working anyway, expect Bean to interrupt and reset you — possibly with a revert. Don't waste the session.

## Reading list (MANDATORY — full doc reads, not skims)

### Tier 1 — Architectural source-of-truth (read first, in order)

| # | Doc | What to extract |
|---|---|---|
| 1 | `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | **READ IN FULL.** Especially §2 (R1-R5 architectural rules), §3 (FR1-FR9 — pay close attention to FR1's two-route topology + FR4's normal-route start point), §14 (G1-G5 detail + reframing note), §15 (Wave 2 reshape with framing note). Cite line numbers in your summary. |
| 2 | `.claude/cloning-pipeline-flow.md` | Read Stage 2 + Stage 4 STATUS notes in full (post 2026-05-23 reframing). Skim the rest. |
| 3 | `.claude/plans/2026-05-24-phase-1-structural-recovery.md` | **THE plan you're executing — read in full.** Especially the "Reframing" section at the top, the two-route table, and the per-step structure (1.1 through 1.11). |
| 4 | `.claude/handoff.md` (previous session, this handoff) | TL;DR + "Known framing pitfalls" + "Captured lessons" |

### Tier 2 — Supporting context (read sections cited in Tier 1)

| # | Doc | What to extract |
|---|---|---|
| 5 | `.claude/plans/2026-05-24-strategic-plan.md` | §"Solution" (Phase 1 scope) + Phase 1 row of the phase summary table |
| 6 | `.claude/plans/2026-05-21-architecture-staging.md` | Decision 12 (line 87) with its 2026-05-23 corrected footnote |
| 7 | `.claude/pipeline-state-debug-artefacts-inventory.md` | The mandatory diagnostic sequence (blub.db row 254) — read in full |
| 8 | `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` | Read `summary.log` + `match.json` (per-boundary confidence) + `leftover-buckets.json` (first 50 lines for shape) + `stage-11-pixel-diff.json` (full) |
| 9 | `.claude/mistakes.md` | 2026-05-24 lessons 1-4 — capture the failure modes |
| 10 | `.claude/decisions.md` | D46 + D47 (2026-05-24) — capture the architectural decisions surfaced |

### Tier 3 — Reference (read when relevant step needs it)

| Doc | Used at |
|---|---|
| `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` | Phase 2 prep only — NOT this session unless Phase 1 closes |
| `.claude/specs/19-SGS-CLI-COMMANDS.md` | If any new CLI command consideration arises |
| `.claude/architecture.md` | DB-first rule + canonical DB table counts (line 30) |
| `~/.claude/rules/measurement-vs-eye.md` | When Bean disputes a measurement-vs-eye outcome |
| `~/.claude/rules/time-estimates.md` | Estimates default LOW |
| `~/.claude/rules/adhd-collaboration.md` | Rules 1-17 |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dispatched_agents_no_commit_authority.md` | BINDING for every Agent dispatch |
| `.claude/plans/archive/phase-wave-2-wiring-fix-complete.md` | Wave 2 archived plan documenting the 4 changes that constitute the universal walker — read before Step 1.5 dispatch |

## Tool bindings (mandatory)

| Tool | When |
|---|---|
| `/qc-council` | BEFORE every commit touching converter/pipeline/SGS-block (blub.db row 255) |
| `/qc-inline` | Single-file checks during implementation |
| `/sgs-clone --deploy-target page:144 --debug-trace` | AFTER EACH code change (per agent dispatch binding B) — Stage 11 auto-captures pixel-diff |
| `/sgs-update` | Stage 1 re-run for role='content' DB sync (Step 1.9.B) |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/systematic-debugging` | Root-cause investigation before fix proposals |
| `/dispatching-parallel-agents` | Per-block G5 work (Step 1.8) — file-disjoint branches |
| `/subagent-prompt` | Pre-write cold prompts for dispatched implementers |
| `/capture-lesson` | New architectural rules surfaced |
| `/handoff` | Phase 1 close (Step 1.11) |
| `wp-sgs-developer` (via general-purpose subagent, model=sonnet) | Step 1.5 universal walker; Step 1.6 G1 OPEN-block emit; Step 1.7 G3 slot_list; Step 1.8 G5 per-block |
| Playwright MCP | Stage 11 + live-page DOM verification for G1 (CTAs present in `header.sgs-hero`) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE any "missing X" claim |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB queries |

## Dispatch bindings (MANDATORY — embed in every Agent cold prompt)

Per `feedback_dispatched_agents_no_commit_authority.md`:

- **A — NO commit authority.** Agent returns uncommitted artefacts. Main thread + Bean decide commits.
- **B — `/sgs-clone` per sub-change (NOT bundled).** Each code change triggers immediate /sgs-clone + Stage 11 capture.
- **C — Living-docs + /capture-lesson inline per change.** Update mistakes.md / decisions.md / parking.md / cloning-pipeline-flow.md / architecture.md / pipeline-state-debug-artefacts-inventory.md as the work fires.
- **D — TodoWrite breakdown + per-sub-task status.** Progress visible mid-dispatch.

Full dispatch-binding text + Required Output Block at top of `.claude/plans/2026-05-24-phase-1-structural-recovery.md`.

## Execution sequence

After completing the reading-discipline summary and getting Bean's go-ahead:

| Step | What | Time | Model |
|---|---|---|---|
| 1.1 | Resume context anchor | 20 min | inline |
| 1.2 | Verify stale doc claims still hold (mostly done last session) | 15 min | inline |
| 1.3 | Pre-implementation diagnostic + pattern-table query | 30 min | inline |
| 1.4 | Hidden-decisions peer review | 25 min | parallel (Sonnet + Haiku) |
| 1.5 | **Universal walker** (Spec 16 §15 steps 1-3) + FR1 pattern fast-path | 90-120 min | wp-sgs-developer (sonnet) |
| 1.6 | **G1 closure:** OPEN-block emit for FR1-matched composite blocks | 45-60 min | wp-sgs-developer (sonnet) |
| 1.7 | **G3 closure:** slot_list.py visual-slot extension via property_suffixes | 60-90 min | wp-sgs-developer (sonnet) |
| 1.8 | **G5 closure:** per-block DOM-shape fixes (parallelisable) | 90-120 min | per-block subagents (sonnet) |
| 1.9 | Hooks completion (1.9.A) + role='content' DB sync (1.9.B) | 30-45 min | inline |
| 1.10 | /qc-council Stage 5 verification | 30 min | inline /qc-council |
| 1.11 | Phase 1 close /handoff | 20 min | inline /handoff |

**Total: ~8-12 hrs wall-clock across 2-3 sessions.**

## Phase 1 success criteria

ALL of:

- [ ] **G1 closed.** Hero's CTAs render on live page (Playwright DOM check on sandybrown)
- [ ] **G3 closed.** Hero `stage_3_slot_list` failures < 30 (from 142) per trace.jsonl
- [ ] **G5 closed.** Per-block DOM-shape audit complete; blockquote/3-col-grid/__badge preserved
- [ ] Universal walker (Spec 16 §15 steps 1-3) shipped — `_walker_pre_pass(section_node, css_rules) → ClassGraph` runs once per section before walk(); normal route uses graph for nested-block emission
- [ ] FR1 pattern fast-path branch wired — sections matching `patterns.slug` emit `<!-- wp:pattern {"slug":"sgs/<slug>"} /-->`
- [ ] Stage 11 measured for every body cell (NOT gated to ≤ 1% — measurement-only this phase)
- [ ] Hooks completion: legacy hooks.db count ±2% OR documented intentional exclusion
- [ ] role='content' DB sync: 87 attrs across 40 blocks
- [ ] Every commit passed /qc-council Stage 5 + Bean-approved per Binding A
- [ ] No regression on FR1-matched sections (hero + trust-bar stay at Stage 2 conf 1.0)

## Methodology guardrails (always-on)

1. **blub.db row 254** — leftover-buckets.json BEFORE converter conjecture
2. **blub.db row 255** — /qc-council BEFORE every converter/pipeline/SGS-block commit
3. **blub.db row 256** — per-section cropped pixel-diff via Stage 11 auto-capture
4. **blub.db row 269** — universal extraction primitive only; NO per-section / per-block branches in the WALKER (per-block render.php fixes for G5 are different — they touch block render code, not the walker)
5. **blub.db row 272** — schema enumeration BEFORE "missing X" claims
6. **blub.db row 283** — verify WP API surface via `developer.wordpress.org/reference/functions/<name>/` BEFORE dismissing intelephense warnings
7. **Dispatched agents have NO commit authority** — per `feedback_dispatched_agents_no_commit_authority.md`
8. **Plain English to Bean** — per `~/.claude/rules/adhd-collaboration.md` Rule 17 (Problem → Effect → Solution). Re-ground every major action in 1-sentence plain English before going technical.

## Where to look when something feels off

| Symptom | First read | Then |
|---|---|---|
| Universal walker breaks FR1 fast-path (hero/trust-bar regress) | `pipeline-state/<run>/match.json` per-boundary | Stage 2 conf — if dropped from 1.0, walker change touched Stage 2 incorrectly |
| G1 fix doesn't show CTAs in DOM | Playwright on sandybrown + `pipeline-state/<run>/extract.json` per-section block_markup | Confirm OPEN-block emit + nested wp:sgs/multi-button + wp:sgs/button comments present |
| G3 fix doesn't drop hero failures | `trace.jsonl` per-boundary filter on `stage_3_slot_list` events | Confirm slot_list.py is querying property_suffixes for visual slots — not just text |
| G5 per-block fix breaks pixel-diff elsewhere | `stage-11-pixel-diff.json` per-cell delta | Per-block render.php should ONLY affect that block's emit — if other sections regress, the change leaked into shared code |
| /sgs-clone reports OK but live page didn't update | `pipeline-state/<run>/stage-10.json` exit code | If 4/5/6 → known halt path |
| /qc-council Stage 5 falsifies a fix-shape | The council Stage 5 output | Re-scope the proposal; do NOT dispatch implementer until council = proceed |

## Pre-Phase-1 baseline (compare against post-Phase-1)

From `pipeline-state/mamas-munches-homepage-2026-05-23-145045/`:

| Section | Mean pixel-diff (baseline) |
|---|---|
| ingredients | 31.9% |
| featured-product | 43.7% |
| header | 44.9% |
| hero | 73.3% |
| gift-section | 83.0% |
| brand | 84.0% |
| trust-bar | 84.1% |
| social-proof | 93.4% |
| footer | 96.3% |
| **mean** | **70.5%** |

Phase 1 doesn't gate on these dropping to ≤ 1% — that's downstream (F5 D1 + operator-promotion are deferred). What Phase 1 DOES gate on: every body cell improves vs baseline (no regression > ±5%) + G1+G3+G5 verifications pass.

## First action (after the reading discipline)

Read the docs in Tier 1 in order. Cite line numbers. Summarise each in ≤ 200 words. Restate the 5 framing pitfalls. Wait for Bean's go-ahead. THEN start Step 1.1.
