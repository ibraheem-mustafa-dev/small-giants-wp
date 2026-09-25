<?php
/**
 * Exact device-tier query conditions: desktop >= 1024, tablet 768 to 1023,
 * mobile <= 767 (SGS_Breakpoints), with no cascade between tiers, so a rule
 * switched on at one tier needs no reset at another. Used by the header's
 * pass-through (includes/sgs-header-pass-through.php), the menu's surface
 * trigger and detaching chip, and the container's sideways scroller.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-breakpoints.php';

if ( ! function_exists( 'sgs_tier_media_queries' ) ) {
	/**
	 * The exact media condition for each named tier (desktop >= 1024, tablet
	 * 768 to 1023, mobile <= 767), each optionally narrowed by `$extra`.
	 *
	 * @param string[] $tiers Tier names.
	 * @param string   $extra   Extra condition, e.g. '(max-width:1059px)', or ''.
	 * @return string[] Media conditions, in desktop, tablet, mobile order.
	 */
	function sgs_tier_media_queries( array $tiers, string $extra = '' ): array {
		$mobile_max = (int) SGS_Breakpoints::MOBILE_MAX;
		$tablet_max = (int) SGS_Breakpoints::TABLET_MAX;
		$queries    = array(
			'desktop' => '(min-width:' . ( $tablet_max + 1 ) . 'px)',
			'tablet'  => '(min-width:' . ( $mobile_max + 1 ) . 'px) and (max-width:' . $tablet_max . 'px)',
			'mobile'  => '(max-width:' . $mobile_max . 'px)',
		);
		$list       = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( in_array( $tier, $tiers, true ) ) {
				$list[] = $queries[ $tier ] . ( '' !== $extra ? ' and ' . $extra : '' );
			}
		}
		return $list;
	}
}

if ( ! function_exists( 'sgs_tier_exact_media_css' ) ) {
	/**
	 * Wrap `$rules` so they apply at exactly the given tiers, with no cascade
	 * into other tiers. All three tiers and no extra condition: no wrapper.
	 *
	 * @param string[] $tiers Tier names the rules apply at.
	 * @param string   $rules CSS rules.
	 * @param string   $extra   Extra condition every tier's query must also meet.
	 * @return string CSS.
	 */
	function sgs_tier_exact_media_css( array $tiers, string $rules, string $extra = '' ): string {
		$list = sgs_tier_media_queries( $tiers, $extra );
		if ( '' === $rules || empty( $list ) ) {
			return '';
		}
		if ( 3 === count( $list ) && '' === $extra ) {
			return $rules;
		}
		return '@media ' . implode( ',', $list ) . '{' . $rules . '}';
	}
}
