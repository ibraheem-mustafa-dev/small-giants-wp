<?php
/**
 * The tags and attributes an sgs/button's inner markup (icon SVG, label, note) may carry through wp_kses().
 *
 * The SVG portion is sgs_button_icon_svg_allowed(), which the icon renderer in src/blocks/button/render.php uses
 * too.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-svg-kses.php';

if ( ! function_exists( 'sgs_button_icon_svg_allowed' ) ) {
	/**
	 * The wp_kses() allowlist for the button's icon SVG: a narrow set of tags (shapes and a title, never
	 * <use>, <defs>, filters, masks, gradients or animation), each with the attributes the shared
	 * sgs_svg_kses_allowed_tags() gives that tag, so a custom icon keeps its presentation attributes
	 * (stroke-width, stroke-linecap, fill on a shape) exactly as every other inline-SVG surface does.
	 *
	 * @return array<string,array<string,bool>>
	 */
	function sgs_button_icon_svg_allowed(): array {
		$shared  = sgs_svg_kses_allowed_tags();
		$allowed = array();
		foreach ( array( 'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'title' ) as $tag ) {
			$allowed[ $tag ] = $shared[ $tag ] ?? array();
		}
		return $allowed;
	}
}

if ( ! function_exists( 'sgs_button_inner_allowed_html' ) ) {
	/**
	 * The wp_kses() allowlist for the button's inner markup.
	 *
	 * @return array<string,array<string,bool>>
	 */
	function sgs_button_inner_allowed_html(): array {
		return array_merge(
			wp_kses_allowed_html( 'post' ),
			sgs_button_icon_svg_allowed(),
			array(
				'span' => array(
					'class' => true,
					'style' => true,
				),
			)
		);
	}
}
