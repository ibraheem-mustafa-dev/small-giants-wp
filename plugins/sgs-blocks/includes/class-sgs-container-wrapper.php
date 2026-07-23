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

			// FR-S9-6 opt-in: the §S9 header/footer/nav blocks store responsive
			// properties as the {desktop,tablet,mobile} object model and pass this
			// flag so sgs_emit_responsive_css() (called below) owns their responsive
			// CSS. When set, the legacy flat-scalar responsive paths are neutralised
			// (the is_array guards below + the ! $object_model gates further down).
			// Flag ABSENT (every other block) → this feature is inert and the scalar
			// path is byte-identical. This never reorders/mutates $attributes, so the
			// uid md5 is untouched (STOP-NO-KSORT).
			$object_model = ( ( $opts['responsive_model'] ?? '' ) === 'object' );
			// Grid gate: only suppress the legacy columns/grid emission when an OBJECT
			// gridTemplateColumns is actually present. A block that opted in but whose
			// stored instance still carries flat grid attrs (migration pending, D270
			// re-clone) keeps rendering its grid via the legacy path until re-saved —
			// so flipping the flag never breaks an un-migrated instance's columns.
			$object_grid = $object_model && is_array( $attributes['gridTemplateColumns'] ?? null );

			// ----------------------------------------------------------------
			// Extract attributes (mirrors container/render.php exactly).
			// ----------------------------------------------------------------
			// is_array guards: an object-model value here is treated as "not set"
			// (its own default) so the legacy scalar path can't stringify an array.
			// For a flat scalar (every existing block) is_array()===false → the value
			// passes through unchanged → byte-identical. Columns keep their NUMERIC
			// defaults (2/2/1) — absint('') would render repeat(0,1fr)/sgs-cols-0.
			$layout               = $attributes['layout'] ?? '';
			$columns              = $attributes['columns'] ?? 2;
			$columns              = is_array( $columns ) ? 2 : $columns;
			$columns_mobile       = $attributes['columnsMobile'] ?? 1;
			$columns_mobile       = is_array( $columns_mobile ) ? 1 : $columns_mobile;
			$columns_tablet       = $attributes['columnsTablet'] ?? 2;
			$columns_tablet       = is_array( $columns_tablet ) ? 2 : $columns_tablet;
			$grid_template        = $attributes['gridTemplateColumns'] ?? '';
			$grid_template        = is_array( $grid_template ) ? '' : $grid_template;
			$grid_template_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
			$grid_template_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
			$gap                  = $attributes['gap'] ?? '';
			$gap                  = is_array( $gap ) ? '' : $gap;
			$gap_tablet           = $attributes['gapTablet'] ?? '';
			$gap_mobile           = $attributes['gapMobile'] ?? '';

			// Section-only bg attrs.
			if ( $is_section ) {
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
				$overlay_colour         = $attributes['backgroundOverlayColour'] ?? '';
				$overlay_opacity        = $attributes['backgroundOverlayOpacity'] ?? 50;
				$overlay_gradient       = ! empty( $attributes['overlayGradient'] );
				$overlay_gradient_angle = isset( $attributes['overlayGradientAngle'] ) ? absint( $attributes['overlayGradientAngle'] ) : 180;
				$overlay_gradient_from  = $attributes['overlayGradientFrom'] ?? '';
				$overlay_gradient_to    = $attributes['overlayGradientTo'] ?? '';
				$bg_video               = $attributes['bgVideo'] ?? null;
				$bg_video_mobile        = $attributes['bgVideoMobile'] ?? null;
				$bg_parallax            = ! empty( $attributes['bgParallax'] );
				$bg_ken_burns           = ! empty( $attributes['bgKenBurns'] );
				$bg_animation_duration  = isset( $attributes['bgAnimationDuration'] ) ? absint( $attributes['bgAnimationDuration'] ) : 20;
			} else {
				// Zero out section-only vars for layout/content kinds.
				$bg_image               = null;
				$bg_image_tablet        = null;
				$bg_image_mobile        = null;
				$bg_size                = 'cover';
				$bg_position            = 'center center';
				$bg_repeat              = 'no-repeat';
				$bg_attachment          = 'scroll';
				$overlay_colour         = '';
				$overlay_opacity        = 50;
				$overlay_gradient       = false;
				$overlay_gradient_angle = 180;
				$overlay_gradient_from  = '';
				$overlay_gradient_to    = '';
				$bg_video               = null;
				$bg_video_mobile        = null;
				$bg_parallax            = false;
				$bg_ken_burns           = false;
				$bg_animation_duration  = 20;
			}

			$shadow    = $attributes['shadow'] ?? '';
			$max_width = $attributes['maxWidth'] ?? '';
			$max_width = is_array( $max_width ) ? '' : $max_width;
			// Raw read — sanitised via $sgs_css_length after the closure is defined (~line 211).
			$content_width     = $attributes['contentWidth'] ?? '';
			$content_width     = is_array( $content_width ) ? '' : $content_width;
			$min_height        = $attributes['minHeight'] ?? '';
			$min_height_tablet = $attributes['minHeightTablet'] ?? '';
			$min_height_mobile = $attributes['minHeightMobile'] ?? '';
			// WS-A dual-key fallback (2026-06-12): read EITHER align attr name —
			// `verticalAlign` (container/hero/cta/trust-bar) or `alignItems` (grid-
			// mirror blocks: feature-grid/card-grid/gallery). verticalAlign wins when
			// both set (back-compat). Default flipped `start`→'' (D306, 2026-07-11):
			// a blank align falls to the CSS-initial `stretch` (see the guards below),
			// so a cloned grid/flex with NO draft `align-items` renders equal-height
			// columns like the draft (FR-31-5.1 absent→initial). The injected `start`
			// default was the cause of unequal product/gift cards + the brand button
			// not stretching full-width. Blast-radius verified: on page 8 every
			// container relying on the old `start` default wants `stretch`.
			$vertical_align = $attributes['verticalAlign'] ?? $attributes['alignItems'] ?? '';

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
			// Box-object interface contract §2: contentBandPadding/Tablet/Mobile are
			// per-area OBJECT attrs { top, right, bottom, left } (SGS custom attrs, not
			// WP-native style.*). Tablet/mobile stay gated to section+layout kinds — a
			// content-kind composite has no __inner band to apply them to.
			$band_padding_obj    = is_array( $attributes['contentBandPadding'] ?? null ) ? $attributes['contentBandPadding'] : array();
			$band_padding_top    = $sgs_css_length( $band_padding_obj['top'] ?? '' );
			$band_padding_right  = $sgs_css_length( $band_padding_obj['right'] ?? '' );
			$band_padding_bottom = $sgs_css_length( $band_padding_obj['bottom'] ?? '' );
			$band_padding_left   = $sgs_css_length( $band_padding_obj['left'] ?? '' );

			$band_padding_tablet_obj = ( $is_section || $is_layout ) && is_array( $attributes['contentBandPaddingTablet'] ?? null ) ? $attributes['contentBandPaddingTablet'] : array();
			$band_padding_mobile_obj = ( $is_section || $is_layout ) && is_array( $attributes['contentBandPaddingMobile'] ?? null ) ? $attributes['contentBandPaddingMobile'] : array();

			$band_padding_top_tablet    = $sgs_css_length( $band_padding_tablet_obj['top'] ?? '' );
			$band_padding_right_tablet  = $sgs_css_length( $band_padding_tablet_obj['right'] ?? '' );
			$band_padding_bottom_tablet = $sgs_css_length( $band_padding_tablet_obj['bottom'] ?? '' );
			$band_padding_left_tablet   = $sgs_css_length( $band_padding_tablet_obj['left'] ?? '' );

			$band_padding_top_mobile    = $sgs_css_length( $band_padding_mobile_obj['top'] ?? '' );
			$band_padding_right_mobile  = $sgs_css_length( $band_padding_mobile_obj['right'] ?? '' );
			$band_padding_bottom_mobile = $sgs_css_length( $band_padding_mobile_obj['bottom'] ?? '' );
			$band_padding_left_mobile   = $sgs_css_length( $band_padding_mobile_obj['left'] ?? '' );

			// Band background — ALL kinds (Bean-locked 2026-06-16: band-level CSS must
			// survive cloning regardless of block kind; the content-kind carve-out
			// dropped content-band background on content composites). Sanitise via
			// sgs_colour_value (returns a CSS-safe string or empty; reuse the same
			// sanitiser as gridItemBackground).
			$band_background = $attributes['contentBandBackground'] ?? '';

			// Responsive content-width overrides for the band (tablet / mobile).
			// Use the token-or-literal resolver (same as the base) so 'narrow'/'default'/
			// 'full'/literal all resolve correctly at every tier.
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
			$html_tag     = $opt_tag ? $opt_tag : 'section';
			// Full landmark + sectioning + grouping range (D344, 2026-07-16): the
			// ARIA-landmark tags (main/nav/aside/header/footer) + sectioning
			// (article/section) + grouping (div/figure), plus the pre-existing
			// details/fieldset. This is what a generic container needs to carry a
			// semantic tag in every page context (WCAG 2.2 landmark navigation + SEO).
			$allowed_tags = array(
				'section',
				'div',
				'article',
				'aside',
				'main',
				'nav',
				'header',
				'footer',
				'figure',
				'details',
				'fieldset',
			);
			if ( ! in_array( $html_tag, $allowed_tags, true ) ) {
				$html_tag = 'section';
			}

			// WP-native align — breakout control (v0.4: widthMode retired; align replaces
			// widthMode's breakout job per spec §0e). Reads the block's WP 'align' attribute
			// (set by the toolbar via supports.align:['wide','full']); emits alignwide /
			// alignfull class so WP theme styles handle the breakout correctly.
			$align = $attributes['align'] ?? '';

			// Grid item defaults (SB-1) — section + layout kinds only.
			$grid_item_padding       = $attributes['gridItemPadding'] ?? '';
			$grid_item_background    = $attributes['gridItemBackground'] ?? '';
			$grid_item_border_radius = $attributes['gridItemBorderRadius'] ?? '';
			$grid_item_border        = $attributes['gridItemBorder'] ?? '';
			$grid_item_shadow        = $attributes['gridItemShadow'] ?? '';
			$grid_item_text_colour   = $attributes['gridItemTextColour'] ?? '';

			// QB-1 advanced grid attrs (section + layout kinds only).
			$grid_template_rows        = $attributes['gridTemplateRows'] ?? '';
			$grid_template_rows_tablet = $attributes['gridTemplateRowsTablet'] ?? '';
			$grid_template_rows_mobile = $attributes['gridTemplateRowsMobile'] ?? '';
			$grid_auto_rows            = $attributes['gridAutoRows'] ?? '';
			$justify_items             = $attributes['justifyItems'] ?? 'stretch';
			$align_content             = $attributes['alignContent'] ?? 'stretch';
			$allowed_justify_items     = array( 'stretch', 'start', 'center', 'end' );
			$allowed_align_content     = array( 'stretch', 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly' );
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
			if ( ! in_array( $flex_wrap, $allowed_flex_wrap, true ) ) {
				$flex_wrap = '';
			}

			// SVG background attrs (section kind only).
			if ( $is_section ) {
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
			} else {
				$bg_svg_content     = '';
				$bg_svg_position    = 'background';
				$bg_svg_animation   = 'none';
				$bg_svg_speed       = 'medium';
				$bg_svg_opacity     = 100;
				$bg_svg_min_height  = '';
				$bg_svg_text_shadow = false;
				$has_bg_svg         = false;
			}

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
				'' !== $band_padding_left ||
				'' !== $band_background
			);

			$grid_on_inner = ( ( 'grid' === $layout || 'flex' === $layout ) && $has_band_props && null === $opt_wrap_inner );
			// Object model (FR-S9-6): force the two-layer structure so the flex/grid
			// container (where gap applies) is the __inner — a DESCENDANT of the
			// container-type outer — so @container queries can respond to the block's
			// own width (an element cannot size-query itself). Paired with the $do_wrap
			// force further down so the __inner element actually renders.
			if ( $object_model && ( 'grid' === $layout || 'flex' === $layout ) ) {
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
				$base_outer_decls[] = 'box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow ) . ')';
			}

			// Background image — section kind only. The base tier scopes to .$uid;
			// the responsive tablet/mobile overrides emit as @media rules further below.
			if ( $is_section && $has_bg_image && ! $has_bg_video ) {
				$base_outer_decls[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
				$base_outer_decls[] = 'background-size:' . esc_attr( $bg_size );
				$base_outer_decls[] = 'background-position:' . esc_attr( $bg_position );
				$base_outer_decls[] = 'background-repeat:' . esc_attr( $bg_repeat );
				if ( 'fixed' === $bg_attachment ) {
					$base_outer_decls[] = 'background-attachment:fixed';
				}
			}

			// Ken-burns duration.
			if ( $is_section && $bg_ken_burns && $has_bg_image ) {
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
					$gtc_base = '' !== trim( (string) $grid_template )
						? sgs_sanitize_grid_template( $grid_template )
						: 'repeat(' . absint( $columns ) . ',1fr)';
					// Object model owns grid-template-columns via sgs_emit_responsive_css();
					// suppress the legacy columns/base fallback under $object_model so the
					// two don't both emit (the columns default would win as repeat(2,1fr)).
					if ( ! ( $grid_template_tablet || $grid_template_mobile ) && ! $object_grid ) {
						$gd[] = 'grid-template-columns:' . $gtc_base;
					}
					// D288: only impose align-items when a value is set — a blank
					// verticalAlign falls back to the browser default (stretch), so
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
				} elseif ( 'flex' === $layout ) {
					$gd[] = 'display:flex';
					$gd[] = 'flex-wrap:' . esc_attr( '' !== $flex_wrap ? $flex_wrap : 'wrap' );
					// D288: blank verticalAlign → browser default (see grid branch above).
					if ( '' !== $vertical_align ) {
						$gd[] = 'align-items:' . esc_attr( $vertical_align );
					}
					if ( '' !== $flex_direction ) {
						$gd[] = 'flex-direction:' . esc_attr( $flex_direction );
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
			if ( $is_section && $has_bg_svg && ! empty( $bg_svg_min_height ) ) {
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
					$gi[] = '--sgs-gi-shadow:var(--wp--preset--shadow--' . esc_attr( $grid_item_shadow ) . ')';
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

			if ( '' !== $layout ) {
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
			// (verticalAlign === 'center'). A min-height section with default/start/
			// stretch alignment must NOT be force-centred: doing so overrides grid
			// stretch / top alignment (e.g. a hero grid whose columns should fill the
			// row, not float vertically). MF-B, Method-2 converter-lift 2026-06-04.
			if ( $is_section && ! empty( $min_height ) && 'center' === $vertical_align ) {
				$classes[] = 'sgs-container--has-min-height';
			}

			// Background mode classes — section kind only.
			if ( $is_section ) {
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
			if ( $is_section && $has_bg_video ) {
				$desktop_src = esc_url( $bg_video['url'] );
				$mobile_src  = ! empty( $bg_video_mobile['url'] ) ? esc_url( $bg_video_mobile['url'] ) : $desktop_src;

				if ( $desktop_src === $mobile_src ) {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg" autoplay loop muted playsinline preload="none" aria-hidden="true">' .
						'<source src="%s" type="video/mp4"></video>',
						$desktop_src
					);
				} else {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg sgs-container__video-bg--responsive" autoplay loop muted playsinline preload="none" aria-hidden="true"' .
						' data-src-desktop="%s" data-src-mobile="%s">' .
						'<source src="%s" type="video/mp4"></video>',
						esc_attr( $desktop_src ),
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
			if ( $is_section && ! $opt_no_overlay ) {
				$has_any_bg         = $has_bg_image || $has_bg_video;
				$has_overlay_colour = $overlay_colour || ( $overlay_gradient && $overlay_gradient_from );

				if ( $has_any_bg && $has_overlay_colour ) {
					if ( $overlay_gradient && $overlay_gradient_from ) {
						$grad_from     = sgs_colour_value( $overlay_gradient_from );
						$grad_to       = $overlay_gradient_to ? sgs_colour_value( $overlay_gradient_to ) : 'transparent';
						$overlay_decls = sprintf(
							'background-image:linear-gradient(%ddeg,%s,%s);opacity:%s',
							$overlay_gradient_angle,
							$grad_from,
							$grad_to,
							esc_attr( $overlay_opacity / 100 )
						);
					} else {
						$overlay_decls = sprintf(
							'background-color:%s;opacity:%s',
							sgs_colour_value( $overlay_colour ),
							esc_attr( $overlay_opacity / 100 )
						);
					}
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

			if ( $is_section ) {
				$shape_top    = $attributes['shapeDividerTop'] ?? '';
				$shape_bottom = $attributes['shapeDividerBottom'] ?? '';

				if ( $shape_top ) {
					$shape_top_html = sgs_render_shape_divider(
						$shape_top,
						sgs_colour_value( $attributes['shapeDividerTopColour'] ?? 'surface' ),
						(int) ( $attributes['shapeDividerTopHeight'] ?? 60 ),
						! empty( $attributes['shapeDividerTopFlip'] ),
						! empty( $attributes['shapeDividerTopInvert'] ),
						'top'
					);
				}

				if ( $shape_bottom ) {
					$shape_bottom_html = sgs_render_shape_divider(
						$shape_bottom,
						sgs_colour_value( $attributes['shapeDividerBottomColour'] ?? 'surface' ),
						(int) ( $attributes['shapeDividerBottomHeight'] ?? 60 ),
						! empty( $attributes['shapeDividerBottomFlip'] ),
						! empty( $attributes['shapeDividerBottomInvert'] ),
						'bottom'
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
			$base_spacing_padding = array();
			if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
				foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
					if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
						$base_spacing_padding[ $spacing_side ] = $spacing_value;
					}
				}
			}
			$base_spacing_margin = array();
			if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
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
			$responsive_css      = '';
			$has_responsive_bg   = $is_section && ( ! empty( $bg_image_tablet['url'] ) || ! empty( $bg_image_mobile['url'] ) );
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
			$has_responsive_attr = ( $gap_tablet || $gap_mobile || $has_responsive_bg || $has_responsive_min_height
				|| $has_responsive_padding || $has_responsive_margin || $has_band_responsive || $max_width_tablet || $max_width_mobile )
				|| ( ( $is_section || $is_layout ) && ( $grid_template_tablet || $grid_template_mobile || $grid_template_rows_tablet || $grid_template_rows_mobile ) )
				|| $has_tier_column_count;

			// uid also needed when parallax/ken-burns is active, bg-video is responsive,
			// base padding/margin needs a scoped (non-inline) home, a base outer
			// max-width needs a scoped home ($has_base_max_width), a base content-band
			// (contentWidth/band-padding/band-background) needs a scoped home
			// ($has_base_band), or a base grid/flex real-property rule needs a scoped
			// home ($has_base_grid) — all added under the no-inline contract (Spec 32,
			// D293) so these OUTER/BAND/GRID box properties never emit inline for a
			// block with no responsive tiers.
			$needs_uid = $has_responsive_attr
				|| $has_base_spacing
				|| $has_base_max_width
				|| $has_base_band
				|| $has_base_grid
				|| $has_base_outer
				|| $object_model
				|| '' !== $overlay_decls
				|| ( $is_section && ( $bg_parallax || $bg_ken_burns ) )
				|| ( $is_section && $has_bg_video && ! empty( $bg_video_mobile['url'] ) )
				// D345 Facet B: any remaining custom-property VALUES ($styles — the
				// composite's extra_styles + ken-burns/svg/grid-item vars) also need a
				// scoped .$uid home, because they are no longer emitted inline (Spec 32
				// FR-32-4 as amended). Without a uid there is nowhere to scope them.
				|| ! empty( $styles );

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
			if ( $has_base_spacing && $uid && function_exists( 'wp_style_engine_get_styles' ) ) {
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

			// Overlay paint scoped rule (Spec 32 no-inline contract) — the bg overlay
			// span's background/opacity, emitted on `.{uid} .sgs-container__overlay`
			// instead of inline on the span. $overlay_decls is pre-sanitised
			// (sgs_colour_value + esc_attr on the opacity/angle).
			if ( '' !== $overlay_decls && $uid ) {
				$responsive_css .= '.' . $uid . ' .sgs-container__overlay{' . $overlay_decls . '}';
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
				if ( '' !== $band_background ) {
					$base_band_decls[] = 'background-color:' . sgs_colour_value( $band_background );
				}
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
			if ( $uid && ( 'grid' === $layout || 'flex' === $layout ) ) {
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

				// Responsive bg image overrides — section kind only.
				if ( $is_section ) {
					if ( ! empty( $bg_image_tablet['url'] ) ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_tablet['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
					}
					if ( ! empty( $bg_image_mobile['url'] ) ) {
						$responsive_css .= '@media (max-width:767px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_mobile['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
					}
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
						if ( $columns_tablet && '' === trim( (string) $grid_template_tablet ) ) {
							$responsive_css .= '@media (max-width:1023px){' . $grid_sel . '{grid-template-columns:repeat(' . absint( $columns_tablet ) . ',1fr)}}';
						}
						if ( $columns_mobile && '' === trim( (string) $grid_template_mobile ) ) {
							$responsive_css .= '@media (max-width:767px){' . $grid_sel . '{grid-template-columns:repeat(' . absint( $columns_mobile ) . ',1fr)}}';
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
					if ( '' !== $band_background ) {
						$band_base_decls[] = 'background-color:' . sgs_colour_value( $band_background );
					}
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
			if ( $is_section && $has_bg_svg ) {
				$allowed_svg_tags = array(
					'svg'      => array(
						'xmlns'               => true,
						'viewbox'             => true,
						'width'               => true,
						'height'              => true,
						'preserveaspectratio' => true,
						'class'               => true,
						'id'                  => true,
					),
					'g'        => array(
						'transform' => true,
						'class'     => true,
						'id'        => true,
					),
					'path'     => array(
						'd'            => true,
						'fill'         => true,
						'stroke'       => true,
						'stroke-width' => true,
						'class'        => true,
					),
					'circle'   => array(
						'cx'     => true,
						'cy'     => true,
						'r'      => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'rect'     => array(
						'x'      => true,
						'y'      => true,
						'width'  => true,
						'height' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'polygon'  => array(
						'points' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'polyline' => array(
						'points' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'line'     => array(
						'x1'     => true,
						'y1'     => true,
						'x2'     => true,
						'y2'     => true,
						'stroke' => true,
						'class'  => true,
					),
					'ellipse'  => array(
						'cx'     => true,
						'cy'     => true,
						'rx'     => true,
						'ry'     => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'text'     => array(
						'x'           => true,
						'y'           => true,
						'fill'        => true,
						'font-size'   => true,
						'font-family' => true,
						'class'       => true,
					),
					'defs'     => array(),
					'style'    => array( 'type' => true ),
					'animate'  => array(
						'attributename' => true,
						'from'          => true,
						'to'            => true,
						'dur'           => true,
						'repeatcount'   => true,
					),
				);

				$svg_html = sprintf(
					'<div class="sgs-container__svg-bg" style="--sgs-svg-opacity:%s;" aria-hidden="true">%s</div>',
					esc_attr( $bg_svg_opacity / 100 ),
					wp_kses( $bg_svg_content, $allowed_svg_tags )
				);
			}

			// SVG position routing.
			$svg_bg_html = ( $has_bg_svg && 'background' === $bg_svg_position ) ? $svg_html : '';
			$svg_fg_html = ( $has_bg_svg && 'foreground' === $bg_svg_position ) ? $svg_html : '';

			// ----------------------------------------------------------------
			// FR-S9-6 object-model responsive CSS (opt-in, wrapper-owned).
			// Emitted via the shared sgs_emit_responsive_css() so the composite-mirror
			// + auto-propagation hold (R-31-9). Inner props (gap / grid-template-columns)
			// route to $grid_sel — the __inner, a DESCENDANT of the container-type outer
			// — with @container + @media, so the block adapts to its OWN width when
			// nested narrow. Outer box props (max-width / padding / margin) route to
			// .$uid with @media (an element can't size-@container itself). contentWidth
			// → band max-width on the __inner. Only object-shaped attrs contribute; a
			// flat value never reaches here (the block passes objects only under the flag).
			if ( $object_model && $uid ) {
				$obj_outer_sel = '.' . $uid;

				// container-type on the OUTER element establishes the query container the
				// __inner reads (FR-S9-6 "adapts to its own width when reused narrow").
				$responsive_css .= $obj_outer_sel . '{container-type:inline-size}';

				$obj_inner_props = array();
				if ( isset( $attributes['gap'] ) && is_array( $attributes['gap'] ) ) {
					$obj_inner_props[] = array(
						'value' => $attributes['gap'],
						'css'   => 'gap',
					);
				}
				if ( isset( $attributes['gridTemplateColumns'] ) && is_array( $attributes['gridTemplateColumns'] ) ) {
					$obj_inner_props[] = array(
						'value' => $attributes['gridTemplateColumns'],
						'css'   => 'grid-template-columns',
					);
				}
				if ( isset( $attributes['contentWidth'] ) && is_array( $attributes['contentWidth'] ) ) {
					$obj_inner_props[] = array(
						'value'     => $attributes['contentWidth'],
						'css'       => 'max-width',
						// contentWidth tiers are TOKENS (normal/wide/full/literal); resolve
						// each per tier via the SAME resolver the base path uses (L254-270)
						// so 'normal'→var(--wp--style--global--content-size) etc., never a
						// raw invalid `max-width:normal`. 'full'/'' resolve to '' → no rule.
						'transform' => $sgs_resolve_content_width,
					);
				}
				if ( $obj_inner_props && '' !== $grid_sel ) {
					$responsive_css .= sgs_emit_responsive_css( $grid_sel, $obj_inner_props, array( 'container' => true ) );
				}

				$obj_outer_props = array();
				if ( isset( $attributes['maxWidth'] ) && is_array( $attributes['maxWidth'] ) ) {
					$obj_outer_props[] = array(
						'value'     => $attributes['maxWidth'],
						'css'       => 'max-width',
						// Per-tier literal lengths — sanitise each exactly like the base
						// path (L276-277) so a tier value can never break its declaration.
						'transform' => $sgs_css_length,
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
			// Object model (FR-S9-6): the __inner must render so the forced
			// $grid_on_inner target (.uid>.sgs-container__inner) exists for the
			// flex/grid + gap rules and the @container queries.
			if ( $object_model && ( 'grid' === $layout || 'flex' === $layout ) ) {
				$do_wrap = true;
			}
			if ( $do_wrap && $has_band_responsive && '' !== $uid ) {
				// Responsive band tiers exist: the base band styles were emitted into
				// the uid stylesheet (band base rule before the @media tiers) — an
				// inline base here would override every @media rule. No-inline
				// contract (Spec 32, D293): $inner_grid_decls now only ever carries
				// base gap + --sgs-gi-* custom properties (the real grid/flex decls —
				// display/template/align/wrap/justify — are scoped separately via
				// $base_grid_real_decls above), so what remains here is inline-safe.
				$io_style    = ( $grid_on_inner && $inner_grid_decls )
					? ' style="' . esc_attr( implode( ';', $inner_grid_decls ) ) . '"'
					: '';
				$inner_open  = '<div class="sgs-container__inner"' . $io_style . '>';
				$inner_close = '</div>';
			} elseif ( $do_wrap ) {
				// No-inline contract (Spec 32, D293): base band CSS (max-width /
				// margin-inline / band padding / band background) is NEVER built as an
				// inline style here any more — whenever $has_band_props is true (the
				// only way any of those values could be non-empty), $has_base_band is
				// also true, which already emitted the equivalent scoped
				// ".uid>.sgs-container__inner{...}" rule above (before $has_responsive_attr).
				// This branch now only carries the L3 gap + --sgs-gi-* custom-property
				// decls (inline-safe — the real grid/flex properties are scoped via
				// $base_grid_real_decls above), matching the bare-<div> convention
				// already used by the $has_band_responsive branch above it.
				$inner_style_parts = array();

				// L3 gap + --sgs-gi-* decls live on the __inner band when this is a
				// grid/flex container (FR-22-21); the real grid/flex properties
				// (display/template/align/wrap/justify) are scoped separately.
				if ( $grid_on_inner && $inner_grid_decls ) {
					$inner_style_parts = array_merge( $inner_style_parts, $inner_grid_decls );
				}

				// Matches the $io_style conditional pattern used by the $has_band_responsive
				// branch above: omit the style attribute entirely when there are no grid
				// decls, rather than emitting a vacuous style="" (band props no longer
				// land here — they are in the scoped .uid>.sgs-container__inner rule).
				$io_style    = $inner_style_parts ? ' style="' . esc_attr( implode( ';', $inner_style_parts ) ) . '"' : '';
				$inner_open  = '<div class="sgs-container__inner"' . $io_style . '>';
				$inner_close = '</div>';
			}

			// ----------------------------------------------------------------
			// Final assembly — order mirrors container/render.php printf exactly:
			// shape_top / video / overlay / svg_bg / [__inner] content [/__inner] / svg_fg / shape_bottom
			// ----------------------------------------------------------------
			// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- All variables pre-sanitised: $html_tag allowlisted, $wrapper_attributes from get_block_wrapper_attributes(), HTML vars built with esc_*/wp_kses(), $inner_html is caller-rendered blocks, $inner_open/$inner_close built with esc_attr().
			$open_attrs = '' !== $opt_extra_attr_html ? $wrapper_attributes . ' ' . $opt_extra_attr_html : $wrapper_attributes;
			$element    = sprintf(
				'<%1$s %2$s>%3$s%4$s%5$s%6$s%7$s%8$s%9$s</%1$s>',
				$html_tag,
				$open_attrs,
				$shape_top_html,
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
