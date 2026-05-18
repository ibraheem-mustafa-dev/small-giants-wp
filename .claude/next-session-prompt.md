---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-spec-17-live-verification
generated: 2026-05-19
prior_session: small-giants-wp-2026-05-19-floating-ui-plus-skill-restructure
---

# Spec 17 live-site verification + Phase 2 block roadmap kickoff

You are a senior SGS Framework engineer with deep WordPress + Gutenberg expertise. The prior 4 sessions (ending 2026-05-19) shipped Spec 17 entirely (Header/Footer Architecture: 16 FRs + Customiser Floating UI replacement). Every test passes (1195/0/0); code is on `main` at `d4da8c68`. Nothing has been deployed to a real WP install yet. This session's job: prove Spec 17 works on a real site, then kick off the Phase 2 block roadmap.

## State recap (plain English)

We built a lot. We have not yet tested any of it on a live WP install. Per Bean's outcome-vs-completion bar, "code shipped" is not the same as "outcome achieved" — operator workflows on a real site are what closes the loop. The sandybrown clone is the canonical staging surface; palestine-lives.org is the long-running dev WP install. Both need to load the new admin pages, accept Customiser changes, run the `wp sgs` CLI commands with `--user=1`, and surface no PHP fatals or REST errors. Once sandybrown is green, deploy palestine-lives.org via the canonical tar method. Then start Phase 2 block additions per the master feature audit: hover effects across all blocks, Icon Block, Timeline block, Pricing Table polish.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions inside Phase 2 block design |
| `/gap-analysis` | Grade Phase 2 deliveries before merge |
| `/lifecycle` | Any skill/agent/pipeline changes |
| `/research` | If WP 6.9 Customiser preview behaviour needs verification |
| `/strategic-plan` | Before kicking off Phase 2 — full roadmap pass |
| `/sgs-wp-engine` | All SGS framework work |
| `/wp-wpcli-and-ops` | Run + verify `wp sgs` commands |
| `/wp-plugin-development` | Phase 2 block plumbing |
| `/wp-block-development` | New block scaffolding |
| `/wp-rest-api` | If new REST endpoints are added |
| `/wp-block-themes` | If theme.json updates are needed |
| `/visual-qa` | Capture admin page screenshots + Customiser preview |
| `/qc` | Multi-rater panel before every Phase 2 commit (binding rule) |
| `/qc-inline` | Self-check before each merge |
| `/deploy-check` | Pre-deploy verification |
| `/delegate` | Pick model per subagent dispatch |
| `/dispatching-parallel-agents` | Phase 2 blocks are parallel-dispatch-shaped |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp-wordpress` REST | Verify block registration + CPT REST capability gating on sandybrown |
| `playwright` | Multi-viewport screenshots of admin pages + Customiser preview |
| `chrome-devtools-mcp` | Inspect Customiser preview iframe + console errors |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block schema + style variation queries |
| `python ~/.claude/hooks/context7.py` | WP 6.9 docs for Customiser postMessage transport |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Phase 2 block builds with WP-specific judgement |
| General-purpose Sonnet | Live-site smoke test scripting + per-block scaffold work |
| `design-reviewer` | Visual quality check on admin pages + Customiser |
| `performance-auditor` | Lighthouse on admin pages once deployed |

---

## Task 1 — Deploy Spec 17 to sandybrown + smoke test

**What:** Build + tar-deploy `theme/sgs-theme` + `plugins/sgs-blocks` to sandybrown-nightingale-600381.hostingersite.com. Smoke test: load each admin page, run each `wp sgs` command, activate a style variation, click through Customiser Floating UI, confirm no PHP fatals or REST errors.

**Why:** code shipped ≠ outcome achieved until verified on real WP. This is the gate before any further build work.

**Estimated time:** 30 min

**Orchestration:**
- Execution: inline (main thread on Opus) — destructive, single-coordinated path
- Reason: deploy is sequential; smoke-test scripting can be done by main thread directly
- Depends on: none
- Parallel with: none
- /qc gate after: visual-qa via Playwright on the 7 admin pages + Customiser preview (capture screenshots)

**Acceptance:**
- `npm run build` clean → tar deploy → SSH unpack → OPcache reset all complete
- All 7 admin pages load without fatal: SGS top-level menu, Site Info, Header Rules, Footer Rules, Advanced Headers, Advanced Footers, Reset Header/Footer, Style Variations
- `wp sgs site-info get business_name`, `wp sgs migrations status`, `wp sgs header-rules list` all return non-empty stdout with `--user=1`
- Customiser → SGS Floating UI section appears with 7 controls
- Toggling back-to-top enabled in Customiser shows the button immediately (postMessage transport works)
- CPT REST: GET `/wp-json/wp/v2/sgs_header` as subscriber returns 403; as admin returns array
- Conditional rule: add a rule "post type = page, URL = ^/$" → activate sgs-header-transparent → load homepage → header markup is the transparent variant

---

## Task 2 — Deploy Spec 17 to palestine-lives.org once sandybrown is green

**What:** Same tar deploy + smoke test against palestine-lives.org. Lower verification bar (sandybrown is the canonical clone) — confirm no fatals on homepage load + admin nav.

**Why:** palestine-lives.org is the long-running dev WP; needs the new code so future block work loads against a current baseline.

**Estimated time:** 15 min

**Orchestration:**
- Execution: inline
- Depends on: Task 1 green
- Parallel with: none
- /qc gate after: Playwright homepage smoke

**Acceptance:** homepage loads without fatal; admin login works; SGS top-level menu visible.

---

## Task 3 — Phase 2 strategic plan (hover effects + Icon Block + Timeline + Pricing Table polish)

**What:** Invoke `/strategic-plan` against the master feature audit (`docs/plans/2026-02-21-master-feature-audit.md`) for Phase 2 P1 items. Produce a per-FR breakdown: which 4 blocks get hover scale + shadow + image-zoom; Icon Block scaffolding; Timeline block scaffolding; Pricing Table polish (already built but tagged L14 — verify what L14 means + close gaps).

**Why:** Phase 2 was paused for Spec 17. Spec 17 is now done. Strategic plan gates the next round of parallel dispatch.

**Estimated time:** 20 min

**Orchestration:**
- Execution: inline (main thread orchestrates strategic-plan)
- Depends on: Task 1 + 2 green
- Parallel with: none — planning runs alone, no implementation until plan locks
- /qc gate after: /docscore on the plan output

**Acceptance:** strategic-plan output names ≥4 implementation tasks with model + dispatch pattern annotations + estimated wall clock; written to `.claude/plans/phase-2-block-roadmap.md`.

---

## Task 4 — Phase 2 block implementations (parallel dispatch)

**What:** Per the strategic plan from Task 3, dispatch parallel subagents for the Phase 2 P1 items. Likely 3-4 Sonnet subagents covering hover scale + shadow extension across 4 named blocks; Icon Block (Lucide picker + size/colour); Timeline block (vertical/horizontal scroll-reveal).

**Why:** master-feature-audit Phase 2 is the next operator-visible value.

**Estimated time:** 60-90 min wall clock for the parallel round

**Orchestration:**
- Execution: delegated parallel
- Model: sonnet for each block scaffold
- Dispatch pattern: `/dispatching-parallel-agents` — file-disjoint by block
- Brief per subagent: scaffold via @wordpress/create-block conventions; wire into block category; PHPUnit + Playwright integration; per-block QC
- Depends on: Task 3 plan locked
- Parallel with: all sibling blocks (file-disjoint)
- /qc gate after each block: `/qc-inline`

**Acceptance:** each new block has block.json + edit + save + render.php + tests; registered in `sgs-content` or `sgs-layout` category; visible in editor block inserter.

---

## Dependency graph

```
Task 1 (sandybrown deploy + smoke) — inline, Opus, ~30 min
  ↓ Playwright /visual-qa gate
Task 2 (palestine-lives deploy) — inline, ~15 min, depends Task 1 green
  ↓
Task 3 (Phase 2 strategic plan) — inline /strategic-plan, ~20 min
  ↓ /docscore gate
Task 4 (Phase 2 parallel implementations) — 3-4 sonnet subagents via /dispatching-parallel-agents, ~60-90 min
  ↓ /qc-inline per block
Commit + merge to main (Gate 2)
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — any visual / pixel-diff verification on sandybrown requires `npm run build` + tar deploy + OPcache reset BEFORE testing. Stale builds give false negatives. Captured 2026-05-18.
- **Root cause before instance fix** — when a Phase 2 block fails parity, ask "what's the class of failure?" before fixing the instance. Captured 2026-05-18.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Verify on real WP. Captured 2026-05-18.
- **/qc multi-rater BEFORE every commit** touching SGS block logic (blub.db row 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, NOT full-page. Full-page has ~30-45% noise floor (blub.db row 256).
- **`--converter-v2` required** on production orchestrator runs (captured 2026-05-18).
- **`WP_DEBUG_DISPLAY=false`** on sandybrown — debug notices contaminate pixel-diff (captured 2026-05-18).
- **Plain English first** — every major update opens with one-sentence plain-English statement before technical detail (captured 2026-05-18 communication-standards HARD RULE).
- **No git-destructive commands in subagents** — `git reset` / `git restore` / `git checkout --` / `git clean` / `git stash` (any flavour) are forbidden. Two stash incidents on 2026-05-18 wiped ~30 tracked files of work. Subagent prompts MUST carry the explicit safety clause. Captured 2026-05-18 (`feedback_no_git_stash_in_subagents.md`).
- **Build replacement before retiring legacy** — never delete a feature before the replacement is built, tested, shipped. Captured 2026-05-19 (`feedback_build_replacement_before_retiring_legacy.md`).
- **NO `Co-Authored-By` footer** in commits (global rule).
- **WP-CLI commands need `--user=<id>`** for any write operation. Capability gate fires inside command body.
