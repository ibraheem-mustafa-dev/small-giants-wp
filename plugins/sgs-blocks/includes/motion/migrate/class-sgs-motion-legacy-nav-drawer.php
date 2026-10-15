<?php
/**
 * The old `sgs/nav-drawer` motion attributes (Wave 3C U-5) read as Entrance layers (Spec 38A §13.1, §13.2,
 * FR-38A-51), for `mappers/class-sgs-motion-map-nav-drawer.php`.
 *
 * - PANEL: `entryAnimation` per tier (`auto` resolved from the tier's `anchor`), `entryDuration`, `exitDuration`,
 *   `entryEasing`/`entryEasingCustom` and `entryFade` become the root's `open` entrance with its close duration and
 *   easing, per-device from and to values where a tier differs, and the identity values on a `none` tier.
 * - ITEMS: `itemStagger`, `itemStaggerMax`, `itemStaggerDuration`, `itemStaggerDistance` and `itemStaggerAxis` (the
 *   multipliers of `sgs_nav_drawer_stagger_axes()`) become the item entrance; `itemStaggerOnClose` gives the items
 *   their own close, and without it they hold their resting values while the panel closes, as they did.
 *
 * Reported, never approximated: the shapes in `UNMAPPED` and the clip item reveal. `corner-scale` keeps its scale and
 * fade; its top-right origin has no field.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-nav-drawer-motion.php';
require_once dirname( __DIR__, 2 ) . '/helpers-nav-drawer-stagger-shape.php';
require_once __DIR__ . '/class-sgs-motion-legacy-hover-value.php';

/**
 * Class Sgs_Motion_Legacy_Nav_Drawer
 */
final class Sgs_Motion_Legacy_Nav_Drawer {

	/** The panel attributes. */
	const PANEL_ATTRS = array( 'entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade', 'curtainColour' );

	/** The item attributes. */
	const ITEM_ATTRS = array( 'itemStagger', 'itemStaggerAxis', 'itemStaggerDistance', 'itemStaggerDuration', 'itemStaggerMax', 'itemStaggerOnClose', 'itemStaggerReveal', 'staggerInsideGroups' );

	/** Shapes the model cannot express, with the reason. */
	const UNMAPPED = array(
		'expand-down'      => 'expand-down scales the panel vertically only (scaleY 0.85) and the model has one uniform scale',
		'wipe-down'        => 'wipe-down clips from the bottom edge only (inset(0 0 100% 0)) and the model clip insets every edge equally; needs a directional clip preset',
		'wipe-down-skew'   => 'wipe-down-skew is a skewed polygon clip; needs a polygon clip preset',
		'reveal-from-bar'  => 'reveal-from-bar clips from the measured opener row (--sgs-drawer-opener-row-bottom); needs a directional clip preset fed by the store',
		'curtain'          => 'curtain sweeps a colour layer on the panel ::before, which is not a motion target; needs a curtain preset with its own layer',
		'grow-from-anchor' => 'grow-from-anchor animates the box height from its anchor (measured by script), and height is not a motion channel',
	);

	const IDENTITY = array(
		'opacity'    => 1,
		'translateX' => 0,
		'translateY' => 0,
		'scale'      => 1,
	);

	const TIERS = array( 'desktop', 'tablet', 'mobile' );

	/**
	 * A flat millisecond attribute as the old renderer read it: rounded and held to 0..max, the default when absent.
	 *
	 * @param array<string,mixed> $attrs   Stored attributes.
	 * @param string              $key     Attribute.
	 * @param int                 $fallback Value when absent.
	 * @param int                 $max     Upper bound.
	 * @return int|null Null for a stored value that is not a number.
	 */
	public static function ms( array $attrs, string $key, int $fallback, int $max = 3000 ): ?int {
		if ( ! array_key_exists( $key, $attrs ) ) {
			return $fallback;
		}
		$raw = $attrs[ $key ];
		if ( is_bool( $raw ) || ! is_numeric( $raw ) ) {
			return null;
		}
		return max( 0, min( $max, (int) round( (float) $raw ) ) );
	}

	/**
	 * A tier object's value at one tier: Tablet inherits Desktop and Mobile inherits Tablet; blank or `inherit` inherits.
	 *
	 * @param mixed  $obj     The stored tier object.
	 * @param string $tier    Tier.
	 * @param mixed  $fallback Desktop value when unset.
	 * @return mixed
	 */
	public static function tier( $obj, string $tier, $fallback ) {
		$obj   = is_array( $obj ) ? $obj : array();
		$chain = array(
			'desktop' => array( 'desktop' ),
			'tablet'  => array( 'tablet', 'desktop' ),
			'mobile'  => array( 'mobile', 'tablet', 'desktop' ),
		);
		foreach ( $chain[ $tier ] as $key ) {
			$value = $obj[ $key ] ?? null;
			if ( null !== $value && '' !== $value && 'inherit' !== $value ) {
				return $value;
			}
		}
		return $fallback;
	}

	/**
	 * The opening easing as a schema easing, or null when the stored name or curve has no exact value.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return string|null
	 */
	public static function easing( array $attrs ): ?string {
		$name   = is_string( $attrs['entryEasing'] ?? null ) ? $attrs['entryEasing'] : 'ease-out-css';
		$custom = is_string( $attrs['entryEasingCustom'] ?? null ) ? $attrs['entryEasingCustom'] : '';
		$found  = Sgs_Motion_Legacy_Hover_Value::shared_easing( '' === $name ? 'ease-out-css' : $name, $custom );
		return '' === $found ? null : $found;
	}

	/**
	 * One tier's panel motion: channel => [from, to], or null when the shape (`auto` resolved) has no destination.
	 *
	 * @param string $shape The tier's shape.
	 * @param bool   $fade  `entryFade`.
	 * @return array<string,array{0:mixed,1:mixed}>|null
	 */
	public static function panel_channels( string $shape, bool $fade ): ?array {
		if ( isset( self::UNMAPPED[ $shape ] ) ) {
			return null;
		}
		$fade_pair = $fade ? array( 'opacity' => array( 0, 1 ) ) : array();
		switch ( $shape ) {
			case 'none':
				return array();
			case 'fade':
				return array( 'opacity' => array( 0, 1 ) );
			case 'nudge':
				return array(
					'opacity'    => array( 0, 1 ),
					'translateY' => array( -8, 0 ),
				);
			case 'slide-start':
				return $fade_pair + array( 'translateX' => array( '-100%', 0 ) );
			case 'slide-end':
				return $fade_pair + array( 'translateX' => array( '100%', 0 ) );
			case 'slide-up':
				return $fade_pair + array( 'translateY' => array( '100%', 0 ) );
			case 'slide-down':
				return $fade_pair + array( 'translateY' => array( '-100%', 0 ) );
			case 'scale':
			case 'modal-scale':
				return array(
					'opacity' => array( 0, 1 ),
					'scale'   => array( 0.95, 1 ),
				);
			case 'corner-scale':
				return array(
					'opacity' => array( 0, 1 ),
					'scale'   => array( 0.9, 1 ),
				);
		}
		return null;
	}

	/**
	 * The drawer panel's entrance.
	 *
	 * @param array<string,mixed> $attrs Stored drawer attributes.
	 * @return array{layer:?array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	public static function panel( array $attrs ): array {
		$out    = array(
			'layer'    => null,
			'consumed' => array(),
			'reported' => array(),
		);
		$shapes = sgs_nav_drawer_motion_shapes();
		$fade   = ! array_key_exists( 'entryFade', $attrs ) || ! empty( $attrs['entryFade'] );
		$tiers  = array();
		$bad    = array();
		$used   = array();
		foreach ( self::TIERS as $tier ) {
			$shape = (string) self::tier( $attrs['entryAnimation'] ?? array(), $tier, 'auto' );
			$shape = in_array( $shape, $shapes, true ) ? $shape : 'auto';
			if ( 'auto' === $shape ) {
				$shape = sgs_nav_drawer_motion_auto_shape( (string) self::tier( $attrs['anchor'] ?? array(), $tier, 'full-screen' ) );
			}
			$used[ $shape ] = true;
			$channels       = self::panel_channels( $shape, $fade );
			if ( null === $channels ) {
				$bad[ $tier ] = $shape;
				continue;
			}
			$tiers[ $tier ] = $channels;
		}
		$curtain = isset( $used['curtain'] );
		if ( array() !== $bad ) {
			$reasons = array();
			foreach ( array_unique( $bad ) as $shape ) {
				$reasons[] = self::UNMAPPED[ $shape ];
			}
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'no destination at ' . implode( ', ', array_keys( $bad ) ) . ': ' . implode( '; ', $reasons ) . '. The panel is left unmapped and its timing attributes stay', false );
			foreach ( array( 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade' ) as $key ) {
				if ( array_key_exists( $key, $attrs ) ) {
					$out['reported'][] = self::row( $key, $attrs[ $key ], 'left in place with the unmapped panel shape', false );
				}
			}
			self::curtain_rows( $attrs, $curtain, $out );
			return $out;
		}
		self::curtain_rows( $attrs, $curtain, $out );

		$enter  = self::ms( $attrs, 'entryDuration', 250 );
		$exit   = self::ms( $attrs, 'exitDuration', 200 );
		$easing = self::easing( $attrs );
		foreach ( array(
			'entryDuration' => $enter,
			'exitDuration'  => $exit,
			'entryEasing'   => $easing,
		) as $key => $value ) {
			if ( null === $value ) {
				$out['reported'][] = self::row( $key, $attrs[ $key ] ?? null, 'not a value the old renderer accepted exactly; the panel is left unmapped', false );
				return $out;
			}
		}
		$out['consumed'] = array_merge( $out['consumed'], array_values( array_intersect( array( 'entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade' ), array_keys( $attrs ) ) ) );
		if ( isset( $used['slide-start'] ) || isset( $used['slide-end'] ) ) {
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'changed: the start and end slides no longer mirror in right-to-left languages (the model has no direction flip)', true );
		}
		if ( isset( $used['corner-scale'] ) ) {
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'changed: the corner scale keeps its scale and fade; its top-right transform origin has no field', true );
		}
		$moves = self::tiered_moves( $tiers );
		if ( null === $moves ) {
			return $out;
		}
		$layer = array(
			'trigger' => 'open',
			'values'  => array_merge(
				$moves['values'],
				array(
					'duration' => $enter,
					'easing'   => $easing,
				)
			),
			'close'   => array(
				'closeDuration' => $exit,
				'closeEasing'   => $easing,
			),
		);
		if ( array() !== $moves['devices'] ) {
			$layer['devices'] = $moves['devices'];
		}
		$out['layer'] = $layer;
		return $out;
	}

	/**
	 * Report the curtain colour: inert without a curtain shape, left in place with one.
	 *
	 * @param array<string,mixed> $attrs   Stored attributes.
	 * @param bool                $curtain Whether any tier plays the curtain.
	 * @param array<string,mixed> $out     Accumulator.
	 */
	private static function curtain_rows( array $attrs, bool $curtain, array &$out ): void {
		if ( ! array_key_exists( 'curtainColour', $attrs ) ) {
			return;
		}
		if ( $curtain ) {
			$out['reported'][] = self::row( 'curtainColour', $attrs['curtainColour'], 'left in place with the unmapped curtain shape', false );
			return;
		}
		$out['consumed'][] = 'curtainColour';
		$out['reported'][] = self::row( 'curtainColour', $attrs['curtainColour'], 'inert: a curtain colour with no curtain shape', true );
	}

	/**
	 * Per-tier channel pairs as Desktop values plus Tablet and Mobile overrides (only where a tier differs from the
	 * tier above). Every tier carries every channel any tier uses; an unused channel holds its identity value.
	 *
	 * @param array<string,array<string,array{0:mixed,1:mixed}>> $tiers Channels per tier.
	 * @return array{values:array<string,mixed>,devices:array<string,mixed>}|null Null when no tier moves.
	 */
	public static function tiered_moves( array $tiers ): ?array {
		$channels = array();
		foreach ( $tiers as $pairs ) {
			foreach ( array_keys( $pairs ) as $channel ) {
				$channels[ $channel ] = true;
			}
		}
		if ( array() === $channels ) {
			return null;
		}
		$full = array();
		foreach ( self::TIERS as $tier ) {
			$full[ $tier ] = array(
				'from' => array(),
				'to'   => array(),
			);
			foreach ( array_keys( self::IDENTITY ) as $channel ) {
				if ( ! isset( $channels[ $channel ] ) ) {
					continue;
				}
				$pair                              = $tiers[ $tier ][ $channel ] ?? array( self::IDENTITY[ $channel ], self::IDENTITY[ $channel ] );
				$full[ $tier ]['from'][ $channel ] = $pair[0];
				$full[ $tier ]['to'][ $channel ]   = $pair[1];
			}
		}
		$devices = array();
		$above   = 'desktop';
		foreach ( array( 'tablet', 'mobile' ) as $tier ) {
			$set = array();
			foreach ( array( 'from', 'to' ) as $end ) {
				$diff = array();
				foreach ( $full[ $tier ][ $end ] as $channel => $value ) {
					if ( $full[ $above ][ $end ][ $channel ] !== $value ) {
						$diff[ $channel ] = $value;
					}
				}
				if ( array() !== $diff ) {
					$set[ $end ] = $diff;
				}
			}
			if ( array() !== $set ) {
				$devices[ $tier ] = $set;
			}
			$above = $tier;
		}
		return array(
			'values'  => $full['desktop'],
			'devices' => $devices,
		);
	}

	/**
	 * The item entrance and the stagger settings, without delays (the caller places each item's delay).
	 *
	 * @param array<string,mixed> $attrs Stored drawer attributes.
	 * @return array{layer:?array<string,mixed>,step:int,cap:int,dur:int,easing:string,reversed:bool,groups:bool,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	public static function items( array $attrs ): array {
		$out  = array(
			'layer'    => null,
			'step'     => 0,
			'cap'      => 0,
			'dur'      => 0,
			'easing'   => '',
			'reversed' => ! empty( $attrs['itemStaggerOnClose'] ),
			'groups'   => ! empty( $attrs['staggerInsideGroups'] ),
			'consumed' => array(),
			'reported' => array(),
		);
		$step = self::ms( $attrs, 'itemStagger', 0, 1000 );
		$cap  = self::ms( $attrs, 'itemStaggerMax', 0, 10000 );
		$own  = self::ms( $attrs, 'itemStaggerDuration', 0 );
		$open = self::ms( $attrs, 'entryDuration', 250 );
		foreach ( array(
			'itemStagger'         => $step,
			'itemStaggerMax'      => $cap,
			'itemStaggerDuration' => $own,
			'entryDuration'       => $open,
		) as $key => $value ) {
			if ( null === $value ) {
				$out['reported'][] = self::row( $key, $attrs[ $key ], 'not a number; the item stagger is left unmapped', false );
				return $out;
			}
		}
		$present = array_values( array_intersect( self::ITEM_ATTRS, array_keys( $attrs ) ) );
		if ( 0 === $step ) {
			$out['consumed'] = $present;
			foreach ( array_diff( $present, array( 'itemStagger' ) ) as $key ) {
				$out['reported'][] = self::row( $key, $attrs[ $key ], 'inert: an item setting with no stagger step', true );
			}
			return $out;
		}
		$chosen = is_string( $attrs['entryEasing'] ?? null ) && '' !== $attrs['entryEasing'] && 'ease-out-css' !== $attrs['entryEasing'];
		$easing = $chosen ? self::easing( $attrs ) : 'token:entrance.easing';
		if ( null === $easing ) {
			$out['reported'][] = self::row( 'entryEasing', $attrs['entryEasing'], 'no exact easing for the items; the item stagger is left unmapped', false );
			return $out;
		}
		$clip  = 'clip' === ( $attrs['itemStaggerReveal'] ?? 'translate' );
		$axes  = sgs_nav_drawer_stagger_axes();
		$tiers = array();
		foreach ( self::TIERS as $tier ) {
			$axis = (string) self::tier( $attrs['itemStaggerAxis'] ?? array(), $tier, 'vertical' );
			$axis = isset( $axes[ $axis ] ) ? $axis : 'vertical';
			$dist = self::tier( $attrs['itemStaggerDistance'] ?? array(), $tier, null );
			$pair = array();
			if ( ! $clip ) {
				$pair['opacity'] = array( 0, 1 );
			}
			foreach ( array(
				'translateX' => $axes[ $axis ][0],
				'translateY' => $axes[ $axis ][1],
			) as $channel => $sign ) {
				if ( 0 !== $sign ) {
					$pair[ $channel ] = array( self::travel( $dist, $sign ), 0 );
				}
			}
			$tiers[ $tier ] = $pair;
		}
		$moves = self::tiered_moves( $tiers );
		if ( null === $moves ) {
			return $out;
		}
		$dur   = $own > 0 ? $own : $open;
		$layer = array(
			'trigger' => 'open',
			'values'  => array_merge(
				$moves['values'],
				array(
					'duration' => $dur,
					'easing'   => $easing,
				)
			),
		);
		if ( array() !== $moves['devices'] ) {
			$layer['devices'] = $moves['devices'];
		}
		$out['layer']    = $layer;
		$out['step']     = $step;
		$out['cap']      = $cap;
		$out['dur']      = $dur;
		$out['easing']   = $easing;
		$out['consumed'] = $clip ? array_values( array_diff( $present, array( 'itemStaggerReveal' ) ) ) : $present;
		if ( $clip ) {
			$out['reported'][] = self::row( 'itemStaggerReveal', 'clip', 'no destination: the clip reveal uncovers each item from its top edge only (inset(0 0 100% 0)) and the model clip insets every edge equally; the items keep their travel without a fade, as the clip reveal did', false );
		}
		$axis_raw = $attrs['itemStaggerAxis'] ?? array();
		foreach ( self::TIERS as $tier ) {
			if ( 'vertical' !== self::tier( $axis_raw, $tier, 'vertical' ) ) {
				$out['reported'][] = self::row( 'itemStaggerAxis', $axis_raw, 'changed: a start or end item travel no longer mirrors in right-to-left languages', true );
				break;
			}
		}
		return $out;
	}

	/**
	 * One tier's item travel: a stored number of pixels (negative falls from above), or the entrance distance token.
	 *
	 * @param mixed $dist Stored tier value, or null when unset.
	 * @param int   $sign The axis multiplier, 1 or -1.
	 * @return int|string
	 */
	private static function travel( $dist, int $sign ) {
		if ( is_numeric( $dist ) ) {
			return $sign * max( -2000, min( 2000, (int) round( (float) $dist ) ) );
		}
		return $sign < 0 ? '-token:entrance.distance' : 'token:entrance.distance';
	}

	/**
	 * An item's layer with its delays and its close.
	 *
	 * @param array<string,mixed> $items       The `items()` result.
	 * @param int                 $delay       Open delay (ms).
	 * @param int|null            $close_delay Close delay (ms) when the items close in order; null holds them still.
	 * @param bool                $customised  Whether the delays are not the helper's positional values.
	 * @return array<string,mixed>
	 */
	public static function item_layer( array $items, int $delay, ?int $close_delay, bool $customised ): array {
		$layer                    = $items['layer'];
		$layer['values']['delay'] = $delay;
		if ( null === $close_delay ) {
			$hold = array();
			foreach ( array_keys( $layer['values']['to'] ?? array() ) as $channel ) {
				$hold[ $channel ] = self::IDENTITY[ $channel ];
			}
			$layer['close'] = array(
				'to'            => $hold,
				'closeDuration' => 0,
			);
		} else {
			$layer['close'] = array(
				'closeDuration' => $items['dur'],
				'closeEasing'   => $items['easing'],
				'closeDelay'    => $close_delay,
			);
		}
		if ( $customised ) {
			$layer['customised'] = null === $close_delay ? array( 'values.delay' ) : array( 'values.delay', 'close.closeDelay' );
		}
		return $layer;
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Reason.
	 * @param bool   $consumed Whether the attribute is removed.
	 * @return array{attr:string,value:mixed,reason:string,consumed:bool}
	 */
	public static function row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}
}
