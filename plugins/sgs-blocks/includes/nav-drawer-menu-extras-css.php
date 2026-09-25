<?php
/**
 * `sgs/nav-drawer-menu` — scoped CSS for the Wave 3C U-6 + U-7 row options:
 * the leading ornament (index or glyph, per tier), the expander glyph's open
 * rotation, per-item media, sibling dim, the label roll and the marker colour
 * of an embedded mega panel.
 *
 * The structural rules live in the block's `style.css`, keyed on custom
 * properties; this file emits only the per-instance values (per tier through
 * sgs_emit_responsive_css()) and the hover rules (touch-guarded through the
 * shared hover helpers). `require_once`'d by `nav-drawer-menu-items.php`;
 * every function is `function_exists`-guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_menu_tier_map' ) ) {
	/**
	 * Map a tier object's values through a lookup, dropping unknown values.
	 *
	 * @param mixed $tiers  A `{desktop,tablet,mobile}` object.
	 * @param array $lookup value => CSS value.
	 * @return array The mapped tier object.
	 */
	function sgs_nav_drawer_menu_tier_map( $tiers, array $lookup ): array {
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$v = is_array( $tiers ) ? ( $tiers[ $tier ] ?? null ) : null;
			if ( is_string( $v ) && array_key_exists( $v, $lookup ) ) {
				$out[ $tier ] = $lookup[ $v ];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_extras_css' ) ) {
	/**
	 * The instance CSS for the row options.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector (`.sgs-nav-drawer-menu.{uid}`).
	 * @return string CSS.
	 */
	function sgs_nav_drawer_menu_extras_css( array $attributes, string $scope ): string {
		$css  = '';
		$link = $scope . ' .sgs-nav-drawer-menu__link';
		$emit = static function ( array $specs ) use ( $scope ): string {
			return sgs_emit_responsive_css( $scope, $specs );
		};
		$raw  = static function ( $v ) {
			return (string) $v;
		};

		// Ornament: which kind shows at each tier.
		$ornament = $attributes['itemOrnament'] ?? array();
		$css     .= $emit(
			array(
				array(
					'value'     => sgs_nav_drawer_menu_tier_map(
						$ornament,
						array(
							'none'  => 'none',
							'index' => 'inline-flex',
							'icon'  => 'inline-flex',
						)
					),
					'css'       => '--sgs-ndm-orn-display',
					'transform' => $raw,
				),
				array(
					'value'     => sgs_nav_drawer_menu_tier_map(
						$ornament,
						array(
							'none'  => 'none',
							'index' => 'counter(sgs-ndm-item, decimal-leading-zero)',
							'icon'  => 'none',
						)
					),
					'css'       => '--sgs-ndm-orn-content',
					'transform' => $raw,
				),
				array(
					'value'     => sgs_nav_drawer_menu_tier_map(
						$ornament,
						array(
							'none'  => 'none',
							'index' => 'none',
							'icon'  => 'block',
						)
					),
					'css'       => '--sgs-ndm-orn-glyph',
					'transform' => $raw,
				),
				array(
					'value'     => $attributes['itemOrnamentSize'] ?? array(),
					'css'       => '--sgs-ndm-orn-size',
					'transform' => 'sgs_css_single_length_value',
				),
			)
		);

		$scope_decls = array();
		$gap         = sgs_css_single_length_value( $attributes['itemOrnamentGap'] ?? '' );
		if ( '' !== $gap ) {
			$scope_decls[] = '--sgs-ndm-orn-gap:' . $gap;
		}
		$orn_colour = trim( (string) ( $attributes['itemOrnamentColour'] ?? '' ) );
		if ( '' !== $orn_colour ) {
			$scope_decls[] = '--sgs-ndm-orn-colour:' . sgs_colour_value( $orn_colour );
		}
		if ( is_numeric( $attributes['itemExpanderRotate'] ?? null ) ) {
			$scope_decls[] = '--sgs-ndm-expander-rotate:' . (int) max( -360, min( 360, (float) $attributes['itemExpanderRotate'] ) ) . 'deg';
		}
		$scope_decls[] = '--sgs-ndm-motion:' . sgs_item_motion_transition( $attributes );
		$css          .= $scope . '{' . implode( ';', $scope_decls ) . ';}';

		$orn_hover = trim( (string) ( $attributes['itemOrnamentColourHover'] ?? '' ) );
		if ( '' !== $orn_hover ) {
			$css .= sgs_hover_state_rules( $link, 'color:' . sgs_colour_value( $orn_hover ), ':focus-visible', ' .sgs-nav-drawer-menu__ornament' );
		}
		// The hover glyph crossfades in (lamalama), only when one is set.
		if ( '' !== (string) ( $attributes['itemOrnamentIconHover']['name'] ?? '' ) ) {
			$css .= sgs_hover_state_rules( $link, 'opacity:0', ':focus-visible', ' .sgs-nav-drawer-menu__ornament--swap > .sgs-nav-drawer-menu__ornament-glyph:first-child' );
			$css .= sgs_hover_state_rules( $link, 'opacity:1', ':focus-visible', ' .sgs-nav-drawer-menu__ornament--swap > .sgs-nav-drawer-menu__ornament-glyph--hover' );
		}

		// Media: shown per tier, always or grown on hover.
		if ( 'featured-image' === ( $attributes['itemMedia'] ?? '' ) ) {
			$reveal = $attributes['itemMediaReveal'] ?? array();
			$css   .= $emit(
				array(
					array(
						'value'     => sgs_nav_drawer_menu_tier_map(
							$reveal,
							array(
								'none'   => 'none',
								'always' => 'block',
								'hover'  => 'block',
							)
						),
						'css'       => '--sgs-ndm-media-display',
						'transform' => $raw,
					),
					array(
						'value'     => sgs_nav_drawer_menu_tier_map(
							$reveal,
							array(
								'none'   => 'initial',
								'always' => 'initial',
								'hover'  => '0px',
							)
						),
						'css'       => '--sgs-ndm-media-rest',
						'transform' => $raw,
					),
					array(
						'value'     => $attributes['itemMediaWidth'] ?? array(),
						'css'       => '--sgs-ndm-media-w',
						'transform' => 'sgs_css_single_length_value',
					),
					array(
						'value'     => $attributes['itemMediaHeight'] ?? array(),
						'css'       => '--sgs-ndm-media-h',
						'transform' => 'sgs_css_single_length_value',
					),
				)
			);
			$radius = sgs_css_single_length_value( $attributes['itemMediaRadius'] ?? '' );
			if ( '' !== $radius ) {
				$css .= $scope . ' .sgs-nav-drawer-menu__media{border-radius:' . $radius . ';}';
			}
			$css .= sgs_hover_state_rules(
				$link,
				'width:var(--sgs-ndm-media-w, 160px);height:var(--sgs-ndm-media-h, 112px);margin-inline-start:0.75em',
				':focus-visible',
				' .sgs-nav-drawer-menu__media'
			);
		}

		// An embedded mega panel's list markers follow the drawer's sub-item
		// marker colour (design 3a, "Markers follow the drawer").
		$marker = trim( (string) ( $attributes['sublinkMarkerColour'] ?? '' ) );
		if ( '' !== $marker ) {
			$css .= $scope . ' .sgs-nav-drawer-menu__mega-body{--sgs-list-marker-colour:' . sgs_colour_value( $marker ) . ';}';
		}

		$css .= sgs_sibling_dim_css( $scope . ' .sgs-nav-drawer-menu__bar', '.sgs-nav-drawer-menu__item', ' .sgs-nav-drawer-menu__link', $attributes );
		$css .= sgs_label_roll_css( $scope, ' .sgs-nav-drawer-menu__link', '', $attributes );

		return $css;
	}
}
