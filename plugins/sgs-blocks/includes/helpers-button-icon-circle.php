<?php
/**
 * The filled circle behind a button's icon.
 *
 * `iconBackground` (resting fill), `iconBackgroundHover` (hover and focus fill) and
 * `iconShapeSize` (the circle's diameter in px, per device) paint a round chip around the icon
 * glyph, which keeps its own size (`iconSize`). All three empty prints nothing. The circle is 1.8
 * times the icon size until a diameter is set. JS twin for the editor preview:
 * src/blocks/button/icon-circle-preview.js.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-responsive.php';

const SGS_BUTTON_ICON_CIRCLE_SIZE_VAR     = '--sgs-btn-icon-shape-size';
const SGS_BUTTON_ICON_CIRCLE_DEFAULT_SIZE = 'calc(var(--sgs-btn-icon-size,1em)*1.8)';

if ( ! function_exists( 'sgs_button_icon_circle_css' ) ) {
	/**
	 * The scoped CSS rules for the circle behind a button's icon.
	 *
	 * @param string $uid        The button's content-hash class (no leading dot).
	 * @param array  $attributes Block attributes (verbatim).
	 * @return string[] CSS rules to append to the block's scoped stylesheet; empty when neither
	 *                  fill is set.
	 */
	function sgs_button_icon_circle_css( string $uid, array $attributes ): array {
		$fill       = isset( $attributes['iconBackground'] ) ? (string) $attributes['iconBackground'] : '';
		$fill_hover = isset( $attributes['iconBackgroundHover'] ) ? (string) $attributes['iconBackgroundHover'] : '';
		if ( '' === $fill && '' === $fill_hover ) {
			return array();
		}

		$root = ".{$uid}.sgs-button";
		$size = 'var(' . SGS_BUTTON_ICON_CIRCLE_SIZE_VAR . ',' . SGS_BUTTON_ICON_CIRCLE_DEFAULT_SIZE . ')';
		$rule = array(
			'display:inline-flex',
			'align-items:center',
			'justify-content:center',
			'flex:none',
			'box-sizing:border-box',
			'border-radius:50%',
			'width:' . $size,
			'height:' . $size,
		);
		if ( '' !== $fill ) {
			$rule[] = 'background-color:' . sgs_colour_value( $fill );
		}

		$css   = array();
		$css[] = sgs_emit_responsive_css(
			$root,
			array(
				array(
					'value'        => $attributes['iconShapeSize'] ?? array(),
					'css'          => SGS_BUTTON_ICON_CIRCLE_SIZE_VAR,
					'unit_default' => 'px',
					'cast'         => 'int',
				),
			)
		);
		$css[] = $root . ' .sgs-button__icon{' . implode( ';', $rule ) . ';}';
		if ( '' !== $fill_hover ) {
			$css[] = sgs_hover_state_rules( $root, 'background-color:' . sgs_colour_value( $fill_hover ), ':focus-visible', ' .sgs-button__icon' );
		}
		return array_values( array_filter( $css ) );
	}
}
