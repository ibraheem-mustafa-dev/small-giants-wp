# small-giants-wp — Goals

**Last updated:** 2026-06-07 (WS-4 block-side complete D167 — 29-block container roster mirrors sgs/container; bound-purge SHIPPED D182; parity2 fidelity verifier wired D183; gap consolidation shipped 2026-06-07; icon-identity resolver shipped; Stage 9 autonomy-gate rollback bug fixed. For earlier: 2026-06-02 WS-1 SHIPPED commit `0d746073`, D152; block_composition.container_kind column built + 28-block roster populated; composite-mirror rule locked.)

## ⛔ SUCCESS DEFINITION (gate every session)

SGS is an AI website-builder. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE WordPress SGS blocks (driven by block attributes), faithful to the draft on the real homepage, with zero cheats. Long-term: ship the framework + client builds with Bean as QC only.

## Primary near-term goals (2026-06-02 onwards)

**Goal A — Faithful universal CSS transfer (cloning pipeline):** deliver a single DB-driven, name-free routing engine that places any draft CSS property on the correct block attribute at the correct responsive tier, for `sgs/container` and every composite identically (Spec 31 §0). **SUPERSEDES the old 5-workstream container/wrapper standardisation programme** (launched D152; WS-1 block-side mirror SHIPPED D167) — WS-2/WS-3/WS-4/WS-5 are no longer tracked as independent workstreams; the **clean modular stage-by-stage rebuild (Spec 31 §12)** addresses them structurally. Foundation Phase F (F1–F6 + F5 gates) COMPLETE (D232–D241); `convert.py` FROZEN (D-MODULAR, D229); next = the stage-by-stage rebuild. THE blueprint: [`specs/31-UNIVERSAL-CLONING-PIPELINE.md`](specs/31-UNIVERSAL-CLONING-PIPELINE.md) §12. Underlying architecture: **Spec 31 §13.6 / FR-31-21** (Spec 22 was absorbed into Spec 31 §13 at D253 and is DEAD — `R-22-N ≡ R-31-N`, `FR-22-N ≡ FR-31-N`). Composite-mirror rule: no composite with a built-in wrapper diverges from sgs/container capabilities.

**Goal B — Cloning pipeline produces a clone Bean signs off as faithful to the draft, per body section × 3 viewports (375/768/1440), from any Claude-generated SGS-BEM HTML draft.**

> **⚠️ Rewritten 2026-07-16.** This goal was previously defined as "≤5% pixel-diff" against `stage-11-pixel-diff.json`. **Stage 11 pixel-diff was PURGED 2026-07-04 (`220cb28a`)** and that artefact no longer exists — the goal was measuring an instrument the project had deleted. Worse, R-31-4 explicitly forbids an aggregate score as a closing gate, so the old exit criterion contradicted the project's own binding rules. Do not reintroduce a percentage gate.

- **The instrument:** Spec 20 **computed-parity** (`scripts/parity/computed-parity.js`, auto-runs as pipeline **Stage 11.6**) — compares the computed value on each rendered element, matched by TEXT CONTENT, at 375/768/1440.
- **The gate (R-31-11 + R-31-13, co-authoritative):** the live-homepage per-section visual check vs the draft **plus Bean's eye**. Numbers alone never close; the eye alone never closes.
- **What the % is NOT:** computed-parity's aggregate figure is a per-commit diagnostic (R-31-4). It legitimately reads below a human-dispositioned ledger because it is page-agnostic, and it over-counts (font-family stacks, clone-only props — STOP-49). **Never engineer the number up, and never quote a cached one** — re-run Stage 11.6 for today's figure.
- **Excluded from the fidelity judgement:** header + footer divergences, and the testimonials static-grid→slider (THE accepted exception). Do not re-flag these.
- **Phase 2:** header + footer cloner = **Spec 33 Part 2** (NOT started).

Canonical spec: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`. Fidelity measurement: `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`. Council findings register: `.claude/reports/2026-05-25-qc-council-issue-register.md` (~110 items + Section P binding rules + Section Q 20-cheat inventory).

## Primary outcome (long-term)

Ship a complete WordPress block framework + theme + supporting plugins (forms, booking, client-notes, popups, chatbot) that competes with Kadence / Spectra / GenerateBlocks on functionality, customisation depth, and client experience — and use it to deliver 5 priority client builds end-to-end with Bean only acting as QC/internal client.

## Active goals

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Optimisation toolkit + tooling rebuild (Steps 3+4)** | All 5 phases of `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` complete: utilities built, lifecycle skills updated, 22+ rubrics optimised, three-lens gap analysis done, 13 pipelines rebuilt as one unit, design-brain rebuild shipped first | `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` Section 5 |
| **Track A framework completion** | A1-A9 items shipped (toolkit, responsive ext, hover ext, /quoter, dark mode, ecom plugin Phase 1, variant picker, 3D configurator, block style variations) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §3 + spec Phase 5 detail |
| **Track B 5 client builds** | Mama's Munches, Indus Foods, CMX Group, Snooza/Ophir, SGS Studio v2 — each shipped per zero-QC definition (sign-off touchpoints documented per client) | `plans/strategy/2026-04-21-step2-strategic-plan.md` §1, §5 |
| **Design-brain rebuild (Phase 4 — gates everything)** | Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired, 8 modifier skills deleted, ui-ux-pro-max restructured into 6 progressive-disclosure modes | `plans/strategy/2026-04-24-design-brain-architecture.md` |
| **Convention rollout (SGS-prefixed BEM canonical for drafts)** | All 8 phases of `.claude/plan.md` complete: lesson captured, Spec 13 written, ~48 surfaces propagated, `/style-replicator` renamed, Mama's mockup migrated, orchestrator rewired, validated + deployed | `.claude/specs/00-naming-conventions.md` §3 / §3.1 (SGS-BEM; Specs 13 + 15 both abrogated — 15's converter body → Spec 31) + `.claude/plan.md` |

## Completed

| Goal | Status | Notes |
|------|--------|-------|
| **Architecture programme (8 phases, 31 decisions)** | DONE | All phases shipped across 2026-05-21 → 2026-05-22. DB consolidation, per-client theme-snapshot model established, button presets migrated to WP 7.0 theme.json, `/sgs-update` rebuilt as 9-stage v2, WP 7.0 alignment (all 69 blocks). See `.claude/plans/archive/2026-05-21-architecture-staging.md`. |
| **WP 7.0 upgrade on sandybrown** | DONE | DB schema 60717 → 61833. `Sgs_Ai_Connector`, `wp_set_script_module_translations`, `WP_REST_Icons_Controller` all confirmed available. |
| **Spec 17 — Header/Footer Architecture** | DONE | 16 FRs, 22 PHP classes, 12 WP-CLI commands across 3 waves. Full spec: `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` |
| **Floating UI Customiser** | DONE | `Sgs_Floating_UI_Customiser` + `Sgs_Floating_UI_Renderer` replace admin-page approach with live Customiser preview. `sgs/back-to-top` block deprecated to no-op. |

## Non-goals (out of scope this milestone)

- Pipelines P8 (content), P10 (scroll-animation premium), P11 (email campaign), P13 (app delivery) — deferred per `plans/strategy/2026-04-21-non-essential-pipelines-deferred.md`
- ~~WooCommerce integration (intentionally avoided)~~ **SUPERSEDED 2026-06-03 (D161/D164):** the SGS shop layer IS now in scope — Spec 27 (SGS Product & WooCommerce Layer) wraps WooCommerce (WC = single source of truth, never mirrored). Phase-1 sell-loop SHIPPED 2026-06-04 (U0/U6 backend + U3/U4/U7/U5 pill-swap, live on canary page 589). Remaining Phase-1 hardening: U9/U10/U8/U11/U1/U12 → the single whole ship gate. Spec: `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`. **Spec 30 (WooCommerce page-types — PDP/shop/cart/search/schema/variation-gallery/notify-me) COMPLETE + merged to main 2026-06-12 (D220) — SGS is a sellable shop.**
- Dynamic content system / AI content generation — Phase 6 (not this milestone)

## Hard constraints

- WCAG 2.2 AA on every shipped surface (44px touch targets, 4.5:1 contrast, keyboard navigation)
- < 100 KB CSS, < 50 KB JS per page; green Core Web Vitals
- No jQuery; no page builders; pure Gutenberg + Interactivity API
- UK English in all code, comments, user-facing text
- Every block customisable via editor inspector (no code-required settings)
- Per-client theming: `sites/<client>/theme-snapshot.json` deployed via `push-theme-snapshot.py`. Framework deploys contain zero client-specific files. `theme/sgs-theme/styles/` is empty; do not add files there.

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
| ~~**Phase 1 pixel-diff closure (G1-G5 + F5)**~~ **(SUPERSEDED)** | ~~1440 average pixel-diff ≤ 5%, 768 ≤ 8%, 375 ≤ 10%~~ Superseded by Spec 22 FR-22-7: **per-section ≤5% × 3 viewports** (not mean, not per-breakpoint averages). See Goal B above. | `.claude/next-session-prompt.md` (4-wave plan); evidence at `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` |

## Active goals (added 2026-05-21 — architecture session)

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Architecture programme — 8-phase holistic redesign** | All 30 decisions shipped per §7 acceptance criteria: single DB, per-site theme.json, INNER_BLOCK_PATTERNS deleted, button presets in theme.json, Customiser migration done, WP 7.0 all 69 blocks aligned, `/sgs-update` 9-stage idempotent | `.claude/plans/archive/2026-05-21-architecture-staging.md` + `.claude/plan.md` |
| **WP 7.0 alignment (all 69 blocks + 10 skills)** | Every SGS block has `apiVersion: 3` + `role: content` + script-module text domains; 10 wp-* skills updated; AI Connectors infrastructure registered | Staging doc Decisions 23, 26, 29; Phase 6 + Phase 7 |
