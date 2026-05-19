<?php
/**
 * Server-side render for the SGS Container block.
 *
 * Uses the htmlTag attribute to output the correct semantic element.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';

if ( ! function_exists( 'sgs_sanitize_grid_template' ) ) {
	/**
	 * Sanitise a CSS grid-template-columns value for safe inline-style emission.
	 *
	 * Allows: digits, letters, whitespace, percent, parens, commas, dashes.
	 * Forbids: semicolons, braces, quotes, angle brackets, slashes.
	 * Strips: anything else.
	 *
	 * @param string $value Raw attribute value.
	 * @return string Sanitised CSS fragment.
	 */
	function sgs_sanitize_grid_template( $value ) {
		$value = (string) $value;
		// Keep only characters that can appear in a legitimate grid-template-columns value.
		$value = preg_replace( '/[^A-Za-z0-9\s%(),.\-]/', '', $value );
		return trim( $value );
	}
}

$layout               = $attributes['layout'] ?? 'stack';
$columns              = $attributes['columns'] ?? 2;
$columns_mobile       = $attributes['columnsMobile'] ?? 1;
$columns_tablet       = $attributes['columnsTablet'] ?? 2;
$grid_template        = $attributes['gridTemplateColumns'] ?? '';
$grid_template_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
$grid_template_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
$gap                  = $attributes['gap'] ?? '40';
$gap_tablet           = $attributes['gapTablet'] ?? '';
$gap_mobile           = $attributes['gapMobile'] ?? '';
$bg_image             = $attributes['backgroundImage'] ?? null;
$bg_image_tablet      = $attributes['backgroundImageTablet'] ?? null;
$bg_image_mobile      = $attributes['backgroundImageMobile'] ?? null;
$bg_size              = $attributes['backgroundSize'] ?? 'cover';
$allowed_bg_sizes     = array( 'cover', 'contain', 'auto' );
if ( ! in_array( $bg_size, $allowed_bg_sizes, true ) ) {
	$bg_size = 'cover';
}
$bg_position = $attributes['backgroundPosition'] ?? 'center center';
// Allowlist bg-position: only numbers, letters, whitespace, %, top/left/right/bottom/center.
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
$shadow                 = $attributes['shadow'] ?? '';
$max_width              = $attributes['maxWidth'] ?? 'wide';
$min_height             = $attributes['minHeight'] ?? '';
$vertical_align         = $attributes['verticalAlign'] ?? 'start';
$html_tag               = $attributes['htmlTag'] ?? 'section';

// widthMode — base (mobile-first) + per-viewport overrides. Composes with WP-native
// alignwide/alignfull. Per-client theme.json:settings.layout.contentSize/wideSize
// flow through the --wp--style--global--*-size CSS vars so variations override correctly.
$allowed_width_modes   = array( 'default', 'wide', 'full', 'custom' );
$width_mode            = $attributes['widthMode'] ?? 'default';
$width_mode_mobile     = $attributes['widthModeMobile'] ?? '';
$width_mode_tablet     = $attributes['widthModeTablet'] ?? '';
$width_mode_desktop    = $attributes['widthModeDesktop'] ?? '';
$custom_width_value    = isset( $attributes['customWidth'] ) ? absint( $attributes['customWidth'] ) : 0;
$custom_width_unit_raw = $attributes['customWidthUnit'] ?? 'px';
$allowed_width_units   = array( 'px', 'em', 'rem', '%', 'vw' );
$custom_width_unit     = in_array( $custom_width_unit_raw, $allowed_width_units, true ) ? $custom_width_unit_raw : 'px';

if ( ! in_array( $width_mode, $allowed_width_modes, true ) ) {
	$width_mode = 'default';
}
if ( '' !== $width_mode_mobile && ! in_array( $width_mode_mobile, $allowed_width_modes, true ) ) {
	$width_mode_mobile = '';
}
if ( '' !== $width_mode_tablet && ! in_array( $width_mode_tablet, $allowed_width_modes, true ) ) {
	$width_mode_tablet = '';
}
if ( '' !== $width_mode_desktop && ! in_array( $width_mode_desktop, $allowed_width_modes, true ) ) {
	$width_mode_desktop = '';
}

// Allowlist for HTML tags.
$allowed_tags = array( 'section', 'div', 'article', 'aside', 'main' );
if ( ! in_array( $html_tag, $allowed_tags, true ) ) {
	$html_tag = 'section';
}

// Build inline styles.
$styles   = array();
$styles[] = 'gap:var(--wp--preset--spacing--' . esc_attr( $gap ) . ')';

if ( $min_height ) {
	$styles[] = 'min-height:' . esc_attr( $min_height );
}

if ( $shadow ) {
	$styles[] = 'box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow ) . ')';
}

// Background image — inline styles (desktop base).
// Video backgrounds don't use CSS background-image; the <video> element handles them.
$has_bg_image = ! empty( $bg_image['url'] );
$has_bg_video = ! empty( $bg_video['url'] );
if ( $has_bg_image && ! $has_bg_video ) {
	$styles[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
	$styles[] = 'background-size:' . esc_attr( $bg_size );
	$styles[] = 'background-position:' . esc_attr( $bg_position );
	$styles[] = 'background-repeat:' . esc_attr( $bg_repeat );
	if ( 'fixed' === $bg_attachment ) {
		$styles[] = 'background-attachment:fixed';
	}
}

// Ken-burns animation duration CSS custom property (consumed by CSS animation).
if ( $bg_ken_burns && $has_bg_image ) {
	$styles[] = '--sgs-ken-burns-duration:' . absint( $bg_animation_duration ) . 's';
}

if ( 'grid' === $layout ) {
	$styles[] = 'display:grid';
	// gridTemplateColumns string overrides the columns:N → repeat(N,1fr) default.
	// Allows asymmetric tracks like "5fr 3fr" / "60% 40%" / "minmax(0,1fr) 320px".
	// Phase 7 Spec 16 — 2026-05-15 added to support mockup grids like product-card
	// pairs (5fr 3fr) and Brand Story 2-col (1fr 1fr) that the columns:N attr
	// cannot express.
	if ( '' !== trim( (string) $grid_template ) ) {
		$styles[] = 'grid-template-columns:' . sgs_sanitize_grid_template( $grid_template );
	} else {
		$styles[] = 'grid-template-columns:repeat(' . absint( $columns ) . ',1fr)';
	}
	$styles[] = 'align-items:' . esc_attr( $vertical_align );
} elseif ( 'flex' === $layout ) {
	$styles[] = 'display:flex';
	$styles[] = 'flex-wrap:wrap';
	$styles[] = 'align-items:' . esc_attr( $vertical_align );
}

// Build CSS classes.
$classes = array(
	'sgs-container',
	'sgs-container--' . esc_attr( $layout ),
	'sgs-container--width-' . esc_attr( $max_width ),
);

// widthMode — emit WP-native alignment classes so the wrapper composes with
// .entry-content's wide/full escape mechanism. SGS-internal width classes
// (sgs-container--width-*) remain driven by the legacy $max_width attr above
// for backwards-compat with existing posts.
if ( 'wide' === $width_mode ) {
	$classes[] = 'alignwide';
} elseif ( 'full' === $width_mode ) {
	$classes[] = 'alignfull';
} elseif ( 'custom' === $width_mode && $custom_width_value > 0 ) {
	$styles[] = 'max-width:' . $custom_width_value . $custom_width_unit;
}

// 2026-05-17 — honour style.dimensions.maxWidth lifted from mockup CSS by
// the SGS clone-pipeline. WP's named-width enum (content/wide/full) can't
// express literal pixel widths from authored mockups (e.g. `max-width: 1000px`),
// so the converter lifts the raw value into `style.dimensions.maxWidth` and
// this render path emits it as inline-style. Falls back to the named width
// class above when absent.
$style_dim = $attributes['style']['dimensions'] ?? array();
if ( ! empty( $style_dim['maxWidth'] ) ) {
	$styles[] = 'max-width:' . esc_attr( $style_dim['maxWidth'] );
}

// When a min-height is set, add flex-centring class (#48).
if ( ! empty( $min_height ) ) {
	$classes[] = 'sgs-container--has-min-height';
}

// Advanced background mode classes.
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

if ( 'grid' === $layout ) {
	$classes[] = 'sgs-cols-' . absint( $columns );
	if ( $columns_tablet ) {
		$classes[] = 'sgs-cols-tablet-' . absint( $columns_tablet );
	}
	if ( $columns_mobile ) {
		$classes[] = 'sgs-cols-mobile-' . absint( $columns_mobile );
	}
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $styles ) . ';',
	)
);

// Build video background markup.
// bgVideo / bgVideoMobile work on any container (not tied to a variant).
// Two data-src-* attributes let view.js swap the src on viewport resize.
$video_html = '';
if ( $has_bg_video ) {
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

// Build overlay markup.
// Overlay fires whenever there is any background (image OR video) and a colour is set.
// overlayGradient: replaces the flat colour with a two-stop linear-gradient overlay.
$overlay_html       = '';
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

// Responsive bg-image swaps (tablet / mobile) — emitted as scoped <style>.
// These are appended to $responsive_css below alongside gap / widthMode rules.

// Shape dividers.
$shape_top    = $attributes['shapeDividerTop'] ?? '';
$shape_bottom = $attributes['shapeDividerBottom'] ?? '';

$shape_top_html    = '';
$shape_bottom_html = '';

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

// Build responsive gap + widthMode + bg-image CSS.
$responsive_css      = '';
$has_responsive_bg   = ! empty( $bg_image_tablet['url'] ) || ! empty( $bg_image_mobile['url'] );
$has_responsive_attr = $gap_tablet || $gap_mobile || $width_mode_mobile || $width_mode_tablet || $width_mode_desktop || $has_responsive_bg;
// Also need a uid when bg-parallax/ken-burns is active (for the no-parallax class via JS) or bg-video is responsive.
$needs_uid           = $has_responsive_attr || $bg_parallax || $bg_ken_burns || ( $has_bg_video && ! empty( $bg_video_mobile['url'] ) );
$uid                 = '';
if ( $needs_uid ) {
	$uid       = 'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
	$classes[] = $uid;
}
if ( $has_responsive_attr ) {

	if ( $gap_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{gap:var(--wp--preset--spacing--' . esc_attr( $gap_tablet ) . ')}}';
	}
	if ( $gap_mobile ) {
		$responsive_css .= '@media (max-width:599px){.' . $uid . '{gap:var(--wp--preset--spacing--' . esc_attr( $gap_mobile ) . ')}}';
	}

	// Per-viewport widthMode overrides — map enum to a max-width literal.
	// Inherits per-client contentSize/wideSize via theme global CSS vars.
	$width_mode_to_css = function ( $mode ) use ( $custom_width_value, $custom_width_unit ) {
		if ( 'wide' === $mode ) {
			return 'max-width:var(--wp--style--global--wide-size,1200px)';
		}
		if ( 'default' === $mode ) {
			return 'max-width:var(--wp--style--global--content-size,780px)';
		}
		if ( 'full' === $mode ) {
			return 'max-width:none';
		}
		if ( 'custom' === $mode && $custom_width_value > 0 ) {
			return 'max-width:' . $custom_width_value . $custom_width_unit;
		}
		return '';
	};

	if ( '' !== $width_mode_mobile ) {
		$decl = $width_mode_to_css( $width_mode_mobile );
		if ( '' !== $decl ) {
			$responsive_css .= '@media (max-width:599px){.' . $uid . '{' . $decl . '}}';
		}
	}
	if ( '' !== $width_mode_tablet ) {
		$decl = $width_mode_to_css( $width_mode_tablet );
		if ( '' !== $decl ) {
			$responsive_css .= '@media (max-width:1023px){.' . $uid . '{' . $decl . '}}';
		}
	}
	if ( '' !== $width_mode_desktop ) {
		$decl = $width_mode_to_css( $width_mode_desktop );
		if ( '' !== $decl ) {
			$responsive_css .= '@media (min-width:1024px){.' . $uid . '{' . $decl . '}}';
		}
	}

	// Tablet background image override.
	if ( ! empty( $bg_image_tablet['url'] ) ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_tablet['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
	}

	// Mobile background image override.
	if ( ! empty( $bg_image_mobile['url'] ) ) {
		$responsive_css .= '@media (max-width:599px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_mobile['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
	}
}

// Rebuild wrapper attributes whenever the class list has grown (shapes, uid, bg-video, parallax classes).
if ( $shape_top || $shape_bottom || $uid ) {
	$wrapper_attributes = get_block_wrapper_attributes(
		array(
			'class' => implode( ' ', $classes ),
			'style' => implode( ';', $styles ) . ';',
		)
	);
}

// Output responsive CSS if needed (scoped to the uid class so it only targets this instance).
if ( $responsive_css && $uid ) {
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), $responsive_css );
}

printf(
	'<%1$s %2$s>%3$s%4$s%5$s%6$s%7$s</%1$s>',
	$html_tag,
	$wrapper_attributes,
	$shape_top_html,
	$video_html,
	$overlay_html,
	$content,
	$shape_bottom_html
);
