<?php
/**
 * Server-side render for the SGS Responsive Logo block.
 *
 * Outputs a <picture> element with up to three logo slots (desktop / tablet /
 * mobile) or, when svgAnimationSource is set, an inline SVG for desktop with
 * static images for smaller breakpoints.
 *
 * SVG SECURITY NOTE: svgAnimationSource is a media library attachment ID.
 * The .svg file is fetched via get_attached_file() (a local disk path) and
 * sanitised with wp_kses() before inlining. Operators CANNOT paste raw SVG
 * markup into the block — the editor forces a media library upload.
 *
 * SGS-BEM naming:
 *   .sgs-responsive-logo              — root wrapper
 *   .sgs-responsive-logo__link        — home link (when linkToHome = true)
 *   .sgs-responsive-logo__picture     — <picture> element
 *   .sgs-responsive-logo__image--desktop / --tablet / --mobile — img elements
 *   .sgs-responsive-logo__svg         — inline SVG wrapper (animation mode)
 *   .sgs-responsive-logo--animate-draw / --animate-hover / --animate-scroll
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ---------------------------------------------------------------------------
// Security sanitisers (no-inline contract §D) — mirrors sgs/label/render.php.
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ── Attribute extraction ──────────────────────────────────────────────────────

$desktop_logo_id  = isset( $attributes['desktopLogoId'] ) ? absint( $attributes['desktopLogoId'] ) : 0;
$tablet_logo_id   = isset( $attributes['tabletLogoId'] ) ? absint( $attributes['tabletLogoId'] ) : 0;
$mobile_logo_id   = isset( $attributes['mobileLogoId'] ) ? absint( $attributes['mobileLogoId'] ) : 0;
$svg_animation_id = isset( $attributes['svgAnimationSource'] ) ? absint( $attributes['svgAnimationSource'] ) : 0;
$animation_style  = isset( $attributes['animationStyle'] ) ? sanitize_key( $attributes['animationStyle'] ) : 'none';
$width            = isset( $attributes['width'] ) ? absint( $attributes['width'] ) : 240;
$link_to_home     = isset( $attributes['linkToHome'] ) ? (bool) $attributes['linkToHome'] : true;
$alt              = isset( $attributes['alt'] ) ? sanitize_text_field( $attributes['alt'] ) : '';

// Validate animationStyle against allowed values.
$allowed_animation_styles = array( 'none', 'draw-on-load', 'hover-redraw', 'scroll-trigger' );
if ( ! in_array( $animation_style, $allowed_animation_styles, true ) ) {
	$animation_style = 'none';
}

// ── Early exit: nothing to render ────────────────────────────────────────────

// ── Resolve image URLs ────────────────────────────────────────────────────────
// When no desktop logo is set on the block, fall back to the WP site's default
// custom logo (Appearance → Customise → Site Identity → Logo). Operators who
// upload a single logo via the Customiser get all three breakpoints pointing
// at it automatically. Per Bean's directive 2026-05-20.

if ( 0 === $desktop_logo_id ) {
	$sgs_site_logo_id = (int) get_theme_mod( 'custom_logo', 0 );
	if ( $sgs_site_logo_id > 0 ) {
		$desktop_logo_id = $sgs_site_logo_id;
	} else {
		return;
	}
}

$desktop_url = wp_get_attachment_url( $desktop_logo_id );
if ( ! $desktop_url ) {
	return;
}
$desktop_url = (string) $desktop_url;

$tablet_url = $tablet_logo_id > 0 ? (string) wp_get_attachment_url( $tablet_logo_id ) : '';
$mobile_url = $mobile_logo_id > 0 ? (string) wp_get_attachment_url( $mobile_logo_id ) : '';

// Fall back to desktop when optional slots are empty.
$effective_tablet_url = $tablet_url ? $tablet_url : $desktop_url;
$effective_mobile_url = $mobile_url ? $mobile_url : $desktop_url;

// Alt text falls back to the site name when empty.
if ( '' === $alt ) {
	$alt = get_bloginfo( 'name' );
}

// ── Animation modifier class ──────────────────────────────────────────────────

$animation_modifier = '';
if ( 'draw-on-load' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-draw';
} elseif ( 'hover-redraw' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-hover';
} elseif ( 'scroll-trigger' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-scroll';
}

// ── No-inline scoped box CSS (padding/margin, base + tablet/mobile tiers) ────
// uid is a CLASS (matches sgs/heading/sgs/container/sgs/label scoped pattern);
// the root's ONLY inline declaration remains the pre-existing var-only
// `--logo-width` custom property (allowed by the no-inline contract — CSS
// custom-property VALUES are not property declarations).

$uid      = 'sgs-rl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sel      = '.' . $uid . '.wp-block-sgs-responsive-logo';

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

$scoped_css = array();

// --- Base padding/margin — WP-native style.spacing (skip-serialised) emitted
// scoped via the stable core style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_padding_obj = ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) )
		? $attributes['style']['spacing']['padding']
		: array();
	$base_margin_obj  = ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) )
		? $attributes['style']['spacing']['margin']
		: array();

	if ( ! empty( $base_padding_obj ) || ! empty( $base_margin_obj ) ) {
		$spacing_args = array();
		if ( ! empty( $base_padding_obj ) ) {
			$spacing_args['padding'] = $base_padding_obj;
		}
		if ( ! empty( $base_margin_obj ) ) {
			$spacing_args['margin'] = $base_margin_obj;
		}
		$base_scoped_styles = wp_style_engine_get_styles(
			array( 'spacing' => $spacing_args ),
			array( 'selector' => $sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — SGS custom object attrs, hand-built
// shorthand, scoped @media on the SAME selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

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
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ── Wrapper attributes via get_block_wrapper_attributes() ────────────────────
// KEEPS the pre-existing var-only `--logo-width` inline style (allowed —
// custom-property value, not a property declaration) and adds the scoped uid
// class alongside it.

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'          => 'sgs-responsive-logo' . $animation_modifier . ' ' . $uid,
		'style'          => '--logo-width:' . absint( $width ) . 'px',
		'data-animation' => 'none' !== $animation_style ? esc_attr( $animation_style ) : false,
	)
);

// Remove data-animation when falsy (get_block_wrapper_attributes doesn't strip false values).
if ( 'none' === $animation_style ) {
	$wrapper_attributes = preg_replace( '/\s*data-animation="false"/', '', $wrapper_attributes );
}

// ── SVG inline render (animation mode) ───────────────────────────────────────

$svg_html          = '';
$has_svg_animation = 'none' !== $animation_style && $svg_animation_id > 0;

if ( $has_svg_animation ) {
	$svg_path = get_attached_file( $svg_animation_id );
	if ( $svg_path && file_exists( $svg_path ) ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file, no network call.
		$raw_svg = file_get_contents( $svg_path );
		if ( $raw_svg ) {
			// Sanitise the SVG with wp_kses using the extended SVG element schema.
			// This allows all legitimate SVG drawing elements while stripping
			// script, event handlers, and other XSS vectors.
			$svg_html = wp_kses( $raw_svg, sgs_svg_kses_allowed_tags() );
		}
	}
}

// ── Build inner markup ────────────────────────────────────────────────────────

ob_start();

if ( $link_to_home ) {
	printf(
		'<a class="sgs-responsive-logo__link" href="%s" rel="home" aria-label="%s">',
		esc_url( home_url( '/' ) ),
		esc_attr( $alt )
	);
}

if ( $has_svg_animation && $svg_html ) {
	// Animation mode: inline SVG for desktop; static images for tablet + mobile.
	echo '<span class="sgs-responsive-logo__svg" aria-hidden="true">';
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised above via wp_kses.
	echo $svg_html;
	echo '</span>';

	// Hidden static images for tablet and mobile (displayed by CSS media queries).
	printf(
		'<picture class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' .
		'<source media="(max-width: 600px)" srcset="%1$s">' .
		'<source media="(max-width: 1024px)" srcset="%2$s">' .
		'<img class="sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager">' .
		'</picture>',
		esc_url( $effective_mobile_url ),
		esc_url( $effective_tablet_url ),
		esc_url( $desktop_url ),
		esc_attr( $alt ),
		absint( $width )
	);
} else {
	// Standard mode: <picture> element with per-breakpoint srcset.
	printf(
		'<picture class="sgs-responsive-logo__picture">' .
		'<source media="(max-width: 600px)" srcset="%1$s">' .
		'<source media="(max-width: 1024px)" srcset="%2$s">' .
		'<img class="sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager" decoding="async">' .
		'</picture>',
		esc_url( $effective_mobile_url ),
		esc_url( $effective_tablet_url ),
		esc_url( $desktop_url ),
		esc_attr( $alt ),
		absint( $width )
	);
}

if ( $link_to_home ) {
	echo '</a>';
}

$inner_html = ob_get_clean();

// ── Scoped CSS output (no-inline contract §A) ────────────────────────────────
// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators intact. Every value reaching $scoped_css is pre-sanitised
// ($sgs_css_length / wp_style_engine_get_styles), so no un-sanitised value
// survives here.

if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
	<?php
endif;

// ── Final output ──────────────────────────────────────────────────────────────

printf(
	'<div %1$s>%2$s</div>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes().
	$inner_html           // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- all child elements escaped above.
);
