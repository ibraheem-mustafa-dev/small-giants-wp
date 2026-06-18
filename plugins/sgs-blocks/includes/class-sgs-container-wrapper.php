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
		 *                                    'tag'           => string  HTML tag (default: from htmlTag attr or 'section').
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

			// ----------------------------------------------------------------
			// Extract attributes (mirrors container/render.php exactly).
			// ----------------------------------------------------------------
			$layout               = $attributes['layout'] ?? '';
			$columns              = $attributes['columns'] ?? 2;
			$columns_mobile       = $attributes['columnsMobile'] ?? 1;
			$columns_tablet       = $attributes['columnsTablet'] ?? 2;
			$grid_template        = $attributes['gridTemplateColumns'] ?? '';
			$grid_template_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
			$grid_template_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
			$gap                  = $attributes['gap'] ?? '';
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
			// Raw read — sanitised via $sgs_css_length after the closure is defined (~line 211).
			$content_width     = $attributes['contentWidth'] ?? '';
			$min_height        = $attributes['minHeight'] ?? '';
			$min_height_tablet = $attributes['minHeightTablet'] ?? '';
			$min_height_mobile = $attributes['minHeightMobile'] ?? '';
			// WS-A dual-key fallback (2026-06-12): read EITHER align attr name —
			// `verticalAlign` (container/hero/cta/trust-bar) or `alignItems` (grid-
			// mirror blocks: feature-grid/card-grid/gallery). verticalAlign wins when
			// both set (back-compat); default stays `start` (NOT flipped). Universal
			// bridge that paints a block's emitted align value, fixing IN-C without an
			// 8-block rename or client re-save.
			$vertical_align = $attributes['verticalAlign'] ?? $attributes['alignItems'] ?? 'start';

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
			$max_width_tablet  = $sgs_css_length( $attributes['maxWidthTablet'] ?? '' );
			$max_width_mobile  = $sgs_css_length( $attributes['maxWidthMobile'] ?? '' );
			// When responsive outer max-width tiers exist, the base maxWidth must NOT be
			// emitted inline (inline beats class-based @media). It is deferred to a .uid
			// stylesheet rule in the responsive block so the cascade decides per viewport.
			$has_responsive_max_width = ( '' !== $max_width_tablet || '' !== $max_width_mobile );
			$min_height        = $sgs_css_length( $min_height );
			$min_height_tablet = $is_section ? $sgs_css_length( $min_height_tablet ) : '';
			$min_height_mobile = $is_section ? $sgs_css_length( $min_height_mobile ) : '';
			// True when a responsive variant exists → base + variants render via the
			// per-instance uid CSS below (so @media overrides win over the cascade),
			// rather than the inline base (which would beat any .uid{} @media rule).
			$has_responsive_min_height = $is_section && ( '' !== $min_height_tablet || '' !== $min_height_mobile );

			// Responsive padding — all kinds (WP spacing.padding sets base via the block-supports
			// layer; responsive variants land as @media rules scoped to the uid selector).
			$padding_top_tablet    = $sgs_css_length( $attributes['paddingTopTablet'] ?? '' );
			$padding_right_tablet  = $sgs_css_length( $attributes['paddingRightTablet'] ?? '' );
			$padding_bottom_tablet = $sgs_css_length( $attributes['paddingBottomTablet'] ?? '' );
			$padding_left_tablet   = $sgs_css_length( $attributes['paddingLeftTablet'] ?? '' );
			$padding_top_mobile    = $sgs_css_length( $attributes['paddingTopMobile'] ?? '' );
			$padding_right_mobile  = $sgs_css_length( $attributes['paddingRightMobile'] ?? '' );
			$padding_bottom_mobile = $sgs_css_length( $attributes['paddingBottomMobile'] ?? '' );
			$padding_left_mobile   = $sgs_css_length( $attributes['paddingLeftMobile'] ?? '' );

			// Responsive margin — all kinds.
			$margin_top_tablet    = $sgs_css_length( $attributes['marginTopTablet'] ?? '' );
			$margin_right_tablet  = $sgs_css_length( $attributes['marginRightTablet'] ?? '' );
			$margin_bottom_tablet = $sgs_css_length( $attributes['marginBottomTablet'] ?? '' );
			$margin_left_tablet   = $sgs_css_length( $attributes['marginLeftTablet'] ?? '' );
			$margin_top_mobile    = $sgs_css_length( $attributes['marginTopMobile'] ?? '' );
			$margin_right_mobile  = $sgs_css_length( $attributes['marginRightMobile'] ?? '' );
			$margin_bottom_mobile = $sgs_css_length( $attributes['marginBottomMobile'] ?? '' );
			$margin_left_mobile   = $sgs_css_length( $attributes['marginLeftMobile'] ?? '' );

			$has_responsive_padding = ( '' !== $padding_top_tablet || '' !== $padding_right_tablet || '' !== $padding_bottom_tablet || '' !== $padding_left_tablet
				|| '' !== $padding_top_mobile || '' !== $padding_right_mobile || '' !== $padding_bottom_mobile || '' !== $padding_left_mobile );
			$has_responsive_margin  = ( '' !== $margin_top_tablet || '' !== $margin_right_tablet || '' !== $margin_bottom_tablet || '' !== $margin_left_tablet
				|| '' !== $margin_top_mobile || '' !== $margin_right_mobile || '' !== $margin_bottom_mobile || '' !== $margin_left_mobile );

			// Content-band (Layer 2: __inner) attrs — section + layout kinds only, since
			// those are the only kinds that can emit the __inner wrapper (content kind
			// uses contentWidth/padding natively; no __inner layer is emitted).
			$band_padding_top    = $sgs_css_length( $attributes['contentBandPaddingTop'] ?? '' );
			$band_padding_right  = $sgs_css_length( $attributes['contentBandPaddingRight'] ?? '' );
			$band_padding_bottom = $sgs_css_length( $attributes['contentBandPaddingBottom'] ?? '' );
			$band_padding_left   = $sgs_css_length( $attributes['contentBandPaddingLeft'] ?? '' );

			$band_padding_top_tablet    = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingTopTablet'] ?? '' ) : '';
			$band_padding_right_tablet  = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingRightTablet'] ?? '' ) : '';
			$band_padding_bottom_tablet = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingBottomTablet'] ?? '' ) : '';
			$band_padding_left_tablet   = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingLeftTablet'] ?? '' ) : '';

			$band_padding_top_mobile    = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingTopMobile'] ?? '' ) : '';
			$band_padding_right_mobile  = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingRightMobile'] ?? '' ) : '';
			$band_padding_bottom_mobile = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingBottomMobile'] ?? '' ) : '';
			$band_padding_left_mobile   = ( $is_section || $is_layout ) ? $sgs_css_length( $attributes['contentBandPaddingLeftMobile'] ?? '' ) : '';

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

			// HTML tag.
			$html_tag     = $opt_tag ? $opt_tag : ( $attributes['htmlTag'] ?? 'section' );
			$allowed_tags = array( 'section', 'div', 'article', 'aside', 'main', 'details', 'fieldset' );
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

			$grid_on_inner    = ( ( 'grid' === $layout || 'flex' === $layout ) && $has_band_props && null === $opt_wrap_inner );
			$inner_grid_decls = array();

			// gap — section + layout kinds. When responsive gap tiers exist the base
			// is emitted via the per-instance uid CSS instead (an inline base would
			// override every @media tier — same convention as min-height below).
			if ( ( $is_section || $is_layout ) && '' !== $gap && ! ( $gap_tablet || $gap_mobile ) ) {
				if ( $grid_on_inner ) {
					$inner_grid_decls[] = 'gap:' . sgs_container_gap_value( $gap );
				} else {
					$styles[] = 'gap:' . sgs_container_gap_value( $gap );
				}
			}

			// Base min-height — section kind. When responsive variants exist it is
			// emitted via the per-instance uid CSS below instead (so @media overrides
			// can win); inline-only in the base-only case keeps existing output byte-
			// identical and avoids forcing a uid on already-shipped content.
			if ( $is_section && $min_height && ! $has_responsive_min_height ) {
				$styles[] = 'min-height:' . esc_attr( $min_height );
			}

			if ( $shadow ) {
				$styles[] = 'box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow ) . ')';
			}

			// Background image — section kind only.
			if ( $is_section && $has_bg_image && ! $has_bg_video ) {
				$styles[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
				$styles[] = 'background-size:' . esc_attr( $bg_size );
				$styles[] = 'background-position:' . esc_attr( $bg_position );
				$styles[] = 'background-repeat:' . esc_attr( $bg_repeat );
				if ( 'fixed' === $bg_attachment ) {
					$styles[] = 'background-attachment:fixed';
				}
			}

			// Ken-burns duration.
			if ( $is_section && $bg_ken_burns && $has_bg_image ) {
				$styles[] = '--sgs-ken-burns-duration:' . absint( $bg_animation_duration ) . 's';
			}

			// Grid / flex display — section + layout kinds. When $grid_on_inner the
			// grid/flex decls live on the __inner content band ($inner_grid_decls)
			// instead of the full-bleed outer $styles (so the section bg spans full).
			if ( $is_section || $is_layout ) {
				$gd = array();
				if ( 'grid' === $layout ) {
					$gd[] = 'display:grid';
					// Base column template — deferred to the uid stylesheet when
					// responsive template tiers exist (inline beats @media otherwise).
					$gtc_base = '' !== trim( (string) $grid_template )
						? sgs_sanitize_grid_template( $grid_template )
						: 'repeat(' . absint( $columns ) . ',1fr)';
					if ( ! ( $grid_template_tablet || $grid_template_mobile ) ) {
						$gd[] = 'grid-template-columns:' . $gtc_base;
					}
					$gd[] = 'align-items:' . esc_attr( $vertical_align );
					if ( 'stretch' !== $justify_items ) {
						$gd[] = 'justify-items:' . esc_attr( $justify_items );
					}
					if ( 'stretch' !== $align_content ) {
						$gd[] = 'align-content:' . esc_attr( $align_content );
					}
				} elseif ( 'flex' === $layout ) {
					$gd[] = 'display:flex';
					$gd[] = 'flex-wrap:' . esc_attr( '' !== $flex_wrap ? $flex_wrap : 'wrap' );
					$gd[] = 'align-items:' . esc_attr( $vertical_align );
					if ( '' !== $flex_direction ) {
						$gd[] = 'flex-direction:' . esc_attr( $flex_direction );
					}
					if ( '' !== $justify_content ) {
						$gd[] = 'justify-content:' . esc_attr( $justify_content );
					}
				}
				if ( $grid_on_inner ) {
					$inner_grid_decls = array_merge( $inner_grid_decls, $gd );
				} else {
					$styles = array_merge( $styles, $gd );
				}
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
				if ( '' !== trim( (string) $grid_template_rows ) && ! ( $grid_template_rows_tablet || $grid_template_rows_mobile ) ) {
					$styles[] = 'grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_template_rows ) );
				}
				if ( '' !== trim( (string) $grid_auto_rows ) ) {
					$styles[] = 'grid-auto-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_auto_rows ) );
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
			// Defer to a .uid stylesheet rule when responsive tiers exist, so the
			// @media tiers can override the base (inline would beat them).
			if ( '' !== $max_width ) {
				if ( ! $has_responsive_max_width ) {
					$styles[] = 'max-width:' . $sgs_css_length( $max_width );
					$styles[] = 'margin-inline:auto';
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
			$style_dim = $attributes['style']['dimensions'] ?? array();
			if ( '' === $max_width && ! empty( $style_dim['maxWidth'] ) ) {
				$styles[] = 'max-width:' . esc_attr( $style_dim['maxWidth'] );
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
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				if ( '' === trim( (string) $grid_template ) ) {
					$classes[] = 'sgs-cols-' . absint( $columns );
				}
				if ( $columns_tablet && '' === trim( (string) $grid_template_tablet ) ) {
					$classes[] = 'sgs-cols-tablet-' . absint( $columns_tablet );
				}
				if ( $columns_mobile && '' === trim( (string) $grid_template_mobile ) ) {
					$classes[] = 'sgs-cols-mobile-' . absint( $columns_mobile );
				}
			}

			// ----------------------------------------------------------------
			// First call to get_block_wrapper_attributes() — before shapes/uid.
			// This mirrors the original render.php ~line 398 first-pass call.
			// ----------------------------------------------------------------
			$wrapper_attributes = get_block_wrapper_attributes(
				array_merge(
					array(
						'class' => implode( ' ', $classes ),
						'style' => implode( ';', $styles ) . ';',
					),
					$opt_extra_attrs
				)
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
			$overlay_html = '';
			if ( $is_section && ! $opt_no_overlay ) {
				$has_any_bg         = $has_bg_image || $has_bg_video;
				$has_overlay_colour = $overlay_colour || ( $overlay_gradient && $overlay_gradient_from );

				if ( $has_any_bg && $has_overlay_colour ) {
					if ( $overlay_gradient && $overlay_gradient_from ) {
						$grad_from     = sgs_colour_value( $overlay_gradient_from );
						$grad_to       = $overlay_gradient_to ? sgs_colour_value( $overlay_gradient_to ) : 'transparent';
						$overlay_style = sprintf(
							'background-image:linear-gradient(%ddeg,%s,%s);opacity:%s',
							$overlay_gradient_angle,
							$grad_from,
							$grad_to,
							esc_attr( $overlay_opacity / 100 )
						);
					} else {
						$overlay_style = sprintf(
							'background-color:%s;opacity:%s',
							sgs_colour_value( $overlay_colour ),
							esc_attr( $overlay_opacity / 100 )
						);
					}
					$overlay_html = '<span class="sgs-container__overlay" style="' . esc_attr( $overlay_style ) . '" aria-hidden="true"></span>';
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
			// Responsive CSS + uid — section + layout kinds with responsive attrs.
			// ----------------------------------------------------------------
			$responsive_css      = '';
			$has_responsive_bg   = $is_section && ( ! empty( $bg_image_tablet['url'] ) || ! empty( $bg_image_mobile['url'] ) );
			$has_responsive_attr = ( $gap_tablet || $gap_mobile || $has_responsive_bg || $has_responsive_min_height
				|| $has_responsive_padding || $has_responsive_margin || $has_band_responsive || $max_width_tablet || $max_width_mobile )
				|| ( ( $is_section || $is_layout ) && ( $grid_template_tablet || $grid_template_mobile || $grid_template_rows_tablet || $grid_template_rows_mobile ) );

			// uid also needed when parallax/ken-burns is active or bg-video is responsive.
			$needs_uid = $has_responsive_attr
				|| ( $is_section && ( $bg_parallax || $bg_ken_burns ) )
				|| ( $is_section && $has_bg_video && ! empty( $bg_video_mobile['url'] ) );

			$uid = '';
			if ( $needs_uid ) {
				$anchor    = ( $block instanceof \WP_Block ) ? ( $block->parsed_block['attrs']['anchor'] ?? '' ) : '';
				$uid       = 'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . $anchor ), 0, 8 );
				$classes[] = $uid;
			}

			if ( $has_responsive_attr ) {
				// Grid CSS lives on the __inner band when $grid_on_inner (so the outer
				// stays full-bleed); else on the outer (.uid). $grid_sel selects the
				// element the responsive grid + gap rules target.
				$grid_sel = $grid_on_inner ? ( '.' . $uid . '>.sgs-container__inner' ) : ( '.' . $uid );

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
				$wrapper_attributes = get_block_wrapper_attributes(
					array_merge(
						array(
							'class' => implode( ' ', $classes ),
							'style' => implode( ';', $styles ) . ';',
						),
						$opt_extra_attrs
					)
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
			if ( $do_wrap && $has_band_responsive && '' !== $uid ) {
				// Responsive band tiers exist: the base band styles were emitted into
				// the uid stylesheet (band base rule before the @media tiers) — an
				// inline base here would override every @media rule. The grid decls
				// ($inner_grid_decls — display:grid/align/gap, not responsive) are
				// inline-safe, so add them here so the grid lands on the band element.
				$io_style    = ( $grid_on_inner && $inner_grid_decls )
					? ' style="' . esc_attr( implode( ';', $inner_grid_decls ) ) . '"'
					: '';
				$inner_open  = '<div class="sgs-container__inner"' . $io_style . '>';
				$inner_close = '</div>';
			} elseif ( $do_wrap ) {
				// Build inline style for the band — max-width + margin-inline:auto when
				// contentWidth is set (guarded: __inner can now exist for band padding /
				// background with NO content-width, so an unguarded 'max-width:' would
				// emit a malformed empty value); base band padding + background appended
				// when set. Responsive overrides for these are emitted via the uid @media
				// CSS block above (band selector .uid > .sgs-container__inner).
				$inner_style_parts = array();
				if ( '' !== $content_width ) {
					$inner_style_parts[] = 'max-width:' . esc_attr( $content_width );
					$inner_style_parts[] = 'margin-inline:auto';
				}

				// Base band padding + background (desktop tier — ALL kinds; Bean-locked
				// 2026-06-16: the section/layout-only carve-out dropped content-band CSS
				// on content-kind composites. Each property keeps its own non-empty guard.
				if ( '' !== $band_padding_top ) {
					$inner_style_parts[] = 'padding-top:' . esc_attr( $band_padding_top );
				}
				if ( '' !== $band_padding_right ) {
					$inner_style_parts[] = 'padding-right:' . esc_attr( $band_padding_right );
				}
				if ( '' !== $band_padding_bottom ) {
					$inner_style_parts[] = 'padding-bottom:' . esc_attr( $band_padding_bottom );
				}
				if ( '' !== $band_padding_left ) {
					$inner_style_parts[] = 'padding-left:' . esc_attr( $band_padding_left );
				}
				// Band background — sanitise via sgs_colour_value() (same sanitiser as
				// gridItemBackground and overlay colour to remain consistent).
				if ( '' !== $band_background ) {
					$inner_style_parts[] = 'background-color:' . esc_attr( sgs_colour_value( $band_background ) );
				}

				// L3 grid decls (display:grid + base grid-template-columns + align + gap)
				// live on the __inner band when this is a grid/flex container (FR-22-21).
				if ( $grid_on_inner && $inner_grid_decls ) {
					$inner_style_parts = array_merge( $inner_style_parts, $inner_grid_decls );
				}

				$inner_open  = '<div class="sgs-container__inner" style="' . esc_attr( implode( ';', $inner_style_parts ) ) . '">';
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
