---
doc_type: reference
title: Spec 17 §S9 (Header/Footer/Nav System) — FR-by-FR coverage audit
date: 2026-07-14
decision: D328
governing_spec: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S9
purpose: Bean's hard gate — confirm every §S9 FR is built + live-verified BEFORE Spec 33 Part 2
---

# Spec 17 §S9 coverage audit — FR-S9-1 … FR-S9-11

**Bottom line (updated D331, 2026-07-14):** **ALL 11 FRs are DONE + live-verified.** FR-S9-8 (per-device content adaptation) BUILT + live-verified this session (D331) — all four acceptance bullets pass on the sandybrown canary (per-tier visibility at canonical 767/1023; iconOnly email→mailto/phone→tel + accessible names; move-to-drawer email/social; Indus slim-bar reproduction with logo + Call button + footer 3→1). FR-S9-9 + FR-S9-10 shipped D330. **Spec 17 §S9 is now fully built** — pending (per Bean's directive) a thorough `/adversarial-council` on the WHOLE §S9 as built, then Bean's "totally covered" sign-off (the hard gate before Spec 33 Part 2). **2nd-client caveat (honest):** verified live on sandybrown only; universality is by-construction (no live indus-foods deployment exists).

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
| **FR-S9-8** | Per-device content adaptation (visibility toggle, `showLabel`/`iconOnly`, move-to-drawer, Indus pattern) | ✅ **DONE + LIVE (D331)** | Per-tier visibility routed through canonical `SGS_Breakpoints` (767/1023, R-31-1) + universal `render_block` leading-`<style>` bug fixed; `showLabel`/`iconOnly` on `sgs/business-info` (icon-only `tel:`/`mailto:` + accessible name); drawer `ALLOWED_BLOCKS` widened → move-to-drawer email/social; Indus slim-bar authored in `parts/header.html` (icon-strip desktop → logo + Call button ≤1024, email/social in drawer, footer 3→1 at 768). Live-verified all tiers; nav iconOnly descoped (Bean); 2nd-client by-construction. `business-info-2026-07-14.md` + `mobile-nav-2026-07-14.md`. |
| **FR-S9-9** | 3 header behaviours (sticky + transparent-on-scroll + shrink) as SITE-EDITOR block-inspector controls (D329, Bean added shrink) | ✅ **DONE + LIVE (D330, `7a054e11`)** | Independent no-code toggles on the `sgs/site-header` inspector (`headerSticky`/`headerTransparent`/`headerShrink` + `contrastSafe`), bridged to the plugin body-class layer via `resolve_active_header_behaviour()` (reads block attrs off the active header part). qc-council-gated (NO-GO→corrected: scroll-driven shrink, scrim/force-solid WCAG modes, own `is-header-shrunk` class). Live-verified all 3 + scrim on sandybrown; **the parallel theme-side header-mode system was RETIRED** (Task 2b — files deleted, single `--sgs-header-height` publisher, one home). |
| **FR-S9-10** | Global style defaults + shared Site Info access across header AND footer | ✅ **DONE + LIVE-CONFIRMED (D330, `ba21fccf`)** | A `phone` set ONCE in `sgs_site_info` renders in BOTH the header (business-info added to the header top row) AND footer live on sandybrown + the Org schema; 3 blocks literal-free (token-with-fallback). No new store/binding/admin page. Caveat: ≥2-client universality is by-construction (no live indus deployment exists; client-agnostic blocks + per-site store/tokens). |
| **FR-S9-11** | CPT `template` swap + DB reseed (+ Part-2 integration-points doc only) | ✅ **DONE (for §S9 scope)** | Both CPT templates present: `sgs_header`→`sgs/site-header`, `sgs_footer`→`sgs/site-footer` (`class-sgs-block-cpts.php` L133/L161); DB reseeded via `/sgs-update` D328. Step 3 (cloning-pipeline Part 2) is the explicitly-deferred follow-on = **Spec 33 Part 2**. |

## No open builds — §S9 is 11/11 (superseded status, kept for history)

> The section below is HISTORICAL (D330-era, when FR-S9-8 was the last open build). FR-S9-8 shipped D331; §S9 has been 11/11 BUILT since. The D333 adversarial-council + D334 must-fix pass are the pre-sign-off gate — see the top-line + the D334 note below.

**All 11 FRs BUILT + live** (FR-S9-8 shipped D331; FR-S9-9/10 D330; FR-S9-1..7/11 D323-D328). The 5 deferred council must-fixes are cleared as of D334 (2026-07-14): uid determinism (shipped, live-verified), the repo-wide `/doc-audit` reconcile (this pass), 2nd-client universality (palestine-lives/Indus live-verified), the shared-wrapper golden test (36/36 pass), and the mega-menu accordion-vs-drill-down reconcile (Bean-decided: accordion + no-AJAX). Plus Bean-added Task 6 (business schema → LocalBusiness+hours, proven on Indus live).

## Related finding (block-quality, out of §S9 scope but surfaced D328)
The shared `SGS_Container_Wrapper` has **no `style.border` emission** (grep = 0). These blocks declare `__experimentalBorder` with `SkipSerialization`, so their borders (e.g. the footer bottom-bar 1px divider) never render. A universal wrapper-border-emit is a block-quality follow-up (affects every wrapper block that sets a border, not just §S9).

## Gate decision for Bean (updated D334, 2026-07-14)
Spec 17 §S9 is **11/11 BUILT + live-verified**, the spec is reconciled to the shipped code (this doc-audit pass), and the 5 deferred council must-fixes + Bean's Task 6 schema ask are all cleared and live-proven (uid determinism on 2 sites; Indus 2nd-client live; wrapper golden test 36/36; mega-menu accordion locked; LocalBusiness+hours proven on Indus). This is the state presented for Bean's **"§S9 totally covered" sign-off** — the hard gate before Spec 33 Part 2. FR-S9-11's Part-2 plumbing IS Spec 33 Part 2 itself, correctly sequenced after this gate.
