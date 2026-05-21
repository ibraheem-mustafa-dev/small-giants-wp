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

## Phase A — Unexpected-content audit on live site (BEFORE Phase 4 dispatches)

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

**Acceptance gate (before Phase B dispatch):** open ~10 representative pages + the Site Editor Styles surface + Manage Fonts modal and verify no "unexpected content" banners appear. Log audit summary at `.claude/reports/2026-05-23-unexpected-content-audit.md` with: pages audited, blocks fixed, blocks needing manual intervention, Site Editor / Manage Fonts findings.

**Time budget:** 30-60 min realistic.

---

## Phase B — Phase 4 /sgs-update rebuild

After Phase A audit closes, dispatch Phase 4.

## Mandatory reads BEFORE Phase 4 dispatch

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

## Phase C — Phase 7 AI Connectors + WP-skills audit (after Phase 4 ships + QC council affirms)

Phase 7 is the final architecture-programme phase. Cold prompt at `.claude/plans/phase-7-wp7-alignment.md`.

WP 7.0 is now live on sandybrown (DB version 60717 → 61833, upgrade shipped 2026-05-22). Native `wp_get_connector()` + `wp_is_connector_registered()` are confirmed available — `Sgs_Ai_Connector` PHP class can wrap real native APIs, not hypothetical shims. The 10 WP-family skills audit (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) is the bigger half of effort. Each skill revision includes a minimal code example tested live on sandybrown.

After Phase 7 commits + QC council affirms — move to Phase D.

---

## Phase D — Parking sweep (after Phase 4 + Phase 7 + QC council affirms both)

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

## Session close — when Phase 4 ships

1. Run `/qc-council` or `/qc-inline --with-review` on the Phase 4 commits (binding rule 255)
2. Update `.claude/state.md` Phase 4 to SHIPPED with commit SHA(s)
3. Archive `.claude/plans/phase-4-sgs-update-rebuild.md` to `plans/archive/phase-4-sgs-update-rebuild-complete.md` if all 9 stages landed; leave in-place if partial
4. Run `/handoff` to write a fresh next-session-prompt for Phase 5b-fix or Phase 6
5. POST session summary to blub.db `/api/knowledge` with `category='session-completion'`

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
