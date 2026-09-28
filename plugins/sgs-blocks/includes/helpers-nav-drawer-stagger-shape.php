<?php
/**
 * Nav drawer item entrance shape (Spec 36 U-5 item stagger, gap G-4): the
 * AXIS each staggered item travels on and the REVEAL it arrives with.
 *
 * - `itemStaggerAxis` (tier object): `vertical` (default, rise from below or
 *   fall from above by the sign of `itemStaggerDistance`), `start` (from the
 *   inline-start edge) or `end` (from the inline-end edge). Start and end
 *   mirror under RTL through the drawer's `--sgs-nd-dir`.
 * - `itemStaggerReveal`: `translate` (default, the travel plus a fade) or
 *   `clip` (the travel plus a clip reveal, `inset(0 0 100% 0)` to `inset(0)`,
 *   with no fade: the clip is the reveal).
 *
 * Emitted as custom-property VALUES on the drawer root plus the class
 * `sgs-nav-drawer--stagger-shaped`, which switches the item keyframes to the
 * shaped pair in `nav-drawer/style.css`. An untouched drawer (vertical,
 * translate) emits nothing, so the item rules in `nav-drawer-menu/style.css`
 * run exactly as before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

if ( ! function_exists( 'sgs_nav_drawer_stagger_axes' ) ) {
	/**
	 * Every `itemStaggerAxis` tier value, with its (x, y) travel multipliers.
	 *
	 * @return array<string,array{0:int,1:int}>
	 */
	function sgs_nav_drawer_stagger_axes(): array {
		return array(
			'vertical' => array( 0, 1 ),
			'start'    => array( -1, 0 ),
			'end'      => array( 1, 0 ),
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_stagger_shape' ) ) {
	/**
	 * The shaped-entrance CSS and class for one drawer.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The drawer's scoped root selector.
	 * @return array{css:string,classes:array<int,string>}
	 */
	function sgs_nav_drawer_stagger_shape( array $attributes, string $root_sel ): array {
		$axes  = sgs_nav_drawer_stagger_axes();
		$raw   = is_array( $attributes['itemStaggerAxis'] ?? null ) ? $attributes['itemStaggerAxis'] : array();
		$decls = array();
		$bent  = false;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$axis           = (string) sgs_resolve_tier( $raw, $tier, 'vertical' )['value'];
			$axis           = isset( $axes[ $axis ] ) ? $axis : 'vertical';
			$bent           = $bent || 'vertical' !== $axis;
			$decls[ $tier ] = '--sgs-nd-stagger-ax:' . $axes[ $axis ][0] . ';--sgs-nd-stagger-ay:' . $axes[ $axis ][1] . ';';
		}

		$clip = 'clip' === ( $attributes['itemStaggerReveal'] ?? 'translate' );
		if ( ! $bent && ! $clip ) {
			return array(
				'css'     => '',
				'classes' => array(),
			);
		}

		$base = $decls['desktop'];
		if ( $clip ) {
			$base .= '--sgs-nd-stagger-clip:inset(0 0 100% 0);--sgs-nd-stagger-clip-end:inset(0);--sgs-nd-stagger-from-opacity:1;';
		}
		$css = $root_sel . '{' . $base . '}';
		if ( $decls['tablet'] !== $decls['desktop'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $root_sel . '{' . $decls['tablet'] . '}}';
		}
		if ( $decls['mobile'] !== $decls['tablet'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $root_sel . '{' . $decls['mobile'] . '}}';
		}

		return array(
			'css'     => $css,
			'classes' => array( 'sgs-nav-drawer--stagger-shaped' ),
		);
	}
}
