# small-giants-wp — Goals

**Last updated:** 2026-05-25 (cloning-pipeline universal-extraction promoted to primary near-term goal per qc-council session)

## Primary near-term goal (2026-05-25 onwards — gates everything until met)

**Cloning pipeline delivers ≤1% pixel-diff PER BODY SECTION × 3 viewports (375/768/1440) irrespective of mockup content variations, from any Claude-generated SGS-BEM HTML draft.**

- **Phase 1 gate:** per-section ≤30% × 3 viewports for all 7 body sections (21 cells; current baseline mean 63.2%). Builds the universal-extraction architectural backbone (F1 + extended DB-driven ATOMIC_TAG_MAP + universal child/array extraction + cheat removal). Plan: `.claude/plans/2026-05-25-phase-1-universal-extraction.md`.
- **Phase 1.5 gate:** per-section ≤1% × 3 viewports. Section-by-section closure of residual diff. Scope determined empirically by Phase 1 end-results.
- **Phase 2 gate:** header + footer cloner ships after Phase 1.5 hits per-section ≤1%.

Canonical register (full evidence + ~110 items + Section P binding rules + Section Q 20-cheat inventory + Section R consolidated plan): `.claude/reports/2026-05-25-qc-council-issue-register.md`

Empirical baseline (2026-05-25): `pipeline-state/mamas-munches-homepage-2026-05-25-101222/stage-11-pixel-diff.json` — mean 63.2% across 27 captures; hero 86.5/64.1/69.6%; trust-bar 37.0/24.6/33.1%; brand 73.8/59.4/50.0%; deployed to canary page 144 on sandybrown.

## Primary outcome (long-term)

Ship a complete WordPress block framework + theme + supporting plugins (forms, booking, client-notes, popups, chatbot) that competes with Kadence / Spectra / GenerateBlocks on functionality, customisation depth, and client experience — and use it to deliver 5 priority client builds end-to-end with Bean only acting as QC/internal client.

## Active goals

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Optimisation toolkit + tooling rebuild (Steps 3+4)** | All 5 phases of `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` complete: utilities built, lifecycle skills updated, 22+ rubrics optimised, three-lens gap analysis done, 13 pipelines rebuilt as one unit, design-brain rebuild shipped first | `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` Section 5 |
| **Track A framework completion** | A1-A9 items shipped (toolkit, responsive ext, hover ext, /quoter, dark mode, ecom plugin Phase 1, variant picker, 3D configurator, block style variations) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §3 + spec Phase 5 detail |
| **Track B 5 client builds** | Mama's Munches, Indus Foods, CMX Group, Snooza/Ophir, SGS Studio v2 — each shipped per zero-QC definition (sign-off touchpoints documented per client) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §1, §5 |
| **Design-brain rebuild (Phase 4 — gates everything)** | Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired, 8 modifier skills deleted, ui-ux-pro-max restructured into 6 progressive-disclosure modes | `plans/strategy/2026-04-24-design-brain-architecture.md` |
| **Convention rollout (SGS-prefixed BEM canonical for drafts)** | All 8 phases of `.claude/plan.md` complete: lesson captured, Spec 13 written, ~48 surfaces propagated, `/style-replicator` renamed, Mama's mockup migrated, orchestrator rewired, validated + deployed | `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (§8.1; former Spec 13 absorbed 2026-05-12)` + `.claude/plan.md` |

## Achieved goals (2026-05-22)

| Goal | Status | Notes |
|------|--------|-------|
| **Architecture programme (8 phases, 31 decisions)** | DONE | All phases shipped across 2026-05-21 → 2026-05-22. DB consolidation, style-variation system retired, INNER_BLOCK_PATTERNS retired, button presets migrated to WP 7.0 theme.json, `/sgs-update` rebuilt as 9-stage v2, WP 7.0 alignment (all 69 blocks). See `.claude/plans/2026-05-21-architecture-staging.md`. |
| **WP 7.0 upgrade on sandybrown** | DONE | DB schema 60717 → 61833. `Sgs_Ai_Connector`, `wp_set_script_module_translations`, `WP_REST_Icons_Controller` all confirmed available. |
| **Spec 17 — Header/Footer Architecture** | DONE | 16 FRs, 22 PHP classes, 12 WP-CLI commands across 3 waves. Full spec: `.claude/specs/17-SGS-HEADER-FOOTER-ARCHITECTURE.md` |
| **Floating UI Customiser** | DONE | `Sgs_Floating_UI_Customiser` + `Sgs_Floating_UI_Renderer` replace admin-page approach with live Customiser preview. `sgs/back-to-top` block deprecated to no-op. |

## Non-goals (out of scope this milestone)

- Pipelines P8 (content), P10 (scroll-animation premium), P11 (email campaign), P13 (app delivery) — deferred per `plans/strategy/2026-04-21-non-essential-pipelines-deferred.md`
- WooCommerce integration (intentionally avoided — see `specs/2026-04-21-step2-strategic-plan.md` §3.1 rationale)
- Dynamic content system / AI content generation — Phase 6 (not this milestone)

## Hard constraints

- WCAG 2.2 AA on every shipped surface (44px touch targets, 4.5:1 contrast, keyboard navigation)
- < 100 KB CSS, < 50 KB JS per page; green Core Web Vitals
- No jQuery; no page builders; pure Gutenberg + Interactivity API
- UK English in all code, comments, user-facing text
- Every block customisable via editor inspector (no code-required settings)
- Style variation system: **RETIRED (Decision D28, Phase 5a shipped 2026-05-21, commit `43a93df9`).** Per-client snapshots at `sites/<client>/theme-snapshot.json`; deployed via `push-theme-snapshot.py`. Framework deploys contain zero client-specific files. Header/footer template parts unaffected.

## Success metrics (from design-brain spec §8)

| Metric | Target |
|--------|--------|
| Design-iteration count per client engagement | -50% vs current |
| WCAG drift incidents post-deploy | 0 from Council standards-lane |
| Time from brief to first Blueprint | 15-25 min (Designer Mode A) |
| Client sign-off rate on first Blueprint review | > 70% (Mode B autonomous acceptance) |
| Council false-positive rate | < 10% per persona after 3 months tuning |
| DB validated-outcome rows | +50 / quarter once shipping |

## Active goals (added 2026-05-20)

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Phase 1 pixel-diff closure (G1-G5 + F5)** | 1440 average pixel-diff ≤ 5%, 768 ≤ 8%, 375 ≤ 10% across 7 Mama's Munches sections | `.claude/next-session-prompt.md` (4-wave plan); evidence at `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` |

## Active goals (added 2026-05-21 — architecture session)

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Architecture programme — 8-phase holistic redesign** | All 30 decisions shipped per §7 acceptance criteria: single DB, per-site theme.json, INNER_BLOCK_PATTERNS deleted, button presets in theme.json, Customiser migration done, WP 7.0 all 69 blocks aligned, `/sgs-update` 9-stage idempotent | `.claude/plans/2026-05-21-architecture-staging.md` + `.claude/plan.md` |
| **WP 7.0 alignment (all 69 blocks + 10 skills)** | Every SGS block has `apiVersion: 3` + `role: content` + script-module text domains; 10 wp-* skills updated; AI Connectors infrastructure registered | Staging doc Decisions 23, 26, 29; Phase 6 + Phase 7 |
