<?php
/**
 * The carousel dots kit's CSS: one emitter for the look settings a slider block declares in `supports.sgs.carouselDots`.
 *
 * `src/components/carousel-dots/registry.json` is the attribute set (`scripts/generate-carousel-dots-attributes.mjs` writes
 * it into block.json) and `src/components/CarouselDotsPanel.js` is the editor panel. A block keeps its own markup and its
 * own stylesheet, which draw today's dots; this prints rules only for a setting that is set, scoped to the selectors the
 * block hands in, so an untouched block prints exactly what it printed before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_carousel_dots_attr' ) ) {

	/**
	 * The attribute name for one base of the declared carousel dots (the twin of JS `carouselDotsAttrName()`).
	 *
	 * @param string $prefix Dots prefix, for example 'dot'.
	 * @param string $base   Registry base, for example 'ColourActive' (src/components/carousel-dots/registry.json).
	 * @return string `$prefix . $base`.
	 */
	function sgs_carousel_dots_attr( string $prefix, string $base ): string {
		return $prefix . $base;
	}
}

if ( ! function_exists( 'sgs_carousel_dots_css' ) ) {

	/**
	 * The CSS for one slider's dots from its prefixed look settings.
	 *
	 * Settings (each after the prefix): `Size` the painted dot's width and height, `ActiveWidth` the current dot's width (wider
	 * than `Size` makes a pill), `Gap` the space between dots, `Colour`, `ColourHover` and `ColourActive`, `BorderWidth`
	 * with `BorderColour`, and `Radius`. `Size`, `ActiveWidth` and `Gap` are `{desktop,tablet,mobile}` lengths printed per
	 * device; the rest are one value. A dot is drawn as the button itself or as a pseudo-element inside a larger tap target,
	 * so the block says which element is painted. The resting colour goes on the dots that are not current (`rest`), so a
	 * block's own current-dot rule keeps winning until `ColourActive` is set.
	 *
	 * @param array<string,mixed>  $attrs    Block attributes.
	 * @param string               $prefix   Attribute prefix of the declared dots, for example `dot`.
	 * @param array<string,string> $selectors The block's selectors, already scoped to its instance: `group` (the row of dots,
	 *                                       which takes the gap), `dot` (every painted dot: size, border, radius), `rest` (the
	 *                                       painted dots that are not current: the resting colour; `dot` when omitted),
	 *                                       `dot_hover` (a not-current dot under the pointer), `active` (the current dot) and
	 *                                       `active_hover` (the current dot under the pointer). A missing key prints nothing
	 *                                       for its settings.
	 * @param array<string,mixed>  $opts     `container` true when the tiers answer the block's own width.
	 * @return string CSS text; never an inline style attribute.
	 */
	function sgs_carousel_dots_css( array $attrs, string $prefix, array $selectors, array $opts = array() ): string {
		require_once __DIR__ . '/helpers-button-style.php';
		require_once __DIR__ . '/helpers-border-style.php';
		require_once __DIR__ . '/helpers-hover-state.php';
		$responsive = array( 'container' => ! empty( $opts['container'] ) );
		$sel        = static fn ( string $key ): string => isset( $selectors[ $key ] ) && is_string( $selectors[ $key ] ) ? trim( $selectors[ $key ] ) : '';
		$read       = static fn ( string $base ) => $attrs[ sgs_carousel_dots_attr( $prefix, $base ) ] ?? null;
		$colour     = static function ( string $base ) use ( $read ): string {
			$raw = $read( $base );
			return is_string( $raw ) ? sgs_colour_value( $raw ) : '';
		};
		$length     = static function ( string $base ) use ( $read ): string {
			$raw = $read( $base );
			return is_string( $raw ) && '' !== trim( $raw ) ? sgs_length_transform( trim( $raw ) ) : '';
		};
		$tiers      = static function ( string $base ) use ( $read ): array {
			$raw = $read( $base );
			return is_array( $raw ) && array() !== $raw ? $raw : array();
		};
		$css        = '';

		// Size: the painted dot's width and height. The minimum matches, so a block's own 44px minimum cannot hold a smaller dot open.
		$dot = $sel( 'dot' );
		if ( '' !== $dot && array() !== $tiers( 'Size' ) ) {
			$spec = static fn ( string $prop ): array => array(
				'value'     => $tiers( 'Size' ),
				'css'       => $prop,
				'transform' => 'sgs_length_transform',
			);
			$css .= sgs_emit_responsive_css( $dot, array( $spec( 'width' ), $spec( 'height' ), $spec( 'min-width' ), $spec( 'min-height' ) ), $responsive );
		}

		// Resting colour, on the dots that are not current.
		$rest = '' !== $sel( 'rest' ) ? $sel( 'rest' ) : $dot;
		if ( '' !== $rest && '' !== $colour( 'Colour' ) ) {
			$css .= $rest . '{background-color:' . $colour( 'Colour' ) . ';}';
		}

		// Border and radius, on every dot.
		$decls            = array();
		$has_border_width = '' !== $length( 'BorderWidth' );
		if ( $has_border_width ) {
			// Border-box, so a dot sized 12px with a 2px border is still 12px across.
			$decls[] = 'box-sizing:border-box';
			$decls[] = 'border-style:solid';
			$decls[] = 'border-width:' . $length( 'BorderWidth' );
		}
		if ( '' !== $colour( 'BorderColour' ) ) {
			$decls[] = 'border-color:' . $colour( 'BorderColour' );
		}
		if ( '' !== $length( 'Radius' ) ) {
			$decls[] = 'border-radius:' . $length( 'Radius' );
		}
		if ( '' !== $dot && array() !== $decls ) {
			$css .= $dot . '{' . implode( ';', $decls ) . ';}';
		}

		// Hover: the painted dot under the pointer, behind the touch guard.
		$hover = $sel( 'dot_hover' );
		if ( '' !== $hover && '' !== $colour( 'ColourHover' ) ) {
			$css .= sgs_hover_guarded_rule( $hover, 'background-color:' . $colour( 'ColourHover' ) . ';' );
		}

		// The current dot: its colour (kept under the pointer too, so a coloured current dot does not change on hover) and width.
		$active = $sel( 'active' );
		if ( '' !== $active ) {
			if ( '' !== $colour( 'ColourActive' ) ) {
				$css         .= $active . '{background-color:' . $colour( 'ColourActive' ) . ';}';
				$active_hover = $sel( 'active_hover' );
				if ( '' !== $active_hover ) {
					$css .= sgs_hover_guarded_rule( $active_hover, 'background-color:' . $colour( 'ColourActive' ) . ';' );
				}
			}
			if ( array() !== $tiers( 'ActiveWidth' ) ) {
				$active_spec = static fn ( string $prop ): array => array(
					'value'     => $tiers( 'ActiveWidth' ),
					'css'       => $prop,
					'transform' => 'sgs_length_transform',
				);
				$css        .= sgs_emit_responsive_css( $active, array( $active_spec( 'width' ), $active_spec( 'min-width' ) ), $responsive );
			}
		}

		// The dot size as a custom property on the row, so a block's own stylesheet can read it with its default as the fallback
		// (a tap area that must not hold a smaller painted dot open).
		$group_for_size = $sel( 'group' );
		if ( '' !== $group_for_size && array() !== $tiers( 'Size' ) ) {
			$css .= sgs_emit_responsive_css(
				$group_for_size,
				array(
					array(
						'value'     => $tiers( 'Size' ),
						'css'       => '--sgs-carousel-dot-size',
						'transform' => 'sgs_length_transform',
					),
				),
				$responsive
			);
		}

		// Gap: the space between dots, on the row.
		$group = $sel( 'group' );
		if ( '' !== $group && array() !== $tiers( 'Gap' ) ) {
			$css .= sgs_emit_responsive_css(
				$group,
				array(
					array(
						'value'     => $tiers( 'Gap' ),
						'css'       => 'gap',
						'transform' => 'sgs_length_transform',
					),
				),
				$responsive
			);
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_carousel_arrow_icon_transform' ) ) {
	/**
	 * The arrow icon for an arrow size: half of it, as the 22px icon is half the 44px default arrow.
	 *
	 * @param mixed $raw One device's stored arrow size.
	 * @return string `calc(<length> / 2)`, or '' when the size is not a length.
	 */
	function sgs_carousel_arrow_icon_transform( $raw ): string {
		$length = sgs_length_transform( $raw );
		return is_string( $length ) && '' !== $length ? 'calc(' . $length . ' / 2)' : '';
	}
}

if ( ! function_exists( 'sgs_carousel_controls_css' ) ) {

	/**
	 * The look of a slider's arrows, pause button and dots, from the two kits' prefixed settings.
	 *
	 * One call per block, so no block hand-builds selectors: the arrows (and a pause button that wears them) go through the button
	 * kit with the prefix `arrow` (`sgs_button_kit_css`), the dots through the carousel dots kit with the prefix `dot`
	 * (`sgs_carousel_dots_css`). Each prints rules only for a setting that is set, so an untouched block prints nothing.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $scope      The instance's scope, for example `.uid.uid`: a doubled instance class out-ranks the
	 *                                        block's own stylesheet whatever order the two print in.
	 * @param array<string,mixed> $parts      The block's class names, each with its leading dot: `arrows` (the classes of the
	 *                                        arrows and of a pause button that wears them), `dots` (the row), `dot` (one dot),
	 *                                        `active` (the current dot's class) and `dot_pseudo` (a pseudo-element such as
	 *                                        `::before` when the visible dot is drawn inside a larger tap target).
	 * @param array<string,mixed> $opts       `container` true when the tiers answer the block's own width.
	 * @return string CSS text; never an inline style attribute.
	 */
	function sgs_carousel_controls_css( array $attributes, string $scope, array $parts, array $opts = array() ): string {
		$scope = trim( $scope );
		if ( '' === $scope ) {
			return '';
		}
		$css    = '';
		$arrows = array();
		foreach ( (array) ( $parts['arrows'] ?? array() ) as $class ) {
			if ( is_string( $class ) && '' !== trim( $class ) ) {
				$arrows[] = $scope . ' ' . trim( $class );
			}
		}
		if ( array() !== $arrows ) {
			$css .= sgs_button_kit_css( $attributes, 'arrow', implode( ', ', $arrows ), $opts );
			// The arrow size, and its icon half, as custom properties on the arrows themselves, which a block's own stylesheet reads
			// with its default as the fallback (on the scope they would reach a slider nested inside this one).
			$size = $attributes['arrowSize'] ?? array();
			if ( is_array( $size ) && array() !== $size ) {
				$css .= sgs_emit_responsive_css(
					implode( ', ', $arrows ),
					array(
						array(
							'value'     => $size,
							'css'       => '--sgs-carousel-arrow-size',
							'transform' => 'sgs_length_transform',
						),
						array(
							'value'     => $size,
							'css'       => '--sgs-carousel-arrow-icon',
							'transform' => 'sgs_carousel_arrow_icon_transform',
						),
					),
					$opts
				);
			}
		}

		$dot    = isset( $parts['dot'] ) && is_string( $parts['dot'] ) ? trim( $parts['dot'] ) : '';
		$active = isset( $parts['active'] ) && is_string( $parts['active'] ) ? trim( $parts['active'] ) : '';
		$row    = isset( $parts['dots'] ) && is_string( $parts['dots'] ) ? trim( $parts['dots'] ) : '';
		if ( '' !== $dot && '' !== $active ) {
			$pseudo = isset( $parts['dot_pseudo'] ) && is_string( $parts['dot_pseudo'] ) ? trim( $parts['dot_pseudo'] ) : '';
			$css   .= sgs_carousel_dots_css(
				$attributes,
				'dot',
				array(
					'group'        => '' !== $row ? $scope . ' ' . $row : '',
					'dot'          => $scope . ' ' . $dot . $pseudo,
					'rest'         => $scope . ' ' . $dot . ':not(' . $active . ')' . $pseudo,
					'dot_hover'    => $scope . ' ' . $dot . ':not(' . $active . '):hover' . $pseudo,
					'active'       => $scope . ' ' . $active . $pseudo,
					'active_hover' => $scope . ' ' . $active . ':hover' . $pseudo,
				),
				$opts
			);
		}
		return $css;
	}
}
