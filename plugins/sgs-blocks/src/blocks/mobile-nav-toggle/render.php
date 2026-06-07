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
 * @since 1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icon_size         = (int) ( $attributes['iconSize'] ?? 24 );
$aria_label        = $attributes['ariaLabel'] ?? __( 'Open navigation menu', 'sgs-blocks' );
$popover_target    = $attributes['popoverTarget'] ?? 'sgs-mobile-nav';
$toggle_open_icon  = sanitize_key( $attributes['toggleOpenIcon'] ?? 'menu' );
$toggle_close_icon = sanitize_key( $attributes['toggleCloseIcon'] ?? 'x' );

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'         => 'sgs-mobile-nav-toggle',
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

printf(
	'<button %1$s>%2$s</button>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped.
	$icon_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from sgs_get_lucide_icon() / hardcoded safe strings.
);
