<?php
/**
 * Mini-cart panel scoped CSS (FR-36-19): the panel's own typography, colours,
 * per-device lengths, padding boxes, shadow and motion settings.
 *
 * Required from helpers-cart-panel.php, which builds the panel markup this CSS
 * targets.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Scoped CSS for the mini-cart panel's own settings (typography, colours,
 * per-device lengths, padding boxes, shadow, motion), for flyout and drawer.
 *
 * Every selector is `.{uid}.sgs-cart__panel …` — the panel element itself carries
 * the uid class (see sgs_cart_panel_wrapper_html()), so these rules keep matching
 * after the nav store re-parents the drawer dialog to <body>. Defaults live in
 * style.css inside :where(), so an attribute here always wins.
 *
 * @param array  $attributes Block attributes.
 * @param string $uid        The block instance's scoped-styling class.
 * @param bool   $is_drawer  Whether the effective display mode is the drawer.
 * @return string[] CSS rule strings (no <style> wrapper).
 */
function sgs_cart_panel_css( array $attributes, string $uid, bool $is_drawer ): array {
	$p   = '.' . $uid . '.sgs-cart__panel';
	$css = array();

	$colour = static function ( string $key ) use ( $attributes ): string {
		$value = isset( $attributes[ $key ] ) ? trim( (string) $attributes[ $key ] ) : '';
		return '' === $value ? '' : sgs_colour_value( $value );
	};
	$tier   = static function ( string $sel, string $key, array $props, bool $box = false ) use ( $attributes ): string {
		if ( ! is_array( $attributes[ $key ] ?? null ) || array() === $attributes[ $key ] ) {
			return '';
		}
		$specs = array();
		foreach ( $props as $prop ) {
			$specs[] = array(
				'value'        => $attributes[ $key ],
				'css'          => $prop,
				'box'          => $box,
				'unit_default' => 'px',
			);
		}
		return sgs_emit_responsive_css( $sel, $specs );
	};

	// Typography — one prefix per text element, through the shared helper.
	$typography = array(
		'panelTitle'       => '.sgs-cart__panel-heading',
		'panelCount'       => '.sgs-cart__panel-count',
		'panelEmpty'       => '.sgs-cart__panel-empty',
		'emptyMessage'     => '.sgs-cart__panel-empty-message',
		'emptyCta'         => '.sgs-cart__panel-empty-cta',
		'itemBrand'        => '.sgs-cart__item-brand',
		'itemName'         => '.sgs-cart__item-name',
		'itemDetail'       => '.sgs-cart__item-details',
		'itemPrice'        => '.sgs-cart__item-price',
		'itemAction'       => '.sgs-cart__item-action',
		'subtotal'         => '.sgs-cart__panel-subtotal',
		'freeDeliveryText' => '.sgs-cart__free-delivery-text',
		'checkout'         => '.sgs-cart__panel-checkout',
		'panelNote'        => '.sgs-cart__panel-note',
	);
	foreach ( $typography as $prefix => $sel ) {
		$rule = sgs_typography_css_rule( $attributes, $prefix, $p . ' ' . $sel );
		if ( '' !== $rule ) {
			$css[] = $rule;
		}
	}

	// Single-property colour rules: attribute => [ selector, property ].
	$paints = array(
		'panelCountColour'       => array( '.sgs-cart__panel-count', 'color' ),
		'panelCloseColour'       => array( '.sgs-cart__panel-close', 'color' ),
		'panelFooterBg'          => array( '.sgs-cart__panel-footer', 'background-color' ),
		'panelHeadBorderColour'  => array( '.sgs-cart__panel-header', 'border-bottom-color' ),
		'panelFooterBorderColour' => array( '.sgs-cart__panel-footer', 'border-top-color' ),
		'panelEmptyColour'       => array( '.sgs-cart__panel-empty', 'color' ),
		'emptyMessageColour'     => array( '.sgs-cart__panel-empty-message', 'color' ),
		'emptyCtaBg'             => array( '.sgs-cart__panel-empty-cta', 'background-color' ),
		'emptyCtaColour'         => array( '.sgs-cart__panel-empty-cta', 'color' ),
		'itemThumbBg'            => array( '.sgs-cart__item-thumb', 'background-color' ),
		'itemBrandColour'        => array( '.sgs-cart__item-brand', 'color' ),
		'itemDetailColour'       => array( '.sgs-cart__item-details', 'color' ),
		'itemRemoveColour'       => array( '.sgs-cart__item-remove--text', 'color' ),
		'itemRemoveBorderColour' => array( '.sgs-cart__item-remove--text', 'border-bottom-color' ),
		// Both per-item text actions share one colour control. The second
		// selector repeats $p because these are emitted as `$p . ' ' . $sel`
		// (see the $paints loop below) — a bare comma would leave the second
		// half unscoped and paint every cart on the page.
		'itemActionColour'       => array( '.sgs-cart__item-save-for-later,' . $p . ' .sgs-cart__item-add-options', 'color' ),
		'itemActionBorderColour' => array( '.sgs-cart__item-save-for-later,' . $p . ' .sgs-cart__item-add-options', 'border-bottom-color' ),
		'subtotalLabelColour'    => array( '.sgs-cart__panel-subtotal', 'color' ),
		'subtotalValueColour'    => array( '.sgs-cart__panel-subtotal-value', 'color' ),
		'freeDeliveryTextColour' => array( '.sgs-cart__free-delivery-text', 'color' ),
		'freeDeliveryFillColour' => array( '.sgs-cart__free-delivery-fill', 'background-color' ),
		'freeDeliveryTrackColour' => array( '.sgs-cart__free-delivery-track', 'background-color' ),
		'checkoutBg'             => array( '.sgs-cart__panel-checkout', 'background-color' ),
		'checkoutColour'         => array( '.sgs-cart__panel-checkout', 'color' ),
		'panelNoteColour'        => array( '.sgs-cart__panel-note', 'color' ),
	);
	foreach ( $paints as $key => $target ) {
		$value = $colour( $key );
		if ( '' !== $value ) {
			$css[] = $p . ' ' . $target[0] . '{' . $target[1] . ':' . $value . ';}';
		}
	}
	// The line between item rows: the shared Separators setting, drawn by the rows
	// themselves (helpers-separators-line-css.php) in the space `panelBodyGap` sets.
	$css[] = sgs_separators_css(
		$attributes['separators'] ?? array(),
		array(
			'list'      => $p . ' .sgs-cart__panel-items',
			'layout'    => 'line',
			'item'      => $p . ' .sgs-cart__panel-items > .sgs-cart__item',
			'direction' => 'column',
			'gap'       => is_array( $attributes['panelBodyGap'] ?? null ) && $attributes['panelBodyGap'] ? $attributes['panelBodyGap'] : array(),
			'gap_expr'  => is_array( $attributes['panelBodyGap'] ?? null ) && $attributes['panelBodyGap'] ? array() : array( 'row' => '16px' ),
		),
		array(
			'axes'  => array( 'row' ),
			'edges' => false,
			'hover' => false,
			'sweep' => false,
		)
	);
	// Checkout hover and keyboard focus (touch-safe pair).
	$hover = array_filter(
		array(
			'' !== $colour( 'checkoutBgHover' ) ? 'background-color:' . $colour( 'checkoutBgHover' ) : '',
			'' !== $colour( 'checkoutColourHover' ) ? 'color:' . $colour( 'checkoutColourHover' ) : '',
		)
	);
	if ( $hover ) {
		$css[] = sgs_hover_state_rules( $p . ' .sgs-cart__panel-checkout', implode( ';', $hover ) );
	}

	// Per-device lengths (tier objects) and padding/margin boxes.
	$tiers = array(
		array( '', 'panelMaxWidth', array( 'max-width' ) ),
		array( ' .sgs-cart__panel-items', 'panelBodyGap', array( 'gap' ) ),
		array( ' .sgs-cart__panel-items', 'itemThumbSize', array( '--sgs-cart-item-thumb' ) ),
		array( ' .sgs-cart__item', 'itemGap', array( 'gap' ) ),
		array( ' .sgs-cart__panel-close svg', 'panelCloseSize', array( 'width', 'height' ) ),
		array( ' .sgs-cart__panel-empty-message', 'emptyMessageGap', array( 'margin-bottom' ) ),
		array( ' .sgs-cart__free-delivery-track', 'freeDeliveryTrackHeight', array( 'height' ) ),
		array( ' .sgs-cart__panel-checkout', 'checkoutMinHeight', array( 'min-height' ) ),
	);
	foreach ( $tiers as $row ) {
		$css[] = $tier( $p . $row[0], $row[1], $row[2] );
	}
	$boxes = array(
		array( ' .sgs-cart__panel-header', 'panelHeadPadding', 'padding' ),
		array( ' .sgs-cart__panel-items', 'panelBodyPadding', 'padding' ),
		array( ' .sgs-cart__panel-footer', 'panelFooterPadding', 'padding' ),
		array( ' .sgs-cart__panel-empty', 'panelEmptyPadding', 'padding' ),
		array( ' .sgs-cart__panel-empty-cta', 'emptyCtaPadding', 'padding' ),
		array( ' .sgs-cart__free-delivery-track', 'freeDeliveryBarMargin', 'margin' ),
	);
	foreach ( $boxes as $row ) {
		$css[] = $tier( $p . $row[0], $row[1], array( $row[2] ), true );
	}

	// Corner radii — plain CSS-length strings.
	$radii = array(
		'itemThumbRadius'         => '.sgs-cart__item-thumb',
		'emptyCtaRadius'          => '.sgs-cart__panel-empty-cta',
		'checkoutRadius'          => '.sgs-cart__panel-checkout,' . $p . ' .sgs-cart__panel-view',
		'freeDeliveryTrackRadius' => '.sgs-cart__free-delivery-track',
	);
	foreach ( $radii as $key => $sel ) {
		$radius = sgs_css_length_value( (string) ( $attributes[ $key ] ?? '' ) );
		if ( '' !== $radius ) {
			$css[] = $p . ' ' . $sel . '{border-radius:' . $radius . ';}';
		}
	}

	// Panel shadow (ShadowControl: shape + colour).
	$shadow = sgs_shadow_box_decls( (string) ( $attributes['panelShadow'] ?? '' ), (string) ( $attributes['panelShadowColour'] ?? '' ) );
	if ( $shadow ) {
		$css[] = $p . '{' . implode( ';', $shadow ) . ';}';
	}

	// Drawer slide-in motion (duration and easing only; the keyframes are in style.css).
	if ( $is_drawer ) {
		$motion = array();
		if ( is_numeric( $attributes['panelSlideDuration'] ?? null ) && (float) $attributes['panelSlideDuration'] > 0 ) {
			$motion[] = 'animation-duration:' . sgs_motion_ms( $attributes['panelSlideDuration'], 250 ) . 'ms';
		}
		if ( '' !== (string) ( $attributes['panelSlideEasing'] ?? '' ) ) {
			$motion[] = 'animation-timing-function:' . sgs_motion_easing_css( (string) $attributes['panelSlideEasing'], (string) ( $attributes['panelSlideEasingCustom'] ?? '' ), 'ease-out' );
		}
		if ( $motion ) {
			$css[] = $p . '[open]{' . implode( ';', $motion ) . ';}';
		}
	}

	return array_values( array_filter( $css ) );
}
