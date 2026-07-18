---
doc_type: next-session-prompt
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild (parallel to Track 1 = Indus/product/inline-zero)
phase: P2 — Builder design-gate (design only, NO building)
generated: 2026-07-18
plan: .claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md
p1_decision: .claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md
---

Invoke `/autopilot` before doing anything else.

# TRACK 2 · P2 — Builder design-gate (the visual builder's UX design)

## Mission (plain English)
P1 LOCKED the architecture (build our own header/footer/nav, clean rebuild, rich capability behind a
simple default, converter-emittable). **P2 designs the visual BUILDER** — the Site-Editor panel a
non-coder client uses to configure their header/footer/nav — as a design-gate doc, and runs it through
`/adversarial-council` BEFORE a single line of code. **This session is P2 ONLY: design, no building.**
One phase per session; do not drift into P3+.

**Do NOT touch Track 1's files.** SHARED WORKTREE with co-active Track 1 (brand-strip) + Track C
(core-block-migration). Before editing ANY tracked file: `git status` + check `.git/MERGE_HEAD`, and
recheck `git branch --show-current` in the SAME command as any commit (STOP-RECHECK-BRANCH — this
worktree drifts onto other branches mid-session). Commit path-scoped to `main` via an isolated worktree
(`git worktree add <tmp> main`) — never `git add -A`, never switch this worktree's branch.

## Why this track exists (the 6 recurring root causes — each is a HARD GATE on every phase)
1. **No research → corner-cutting** → research the builder-UX patterns before designing (competitor builder UX already surveyed in P1's council — reuse it; `/ui-ux-pro-max` for pattern intelligence).
2. **"Done" checked against source not live** → design-only phase, but any claim about the current blocks' behaviour must be checked against LIVE code/DB, not other docs.
3. **Hidden parallel systems / spec fiction** → grep plugin + theme + `build/` + webpack + DB for a second system before assuming any current control/attr exists; P1's Stream E mapped this — confirm, don't assume.
4. **Hardcodes past linters** → note any theme-CSS/webpack/breakpoint hardcode for P3's lint scope.
5. **Deferred-QC-as-signoff** → the P2 design-gate doc is not "done" until `/adversarial-council` + `/gap-analysis` pass and Bean signs off.
6. **Architecture/design with no design-gate** → the builder UX goes through `/adversarial-council` (Rule 7, high-blast-radius) before P3 builds anything.

## MANDATORY READING (in full, before P2 work)
1. `.claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md` — **THE locked model.** Read §0a (3-way requirement), §2 (cascade+Advanced, rich-simple), §6 design principles **DP1–DP6**. P2 designs the builder OVER this — do not re-litigate it.
2. `.claude/reports/2026-07-18-P1-adversarial-council-gate1.md` — the Gate-1 council findings P2 must honour (esp. C4 capped Advanced list, C6 vertical-slice-first, C7 operator-simplicity test).
3. `.claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` — roadmap + the 6 gates.
4. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 + `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` — the live, verified-truthful specs (FR-34-5 marked NOT-BUILT; FR-S9-6 = the editor device-switcher spec P2 extends). These are now verified accurate — no longer "treat as suspect".
5. `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (Part 2 = header/footer clone) — cross-reference for DP6 (converter-emittable).

## Task 1 — P2: Builder design-gate

**What:** Write the builder-UX design-gate doc — the Site-Editor panel design a non-coder uses to
configure header + footer + nav (bar + drawer, all 3 breakpoints) over the locked P1 model — then
`/adversarial-council` it before P3 builds.
**Why:** the builder was promised and never built; the design-gate that would have caught "no builder
shipped" never existed. This is that gate. Operator simplicity is the north-star.
**Estimated time:** 1 session (design + council; Opus synthesises).

**Orchestration:**
- Execution: mostly inline (Opus — design synthesis); delegate the competitor-builder-UX teardown to `design-reviewer` if a fresh visual pass helps (P1 already surveyed the capability matrices — reuse, don't re-run).
- **Must incorporate the P1 design principles as HARD constraints:**
  - **DP1** — every responsive on/off capability is a tiered tri-state (`inherit/on/off`); the panel must express "inherit from desktop" as a real, visible control state.
  - **DP2 + DP2a** — the "Advanced" override surface is a NAMED, CAPPED list (design the exact list); a11y/contrast feedback is INFORMATIONAL-ONLY (a passive editor/admin notice — never a gate, never auto-enforce, never agent-wired). Memory `a11y-validation-feedback-informational-not-gate`.
  - **DP4** — design the FIRST vertical slice (one capability, end-to-end) that ships early to de-risk + measure real build-cost. Recommend the drawer settings (FR-34-5) as the slice (isolated, no 5-block retrofit).
  - **DP5** — define the operator-simplicity pass/fail test (e.g. non-coder sets sticky + phone + drawer content in <3 min without opening Advanced).
  - **DP6** — the panel + attribute design must make every capability CONVERTER-SETTABLE (attribute shapes map to features the converter extracts from a scraped header); the DP4 slice must PROVE it by cloning a real header into the new block, not hand-building.
- **Harvest (study, don't fork):** Kadence's numeric breakpoint-switcher + icon device-value-switcher UX; GenerateBlocks' server-side per-device content fork (no dead DOM). Reference patterns for the panel, built with standard `@wordpress/components`.
- Ground against LIVE schema: `/sgs-wp-engine` + `/wp-blocks` + `/sgs-db` — verify every current attr/block before designing changes.
- **Gate (before P2 closes):** `/adversarial-council` on the builder design (Rule 7) + `/gap-analysis` on the P2 output. Bean signs off (Gate 2) before P3 is scoped.
- **Depends on:** P1 (done). **Parallel with:** Track 1 (independent files). **/qc gate after:** adversarial-council + `/qc-inline` on the design-gate doc + Bean sign-off.

**Acceptance:** a written builder-UX design-gate doc (the Site-Editor panel design over the P1 model,
honouring DP1–DP6), adversarial-council-passed + gap-analysis-graded + Bean-signed-off. NOT "a design
sketched" — locked enough that P3 can build the model + P4 the panel with zero re-interpretation. Any
deferral mapped to a named roadmap phase (STOP-29), never "out of scope".

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — routing + ADHD support |
| `/brainstorming` | design the builder UX (design mode) over the locked P1 model |
| `/gap-analysis` | grade the P2 design-gate output before Bean sign-off |
| `/lifecycle` | if any skill/agent/pipeline change is needed |
| `/research` (`/research-check` · `/ui-ux-pro-max`) | builder-UX pattern intelligence (reuse P1's council survey first) |
| `/strategic-plan` · `/phase-planner` | if P2 needs re-scoping or to hand P3 a step plan |
| `/adversarial-council` | stress-test the builder design before sign-off (Rule 7) |
| `/qc-inline` | QC the design-gate doc against the 3-way end-goal before closing |
| `/spec-writer` | when writing/extending the builder-UX design-gate doc + FR-S9-6 |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (`browser_*`) | inspect competitor builder UIs / current SGS editor panel behaviour |
| `search.py` / SerpAPI | any residual builder-UX pattern research |
| GitHub MCP | grep the codebase for hidden parallel systems (root cause #3) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `design-reviewer` | competitor builder-UX teardown (visual) + the panel design critique |
| `wp-sgs-developer` | ground the design against live SGS block/attr schema |
| `Explore` | locate current header/footer/nav editor code (`edit.js`, inspector panels) fast |

## Guardrails (do not skip — carried forward + this track's gates)
- **P2 is DESIGN ONLY. No building.** Do not drift into P3+ (one phase per session).
- **Shared worktree:** `git status` + `.git/MERGE_HEAD` before touching any tracked file; commit path-scoped (`git commit -m "..." -- <paths>`), never `git add -A`; recheck branch in the SAME command as the commit; commit to `main` via an isolated worktree; never switch this worktree's branch. Do not touch Track 1's files (`brand-strip/*`, `lucide-icons.php`, page-13 backups) or Track C's.
- **The 6 anti-failure gates apply to P2** — especially research-before-design, verify-against-live-not-docs, grep-for-hidden-systems, no-deferred-QC-as-signoff, design-gate-before-build.
- **Honour the P1 lock:** DP1–DP6 are locked constraints, not open questions. DP2a (informational-only a11y) and DP6 (converter-emittable + prove-in-slice) are Bean-locked — do not soften them.
- **Model:** Opus high/max for the design synthesis + council; delegate visual teardown to `design-reviewer` (Sonnet).
- **North-star:** ONE coherent system; operator simplicity is the primary success criterion, however rich the model underneath.
