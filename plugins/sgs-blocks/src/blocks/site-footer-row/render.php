<?php
/**
 * SGS Footer Row — server-side render.
 *
 * A single row of a site footer. Two shapes, both driven by the shared
 * SGS_Container_Wrapper (composite-mirror, R-31-9 / D294) via the block's
 * `layout` attr — no divergent per-block styling path:
 *   - layout='grid'  → a column grid (up to 6 columns → 1 below the mobile tier)
 *                       for the columns row; columns/columnsTablet/columnsMobile
 *                       and gridTemplateColumns* are consumed by the wrapper.
 *   - layout='flex'  → an intrinsic never-overflow cluster (top strip / bottom
 *                       bar) that wraps rather than overflowing at any width.
 *
 * The only block-private CSS is the min-width:0 hardening in style.css + the
 * scoped colour/border re-emit below (no-inline contract, Spec 32).
 *
 * An empty row (no inner blocks) emits ZERO output — no wrapper, no padding
 * (FR-S9-2 empty-row-zero-output).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes (validated against block.json).
 *   $content     string    InnerBlocks HTML.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Empty-row zero-output guard (FR-S9-2). No inner content → render nothing.
if ( '' === trim( (string) $content ) ) {
	return '';
}

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/keyword sanitisers for free-text style-engine values concatenated
// into this block's scoped <style> (mirrors sgs/site-header-row contract).
$sgs_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$uid = wp_unique_id( 'sgs-sfr-' );

// Row-slot identity class (top / columns / bottom) — set by the parent
// sgs/site-footer template, not operator-editable. Consumed for CSS targeting.
$row_slot   = isset( $attributes['rowSlot'] ) ? sanitize_html_class( $attributes['rowSlot'] ) : '';
$slot_class = '' !== $row_slot ? 'sgs-site-footer-row--' . $row_slot : '';

// D303: $uid is applied as BOTH an id (extra_attrs) AND a class (extra_classes) by
// the wrapper, so the class-scoped `.{$uid}.sgs-site-footer-row` colour/border rules
// below match this element.
$root_sel = '.' . $uid . '.sgs-site-footer-row';
$classes  = array( 'sgs-site-footer-row', $uid );
if ( '' !== $slot_class ) {
	$classes[] = $slot_class;
}

$css = '';

// ── WP-native colour / border supports — no-inline contract (Spec 32). ──────────
// block.json declares color/spacing/__experimentalBorder ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() (called
// inside SGS_Container_Wrapper::render() below) never auto-inlines them. Read the
// resolved values from $attributes['style'] and emit them into this block's own
// scoped <style>. Mirrors sgs/site-header-row exactly.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sfr_style_engine_args = array();

	$sfr_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$sfr_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$sfr_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$sfr_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $sfr_color_args ) ) {
		$sfr_style_engine_args['color'] = $sfr_color_args;
	}

	$sfr_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$sfr_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$sfr_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$sfr_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$sfr_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $sfr_radius_raw ) && '' !== $sfr_radius_raw ) {
			$sfr_border_args['radius'] = $sgs_css_length( $sfr_radius_raw );
		} elseif ( is_array( $sfr_radius_raw ) ) {
			$sfr_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $sfr_corner ) {
				if ( ! empty( $sfr_radius_raw[ $sfr_corner ] ) ) {
					$sfr_radius_clean[ $sfr_corner ] = $sgs_css_length( $sfr_radius_raw[ $sfr_corner ] );
				}
			}
			if ( ! empty( $sfr_radius_clean ) ) {
				$sfr_border_args['radius'] = $sfr_radius_clean;
			}
		}
	}
	if ( ! empty( $sfr_border_args ) ) {
		$sfr_style_engine_args['border'] = $sfr_border_args;
	}

	if ( ! empty( $sfr_style_engine_args ) ) {
		$sfr_scoped_styles = wp_style_engine_get_styles(
			$sfr_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $sfr_scoped_styles['css'] ) ) {
			$css .= $sfr_scoped_styles['css'];
		}
	}
}

// Skip-serialised `color` support also stops WP adding has-*-color classes onto
// the wrapper — re-add them so preset palette colours still resolve (mirrors hero/quote).
$sfr_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sfr_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sfr_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $sfr_preset_text_slug . '-color';
}
if ( '' !== $sfr_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $sfr_preset_bg_slug . '-background-color';
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css built from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'              => 'div',
		'extra_classes'    => $classes,
		'extra_attrs'      => array( 'id' => $uid ),
		// FR-S9-6: gap + gridTemplateColumns are the {desktop,tablet,mobile} object
		// model; the shared wrapper emits their responsive CSS via sgs_emit_responsive_css().
		'responsive_model' => 'object',
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
