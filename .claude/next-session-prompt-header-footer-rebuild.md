---
doc_type: next-session-prompt
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild (parallel to Track 1 = Indus/product/inline-zero)
phase: P1 — Research → Architecture (MERGED; research delegated, synthesis same session)
generated: 2026-07-17
plan: .claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md
---

Invoke `/autopilot` before doing anything else.

# TRACK 2 · P1 — Research → Architecture (the header/footer/nav rebuild)

## Mission (plain English)
The header/footer/nav system half-works and half-lies: the blocks are live, but the visual
**builder** was promised and never built, the specs have carried **false claims** that misled
every session, and features shipped "done" that weren't. This track rebuilds it properly. **This
session is P1 ONLY: do the deep research, then turn it straight into the architecture decision —
NO building.** One phase per session; do not drift into P2+.

**Do NOT touch Track 1's files.** This is a SHARED WORKTREE with a co-active Track 1 session
(Indus / inline-zero rollout). Before editing ANY tracked file: `git status` + check
`.git/MERGE_HEAD`. Commit path-scoped only. A change you didn't start is not yours.

## Why this track exists (the failure pattern — read the report, don't repeat it)
Six root causes recurred for ~6 weeks (full report + receipts in the plan §2). Each is now a
**hard gate on every phase** — P1 must honour all six:
1. **No research → corner-cutting** → produce the research artefact BEFORE any design decision.
2. **"Done" checked against source, not the live page** → (does not apply to P1 — no build — but the specs you truth-up must be checked against LIVE code/DOM, not other docs).
3. **Hidden parallel systems / spec fiction** → grep plugin + theme + `build/` + webpack + DB for second systems; confirm every class/file/attr a spec names actually EXISTS before trusting it.
4. **Hardcodes past linters** → note every theme-CSS / webpack / breakpoint hardcode you find for P3's lint scope.
5. **Deferred-QC-as-signoff** → P1's outputs (research matrix, model, truthed specs) are not "done" until adversarial-council + gap-analysis pass.
6. **Architecture with no design-gate** → the capability-parity model goes through `/adversarial-council` before it's locked.

## Gate 0 (do this FIRST, ≤5 min): validate the plan itself
Run `/gap-analysis` on `.claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md`
+ a cold reviewer. If it grades < B, fix the plan before starting P1. This is the anti-corner-cutting
discipline applied to the plan — nothing gets researched-then-built on an unvalidated map.

## MANDATORY READING (in full, before P1 work)
1. `.claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` — this track's roadmap + the 6 gates.
2. `.claude/plans/2026-07-16-header-footer-nav-builder-REALIGN-brief.md` — Bean-approved goals A/B/C/D + the research mandate.
3. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 (FR-S9-1..11) — but TREAT ITS STATUS CLAIMS AS SUSPECT until verified against live code (it has carried retracted fiction).
4. `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` — drawer; FR-34-5 drawer settings subsumed into the capability-parity model (don't build twice).
5. `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (Part 2 = header/footer clone — P6, cross-reference).

## Task 1 — P1: Research → Architecture (the whole session)

**What:** competitor + core-parity + CRO research → build-vs-adopt verdict → lock the
capability-parity data model → truth-up Spec 17 §S9 + Spec 34 to live reality.
**Why:** the builder is a UI over the model; the model can't be defined without the research;
and the specs must stop lying before anyone builds on them.
**Estimated time:** 1 session (research parallelised; Opus synthesises).

**Orchestration:**
- **Research (delegated, parallel — Sonnet):** dispatch via `/dispatching-parallel-agents` + `/research-council` / `/deep-research`:
  (a) **competitor builder matrices** — Spectra, Kadence, Astra, Blocksy, Elementor, Bricks, GenerateBlocks: where the builder UI lives + discoverability; header modes (sticky/transparent/shrink + partial variants + separate-sticky-config); per-breakpoint content+settings model; mega-menu; mobile drawer.
  (b) **`core/navigation` + `core/site-logo` + `core/template-part` parity audit** — every capability SGS nav must match or explicitly supersede.
  (c) **reviews / complaints / CRO** — `site:reddit.com`, `site:wordpress.org/support`, G2, Trustpilot per competitor + "review/complaint/hate/missing"; conversion-impacting header patterns (sticky CTA, mobile call button, cart, trust signals).
  (d) **build-vs-adopt** — is there a Site-Editor/FSE **block-based** header/footer builder worth adopting (feasibility + licensing + fit)? If yes, P2/P4 may collapse — this answer gates them.
- **Synthesis (inline, Opus high/max):** fold into a **feature/gap matrix + prioritised adopt/improve/innovate list**, then **lock the capability-parity attribute model** (same capability SET on bar + drawer + each of the 3 breakpoints; INDEPENDENT content/values per surface + breakpoint — NOT identity). Extend FR-S9-6's 17 already-tiered attrs; do NOT retrofit the 78 flat attrs blindly (D328 unsafe — design-gate first).
- **Ground it:** `/sgs-wp-engine` + `/wp-blocks` + `/sgs-db` — verify every current attr/block/behaviour against LIVE schema before proposing changes (root cause #3).
- **Truth-up the specs:** reconcile Spec 17 §S9 + Spec 34 to live reality — every FR is BUILT+live-verified, or NOT-STARTED with a reason; kill every false line; run a `lint-spec-drift`-style check (no claim references a non-existent class/file/attr).
- **Gate (before P1 closes):** `/adversarial-council` on the locked model (Rule 7, high-blast-radius); `/gap-analysis` on the P1 output. Bean signs off the model (Gate 1) before P2 is scoped.
- **Depends on:** Gate 0 (plan validated). **Parallel with:** Track 1 (independent files). **QC gate after:** adversarial-council + Bean sign-off.
- **Acceptance:** a written architecture decision (the capability-parity model + build-vs-adopt verdict) + truthed-up Spec 17 §S9 + Spec 34, adversarial-council-passed and Bean-signed-off. NOT "research done" — the research must be turned into the locked model this session.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — routing + ADHD support |
| `/gap-analysis` | Gate 0 (grade the plan) + end (grade the P1 output) |
| `/plan` | if re-scoping is needed — routes to strategic-plan/phase-planner |
| `/research-council` or `/deep-research` | competitor + CRO survey (high-stakes) |
| `/dispatching-parallel-agents` | fan out the 4 research streams to Sonnet |
| `/ui-ux-pro-max` | design-pattern intelligence (builder UX, header patterns) |
| `/sgs-wp-engine` · `/wp-blocks` · `/sgs-db` | ground findings against live SGS schema |
| `/brainstorming` | design the capability-parity model (design mode) |
| `/adversarial-council` | stress-test the locked model before sign-off (Rule 7) |
| `/spec-writer` | when truthing-up / extending Spec 17 §S9 + Spec 34 |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `search.py` / Brave / SerpAPI | competitor + review/complaint research |
| Playwright (browser_*) | verify current live header/footer/nav behaviour on both sites before truthing specs |
| GitHub | grep the codebase for hidden parallel systems (root cause #3) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `research-pipeline` | the competitor/CRO research streams |
| `wp-sgs-developer` | ground findings against live SGS block/attr schema |
| `Explore` | locate current header/footer/nav code + attrs fast |
| `design-reviewer` | competitor builder UX teardown (visual) |

## Guardrails (do not skip — carried forward + this track's gates)
- **P1 is research→architecture ONLY. No building.** Do not drift into P2+ (one phase per session).
- **Shared worktree:** `git status` + `.git/MERGE_HEAD` before touching any tracked file; commit path-scoped (`git commit -m "..." -- <paths>`), never `git add -A`; recheck branch in the SAME command as the commit. Do not touch Track 1's files (`next-session-prompt.md`, `brand-strip/*`, `lucide-icons.php`, page-13 backups).
- **The 6 anti-failure gates (plan §2) apply — especially: research before design, verify specs against LIVE code not other docs, grep for hidden parallel systems, no deferred-QC-as-signoff, design-gate before the model is locked.**
- **Model:** Opus high/max for the synthesis + architecture (owner recommendation); delegate research to Sonnet.
- **North-star:** ONE coherent system; operator simplicity is the primary success criterion, however complex the model.
