---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-23-close-out-architecture-programme
generated: 2026-05-22
parent_session: small-giants-wp-2026-05-22-phases-0.5-1-1.5-2-3
primary_goal: "Close out the architecture programme in ONE session, sequentially: (A) unexpected-content audit on live site, (B) Phase 4 /sgs-update rebuild, (C) Phase 7 AI Connectors + WP-skills audit, (D) parking sweep until empty. All four steps are for the SAME next session, in order. Do not dispatch as parallel sessions."
---

# Next session — close out the architecture programme

Invoke `/autopilot` before doing anything else.

This is a SINGLE session with four sequential phases of work. Not four sessions running in parallel. Complete each phase fully before moving to the next. Stop only when the final parking sweep is done.

Architecture programme status: Phases 0/0.5/1/1.5/2/3/5a/5b + 5b-paint-fix + 6 shipped across the 2026-05-21 + 2026-05-22 work blocks. Phase 4 + Phase 7 remain. Plus the unexpected-content audit (new) and the parking sweep (new) bookend the architecture work.

---

## Tooling reference for this session

### Skills (invoke via Skill tool — call by name at the point of use)

| Skill | When to use |
|---|---|
| `/autopilot` | FIRST — at session start, establishes live skill routing + ADHD support |
| `/sgs-wp-engine` | Any SGS-specific build / replication / QA work — Phase 4 + Phase 7 + parking items both touch SGS surface |
| `/wp-block-development` | When Phase 7 / parking items touch individual block code (block.json, attributes, render.php) |
| `/wp-block-themes` | When touching theme.json / templates / parts |
| `/wp-interactivity-api` | If Phase 7's AI connector wiring needs editor-side interactivity |
| `/wp-plugin-development` | For Sgs_Ai_Connector class architecture in Phase 7 |
| `/wp-rest-api` | For Sgs_Ai_Connector REST endpoint registration |
| `/wp-wpcli-and-ops` | For sgs-update-v2.py CLI design (Phase 4) |
| `/wp-performance` | If perf audit needed during parking sweep |
| `/playwright` | Step 0 unexpected-content audit + any visual verification |
| `/visual-qa` | 9-layer QA pipeline on Phase 4 + Phase 7 outputs |
| `/qc-council` | After EACH phase ships — the Bean-mandated gate before moving to next step. Multi-rater validation of fix-shape proposals + empirical baseline measurement |
| `/qc-inline --with-review` | Lightweight 4-model panel for per-commit QC (Sonnet + Haiku + Gemini Flash + Cerebras). Use on each parking-sweep commit |
| `/research-check` | When a WP API question surfaces and you're not 100% sure of the surface (cheap default tier; escalate to `--tier extended` for multi-angle calls) |
| `/library-docs` | For WP / library docs lookup — fast, replaces Context7 |
| `/capture-lesson` | When a new recurring mistake or rule surfaces during the session — 3-layer persistence (workspace + CC memory + blub.db) |
| `/delegate` | Pick the right model for any subagent dispatch (Sonnet vs Haiku vs Gemini Flash vs Cerebras) |
| `/dispatching-parallel-agents` | When Phase 4's stages can fan out (e.g. the 10 canonical-source scrapers in Stage 2) |
| `/subagent-prompt` | Writes cold prompts for subagent dispatches |
| `/strategic-plan` / `/phase-planner` | If Phase 4 spills past this session and needs a fresh per-stage plan |
| `/brain-dump` | If Bean drops a rambling input mid-session |
| `/handoff` | At end of session if reaching the parking-sweep-empty stop condition |

### MCP servers + CLI tools

| Tool | Used for |
|---|---|
| Playwright MCP (`browser_navigate`, `browser_take_screenshot`, `browser_evaluate`, `browser_resize`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_console_messages`) | Step 0 audit + all visual verification |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE any "missing column" claim (binding rule blub.db 272) |
| `python ~/.claude/hooks/wp-blocks.py search "query"` / `schema <name>` / `gaps <name>` / `health` / `tokens` | Block + token + gap lookups |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | SGS Framework knowledge base (blocks / attributes / tokens / gaps / impact / context / weaknesses / deploy / gotchas / stats / patterns / hooks / components / sql) |
| `python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` | Phase 1 + Phase 2 schema assertions — extend with Phase 4 assertions when the new schema_metadata table lands |
| `python ~/.claude/hooks/wp-docs.py validate-hook "hook_name"` / `search-hooks "query"` | Verify hooks before writing PHP code |
| `gh` CLI | GitHub operations (PR, issue, run checks, gh api) |
| WP-CLI (over SSH) | All live WP operations on sandybrown. **Banned**: `wp eval` on `post_content` (use Playwright + `wp.data.dispatch` instead) |
| sandybrown REST + App Password | Verification: `Claude:U7mvuB220ST2DITHSJFPI9o6` Basic Auth (env at `.claude/secrets/sandybrown.env`) |

### Custom agents (delegate via Agent tool — by name)

| Agent | When |
|---|---|
| `wp-sgs-developer` | ALL heavy SGS implementation work — Phase 4 dispatches go here |
| `design-reviewer` | Visual QA delegation |
| `site-reviewer` | Universal site audit |
| `performance-auditor` | Performance / Core Web Vitals checks |

### Enforcement hooks (auto-fire — do not invoke manually)

- `.claude/hooks/qc-on-converter-edit.py` — warns when committing converter/orchestrator/sgs-update edits without `[qc:<run_id>]` in the message. Phase 4 commits MUST cite this marker (Phase 4 creates `sgs-update.py` which is in the watched-paths list).
- `.claude/hooks/no-header-footer-block.py` — hard-rejects creation of `src/blocks/(header|footer|nav)/` directories.
- `.claude/hooks/wp-content-guard.py` — blocks `wp eval` on `post_content` (use Playwright instead).

---

## Step 0 — Unexpected-content audit on live site (BEFORE Phase 4 dispatches)

Bean's directive 2026-05-22: before any Phase 4 work starts, audit the live sandybrown site for "This block contains unexpected content" deprecation warnings on every block and fix each instance. These have been accumulating across multiple sessions as block save outputs changed without deprecation entries being added.

**Where to look:**
1. Page editor — every `page` and `post` post type
2. Site Editor → template parts (header / footer / etc.)
3. **Site Editor → Styles area + Manage Fonts modal** — Bean reported an "unexpected content" error specifically when interacting with the Google fonts area in Styles. Investigate this surface particularly. Possibilities: a saved heading/group block in the Styles preview, a `wp_global_styles` post storing stale serialised block content, or a font collection JSON shape mismatch with WP 7.0. The Font Library API itself (`wp_register_font_collection`) is confirmed live in WP 7.0; the manifest at `plugins/sgs-blocks/assets/font-collections/google-fonts.json` (2.5 MB) is being served correctly via REST. So the error is somewhere downstream — find it.

**How to run the audit:**

1. Launch Playwright. Navigate to `https://sandybrown-nightingale-600381.hostingersite.com/wp-admin/edit.php?post_type=page` (credentials: `.claude/secrets/sandybrown.env`)
2. For each page: open in the block editor, watch for the yellow "This block contains unexpected content" banner. List every block that shows it.
3. For each affected block: click "Attempt Block Recovery" (block toolbar three-dots menu), confirm the recovery, save the post. Recovery uses the block's deprecation chain (`deprecated.js`) to migrate the stored markup forward.
4. If "Attempt Block Recovery" does NOT appear, OR recovery produces a structurally-wrong result, surface the specific block + page to Bean — do NOT manually fix via WP-CLI `str_replace` on `post_content` (banned per CLAUDE.md gotchas).
5. Cover both `page` and `post`. Repeat for `wp_template_part` posts (Site Editor → Patterns → Template parts).
6. For the Site Editor Styles area: open Appearance → Editor → Styles, interact with each section (typography, colors, layout, blocks). Note any "unexpected content" banner. Open "Manage Fonts" modal explicitly — note any error there. If the Google Fonts collection produces an error, capture: which font, what error text, what the browser console shows, what the network tab shows for `/wp-json/wp/v2/font-collections`.

**Acceptance gate (before Step 1 dispatch):** open ~10 representative pages + the Site Editor Styles surface + Manage Fonts modal and verify no "unexpected content" banners appear. Log audit summary at `.claude/reports/2026-05-23-unexpected-content-audit.md` with: pages audited, blocks fixed, blocks needing manual intervention, Site Editor / Manage Fonts findings.

**Time budget:** 30-60 min realistic.

---

## Step 1 — Phase 4 /sgs-update rebuild

After Step 0 audit closes, dispatch Phase 4.

### READ FIRST (mandatory before any Phase 4 dispatch)

**The Phase 4 plan document at `.claude/plans/phase-4-sgs-update-rebuild.md` is the canonical step-by-step source. Read it in full BEFORE composing any subagent prompt or running any code.** That file contains the 9-stage breakdown, per-stage cold prompts, risk mitigations, on-fail behaviour. Do not paraphrase from memory or this handoff — the plan file is the source of truth.

After reading the plan, also read:

1. `.claude/state.md` — current phase status (Phases 0/0.5/1/1.5/2/3/5a/5b all SHIPPED)
2. `.claude/handoff.md` — 2026-05-22 session summary
3. `.claude/plans/phase-4-sgs-update-rebuild.md` — the full step-by-step plan with cold prompts (9 stages)
4. `.claude/plans/2026-05-21-architecture-staging.md` §3 Phase 4 row + §11 Decision 13 + Decision 30 (10 canonical upstream sources)
5. `.claude/decisions.md` D27-D33 — architectural decisions affecting Phase 4
6. `.claude/mistakes.md` top section (blub.db row 283) — the WP-API-verification rule still applies to Phase 4's scrapers

## Critical binding rules (re-violation = recurring correction)

- **blub.db 254** — Read `pipeline-state/<run>/leftover-buckets.json` BEFORE conjecturing about causes
- **blub.db 255** — Multi-model `/qc` panel BEFORE every commit touching converter / pipeline / SGS-block paths
- **blub.db 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`
- **blub.db 272** — Schema enumeration BEFORE any "missing column" claim — `python ~/.claude/hooks/wp-blocks.py dump`
- **blub.db 281** — Every commit on converter / orchestrator / update paths must cite `[qc:<run_id>]` (Phase 0.5 hook warns)
- **blub.db 283 (NEW 2026-05-22)** — Verify WP API surface (curl developer.wordpress.org) before dismissing intelephense warnings. Canary-deploy before mass-deploy.
- No `git stash`, no `git reset --hard`, no `git restore .`, no `git checkout --`, no `git clean -f`, no `--no-verify`, no `Co-Authored-By:`

## Pre-existing uncommitted changes (DO NOT TOUCH)

Check `git status` first. Expected pre-existing state:
- Modified: `plugins/sgs-blocks/includes/lucide-icons.php`, `theme/sgs-theme/styles/mamas-munches.css`, `plugins/sgs-blocks/assets/js/customiser-preview.js`, `plugins/sgs-blocks/includes/class-sgs-header-renderer.php`, `plugins/sgs-blocks/includes/class-sgs-footer-renderer.php` (last 3 are Session B's Phase 5b work — leave alone until the inert-Customiser-output fix)
- Deleted: `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (Spec 15 absorbed into Spec 16; the file deletion just needs committing eventually)
- Untracked: `plugins/sgs-blocks/sgs-framework.db` (working copy of DB), `reports/phase2-variation-conflicts.txt` (from killed Phase 2 yesterday)

Scope every `git add` by exact path. Never `git add .` or `-A`.

## Phase 4 — `/sgs-update` rebuild (this session)

**Plain English:** The current `/sgs-update` has 4 stages. The wp-blockmarkup-mcp and wp-devdocs-mcp servers that originally populated blocks.db and hooks.db have been deleted — only their cached `.db` files remain. There's no automated path to refresh that data when WordPress releases a new version. After this phase: a new 9-stage `sgs-update-v2.py` co-exists with the old script (entrypoint swap only after all 9 stages verify). Pulls from 10 canonical upstream sources (Decision 30). Idempotent (second run = zero DB changes). Per-release verification gate. Drift-check fires when live site's WP version diverges from indexed version.

**Dispatch model:** ~120-240 min total wall-clock. Likely needs 2-3 subagent dispatches across 2 sessions. Plan structure: subagent commits per stage so progress survives session end.

**Strategy options to pick at session open:**

1. **All 9 stages in one subagent dispatch** — let it commit per stage. Highest yield in this session; some risk of mid-stage stop.
2. **Stages 1+7+8 only this session** — the 3 light stages (ports from existing script). ~60-90 min. Leaves Stages 2 (network scrape from 10 sources) + 3 + 5 + 9 for a fresh session.
3. **Stage 2 only this session** — the heavy-lift stage with the 10 canonical-source scrapers + Playwright + rate-limit handling. ~60-120 min. The most architecturally novel stage; benefits from focused attention.

Pick at session open. Recommended: Option 2 (Stages 1+7+8) — get the scaffold + `--dry-run` mode + light ports working, then dispatch Stage 2 in a fresh session with isolated focus.

## Step 2 — Phase 7 AI Connectors + WP-skills audit (after Phase 4 ships + QC council affirms)

### READ FIRST (mandatory before any Phase 7 dispatch)

**The Phase 7 plan document at `.claude/plans/phase-7-wp7-alignment.md` is the canonical step-by-step source. Read it in full BEFORE composing any subagent prompt.** It contains the Sgs_Ai_Connector class shape, the 10 WP-family skills audit checklist, the per-skill code-example verification gate, and the WP-7.1-mid-programme escalation rule.

Phase 7 is the final architecture-programme phase.

WP 7.0 is now live on sandybrown (DB version 60717 → 61833, upgrade shipped 2026-05-22). Native `wp_get_connector()` + `wp_is_connector_registered()` are confirmed available — `Sgs_Ai_Connector` PHP class can wrap real native APIs, not hypothetical shims. The 10 WP-family skills audit (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) is the bigger half of effort. Each skill revision includes a minimal code example tested live on sandybrown.

After Phase 7 commits + QC council affirms — move to Step 3.

---

## Step 3 — Parking sweep (after Phase 4 + Phase 7 + QC council affirms both)

### READ FIRST (mandatory before any parking item)

**Read `.claude/parking.md` in full before starting the sweep.** Bean has been adding parking entries across multiple sessions; the live list will differ from what this handoff snapshots below. Treat the file as authoritative.

Bean's directive 2026-05-22: once Phase 4 ships AND QC council confirms it's totally working, sweep through every open item in `.claude/parking.md` and close them out one by one. Don't stop until parking is empty.

**As of this handoff write, parking.md contains (read the file for the live list):**
- `P-PHASE-5B-INERT-CUSTOMISER-OUTPUT` — SHOULD be SHIPPED (Session B's `0ef032fe`). Verify + remove from parking.
- `P-PHASE-5B-PROPERTY-COVERAGE-AUDIT` — confirm WP 7.0 native theme.json covers every button-preset property; remove shim if uncovered properties = 0.
- `P-UNEXPECTED-CONTENT-BACKLOG` — Step 0 above closes this. Verify + remove.
- `P-EXPLICIT-DEFAULT-STYLE-RETROFIT` — decide explicit-default-per-block retrofit on the 12 Phase 1.5 composite blocks (optional UX polish). If Bean is fine with implicit Default, remove from parking with a rationale note.
- `P-WPCS-FUNCTIONS-PHP-DEBT` — 58 pre-existing WPCS errors in `theme/sgs-theme/functions.php` (short array syntax, multi-line formatting). Run `phpcbf --standard=WordPress`, commit the cleanup.
- Plus the 10 `P-ARCH-PHASE-*` entries from the 2026-05-21 architecture session — most should already be resolved (each maps to a shipped phase). Walk through and remove the resolved ones.

**Order of operations per parked item:**
1. Read the item description
2. Verify whether it's already resolved (commit history + live-state check)
3. If unresolved: do the work
4. Run `/qc-inline --with-review` (4-model panel) on each non-trivial item before committing
5. Update parking.md: either remove the item OR add a "RESOLVED [commit-sha] 2026-05-23" suffix and move to a "## Resolved" section at the bottom

**Stop condition:** parking.md "Opened" sections are empty. All architecture programme work + follow-up work closed.

---

## Reference: Phase 5b + Phase 6 commits

Both shipped by Session B 2026-05-22:
- Phase 5b paint fix: commit `0ef032fe` (Customiser paint targets `header.wp-block-template-part` / `footer.wp-block-template-part`)
- Phase 6: commit `d307c8b0` (markup examples + supports backfill + WP 7.0 audit)

Both completed while Session A was running Phases 2 + 3 + housekeeping.

## Session close — when parking sweep is empty

1. Run `/qc-council` final pass — verify the architecture programme is closed end-to-end (no parking items left, all phase commits passing their gates)
2. Update `.claude/state.md` — mark Phase 4 + Phase 7 SHIPPED with commit SHAs; mark `current_phase` as "architecture-programme-closed"
3. Archive remaining active plans to `plans/archive/`: `phase-4-sgs-update-rebuild.md` → `-complete.md`; `phase-7-wp7-alignment.md` → `-complete.md`
4. Walk `.claude/docs-registry.yaml` — confirm every doc listed there reflects the closed-out state; update where stale
5. Update every numbered spec in `.claude/specs/` affected by Phase 4 + 7 (likely 01 / 02 / 16 / 19 for Phase 4; new spec or update for Phase 7's Sgs_Ai_Connector)
6. Run `/handoff` to write a fresh next-session-prompt (post-architecture-programme — what comes next? client work? new SGS features?)
7. POST session summary to blub.db `/api/knowledge` with `category='session-completion'` + a `programme_closure: true` flag

## Phase status snapshot (start of next session)

| Phase | Status | Commit |
|---|---|---|
| 0 | SHIPPED 2026-05-21 | `aec54882` |
| 0.5 | SHIPPED 2026-05-21 | `6eaadbc2` |
| 1 | SHIPPED 2026-05-22 | `8c56ab6` (skills repo) |
| 1.5 | SHIPPED 2026-05-22 | `cc541e94` |
| 2 | SHIPPED 2026-05-22 | `aca7c98` (skills repo) |
| 3 | SHIPPED 2026-05-22 | `79158da5` |
| **4** | **PENDING (this session)** | — |
| 5a | SHIPPED 2026-05-21 (Session B) | `43a93df9` |
| 5b | SHIPPED 2026-05-21 (Session B) | `60220b13` |
| 5b paint fix | SHIPPED 2026-05-22 (Session B) | `0ef032fe` |
| 6 | SHIPPED 2026-05-22 (Session B) | `d307c8b0` |
| **7** | **PENDING (after Phase 4)** | — |

**Other state to be aware of:** the deleted Spec 15 stub (tombstone for absorbed spec) plus a few modified files (`lucide-icons.php`, `mamas-munches.css`) remain uncommitted pre-existing. They've persisted across multiple sessions and aren't urgent.
