<?php
/**
 * Look settings for sgs/gift-order: the panel, the choice tiles and the name and note fields (Spec 27, FR-30-21).
 *
 * The block prints one placeholder that WooCommerce replaces with its React component, so the look is a single scoped
 * `<style>` printed beside it. The block allows one instance per page (`supports.multiple` false), so the selectors
 * start at the component's own classes. Fill, border, corner radius and shadow go through the shared emitters
 * (`sgs_border_element_decls`, `sgs_background_paint_decl`, `sgs_shadow_box_decls`) and the fields through the form's
 * own writer (`SGS\Blocks\Forms\field_own_style_css`). Every attribute is unset by default, so a block that sets none
 * prints nothing.
 *
 * @package SGS\Blocks\Gift_Order
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/forms/field-own-style.php';

if ( ! function_exists( 'sgs_gift_order_element_css' ) ) {
	/**
	 * Fill, border, corner radius and shadow rules for one element of the gift component.
	 *
	 * @param string   $selector Selector of the element.
	 * @param string   $fill     The fill declaration (`sgs_background_paint_decl()`), or ''.
	 * @param array    $border   Result of `sgs_border_element_decls()` for the element.
	 * @param string[] $shadow   Declarations from `sgs_shadow_box_decls()`.
	 * @return string CSS text (may be '').
	 */
	function sgs_gift_order_element_css( string $selector, string $fill, array $border, array $shadow ): string {
		return sgs_emit_tier_decls(
			$selector,
			array(
				'desktop' => array_merge( '' !== $fill ? array( $fill ) : array(), $border['base'], $shadow ),
				'tablet'  => $border['tablet'],
				'mobile'  => $border['mobile'],
			)
		) . implode( '', $border['rules'] );
	}
}

if ( ! function_exists( 'sgs_gift_order_look_css' ) ) {
	/**
	 * The look rules for the gift component.
	 *
	 * @param array $attributes Block attributes.
	 * @return string CSS text without a `<style>` wrapper; '' when nothing is set.
	 */
	function sgs_gift_order_look_css( array $attributes ): string {
		$root  = '.sgs-gift-order';
		$tile  = $root . ' .sgs-gift-order__tile';
		$field = $root . ' .sgs-gift-order__input,' . $root . ' .sgs-gift-order__textarea';

		$css  = sgs_gift_order_element_css(
			$root,
			sgs_background_paint_decl( (string) ( $attributes['giftPanelBackground'] ?? '' ), '' ),
			sgs_border_element_decls( $attributes, 'giftPanel', $root, array( 'colour' => array( 'base' => 'giftPanelBorderColour' ) ) ),
			sgs_shadow_box_decls( (string) ( $attributes['giftPanelShadow'] ?? '' ), (string) ( $attributes['giftPanelShadowColour'] ?? '' ) )
		);
		$css .= sgs_emit_responsive_css(
			$root,
			array(
				array(
					'value'        => $attributes['giftPanelPadding'] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		$css .= sgs_gift_order_element_css(
			$tile,
			sgs_background_paint_decl( (string) ( $attributes['giftTileBackground'] ?? '' ), '' ),
			sgs_border_element_decls( $attributes, 'giftTile', $tile, array( 'colour' => array( 'base' => 'giftTileBorderColour' ) ) ),
			array()
		);

		$css .= sgs_emit_responsive_css(
			$root,
			array(
				array(
					'value'        => $attributes['giftTileMinHeight'] ?? null,
					'css'          => '--sgs-gift-tile-min-height',
					'unit_default' => 'px',
				),
			)
		);

		$selected = array();
		$fill     = sgs_background_paint_decl( (string) ( $attributes['giftTileSelectedBackground'] ?? '' ), '' );
		if ( '' !== $fill ) {
			$selected[] = $fill;
		}
		$edge = sgs_colour_value( (string) ( $attributes['giftTileSelectedBorderColour'] ?? '' ) );
		if ( '' !== $edge ) {
			$selected[] = 'border-color:' . $edge;
		}
		$selected = array_merge( $selected, sgs_shadow_box_decls( (string) ( $attributes['giftTileSelectedShadow'] ?? '' ), (string) ( $attributes['giftTileSelectedShadowColour'] ?? '' ) ) );
		if ( array() !== $selected ) {
			$css .= $tile . '.sgs-gift-order__tile--selected{' . implode( ';', $selected ) . ';}';
		}

		$css .= \SGS\Blocks\Forms\field_own_style_css( $attributes, 'sgs-gift-order', $field );
		$edge = sgs_colour_value( (string) ( $attributes['fieldBorderColour'] ?? '' ) );
		if ( '' !== $edge ) {
			$css .= $field . '{border-color:' . $edge . ';}';
		}
		return $css;
	}
}
