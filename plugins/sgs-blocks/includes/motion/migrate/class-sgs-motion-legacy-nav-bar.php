<?php
/**
 * The old `sgs/nav-bar-menu` panel motion attributes (Wave 3C U-5, G-5) read as Entrance layers (Spec 38A §13.1,
 * §13.2, FR-38A-51), for `mappers/class-sgs-motion-map-nav-bar.php`.
 *
 * - PANEL: `submenuAnimation` (the renderer's shapes `fade`, `fade-lift`, `slide-down`, `grow`; anything else plays
 *   nothing), `submenuAnimationDuration`, `submenuExitDuration` and `submenuAnimationEasing`/`...Custom` become the
 *   `panel` part's `open` entrance with its close duration and easing. The values are the old stylesheet's
 *   (`nav-bar-menu/style.css`, the panel rules): every shape but `grow` fades from 0; `fade-lift` and `slide-down`
 *   travel 8px down from -8px; `fade-lift` also scales from 0.99; `grow` holds full opacity and uncovers the panel
 *   from its top edge (`clip-path: inset(0 0 100% 0)` to `inset(0)`), the bottom-edge clip wipe with no fade. Close
 *   returns to the from-values, as the old transition did.
 * - ITEMS: `submenuItemStagger`, `submenuItemStaggerMax`, `submenuItemStaggerDuration` and `submenuItemStaggerDistance`
 *   become the item entrance (opacity from 0 and an 8px rise by default, the item's own time or the panel's opening
 *   time, the panel's easing) and the bar's stagger settings; `submenuItemStaggerScope` chooses the mega panel level
 *   the old ladder animated (its columns or each column's rows; dropdown items always). The items held still while a
 *   panel closed, so they hold their resting values on close.
 *
 * Reported, never approximated: an easing name or curve the old renderer did not accept exactly, a stored value that is
 * not a number, and a scope that is neither `columns` nor `rows`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-legacy-hover-value.php';
require_once __DIR__ . '/class-sgs-motion-legacy-nav-drawer.php';

/**
 * Class Sgs_Motion_Legacy_Nav_Bar
 */
final class Sgs_Motion_Legacy_Nav_Bar {

	/** The panel attributes. */
	const PANEL_ATTRS = array( 'submenuAnimation', 'submenuAnimationDuration', 'submenuExitDuration', 'submenuAnimationEasing', 'submenuAnimationEasingCustom' );

	/** The item attributes. */
	const ITEM_ATTRS = array( 'submenuItemStagger', 'submenuItemStaggerDistance', 'submenuItemStaggerDuration', 'submenuItemStaggerMax', 'submenuItemStaggerScope' );

	/** The shapes the old renderer accepted (`nav-bar-menu/render.php`); any other value played nothing. */
	const SHAPES = array( 'fade', 'fade-lift', 'slide-down', 'grow' );

	/** The old item travel when no distance is stored (px). */
	const DEFAULT_DISTANCE = 8;

	/**
	 * The stored panel shape as the old renderer read it: `fade` when absent, `none` for a value it did not accept.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return string
	 */
	public static function shape( array $attrs ): string {
		if ( ! array_key_exists( 'submenuAnimation', $attrs ) ) {
			return 'fade';
		}
		$value = $attrs['submenuAnimation'];
		return is_string( $value ) && in_array( $value, self::SHAPES, true ) ? $value : 'none';
	}

	/**
	 * One shape's panel motion: channel => [from, to]; empty for `none`. A `from`-only channel (the clip wipe, which
	 * rests at no clip) has a null `to`.
	 *
	 * @param string $shape The shape.
	 * @return array<string,array{0:mixed,1:mixed}>
	 */
	public static function panel_channels( string $shape ): array {
		switch ( $shape ) {
			case 'grow':
				return array(
					'clip'     => array( 100, null ),
					'clipEdge' => array( 'bottom', null ),
				);
			case 'fade':
				return array( 'opacity' => array( 0, 1 ) );
			case 'fade-lift':
				return array(
					'opacity'    => array( 0, 1 ),
					'translateY' => array( -8, 0 ),
					'scale'      => array( 0.99, 1 ),
				);
			case 'slide-down':
				return array(
					'opacity'    => array( 0, 1 ),
					'translateY' => array( -8, 0 ),
				);
		}
		return array();
	}

	/**
	 * The panel easing as a schema easing, or null when the stored name or curve has no exact value.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return string|null
	 */
	public static function easing( array $attrs ): ?string {
		$name   = $attrs['submenuAnimationEasing'] ?? 'ease-out-css';
		$custom = $attrs['submenuAnimationEasingCustom'] ?? '';
		if ( ! is_string( $name ) || ! is_string( $custom ) ) {
			return null;
		}
		$found = Sgs_Motion_Legacy_Hover_Value::shared_easing( '' === $name ? 'ease-out-css' : $name, $custom );
		return null === $found || '' === $found ? null : $found;
	}

	/**
	 * Every old panel and item value, read as the old renderer read it.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{ok:bool,shape:string,in:int,out:int,easing:string,step:int,cap:int,own:int,distance:int,scope:string,reported:array<int,array<string,mixed>>}
	 *         `ok` is false when any value has no exact destination; `reported` names each one.
	 */
	public static function read( array $attrs ): array {
		$out = array(
			'ok'       => true,
			'shape'    => self::shape( $attrs ),
			'in'       => 0,
			'out'      => 0,
			'easing'   => '',
			'step'     => 0,
			'cap'      => 0,
			'own'      => 0,
			'distance' => self::DEFAULT_DISTANCE,
			'scope'    => 'columns',
			'reported' => array(),
		);
		$numbers = array(
			'in'   => array( 'submenuAnimationDuration', 180, 3000 ),
			'out'  => array( 'submenuExitDuration', 150, 3000 ),
			'step' => array( 'submenuItemStagger', 0, 1000 ),
			'cap'  => array( 'submenuItemStaggerMax', 0, 10000 ),
			'own'  => array( 'submenuItemStaggerDuration', 0, 3000 ),
		);
		foreach ( $numbers as $key => $spec ) {
			$value = Sgs_Motion_Legacy_Nav_Drawer::ms( $attrs, $spec[0], $spec[1], $spec[2] );
			if ( null === $value ) {
				$out['reported'][] = self::row( $spec[0], $attrs[ $spec[0] ], 'not a number the old renderer accepted', false );
				continue;
			}
			$out[ $key ] = $value;
		}
		$easing = self::easing( $attrs );
		if ( null === $easing ) {
			$out['reported'][] = self::row( 'submenuAnimationEasing', $attrs['submenuAnimationEasing'] ?? null, 'no exact easing (the old renderer fell back to ease-out for this name or curve)', false );
		} else {
			$out['easing'] = $easing;
		}
		if ( array_key_exists( 'submenuItemStaggerDistance', $attrs ) ) {
			$raw = $attrs['submenuItemStaggerDistance'];
			if ( is_bool( $raw ) || ! is_numeric( $raw ) ) {
				$out['reported'][] = self::row( 'submenuItemStaggerDistance', $raw, 'not a number the old renderer accepted', false );
			} else {
				$out['distance'] = max( -400, min( 400, (int) round( (float) $raw ) ) );
			}
		}
		if ( array_key_exists( 'submenuItemStaggerScope', $attrs ) ) {
			$scope = $attrs['submenuItemStaggerScope'];
			if ( 'rows' === $scope || 'columns' === $scope ) {
				$out['scope'] = $scope;
			} else {
				$out['reported'][] = self::row( 'submenuItemStaggerScope', $scope, 'neither columns nor rows', false );
			}
		}
		$out['ok'] = array() === $out['reported'];
		return $out;
	}

	/**
	 * The panel's `open` entrance, or null for `none`.
	 *
	 * @param array<string,mixed> $read The `read()` result.
	 * @return array<string,mixed>|null
	 */
	public static function panel_layer( array $read ): ?array {
		$channels = self::panel_channels( $read['shape'] );
		if ( array() === $channels ) {
			return null;
		}
		$from = array();
		$to   = array();
		foreach ( $channels as $channel => $pair ) {
			$from[ $channel ] = $pair[0];
			if ( null !== $pair[1] ) {
				$to[ $channel ] = $pair[1];
			}
		}
		$values = array( 'from' => $from );
		if ( array() !== $to ) {
			$values['to'] = $to;
		}
		return array(
			'trigger' => 'open',
			'values'  => array_merge(
				$values,
				array(
					'duration' => $read['in'],
					'easing'   => $read['easing'],
				)
			),
			'close'   => array(
				'closeDuration' => $read['out'],
				'closeEasing'   => $read['easing'],
			),
		);
	}

	/**
	 * The item `open` entrance (its delay is written by the server from the stagger settings), or null with no step.
	 *
	 * @param array<string,mixed> $read The `read()` result.
	 * @return array<string,mixed>|null
	 */
	public static function item_layer( array $read ): ?array {
		if ( $read['step'] < 1 ) {
			return null;
		}
		$from = array( 'opacity' => 0 );
		$to   = array( 'opacity' => 1 );
		if ( 0 !== $read['distance'] ) {
			$from['translateY'] = $read['distance'];
			$to['translateY']   = 0;
		}
		return array(
			'trigger' => 'open',
			'values'  => array(
				'from'     => $from,
				'to'       => $to,
				'duration' => $read['own'] > 0 ? $read['own'] : $read['in'],
				'easing'   => $read['easing'],
			),
			'close'   => array(
				'to'            => $to,
				'closeDuration' => 0,
			),
		);
	}

	/**
	 * The bar's stagger settings (no cap when the old maximum was 0). No `apply` key: the items are rendered by the
	 * server, and `Sgs_Motion_Loop_Delays` reads `apply: false` as switched off.
	 *
	 * @param array<string,mixed> $read The `read()` result.
	 * @return array<string,mixed>
	 */
	public static function stagger( array $read ): array {
		$settings = array(
			'offset' => 0,
			'step'   => $read['step'],
			'order'  => 'row-first',
			'perRow' => false,
		);
		if ( $read['cap'] > 0 ) {
			$settings['cap'] = $read['cap'];
		}
		return $settings;
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
		return Sgs_Motion_Legacy_Nav_Drawer::row( $attr, $value, $reason, $consumed );
	}
}
