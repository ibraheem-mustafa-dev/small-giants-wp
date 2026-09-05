<?php
/**
 * SGS_Container_Wrapper — shared OUTER-wrapper render helper for SGS container blocks.
 *
 * Extracts the full wrapper-assembly logic from sgs/container so every composite block
 * (sgs/hero, sgs/cta-section, sgs/trust-bar, etc.) can MIRROR sgs/container's wrapper
 * capabilities instead of re-implementing them divergently.
 *
 * IMPORTANT — get_block_wrapper_attributes() constraint
 * -------------------------------------------------------
 * get_block_wrapper_attributes() reads WordPress's current-block global context
 * (set by the block renderer immediately before it calls render.php). It MUST
 * therefore be called synchronously within the same render pass — i.e. from inside
 * the static render() method when called from render.php. Caching the return value
 * across requests or calling it from a constructor/init hook is NOT safe.
 *
 * IMPORTANT — $attributes must be passed VERBATIM
 * ------------------------------------------------
 * The responsive-CSS uid is derived from:
 *   md5( wp_json_encode( $attributes ) . anchor )
 * Any array_merge of defaults, ksort, or key mutation changes the JSON encoding and
 * therefore the uid — which changes the scoped <style> selector and causes pixel drift
 * on any instance that uses responsive CSS. Always pass the raw $attributes array that
 * WP handed render.php, never a normalised copy.
 *
 * KIND gating — which layers are emitted
 * ----------------------------------------
 * 'section' — Full surface: bg-image/video/overlay/svg, shape-dividers,
 *             maxWidth/align, min-height, grid/flex, gridItem*, gap, contentWidth/__inner.
 *             Matches the complete sgs/container output exactly.
 * 'layout'  — grid/flex + maxWidth/align/contentWidth + gap only.
 *             No bg/overlay/svg/shape-divider layers.
 * 'content' — maxWidth/align/contentWidth + padding/spacing only.
 *             No bg/overlay/svg/shape/grid layers.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// The wrapper render depends on these shared helpers (sgs_container_gap_value,
// sgs_sanitize_grid_template, sgs_colour_value, sgs_render_shape_divider). Require
// them HERE so the helper is self-contained — a composite that requires only this
// file (and not render-helpers.php) must still resolve every function the wrapper
// calls. Without this, a layout/section composite fatals on the gap/shape code path.
require_once __DIR__ . '/render-helpers.php';
require_once __DIR__ . '/shape-dividers.php';

if ( ! class_exists( 'SGS_Container_Wrapper' ) ) {

	/**
	 * Static helper — call SGS_Container_Wrapper::render() from composite render.php files.
	 */
	final class SGS_Container_Wrapper {

		/**
		 * Resolve the `$kind` argument for render() from a block's DECLARED
		 * `supports.sgs.enabledExtensions`, instead of a hardcoded literal
		 * (D626 "hard sequencing dependency" / D633 calibration; built as
		 * part of the wrapper-decomposition step 6 background pilot).
		 *
		 * WIRED into all 7 direct-panel blocks' render.php as of Phase B/D
		 * of `~/.claude/plans/go-read-the-track-encapsulated-hare.md`
		 * (2026-08-16) — `container`/`cta-section`/`trust-bar`/`hero`/
		 * `site-header`/`site-footer`/`physics-canvas` each now call
		 * `SGS_Container_Wrapper::resolve_kind( $block, 'section' )` in the
		 * same commit that added `enabledExtensions` to that block's
		 * block.json (D626's "same-commit rule" — never split the editor
		 * half and the PHP half of one block's migration). No block still
		 * passes the literal `'section'` string directly to render(); the
		 * narrowing bug found mid-build (see below) was fixed at the
		 * source in this same method, not worked around per-block.
		 *
		 * ⚠ Background/overlay attrs (`backgroundImage`/`bgVideo`/
		 * `backgroundOverlayColour`/etc.) are OUT OF SCOPE for this
		 * resolver — D6 (2026-08-11, logged inline at ~L262 of this file)
		 * already made that whole family read UNIVERSALLY, gated only by
		 * whether a block's own block.json DECLARES the attr, not by
		 * `$kind`. Verified empirically before writing this method: every
		 * `$bg_*`/`$overlay_*` read in this file (L271-303, L1180-1209) is
		 * unconditional — there is no `$is_section`/`$is_layout` guard on
		 * any of it. So gating background PAINT on `enabledExtensions`
		 * needs no PHP change at all; it is already correct by
		 * construction (a block only gets a live background once it
		 * declares the attrs, which for `physics-canvas` happens in Phase
		 * B alongside `enabledExtensions:['background']`).
		 *
		 * What THIS resolver actually reaches: the capabilities still tied
		 * to the `'section'`/`'layout'`/`'content'` literal today — shape
		 * dividers (`$is_section`-gated, ~L1223) and part of the grid-item
		 * custom-property emission (`$is_section || $is_layout`-gated,
		 * ~L1732). Both are OUT OF SCOPE to migrate in Phase A per this
		 * initiative's own step ordering (`shapeDividers`/`gridItems` are
		 * separate extensions, step 7 — D626), so this method's mapping is
		 * deliberately conservative: it only NARROWS kind away from
		 * `$fallback` once a block has explicitly opted into fewer
		 * capabilities via `enabledExtensions`; a block with no declaration
		 * at all gets `$fallback` back UNCHANGED.
		 *
		 * @param \WP_Block|null $block    Block instance passed to render.php.
		 * @param string         $fallback What today's render.php literal
		 *                                 currently passes (usually
		 *                                 `'section'`) — returned verbatim
		 *                                 when the block declares no
		 *                                 `enabledExtensions` at all, so an
		 *                                 un-migrated block's behaviour is
		 *                                 byte-identical to before this
		 *                                 method existed.
		 * @return string 'section'|'layout'|'content'.
		 */
		public static function resolve_kind( $block, string $fallback = 'section' ): string {
			$allowed = array( 'section', 'layout', 'content' );
			if ( ! in_array( $fallback, $allowed, true ) ) {
				$fallback = 'section';
			}

			$supports = null;
			if ( $block instanceof \WP_Block && isset( $block->block_type->supports ) && is_array( $block->block_type->supports ) ) {
				$supports = $block->block_type->supports;
			} elseif ( $block instanceof \WP_Block && ! empty( $block->name ) ) {
				// Fallback lookup — mirrors the established pattern in
				// includes/image-controls.php for reading a block's DECLARED
				// supports from its registered block type.
				$registered = \WP_Block_Type_Registry::get_instance()->get_registered( $block->name );
				if ( null !== $registered && is_array( $registered->supports ?? null ) ) {
					$supports = $registered->supports;
				}
			}

			if ( null === $supports ) {
				return $fallback;
			}

			// Deliberately NO narrowing from `enabledExtensions` membership,
			// even once declared. Bug found + fixed 2026-08-16, mid-step-6
			// build: an earlier version of this method downgraded $kind to
			// 'content' whenever neither 'shapeDividers' nor 'gridItems' was
			// present, on the assumption that $kind tracks WHICH optional
			// panels a block has. That's false for the 7 direct-panel
			// blocks — every one of them is structurally 'section'-kind
			// (that's why their render.php literal was always 'section',
			// never 'layout'/'content'), and `$is_section` in render() below
			// ALSO gates capabilities that have nothing to do with
			// shapeDividers/gridItems — minHeight and content-band padding
			// (D624) among them. Narrowing site-header (width+background
			// only, no shapeDividers/gridItems) to 'content' silently killed
			// its live minHeight + band-padding controls — caught by two
			// independent build agents before it shipped, not by any gate.
			// `$kind` and `enabledExtensions` are orthogonal axes: $kind is
			// the block's fundamental render mode (fixed per block, set by
			// its own render.php call site); enabledExtensions is which
			// OPTIONAL capabilities within that mode are switched on. This
			// method's job is only to confirm the mechanism exists — it does
			// NOT yet derive $kind from capability membership. Splitting
			// $is_section's bundled unrelated capabilities into individual
			// gates (so a real per-capability narrowing becomes possible) is
			// step 7 scope, not step 6 — see the plan doc §1.4 step 7 and
			// decisions.md D626.
			return $fallback;
		}

		/**
		 * Render the outer wrapper for a container-style block.
		 *
		 * Returns a single pre-joined string:
		 *   '<style id=uid>…</style>' (if any responsive CSS)
		 *   FOLLOWED BY
		 *   '<tag {wrapper_attrs}>[bg layers][__inner?]$inner_html[/__inner?][fg layers]</tag>'
		 *
		 * The caller echoes this string exactly once — no separate printf for the <style>.
		 *
		 * @param array          $attributes  VERBATIM block attributes as passed by WP to render.php.
		 *                                    DO NOT merge defaults or reorder keys — uid is md5 of
		 *                                    wp_json_encode($attributes).anchor; any mutation causes
		 *                                    a different uid → different scoped <style> selector → pixel drift.
		 * @param \WP_Block|null $block  Block instance (used for anchor in uid derivation).
		 * @param string         $inner_html  The caller's already-built interior HTML (InnerBlocks content).
		 * @param string         $kind        'section'|'layout'|'content' — gates which wrapper layers emit.
		 * @param array          $opts        Optional overrides:
		 *                                    'tag'           => string  HTML tag (default: 'section').
		 *                                    'block_class'   => string  Additional root class appended to $classes
		 *                                                       (e.g. 'sgs-hero'). Merged before wrapper_attrs call.
		 *                                    'extra_classes' => array   Additional classes (merged before wrapper call).
		 *                                    'extra_styles'  => array   Additional inline-style strings (merged before call).
		 *                                    'no_overlay'    => bool    When true the overlay layer is suppressed
		 *                                                       (C3 double-emit guard — composite has its own overlay).
		 *                                    'wrap_inner'    => bool|null  Override the __inner guard. null = use the
		 *                                                       default guard (contentWidth set + layout empty).
		 * @return string  Full HTML output ready for echo.
		 */
		public static function render(
			array $attributes,
			$block,
			string $inner_html,
			string $kind = 'section',
			array $opts = array()
		): string {

			// ----------------------------------------------------------------
			// Resolve options.
			// ----------------------------------------------------------------
			$opt_tag           = isset( $opts['tag'] ) ? (string) $opts['tag'] : '';
			$opt_block_class   = isset( $opts['block_class'] ) ? (string) $opts['block_class'] : '';
			$opt_extra_classes = isset( $opts['extra_classes'] ) && is_array( $opts['extra_classes'] ) ? $opts['extra_classes'] : array();
			$opt_extra_styles  = isset( $opts['extra_styles'] ) && is_array( $opts['extra_styles'] ) ? $opts['extra_styles'] : array();
			// extra_attrs — additional HTML attributes (e.g. data-* for WP Interactivity /
			// carousel controls, aria-*) merged verbatim into get_block_wrapper_attributes()
			// at BOTH call sites. Values MUST be pre-sanitised by the caller. Empty array =
			// byte-identical to the original two-key array (array_merge with [] is a no-op).
			$opt_extra_attrs = isset( $opts['extra_attrs'] ) && is_array( $opts['extra_attrs'] ) ? $opts['extra_attrs'] : array();
			// extra_attr_html — a PRE-ESCAPED raw attribute string appended verbatim to the
			// opening tag (caller MUST pre-escape). Use for attributes that
			// get_block_wrapper_attributes()'s esc_attr double-quoting would bloat — e.g.
			// data-wp-context, where WP-canonical wp_interactivity_data_wp_context() emits a
			// compact single-quoted attribute (no &quot; expansion of the JSON's quotes).
			$opt_extra_attr_html = isset( $opts['extra_attr_html'] ) && is_string( $opts['extra_attr_html'] ) ? $opts['extra_attr_html'] : '';
			$opt_no_overlay      = ! empty( $opts['no_overlay'] );
			$opt_wrap_inner      = array_key_exists( 'wrap_inner', $opts ) ? $opts['wrap_inner'] : null;

			// Allowed kinds — fall back to 'section' on invalid input.
			$allowed_kinds = array( 'section', 'layout', 'content' );
			if ( ! in_array( $kind, $allowed_kinds, true ) ) {
				$kind = 'section';
			}

			$is_section = 'section' === $kind;
			$is_layout  = 'layout' === $kind;
			// content kind = only maxWidth/align/contentWidth/padding; used by content-level composites.

			// Spec 37 FR-37-16, RENAMED D555 (2026-08-10). This flag used to be
			// `responsive_model => 'object'` and gated TWO things: object-shaped value
			// emission AND container-query DOM behaviour. Value emission is now
			// UNIVERSAL — any block carrying an object-shaped attr gets it emitted by
			// sgs_emit_responsive_css() with no flag at all (see "ENTRY IS NO LONGER
			// GATED ON THE OPT-IN" below, ~:1904). So this flag now controls ONLY the
			// container-query DOM feature: CSS containment (`container-type`) on the
			// outer element, plus forcing an inner wrapper element to render and
			// moving the block's own flex/grid onto it, so the block can respond to
			// ITS OWN width rather than the screen's. Renamed to `container_queries
			// => true` to say what it actually does — `responsive_model => 'object'`
			// now read as "this block's responsive model is object-shaped", which is
			// false: every block's responsive model is object-shaped these days.
			// The header/footer/nav + gallery blocks pass this flag because they were
			// built to want the container-query DOM feature specifically.
			// Flag ABSENT (every other block) → the container-query DOM change is
			// inert; the universal object-value emission is unaffected either way.
			// This never reorders/mutates $attributes, so the uid md5 is untouched
			// (STOP-NO-KSORT).
			//
			// ⚠ HOW THE LEGACY SCALAR PATH IS ACTUALLY NEUTRALISED — corrected
			// 2026-08-10 (D552; updated for the D555 rename). This comment previously
			// claimed neutralisation came from "the is_array guards below + a
			// `! $container_queries` gate further down". MEASURED: there is NO
			// `! $container_queries` gate anywhere in this file — grep returned only
			// that sentence. Believing it would let the next change assume protection
			// it does not have, so here is the real mechanism.
			// (1) is_array() guards on each BASE read (e.g. $gap, $max_width,
			// $grid_template) coerce an object value to '' so the scalar path cannot
			// stringify an array — this is what does most of the work, and it applies
			// to every block, not only the ones that pass this flag.
			// (2) $object_grid (below) suppresses the legacy columns/grid emission, and
			// ONLY when an object gridTemplateColumns is actually present.
			// (3) Three POSITIVE $container_queries checks (~:622, ~:1234, ~:2329)
			// force container-type/DOM-wrap behaviour. None of them is a negative gate.
			// The TIER reads are NOT guarded or gated at all: $gap_tablet/$gap_mobile
			// (below) are read raw, and their @media emission (~:1413-1417) is
			// conditioned only on those siblings being truthy — it sits at the SAME
			// brace depth as the `'' !== $gap` guard above it, not inside it. So an
			// instance carrying BOTH an object gap AND a stored flat gapTablet would
			// emit two competing tablet rules, resolved by source order rather than by
			// design. This is a value-emission risk, universal now (any object-shaped
			// block, not only the three that pass this flag) — the measurement below
			// was taken while emission was still gated to those three.
			// LATENT, NOT LIVE — measured on the canary 2026-08-10: 109 instances of
			// the three container_queries blocks (78 site-header-row / 24
			// site-footer-row / 7 gallery; 15 publish, 12 draft, 82 revisions) yielded
			// ZERO object+populated-flat-sibling collisions. Controls: 511 posts
			// contain an sgs block opening, and the same reader DID flag a gallery
			// instance's instance inside that set, so the zero is a measurement and
			// not a blind spot. Add the negative gate when a real collision appears,
			// or as part of the flat→object migration — do not add it speculatively.
			$container_queries = ( ( $opts['container_queries'] ?? '' ) === true );
			// Grid gate: only suppress the legacy columns/grid emission when an OBJECT
			// gridTemplateColumns is actually present. A block that opted in but whose
			// stored instance still carries flat grid attrs (migration pending, D270
			// re-clone) keeps rendering its grid via the legacy path until re-saved —
			// so flipping the flag never breaks an un-migrated instance's columns.
			// ⛔ MUST test for a REAL TIER VALUE, not bare is_array() (Spec 35 pass 3a,
			// 2026-08-11). An UNSET object attr arrives as an empty PHP array
			// (block.json `"default": {}` → array() → JSON []), so `is_array()` is
			// TRUE for a block that has no template at all. The comment above states
			// the intent correctly — "gridTemplateColumns is actually present" — but
			// is_array() does not test presence.
			//
			// MEASURED REGRESSION this caught: the moment pass 3a changed the default
			// from "" to {}, $object_grid went true for every container-query block,
			// which suppresses the legacy column emission at :798 / :1257 / :1655 —
			// and with an EMPTY object there was nothing to emit in its place.
			// sgs/gallery's 3-column grid collapsed to a single 1200px column, and
			// sgs/feature-grid's 4 columns became 2. Both were caught by the
			// visual-diff positive control, not by any static gate.
			//
			// $sgs_tier_object_has_value is defined further down (~:1974), after this
			// point, so the same test is inlined here rather than moved — moving it
			// would reorder a closure several hundred lines of logic already depend on.
			$sgs_grid_obj = $attributes['gridTemplateColumns'] ?? null;
			$object_grid  = false;
			if ( $container_queries && is_array( $sgs_grid_obj ) ) {
				foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_grid_tier ) {
					$sgs_grid_val = $sgs_grid_obj[ $sgs_grid_tier ] ?? null;
					if ( null !== $sgs_grid_val && '' !== $sgs_grid_val && array() !== $sgs_grid_val ) {
						$object_grid = true;
						break;
					}
				}
			}

			// D456 — content-aware column collapse, declared per block type via
			// supports.sgs.intrinsicColumns. Resolved ONCE here, unconditionally,
			// because it is read from two places that sit in different conditional
			// branches (the base track list and the per-tier count fallback); a
			// definition inside either branch would be undefined in the other.
			$intrinsic_columns = sgs_block_wants_intrinsic_columns( $block );

			// ----------------------------------------------------------------
			// Extract attributes (mirrors container/render.php exactly).
			// ----------------------------------------------------------------
			// is_array guards: an object-model value here is treated as "not set"
			// (its own default) so the legacy scalar path can't stringify an array.
			// For a flat scalar (every existing block) is_array()===false → the value
			// passes through unchanged → byte-identical. Columns keep their NUMERIC
			// defaults (2/2/1) — absint('') would render repeat(0,1fr)/sgs-cols-0.
			$layout = $attributes['layout'] ?? '';
			// Spec 35 pass 4 (2026-08-11) — `columns` migrated flat trio -> tier
			// object. Same shape as the $min_height_obj precedent at ~:341: read
			// once via sgs_responsive_normalise_object() (which already returns
			// null, not '', for an unset tier — including the {} empty-object
			// case, per its own {} !== 'unset' guard), then `?? <default>` per
			// tier so $columns/$columns_tablet/$columns_mobile keep their EXACT
			// prior name, type and downstream meaning. Every consumer below
			// (:852-854 base fallback track, :1319-1321 tier-count gate,
			// :1727-1737 per-tier fallback track) reads these three vars
			// unchanged — this is a read-shape change only, not a logic change.
			$columns_obj    = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
			$columns        = $columns_obj['desktop'] ?? 2;
			$columns        = is_array( $columns ) ? 2 : $columns;
			$columns_mobile = $columns_obj['mobile'] ?? 1;
			$columns_mobile = is_array( $columns_mobile ) ? 1 : $columns_mobile;
			$columns_tablet = $columns_obj['tablet'] ?? 2;
			$columns_tablet = is_array( $columns_tablet ) ? 2 : $columns_tablet;
			$grid_template  = $attributes['gridTemplateColumns'] ?? '';
			$grid_template  = is_array( $grid_template ) ? '' : $grid_template;
			// ⚠ LEGACY FLAT PATH, now UNREACHABLE (Spec 35 pass 3a, 2026-08-11) —
			// the gridTemplateColumns twin of the maxWidth note at :338 and the
			// contentWidth note at :454. Neither sibling is declared by any
			// block.json any more, so both reads resolve to '' on every render and
			// every downstream guard is permanently false. The tiers travel inside
			// the `gridTemplateColumns` OBJECT and are emitted at ~:2057.
			// Same removal trigger: one gated shared-wrapper commit once passes 2-6
			// are all closed.
			$grid_template_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
			$grid_template_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
			$gap                  = $attributes['gap'] ?? '';
			$gap                  = is_array( $gap ) ? '' : $gap;
			$gap_tablet           = $attributes['gapTablet'] ?? '';
			$gap_mobile           = $attributes['gapMobile'] ?? '';

			// D6 (2026-08-11, Bean-decided): background/overlay attrs are no longer
			// gated on container_kind==='section'. They now read universally — a
			// layout/content-kind block only gets a working background if it also
			// DECLARES these attrs in its own block.json (undeclared attrs are
			// never passed by WordPress, so this is safe by construction, not by
			// a runtime check). The old zero-out branch existed because these were
			// architecturally "section-only concepts" (Spec 31 KIND doctrine); Bean
			// overruled that scope restriction directly rather than leaving it as
			// a control that can't apply on some blocks.
			$bg_image         = $attributes['backgroundImage'] ?? null;
			$bg_image_tablet  = $attributes['backgroundImageTablet'] ?? null;
			$bg_image_mobile  = $attributes['backgroundImageMobile'] ?? null;
			$bg_size          = $attributes['backgroundSize'] ?? 'cover';
			$allowed_bg_sizes = array( 'cover', 'contain', 'auto' );
			if ( ! in_array( $bg_size, $allowed_bg_sizes, true ) ) {
				$bg_size = 'cover';
			}
			$bg_position        = $attributes['backgroundPosition'] ?? 'center center';
			$bg_position        = preg_replace( '/[^A-Za-z0-9\s%]/', '', $bg_position );
			$bg_repeat          = $attributes['backgroundRepeat'] ?? 'no-repeat';
			$allowed_bg_repeats = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
			if ( ! in_array( $bg_repeat, $allowed_bg_repeats, true ) ) {
				$bg_repeat = 'no-repeat';
			}
			$bg_attachment       = $attributes['backgroundAttachment'] ?? 'scroll';
			$allowed_attachments = array( 'scroll', 'fixed' );
			if ( ! in_array( $bg_attachment, $allowed_attachments, true ) ) {
				$bg_attachment = 'scroll';
			}
			$overlay_colour = $attributes['backgroundOverlayColour'] ?? '';
			// D717 (2026-08-21): a real 0-100 opacity attribute, replacing the colour
			// picker's alpha channel as the overlay's transparency mechanism. Null when
			// a block has not adopted the attribute — the helper then emits no opacity
			// declaration at all, so nothing changes for that block.
			// backgroundOverlayOpacity is a TIER OBJECT {desktop,tablet,mobile} (Spec 35
				// migration, 2026-09-06); backgroundOverlayOpacityTablet/Mobile are no longer
				// declared by any block.json. A raw read here would hand sgs_overlay_decls()
				// an array, which is_numeric() silently rejects -- the desktop opacity would
				// vanish with no error, same failure mode as the pre-fix minHeight bug.
				$overlay_opacity_obj    = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
				$overlay_opacity        = $overlay_opacity_obj['desktop'] ?? null;
			// Task 3 (gradient palette-stop rebuild): overlayGradient is now ONE
			// attribute holding the complete CSS gradient value (any stop count),
			// validated through sgs_css_gradient_value() at the point of emission
			// below — replaces the old 4-attr bool/angle/from/to shape, which could
			// only ever express a straight two-stop gradient.
			$overlay_gradient = $attributes['overlayGradient'] ?? '';
			// D6 (2026-08-22) — hover + responsive-tier siblings for the overlay
			// paint pair, plus Step 8's blend mode. Null/absent on a block that
			// has not adopted the sibling (WordPress drops an undeclared attr on
			// the editor surface — D338/D704) is handled downstream exactly like
			// $overlay_opacity above: sgs_overlay_decls() simply emits nothing
			// extra for that state/tier.
			$overlay_colour_hover    = $attributes['backgroundOverlayColourHover'] ?? '';
			$overlay_gradient_hover  = $attributes['overlayGradientHover'] ?? '';
			// D739: the responsive tier axis lives on OPACITY, not colour. A
			// per-device overlay need is "a heavier scrim on the small screen",
			// which is an opacity change rather than a different hue. The tier
			// COLOUR attrs this replaces were the framework's only responsive
			// colour, and crossing tier x state also produced an incoherent
			// control — a hover tab that appeared on the desktop tier alone.
			// null means "this tier does not override".
			$overlay_opacity_tablet  = $overlay_opacity_obj['tablet'] ?? null;
			$overlay_opacity_mobile  = $overlay_opacity_obj['mobile'] ?? null;
			$overlay_blend_mode      = $attributes['backgroundOverlayBlendMode'] ?? '';
			$bg_video                = $attributes['bgVideo'] ?? null;
			$bg_video_tablet         = $attributes['bgVideoTablet'] ?? null;
			$bg_video_mobile         = $attributes['bgVideoMobile'] ?? null;
			$bg_parallax             = ! empty( $attributes['bgParallax'] );
			$bg_ken_burns            = ! empty( $attributes['bgKenBurns'] );
			$bg_animation_duration   = isset( $attributes['bgAnimationDuration'] ) ? absint( $attributes['bgAnimationDuration'] ) : 20;

			$shadow = $attributes['shadow'] ?? '';
			// is_array guard (Spec 35 Phase 1.4b, STAGE 2): `shadow` is being made
			// tier-capable below (its own sgs_emit_responsive_css() call on `.$uid`,
			// the "OUTER shadow" block). A tiered {desktop,tablet,mobile} object
			// reaching this LEGACY scalar path would TypeError-fatal
			// `sgs_shadow_value( ?string $slug_or_value )` at :591 —
			// arrays never coerce to a scalar type-hint, so this is a hard fatal on
			// every render, not just a warning. Same shape as the $grid_auto_rows
			// guard at :448.
			$shadow = is_array( $shadow ) ? '' : $shadow;
			// Shadow COLOUR is a separate attribute (D621/D622 colour-panel split);
			// ShadowControl stores SHAPE only. Composed back together at emission
			// via sgs_shadow_value_composed(). Same is_array guard rationale as the
			// shape above — a tiered object would TypeError-fatal the ?string hint.
			$shadow_colour = $attributes['shadowColour'] ?? '';
			$shadow_colour = is_array( $shadow_colour ) ? '' : $shadow_colour;
			// HOVER-state sibling (Rule 31, 2026-08-22): ShadowControl's colour
			// row is now two-state (normal/hover) for the four blocks routing
			// their outer shadow through this shared wrapper — container, hero,
			// physics-canvas, trust-bar (main shadow only; its icon-circle/
			// badge-image shadows are block-private and handled in their own
			// render.php). Hover reuses the resting SHAPE, only the colour
			// differs, mirroring how the existing backgroundColourHover/
			// textColourHover pairs work per-block.
			$shadow_colour_hover = $attributes['shadowColourHover'] ?? '';
			$shadow_colour_hover = is_array( $shadow_colour_hover ) ? '' : $shadow_colour_hover;
			$max_width     = $attributes['maxWidth'] ?? '';
			$max_width     = is_array( $max_width ) ? '' : $max_width;
			// Raw read — sanitised via $sgs_css_length after the closure is defined (~line 211).
			//
			// `contentWidth` is a TIER OBJECT ({desktop,tablet,mobile}), same shape as
			// `minHeight` above (:450) — resolved the same way, via the shared
			// `sgs_responsive_normalise_object()` helper, so a plain string (older/
			// other callers) still degrades to today's desktop-only behaviour and a
			// tier object no longer collapses to ''.
			//
			// ⛔ REGRESSION FIXED (2026-08-20): the old `is_array( $content_width )
			// ? '' : $content_width` unconditionally emptied the value on EVERY
			// render, because `contentWidth` has been a tier object (not a scalar)
			// since commit 163f9fa7 migrated 96 core/group instances to
			// sgs/container. That silently defeated `$has_band_props` below, which
			// meant `.sgs-container__inner` never rendered and every container's
			// max-width landed on the OUTER element instead of the content band.
			// Proven live: `/shop/` had `max-width:1280px` on the outer element with
			// no `.sgs-container__inner` child.
			$content_width_obj = sgs_responsive_normalise_object( $attributes['contentWidth'] ?? null );
			$content_width     = $content_width_obj['desktop'] ?? '';
			// minHeight is a TIER OBJECT {desktop,tablet,mobile} (Spec 35 migration,
			// 2026-08-11); `minHeightTablet` / `minHeightMobile` are no longer
			// declared by any block.json.
			//
			// ⛔ This read used to take `$attributes['minHeight']` raw and the two
			// deleted sibling attrs. Post-migration that meant the ARRAY itself
			// reached the emitter and PHP-coerced to the literal string "Array",
			// shipping `min-height:Array` — measured LIVE on the canary: 73
			// declarations (D574). Both tier siblings read '' because the attrs no
			// longer exist, so `$has_responsive_min_height` was always false and the
			// tablet/mobile tiers never rendered at all. An operator setting a
			// section min-height got nothing: the probe set a value and measured 0px.
			//
			// Why the migration's own survey missed it: `migrate-tier-object.py`
			// classifies a block as DELEGATED when it defers to this wrapper, on the
			// stated assumption that "the wrapper already reads an object value" —
			// true for the reads at ~2048, false here — and it only scans
			// `src/blocks/*/render.php`, never shared includes like this one.
			$min_height_obj    = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );
			$min_height        = $min_height_obj['desktop'] ?? '';
			$min_height_tablet = $min_height_obj['tablet'] ?? '';
			$min_height_mobile = $min_height_obj['mobile'] ?? '';
			// ⛔ The WS-A DUAL-KEY FALLBACK IS GONE (2026-08-12). This used to read
			// EITHER `verticalAlign` (container/hero/cta/trust-bar) or `alignItems`
			// (grid-mirror blocks: feature-grid/card-grid/gallery), with
			// verticalAlign winning when both were set. Two names for ONE CSS
			// property is what let the shared LayoutPanel ship a "Vertical
			// alignment" control on 12 blocks that declared only the OTHER name —
			// WordPress silently discarded every value a client set there.
			//
			// UNIFIED ON `alignItems` (Bean-ruled 2026-08-12): it is the actual CSS
			// property this drives (`align-items`), whereas `verticalAlign` invited
			// confusion with CSS's unrelated `vertical-align`. Every block now
			// declares `alignItems` and nothing declares `verticalAlign`; the 7
			// stored instances (all `tc-*` visual-diff fixture pages) and the 2
			// theme patterns were migrated in the same change.
			//
			// Default flipped `start`→'' (D306, 2026-07-11):
			// a blank align falls to the CSS-initial `stretch` (see the guards below),
			// so a cloned grid/flex with NO draft `align-items` renders equal-height
			// columns like the draft (FR-31-5.1 absent→initial). The injected `start`
			// default was the cause of unequal product/gift cards + the brand button
			// not stretching full-width. Blast-radius verified: on page 8 every
			// container relying on the old `start` default wants `stretch`.
			$vertical_align = $attributes['alignItems'] ?? '';

			// CSS-length sanitiser for min-height (inline + injected <style> contexts).
			// Strips everything except digits, dot, %, and unit letters so a value can
			// never break out of its declaration.
			$sgs_css_length = static function ( $value ) {
				return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
			};

			// contentWidth token-or-literal resolver (v0.5 spec — token rename: narrow→normal, default→wide).
			// Named tokens map to WP global CSS custom properties so the band width
			// follows the theme's registered content/wide sizes (content-size=1200, wide-size=1400
			// on this theme). Literals are sanitised via $sgs_css_length (safe to use as a CSS
			// length value). 'full' → empty string = no band cap (the '' !== $content_width guard
			// below suppresses emit). Empty input (attr not set or default "full") → '' (no band
			// max-width — content fills the outer maxWidth, no imposed band).
			$sgs_resolve_content_width = static function ( $value ) use ( $sgs_css_length ) {
				$v = (string) $value;
				if ( 'normal' === $v ) {
					// Standard content width; maps to theme content-size global (~1200px on this theme).
					return 'var(--wp--style--global--content-size,1200px)';
				}
				if ( 'wide' === $v ) {
					// Wide content width; maps to theme wide-size global (~1400px on this theme).
					return 'var(--wp--style--global--wide-size,1400px)';
				}
				if ( 'full' === $v || '' === $v ) {
					// No inner cap — content fills the outer maxWidth, no imposed band.
					return '';
				}
				// Any other non-empty value is a literal CSS length — sanitise and pass through.
				return $sgs_css_length( $v );
			};

			// Resolve contentWidth (was: raw $sgs_css_length strip — would pass token names
			// through as invalid CSS lengths; now: token-aware resolver — v0.5 tokens: normal/wide/full).
			$content_width = $sgs_resolve_content_width( $content_width );
			// Responsive outer max-width — literal CSS lengths (empty = not set by converter yet).
			//
			// ⚠ LEGACY FLAT PATH, now UNREACHABLE (Spec 35 pass 2, 2026-08-11).
			// `maxWidthTablet` / `maxWidthMobile` are no longer declared by ANY
			// block.json, so both reads resolve to '' on every render and every
			// downstream guard ($has_responsive_max_width at :343, the emits at
			// :1489/:1492) is permanently false. The tiers now travel inside the
			// `maxWidth` OBJECT and are emitted by the object path at ~:2294.
			//
			// Left in place deliberately rather than removed: the flag threads
			// through ~10 call sites, and unpicking that during a migration pass
			// is a change to the shared wrapper — Rule 7 design-gate territory,
			// not a drive-by. It is inert, not wrong.
			// REMOVAL TRIGGER: delete this block and its flag together with the
			// contentWidth twin at :435 once passes 2-6 are all closed, in one
			// gated shared-wrapper commit.
			$max_width_tablet = $sgs_css_length( $attributes['maxWidthTablet'] ?? '' );
			$max_width_mobile = $sgs_css_length( $attributes['maxWidthMobile'] ?? '' );
			// When responsive outer max-width tiers exist, the base maxWidth must NOT be
			// emitted inline (inline beats class-based @media). It is deferred to a .uid
			// stylesheet rule in the responsive block so the cascade decides per viewport.
			$has_responsive_max_width = ( '' !== $max_width_tablet || '' !== $max_width_mobile );
			$min_height               = $sgs_css_length( $min_height );
			$min_height_tablet        = $is_section ? $sgs_css_length( $min_height_tablet ) : '';
			$min_height_mobile        = $is_section ? $sgs_css_length( $min_height_mobile ) : '';
			// True when a responsive variant exists → base + variants render via the
			// per-instance uid CSS below (so @media overrides win over the cascade),
			// rather than the inline base (which would beat any .uid{} @media rule).
			$has_responsive_min_height = $is_section && ( '' !== $min_height_tablet || '' !== $min_height_mobile );

			// Responsive padding — all kinds (WP spacing.padding sets base via the block-supports
			// layer; responsive variants land as @media rules scoped to the uid selector).
			// Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
			// §1/§2): paddingTablet/paddingMobile are OBJECT attrs { top, right, bottom, left } —
			// a missing side key = that side unset, matching the prior flat-attr '' semantic.
			$padding_tablet_obj    = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
			$padding_mobile_obj    = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
			$padding_top_tablet    = $sgs_css_length( $padding_tablet_obj['top'] ?? '' );
			$padding_right_tablet  = $sgs_css_length( $padding_tablet_obj['right'] ?? '' );
			$padding_bottom_tablet = $sgs_css_length( $padding_tablet_obj['bottom'] ?? '' );
			$padding_left_tablet   = $sgs_css_length( $padding_tablet_obj['left'] ?? '' );
			$padding_top_mobile    = $sgs_css_length( $padding_mobile_obj['top'] ?? '' );
			$padding_right_mobile  = $sgs_css_length( $padding_mobile_obj['right'] ?? '' );
			$padding_bottom_mobile = $sgs_css_length( $padding_mobile_obj['bottom'] ?? '' );
			$padding_left_mobile   = $sgs_css_length( $padding_mobile_obj['left'] ?? '' );

			// Responsive margin — all kinds. Same object-attr contract as padding above.
			$margin_tablet_obj    = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
			$margin_mobile_obj    = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
			$margin_top_tablet    = $sgs_css_length( $margin_tablet_obj['top'] ?? '' );
			$margin_right_tablet  = $sgs_css_length( $margin_tablet_obj['right'] ?? '' );
			$margin_bottom_tablet = $sgs_css_length( $margin_tablet_obj['bottom'] ?? '' );
			$margin_left_tablet   = $sgs_css_length( $margin_tablet_obj['left'] ?? '' );
			$margin_top_mobile    = $sgs_css_length( $margin_mobile_obj['top'] ?? '' );
			$margin_right_mobile  = $sgs_css_length( $margin_mobile_obj['right'] ?? '' );
			$margin_bottom_mobile = $sgs_css_length( $margin_mobile_obj['bottom'] ?? '' );
			$margin_left_mobile   = $sgs_css_length( $margin_mobile_obj['left'] ?? '' );

			$has_responsive_padding = ( '' !== $padding_top_tablet || '' !== $padding_right_tablet || '' !== $padding_bottom_tablet || '' !== $padding_left_tablet
				|| '' !== $padding_top_mobile || '' !== $padding_right_mobile || '' !== $padding_bottom_mobile || '' !== $padding_left_mobile );
			$has_responsive_margin  = ( '' !== $margin_top_tablet || '' !== $margin_right_tablet || '' !== $margin_bottom_tablet || '' !== $margin_left_tablet
				|| '' !== $margin_top_mobile || '' !== $margin_right_mobile || '' !== $margin_bottom_mobile || '' !== $margin_left_mobile );

			// Content-band (Layer 2: __inner) attrs — section + layout kinds only, since
			// those are the only kinds that can emit the __inner wrapper (content kind
			// uses contentWidth/padding natively; no __inner layer is emitted).
			// Box-object interface contract §2: contentBandPadding is a TIER-of-BOXES
			// object { desktop: {top,right,bottom,left}, tablet: {...}, mobile: {...} }
			// (SGS custom attr, not WP-native style.*) — migrated from 3 sibling flat-box
			// attrs to 1 nested attr, same shape as the $columns_obj / $min_height_obj
			// precedent above: read once via sgs_responsive_normalise_object(), every
			// downstream variable name/type is unchanged. $is_box=true so a legacy
			// un-migrated instance whose raw value is still a flat box (no tier keys)
			// is treated as the desktop tier rather than discarded. Tablet/mobile stay
			// gated to section+layout kinds — a content-kind composite has no __inner
			// band to apply them to.
			$band_padding_tiers  = sgs_responsive_normalise_object( $attributes['contentBandPadding'] ?? null, true );
			$band_padding_obj    = is_array( $band_padding_tiers['desktop'] ?? null ) ? $band_padding_tiers['desktop'] : array();
			$band_padding_top    = $sgs_css_length( $band_padding_obj['top'] ?? '' );
			$band_padding_right  = $sgs_css_length( $band_padding_obj['right'] ?? '' );
			$band_padding_bottom = $sgs_css_length( $band_padding_obj['bottom'] ?? '' );
			$band_padding_left   = $sgs_css_length( $band_padding_obj['left'] ?? '' );

			$band_padding_tablet_obj = ( $is_section || $is_layout ) && is_array( $band_padding_tiers['tablet'] ?? null ) ? $band_padding_tiers['tablet'] : array();
			$band_padding_mobile_obj = ( $is_section || $is_layout ) && is_array( $band_padding_tiers['mobile'] ?? null ) ? $band_padding_tiers['mobile'] : array();

			$band_padding_top_tablet    = $sgs_css_length( $band_padding_tablet_obj['top'] ?? '' );
			$band_padding_right_tablet  = $sgs_css_length( $band_padding_tablet_obj['right'] ?? '' );
			$band_padding_bottom_tablet = $sgs_css_length( $band_padding_tablet_obj['bottom'] ?? '' );
			$band_padding_left_tablet   = $sgs_css_length( $band_padding_tablet_obj['left'] ?? '' );

			$band_padding_top_mobile    = $sgs_css_length( $band_padding_mobile_obj['top'] ?? '' );
			$band_padding_right_mobile  = $sgs_css_length( $band_padding_mobile_obj['right'] ?? '' );
			$band_padding_bottom_mobile = $sgs_css_length( $band_padding_mobile_obj['bottom'] ?? '' );
			$band_padding_left_mobile   = $sgs_css_length( $band_padding_mobile_obj['left'] ?? '' );

			// ⛔ BAND BACKGROUND — CAPABILITY RETIRED 2026-08-12 (Bean-ruled).
			// `contentBandBackground` and every line that emitted it are GONE, and
			// the attribute is no longer declared by any block.json. The rule: a
			// background colour or media fills the max-width of its CONTAINER and
			// is never clipped to the inner content layer, so a band-scoped
			// background was a design error rather than a capability worth
			// keeping. It also superseded the earlier Bean-lock of 2026-06-16
			// ("band-level CSS must survive cloning regardless of block kind"),
			// which was about which KINDS got the band background — not about
			// whether a band background should exist at all.
			//
			// Verified before deletion: 0 posts on the canary stored the attribute
			// (DB query, not inference), and its only editor control reached just
			// 12 blocks that never declared it (see the ContentBandPanel tombstone
			// in ContainerWrapperControls.js). Nothing to migrate.
			//
			// Band PADDING and band WIDTH are untouched — they are real, declared,
			// consumed capabilities. Do NOT reintroduce a band-scoped background.

			// Responsive content-width overrides for the band (tablet / mobile).
			// Use the token-or-literal resolver (same as the base) so 'narrow'/'default'/
			// 'full'/literal all resolve correctly at every tier.
			// ⚠ LEGACY FLAT PATH, now UNREACHABLE — the contentWidth twin of the
			// maxWidth note at :338. `contentWidthTablet` / `contentWidthMobile` are
			// no longer declared by any block.json; the tiers travel inside the
			// `contentWidth` OBJECT and are emitted at ~:2022. Same removal trigger.
			$content_width_tablet = ( $is_section || $is_layout ) ? $sgs_resolve_content_width( $attributes['contentWidthTablet'] ?? '' ) : '';
			$content_width_mobile = ( $is_section || $is_layout ) ? $sgs_resolve_content_width( $attributes['contentWidthMobile'] ?? '' ) : '';

			$has_band_responsive = ( $is_section || $is_layout ) && (
				'' !== $band_padding_top_tablet || '' !== $band_padding_right_tablet ||
				'' !== $band_padding_bottom_tablet || '' !== $band_padding_left_tablet ||
				'' !== $band_padding_top_mobile || '' !== $band_padding_right_mobile ||
				'' !== $band_padding_bottom_mobile || '' !== $band_padding_left_mobile ||
				'' !== $content_width_tablet || '' !== $content_width_mobile
			);

			// HTML tag. No block declares a user-facing 'htmlTag' attr any more
			// (removed 2026-07-05) — callers pass 'tag' in $opts explicitly.
			$html_tag = $opt_tag ? $opt_tag : 'section';
			// Landmark + sectioning + grouping range (D344, 2026-07-16; 'main' removed
			// — see below). The ARIA-landmark tags (nav/aside/header/footer) +
			// sectioning (article/section) + grouping (div/figure), plus the
			// pre-existing details/fieldset. This is what a generic container needs to
			// carry a semantic tag in every page context (WCAG 2.2 landmark navigation
			// + SEO).
			//
			// 'main' IS allowed, but only ONCE per request — see the guard below.
			//
			// HISTORY, because this reverses an earlier decision rather than ignoring
			// it: 'main' was previously removed from this list outright. The reasoning
			// was sound as far as it went — a page has exactly one <main> landmark (no
			// nesting exception exists for it, unlike header/footer/aside, confirmed
			// against HTML-AAM), and offering it on a repeatable layout block let a
			// client produce 2-3 <main> landmarks on one page.
			//
			// But removing it traded one defect for a worse one. Every one of the
			// theme's 9 templates authors tagName:'main' on its outermost content
			// container, and every one silently fell through to 'section' — measured
			// live 2026-08-21: ZERO <main> and ZERO role="main" on the home, shop and
			// about pages. So the site shipped no main landmark at all, on any page,
			// for any client. That breaks the target of every "skip to content" link
			// and removes the landmark screen readers jump to by shortcut key (WCAG
			// 2.4.1 Bypass Blocks).
			//
			// The fix keeps BOTH properties: the first container claiming 'main' in a
			// request renders <main>; any later one falls back to 'section'. A client
			// duplicating a container therefore cannot produce a second <main> — the
			// original footgun stays closed — while the template's single intentional
			// one now works.
			$allowed_tags = array(
				'section',
				'div',
				'article',
				'aside',
				'nav',
				'header',
				'footer',
				'figure',
				'details',
				'fieldset',
				'main',
			);
			if ( ! in_array( $html_tag, $allowed_tags, true ) ) {
				$html_tag = 'section';
			}

			// Singleton guard for the document's one <main>. Static, so it resets
			// naturally per request. Deliberately NOT a "did the template ask first"
			// check: whichever container renders first wins, which for a block theme
			// is the outermost one the template authored.
			if ( 'main' === $html_tag ) {
				static $sgs_main_landmark_claimed = false;

				if ( $sgs_main_landmark_claimed ) {
					$html_tag = 'section';
				} else {
					$sgs_main_landmark_claimed = true;
				}
			}

			// WP-native align — breakout control (v0.4: widthMode retired; align replaces
			// widthMode's breakout job per spec §0e). Reads the block's WP 'align' attribute
			// (set by the toolbar via supports.align:['wide','full']); emits alignwide /
			// alignfull class so WP theme styles handle the breakout correctly.
			$align = $attributes['align'] ?? '';

			// Grid item defaults (SB-1) — section + layout kinds only.
			// gridItemPadding/gridItemBorderRadius are now box-object attrs
			// (A1 migration, 2026-07-26): { top,right,bottom,left } /
			// { topLeft,topRight,bottomLeft,bottomRight }. Serialise to CSS
			// shorthand here so the rest of this method's string-based
			// consumers ($grid_item_padding !== '' guards, sgs_sanitize_grid_template)
			// are unchanged. Empty/absent object → '' (identical neutral
			// behaviour to the old empty-string default).
			// $grid_item_padding / $grid_item_border_radius are ALREADY safe against a
			// tiered {desktop,tablet,mobile} object reaching this legacy scalar path
			// (Spec 35 Phase 1.4b, STAGE 2 verification): sgs_serialise_box_sides() /
			// sgs_serialise_box_corners() only read specific side/corner keys
			// (top/right/bottom/left | topLeft/topRight/bottomLeft/bottomRight) off
			// the array they're given via `?? ''` allowlist reads — a tiered object
			// carries none of those keys, so every side/corner sanitises to '' and
			// the whole shorthand returns '' (no side/corner set). No guard needed.
			$grid_item_padding       = sgs_serialise_box_sides( $attributes['gridItemPadding'] ?? array() );
			$grid_item_background    = $attributes['gridItemBackground'] ?? '';
			$grid_item_border_radius = sgs_serialise_box_corners( $attributes['gridItemBorderRadius'] ?? array() );
			$grid_item_border        = $attributes['gridItemBorder'] ?? '';
			// D636 border-gradient rollout (residual scope, 2026-08-17): siblings of
			// gridItemBorder rather than a replacement — gridItemBorder stays the
			// authoritative width/style source even when a gradient paints the
			// colour. sgs_border_gradient_css() is itself a no-op when the resolved
			// gradient is '', so unset content is byte-identical to before these
			// existed.
			$grid_item_border_gradient       = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( (string) ( $attributes['gridItemBorderGradient'] ?? '' ) ) : '';
			$grid_item_border_gradient_hover = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( (string) ( $attributes['gridItemBorderGradientHover'] ?? '' ) ) : '';
			$grid_item_shadow                = $attributes['gridItemShadow'] ?? '';
			$grid_item_text_colour           = $attributes['gridItemTextColour'] ?? '';
			// is_array guards (Spec 35 Phase 1.4b, STAGE 2): these four ARE being made
			// tier-capable below. A tiered object reaching these legacy scalar vars
			// would TypeError-fatal sgs_colour_value()/sgs_shadow_value() (both
			// `?string` typed — array never coerces) at ~:775 ($grid_item_background),
			// ~:788 ($grid_item_shadow), ~:792 ($grid_item_text_colour), or fatal
			// preg_replace()+trim() on an array at ~:781-782 ($grid_item_border —
			// preg_replace on an array SUBJECT returns an array, and trim() then
			// TypeErrors on that array). Same shape as the $grid_auto_rows guard
			// at :448.
			$grid_item_background = is_array( $grid_item_background ) ? '' : $grid_item_background;
			$grid_item_border     = is_array( $grid_item_border ) ? '' : $grid_item_border;
			$grid_item_shadow     = is_array( $grid_item_shadow ) ? '' : $grid_item_shadow;
			// Grid-item shadow COLOUR — same SHAPE/colour split as the outer shadow
			// above, same is_array guard rationale.
			$grid_item_shadow_colour = $attributes['gridItemShadowColour'] ?? '';
			$grid_item_shadow_colour = is_array( $grid_item_shadow_colour ) ? '' : $grid_item_shadow_colour;
			$grid_item_text_colour   = is_array( $grid_item_text_colour ) ? '' : $grid_item_text_colour;

			// Grid-item background/text-colour HOVER + gradient siblings (Step 5a,
			// phase-colour-conformance.md, 2026-08-22 — closes rule 31's
			// GridItemDefaultsPanel.js findings). Reuses the SAME two helpers
			// container's own root background/text rows already call
			// (sgs_background_paint_decl() / sgs_resolve_text_colour_or_gradient()
			// + sgs_text_colour_decl()) — no new PHP mechanism invented. Emission
			// is scoped-CSS, not another `--sgs-gi-*` custom property, because
			// unlike the resting-only case the DECLARATION PROPERTY itself
			// differs between a solid colour and a gradient
			// (background-color vs background-image; a single custom property
			// cannot express that), same reasoning as the border-gradient block
			// below. Same is_array guard rationale as every other gridItem* var
			// above.
			$grid_item_background_hover          = $attributes['gridItemBackgroundHover'] ?? '';
			$grid_item_background_gradient       = $attributes['gridItemBackgroundGradient'] ?? '';
			$grid_item_background_hover_gradient = $attributes['gridItemBackgroundHoverGradient'] ?? '';
			$grid_item_background_hover          = is_array( $grid_item_background_hover ) ? '' : $grid_item_background_hover;
			$grid_item_background_gradient       = is_array( $grid_item_background_gradient ) ? '' : $grid_item_background_gradient;
			$grid_item_background_hover_gradient = is_array( $grid_item_background_hover_gradient ) ? '' : $grid_item_background_hover_gradient;

			$grid_item_text_colour_hover          = $attributes['gridItemTextColourHover'] ?? '';
			$grid_item_text_colour_gradient       = $attributes['gridItemTextColourGradient'] ?? '';
			$grid_item_text_colour_hover_gradient = $attributes['gridItemTextColourHoverGradient'] ?? '';
			$grid_item_text_colour_hover          = is_array( $grid_item_text_colour_hover ) ? '' : $grid_item_text_colour_hover;
			$grid_item_text_colour_gradient       = is_array( $grid_item_text_colour_gradient ) ? '' : $grid_item_text_colour_gradient;
			$grid_item_text_colour_hover_gradient = is_array( $grid_item_text_colour_hover_gradient ) ? '' : $grid_item_text_colour_hover_gradient;

			// QB-1 advanced grid attrs (section + layout kinds only).
			// is_array guard (Spec 35 pass 3b, 2026-08-11) — SAME shape as
			// $grid_template's guard at :234-235. gridTemplateRows is now
			// object-typed ({desktop,tablet,mobile}) on migrated blocks; the
			// legacy scalar path below does `trim((string) $grid_template_rows)`
			// at :916/:1657, and PHP's array-to-string coercion turns an
			// unguarded array into the literal string "Array" (non-empty),
			// which would emit a garbage `grid-template-rows:Array` declaration
			// and suppress whatever auto-flex/auto-rows fallback exists. This
			// mirrors the exact defect pass 3a found for gridTemplateColumns
			// (feature-grid/render.php `trim((string)$attr)` -> "Array").
			// Tiers are read raw (never object-shaped by any block today) — if
			// a future block ever stores them as objects too, they will need
			// the same guard, but nothing does yet so adding it speculatively
			// would be untestable dead code.
			$grid_template_rows        = $attributes['gridTemplateRows'] ?? '';
			$grid_template_rows        = is_array( $grid_template_rows ) ? '' : $grid_template_rows;
			$grid_template_rows_tablet = $attributes['gridTemplateRowsTablet'] ?? '';
			$grid_template_rows_mobile = $attributes['gridTemplateRowsMobile'] ?? '';
			$grid_auto_rows            = $attributes['gridAutoRows'] ?? '';
			// is_array guard — same shape as $columns/$gap/$grid_template at :157-167.
			// D549 made gridAutoRows tier-capable, so a block MAY now store it as a
			// {desktop,tablet,mobile} object. Without this line the legacy scalar path
			// below hands that array to sgs_sanitize_grid_template( (string) $x ) and
			// PHP raises "Array to string conversion" on EVERY render, emitting a
			// garbage `grid-auto-rows:Array` declaration beside the correct one.
			//
			// Found by a QC-council rater as a LATENT landmine (no block declares it
			// as an object yet, so it cannot fire today) — aimed squarely at the very
			// next step, the delegated per-block migration. Nothing would have caught
			// it: a PHP runtime warning is not a build error.
			//
			// ⚑ The rater reported all SIX new tier-capable properties as exposed.
			// Fact-checked before applying: only this one is. The other five
			// (justifyItems, alignContent, justifyContent, flexDirection, flexWrap)
			// are already protected by the STRICT in_array() allowlists at :433-457 —
			// an array fails a strict comparison against a list of strings and falls
			// back to the safe default, with no warning and no garbage declaration.
			$grid_auto_rows        = is_array( $grid_auto_rows ) ? '' : $grid_auto_rows;
			$justify_items         = $attributes['justifyItems'] ?? 'stretch';
			$align_content         = $attributes['alignContent'] ?? 'stretch';
			$allowed_justify_items = array( 'stretch', 'start', 'center', 'end' );
			$allowed_align_content = array( 'stretch', 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly' );
			if ( ! in_array( $justify_items, $allowed_justify_items, true ) ) {
				$justify_items = 'stretch';
			}
			if ( ! in_array( $align_content, $allowed_align_content, true ) ) {
				$align_content = 'stretch';
			}

			// AXIS-4 flex-receiving attrs (section + layout kinds — flex only).
			$justify_content         = $attributes['justifyContent'] ?? '';
			$flex_direction          = $attributes['flexDirection'] ?? '';
			$flex_wrap               = $attributes['flexWrap'] ?? '';
			$allowed_justify_content = array( '', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly' );
			$allowed_flex_direction  = array( '', 'row', 'row-reverse', 'column', 'column-reverse' );
			$allowed_flex_wrap       = array( '', 'wrap', 'nowrap', 'wrap-reverse' );
			if ( ! in_array( $justify_content, $allowed_justify_content, true ) ) {
				$justify_content = '';
			}
			if ( ! in_array( $flex_direction, $allowed_flex_direction, true ) ) {
				$flex_direction = '';
			}

			// <main> stacks by default (2026-08-23, Bean-directed). A <main> is the
			// page's one content landmark and its children are page SECTIONS, so a row
			// axis is never the right answer for it. D742 changed the generic container's
			// `layout` default to "flex" with flexDirection left blank — correct for a
			// generic container, since blank resolves to CSS's own `row` and that keeps
			// the converter's draft->clone mapping honest (R-1) — but it is retroactive
			// across every instance that never set the attr, and NONE of the theme's nine
			// <main> containers had. Measured live on the product page before this landed:
			// three sections laid out horizontally at 634/1328/1328px on a 1454px viewport,
			// the buybox band's background covering under half the page.
			//
			// ⚠ This is a FALLBACK, not an override, and the distinction is load-bearing:
			// it fires ONLY when flexDirection is blank (genuinely unset — WP omits an
			// attribute equal to its default, and this one defaults to ''), so an operator
			// who deliberately picks `row` still gets `row`. An override would leave the
			// direction control visibly present and silently inert, which is precisely the
			// defect `supports.align` was removed for the day before this.
			//
			// No cloning impact: the converter never emits `tagName` at all (verified —
			// zero occurrences across converter/), so `main` reaches this code only from a
			// hand-authored theme template. `layout` cannot be the lever instead, because
			// it now DEFAULTS to "flex" and WP does not serialise a value equal to its
			// default — an authored "flex" and an absent key are indistinguishable here,
			// the same absent-vs-default trap this session already hit twice.
			// ⛔ REVISED 2026-08-23, same day, on Bean's challenge — and his framing was
			// the correct one. The first version forced flexDirection:'column' here. That
			// works, but it answers the wrong question: it makes <main> a flex container
			// in order to stop it being a flex ROW, when a page's main region has no
			// business being a flex container at all. Normal block flow already stacks;
			// that is what block layout DOES.
			//
			// MEASURED, which is what settled it: <main> on 404.html computes
			// display:block and stacks correctly with zero flex involved, because that
			// template's <main> has a content band — and $grid_on_inner (above) routes
			// the flex declarations onto the __inner element, leaving the outer alone.
			// single-product.html's <main> said contentWidth:"full", so it had NO band, no
			// __inner to route to, and the flex landed on <main> itself as a ROW. So
			// whether the page's main region became a flex container was decided purely
			// by whether it happened to carry a content band. That is the actual defect.
			//
			// The fix is therefore to SUPPRESS the outer flex for a <main>, not to
			// re-point it: children fall back to block flow, stack, and fill the width,
			// with no flex-wrap semantics dragged along (column + wrap can wrap into
			// COLUMNS if a height is ever constrained — a latent trap the previous shape
			// carried). An explicit direction still wins, so the control never lies.
			$suppress_outer_flex_for_main = ( 'main' === $html_tag && '' === $flex_direction );
			if ( ! in_array( $flex_wrap, $allowed_flex_wrap, true ) ) {
				$flex_wrap = '';
			}

			// D6: SVG background attrs, universal (see the equivalent note above the
			// main bg-attrs block).
			$bg_svg_content        = $attributes['bgSvgContent'] ?? '';
			$bg_svg_position       = $attributes['bgSvgPosition'] ?? 'background';
			$allowed_svg_positions = array( 'background', 'foreground' );
			if ( ! in_array( $bg_svg_position, $allowed_svg_positions, true ) ) {
				$bg_svg_position = 'background';
			}
			$bg_svg_animation       = $attributes['bgSvgAnimation'] ?? 'none';
			$allowed_svg_animations = array( 'none', 'pulse', 'float', 'wave' );
			if ( ! in_array( $bg_svg_animation, $allowed_svg_animations, true ) ) {
				$bg_svg_animation = 'none';
			}
			$bg_svg_speed       = $attributes['bgSvgAnimationSpeed'] ?? 'medium';
			$allowed_svg_speeds = array( 'slow', 'medium', 'fast' );
			if ( ! in_array( $bg_svg_speed, $allowed_svg_speeds, true ) ) {
				$bg_svg_speed = 'medium';
			}
			$bg_svg_opacity     = isset( $attributes['bgSvgOpacity'] ) ? absint( $attributes['bgSvgOpacity'] ) : 100;
			$bg_svg_min_height  = $attributes['bgSvgMinHeight'] ?? '';
			$bg_svg_text_shadow = ! empty( $attributes['bgSvgTextShadow'] );
			$has_bg_svg         = ! empty( $bg_svg_content );

			// ----------------------------------------------------------------
			// Derived booleans.
			// ----------------------------------------------------------------
			$has_bg_image = ! empty( $bg_image['url'] );
			$has_bg_video = ! empty( $bg_video['url'] );

			// ----------------------------------------------------------------
			// Build inline styles.
			// ----------------------------------------------------------------
			$styles = array_merge( array(), $opt_extra_styles );

			// Grid-on-inner (Spec 22 FR-22-4.1; Bean correction 2026-06-15): when a
			// block has a grid/flex layout AND a content band (contentWidth), the grid
			// (display/columns/gap) AND the band (max-width/margin) BOTH live on the
			// __inner content-band element — NOT the full-bleed outer — so the outer's
			// section background spans full width while the content caps + centres.
			// Base grid/gap decls collected into $inner_grid_decls (emitted on the
			// __inner below); responsive grid/gap tiers route to $grid_sel.
			// Band-presence predicate (Bean-locked 2026-06-16): true when ANY band-level
			// CSS exists — content-width, band padding (any side), or band background.
			// Drives both grid-on-inner folding and __inner existence so band CSS
			// survives cloning regardless of which draft layer it came from or the
			// block's kind. Defined here because all five band vars are read above
			// ( $content_width ~L196, $band_padding_* ~L251-254, $band_background ~L268 ).
			$has_band_props = (
				'' !== $content_width ||
				'' !== $band_padding_top ||
				'' !== $band_padding_right ||
				'' !== $band_padding_bottom ||
				'' !== $band_padding_left
			);

			// Task 1 (Stack layout): Stack is a flex mode (display:flex +
			// forced flex-direction:column, see the layout branch below), so it
			// routes through exactly the same grid-on-inner / gap / shrink-to-fit
			// plumbing as 'flex' — joining every gate below that already reads
			// 'grid' || 'flex' for that reason. It does NOT join the grid-ONLY
			// gates further down (grid-item defaults, grid-template-rows,
			// tier-column-count, grid-template responsive tiers) — those emit
			// grid-specific properties that have no meaning on a flex container.
			$grid_on_inner = ( ( 'grid' === $layout || 'flex' === $layout || 'stack' === $layout ) && $has_band_props && null === $opt_wrap_inner );
			// Container queries (Spec 37 FR-37-16): force the two-layer structure so the
			// flex/grid container (where gap applies) is the __inner — a DESCENDANT of
			// the container-type outer — so @container queries can respond to the
			// block's own width (an element cannot size-query itself). Paired with the
			// $do_wrap force further down so the __inner element actually renders.
			// Stack joins this for the same reason it joins $grid_on_inner above.
			if ( $container_queries && ( 'grid' === $layout || 'flex' === $layout || 'stack' === $layout ) ) {
				$grid_on_inner = true;
			}
			$inner_grid_decls = array();
			// Base grid/flex REAL properties (display, template, align, wrap, justify,
			// grid-template-rows, grid-auto-rows) — no-inline deferral (Spec 32, D293).
			// These are NEVER inlined any more; they always route to the scoped .$uid
			// stylesheet (see $has_base_grid / $grid_sel below). --sgs-gi-* custom
			// properties ($gi, built later) stay in $inner_grid_decls/$styles and
			// remain inline — custom properties are explicitly allowed by the
			// no-inline contract.
			$base_grid_real_decls = array();

			// Base OUTER real-property decls (Spec 32 no-inline contract) — min-height,
			// box-shadow, background-* (base tier). Collected here and emitted as a
			// scoped .$uid rule below (never inline), mirroring $base_grid_real_decls +
			// $base_spacing. Custom properties (--sgs-*) are NOT collected here — they
			// are explicitly allowed inline and stay in $styles.
			$base_outer_decls = array();

			// gap — section + layout kinds. No-inline contract (Spec 32): the base gap
			// (no responsive tiers) routes to the scoped $grid_sel rule via
			// $base_grid_real_decls, exactly like display/grid-template — never inline.
			// (The tiered case already scopes in the responsive block below.) $grid_sel
			// already follows $grid_on_inner, so gap co-locates with the display decl.
			if ( ( $is_section || $is_layout ) && '' !== $gap && ! ( $gap_tablet || $gap_mobile ) ) {
				$base_grid_real_decls[] = 'gap:' . sgs_container_gap_value( $gap );
			}

			// Base min-height — section kind. When responsive variants exist the
			// responsive branch below emits base + tiers on .$uid instead (mutually
			// exclusive with this base-only case via $has_responsive_min_height).
			if ( $is_section && $min_height && ! $has_responsive_min_height ) {
				$base_outer_decls[] = 'min-height:' . esc_attr( $min_height );
			}

			if ( $shadow ) {
				// T2.2b (Bean-approved 2026-07-28): route through sgs_shadow_value()
				// so BOTH preset slugs (wrapped in the preset var, byte-identical to
				// the old behaviour) AND raw box-shadow strings from ShadowControl
				// render. The old hardcoded preset wrap mangled raw CSS into an
				// invalid var() and shadows silently vanished.
				// 2026-08-20: composed, not shape-only. ShadowControl has always
				// rendered a "Shadow colour" picker, but four blocks routing through
				// this wrapper (container, hero, physics-canvas, trust-bar) passed it
				// no handler at all — picking a colour threw
				// `onColourChange is not a function` and blanked the inspector. The
				// control is now wired to a real `shadowColour` attribute, and this is
				// the consumer that makes it render rather than a dead control.
				// Preset slugs are unaffected: sgs_shadow_value_composed() delegates
				// straight to sgs_shadow_value() for anything that is not a raw shape.
				// ⚠ VISIBLE CHANGE, declared not slipped in: a RAW shape with no
				// colour set previously emitted no colour at all, so the browser used
				// `currentColor` — i.e. the shadow tracked the TEXT colour and went
				// near-invisible on dark sections. It now defaults to rgba(0,0,0,0.1),
				// matching cta-section (render.php:125), which has composed since D621.
				$shadow_value = sgs_shadow_value_composed( $shadow, $shadow_colour );
				if ( '' !== $shadow_value ) {
					$base_outer_decls[] = 'box-shadow:' . $shadow_value;
				}
			}

			// Background image — real <img> fast path (Phase 2 LCP, mirrors
			// sgs/hero's own `bg_img_html` in render.php).
			//
			// Why: a CSS background-image only becomes discoverable to the browser's
			// PRELOAD SCANNER once it has downloaded and matched the render-blocking
			// stylesheet that declares it — the scanner cannot see inside a <style>
			// tag while still parsing the HTML. A real <img fetchpriority="high"> is
			// visible to the scanner immediately, while it is still reading markup,
			// which lets the browser start the request for the section's LCP image
			// far earlier and shortens the page's largest paint.
			//
			// $sgs_bg_img_is_simple gates the <img> path to cases it can express
			// FAITHFULLY. Every clause below names a real capability gap between
			// <img> and CSS background-* — this is a mechanism boundary applied
			// identically to every block that reaches this shared wrapper, not a
			// per-block carve-out.
			$sgs_bg_img_is_simple = ( 'no-repeat' === $bg_repeat )
				// An <img> is a single raster paint — it has no equivalent to
				// background-repeat's tiling, so a tiled background must stay CSS.
				&& in_array( $bg_size, array( 'cover', 'contain' ), true )
				// object-fit only maps to cover/contain. background-size also
				// accepts arbitrary lengths/percentages/'auto', none of which
				// object-fit can express, so anything other than cover/contain
				// must stay CSS.
				&& ! $bg_parallax
				// Parallax works by pinning the CSS background box with
				// `position:fixed` relative to the viewport (see
				// `.sgs-container--parallax` in style.css) — an <img> painting the
				// section's own box cannot reproduce that independent scroll.
				&& 'fixed' !== $bg_attachment
				// background-attachment:fixed has no <img> equivalent, for the
				// same structural reason as parallax above.
				&& empty( $bg_image_tablet['url'] )
				&& empty( $bg_image_mobile['url'] );
				// The tablet/mobile tier overrides (below, ~L2079-2083) swap the
				// image on the SAME ::before layer inside @media rules — an <img>
				// element sitting outside that layer does not participate. Migrating
				// only the desktop tier while leaving tiers on ::before would
				// silently drop a client's tablet/mobile background the moment they
				// set one, so whenever ANY tier override exists the WHOLE image
				// stays on the existing CSS path until the tiers are migrated too.

			$bg_img_html = '';
			if ( $has_bg_image && ! $has_bg_video && $sgs_bg_img_is_simple ) { // D6: universal, was section-only.
				// PAGE-SCOPED counter (Fix 3, adversarial-review corrected): LCP
				// priority is a property of the PAGE's render order, not of this
				// block's own code path — a private static here would only know
				// "am I first within THIS wrapper", so a hero background image
				// followed by a container background image would mark BOTH
				// `fetchpriority=high`, prioritising neither. sgs_hero/render.php
				// calls the SAME shared counter (helpers-media.php) so only the
				// image that renders first ON THE PAGE — whichever block it
				// belongs to — gets the high-priority hint; every later instance
				// is presumed below-the-fold and stays lazy.
				$sgs_bg_img_is_first = 1 === sgs_next_background_image_index();

				$bg_img_html = sgs_responsive_image(
					! empty( $bg_image['id'] ) ? absint( $bg_image['id'] ) : 0,
					$bg_image['url'],
					'',
					'full',
					array(
						'class'         => 'sgs-container__image-bg',
						'aria-hidden'   => 'true',
						'fetchpriority' => $sgs_bg_img_is_first ? 'high' : 'auto',
						'loading'       => $sgs_bg_img_is_first ? 'eager' : 'lazy',
						'decoding'      => $sgs_bg_img_is_first ? 'sync' : 'async',
					)
				);
			}

			// object-fit/object-position for the <img> path above — built here
			// (where $bg_size/$bg_position are in scope) but EMITTED with the
			// other scoped rules further down, same reason as $sgs_media_layer_decls
			// below: $uid/$responsive_css don't exist yet at this point. No-inline
			// contract (Spec 32): these values route to the scoped <style>, never
			// onto the <img> tag itself.
			$sgs_bg_img_style_decls = array();
			if ( '' !== $bg_img_html ) {
				$sgs_bg_img_style_decls[] = 'object-fit:' . esc_attr( $bg_size );
				$sgs_bg_img_style_decls[] = 'object-position:' . esc_attr( $bg_position );
			}

			// object-fit/object-position for the <video> background — same
			// $bg_size/$bg_position source as the <img> fast path immediately
			// above and the CSS-background ::before layer below.
			// `backgroundSize`/`backgroundPosition` are the ONE attribute pair
			// the whole Background panel writes; the Video tab's new Size/
			// Position controls (BackgroundPanel.js) now write into them too,
			// via the shared object-fit/focal-point media atoms (backdrop
			// scope) — no second attribute family. Before this, a video
			// background had NO size/position control at all: it only ever
			// got style.css's hardcoded `object-fit:cover` default with no
			// object-position rule. Built here (where $bg_size/$bg_position
			// are in scope) but EMITTED with the other scoped rules further
			// down — $uid/$responsive_css don't exist yet at this point.
			// No-inline contract (Spec 32): these values route to the scoped
			// <style>, never onto the <video> tag itself.
			$sgs_bg_video_style_decls = array();
			if ( $has_bg_video ) {
				$sgs_bg_video_style_decls[] = 'object-fit:' . esc_attr( $bg_size );
				$sgs_bg_video_style_decls[] = 'object-position:' . esc_attr( $bg_position );
			}

			// Background image — section kind only, painted on the .$uid::before
			// MEDIA LAYER rather than on .$uid itself (Phase 1, 2026-08-08).
			//
			// Why a layer: `opacity` applies to a whole element, so while the image
			// was a background of .$uid there was no way to dim the media without
			// dimming the section's own content with it. The pseudo-element carries
			// the image and its own `backgroundMediaOpacity`; the colour/gradient
			// overlay span already paints ABOVE it (z-index 0 vs -1) and content
			// above both, so lowering a colour's alpha lets the media through —
			// one mental model instead of a separate "overlay" concept.
			//
			// ::before was verified unused on .sgs-container before taking it.
			// The responsive tablet/mobile overrides target the same layer below.
			// NOTE: the declarations are BUILT here (where $bg_* are in scope) but
			// EMITTED with the other scoped rules further down — $uid and
			// $responsive_css do not exist yet at this point, and $responsive_css
			// is initialised to '' below, which would silently discard anything
			// appended here.
			//
			// Gated on `! $sgs_bg_img_is_simple` (added Phase 2): when the <img>
			// fast path above already painted the image, this block must NOT also
			// push background-image onto ::before — that would double-paint the
			// same image on two separate layers for no benefit.
			$sgs_media_layer_decls = array();
			if ( $has_bg_image && ! $has_bg_video && ! $sgs_bg_img_is_simple ) { // D6: universal, was section-only.
				// The layer's own box properties are emitted HERE rather than as a
				// blanket `.sgs-container::before` rule in style.css, so the
				// pseudo-element only becomes a box on containers that actually have
				// a background image — every other container is untouched.
				// `content` is mandatory: without it ::before generates no box and
				// the background-image below would never paint.
				// z-index -1 paints ABOVE the container's own background-colour and
				// BELOW both the overlay span (z-index 0) and content (z-index 1),
				// which is the media < colour < content order the model requires.
				$sgs_media_layer_decls[] = 'content:""';
				$sgs_media_layer_decls[] = 'position:absolute';
				$sgs_media_layer_decls[] = 'inset:0';
				$sgs_media_layer_decls[] = 'z-index:-1';
				$sgs_media_layer_decls[] = 'pointer-events:none';
				$sgs_media_layer_decls[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
				$sgs_media_layer_decls[] = 'background-size:' . esc_attr( $bg_size );
				$sgs_media_layer_decls[] = 'background-position:' . esc_attr( $bg_position );
				$sgs_media_layer_decls[] = 'background-repeat:' . esc_attr( $bg_repeat );
				// D4 (2026-08-11): `bgParallax` was declared, controlled and given a
				// CSS class marker + a touch-device disable mechanism
				// (`sgs-container--parallax` / `.no-parallax`, `view.js`) — but
				// nothing ever actually turned parallax ON. Fixed here: parallax
				// implies fixed attachment structurally, so it wins over the
				// separate manual "Attachment" dropdown when both are set.
				if ( 'fixed' === $bg_attachment || $bg_parallax ) {
					$sgs_media_layer_decls[] = 'background-attachment:fixed';
				}
				// D5 (Background panel redesign, 2026-08-11): the media-opacity
				// control is REMOVED — `backgroundMediaOpacity` no longer exists
				// as an attribute (see container/block.json). The colour/gradient
				// overlay's own alpha is the one dimming mechanism now.
			}

			// Ken-burns duration.
			if ( $bg_ken_burns && $has_bg_image ) { // D6: universal, was section-only.
				$styles[] = '--sgs-ken-burns-duration:' . absint( $bg_animation_duration ) . 's';
			}

			// Grid / flex display — section + layout kinds. No-inline contract
			// (Spec 32, D293): these REAL properties (display/template/align/wrap/
			// justify) never land in $styles/$inner_grid_decls any more — they
			// accumulate into $base_grid_real_decls and are emitted as a scoped
			// .$uid rule (routed to the __inner content band when $grid_on_inner,
			// so the full-bleed outer stays untouched, else to the outer itself).
			if ( $is_section || $is_layout ) {
				$gd = array();
				if ( 'grid' === $layout ) {
					$gd[] = 'display:grid';
					// Base column template — deferred to the uid stylesheet when
					// responsive template tiers exist (inline beats @media otherwise).
					// D456 — a block may opt in (supports.sgs.intrinsicColumns) to
					// having its column count act as a CEILING that degrades with
					// available width, instead of a fixed count that only changes at
					// a viewport breakpoint. Opt-in, never universal: flipping every
					// grid container at once would change the rendered column count
					// of card grids, feature grids and every cloned layout on every
					// site. An explicit gridTemplateColumns always wins — an operator
					// who authored a literal track list meant it.
					// $intrinsic_columns is resolved once near the top of render().
					$gtc_base = '' !== trim( (string) $grid_template )
						? sgs_sanitize_grid_template( $grid_template )
						: ( $intrinsic_columns
							? sgs_intrinsic_columns_track( absint( $columns ), sgs_container_tier_gap( $attributes, 'desktop' ), sgs_container_tier_min_column_width( $attributes, 'desktop' ) )
							: 'repeat(' . absint( $columns ) . ',1fr)' );
					// An object-shaped gridTemplateColumns owns emission via
					// sgs_emit_responsive_css(); suppress the legacy columns/base fallback
					// when $object_grid is true (object grid present AND container_queries
					// on) so the two don't both emit (the columns default would win as
					// repeat(2,1fr)).
					if ( ! ( $grid_template_tablet || $grid_template_mobile ) && ! $object_grid ) {
						$gd[] = 'grid-template-columns:' . $gtc_base;
					}
					// D288: only impose align-items when a value is set — a blank
					// alignItems falls back to the browser default (stretch), so
					// grid columns fill the row height and match an untouched draft
					// (fixes the cloned hero content pinned to the top).
					if ( '' !== $vertical_align ) {
						$gd[] = 'align-items:' . esc_attr( $vertical_align );
					}
					if ( 'stretch' !== $justify_items ) {
						$gd[] = 'justify-items:' . esc_attr( $justify_items );
					}
					if ( 'stretch' !== $align_content ) {
						$gd[] = 'align-content:' . esc_attr( $align_content );
					}
					// NOTE: a <main> with no explicit flexDirection falls through this whole
					// chain and emits NO display, so block flow stacks its sections. See
					// the note at $suppress_outer_flex_for_main above.
				} elseif ( 'flex' === $layout && ! $suppress_outer_flex_for_main ) {
					$gd[] = 'display:flex';
					/*
					 * OWNERSHIP: block.json owns the DEFAULT; this code owns only the
					 * INVARIANT. There is deliberately no fallback value here.
					 *
					 * Until 2026-08-24 this line read `'' !== $flex_wrap ? $flex_wrap :
					 * 'wrap'` -- a default invented in PHP, invisible to the operator and
					 * to the cloning pipeline. Three problems, all real:
					 *   1. It broke faithful transfer. A draft with no flex-wrap means
					 *      `nowrap` (CSS's initial value); the clone rendered `wrap`.
					 *      Absence is a value that must transfer, same as a missing
					 *      max-width meaning full-width.
					 *   2. '' and 'wrap' rendered IDENTICALLY, so the inspector's default
					 *      option was indistinguishable from an explicit choice.
					 *   3. It was a third ownership model for one property, alongside the
					 *      declared scalar defaults on site-header-row/site-footer-row
					 *      (D455) and the responsive-object default on multi-button.
					 *
					 * All 17 blocks that relied on the fallback now declare
					 * `"flexWrap": { "default": "wrap" }` in their own block.json, and ''
					 * is gone from those enums because it never rendered as blank. WP
					 * applies a block.json default to any instance that does not store the
					 * attribute, so every existing container renders identically and NO
					 * content was migrated. Every one of the 17 has flexDirection default
					 * '' (= row), so 'wrap' is behaviour-preserving for all of them.
					 *
					 * THE INVARIANT BELOW IS NOT A DEFAULT. A column container's cross axis
					 * is its WIDTH, and per CSS Flexbox L1 9.4 a MULTI-LINE container sizes
					 * each line from its items -- "the largest outer hypothetical cross
					 * size" -- while a SINGLE-LINE container with a definite cross size is
					 * HANDED the container's own inner cross size. So column+wrap makes the
					 * child ignore its parent's width entirely: measured live on the PDP at
					 * 375px, a child rendered 712px inside a 327px parent and the page
					 * scrolled sideways. That is true however the value arrived, so it is
					 * coerced rather than defaulted -- an operator who explicitly picks
					 * 'wrap' on a column axis is asking for a broken layout.
					 *
					 * A width/max-width on the CHILD also fixes it (measured: max-width:100%
					 * -> 327px). Deliberately NOT added as well: two overlapping fixes are
					 * unfalsifiable, so neither could ever be safely removed.
					 */
					$is_column_axis = ( 0 === strpos( $flex_direction, 'column' ) );
					if ( $is_column_axis && in_array( $flex_wrap, array( 'wrap', 'wrap-reverse' ), true ) ) {
						$flex_wrap = 'nowrap';
					}
					if ( '' !== $flex_wrap ) {
						$gd[] = 'flex-wrap:' . esc_attr( $flex_wrap );
					}
					// D288: blank alignItems → browser default (see grid branch above).
					if ( '' !== $vertical_align ) {
						$gd[] = 'align-items:' . esc_attr( $vertical_align );
					}
					if ( '' !== $flex_direction ) {
						$gd[] = 'flex-direction:' . esc_attr( $flex_direction );
					}
					if ( '' !== $justify_content ) {
						$gd[] = 'justify-content:' . esc_attr( $justify_content );
					}
				} elseif ( 'stack' === $layout && ! $suppress_outer_flex_for_main ) {
					// Task 1 (Stack layout). Stack is display:flex with the column
					// axis FORCED, not read from flexDirection — that is the whole
					// point of the mode: an operator who set flexDirection:"row" and
					// then picked Stack still gets a column, because Stack answers
					// "which axis" outright rather than depending on a second control
					// staying in sync with it. $flex_direction is therefore
					// deliberately never read in this branch (contrast the flex
					// branch above, which reads it).
					$gd[] = 'display:flex';
					$gd[] = 'flex-direction:column';
					// Column-axis wrap invariant: Stack IS a column axis, so it
					// inherits the same coercion the flex branch applies for an
					// explicit column direction (CSS Flexbox L1 9.4 — a multi-line
					// (wrapped) container sizes each line from its items rather than
					// being handed the parent's cross-size, so column+wrap makes a
					// child ignore its parent's width). See the flex branch's long
					// comment above for the measured regression this prevents.
					if ( in_array( $flex_wrap, array( 'wrap', 'wrap-reverse' ), true ) ) {
						$flex_wrap = 'nowrap';
					}
					if ( '' !== $flex_wrap ) {
						$gd[] = 'flex-wrap:' . esc_attr( $flex_wrap );
					}
					// D288: blank alignItems → browser default (see grid branch above).
					if ( '' !== $vertical_align ) {
						$gd[] = 'align-items:' . esc_attr( $vertical_align );
					}
					if ( '' !== $justify_content ) {
						$gd[] = 'justify-content:' . esc_attr( $justify_content );
					}
				}
				// No-inline contract (Spec 32, D293): these are REAL properties
				// (display/template/align/wrap/justify), never routed inline any
				// more — always accumulated for the scoped .$uid rule below,
				// regardless of $grid_on_inner (which only decides the SELECTOR
				// the scoped rule targets, via $grid_sel).
				$base_grid_real_decls = array_merge( $base_grid_real_decls, $gd );
			}

			// SVG min-height custom property — section kind only.
			if ( $has_bg_svg && ! empty( $bg_svg_min_height ) ) { // D6: universal, was section-only.
				$styles[] = '--sgs-svg-min-height:' . esc_attr( $bg_svg_min_height );
			}

			// Grid item defaults (SB-1) — section + layout kinds. When $grid_on_inner
			// these CSS-vars co-locate with the grid on the __inner band; else on the
			// outer. They are custom properties that inherit to the grid items either
			// way (L3 per-item layer) — co-locating with the grid keeps L1/L2/L3 clean.
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				$gi = array();
				if ( '' !== $grid_item_padding ) {
					$gi[] = '--sgs-gi-padding:' . esc_attr( sgs_sanitize_grid_template( $grid_item_padding ) );
				}
				if ( '' !== $grid_item_background ) {
					$gi[] = '--sgs-gi-bg:' . esc_attr( sgs_colour_value( $grid_item_background ) );
				}
				if ( '' !== $grid_item_border_radius ) {
					$gi[] = '--sgs-gi-radius:' . esc_attr( sgs_sanitize_grid_template( $grid_item_border_radius ) );
				}
				if ( '' !== $grid_item_border ) {
					$safe_border = preg_replace( '/[^A-Za-z0-9\s%(),.\-#]/', '', $grid_item_border );
					$gi[]        = '--sgs-gi-border:' . esc_attr( trim( $safe_border ) );
				}
				if ( '' !== $grid_item_shadow ) {
					// T2.2b: same preset-or-raw routing as the outer shadow above —
					// and, since 2026-08-20, the same SHAPE+colour composition, so
					// GridItemDefaultsPanel's "Shadow colour" picker is a live control
					// rather than a dead one. See the outer-shadow note above for the
					// declared currentColor → rgba(0,0,0,0.1) default change.
					$gi_shadow_value = sgs_shadow_value_composed( $grid_item_shadow, $grid_item_shadow_colour );
					if ( '' !== $gi_shadow_value ) {
						$gi[] = '--sgs-gi-shadow:' . $gi_shadow_value;
					}
				}
				if ( '' !== $grid_item_text_colour ) {
					$gi[] = '--sgs-gi-color:' . esc_attr( sgs_colour_value( $grid_item_text_colour ) );
				}
				if ( $grid_on_inner ) {
					$inner_grid_decls = array_merge( $inner_grid_decls, $gi );
				} else {
					$styles = array_merge( $styles, $gi );
				}
			}

			// QB-1: gridTemplateRows + gridAutoRows — section + layout kinds.
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				// Base row template deferred to the uid stylesheet when responsive
				// row tiers exist (inline beats @media otherwise).
				// No-inline contract (Spec 32, D293): moved from $styles (inline) to
				// $base_grid_real_decls (scoped rule below, on the same $grid_sel
				// selector as $gd). Unlike the pre-existing code (which always
				// targeted the outer regardless of $grid_on_inner, leaving these
				// inert when the grid lives on __inner), unifying into one array
				// emitted at $grid_sel now correctly follows $grid_on_inner too —
				// the row template lands on whichever element is actually the grid.
				if ( '' !== trim( (string) $grid_template_rows ) && ! ( $grid_template_rows_tablet || $grid_template_rows_mobile ) ) {
					$base_grid_real_decls[] = 'grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_template_rows ) );
				}
				if ( '' !== trim( (string) $grid_auto_rows ) ) {
					$base_grid_real_decls[] = 'grid-auto-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_auto_rows ) );
				}
			}

			// ----------------------------------------------------------------
			// Build CSS classes.
			// ----------------------------------------------------------------
			$classes = array( 'sgs-container' );

			// ----------------------------------------------------------------
			// Global padding (the horizontal gutter) — WordPress core's own
			// mechanism, re-adopted 2026-08-21 after a hand-rolled copy of it
			// regressed every nested container.
			//
			// HISTORY, because the shape of this fix is only obvious with it:
			// before 163f9fa7 (2026-07-16) these were `core/group` blocks with
			// `layout:{"type":"constrained"}`. Core gave every constrained group
			// `.has-global-padding`, which supplies the gutter from
			// `--wp--style--root--padding-*` AND — critically — carries core's own
			// nesting reset, so a constrained group inside a constrained group
			// pays the gutter ONCE. That migration carried the max-width cap
			// (`layout.constrained` -> `contentWidth`) across but NOT the gutter,
			// so content rendered flush to the viewport edge. f9f4368b then fixed
			// that symptom by giving EVERY container instance a 24px `padding`
			// default — a PER-INSTANCE default has no nesting reset, so it
			// compounded: measured live on /shop/ at 323px, 19 of 22 containers
			// were nested and a product card sat at left:72px (3 x 24px) with only
			// 165px of its 309px viewport left. The footer-links container was
			// 48px wide with 48px of padding — zero content.
			//
			// So this is a RE-CONNECTION, not a new mechanism: core's four
			// `.has-global-padding` rules were already shipped and live on the page
			// with ZERO elements using them, and `--wp--style--root--padding-left`
			// already computes to 1.5rem/24px — the very number f9f4368b hardcoded.
			//
			// GATE — `$has_band_props`, and no carve-out is needed:
			//   * a real content band == the old constrained group -> gutter.
			//   * `contentWidth:"full"` resolves to '' (see $sgs_resolve_content_width),
			//     so the 5 full-bleed blocks that default it (site-header/-row,
			//     site-footer/-row, physics-canvas) have no band and are excluded —
			//     which is exactly how core excludes full-width from global padding.
			//   * a caller that explicitly suppresses the band via
			//     $opts['wrap_inner'] => false (hero-split, product-card) is left
			//     byte-identical.
			// Deliberately NOT gated on $do_wrap: the $container_queries and
			// fx:horizontal-panel forces further down emit a band ELEMENT without
			// band PROPS, i.e. no constrained cap, so they must not gain a gutter.
			// ⛔ YES, THIS ASKS THE WRONG QUESTION — AND IT STAYS (D726, 2026-08-21).
			// It asks "does this cap its content width?" and uses the answer to decide
			// "should this have a side margin?" — two unrelated questions sharing one
			// answer. That was raised as a defect during the one-cap-per-page work and
			// examined properly rather than acted on. The OUTCOME is correct in every
			// case that exists:
			//   banded container   = page content -> must not touch the screen edge -> gutter
			//   full-bleed container = structure (main / header-row / footer-row) -> no
			//                          automatic indent, and it sets `padding` if it wants one
			// That is the same rule Bean set for bare blocks in D725: opting out of the
			// container behaviour IS the choice, and the padding control is still there.
			// Searched for a counter-example live and found none — 0 footer/text nodes at
			// the viewport edge on /shop/ at 500px.
			//
			// NOT changed because the fix is worse than the flaw: 28 blocks route through
			// this file, three override the band guard via $opts['wrap_inner'], and it is
			// a Rule 7 shared mechanism. Re-verifying header/footer/hero/card-grid/shop
			// filters live buys a tidier conditional and zero visible change.
			//
			// REOPEN IT only on a real case: a container that needs a side margin its
			// band-state will not give it, and cannot simply author `padding`. Until then
			// this is settled — do not re-investigate it.
			if ( $has_band_props && false !== $opt_wrap_inner ) {
				$classes[] = 'has-global-padding';
			}

			// Composite block class (e.g. 'sgs-hero') is appended directly after the
			// base class so composites carry both sgs-container + their own class.
			if ( '' !== $opt_block_class ) {
				$classes[] = $opt_block_class;
			}

			// Merge extra classes from caller.
			foreach ( $opt_extra_classes as $ec ) {
				if ( '' !== $ec ) {
					$classes[] = $ec;
				}
			}

			// The layout marker class. It is a SEMANTIC marker, not the styling hook —
			// the real properties (display/wrap/direction) are emitted as a per-instance
			// `.{uid}` rule under Spec 32's no-inline contract, never keyed on this class.
			// Verified live: a flex container's display comes from
			// `.sgs-container-50841e95 { display:flex; flex-wrap:nowrap }`, and NO rule
			// anywhere keys `display` off `.sgs-container--flex`.
			//
			// Suppressed for a flow-mode <main> (2026-08-23): that element deliberately
			// emits no display and stacks by block flow, so tagging it `--flex` would put
			// a marker on the page that misdescribes its own element. Harmless to
			// rendering — nothing consumes it — which is exactly why it is worth removing
			// rather than leaving: an emitted-but-meaningless class is the shape that let
			// `align` sit inert for months before it was measured.
			if ( '' !== $layout && ! $suppress_outer_flex_for_main ) {
				$classes[] = 'sgs-container--' . esc_attr( $layout );
			}

			// Outer max-width — literal only (v0.4 model per spec §0d).
			// maxWidth non-empty → exact draft value, sanitised via $sgs_css_length.
			// maxWidth empty → full-width outer; emit nothing (no max-width constraint).
			// No-inline contract (Spec 32, D293): the BASE (non-responsive) value is
			// NEVER pushed to $styles (inline) — it is deferred to a scoped .uid rule
			// below ($has_base_max_width), same as the already-responsive-tiered case.
			// $has_base_max_width / $base_max_width_css_value / $base_max_width_margin_auto
			// are read further down once $uid is known (see the base-max-width scoped
			// rule beside the base-spacing rule).
			$has_base_max_width         = false;
			$base_max_width_css_value   = '';
			$base_max_width_margin_auto = false;
			if ( '' !== $max_width ) {
				if ( ! $has_responsive_max_width ) {
					$has_base_max_width         = true;
					$base_max_width_css_value   = $sgs_css_length( $max_width );
					$base_max_width_margin_auto = true;
				}
			}
			// No else — empty maxWidth = full-width outer; nothing emitted.

			// WP-native align breakout classes (v0.4: align attr replaces widthMode breakout).
			if ( 'wide' === $align ) {
				$classes[] = 'alignwide';
			} elseif ( 'full' === $align ) {
				$classes[] = 'alignfull';
			}

			// style.dimensions.maxWidth — WP-native path. Only emit when the top-level
			// maxWidth attr is NOT set (that wins); avoids double-emitting max-width.
			// Same no-inline deferral as above (margin-inline:auto is NOT added here —
			// matches the original inline behaviour, which never added it for this path).
			$style_dim = $attributes['style']['dimensions'] ?? array();
			if ( '' === $max_width && ! empty( $style_dim['maxWidth'] ) ) {
				$has_base_max_width       = true;
				$base_max_width_css_value = esc_attr( $style_dim['maxWidth'] );
			}

			// NOTE (2026-06-16): the prior "Grid/flex + band CSS coexistence" block
			// that folded band CSS (max-width/margin/band-padding/band-bg) onto the
			// OUTER $styles was REMOVED — it wrongly capped the full-bleed outer (the
			// section background stopped spanning full width). The band (L2) now lives
			// ONLY on the __inner element; when the block is a grid/flex container with
			// a content band ($grid_on_inner), the grid (L3) also lives on __inner via
			// $inner_grid_decls. Single mechanism — see the __inner emission below.

			// Min-height flex-centring class — ONLY when the design asks for centring
			// (alignItems === 'center'). A min-height section with default/start/
			// stretch alignment must NOT be force-centred: doing so overrides grid
			// stretch / top alignment (e.g. a hero grid whose columns should fill the
			// row, not float vertically). MF-B, Method-2 converter-lift 2026-06-04.
			if ( $is_section && ! empty( $min_height ) && 'center' === $vertical_align ) {
				$classes[] = 'sgs-container--has-min-height';
			}

			// D6: universal, was section-only (the `if ( true )` wrapper this was
			// left inside of has been removed as dead-conditional cleanup).
			if ( $has_bg_image && ! $has_bg_video ) {
				$classes[] = 'sgs-container--has-bg-image';
				if ( $bg_parallax ) {
					$classes[] = 'sgs-container--parallax';
				}
				if ( $bg_ken_burns ) {
					$classes[] = 'sgs-container--ken-burns';
				}
			}
			if ( $has_bg_video ) {
				$classes[] = 'sgs-container--has-bg-video';
			}
			if ( $has_bg_svg ) {
				$classes[] = 'sgs-container--has-bg-svg';
				$classes[] = 'sgs-container--svg-' . esc_attr( $bg_svg_position );
				$classes[] = 'sgs-container--svg-anim-' . esc_attr( $bg_svg_animation );
				$classes[] = 'sgs-container--svg-speed-' . esc_attr( $bg_svg_speed );
				if ( $bg_svg_text_shadow ) {
					$classes[] = 'sgs-container--svg-text-shadow';
				}
			}

			// Grid column count classes — section + layout kinds.
			// Emit a shorthand sgs-cols-* class ONLY when the corresponding tier has
			// NO explicit grid-template ratio. When an explicit ratio is set the faithful
			// @media grid-template-columns rule (below) carries it; the hardcoded
			// repeat(N,1fr) !important shorthand class would otherwise crush that ratio.
			//
			// A set BASE grid-template governs every wider tier (the base rule applies
			// at all widths a tier @media does not override). The tablet/mobile COUNT
			// shorthands are `!important`, so a *default* tier count (e.g. columnsTablet=2)
			// would crush a faithful base template at that tier. Therefore, when the base
			// template is explicit, suppress the tier count shorthands too: the base rule
			// (or an explicit tier template via QB-2 below) governs the tier. This extends
			// the desktop guard to all tiers — same principle as D228 ("hardcoded/default
			// shorthands that override a faithfully-transferred template are cheats").
			// ⛔ The `sgs-cols-*` shorthand CLASSES were REMOVED 2026-07-23 — they were
			// structurally unable to work under the object model, and silently so.
			//
			// The classes were added to $classes (the OUTER element) and matched by
			// force-flagged single-column rules keyed on `.sgs-cols-mobile-N` in
			// container/style.css. But `$grid_on_inner` is FORCED true under the object
			// model (see :514-516 — @container needs the grid on a DESCENDANT because an
			// element cannot size-query itself), so the grid lives on
			// `.sgs-container__inner` while the class sat on its parent. The rule landed
			// on an element with `display:block` and no grid: inert, no error, no gate.
			// `!important` could not save it — it was on the wrong element.
			//
			// Live proof (canary, footer row columns=4 / columnsMobile=1): desktop
			// rendered 4 columns correctly (the BASE count routes through $gtc_base ->
			// $grid_sel, which IS grid-aware) while 375px rendered 4x66px instead of
			// stacking. FR-37-35 (container queries) introduced the forcing of
			// $grid_on_inner and therefore caused this FR-37-11 regression; both shipped
			// the same day, both unexercised, so the combination was never run.
			//
			// The tier COUNTS now emit as scoped rules at $grid_sel alongside the
			// explicit tier TEMPLATES (see QB-2 below) — one mechanism, grid-aware by
			// construction, no `!important`, and it follows the grid wherever it lives.
			// This also completes D228: a hardcoded shorthand that can override a
			// faithfully-transferred template is a cheat, and this was the last one.

			// ----------------------------------------------------------------
			// Native content-alignment (typography.textAlign support). WP core does
			// NOT reliably merge has-text-align-* into get_block_wrapper_attributes()
			// for this dynamic composite wrapper (verified live on WP 7.0 — the class
			// was absent), so emit it explicitly. This lands the cloned band's
			// text-align (folded to the textAlign attr by the converter) — it cascades
			// to the container's content and a child block that sets its own alignment
			// still overrides it. Universal: every container-equivalent that declares
			// supports.typography.textAlign.
			$text_align = $attributes['textAlign'] ?? '';
			if ( in_array( $text_align, array( 'left', 'center', 'right' ), true ) ) {
				$classes[] = 'has-text-align-' . $text_align;
			}

			// ----------------------------------------------------------------
			// First call to get_block_wrapper_attributes() — before shapes/uid.
			// This mirrors the original render.php ~line 398 first-pass call.
			// ----------------------------------------------------------------
			// D345 Facet B: NO inline `style` on the root — the per-instance `--var`
			// VALUES ($styles) emit as a scoped `.$uid{…}` rule in the block's <style>
			// (the Facet-B block after $uid). Only the class + caller's extra attrs go on
			// the element; an empty $styles no longer produces a stray `style=""`.
			$wrapper_attributes = get_block_wrapper_attributes(
				array_merge( array( 'class' => implode( ' ', $classes ) ), $opt_extra_attrs )
			);

			// ----------------------------------------------------------------
			// Video HTML — section kind only.
			// ----------------------------------------------------------------
			$video_html = '';
			if ( $has_bg_video ) { // D6: universal, was section-only.
				$has_bg_video_tablet = ! empty( $bg_video_tablet['url'] );
				$desktop_src         = esc_url( $bg_video['url'] );
				// Fall back upward when a tier has no override: tablet falls back to
				// desktop, mobile falls back to tablet (which itself may already have
				// fallen back to desktop) — mirrors the client-side swapVideoSrc() fallback.
				$tablet_src = $has_bg_video_tablet ? esc_url( $bg_video_tablet['url'] ) : $desktop_src;
				$mobile_src = ! empty( $bg_video_mobile['url'] ) ? esc_url( $bg_video_mobile['url'] ) : $tablet_src;

				if ( $desktop_src === $tablet_src && $tablet_src === $mobile_src ) {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg" autoplay loop muted playsinline preload="none" aria-hidden="true">' .
						'<source src="%s" type="video/mp4"></video>',
						$desktop_src
					);
				} else {
					// data-src-tablet is emitted ONLY when a tablet override was actually
					// set — a block with no tablet value renders byte-identically to
					// before this tier existed (no stray attribute carrying the desktop
					// fallback value). swapVideoSrc() falls back the same way when the
					// attribute is simply absent from the DOM.
					$tablet_attr = $has_bg_video_tablet ? sprintf( ' data-src-tablet="%s"', esc_attr( $tablet_src ) ) : '';
					$video_html  = sprintf(
						'<video class="sgs-container__video-bg sgs-container__video-bg--responsive" autoplay loop muted playsinline preload="none" aria-hidden="true"' .
						' data-src-desktop="%s"%s data-src-mobile="%s">' .
						'<source src="%s" type="video/mp4"></video>',
						esc_attr( $desktop_src ),
						$tablet_attr,
						esc_attr( $mobile_src ),
						$desktop_src
					);
				}
			}

			// ----------------------------------------------------------------
			// Overlay HTML — section kind only; suppressed by no_overlay opt (C3).
			// ----------------------------------------------------------------
			$overlay_html  = '';
			$overlay_decls = ''; // Emitted scoped on .{uid} .sgs-container__overlay below (no-inline).
			if ( ! $opt_no_overlay ) { // D6: universal, was section-only.
				// Task 3: overlayGradient is now a complete CSS gradient string,
				// validated through sgs_css_gradient_value() — a non-empty valid
				// gradient wins over the flat colour, matching how WP core and
				// Kadence/Spectra/Otter all resolve colour-vs-gradient.
				// D718 (2026-08-21): the EXISTENCE test IS the shared helper's return value.
				// sgs_overlay_decls() yields '' when there is nothing to paint, so "is there an
				// overlay?" and "what does it paint?" are ONE decision in ONE place. D717
				// unified the declaration building but left this gating hand-written at both
				// call sites, which is exactly how sgs/hero kept a divergent overlay policy
				// through that change. hero now gates identically.
				// D6/Step 8 (2026-08-22): blend mode joins the same call — one shared
				// owner for the whole overlay declaration set, not a second emitter
				// appended after this one (the exact gap D718 named and closed for
				// opacity/existence; blend mode does not reopen it).
				$overlay_decls_computed = sgs_overlay_decls( $overlay_colour, $overlay_gradient, $overlay_opacity, $overlay_blend_mode );

				// UNGATED 2026-08-08 (Phase 1). This used to require `$has_any_bg &&`
				// — a colour or gradient set with NO media rendered nothing at all,
				// which is why a flat background colour was only reachable through
				// WordPress's native Color panel.
				//
				// CORRECTED 2026-08-21 (D717). The rest of this comment used to claim the
				// overlay "simply IS the background" when no media sits beneath it. That
				// was true on 2026-08-08 and is NOT true now: `1905257e` gave every one of
				// the eight blocks mounting <BackgroundPanel> its own separate
				// `backgroundColour` base layer, declared AND rendered (verified per block
				// 2026-08-21). This layer is an overlay and only an overlay — which is why
				// it can carry a 30% default opacity without washing out a solid background.
				if ( '' !== $overlay_decls_computed ) {
					// D717 (2026-08-21) — SUPERSEDES D581's D5, which stood here as an
					// explicit "do not reintroduce `backgroundOverlayOpacity`" prohibition.
					// D5 was right that ONE transparency mechanism beats two; it picked the
					// wrong one. The colour picker's alpha silently unlinks the client's
					// brand token — DesignTokenPicker stores a palette slug only on exact
					// string equality, so altering the alpha stores a raw hex instead — and
					// that side effect was not known when D5 was made. Alpha is now off on
					// that row and this is the one mechanism.
					//
					// The gradient-beats-colour resolution is no longer hand-rolled here:
					// sgs_overlay_decls() owns the whole overlay declaration set, and
					// sgs/hero's own `.sgs-hero__overlay` calls the same helper. Two
					// drifting copies became one.
					$overlay_decls = $overlay_decls_computed;
					// No-inline contract (Spec 32): the overlay paint is emitted as a
					// scoped `.{uid} .sgs-container__overlay` rule below — NOT inline on
					// the span. safecss doesn't touch this raw-echoed span, but an inline
					// property declaration still violates the contract + the --check gate.
					$overlay_html = '<span class="sgs-container__overlay" aria-hidden="true"></span>';
				}
			}

			// ----------------------------------------------------------------
			// Shape dividers — section kind only.
			// ----------------------------------------------------------------
			$shape_top_html    = '';
			$shape_bottom_html = '';
			// FR-32-1 / D345: the dividers' height + colour used to ride inline on
			// the divider div as REAL property declarations. They are captured here
			// as declarations and emitted as scoped `.$uid .sgs-shape-divider--*`
			// rules once $uid exists (see the shape-divider block after $uid is
			// minted) — $uid is not known this early, hence the two-step.
			$shape_divider_decls = array();

			if ( $is_section ) {
				$shape_top    = $attributes['shapeDividerTop'] ?? '';
				$shape_bottom = $attributes['shapeDividerBottom'] ?? '';

				if ( $shape_top ) {
					// Scale is a {x,y} PERCENTAGE object (Spec 35 §F.2.3, D637) —
					// it replaced the old scalar px `shapeDividerTopHeight`. X drives
					// the SVG's internal tiling, Y the wrapper's height; both default
					// to 100 = the shape's natural, undistorted size.
					$shape_top_scale = $attributes['shapeDividerTopScale'] ?? null;

					// GRADIENT (D636/D643, Builder 5 — corrected to the two-sibling-
					// attribute storage shape after the coordinator's D643-note
					// mis-transcription was caught against the live overlay
					// precedent, `backgroundOverlayColour`/`overlayGradient`):
					// `shapeDividerTopColour` stays a flat colour, unchanged;
					// `shapeDividerTopColourGradient` is a SIBLING attribute that
					// wins when it holds a valid, non-empty gradient — same
					// resolution order as the overlay pair (~L1285 above).
					// sgs_css_gradient_value() is the single place that decides
					// whether the raw value is a safe gradient; a gradient that
					// fails to parse into any usable SVG stops degrades to the
					// flat-colour path rather than painting nothing.
					$shape_top_colour_raw    = $attributes['shapeDividerTopColour'] ?? 'surface';
					$shape_top_gradient_raw  = $attributes['shapeDividerTopColourGradient'] ?? '';
					$shape_top_gradient      = sgs_css_gradient_value( $shape_top_gradient_raw );
					$shape_top_gradient_id   = $shape_top_gradient ? sgs_shape_divider_gradient_id() : '';
					$shape_top_gradient_defs = $shape_top_gradient
						? sgs_render_shape_divider_gradient_defs( $shape_top_gradient, $shape_top_gradient_id )
						: '';
					$shape_top_uses_gradient = '' !== $shape_top_gradient_defs;

					$shape_top_html             = sgs_render_shape_divider(
						$shape_top,
						! empty( $attributes['shapeDividerTopFlip'] ),
						! empty( $attributes['shapeDividerTopInvert'] ),
						'top',
						sgs_shape_divider_axis( $shape_top_scale, 'x' ),
						$shape_top_uses_gradient ? $shape_top_gradient_defs : '',
						$shape_top_uses_gradient ? $shape_top_gradient_id : ''
					);
					$shape_divider_decls['top'] = sgs_shape_divider_decls(
						$shape_top_uses_gradient ? '' : sgs_colour_value( $shape_top_colour_raw ),
						sgs_shape_divider_axis( $shape_top_scale, 'y' )
					);
				}

				if ( $shape_bottom ) {
					$shape_bottom_scale = $attributes['shapeDividerBottomScale'] ?? null;

					$shape_bottom_colour_raw    = $attributes['shapeDividerBottomColour'] ?? 'surface';
					$shape_bottom_gradient_raw  = $attributes['shapeDividerBottomColourGradient'] ?? '';
					$shape_bottom_gradient      = sgs_css_gradient_value( $shape_bottom_gradient_raw );
					$shape_bottom_gradient_id   = $shape_bottom_gradient ? sgs_shape_divider_gradient_id() : '';
					$shape_bottom_gradient_defs = $shape_bottom_gradient
						? sgs_render_shape_divider_gradient_defs( $shape_bottom_gradient, $shape_bottom_gradient_id )
						: '';
					$shape_bottom_uses_gradient = '' !== $shape_bottom_gradient_defs;

					$shape_bottom_html             = sgs_render_shape_divider(
						$shape_bottom,
						! empty( $attributes['shapeDividerBottomFlip'] ),
						! empty( $attributes['shapeDividerBottomInvert'] ),
						'bottom',
						sgs_shape_divider_axis( $shape_bottom_scale, 'x' ),
						$shape_bottom_uses_gradient ? $shape_bottom_gradient_defs : '',
						$shape_bottom_uses_gradient ? $shape_bottom_gradient_id : ''
					);
					$shape_divider_decls['bottom'] = sgs_shape_divider_decls(
						$shape_bottom_uses_gradient ? '' : sgs_colour_value( $shape_bottom_colour_raw ),
						sgs_shape_divider_axis( $shape_bottom_scale, 'y' )
					);
				}

				if ( $shape_top || $shape_bottom ) {
					$classes[] = 'sgs-container--has-shape-divider';
				}
			} else {
				$shape_top    = '';
				$shape_bottom = '';
			}

			// ----------------------------------------------------------------
			// Base spacing (padding/margin) — read WP-native style.spacing directly.
			// container/block.json declares __experimentalSkipSerialization on
			// supports.spacing, so WP does NOT auto-inline these into
			// get_block_wrapper_attributes() any more; $attributes['style']['spacing']
			// is still populated (skip-serialization only suppresses the AUTO-INLINE
			// output), so we read it here and emit it as a scoped rule instead. This
			// keeps base padding/margin OUT of the inline style attribute entirely —
			// no !important needed, source order alone lets the existing @media tier
			// rules (below) win at narrower viewports.
			// ----------------------------------------------------------------
			// D555 (2026-08-10) — sgs/container migrated its BASE padding/margin off
			// WP-native `supports.spacing` onto block-owned box-object attrs
			// (`padding`/`margin`, shape { top, right, bottom, left } — same shape as
			// the pre-existing `paddingTablet`/`paddingMobile` legacy siblings read
			// below), because a WP-native support cannot carry a framework default and
			// the block needed one (no horizontal gutter → flush-to-viewport-edge bug).
			// ⛔ ADDITIVE ONLY — 37 other blocks still declare `supports.spacing` and
			// rely on the native `style.spacing.padding`/`margin` read; that path is
			// untouched below. Prefer the owned attr when the block actually declares
			// it (non-empty), else fall back to native.
			// ⚠ `$attributes['padding']` is NOT this shape on every block: the
			// container-query blocks (site-header-row / site-footer-row / gallery,
			// `$container_queries` true) use `padding` as a TIER object
			// `{desktop,tablet,mobile}`, each tier itself a box — a different shape
			// entirely. Gate this read to `! $container_queries` so it can never
			// misread that tier object as a flat box.
			$owned_spacing_padding = array();
			if ( ! $container_queries && isset( $attributes['padding'] ) && is_array( $attributes['padding'] ) ) {
				foreach ( $attributes['padding'] as $spacing_side => $spacing_value ) {
					if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
						$owned_spacing_padding[ $spacing_side ] = $spacing_value;
					}
				}
			}
			$owned_spacing_margin = array();
			if ( ! $container_queries && isset( $attributes['margin'] ) && is_array( $attributes['margin'] ) ) {
				foreach ( $attributes['margin'] as $spacing_side => $spacing_value ) {
					if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
						$owned_spacing_margin[ $spacing_side ] = $spacing_value;
					}
				}
			}

			$base_spacing_padding = $owned_spacing_padding;
			if ( empty( $base_spacing_padding ) && isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
				foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
					if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
						$base_spacing_padding[ $spacing_side ] = $spacing_value;
					}
				}
			}
			$base_spacing_margin = $owned_spacing_margin;
			if ( empty( $base_spacing_margin ) && isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
				foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
					if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
						$base_spacing_margin[ $spacing_side ] = $spacing_value;
					}
				}
			}
			$has_base_spacing = ! empty( $base_spacing_padding ) || ! empty( $base_spacing_margin );

			// Base content-band (Layer 2: __inner) — no-inline deferral (Spec 32, D293).
			// True whenever ANY band-level CSS exists ($has_band_props, defined ~L450)
			// AND no responsive band tiers exist (when tiers DO exist, $has_band_responsive
			// already routes the base rule into the scoped stylesheet via the
			// pre-existing band-responsive branch below — untouched).
			$has_base_band = $has_band_props && ! $has_band_responsive;

			// Base grid/flex real-property scoped rule predicate (Spec 32, D293
			// no-inline contract) — true whenever any base grid/flex real decl
			// exists (display/template/align/wrap/justify from $gd, or base
			// grid-template-rows/grid-auto-rows). A base-only grid with NO
			// responsive tiers (e.g. a split-hero) must still get a uid so the
			// grid doesn't get lost by moving out of inline.
			$has_base_grid = ! empty( $base_grid_real_decls );

			// Base OUTER real-property rule predicate (Spec 32 no-inline contract) —
			// true whenever any base min-height / box-shadow / background-* decl exists
			// with no responsive tier to defer to. Forces a uid so these OUTER box
			// properties get a scoped .$uid home instead of an inline style.
			$has_base_outer = ! empty( $base_outer_decls );

			// ----------------------------------------------------------------
			// Responsive CSS + uid — section + layout kinds with responsive attrs.
			// ----------------------------------------------------------------
			$responsive_css    = '';
			$has_responsive_bg = ( ! empty( $bg_image_tablet['url'] ) || ! empty( $bg_image_mobile['url'] ) ); // D6: universal.
			// A per-tier COLUMN COUNT (columnsTablet/columnsMobile) also needs the
			// responsive block to run — that is where the count is emitted as a scoped
			// per-tier `grid-template-columns` rule at $grid_sel (QB-2 tier-count
			// fallback). Without this the block was skipped entirely and the count
			// never stacked: the removed `sgs-cols-*` classes used to carry this WITHOUT
			// needing the gate, which is exactly why they were reintroduced-as-classes
			// and then silently missed the grid once container queries moved it to the
			// __inner (FR-37-11 / FR-37-35). Gated to grid + a real tier count + not the
			// object-array grid (which drives columns through sgs_emit_responsive_css),
			// so it fires ONLY when there is genuinely a tier count to emit.
			$has_tier_column_count = ( $is_section || $is_layout ) && 'grid' === $layout && ! $object_grid
				&& ( ( $columns_tablet && '' === trim( (string) $grid_template_tablet ) )
					|| ( $columns_mobile && '' === trim( (string) $grid_template_mobile ) ) );
			$has_responsive_attr   = ( $gap_tablet || $gap_mobile || $has_responsive_bg || $has_responsive_min_height
				|| $has_responsive_padding || $has_responsive_margin || $has_band_responsive || $max_width_tablet || $max_width_mobile )
				|| ( ( $is_section || $is_layout ) && ( $grid_template_tablet || $grid_template_mobile || $grid_template_rows_tablet || $grid_template_rows_mobile ) )
				|| $has_tier_column_count;

			// uid also needed whenever an OBJECT-MODEL tier property (Spec 37 FR-37-16)
			// carries a real value — maxWidth / contentWidth / gap / gridTemplateColumns /
			// gridTemplateRows / columns / contentBandPadding, the properties the
			// object-model emission block below (`if ( $uid ) { … }`) actually reads.
			// ⛔ BUG FIX (2026-08-12, D587): none of the flags above cover this case on
			// their own. $has_base_max_width/$has_responsive_attr's gap/max-width legs
			// still read the OLD FLAT sibling variables ($max_width_tablet, $gap_tablet,
			// …), which no longer exist on any migrated block.json — so a block whose
			// ONLY set property is an object-shaped maxWidth/contentWidth/gap never got a
			// uid, and the correctly-written object-model CSS below silently never ran.
			// Proven live: a throwaway test page set `maxWidth:{desktop:"780px"}` on
			// sgs/pricing-table — the value SAVED (this session's separate block.json
			// type-migration fix) but never PAINTED, because $uid stayed ''. $container_queries
			// (below) already forced a uid for whichever blocks happen to opt into it, which is
			// exactly why some blocks "looked" verified already — this check is the honest,
			// property-driven version of that, not gated on a per-block opt-in flag, matching
			// the object-model section's own stated intent a few lines below: "an object-shaped
			// attribute must be emitted by whichever block carries one... universal by data, not
			// by flag." Mirrors $sgs_tier_object_has_value (defined later, ~:2062) inline rather
			// than moved — same precedent as $object_grid above (~:197-210).
			$sgs_needs_uid_object_tier = static function ( $raw ) {
				if ( ! is_array( $raw ) || array() === $raw ) {
					return false;
				}
				$obj = sgs_responsive_normalise_object( $raw );
				foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
					$val = $obj[ $tier ] ?? null;
					if ( null !== $val && '' !== $val && array() !== $val ) {
						return true;
					}
				}
				return false;
			};
			$has_object_tier_value     = $sgs_needs_uid_object_tier( $attributes['maxWidth'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['contentWidth'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['gap'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['gridTemplateColumns'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['gridTemplateRows'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['columns'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['contentBandPadding'] ?? null )
				// Phase 2 fix (2026-09-06): on a block whose `padding`/`margin`
				// has migrated to the tier-of-boxes shape (D555 + the Phase 2
				// box-object migration — e.g. sgs/container, sgs/hero), these
				// were never added here, so a block whose ONLY customisation
				// was padding/margin never minted a uid and the correct
				// tier-object CSS emitted further down (which only runs
				// `if ($uid)`) silently never fired. `$owned_spacing_padding`/
				// `$owned_spacing_margin` above does NOT cover this case either
				// for such a block — it expects `{top,right,bottom,left}` keys
				// and gets `{desktop,tablet,mobile}` instead, so it silently
				// computes empty (it's still load-bearing for blocks that
				// haven't migrated off native `style.spacing`, so it stays).
				// See decisions.md for the D-number.
				|| $sgs_needs_uid_object_tier( $attributes['padding'] ?? null )
				|| $sgs_needs_uid_object_tier( $attributes['margin'] ?? null );

			// uid also needed when parallax/ken-burns is active, bg-video is responsive,
			// base padding/margin needs a scoped (non-inline) home, a base outer
			// max-width needs a scoped home ($has_base_max_width), a base content-band
			// (contentWidth/band-padding/band-background) needs a scoped home
			// ($has_base_band), or a base grid/flex real-property rule needs a scoped
			// home ($has_base_grid) — all added under the no-inline contract (Spec 32,
			// D293) so these OUTER/BAND/GRID box properties never emit inline for a
			// block with no responsive tiers.
			$needs_uid = $has_responsive_attr
				|| $has_object_tier_value
				|| $has_base_spacing
				|| $has_base_max_width
				|| $has_base_band
				|| $has_base_grid
				|| $has_base_outer
				|| $container_queries
				|| '' !== $overlay_decls
				|| ( $bg_parallax || $bg_ken_burns ) // D6: universal.
				|| ( $has_bg_video && ( ! empty( $bg_video_tablet['url'] ) || ! empty( $bg_video_mobile['url'] ) ) ) // D6: universal.
				// An SVG background emits `--sgs-svg-opacity` as a scoped rule on the
				// `.sgs-container__svg-bg` layer (FR-32-4 / D345 — it used to ride inline
				// on that div). Without a uid there is nowhere to scope it, so the SVG
				// background alone must be enough to mint one. Same for a shape
				// divider's height/colour (FR-32-1 — those were inline PROPERTY
				// declarations, the more serious breach).
				|| $has_bg_svg
				// Phase 2 <img> LCP fast path: object-fit/object-position for the
				// real <img> can ONLY ever be a scoped `.$uid > .sgs-container__image-bg`
				// rule (Spec 32 no-inline contract forbids putting them on the tag).
				// Without this clause a MINIMAL container — background image only,
				// nothing else that would otherwise mint a uid — renders the <img>
				// but never gets a uid, so the rule that sets its object-fit/
				// object-position never emits and the browser silently falls back
				// to this stylesheet's `object-fit:cover` / default centred position,
				// discarding whatever the client actually configured.
				|| ! empty( $sgs_bg_img_style_decls )
				// Video background object-fit/object-position — same reasoning
				// as the <img> LCP fast-path clause immediately above: a
				// MINIMAL container with only a background video (nothing else
				// that would otherwise mint a uid) must still get a uid, or the
				// scoped rule that sets its object-fit/object-position never
				// emits and the browser silently falls back to style.css's
				// hardcoded `object-fit:cover` default, discarding whatever
				// the client configured on the Video tab.
				|| ! empty( $sgs_bg_video_style_decls )
				|| ! empty( $shape_divider_decls )
				// D345 Facet B: any remaining custom-property VALUES ($styles — the
				// composite's extra_styles + ken-burns/svg/grid-item vars) also need a
				// scoped .$uid home, because they are no longer emitted inline (Spec 32
				// FR-32-4 as amended). Without a uid there is nowhere to scope them.
				|| ! empty( $styles )
				// D636 border-gradient rollout (residual scope) — a grid-item gradient
				// border is masked ::before CSS, which (like the shape-divider rules
				// above) can only ever be a scoped .$uid rule, never inline.
				|| '' !== $grid_item_border_gradient
				// Step 5a (phase-colour-conformance.md, 2026-08-22) — grid-item
				// background/text-colour hover + gradient. Same reasoning as the
				// border gradient immediately above: the declaration PROPERTY
				// differs between solid and gradient, so it can only ever be a
				// scoped .$uid rule.
				|| '' !== $grid_item_background_hover
				|| '' !== $grid_item_background_gradient
				|| '' !== $grid_item_background_hover_gradient
				|| '' !== $grid_item_text_colour_hover
				|| '' !== $grid_item_text_colour_gradient
				|| '' !== $grid_item_text_colour_hover_gradient;

			$uid = '';
			if ( $needs_uid ) {
				$anchor    = ( $block instanceof \WP_Block ) ? ( $block->parsed_block['attrs']['anchor'] ?? '' ) : '';
				$uid       = 'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . $anchor ), 0, 8 );
				$classes[] = $uid;
			}

			// D345 Facet B: the remaining per-instance custom-property VALUES ($styles —
			// extra_styles passed by the composite + ken-burns/svg/grid-item vars) emit as
			// a scoped `.$uid{…}` rule in the block's <style>, NEVER inline. Inline `--var`
			// is forbidden (Spec 32 FR-32-4 as amended) AND breaks any `[style*="--var"]`
			// presence-selector. The vars are consumed by the block's own style.css rules
			// via var() on the same element regardless of where they are declared; $uid is
			// guaranteed set here whenever $styles is non-empty (see $needs_uid above).
			if ( ! empty( $styles ) && $uid ) {
				$responsive_css .= '.' . $uid . '{' . implode( ';', $styles ) . ';}';
			}

			// FR-32-1 / D345 — shape-divider height + colour, captured as declarations
			// further up (before $uid existed) and scoped here. They were previously
			// inline property declarations on the divider div itself.
			if ( $shape_divider_decls && $uid ) {
				foreach ( $shape_divider_decls as $sd_position => $sd_decls ) {
					$responsive_css .= '.' . $uid . ' .sgs-shape-divider--' . $sd_position . '{' . $sd_decls . '}';
				}
			}

			// D636 border-gradient rollout (residual scope, 2026-08-17) — grid-item
			// border gradient. gridItemBorder stays a plain shorthand STRING
			// (width/style authored as free text); the gradient is a sibling that
			// paints only the colour, via the same masked ::before ring every other
			// block in this rollout uses. Scoped to THIS instance's grid children
			// only (.$uid.sgs-container--grid > .sgs-container) — the base rule in
			// style.css is unscoped/global (border: var(--sgs-gi-border)) and must
			// stay that way for every OTHER container's grid items to keep working.
			if ( '' !== $grid_item_border_gradient && $uid ) {
				$grid_item_border_width = function_exists( 'sgs_grid_border_parts' )
					? sgs_grid_border_parts( $grid_item_border )['width']
					: '';
				$responsive_css        .= sgs_border_gradient_css(
					'.' . $uid . '.sgs-container--grid > .sgs-container',
					$grid_item_border_gradient,
					'' !== $grid_item_border_gradient_hover ? $grid_item_border_gradient_hover : null,
					'' !== $grid_item_border_width ? $grid_item_border_width : '2px'
				);
			}

			// Grid-item background hover/gradient (Step 5a, phase-colour-conformance.
			// md, 2026-08-22). Resting `--sgs-gi-bg` stays the existing GLOBAL
			// custom-property rule in style.css untouched — this only fires when a
			// hover or gradient value is genuinely set, reusing
			// sgs_background_paint_decl(), the SAME helper container's own root
			// background row already calls.
			if ( $uid && ( '' !== $grid_item_background_gradient || '' !== $grid_item_background_hover || '' !== $grid_item_background_hover_gradient ) ) {
				$gi_bg_sel          = '.' . $uid . '.sgs-container--grid > .sgs-container';
				$gi_bg_resting_decl = sgs_background_paint_decl( $grid_item_background, $grid_item_background_gradient );
				if ( '' !== $gi_bg_resting_decl ) {
					$responsive_css .= $gi_bg_sel . '{' . $gi_bg_resting_decl . ';}';
				}
				$gi_bg_hover_decl = sgs_background_paint_decl( $grid_item_background_hover, $grid_item_background_hover_gradient );
				if ( '' !== $gi_bg_hover_decl ) {
					$responsive_css .= sgs_hover_state_rules( $gi_bg_sel, $gi_bg_hover_decl . ';', ':focus-within' );
				}
			}

			// Grid-item text-colour hover/gradient (Step 5a). Text needs
			// background-clip:text for a gradient — a single custom property
			// cannot express that — so this reuses sgs_resolve_text_colour_or_
			// gradient() + sgs_text_colour_decl() + sgs_text_colour_gradient_
			// fallback_rule(), the SAME three helpers container's own root text
			// row already calls.
			if ( $uid && ( '' !== $grid_item_text_colour_gradient || '' !== $grid_item_text_colour_hover || '' !== $grid_item_text_colour_hover_gradient ) ) {
				$gi_text_sel     = '.' . $uid . '.sgs-container--grid > .sgs-container';
				$gi_text_resting = sgs_resolve_text_colour_or_gradient( $grid_item_text_colour, $grid_item_text_colour_gradient );
				if ( '' !== $gi_text_resting ) {
					$gi_text_resting_decl = sgs_text_colour_decl( $gi_text_resting );
					if ( '' !== $gi_text_resting_decl ) {
						$responsive_css .= $gi_text_sel . '{' . $gi_text_resting_decl . ';}';
						$responsive_css .= sgs_text_colour_gradient_fallback_rule( $gi_text_sel, $gi_text_resting );
					}
				}
				$gi_text_hover = sgs_resolve_text_colour_or_gradient( $grid_item_text_colour_hover, $grid_item_text_colour_hover_gradient );
				if ( '' !== $gi_text_hover ) {
					$gi_text_hover_decl = sgs_text_colour_decl( $gi_text_hover );
					if ( '' !== $gi_text_hover_decl ) {
						$responsive_css .= sgs_hover_state_rules( $gi_text_sel, $gi_text_hover_decl . ';', ':focus-within' );
						$responsive_css .= sgs_hover_media_wrap( sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $gi_text_sel . ':hover', $gi_text_hover ) );
					}
				}
			}

			// Grid/flex scoped-CSS selector — the __inner content band when
			// $grid_on_inner (so the outer stays full-bleed), else the outer .$uid.
			// Computed once here (depends only on $grid_on_inner + $uid, both
			// already resolved) and reused by both the base-grid rule immediately
			// below and the responsive grid/gap rules further down.
			$grid_sel = $uid ? ( $grid_on_inner ? ( '.' . $uid . '>.sgs-container__inner' ) : ( '.' . $uid ) ) : '';

			// Base spacing scoped rule — emitted FIRST (before the @media tier rules
			// below) so source order lets a narrower-viewport tier win without needing
			// !important. wp_style_engine_get_styles() produces the same CSS WP's own
			// style engine would have inlined, just scoped to .$uid instead.
			if ( $has_base_spacing && $uid ) {
				$base_spacing_style_args = array();
				if ( ! empty( $base_spacing_padding ) ) {
					$base_spacing_style_args['padding'] = $base_spacing_padding;
				}
				if ( ! empty( $base_spacing_margin ) ) {
					$base_spacing_style_args['margin'] = $base_spacing_margin;
				}
				$base_spacing_styles = wp_style_engine_get_styles(
					array( 'spacing' => $base_spacing_style_args ),
					array( 'selector' => '.' . $uid )
				);
				if ( ! empty( $base_spacing_styles['css'] ) ) {
					$responsive_css .= $base_spacing_styles['css'];
				}
			}

			// Base outer max-width scoped rule (Spec 32, D293 no-inline contract) —
			// emitted whenever a base (non-responsive-tiered) max-width exists, so it
			// never lands inline. Placed BEFORE the responsive max-width @media tiers
			// further below so a narrower-viewport tier still wins on source order —
			// though in practice $has_base_max_width is only ever true when NO
			// responsive tiers exist ($has_responsive_max_width is false), so there is
			// no @media rule for this selector+property to lose to.
			if ( $has_base_max_width && $uid ) {
				$responsive_css .= '.' . $uid . '{max-width:' . $base_max_width_css_value
					. ( $base_max_width_margin_auto ? ';margin-inline:auto' : '' ) . '}';
			}

			// Base OUTER scoped rule (Spec 32 no-inline contract) — min-height /
			// box-shadow / background-* (base tier), emitted on .$uid so nothing lands
			// inline. Placed BEFORE the @media tiers below (source order) so a narrower-
			// viewport tier (responsive min-height / bg override) still wins per viewport.
			if ( $base_outer_decls && $uid ) {
				$responsive_css .= '.' . $uid . '{' . implode( ';', $base_outer_decls ) . '}';
			}

			// HOVER-state outer shadow colour (Rule 31, 2026-08-22) — same shape
			// as the resting rule above, reusing the resting shadow SHAPE with the
			// hover-state colour composed in. Emitted only when a hover colour is
			// actually set, so a block never using the hover state adds no CSS.
			if ( $shadow && $shadow_colour_hover && $uid ) {
				$shadow_hover_value = sgs_shadow_value_composed( $shadow, $shadow_colour_hover );
				if ( '' !== $shadow_hover_value ) {
					$responsive_css .= sgs_hover_state_rules( '.' . $uid, 'box-shadow:' . $shadow_hover_value, ':focus-within' );
				}
			}

			// MEDIA LAYER scoped rule (Phase 1, 2026-08-08) — the background image
			// paints on .{uid}::before, not on .{uid}, so `backgroundMediaOpacity`
			// can dim the media WITHOUT dimming the section's own content. Built
			// further up where $bg_* are in scope; emitted here because $uid and
			// $responsive_css only exist from this point on. Must come BEFORE the
			// @media tier overrides below so a narrower viewport still wins.
			if ( $sgs_media_layer_decls && $uid ) {
				$responsive_css .= '.' . $uid . '::before{' . implode( ';', $sgs_media_layer_decls ) . '}';
			}

			// <img> fast-path object-fit/object-position scoped rule (Phase 2 LCP,
			// built further up alongside $sgs_bg_img_is_simple) — the real <img>
			// sits directly inside .{uid} (see the final-assembly sprintf below),
			// so this targets it as a direct child, matching the ::before media
			// layer's box exactly (same object-fit/object-position semantics as
			// that layer's background-size/background-position).
			if ( $sgs_bg_img_style_decls && $uid ) {
				$responsive_css .= '.' . $uid . ' > .sgs-container__image-bg{' . implode( ';', $sgs_bg_img_style_decls ) . '}';
			}

			// <video> background object-fit/object-position scoped rule — same
			// direct-child selector shape as the <img> fast-path rule above
			// (the video markup sits directly inside .{uid}, see the final-
			// assembly sprintf near the end of render()). Closes the gap
			// where a video background had no per-instance size/position at
			// all (style.css's `.sgs-container__video-bg{object-fit:cover}`
			// stays as the CSS fallback default for the (rare) no-uid case).
			if ( $sgs_bg_video_style_decls && $uid ) {
				$responsive_css .= '.' . $uid . ' > .sgs-container__video-bg{' . implode( ';', $sgs_bg_video_style_decls ) . '}';
			}

			// Overlay paint scoped rule (Spec 32 no-inline contract) — the bg overlay
			// span's background/opacity, emitted on `.{uid} .sgs-container__overlay`
			// instead of inline on the span. $overlay_decls is pre-sanitised
			// (sgs_colour_value + esc_attr on the opacity/angle).
			if ( '' !== $overlay_decls && $uid ) {
				$responsive_css .= '.' . $uid . ' .sgs-container__overlay{' . $overlay_decls . '}';

				// Overlay HOVER state (D6, 2026-08-22) — same shared owner
				// (sgs_overlay_decls()), NOT a hand-rolled second emitter. Opacity
				// and blend mode are deliberately not re-passed here: the base
				// rule above already declared them, and the more specific
				// `:hover`/`:focus-visible` selector only needs to override the
				// properties that actually change — colour/gradient. Gated on the
				// span existing at all (the `'' !== $overlay_decls` outer check):
				// a hover-only value with no resting paint has nothing to select,
				// matching D717/D718's "no colour set means no overlay" rule.
				if ( '' !== $overlay_colour_hover || '' !== $overlay_gradient_hover ) {
					$overlay_hover_paint = sgs_overlay_decls( $overlay_colour_hover, $overlay_gradient_hover );
					if ( '' !== $overlay_hover_paint ) {
						$responsive_css .= sgs_emit_state_colour_css(
							'.' . $uid . ' .sgs-container__overlay',
							array(),
							array( $overlay_hover_paint )
						);
					}
				}

				// Overlay responsive TIERS (D739) — the tier axis is OPACITY, not colour.
				// Project-standard 768/1024 breakpoints (tablet max-width:1023px, mobile
				// max-width:767px). Emitted only when a tier explicitly overrides; an
				// unset tier inherits the desktop rule by ordinary cascade.
				//
				// ONLY the opacity declaration is re-emitted, never the whole paint.
				// Colour, gradient and blend mode are deliberately NOT per-tier, so
				// restating them inside a @media block would create a SECOND owner for
				// the same properties — and the tier rule would then silently outrank a
				// later desktop edit at the same specificity. Two owners for one
				// property is the defect, not the fix.
				if ( null !== $overlay_opacity_tablet && '' !== $overlay_opacity_tablet ) {
					$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-container__overlay{opacity:' . esc_attr( (float) $overlay_opacity_tablet / 100 ) . '}}';
				}
				if ( null !== $overlay_opacity_mobile && '' !== $overlay_opacity_mobile ) {
					$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-container__overlay{opacity:' . esc_attr( (float) $overlay_opacity_mobile / 100 ) . '}}';
				}
			}

			// Base content-band scoped rule (Spec 32, D293 no-inline contract) —
			// emitted whenever base band-level CSS exists (contentWidth / band padding /
			// band background) with NO responsive band tiers. Mirrors exactly the
			// existing $has_band_responsive base-band rule below (same selector, same
			// property set, same pre-sanitised values) — the only difference is this
			// fires when there are no @media tiers to defer to. The __inner assembly
			// further down (the `elseif ( $do_wrap )` branch) now emits a bare <div>
			// for these properties instead of an inline style.
			if ( $has_base_band && $uid ) {
				$base_band_decls = array();
				if ( '' !== $content_width ) {
					$base_band_decls[] = 'max-width:' . $content_width;
					$base_band_decls[] = 'margin-inline:auto';
				}
				if ( '' !== $band_padding_top ) {
					$base_band_decls[] = 'padding-top:' . $band_padding_top;
				}
				if ( '' !== $band_padding_right ) {
					$base_band_decls[] = 'padding-right:' . $band_padding_right;
				}
				if ( '' !== $band_padding_bottom ) {
					$base_band_decls[] = 'padding-bottom:' . $band_padding_bottom;
				}
				if ( '' !== $band_padding_left ) {
					$base_band_decls[] = 'padding-left:' . $band_padding_left;
				}
				// (band background-color emission removed 2026-08-12 — capability retired)
				if ( $base_band_decls ) {
					$responsive_css .= '.' . $uid . '>.sgs-container__inner{' . implode( ';', $base_band_decls ) . '}';
				}
			}

			// Base grid/flex real-property scoped rule (Spec 32, D293 no-inline
			// contract) — emitted whenever base grid/flex decls exist (display,
			// base grid-template-columns/rows when no responsive tiers override
			// them, align-items, justify-items, align-content, flex-wrap,
			// flex-direction, justify-content, grid-auto-rows). Routed to
			// $grid_sel (the __inner band when $grid_on_inner, else the outer
			// .$uid — same convention the responsive grid rules below use).
			// Placed BEFORE the @media grid tiers further down so a narrower-
			// viewport tier still wins on source order. The pre-existing base
			// guards inside $gd / rows / auto-rows (e.g. only emit base
			// grid-template-columns when no tablet/mobile template tiers exist)
			// are unchanged — they were applied when $base_grid_real_decls was
			// built above.
			if ( $base_grid_real_decls && $uid ) {
				$responsive_css .= $grid_sel . '{' . implode( ';', $base_grid_real_decls ) . '}';
			}

			// No-inline contract (Spec 32 FR-32-4/FR-32-4a, this pass 2026-08-01) —
			// $inner_grid_decls carries the L3 gap + --sgs-gi-* custom-property
			// VALUES that used to be inlined onto the __inner band further below.
			// It is populated ONLY when $grid_on_inner is true (see the
			// `if ( $grid_on_inner ) { $inner_grid_decls = ... }` branch above), so
			// $grid_sel already resolves to the correct
			// `.$uid>.sgs-container__inner` selector — the SAME selector +
			// mechanism as $base_grid_real_decls immediately above. Unlike a
			// per-grid-ITEM repeater (social-icons/card-grid, which need
			// `:nth-child()` because N items share one parent), there is exactly
			// ONE `.sgs-container__inner` per container instance, so a single
			// scoped rule is sufficient — no positional selector required.
			if ( $inner_grid_decls && $uid ) {
				$responsive_css .= $grid_sel . '{' . implode( ';', $inner_grid_decls ) . '}';
			}

			// Spec 35 shrink-to-fit BACKSTOP — grid/flex ITEMS default to
			// min-width:auto/min-height:auto, so a child refuses to shrink below
			// its own content's intrinsic size (a long word, a wide image, a
			// table) and forces the grid/flex track wider than the viewport,
			// causing horizontal overflow. The fix is min-width:0/min-height:0
			// on the direct children of the grid/flex container, letting them
			// shrink to fit. Preventive framework hardening (memory
			// blocks-must-shrink-to-fit-container — "backstop, not a
			// substitute"; per-block CSS is still the primary fix where
			// needed). Same $grid_sel as the base grid/flex rule above so it
			// always targets the actual grid/flex element (the __inner band
			// when $grid_on_inner, else the outer .$uid); direct children only
			// (>*) so it never reaches into a nested grid it shouldn't touch.
			// Stack joins this (Task 1) — it is display:flex, so its children carry
			// the exact same min-width:auto/min-height:auto shrink refusal as flex.
			if ( $uid && ( 'grid' === $layout || 'flex' === $layout || 'stack' === $layout ) ) {
				$responsive_css .= $grid_sel . '>*{min-width:0;min-height:0}';
			}

			if ( $has_responsive_attr ) {
				// Grid CSS lives on the __inner band when $grid_on_inner (so the outer
				// stays full-bleed); else on the outer (.uid). $grid_sel (computed
				// once above, right after $uid) selects the element the responsive
				// grid + gap rules target — same selector the base grid rule above
				// already used.

				// Base gap — deferred from inline when tiers exist (see gap above):
				// base rule first, @media tiers after, so source order decides per viewport.
				if ( ( $is_section || $is_layout ) && '' !== $gap && ( $gap_tablet || $gap_mobile ) ) {
					$responsive_css .= $grid_sel . '{gap:' . sgs_container_gap_value( $gap ) . '}';
				}
				if ( $gap_tablet ) {
					$responsive_css .= '@media (max-width:1023px){' . $grid_sel . '{gap:' . sgs_container_gap_value( $gap_tablet ) . '}}';
				}
				if ( $gap_mobile ) {
					$responsive_css .= '@media (max-width:767px){' . $grid_sel . '{gap:' . sgs_container_gap_value( $gap_mobile ) . '}}';
				}

				// Responsive min-height — section kind. Base + variants all emit via
				// the uid selector so source-order + @media decide the winner per
				// viewport (an inline base would override every @media rule). Cascade:
				// base (all) → tablet (≤1023) → mobile (≤767), later wins at narrower.
				if ( $has_responsive_min_height ) {
					if ( '' !== $min_height ) {
						$responsive_css .= '.' . $uid . '{min-height:' . $min_height . '}';
					}
					if ( '' !== $min_height_tablet ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{min-height:' . $min_height_tablet . '}}';
					}
					if ( '' !== $min_height_mobile ) {
						$responsive_css .= '@media (max-width:767px){.' . $uid . '{min-height:' . $min_height_mobile . '}}';
					}
				}

				// Responsive outer max-width — section/layout/content kinds. Mirrors the
				// min-height pattern above: base + @media tiers all on the .$uid selector
				// (base deferred from inline at the width branch) so source-order + @media
				// decide the winner per viewport. Cascade: base → tablet(≤1023) → mobile(≤767).
				if ( $has_responsive_max_width && '' !== $max_width ) {
					$responsive_css .= '.' . $uid . '{max-width:' . $sgs_css_length( $max_width ) . ';margin-inline:auto}';
				}
				if ( '' !== $max_width_tablet ) {
					$responsive_css .= '@media (max-width:1023px){.' . $uid . '{max-width:' . $max_width_tablet . '}}';
				}
				if ( '' !== $max_width_mobile ) {
					$responsive_css .= '@media (max-width:767px){.' . $uid . '{max-width:' . $max_width_mobile . '}}';
				}

				// Responsive padding — all kinds. Base padding is handled by WP's spacing.padding
				// block-support layer (inline style); responsive variants MUST go via @media so
				// they can override the base without being beaten by inline specificity.
				if ( $has_responsive_padding ) {
					// Tablet (≤1023px).
					$tablet_padding_decls = array();
					if ( '' !== $padding_top_tablet ) {
						$tablet_padding_decls[] = 'padding-top:' . $padding_top_tablet;
					}
					if ( '' !== $padding_right_tablet ) {
						$tablet_padding_decls[] = 'padding-right:' . $padding_right_tablet;
					}
					if ( '' !== $padding_bottom_tablet ) {
						$tablet_padding_decls[] = 'padding-bottom:' . $padding_bottom_tablet;
					}
					if ( '' !== $padding_left_tablet ) {
						$tablet_padding_decls[] = 'padding-left:' . $padding_left_tablet;
					}
					if ( $tablet_padding_decls ) {
						// !important: the base padding is WP-native (style engine) and
						// lands INLINE on the wrapper — a plain @media class rule can
						// never beat it. Tiers are viewport-scoped overrides; at ≤767px
						// the mobile rule (same importance, later source) wins.
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{' . implode( ' !important;', $tablet_padding_decls ) . ' !important}}';
					}

					// Mobile (≤767px).
					$mobile_padding_decls = array();
					if ( '' !== $padding_top_mobile ) {
						$mobile_padding_decls[] = 'padding-top:' . $padding_top_mobile;
					}
					if ( '' !== $padding_right_mobile ) {
						$mobile_padding_decls[] = 'padding-right:' . $padding_right_mobile;
					}
					if ( '' !== $padding_bottom_mobile ) {
						$mobile_padding_decls[] = 'padding-bottom:' . $padding_bottom_mobile;
					}
					if ( '' !== $padding_left_mobile ) {
						$mobile_padding_decls[] = 'padding-left:' . $padding_left_mobile;
					}
					if ( $mobile_padding_decls ) {
						$responsive_css .= '@media (max-width:767px){.' . $uid . '{' . implode( ' !important;', $mobile_padding_decls ) . ' !important}}';
					}
				}

				// Responsive margin — all kinds. Same @media pattern as padding.
				if ( $has_responsive_margin ) {
					// Tablet (≤1023px).
					$tablet_margin_decls = array();
					if ( '' !== $margin_top_tablet ) {
						$tablet_margin_decls[] = 'margin-top:' . $margin_top_tablet;
					}
					if ( '' !== $margin_right_tablet ) {
						$tablet_margin_decls[] = 'margin-right:' . $margin_right_tablet;
					}
					if ( '' !== $margin_bottom_tablet ) {
						$tablet_margin_decls[] = 'margin-bottom:' . $margin_bottom_tablet;
					}
					if ( '' !== $margin_left_tablet ) {
						$tablet_margin_decls[] = 'margin-left:' . $margin_left_tablet;
					}
					if ( $tablet_margin_decls ) {
						// !important for the same reason as padding: WP-native base
						// margin is inline on the wrapper.
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{' . implode( ' !important;', $tablet_margin_decls ) . ' !important}}';
					}

					// Mobile (≤767px).
					$mobile_margin_decls = array();
					if ( '' !== $margin_top_mobile ) {
						$mobile_margin_decls[] = 'margin-top:' . $margin_top_mobile;
					}
					if ( '' !== $margin_right_mobile ) {
						$mobile_margin_decls[] = 'margin-right:' . $margin_right_mobile;
					}
					if ( '' !== $margin_bottom_mobile ) {
						$mobile_margin_decls[] = 'margin-bottom:' . $margin_bottom_mobile;
					}
					if ( '' !== $margin_left_mobile ) {
						$mobile_margin_decls[] = 'margin-left:' . $margin_left_mobile;
					}
					if ( $mobile_margin_decls ) {
						$responsive_css .= '@media (max-width:767px){.' . $uid . '{' . implode( ' !important;', $mobile_margin_decls ) . ' !important}}';
					}
				}

				// Responsive bg image overrides — section kind only. These target the
				// SAME ::before media layer as the base tier (Phase 1, 2026-08-08);
				// targeting .$uid here while the base painted ::before would leave the
				// desktop image showing through underneath on tablet/mobile.
				// D6: universal, was section-only (the `if ( true )` wrapper this was
				// left inside of has been removed as dead-conditional cleanup).
				if ( ! empty( $bg_image_tablet['url'] ) ) {
					$responsive_css .= '@media (max-width:1023px){.' . $uid . '::before{background-image:url(' . esc_url( $bg_image_tablet['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
				}
				if ( ! empty( $bg_image_mobile['url'] ) ) {
					$responsive_css .= '@media (max-width:767px){.' . $uid . '::before{background-image:url(' . esc_url( $bg_image_mobile['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
				}

				// QB-2: Responsive gridTemplateColumns — section + layout kinds.
				if ( $is_section || $is_layout ) {
					// Deferred base templates (moved out of the inline style when tiers
					// exist — inline beats @media): base rule first, tiers after.
					if ( isset( $gtc_base ) && ( $grid_template_tablet || $grid_template_mobile ) ) {
						$responsive_css .= $grid_sel . '{grid-template-columns:' . $gtc_base . '}';
					}
					if ( 'grid' === $layout && '' !== trim( (string) $grid_template_rows ) && ( $grid_template_rows_tablet || $grid_template_rows_mobile ) ) {
						$responsive_css .= $grid_sel . '{grid-template-rows:' . sgs_sanitize_grid_template( $grid_template_rows ) . '}';
					}
					if ( '' !== sgs_sanitize_grid_template( $grid_template_tablet ) ) {
						$responsive_css .= '@media (max-width:1023px){' . $grid_sel . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_tablet ) . '}}';
					}
					if ( '' !== sgs_sanitize_grid_template( $grid_template_mobile ) ) {
						$responsive_css .= '@media (max-width:767px){' . $grid_sel . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_mobile ) . '}}';
					}

					// Tier COUNT fallback — replaces the removed `sgs-cols-*` shorthand
					// classes (see the removal note in the class-building section above).
					// Emitted at $grid_sel, so it follows the grid onto
					// `.sgs-container__inner` when $grid_on_inner is true — which the
					// classes could not do, and which is the whole FR-37-11 bug.
					//
					// Guards carried forward VERBATIM from the class logic so behaviour is
					// otherwise unchanged (D228): a tier count is emitted ONLY when that
					// tier has no explicit template, the BASE has no explicit template
					// (a set base governs every wider tier), and the object grid is not
					// driving columns via sgs_emit_responsive_css(). No `!important` — a
					// same-specificity @media rule emitted after the base rule already wins.
					//
					// Order matters and matches the explicit-template block directly above:
					// tablet (max-width:1023px) is emitted BEFORE mobile (max-width:767px),
					// so at =<767px both match and the later mobile rule wins on source order.
					if ( 'grid' === $layout && ! $object_grid && '' === trim( (string) $grid_template ) ) {
						// D456 — under intrinsicColumns each tier's count becomes that
						// tier's CEILING rather than a fixed number, so the collapse
						// between tiers is continuous and content-aware instead of a
						// single-pixel cliff. Measured on the live canary before this
						// change: all three footer rows dropped 3 tracks -> 1 between
						// viewport 768 and 767 while their content needed only 496px
						// of the 767px available (31% spare). A @media rule cannot read
						// content size, so that collapse was structurally incapable of
						// ever being organic.
						if ( $columns_tablet && '' === trim( (string) $grid_template_tablet ) ) {
							$tablet_track    = $intrinsic_columns
								? sgs_intrinsic_columns_track( absint( $columns_tablet ), sgs_container_tier_gap( $attributes, 'tablet' ), sgs_container_tier_min_column_width( $attributes, 'tablet' ) )
								: 'repeat(' . absint( $columns_tablet ) . ',1fr)';
							$responsive_css .= '@media (max-width:1023px){' . $grid_sel . '{grid-template-columns:' . $tablet_track . '}}';
						}
						if ( $columns_mobile && '' === trim( (string) $grid_template_mobile ) ) {
							$mobile_track    = $intrinsic_columns
								? sgs_intrinsic_columns_track( absint( $columns_mobile ), sgs_container_tier_gap( $attributes, 'mobile' ), sgs_container_tier_min_column_width( $attributes, 'mobile' ) )
								: 'repeat(' . absint( $columns_mobile ) . ',1fr)';
							$responsive_css .= '@media (max-width:767px){' . $grid_sel . '{grid-template-columns:' . $mobile_track . '}}';
						}
					}

					// QB-1: Responsive gridTemplateRows — section + layout kinds.
					if ( '' !== sgs_sanitize_grid_template( $grid_template_rows_tablet ) ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-rows:' . sgs_sanitize_grid_template( $grid_template_rows_tablet ) . '}}';
					}
					if ( '' !== sgs_sanitize_grid_template( $grid_template_rows_mobile ) ) {
						$responsive_css .= '@media (max-width:767px){.' . $uid . '{grid-template-rows:' . sgs_sanitize_grid_template( $grid_template_rows_mobile ) . '}}';
					}
				}

				// Content-band (Layer 2: __inner) responsive CSS — section + layout kinds.
				// Band selector: .sgs-container-<uid> > .sgs-container__inner
				// This matches the child div emitted at the __inner guard (line ~980) and
				// correctly scopes the rules to the instance via the uid class prefix.
				if ( $has_band_responsive ) {
					// The band (L2) ALWAYS lives on the __inner element now — __inner is
					// emitted whenever a content band exists (layout-empty OR grid_on_inner),
					// so band-responsive CSS always targets the child combinator.
					$band_sel = '.' . $uid . '>.sgs-container__inner';

					// Base band rule FIRST — when responsive band tiers exist, the base
					// (max-width / margin-inline / padding / background) MUST live in the
					// stylesheet too: an inline base on __inner would override every
					// @media tier (same convention as min-height above). The __inner
					// builder emits a bare <div> (no inline style) in this case.
					$band_base_decls = array();
					if ( '' !== $content_width ) {
						$band_base_decls[] = 'max-width:' . $content_width;
						$band_base_decls[] = 'margin-inline:auto';
					}
					if ( '' !== $band_padding_top ) {
						$band_base_decls[] = 'padding-top:' . $band_padding_top;
					}
					if ( '' !== $band_padding_right ) {
						$band_base_decls[] = 'padding-right:' . $band_padding_right;
					}
					if ( '' !== $band_padding_bottom ) {
						$band_base_decls[] = 'padding-bottom:' . $band_padding_bottom;
					}
					if ( '' !== $band_padding_left ) {
						$band_base_decls[] = 'padding-left:' . $band_padding_left;
					}
					// (band background-color emission removed 2026-08-12 — capability retired)
					if ( $band_base_decls ) {
						$responsive_css .= $band_sel . '{' . implode( ';', $band_base_decls ) . '}';
					}

					// Responsive content-width overrides for the band max-width.
					if ( '' !== $content_width_tablet ) {
						$responsive_css .= '@media (max-width:1023px){' . $band_sel . '{max-width:' . $content_width_tablet . '}}';
					}
					if ( '' !== $content_width_mobile ) {
						$responsive_css .= '@media (max-width:767px){' . $band_sel . '{max-width:' . $content_width_mobile . '}}';
					}

					// Band padding — tablet tier (≤1023px).
					$band_tablet_decls = array();
					if ( '' !== $band_padding_top_tablet ) {
						$band_tablet_decls[] = 'padding-top:' . $band_padding_top_tablet;
					}
					if ( '' !== $band_padding_right_tablet ) {
						$band_tablet_decls[] = 'padding-right:' . $band_padding_right_tablet;
					}
					if ( '' !== $band_padding_bottom_tablet ) {
						$band_tablet_decls[] = 'padding-bottom:' . $band_padding_bottom_tablet;
					}
					if ( '' !== $band_padding_left_tablet ) {
						$band_tablet_decls[] = 'padding-left:' . $band_padding_left_tablet;
					}
					if ( $band_tablet_decls ) {
						$responsive_css .= '@media (max-width:1023px){' . $band_sel . '{' . implode( ';', $band_tablet_decls ) . '}}';
					}

					// Band padding — mobile tier (≤767px).
					$band_mobile_decls = array();
					if ( '' !== $band_padding_top_mobile ) {
						$band_mobile_decls[] = 'padding-top:' . $band_padding_top_mobile;
					}
					if ( '' !== $band_padding_right_mobile ) {
						$band_mobile_decls[] = 'padding-right:' . $band_padding_right_mobile;
					}
					if ( '' !== $band_padding_bottom_mobile ) {
						$band_mobile_decls[] = 'padding-bottom:' . $band_padding_bottom_mobile;
					}
					if ( '' !== $band_padding_left_mobile ) {
						$band_mobile_decls[] = 'padding-left:' . $band_padding_left_mobile;
					}
					if ( $band_mobile_decls ) {
						$responsive_css .= '@media (max-width:767px){' . $band_sel . '{' . implode( ';', $band_mobile_decls ) . '}}';
					}
				}
			}

			// ----------------------------------------------------------------
			// Rebuild wrapper attributes whenever class list has grown
			// (shapes, uid, bg-video, parallax classes).
			// Mirrors container/render.php conditional rebuild at ~line 581.
			// ----------------------------------------------------------------
			if ( $shape_top || $shape_bottom || $uid ) {
				// D345 Facet B: NO inline `style` — the per-instance `--var` VALUES ($styles)
				// emit as a scoped `.$uid{…}` rule in the block's <style> (Facet-B block after
				// $uid). This is the OPERATIVE root call for any composite with a $uid/shape.
				$wrapper_attributes = get_block_wrapper_attributes(
					array_merge( array( 'class' => implode( ' ', $classes ) ), $opt_extra_attrs )
				);
			}

			// ----------------------------------------------------------------
			// SVG background HTML — section kind only.
			// ----------------------------------------------------------------
			$svg_html = '';
			if ( $has_bg_svg ) { // D6: universal, was section-only.
				// Shared wp_kses() allowlist - was an 86-line hand-rolled copy of
				// sgs_allowed_svg_tags(), verified byte-equivalent as parsed data
				// before collapsing (negative-controlled). Behaviour-neutral.
				$allowed_svg_tags = sgs_allowed_svg_tags();

				// FR-32-4 / D345: the opacity custom-property VALUE is scoped to the
				// instance, never inline on the layer div. $uid is guaranteed here —
				// $has_bg_svg is one of the $needs_uid conditions above. style.css
				// consumes it via var(--sgs-svg-opacity, 1) on the same element, so
				// behaviour is identical to the old inline declaration.
				if ( $uid ) {
					$responsive_css .= '.' . $uid . ' .sgs-container__svg-bg{--sgs-svg-opacity:' . esc_attr( $bg_svg_opacity / 100 ) . ';}';
				}

				/*
				 * DrawSVG marker (Spec 38, `draw` effect) — placed HERE, on the
				 * SVG layer, not on the block root.
				 *
				 * `fx-draw.js`'s `collectDrawTargets()` walks the fx element's
				 * OWN descendants for drawable shapes. On the block root that
				 * subtree is the whole section, so it would also collect every
				 * chevron, star and icon glyph rendered by child blocks and
				 * stroke-animate those too. This div's subtree is exactly the
				 * operator's own background SVG and nothing else.
				 *
				 * Same reasoning, and the same placement rule, as the
				 * `data-sgs-fx-track` mark below: only the code that emits an
				 * element knows which element it is, so the mark belongs at the
				 * point of emission rather than in a later scan of the output.
				 *
				 * Emitting `data-sgs-fx` here also stops
				 * `sgs_inject_fx_attributes()` writing a second copy onto the
				 * root (it bails on seeing the attribute anywhere in the block),
				 * so the full parameter set is built here via the shared
				 * `sgs_fx_data_attr_string()` rather than a hand-rolled subset.
				 *
				 * NO COLLISION WITH `bgSvgAnimation` — the two animate different
				 * things and compose. `bgSvgAnimation` (pulse|float|wave) is a
				 * CSS `animation` on THIS DIV, moving its `transform`/`opacity`
				 * as an ambient loop. DrawSVG animates `stroke-dashoffset` on
				 * the `<path>` elements INSIDE it, once, on scroll. Different
				 * element, different property, different trigger; an operator
				 * can legitimately run both, and `providesNatively` (the
				 * subtract-an-effect declaration `sgs/responsive-logo` uses to
				 * suppress `draw`, because its `animationStyle` enum IS
				 * stroke-draw) would be wrong here — it would deny a capability
				 * this block does not otherwise have.
				 */
				$svg_fx_attr = '';
				if ( 'draw' === ( $attributes['fx'] ?? '' )
					&& function_exists( '\\SGS\\Blocks\\sgs_fx_data_attr_string' ) ) {
					$svg_fx_attr = \SGS\Blocks\sgs_fx_data_attr_string( $attributes );
				}

				$svg_html = sprintf(
					'<div class="sgs-container__svg-bg" aria-hidden="true"%s>%s</div>',
					$svg_fx_attr,
					wp_kses( $bg_svg_content, $allowed_svg_tags )
				);
			}

			// SVG position routing.
			$svg_bg_html = ( $has_bg_svg && 'background' === $bg_svg_position ) ? $svg_html : '';
			$svg_fg_html = ( $has_bg_svg && 'foreground' === $bg_svg_position ) ? $svg_html : '';

			// ----------------------------------------------------------------
			// Spec 37 FR-37-16 object-model responsive CSS (opt-in, wrapper-owned).
			// Emitted via the shared sgs_emit_responsive_css() so the composite-mirror
			// + auto-propagation hold (R-31-9). Inner props (gap / grid-template-columns)
			// route to $grid_sel — the __inner, a DESCENDANT of the container-type outer
			// — with @container + @media, so the block adapts to its OWN width when
			// nested narrow. Outer box props (max-width / padding / margin) route to
			// .$uid with @media (an element can't size-@container itself). contentWidth
			// → band max-width on the __inner. Only object-shaped attrs contribute; a
			// flat value never reaches here (the block passes objects only under the flag).
			// ENTRY IS NO LONGER GATED ON THE OPT-IN (Spec 35 pass 1, 2026-08-10).
			// An object-shaped attribute must be emitted by whichever block carries one,
			// not only by the three blocks that happened to set `responsive_model`. Pass 1
			// converts `gap` on 21 blocks; only 3 opt in, and the flat path above blanks an
			// array value via its is_array() guard — so gating this block too would have
			// left ~15 blocks emitting NO gap at all. Universal by data, not by flag.
			//
			// SAFE because nothing here has an effect without object data: the body only
			// BUILDS $obj_inner_props, and the single emission at the end is already
			// guarded `if ( $obj_inner_props && '' !== $grid_sel )`. A block with no
			// object-shaped attr therefore enters, collects nothing and emits nothing.
			// The selector is unchanged either way — $grid_sel (:1284) is `.$uid` unless
			// $grid_on_inner, which is exactly where the FLAT gap path emits (:1439).
			//
			// ⛔ The DOM/containment half stays opt-in DELIBERATELY. `container-type`
			// below, plus $grid_on_inner (:622) and the forced $do_wrap (:2297), relocate
			// grid/flex onto a `__inner` element and make it render. That is a real layout
			// change on blocks that have no such wrapper today, it needs per-block visual
			// verification, and a gap-only pass must not smuggle it in. Moving every block
			// onto the FULL object model is its own phase.
			if ( $uid ) {
				$obj_outer_sel = '.' . $uid;

				// container-type on the OUTER element establishes the query container the
				// __inner reads (Spec 37 FR-37-16 "adapts to its own width when reused narrow").
				// Still opt-in only: it applies CSS containment, which is not behaviour-neutral.
				if ( $container_queries ) {
					$responsive_css .= $obj_outer_sel . '{container-type:inline-size}';
				}

				/**
				 * True when a TIER object actually carries a value on some tier.
				 *
				 * `is_array()` cannot answer this: an UNSET object attr arrives as an
				 * empty PHP array (block.json `"default": {}` → array() → JSON `[]`),
				 * and `is_array( array() )` is TRUE. Measured in the live editor
				 * 2026-08-10 — sgs/site-header-row and sgs/gallery both report
				 * maxWidth: [] / padding: [] / margin: [] when unset.
				 *
				 * Reuses sgs_responsive_normalise_object() rather than inspecting keys
				 * directly, so it stays correct if the tier vocabulary ever changes.
				 *
				 * ⚠ Deliberate residual: a token that RESOLVES to no rule (contentWidth
				 * 'full' → '') still counts as "set" here. That emits margin-inline:auto
				 * on a full-width band, which is inert (full width leaves no space to
				 * share). Gating on the resolved value would mean running each tier
				 * through its transform, which is the emitter-level coupling Bean
				 * declined in favour of the simple fix — recorded, not overlooked.
				 *
				 * @param mixed $raw Stored attribute value, any shape.
				 * @return bool
				 */
				$sgs_tier_object_has_value = static function ( $raw ) {
					if ( ! is_array( $raw ) || array() === $raw ) {
						return false;
					}
					$obj = sgs_responsive_normalise_object( $raw );
					foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
						$val = $obj[ $tier ] ?? null;
						if ( null !== $val && '' !== $val && array() !== $val ) {
							return true;
						}
					}
					return false;
				};

				// ⭐ THE BARE-NUMBER RULE (Bean-ruled 2026-08-10). Every
				// LENGTH-valued entry in this list MUST declare a
				// `unit_default`, or sgs_responsive_format_atom_value()
				// (helpers-responsive.php:419) appends the empty string to a
				// bare number and emits an invalid declaration — `gap:20` —
				// which the browser silently drops. Passes 2-6 add maxWidth and
				// friends here; give each one its unit as it lands.
				//
				// ⚠ A bare number means `px`. It previously meant a WordPress
				// spacing-SCALE SLUG, because the old flat path ran through
				// sgs_css_length_value() (helpers-css-safety.php:73-76), where
				// digits-only → var(--wp--preset--spacing--N). That was a trap:
				// theme.json defines slug 30 as 1rem and slug 20 as 0.5rem, so
				// `20` rendered 8px — nothing like its face value — and slug 16
				// does not exist at all, so sgs/gallery's `"16"` default
				// resolved to nothing and its gap was silently dead. Block
				// defaults that depended on the slug meaning were rewritten to
				// explicit lengths in this same change, so this restores no
				// old behaviour and changes no rendering; it removes an
				// ambiguity. Keep container/edit.js's gapCssValue() in step.
				$obj_inner_props = array();

				/*
				 * BAND (Layer 2) properties get their OWN selector — they must never
				 * ride on $grid_sel.
				 *
				 * $grid_sel (defined ~:1779) is `.uid>.sgs-container__inner` ONLY when
				 * $grid_on_inner is true, which requires the block's own SGS `layout`
				 * attr to be grid/flex. It falls back to the bare `.uid` otherwise. That
				 * is correct for Layer-3 grid/flex properties, and WRONG for a Layer-2
				 * band property, which belongs on the band element whenever one renders —
				 * regardless of layout. Routing band CSS through $grid_sel put the band's
				 * max-width and centring onto the OUTER box of every container that has a
				 * band but no SGS layout attr, which is the common case.
				 *
				 * Three live defects, all one bug, all measured on the canary /shop/:
				 *   1. The outer carried the band's max-width, so a container's BACKGROUND
				 *      was capped at content width instead of filling its own box —
				 *      violating D-1. Title area: 1232px wide inside a 1309px viewport.
				 *   2. The outer carried margin-inline:auto. An auto inline margin on a
				 *      grid item DISABLES stretch (CSS Box Alignment 4.1), so the item
				 *      shrink-to-fits: sgs-site-footer__links rendered 47.98px inside a
				 *      340.909px track. Proven by forcing margin-inline:0 live — it jumped
				 *      to exactly 340.909px, and `justify-self:stretch` had ZERO effect,
				 *      which is the signature of auto margins winning over stretch.
				 *      NOT an empty-content artefact: the same column with the word
				 *      "Links" in it still reached only 111.59px of the 340.909px track.
				 *   3. A stray centring margin on clusters whose contentWidth is 'full'.
				 *
				 * The correct band rule was ALREADY being emitted alongside these, so the
				 * outer pair was a duplicate on the wrong layer, not the only copy —
				 * which is why removing it loses nothing.
				 *
				 * Gate on $opt_wrap_inner rather than $do_wrap (computed later, ~:2766):
				 * a caller that explicitly suppresses the band (hero-split, product-card,
				 * `wrap_inner => false`) has NO band element, so its band CSS must stay on
				 * the outer or it would address a node that does not exist.
				 */
				$obj_band_props = array();

				/*
				 * Which element the band CSS targets must follow whether the band
				 * ELEMENT actually renders — not whether the caller asked for it.
				 *
				 * This mirrors $do_wrap (computed far below, ~:2890) exactly, because
				 * keying on $opt_wrap_inner alone was WRONG in both directions, and a
				 * post-ship council caught both:
				 *
				 *   a) $do_wrap is FORCED true for container-queries-with-grid/flex
				 *      (~:2895) and for fx='horizontal-panel' (~:2920), and NEITHER
				 *      force consults $opt_wrap_inner. So `wrap_inner => false` plus
				 *      either force rendered a band element while band CSS still
				 *      targeted the outer — the original bug, reintroduced on exactly
				 *      that combination.
				 *   b) $has_band_props tests the DESKTOP tier only (~:894), while
				 *      $obj_band_props is populated from an is_array() check across ALL
				 *      tiers. A contentWidth with desktop 'full' but a real tablet or
				 *      mobile value therefore emitted a band rule for an element that
				 *      never rendered — the cap silently doing nothing. Before this
				 *      routing change that case landed on the outer: wrong layer, but
				 *      at least visible. Falling back to the outer when no band renders
				 *      keeps that behaviour rather than trading a visible bug for an
				 *      invisible one.
				 *
				 * Neither path is reachable by any block shipping today (no block
				 * combines wrap_inner with containerQueries or fx — grepped), so this
				 * closes latent landmines, not live regressions. It is cheap to close
				 * now and expensive to diagnose later, when the composite that trips it
				 * will look like the thing at fault.
				 */
				$band_will_render = ( null !== $opt_wrap_inner )
					? (bool) $opt_wrap_inner
					: $has_band_props;
				// Stack joins this (Task 1) — same two-layer forcing reason as the
				// $grid_on_inner container-queries gate above.
				if ( $container_queries && ( 'grid' === $layout || 'flex' === $layout || 'stack' === $layout ) ) {
					$band_will_render = true;
				}
				if ( 'horizontal-panel' === ( $attributes['fx'] ?? '' ) ) {
					$band_will_render = true;
				}
				$band_obj_sel = $uid
					? ( $band_will_render ? '.' . $uid . '>.sgs-container__inner' : '.' . $uid )
					: '';
				if ( isset( $attributes['gap'] ) && is_array( $attributes['gap'] ) ) {
					$obj_inner_props[] = array(
						'value'        => $attributes['gap'],
						'css'          => 'gap',
						'unit_default' => 'px',
					);
				}
				if ( isset( $attributes['gridTemplateColumns'] ) && is_array( $attributes['gridTemplateColumns'] ) ) {
					$obj_inner_props[] = array(
						'value' => $attributes['gridTemplateColumns'],
						'css'   => 'grid-template-columns',
					);
				}
				if ( isset( $attributes['contentWidth'] ) && is_array( $attributes['contentWidth'] ) ) {
					// BAND property (Layer 2) — routed to $band_obj_sel, NOT $grid_sel.
					$obj_band_props[] = array(
						'value'     => $attributes['contentWidth'],
						'css'       => 'max-width',
						// contentWidth tiers are TOKENS (normal/wide/full/literal); resolve
						// each per tier via the SAME resolver the base path uses (L254-270)
						// so 'normal'→var(--wp--style--global--content-size) etc., never a
						// raw invalid `max-width:normal`. 'full'/'' resolve to '' → no rule.
						'transform' => $sgs_resolve_content_width,
					);
				}
				// ------------------------------------------------------------
				// LAYOUT properties — tier-capable (Spec 35 Phase 1.4, 2026-08-10).
				//
				// Bean-directed: "the shared wrapper should be updated to be fully
				// responsive too … that way every block that uses it doesn't need
				// individual fixes that require forking".
				//
				// These six were DESKTOP-ONLY. They are the six with the strongest
				// per-device case in the whole wrapper — `flex-direction` alone
				// (row on desktop, column on mobile) is the commonest responsive
				// need there is — and every one of them previously forced a block
				// wanting a mobile variant to fork its own attribute.
				//
				// WHY THIS IS BEHAVIOUR-PRESERVING, not a rendering change:
				// * Each entry is is_array()-GUARDED, exactly like maxWidth /
				// padding / margin above. A block still storing a plain scalar
				// never reaches here and keeps its existing
				// $base_grid_real_decls path, byte-identical.
				// * A block that DOES store {desktop,tablet,mobile} gets all three
				// tiers automatically — no new branch, no new code.
				// * sgs_responsive_normalise_object() maps a plain scalar to the
				// desktop tier with null tablet/mobile, so even a scalar routed
				// here would emit desktop-only. The guard is belt-and-braces.
				//
				// WHY THERE IS NO PER-PROPERTY EMISSION CODE: sgs_emit_responsive_css()
				// is already generic — it expands each spec to atoms, null-coalesces
				// up the tier cascade, and TIER-DIFFS so a tier emits only where it
				// actually differs from the tier below. Adding property #7 is one
				// array entry, not another branch. That is the whole point: 32
				// hand-written branches is where the dead desktop-height rule hid
				// for months, and this shape cannot grow that failure mode.
				//
				// SELECTOR: $grid_sel — verified, not assumed. All six currently
				// emit via $base_grid_real_decls, which routes to $grid_sel (the
				// __inner band when $grid_on_inner, else the outer .$uid). Same
				// selector the gap / grid-template-columns entries above already use.
				//
				// ⛔ STAGE 2 (named, NOT "out of scope" — STOP-29): the six
				// grid-item properties (gridItemPadding, gridItemBorderRadius,
				// gridItemBackground, gridItemTextColour, gridItemBorder,
				// gridItemShadow) plus `shadow` and `contentBandBackground` are NOT
				// here. They emit as CSS CUSTOM PROPERTIES (`--sgs-gi-*`, see $gi[]
				// around :710) onto a different selector, so they need their own
				// tier plumbing rather than a prop_map row. Deferred deliberately:
				// shipping six with a verified selector beats shipping fourteen with
				// eight guessed ones — a wrong selector is silently dead CSS, which
				// is the exact bug class this session already found twice.
				foreach ( array(
					'alignContent'     => 'align-content',
					'justifyContent'   => 'justify-content',
					'justifyItems'     => 'justify-items',
					'flexDirection'    => 'flex-direction',
					'flexWrap'         => 'flex-wrap',
					'gridAutoRows'     => 'grid-auto-rows',
					// gridTemplateRows (Spec 35 pass 3b, 2026-08-11) — mirrors
					// gridTemplateColumns' object-tier emission at ~:2057 for the
					// row axis. Reuses the SAME grid-template transform already
					// wired for gridAutoRows two lines up (both take a
					// track-list value, not a keyword).
					'gridTemplateRows' => 'grid-template-rows',
				) as $sgs_attr => $sgs_css_prop ) {
					if ( isset( $attributes[ $sgs_attr ] ) && is_array( $attributes[ $sgs_attr ] ) ) {
						$obj_inner_props[] = array(
							'value'     => $attributes[ $sgs_attr ],
							'css'       => $sgs_css_prop,
							// Keyword properties, not lengths — sanitise as a CSS
							// keyword so a tier value can never break its declaration.
							// grid-auto-rows AND grid-template-rows both take a track
							// value (not a bare keyword), so both route through the
							// grid-template sanitiser the base path already applies
							// at :755/:916 — widened for gridTemplateRows (Spec 35
							// pass 3b) from the earlier gridAutoRows-only check.
							'transform' => ( in_array( $sgs_css_prop, array( 'grid-auto-rows', 'grid-template-rows' ), true ) )
								? static function ( $raw ) {
									return sgs_sanitize_grid_template( (string) $raw );
								}
								: static function ( $raw ) {
									return preg_replace( '/[^A-Za-z0-9 _-]/', '', (string) $raw );
								},
						);
					}
				}

				// GRID-ITEM properties — tier-capable (Spec 35 Phase 1.4b, STAGE 2,
				// 2026-08-10). The six --sgs-gi-* custom properties ($gi[], built
				// above at ~:772-794) are NOT "a different selector" as the STAGE 2
				// deferral comment above speculated — VERIFIED by reading both merge
				// branches: when $grid_on_inner, $gi is merged into
				// $inner_grid_decls, which is emitted at exactly $grid_sel (:1380);
				// when not $grid_on_inner, $gi is merged into $styles, which emits
				// as a scoped `.$uid{…}` rule — and $grid_sel already resolves to
				// `.$uid` in that branch (see the $grid_sel definition). Both
				// branches land on $grid_sel. So these six join the SAME
				// $obj_inner_props array and the SAME sgs_emit_responsive_css() call
				// as the six LAYOUT properties above — one selector, one emission.
				//
				// gridItemPadding / gridItemBorderRadius are NOT genuinely per-SIDE
				// box properties for this emitter's purposes, despite being
				// BoxControl-shaped attrs: the consuming CSS (style.css :9-14) reads
				// ONE custom property per box (`--sgs-gi-padding`, `--sgs-gi-radius`)
				// holding a full shorthand string, never four separate
				// `--sgs-gi-padding-{side}` properties. `box => true` would emit
				// four atoms nothing ever reads (dead CSS) and, worse, would be
				// wrong for gridItemBorderRadius specifically: its keys are CORNERS
				// (topLeft/topRight/bottomLeft/bottomRight — sgs_serialise_box_corners())
				// not SIDES (top/right/bottom/left — sgs_responsive_side_order()), so
				// box=>true's per-side atom expansion would read the wrong keys
				// entirely and emit nothing. Both are therefore scalar props (no
				// `box`) whose `transform` serialises a whole tier's box/corner
				// object into the one shorthand string the custom property expects
				// — same two-step sanitisation the legacy path already applies
				// (serialise → sgs_sanitize_grid_template).
				if ( isset( $attributes['gridItemPadding'] ) && is_array( $attributes['gridItemPadding'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemPadding'],
						'css'       => '--sgs-gi-padding',
						'transform' => static function ( $raw ) {
							return sgs_sanitize_grid_template( sgs_serialise_box_sides( is_array( $raw ) ? $raw : array() ) );
						},
					);
				}
				if ( isset( $attributes['gridItemBorderRadius'] ) && is_array( $attributes['gridItemBorderRadius'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemBorderRadius'],
						'css'       => '--sgs-gi-radius',
						'transform' => static function ( $raw ) {
							return sgs_serialise_box_corners( is_array( $raw ) ? $raw : array() );
						},
					);
				}
				if ( isset( $attributes['gridItemBackground'] ) && is_array( $attributes['gridItemBackground'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemBackground'],
						'css'       => '--sgs-gi-bg',
						// sgs_colour_value() self-escapes on every return path (its own
						// docblock + the docblock example at helpers-responsive.php:66) —
						// no extra esc_attr needed, matching every other colour transform
						// in this method.
						'transform' => 'sgs_colour_value',
					);
				}
				if ( isset( $attributes['gridItemTextColour'] ) && is_array( $attributes['gridItemTextColour'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemTextColour'],
						'css'       => '--sgs-gi-color',
						'transform' => 'sgs_colour_value',
					);
				}
				if ( isset( $attributes['gridItemShadow'] ) && is_array( $attributes['gridItemShadow'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemShadow'],
						'css'       => '--sgs-gi-shadow',
						// sgs_shadow_value() self-escapes too (see its own return paths).
						'transform' => 'sgs_shadow_value',
					);
				}
				if ( isset( $attributes['gridItemBorder'] ) && is_array( $attributes['gridItemBorder'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['gridItemBorder'],
						'css'       => '--sgs-gi-border',
						// Same allowlist the legacy path uses at ~:783 (raw CSS border
						// shorthand, e.g. "1px solid #ccc" — not a colour/shadow token,
						// so neither sgs_colour_value() nor sgs_shadow_value() apply).
						'transform' => static function ( $raw ) {
							return trim( preg_replace( '/[^A-Za-z0-9\s%(),.\-#]/', '', (string) $raw ) );
						},
					);
				}

				if ( $obj_inner_props && '' !== $grid_sel ) {
					// `container` adds an @container copy of each tier rule ALONGSIDE the
					// @media one (class-sgs-breakpoints.php:74-81 emits both, never one
					// instead of the other) — so the tiers apply either way. But an
					// @container query can only match inside a query container, and
					// container-type is emitted above only under $container_queries. Passing
					// the flag through means a non-opted block gets the working @media
					// rules without a duplicate set of @container rules that can never
					// match. Dead CSS is not free: it is what the next reader has to
					// explain before they can trust the rest.
					$responsive_css .= sgs_emit_responsive_css( $grid_sel, $obj_inner_props, array( 'container' => $container_queries ) );
				}

				// Band (Layer 2) tier rules — own selector, see the $band_obj_sel note above.
				if ( $obj_band_props && '' !== $band_obj_sel ) {
					$responsive_css .= sgs_emit_responsive_css( $band_obj_sel, $obj_band_props, array( 'container' => $container_queries ) );
				}

				// CENTRING — the second half of a width band, and the flat path's
				// missing twin. A `max-width` alone does NOT centre: the leftover space
				// has to be shared explicitly. EVERY flat-path width rule emits
				// `margin-inline:auto` in the SAME declaration (:1288, :1329, :1441,
				// :1633) — the object path emitted only the max-width, so an
				// object-shaped band rendered flush-left.
				//
				// MEASURED 2026-08-10 on the canary, both directions (D552).
				// OBJECT contentWidth, page 1591: 1200px band, 47.46px of dead space on
				// the right, 0.00px on the left.
				// FLAT contentWidth, homepage: all 5 bands centred, margin-inline
				// resolving to 77.7 / 107.7 / 147.7px each side.
				// Same measurement method, opposite result: that pair is the proof, not
				// the source read alone.
				//
				// Emitted ONCE at base, not per tier: `margin-inline:auto` is a no-op
				// without a width constraint, so a tier carrying no width is unaffected
				// and no tier-coupling machinery is needed (Bean-approved shape,
				// 2026-08-10 — the simple fix over changing the shared emitter).
				//
				// ⚠ is_array() ALONE IS NOT ENOUGH — an UNSET object attr arrives as an
				// empty ARRAY, not an empty object. block.json `"default": {}` becomes
				// PHP array() and serialises to JSON `[]`; measured in the live editor
				// 2026-08-10, sgs/site-header-row reports maxWidth: [] and padding: []
				// for unset values, and sgs/gallery the same. `is_array( array() )` is
				// TRUE, so keying on it alone emitted centring for every opted-in block
				// whether or not a width existed. Harmless in isolation (no width → no
				// leftover space → auto resolves to 0) but it contradicts 57a0d019's
				// rule that an empty value is UNSET, and it would silently start
				// centring if a width ever arrived from another source. So require a
				// REAL tier value.
				// Centring is a BAND property and follows $band_obj_sel, never $grid_sel
				// — see the note at $band_obj_sel. On the outer it silently disabled
				// grid-item stretch (defect 2 there).
				if ( '' !== $band_obj_sel && $sgs_tier_object_has_value( $attributes['contentWidth'] ?? null ) ) {
					$responsive_css .= $band_obj_sel . '{margin-inline:auto}';
				}

				// OUTER shadow — tier-capable (Spec 35 Phase 1.4b, STAGE 2). VERIFIED
				// selector: the legacy `$shadow` scalar path (~:634-637) emits
				// `box-shadow` into $base_outer_decls, which is emitted as a scoped
				// `.$uid{…}` rule (:1250-ish, `$base_outer_decls && $uid`) — the bare
				// outer wrapper, NOT $grid_sel (min-height uses the identical
				// selector, same array). Independent selector from the grid-item
				// properties above, so it is its own sgs_emit_responsive_css() call
				// rather than joining $obj_inner_props.
				if ( isset( $attributes['shadow'] ) && is_array( $attributes['shadow'] ) ) {
					$responsive_css .= sgs_emit_responsive_css(
						'.' . $uid,
						array(
							array(
								'value'     => $attributes['shadow'],
								'css'       => 'box-shadow',
								'transform' => 'sgs_shadow_value',
							),
						),
						array( 'container' => false )
					);
				}

				// Content-band background — tier-capable (Spec 35 Phase 1.4b, STAGE 2).
				// VERIFIED selector: BOTH legacy band-background emission sites
				// (~:1343 base-band, ~:1647 responsive-band) write
				// The tiered band background-color emitter that stood here was
				// REMOVED 2026-08-12 with the rest of the capability — see the
				// retirement note at the top of this method. It was the only
				// consumer of $band_background_is_tiered.

				$obj_outer_props = array();
				if ( isset( $attributes['maxWidth'] ) && is_array( $attributes['maxWidth'] ) ) {
					$obj_outer_props[] = array(
						'value'     => $attributes['maxWidth'],
						'css'       => 'max-width',
						// Per-tier literal lengths — sanitise each exactly like the base
						// path (L276-277) so a tier value can never break its declaration.
						//
						// ⛔ A `unit_default` here would be INERT, not a safety net:
						// sgs_responsive_format_atom_value() returns EARLY when a
						// transform is set (`if ( $transform ) { … return; }`,
						// helpers-responsive.php), so the unit is never consulted. The
						// bare-number rule therefore has to live inside the transform,
						// which is what this closure adds over $sgs_css_length: a bare
						// `800` becomes `800px` (Bean-ruled 2026-08-10 — a bare number
						// means px framework-wide) instead of emitting `max-width:800`,
						// invalid CSS the browser silently drops. Anything already
						// carrying a unit, a %, or a CSS function is passed through to
						// the same sanitiser the flat path uses, so no existing value
						// changes meaning.
						'transform' => static function ( $raw ) use ( $sgs_css_length ) {
							$clean = $sgs_css_length( $raw );
							return is_numeric( $clean ) ? $clean . 'px' : $clean;
						},
					);
				}
				if ( isset( $attributes['padding'] ) && is_array( $attributes['padding'] ) ) {
					$obj_outer_props[] = array(
						'value'        => $attributes['padding'],
						'css'          => 'padding',
						'box'          => true,
						'unit_default' => 'px',
					);
				}
				if ( isset( $attributes['margin'] ) && is_array( $attributes['margin'] ) ) {
					$obj_outer_props[] = array(
						'value'        => $attributes['margin'],
						'css'          => 'margin',
						'box'          => true,
						'unit_default' => 'px',
					);
				}
				if ( $obj_outer_props ) {
					$responsive_css .= sgs_emit_responsive_css( $obj_outer_sel, $obj_outer_props, array( 'container' => false ) );
				}

				// Same centring pairing for the OUTER max-width. The flat path emits
				// both halves together at :1441 —
				// `.uid{max-width:…;margin-inline:auto}` — so an object-shaped outer
				// max-width without this renders flush-left for the same reason the
				// inner band did. Gated on a REAL tier value (not bare is_array — see
				// $sgs_tier_object_has_value above: an unset object attr is an empty
				// ARRAY, and every opted-in block reports maxWidth: [] today), so the
				// flat path is untouched and cannot double-emit.
				if ( $sgs_tier_object_has_value( $attributes['maxWidth'] ?? null ) ) {
					$responsive_css .= $obj_outer_sel . '{margin-inline:auto}';
				}
			}

			// ----------------------------------------------------------------
			// Responsive <style> tag — prepended to output.
			// ----------------------------------------------------------------
			$style_tag = '';
			if ( $responsive_css && $uid ) {
				// NOT esc_html() — the band selector uses the child combinator '>'
				// which esc_html() turns into '&gt;', breaking every band rule.
				// Every value component is pre-sanitised ($sgs_css_length /
				// sgs_colour_value / sgs_sanitize_grid_template / esc_url);
				// wp_strip_all_tags() guards against '</style>' injection.
				$style_tag = sprintf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
			}

			// ----------------------------------------------------------------
			// Content-width inner wrapper (__inner) guard.
			// Default: fires when contentWidth is set AND layout is empty (no grid/flex).
			// Caller can override via $opts['wrap_inner'] => bool.
			// ----------------------------------------------------------------
			$inner_open  = '';
			$inner_close = '';
			// Emit __inner whenever ANY band-level CSS exists (Bean-locked 2026-06-16):
			// content-width, band padding, or band background — NOT only when
			// contentWidth is set and NOT gated by block-kind. $grid_on_inner implies
			// $has_band_props, so the grid case is covered (grid L3 lives on the band
			// element via $inner_grid_decls). A grid with NO band props → $has_band_props
			// false → grid stays full-bleed on the outer, no __inner (trust-bar-style
			// full-bleed grids unchanged). The wrap_inner caller override is byte-
			// identical (hero-split / product-card still depend on it).
			$do_wrap = null !== $opt_wrap_inner ? (bool) $opt_wrap_inner : $has_band_props;
			// Object model (Spec 37 FR-37-16): the __inner must render so the forced
			// $grid_on_inner target (.uid>.sgs-container__inner) exists for the
			// flex/grid + gap rules and the @container queries.
			// Stack joins this (Task 1) — same two-layer forcing reason as the
			// $grid_on_inner container-queries gate above.
			if ( $container_queries && ( 'grid' === $layout || 'flex' === $layout || 'stack' === $layout ) ) {
				$do_wrap = true;
			}

			/*
			 * Spec 38 FR-38-8 — the horizontal-panel effect needs a single child
			 * element it can translate (the "track"). Force the __inner wrapper
			 * so that element is GUARANTEED to exist.
			 *
			 * Why forcing, rather than letting the effect find whatever child
			 * happens to be first: __inner is conditional on band props, so on a
			 * container configured without them there is no inner wrapper and the
			 * effect would silently translate the wrong element. Derivation
			 * without a forcing mechanism is a guess.
			 *
			 * Why here and not in the fx layer: only the wrapper decides whether
			 * __inner renders. The fx layer (includes/fx-attributes.php) does the
			 * MARKING — it stamps data-sgs-fx-track onto this element — so the
			 * two concerns stay split and this file gains no knowledge of the
			 * effect beyond "it needs an inner wrapper".
			 *
			 * Deliberately narrow: gated on one exact attribute value that only
			 * this effect sets, mirroring the $container_queries force directly above.
			 */
			$fx_track_attr = '';
			if ( 'horizontal-panel' === ( $attributes['fx'] ?? '' ) ) {
				$do_wrap = true;

				/*
				 * Mark THIS element as the track, here at the point of emission.
				 *
				 * An earlier attempt marked it afterwards by scanning the rendered
				 * HTML for the first `.sgs-container__inner`. That is a POSITIONAL
				 * GUESS and it picked the wrong element: with nested containers the
				 * first match belongs to a CHILD, so the effect measured a 96px
				 * inner instead of the 1200px panel row, computed a travel distance
				 * of zero, and never pinned at all. Only this function knows which
				 * __inner is its own — so the mark belongs here, not in a later
				 * scan of somebody else's markup.
				 */
				$fx_track_attr = ' data-sgs-fx-track="true"';
			}
			if ( $do_wrap && $has_band_responsive && '' !== $uid ) {
				// Responsive band tiers exist: the base band styles were emitted into
				// the uid stylesheet (band base rule before the @media tiers) — an
				// inline base here would override every @media rule. No-inline
				// contract (Spec 32 FR-32-4/FR-32-4a, this pass 2026-08-01):
				// $inner_grid_decls (base gap + --sgs-gi-* custom properties; the real
				// grid/flex decls — display/template/align/wrap/justify — are scoped
				// separately via $base_grid_real_decls above) is now ALSO emitted as a
				// scoped `.$uid>.sgs-container__inner{…}` rule (see the block right
				// after the $base_grid_real_decls rule above) — so no style attribute
				// is built on this element at all.
				$inner_open  = '<div class="sgs-container__inner"' . $fx_track_attr . '>';
				$inner_close = '</div>';
			} elseif ( $do_wrap ) {
				// No-inline contract (Spec 32 FR-32-4/FR-32-4a, this pass 2026-08-01):
				// base band CSS (max-width / margin-inline / band padding / band
				// background) is NEVER built as an inline style here — whenever
				// $has_band_props is true (the only way any of those values could be
				// non-empty), $has_base_band is also true, which already emitted the
				// equivalent scoped ".uid>.sgs-container__inner{...}" rule above
				// (before $has_responsive_attr). The L3 gap + --sgs-gi-*
				// custom-property decls that used to be inlined here are, likewise,
				// now emitted as a scoped rule at $grid_sel alongside
				// $base_grid_real_decls (see above) — so this branch never needs a
				// style attribute either, matching the $has_band_responsive branch.
				$inner_open  = '<div class="sgs-container__inner"' . $fx_track_attr . '>';
				$inner_close = '</div>';
			}

			// ----------------------------------------------------------------
			// Final assembly — order:
			// shape_top / bg_img / video / overlay / svg_bg / [__inner] content [/__inner] / svg_fg / shape_bottom
			//
			// $bg_img_html sits IMMEDIATELY BEFORE $video_html (Phase 2 LCP fast
			// path, above) so today's z-order is preserved: a background video was
			// already painting above a background image via the ::before layer's
			// z-index, and the two are mutually exclusive per-block anyway
			// ($has_bg_image && ! $has_bg_video gates the <img> path), so placing
			// the image ahead of the video slot keeps that ordering intact for the
			// (currently impossible) case either changes.
			// ----------------------------------------------------------------
			// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- All variables pre-sanitised: $html_tag allowlisted, $wrapper_attributes from get_block_wrapper_attributes(), HTML vars built with esc_*/wp_kses(), $inner_html is caller-rendered blocks, $inner_open/$inner_close built with esc_attr(), $bg_img_html built via sgs_responsive_image()/wp_get_attachment_image() (core-escaped).
			$open_attrs = '' !== $opt_extra_attr_html ? $wrapper_attributes . ' ' . $opt_extra_attr_html : $wrapper_attributes;
			$element    = sprintf(
				'<%1$s %2$s>%3$s%4$s%5$s%6$s%7$s%8$s%9$s%10$s</%1$s>',
				$html_tag,
				$open_attrs,
				$shape_top_html,
				$bg_img_html,
				$video_html,
				$overlay_html,
				$svg_bg_html,
				$inner_open . $inner_html . $inner_close,
				$svg_fg_html,
				$shape_bottom_html
			);
			// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

			return $style_tag . $element;
		}
	}
}
