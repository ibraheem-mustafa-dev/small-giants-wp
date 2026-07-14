---
doc_type: reference
title: Spec 17 §S9 (Header/Footer/Nav System) — FR-by-FR coverage audit
date: 2026-07-14
decision: D328
governing_spec: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S9
purpose: Bean's hard gate — confirm every §S9 FR is built + live-verified BEFORE Spec 33 Part 2
---

# Spec 17 §S9 coverage audit — FR-S9-1 … FR-S9-11

**Bottom line (updated Bean 2026-07-14):** **9 of 11 FRs are DONE. 2 remain as real BUILDS — FR-S9-8 and FR-S9-9.** FR-S9-10 is DONE by capability (both header + footer rows already allow `sgs/business-info` reading the one Site Info store; the 3 blocks are literal-free) — it needs a live cross-client CONFIRM, not a build. **Spec 17 §S9 is NOT yet "totally covered"** — build FR-S9-8 + FR-S9-9 + confirm FR-S9-10 live, then Bean's sign-off, before Spec 33 Part 2.

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
| **FR-S9-9** | 3 header behaviours (sticky + transparent-on-scroll + shrink-on-scroll-down) as SITE-EDITOR block-inspector controls (D329, Bean added shrink) | ⚠️ **OPEN (build)** | Mechanics ALL EXIST: `class-sgs-header-behaviours.php` (`transparent`/`sticky`/`hide-on-scroll-down` + `is-header-scrolled`/`is-header-scrolling-down`); `header-modes.css` (sticky/transparent→solid/shrink/smart-reveal); theme parts `header-{shrink,sticky,transparent}.html`. **NOT built:** the no-code inspector toggles on `sgs/site-header` (selection is via template-part variants + the Customiser today); add `shrink` to the recognised set; token-routed state. **Linked:** retire the leftover Customiser header/footer path (`Sgs_Header_Customiser`/`Sgs_Footer_Customiser`/`Sgs_Header_Renderer`) — Site Editor is the single home (D329). |
| **FR-S9-10** | Global style defaults + shared Site Info access across header AND footer | ✅ **DONE by capability (Bean, 2026-07-14) — confirm-only** | `sgs/business-info` is in the allowedBlocks of BOTH `site-header-row` AND `site-footer-row` and reads the one `sgs_site_info` store → a value set once renders in both (the acceptance criterion). Global-style-defaults half: grep for hardcoded colour/font literals in all 3 blocks' render.php/style.css = **empty** (they inherit theme tokens). Remaining is CONFIRM-only, not a build: (a) live cross-client verify (set a Site Info value → renders in a header + footer business-info variant on mamas + indus); (b) OPTIONAL — pre-place a business-info variant in the default header pattern for out-of-box (the footer already does). |
| **FR-S9-11** | CPT `template` swap + DB reseed (+ Part-2 integration-points doc only) | ✅ **DONE (for §S9 scope)** | Both CPT templates present: `sgs_header`→`sgs/site-header`, `sgs_footer`→`sgs/site-footer` (`class-sgs-block-cpts.php` L133/L161); DB reseeded via `/sgs-update` D328. Step 3 (cloning-pipeline Part 2) is the explicitly-deferred follow-on = **Spec 33 Part 2**. |

## The 3 open builds (each needs its own /strategic-plan + /phase-planner + live-verify)

1. **FR-S9-8 — per-device content adaptation.** Add per-tier visibility (extend/reuse `device-visibility.php`), `showLabel`/`iconOnly` booleans on nav/CTA/contact elements (`iconOnly` email→`mailto:`, phone→`tel:`), a move-to-drawer drop-zone (item renders only inside `sgs/mobile-nav` at the collapsed tier), and reproduce the Indus slim-bar reference pattern. Verify on Indus AND Mama's (R-31-9).
2. **FR-S9-9 — transparent-on-scroll toggle.** Extend the EXISTING `class-sgs-header-behaviours.php` (do not rebuild) with a no-code `sgs/site-header` inspector toggle exposing the 3 Material scroll behaviours; route the transparent→solid state through a CSS custom-property token (Spec 32 no-inline). Regression-test the existing behaviour layer.
3. **FR-S9-10 — global defaults + shared Site Info.** Wire the EXISTING FR-S4-1/2/3 Site Info store into the header (it's already in the footer), and confirm the 3 blocks default their colours/typography/spacing from `theme.json`/`wp_global_styles`/`theme-snapshot.json` tokens (grep-clean of literals). No new store, no new admin page — wiring only.

## Related finding (block-quality, out of §S9 scope but surfaced D328)
The shared `SGS_Container_Wrapper` has **no `style.border` emission** (grep = 0). These blocks declare `__experimentalBorder` with `SkipSerialization`, so their borders (e.g. the footer bottom-bar 1px divider) never render. A universal wrapper-border-emit is a block-quality follow-up (affects every wrapper block that sets a border, not just §S9).

## Gate decision for Bean
Spec 17 §S9 is **8/11 covered**. To declare it "totally covered" (the gate before Spec 33 Part 2), build FR-S9-8, FR-S9-9, FR-S9-10 and live-verify each. Recommend one focused session per FR (they're independent). FR-S9-11's Part-2 plumbing IS Spec 33 Part 2 itself, so it's correctly sequenced after this gate.
