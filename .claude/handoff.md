---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-01
session_tag: small-giants-wp-2026-05-01-recogniser-architecture
recommended_model: opus
---

# Session Handoff — 2026-05-01

## Completed This Session

1. **Verified Track C status** — discovered the 5 static-block deprecations (`certification-bar`, `counter`, `notice-banner`, `process-steps`, `testimonial`) were already shipped on 2026-04-29 (`7d4fd52`) and deployed via Track A PR #9. Updated stale state.md.
2. **Removed legacy UK colour attrs from `sgs/google-reviews`** — `textColour`/`backgroundColour` removed from block.json + destructured-but-unused references cleaned in edit.js. Native `supports.color` already handles the work. Built + deployed.
3. **Track B Day 1 — done in 30 minutes via parallel Sonnet agents** (vs original "1 day" estimate). Mapped `jverneaut/html-to-gutenberg` (2,500 LOC, 7 SGS gaps catalogued) AND prototyped working AI annotator (54 annotations on Mama's homepage in 10s).
4. **Verified Mama's Munches DB coverage** — Sonnet agent confirmed 85% of homepage covered by existing SGS blocks. The 2 blocks Bean remembered building (`sgs/trust-badges`, `sgs/notice-banner`) are confirmed in DB. 4 minor gap-fixes catalogued.
5. **Architecture pivot: recogniser-first, transformer fallback only.** Reframed the entire approach. Recogniser matches HTML to existing blocks via 3 fingerprint libraries (SGS DB → core WP → WooCommerce). Transformer scaffolded but not built for v1.
6. **WC replacement decision: dropped permanently.** SGS Ecom Plugin scope locked as UI/blocks layer ON TOP of WC (not replacement). Aligns with master plan Phase 5 + Mama's gap analysis.
7. **Wrote recogniser v1 spec** at `.claude/plans/recogniser-v1.md` — 6 modules, 4 gap fixes, self-QC gates between every module, acceptance criteria, dispatch strategy with parallel Sonnet/Cerebras agents.
8. **Updated `.claude/state.md`** — phase shifted to `html-recogniser`, all decisions captured.

## Current State

- **Branch:** `main` at `99d701d`
- **Tests:** no test suite (WordPress block plugin)
- **Build:** passes — `npm run build` clean
- **Uncommitted changes:** none in framework files. Subproject scaffolds in `sites/` are untracked but out-of-scope.
- **Deploy status:** palestine-lives.org current. Framework changes in `99d701d` are doc/spec only — no rebuild required.

## Known Issues / Blockers

None. The autonomous run has everything it needs.

## Next Priorities (in order)

1. **Recogniser v1 — autonomous overnight build** to spec at `.claude/plans/recogniser-v1.md`. Branch `feat/recogniser-v1` from `main`. Acceptance: Mama's Munches homepage live on staging at `/mamas-munches-homepage-test/` with Playwright visual diff < 5% at 375/768/1440px.
2. **SGS Ecom Plugin Phase 1** — `sgs/product-info`, `sgs/product-gallery`, `sgs/variant-pills`, `sgs/product-card`. Queued AFTER homepage ships. 3-session shape: spec + overnight Opus build + QA. Unblocks Mama's product page.
3. **Custom WC paid-extension replacements** — Subscriptions, Memberships, Wholesale (£600+/year saved per client). Bounded scope per extension. Roadmap, not blocking.

## Files Modified

| File | What changed |
|---|---|
| `.claude/state.md` | Phase shifted to `html-recogniser`. Track C marked done. Architecture decisions captured. |
| `.claude/plans/recogniser-v1.md` | NEW — full autonomous-build spec (6 modules, 4 gap fixes, self-QC gates) |
| `plugins/sgs-blocks/src/blocks/google-reviews/block.json` | Removed `textColour` + `backgroundColour` attrs |
| `plugins/sgs-blocks/src/blocks/google-reviews/edit.js` | Removed unused destructure of removed attrs |

## Notes for Next Session

- **Bean is asleep during the autonomous run.** Self-QC gates between every module are mandatory — never proceed past a failing gate. Stop conditions in spec; surface to `reports/recogniser-v1-blockers.md`.
- **WP Studio deprecated.** Recogniser pipeline + GitHub deploy makes it redundant.
- **Anthropic API credits exhausted on `.openclaw/.env` keys.** AI annotator must use Claude CLI (subscription credit), NOT direct SDK. Annotator script at `C:/tmp/sgs-annotator.py` currently falls back to Gemini Flash via OpenRouter — rewrite to shell out to `claude -p` instead.
- **`/cerebras` agent now uses Qwen 3 235B** (`qwen-3-235b-a22b-instruct-2507`), not ZAI GLM 4.7. Stale doc fixed at `~/.claude/commands/cerebras.md`.
- **Mama's featured product section deferred** — recogniser maps it to a placeholder. Real implementation waits for SGS Ecom Plugin Phase 1.

## Next Session Prompt

~~~
recommended_model: opus
session_tag: small-giants-wp-2026-05-01-recogniser-autonomous-build

You are a senior WordPress block architect specialising in the SGS Framework, autonomous multi-agent code generation, and Gutenberg block compilation pipelines. You are running in fully autonomous mode — Bean is asleep — and you must self-QC every gate before proceeding.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-01-recogniser-autonomous-build"

Read `.claude/handoff.md`, `.claude/state.md`, `.claude/plans/recogniser-v1.md`, and `CLAUDE.md`. The recogniser-v1.md spec is your source of truth — execute against it end-to-end.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | If a design decision surfaces mid-build that wasn't pre-decided in the spec |
| `/gap-analysis` | After each module ships — grade output against acceptance criteria before next module |
| `/lifecycle` | If any new skill / agent / pipeline needs creating during the build |
| `/research` | If undocumented WP / WC / html-to-gutenberg behaviour is hit |
| `/strategic-plan` | If the spec needs reorganising mid-build (only if absolutely necessary) |
| `/dispatching-parallel-agents` | MANDATORY — Modules 1, 2, 4, 5, 6 dispatch in parallel. The 4 gap fixes dispatch in parallel. |
| `/subagent-driven-development` | MANDATORY — Each module follows implementer + spec-reviewer + quality-reviewer |
| `/delegate` | MANDATORY — Per branch BEFORE dispatch to pick model + fallback chain |
| `/cerebras` | Module 1 (Section Detector) + Module 5 (Serialiser) — small mechanical work, fits Qwen 3 235B budget |
| `/gemini-flash` | Visual diff at end (1M context for screenshot analysis) + Cerebras queue fallback |
| `/deploy-check` | Pre-deploy checklist before pushing the homepage to staging |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Visual diff at 375/768/1440px between mockup screenshots and live staging page |
| GitHub MCP | Open PR after final commit |
| `sgs-db.py` CLI | Build fingerprint catalogue: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` then per-block lookups |
| Claude CLI | AI recogniser shells out to `claude -p --print "<prompt>" --output-format json` per section (subscription credit, NOT API key) |

## Agents to Delegate To

| Agent | When |
|------|------|
| `wp-sgs-developer` | All SGS framework modifications (4 gap fixes touch SGS block source files) |
| `feature-dev:code-architect` | If spec ambiguity surfaces — design within spec boundaries only |
| `feature-dev:code-reviewer` | After each module ships — review for bugs/security before marking gate passed |
| `test-and-explain` | After end-to-end run — produce plain-English status report |

## Model Routing (per `/delegate` table)

- **Sonnet** — primary for module implementations (~100-300 lines mechanical+architectural per module)
- **Haiku** — fingerprint catalogue assembly (mechanical SGS DB queries), simple validation passes
- **Cerebras (Qwen 3 235B)** — Module 1 (Section Detector) + Module 5 (Serialiser). Free tier first, fallback to Gemini Flash on queue stall.
- **Gemini Flash** — Visual diff calculation (1M context for screenshots) + Cerebras fallback
- **Opus (this session)** — orchestration only. Do NOT do module implementation in main thread — dispatch every module to a subagent.

## Tasks (execute in order)

### Task 1 — Branch + Scaffold
Create `feat/recogniser-v1` from `main` at `99d701d`. Scaffold `tools/recogniser/` directory + empty module files per spec. Commit "scaffold(recogniser): module skeleton".

### Task 2 — Modules 1+2 in parallel (Cerebras + Sonnet)
Dispatch Module 1 (Section Detector) to Cerebras and Module 2 (Fingerprint Indexer) to Sonnet IN PARALLEL via `/dispatching-parallel-agents`. Run self-QC gates from spec. Commit each separately. Do NOT proceed until both gates pass.

### Task 3 — Module 3 (Recogniser, Sonnet, sequential)
Dispatch Module 3 to Sonnet — depends on Modules 1+2. Cold-prompt at `tools/recogniser/prompts/recogniser-prompt.md`. Self-QC gate (≥6 full match, ≤4 partial, ≤1 deferred). Commit.

### Task 4 — Modules 4+5+6 in parallel (Sonnet + Cerebras + Sonnet)
Dispatch Modules 4, 5, 6 IN PARALLEL. Module 5 (Serialiser) to Cerebras. Modules 4 + 6 to Sonnet. Self-QC gates per module. Commit each.

### Task 5 — 4 Gap Fixes in parallel (Sonnet x4)
Dispatch all 4 gap fixes IN PARALLEL — they touch different files. Each its own commit. Hero CSS, notice-banner extend-base, icon-block emoji support, brand-story routing-prompt example.

### Task 6 — End-to-end run + visual diff
Run recogniser against `sites/mamas-munches/mockups/homepage/index.html`. Output: serialised block markup + template parts + patterns. Deploy to staging at `/mamas-munches-homepage-test/`. Playwright visual diff at 3 breakpoints via Gemini Flash. Iterate until <5% delta. Write `reports/recogniser-v1-qc.md`.

### Task 7 — PR + Handoff
Open PR to `main` with summary table of commits + gate results + visual diff stats. Update `.claude/state.md`. Run `/handoff` for morning handoff.

## Self-QC Protocol (mandatory)

Between every module:
1. Read the module's gate from `.claude/plans/recogniser-v1.md`
2. Verify acceptance criteria (numerical thresholds, file existence, command success)
3. If gate fails: iterate, do NOT proceed
4. If iteration count exceeds 3 attempts on a single module: STOP, write to `reports/recogniser-v1-blockers.md`, mark session paused

If ANY stop condition fires (per spec): halt the run, do NOT mark complete.

## Guardrails

- **Branch discipline** — all framework changes go to `feat/recogniser-v1`, never `main`. Pre-commit hook will fire if you try.
- **Never modify post_content via WP-CLI on the live site** — recogniser writes to a NEW staging post via `wp post create`.
- **Stop deployments at staging** — do NOT promote to production. Bean reviews in the morning.
- **Anthropic SDK keys exhausted** — annotator + recogniser MUST use Claude CLI (subscription).
- **Cerebras has 5–30 min queue stall risk** — `/delegate` fallback chain is Cerebras → Gemini Flash → Sonnet.
- **Build artifacts** — `npm run build` after every block source change. Deploy via tar method per CLAUDE.md (NOT `scp -r`).
- **OPcache reset via HTTP** — CLI reset is a separate pool. Use HTTP method per CLAUDE.md.
- **LiteSpeed cache** — clear both page cache AND CSS optimiser cache after deploy.

## Acceptance — Session marks itself done ONLY when ALL true

1. All 6 modules shipped + gates passed
2. All 4 gap fixes shipped + tested
3. Recogniser end-to-end on Mama's homepage produces complete WP page
4. Page deployed to staging at `/mamas-munches-homepage-test/`
5. Playwright visual diff < 5% at 375/768/1440px
6. Reports written: `reports/recogniser-run-YYYY-MM-DD.md` + `reports/recogniser-v1-qc.md`
7. PR opened to `main` with summary
8. Morning handoff written for Bean
~~~
