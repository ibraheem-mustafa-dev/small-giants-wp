<?php
/**
 * Connector line style: the one emitter behind `connectorLineStyle`.
 *
 * A connector's line style is a border style (solid, dashed, dotted), picked with the
 * shared BorderStyleControl. The connector's type (process-steps: line, arrow, dots) is a
 * separate attribute. A solid line paints its background (colour or gradient); a dashed or
 * dotted line is a zero-thickness box whose one border side has the width (the other sides are 0), so the
 * browser picks the dash pattern. A gradient cannot be dashed: the style wins.
 *
 * `src/utils/connector-line.js` mirrors this for the editor canvas.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-border-style.php';

if ( ! function_exists( 'sgs_connector_line_style' ) ) {
	/**
	 * Resolve a stored connectorLineStyle to solid, dashed or dotted.
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return string 'solid' when unset or not one of the three.
	 */
	function sgs_connector_line_style( $raw ): string {
		$style = sgs_border_style_keyword( $raw );
		return in_array( $style, array( 'dashed', 'dotted' ), true ) ? $style : 'solid';
	}
}

if ( ! function_exists( 'sgs_connector_line_decls' ) ) {
	/**
	 * Declarations that draw a connector line in the chosen style.
	 *
	 * @param mixed  $line_style Stored connectorLineStyle.
	 * @param string $axis       'horizontal' (a line of height `thickness`, border on top) or 'vertical' (a line of width `thickness`, border on the left).
	 * @param string $colour     Resolved CSS colour, or ''.
	 * @param string $gradient   Resolved CSS gradient, or ''; used by the solid style only.
	 * @param string $thickness  Resolved CSS length, or ''.
	 * @return string[] Declarations without trailing semicolons.
	 */
	function sgs_connector_line_decls( $line_style, string $axis, string $colour, string $gradient, string $thickness ): array {
		$style      = sgs_connector_line_style( $line_style );
		$horizontal = 'vertical' !== $axis;
		$size_prop  = $horizontal ? 'height' : 'width';
		$side       = $horizontal ? 'border-top' : 'border-left';
		$decls      = array();

		if ( 'solid' === $style ) {
			if ( '' !== $colour ) {
				$decls[] = 'background-color:' . $colour;
			}
			if ( '' !== $gradient ) {
				$decls[] = 'background-image:' . $gradient;
			}
			if ( '' !== $thickness ) {
				$decls[] = $size_prop . ':' . $thickness;
			}
			return $decls;
		}

		$decls[] = $size_prop . ':0';
		$decls[] = 'background:none';
		$decls[] = 'border-style:' . $style;
		if ( '' !== $colour ) {
			$decls[] = 'border-color:' . $colour;
		}
		if ( '' !== $thickness ) {
			$decls[] = 'border-width:0';
			$decls[] = $side . '-width:' . $thickness;
		}
		return $decls;
	}
}
