# small-giants-wp — Goals

Status (what is shipped, the current front) is single-sourced to `.claude/LEDGER.md` — this file
states GOALS + exit criteria only.

## ⛔ SUCCESS DEFINITION (gate every session)

SGS is an AI website-builder. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE
WordPress SGS blocks (driven by block attributes), faithful to the draft on the real homepage,
with zero cheats. Long-term: ship the framework + client builds with Bean as QC only.

*(Must stay verbatim identical to the root `CLAUDE.md` success definition.)*

## Primary near-term goals

**Goal A — Faithful universal CSS transfer (cloning pipeline):** deliver a single DB-driven,
name-free routing engine that places any draft CSS property on the correct block attribute at
the correct responsive tier, for `sgs/container` and every composite identically (Spec 31 §0).
The blueprint: [`specs/31-UNIVERSAL-CLONING-PIPELINE.md`](specs/31-UNIVERSAL-CLONING-PIPELINE.md)
§12. Underlying architecture: **Spec 31 §13.6 / FR-31-21**. Composite-mirror rule: no composite
with a built-in wrapper diverges from `sgs/container` capabilities.

**Goal B — Cloning pipeline produces a clone Bean signs off as faithful to the draft, per body
section × 3 viewports (375/768/1440), from any Claude-generated SGS-BEM HTML draft.** Closing
gate: the converter re-provisions the canary fixture corpus and the live check finds 0
WRITTEN-not-LANDED and 0 UNACCOUNTED at all three viewports (R-31-11 / R-31-13, Bean's eye).

> ⛔ **No percentage gate.** R-31-4 forbids an aggregate score as a closing gate. Do not define
> this goal against a pixel-diff figure or any other single number.

- **The instrument:** Spec 20 **computed-parity** (`scripts/parity/computed-parity.js`,
  auto-runs as pipeline **Stage 11.6**) — compares the computed value on each rendered element,
  matched by TEXT CONTENT, at 375/768/1440.
- **The gate (R-31-11 + R-31-13, co-authoritative):** the live-homepage per-section visual check
  vs the draft **plus Bean's eye**. Numbers alone never close; the eye alone never closes.
- **What the % is NOT:** computed-parity's aggregate figure is a per-commit diagnostic (R-31-4).
  It legitimately reads below a human-dispositioned ledger because it is page-agnostic, and it
  over-counts (font-family stacks, clone-only props — STOP-49). **Never engineer the number up,
  and never quote a cached one** — re-run Stage 11.6 for today's figure.
- **Excluded from the fidelity judgement:** header + footer divergences, and the testimonials
  static-grid→slider (THE accepted exception). Do not re-flag these.
- **Header + footer cloning** is **Spec 33 Part 2**; its status is in `.claude/LEDGER.md`.

**Goal C — the merged nav/header/footer track:** every remaining Spec 36+37 FR shipped or mapped
to a named stage, proven by the 10-clone reference proof gate (studionamma first, Bean's eye per
clone). Plan: `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`; verification:
`verify/merged-spec36-37-track.md`. Exit = FR-37-23 acceptance + 10/10 roster clones accepted +
Spec 33 Part 2 walker consuming the proven system. Status: see `.claude/LEDGER.md`.

Canonical spec: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`. Fidelity measurement:
`.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`. Council findings register:
`.claude/reports/2026-05-25-qc-council-issue-register.md` (~110 items + Section P binding rules
+ Section Q 20-cheat inventory).

## Primary outcome (long-term)

Ship a complete WordPress block framework + theme + supporting plugins (forms, booking,
client-notes, popups, chatbot) that competes with Kadence / Spectra / GenerateBlocks on
functionality, customisation depth, and client experience — and use it to deliver 5 priority
client builds end-to-end with Bean only acting as QC/internal client.

## Active goals

**One table only — never open a second "Active goals" table below.**

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Optimisation toolkit + tooling rebuild (Steps 3+4)** | All 5 phases of `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` complete: utilities built, lifecycle skills updated, 22+ rubrics optimised, three-lens gap analysis done, 13 pipelines rebuilt as one unit, design-brain rebuild shipped first | `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` Section 5 |
| **Track A framework completion** | A1-A9 items shipped (toolkit, responsive ext, hover ext, /quoter, dark mode, ecom plugin Phase 1, variant picker, 3D configurator, block style variations) | `plans/archive/strategy/2026-04-21-step2-strategic-plan.md` §3 + spec Phase 5 detail |
| **Track B — 5 client builds** | Mama's Munches, Indus Foods, CMX Group, Snooza/Ophir, SGS Studio v2 — each shipped per zero-QC definition (sign-off touchpoints documented per client). Per-client status lives in each site's own `sites/<client>/CLAUDE.md`. Mama's Munches is the live pipeline canary; Indus Foods builds on the dedicated `indus-test` site. Snooza/Ophir is `sites/snooza-chair/`. CMX Group has no `sites/` directory. Helping Doctors is a 6th site, paused and not part of the five. | `plans/archive/strategy/2026-04-21-step2-strategic-plan.md` §1, §5 |
| **Design-brain rebuild (Phase 4 — gates everything)** | Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired, 8 modifier skills deleted, ui-ux-pro-max restructured into 6 progressive-disclosure modes | `plans/archive/strategy/2026-04-24-design-brain-architecture.md` |
| **Convention rollout (SGS-prefixed BEM canonical for drafts)** | SGS-BEM is the canonical draft convention on every surface that names it (skills, orchestrator, mockups), validated and deployed | `.claude/specs/00-naming-conventions.md` §3 / §3.1 |
| **Spec 35 / capability-routing doctrine** | Every inspector control that declares a capability actually implements it — no dead panels, no silently-discarded settings. The live register and open-item count are in `.claude/LEDGER.md`. | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Part O = the control-type contract) |

## Non-goals (out of scope this milestone)

- Pipelines P8 (content), P10 (scroll-animation premium), P11 (email campaign), P13 (app
  delivery) — deferred per
  `plans/archive/strategy/2026-04-21-non-essential-pipelines-deferred.md`
- **WooCommerce is NOT a non-goal — the SGS shop layer is in scope.** Spec 27 (SGS Product &
  WooCommerce Layer) wraps WooCommerce (WC = single source of truth, never mirrored). Spec:
  `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`. Spec 30 covers the WooCommerce
  page-types (PDP/shop/cart/search/schema/variation-gallery/notify-me):
  `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md`.
- Dynamic content system / AI content generation — Phase 6 (not this milestone)

## Hard constraints

- WCAG 2.1 AA baseline on every shipped surface, keeping 2.2's cheap wins (visible focus, 44px touch targets); 4.5:1 contrast, keyboard navigation. Move to 2.2 AA per public-sector/EU client
- < 100 KB CSS, < 50 KB JS per page; green Core Web Vitals
- No jQuery; no page builders; pure Gutenberg + Interactivity API
- UK English in all code, comments, user-facing text
- Every block customisable via editor inspector (no code-required settings)
- Per-client theming: `sites/<client>/theme-snapshot.json` deployed via
  `push-theme-snapshot.py`. Framework deploys contain zero client-specific files.
  `theme/sgs-theme/styles/` is empty; do not add files there.

## Success metrics (from design-brain spec §8)

| Metric | Target |
|--------|--------|
| Design-iteration count per client engagement | -50% vs current |
| WCAG drift incidents post-deploy | 0 from Council standards-lane |
| Time from brief to first Blueprint | 15-25 min (Designer Mode A) |
| Client sign-off rate on first Blueprint review | > 70% (Mode B autonomous acceptance) |
| Council false-positive rate | < 10% per persona after 3 months tuning |
| DB validated-outcome rows | +50 / quarter once shipping |
