<?php
/**
 * The sgs/site-header "Float over the page" (`headerPassThrough`, Wave 3C U-14,
 * family M-52) and the "When the menu collapses to a burger" rules
 * (`sgsCollapseVisibility`, Wave 3C U-10, family M-19).
 *
 * Pass-through: at an ON tier the header is `position:fixed` (it takes no
 * space and stays pinned) and only its STRUCTURE passes clicks — the header
 * root, its rows, the inner content bands and the menu's own frame. Every
 * other block in a row keeps its whole box, and the menu keeps its items,
 * burger and open panels, so only the empty band and the gaps between menu
 * items reach the page underneath (dogstudio: "none on the band, auto on logo
 * and burger"). Keyboard access and landmarks are untouched.
 *
 * Collapse visibility: the header finds the `sgs/nav-bar-menu` that owns its
 * burger and writes `.sgs-hide-collapsed` / `.sgs-only-collapsed` at that
 * menu's `collapsePoint`, read exactly as nav-bar-menu/render.php reads it.
 * One width, one writer, scoped to this header; the drawer (printed on
 * wp_footer, outside the header) is never affected.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-breakpoints.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tier-queries.php';

if ( ! function_exists( 'sgs_header_pass_through_entry' ) ) {
	/**
	 * The pass-through entry for site-header/render.php's
	 * `sgs_merge_tri_state_declarations()` list. It is listed FIRST, so it wins
	 * `position`/`top` over Float and Sticky; Transparent still adds its own
	 * `background`. The admin-bar term exists only while the bar renders.
	 *
	 * @param array $attributes Block attributes.
	 * @return array Merge entry.
	 */
	function sgs_header_pass_through_entry( array $attributes ): array {
		return array(
			'raw'   => isset( $attributes['headerPassThrough'] ) ? $attributes['headerPassThrough'] : array(),
			'props' => array(
				'position' => 'fixed',
				'top'      => 'calc(var(--wp-admin--admin-bar--height, 0px) + var(--sgs-header-float-inset-top, 0px))',
				'left'     => '0',
				'right'    => '0',
			),
		);
	}
}

if ( ! function_exists( 'sgs_header_pass_through_css' ) ) {
	/**
	 * The structural pointer-events pair at the tiers where pass-through is on.
	 *
	 * @param string $root_sel   The header's scoped root selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS.
	 */
	function sgs_header_pass_through_css( string $root_sel, array $attributes ): string {
		$tiers = sgs_resolve_on_tiers( $attributes['headerPassThrough'] ?? array(), 'on', 'off' );
		if ( empty( $tiers ) ) {
			return '';
		}
		$structure = array( '', ' .sgs-site-header-row', ' .sgs-container__inner', ' .sgs-nav-bar-menu', ' .sgs-nav-bar-menu__bar' );
		$leaf      = ':not(.sgs-nav-bar-menu,.sgs-site-header-row,.sgs-container__inner)';
		$live      = array(
			' .sgs-site-header-row>' . $leaf,
			' .sgs-container__inner>' . $leaf,
			' .sgs-nav-bar-menu__item',
			' .sgs-nav-bar-menu__toggle-wrap',
			' .sgs-nav-bar-menu__submenu-wrap',
			' .sgs-nav-bar-menu__mega-panel-wrap',
		);
		$sel       = static function ( array $suffixes ) use ( $root_sel ): string {
			return implode(
				',',
				array_map(
					static function ( $suffix ) use ( $root_sel ) {
						return $root_sel . $suffix;
					},
					$suffixes
				)
			);
		};
		$rules     = $sel( $structure ) . '{pointer-events:none;}' . $sel( $live ) . '{pointer-events:auto;}';
		return sgs_tier_exact_media_css( $tiers, $rules );
	}
}

if ( ! function_exists( 'sgs_header_burger_collapse_point' ) ) {
	/**
	 * The collapse point of the first `sgs/nav-bar-menu` inside these parsed
	 * blocks that owns a burger (`showBurger` not false), or null when none
	 * does. Sanitised as nav-bar-menu/render.php::$sgs_nm_collapse_point.
	 *
	 * @param array $blocks Parsed inner blocks.
	 * @return int|null Collapse point in px.
	 */
	function sgs_header_burger_collapse_point( array $blocks ): ?int {
		foreach ( $blocks as $inner ) {
			if ( ! is_array( $inner ) ) {
				continue;
			}
			$attrs = isset( $inner['attrs'] ) && is_array( $inner['attrs'] ) ? $inner['attrs'] : array();
			if ( 'sgs/nav-bar-menu' === ( $inner['blockName'] ?? '' ) && false !== ( $attrs['showBurger'] ?? true ) ) {
				return isset( $attrs['collapsePoint'] ) ? max( 1, absint( $attrs['collapsePoint'] ) ) : 768;
			}
			if ( ! empty( $inner['innerBlocks'] ) ) {
				$found = sgs_header_burger_collapse_point( $inner['innerBlocks'] );
				if ( null !== $found ) {
					return $found;
				}
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_header_collapse_visibility_css' ) ) {
	/**
	 * The `sgs-hide-collapsed` / `sgs-only-collapsed` rules at this header's
	 * burger-owning menu's collapse point. No such menu: no rules, so every
	 * block shows.
	 *
	 * @param string $root_sel     The header's scoped root selector.
	 * @param array  $parsed_block The header's parsed block.
	 * @return string CSS.
	 */
	function sgs_header_collapse_visibility_css( string $root_sel, array $parsed_block ): string {
		$point = sgs_header_burger_collapse_point( $parsed_block['innerBlocks'] ?? array() );
		if ( null === $point ) {
			return '';
		}
		return '@media (max-width:' . ( $point - 1 ) . 'px){' . $root_sel . ' .sgs-hide-collapsed{display:none !important;}}'
			. '@media (min-width:' . $point . 'px){' . $root_sel . ' .sgs-only-collapsed{display:none !important;}}';
	}
}
