---
doc_type: plan
title: Indus intake review block builds
date: 2026-10-13
specs: [48, 36, 32, 38A]
parent: .claude/plans/2026-10-11-spec48-indus-build.md (step 15, Bean's review)
---

# Indus intake review block builds

Bean's intake review of the Indus Foods draft (plan step 15, 2026-10-13) found framework gaps the skeleton choices depend on. Each item below is a decision Bean approved in the review chat; every new setting defaults to off or empty, so other clients' output is unchanged.

## Lanes (parallel, one git worktree each, merged by the main thread)

| Lane | Model | Items | Files it owns |
|---|---|---|---|
| A. Button and form | Sonnet | 1, 2, 8 | `src/blocks/button/`, `src/blocks/form/` (submit only), the shared lift helper (new), `src/components/ShadowLiftControls.js`, `includes/helpers-shadow-hover.php` callers |
| B. Gallery | Sonnet | 5 | `src/blocks/gallery/` |
| C. Floating UI gradient | Sonnet | 3 | `includes/class-sgs-floating-ui-*.php`, a Customiser control bridge, the gradient picker variant audit |
| D. Drawer upgrade (non-motion) | Opus | 7, 9 | `src/blocks/nav-drawer/`, `src/blocks/nav-drawer-menu/`, `src/blocks/mega-panel/` (drawer copy), `src/blocks/container/` (pin option), `includes/nav-drawer-*.php` |
| E. Link sources | Opus | 10 | `includes/helpers-link-source.php`, `src/utils/link-source.js`, `src/components/LinkSourcePicker.js`, every shared link field, the `check-link-source-adoption` gate |
| F. Business info | Sonnet | 11, 12 | `src/blocks/business-info/` |
| Main thread | Opus | 4 | `scripts/computed-route/lib/intake-review.mjs`, `intake-run-finalise.mjs`, `data/intake.schema.json`, Spec 48 Appendix C |

Motion items (the caret ring's hover glow, the close button's hover turn, the drifting rings, the drawer stagger's first delay and reach, the footer band's rise-in, the exit easing) go to the Spec 38A session first; lane D builds only what that session's plan does not cover (Bean, 2026-10-13: a working upgrade now, Spec 38A standardises the controls). The Spec 38A session's answer: the ringed caret box itself, declared parts for the close button, footer band, rings and caret, the pin option and a plain-CSS ring drift (no controls) are lane D's; the glow ring, the flatten-nested stagger order, colour in state and open values, the alternate ambient float and the hover group (`source: group`, a container's hover driving its inner blocks' own hover states, for the footer's inline Back to top) are in Spec 38A's v1.6 list.

## Items

1. Form submit button: hover lift, resting shadow and hover shadow, reusing `sgs/button`'s lift (moved into a shared helper, PHP plus JS twin) and the shared shadow-hover helper (`includes/helpers-shadow-hover.php`, `src/utils/shadow-hover.js`, `ShadowLiftControls` given an attribute-prefix prop).
2. `sgs/button`: show the Site Info value as the label when the link source is phone, email or WhatsApp.
3. Reading progress bar (Floating UI, Customiser): a gradient colour through the shared gradient value and sanitiser; audit the gradient picker variants (`GradientCapableColourControl`, `gradient-picker`, `FlowingGradientRowControls`, `GradientOverlayControl`) and record which suits which element.
4. Review: a `remove` mark for skeleton rows (absorbed into the parent block).
5. `sgs/gallery`: a link per image (URL and label; a linked image does not open the lightbox), logo tile styling (fill, border, radius, min height, contain fit) and the lift-plus-shadow hover; used for the Brands mega menu's logo grid.
6. Pipeline (Spec 47 R2, FR-48-6, later): propose a client's already-built surfaces in the review, and detect navigation as `sgs/nav-bar-menu`.
7. Drawer: an opt-in sticky top row (`chromeSticky`); a top-row slot that holds an `sgs/social-icons` group (phone, email or social icons from Site Info); a box around the drawer logo (fill, radius, padding, shadow); a fill colour for the close button; the number ornament's typography; scroll the opened row into view; the mega panel's drawer copy gets a card shell (radius, padding, shadow), a link-row hover fill and the stacked feature-card layout with the tag over the photo, and its card radius and padding print outside compact mode too.
8. `sgs/button`: a filled circle behind the icon (`iconBackground`, `iconShapeSize`).
9. `sgs/container`: an opt-in "pin to edge" setting (sticky top or bottom per device inside the nearest scroll container, with safe-area padding).
10. Link sources: every shared link field offers one link source in the link popover (a typed URL, a page by ID, any Site Info link, back to top), resolved by `includes/helpers-link-source.php::sgs_resolve_link_source` with a JS twin; with no source set the output is byte-identical (20 call sites: 19 adopted, 1 exempt, none missing; `check-link-source-adoption` fails on a new unadopted field). Replaces typed `tel:` and Google URLs for good.
11. `sgs/business-info`: an `open-status` display (an open or closed pill with a dot, and "Closes at 5pm today"), computed in the visitor's browser in the business time zone so page caching cannot freeze it.
12. `sgs/business-info`: a map source, the typed address (default) or the business listing (business name plus address).

Gradient picker variants (item 3 audit, lane C): `GradientCapableColourControl` is a colour that can also be a gradient (a flat attribute plus a `*Gradient` sibling; the one for any block colour row); `gradient-picker` (`SgsGradientPicker`) is the raw editor other controls wrap; `GradientOverlayControl` is a gradient layer over an image or video; `FlowingGradientRowControls` drives the animated wave-gradient effect, not a gradient string; `sgs_css_gradient_value` (`includes/helpers-tokens.php`) is the one server sanitiser; `helpers-gradient-tone.php` judges a gradient dark or light; `helpers-svg-gradient.php` turns a gradient into SVG defs for icon strokes. The Customiser cannot host the block editor's picker (its data stores are not loaded there), so the reading-progress gradient is a validated text field with a live swatch.

## Done when

Each lane: its new settings have inspector controls, render with no inline `style=""` (`node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0), `npm run build` passes, the block's existing tests pass, a negative control proves each new setting's default emits nothing, and a positive case proves it paints. After merging: one DB reseed through the serial queue, a deploy to sandybrown, and a live check of each block at 375/768/1440 in the editor and on the front end (batched, one pass).

Status (2026-10-13): items 1 to 5 and 7 to 12 are built, merged on origin/main and reseeded (818435119), with the session-close council's fixes (3bbcd801f, 8d03dfb8f: "9-5" hours, closed days, a linked gallery tile's accessible name, a bare `tel:`, the progress gradient spanning the viewport, reduced motion cancelling the lift, a Site Info email label obscured). The fast gates pass. Not done: item 6 (now the FR-48-6 pending rules, next session's first task), the sandybrown deploy and the batched live check. The deploy is blocked by build-deploy.py's tarball guard (51 MB against 45 MB): measured, the +10.35 MB jump arrived in 8ab517128 (Spec 38A M1.3, the motion definitions reached every block bundle through the `src/components` barrel); the Spec 38A session is shipping the motion-definitions handle and two `TAR_EXCLUDES` entries (about 41 MB) and will deploy these lanes with it. Next session: the scoped `sideEffects` setting in `plugins/sgs-blocks/package.json` (`["*.css","*.scss","./src/blocks/extensions/**","./src/bindings/**"]`, measured 38.56 to 27.35 MB; an unscoped one silently drops the extensions' and bindings' registrations) with an editor smoke test of the extension panels and bindings. Accepted by Bean: the decorative ring drift loops (as the draft's rings do, a small in-place pulse).
