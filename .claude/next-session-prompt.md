---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-12-spec-15-phase-4-shipped
recommended_model: opus
---

You are a senior WordPress block developer + Python pipeline engineer specialising in the SGS Framework, Gutenberg blocks, and Spec 15's deterministic draft-to-SGS converter. This session ships Phase 5 — Clone pipeline E2E (the largest single phase, ~8-10 hr).

Read `.claude/handoff.md`, `.claude/state.md`, and `.claude/CLAUDE.md` for full context. The plan is at `.claude/plans/phase-5-clone-pipeline-e2e.md` (6 sub-phases: 5a Gap detection → 5b Staged scaffolding → 5c Lingua-franca → 5d WP integration → 5e Autonomy + visual QA → 5f Acceptance harness).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec-15-phase-4-shipped"`

## Where You Are

Plan: `.claude/plans/phase-5-clone-pipeline-e2e.md`
Current phase: Phase 5 — Clone pipeline E2E (the largest single phase)
Progress: Phases 1, 2, 3, 3.5, 4, 4.5 shipped — 6 of 7 phases complete (~83%)
Next task: Phase 5 sub-phase 5a — Gap detection wiring

## Execution Strategy — Opus orchestrator + per-branch delegation

**You are on Opus.** Opus owns: orchestration, multi-rater QC synthesis, architectural decisions, mid-flight pivots, `/qc-inline` between sub-phases. Opus does NOT do leaf code-gen.

**Cost shape:** Opus orchestrates ~10% of tokens; subagent leaves take ~90%.

### Dispatch primitives (when to use which)

- **`/delegate`** — call BEFORE every dispatch. Returns the cheapest model that will succeed for the task descriptor (Sonnet / Haiku / Cerebras / Gemini Flash). Never hardcode model — let `/delegate` decide. Surface the recommendation in chat: *"Using <model> for <task> (via /delegate)."*
- **`/subagent-driven-development`** — implementer + spec-reviewer + quality-reviewer triad for ANY new module / new code surface. Implementer = Sonnet most often; reviewers = Haiku (spec) + Sonnet/Gemini Flash (quality).
- **`/dispatching-parallel-agents`** — fanout when 2+ tasks are independent: different files, no shared state, no sequential dependency. Per `feedback_parallel_dispatch_shared_files.md` — NEVER run two subagents on the same file.
- **`/subagent-prompt`** — write the cold prompt BEFORE every Agent dispatch. Self-contained — no conversation context. The 7-section template (Role / Task / Context / Instructions / Output / Criteria / KJCs) is mandatory for non-trivial dispatches.
- **`/qc-inline`** — run BETWEEN sub-phases against the actual artefact. Subagent reports are claims, not evidence (Verification Discipline Rule 1).

### Model routing per Phase 5 sub-phase

| Sub-phase | Primary subagent model | Pattern | Why this model |
|---|---|---|---|
| **5a Gap detection** | **Sonnet** (implementer) + **Haiku** (spec-reviewer) | `/subagent-driven-development` triad | Sonnet builds the gap-detection module (mechanical code-gen with judgement); Haiku validates against FR8 schema |
| **5b Staged scaffolding** | **Sonnet** (implementer) + **Sonnet** (quality-reviewer) | `/subagent-driven-development` triad; **fanout per block-type** via `/dispatching-parallel-agents` | Per-block-type scaffold builds are independent — 3-5 way Sonnet fanout cuts wall time. Cerebras-eligible per scaffold if simple enough (12-round ceiling); `/delegate` will downgrade if so |
| **5c Lingua-franca conversion** | **Sonnet** (implementer) + **Gemini Flash** (multi-convention classification breadth) | `/subagent-driven-development` + Gemini Flash rater | Class-name convention classification benefits from Gemini Flash's 1M context for ingesting whole scrape samples + cross-convention dictionaries |
| **5d WP integration wiring** | **Sonnet** (implementer) — wp-blockmarkup + wp-devdocs MCPs validate output | `/subagent-driven-development` with WP-aware reviewer; **2-way fanout**: markup serialisation + block.json validation are independent | Sonnet handles WP-specific code-gen; MCPs are the verifiers, not subagents |
| **5e Visual QA** | **design-reviewer agent** + **Gemini Flash** (vision rater) | `/dispatching-parallel-agents` for design-reviewer + Gemini Flash + Python pixel-diff | Gemini Pro Vision would be primary but is EXCLUDED per /delegate canon (503 retry). Gemini Flash handles vision adequately at 1M context; design-reviewer agent owns the human-eye criteria |
| **5f Acceptance harness** | **3-rater panel: Sonnet + Haiku + Gemini Flash** | `/dispatching-parallel-agents` for the panel + Cerebras for mechanical DB writes (FREE) | Per `feedback_qc_before_commit.md` — multi-rater BEFORE commit. Cerebras handles boundary-check SQL writes if any are needed (bounded, FREE, 12-round ceiling fine) |

### Reserved fallbacks

- **Gemini Pro 3.1** — EXCLUDED until 503 retry loop fixed upstream. Do not dispatch.
- **Cerebras** — qwen-3-235b, FREE, 12 tool rounds, 16K output cap. Use for bounded SQL migrations, single-file mechanical edits, deterministic transforms. NOT for review tasks (rate-limits on QC-grade reads).
- **Haiku** — primary for fast sanity checks, schema validation, deterministic classification. Secondary reviewer in `/subagent-driven-development` triads.

### When NOT to dispatch

Per `feedback_dont_delegate_the_test_of_unproven_work.md` — if the milestone is to PROVE something works (live deploy, hero baseline verification, drift validator green light), Opus owns the proof step. Never delegate it. Never accept an agent's text report as evidence; open the URL or run the verification command yourself.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions per sub-phase (5a-5f) |
| `/gap-analysis` | Grade each sub-phase deliverable before commit |
| `/lifecycle` | If any sub-phase requires skill / agent / pipeline edits |
| `/research-check` | Quick lookups (Playwright pixel-diff APIs, WP block markup serialisation) |
| `/strategic-plan` | Confirm sub-phase 5a-5f ordering before kickoff |
| `/sgs-wp-engine` | SGS Framework operations + QA pipeline (mandatory for SGS work) |
| `/wp-block-development` | Block emission patterns in sub-phase 5b + 5d |
| `/wp-block-themes` | theme.json contract validation in sub-phase 5d |
| `/visual-qa` | Sub-phase 5e visual parity check at 3 viewports |
| `/qc-inline` | Between sub-phases — Opus has context to verify inline |
| `/qc` | Full pipeline output review at sub-phase 5f (acceptance harness) |
| `/delegate` | Per-branch model picker — call before every dispatch |
| `/dispatching-parallel-agents` | Fanout independent sub-phase work |
| `/subagent-driven-development` | Implementer + 2 reviewers for new sub-phase modules |
| `/handoff` | End-of-session handoff generation |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` MCP | Multi-viewport screenshots + pixel-diff for sub-phase 5e visual parity |
| `wp-blockmarkup` MCP | Validate WP block-comment markup serialisation in sub-phase 5d |
| `wp-devdocs` MCP | Verify WP hook + filter signatures during sub-phase 5d wiring |
| `mcp__a11y__audit_webpage` | Sub-phase 5e a11y audit on generated output |
| Python sqlite3 | DB queries against sgs-framework.db for gap detection (5a) |
| Git CLI | Per-sub-phase direct-to-main commits per always-merge-to-main rule |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Block emission + theme.json contract work in 5b + 5d |
| `design-reviewer` | Visual parity review in 5e against the live draft |
| 3-rater QC panel (Sonnet + Haiku + Gemini Flash) | Sub-phase 5f acceptance harness — BEFORE final commit per qc-before-commit rule |

## Research Approach

Phase 5 is mostly architectural + integration work. Skip broad research unless sub-phase 5e (visual parity) needs Playwright pixel-diff library research — then `/research-check` for the current API. For sub-phase 5d, `/library-docs` for WP block-markup serialisation if the existing `wp-blockmarkup` MCP doesn't cover an edge case.

---

## Task 1: Phase 5 sub-phase 5a — Gap detection

Wire `/sgs-clone` Stage 9 (coverage report) to write `attribute_gap_candidates` + `functionality_gap_candidates` (FR8 tables, schema exists from Spec 14 P2). Dispatch the gap-detection module build to Sonnet via `/subagent-driven-development`. `/qc-inline` against Mama's mockup; expect new gap rows surfaced for any block-type miss.

## Task 2: Phase 5 sub-phase 5b — Staged scaffolding

Block scaffolding output lands in a staging directory; operator review interface (FR15) writes ambiguous-case prompts back to `recognition_log`. Use `/wp-block-development` skill for new block-type emission patterns. Sonnet implementer + spec + quality reviewers via `/subagent-driven-development`.

## Task 3: Phase 5 sub-phase 5c — Lingua-franca conversion

External scrape sources enter the pipeline via `/uimax-sgs-scrape-pattern`. Source classes preserved in `equivalent_implementations`; SGS-BEM primary written. Per Spec 15 §8.1 + Rosetta Stone Hard Rule. `/qc-inline` against a sample external source.

## Task 4: Phase 5 sub-phase 5d — WP integration wiring

Stage 7 block-comment markup serialisation with InnerBlocks (FR12); Stage 6 block.json schema validation (FR6). Use `wp-blockmarkup` MCP to verify markup roundtrip. Use `wp-devdocs` MCP for any WP hook signature.

## Task 5: Phase 5 sub-phase 5e + 5f — Autonomy + visual QA + acceptance harness

Visual parity ≤ 1% pixel diff at 3 viewports (375/768/1440) via Playwright; regions > 0.5% surfaced as thumbnails for operator review. Sub-phase 5f acceptance harness: 5 canonical-mutation-boundary checks green + ≥ 90% block attribute coverage on Mama's mockup. 3-rater QC panel (Sonnet + Haiku + Gemini Flash) BEFORE final commit.

## Guardrails

- Drift validator must stay PASS after every sub-phase: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero `--verify-against tests/golden/hero-extraction-baseline.json` must stay PASS
- Additive token discovery default — do NOT reintroduce snap-to-nearest verdict mode (captured in auto-memory `feedback_cloning_preserves_intentional_bespoke_detail.md`)
- Mama's mockup token state must stay clean — re-discovery with variation overlay should return 0 candidates
- 3-rater QC panel BEFORE each sub-phase commit per qc-before-commit rule
- Direct commits to main per always-merge-to-main rule, format: `feat(spec-15-p5-<sub>): <description>`
