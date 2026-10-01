<?php
/**
 * `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`: the lines between their items (the
 * shared Separators setting, includes/helpers-separators.php), one emitter for both
 * blocks and both lists each block carries:
 *
 *   `separators`         the top-level items. On the bar they sit side by side, so the
 *                        line is vertical (a `column` line), drawn by the items and not
 *                        in the bar's drawer copy. In the drawer they are stacked rows
 *                        (a `row` line); with `listColumns` the list is a column-major
 *                        grid, which takes the flow path (native gap decorations, with
 *                        the runtime overlay elsewhere) because the items no longer run
 *                        in one line.
 *   `submenuSeparators`  the rows of an open submenu: a dropdown panel on the bar, a
 *                        nested section in the drawer. Always stacked, always item-drawn.
 *
 * The item gap is the `--sgs-nm-gap` custom property the shared root-box emitter
 * writes per device (nav-menu-submenu-link-css.php), so every line centres in the gap
 * at every tier. A drawer row's "pointing at it" heads are its link, its split-row
 * link and its expander summary, so the hover colour (or sweep) fires from any of them.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-separators-css.php';

if ( ! function_exists( 'sgs_nav_menu_separators_caps' ) ) {
	/**
	 * What each list offers (mirrors block.json `supports.sgs.separators`).
	 *
	 * @param string $bem_root   'sgs-nav-bar-menu' or 'sgs-nav-drawer-menu'.
	 * @param string $attribute  'separators' or 'submenuSeparators'.
	 * @return array Capabilities for sgs_separators_normalise().
	 */
	function sgs_nav_menu_separators_caps( string $bem_root, string $attribute ): array {
		if ( 'submenuSeparators' === $attribute ) {
			return array(
				'axes'  => array( 'row' ),
				'edges' => false,
				'hover' => true,
				'sweep' => false,
			);
		}
		$is_bar = 'sgs-nav-bar-menu' === $bem_root;
		return array(
			'axes'  => $is_bar ? array( 'column' ) : array( 'row' ),
			'edges' => ! $is_bar,
			'hover' => true,
			'sweep' => true,
		);
	}
}

if ( ! function_exists( 'sgs_nav_menu_separators_grid' ) ) {
	/**
	 * Whether the drawer's top-level list is a multi-column grid (`listColumns` set).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $bem_root   BEM root.
	 * @return bool
	 */
	function sgs_nav_menu_separators_grid( array $attributes, string $bem_root ): bool {
		return 'sgs-nav-drawer-menu' === $bem_root && is_array( $attributes['listColumns'] ?? null ) && ! empty( $attributes['listColumns'] );
	}
}

if ( ! function_exists( 'sgs_nav_menu_separators_css' ) ) {
	/**
	 * The CSS for both lists of one nav block.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $bem_root   'sgs-nav-bar-menu' or 'sgs-nav-drawer-menu'.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_separators_css( array $attributes, string $uid_sel, string $bem_root ): string {
		$is_bar = 'sgs-nav-bar-menu' === $bem_root;
		$gap    = 'var(--sgs-nm-gap, 8px)';
		$bar    = $uid_sel . ' .' . $bem_root . '__bar';
		$css    = '';

		if ( $is_bar ) {
			$css .= sgs_separators_css(
				$attributes['separators'] ?? array(),
				array(
					'list'      => $bar . ':not(.' . $bem_root . '__bar--drawer)',
					'layout'    => 'line',
					'item'      => $bar . ':not(.' . $bem_root . '__bar--drawer) > .' . $bem_root . '__item',
					'direction' => 'row',
					'gap_expr'  => array( 'column' => $gap ),
				),
				sgs_nav_menu_separators_caps( $bem_root, 'separators' )
			);
		} elseif ( sgs_nav_menu_separators_grid( $attributes, $bem_root ) ) {
			$css .= sgs_separators_css(
				$attributes['separators'] ?? array(),
				array(
					'list'     => $bar,
					'layout'   => 'flow',
					'gap_expr' => array(
						'row'    => $gap,
						'column' => $gap,
					),
				),
				sgs_nav_menu_separators_caps( $bem_root, 'separators' )
			);
		} else {
			$css .= sgs_separators_css(
				$attributes['separators'] ?? array(),
				array(
					'list'      => $bar,
					'layout'    => 'line',
					'item'      => $bar . ' > .' . $bem_root . '__item',
					'direction' => 'column',
					'gap_expr'  => array( 'row' => $gap ),
					'heads'     => array(
						'> .' . $bem_root . '__link',
						'> .' . $bem_root . '__accordion-row > .' . $bem_root . '__link',
						'> .' . $bem_root . '__accordion-row > .' . $bem_root . '__accordion > .' . $bem_root . '__accordion-summary',
					),
				),
				sgs_nav_menu_separators_caps( $bem_root, 'separators' )
			);
		}

		// The rows of an open submenu: stacked touching rows, so the gap is zero.
		$submenu = $uid_sel . ' .' . $bem_root . '__submenu';
		$css    .= sgs_separators_css(
			$attributes['submenuSeparators'] ?? array(),
			array(
				'list'      => $submenu,
				'layout'    => 'line',
				'item'      => $submenu . ' > .' . $bem_root . '__subitem',
				'direction' => 'column',
				'gap_expr'  => array( 'row' => '0px' ),
				'heads'     => array( '> .' . $bem_root . '__sublink' ),
			),
			sgs_nav_menu_separators_caps( $bem_root, 'submenuSeparators' )
		);
		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_menu_separators_root' ) ) {
	/**
	 * The class and data attribute the drawer root carries when its list is a grid with
	 * lines, so the runtime fallback finds the list. Empty for every other case.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $bem_root   BEM root.
	 * @return array { class: string, attrs: array<string,string> }.
	 */
	function sgs_nav_menu_separators_root( array $attributes, string $bem_root ): array {
		$none = array(
			'class' => '',
			'attrs' => array(),
		);
		if ( ! sgs_nav_menu_separators_grid( $attributes, $bem_root ) ) {
			return $none;
		}
		$n = sgs_separators_normalise( $attributes['separators'] ?? array(), sgs_nav_menu_separators_caps( $bem_root, 'separators' ) );
		if ( ! sgs_separators_active( $n ) ) {
			return $none;
		}
		return array(
			'class' => sgs_separators_marker_class(),
			'attrs' => array( 'data-sgs-sep-list' => '.' . $bem_root . '__bar' ),
		);
	}
}
