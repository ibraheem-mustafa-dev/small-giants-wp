<?php
/**
 * `sgs/container`: the lines between a grid or flex layout's items (the shared
 * Separators setting, includes/helpers-separators.php).
 *
 * A container's children are arbitrary blocks (their own pseudo-elements may be in
 * use) and a grid is always "up to N columns" (`supports.sgs.intrinsicColumns`), so
 * the item-drawn path cannot be used. Every layout takes the flow path: native gap
 * decorations where the browser has them, the runtime overlay elsewhere. The wrapper
 * calls these two functions and nothing else (class-sgs-container-wrapper.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-separators-css.php';

if ( ! function_exists( 'sgs_container_separators_active' ) ) {
	/**
	 * Whether this container draws any line: a grid or flex layout with a thickness set.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $layout     The resolved layout ('grid', 'flex', 'stack', '').
	 * @param string $block_name The block whose `supports.sgs.separators.separators` says what it offers.
	 * @return bool
	 */
	function sgs_container_separators_active( array $attributes, string $layout, string $block_name = 'sgs/container' ): bool {
		if ( ! in_array( $layout, array( 'grid', 'flex', 'stack' ), true ) ) {
			return false;
		}
		return sgs_separators_active( sgs_separators_normalise( $attributes['separators'] ?? array(), sgs_separators_caps( $block_name ) ) );
	}
}

if ( ! function_exists( 'sgs_container_separators_root' ) ) {
	/**
	 * The class and data attribute the root carries so the runtime fallback finds the list.
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $layout        The resolved layout.
	 * @param bool   $grid_on_inner Whether the grid / flex sits on `.sgs-container__inner`.
	 * @param string $block_name    The block that carries the lines.
	 * @return array { class: string, attrs: array<string,string> }, both empty when nothing draws.
	 */
	function sgs_container_separators_root( array $attributes, string $layout, bool $grid_on_inner, string $block_name = 'sgs/container' ): array {
		if ( ! sgs_container_separators_active( $attributes, $layout, $block_name ) ) {
			return array(
				'class' => '',
				'attrs' => array(),
			);
		}
		$root = sgs_separators_root_attrs( $grid_on_inner ? '> .sgs-container__inner' : 'self' );
		return array(
			'class' => $root['class'],
			'attrs' => array( 'data-sgs-sep-list' => $grid_on_inner ? '> .sgs-container__inner' : 'self' ),
		);
	}
}

if ( ! function_exists( 'sgs_container_separators_css' ) ) {
	/**
	 * The scoped CSS for the container's separators.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $layout     The resolved layout.
	 * @param string $grid_sel   The selector of the element carrying the grid / flex.
	 * @param bool   $container  Also emit @container tier copies (the block's own container-query opt-in).
	 * @param string $block_name The block that carries the lines.
	 * @return string CSS, or '' when nothing draws.
	 */
	function sgs_container_separators_css( array $attributes, string $layout, string $grid_sel, bool $container = false, string $block_name = 'sgs/container' ): string {
		if ( '' === $grid_sel || ! sgs_container_separators_active( $attributes, $layout, $block_name ) ) {
			return '';
		}
		return sgs_separators_css(
			$attributes['separators'],
			array(
				'list'      => $grid_sel,
				'layout'    => 'flow',
				'container' => $container,
				'gap'       => isset( $attributes['gap'] ) && is_array( $attributes['gap'] ) ? $attributes['gap'] : array(),
			),
			sgs_separators_caps( $block_name )
		);
	}
}
