<?php
/**
 * Header stacking order (z-index) — the single writer for sgs/site-header.
 *
 * `zIndex` is a per-tier object, `{ desktop, tablet, mobile }`, each a whole
 * number from 0 to SGS_HEADER_Z_INDEX_MAX or empty (inherit; the framework
 * default is 100). This helper is the ONLY place a header z-index is written:
 * the sticky / float / transparent behaviours in the tri-state merge carry no
 * `z-index` of their own, so a narrower tier can never `revert` it to `auto`.
 *
 * The first header of a request also publishes `--sgs-header-z` on `:root`, so
 * the drawer's stacking scale (which sits in a different DOM subtree, outside the
 * header) can stay below the header whatever value it carries. A page has one
 * header; a second sgs/site-header in the same request keeps its own z-index
 * and does not publish.
 *
 * Nothing is emitted when `zIndex` is empty at every tier, so a header that has
 * never set it renders byte-identical CSS (the base `.sgs-site-header` rule
 * carries the 100).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-breakpoints.php';
require_once __DIR__ . '/helpers-responsive.php';

if ( ! defined( 'SGS_HEADER_Z_INDEX_DEFAULT' ) ) {
	define( 'SGS_HEADER_Z_INDEX_DEFAULT', 100 );
}
if ( ! defined( 'SGS_HEADER_Z_INDEX_MAX' ) ) {
	// Below the WP admin bar's 99999.
	define( 'SGS_HEADER_Z_INDEX_MAX', 99998 );
}

if ( ! function_exists( 'sgs_header_z_index_tiers' ) ) {
	/**
	 * The authored z-index per tier, or null where the tier inherits the default.
	 *
	 * Each tier resolves through the canonical cascade (a narrower tier inherits
	 * the wider one). A non-numeric or out-of-range value is clamped, never
	 * emitted raw.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,int|null> desktop|tablet|mobile => whole number, or null when nothing is authored.
	 */
	function sgs_header_z_index_tiers( $attributes ) {
		$raw   = isset( $attributes['zIndex'] ) ? $attributes['zIndex'] : array();
		$tiers = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$resolved = sgs_resolve_tier( $raw, $tier, null );
			$value    = $resolved['value'];
			if ( null === $value || '' === $value || ! is_numeric( $value ) ) {
				$tiers[ $tier ] = null;
				continue;
			}
			$tiers[ $tier ] = max( 0, min( SGS_HEADER_Z_INDEX_MAX, (int) $value ) );
		}
		return $tiers;
	}
}

if ( ! function_exists( 'sgs_header_z_index_css' ) ) {
	/**
	 * Scoped CSS for the header's z-index, and the `:root` publication of it.
	 *
	 * @param string $selector   The header's uid selector (specificity above `.sgs-site-header`).
	 * @param array  $attributes Block attributes.
	 * @param bool   $publish    Whether this header may publish `--sgs-header-z` (the first header only).
	 * @return string CSS, or '' when no tier carries a value.
	 */
	function sgs_header_z_index_css( $selector, $attributes, $publish = true ) {
		$tiers = sgs_header_z_index_tiers( $attributes );
		if ( null === $tiers['desktop'] && null === $tiers['tablet'] && null === $tiers['mobile'] ) {
			return '';
		}

		$bp_by_tier = array(
			'desktop' => null,
			'tablet'  => SGS_Breakpoints::TABLET_MAX,
			'mobile'  => SGS_Breakpoints::MOBILE_MAX,
		);

		$css  = '';
		$prev = null;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			// A tier with nothing authored keeps the wider tier's value, or the default.
			$value = null !== $tiers[ $tier ] ? $tiers[ $tier ] : ( null === $prev ? SGS_HEADER_Z_INDEX_DEFAULT : $prev );
			if ( $value === $prev || ( null === $prev && SGS_HEADER_Z_INDEX_DEFAULT === $value ) ) {
				$prev = $value;
				continue;
			}
			$decls = 'z-index:' . $value . ';';
			$rule  = $selector . '{' . $decls . '}';
			if ( $publish ) {
				$rule .= ':root{--sgs-header-z:' . $value . ';}';
			}
			$max_width = $bp_by_tier[ $tier ];
			$css      .= null === $max_width ? $rule : '@media (max-width:' . $max_width . 'px){' . $rule . '}';
			$prev      = $value;
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_header_z_index_may_publish' ) ) {
	/**
	 * True for the first header of a request, false afterwards.
	 *
	 * @return bool
	 */
	function sgs_header_z_index_may_publish() {
		static $published = false;
		if ( $published ) {
			return false;
		}
		$published = true;
		return true;
	}
}
