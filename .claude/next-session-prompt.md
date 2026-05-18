---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-cloning-pipeline-pixel-parity
generated: 2026-05-20
prior_session: small-giants-wp-2026-05-20-phase-2a-massive
primary_goal: "/sgs-clone reaches <1% pixel parity consistently, no targeted cheats, 1 section at a time"
---

# Cloning pipeline pixel-parity push — orchestration plan

You are a senior SGS Framework engineer specialising in the cloning pipeline (Spec 16 slot-aware DOM walker + recogniser). Main agent is Opus (per Bean's binding rule). You orchestrate Sonnet + Haiku + Gemini Flash + Gemini Pro + Cerebras as needed via `/delegate`. Prior session (2026-05-20) shipped Phase 2A on main at `e8d3fa53`.

## Primary goal (do not lose sight of this)

Reach **under 1% pixel parity via `/sgs-clone` consistently, no targeted cheats, working 1 class section at a time.**

- **<1% pixel parity** measured per-section via `scripts/pixel-diff.py --selector .sgs-{section}` at 375/768/1440 viewports.
- **Consistently** = the same pipeline run produces <1% across every section, not "we hit it once on brand".
- **No targeted cheats** = no section-specific dict entries, no client-slug hardcoding, no mockup-class-specific branches in convert.py / recogniser. Every fix must generalise.
- **1 section at a time** = open a leftover-bucket entry, find root cause, fix root cause, re-measure that section, close at <1%, move to next.

## State recap

Phase 2A landed all framework block work — new SGS-BEM selectors (`.sgs-responsive-logo`, `.sgs-icon`, `.sgs-timeline`, `body.sgs-header-behaviour-*`) now exist as valid recogniser targets. `sgs-framework.db` has NOT been re-synced since Phase 2A; recogniser will fail to match the new blocks until Task 1 runs.

Pixel-parity foundation work was captured in `.claude/parking.md` on 2026-05-19 but swallowed by Phase 2A before landing. Six entries (P-COVERAGE-METRIC-CORE-STYLE, P-COVERAGE-SCOPE-FILTER, P-PARENT-QUALIFIED-TAG-LIFT, P-TAG-SELECTOR-LIFT, P-CORE-STYLE-MAP-DB-MIGRATION, P-PHASE9-REDEPLOY-BASELINE) are now the critical path.

Binding rules in force:
- Read `pipeline-state/<latest-run>/leftover-buckets.json` BEFORE conjecturing about pipeline issues (blub.db row 254).
- Multi-rater `/qc` panel BEFORE every commit touching converter / pipeline / SGS block logic (blub.db row 255).
- Per-section cropped pixel-diff (NOT full-page) (blub.db row 256).
- `--converter-v2` required on production orchestrator runs.
- `WP_DEBUG_DISPLAY=false` on staging.
- No new hardcoded dicts — DB-first (blub.db row 260).
- No `git stash` / destructive verbs in subagents.

Read CLAUDE.md, `.claude/handoff.md`, `.claude/cloning-pipeline-flow.md`, and `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` for full context before starting.

---

## Phase 0 — Preparatory (Opus inline, ~30 min)

### Task 0.1 — /sgs-update sync

**What:** Run `/sgs-update` to scan codebase + regenerate `sgs-framework.db` + `02-SGS-BLOCKS-REFERENCE.md` + mirror to uimax `component-libraries.csv`.

**Why:** DB stale by 11+ commits. Recogniser reads from this DB. New Phase 2A blocks (responsive-logo, icon multi-source, timeline) + retired sgs/icon-block + new pricing-table attrs must be reflected before any pipeline run.

**Orchestration:** inline Opus. ~10 min. No QC gate (mechanical).

**Acceptance:** DB shows 74 blocks (was 71 pre-Phase-2A); pricing-table has new iconName/ribbonText/savingsBadgeText attrs.

### Task 0.2 — Leftover-buckets audit

**What:** Find most recent `pipeline-state/<run>/leftover-buckets.json`. If older than 2026-05-17 (pre-Phase 2A), run fresh `/sgs-clone --converter-v2` against Mama's homepage post 131 to generate current state. Walk the buckets and produce a short summary: which sections fail, which bucket each belongs to (extraction_failed / generation_failed / etc.), top 3 highest-impact root-cause classes.

**Why:** Binding rule blub.db row 254. Without current evidence, every Phase 1+ task is guessing.

**Orchestration:** inline Opus. ~15-75 min depending on whether a pipeline run is needed.

**Acceptance:** Written summary at `reports/2026-05-21-pixel-parity-bucket-audit.md` ranking sections by gap count + naming the top 3 root-cause classes.

### Task 0.3 — Recogniser update for Phase 2A selectors (delegated, parallel-safe)

**What:** Extend `tools/recogniser/` matcher table to map new SGS-BEM selectors (`.sgs-responsive-logo*`, `.sgs-icon*`, `.sgs-timeline*`) to their blocks with attribute-fill logic. Plus `body.sgs-header-behaviour-*` writes a rule on `sgs_header_rules` option.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch: single-agent
- Parallel with: Phase 1 anti-cheat-script tasks (file-disjoint)
- /qc gate after: /qc-inline self-check before commit (preparatory work, not converter-touching)

**Acceptance:** Unit test demonstrates each new selector family resolves to its SGS block with attributes populated.

---

## Phase 1 — Anti-cheat + correctness infrastructure (parallel dispatch, ~60 min wall)

**Why this comes BEFORE coverage-metric fixes:** without automated cheat-detection running in the QC loop, the iterative pixel-parity push will drift toward section-specific patches. Bean's "no targeted cheats" rule needs enforcement, not just intent.

### Task 1.1 — Build `scripts/qc-anti-cheat.py` (Sonnet subagent)

**What:** Build a Python script that scans a converter / recogniser / pipeline-code diff and FAILS hard if it detects:
- Literal client slugs (`mamas-munches`, `indus-foods`, `helping-doctors`, etc. as code-side strings outside test fixtures)
- Literal section names (`brand`, `hero`, `ingredients`, `gift-section` etc. as if-statement keys or dict-lookup keys in convert.py / recogniser)
- Hardcoded mockup attribute values (specific font-sizes, colours, widths) baked into converter rules
- New dict / lookup keyed on section-specific strings (per DB-first rule — check sgs-framework.db tables instead)
- Section-specific branches: `if section_name == "brand":` or `if "sgs-brand" in selector:`

**Inputs:** git diff range (default `HEAD~1..HEAD` or branch tip vs main). Output: JSON report with `verdict: pass | fail`, `findings: []`, exit-code 1 on fail.

**Allowlist mechanism:** known-good patterns (test fixtures path, allowlist file referenced by header comment) can opt out — but the script defaults to fail-closed.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch: single-agent
- Brief: "Build static-analysis Python script that scans a git diff for converter-cheating patterns. AST-walk Python changes; regex-scan converter input data; check that no new dict is keyed on a client-slug or section-name. Return pass/fail JSON + non-zero exit on fail."
- Context: file paths in `tools/recogniser/` + `tools/converter/`, the binding rules above.
- Parallel with: 1.2 + 1.3 (file-disjoint)
- /qc gate after: /qc-inline + dogfooding (run the script on its own diff and on prior Phase 2A diffs to calibrate false-positive rate)

**Acceptance:** Script runs on `git diff HEAD~3..HEAD` (Phase 2A merges) and reports `pass` (no targeted cheats in Phase 2A) AND on a synthetic cheating diff and reports `fail` with specific findings.

### Task 1.2 — Build `scripts/qc-correctness-regression.py` (Cerebras subagent)

**What:** Build a script that runs the converter against N reference mockups (Mama's Munches post 131 + Indus Foods baseline + 1-2 others) and asserts output stability. Compares converter output JSON (extract.json) against committed baselines. Any drift is flagged.

**Cerebras-shape:** mechanical run of pre-existing converter + JSON diff. No reasoning needed. Cerebras is zero-cost + fast.

**Orchestration:**
- Execution: delegated, cerebras via `/delegate`
- Dispatch: single-agent (Cerebras 2-parallel cap means only 1 Cerebras task at a time in this phase)
- Brief: "Build script that runs `/sgs-clone --converter-v2 --dry-run` (extraction only, no deploy) against 3-4 reference mockups in `reports/baselines/`. Compare each extract.json against committed baseline. Report per-mockup pass/fail + diff stats."
- Context: baseline location, mockup IDs, the `--dry-run` flag must skip browser screenshot phase.
- Parallel with: 1.1 + 1.3 (file-disjoint)
- /qc gate after: /qc-inline + dogfood on Phase 2A's actual converter output

**Acceptance:** Script committed at `scripts/qc-correctness-regression.py`. Running it after Phase 0 returns `pass` for all 3-4 reference mockups (baseline established).

### Task 1.3 — Build `scripts/qc-coverage-honesty.py` (Haiku subagent)

**What:** Cheap mechanical checker that asserts the coverage% metric is reading meaningful signal. After P-COVERAGE-METRIC-CORE-STYLE + P-COVERAGE-SCOPE-FILTER ship (Phase 2), this script verifies the metric improved on the same input — i.e. that the fix actually made measurement honest, not just shifted the goalpost.

**Orchestration:**
- Execution: delegated, haiku via `/delegate`
- Dispatch: single-agent
- Brief: "Build script that runs `scripts/pixel-diff.py compute_attribute_coverage` against a fixed reference (Mama's brand section pre-Phase-2 commit) twice — once with old logic, once after coverage fixes land. Assert the post-fix coverage% is higher AND the rule denominators match expected counts."
- Parallel with: 1.1 + 1.2 (file-disjoint)
- /qc gate after: /qc-inline

**Acceptance:** Script runs and reports baseline coverage%. After Phase 2 lands, re-running shows the improvement.

### Phase 1 wave: parallel dispatch shape

```
Task 1.1 (Sonnet, anti-cheat) ──┐
Task 1.2 (Cerebras, regression)─┼── all parallel, file-disjoint
Task 1.3 (Haiku, honesty check)─┘
                                 ↓
                          /qc multi-rater on all 3 diffs together
                                 ↓
                          /qc-inline integration check
                                 ↓
                          Commit + merge to main
```

Wall clock: ~60 min (longest branch).

---

## Phase 2 — Coverage-metric honesty (parallel, ~60 min wall)

### Task 2.1 — P-COVERAGE-METRIC-CORE-STYLE (Haiku subagent)

Extend `scripts/pixel-diff.py compute_attribute_coverage` to walk nested `*.style` dicts and match each leaf path tail (e.g. `style.color.text` covers `color` rules). Reuse existing core-block style map (which moves to DB in Task 3.3).

Orchestration: Haiku, mechanical retrofit, single-agent. /qc-inline after. ~30 min.

### Task 2.2 — P-COVERAGE-SCOPE-FILTER (Haiku subagent, parallel with 2.1)

Add `selector_scope` field (`universal | tag_generic | block_scoped`) to expected-rules baseline rows. Coverage% reports `block_scoped` only; other scopes surface as separate non-counted lines.

Orchestration: Haiku, single-agent. /qc-inline after. ~30 min.

**Phase 2 closure:** run `scripts/qc-coverage-honesty.py` (built in Task 1.3) to verify coverage% improved on the reference. Multi-rater /qc panel before commit (binding rule blub.db row 255 — these touch pipeline logic).

---

## Phase 3 — Lift gaps (sequential per dependency, ~3 hr)

### Task 3.1 — P-PARENT-QUALIFIED-TAG-LIFT (Sonnet subagent)

Modify `_collect_css_decls_for_element` to return matched selectors alongside declarations. Filter in `_lift_core_block_style` to allow parent-qualified tag selectors (selector chain contains an `sgs-*` class anywhere) while blocking bare tag selectors.

Orchestration: Sonnet, architectural-touch single-agent, ~45-60 min. /qc multi-rater panel before commit (converter logic, binding rule).

### Task 3.2 — P-TAG-SELECTOR-LIFT (Sonnet subagent, depends on 3.1)

Second pass in `_lift_core_block_style` matching tag-only selectors against node's tag + ancestor chain (3-level limit). Reuses 3.1's selector-aware infrastructure.

Orchestration: Sonnet, single-agent, ~30-45 min. /qc multi-rater before commit.

### Task 3.3 — P-CORE-STYLE-MAP-DB-MIGRATION (Sonnet subagent)

Migrate the 26-entry `_CORE_BLOCK_STYLE_MAP` from `convert.py` to a new `core_block_style_paths` table in `sgs-framework.db` (CSV-seeded, idempotent migration). New `db_lookup.core_block_style_path_for(css_prop)` returning `(path, kind, image_only)`. Module-level dict replaced with lazy DB call (`lru_cache`).

Orchestration: Sonnet, architectural-touch single-agent, ~1.5 hr. /qc multi-rater before commit. Can run in parallel with 3.1+3.2 — different files.

**Phase 3 closure:** run `scripts/qc-anti-cheat.py` (built in Task 1.1) on the combined diff. Hard-fail blocks the commit. Multi-rater council /qc on the combined diff.

---

## Phase 4 — Baseline refresh (Opus inline, ~20 min)

### Task 4.1 — P-PHASE9-REDEPLOY-BASELINE

Re-run `/sgs-clone --converter-v2` against Mama's homepage post 131 with post-Phase-3 converter. Take fresh extract.json, update WP post 65 via REST or wp-admin, capture new pixel-diff baseline screenshots at 375/768/1440.

Orchestration: inline Opus (single coordinated sequence). /qc-inline before declaring baseline. Sandybrown credentials at `.claude/secrets/credentials.yml`.

**Phase 4 closure:** baseline established. Iterative loop unblocked.

---

## Phase 5 — Iterative pixel-parity loop, 1 section at a time (Opus inline + multi-model raters, ongoing)

Per section, repeat this loop until pixel-diff <1% at 375/768/1440:

### Per-section loop

1. **Read leftover-bucket entry** for that section (binding rule — evidence first).
2. **Root-cause diagnosis** — this is where the multi-model council adds value:
   - **Opus (main)** — architectural reasoning. The pivot question: is this a converter bug, a block-CSS gap, a mockup-convention drift, or an intentional design choice that needs codifying?
   - **Gemini Pro via `/gemini-pro`** — deep reasoning on tricky cross-system issues (e.g. "why does this CSS rule's specificity battle outcome depend on which order @media blocks are emitted?"). Sparingly — used when Opus alone is stuck.
   - **Gemini Flash via `/gemini-flash`** — bulk-context read of all related files (1M context window). Good for "summarise every code path that touches this CSS property across convert.py + recogniser + pipeline".
3. **Fix root cause** — Opus inline edits OR Sonnet subagent if mechanical.
4. **Pre-commit gate: anti-cheat + correctness scripts**
   - `python scripts/qc-anti-cheat.py` — hard-fail blocks commit
   - `python scripts/qc-correctness-regression.py` — assert no drift on other clients
5. **Multi-model /qc council** (parallel, ~5-10 min wall):
   - **Sonnet** rater — "is the fix architecturally sound?"
   - **Haiku** rater — "did anything mechanical regress?"
   - **Gemini Flash** rater — "scan the entire diff in 1M context; flag any pattern I'd miss"
   - **Cerebras** rater — "lint / grep / static-scan; flag forbidden patterns"
   - Dispatched via `/dispatching-parallel-agents` (proper skill for this 4-branch fan-out)
6. **/qc-inline** — main agent (Opus) reads the 4 ratings, synthesises, makes go/no-go call.
7. **Re-measure** — `scripts/pixel-diff.py --selector .sgs-{section}` at 375/768/1440. Section closes at <1%.
8. **Commit + merge to main** (per session-close commit pattern).
9. **Move to next section** — top of remaining-bucket queue.

### Model routing for this loop

| Need | Model | When |
|------|-------|------|
| Architectural reasoning, root-cause diagnosis | Opus (main agent inline) | Every iteration |
| Deep cross-system reasoning when stuck | Gemini Pro via /gemini-pro | Sparingly, ~1 per session |
| Bulk-context summarisation across many files | Gemini Flash via /gemini-flash | When a fix touches >3 files or needs holistic read |
| Mechanical retrofit, single-file edits | Sonnet subagent | ~50% of iterations |
| Plumbing, formulaic changes | Haiku subagent | ~20% of iterations |
| Static analysis, grep, lint passes | Cerebras subagent | Pre-commit gate, every iteration |
| /qc multi-rater (4 in parallel) | Sonnet + Haiku + Gemini Flash + Cerebras | Every commit |

Cerebras parallel cap: 2 at a time. The QC council uses 1 Cerebras (lint pass) + 1 Sonnet + 1 Haiku + 1 Gemini Flash — fits within caps. If pre-commit anti-cheat script ALSO wants Cerebras, run that first (or fall through to Haiku per `/delegate` chain).

### Section ordering

Use the leftover-bucket audit (Task 0.2) ranking. Default order:
1. Section with most attrs in `extraction_failed` bucket (highest converter-bug ROI)
2. Section with most attrs in `generation_failed` bucket (block-CSS gap ROI)
3. Sections with no buckets but high pixel-diff% (mockup-convention drift)

Don't go in mockup-order or alphabetical order — go in evidence-impact order.

---

## Phase 6 — Orthogonal side tasks (parallel, low priority — pick up only if main loop is blocked)

### Task 6.1 — CLI behaviour-flag plumbing (Haiku, ~20 min)

Extend `Sgs_Header_Rules::add_rule()` to accept `behaviour` key from input JSON. Validates against `Sgs_Header_Behaviours::VALID_BEHAVIOURS`. Add `--behaviour=<slug>` examples to CLI help + PHPUnit test.

Orchestration: Haiku, single-agent, file-disjoint with all pixel-parity work. /qc-inline after. Run whenever main loop has a wait state (e.g. a pipeline run in progress).

### Task 6.2 — Stub-pattern decision + execution (Opus inline, ~15 min)

Read `reports/2026-05-20-framework-header-stub-audit.md`. Surface Bean for decision: delete 3 stubs OR keep as inserter starter packs. Execute. Log Decision 10 in `.claude/decisions.md`.

Orchestration: inline Opus, no /qc gate, post-decision /qc-inline if executed. File-disjoint with pixel-parity work.

---

## Dependency graph

```
Phase 0 — Preparatory (~30 min)
├── Task 0.1 /sgs-update (inline Opus)
├── Task 0.2 leftover-buckets audit (inline Opus)
└── Task 0.3 recogniser update (Sonnet, parallel-safe with Phase 1)
       ↓
Phase 1 — Anti-cheat + correctness scripts (~60 min wall, parallel)
├── Task 1.1 qc-anti-cheat.py (Sonnet)        ─┐
├── Task 1.2 qc-correctness-regression.py (Cerebras) ─┤── parallel
└── Task 1.3 qc-coverage-honesty.py (Haiku)   ─┘
       ↓ multi-rater /qc + commit
Phase 2 — Coverage honesty (~60 min wall, parallel)
├── Task 2.1 P-COVERAGE-METRIC-CORE-STYLE (Haiku) ─┐── parallel
└── Task 2.2 P-COVERAGE-SCOPE-FILTER (Haiku)      ─┘
       ↓ multi-rater /qc (binding rule — converter touch) + commit
Phase 3 — Lift gaps (~3 hr, mostly sequential)
├── Task 3.1 P-PARENT-QUALIFIED-TAG-LIFT (Sonnet)
├── Task 3.2 P-TAG-SELECTOR-LIFT (Sonnet, depends on 3.1)
└── Task 3.3 P-CORE-STYLE-MAP-DB-MIGRATION (Sonnet, parallel with 3.1+3.2)
       ↓ multi-rater /qc each commit + anti-cheat hard gate
Phase 4 — Baseline refresh (~20 min, inline Opus)
└── Task 4.1 P-PHASE9-REDEPLOY-BASELINE
       ↓
Phase 5 — Iterative loop (Opus inline + 4-rater /qc, per section)
└── Repeat until every section <1% across all viewports
       ↓
Phase 6 — Orthogonal side tasks (parallel low-priority during waits)
├── Task 6.1 CLI behaviour-flag (Haiku)
└── Task 6.2 Stub-pattern decision (Opus)
```

Total foundation (Phases 0-4): ~5-6 hours.
Phase 5 iterative: ~30 min × N sections — depends on Phase 0.2 bucket count.

---

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Architecture decisions in Phase 1 anti-cheat design; root-cause framing in Phase 5 |
| `/gap-analysis` | Grade each Phase 5 iteration output before commit |
| `/lifecycle` | Any skill/agent/pipeline changes |
| `/research` | If Phase 5 hits an unfamiliar CSS / rendering issue |
| `/strategic-plan` | If Phase 5 reveals the loop needs restructuring |
| `/sgs-update` | Task 0.1 |
| `/sgs-clone` | Task 0.2 + Task 4.1 + Phase 5 iterations |
| `/sgs-wp-engine` | All SGS framework context |
| `/wp-rest-api` | If recogniser update (Task 0.3) touches REST endpoints |
| `/delegate` | Pick model per subagent dispatch — every Phase 1+ task |
| `/dispatching-parallel-agents` | Phase 1 + Phase 2 + Phase 5 multi-rater fan-outs |
| `/subagent-prompt` | Cold prompt for each subagent dispatch |
| `/gemini-flash` | Bulk-context audit in Phase 5 root-cause diagnosis |
| `/gemini-pro` | Sparingly — deep cross-system reasoning when Opus alone is stuck |
| `/cerebras` | Static analysis pre-commit gate, /qc lint rater |
| `/qc` | Multi-rater panel BEFORE every commit touching converter / pipeline / SGS block (binding rule blub.db row 255) |
| `/qc-inline` | Lighter self-check during implementation + post-multi-rater synthesis |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block / token / attribute queries |
| `python ~/.claude/hooks/search.py` | Web research (auto-routes Brave / Firecrawl / SerpAPI / Tavily) |
| `mcp__plugin_playwright_playwright__browser_*` | Pixel-diff screenshots + DOM inspection per section |
| `python ~/.claude/hooks/context7.py` | WP 6.9 / Gutenberg internals if Phase 3 hits core-behaviour question |
| `mcp-wordpress` REST | WP post REST updates in Task 4.1 |
| `gh` CLI | If a fix needs cross-reference with a GitHub issue/PR |

## Agents to Delegate To

| Agent | When |
|-------|------|
| General-purpose Sonnet | Tasks 0.3, 1.1, 3.1, 3.2, 3.3, Phase 5 mechanical fixes, /qc Sonnet rater |
| General-purpose Haiku | Tasks 1.3, 2.1, 2.2, 6.1, /qc Haiku rater |
| General-purpose Cerebras | Task 1.2, /qc Cerebras lint rater, anti-cheat pre-commit gate |
| General-purpose Gemini Flash | Phase 5 bulk-context audits, /qc Gemini Flash rater |
| General-purpose Gemini Pro | Phase 5 deep reasoning when stuck |
| `wp-sgs-developer` | If pixel-parity work spills into WP-specific block development |

## Methodology guardrails (do not skip)

- **Read leftover-buckets.json BEFORE conjecturing.** Binding rule blub.db row 254. Pipeline-state evidence is canonical.
- **Multi-model /qc council BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db row 255). 4 raters in parallel: Sonnet + Haiku + Gemini Flash + Cerebras. /qc-inline (Opus synthesises) AFTER the council.
- **Per-section cropped pixel-diff** via `scripts/pixel-diff.py --selector .sgs-{section}`, NOT full-page (blub.db row 256).
- **Anti-cheat script is a HARD GATE.** `scripts/qc-anti-cheat.py` must exit 0 before any pixel-parity-related commit lands. Phase 1 builds this script BEFORE any Phase 3+ commit because the gate must exist first.
- **Correctness regression is a HARD GATE.** `scripts/qc-correctness-regression.py` must exit 0 before commit — proves no other client / section regressed.
- **--converter-v2 required** on production orchestrator runs.
- **WP_DEBUG_DISPLAY=false** on staging — debug notices contaminate every pixel-diff.
- **Outcome vs completion** — task is NOT done until measurable signal (pixel-diff% reaches target). Code shipped ≠ outcome achieved.
- **Plain English first** — every major update opens with one-sentence plain-English statement before technical detail.
- **No destructive git verbs** in any subagent prompt (`stash`, `reset`, `checkout --`, `restore`, `clean`).
- **No new hardcoded dicts** in converter/recogniser — DB-first (blub.db row 260). Anti-cheat script (1.1) enforces this.
- **Bean-controlled drafts use SGS-prefixed BEM** (`.sgs-<block>__<element>--<modifier>`).
- **NO `Co-Authored-By` footer** in commits.
- **--no-verify** legitimate per project `.git/hooks/pre-commit` for non-visual metadata/PHP-logic changes — but visual QC stop gate still fires on CSS edits.

## Cerebras / Gemini Flash / Gemini Pro orchestration cheat-sheet

**Cerebras (free, ~2 parallel cap):**
- Static analysis: grep / regex / AST walks
- Pre-commit lint passes
- Anti-cheat script as a /qc rater
- Correctness regression runner (Task 1.2 itself)
- Cost: zero (but rate-capped to 2 concurrent)

**Gemini Flash (free, 1M context):**
- Bulk-context audits: "read every file in tools/recogniser/ and summarise pattern drift"
- Cross-file pattern detection where holistic view beats focused view
- /qc rater for "did this diff break anything elsewhere I'd miss in a 200KB context"
- Cost: zero (within limits)

**Gemini Pro (paid, deep reasoning):**
- Cross-system architectural reasoning when Opus alone is stuck
- Use sparingly — 1-2 invocations per session max
- /qc rater for high-stakes commits (Phase 3 + Phase 5 closure commits)

**Sonnet (paid, balanced):**
- Most file-edit subagent work
- /qc architectural rater
- ~50% of dispatches

**Haiku (paid, cheap mechanical):**
- Plumbing, formulaic edits
- /qc mechanical-regression rater
- ~20% of dispatches

**Opus (main agent, always):**
- Inline architectural reasoning
- Root-cause diagnosis in Phase 5
- Synthesis of multi-rater /qc verdicts (/qc-inline)
- Final go/no-go calls

## Sandybrown / palestine-lives credentials

`.claude/secrets/credentials.yml` (gitignored). Sandybrown admin `Claude` / `JJSO0xscZ38%EcWP)1EU%0V$`. App password for REST API: `U7mv uB22 0ST2 DITH SJFP I9o6`. SSH alias `hd` via `ssh -p 65002 u945238940@141.136.39.73`.

## Acceptance criteria (whole session)

- **Phases 0-4 complete** (foundation): anti-cheat + correctness + coverage-honesty scripts in `scripts/`, coverage-metric honest (P-COVERAGE-* shipped), lift gaps closed (P-PARENT-QUALIFIED + P-TAG-SELECTOR + P-CORE-STYLE-MAP-DB), baseline refreshed.
- **Phase 5 in progress**: at least 1 section closed at <1% pixel-diff across all 3 viewports. Ideally 3-5 sections closed.
- **Anti-cheat verdict on every commit**: every commit landed this session passed `scripts/qc-anti-cheat.py` exit-0.
- **Multi-rater /qc record**: every converter-touching commit has a /qc council record (4 raters logged) attached.
- **Tasks 6.1 + 6.2 nice-to-have**, not required for session close.
