---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-14
session: D334-D335 — cleared the 5 deferred §S9 must-fixes + business schema + repo-wide doc reconcile, then pre-sign-off QA + a11y/social polish; Bean set 3 new gates before sign-off
---

# Session Handoff — 2026-07-14 (D334 → D335)

## Completed This Session
1. **Task 1 — uid determinism (D334, `776a4c35`).** site-header/site-header-row/site-footer-row derived their scoped-`<style>` uid from `wp_unique_id()` (per-request counter). Proven live: the footer uid SHIFTED across pages (sfr-6/7 vs 12/13). Fixed → `md5(wp_json_encode($attributes))` matching the wrapper (STOP-NO-KSORT). qc-council-gated. Live: identical uid across 6 pages, scoped CSS lands, 0 visual change at 375/1440.
2. **Task 3 — 2nd-client universality (D334).** Deployed theme+blocks to palestine-lives.org (Indus); §S9 header/footer/adaptive-nav render with Indus's own Site Info, 0 header/footer overflow at 375/1440. R-31-9 now demonstrated, not by-construction.
3. **Task 4 — wrapper golden test (D334).** `tests/php/ContainerWrapperTest.php` + a standalone runner pin `SGS_Container_Wrapper` for all 3 KINDs + the uid-stability invariant — 36/36 pass.
4. **Task 6 — business schema, Bean-added (D334).** Central Org emitter upgrades `Organization`→`LocalBusiness` on a complete address (gated on `addressLocality`), emits `OpeningHoursSpecification` (defensive am/pm-aware parser, omits split/closed days), and parses the multi-line Site-Info address into structured `PostalAddress`. LIVE: Mama's stays Organization (no address); **Indus is a valid LocalBusiness with its real Birmingham address + hours** (split-Friday safely omitted). `SiteNavigationElement` confirmed inert.
5. **Task 5 — mega-menu reconcile (D334).** Bean chose accordion + no-AJAX; FR-S9-4 reconciled.
6. **Task 2 — repo-wide `/doc-audit` reconcile (D334, `01a038f3`).** §S9 spec + architecture.md/01-SGS-THEME/02/29/31/32/00 corrected (build-pending→built; phantom `box_side` column removed; `{base}Hover` documented; the `#uid`→`.uid` D303 correction); 7 shipped plans archived.
7. **Pre-sign-off QA, both clients (D335).** Live DOM+CSS + a11y/WCAG. Structure solid (0 overflow, no inline styles, landmarks). Real MINOR findings: Indus drawer socials/email dark-on-teal (1.4.3), header icons 16×16 (2.5.8), toggle no `aria-controls` (4.1.2), duplicate "© 2026". A footer "invisible text" was a FALSE alarm (measurement-vs-eye — pixel-confirmed visible gold).
8. **a11y/social polish SHIPPED (D335, `ddb9b2fe`, 3 parallel Sonnet branches, live-verified).** `sgs/social-icons` `source=manual|site-info` (Site Info socials, "2 ways") + 44px floor; `sgs/business-info` 44px + invisible-on-dark fix (`var(--x,currentColor)` fallback) + duplicate-© dedup; `sgs/mobile-nav-toggle` aria-controls; framework drawer — removed the redundant placed socials block (drawer now one clean styled social set + visible email). Theme 1.5.21→1.5.22.
9. **Hidden parallel system found (D335).** mobile-nav `render_socials_zone()` reads `sgs_social_*` options, not Site Info — a 2nd social store (violates Bean's one-source principle).

## Current State
- **Branch:** `main` at `ddb9b2fe`. D-ceiling **D335**. Plugin+theme **1.5.22**.
- **Tests:** wrapper golden 36/36; build gates green (dead-control 0-net-new, F3 0-net-new, box-family clean, visual-diff all blocks PASS, cheat-gate 0 NEW). PHPUnit not runnable in-env.
- **Build:** passes. Deployed + live-verified on sandybrown + palestine-lives (full cache-clear incl. Hostinger CDN).
- **Uncommitted:** the D335 handoff docs (committing in this handoff); pre-existing session-start dirt (lucide-icons.php, package-lock, phase4-*.txt, root .db, rr.json — NOT this session's).

## Known Issues / Blockers
- **§S9 sign-off NOT given** — Bean set 3 gates: (1) remove `sgs/mobile-nav` → adaptive-nav global (design-gate first), (2) one-source business info, (3) Site-Editor builder UX analysis.
- Task 1 (mobile-nav removal) is HIGH-BLAST-RADIUS (absorbs the FR-S9-5 drawer a11y contract) — must be design-gated + Bean-approved before building. None of the 3 gates block the next session from starting.

## Next Priorities (in order)
1. **DESIGN-GATE the mobile-nav→adaptive-nav re-architecture** (how adaptive-nav absorbs the drawer + FR-S9-5 a11y contract + the socials zone), get Bean's approval, then build + live-verify the a11y contract on 2 clients.
2. **One-source business info** — unify the mobile-nav `sgs_social_*` store → Site Info (folds into #1) + grep-audit for any other hardcoded/parallel business store.
3. **Site-Editor visual-builder UX analysis** (same depth as the frontend QA) — the block-editor experience clients use to build the header/footer.
4. **Present the FR-S9-1..11 audit for Bean's "§S9 totally covered" sign-off** → THEN Spec 33 Part 2.

## Files Modified
| File path | What |
|-----------|------|
| `plugins/sgs-blocks/src/blocks/{site-header,site-header-row,site-footer-row}/render.php` | uid → md5(attributes) (D334) |
| `plugins/sgs-blocks/includes/class-org-website-schema.php` | LocalBusiness upgrade + OpeningHoursSpecification + multi-line PostalAddress parse (D334) |
| `plugins/sgs-blocks/tests/php/{ContainerWrapperTest.php,run-container-wrapper-standalone.php}` | wrapper golden test (D334) |
| `plugins/sgs-blocks/src/blocks/{social-icons,business-info}/*` + `mobile-nav-toggle/render.php` + `mobile-nav/edit.js` | a11y/social polish (D335) |
| `theme/sgs-theme/parts/header.html` + `patterns/framework-header-default.php` + `style.css` | drawer socials de-dup + theme 1.5.22 (D335) |
| `.claude/specs/17-*` + `architecture.md` + `01/02/29/31/32/00` + 7 plans→archive + `decisions.md` D334/D335 + `reports/2026-07-14-*` + `reports/visual-diff/*` | doc reconcile + records (D334/D335) |

## Notes for Next Session
- **The mobile-nav removal is design-gate territory (Rule 7)** — adaptive-nav must absorb the whole FR-S9-5 a11y drawer contract (focus-trap/ESC/scroll-lock/D323 P0 re-parent/socials/toggle). Do NOT rush it; design + Bean-approve first.
- **Bean's one-source principle is now binding** — all business info from Site Info, optional, never hardcoded/parallel. The `sgs_social_*` store is the first violation to fix.
- **The mobile-nav block already renders its OWN styled socials** (`render_socials_zone`, the nice coloured buttons) — the placed socials block in the drawer template was redundant (removed D335). Whatever absorbs the drawer must keep a single styled social set sourced from Site Info.
- **measurement-vs-eye**: pixel-confirm any contrast/colour "fail" before flagging (a false invisible-text alarm this session).
- Cache-bust held: theme change needs the `style.css` Version bump + Hostinger CDN clear before measuring.

## Next Session Prompt
See `.claude/next-session-prompt.md` (canonical) — carries the MANDATORY READING GATE, the anti-pattern STOP catalogue (incl. 3 new D335 STOPs: DESIGN-GATE-HIGH-BLAST-RADIUS, ONE-SOURCE-BUSINESS-INFO, MEASUREMENT-VS-EYE), the pre-flight self-attestation, and the 3-task orchestration plan (design-gate the nav re-architecture → one-source → builder UX → sign-off).
