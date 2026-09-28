<?php
/**
 * `sgs/nav-drawer-menu` — G-6 (2026-09-28): the leading ornament's reveal
 * mode. `itemOrnamentRevealMode` ('static' | 'hover-draw', per tier) hides
 * the ornament glyph at rest and reveals it on hover/focus by fading it in
 * and drawing its SVG strokes in sequence (stroke-dashoffset per shape,
 * staggered); `itemOrnamentReserveSpace` keeps the ornament's layout box at
 * rest so the label does not shift indent when the glyph appears.
 *
 * Structural rules (the resting/hover opacity and max-width consuming the
 * custom properties below) live in style.css; this file emits only the
 * per-instance, per-tier values. `require_once`'d by
 * `nav-drawer-menu-extras-css.php`; every function is `function_exists`-
 * guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_menu_ornament_reveal_css' ) ) {
	/**
	 * The ornament's hover-draw reveal CSS fragment.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector.
	 * @param string $link       `{$scope} .sgs-nav-drawer-menu__link`.
	 * @return string CSS.
	 */
	function sgs_nav_drawer_menu_ornament_reveal_css( array $attributes, string $scope, string $link ): string {
		$reveal = is_array( $attributes['itemOrnamentRevealMode'] ?? null ) ? $attributes['itemOrnamentRevealMode'] : array();
		if ( ! in_array( 'hover-draw', $reveal, true ) ) {
			return '';
		}
		$reserve = ! empty( $attributes['itemOrnamentReserveSpace'] );

		$rest_opacity = array();
		$collapse     = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( 'hover-draw' === ( $reveal[ $tier ] ?? null ) ) {
				$rest_opacity[ $tier ] = '0';
				if ( ! $reserve ) {
					$collapse[ $tier ] = '1';
				}
			}
		}

		$css = sgs_emit_responsive_css(
			$scope,
			array(
				array(
					'value'     => $rest_opacity,
					'css'       => '--sgs-ndm-orn-rest-opacity',
					'transform' => static function ( $v ) {
						return (string) $v;
					},
				),
				array(
					'value'     => $collapse,
					'css'       => '--sgs-ndm-orn-collapse',
					'transform' => static function ( $v ) {
						return (string) $v;
					},
				),
			)
		);

		$css .= sgs_nav_drawer_menu_ornament_stroke_draw_css( $reveal, $scope, $link );

		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_ornament_stroke_draw_css' ) ) {
	/**
	 * The stroke-draw itself — a per-path stroke-dashoffset transition,
	 * staggered across up to 4 shapes — gated PER RESOLVED TIER so a device
	 * where itemOrnamentRevealMode resolves to 'static' never receives the
	 * resting dash-offset (which would otherwise hide the whole glyph there,
	 * since the mode only controls the CUSTOM PROPERTIES above, not this
	 * rule). Mirrors sgs_emit_tier_rules_map()'s cascade/minimisation
	 * (§6b default, skip a tier that resolves the same as the tier above)
	 * but is hand-rolled rather than calling that helper directly: this
	 * fragment owns MULTIPLE selectors of its own (not a single declaration
	 * list on the caller's selector) and nests a touch-guarded hover query,
	 * which that helper's single-selector-declarations shape cannot carry —
	 * nesting `@media (hover:hover)` inside `@media (max-width:…)` is invalid
	 * plain CSS, so the width and hover-capability conditions are combined
	 * into ONE `@media` per tier instead.
	 *
	 * @param array  $reveal `itemOrnamentRevealMode`'s tier object.
	 * @param string $scope  The instance scope selector.
	 * @param string $link   `{$scope} .sgs-nav-drawer-menu__link`.
	 * @return string CSS.
	 */
	function sgs_nav_drawer_menu_ornament_stroke_draw_css( array $reveal, string $scope, string $link ): string {
		$glyph_shapes = ' .sgs-nav-drawer-menu__ornament-glyph svg :is(path,line,polyline,polygon,circle,rect,ellipse)';

		// The link's own selector may be a comma list (rare, but sgs_hover_
		// state_rules() supports it) — build the same :hover/:focus-visible
		// pair it would, minus its own unconditional @media wrapper.
		$parts     = array_map( 'trim', explode( ',', trim( $link ) ) );
		$hover_sel = implode(
			',',
			array_map(
				static function ( $part ) use ( $glyph_shapes ) {
					return SGS_HOVER_NOT_TOUCH . ' ' . $part . ':hover' . $glyph_shapes;
				},
				$parts
			)
		);
		$focus_sel = implode(
			',',
			array_map(
				static function ( $part ) use ( $glyph_shapes ) {
					return $part . ':focus-visible' . $glyph_shapes;
				},
				$parts
			)
		);

		$stagger = '';
		foreach ( array( 2, 3, 4 ) as $n ) {
			$delay    = ( $n - 1 ) * 80;
			$stagger .= $scope . $glyph_shapes . ':nth-of-type(' . $n . '){transition-delay:' . $delay . 'ms;}';
		}

		/**
		 * The 'on' fragment — resting dash-offset + the guarded hover/focus
		 * reveal + stagger. `%1$s` is the width condition ('' for desktop,
		 * 'max-width:1023px'/'max-width:767px' for tablet/mobile).
		 */
		$on = static function ( string $width_cond ) use ( $scope, $glyph_shapes, $hover_sel, $focus_sel, $stagger ): string {
			$hover_media = '' === $width_cond ? SGS_HOVER_MEDIA : '@media ' . $width_cond . ' and (hover: hover) and (pointer: fine)';
			$css         = $scope . $glyph_shapes . '{stroke-dasharray:64;stroke-dashoffset:64;transition:stroke-dashoffset 500ms ease;}'
				. $hover_media . '{' . $hover_sel . '{stroke-dashoffset:0;}}'
				. $focus_sel . '{stroke-dashoffset:0;}'
				. $stagger;
			return '' === $width_cond ? $css : '@media ' . $width_cond . '{' . $css . '}';
		};

		// The 'off' fragment — cancels a WIDER tier's dash-offset (e.g.
		// desktop hover-draw, tablet static) so the glyph is fully visible
		// and unanimated there.
		$off = static function ( string $width_cond ) use ( $scope, $glyph_shapes ): string {
			$decl = $scope . $glyph_shapes . '{stroke-dasharray:none;stroke-dashoffset:0;transition:none;}';
			return '' === $width_cond ? $decl : '@media ' . $width_cond . '{' . $decl . '}';
		};

		$desktop = sgs_resolve_tier( $reveal, 'desktop', 'static' );
		$tablet  = sgs_resolve_tier( $reveal, 'tablet', 'static' );
		$mobile  = sgs_resolve_tier( $reveal, 'mobile', 'static' );

		$css = '';
		if ( 'hover-draw' === $desktop['value'] ) {
			$css .= $on( '' );
		}
		if ( $tablet['value'] !== $desktop['value'] ) {
			$css .= 'hover-draw' === $tablet['value']
				? $on( '(max-width: ' . SGS_Breakpoints::TABLET_MAX . 'px)' )
				: $off( '(max-width: ' . SGS_Breakpoints::TABLET_MAX . 'px)' );
		}
		if ( $mobile['value'] !== $tablet['value'] ) {
			$css .= 'hover-draw' === $mobile['value']
				? $on( '(max-width: ' . SGS_Breakpoints::MOBILE_MAX . 'px)' )
				: $off( '(max-width: ' . SGS_Breakpoints::MOBILE_MAX . 'px)' );
		}

		if ( '' === $css ) {
			return '';
		}

		return $css . '@media (prefers-reduced-motion: reduce){' . $scope . ' .sgs-nav-drawer-menu__ornament-glyph,' . $scope . $glyph_shapes . '{transition:none;}}';
	}
}
