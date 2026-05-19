---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-deploy-and-chrome-alignment
generated: 2026-05-19
prior_session: small-giants-wp-2026-05-19-rc-fixes-and-rosetta-stone
primary_goal: "Deploy 2026-05-19 framework changes (10 static→dynamic blocks + container advanced backgrounds + hero block.json fix) to palestine-lives.org via /deploy. Then close Phase 3 pixel-diff via WP global chrome alignment + investigate untracked footer block collateral."
---

# Deploy 2026-05-19 framework + WP chrome alignment + footer audit

You are a senior SGS Framework engineer. Main agent on Opus (Bean's binding rule). Orchestrate haiku/sonnet/opus/gemini-flash/gemini-pro/cerebras subagents via `/delegate`.

## State recap (plain English)

Yesterday's session shipped 13 commits on main (79196c52 → 6119b93f) closing 5 universal-extraction RCs in the cv2 converter, converting ALL 10 static SGS blocks to dynamic, building advanced backgrounds into the Container block (4 modes — Image / Video / Animation / Overlay; 15 new attrs), fixing the hero block.json dual-cascade bug, shipping Spec 20 structured pipeline log surfacing (Stage 9c), populating the full Rosetta Stone (1755 equivalent_implementations rows = 100%), and wiring /wp-blocks + /wp-hooks + /wp-hook-graph into the cloning pipeline.

Everything compiles + tests green (16/16) + page 144 on sandybrown verified as fixed. BUT none of the framework changes (block conversions + hero defaults + container backgrounds) are deployed to palestine-lives.org yet — they exist only on disk. Today's first job is to deploy.

Phase 3 pixel-diff residual differences come from WP global chrome (the nav menu shows test pages I created during yesterday's sweep + header/footer template parts don't match the mockup). That's separate from converter scope. Theme template-part work.

A new untracked `plugins/sgs-blocks/src/blocks/footer/` directory exists — a parallel subagent created it outside any of my briefs yesterday. Decide today whether to integrate intentionally or remove.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions on the footer block scope + chrome alignment design |
| `/gap-analysis` | Grade deploy output + chrome-alignment proposals before commit |
| `/lifecycle` | Any skill/agent/pipeline lifecycle changes |
| `/research` | Auto-routes — use for unfamiliar WP template-part conventions if needed |
| `/strategic-plan` | Plan chrome-alignment implementation order before writing code |
| `/deploy` | THE PROJECT DEPLOY SKILL — `.claude/skills/deploy/SKILL.md`. First task. Build → tar → SCP → SSH extract → cache clear → OPcache reset |
| `/sgs-clone` | If re-running the pipeline post-deploy to verify the new dynamic blocks emit correctly |
| `/sgs-update` | After deploy to refresh sgs-framework.db block status flags |
| `/sgs-wp-engine` | Block-level questions during footer audit |
| `/wp-blocks` | Schema queries; `dump` subcommand for any schema-state question |
| `/wp-block-themes` | Template-part conventions for chrome alignment |
| `/qc-inline` | Self-check after each sub-task before commit |
| `/qc` | Multi-rater panel before converter/pipeline/block commits (binding rule blub.db row 255) |
| `/visual-qa` | Compare mockup vs deployed framework post-deploy |
| `/handoff` | At session close — walks docs-registry, writes the trio |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__plugin_playwright_playwright__browser_*` | Verify deploy landed correctly on palestine-lives.org — screenshot before/after, check console errors |
| `mcp__plugin_github_github__*` | Reference any prior PRs / commits / issues touching the chrome alignment work |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema manifest BEFORE any "missing column" claim (binding rule #4) |
| `python ~/.claude/hooks/wp-blocks.py validate '<markup>'` | Post-emit markup validation (already wired into cv2 — see convert.py:760+764) |
| `python ~/.claude/hooks/wp-docs.py search-hooks` | Verify hook names against the 7283-hook DB |
| `python ~/.claude/hooks/wp-hook-graph.py scan plugins/sgs-blocks` | Hook-collision audit on plugin code |
| `gh pr list` / `gh issue view` | Cross-reference prior chrome-alignment attempts |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy WP build work — block customisation, template-part edits, theme integration |
| `design-reviewer` | Visual quality check post-deploy + mockup parity validation |
| `performance-auditor` | If any deploy adds heavy DOM (video bg, parallax) — verify Lighthouse stays green |
| `test-and-explain` | Plain-English explanation of post-deploy verification results |
| `research-pipeline` | Any unknowns surfaced about WP template-part conventions |

## Research Approach

Only if Task 3 surfaces unknowns about WP theme template-part conventions (`parts/header.html` + `parts/footer.html` structure, dynamic vs static template-part choice, how mega-menu interacts with template-part rendering): run `/research-check` first with a specific query. Don't invoke research preemptively.

---

## Task 1 — Deploy framework changes to palestine-lives.org

**What:** Run the project `/deploy` skill (`/deploy plugin` then `/deploy theme` OR `/deploy both`) to land the 10 static→dynamic block conversions + container advanced backgrounds + hero block.json fix on the live site. Without this, palestine-lives.org still serves the old static save outputs and the new dynamic blocks aren't reachable from the editor.

**Why:** Production readiness. The framework code is correct on disk + tests pass + page 144 on sandybrown is verified, but the FRAMEWORK site (palestine-lives.org) doesn't carry the new code yet. Every operator + every clone-pipeline target site downstream of palestine-lives.org expects the new dynamic blocks.

**Estimated time:** 10 min.

**Orchestration:**
- Execution: inline (main thread) — Opus drives the deploy commands
- /qc gate after: `/qc-inline` running `curl -sI https://palestine-lives.org/` + verifying static→dynamic conversion via WP REST API check of a known previously-static block

**Acceptance:**
- `npm run build` succeeds
- Tar + SCP + SSH extract complete without errors
- LiteSpeed cache cleared + OPcache HTTP-reset confirmed
- One representative block (e.g. sgs/label) returns its dynamic render HTML on palestine-lives.org, not the old static span output

## Task 2 — Investigate + decide footer block collateral

**What:** The untracked `plugins/sgs-blocks/src/blocks/footer/` directory contains a full block (block.json, edit.js, index.js, manifest.json, render.php, save.js, style.css). It was created by a parallel subagent outside any of yesterday's authorised briefs. Today: read each file, diff against any existing footer pattern in `theme/sgs-theme/parts/footer.html` + the absorbed sgs/footer references in db, decide integrate or remove.

**Why:** Untracked code in `src/blocks/` is either (a) intentional groundwork that should be on a feature branch with proper deprecation review, or (b) collateral that pollutes the source tree. Either way it needs a decision before it accidentally lands in the next build.

**Estimated time:** 25 min.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch pattern: single-agent
- Brief: Audit `plugins/sgs-blocks/src/blocks/footer/`. Compare to existing footer handling (theme template part vs block, any existing `sgs/footer` references in sgs-framework.db). Decide integration path. If integrate: produce a feature branch with deprecation review. If remove: `git clean -fd` it.
- Context the agent needs: today's handoff.md notes; `theme/sgs-theme/parts/footer.html` for current footer rendering; `python ~/.claude/hooks/wp-blocks.py schema sgs/footer` to see if sgs/footer is a registered block already
- Depends on: Task 1 (deploy must succeed first so we know which footer flow is canonical)
- /qc gate after: `/qc-inline` — if integrate, verify build still green + deprecated.js shim added for any save shape change; if remove, verify nothing else references the footer/ dir

**Acceptance:** Working tree shows EITHER (a) footer block on a feature branch with PR opened OR (b) clean working tree with footer/ removed. Decision documented in `.claude/decisions.md`.

## Task 3 — WP global chrome alignment for Mama's Munches mockup parity

**What:** Update theme template parts (`theme/sgs-theme/parts/header.html` + `theme/sgs-theme/parts/footer.html`) so when cloned pages render they DON'T show the WP test-page nav menu + match the Mama's Munches mockup chrome (logo + nav structure + footer columns). This is what's blocking Phase 3 pixel-diff from closing.

**Why:** Phase 3 pixel-diff sweep yesterday showed all 7 sections × 3 viewports failing — but the dominant variable was WP chrome contamination, not converter-side issues. Aligning the chrome unlocks the actual converter parity measurement.

**Estimated time:** 60 min.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate` (heavy WP template-part work — wp-sgs-developer agent is the canonical handler)
- Dispatch pattern: single-agent (sequenced after Task 1 deploy)
- Brief: Update `theme/sgs-theme/parts/header.html` to use the mamas-munches mockup header structure (logo + nav). Update footer template part similarly. Use `/wp-block-themes` skill for template-part API patterns. After update, deploy via Task 1's flow, then re-run `/sgs-clone` against Mama's homepage + re-pixel-diff per section per viewport.
- Context the agent needs: mockup at `sites/mamas-munches/mockups/homepage/index.html`; current rendered page at `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`; Phase 3 pixel-diff results from `reports/2026-05-19-phase-3-pixel-diff/`
- Depends on: Task 1 (need framework deploy first)
- /qc gate after: `/visual-qa --mode compare` against the mockup, AND re-run per-section cropped pixel-diff via `scripts/pixel-diff.py --selector .sgs-{section} --viewport 1440x900` for hero + brand + social-proof + ingredients + gift + featured-product + trust-bar

**Acceptance:** At least hero + trust-bar + brand sections close at ≤ 5% pixel-diff @ 1440x900 (down from 99% / 31% / 64% respectively yesterday). Remaining sections improvement documented; any still > 5% means converter-side work needed in a separate session.

## Task 4 — Operator UX trial — container advanced backgrounds

**What:** Open page 144 in WP admin. Switch the hero block to use a container wrapper instead. Exercise each of the 4 new Background tabs (Image, Video, Animation, Overlay) and verify the inspector controls map to the right block attributes AND render.php emits the right markup.

**Why:** The container backgrounds shipped + 12 inline QC scenarios passed yesterday, but the operator-facing UX (the actual click-through path) hasn't been exercised by a human (or a Playwright-driven proxy). This is the smoke test that proves the editor experience matches the engineering acceptance.

**Estimated time:** 30 min.

**Orchestration:**
- Execution: inline (main thread) via Playwright MCP — Opus drives the browser
- /qc gate after: `/qc-inline` — verify the 4 modes each produce the expected wrapper markup in the saved post_content

**Acceptance:** Each of 4 background modes (image / video / parallax-or-kenburns / overlay) produces a visible visual difference on the frontend when set. Block validation stays clean across all 4 mode switches. No "Invalid block" placeholder appears at any point.

## Dependency graph

```
Task 1 deploy (inline, Opus, ~10 min)
  ↓
Task 2 footer audit (sonnet, ~25 min) ──┐
                                          ├─ parallel after Task 1
Task 3 chrome alignment (sonnet, ~60 min)┘
  ↓ (Task 3 only)
/visual-qa + per-section pixel-diff
  ↓
Task 4 container UX trial (Playwright, ~30 min)
  ↓
/qc + commit + push + merge-to-main + /handoff
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — any change that should be visible on a live URL requires `npm run build` + tar deploy + OPcache reset BEFORE running any pixel-diff / browser test against that URL. If you skip the deploy, the test is measuring stale output.
- **Root cause before instance fix** — when a section fails parity, ask "what's the class of failure?" before fixing the specific instance. Today's chrome work is a class fix (template parts); section-by-section CSS tuning is the anti-pattern.
- **Outcome vs completion** — if the work doesn't hit the stated acceptance, do NOT mark the task done. Re-plan or escalate. Code shipped ≠ outcome achieved.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (binding rule blub.db row 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (binding rule blub.db row 256).
- **Schema enumeration BEFORE gap claims** — `python ~/.claude/hooks/wp-blocks.py dump` (binding rule #4 in CLAUDE.md, blub.db row 272).
- **/qc-inline against live pipeline** not just isolated units — placement bugs survive isolated QC (lesson #273 from yesterday).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.
- **No `git stash` / reset / checkout-- / restore / clean** in subagents — explicit destructive verbs forbidden.
- **No `Co-Authored-By:` lines** in commits.
- **--converter-v2 required** on production orchestrator runs.

## Acceptance criteria (whole session)

- Framework changes deployed to palestine-lives.org with one representative dynamic-block check passing.
- Footer block collateral decision made + documented; working tree clean of unauthorised untracked code.
- Hero + trust-bar + brand sections close at ≤ 5% pixel-diff @ 1440x900 (or chrome-alignment work explicitly documented as "needs Task 3.2 next session").
- Container advanced backgrounds verified working in editor for all 4 modes.

## Key files to read at session start

- `.claude/handoff.md` — yesterday's full session digest
- `.claude/state.md` — current phase + blockers
- `.claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md` — Stage 9c contract (live)
- `.claude/cloning-pipeline-flow.md` §"Data Sources & Block-Equivalent Layers" — DB + draft-naming reference
- `.claude/CLAUDE.md` binding rule #4 — schema-enumeration discipline
