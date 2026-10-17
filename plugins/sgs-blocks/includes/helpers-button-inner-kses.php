<?php
/**
 * The tags and attributes an sgs/button's inner markup (icon SVG, label, note) may carry through wp_kses().
 *
 * The SVG portion is a narrow allowlist for the static Lucide icons, independent of the icon renderer's own
 * `$allowed_svg` list in src/blocks/button/render.php, which follows the same rationale.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_button_inner_allowed_html' ) ) {
	/**
	 * The wp_kses() allowlist for the button's inner markup.
	 *
	 * @return array<string,array<string,bool>>
	 */
	function sgs_button_inner_allowed_html(): array {
		return array_merge(
			wp_kses_allowed_html( 'post' ),
			array(
				'svg'      => array(
					'xmlns'           => true,
					'width'           => true,
					'height'          => true,
					'viewbox'         => true,
					'fill'            => true,
					'stroke'          => true,
					'stroke-width'    => true,
					'stroke-linecap'  => true,
					'stroke-linejoin' => true,
					'class'           => true,
					'aria-hidden'     => true,
					'focusable'       => true,
					'role'            => true,
				),
				'path'     => array(
					'd'      => true,
					'fill'   => true,
					'stroke' => true,
				),
				'circle'   => array(
					'cx'     => true,
					'cy'     => true,
					'r'      => true,
					'fill'   => true,
					'stroke' => true,
				),
				'line'     => array(
					'x1' => true,
					'y1' => true,
					'x2' => true,
					'y2' => true,
				),
				'polyline' => array( 'points' => true ),
				'polygon'  => array( 'points' => true ),
				'rect'     => array(
					'x'      => true,
					'y'      => true,
					'width'  => true,
					'height' => true,
					'rx'     => true,
					'ry'     => true,
				),
				'title'    => array(),
				'span'     => array(
					'class' => true,
					'style' => true,
				),
			)
		);
	}
}
