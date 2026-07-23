Invoke /autopilot before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35/31 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/mistakes.md`, and
> `next-session-prompt-spec35*.md` may carry UNCOMMITTED changes that are **not yours**. Path-scope
> every commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.
> **The shared prebuild is RED** on the co-active `sgs/tabs` `tabIndicatorColour` DB↔block.json finding
> (STOP-24). Build via `npx wp-scripts build --experimental-modules --webpack-copy-php` directly; the
> SGS visual-diff pre-commit gate blocks any touch to a block's render.php/block.json/edit.js without a
> passing visual-diff report — its OWN message sanctions `--no-verify` for logic-predominant changes
> (STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC). Do NOT reseed their DB; do NOT baseline their finding.

---

# Next session — SGS header/footer/nav (Specs 36 + 37)

You are the engineer-orchestrator for the SGS header/footer/nav programme (Specs 36 + 37). Last session
shipped the footer link-list (FR-36-26c, LIVE-VERIFIED) and found that header scroll behaviours are dead.

## First action (smallest step, <5 min, zero deps)

```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1
```
Expect HEAD at/after `d08d3149` (co-active commits may be higher) and D-ceiling ≥ D375. Then read the LEDGER.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status (its `⭐ CURRENT` block covers D374–D375).
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue (69 entries) + pre-flight ritual.
   **Answer the ritual inline before your first Write/Edit or first agent dispatch.**
3. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** — **FR-37-13** IN FULL (the hide-on-scroll bug + the
   approved fix B) + **FR-37-7** IN FULL (the starter picker). ⛔ Specs 17 and 34 are DELETED — never cite.
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — **FR-36-3** (the CPT starter picker, SAME build as
   FR-37-7) + **FR-36-26c** (BUILT last session — reference for the patterns).

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header/footer in a findable admin screen and it appears live — and
now a footer can carry titled link-lists (FR-36-26c shipped + live-verified). **Next USP up:** picking a
starter STYLE for a header/footer/mega-menu from a visual card grid (FR-37-7) — the single highest-leverage
unbuilt surface; the 9 legacy patterns are re-targeted and waiting for it.

## Task 1 — FR-37-13 hide-on-scroll fix B (semantic `<header>`) — DESIGN-GATE FIRST

**What:** render the SGS site header AS a semantic `<header>` element with a stable class that both
`header-behaviours/view.js:42` `getHeaderEl()` and `assets/css/header-behaviours.css:60/108/164` target.
Today the header is a `<div class="wp-block-sgs-site-header">`, so all three JS scroll behaviours
(transparent, shrink, hide-on-scroll) are silently dead (D375, live-proven). Fix B revives all three AND
adds the missing banner landmark (a WCAG win — the site has zero `<header>` landmarks today).
**Why:** the last dead header behaviour, Bean-approved (Option B over the quick selector-broadening A).
**Estimated time:** design-gate ~45 min, build ~30 min.

**Orchestration:**
- Execution: **design-gate FIRST** (`/frontend-design` + `/brainstorming` → Bean sign-off — it changes the
  header ROOT element, high blast radius), then delegated SONNET build.
- Brief: give the implementer the D375 evidence + the two selector sites (view.js:42, header-behaviours.css
  60/108/164). "EXECUTE YOURSELF, do NOT delegate" (D362).
- Depends on: nothing. **/qc-council after** (blub.db 255).
- **Acceptance:** the SGS header renders as `<header class="wp-block-sgs-site-header …">`; with header CPT
  1655 (hide-on-scroll ON, exists on the canary) set active via the admin "Set as active" action (D360),
  the header hides on scroll-down and returns on scroll-up on a REAL desktop browser (classic scrollbars —
  STOP-SCROLLBAR-LOCK); transparent + shrink also verified live; **then open the drawer WHILE scrolled**
  (D323 transformed-ancestor interaction — a transform on the header can break a fixed/top-layer descendant;
  the drawer's body-reparent likely covers it but that is unobserved). axe clean; no new landmark/region
  regression. Clear the active header back to Proof Header 1570 afterwards.

## Task 2 — FR-37-7 starter-template picker (= Spec 36 FR-36-3) — DESIGN-GATE FIRST

**What:** the shared visual starter-picker for `sgs_header` / `sgs_footer` / `sgs_mega_menu` — a card grid
of styles with preview-before-apply + a "Start from scratch" card. **SAME build as Spec 36 FR-36-3 — schedule
it ONCE, never twice.** Gates FR-37-8's library, FR-37-31's second half, FR-37-28.
**Why:** the single highest-leverage unbuilt item; the 9 legacy patterns wait on it.
**Estimated time:** design-gate ~45 min, build ~45 min after sign-off.

**Orchestration:**
- Execution: **design-gate FIRST** (`/brainstorming` → Bean sign-off; picker preview cards are draft-authoring
  — load `/frontend-design` if you author them), then delegated SONNET build.
- Depends on: nothing blocks it. **/qc-council after.**
- **Acceptance:** creating a post of each of the 3 CPT types shows the same picker; choosing a style produces
  that style's block tree (verified by reading saved `post_content`, not editor state).

## Task 3 — Spec 36 Phase 2 (mega CPT + Indus + rich desktop/mobile modes) — larger, later

**What:** the mega-menu CPT spine (FR-36-3/4/5/8/10/17/9a — strictly sequential). **Why:** the desktop
disclosure + mega panels. **Estimated time:** multi-session. Design-gate the spine first.

## Dependency graph

```
Task 1 hide-on-scroll fix B (design-gate → sonnet build)   ← independent
Task 2 starter picker (design-gate → sonnet build)          ← independent, highest-leverage
         ↓ /qc-council each
commit (path-scoped, branch re-checked in SAME command, --no-verify for logic per the visual-diff gate)
Task 3 mega spine — later, its own design-gate
```

## Methodology guardrails (do not skip)

- **Build via `npx wp-scripts build` directly** (shared prebuild RED on co-active sgs/tabs); commit
  `--no-verify` ONLY for logic-predominant changes (the visual-diff gate's own sanction), path-scoped.
- **Deploy on a shared worktree via an ISOLATED worktree** — commit first, `git worktree add --detach <sha>`,
  copy `build/` + any changed `includes/` in, `--skip-build`. Never junction node_modules. Never `--allow-dirty`.
  This keeps the co-active `lucide-icons.php` WIP out of your deploy.
- **Checksum every deploy** — `md5sum` changed files local↔server BEFORE measuring; `[verify] HTTP 200`
  passes on ANY working SGS page incl. old code (STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **A page with 2+ instances of the same block is a MANDATORY live-verify case** (NEW D374 —
  STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP: a top-level fn in render.php redeclares on the 2nd instance;
  a fatal every gate + both reviewers missed, only a 5-instance live render caught).
- **A fix's CODE can be correct and still not fire / be dead** — verify EMISSION/RENDER on the LIVE page
  (R-31-11/R-31-13), never a green build or a code-read (the "chain proven by code-read" note was the trap
  that hid hide-on-scroll being dead for weeks).
- **Prove a thing is MISSING before adding it** (D369) against rendered output (`curl|grep`, DOM), not one
  source file — shared wrappers emit markup the block file never mentions.
- **Negative control, or the test is vacuous** — "would this still pass if the feature were absent?"
- **Measure on the element that ACTUALLY holds the value** (grids live on `.sgs-container__inner`).
- **Fix a11y/contrast at the DRAFT/theme source, never a per-block carve-out** — the Mama's primary
  `#e68a95` fails contrast as text (`P-MAMAS-PRIMARY-CONTRAST`); that is a theme-snapshot fix, not a block one.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every deferral to a named spec STAGE.
- **/qc multi-rater BEFORE every commit** touching SGS block / converter logic (blub.db 255). It caught 2
  HIGH defects on the icon-list build last session.
- **WP_DEBUG_DISPLAY must stay false** on staging.

## Known-open, NOT blockers (do not re-litigate)

- **`P-HEADER-BEHAVIOURS-DEAD-SELECTOR`** (D375) — this IS Task 1; fix B approved, design-gate first.
- **`P-MAMAS-PRIMARY-CONTRAST`** — Mama's brand pink fails contrast as text; theme-snapshot fix, site-wide.
- Both sites show GENERIC proof headers (sandybrown #1570/#1571; palestine-lives #360) — admin "Clear active"
  restores. Real branded headers come via the Spec 33 Part 2 cloning pipeline.
- Two unnamed `<main>` elements cause the framework `landmark-unique`/`region` axe hits (NOT the nav) — a
  separate open theme defect.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX (planted cloning TEST CASE).
- Canary fixtures (reusable): FR-36-26c pages **1720** (5 icon-list cases) + **1721** (aria-current proof);
  header CPT **1655** (hide-on-scroll); menus **98** (T1 Verify, 4 links) / **99** (T1 Big, 55).
- Co-active `sgs/tabs` db-consistency finding + `P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS` — owned by the
  Spec-35 track. Bypass with the visual-diff gate's `--no-verify`. Do NOT baseline.

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or first dispatch)

1. Read the governing specs (37 FR-37-13/FR-37-7 + 36 FR-36-3 in full) + the LEDGER + STOP-CATALOGUE?
2. Did the prior session's work actually LAND? (Read the LEDGER; verify HEAD ≥ d08d3149, D-ceiling ≥ D375.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for any
   scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling + branch verified in the SAME command as the commit? (STOP-RECHECK-BRANCH.)
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. Am I trusting a block-attr filter gate without proving it FIRES on a real page? (D359.)
17. Am I about to DELETE anything on a live site without opening it first to confirm what it is? (D362.)
18. Does every implementer dispatch say "EXECUTE YOURSELF, do NOT delegate"? (D362.)
19. Am I setting option-driven state in the context that READS it (admin action / live domain), not a raw
    `wp option update` from an arbitrary CLI path? (D360.)
20. Have I verified this agent's "done" against the real repo / live state, rather than believing the report?
21. Am I proving a thing is MISSING before adding it — against rendered output, not one source file? (D369.)
22. Am I verifying a fix EMITS/RENDERS, not just that the emit code exists? (D371 — measure on the element
    that holds the value.)
23. **Am I live-verifying with 2+ instances of the same block on one page, and NOT declaring a reusable
    function at the top level of a per-render render.php?** (NEW D374 — a fatal every gate + both reviewers
    missed; only a multi-instance live render caught it.)

## Design guardrails — TRIMMED (both tasks author design drafts: picker preview cards + the header shell)

The full design-programme guardrails (brand-accent-as-ground, contrast-as-pairing, transition-only-
transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-tokens, real-`<img>`
slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation, scrollbar-test-INCONCLUSIVE)
live UNCUT in `STOP-CATALOGUE.md`. **Both tasks author a design draft → load `/frontend-design` FIRST.** Two
apply to any header/drawer work (Task 1): `dialog.close()` kills exit animations, and never bank a
scrollbar-dependent test from the headless harness (use a real desktop browser).

## Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — design-gate BOTH tasks before building |
| `/gap-analysis` | ALWAYS — grade dispatched agents' output before acting |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes the research tier |
| `/strategic-plan` | ALWAYS — Task 2 is a shared new surface |
| `/frontend-design` | Before authoring the picker cards / the header shell draft |
| `/delegate` | Pick the model per dispatched task |
| `/qc-council` | Multi-rater before any SGS-block commit (blub.db 255) — it earned its keep last session |
| `/qc-inline` | Inline acceptance gate |
| `/adversarial-council` | Pre-build stress-test — include a code-grounded seat (D358) |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What for |
|---|---|
| `playwright` | Live DOM verification (R-31-11) — the canonical proof; drawer/axe/scroll/stack gates |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — DB is authoritative, never a prose count |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 1 + Task 2 builds (add the EXECUTE-YOURSELF line, D362) |
| `code-reviewer` / `general-purpose` | Pre-commit multi-rater review (it caught 2 HIGH defects last session) |
| `test-and-explain` | Plain-English confirmation for Bean that a feature works |
