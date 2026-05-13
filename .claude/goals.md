# small-giants-wp — Goals

**Last updated:** 2026-04-29

## Primary outcome

Ship a complete WordPress block framework + theme + supporting plugins (forms, booking, client-notes, popups, chatbot) that competes with Kadence / Spectra / GenerateBlocks on functionality, customisation depth, and client experience — and use it to deliver 5 priority client builds end-to-end with Bean only acting as QC/internal client.

## Active goals

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Optimisation toolkit + tooling rebuild (Steps 3+4)** | All 5 phases of `specs/2026-04-27-optimisation-toolkit-design.md` complete: utilities built, lifecycle skills updated, 22+ rubrics optimised, three-lens gap analysis done, 13 pipelines rebuilt as one unit, design-brain rebuild shipped first | `specs/2026-04-27-optimisation-toolkit-design.md` Section 5 |
| **Track A framework completion** | A1-A9 items shipped (toolkit, responsive ext, hover ext, /quoter, dark mode, ecom plugin Phase 1, variant picker, 3D configurator, block style variations) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §3 + spec Phase 5 detail |
| **Track B 5 client builds** | Mama's Munches, Indus Foods, CMX Group, Snooza/Ophir, SGS Studio v2 — each shipped per zero-QC definition (sign-off touchpoints documented per client) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §1, §5 |
| **Design-brain rebuild (Phase 4 — gates everything)** | Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired, 8 modifier skills deleted, ui-ux-pro-max restructured into 6 progressive-disclosure modes | `plans/strategy/2026-04-24-design-brain-architecture.md` |
| **Convention rollout (SGS-prefixed BEM canonical for drafts)** | All 8 phases of `.claude/plan.md` complete: lesson captured, Spec 13 written, ~48 surfaces propagated, `/style-replicator` renamed, Mama's mockup migrated, orchestrator rewired, validated + deployed | `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (§8.1; former Spec 13 absorbed 2026-05-12)` + `.claude/plan.md` |

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
- Style variation system: client-specific work goes in `theme/sgs-theme/styles/<client>.json` + `sites/<client>/`, never in core framework

## Success metrics (from design-brain spec §8)

| Metric | Target |
|--------|--------|
| Design-iteration count per client engagement | -50% vs current |
| WCAG drift incidents post-deploy | 0 from Council standards-lane |
| Time from brief to first Blueprint | 15-25 min (Designer Mode A) |
| Client sign-off rate on first Blueprint review | > 70% (Mode B autonomous acceptance) |
| Council false-positive rate | < 10% per persona after 3 months tuning |
| DB validated-outcome rows | +50 / quarter once shipping |
