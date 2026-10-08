/**
 * Attribute names that are editor-invisible by design (CHECK A exemption set).
 */

'use strict';

// Escape hatch for a destructured+written attribute that is LEGITIMATELY
// editor-invisible by design (e.g. pure a11y text, SEO-only fields, attrs
// that only affect frontend interactivity with zero visual editor
// difference). Kept tiny and structural, same discipline as check-dead-
// controls.js's EDITOR_ONLY_ATTRS — the primary escape hatch for a specific
// finding is the baseline file below; this is for a genuinely universal name.
//
// Populated 2026-08-27 (11 attrs, 32 findings) from the triage register:
// `reports/2026-08-26-check-a-triage-group-a.md` ("ARTEFACT — motion attrs
// on a static canvas") + `reports/2026-08-26-check-a-triage-group-b.md`
// ("Artefacts (10 findings)"). Every name here is EXACT-MATCH — deliberately
// NOT a pattern/prefix test, so a real static property (e.g.
// `backgroundRepeat`, this file's own worked example of a property the
// canvas SHOULD show) can never be swept in by a loose match:
//
//   · bgSvgAnimation / bgSvgAnimationSpeed — motion: animation + its timing,
//     nothing a static canvas can render.
//   · bgParallax — motion: scroll-driven, no resting frame to show.
//   · bgKenBurns / bgAnimationDuration — motion: animated pan/zoom + timing.
//   · rowTransparent / rowHideOnScroll / rowShrink / rowShrinkHideTarget —
//     scroll-gated two-state behaviour (site-header-row/site-footer-row);
//     `rowShrink` already ships an opt-in "Show me the shrunk size" toggle —
//     the house pattern for this class — and the other three have no single
//     resting-state snapshot to preview (transparent-vs-solid and
//     hidden-vs-visible ARE the whole two-state behaviour).
//   · headerTransparentDirection — sequences which of two SCROLL-TRIGGERED
//     states applies before/after scroll; no resting appearance of its own.
//   · ariaLabel — screen-reader-only accessible name, correctly invisible to
//     sighted users.
//
// EXTENDED 2026-08-30 (+15 names, 31 findings) — the CLIENT-SET HOVER-STATE
// class, decided by Bean as a class rather than the single row that surfaced
// it. The mechanism, which is the whole justification and is narrower than
// "hover is invisible":
//
//   A block's `:hover` rules in its own `style.css` DO reach the editor canvas
//   — the canvas loads that stylesheet, so a STATIC hover rule previews there
//   and is NOT exempt. What cannot reach the canvas is a PER-INSTANCE,
//   CLIENT-SET hover VALUE: those are emitted by `render.php` into a scoped
//   `.{uid}` <style> at render time, and the canvas never executes render.php.
//   The canvas's only per-instance channel is an inline style object, and an
//   inline style cannot express `:hover` at all. So there is no mechanism by
//   which these 15 could be previewed — they are unpreviewable, not unpreviewed.
//
// ⚠ Scope note for whoever extends this next: that reasoning licenses exactly
// the client-set hover VALUES below. It does NOT license "anything with Hover
// in the name" — which is why these are 15 exact names and not a /Hover$/ test,
// and why the hover OVER-MATCH control in runSelfTest() asserts that an
// unlisted `…Hover` name is still flagged.
//
// Surfaced when commit 18eee2666 added `quoteColourHover`, taking CHECK A to
// 208 against a ceiling of 207 and reding the build for every session. Fixing
// that one row alone would have encoded "hover is invisible" for one attribute
// and "hover is previewable" for two others on the SAME block (sgs/testimonial)
// — an inconsistency that later reads as deliberate. Measured, not inferred:
// `--json` reported 208 net-new before, 177 after.
const EDITOR_INVISIBLE_BY_DESIGN = new Set( [
	// Server-behaviour-only attrs (2026-09-05, Bean-approved). Verified by
	// reading every consumption site: these reach NO CSS and NO markup, so
	// there is nothing a canvas could show. `requireLogin`/`rateLimit` are read
	// at form/render.php:77-78 and go straight into a `set_transient()`
	// server-side config cache (form/render.php:89-99) so the submit handler
	// can enforce them without trusting client data — they never touch output.
	// Both are declared by `sgs/form` alone, so this name-keyed exemption
	// cannot over-reach to another block.
	'requireLogin',
	'rateLimit',
	// Accessibility-only attr (2026-09-05). `thumbnailDecorative` sets
	// `aria-hidden="true"` on the thumbnail and nothing else
	// (image-sequence/render.php:267-269 and :281-283) — the identical shape as
	// `ariaLabel` already exempted below. Declared by `sgs/image-sequence`
	// alone.
	'thumbnailDecorative',
	// Hover-only transform (2026-09-05). `scaleHover` emits a
	// `transform:scale()` exclusively through `sgs_hover_state_rules()`
	// (button/render.php:438-441) — a `:hover` rule, and the editor canvas
	// never renders a hover state, which is the SAME doctrine already applied
	// to the client-set hover VALUES below.
	// ⚠ NAME-KEYED, AND THIS NAME IS NOT UNIQUE: `scaleHover` is declared by 11
	// blocks (button, card-grid, gallery, heading, icon, info-box, post-grid,
	// quote, team-member, testimonial, text). Only `sgs/button` has a finding
	// today, so this also pre-emptively suppresses the other 10. That is
	// intended — the attribute means the same thing on every one of them — but
	// if any block ever uses `scaleHover` for a NON-hover transform, this
	// exemption would hide a real desync there.
	'scaleHover',
	'bgSvgAnimation',
	'bgSvgAnimationSpeed',
	'bgParallax',
	'bgKenBurns',
	'bgAnimationDuration',
	'rowTransparent',
	'rowHideOnScroll',
	'rowShrink',
	'rowShrinkHideTarget',
	// Motion of the scroll-gated shrink: its speed and curve have no resting
	// frame a static canvas could show (rowShrinkPadding is NOT here — the
	// "Show me the shrunk size" preview applies it).
	'rowShrinkDuration',
	'rowShrinkEasing',
	'rowShrinkEasingCustom',
	'headerTransparentDirection',
	'ariaLabel',
	// NOT invisible: the canvas shows it as the wrapper's `sgs-on-dark`/`-light`
	// class, but it is read inside `src/utils/surface-preview.js::wrapperToneClass()`,
	// which receives the whole attributes object. That util is a function, not a
	// JSX-mounted component, so this edit.js-plus-components corpus cannot see
	// the read.
	'surfaceTone',
	// Client-set hover VALUES (2026-08-30) — see the mechanism note above.
	'backgroundColourHover',
	'backgroundColourHoverGradient',
	'borderColourHover',
	'borderColourHoverGradient',
	'gridItemBackgroundHover',
	'gridItemBackgroundHoverGradient',
	'gridItemBorderGradientHover',
	'gridItemTextColourHover',
	'gridItemTextColourHoverGradient',
	'groupBorderColourGradientHover',
	'quoteColourHover',

	// sgs/product-search, 2026-09-07 (colour-conformance migration). Same class
	// as the hover VALUES above and added as EXACT NAMES, never a pattern -- the
	// over-match self-test on `panelHoverLayout` still guards that. A static
	// editor canvas has no pointer hover, so a :hover-only paint cannot be shown
	// without faking the state; the resting halves of all five rows ARE previewed
	// (inputPreviewStyle / listboxBgPreview / markBgPreview / resultHoverPreview),
	// so only the hover halves are invisible. Frontend rendering is unaffected.
	'inputBorderColourHover',
	'inputBorderColourHoverGradient',
	'listboxBackgroundColourHover',
	'listboxBackgroundColourHoverGradient',
	'matchHighlightColourHover',
	'matchHighlightColourHoverGradient',
	'resultHoverBackgroundColourHover',
	'resultHoverBackgroundColourHoverGradient',
	'shadowHoverColour',
	// sgs/button, 2026-09-07. Same hover-VALUE class as `shadowHoverColour` directly
	// above; it is a SEPARATE entry, not a rename of it, because two blocks still
	// declare the older `shadowHoverColour` spelling. Created by the ShadowControl
	// naming convergence on <base>ColourHover (D1000) -- a static editor canvas has
	// no pointer hover, so a :hover-only shadow colour cannot be shown without
	// faking the state. Button's RESTING shadow colour is previewed as normal.
	'boxShadowColourHover',
	'textColourHover',
	'textDecorationHover',
	// sgs/pricing-table hover-colour rows (2026-09-04) — same client-set
	// hover-value class as above, newly VISIBLE not newly broken: these six
	// were previously wired into the wrong element's hover CSS (gated behind
	// an unrelated attribute, painting the billing-toggle label instead of
	// their own element) and so were effectively dead code the checker could
	// not classify as a genuine CSS-emission usage. Fixing the render.php
	// wiring (each now has its own real sgs_emit_state_colour_css() call)
	// made them recognisably real — and, like every other hover value here,
	// genuinely un-previewable in the editor canvas, which never simulates
	// :hover. toggleLabelHoverColour/toggleLabelHoverColourGradient are the
	// same pre-existing pair this block's own billing-toggle hover control
	// already used, surfaced for the same reason. Measured: 214 net-new
	// before this fix, 222 after adding these 8 without an exemption; 214
	// again with it.
	'titleColourHover',
	'featureColourHover',
	'ctaColourHover',
	'popularBadgeColourHover',
	'ctaBackgroundHover',
	'popularBadgeBackgroundHover',
	'toggleLabelHoverColour',
	'toggleLabelHoverColourGradient',
	// 21-row custom-property-fed migration (2026-09-04) — same class as
	// above: these gradient siblings paint a scoped CSS rule/::after layer
	// render.php builds, which the editor canvas never executes.
	'labelColourGradient',
	'labelBackgroundColourGradient',
	'badgeColourGradient',
	'badgeTextColourGradient',
	'panelBgGradient',
	'panelTextColourGradient',
	'captionColourGradient',
	'captionBgColourGradient',
	'overlayColourHoverGradient',
	// 7-block parallel-dispatch migration (2026-09-04) — same class again.
	// Verified these are the ONLY 6 genuinely new names (222 total - 216
	// prior ceiling = 6): every other finding surfaced when filtering by
	// these 6 blocks' names (requireLogin, shadow, tileBorderColour, etc.)
	// is pre-existing debt already inside the 216 ceiling, unrelated to
	// this dispatch — NOT added here, since exempting them would need its
	// own verification this pass never did.
	'linkColourGradient',
	'separatorColourGradient',
	'progressBarColourGradient',
	'cardBgColourGradient',
	'iconBackgroundGradient',
	'iconBackgroundHoverGradient',
	// Phase-3/4 close-out (2026-09-05, Bean-directed — reach 0). Client-set
	// hover VALUES, verified individually this session (each grep'd against its
	// own render.php, not assumed from the name): iconColourHover
	// (icon-list/notice-banner, sgs_hover_state_rules), priceColourHover
	// (pricing-table, own emission), descriptionColourHover (process-steps,
	// sgs_hover_state_rules), roleColourHover (team-member + testimonial),
	// summaryColourHover/nameColourHover/orgColourHover (testimonial, array-fed
	// hover rule builder), tileBorderColourHover(Gradient)/
	// fileLabelBorderColourHover(Gradient)/fileLabelBackgroundColourHover(Gradient)
	// (form, mapping-table-driven hover rule builder), closeColourBackgroundHover
	// (Gradient)/closeColourTextHover(Gradient) (modal — consumed via
	// sgs_button_element_style_css()'s dynamic prefix+suffix key concatenation,
	// which a literal-name grep of render.php misses; confirmed by reading the
	// helper and its call site, not by the grep coming back empty). All same
	// class as the existing hover-value entries above — the editor canvas never
	// simulates `:hover`/`:focus`.
	'iconColourHover',
	// Same class, the gradient sibling (2026-09-06, sgs_icon_gradient_css()
	// icon-gradient closeout): a per-instance client-set hover gradient value,
	// emitted into the block's own scoped <style> at render time via
	// sgs_hover_state_rules() — the canvas never executes render.php, same
	// "unpreviewable, not unpreviewed" reasoning as every other hover-value
	// entry here. Declared by sgs/cart and sgs/accordion (via block context).
	'iconColourHoverGradient',
	// sgs/before-after's equivalent pair, same mechanism, different attr name.
	'handleIconColourHover',
	'handleIconColourHoverGradient',
	'priceColourHover',
	'descriptionColourHover',
	'roleColourHover',
	'summaryColourHover',
	'nameColourHover',
	'orgColourHover',
	'tileBorderColourHover',
	'tileBorderColourHoverGradient',
	'fileLabelBorderColourHover',
	'fileLabelBorderColourHoverGradient',
	'fileLabelBackgroundColourHover',
	'fileLabelBackgroundColourHoverGradient',
	'closeColourBackgroundHover',
	'closeColourBackgroundHoverGradient',
	'closeColourTextHover',
	'closeColourTextHoverGradient',
	// Motion-timing (2026-09-05) — `sgs/hero` and `sgs/text` both feed these
	// into a CSS `transition:` DURATION/EASING declaration only (verified:
	// text/render.php:409/562 build `transition:prop {duration}ms {easing}`
	// strings, nothing else consumes them) — a state-CHANGE timing curve with
	// no static rendered signature a canvas capture could ever show. Same
	// doctrine as the existing motion-timing entries above.
	'transitionDuration',
	'transitionEasing',
	// Structural state unreachable on a static canvas (2026-09-05) — each
	// verified individually, not assumed from the attribute shape:
	// `focusRingColour` (product-search) only emits a `:focus-visible` outline
	// rule; `backgroundColourScrolled`/`backgroundColourScrolledGradient`/
	// `textColourScrolled` (site-header) are gated on the REAL frontend
	// `.is-header-scrolled` class a scroll-listener in view.js adds after the
	// page has already rendered — confirmed by edit.js's own comment on the
	// same attributes; `scrollEffect` (timeline) drives `data-sgs-fx`, read
	// only by view.js's scroll listener, with no static CSS signature anywhere.
	'focusRingColour',
	'backgroundColourScrolled',
	'backgroundColourScrolledGradient',
	'textColourScrolled',
	'scrollEffect',
	// CORRECTION (2026-09-05, same session): `sgs/hero`'s generic grid/flex
	// layout attrs (`justifyItems`/`alignContent`/`gridAutoRows`/
	// `gridTemplateRows`/`justifyContent`/`flexDirection`/`flexWrap`) were
	// exempted here as "genuinely dead on the frontend" after confirming
	// hero/render.php never read them. That was true at the time — root-caused
	// and then FIXED the same session (hero/render.php now reads all 7,
	// gated exactly like `SGS_Container_Wrapper`'s own grid/flex branches:
	// grid-track properties on the split variant, flex-axis properties on the
	// standard variant) — and `hero/edit.js`'s canvas mirror was wired to
	// match. Entry removed; these names are live findings again if the mirror
	// ever regresses, which is correct.
	// `sgs/hero.splitMediaDecorative` (2026-09-05) — confirmed a11y-only by
	// render.php's own comment: blanks `alt` and sets `aria-hidden` on the
	// split-media wrapper, a state never exposed to assistive tech any other
	// way and with zero CSS/visual signature on any variant. Same shape as
	// `thumbnailDecorative` above — not a desync, a false positive.
	'splitMediaDecorative',
	// `sgs/form.prevColourBackgroundHover`/`prevColourBackgroundHoverGradient`
	// (2026-09-05) — client-set hover VALUES, same doctrine as every other
	// hover entry above: render.php's `sgs_button_element_style_css()` paints
	// these via a `:hover` rule the editor canvas never simulates.
	// ⚠ CORRECTION (same session): this entry ORIGINALLY also listed the
	// RESTING-state `prevColourBackground`/`prevColourBackgroundGradient`,
	// exempted as "dead on the frontend" after a literal grep of
	// form/render.php for "prevColour" returned zero matches. That grep was a
	// false negative — a concurrent peer session's commit (23d7ea1d7,
	// landed the same day) had already wired the mechanism via
	// `sgs_button_element_style_css( $attributes, 'prev', … )`, which builds
	// its attribute keys by STRING CONCATENATION (`$prefix.'ColourBackground'`),
	// invisible to a literal-string grep — the exact class of miss this
	// session's `sgs/modal` fix had already flagged for the SAME helper.
	// Verified live on the canary this time (not just re-grepped): the
	// resting mechanism genuinely works. Removed the two resting-state names
	// from this exemption and wired a real editor-canvas preview instead (a
	// Previous-button element next to the existing Submit-button preview,
	// `form/edit.js`) — see that file for the fix.
	'prevColourBackgroundHover',
	'prevColourBackgroundHoverGradient',
	// `sgs/cart`'s mini-cart panel colours (2026-09-05) — `panelBg`/
	// `panelTextColour` paint a native `<dialog>` (FR-36-10) built server-side
	// and opened only by a frontend click; `edit.js` renders no panel preview
	// markup on the canvas at all today. Unlike the dead-attribute cases above,
	// this ISN'T a bug — the dialog genuinely only exists post-interaction —
	// but it is equally unshowable without a separate feature (force-mounting
	// the dialog open in the editor for preview purposes), which is a real,
	// separately-scoped piece of work, not a same-shaped colour-mirror fix.
	// (`iconColourGradient` on this block is NOT included here — that paints
	// the cart TRIGGER icon, which the canvas always shows, so it gets the
	// normal colour-mirror fix.)
	'panelBg',
	'panelTextColour',
	// `sgs/form-field-tiles.selectedStyle` (2026-09-05) — render.php emits a
	// `sgs-form-field--tiles-style-{border|background|checkmark}` class
	// (~line 302), but a repo-wide grep found ZERO CSS anywhere that consumes
	// `tiles-style-*` — the actual selected-state styling (border/background/
	// checkmark) is applied identically via `.sgs-form-tile--selected`/
	// `:has(input:checked)` regardless of this attribute's value. There is no
	// real per-variant visual difference on the frontend today for the canvas
	// to mirror — building an illustrative preview would invent behaviour
	// that doesn't exist. Real bug (wire real per-variant CSS, or retire the
	// control), tracked separately, not faked here.
	'selectedStyle',
	// TEXT-surface colour-conformance closeout (2026-09-07) — 23 names moved
	// here from scripts/editor-render-parity-baseline.json's manual accepted
	// list, verified via `SELECT block_slug, attr_name, css_property FROM
	// block_attributes WHERE attr_name IN (...)` rather than assumed. Two
	// distinct sub-classes, both genuinely unpreviewable in a static canvas:
	//
	// (a) Pure server-behaviour/config/a11y attrs with NO css_property at all
	// (verified NULL for every one): 'fieldName' (7 form-field-* blocks —
	// stores the submitted field's machine name, never rendered),
	// 'successMessage'/'successRedirect'/'honeypot' (sgs/form — server-only
	// submission config), 'allowedTypes' (sgs/form-field-file — validation
	// config), 'renderLandmark' (sgs/icon-list — a11y markup mode, no visual
	// difference), 'thumbnailAlt' (sgs/image-sequence — alt text),
	// 'headerShrink'/'headerHideOnScroll' (sgs/site-header — scroll-position-
	// triggered, no resting-state difference), 'blockLabel' (sgs/tabs — ARIA
	// label only), 'revealOnScroll'/'revealStagger' (sgs/timeline — reveal-
	// animation timing, needs real scroll), 'autoScroll' (sgs/trust-bar —
	// needs real overflow + time), 'message' (sgs/whatsapp-cta — pre-fills
	// the opened chat, never rendered on-page), the drawer and panel motion
	// attributes (sgs/nav-drawer entryAnimation, entryDuration, exitDuration,
	// entryEasing, entryEasingCustom, entryFade, curtainColour, itemStagger*,
	// scrimFadeDuration; sgs/nav-bar-menu submenuAnimationDuration,
	// submenuExitDuration, submenuAnimationEasing*, submenuItemStagger* —
	// only observable while a drawer or panel opens or closes), and
	// sgs/nav-drawer anchorOffset (the gap between the open panel and the live
	// burger or header it hangs from; the canvas previews the drawer as a
	// stand-alone card with neither, so the gap has no counterpart there).
	//
	// (b) GSAP ScrollTrigger / transition CONFIG whose css_property resolves
	// to a namespaced motion key (`fx:*`) or a real CSS property that is
	// observationally inert without a live interaction/scroll the static
	// canvas cannot provide: 'fxStart'/'fxEnd'/'fxScrub'/'fxPin' (32 blocks —
	// scroll-scrub configuration; same "means the same thing everywhere"
	// reasoning already used for scaleHover above), 'fadeOnScroll'/
	// 'pathDrawOnScroll' (sgs/decorative-image — scroll-intersection
	// triggers, no static resting frame), 'transitionDuration'/
	// 'transitionEasing' (8 blocks — css_property IS `transition-duration`/
	// `transition-timing-function`, but a transition is only OBSERVABLE
	// during an actual value change the canvas never triggers — same
	// unpreviewable-without-interaction doctrine as scaleHover's :hover-only
	// transform).
	'fieldName',
	'successMessage',
	'successRedirect',
	'honeypot',
	'allowedTypes',
	'renderLandmark',
	'thumbnailAlt',
	'headerShrink',
	'headerHideOnScroll',
	'blockLabel',
	'revealOnScroll',
	'revealStagger',
	'autoScroll',
	'message',
	'entryAnimation',
	'entryDuration',
	'exitDuration',
	'entryEasing',
	'entryEasingCustom',
	'entryFade',
	'curtainColour',
	'curtainColourGradient',
	'itemStagger',
	'itemStaggerDistance',
	'itemStaggerDuration',
	'itemStaggerMax',
	'itemStaggerOnClose',
	'scrimFadeDuration',
	'anchorOffset',
	'submenuAnimationDuration',
	'submenuExitDuration',
	'submenuAnimationEasing',
	'submenuAnimationEasingCustom',
	'submenuItemStagger',
	'submenuItemStaggerDuration',
	'submenuItemStaggerMax',
	'submenuItemStaggerDistance',
	'fxStart',
	'fxEnd',
	'fxScrub',
	'fxPin',
	'fadeOnScroll',
	'pathDrawOnScroll',
	'transitionDuration',
	'transitionEasing',
] );

module.exports = {
	EDITOR_INVISIBLE_BY_DESIGN,
};
