---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-23-phase-4-sgs-update-rebuild
generated: 2026-05-22
parent_session: small-giants-wp-2026-05-22-phases-0.5-1-1.5-2-3
primary_goal: "Execute Phase 4 — /sgs-update rebuild. 9-stage holistic refresh script (sgs-update-v2.py) co-existing with old sgs-update.py. ~120-240 min build. The largest single phase in the architecture programme. Plan + cold prompt in .claude/plans/phase-4-sgs-update-rebuild.md."
---

# Next session — Phase 4 /sgs-update rebuild

Invoke `/autopilot` before doing anything else.

You are picking up a substantially-advanced architecture programme. Phases 0/0.5/1/1.5/2/3 + Session B's 5a/5b are all SHIPPED. The remaining critical-path work is Phase 4 (`/sgs-update` rebuild, this session), Phase 6 (markup examples + WP 7.0 audits, after 4), and Phase 7 (AI Connectors + skills audit, after 6). One latent bug from Session B's 5b also needs the Option A fix (CSS custom properties on :root for the inert-Customiser-output issue).

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

## After Phase 4 ships

Two follow-up items remain on the critical path:

1. **Phase 5b inert-Customiser-output fix** — Session B's renderers target `.wp-site-header`/`.wp-site-footer`; SGS template parts use generic wrappers. Fix: renderer emits `:root { --sgs-header-bg: ...; }` based on saved theme_mods; theme.json consumes the vars. Documented at `.claude/parking.md → P-PHASE-5B-INERT-CUSTOMISER-OUTPUT`. ~30 min.
2. **Phase 6** — markup examples + supports backfill + WP 7.0 block.json audits + Lucide REST. ~140-260 min. Now unblocked since Phase 1.5 shipped.
3. **Phase 7** — AI Connectors + 10 WP-skills audit. ~75-165 min. After Phase 6.

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
| 4 | PENDING (this session) | — |
| 5a | SHIPPED 2026-05-21 (Session B) | `43a93df9` |
| 5b | SHIPPED 2026-05-21 (Session B) — latent bug | `60220b13` |
| 5b-fix | PENDING (Option A: CSS vars on :root) | — |
| 6 | PENDING (after Phase 4) | — |
| 7 | PENDING (after Phase 6) | — |

Also pending from this session: 5 pre-existing modified files + 2 untracked files left untouched. The deleted Spec 15 stub can be staged + committed any time (it's just a tombstone for an absorbed spec). The Session B Phase 5b files need the inert-output fix BEFORE committing — they're functional but the rendered output doesn't apply.
