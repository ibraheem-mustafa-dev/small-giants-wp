---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-cloning-pipeline-improvement
generated: 2026-05-20
prior_session: small-giants-wp-2026-05-20-phase-2a-massive
---

# Cloning pipeline improvement — orchestration plan

You are a senior SGS Framework engineer with deep WordPress + Gutenberg + cloning-recogniser expertise. The prior session (2026-05-20) shipped Phase 2A on `main` at `0201c0d9` — 3 new blocks, header behaviour layer via body_class, Spec 18 cleanup. This session pivots back to the cloning pipeline (Spec 16 phase 7 / orchestrator resumption) and improves it before any further block work.

## State recap

Phase 2A is done and deployed live on sandybrown + palestine-lives.org. Three new SGS-BEM selector families now exist for the recogniser to match: `.sgs-responsive-logo*`, `.sgs-icon*`, `.sgs-timeline*`, plus `body.sgs-header-behaviour-*` for header state. `sgs-framework.db` has NOT been re-synced since Phase 2A landed — it's lagging behind code. `pipeline-state/<latest-run>/leftover-buckets.json` (if present) is the canonical evidence source for converter quality — read it BEFORE conjecturing about any pipeline issue (binding rule blub.db row 254).

Three open follow-ups exist as parking entries but are not blockers: P-S18-TRANSPARENT-PATTERN-IS-STUB (needs delete decision), P-TIMELINE-ADVANCED-VISUAL-EFFECTS (deferred), CLI behaviour-flag plumbing (~20 min cheap win).

Read CLAUDE.md, `.claude/handoff.md`, and `.claude/cloning-pipeline-flow.md` for full context before starting.

---

## Task 1 — Sync sgs-framework.db with Phase 2A

**What:** Run `/sgs-update` to scan the codebase + regenerate `sgs-framework.db` + `02-SGS-BLOCKS-REFERENCE.md` + mirror to uimax `component-libraries.csv`.

**Why:** The DB is stale by 11+ commits. Cloning recogniser reads from this DB. Without sync, new SGS-BEM selectors won't resolve to their owning blocks during recognition.

**Estimated time:** 10 min

**Orchestration:**
- Execution: inline (main thread on Opus)
- Depends on: none
- Parallel with: none
- /qc gate after: no — `/sgs-update` is mechanical; verification is the stats output

**Acceptance:** DB shows 74+ blocks (was 71 pre-Phase-2A: +responsive-logo, +icon, +timeline; -icon-block retired). pricing-table block has new attrs visible (`iconName`, `ribbonText`, `savingsBadgeText`, etc.). uimax CSV row count grows by 3+ for new blocks.

---

## Task 2 — Pipeline state audit + leftover-bucket walk

**What:** Find the most recent pipeline run in `pipeline-state/` and walk its `leftover-buckets.json`. If no recent run exists, run `/sgs-clone` with `--converter-v2` against Mama's homepage post 131 baseline to generate a fresh state.

**Why:** Binding rule blub.db row 254: read evidence BEFORE conjecturing about pipeline quality. Bean lost ~6 hours on 2026-05-15 to this exact mistake.

**Estimated time:** 15 min audit + (60 min if pipeline run needed)

**Orchestration:**
- Execution: inline (main thread on Opus)
- Depends on: Task 1 (DB must be current so recogniser resolves correctly)
- Parallel with: none — sequential evidence-gathering
- /qc gate after: no — audit is read-only

**Acceptance:** A written summary of (a) which sections fail and which bucket they're in (extraction_failed / generation_failed / etc.), (b) which gaps are converter bugs vs block-CSS gaps vs intentional mockup choices, (c) the top 3 highest-impact root-cause fixes ranked by section count affected.

---

## Task 3 — Recogniser update for Phase 2A SGS-BEM selectors

**What:** Extend `tools/recogniser/` (or wherever the slot-aware DOM walker lives in Spec 16) to match the new selector families on a draft mockup:
- `.sgs-responsive-logo` → `sgs/responsive-logo` block with 3-slot attribute mapping
- `.sgs-icon` → `sgs/icon` block with source-detection (`--source-{lucide,wp-icon,dashicon,emoji}` modifier reveals which iconSource enum)
- `.sgs-timeline` → `sgs/timeline` block with orientation + alignment + entries[] population
- `body.sgs-header-behaviour-*` → write a rule on `sgs_header_rules` option with `behaviour` set

**Why:** Without recogniser awareness, scraped sites carrying these selectors fall through to gap-candidate flagging instead of clean SGS-block emission.

**Estimated time:** 40 min

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Model: sonnet via `/delegate`
- Dispatch pattern: single-agent
- Brief: "Read Spec 16 §recogniser, existing `tools/recogniser/` matchers, and the new SGS-BEM selectors documented in `.claude/cloning-pipeline-flow.md` (Phase 2A Recogniser Targets section). Extend the matcher table to map each new selector family to its SGS block with attribute-fill logic. Add tests."
- Context the subagent needs that won't be in cold context: file paths in `tools/recogniser/`, the new selectors list (in cloning-pipeline-flow.md tail), `db_lookup.py` is the canonical DB resolver, NO new hardcoded dicts allowed (blub.db row 2026-05-17).
- Depends on: Task 1 (DB must be current)
- Parallel with: Task 4
- /qc gate after: `/qc-inline` self-check before commit

**Acceptance:** Recogniser unit test demonstrates a mockup `<div class="sgs-responsive-logo"><img .../></div>` correctly resolves to `wp:sgs/responsive-logo` with `desktopLogoId` populated. Same for `.sgs-icon` and `.sgs-timeline`.

---

## Task 4 — CLI behaviour-flag plumbing on wp sgs header_rules add

**What:** Extend `Sgs_Header_Rules::add_rule()` sanitiser to accept the `behaviour` key from the input JSON. Add `--behaviour=<slug>` examples to the CLI help. Validates against `Sgs_Header_Behaviours::VALID_BEHAVIOURS`.

**Why:** Currently the body_class layer reads behaviour but the CLI strips it. Operators can only set behaviour via `wp eval` patching the option directly — clunky.

**Estimated time:** 20 min

**Orchestration:**
- Execution: delegated (single Haiku subagent — mechanical, well-scoped, plumbing only)
- Model: haiku via `/delegate`
- Dispatch pattern: single-agent
- Brief: "Read `plugins/sgs-blocks/includes/class-sgs-header-rules.php` `add_rule()` method. Extend its sanitiser to accept + validate a `behaviour` string key against `Sgs_Header_Behaviours::VALID_BEHAVIOURS`. Add usage examples + a PHPUnit test."
- Context: forbidden values silently drop to none; valid values pass through; commit message follows project conventions; no `Co-Authored-By`.
- Depends on: none
- Parallel with: Task 3
- /qc gate after: `/qc-inline`

**Acceptance:** `wp sgs header_rules add '{"pattern_slug":"sgs/framework-header-default","priority":5,"behaviour":"sticky","conditions":[]}'` adds a rule with behaviour persisted. Invalid behaviour value silently coerces to `none`. PHPUnit test covers both paths.

---

## Task 5 — Stub-pattern decision + execution

**What:** Read `reports/2026-05-20-framework-header-stub-audit.md`. Surface Bean for the decision: delete the 3 stubs (transparent / sticky / shrink) OR keep them as inserter starter packs. Execute decision (delete or annotate-and-keep).

**Why:** Stubs are byte-identical to default-pattern + behaviour rule. Decision was deferred to next session.

**Estimated time:** 15 min (decision + execution)

**Orchestration:**
- Execution: inline (main thread on Opus — Bean decision required)
- Depends on: Task 4 (CLI flag must work so the decision is informed)
- Parallel with: none
- /qc gate after: no — small change, `/qc-inline` if executed

**Acceptance:** Either the 3 stub patterns are deleted from `theme/sgs-theme/patterns/` (preferred per audit) OR each is annotated with a comment explaining "kept as starter pack — set `behaviour` rule manually" (alternative). Decision logged in `.claude/decisions.md` as Decision 10.

---

## Dependency graph

```
Task 1 (/sgs-update, inline Opus, ~10 min)
  ↓
Task 2 (pipeline-state audit, inline Opus, ~15-75 min)
  ↓
Task 3 (recogniser update — sonnet) || Task 4 (CLI flag — haiku)
  [parallel via /dispatching-parallel-agents]
  ↓ /qc-inline on both
Task 5 (stub-pattern decision, inline Opus, ~15 min)
  ↓
Commit + merge to main (Gate 2)
```

Total wall clock: ~2 hours parallel, ~3.5 hours sequential.

---

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architecture decisions inside Tasks 2-3 (recogniser strategy) |
| `/gap-analysis` | Grade Task 3 recogniser output before merge |
| `/lifecycle` | Any skill/agent/pipeline changes |
| `/research` | Auto-routes to right research tier if external info needed |
| `/strategic-plan` | If Task 2 reveals deeper pipeline rework is needed |
| `/sgs-update` | Task 1 — DB + uimax sync |
| `/sgs-clone` | Task 2 — pipeline run if no recent state exists |
| `/sgs-wp-engine` | All SGS framework context |
| `/wordpress-router` | If new WP touchpoints surface during Task 3 |
| `/wp-rest-api` | If recogniser update touches REST endpoints |
| `/delegate` | Pick model per subagent dispatch (Tasks 3 + 4) |
| `/dispatching-parallel-agents` | Tasks 3 + 4 are file-disjoint Sonnet + Haiku parallel |
| `/subagent-prompt` | Write the cold prompt for each subagent dispatch |
| `/qc` | Multi-rater panel before commits touching pipeline / SGS block logic (binding rule blub.db row 255) |
| `/qc-inline` | Lighter self-check during implementation |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block schema queries after Task 1 |
| `python ~/.claude/hooks/search.py` | Web research (auto-routes Brave / Firecrawl / SerpAPI / Tavily) |
| `mcp__plugin_playwright_playwright__browser_*` | Verify recogniser output via live mockup capture |
| `python ~/.claude/hooks/context7.py` | WP 6.9 docs if Task 3 needs core API specifics |
| `mcp-wordpress` REST | Verify block registration on sandybrown |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If Task 3 / 4 expands beyond mechanical plumbing |
| General-purpose sonnet | Task 3 recogniser update |
| General-purpose haiku | Task 4 CLI plumbing |
| `seo-auditor` | Not in scope this session |

## Methodology guardrails (do not skip)

- **Read leftover-buckets.json BEFORE conjecturing.** Binding rule blub.db row 254. Pipeline-state evidence is canonical.
- **Multi-model /qc panel BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db row 255).
- **Per-section cropped pixel-diff** via `scripts/pixel-diff.py --selector .sgs-{section}`, NOT full-page (blub.db row 256).
- **--converter-v2 required** on production orchestrator runs (captured 2026-05-18).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate pixel-diff (captured 2026-05-18).
- **Outcome vs completion** — if a task doesn't hit the stated outcome, do NOT mark it done. Code shipped ≠ outcome achieved.
- **Plain English first** — every major update opens with one-sentence plain-English statement before technical detail.
- **No `git stash` / `git reset` / `git checkout --` / `git restore` / `git clean`** in any subagent prompt (blub.db 2026-05-18).
- **NO `Co-Authored-By` footer** in commits.
- **--no-verify** is LEGITIMATE per project `.git/hooks/pre-commit` documentation for non-visual changes (block.json metadata, PHP logic). The hook itself instructs this.
- **No new hardcoded dicts** in converter/recogniser scripts — check sgs-framework.db tables first (binding rule 2026-05-17).
- **Bean-controlled drafts use SGS-prefixed BEM** (`.sgs-<block>__<element>--<modifier>`).

## Sandybrown / palestine-lives credentials

`.claude/secrets/credentials.yml` (gitignored). Sandybrown admin `Claude` / `JJSO0xscZ38%EcWP)1EU%0V$`. App password for REST API: `U7mv uB22 0ST2 DITH SJFP I9o6`. SSH alias `hd` via `ssh -p 65002 u945238940@141.136.39.73`.
