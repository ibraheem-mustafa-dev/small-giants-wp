<?php
/**
 * The old `sgs/nav-drawer` motion attributes (Wave 3C U-5) read as Entrance layers (Spec 38A §13.1, §13.2,
 * FR-38A-51), for `mappers/class-sgs-motion-map-nav-drawer.php`.
 *
 * - PANEL: `entryAnimation` per tier (`auto` resolved from the tier's `anchor`), `entryDuration`, `exitDuration`,
 *   `entryEasing`/`entryEasingCustom` and `entryFade` become the root's `open` entrance with its close duration and
 *   easing, per-device from and to values where a tier differs, and the identity values on a `none` tier.
 * - ITEMS: `class-sgs-motion-legacy-nav-drawer-items.php`.
 *
 * `wipe-down` and `reveal-from-bar` are the one-edge bottom clip (the second starting at the opener row) and `curtain`
 * the curtain layer with a delayed content fade (`class-sgs-motion-legacy-nav-drawer-curtain.php`). Reported, never
 * approximated: the shapes in `UNMAPPED` (two retired by Bean on 2026-10-15) and the clip item reveal. `corner-scale`
 * keeps its scale and fade; its top-right origin has no field.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-nav-drawer-motion.php';
require_once dirname( __DIR__, 2 ) . '/helpers-nav-drawer-stagger-shape.php';
require_once __DIR__ . '/class-sgs-motion-legacy-hover-value.php';
require_once __DIR__ . '/class-sgs-motion-legacy-nav-drawer-curtain.php';

/**
 * Class Sgs_Motion_Legacy_Nav_Drawer
 */
final class Sgs_Motion_Legacy_Nav_Drawer {

	/** The panel attributes. */
	const PANEL_ATTRS = array( 'entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade', 'curtainColour', 'curtainColourGradient' );

	/** The item attributes. */
	const ITEM_ATTRS = array( 'itemStagger', 'itemStaggerAxis', 'itemStaggerDistance', 'itemStaggerDuration', 'itemStaggerMax', 'itemStaggerOnClose', 'itemStaggerReveal', 'staggerInsideGroups' );

	/** Shapes the model cannot express, with the reason. */
	const UNMAPPED = array(
		'expand-down'      => 'expand-down scales the panel vertically only (scaleY 0.85) and the entrance has one uniform scale field, so a mapped scale would also shrink the panel sideways; needs a scaleY field',
		'wipe-down-skew'   => 'retired (Bean 2026-10-15): wipe-down-skew was a skewed polygon clip and is not rebuilt',
		'grow-from-anchor' => 'retired (Bean 2026-10-15): grow-from-anchor animated the box height from a measured anchor and is not rebuilt',
	);

	/** The identity value of each channel, for a tier that does not move it. */
	const IDENTITY = array(
		'opacity'        => 1,
		'translateX'     => 0,
		'translateY'     => 0,
		'scale'          => 1,
		'clip'           => 0,
		'clipEdge'       => 'all',
		'clipFromAnchor' => 'none',
	);

	/** Channels written on the `from` end only (the clip wipe rests at no clip, which is the schema default). */
	const FROM_ONLY = array( 'clip', 'clipEdge', 'clipFromAnchor' );

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
	 * @return array<string,array{0:mixed,1:mixed}>|null A `from`-only channel has a null `to`.
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
			case 'wipe-down':
				return $fade_pair + array(
					'clip'     => array( 100, null ),
					'clipEdge' => array( 'bottom', null ),
				);
			case 'reveal-from-bar':
				return array(
					'clip'           => array( 100, null ),
					'clipEdge'       => array( 'bottom', null ),
					'clipFromAnchor' => array( 'opener-row', null ),
				);
			case 'curtain':
				return array();
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
	 * @return array{layer:?array<string,mixed>,text:?array<string,mixed>,body:?array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 *         `layer` is the root's base entrance, `text` the curtain layer on the root, `body` the content fade the curtain pairs with.
	 */
	public static function panel( array $attrs ): array {
		$out    = array(
			'layer'    => null,
			'text'     => null,
			'body'     => null,
			'consumed' => array(),
			'reported' => array(),
		);
		$shapes = sgs_nav_drawer_motion_shapes();
		$fade   = ! array_key_exists( 'entryFade', $attrs ) || ! empty( $attrs['entryFade'] );
		$tiers  = array();
		$bad    = array();
		$used   = array();
		$plays  = array();
		foreach ( self::TIERS as $tier ) {
			$shape = (string) self::tier( $attrs['entryAnimation'] ?? array(), $tier, 'auto' );
			$shape = in_array( $shape, $shapes, true ) ? $shape : 'auto';
			if ( 'auto' === $shape ) {
				$shape = sgs_nav_drawer_motion_auto_shape( (string) self::tier( $attrs['anchor'] ?? array(), $tier, 'full-screen' ) );
			}
			$used[ $shape ] = true;
			if ( 'curtain' === $shape ) {
				$plays[] = $tier;
			}
			$channels = self::panel_channels( $shape, $fade );
			if ( null === $channels ) {
				$bad[ $tier ] = self::UNMAPPED[ $shape ];
				continue;
			}
			$tiers[ $tier ] = $channels;
		}
		$curtain = isset( $used['curtain'] );
		$refusal = $curtain ? Sgs_Motion_Legacy_Nav_Drawer_Curtain::refusal( $attrs, $plays ) : null;
		foreach ( null === $refusal ? array() : $plays as $tier ) {
			$bad[ $tier ] = $refusal;
		}
		if ( array() !== $bad ) {
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'no destination at ' . implode( ', ', array_keys( $bad ) ) . ': ' . implode( '; ', array_unique( $bad ) ) . '. The panel is left unmapped and its timing attributes stay', false );
			foreach ( array( 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade' ) as $key ) {
				if ( array_key_exists( $key, $attrs ) ) {
					$out['reported'][] = self::row( $key, $attrs[ $key ], 'left in place with the unmapped panel shape', false );
				}
			}
			self::curtain_rows( $attrs, $curtain ? 'left' : 'inert', $out );
			return $out;
		}

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
				self::curtain_rows( $attrs, $curtain ? 'left' : 'inert', $out );
				return $out;
			}
		}
		self::curtain_rows( $attrs, $curtain ? 'mapped' : 'inert', $out );
		$out['consumed'] = array_merge( $out['consumed'], array_values( array_intersect( array( 'entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade' ), array_keys( $attrs ) ) ) );
		if ( isset( $used['slide-start'] ) || isset( $used['slide-end'] ) ) {
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'changed: the start and end slides no longer mirror in right-to-left languages (the model has no direction flip)', true );
		}
		if ( isset( $used['corner-scale'] ) ) {
			$out['reported'][] = self::row( 'entryAnimation', $attrs['entryAnimation'] ?? 'auto', 'changed: the corner scale keeps its scale and fade; its top-right transform origin has no field', true );
		}
		if ( $curtain ) {
			$pair            = Sgs_Motion_Legacy_Nav_Drawer_Curtain::layers( $attrs, $enter, $exit, $easing );
			$out['text']     = $pair['text'];
			$out['body']     = $pair['body'];
			$out['reported'] = array_merge( $out['reported'], $pair['reported'] );
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
	 * Report the curtain colour and gradient: inert without a curtain shape, left in place with an unmapped curtain,
	 * consumed once the curtain layer carries the colour.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @param string              $state `mapped`, `left` (a curtain left unmapped) or `inert` (no curtain shape).
	 * @param array<string,mixed> $out   Accumulator.
	 */
	private static function curtain_rows( array $attrs, string $state, array &$out ): void {
		foreach ( array( 'curtainColour', 'curtainColourGradient' ) as $key ) {
			if ( ! array_key_exists( $key, $attrs ) ) {
				continue;
			}
			if ( 'left' === $state ) {
				$out['reported'][] = self::row( $key, $attrs[ $key ], 'left in place with the unmapped curtain shape', false );
				continue;
			}
			$out['consumed'][] = $key;
			if ( 'inert' === $state ) {
				$out['reported'][] = self::row( $key, $attrs[ $key ], 'inert: a curtain colour with no curtain shape', true );
			}
		}
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
				$from_only                         = in_array( $channel, self::FROM_ONLY, true );
				$pair                              = $tiers[ $tier ][ $channel ] ?? array( self::IDENTITY[ $channel ], $from_only ? null : self::IDENTITY[ $channel ] );
				$full[ $tier ]['from'][ $channel ] = $pair[0];
				if ( ! $from_only ) {
					$full[ $tier ]['to'][ $channel ] = $pair[1];
				}
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
		$values = $full['desktop'];
		if ( array() === $values['to'] ) {
			unset( $values['to'] );
		}
		return array(
			'values'  => $values,
			'devices' => $devices,
		);
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
