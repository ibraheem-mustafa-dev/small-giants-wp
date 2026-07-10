<?php
/**
 * Server-side render for the SGS Mobile Nav Toggle block.
 *
 * Renders a <button> with the Popover API `popovertarget` attribute pointing
 * at the target popover element (default: the sgs/mobile-nav drawer).
 *
 * The open icon is shown by default. The close icon is revealed by JS/CSS
 * when the nav drawer is open (via `aria-expanded` toggling on the button
 * and a CSS rule that swaps `.sgs-mobile-nav-toggle__open` /
 * `.sgs-mobile-nav-toggle__close` visibility).
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered <button> carries ZERO inline CSS property declarations. The
 * only inline attribute is `--sgs-toggle-icon-size`, a CSS custom-property
 * VALUE (not a property declaration) — explicitly allowed by the contract.
 * The `color`/`spacing` WP supports declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them;
 * every declaration is emitted into the block's own scoped `.{uid}` <style>
 * tag instead (mirrors sgs/label/sgs/heading).
 *
 * BOX-GROUP (contract §B): base `padding`/`margin` stay WP-native
 * style.spacing.* objects (skip-serialised, scoped via
 * wp_style_engine_get_styles). `paddingTablet`/`paddingMobile`/
 * `marginTablet`/`marginMobile` are SGS custom object attrs (this block has
 * no native responsive spacing support), scoped @media 1023/767 on the same
 * selector. Not pill-gated — this block has no style variants.
 *
 * The `@media (max-width:782px)` show/hide rule in style.css is a separate,
 * FUNCTIONAL nav-visibility breakpoint (not the device-tier box system) and
 * is left untouched.
 *
 * @since 1.0.0
 * @since 2026-07-10  No-inline migration (scoped colour/spacing output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — CSS-length sanitiser for box values
// (mirrors sgs/label/sgs/heading/sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$icon_size         = (int) ( $attributes['iconSize'] ?? 24 );
$aria_label        = $attributes['ariaLabel'] ?? __( 'Open navigation menu', 'sgs-blocks' );
$popover_target    = $attributes['popoverTarget'] ?? 'sgs-mobile-nav';
$toggle_open_icon  = sanitize_key( $attributes['toggleOpenIcon'] ?? 'menu' );
$toggle_close_icon = sanitize_key( $attributes['toggleCloseIcon'] ?? 'x' );

// WP-native style.spacing.padding / style.spacing.margin (skip-serialised —
// NOT auto-inlined by get_block_wrapper_attributes()).
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

// Tiers — SGS custom object attrs, hand-built shorthand, not pill-gated.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support (text only — background is disabled for this block).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly. uid is a CLASS (mirrors sgs/label/sgs/heading —
// every scoped rule targets `.{uid}.wp-block-sgs-mobile-nav-toggle`).
// ---------------------------------------------------------------------------

$uid      = 'sgs-mnt-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-mobile-nav-toggle';

$scoped_css = array();

// --- Base padding + margin (WP-native, skip-serialised) via the stable core
// style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) && ( ! empty( $base_padding_obj ) || ! empty( $base_margin_obj ) ) ) {
	$spacing_args = array();
	if ( ! empty( $base_padding_obj ) ) {
		$spacing_args['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$spacing_args['margin'] = $base_margin_obj;
	}
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => $spacing_args ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- WP colour support (skip-serialised) — custom hex/rgb emitted scoped via
// the style engine; preset SLUGS get the standard has-* classes re-added
// manually in step 4. ---
if ( function_exists( 'wp_style_engine_get_styles' ) && '' !== $style_color_text ) {
	$color_scoped_styles = wp_style_engine_get_styles(
		array( 'color' => array( 'text' => $style_color_text ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $color_scoped_styles['css'] ) ) {
		$scoped_css[] = $color_scoped_styles['css'];
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
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

// ---------------------------------------------------------------------------
// 4. Build the root element's classes + attributes. uid is a CLASS (matches
// the sgs/label/sgs/heading/sgs/container scoped pattern). The root carries
// NO inline CSS property declarations (contract §A) — only the
// `--sgs-toggle-icon-size` custom-property VALUE, which stays inline.
// ---------------------------------------------------------------------------

$root_classes = array( 'sgs-mobile-nav-toggle', $uid );

if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'         => implode( ' ', $root_classes ),
		'aria-label'    => esc_attr( $aria_label ),
		'aria-expanded' => 'false',
		'popovertarget' => esc_attr( $popover_target ),
		'type'          => 'button',
		'style'         => '--sgs-toggle-icon-size:' . absint( $icon_size ) . 'px',
	)
);

// Retrieve Lucide SVGs; fall back to inline SVG if slug not found.
$open_svg  = sgs_get_lucide_icon( $toggle_open_icon );
$close_svg = sgs_get_lucide_icon( $toggle_close_icon );

if ( ! $open_svg ) {
	$open_svg = sprintf(
		'<svg xmlns="http://www.w3.org/2000/svg" width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
		$icon_size
	);
}

if ( ! $close_svg ) {
	$close_svg = sprintf(
		'<svg xmlns="http://www.w3.org/2000/svg" width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
		$icon_size
	);
}

/*
 * Emit both icons; CSS toggles visibility based on aria-expanded state.
 * - .sgs-mobile-nav-toggle__open  — visible when aria-expanded="false"
 * - .sgs-mobile-nav-toggle__close — visible when aria-expanded="true"
 *
 * Existing instances that were saved before toggleOpenIcon/toggleCloseIcon
 * existed will resolve to the 'menu' / 'x' defaults, preserving the
 * original hamburger appearance.
 */
$icon_html = sprintf(
	'<span class="sgs-mobile-nav-toggle__open" aria-hidden="true">%s</span>' .
	'<span class="sgs-mobile-nav-toggle__close" aria-hidden="true">%s</span>',
	$open_svg,
	$close_svg
);

if ( $scoped_css ) :
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D). Every value reaching
	// $scoped_css is pre-sanitised ($sgs_css_length / wp_style_engine_get_styles),
	// so no un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<?php
printf(
	'<button %1$s>%2$s</button>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped.
	$icon_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from sgs_get_lucide_icon() / hardcoded safe strings.
);
