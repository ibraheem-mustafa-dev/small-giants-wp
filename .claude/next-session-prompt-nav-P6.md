Invoke `/autopilot` before doing anything else.

# TRACK 2 · P2.5 Phase 6 — NAV SPEC AUDIT + PURGE, then build-planning

*(Track-specific prompt. The canonical `.claude/next-session-prompt.md` belongs to the co-active Track-1
inline-zero/Spec-35 session — do NOT overwrite it. Live status for both tracks = `.claude/LEDGER.md`.)*

## Identity
You are consolidating the newly-finished SGS navigation design into ONE canonical home and clearing the
scattered remnants, then turning the signed-off spec into a build plan.

## State recap (plain English — re-ground everything)
Track 2 P2.5 (the navigation FULL REWORK **design**) is **DONE and Bean-signed-off.** The single canonical
nav spec is **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` (v1.3)** — through research → a requirements/
tooling inventory → an architecture decision → the spec → a QC council (3 reviewers) + an adversarial
council (6 critics) + gap-analysis (3 expert graders, **B ~3.9**), every finding fact-checked + folded.
**Nothing is built — design-only.** Locked design (do NOT re-litigate): the mega-menu is a page-like
**CPT** attached via the normal **Appearance → Menus** screen (classic menus primary; block `wp_navigation`
menus a Phase-3 extra); the drawer is a **full-screen `<dialog showModal>` modal** you fill with blocks (+
a "show header" toggle); **three mobile collapse modes** (burger→drawer / priority+ "More" / bottom-tab-bar);
nav is **decoupled from the header** (nav→header only); everything **crawlable / no-AJAX** for Google + AI
search; `labelCollapse` is BUILT (reuse) + the Responsive-Visibility extension covers per-device show/hide.

## MANDATORY READING (in full, before Phase-6 work)
1. `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` — the new canonical spec (esp. §1a "pointers to repoint",
   §7 phasing, §12 resolved decisions). Read end-to-end.
2. `.claude/reports/2026-07-18-P2.5-adversarial-council-synthesis.md` + the three `-grade-*.md` — the gate
   findings + the remaining build-time spikes (mega-attach; iOS `<dialog>` scroll-lock).
3. `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` + `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md`
   §S9 — the docs audited + purged/repointed in Task 1.

## Task 1 — Phase 6: SPEC AUDIT + PURGE (Bean's explicit end-of-P2.5 requirement — do NOT skip)
**What:** make Spec 36 the single home for navigation; delete/strip the scattered remnants.
**Why:** Bean: scattered nav content "creates a lot of confusion" — one home, delete the rest.
**Orchestration:** dispatch parallel `Explore` (or `general-purpose`) subagents to read EVERY file in
`.claude/specs/` and report any menu/nav/navbar/drawer/mega content. Then, INLINE for Bean: list every nav
feature found + a plain-English recommendation each — already-in-Spec-36 (confirm) / reword-for-clarity /
add-to-Spec-36 (with why). Confirm NOTHING listed as a nav feature anywhere is ignored. **Then PURGE
(DELETE, no archiving):** strip scattered nav sections from multi-topic docs; **delete Spec 34 whole** (nav
is its central topic). **Repoint every §1a pointer** (Spec 17 FR-S9-4/5/8/11/2, Spec 33 Part 2, P2 §5.4/§14,
`block-migration-DONE-checklist.md`) + the specs README/index.
**/qc gate after:** `/qc-inline` the purge (nothing load-bearing lost; every pointer resolves).
**Acceptance:** every nav feature across the specs is represented in Spec 36 or consciously dropped-with-
reason; Spec 34 deleted; all pointers repointed + resolve; Bean's eye on the feature list before deletion.

## Task 2 — Build-planning (only after Phase 6 + Bean sign-off)
**What:** turn Spec 36 into a phased build plan via `/strategic-plan` + `/phase-planner`, **model-tier per
step** (Bean's tiers: 0 = scriptable / 1 = Haiku / 2 = Sonnet / 3 = Opus-inline), starting from **Phase-1
MVP = Mama's end-to-end** (classic-menu flat bar + burger + full-screen modal drawer + converter-emit).
**Why:** gap-analysis + Ship-PM flagged "no build order" as the one structural gap — fix it in planning.
**Must include:** the **mega-attach build-spike** (Appearance→Menus surfaces the `sgs_mega_menu` CPT as a
menu item + the walk detects it) as an early cheap pre-registered check; the FR-36-18 cutover of the 2 live
production instances; the pre-registered gate-1/gate-2 exits.
**Depends on:** Task 1. **Acceptance:** a phase plan with per-step model-tier + acceptance signals; Bean
sign-off before any build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — routing + ADHD support |
| `/brainstorming` | any architectural/feature decision surfaced in the audit |
| `/gap-analysis` | grade the build plan before Bean sign-off |
| `/lifecycle` | if any skill/agent/pipeline change is needed |
| `/research` | if an audited nav feature needs a best-practice check |
| `/strategic-plan` · `/phase-planner` | Task 2 build-planning |
| `/spec-writer` | if the audit adds/rewords a Spec 36 requirement |
| `/sgs-db` · `/wp-blocks` | DB-first — verify block/attr/variant facts, never guess |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| GitHub MCP | verify any WP-core/platform claim against source (§15.7 verify-not-assume) |
| Playwright / chrome-devtools | only if a build-spike needs live verification |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` | Task 1 — read all `.claude/specs/*` for nav content fast (parallel) |
| `wp-sgs-developer` | ground the mega-attach spike + any WP-mechanism check against live schema/source |

## Guardrails (carry-forward structural defences — do NOT drop)
- **STOP catalogue + pre-flight ritual:** read `.claude/STOP-CATALOGUE.md` before acting (uncapped, D101).
- **VERIFY don't assume:** every platform/WP claim checked against SOURCE or live code before relying on it
  (§15.7; this session caught 3 "it exists" errors + a labelCollapse over-correction by grepping).
- **Fact-check council/grader findings** against ground truth before acting.
- **Shared worktree:** `git status` + branch before touching tracked files; **commit path-scoped to `main`
  via an isolated worktree** (`git worktree add --detach <tmp> origin/main`), NEVER `git checkout main`
  here, NEVER `git add -A`; re-check the branch in the SAME command as the commit (STOP-RECHECK-BRANCH).
  Do NOT overwrite the co-active track's canonical `.claude/next-session-prompt.md`.
- **DELETE means delete (Phase 6):** no archiving Spec 34 once Spec 36 absorbs it.
- **Design-only until Bean signs off the build plan.**
- UK English · DB-first (never hardcode counts) · read Spec 36 in full each nav session.
