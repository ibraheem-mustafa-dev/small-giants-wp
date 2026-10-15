<?php
/**
 * The `icon` migration mapper (Spec 38A §13.1, §13.2, FR-38A-31, plan decision 2A): the icon block's hover motion to
 * `hover.state`.
 *
 * `sgs/icon` paints its hover on the shape (`includes/helpers-icon-motion.php`, `src/blocks/icon/style.css`): scale,
 * then translate, then rotate, one transform timed by `transitionDuration` and curved by `transitionEasing`, while
 * colours, borders and shadow use `paintDuration`. The hover is triggered by the icon's link, so the state lives on
 * the `shape` part sourced from the root. The link's `opacityHover` is a state on the root.
 *
 * - `scaleHover` is clamped 1 to 1.5 as rendered (default 1.1), `offsetXHover` and `offsetYHover` are clamped to 40px,
 *   `iconRotateHover` to 180 degrees and the durations to 3000ms; a value that was clamped is stored as rendered and
 *   reported (`consumed` true). An icon that stores 1 or less turned the default scale off: it is written as scale 1.
 * - `transitionEasing` is a name from the shared easing list (`sgs_motion_easing_css()`); `custom` reads
 *   `transitionEasingCustom` and must be a valid curve, otherwise the pair is reported.
 * - `paintDuration` follows Bean's M3.4 ruling of one timing per state change: equal to the movement duration (or
 *   unset) it is consumed; different, it is reported and stays.
 * - `shadowLiftOnHover` is a step of the shadow in the shadow control and has no hover-state value: switched on (the
 *   default) it is consumed, switched off it is reported and stays.
 *
 * `sgs/social-icons` renders its icons as inner `sgs/icon` blocks (`$content` of its render.php) and its `childIcon*`
 * hover attributes are defaults every icon inherits when it has no value of its own. They are group-dependent, so this
 * mapper implements `Sgs_Motion_Group_Mapper_Interface`: the row's attributes are mapped once, written into each child
 * icon's `sgsMotion` for the fields that child does not set itself (the renderer's own order: own value, then the row's,
 * then the default), and consumed from the row. A row with no icon child is left alone.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/interface-sgs-motion-group-mapper.php';
require_once __DIR__ . '/class-sgs-motion-map-hover.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-hover-value.php';

/**
 * Class Sgs_Motion_Map_Icon
 */
final class Sgs_Motion_Map_Icon implements Sgs_Motion_Mapper_Interface, Sgs_Motion_Group_Mapper_Interface {

	/** The icon block's hover attributes by role. */
	const ICON_NAMES = array(
		'scale'  => 'scaleHover',
		'x'      => 'offsetXHover',
		'y'      => 'offsetYHover',
		'rotate' => 'iconRotateHover',
		'move'   => 'transitionDuration',
		'paint'  => 'paintDuration',
		'easing' => 'transitionEasing',
		'custom' => 'transitionEasingCustom',
		'lift'   => 'shadowLiftOnHover',
	);

	/** The social-icons row's defaults by role. */
	const GROUP_NAMES = array(
		'scale'  => 'childIconScaleHover',
		'x'      => 'childIconOffsetXHover',
		'y'      => 'childIconOffsetYHover',
		'rotate' => 'childIconRotateHover',
		'move'   => 'childIconTransitionDuration',
		'paint'  => 'childIconPaintDuration',
		'easing' => 'childIconTransitionEasing',
		'custom' => 'childIconTransitionEasingCustom',
		'lift'   => 'childIconShadowLiftOnHover',
	);

	/** The icon's default hover scale (the renderer's fallback). */
	const DEFAULT_SCALE = 1.1;

	/** The renderer's clamps: scale, move px, rotate degrees, duration ms. */
	const MAX_SCALE    = 1.5;
	const MAX_MOVE     = 40.0;
	const MAX_ROTATE   = 180.0;
	const MAX_DURATION = 3000;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'icon';
	}

	/**
	 * Whether the block is an icon holding a hover attribute. The row's attributes belong to the group pass.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return 'sgs/icon' === $block_name && array() !== array_intersect( array_merge( array_values( self::ICON_NAMES ), array( 'opacityHover' ) ), array_keys( $attrs ) );
	}

	/**
	 * Map one icon's hover attributes.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$read     = $this->read( $block_name, $attrs, self::ICON_NAMES, false );
		$root     = array();
		$consumed = $read['consumed'];
		if ( array_key_exists( 'opacityHover', $attrs ) ) {
			$opacity = Sgs_Motion_Legacy_Hover_Value::num( $attrs['opacityHover'] );
			if ( null === $opacity ) {
				Sgs_Motion_Legacy_Hover_Value::report( $read, 'opacityHover', $attrs['opacityHover'], 'not a number from 0 to 1', false );
			} else {
				if ( $opacity > 0 && min( 1.0, $opacity ) < 1.0 ) {
					$root['opacity'] = Sgs_Motion_Legacy_Hover_Value::tidy( round( min( 1.0, $opacity ), 2 ) );
				}
				$consumed[] = 'opacityHover';
			}
		}
		return array(
			'motion'   => self::motion( $read['shape'], $root, $read['timing'] ),
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $read['reported'],
		);
	}

	/**
	 * Map every row's defaults onto its child icons.
	 *
	 * @param array<int,array<string,mixed>> $blocks The post's `parse_blocks()` result.
	 * @return array<string,array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}> Patches by block path.
	 */
	public function map_groups( array $blocks ): array {
		$patches = array();
		$this->walk( $blocks, '', $patches );
		return $patches;
	}

	/**
	 * Walk a block list for social-icons rows.
	 *
	 * @param array<int,array<string,mixed>> $blocks  Parsed blocks.
	 * @param string                         $path    Path prefix.
	 * @param array<string,mixed>            $patches Patches (appended to).
	 */
	private function walk( array $blocks, string $path, array &$patches ): void {
		foreach ( $blocks as $i => $block ) {
			$here = '' === $path ? (string) $i : $path . '/' . $i;
			$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
			$kids = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ? $block['innerBlocks'] : array();
			$attr = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
			if ( 'sgs/social-icons' === $name && array() !== array_intersect( array_values( self::GROUP_NAMES ), array_keys( $attr ) ) ) {
				$this->row_patches( $name, $attr, $kids, $here, $patches );
			}
			$this->walk( $kids, $here, $patches );
		}
	}

	/**
	 * The patch for one row and one for each child icon.
	 *
	 * @param string                         $name    Block name.
	 * @param array<string,mixed>            $attrs   The row's stored attributes.
	 * @param array<int,array<string,mixed>> $kids    The row's inner blocks.
	 * @param string                         $path    The row's path.
	 * @param array<string,mixed>            $patches Patches (appended to).
	 */
	private function row_patches( string $name, array $attrs, array $kids, string $path, array &$patches ): void {
		$icons = array();
		foreach ( $kids as $i => $kid ) {
			if ( isset( $kid['blockName'] ) && 'sgs/icon' === $kid['blockName'] ) {
				$icons[ $i ] = isset( $kid['attrs'] ) && is_array( $kid['attrs'] ) ? $kid['attrs'] : array();
			}
		}
		if ( array() === $icons ) {
			return;
		}
		$read             = $this->read( $name, $attrs, self::GROUP_NAMES, true );
		$patches[ $path ] = array(
			'motion'   => array(),
			'consumed' => $read['consumed'],
			'reported' => $read['reported'],
		);
		foreach ( $icons as $i => $own ) {
			$shape  = array_diff_key( $read['shape'], self::own_fields( $own ) );
			$timing = array_diff_key( $read['timing'], self::own_fields( $own ) );
			$motion = self::motion( $shape, array(), $timing );
			if ( array() !== $motion ) {
				$patches[ $path . '/' . $i ] = array(
					'motion'   => $motion,
					'consumed' => array(),
					'reported' => array(),
				);
			}
		}
	}

	/**
	 * The hover fields an icon sets itself, as the renderer reads them (a value of 1.1 for the scale prints nothing).
	 *
	 * @param array<string,mixed> $own The icon's stored attributes.
	 * @return array<string,true> Field names (`scale`, `translateX`, `translateY`, `rotate`, `duration`, `easing`).
	 */
	private static function own_fields( array $own ): array {
		$fields = array();
		$scale  = Sgs_Motion_Legacy_Hover_Value::num( $own['scaleHover'] ?? null );
		if ( null !== $scale && abs( max( 1.0, min( self::MAX_SCALE, $scale ) ) - self::DEFAULT_SCALE ) > 0.0001 ) {
			$fields['scale'] = true;
		}
		foreach ( array(
			'offsetXHover'    => 'translateX',
			'offsetYHover'    => 'translateY',
			'iconRotateHover' => 'rotate',
		) as $attr => $field ) {
			$number = Sgs_Motion_Legacy_Hover_Value::num( $own[ $attr ] ?? null );
			if ( null !== $number && abs( $number ) > 0.001 ) {
				$fields[ $field ] = true;
			}
		}
		$move = Sgs_Motion_Legacy_Hover_Value::num( $own['transitionDuration'] ?? null );
		if ( null !== $move && round( $move ) > 0 ) {
			$fields['duration'] = true;
		}
		if ( is_string( $own['transitionEasing'] ?? null ) && '' !== trim( $own['transitionEasing'] ) ) {
			$fields['easing'] = true;
		}
		return $fields;
	}

	/**
	 * Read one set of hover attributes (an icon's or a row's).
	 *
	 * @param string               $block_name Block name, for defaults.
	 * @param array<string,mixed>  $attrs      Stored attributes.
	 * @param array<string,string> $names     Attribute names by role.
	 * @param bool                 $group      Whether the set is the row's.
	 * @return array{shape:array<string,mixed>,timing:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	private function read( string $block_name, array $attrs, array $names, bool $group ): array {
		$out = array(
			'shape'    => array(),
			'timing'   => array(),
			'consumed' => array(),
			'reported' => array(),
		);
		$has = static function ( string $role ) use ( $attrs, $names ): bool {
			return array_key_exists( $names[ $role ], $attrs );
		};
		if ( $has( 'scale' ) ) {
			$this->scale( $names['scale'], $attrs[ $names['scale'] ], $group, $out );
		}
		foreach ( array(
			'x'      => array( 'translateX', self::MAX_MOVE ),
			'y'      => array( 'translateY', self::MAX_MOVE ),
			'rotate' => array( 'rotate', self::MAX_ROTATE ),
		) as $role => $spec ) {
			if ( $has( $role ) ) {
				$this->clamped( $names[ $role ], $attrs[ $names[ $role ] ], $spec[0], $spec[1], $out );
			}
		}
		$move = $has( 'move' ) ? $this->duration( $names['move'], $attrs[ $names['move'] ], $out ) : 0;
		if ( $move > 0 ) {
			$out['timing']['duration'] = $move;
		}
		if ( $has( 'paint' ) ) {
			$paint = $this->duration( $names['paint'], $attrs[ $names['paint'] ], $out, false );
			if ( null !== $paint && $paint > 0 && $paint !== $move ) {
				Sgs_Motion_Legacy_Hover_Value::report( $out, $names['paint'], $attrs[ $names['paint'] ], 'paint and movement timings differ; one timing per state', false );
			} elseif ( null !== $paint ) {
				$out['consumed'][] = $names['paint'];
			}
		}
		if ( $has( 'easing' ) || $has( 'custom' ) ) {
			$this->easing( $names, $attrs, $out );
		}
		if ( $has( 'lift' ) ) {
			if ( false === $attrs[ $names['lift'] ] && true === Sgs_Motion_Map_Hover::default_of( $block_name, $names['lift'] ) ) {
				Sgs_Motion_Legacy_Hover_Value::report( $out, $names['lift'], false, 'the automatic lift is a shadow step in the shadow control; its switch has no hover-state value, so the attribute stays', false );
			} else {
				$out['consumed'][] = $names['lift'];
			}
		}
		return $out;
	}

	/**
	 * The hover scale.
	 *
	 * @param string              $attr  Attribute name.
	 * @param mixed               $value Stored value.
	 * @param bool                $group Whether the row's.
	 * @param array<string,mixed> $out   Accumulator.
	 */
	private function scale( string $attr, $value, bool $group, array &$out ): void {
		$number = Sgs_Motion_Legacy_Hover_Value::num( $value );
		if ( null === $number ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'not a number', false );
			return;
		}
		$out['consumed'][] = $attr;
		if ( $group ) {
			// The row prints its scale only from 1 upwards; 0 is unset and anything below 1 prints nothing.
			if ( $number >= 1.0 ) {
				$out['shape']['scale'] = Sgs_Motion_Legacy_Hover_Value::tidy( round( min( self::MAX_SCALE, $number ), 3 ) );
			}
			if ( $number > self::MAX_SCALE ) {
				Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'clamped to ' . self::MAX_SCALE . ' as rendered', true );
			} elseif ( $number > 0 && $number < 1.0 ) {
				Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'below 1 the row printed no scale', true );
			}
			return;
		}
		$clamped               = max( 1.0, min( self::MAX_SCALE, $number ) );
		$out['shape']['scale'] = Sgs_Motion_Legacy_Hover_Value::tidy( round( $clamped, 3 ) );
		if ( abs( $clamped - $number ) > 0.0000001 ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'clamped to ' . $clamped . ' as rendered', true );
		}
	}

	/**
	 * A hover move or turn, clamped as rendered.
	 *
	 * @param string              $attr  Attribute name.
	 * @param mixed               $value Stored value.
	 * @param string              $field Hover-state field.
	 * @param float               $max   Largest magnitude.
	 * @param array<string,mixed> $out   Accumulator.
	 */
	private function clamped( string $attr, $value, string $field, float $max, array &$out ): void {
		$number = Sgs_Motion_Legacy_Hover_Value::num( $value );
		if ( null === $number ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'not a number', false );
			return;
		}
		$out['consumed'][] = $attr;
		if ( abs( $number ) <= 0.001 ) {
			return;
		}
		$clamped                = max( -$max, min( $max, $number ) );
		$out['shape'][ $field ] = Sgs_Motion_Legacy_Hover_Value::tidy( round( $clamped, 2 ) );
		if ( abs( $clamped - $number ) > 0.0000001 ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'clamped to ' . $clamped . ' as rendered', true );
		}
	}

	/**
	 * A duration in whole milliseconds as rendered (rounded, 0 to 3000).
	 *
	 * @param string              $attr    Attribute name.
	 * @param mixed               $value   Stored value.
	 * @param array<string,mixed> $out     Accumulator.
	 * @param bool                $consume Whether to consume the attribute here.
	 * @return int|null Null when the value is not a number.
	 */
	private function duration( string $attr, $value, array &$out, bool $consume = true ): ?int {
		$number = Sgs_Motion_Legacy_Hover_Value::num( $value );
		if ( null === $number ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'not a number of milliseconds', false );
			return null;
		}
		$ms = (int) max( 0, min( self::MAX_DURATION, round( $number ) ) );
		if ( $consume ) {
			$out['consumed'][] = $attr;
		}
		if ( $consume && $number > 0 && abs( $ms - round( $number ) ) > 0.5 ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $attr, $value, 'clamped to ' . $ms . 'ms as rendered', true );
		}
		return $ms;
	}

	/**
	 * The movement easing.
	 *
	 * @param array<string,string> $names Attribute names by role.
	 * @param array<string,mixed>  $attrs Stored attributes.
	 * @param array<string,mixed>  $out   Accumulator.
	 */
	private function easing( array $names, array $attrs, array &$out ): void {
		$value  = $attrs[ $names['easing'] ] ?? '';
		$custom = $attrs[ $names['custom'] ] ?? '';
		$curve  = is_string( $value ) ? Sgs_Motion_Legacy_Hover_Value::shared_easing( trim( $value ), is_string( $custom ) ? $custom : '' ) : null;
		if ( null === $curve ) {
			Sgs_Motion_Legacy_Hover_Value::report( $out, $names['easing'], $value, 'not an easing the hover state holds (an invalid custom curve printed nothing)', false );
			return;
		}
		if ( '' !== $curve ) {
			$out['timing']['easing'] = $curve;
		}
		foreach ( array( 'easing', 'custom' ) as $role ) {
			if ( array_key_exists( $names[ $role ], $attrs ) ) {
				$out['consumed'][] = $names[ $role ];
			}
		}
	}

	/**
	 * The `sgsMotion` fragment: a shape state sourced from the root, and a root state, each carrying the timing.
	 *
	 * @param array<string,mixed> $shape  Shape values (scale, translate, rotate).
	 * @param array<string,mixed> $root   Root values (opacity).
	 * @param array<string,mixed> $timing Duration and easing.
	 * @return array<string,mixed>
	 */
	private static function motion( array $shape, array $root, array $timing ): array {
		if ( array() === $shape && array() === $root && array() === $timing ) {
			return array();
		}
		$elements = array();
		if ( array() !== $shape || array() === $root ) {
			$elements['shape'] = array(
				'hover' => array(
					'state' => array(
						'source' => 'root',
						'values' => $shape + $timing,
					),
				),
			);
		}
		if ( array() !== $root ) {
			$elements['root'] = array( 'hover' => array( 'state' => array( 'values' => $root + $timing ) ) );
		}
		return array(
			'v'        => 1,
			'elements' => $elements,
		);
	}
}
