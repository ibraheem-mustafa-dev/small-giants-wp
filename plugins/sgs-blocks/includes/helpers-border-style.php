<?php
/**
 * Border style resolution — the one rule every SGS border emitter follows.
 *
 * Rule: a border the client gave a width paints SOLID unless they chose
 * another style. An explicit style (dashed, dotted, none …) always wins.
 *
 * Why this is the rule: the style picker (`BorderStyleControl`, a copy of
 * WP core's `BorderControlStylePicker`) offers Solid/Dashed/Dotted and writes
 * '' when the active option is clicked again, exactly as core's picker writes
 * `undefined`. Core then paints that border solid through its
 * `:where([style*=border-width]){border-style:solid}` rule. That rule matches
 * inline styles only, and no SGS block renders an inline style (Spec 32), so
 * this helper is its equivalent for every SGS border.
 *
 * A width is still required before any style is emitted (G5, Bean
 * 2026-08-26): a style with no width would fall through to the browser's
 * initial `medium` (~3px) width. Callers keep that gate; this file only
 * decides WHICH style a width paints with.
 *
 * Editor twin: `src/utils/border-style.js` (same allow-list, same fallback).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';

if ( ! function_exists( 'sgs_border_style_allowed' ) ) {
	/**
	 * Every CSS border-style keyword an SGS border may emit.
	 *
	 * @return string[]
	 */
	function sgs_border_style_allowed(): array {
		return array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
	}
}

if ( ! function_exists( 'sgs_border_style_keyword' ) ) {
	/**
	 * Resolve a stored border-style value to the keyword a width paints with.
	 *
	 * @param mixed $raw Stored style attribute ('' / null when the client never
	 *                   picked one or deselected the active option).
	 * @return string An allow-listed keyword; 'solid' when unset or unknown.
	 */
	function sgs_border_style_keyword( $raw ): string {
		$style = is_string( $raw ) ? strtolower( trim( $raw ) ) : '';
		return in_array( $style, sgs_border_style_allowed(), true ) ? $style : 'solid';
	}
}

if ( ! function_exists( 'sgs_border_box_decls' ) ) {
	/**
	 * Build the border-style + border-width declarations for a 4-side width
	 * box and a stored style.
	 *
	 * Returns an empty array when no side has a width (no border) or when the
	 * client explicitly chose `none`. Unset sides render as `0`, so a border on
	 * some sides never picks up the browser's `medium` width on the others.
	 *
	 * @param mixed $width_box `{top,right,bottom,left}` width object (non-array = empty).
	 * @param mixed $style_raw Stored style attribute.
	 * @return string[] Declarations without trailing semicolons.
	 */
	function sgs_border_box_decls( $width_box, $style_raw ): array {
		$box       = is_array( $width_box ) ? $width_box : array();
		$sides     = array();
		$has_width = false;
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$value = is_scalar( $box[ $side ] ?? null ) ? sgs_css_length_value( $box[ $side ] ) : '';
			if ( '' !== $value ) {
				$has_width = true;
			}
			$sides[] = '' !== $value ? $value : '0';
		}
		$style = sgs_border_style_keyword( $style_raw );
		if ( $has_width && 'none' !== $style ) {
			return array( 'border-style:' . $style, 'border-width:' . implode( ' ', $sides ) );
		}
		return array();
	}
}
