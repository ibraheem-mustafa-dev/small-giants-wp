---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-pipeline-root-gap-council
generated: 2026-05-19
prior_session: small-giants-wp-2026-05-19-rc-fixes-and-deploy-consolidation
primary_goal: "Run the cloning pipeline end-to-end, capture scores + logs, then dispatch a multi-rater gap-analysis council to find the ROOT gaps in the pipeline that prevent it from consistently hitting ≤ 1% pixel-diff per section regardless of pattern / blocks / nesting / attribute slots."
---

# Pipeline root-gap council — what's blocking consistent ≤ 1% pixel-diff?

You are a senior SGS Framework engineer. Main agent on Opus (Bean's binding rule). Orchestrate haiku/sonnet/opus/gemini-flash/gemini-pro/cerebras subagents via `/delegate`.

## State recap (plain English)

Yesterday's session shipped 15+ commits (`79196c52` → `a9083ca9`) closing 5 universal-extraction RCs, converting all 10 static SGS blocks to dynamic, adding container advanced backgrounds, populating the full Rosetta Stone (1755 equivalent_implementations rows), and wiring /wp-blocks + /wp-hooks + /wp-hook-graph into the cloning pipeline. The /deploy skill was renamed to /wp-sgs-deploy + consolidated with /deploy-check + scored 96%. **Framework code is deployed to palestine-lives.org** (HTTP 200 verified, all 10 dynamic block render.php files present, vendor intact). Page 144 on sandybrown carries clean cv2 output.

But Phase 3 pixel-diff yesterday still showed every section failing above 1% — even after RC-1 through RC-5 + container backgrounds + section-wrapper className guarantee. The framework is structurally sound (cv2 is universal-extraction complete, the Rosetta Stone covers every attribute, no silent drops); the residual gap is somewhere else in the pipeline.

**Today's goal:** find the ROOT gaps — what's preventing the pipeline from consistently hitting ≤ 1% pixel-diff per section regardless of pattern complexity, nesting depth, attribute slot diversity, or block variety. This is investigation, not implementation. The output is a prioritised list of root causes with evidence.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Exploration mode while reading the pipeline traces — surface hypotheses without convergence pressure |
| `/gap-analysis` | Grade the pipeline output + every council finding before synthesis |
| `/lifecycle` | Any skill/agent/pipeline modifications discovered during the audit |
| `/research` | Auto-routes when an unknown surfaces (e.g. why a specific CSS property class doesn't lift) |
| `/strategic-plan` | Plan the implementation order once root gaps are identified — NOT before |
| `/systematic-debugging` | THE primary tool today. For every section above 1% pixel-diff: hypothesis → evidence → root cause → proposed fix linked to end-goal |
| `/sgs-clone` | Pipeline entry — run with `--converter-v2 --deploy-target page:144` to land cv2 output on the canary page |
| `/sgs-wp-engine` | Block-level questions during investigation |
| `/sgs-update` | After any DB-state change |
| `/wp-blocks` | Schema queries (use `dump` subcommand BEFORE any "missing column" claim) |
| `/wp-hooks` | Verify hook names against the 7283-hook DB |
| `/wp-hook-graph` | Hook-collision audit |
| `/wordpress-router` | Routing decisions for non-SGS WP work that surfaces |
| `/qc-inline` | Self-check after each sub-task before committing |
| `/qc` | Multi-rater gap-analysis council on the synthesis (binding rule blub.db row 255) |
| `/wp-sgs-deploy` | Only if framework code changes — otherwise framework is already deployed |
| `/handoff` | At session close |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `mcp__plugin_playwright_playwright__browser_*` | Capture per-section screenshots of mockup vs page 144 at 375/768/1440 — required for the council's evidence |
| `scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped pixel diff (binding rule blub.db row 256 — never full-page) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema manifest BEFORE any "missing column" claim (binding rule #4) |
| `python ~/.claude/hooks/wp-blocks.py validate '<markup>'` | Pre-emit markup validation — wired into cv2 |
| `pipeline-state/<run>/trace.jsonl` + `summary.log` + `errors.log` + `warnings.log` + `chrome-skipped.log` | Stage 9c sidecar logs — primary evidence surface for the audit |
| `pipeline-state/<run>/leftover-buckets.json` | Read BEFORE conjecturing — binding rule blub.db row 254 |
| `attribute_gap_candidates` in sgs-framework.db | Every CSS rule that didn't lift surfaces here — read via `python ~/.claude/hooks/wp-blocks.py dump` or direct SQL |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy investigative + diagnostic work on individual blocks / render.php / template parts |
| `design-reviewer` | Visual quality check + per-section mockup parity scoring |
| `research-pipeline` | When a council finding surfaces an unknown that needs evidence (e.g. "is this a WP-core limitation or a framework gap?") |
| `test-and-explain` | Plain-English explanation of council findings + readout of evidence to Bean |

---

## Task 1 — Pipeline run + scores + logs collection

**What:** Run `/sgs-clone` on Mama's Munches homepage with full instrumentation. Auto-deploy via Stage 10 to page 144. Capture trace.jsonl + summary.log + chrome-skipped.log + leftover-buckets.json + attribute_gap_candidates DB rows. Take per-section cropped pixel-diff at 375 / 768 / 1440 px on every section.

**Why:** The council needs evidence. No claim without trace.

**Estimated time:** 25 min.

**Orchestration:**
- Execution: inline (main thread) — Opus drives
- Command: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --skip-autonomy-gate --skip-register --mode draft --deploy-target page:144`
- After run completes: iterate every section × every viewport via `scripts/pixel-diff.py --selector .sgs-{section} --viewport <WxH>`. Save composite + heatmap + diff.json per cell. Build summary CSV.
- /qc gate after: `/qc-inline` — verify trace.jsonl + summary.log + chrome-skipped.log exist; verify pixel-diff numbers captured

**Acceptance:**
- Fresh pipeline run completes cleanly with `[stage-10] deploy: patched page 144 — ...` in stdout
- Per-section pixel-diff matrix saved at `reports/2026-05-20-pipeline-root-gap-council/pixel-diff-matrix.csv` (7 sections × 3 viewports = 21 measurements)
- trace.jsonl + summary.log + errors.log + warnings.log + chrome-skipped.log captured in the run dir

## Task 2 — Multi-rater gap-analysis council on the pipeline output

**What:** Dispatch a 5-rater gap-analysis council on the pipeline output. Same style as yesterday's /qc multi-rater panel but focused on ROOT CAUSE for pixel-diff residual gap. Each rater gets the same artefact set + asks: "what's preventing this pipeline from hitting ≤ 1% pixel-diff per section consistently, and what would unlock that for ALL future clones — not just this one?"

**Why:** Single-rater synthesis misses angles. Bean's directive: identify root gaps that compound across patterns / blocks / nesting / attribute-slot diversity.

**Estimated time:** 45 min (5 parallel raters × ~10 min each).

**Orchestration:**
- Execution: 5 parallel subagents via `/dispatching-parallel-agents`
- Rater 1: Sonnet — primary, full gap register
- Rater 2: Haiku — fast triangulation
- Rater 3: Gemini Flash — independent angle
- Rater 4: Cerebras — ecosystem patterns (assuming queue not saturated; fallback Gemini Pro)
- Rater 5: Opus inline (the main thread acts as the fifth rater for high-stakes synthesis only)
- Each rater receives: pipeline run dir path, pixel-diff matrix CSV, summary.log + errors.log + warnings.log, leftover-buckets.json, attribute_gap_candidates SQL query results, the 4 binding rules from CLAUDE.md
- Each rater produces a gap register: `{issue, root_cause_class, severity, evidence_file:line, proposed_fix, confidence}`
- Merge across raters; flag findings confirmed by ≥ 2 as `confirmed: true`
- /qc gate after: synthesis must include at least 3 confirmed root gaps with evidence

**Acceptance:**
- Synthesised gap report at `reports/2026-05-20-pipeline-root-gap-council/synthesis.md`
- ≥ 3 confirmed root gaps with evidence file:line + proposed-fix sketches
- Each gap categorised: converter / theme / template-part / block / DB / orchestration / measurement
- Prioritised by `(severity × cross-pattern impact)`

## Task 3 — /systematic-debugging on the top 3 confirmed root gaps

**What:** For each of the top 3 confirmed root gaps from Task 2, run /systematic-debugging: hypothesis → evidence → root cause → minimal repro → proposed fix → explicit link to end-goal (≤ 1% pixel-diff regardless of pattern).

**Why:** /systematic-debugging is the discipline that converts "this looks like a problem" into "this IS the problem, here is the line of code that fixes it". Council finds gaps; this stage proves them.

**Estimated time:** 60 min (3 gaps × ~20 min each).

**Orchestration:**
- Execution: 3 sequential sonnet subagents (one per gap)
- Brief per agent: gap from Task 2 synthesis + all evidence files + the 4 binding rules
- Each agent produces: minimal repro recipe, root-cause file:line, proposed fix (NOT shipped — just the diff sketch), regression risk assessment
- /qc gate after each: `/qc-inline` confirms repro is reproducible

**Acceptance:**
- 3 root-cause writeups at `reports/2026-05-20-pipeline-root-gap-council/root-cause-N.md`
- Each carries: minimal repro, file:line root cause, diff sketch, regression risk
- Branch decision per gap: ship NOW (small surgical fix, low risk) or queue for spec/strategic-plan (large scope, needs phase planning)

## Task 4 — Ship the surgical fixes that came out of Task 3

**What:** Apply the diff sketches from Task 3 that are small + low-risk. Queue larger ones for a /strategic-plan session.

**Why:** Compounding improvement — even one root fix that closes 30 percentage points of pixel-diff across every section is more valuable than 7 per-section CSS tunings.

**Estimated time:** 60-90 min (depends on # of surgical fixes).

**Orchestration:**
- Execution: per-fix, inline OR sonnet subagent depending on complexity
- /qc gate after each: multi-rater /qc panel before commit (binding rule blub.db row 255)
- Re-run pipeline + per-section pixel-diff after each fix to measure delta

**Acceptance:**
- Each surgical fix committed + pushed
- Re-run pipeline shows measurable pixel-diff improvement
- Strategic-plan tasks logged for non-surgical fixes

## Task 5 — Add `/wp-sgs-deploy` cross-reference to `/sgs-wp-engine` skill

**What:** `/sgs-wp-engine` SKILL.md at `~/.claude/skills/sgs-wp-engine/SKILL.md` routes block-development / theme / clone questions but doesn't mention `/wp-sgs-deploy` as the canonical framework-deploy entry. Operators asking sgs-wp-engine "how do I deploy?" today get no route. Add a "Framework deploy" sub-section pointing at the PROJECT-SCOPED skill at `.claude/skills/wp-sgs-deploy/SKILL.md` (note: project-scoped, not user-level).

**Why:** Routing completeness. Closes a discoverability gap operators have hit silently.

**Estimated time:** 5 min.

**Orchestration:**
- Execution: inline (main thread)
- /qc gate after: `/qc-inline` — read the updated sgs-wp-engine SKILL.md + confirm the deploy route is present + that it explicitly names the project-scoped path

**Acceptance:** `~/.claude/skills/sgs-wp-engine/SKILL.md` has a "Framework deploy" sub-section referencing `/wp-sgs-deploy` with the path note (`.claude/skills/wp-sgs-deploy/SKILL.md` — project-scoped, applies in small-giants-wp working directory).

## Task 6 — Add framework-deploy routing branch to `/wordpress-router` skill

**What:** `/wordpress-router` SKILL.md at `~/.claude/skills/wordpress-router/SKILL.md` has a domain-classification table for WP questions. Currently no branch routes framework-deploy keywords to `/wp-sgs-deploy`. Add a row mapping `push to palestine-lives` / `deploy sgs-blocks` / `deploy sgs-theme` / `framework deploy` → `/wp-sgs-deploy`. Mention the project-scope (skill lives in `.claude/skills/`, only applies when CC is in small-giants-wp working directory).

**Why:** Same as Task 5 — routing completeness from the WP-domain side.

**Estimated time:** 5 min.

**Orchestration:**
- Execution: inline (main thread); parallel with Task 5
- /qc gate after: `/qc-inline` — verify the routing table has the new row + confirm a sample query routes to `/wp-sgs-deploy` not `/deploy-check` or `/vps-deploy`

**Acceptance:** wordpress-router SKILL.md routing table has the framework-deploy branch with `/wp-sgs-deploy` as the target.

## Dependency graph

```
Task 1 — Pipeline run + capture (inline, Opus, ~25 min)
  ↓
Task 2 — 5-rater council (4 parallel subagents + Opus inline, ~45 min)
  ↓ synthesis
Task 3 — /systematic-debugging on top 3 gaps (3 sequential sonnet, ~60 min)
  ↓ root-cause writeups + diff sketches
Task 4 — Ship surgical fixes (inline + sonnet per fix, ~60-90 min)
  ↓ each /qc gated + re-run pipeline
Tasks 5 + 6 — Skill SKILL.md updates (inline, parallel, ~5 min each)
  • /sgs-wp-engine: add /wp-sgs-deploy framework-deploy sub-section
  • /wordpress-router: add framework-deploy routing branch
  ↓
Final — commit + push + /handoff
```

## Methodology guardrails (binding — do not skip)

- **Schema enumeration BEFORE gap claims** — `python ~/.claude/hooks/wp-blocks.py dump` first (binding rule #4, blub.db row 272)
- **Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing** (blub.db row 254)
- **Multi-rater /qc panel BEFORE every commit** touching converter / pipeline / block logic (blub.db row 255)
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db row 256)
- **/qc-inline against live pipeline** not just isolated units — placement bugs survive isolated QC (blub.db row 273)
- **Header/footer are TEMPLATE PARTS, not blocks** (blub.db row 274) — if any council finding suggests an sgs/header or sgs/footer block, reject and route to Spec 17 §S1-2
- **tar --exclude must be path-anchored** (`plugins/sgs-blocks/src` not `src`) — blub.db row 275
- **Outcome vs completion** — fix shipped ≠ pixel-diff closed. Re-measure after every fix.
- **No `git stash` / reset / checkout-- / restore / clean** in subagents
- **No `Co-Authored-By:` lines** in commits
- **Verify Gemini agent claims by grep** before relaying — fabrications have been caught in prior Gemini panels

## Acceptance criteria (whole session)

- Task 1: pipeline run + 21-cell pixel-diff matrix + 5 log artefacts captured
- Task 2: synthesis at `reports/2026-05-20-pipeline-root-gap-council/synthesis.md` with ≥ 3 confirmed root gaps
- Task 3: ≥ 3 root-cause writeups with minimal repros + diff sketches
- Task 4: surgical fixes shipped + measurable pixel-diff improvement on re-run
- /handoff at close

## Key files to read at session start

- `.claude/handoff.md` — yesterday's full session digest
- `.claude/state.md` — current phase + blockers
- `.claude/cloning-pipeline-flow.md` §"Data Sources & Block-Equivalent Layers" — the consolidated DB + draft-naming reference
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — full pipeline spec
- `.claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md` — Stage 9c contract
- `.claude/CLAUDE.md` binding rules #1-4
- `reports/2026-05-19-phase-3-pixel-diff/summary.csv` — yesterday's pixel-diff baseline (every section failed >24%)
- `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — captured lessons index (rows 254-275)
