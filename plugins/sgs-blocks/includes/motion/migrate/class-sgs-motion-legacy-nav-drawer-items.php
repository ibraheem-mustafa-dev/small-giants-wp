<?php
/**
 * The old `sgs/nav-drawer` item stagger attributes (Wave 3C U-5) read as an Entrance layer (Spec 38A §13.1, §13.2,
 * FR-38A-51), for `mappers/class-sgs-motion-map-nav-drawer.php`: `itemStagger`, `itemStaggerMax`,
 * `itemStaggerDuration`, `itemStaggerDistance` and `itemStaggerAxis` (the multipliers of `Sgs_Motion_Legacy_Nav_Drawer::STAGGER_AXES`)
 * become the item entrance; `itemStaggerOnClose` gives the items their own close, and without it they hold their
 * resting values while the panel closes, as they did. The clip item reveal has no destination and is reported.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-legacy-nav-drawer.php';

/**
 * Class Sgs_Motion_Legacy_Nav_Drawer_Items
 */
final class Sgs_Motion_Legacy_Nav_Drawer_Items {

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
		$step = Sgs_Motion_Legacy_Nav_Drawer::ms( $attrs, 'itemStagger', 0, 1000 );
		$cap  = Sgs_Motion_Legacy_Nav_Drawer::ms( $attrs, 'itemStaggerMax', 0, 10000 );
		$own  = Sgs_Motion_Legacy_Nav_Drawer::ms( $attrs, 'itemStaggerDuration', 0 );
		$open = Sgs_Motion_Legacy_Nav_Drawer::ms( $attrs, 'entryDuration', 250 );
		foreach ( array(
			'itemStagger'         => $step,
			'itemStaggerMax'      => $cap,
			'itemStaggerDuration' => $own,
			'entryDuration'       => $open,
		) as $key => $value ) {
			if ( null === $value ) {
				$out['reported'][] = Sgs_Motion_Legacy_Nav_Drawer::row( $key, $attrs[ $key ], 'not a number; the item stagger is left unmapped', false );
				return $out;
			}
		}
		$present = array_values( array_intersect( Sgs_Motion_Legacy_Nav_Drawer::ITEM_ATTRS, array_keys( $attrs ) ) );
		if ( 0 === $step ) {
			$out['consumed'] = $present;
			foreach ( array_diff( $present, array( 'itemStagger' ) ) as $key ) {
				$out['reported'][] = Sgs_Motion_Legacy_Nav_Drawer::row( $key, $attrs[ $key ], 'inert: an item setting with no stagger step', true );
			}
			return $out;
		}
		$chosen = is_string( $attrs['entryEasing'] ?? null ) && '' !== $attrs['entryEasing'] && 'ease-out-css' !== $attrs['entryEasing'];
		$easing = $chosen ? Sgs_Motion_Legacy_Nav_Drawer::easing( $attrs ) : 'token:entrance.easing';
		if ( null === $easing ) {
			$out['reported'][] = Sgs_Motion_Legacy_Nav_Drawer::row( 'entryEasing', $attrs['entryEasing'], 'no exact easing for the items; the item stagger is left unmapped', false );
			return $out;
		}
		$clip  = 'clip' === ( $attrs['itemStaggerReveal'] ?? 'translate' );
		$axes  = Sgs_Motion_Legacy_Nav_Drawer::STAGGER_AXES;
		$tiers = array();
		foreach ( Sgs_Motion_Legacy_Nav_Drawer::TIERS as $tier ) {
			$axis = (string) Sgs_Motion_Legacy_Nav_Drawer::tier( $attrs['itemStaggerAxis'] ?? array(), $tier, 'vertical' );
			$axis = isset( $axes[ $axis ] ) ? $axis : 'vertical';
			$dist = Sgs_Motion_Legacy_Nav_Drawer::tier( $attrs['itemStaggerDistance'] ?? array(), $tier, null );
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
		$moves = Sgs_Motion_Legacy_Nav_Drawer::tiered_moves( $tiers );
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
			$out['reported'][] = Sgs_Motion_Legacy_Nav_Drawer::row( 'itemStaggerReveal', 'clip', 'no destination: the clip reveal uncovers each item from its top edge only (inset(0 0 100% 0)) and the model clip insets every edge equally; the items keep their travel without a fade, as the clip reveal did', false );
		}
		$axis_raw = $attrs['itemStaggerAxis'] ?? array();
		foreach ( Sgs_Motion_Legacy_Nav_Drawer::TIERS as $tier ) {
			if ( 'vertical' !== Sgs_Motion_Legacy_Nav_Drawer::tier( $axis_raw, $tier, 'vertical' ) ) {
				$out['reported'][] = Sgs_Motion_Legacy_Nav_Drawer::row( 'itemStaggerAxis', $axis_raw, 'changed: a start or end item travel no longer mirrors in right-to-left languages', true );
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
				$hold[ $channel ] = Sgs_Motion_Legacy_Nav_Drawer::IDENTITY[ $channel ];
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
}
