---
doc_type: strategic-plan
project: small-giants-wp
title: Header / Footer / Nav — full architecture + builder rebuild (strategic roadmap)
date: 2026-07-17
status: DRAFT — awaiting Bean sign-off + plan-validation gate (Gate 0)
supersedes_framing_in: .claude/plans/2026-07-16-header-footer-nav-builder-REALIGN-brief.md (this is the build plan the REALIGN brief said to write next)
grounded_in:
  - .claude/plans/2026-07-16-header-footer-nav-builder-REALIGN-brief.md (goals A/B/C/D + mandatory research gate)
  - .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S9 (FR-S9-1..11)
  - .claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md
  - .claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md (Part 2 = header/footer clone)
  - failure-history report 2026-07-17 (6 recurring root causes)
owner_steer:
  - 2026-07-17 — Phase 0 (research) + Phase 1 (architecture) run in ONE session (research delegated, synthesis same sitting).
---

# Header / Footer / Nav — full rebuild roadmap

## 0. Bottom line (plain English)

Your header/footer/nav system half-works and half-lies. The blocks (site-header, site-footer,
adaptive-nav, the drawer) are built and live on both sites. What's missing or rotten: the
**visual builder** (promised, never built), the **advanced header modes**, one **capability-parity
model** so the bar and drawer and every screen size expose the same settings, the **clone pipeline
for header/footer**, and — worst — the **specs themselves have carried false claims** that misled
every session that read them.

This plan does two things at once: (1) builds the missing pieces in the right order, and (2) turns
each of the six ways this kept failing into an automatic gate, so the same corner can't be cut again.

**Success = one coherent system a non-coder can operate simply, every claim verified on the live
site, and no spec line that isn't true.**

## 1. Scope

**In:** the capability-parity data model; the Site-Editor builder panel (Goal A); advanced header
modes (Goal B); bar+drawer+breakpoint unification (Goal C); legacy pattern retirement (Goal D);
spec truth-up (17 §S9 + 34); header/footer clone pipeline (Spec 33 Part 2); the open defect sweep.

**Out (explicit):** cloning-pipeline body work (Spec 31 — separate track); WooCommerce product
config (Spec 27); non-header client build work. Brand-strip is touched ONLY for the 9px overflow.

**Success criteria (measurable, not "works"):**
- Every FR in the reconciled Spec 17 §S9 + Spec 34 is either BUILT+live-verified-on-both-sites, or
  explicitly NOT-STARTED with a reason. Zero "claimed but not working" rows.
- A `lint-spec-drift`-style check passes: no spec claim references a class/file/attr that doesn't exist.
- The builder lets Bean configure header + footer + nav (bar + drawer, all 3 breakpoints) with zero
  code, and a fresh operator can do it without help (the north-star: operator simplicity).
- `scrollWidth <= innerWidth` at 320/375/414/768/1024/1440 on both sites; 0 inline `style=""`;
  every touch target ≥44px; every header mode verified on the live rendered output.

## 2. THE SIX ANTI-FAILURE GATES (apply to EVERY phase — this is the point of the plan)

Derived directly from the 6 recurring root causes. A phase is not "done" until its gates pass.

| # | Root cause that kept recurring | The gate that now blocks it |
|---|---|---|
| G1 | No research → corner-cutting (logo `auto`, hardcoded burger tier) | **Research artefact required before any design/build** — competitor + core-parity + CRO matrix exists and is cited, or the phase doesn't start. |
| G2 | "Done" verified against source, not the live trigger | **Live-trigger / rendered-output verification on BOTH sites** — open the real page, measure the computed value, prove the script actually loaded. Source-code "it publishes" is never proof. (The `sgs-selfreport` + handoff gates already enforce this.) |
| G3 | Hidden parallel systems (2 social stores, ghost blocks in `build/`, spec fiction) | **Whole-surface sweep before building on an assumption** — grep plugin + theme + `build/` + webpack config + DB for a second system doing the same job; confirm every doc'd class/file/attr actually exists. |
| G4 | Hardcodes slipping past linters (theme CSS, webpack, breakpoints) | **Comprehensive lint wired to prebuild** — `lint-theme-css-hardcodes.py` (wire it — currently unwired), a breakpoint-constant glossary lint, and a webpack-entry-vs-enqueue check. Fail-loud on any new literal. |
| G5 | Deferred-QC-as-signoff ("honest report", eyeball "owed") | **No phase closes with QC owed** — the visual-diff report + the eyeball happen AT commit, not parked. STOP-67 enforced. |
| G6 | Architecture built with no pre-build design-gate | **Design-gate + `/adversarial-council` before any shared-mechanism build** (wrapper, data model, builder, clone handler) — Rule 7. |

## 3. Sequencing decision (locked)

**Architecture/data-model FIRST; the builder is a UI over it.** You cannot build a control panel for
capabilities that aren't defined. They inform each other, so they're designed together with the
architecture leading — but the model ships and is proven before the builder is built on top of it.

## 4. The phases (dependency-mapped)

Critical path: **P1 → P2 → P3 → P4**. P5 depends on P3. P6 is mostly independent (last).

| Phase | What it delivers | Depends on | Gates that must pass | Effort (optimistic → ADHD-tax) |
|---|---|---|---|---|
| **P1 — Research → Architecture** (MERGED per owner steer) | (a) deep research: competitor builder matrices (Spectra/Kadence/Astra/Blocksy/Elementor/Bricks/GenerateBlocks), `core/navigation` parity audit, reviews/CRO complaints, **build-vs-adopt verdict** (is there a block-based FSE builder worth adopting?); (b) synthesise → **lock the capability-parity data model** (bar + drawer + 3 breakpoints, same capabilities / independent values); (c) **truth-up Spec 17 §S9 + Spec 34 to live reality** (kill every false line). | — | G1, G3, G6 (adversarial-council on the model) | 1 session (research delegated to parallel Sonnet; Opus synthesises) |
| **P2 — Builder design-gate** | The never-written builder-UX design-gate doc (the exact gap that let "no builder" ship silently). A dedicated Site-Editor panel design, reflecting the P1 model. `/adversarial-council` before a line of code. | P1 | G6, G1 | 1 session |
| **P3 — Capability-parity model build** | Implement the P1 model: same attribute SET on bar + drawer + each breakpoint, independent values. Extend FR-S9-6's 17 tiered attrs to the 78 flat ones + the editor device switcher. Subsumes Spec 34 FR-34-5 drawer settings (don't build twice). | P1 (P2 informs) | G2, G4, G5, phases-never-one-commit (R-31-5) | 2–3 sessions |
| **P4 — Builder panel build** | Goal A: the actual Site-Editor builder UI (PluginSidebar / custom panel) over the P3 model. Prominent, discoverable, operator-simple. | P3 (needs the model) | G2, G5, G6 | 2–3 sessions |
| **P5 — Advanced header modes** | Goal B: partial transparency, partial sticking, separate sticky-header config, shrink-as-extension-of-sticky. Extends FR-S9-9's independent toggles — does not replace them. | P3 | G1 (research the patterns), G2, G4, G5 | 2 sessions |
| **P6 — Retire + clone + defect sweep** | Goal D (retire `header-minimal/centred/full.php`); Spec 33 Part 2 (header/footer clone extraction + the missing h/f pipeline handler); clear the parked defects: 9px Indus overflow, mega-menu APG, drawer drill-down, wrapper border emit (`P-WRAPPER-BORDER-EMIT`), per-site-vs-framework split (the `footer-indus-foods.php` leak). | P3/P4 | G2, G3, G5 | 2–3 sessions |

## 5. Milestone gates (go / no-go between phases)

- **Gate 0 (before P1 starts): validate THIS plan.** Run `/gap-analysis` on the plan + a cold reviewer;
  Bean sign-off. Readiness now: dependencies mapped ✓, risks listed ✓, estimates first-attempt (3× tax
  flagged), first action <5 min ✓ → **proceed with caution** (estimates uncalibrated — this is a
  first-attempt roadmap for a subsystem with no clean past actuals).
- **Gate 1 (after P1): architecture sign-off.** The data model + build-vs-adopt verdict + truthed-up
  specs pass `/adversarial-council`; Bean signs off the model. FAIL → do not design the builder.
- **Gate 2 (after P2): builder design sign-off.** Design-gate doc adversarial-council-passed. FAIL → do not build.
- **Gate 3 (after P3): model live-verified.** Capability parity proven on both sites at all breakpoints. FAIL → fix before builder.
- **Gate 4 (after P4): builder usable by a non-coder.** Operator-simplicity test (the north-star). Bean drives it unaided.
- Each build phase: live-verified on sandybrown + palestine-lives, Bean eye sign-off (R-31-13), never one commit (R-31-5).

## 6. Top risks (pre-mortem)

- **R1 — the research says "adopt a competitor builder."** If a block-based FSE builder exists and fits,
  P2/P4 could collapse to an adaptation. HIGH impact on the whole plan → this is WHY P1 build-vs-adopt
  gates everything. Mitigation: P1 answers it before P2 is scoped.
- **R2 — capability-parity model churns the 5 shipped blocks.** Retrofitting the object-tier shape onto
  78 flat attrs is exactly the change D328 flagged as unsafe. Mitigation: extend the 17 tiered attrs in
  place; sibling-attr rule only for un-tiered attrs; design-gate + adversarial-council (G6) first.
- **R3 — the specs are still lying somewhere I haven't found.** Mitigation: G3 sweep + a `lint-spec-drift`
  pass is a P1 deliverable, not an afterthought.
- **R4 — session sprawl / scope creep** (this is a 6-phase, ~10-session subsystem). Mitigation: one phase
  per session after P1; the LEDGER carries the baton; park aggressively.

## 7. First action (≤5 min, zero deps)
Run Gate 0 — `/gap-analysis` on this plan file, then a cold reviewer. Nothing gets built until the plan
itself survives review. (That IS the anti-corner-cutting discipline applied to the plan.)

## 8. Per-phase handoff (to /phase-planner, when each phase starts)
- **P1** → `/phase-planner` scope = "Research → Architecture"; entry docs: this plan, the REALIGN brief,
  Spec 17 §S9, Spec 34, the failure report. Research delegated via `/dispatching-parallel-agents`
  (Sonnet researchers) + `/research-council` for the competitor/CRO survey; `/ui-ux-pro-max` for pattern
  intelligence; `/sgs-wp-engine` to ground against live schema. Model: Opus high/max (owner recommendation).
- **P2–P6** → `/phase-planner` per phase at the time, entry docs = this plan + the P1 architecture output.
