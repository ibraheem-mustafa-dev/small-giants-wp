<?php
/**
 * SGS Site Header — server-side render.
 *
 * The header shell: a vertical stack of up to three sgs/site-header-row blocks
 * (top / middle / bottom). Empty rows emit zero output (handled by the row
 * block itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite-mirror (R-31-9 / D294) —
 * no divergent per-block styling path.
 *
 * Rendered with tag <header> (FR-37-13 fix B, D375): this block IS the site
 * banner landmark. The SGS header engine (Sgs_Header_Rules::filter_template_part)
 * short-circuits core/template-part on every request via the priority-9999
 * default rule, so core never emits its own <header class="wp-block-template-part">
 * wrapper — leaving the page with zero <header> landmarks and the scroll-behaviour
 * JS/CSS (header-behaviours) targeting an element that never rendered (all four
 * behaviours silently dead, live-proven 2026-07-23). Emitting <header> here revives
 * sticky/transparent/shrink/hide-on-scroll AND adds the missing banner landmark.
 * 'header' is in SGS_Container_Wrapper's tag allowlist. The behaviours key on the
 * block-guaranteed '.sgs-site-header' class. No nested landmark in the current
 * template roster: rows render as <div> (site-header-row) and the engine's
 * short-circuit means core's <header class="wp-block-template-part"> wrapper is not
 * emitted. RESIDUAL (not a live path today): if a template/pattern ever resolves the
 * header template-part TWICE on one request, Sgs_Header_Rules::filter_template_part's
 * has_served() branch hands the second slot back to core, which WOULD then wrap a
 * second sgs/site-header in core's <header> = nested banner landmarks. Guard at that
 * branch if a double-header template is ever added (parking P-HEADER-DOUBLE-SLOT-NEST).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes.
 *   $content     string    InnerBlocks HTML (the rendered rows).
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$sgs_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation (class-sgs-container-wrapper.php)
// rather than the per-request counter wp_unique_id(): identical header attributes
// yield an identical uid on every page, so the CSS collector can dedup this block's
// scoped <style> across pages (no cache fragmentation) and FR-S9-6's re-save=same-uid
// golden holds. STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid      = 'sgs-sh-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-site-header';
$classes  = array( 'sgs-site-header', $uid );

$css = '';

// ── WP-native colour / border supports — no-inline contract (Spec 32). ──────────
// Mirrors sgs/site-header-row + sgs/feature-grid: skip-serialised supports are
// read from $attributes['style'] and emitted into this block's scoped <style>.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sh_style_engine_args = array();

	$sh_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$sh_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$sh_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$sh_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $sh_color_args ) ) {
		$sh_style_engine_args['color'] = $sh_color_args;
	}

	$sh_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$sh_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$sh_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$sh_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$sh_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $sh_radius_raw ) && '' !== $sh_radius_raw ) {
			$sh_border_args['radius'] = $sgs_css_length( $sh_radius_raw );
		} elseif ( is_array( $sh_radius_raw ) ) {
			$sh_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $sh_corner ) {
				if ( ! empty( $sh_radius_raw[ $sh_corner ] ) ) {
					$sh_radius_clean[ $sh_corner ] = $sgs_css_length( $sh_radius_raw[ $sh_corner ] );
				}
			}
			if ( ! empty( $sh_radius_clean ) ) {
				$sh_border_args['radius'] = $sh_radius_clean;
			}
		}
	}
	if ( ! empty( $sh_border_args ) ) {
		$sh_style_engine_args['border'] = $sh_border_args;
	}

	if ( ! empty( $sh_style_engine_args ) ) {
		$sh_scoped_styles = wp_style_engine_get_styles(
			$sh_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $sh_scoped_styles['css'] ) ) {
			$css .= $sh_scoped_styles['css'];
		}
	}
}

$sh_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sh_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sh_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $sh_preset_text_slug . '-color';
}
if ( '' !== $sh_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $sh_preset_bg_slug . '-background-color';
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'section',
	array(
		'tag'           => 'header',
		'extra_classes' => $classes,
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
