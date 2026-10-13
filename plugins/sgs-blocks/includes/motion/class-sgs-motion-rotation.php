<?php
/**
 * Motion rotation: the hover state's rest and hover angles and Follow pointer's settle timing (Spec 38A §10;
 * FR-38A-41, FR-38A-42).
 *
 * One modular Rotate writes two channels. The Z angle (`rotate`, `restRotate`) feeds the `rotate` channel; the X and
 * Y angles (`rotateX`, `rotateY`, `restRotateX`, `restRotateY`) feed the summed `transform` channel, under the
 * element's one perspective (`--sgs-persp-self`). Each pair is written the same way: the rest angle directly to its
 * own property (a styling value), and the hover angle as `--sgs-mh-to-<suffix>`, stored as the hover angle minus the
 * rest angle, so the engaged hover reads the hover angle exactly. Follow pointer (`followPointer`) adds the
 * `transform` channel and transitions `--sgs-tilt-x` and `--sgs-tilt-y` on its own settle duration and easing (the
 * pointer writer itself is a front-end script that writes those two properties only).
 *
 * Field keys, owner properties and channels are read from the schema through `Sgs_Motion_Emitter::fields()`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Rotation
 */
final class Sgs_Motion_Rotation {

	/** Hover angle field => its rest angle field. */
	const PAIRS = array(
		'rotate'  => 'restRotate',
		'rotateX' => 'restRotateX',
		'rotateY' => 'restRotateY',
	);

	/** The Follow pointer switch and its settle timing fields on the hover state. */
	const FOLLOW          = 'followPointer';
	const FOLLOW_DURATION = 'resetDuration';
	const FOLLOW_EASING   = 'resetEasing';

	/** The `$defs` node the hover state's values live in. */
	const DEF = 'HoverStateValues';

	/**
	 * Whether a field key is one of the rotate angles (hover or rest).
	 *
	 * @param string $key Field key.
	 * @return bool
	 */
	public static function is_angle( string $key ): bool {
		return isset( self::PAIRS[ $key ] ) || in_array( $key, self::PAIRS, true );
	}

	/**
	 * Empty per-pair holders: every hover and rest angle key mapped to null.
	 *
	 * @return array<string,null>
	 */
	public static function empty_angles(): array {
		return array_fill_keys( array_merge( array_keys( self::PAIRS ), array_values( self::PAIRS ) ), null );
	}

	/**
	 * Write, for each pair this tier touches, the rest angle directly and the hover angle as its to-value (hover minus
	 * rest).
	 *
	 * @param array<string,?string>              $angles  Effective CSS angles so far, by field key.
	 * @param array<string,mixed>                $raw     Effective stored angles so far, by field key.
	 * @param array<string,bool>                 $changed The angle keys this tier sets.
	 * @param string                             $tier    Tier.
	 * @param array<string,array<string,string>> $decls   Per-tier declarations (by reference).
	 * @param array<string,bool>                 $owners  Owner properties present (by reference).
	 * @return void
	 */
	public static function hover_angles( array $angles, array $raw, array $changed, string $tier, array &$decls, array &$owners ): void {
		$fields = Sgs_Motion_Emitter::fields( self::DEF );
		foreach ( self::PAIRS as $hover_key => $rest_key ) {
			if ( ! isset( $changed[ $hover_key ] ) && ! isset( $changed[ $rest_key ] ) ) {
				continue;
			}
			$rest_prop  = (string) ( $fields[ $rest_key ]['css'] ?? '' );
			$hover_prop = (string) ( $fields[ $hover_key ]['css'] ?? '' );
			if ( '' === $rest_prop || '' === $hover_prop ) {
				continue;
			}
			if ( null !== $angles[ $rest_key ] ) {
				$decls[ $tier ][ $rest_prop ] = $angles[ $rest_key ];
			}
			if ( null === $angles[ $hover_key ] ) {
				continue;
			}
			$to = $angles[ $hover_key ];
			if ( null !== $angles[ $rest_key ] ) {
				$diff = null;
				if ( self::is_number( $raw[ $hover_key ] ) && self::is_number( $raw[ $rest_key ] ) ) {
					$diff = Sgs_Motion_Emitter::value_css( self::DEF, $hover_key, $raw[ $hover_key ] - $raw[ $rest_key ] );
				}
				$to = $diff ?? 'calc(' . $angles[ $hover_key ] . ' - ' . $angles[ $rest_key ] . ')';
			}
			$decls[ $tier ][ Sgs_Motion_Emitter::MH_PREFIX . 'to-' . substr( $hover_prop, strlen( Sgs_Motion_Emitter::MH_PREFIX ) ) ] = $to;
			$owners[ $hover_prop ] = true;
		}
	}

	/**
	 * The channels the hover state's angles write: a pair with either angle set adds its owner property's channel.
	 *
	 * @param array<string,?string> $angles   Effective CSS angles, by field key (any tier).
	 * @param array<string,bool>    $channels Channel set (by reference).
	 * @return void
	 */
	public static function angle_channels( array $angles, array &$channels ): void {
		$fields = Sgs_Motion_Emitter::fields( self::DEF );
		$map    = Sgs_Motion_Emitter::property_channels();
		foreach ( self::PAIRS as $hover_key => $rest_key ) {
			$prop = (string) ( $fields[ $hover_key ]['css'] ?? '' );
			if ( ( null !== $angles[ $hover_key ] || null !== $angles[ $rest_key ] ) && isset( $map[ $prop ] ) ) {
				$channels[ $map[ $prop ] ] = true;
			}
		}
	}

	/**
	 * Whether Follow pointer is on (it is not per device).
	 *
	 * @param array<string,mixed> $desktop The hover state's desktop values.
	 * @return bool
	 */
	public static function follows( array $desktop ): bool {
		return true === ( $desktop[ self::FOLLOW ] ?? null );
	}

	/**
	 * Follow pointer's default settle timing: the medium duration and the spring easing tokens.
	 *
	 * @return array{duration:string,easing:string}
	 */
	public static function follow_defaults(): array {
		return array(
			'duration' => Sgs_Motion_Field_Types::resolve_token( 'token:duration.medium' ) ?? '300ms',
			'easing'   => Sgs_Motion_Field_Types::resolve_token( 'token:easing.spring' ) ?? 'ease-out',
		);
	}

	/**
	 * Apply one tier's settle timing to Follow pointer's running timing.
	 *
	 * @param array<string,mixed>                  $values One tier's hover state values.
	 * @param array{duration:string,easing:string} $timing Running timing (by reference).
	 * @return bool Whether the tier changed it.
	 */
	public static function follow_timing( array $values, array &$timing ): bool {
		$changed = false;
		foreach ( array(
			self::FOLLOW_DURATION => 'duration',
			self::FOLLOW_EASING   => 'easing',
		) as $key => $slot ) {
			if ( ! array_key_exists( $key, $values ) ) {
				continue;
			}
			$css = Sgs_Motion_Emitter::value_css( self::DEF, $key, $values[ $key ] );
			if ( null !== $css ) {
				$timing[ $slot ] = $css;
				$changed         = true;
			}
		}
		return $changed;
	}

	/**
	 * Follow pointer's transition entries: its owner properties (from `x-sgs-channels`) on its settle timing. The
	 * duration is multiplied by `1 - --sgs-mh-on` (the hover state's engagement flag, 1 while hovered or focused), so
	 * the pointer's writes apply at once while engaged and the settle runs only on leave.
	 *
	 * @param array{duration:string,easing:string} $timing Settle timing.
	 * @return array<int,string>
	 */
	public static function follow_entries( array $timing ): array {
		$out      = array();
		$duration = 'calc(' . $timing['duration'] . ' * (1 - var(--sgs-mh-on, 0)))';
		foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-channels'] ?? array() as $row ) {
			foreach ( $row['owners'] ?? array() as $owner ) {
				if ( self::FOLLOW === ( $owner['owner'] ?? '' ) ) {
					foreach ( $owner['properties'] ?? array() as $prop ) {
						$out[] = (string) $prop['name'] . ' ' . $duration . ' ' . $timing['easing'] . ' 0ms';
					}
				}
			}
		}
		return $out;
	}

	/**
	 * Write the schema's default perspective (the `transform` channel's shared `--sgs-persp-self` default, 800px) on
	 * the desktop rule when the element has an X or Y owner and no layer set a desktop perspective, so a rotation never
	 * renders flat through `perspective(none)`.
	 *
	 * @param array<string,array<string,string>> $decls  Per-tier declarations (by reference).
	 * @param bool                               $has_xy Whether an X or Y angle or Follow pointer is present.
	 * @return void
	 */
	public static function default_perspective( array &$decls, bool $has_xy ): void {
		if ( ! $has_xy ) {
			return;
		}
		foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-channels'] ?? array() as $row ) {
			foreach ( $row['shared'] ?? array() as $prop ) {
				$name = (string) ( $prop['name'] ?? '' );
				if ( isset( $prop['default'] ) && '' !== $name && ! isset( $decls['desktop'][ $name ] ) ) {
					$decls['desktop'] = array( $name => (string) $prop['default'] ) + $decls['desktop'];
				}
			}
		}
	}

	/**
	 * The channels Follow pointer writes, from `x-sgs-writes`.
	 *
	 * @param array<string,bool> $channels Channel set (by reference).
	 * @return void
	 */
	public static function follow_channels( array &$channels ): void {
		foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-writes'][ self::FOLLOW ]['channels'] ?? array() as $channel ) {
			$channels[ (string) $channel ] = true;
		}
	}

	/**
	 * Whether a stored value is a plain number.
	 *
	 * @param mixed $v Value.
	 * @return bool
	 */
	private static function is_number( $v ): bool {
		return is_int( $v ) || is_float( $v );
	}
}
