<?php
/**
 * The old `sgsAnimation*` entrance as an `entrance.base` layer (Spec 38A §13.1, §13.2, FR-38A-31, FR-38A-32).
 *
 * Reads the seven attributes `assets/js/animation-observer.js` played (`sgsAnimation`, `sgsAnimationDelay`,
 * `sgsAnimationDuration`, `sgsAnimationEasing`, `sgsAnimationDistance`, `sgsAnimationStart`, `sgsAnimationTrigger`) and
 * builds the layer the new model stores, with these rules:
 *
 * - the effect name selects the stamped preset (`motion_presets`, the `entrance-<effect>` row): its `from` and `to`
 *   values, easing and a duration pointing at the `entrance` tokens. `flip-in` has no preset row, so its values are
 *   written out (opacity and a 30 degree rotateX under a 600px perspective, the old start pose);
 * - a stored duration is a token name (`instant` to `extra-slow`, now `token:duration.<name>`) or a whole number of
 *   milliseconds (clamped 0 to 5000 as the player did, reported when clamped); a stored easing is a token name
 *   (`default`, `ease-out`, `ease-in`, `spring`, `linear`, now `token:easing.<name>`) or a raw CSS curve the schema
 *   accepts; `bounce-in` always played its own overshoot curve, so a stored easing on it is reported as inert;
 * - a stored distance replaces the preset's travel on the effects that travel; `0` fell back to the effect's own
 *   fixed distance (30 or 100 px) exactly as the player's `distance || default` did; on an effect that does not travel
 *   it is reported as inert;
 * - `sgsAnimationStart` `load` is the `load` trigger, anything empty is `scroll`; `sgsAnimationTrigger` (the start
 *   line, a percentage above the bottom edge, 0 to 50) is `values.start` on a scroll entrance;
 * - an absent attribute carries no value: the stamped preset's own tokens apply (the framework defaults), nothing is
 *   inferred from block.json defaults.
 *
 * Nothing is coerced silently. A value with no destination (an unknown effect, a duration or easing name outside the
 * token lists, a distance or delay that is not whole digits, a start other than `load`) makes the whole block's
 * entrance unmapped: no attribute of it is consumed, and each is returned as a `reported` row. A built layer is checked
 * against the shipped schema and refused when the schema would change any part of it.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-legacy-stagger.php';
require_once __DIR__ . '/class-sgs-motion-legacy-effects.php';
require_once __DIR__ . '/class-sgs-motion-migrate-merge.php';
require_once dirname( __DIR__ ) . '/field-types/class-sgs-motion-document.php';

/**
 * Class Sgs_Motion_Legacy_Entrance
 */
final class Sgs_Motion_Legacy_Entrance {

	/** The six attributes that only mean something while an effect is set. */
	const SETTINGS = array( 'sgsAnimationDelay', 'sgsAnimationDuration', 'sgsAnimationEasing', 'sgsAnimationDistance', 'sgsAnimationStart', 'sgsAnimationTrigger' );

	/** Duration token names the player resolved. */
	const DURATION_NAMES = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );

	/** Easing token names the player resolved. */
	const EASING_NAMES = array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' );

	/** The longest custom duration the player accepted, in ms. */
	const DURATION_CEILING = 5000;

	/** The longest custom distance the player accepted, in px. */
	const DISTANCE_CEILING = 400;

	/** Highest "Start when" line the old control offered, in percent. */
	const START_CEILING = 50;

	/**
	 * Every effect the old list offered (the table lives in `Sgs_Motion_Legacy_Effects`).
	 */
	const EFFECTS = Sgs_Motion_Legacy_Effects::TABLE;

	/**
	 * Build the `entrance.base` layer from one block's old attributes.
	 *
	 * @param array<string,mixed> $attrs       The block's stored attributes.
	 * @param int                 $extra_delay Stagger offset added to the block's own delay (ms).
	 * @param bool                $staggered   Whether the block's delay is also written by a stagger helper.
	 * @return array{base:?array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	public static function build( array $attrs, int $extra_delay = 0, bool $staggered = false ): array {
		$none = array(
			'base'     => null,
			'consumed' => array(),
			'reported' => array(),
		);
		if ( ! array_key_exists( 'sgsAnimation', $attrs ) ) {
			foreach ( self::SETTINGS as $key ) {
				if ( array_key_exists( $key, $attrs ) ) {
					$none['reported'][] = self::row( $key, $attrs[ $key ], 'sgsAnimation is not stored, so the block default effect decides and is not read here', false );
				}
			}
			return $none;
		}
		$effect = $attrs['sgsAnimation'];
		if ( is_string( $effect ) && ( '' === $effect || 'none' === $effect ) ) {
			$none['consumed'] = array( 'sgsAnimation' );
			foreach ( self::SETTINGS as $key ) {
				if ( array_key_exists( $key, $attrs ) ) {
					$none['consumed'][] = $key;
					$none['reported'][] = self::row( $key, $attrs[ $key ], 'inert: the block has no entrance effect', true );
				}
			}
			return $none;
		}
		if ( ! is_string( $effect ) || ! isset( self::EFFECTS[ $effect ] ) ) {
			$none['reported'][] = self::row( 'sgsAnimation', $effect, 'no entrance effect of this name exists in the new model', false );
			return $none;
		}

		$spec     = self::EFFECTS[ $effect ];
		$values   = array(
			'from' => $spec['from'],
			'to'   => $spec['to'],
		);
		$reported = array();
		$refused  = array();
		$consumed = array( 'sgsAnimation' );

		$duration = self::duration( $attrs, $consumed, $reported, $refused );
		if ( null !== $duration ) {
			$values['duration'] = $duration;
		}
		$easing = self::easing( $attrs, $spec, $consumed, $reported, $refused );
		if ( null !== $easing ) {
			$values['easing'] = $easing;
		} elseif ( isset( $spec['easing'] ) ) {
			$values['easing'] = $spec['easing'];
		}
		self::distance( $attrs, $spec, $values, $consumed, $reported, $refused );

		$own_delay = self::delay( $attrs, $consumed, $refused );
		$delay     = null === $own_delay ? null : $own_delay + max( 0, $extra_delay );
		if ( null !== $delay && $delay > 0 ) {
			$values['delay'] = $delay;
		}
		if ( isset( $spec['perspective'] ) ) {
			$values['perspective'] = $spec['perspective'];
		}

		$trigger = self::trigger( $attrs, $values, $consumed, $reported, $refused );

		if ( array() !== $refused ) {
			return array(
				'base'     => null,
				'consumed' => array(),
				'reported' => array_merge( $refused, array_map( array( __CLASS__, 'unconsume' ), $reported ) ),
			);
		}

		$base = array(
			'trigger' => $trigger,
			'values'  => $values,
		);
		if ( null !== $spec['preset'] ) {
			$base = array( 'preset' => $spec['preset'] ) + $base;
		}
		if ( $staggered && null !== $own_delay && $own_delay > 0 ) {
			$base['customised'] = array( 'values.delay' );
		}

		$problem = self::schema_problem( $base );
		if ( null !== $problem ) {
			return array(
				'base'     => null,
				'consumed' => array(),
				'reported' => array( self::row( 'sgsAnimation', $effect, 'the shipped schema refuses the mapped entrance: ' . $problem, false ) ),
			);
		}
		return array(
			'base'     => $base,
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $reported,
		);
	}

	/**
	 * Mark a reported row as not consumed.
	 *
	 * @param array<string,mixed> $row A reported row.
	 * @return array<string,mixed>
	 */
	public static function unconsume( array $row ): array {
		$row['consumed'] = false;
		return $row;
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Old attribute name.
	 * @param mixed  $value    Its stored value.
	 * @param string $reason   Why it is reported.
	 * @param bool   $consumed Whether the attribute is removed from the block.
	 * @return array{attr:string,value:mixed,reason:string,consumed:bool}
	 */
	private static function row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}

	/**
	 * The text of a stored attribute value, null when it is absent or empty.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @param string              $key   Attribute name.
	 * @return string|null
	 */
	private static function text( array $attrs, string $key ): ?string {
		if ( ! array_key_exists( $key, $attrs ) ) {
			return null;
		}
		$value = $attrs[ $key ];
		if ( is_int( $value ) || is_float( $value ) ) {
			return (string) $value;
		}
		return is_string( $value ) && '' !== trim( $value ) ? trim( $value ) : '';
	}

	/**
	 * The duration value.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 * @param array<int,array<string,mixed>> $refused  Refusal rows (appended to).
	 * @return string|int|null
	 */
	private static function duration( array $attrs, array &$consumed, array &$reported, array &$refused ) {
		$raw = self::text( $attrs, 'sgsAnimationDuration' );
		if ( null === $raw ) {
			return null;
		}
		$consumed[] = 'sgsAnimationDuration';
		if ( '' === $raw ) {
			return null;
		}
		if ( 1 === preg_match( '/^\d+$/', $raw ) ) {
			$ms = (int) $raw;
			if ( $ms > self::DURATION_CEILING ) {
				$reported[] = self::row( 'sgsAnimationDuration', $raw, 'clamped to ' . self::DURATION_CEILING . 'ms, the longest the old player ran', true );
			}
			return min( self::DURATION_CEILING, $ms );
		}
		if ( in_array( $raw, self::DURATION_NAMES, true ) ) {
			return 'token:duration.' . $raw;
		}
		$refused[] = self::row( 'sgsAnimationDuration', $raw, 'not a duration token name or a whole number of milliseconds', false );
		return null;
	}

	/**
	 * The easing value.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param array<string,mixed>            $spec     The effect's table entry.
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 * @param array<int,array<string,mixed>> $refused  Refusal rows (appended to).
	 * @return string|null
	 */
	private static function easing( array $attrs, array $spec, array &$consumed, array &$reported, array &$refused ): ?string {
		$raw = self::text( $attrs, 'sgsAnimationEasing' );
		if ( null === $raw ) {
			return null;
		}
		$consumed[] = 'sgsAnimationEasing';
		if ( '' === $raw ) {
			return null;
		}
		if ( isset( $spec['easing'] ) ) {
			$reported[] = self::row( 'sgsAnimationEasing', $raw, 'inert: this effect always played its own overshoot curve', true );
			return null;
		}
		if ( in_array( $raw, self::EASING_NAMES, true ) ) {
			return 'token:easing.' . ( 'ease-out' === $raw ? 'emphasised' : $raw );
		}
		if ( null !== Sgs_Motion_Field_Types::sanitise( 'easing', $raw ) ) {
			return $raw;
		}
		$refused[] = self::row( 'sgsAnimationEasing', $raw, 'not an easing token name or a curve the schema accepts', false );
		return null;
	}

	/**
	 * Replace the preset's travel with a stored distance.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param array<string,mixed>            $spec     The effect's table entry.
	 * @param array<string,mixed>            $values   Layer values (modified in place).
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 * @param array<int,array<string,mixed>> $refused  Refusal rows (appended to).
	 */
	private static function distance( array $attrs, array $spec, array &$values, array &$consumed, array &$reported, array &$refused ): void {
		$raw = self::text( $attrs, 'sgsAnimationDistance' );
		if ( null === $raw ) {
			return;
		}
		$consumed[] = 'sgsAnimationDistance';
		if ( '' === $raw ) {
			return;
		}
		if ( 1 !== preg_match( '/^\d+$/', $raw ) ) {
			$refused[] = self::row( 'sgsAnimationDistance', $raw, 'not a whole number of pixels', false );
			return;
		}
		if ( null === $spec['travel'] ) {
			$reported[] = self::row( 'sgsAnimationDistance', $raw, 'inert: this effect has no travel distance', true );
			return;
		}
		list( $axis, $sign, $fixed ) = $spec['travel'];
		$px                          = min( self::DISTANCE_CEILING, (int) $raw );
		if ( (int) $raw > self::DISTANCE_CEILING ) {
			$reported[] = self::row( 'sgsAnimationDistance', $raw, 'clamped to ' . self::DISTANCE_CEILING . 'px, the longest the old player travelled', true );
		}
		$values['from'][ $axis ] = $sign * ( 0 === $px ? $fixed : $px );
	}

	/**
	 * The block's own delay in ms; null when none is stored.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $refused  Refusal rows (appended to).
	 * @return int|null
	 */
	private static function delay( array $attrs, array &$consumed, array &$refused ): ?int {
		$raw = self::text( $attrs, 'sgsAnimationDelay' );
		if ( null === $raw ) {
			return 0;
		}
		$consumed[] = 'sgsAnimationDelay';
		if ( '' === $raw ) {
			return 0;
		}
		if ( 1 !== preg_match( '/^\d+$/', $raw ) ) {
			$refused[] = self::row( 'sgsAnimationDelay', $raw, 'not a whole number of milliseconds', false );
			return null;
		}
		return (int) $raw;
	}

	/**
	 * The trigger, and the start line on a scroll entrance.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param array<string,mixed>            $values   Layer values (modified in place).
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 * @param array<int,array<string,mixed>> $refused  Refusal rows (appended to).
	 * @return string `load` or `scroll`.
	 */
	private static function trigger( array $attrs, array &$values, array &$consumed, array &$reported, array &$refused ): string {
		$trigger = 'scroll';
		$start   = self::text( $attrs, 'sgsAnimationStart' );
		if ( null !== $start ) {
			$consumed[] = 'sgsAnimationStart';
			if ( 'load' === $start ) {
				$trigger = 'load';
			} elseif ( '' !== $start ) {
				$refused[] = self::row( 'sgsAnimationStart', $start, 'only "load" or empty were played; no other start exists in the new model', false );
			}
		}
		$line = self::text( $attrs, 'sgsAnimationTrigger' );
		if ( null === $line ) {
			return $trigger;
		}
		$consumed[] = 'sgsAnimationTrigger';
		if ( '' === $line ) {
			return $trigger;
		}
		$clamped = Sgs_Motion_Legacy_Stagger::clamp_text( $line, 0, self::START_CEILING );
		if ( '' === $clamped ) {
			$refused[] = self::row( 'sgsAnimationTrigger', $line, 'not a number', false );
		} elseif ( 'load' === $trigger ) {
			$reported[] = self::row( 'sgsAnimationTrigger', $line, 'inert: the entrance plays on page load, whatever the start line', true );
		} else {
			if ( (string) $line !== $clamped ) {
				$reported[] = self::row( 'sgsAnimationTrigger', $line, 'rounded or clamped to ' . $clamped . ' as the old attribute writer did', true );
			}
			$values['start'] = (int) $clamped;
		}
		return $trigger;
	}

	/**
	 * The first thing the shipped schema would change in a built layer, or null when it keeps all of it.
	 *
	 * @param array<string,mixed> $base The layer.
	 * @return string|null
	 */
	private static function schema_problem( array $base ): ?string {
		$doc   = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ),
		);
		$clean = Sgs_Motion_Document::sanitise( $doc );
		$diffs = Sgs_Motion_Migrate_Merge::differences( $doc, $clean );
		return array() === $diffs ? null : (string) $diffs[0]['key'];
	}
}
