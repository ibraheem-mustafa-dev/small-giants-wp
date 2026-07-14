---
doc_type: reference
title: Spec 17 §S9 (Header/Footer/Nav System) — FR-by-FR coverage audit
date: 2026-07-14
decision: D328
governing_spec: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S9
purpose: Bean's hard gate — confirm every §S9 FR is built + live-verified BEFORE Spec 33 Part 2
---

# Spec 17 §S9 coverage audit — FR-S9-1 … FR-S9-11

**Bottom line:** **8 of 11 FRs are DONE + live-verified. 3 remain OPEN builds — FR-S9-8, FR-S9-9, FR-S9-10** (each has infrastructure in place but needs block-specific wiring). **Spec 17 §S9 is NOT yet "totally covered"** — these 3 must be built + live-verified before Spec 33 Part 2 (Bean's sequencing gate).

Each row states status against the LIVE build (verified in code + on the sandybrown canary), not the spec's own claims.

| FR | What it requires | Status | Evidence |
|----|------------------|--------|----------|
| **FR-S9-1** | Rule evolution — specialised `site-*` container blocks permitted inside template parts | ✅ **DONE** | `no-header-footer-block.py` regex permits `site-header`/`site-footer`/`adaptive-nav` by construction (no-op verified D323/D327) |
| **FR-S9-2** | `sgs/site-header` (3 named rows, typed palette, empty-row-zero-output) | ✅ **DONE** | Live D324; section-KIND, delegates to `SGS_Container_Wrapper` |
| **FR-S9-3** | `sgs/site-footer` (rows + up to 6 columns + bottom bar) | ✅ **DONE** | Live D325 |
| **FR-S9-4** | `sgs/adaptive-nav` (one menu, 4-tier collapse, mega-menu, overflow auto-collapse) | ✅ **DONE** | Live D326; replaces `core/navigation` → kills the WC Block-Hooks injection |
| **FR-S9-5** | `sgs/mobile-nav` drawer P0 fix + GOV.UK-grade a11y contract | ✅ **DONE** | P0 unclickable-drawer fix live-verified D323 (re-parented to `<body>`) |
| **FR-S9-6** | Per-breakpoint `{desktop,tablet,mobile}` override model (all overridable props) | ✅ **DONE (this session, D328)** | Engine D327; box/width/link-font-size closed D328. Live-verified 1440/375 per tier + per-side inherit; 34 unit tests; qc-council-gated |
| **FR-S9-7** | Never-overflow Cluster + `clamp()` layout | ✅ **DONE** | `scrollWidth ≤ innerWidth` at 320-1440 live-verified (D324 + re-confirmed every measure this session) |
| **FR-S9-8** | Per-device content adaptation (visibility toggle, `showLabel`/`iconOnly`, move-to-drawer, Indus pattern) | ⚠️ **OPEN (partial)** | Universal `device-visibility.php` extension EXISTS (per-tier show/hide). **NOT built:** `showLabel`/`iconOnly` with working `mailto:`/`tel:`, the move-to-drawer drop-zone, the Indus slim-bar reference pattern. |
| **FR-S9-9** | Sticky + transparent-at-rest→solid-on-scroll no-code inspector toggle (3 Material options) | ⚠️ **OPEN (partial)** | `class-sgs-header-behaviours.php` behaviour layer EXISTS (`transparent`/`sticky`/`hide-on-scroll-down` body classes + `is-header-scrolled`). **NOT built:** the no-code inspector toggle on `sgs/site-header` exposing the 3 Material scroll-behaviour options; token-routed transparent→solid state. |
| **FR-S9-10** | Global style defaults + shared Site Info access across header AND footer | ⚠️ **OPEN (partial)** | Footer wires Site Info via `sgs/business-info` (D325). **NOT built:** header does not yet read Site Info; the explicit global-style-defaults inheritance (theme.json / `theme-snapshot.json`) into all 3 blocks isn't wired/verified. |
| **FR-S9-11** | CPT `template` swap + DB reseed (+ Part-2 integration-points doc only) | ✅ **DONE (for §S9 scope)** | Both CPT templates present: `sgs_header`→`sgs/site-header`, `sgs_footer`→`sgs/site-footer` (`class-sgs-block-cpts.php` L133/L161); DB reseeded via `/sgs-update` D328. Step 3 (cloning-pipeline Part 2) is the explicitly-deferred follow-on = **Spec 33 Part 2**. |

## The 3 open builds (each needs its own /strategic-plan + /phase-planner + live-verify)

1. **FR-S9-8 — per-device content adaptation.** Add per-tier visibility (extend/reuse `device-visibility.php`), `showLabel`/`iconOnly` booleans on nav/CTA/contact elements (`iconOnly` email→`mailto:`, phone→`tel:`), a move-to-drawer drop-zone (item renders only inside `sgs/mobile-nav` at the collapsed tier), and reproduce the Indus slim-bar reference pattern. Verify on Indus AND Mama's (R-31-9).
2. **FR-S9-9 — transparent-on-scroll toggle.** Extend the EXISTING `class-sgs-header-behaviours.php` (do not rebuild) with a no-code `sgs/site-header` inspector toggle exposing the 3 Material scroll behaviours; route the transparent→solid state through a CSS custom-property token (Spec 32 no-inline). Regression-test the existing behaviour layer.
3. **FR-S9-10 — global defaults + shared Site Info.** Wire the EXISTING FR-S4-1/2/3 Site Info store into the header (it's already in the footer), and confirm the 3 blocks default their colours/typography/spacing from `theme.json`/`wp_global_styles`/`theme-snapshot.json` tokens (grep-clean of literals). No new store, no new admin page — wiring only.

## Related finding (block-quality, out of §S9 scope but surfaced D328)
The shared `SGS_Container_Wrapper` has **no `style.border` emission** (grep = 0). These blocks declare `__experimentalBorder` with `SkipSerialization`, so their borders (e.g. the footer bottom-bar 1px divider) never render. A universal wrapper-border-emit is a block-quality follow-up (affects every wrapper block that sets a border, not just §S9).

## Gate decision for Bean
Spec 17 §S9 is **8/11 covered**. To declare it "totally covered" (the gate before Spec 33 Part 2), build FR-S9-8, FR-S9-9, FR-S9-10 and live-verify each. Recommend one focused session per FR (they're independent). FR-S9-11's Part-2 plumbing IS Spec 33 Part 2 itself, so it's correctly sequenced after this gate.
