<?php
/**
 * Gap colour: paints the gaps of a grid or flex layout, and nothing else.
 *
 * The lines are CSS gap decorations (`column-rule` / `row-rule` on a grid or
 * flex container), each as wide as its own gap, so the colour fills exactly
 * the space between items. The items stay the only painted surfaces, so an
 * item that animates in shows no colour block behind it first, and nothing
 * paints outside the tracks.
 *
 * Browsers without gap decorations get the classic fallback inside
 * `@supports not (row-rule-style:solid)`: the colour as the grid's own
 * background, which shows through the gaps between opaque items.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_gap_rule_width' ) ) {
	/**
	 * One axis of a gap tier value, as a rule width.
	 *
	 * A gap value is `<row> <column>` or a single length for both. A value
	 * holding a function (`var(--x, 4px)`, `calc(…)`) is used whole for both
	 * axes, since splitting it on whitespace would break it.
	 *
	 * @param mixed  $raw  One tier's gap value.
	 * @param string $axis 'row' or 'column'.
	 * @return string The width, or '' when there is none.
	 */
	function sgs_gap_rule_width( $raw, string $axis ): string {
		$value = trim( (string) $raw );
		if ( '' === $value ) {
			return '';
		}
		if ( false === strpos( $value, '(' ) ) {
			$parts = preg_split( '/\s+/', $value );
			$value = ( 'column' === $axis && isset( $parts[1] ) ) ? $parts[1] : $parts[0];
		}
		if ( is_numeric( $value ) ) {
			$value .= 'px';
		}
		// The same sanitiser as the gap itself (fails closed to '').
		return sgs_responsive_sanitise_css_value( $value );
	}
}

if ( ! function_exists( 'sgs_gap_rule_props' ) ) {
	/**
	 * The per-device rule widths, as specs for sgs_emit_responsive_css().
	 *
	 * @param array $gap The block's `gap` tier object.
	 * @return array[] Two property specs (column-rule-width, row-rule-width).
	 */
	function sgs_gap_rule_props( array $gap ): array {
		return array(
			array(
				'value'     => $gap,
				'css'       => 'column-rule-width',
				'transform' => static function ( $raw ) {
					return sgs_gap_rule_width( $raw, 'column' );
				},
			),
			array(
				'value'     => $gap,
				'css'       => 'row-rule-width',
				'transform' => static function ( $raw ) {
					return sgs_gap_rule_width( $raw, 'row' );
				},
			),
		);
	}
}

if ( ! function_exists( 'sgs_gap_rule_css' ) ) {
	/**
	 * The rule style and colour for one grid/flex selector, plus the fallback.
	 *
	 * @param string $selector The grid or flex container's selector.
	 * @param string $colour   A palette slug or CSS colour.
	 * @return string CSS, or '' when no colour is set.
	 */
	function sgs_gap_rule_css( string $selector, string $colour ): string {
		$value = '' === trim( $colour ) ? '' : sgs_colour_value( $colour );
		if ( '' === $value || '' === $selector ) {
			return '';
		}
		return $selector . '{column-rule-style:solid;row-rule-style:solid;column-rule-color:' . $value . ';row-rule-color:' . $value . ';}'
			. '@supports not (row-rule-style:solid){' . $selector . '{background-color:' . $value . ';}}';
	}
}
