<?php
/**
 * The `hover` migration mapper (Spec 38A §13.1, §13.2, FR-38A-31): the old hover attributes to `hover.state`.
 *
 * Sources: the extension attributes any block with the Hover panel carried, and a few block-owned attributes (their
 * declarations are frozen in `data/legacy-declarations.json`). A stored value is mapped only when the new model expresses it exactly; anything else is returned as a
 * `reported` row and the attribute stays on the block (`consumed` false). Nothing is guessed or coerced silently.
 *
 * - `sgsHoverScale` is a percent (the renderer divides by 100); `sgsHoverScalePreset` is read only when it is 0;
 *   `sgsHoverLift` px is a negative `translateY`; `sgsHoverOpacity`, `sgsHoverIndent` map straight across.
 * - `sgsHoverDurationMs` wins over the `sgsHoverDuration` slug (a token); `medium` is the stored default and is
 *   omitted. `sgsHoverEasing` slugs are tokens; `custom` reads `sgsHoverEasingCustom` and must be a valid curve.
 * - A stored value that differs from the block's own default and switches an active default off (lift 0 where the
 *   block lifts by default, an empty scale preset, zoom off) is written as the explicit zero value (translateY 0,
 *   scale 1) so the stored choice survives. A value equal to a default that changes nothing is consumed without a
 *   state.
 * - Image zoom (`sgsHoverImageZoom`, `sgsHoverZoom`, and `imageZoomHover` on `sgs/team-member`) is a state on the
 *   block's `media` or `image` part sourced from the root. A block with no such part, or whose part is excluded from
 *   motion (`"motion": false`), reports the value. The per-item zoom of `sgs/card-grid`, `sgs/gallery` and
 *   `sgs/post-grid` is triggered by one item, which a root-sourced state cannot reproduce, so it is reported.
 * - Reported with no destination: hover shadows (they stay in the shadow control; box-shadow on hover is the M3.4 hover
 *   ring), `sgsHoverGrayscale` (it greys the image at rest and colours it on hover; a hover state holds only the
 *   hover value, so the resting grey has no home), `sgsHoverBorderAccent` (the accent line sweep has no motion-model
 *   effect and accent is never an indicator), `sgsHoverZoomDuration`, `sgsHoverZoomStyle: spill`, the `bgHoverZoom*`
 *   family (the background image layer is no declared part) and the block-owned `effectHover` and string `scaleHover`
 *   of the card blocks (a per-item hover class).
 * - `sgs/button` `liftHover` (0 to 24px, `translate: 0 -Npx` on hover and focus) is a negative `translateY` like `sgsHoverLift`.
 * - `transitionDuration`, `transitionEasing`, `transitionEasingCustom` and `scaleHover` (a number) are mapped on the
 *   blocks where they time and size the block's own hover (`sgs/heading`, `sgs/text`, `sgs/quote`, `sgs/button`); on
 *   every other block they time unrelated transitions (sliders, tabs, overlays) and are left alone.
 * - `shadowHoverColour` is renamed `shadowColourHover` (`attrs`); its value stays in its colour control.
 *
 * The block's registered defaults and `supports.sgs` come from the block registry; a test installs a provider.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-hover-value.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-declarations.php';

/**
 * Class Sgs_Motion_Map_Hover
 */
final class Sgs_Motion_Map_Hover implements Sgs_Motion_Mapper_Interface {

	/** Attributes any block may carry from the Hover Effects extension, plus the shadow and background-zoom ones. */
	const GENERIC = array(
		'sgsHoverScale',
		'sgsHoverScalePreset',
		'sgsHoverLift',
		'sgsHoverShadow',
		'sgsHoverShadowCustom',
		'sgsHoverDuration',
		'sgsHoverDurationMs',
		'sgsHoverEasing',
		'sgsHoverEasingCustom',
		'sgsHoverImageZoom',
		'sgsHoverZoom',
		'sgsHoverZoomDuration',
		'sgsHoverZoomStyle',
		'sgsHoverGrayscale',
		'sgsHoverBorderAccent',
		'sgsHoverOpacity',
		'sgsHoverIndent',
		'shadowLiftOnHover',
		'shadowHoverColour',
		'bgHoverZoom',
		'bgHoverZoomScale',
		'bgHoverZoomDuration',
		'bgHoverZoomEasing',
		'bgHoverZoomEasingCustom',
	);

	/** Blocks whose `scaleHover` is a number, `transitionDuration` and `transitionEasing` time their own hover. */
	const OWN_HOVER_BLOCKS = array( 'sgs/heading', 'sgs/text', 'sgs/quote', 'sgs/button' );

	/** Card blocks: a per-item hover class (`effectHover`) and a string `scaleHover`. */
	const CARD_BLOCKS = array( 'sgs/card-grid', 'sgs/gallery', 'sgs/info-box', 'sgs/post-grid', 'sgs/team-member', 'sgs/testimonial' );

	/** Blocks with `effectHover` besides the card blocks. */
	const EFFECT_BLOCKS = array( 'sgs/brand-strip', 'sgs/process-steps', 'sgs/testimonial-slider' );

	/** Blocks with `imageZoomHover`. */
	const IMAGE_ZOOM_BLOCKS = array( 'sgs/card-grid', 'sgs/gallery', 'sgs/post-grid', 'sgs/team-member' );

	/** Blocks whose image zoom is triggered by one item rather than by the block. */
	const PER_ITEM_ZOOM_BLOCKS = array( 'sgs/card-grid', 'sgs/gallery', 'sgs/post-grid' );

	/** The `hover-lift` preset's values (`scripts/data/motion-presets.json`; the test compares them). */
	const LIFT_PRESET = array(
		'translateY' => '-token:distance.sm',
		'duration'   => 'token:duration.fast',
		'easing'     => 'token:easing.emphasised',
	);

	/** Parts that carry a block's image, in order of preference. */
	const MEDIA_PARTS = array( 'media', 'image' );

	/**
	 * A test's stand-in for the block registry: callable( string $block_name ): array{attributes:array,sgs:array}.
	 *
	 * @var callable|null
	 */
	private static $block_info_provider = null;

	/**
	 * Replace the source of a block's attribute defaults and `supports.sgs` (null restores the block registry).
	 *
	 * @param callable|null $provider Callable taking the block name and returning `attributes` (name => default) and `sgs`.
	 */
	public static function set_block_info_provider( ?callable $provider ): void {
		self::$block_info_provider = $provider;
	}

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'hover';
	}

	/**
	 * The attributes this mapper owns on a block.
	 *
	 * @param string $block_name Block name.
	 * @return string[]
	 */
	public static function owned( string $block_name ): array {
		if ( 'sgs/icon' === $block_name || 'sgs/social-icons' === $block_name ) {
			return array();
		}
		$own   = in_array( $block_name, self::OWN_HOVER_BLOCKS, true );
		$owned = array_merge(
			self::GENERIC,
			$own ? array( 'scaleHover', 'transitionDuration', 'transitionEasing' ) : array(),
			'sgs/button' === $block_name ? array( 'transitionEasingCustom', 'scaleHoverTarget', 'opacityHover', 'liftHover' ) : array(),
			in_array( $block_name, self::CARD_BLOCKS, true ) ? array( 'scaleHover', 'effectHover' ) : array(),
			in_array( $block_name, self::EFFECT_BLOCKS, true ) ? array( 'effectHover' ) : array(),
			in_array( $block_name, self::IMAGE_ZOOM_BLOCKS, true ) ? array( 'imageZoomHover' ) : array()
		);
		return array_values( array_unique( $owned ) );
	}

	/**
	 * Whether the block holds a hover attribute this mapper owns.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== array_intersect( self::owned( $block_name ), array_keys( $attrs ) );
	}

	/**
	 * Map the block's hover attributes.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>, attrs: array<string,mixed>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$o = array(
			'values'   => array(),
			'timing'   => array(),
			'media'    => array(),
			'lift'     => false,
			'consumed' => array(),
			'reported' => array(),
			'attrs'    => array(),
		);
		$a = array_intersect_key( $attrs, array_flip( self::owned( $block_name ) ) );
		self::rename_and_shadows( $a, $o );
		Sgs_Motion_Legacy_Hover_Value::scale_and_lift( $block_name, $a, $o );
		Sgs_Motion_Legacy_Hover_Value::timing( $a, $o );
		Sgs_Motion_Legacy_Hover_Value::fades( $a, $o );
		self::zoom( $block_name, $a, $o );
		self::block_owned( $block_name, $a, $o );
		self::shadow_lift( $block_name, $a, $o );
		return self::finish( $o );
	}

	/**
	 * The renamed shadow colour and the reported shadows, grayscale, accent line.
	 *
	 * @param array<string,mixed> $a Owned stored attributes.
	 * @param array<string,mixed> $o Accumulator.
	 */
	private static function rename_and_shadows( array $a, array &$o ): void {
		if ( array_key_exists( 'shadowHoverColour', $a ) ) {
			$o['attrs']['shadowColourHover'] = $a['shadowHoverColour'];
			$o['consumed'][]                 = 'shadowHoverColour';
		}
		foreach ( array( 'sgsHoverShadow', 'sgsHoverShadowCustom' ) as $key ) {
			if ( array_key_exists( $key, $a ) ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, $key, $a[ $key ], 'hover shadow stays in its shadow control; box-shadow on hover is the M3.4 hover ring', false );
			}
		}
		if ( array_key_exists( 'sgsHoverGrayscale', $a ) ) {
			if ( true === $a['sgsHoverGrayscale'] ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, 'sgsHoverGrayscale', true, 'grayscale to colour greys the image at rest and colours it on hover; a hover state holds only the hover value, so the resting grey has no destination', false );
			} else {
				$o['consumed'][] = 'sgsHoverGrayscale';
			}
		}
		if ( array_key_exists( 'sgsHoverBorderAccent', $a ) ) {
			if ( true === $a['sgsHoverBorderAccent'] ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, 'sgsHoverBorderAccent', true, 'accent line sweep has no motion-model effect; accent is never an indicator (Bean ruling)', false );
			} else {
				$o['consumed'][] = 'sgsHoverBorderAccent';
			}
		}
	}




	/**
	 * Image zoom (the extension's and `imageZoomHover`) and the background zoom.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	private static function zoom( string $block_name, array $a, array &$o ): void {
		$zoom_keys = array( 'sgsHoverImageZoom', 'sgsHoverZoom', 'sgsHoverZoomDuration', 'sgsHoverZoomStyle', 'imageZoomHover' );
		if ( array() !== array_intersect( $zoom_keys, array_keys( $a ) ) ) {
			$defaults = self::hover_defaults( $block_name );
			$flag_key = array_key_exists( 'imageZoomHover', $a ) ? 'imageZoomHover' : 'sgsHoverImageZoom';
			$default  = 'imageZoomHover' === $flag_key ? self::default_of( $block_name, 'imageZoomHover' ) : ( $defaults['imageZoom'] ?? false );
			$flag     = array_key_exists( $flag_key, $a ) ? $a[ $flag_key ] : $default;
			$part     = self::media_part( $block_name );
			if ( true === $flag && in_array( $block_name, self::PER_ITEM_ZOOM_BLOCKS, true ) ) {
				if ( $flag === $default ) {
					Sgs_Motion_Legacy_Hover_Value::take( $o, array( $flag_key ), $a );
				} else {
					Sgs_Motion_Legacy_Hover_Value::report( $o, $flag_key, $flag, 'the zoom is triggered by one item; a root-sourced state would zoom every image together', false );
				}
			} elseif ( true === $flag && null === $part ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, $flag_key, $flag, 'no media part: the block declares no media or image part that takes motion', false );
			} elseif ( true === $flag ) {
				$percent    = array_key_exists( 'sgsHoverZoom', $a ) ? Sgs_Motion_Legacy_Hover_Value::num( $a['sgsHoverZoom'] ) : 0.0;
				$factor     = null !== $percent && (int) $percent > 100 ? (int) $percent / 100 : 1.1;
				$o['media'] = array(
					'part'  => $part,
					'scale' => Sgs_Motion_Legacy_Hover_Value::tidy( $factor ),
				);
				Sgs_Motion_Legacy_Hover_Value::take( $o, array( $flag_key, 'sgsHoverZoom' ), $a );
			} elseif ( false === $flag && true === $default && null !== $part && ! in_array( $block_name, self::PER_ITEM_ZOOM_BLOCKS, true ) ) {
				$o['media'] = array(
					'part'  => $part,
					'scale' => 1,
				);
				Sgs_Motion_Legacy_Hover_Value::take( $o, array( $flag_key, 'sgsHoverZoom' ), $a );
			} elseif ( false === $flag && true === $default ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, $flag_key, false, 'zoom switched off over an on default, and the block has no media part or triggers zoom per item', false );
			} else {
				Sgs_Motion_Legacy_Hover_Value::take( $o, array( $flag_key, 'sgsHoverZoom', 'sgsHoverZoomDuration', 'sgsHoverZoomStyle' ), $a );
			}
			if ( true === $flag && ! in_array( 'sgsHoverZoomDuration', $o['consumed'], true ) ) {
				if ( array_key_exists( 'sgsHoverZoomDuration', $a ) ) {
					$duration = Sgs_Motion_Legacy_Hover_Value::num( $a['sgsHoverZoomDuration'] );
					if ( null === $duration || $duration > 0 ) {
						Sgs_Motion_Legacy_Hover_Value::report( $o, 'sgsHoverZoomDuration', $a['sgsHoverZoomDuration'], 'the zoom duration has no destination in the hover state', false );
					} else {
						$o['consumed'][] = 'sgsHoverZoomDuration';
					}
				}
				if ( 'spill' === ( $a['sgsHoverZoomStyle'] ?? '' ) ) {
					Sgs_Motion_Legacy_Hover_Value::report( $o, 'sgsHoverZoomStyle', 'spill', 'the whole image growing past its frame has no destination; the zoom stays clipped', false );
				} elseif ( array_key_exists( 'sgsHoverZoomStyle', $a ) ) {
					$o['consumed'][] = 'sgsHoverZoomStyle';
				}
			}
		}
		self::background_zoom( $a, $o );
	}

	/**
	 * The background zoom: a hover on a background image layer, which no block declares as a part.
	 *
	 * @param array<string,mixed> $a Owned stored attributes.
	 * @param array<string,mixed> $o Accumulator.
	 */
	private static function background_zoom( array $a, array &$o ): void {
		$keys = array( 'bgHoverZoom', 'bgHoverZoomScale', 'bgHoverZoomDuration', 'bgHoverZoomEasing', 'bgHoverZoomEasingCustom' );
		$on   = true === ( $a['bgHoverZoom'] ?? false );
		foreach ( $keys as $key ) {
			if ( ! array_key_exists( $key, $a ) ) {
				continue;
			}
			if ( $on ) {
				Sgs_Motion_Legacy_Hover_Value::report( $o, $key, $a[ $key ], 'no media part: the background image layer is not a declared part', false );
			} else {
				$o['consumed'][] = $key;
			}
		}
	}

	/**
	 * The block-owned attributes: `scaleHover`, `opacityHover`, the transition pair, `effectHover`.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	private static function block_owned( string $block_name, array $a, array &$o ): void {
		if ( in_array( $block_name, self::OWN_HOVER_BLOCKS, true ) ) {
			Sgs_Motion_Legacy_Hover_Value::own_scale( $block_name, $a, $o );
			Sgs_Motion_Legacy_Hover_Value::own_transition( $block_name, $a, $o );
		}
		if ( 'sgs/button' === $block_name ) {
			Sgs_Motion_Legacy_Hover_Value::button_extras( $a, $o );
		}
		if ( in_array( $block_name, self::CARD_BLOCKS, true ) && array_key_exists( 'scaleHover', $a ) ) {
			if ( '' === $a['scaleHover'] ) {
				$o['consumed'][] = 'scaleHover';
			} else {
				Sgs_Motion_Legacy_Hover_Value::report( $o, 'scaleHover', $a['scaleHover'], 'scales each item on its own hover through the block\'s item rule; no per-item hover state exists', false );
			}
		}
		if ( array_key_exists( 'effectHover', $a ) ) {
			$default_effect = self::default_of( $block_name, 'effectHover' );
			if ( $default_effect === $a['effectHover'] ) {
				$o['consumed'][] = 'effectHover';
			} else {
				Sgs_Motion_Legacy_Hover_Value::report( $o, 'effectHover', $a['effectHover'], 'the block\'s per-item hover class (lift, zoom, …) has no one-to-one hover state', false );
			}
		}
	}



	/**
	 * The automatic shadow lift switch.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	private static function shadow_lift( string $block_name, array $a, array &$o ): void {
		if ( ! array_key_exists( 'shadowLiftOnHover', $a ) ) {
			return;
		}
		$default = self::default_of( $block_name, 'shadowLiftOnHover' );
		$value   = $a['shadowLiftOnHover'];
		if ( true === $value && true !== $default ) {
			$o['lift_preset'] = ! $o['lift'];
			$o['consumed'][]  = 'shadowLiftOnHover';
		} elseif ( true === $value || ( false === $value && true !== $default ) ) {
			$o['consumed'][] = 'shadowLiftOnHover';
		} else {
			Sgs_Motion_Legacy_Hover_Value::report( $o, 'shadowLiftOnHover', $value, 'the automatic lift is a shadow step in the shadow control; its switch has no hover-state value, so the attribute stays', false );
		}
	}

	/**
	 * The motion fragment and result.
	 *
	 * @param array<string,mixed> $o Accumulator.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>, attrs: array<string,mixed>}
	 */
	private static function finish( array $o ): array {
		$values = $o['values'];
		$preset = null;
		if ( ! empty( $o['lift_preset'] ) ) {
			$values      += array( 'translateY' => self::LIFT_PRESET['translateY'] );
			$preset       = 'hover-lift';
			$o['timing'] += array(
				'duration' => self::LIFT_PRESET['duration'],
				'easing'   => self::LIFT_PRESET['easing'],
			);
		}
		$values  += $o['timing'];
		$elements = array();
		if ( array() !== $values ) {
			$state = array( 'values' => $values );
			if ( null !== $preset && self::LIFT_PRESET === $values ) {
				$state = array(
					'preset' => $preset,
					'values' => $values,
				);
			}
			$elements['root'] = array( 'hover' => array( 'state' => $state ) );
		}
		if ( array() !== $o['media'] ) {
			$media_values = array( 'scale' => $o['media']['scale'] );
			if ( isset( $o['timing']['easing'] ) ) {
				$media_values['easing'] = $o['timing']['easing'];
			}
			$elements[ $o['media']['part'] ] = array(
				'hover' => array(
					'state' => array(
						'source' => 'root',
						'values' => $media_values,
					),
				),
			);
		}
		return array(
			'motion'   => array() === $elements ? array() : array(
				'v'        => 1,
				'elements' => $elements,
			),
			'consumed' => array_values( array_unique( $o['consumed'] ) ),
			'reported' => $o['reported'],
			'attrs'    => $o['attrs'],
		);
	}







	/**
	 * A block's `supports.sgs.hoverDefaults`.
	 *
	 * @param string $block_name Block name.
	 * @return array<string,mixed>
	 */
	public static function hover_defaults( string $block_name ): array {
		$defaults = self::info( $block_name )['sgs']['hoverDefaults'] ?? array();
		return is_array( $defaults ) ? $defaults : array();
	}

	/**
	 * A block's registered default for an attribute (null when the block or attribute is unknown).
	 *
	 * @param string $block_name Block name.
	 * @param string $attr       Attribute.
	 * @return mixed
	 */
	public static function default_of( string $block_name, string $attr ) {
		return self::info( $block_name )['attributes'][ $attr ] ?? null;
	}

	/**
	 * The first media part the block declares that takes motion.
	 *
	 * @param string $block_name Block name.
	 * @return string|null
	 */
	public static function media_part( string $block_name ): ?string {
		$elements = self::info( $block_name )['sgs']['elements'] ?? array();
		foreach ( self::MEDIA_PARTS as $part ) {
			if ( isset( $elements[ $part ] ) && is_array( $elements[ $part ] ) && false !== ( $elements[ $part ]['motion'] ?? true ) ) {
				return $part;
			}
		}
		return null;
	}

	/**
	 * The block's attribute defaults and `supports.sgs`, from the provider or the block registry.
	 *
	 * @param string $block_name Block name.
	 * @return array{attributes:array<string,mixed>,sgs:array<string,mixed>}
	 */
	private static function info( string $block_name ): array {
		$none = array(
			'attributes' => array(),
			'sgs'        => array(),
		);
		if ( null !== self::$block_info_provider ) {
			$found = call_user_func( self::$block_info_provider, $block_name );
			return is_array( $found ) ? array_merge( $none, $found ) : $none;
		}
		$type = class_exists( '\WP_Block_Type_Registry' ) ? \WP_Block_Type_Registry::get_instance()->get_registered( $block_name ) : null;
		if ( ! $type ) {
			return $none;
		}
		$defaults = Sgs_Motion_Legacy_Declarations::defaults( $block_name );
		foreach ( is_array( $type->attributes ) ? $type->attributes : array() as $name => $spec ) {
			if ( is_array( $spec ) && array_key_exists( 'default', $spec ) ) {
				$defaults[ $name ] = $spec['default'];
			}
		}
		$sgs = isset( $type->supports['sgs'] ) && is_array( $type->supports['sgs'] ) ? $type->supports['sgs'] : array();
		if ( ! isset( $sgs['hoverDefaults'] ) ) {
			$frozen = Sgs_Motion_Legacy_Declarations::hover_defaults( $block_name );
			if ( array() !== $frozen ) {
				$sgs['hoverDefaults'] = $frozen;
			}
		}
		return array(
			'attributes' => $defaults,
			'sgs'        => $sgs,
		);
	}
}
