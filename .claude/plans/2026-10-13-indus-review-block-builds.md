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
| E. Review `remove` mark | main thread | 4 | `scripts/computed-route/lib/intake-review.mjs`, `intake-run-finalise.mjs`, `data/intake.schema.json`, Spec 48 Appendix C |

Motion items (the caret ring box and its hover glow, the close button's hover turn, the drifting rings, the drawer stagger's first delay and reach, the footer band's rise-in, the exit easing) go to the Spec 38A session first; lane D builds only what that session's plan does not cover (Bean, 2026-10-13: a working upgrade now, Spec 38A standardises the controls).

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

## Done when

Each lane: its new settings have inspector controls, render with no inline `style=""` (`node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0), `npm run build` passes, the block's existing tests pass, a negative control proves each new setting's default emits nothing, and a positive case proves it paints. After merging: one DB reseed through the serial queue, a deploy to sandybrown, and a live check of each block at 375/768/1440 in the editor and on the front end (batched, one pass).
