<?php
/**
 * Server-side render for sgs/collapsible-text.
 *
 * SEO discipline: the FULL text is ALWAYS emitted into the page HTML so
 * crawlers index every word. Collapse is visual only.
 *
 * Chosen approach (FR-30-3(e)): a <button aria-expanded aria-controls> toggle +
 * a line-clamped body container + a small view.js ES module.
 *   - No-JS state: the body is NOT clamped (full text visible) and the button
 *     carries the `hidden` attribute, so no-JS visitors get the full text and
 *     no broken control. This satisfies "no-JS full text reachable".
 *   - With JS: view.js adds `is-collapsed` to the body (applies the CSS
 *     line-clamp to --sgs-collapsible-text-collapsed-lines lines), removes
 *     `hidden` from the button, and wires the toggle (aria-expanded flip +
 *     label swap).
 *   - The body text stays in the DOM and crawlable in EVERY state — collapsed
 *     uses only overflow:hidden + line-clamp, never display:none/visibility:hidden.
 *   - When collapsible=false: plain wrapper, no button, no clamp.
 *
 * Typography: sgs_typography_css_rule() (includes/helpers-typography.php)
 * emits a scoped <style> block for font-size/weight/style/line-height.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered wrapper carries ZERO inline CSS property declarations. The
 * `color`/`spacing` WP supports declare `__experimentalSkipSerialization` in
 * block.json so get_block_wrapper_attributes() never auto-inlines them; every
 * declaration is emitted into the block's OWN scoped `.{uid}` <style> tag via
 * the stable core API `wp_style_engine_get_styles()`.
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are the WP-native
 * `style.spacing.padding`/`margin` objects (already `{top,right,bottom,left}`
 * — WP-native box families are object-shaped by construction). Tiers =
 * `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile` SGS custom
 * object attrs, rendered scoped `@media` (contract §B2: 1023/767).
 *
 * The `--sgs-collapsible-text-collapsed-lines` custom-property VALUE on the
 * body element is a `--var` value, not a property declaration — permitted
 * under contract §A.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — text is a scalar attr).
 * @var \WP_Block $block      Block instance.
 *
 * @since 2026-06-11  P-D213 initial build.
 * @since 2026-07-10  No-inline migration (scoped colour/spacing + tiers).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$text            = $attributes['text'] ?? '';
$collapsible     = ! empty( $attributes['collapsible'] );
$collapsed_lines = isset( $attributes['collapsedLines'] ) ? max( 1, (int) $attributes['collapsedLines'] ) : 4;

// Nothing to render if the operator hasn't entered any copy yet.
if ( '' === $text ) {
	return;
}

// -------------------------------------------------------------------------
// wp_unique_id() gives a stable-per-request id for THIS instance's aria
// wiring (aria-controls/body id) when multiple collapsible-text blocks
// appear on one page. The SAME token is also added as a CLASS (not a second
// id) so the scoped CSS below never collides with the block's own `anchor`
// support id (contract §B3 — scoping identifiers are classes, never ids).
// -------------------------------------------------------------------------
$uid      = wp_unique_id( 'sgs-collapsible-text-' );
$root_sel = '.' . $uid . '.sgs-collapsible-text';

$typography_selector = '.' . esc_attr( $uid ) . ' .sgs-collapsible-text__body';
$typography_css      = sgs_typography_css_rule( $attributes, '', $typography_selector );

// ---------------------------------------------------------------------------
// 2. Box shorthand builder (hand-built, mirrors sgs/label/sgs/container).
// ---------------------------------------------------------------------------

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

// WP-native base padding/margin objects (skip-serialised — NOT auto-inlined).
$base_padding_obj = ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) )
	? $attributes['style']['spacing']['padding']
	: array();
$base_margin_obj  = ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) )
	? $attributes['style']['spacing']['margin']
	: array();

// SGS custom tier object attrs.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised — NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Base padding/margin (WP-native style.spacing.*), emitted scoped via the
// stable core style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$spacing_args = array();
	if ( ! empty( $base_padding_obj ) ) {
		$spacing_args['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$spacing_args['margin'] = $base_margin_obj;
	}
	if ( ! empty( $spacing_args ) ) {
		$spacing_scoped_styles = wp_style_engine_get_styles(
			array( 'spacing' => $spacing_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $spacing_scoped_styles['css'] ) ) {
			$scoped_css[] = $spacing_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// --- WP colour support (skip-serialised) — custom hex/rgb emitted scoped via
// the style engine; preset SLUGS get the standard has-* classes re-added
// manually below. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$color_scoped_styles = wp_style_engine_get_styles(
			array( 'color' => $color_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$scoped_css[] = $color_scoped_styles['css'];
		}
	}
}

if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// ---------------------------------------------------------------------------
// 4. Wrapper classes — BEM root + collapsible modifier + the CSS-scope class.
// is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO
// 'style' key carrying a property declaration is passed — the root carries
// ZERO inline property declarations (contract §A).
// ---------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-collapsible-text', $uid );
if ( $collapsible ) {
	$wrapper_classes[] = 'sgs-collapsible-text--collapsible';
}
if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
	)
);

// Sanitise the rich-text copy. wp_kses_post() is the correct pass for
// operator-entered HTML (allows p, strong, em, a, ul, ol, li, br — keeps
// the full post subset while stripping any unsafe tags).
$safe_text = wp_kses_post( $text );

// -------------------------------------------------------------------------
// Build output.
// -------------------------------------------------------------------------
$output = '';

if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
	// leaving CSS combinators like `>` intact (contract §D). Every value
	// reaching $scoped_css is pre-sanitised ($sgs_css_length /
	// wp_style_engine_get_styles / sgs_typography_css_rule's own
	// sanitisers), so no un-sanitised value survives here.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>.
	$output .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

if ( $collapsible ) {
	/*
	 * Collapse mechanism (FR-30-3(e)) — button + line-clamp body + view.js.
	 *
	 * DOM shape:
	 *   <div class="sgs-collapsible-text sgs-collapsible-text--collapsible" id="{uid}" ...>
	 *     <div class="sgs-collapsible-text__body" id="{uid}-body"
	 *          style="--sgs-collapsible-text-collapsed-lines:N">
	 *       {full text — always in HTML, never hidden from crawlers}
	 *     </div>
	 *     <button type="button" class="sgs-collapsible-text__toggle"
	 *             aria-expanded="false" aria-controls="{uid}-body" hidden>
	 *       Read more
	 *     </button>
	 *   </div>
	 *
	 * No-JS default: body has NO `is-collapsed` class (full text visible) and
	 * the button is `hidden`. view.js adds `is-collapsed` + un-hides the button.
	 *
	 * The text is NEVER display:none / visibility:hidden — collapsed uses ONLY
	 * overflow:hidden + line-clamp (visual clipping; the text stays in the
	 * accessibility tree and is indexed by crawlers) in every state.
	 */
	$collapsed_lines_attr = esc_attr( (string) $collapsed_lines );
	$body_id              = esc_attr( $uid . '-body' );

	$output .= '<div ' . $wrapper_attrs . '>';

	// Text body — always present + unclamped by default (no-JS shows full text).
	$output .= '<div class="sgs-collapsible-text__body" id="' . $body_id . '" style="--sgs-collapsible-text-collapsed-lines:' . $collapsed_lines_attr . '">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';

	// Toggle — `hidden` by default; view.js un-hides it. aria-controls points
	// at the body so assistive tech announces the controlled region.
	$output .= '<button type="button" class="sgs-collapsible-text__toggle" aria-expanded="false" aria-controls="' . $body_id . '" data-read-more="' . esc_attr__( 'Read more', 'sgs-blocks' ) . '" data-read-less="' . esc_attr__( 'Read less', 'sgs-blocks' ) . '" hidden>';
	$output .= esc_html__( 'Read more', 'sgs-blocks' );
	$output .= '</button>';

	$output .= '</div>';
} else {
	// Non-collapsible: plain wrapper.
	$output .= '<div ' . $wrapper_attrs . '>';
	$output .= '<div class="sgs-collapsible-text__body">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';
	$output .= '</div>';
}

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes(), wp_kses_post(), esc_attr(), and first-party CSS.
