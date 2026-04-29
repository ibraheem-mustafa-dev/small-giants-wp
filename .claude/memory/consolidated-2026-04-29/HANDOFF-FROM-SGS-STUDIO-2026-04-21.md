# Handoff from small-giants-studio session → small-giants-wp (2026-04-21)

**Source:** `c--Users-Bean-Projects-small-giants-studio` 2026-04-20→21 session
**Destination:** this project, Phase 1 tooling audit Stage 1d onwards
**Master spec:** `docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md` (12 sections, freshly updated Section 5+6 with 18-cell matrix regrades)

---

## Session Start

Read in this order:
1. This file (handoff scope + new work)
2. `docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md` (full spec — Sections 3, 5, 6, 7 are the action sections)
3. `CONVERSATION-HANDOFF.md` + existing `NEXT-SESSION-PROMPT.md` (pre-existing Phase 1 Stage 1a context — compatible, not superseded)

Invoke `/autopilot` before any response. Then tackle the work below in order.

---

## What already shipped in the sgs-studio session (don't redo)

1. **Master spec** at `docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md` — 12 sections, 13 pipelines designed, verified hierarchy, 4-reviewer-panel reconciliation for build-website.
2. **6 gap-analysis evals** posted to blub.db (knowledge rows 11296–11301) + `evaluation-history.json` (58 total). JSONs at `C:/Users/Bean/.openclaw/workspace/memory/research/gap-analysis/2026-04-20-154111/`.
3. **Captured lesson 151** (blub.db): *gap-analysis on script-wrapping skills must READ the scripts, not just SKILL.md*. Applied on all future grading.
4. **Section 6 reviewer reconciliation (Sonnet + Flash + Cerebras + GPro thinking trace)** — reconciled score matrix + 7-item remediation priority + 18-cell matrix regrade (10/18 cells, not 12).
5. **Section 5 sgs-extraction 18-cell regrade** — 7/18 full today, target 12/18 post-remediation.

---

## Incoming work (5 tasks — Task 1–5 bundle)

### Task 1 — Dual-mode `/skill-optimiser` + `/pipeline-optimiser` (graders)

Today both skills run in **POST-USE performance mode** (score goal-achievement, process-adherence, output-consistency, tool-utilisation, efficiency after a real run with `dispatch_log` data). Add **DESIGN mode** (pre-hoc rubric grading) for skill/pipeline edits with no run data yet:

- 18-cell matrix coverage (block/container/page × static/animation/interactivity/device-responsive/content+tone/flow+UX)
- 3 output paths (/uimax ingest / SGS theme deploy / app delivery)
- 5 end-goals effectiveness (per master spec Section 3 items 3–7)
- 6-lens system effect (end-result / oc-cc / blub.db / automation / ADHD / motivation)
- Categorical floors (dead refs → 2.0, per captured lesson 151)

**Auto-select mode** on invocation: if `dispatch_log` rows exist for target → POST-USE mode, else → DESIGN mode.
**Optimisers become canonical** for their target types — `/gap-analysis` removes skill + pipeline.

Run via `/lifecycle` pipeline. Skillscore BEFORE any grading per correction ledger.

### Task 2 — Slim `/gap-analysis`

Remove `skill` + `pipeline` target types (migrated to Task 1 optimisers). Keep `website` / `design` / `research` / `plan` / `custom`.

**Validator fixes (critical — the recurring arithmetic bug across 4 of 5 evals last session):**
- Enforce 6 lenses, not 5 (motivation_meaning mandatory — unanimous FAIL on build-website panel)
- Block `grade_cap_applied: null` when any lens verdict = `fail`
- HARD GATE: script-reading required per captured lesson 151 — validator fails if `research_rounds[].queries_internal` missing script inspection for script-wrapping skills

### Task 3 — `/lifecycle` cascade update

Current flow: skill edit → `skillscore` → `gap-analysis` marker → PreToolUse block until `/gap-analysis` runs.
**New flow:** skill edit → `skillscore` → **`skill-optimiser` design-mode** → PreToolUse block until `/skill-optimiser` runs (was gap-analysis).

Update `/lifecycle` SKILL.md + forced hook chain marker file naming (`~/.claude/.pending-skill-optimiser-{session_id}.json`). Pipeline equivalent for pipeline edits.

### Task 4 — NEW `/qc` skill (delegated review panel)

Writes staged brief in project sandbox. Dispatches reviewer fan-out with model-routing table:

| Model | Strength | Cap | When to route |
|---|---|---|---|
| Sonnet 4.6 | Deep reasoning, reliable JSON, best default | ~ | Default reviewer × 2–3 |
| Cerebras qwen-3-235b | Fast, intelligent, structured output | **16K output + 12-round cap** — chunk-loop big briefs | Structured sub-jobs OR chunk-looped large reviews |
| Gemini Flash | 1M context breadth scan, sandbox-aware | Brittle on deep reasoning | Breadth triangulation |
| Gemini Pro 3.1 | 1M context deep, flagship reasoning | **503s frequent — retry ladder required** | Retry with exponential backoff OR hand off to `/gemini-pro` skill which handles retries |
| Opus 4.7 | Flagship tiebreaker | $ | Reviewer-consensus divergence >1.0 OR S-grade candidate deep-dive |

**Cerebras chunk-loop pattern** embedded in skill: split brief into <15K chunks, dispatch sequentially, merge JSON outputs. Validate each chunk's reviewer_id/scores/verdicts before merge.
**Sandbox brief location**: `./.review-brief-{target-slug}.md` in project root (already gitignored per Task 5c).

### Task 5 — NEW `/qc-inline` mirror skill

Main-thread QC (not fan-out). Optional opt-in fan-out to **non-producer reviewers only** — prevents self-review bias (favourable, not mandatory). Invoke when reviewer panel ceremony isn't needed but a quality checkpoint is.

### Task 4-bundle (the three low-effort fixes)

Rolled in from sgs-studio Task 4 because each requires `/lifecycle` pipeline and they batch cleanly alongside Tasks 1–5:

**4a. Autopilot domain-table patch** — 4 invisible skills missing from Domain Classification. Add rows after the `telegram-history` row, before the SSB/automation-engine/prayer-app rows:

```
| browser automation, screenshot, visual test, multi-viewport, axe-core, Playwright CLI | `playwright` | "screenshot this page at 3 breakpoints", "visual regression check" |
| animation capture, motion extract, harvest animations, scroll animation, reference site motion | `animation-harvest` | "grab the animations from this site", "extract motion from gallery" |
| design gallery, find reference sites, mood board, discover sites like, inspiration, industry match | `sgs-discover` | "find me sites like X", "show me 3 references for a dentist site" |
| capture HTML, extract DOM, scrape page structure, dembrandt tokens, full-page capture, a11y baseline | `sgs-extraction` | "capture everything about this URL", "extract raw HTML+tokens+a11y" |
```

Also update `C:/Users/Bean/.claude/skills/autopilot/SKILL.md` (dual-maintain — both copies identical today).

**4b. `/sgs-extraction` 4 factual error remediation** — per master spec Section 5 Role A gaps:
- Dead `/site-clone` reference (if present — audit frontmatter)
- Stale "Opportunity Skills" section (sgs-discover + validate-pipeline-artifact.py both live — not "to be built")
- Output filename divergence: docs say `design-tokens.json`, scripts write `dembrandt-tokens.json` — one is lying (read both scripts + doc, align)
- Vision pass HARD GATE: either wire Gemini API directly OR document manual step explicitly — currently ambiguous

**4c. Merge `/frontend-design` → `/innovative-design/references/`** — recon confirmed `/frontend-design` only used as shared aesthetic reference. Move content into `/innovative-design/references/frontend-design.md`, then retire `/frontend-design` SKILL.md (mark user-invocable: false → delete after one session of verified non-invocation).

---

## Task 6 — Regrade sgs-extraction + build-website using the NEW `/skill-optimiser` design-mode

After Task 1 ships, regrade both skills against the 18-cell matrix + 3-paths + 5-goals + 6-lens rubric. Sonnet's original evals used the old 5-criterion rubric; master spec Sections 5+6 already reflect 18-cell regrade but need the optimiser to formalise JSON output for blub.db.

---

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST — every message, always on |
| `/lifecycle` | MANDATORY — every skill edit (Tasks 1–5 + 4a/b/c all gated) |
| `/skillscore` | BEFORE rubric grading on every regrade (correction ledger) |
| `/brainstorming` | Architectural decisions on dual-mode auto-select + validator HARD GATE |
| `/strategic-plan` | Sequence Tasks 1–5 — some depend on each other (Task 3 needs Task 1 done) |
| `/research-check` (quick) + `/research-buddies` (depth) | Validate fal.ai LTX-Video pricing, Playwright stealth 2026, Cerebras 16K output cap behaviour under v2 |
| `/gemini-pro` skill | Handles 503 retries for Gemini Pro dispatches (Task 4 reviewer routing) |
| `/delegate` | Before every Agent dispatch — pick model per shared routing table |
| `/diagnostics` | Before every commit |
| `/handoff` | End-of-session continuity |

## MCP servers & tools

| Tool | Use |
|---|---|
| `mcp__ide__getDiagnostics` | Pre-commit Problems-panel check |
| SQLite direct: `C:/Users/Bean/.openclaw/workspace/tools/blub-dashboard-v2/data/blub.db` | Correction + knowledge queries (dashboard API was flaky last session) |
| `python ~/.claude/hooks/search.py "query"` | Unified web research |
| `playwright` MCP | Verify any UI-observable claims during skill-edit verification |

## Agents to delegate to

| Agent | When |
|---|---|
| `wp-sgs-developer` | ALL SGS WordPress edits (CLAUDE.md mandate) |
| `research-pipeline` | Validate master-spec unverified claims (fal.ai, Mobbin API, Playwright stealth 2026) |
| `site-reviewer` | If any deployed-site verification needed during Task 4b script audits |

## Research approach

Before Task 1 & 4 dispatch:
1. `/research-check` — Cerebras qwen-3-235b 16K output limit + 12-round cap behaviour in 2026 (confirm or refute)
2. `/research-check` — Gemini Pro 3.1 503 rate for long-context single-shot dispatches; retry backoff best practice 2026
3. `/search` — "skill auto-mode detection dispatch-log versus first-run" — is there precedent for the DESIGN-mode / POST-USE-mode auto-select pattern?

---

## Guardrails

- **`/skillscore` BEFORE any rubric grading** on every regrade — non-negotiable per correction ledger
- Every skill edit triggers the forced hook chain — no direct SKILL.md edits; `/lifecycle` pipeline or bust
- Captured lesson 151 HARD GATE: for script-wrapping skills, validator fails if scripts weren't read during grading
- Never run `/build-website` against a production client site in testing
- blub.db dashboard API (localhost:5050) may be down — write directly to SQLite at path above if API fails
- Forced hook chain marker file naming will change during Task 3 — `/lifecycle` itself is being edited, bootstrap carefully (edit `/lifecycle` SKILL.md inside its own pipeline; the hook will complain first pass)
- Task 2 (slim gap-analysis) must complete BEFORE Task 1's optimiser DESIGN-mode goes canonical, else two graders run in parallel with duplicate logic

---

## Dependencies between tasks

```
Task 1 (dual-mode optimisers) ──┐
                                ├─→ Task 3 (/lifecycle cascade)
Task 2 (slim /gap-analysis) ────┘        ↓
                                 Task 6 (regrade sgs-extraction + build-website)
Task 4 (/qc) ──┐
               ├─→ (independent, run anytime after Task 1)
Task 5 (/qc-inline) ──┘

Task 4a/b/c (low-effort fixes) — independent, run anytime
```

Recommended execution order: 4a (smallest, validates pipeline) → 2 → 1 → 3 → 6 → 4b → 4c → 4 → 5.

---

## Files that will be touched

| File | Operation |
|---|---|
| `C:/Users/Bean/.agents/skills/skill-optimiser/SKILL.md` | edit — add DESIGN mode |
| `C:/Users/Bean/.agents/skills/pipeline-optimiser/SKILL.md` | edit — add DESIGN mode |
| `C:/Users/Bean/.agents/skills/gap-analysis/SKILL.md` | edit — slim + validator fixes |
| `C:/Users/Bean/.agents/skills/gap-analysis/scripts/validator.py` (or similar) | edit — 6-lens + script-reading HARD GATE |
| `C:/Users/Bean/.agents/skills/lifecycle/SKILL.md` + hooks | edit — cascade update |
| `C:/Users/Bean/.agents/skills/qc/SKILL.md` | NEW |
| `C:/Users/Bean/.agents/skills/qc-inline/SKILL.md` | NEW |
| `C:/Users/Bean/.agents/skills/autopilot/SKILL.md` + `.claude/skills/autopilot/SKILL.md` | edit — 4 rows domain table |
| `C:/Users/Bean/.agents/skills/sgs-extraction/SKILL.md` + scripts | edit — 4 factual errors |
| `C:/Users/Bean/.agents/skills/frontend-design/*` → `innovative-design/references/frontend-design.md` | merge + retire |

Every edit goes through `/lifecycle`. No exceptions.

---

## Exit criterion for this incoming work

- [ ] All 5 new/edited skills pass `/skillscore`
- [ ] All 5 pass `/skill-optimiser` design-mode (once Task 1 ships)
- [ ] 4-row autopilot patch landed in both copies
- [ ] 4 sgs-extraction factual errors resolved (docs + scripts in agreement)
- [ ] `/frontend-design` absorbed into `/innovative-design/references/`
- [ ] Master spec Section 6+7 updated to reflect all remediations applied
- [ ] blub.db has 2 regraded sgs-extraction + build-website rows under new rubric
- [ ] Correction ledger POSTs for any new lessons captured
- [ ] Handoff written for what happens next (either Phase 1 Stage 1e `/project-consolidate` OR Phase 2 implementation)
