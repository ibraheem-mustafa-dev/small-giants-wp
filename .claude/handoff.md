---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-14
session: D330 — FR-S9-9 (3 header behaviours, no-code block controls) SHIPPED + theme header-mode system RETIRED + FR-S9-10 live-confirmed → §S9 now 10/11
---

# Session Handoff — 2026-07-14 (D330)

## Completed This Session (the §S9 checkpoint)
1. **FR-S9-10 confirm (commit `ba21fccf`, live).** Added a `sgs/business-info` (phone) to the header top row in `parts/header.html` + `framework-header-default.php` (out-of-box header/footer Site-Info parity). Live-verified on sandybrown: a `phone` set ONCE in `sgs_site_info` renders in BOTH the header (inside `<header>`) AND footer (inside `<footer>`) + the Org schema. Blocks literal-free. No overflow at 375. 2nd-client universality by-construction (no live indus deployment). Theme 1.5.14→1.5.15.
2. **FR-S9-9 built + live (commit `7a054e11`).** 3 behaviours (sticky / transparent-at-rest→solid-on-scroll / shrink-on-scroll) + a contrast-safe fallback as INDEPENDENT no-code toggles on the `sgs/site-header` block inspector (a "Header behaviour" ToolsPanel, Settings tab). Bridge `Sgs_Header_Behaviours::resolve_active_header_behaviour()` reads the block attrs off the active header part (via `SGS_Nav_Menu_Source::get_header_content()`) at `body_class` time → `sgs-header-behaviour-{flag}` classes. Delivered independent-axes (Kadence model).
3. **qc-council (2 cross-model raters) pre-build = NO-GO-as-scoped → corrected.** It surfaced a THIRD, fully-built parallel header-behaviour system (theme-side `inc/class-header-behaviour.php` + `header-behaviour.js` w/ its OWN `--sgs-header-height` publisher + `header-modes.css` + `_sgs_header_mode` post-meta + Settings page; silent only because `sgs_header_mode=static`). Corrections applied: scroll-driven shrink (never writes `--sgs-header-height` from CSS — no publisher race), scrim/force-solid as the WCAG modes (text-shadow cosmetic-only), scrim `::before` pointer-events:none + z-index, own `is-header-shrunk` class, literal attr keys for the dead-control guard, inverted FS-2 fallback.
4. **Task 2b (theme-system retirement) merged into this build.** Deleted `theme/sgs-theme/inc/class-header-behaviour.php` + `assets/js/header-behaviour.js` + `assets/css/header-modes.css` + `assets/js/header-editor-panel.js`; removed the functions.php `require` + conditional enqueue; stripped the mode-specific rules from `core-blocks-critical.css`. Proven dormant first (canary `sgs_header_mode=static`, live header renders `parts/header.html`); `php -l` clean; 0 remaining refs. The plugin body-class layer is now the SOLE header-behaviour system.
5. **Live-verified everything** (sandybrown, full cache clear incl. Hostinger CDN, plugin 0.1.3): sticky pinned `top:0` + single `--sgs-header-height:121px` + `scroll-padding-top:121px`; transparent absolute `rgba(0,0,0,0)`→`rgb(251,243,220)` on scroll; shrink `is-header-shrunk` + padding reduced; scrim `::before` gradient pointer-events:none inset:0; old theme header JS/CSS gone (0); 0 console errors; no overflow; no inline style. Shipped default `headerSticky:true`. Plugin 0.1.2→0.1.3, theme 1.5.15→1.5.16.
6. **Task 2b FULLY COMPLETE (commit `87dd869d`, Bean-directed).** Beyond the theme system (step 4), the SECOND legacy path — the plugin-side Customiser (`Sgs_Header_Customiser`/`Sgs_Footer_Customiser`/`Sgs_Header_Renderer`/`Sgs_Footer_Renderer`) — was also retired (4 classes + register() calls deleted; kept `Sgs_Site_Info_Customiser` + `Sgs_Header_Rules`), plus the 3 inert alt-header stubs (`header-{sticky,transparent,shrink}.html` + patterns + theme.json registrations; `header-minimal` kept). Proven dormant first (canary Customiser options never existed; only a `.page-id-144` clone-debug rule used the injected `.sgs-header` class). Live-verified header/footer unchanged, 0 PHP fatals. theme 1.5.16→1.5.17. Archived `P-CUSTOMISER-HEADER-FOOTER-RETIRE` + `P-ALT-HEADER-PART-STUBS`.
7. **Docs:** Spec 17 FR-S9-9/S9-10 BUILT+LIVE notes; coverage audit → 10/11; decisions.md D330 (+ Task 2b-complete addendum); state.md; parking.md reconciled; visual-diff report; `/sgs-update --stage 1` (4 new attrs); this handoff.

## Current State
- **Branch:** `main` at `7a6b55f9` (docs), retirement `87dd869d`, FR-S9-9 `7a054e11`, FR-S9-10 `ba21fccf` — all pushed.
- **Build:** gates green (dead-control 0, control-ux PASS, conformance/F5 pre-existing-only, box-family). `HeaderBehavioursTest.php` rewritten to 13 multi-flag tests (PHPUnit NOT runnable in-env — no vendor/composer — logic hand-traced).
- **Deployed + live:** sandybrown carries all D330 changes, live-verified. Plugin 0.1.3, theme 1.5.16.
- **Uncommitted:** pre-existing session-start dirt only (lucide-icons.php build-regen, package-lock.json, reports/phase4-*.txt, root .db files, .claude/reports/inline-styling-audit-*) — NOT this session's. The FR-S9-9 design doc lives at `.claude/scratch/fr-s9-9-design-2026-07-14.md` (gitignored scratch — has the full qc-council verdict + corrected fix-shapes).

## Known Issues / Blockers
- None block the next session.
- **Task 2b is now FULLY COMPLETE** (both legacy header/footer paths retired — theme-side + plugin-side Customiser; commit `87dd869d`). Header/footer editing is now the Site Editor alone (block controls + FR-S9-9 behaviour toggles), one home.
- **Editor UI is build-verified + attr-round-trip-proven (via the live bridge), not click-tested** in the Site Editor — a light follow-up (fold into the FR-S9-8 /qc pass).
- **`.page-id-144` clone-debug rule** (mamas-munches.css) referenced the retired `.sgs-header` injected class → now inert on that verification page (sticky comes from the block toggle; homepage unaffected). Non-blocking.

## Next Priorities (BEAN'S DIRECTIVE: FR-S9-8 → adversarial-council the WHOLE §S9 at completion → sign-off → Spec 33 Part 2 ASAP)
1. **BUILD FR-S9-8 (per-device content adaptation) — the SINGLE remaining §S9 build.** Its own `/strategic-plan` + `/phase-planner`: per-tier visibility (extend `device-visibility.php`), `showLabel`/`iconOnly` on business-info (contact) + adaptive-nav (nav) with working `mailto:`/`tel:` (the plumbing exists in business-info render.php L67-105), a move-to-drawer drop-zone (new tier-gated InnerBlocks slot in `sgs/mobile-nav`), reproduce the Indus slim-bar pattern (≤1024 logo + Call button; email/social→drawer; footer 3→1 at 768). Verify on Indus AND Mama's (R-31-9).
2. **THEN a thorough `/adversarial-council` on the WHOLE Spec 17 §S9 implementation at completion** (Bean-directed) — once FR-S9-8 lands, red-team the entire header/footer/nav system (all 11 FRs) as built: the block set, the shared wrapper, the responsive engine, the behaviour layer, the drawer a11y, the Site-Info wiring — find what will break/be-exploited/regress before sign-off. This is the pre-sign-off stress-test gate.
3. **Present the FR-S9-1..11 coverage audit for Bean's "totally covered" sign-off** once FR-S9-8 lands + the council clears (10/11 → 11/11).
4. **THEN start Spec 33 PART 2 — Bean wants this ASAP** — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`). HARD gate: do NOT start until §S9 sign-off. Fold in the recogniser multi-flag update (`P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG` — write `sgs/site-header` block attrs, not the retired `sgs_header_rules` option).

## Files Modified
| File path | What |
|-----------|------|
| `plugins/sgs-blocks/src/blocks/site-header/{block.json,edit.js}` | 4 behaviour attrs + "Header behaviour" ToolsPanel |
| `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php` | bridge resolver + independent-flag body classes |
| `plugins/sgs-blocks/src/header-behaviours/view.js` | flag-set read + independent `is-header-shrunk` |
| `plugins/sgs-blocks/assets/css/header-behaviours.css` | independent-flag rules + scroll-driven shrink + contrast-safe |
| `plugins/sgs-blocks/tests/php/HeaderBehavioursTest.php` | 13 multi-flag tests |
| `plugins/sgs-blocks/sgs-blocks.php` | SGS_BLOCKS_VERSION 0.1.2→0.1.3 |
| `theme/sgs-theme/functions.php` + `assets/css/{core-blocks-critical,utilities}.css` | theme header-mode system de-registered + mode CSS stripped |
| `theme/sgs-theme/{parts/header.html,patterns/framework-header-default.php}` | headerSticky default + FR-S9-10 phone |
| `theme/sgs-theme/style.css` | 1.5.15→1.5.16 |
| (deleted) `theme/sgs-theme/inc/class-header-behaviour.php`, `assets/js/header-behaviour.js`, `assets/css/header-modes.css`, `assets/js/header-editor-panel.js` | theme header-mode system |
| `.claude/{decisions.md,state.md,parking.md,specs/17-*,reports/2026-07-14-spec17-s9-coverage-audit.md}` + `reports/visual-diff/*` | D330 record |

## Notes for Next Session
- **Header renders from `parts/header.html`** (file-based FSE part), NOT the pattern — editing the pattern alone does nothing live (proven Step A). The rules-engine `filter_template_part` is unreachable (templates emit `{"slug":"header","tagName":"header"}` with no `area` key), so core renders the part.
- **The bridge reads block attrs off the header part** via `SGS_Nav_Menu_Source::get_header_content()` (DB template-part post named "header" → `parts/header.html` fallback). Setting a behaviour = edit the block attr in `parts/header.html` (+ the pattern for the inserter).
- **Cache-bust discipline held live:** the scrim didn't render until `SGS_BLOCKS_VERSION` bumped (0.1.2→0.1.3) + the Hostinger CDN cleared (`hosting_clearWebsiteCacheV1`) — a new CSS rule under an unchanged `?ver` serves stale (STOP-CSS-VER-CACHE-BUST + CDN).
- **`header-behaviours/view.js` is src-only** (no build output; enqueue falls back to `src/`); it must be deployed to the server's `src/header-behaviours/` path.

## Next Session Prompt
See `.claude/next-session-prompt.md` (canonical) — carries the MANDATORY READING GATE, the anti-pattern STOP catalogue, the pre-flight self-attestation ritual, and the FR-S9-8 orchestration plan.
