# small-giants-wp — Goals

**Last updated:** 2026-09-07 (refresh — consolidated three duplicate "Active goals" tables into
one, cut superseded/duplicate rows, resolved the open Spec 35 tracking question). Status detail
(D-numbers, what shipped today, current front) is single-sourced to `.claude/LEDGER.md` — this
file states GOALS + exit criteria only; it does not duplicate day-to-day status.

## ⛔ SUCCESS DEFINITION (gate every session)

SGS is an AI website-builder. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE
WordPress SGS blocks (driven by block attributes), faithful to the draft on the real homepage,
with zero cheats. Long-term: ship the framework + client builds with Bean as QC only.

*(Verified verbatim against the root `CLAUDE.md` success definition, 2026-09-07 — the two now
match.)*

## Primary near-term goals (2026-06-02 onwards)

**Goal A — Faithful universal CSS transfer (cloning pipeline):** deliver a single DB-driven,
name-free routing engine that places any draft CSS property on the correct block attribute at
the correct responsive tier, for `sgs/container` and every composite identically (Spec 31 §0).
**SUPERSEDES the old 5-workstream container/wrapper standardisation programme** (launched D152;
WS-1 block-side mirror SHIPPED D167) — WS-2/WS-3/WS-4/WS-5 are no longer tracked as independent
workstreams; the **clean modular stage-by-stage rebuild (Spec 31 §12)** addresses them
structurally. Foundation Phase F (F1–F6 + F5 gates) COMPLETE (D232–D241); `convert.py` FROZEN
(D-MODULAR, D229). THE blueprint: [`specs/31-UNIVERSAL-CLONING-PIPELINE.md`](specs/31-UNIVERSAL-CLONING-PIPELINE.md)
§12. Underlying architecture: **Spec 31 §13.6 / FR-31-21** (Spec 22 was absorbed into Spec 31 §13
at D253 and is DEAD — `R-22-N ≡ R-31-N`, `FR-22-N ≡ FR-31-N`). Composite-mirror rule: no
composite with a built-in wrapper diverges from sgs/container capabilities.

**Goal B — Cloning pipeline produces a clone Bean signs off as faithful to the draft, per body
section × 3 viewports (375/768/1440), from any Claude-generated SGS-BEM HTML draft.** **STATUS
2026-07-25: Spec 31 C2 LANDED closing gate MET** — the 35-fixture canary corpus was
re-provisioned through the current converter + live-verified 0 WRITTEN-not-LANDED + 0
UNACCOUNTED at 375/768/1440 (D380, `9babcfd5`; R-31-11/R-31-13, Bean's eye). Body-section clone
fidelity is closed for the fixture corpus. Phase 2 (header/footer = Spec 33 Part 2) NOT started.

> **⚠️ Rewritten 2026-07-16.** This goal was previously defined as "≤5% pixel-diff" against
> `stage-11-pixel-diff.json`. **Stage 11 pixel-diff was PURGED 2026-07-04 (`220cb28a`)** and
> that artefact no longer exists — the goal was measuring an instrument the project had deleted.
> Worse, R-31-4 explicitly forbids an aggregate score as a closing gate, so the old exit
> criterion contradicted the project's own binding rules. **Do not reintroduce a percentage
> gate.**

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
- **Phase 2:** header + footer cloner = **Spec 33 Part 2** (NOT started).

**Goal C (added 2026-07-29, D413) — the merged nav/header/footer track:** every remaining Spec
36+37 FR shipped or mapped to a named stage, proven by the 10-clone reference proof gate
(studionamma first, Bean's eye per clone). Plan:
`plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`; verification:
`verify/merged-spec36-37-track.md`. Exit = FR-37-23 acceptance + 10/10 roster clones accepted +
Spec 33 Part 2 walker consuming the proven system. **Last confirmed progress: D681-D684
(2026-08-19)** — FR-37-44/45 built + live-verified; FR-37-15's "no inline `style=""`" done-when
now met for all five header behaviours. **Not re-verified since 2026-08-19** — LEDGER's current
front (2026-09-07) is on unrelated tracks (typography, colour conformance, tier-object
migration), so check `.claude/LEDGER.md` before assuming this goal is still the active one. Still
open as of last check: the 10-clone reference proof gate and Spec 33 Part 2.

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

**Single table (consolidated 2026-09-07 — this file previously carried three separate
"Active goals" tables at old lines ~45, ~90 and ~96; one was already fully struck through as
SUPERSEDED and has been deleted, and the "Architecture programme" / "WP 7.0 alignment" rows were
duplicates of items already in Completed below, also deleted).**

| Goal | Exit criteria | Source |
|------|--------------|--------|
| **Optimisation toolkit + tooling rebuild (Steps 3+4)** | All 5 phases of `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` complete: utilities built, lifecycle skills updated, 22+ rubrics optimised, three-lens gap analysis done, 13 pipelines rebuilt as one unit, design-brain rebuild shipped first | `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` Section 5 |
| **Track A framework completion** | A1-A9 items shipped (toolkit, responsive ext, hover ext, /quoter, dark mode, ecom plugin Phase 1, variant picker, 3D configurator, block style variations) | `plans/archive/strategy/2026-04-21-step2-strategic-plan.md` §3 + spec Phase 5 detail |
| **Track B — 5 client builds** | Mama's Munches, Indus Foods, CMX Group, Snooza/Ophir, SGS Studio v2 — each shipped per zero-QC definition (sign-off touchpoints documented per client). Not re-verified since 2026-08-12 for any client below — check each site's own `sites/<client>/CLAUDE.md` before reporting progress. Mama's Munches is the live pipeline canary (most recently touched 2026-08-27). Indus Foods last touched 2026-03-17. Snooza/Ophir (`sites/snooza-chair/`) last touched 2026-08-03. SGS Studio v2 last touched 2026-04-19. **CMX Group has no `sites/` directory at all as of this check** — recorded STALLED 2026-08-12 (no contact in a long while, build overdue against an earlier hoped-for completion); re-engage before resuming work. Helping Doctors (a 6th site) remains PAUSED, not part of this 5. | `plans/archive/strategy/2026-04-21-step2-strategic-plan.md` §1, §5 |
| **Design-brain rebuild (Phase 4 — gates everything)** | Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired, 8 modifier skills deleted, ui-ux-pro-max restructured into 6 progressive-disclosure modes | `plans/archive/strategy/2026-04-24-design-brain-architecture.md` |
| **Convention rollout (SGS-prefixed BEM canonical for drafts)** | All 8 phases of the 2026-05 convention-rollout programme complete: lesson captured, Spec 13 written, ~48 surfaces propagated, `/style-replicator` renamed, Mama's mockup migrated, orchestrator rewired, validated + deployed | `.claude/specs/00-naming-conventions.md` §3 / §3.1 (SGS-BEM; Specs 13 + 15 both abrogated — 15's converter body → Spec 31) |
| **Spec 35 / capability-routing doctrine** | Every inspector control that declares a capability actually implements it — no dead panels, no silently-discarded settings. **Resolved 2026-09-07:** this file states the goal only; the live register, current D-range, and open-item count are single-sourced to `.claude/LEDGER.md` (they change too fast to cache here — the file previously cited "D579-D590, currently the biggest active body of work", which was already ~400 decisions stale). | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (active, Part O = the folded-in control-type contract) + `~/.claude/plans/go-track-1b-playful-hamster.md` (live register) — current status always in `.claude/LEDGER.md` |

## Completed

| Goal | Status | Notes |
|------|--------|-------|
| **Architecture programme (8 phases, 31 decisions)** | DONE | All phases shipped across 2026-05-21 → 2026-05-22. DB consolidation, per-client theme-snapshot model established, button presets migrated to WP 7.0 theme.json, `/sgs-update` rebuilt as v2 (stage count is declared in `sgs-update-v2.py` itself — never cached here; it has drifted three times), WP 7.0 alignment (the whole block roster (count is DB-authoritative)). See `.claude/plans/archive/2026-05-21-architecture-staging.md`. |
| **WP 7.0 upgrade on sandybrown** | DONE | DB schema 60717 → 61833. `Sgs_Ai_Connector`, `wp_set_script_module_translations`, `WP_REST_Icons_Controller` all confirmed available. Canary since upgraded again to WP 7.1 (2026-08-20, per root `CLAUDE.md`). |
| **WP 7.0 alignment (the whole block roster (count is DB-authoritative) + 10 skills)** | DONE | Folded into the Architecture programme row above (apiVersion 3 + role: content + script-module text domains across all blocks; AI Connectors infrastructure registered). Previously tracked as a separate row — merged here 2026-09-07 to remove the duplicate. |
| **Spec 37 — Header/Footer Builder** | **PARTIAL — core DONE + live-verified (2026-07-22, D359-D362)** | *(Corrected 2026-07-22: this row previously said "DONE — 16 FRs, 22 PHP classes, 12 WP-CLI commands", which were Spec-17-era figures for a spec that is now DELETED.)* **Shipped + LIVE-VERIFIED via the real operator path:** CPT editing home + active pointer + "Set as active" (FR-37-1/2/25), direct-render binding w/ CPT-aware resolver (FR-37-3), "Active" list-table column (FR-37-5), thin template parts (FR-37-6 file step), and **legacy nav RETIRED — `sgs/adaptive-nav` + `sgs/mega-menu` deleted (FR-37-21)**, verified on repo + canary + production. **Shipped but NOT yet live-verified:** `templateLock 'all'` (§3.3a) and the footer column count (FR-37-11 — a footer CPT rendered, but the column count + mobile stacking were never measured). **Still open:** FR-37-33/34/35 (§3 gaps), FR-37-14/15 (tri-state + scoped behaviour CSS), FR-37-7/8 (starter picker), FR-37-26..31 (Simple/Advanced surface + a11y), FR-37-22 (converter emit, gated on Spec 33 Part 2). Full spec: `.claude/specs/37-HEADER-FOOTER-BUILDER.md` |
| **Spec 36 — Navigation System** | **PARTIAL — Phase 1 DONE; mega PROVEN (Gate 3); drawer desktop variants BUILT, Task-5 gate owed** | *(Row refreshed 2026-07-28; the previous text pre-dated Gate 3.)* Shared `store('sgs/nav')`, `sgs/nav-menu`, `sgs/nav-drawer` live on both sites. **Mega menu PROVEN live 2026-07-28 (D401, Gate 3 closed)** — fixture page 1842, all 6 motion effects measured, axe 0 on the OPEN mega + drawer. **Drawer desktop variants BUILT + council-fixed 2026-07-28 (D403/D404)** — per-device `anchor` (incl. centred pause-menu), 7 complete-clone variations, backdrop-click-to-close; **Task 5 exit gate owed** (7 exact-content fixtures + per-variant sweeps + Bean's eye — LEDGER ⭐). **CORRECTED 2026-09-07: plain (non-mega) dropdowns ARE BUILT** — `fc021a340` (2026-07-31, "submenu dropdowns — walker, render, states, live-verified") landed THREE DAYS AFTER the 2026-07-28 record that they were not. `nav-menu/render.php:393-425` carries a real DROPDOWN branch that reuses the mega interactivity store (hover-intent, keyboard, ESC, focus-return, single-open, WCAG 1.4.13). The old "flattens submenu children" claim survived here, in Spec 36 §36-4 and in the file's OWN docblock for ~5 weeks and was repeated by an audit agent reading them. **Main remaining:** Phase 2 utility pieces (mini-cart/search/social/business-info FR-36-19..23) deployed-unexercised; completion map `.claude/reports/2026-07-22-spec36-completion-audit.md` + Spec 36 §6a (fresher). |
| **Floating UI Customiser** | DONE | `Sgs_Floating_UI_Customiser` + `Sgs_Floating_UI_Renderer` replace admin-page approach with live Customiser preview. `sgs/back-to-top` block deprecated to no-op. |

## Non-goals (out of scope this milestone)

- Pipelines P8 (content), P10 (scroll-animation premium), P11 (email campaign), P13 (app
  delivery) — deferred per
  `plans/archive/strategy/2026-04-21-non-essential-pipelines-deferred.md`
- ~~WooCommerce integration (intentionally avoided)~~ **SUPERSEDED 2026-06-03 (D161/D164):** the
  SGS shop layer IS now in scope — Spec 27 (SGS Product & WooCommerce Layer) wraps WooCommerce
  (WC = single source of truth, never mirrored). Phase-1 sell-loop SHIPPED 2026-06-04 (U0/U6
  backend + U3/U4/U7/U5 pill-swap, live on canary page 589). Remaining Phase-1 hardening:
  U9/U10/U8/U11/U1/U12 → the single whole ship gate. Spec:
  `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`. **Spec 30 (WooCommerce page-types —
  PDP/shop/cart/search/schema/variation-gallery/notify-me) COMPLETE + merged to main 2026-06-12
  (D220) — SGS is a sellable shop.**
- Dynamic content system / AI content generation — Phase 6 (not this milestone)

## Hard constraints

- WCAG 2.2 AA on every shipped surface (44px touch targets, 4.5:1 contrast, keyboard navigation)
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
