<?php
/**
 * Shared builders for the Cart and Checkout look settings: a card, a text style, and the set-attribute filter.
 *
 * Every rule is built from the framework helpers (sgs_fill_decls, sgs_border_element_decls, sgs_shadow_decls,
 * sgs_typography_css_rule, sgs_emit_responsive_css, sgs_emit_tier_decls); this file only chooses which attribute
 * names to hand them. Breakpoints come from SGS_Breakpoints through those helpers, never from a literal here.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/render-helpers.php';

/**
 * The attributes of a block that carry a value, keyed as stored. An unset attribute (absent, '', null, an empty
 * array) is dropped, so a block with no setting reduces to an empty array and prints nothing.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @return array<string, mixed> The sgs* attributes that are set.
 */
function sgs_commerce_look_set_attrs( array $attrs ): array {
	$set = array();
	foreach ( $attrs as $name => $value ) {
		if ( ! is_string( $name ) || 0 !== strpos( $name, 'sgs' ) ) {
			continue;
		}
		if ( '' === $value || null === $value || false === $value || array() === $value ) {
			continue;
		}
		$set[ $name ] = $value;
	}
	return $set;
}

/**
 * Whether any attribute whose name starts with one of the prefixes is set.
 *
 * @param array<string, mixed> $attrs    Set attributes.
 * @param string[]             $prefixes Name prefixes (for example `sgsItem`).
 * @return bool
 */
function sgs_commerce_look_has_any( array $attrs, array $prefixes ): bool {
	foreach ( array_keys( $attrs ) as $name ) {
		foreach ( $prefixes as $prefix ) {
			if ( 0 === strpos( (string) $name, $prefix ) ) {
				return true;
			}
		}
	}
	return false;
}

/**
 * One card's rules: fill, border (per-device width and corner radius), shadow and per-device padding.
 *
 * @param array<string, mixed> $attrs    Set attributes.
 * @param string               $prefix   Attribute prefix (`sgsItem`, `sgsSummary`, ...).
 * @param string               $selector Scoped selector list of the card.
 * @return string CSS text; '' when nothing is set or the selector is empty.
 */
function sgs_commerce_look_card_css( array $attrs, string $prefix, string $selector ): string {
	if ( '' === $selector ) {
		return '';
	}
	$decls  = sgs_fill_decls( $attrs, array( 'base' => $prefix . 'Background' ) )['normal'];
	$border = sgs_border_element_decls(
		$attrs,
		$prefix,
		$selector,
		array( 'colour' => array( 'base' => $prefix . 'BorderColour' ) )
	);
	$shadow = sgs_shadow_decls(
		$attrs,
		array(
			'base'   => $prefix . 'Shadow',
			'colour' => $prefix . 'ShadowColour',
		)
	);
	$decls  = array_merge( $decls, $border['base'], $shadow['normal'] );

	$css = array() === $decls ? '' : $selector . '{' . implode( ';', $decls ) . ';}';
	$css .= sgs_emit_tier_decls(
		$selector,
		array(
			'tablet' => $border['tablet'],
			'mobile' => $border['mobile'],
		)
	);
	$css .= implode( '', $border['rules'] );
	$css .= sgs_emit_responsive_css(
		$selector,
		array(
			array(
				'value'        => $attrs[ $prefix . 'Padding' ] ?? null,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
	return $css;
}

/**
 * One text style's rules: the typography set under the prefix and its colour.
 *
 * @param array<string, mixed> $attrs    Set attributes.
 * @param string               $prefix   Attribute prefix (`sgsStepTitle`, ...).
 * @param string               $selector Scoped selector list of the text.
 * @return string CSS text; '' when nothing is set or the selector is empty.
 */
function sgs_commerce_look_text_css( array $attrs, string $prefix, string $selector ): string {
	if ( '' === $selector ) {
		return '';
	}
	$css    = (string) sgs_typography_css_rule( $attrs, $prefix, $selector );
	$colour = sgs_colour_value( (string) ( $attrs[ $prefix . 'Colour' ] ?? '' ) );
	if ( '' !== $colour ) {
		$css .= $selector . '{color:' . $colour . ';}';
	}
	return $css;
}
