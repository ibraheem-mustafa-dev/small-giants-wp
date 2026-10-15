<?php
/**
 * Stored hover values read as hover-state values (Spec 38A §13.2, FR-38A-31), for `Sgs_Motion_Map_Hover` and
 * `Sgs_Motion_Map_Icon`.
 *
 * One place for what a stored value means and whether the hover state can hold it: percent and preset scales, lifts,
 * opacity and indent, duration slugs and milliseconds, easing slugs, shared-list names and custom curves, and the
 * block-owned scale and transition pair. Each reader writes into the mapper's accumulator `$o` (`values`, `timing`,
 * `consumed`, `reported`); a value the state cannot hold exactly is reported and not consumed.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( __NAMESPACE__ . '\Sgs_Motion_Field_Types', false ) ) {
	require_once dirname( __DIR__ ) . '/class-sgs-motion-field-types.php';
}

if ( ! defined( 'SGS_HOVER_LIFT_MAX_PX' ) ) {
	require_once dirname( __DIR__, 2 ) . '/helpers-hover-lift.php';
}

/**
 * Class Sgs_Motion_Legacy_Hover_Value
 */
final class Sgs_Motion_Legacy_Hover_Value {

	/** The duration slugs `vars.php` accepts; each is a theme token. */
	const DURATION_SLUGS = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );

	/** The easing slugs `vars.php` accepts besides `default` and `custom`; each is a theme token. */
	const EASING_TOKENS = array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' );

	/** The scale presets `vars.php` accepts. */
	const SCALE_PRESETS = array( '1.02', '1.05', '1.1' );

	/** The CSS keywords the block-owned transition easing offers. */
	const CSS_EASINGS = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );

	/**
	 * Scale (percent and preset) and lift.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	public static function scale_and_lift( string $block_name, array $a, array &$o ): void {
		$defaults = Sgs_Motion_Map_Hover::hover_defaults( $block_name );
		$percent  = array_key_exists( 'sgsHoverScale', $a ) ? self::num( $a['sgsHoverScale'] ) : 0.0;
		if ( null === $percent ) {
			self::report( $o, 'sgsHoverScale', $a['sgsHoverScale'], 'not a number of percent', false );
		} elseif ( (int) $percent > 0 && (int) $percent <= 400 ) {
			$o['values']['scale'] = self::tidy( (int) $percent / 100 );
			self::take( $o, array( 'sgsHoverScale', 'sgsHoverScalePreset' ), $a );
		} elseif ( (int) $percent > 400 ) {
			self::report( $o, 'sgsHoverScale', $a['sgsHoverScale'], 'above 400 percent, the largest scale the hover state holds', false );
		} elseif ( array_key_exists( 'sgsHoverScale', $a ) ) {
			$o['consumed'][] = 'sgsHoverScale';
		}
		if ( array_key_exists( 'sgsHoverScalePreset', $a ) && ! in_array( 'sgsHoverScalePreset', $o['consumed'], true ) ) {
			$preset  = $a['sgsHoverScalePreset'];
			$default = (string) ( $defaults['scalePreset'] ?? '' );
			if ( is_string( $preset ) && in_array( $preset, self::SCALE_PRESETS, true ) ) {
				$o['values']['scale'] = (float) $preset;
			} elseif ( '' === $preset && '' !== $default ) {
				$o['values']['scale'] = 1;
			}
			$o['consumed'][] = 'sgsHoverScalePreset';
		}
		if ( array_key_exists( 'sgsHoverLift', $a ) ) {
			$lift = self::num( $a['sgsHoverLift'] );
			if ( null === $lift ) {
				self::report( $o, 'sgsHoverLift', $a['sgsHoverLift'], 'not a whole number of pixels', false );
			} else {
				$px = (int) $lift;
				if ( $px > 0 ) {
					$o['values']['translateY'] = -$px;
					$o['lift']                 = true;
				} elseif ( (int) ( $defaults['lift'] ?? 0 ) > 0 ) {
					$o['values']['translateY'] = 0;
				}
				$o['consumed'][] = 'sgsHoverLift';
			}
		}
	}

	/**
	 * Duration and easing from the extension attributes.
	 *
	 * @param array<string,mixed> $a Owned stored attributes.
	 * @param array<string,mixed> $o Accumulator.
	 */
	public static function timing( array $a, array &$o ): void {
		$ms = array_key_exists( 'sgsHoverDurationMs', $a ) ? self::num( $a['sgsHoverDurationMs'] ) : 0.0;
		if ( null !== $ms && (int) $ms > 0 ) {
			$o['timing']['duration'] = (int) $ms;
		} elseif ( isset( $a['sgsHoverDuration'] ) && is_string( $a['sgsHoverDuration'] ) && in_array( $a['sgsHoverDuration'], self::DURATION_SLUGS, true ) && 'medium' !== $a['sgsHoverDuration'] ) {
			$o['timing']['duration'] = 'token:duration.' . $a['sgsHoverDuration'];
		}
		if ( null === $ms ) {
			self::report( $o, 'sgsHoverDurationMs', $a['sgsHoverDurationMs'], 'not a whole number of milliseconds', false );
			unset( $o['timing']['duration'] );
		} else {
			self::take( $o, array( 'sgsHoverDurationMs' ), $a );
		}
		self::take( $o, array( 'sgsHoverDuration' ), $a );
		$easing = $a['sgsHoverEasing'] ?? 'default';
		if ( 'custom' === $easing ) {
			$curve = self::custom_curve( $a['sgsHoverEasingCustom'] ?? '' );
			if ( null === $curve ) {
				self::report( $o, 'sgsHoverEasingCustom', $a['sgsHoverEasingCustom'] ?? '', 'not a valid cubic-bezier() or linear() curve; the page rendered the default easing', false );
				return;
			}
			$o['timing']['easing'] = $curve;
		} elseif ( is_string( $easing ) && in_array( $easing, self::EASING_TOKENS, true ) && 'default' !== $easing ) {
			$o['timing']['easing'] = 'token:easing.' . $easing;
		}
		self::take( $o, array( 'sgsHoverEasing', 'sgsHoverEasingCustom' ), $a );
	}

	/**
	 * Opacity and indent.
	 *
	 * @param array<string,mixed> $a Owned stored attributes.
	 * @param array<string,mixed> $o Accumulator.
	 */
	public static function fades( array $a, array &$o ): void {
		if ( array_key_exists( 'sgsHoverOpacity', $a ) ) {
			$opacity = self::num( $a['sgsHoverOpacity'] );
			if ( null === $opacity ) {
				self::report( $o, 'sgsHoverOpacity', $a['sgsHoverOpacity'], 'not a number from 0 to 1', false );
			} else {
				if ( $opacity > 0 && min( 1.0, $opacity ) < 1.0 ) {
					$o['values']['opacity'] = self::tidy( round( min( 1.0, $opacity ), 2 ) );
				}
				$o['consumed'][] = 'sgsHoverOpacity';
			}
		}
		if ( array_key_exists( 'sgsHoverIndent', $a ) ) {
			$indent = $a['sgsHoverIndent'];
			if ( '' === $indent ) {
				$o['consumed'][] = 'sgsHoverIndent';
			} elseif ( is_string( $indent ) && null !== Sgs_Motion_Field_Types::sanitise( 'distance', $indent ) ) {
				$o['values']['indent'] = $indent;
				$o['consumed'][]       = 'sgsHoverIndent';
			} else {
				self::report( $o, 'sgsHoverIndent', $indent, 'not a length the hover state accepts', false );
			}
		}
	}

	/**
	 * The number `scaleHover` of `sgs/heading`, `sgs/text`, `sgs/quote` and `sgs/button`.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	public static function own_scale( string $block_name, array $a, array &$o ): void {
		$face = 'sgs/button' === $block_name && 'face' === ( $a['scaleHoverTarget'] ?? 'whole' );
		if ( array_key_exists( 'scaleHover', $a ) ) {
			$scale = self::num( $a['scaleHover'] );
			if ( null === $scale || $scale <= 0 || $scale > 4 ) {
				self::report( $o, 'scaleHover', $a['scaleHover'], 'not a scale from above 0 to 4', false );
			} elseif ( $face && abs( $scale - 1.0 ) > 0.001 ) {
				self::report( $o, 'scaleHover', $a['scaleHover'], 'scales the button face only; the face is no declared part', false );
			} else {
				if ( abs( $scale - 1.0 ) > 0.001 ) {
					$o['values']['scale'] = self::tidy( round( $scale, 3 ) );
				}
				$o['consumed'][] = 'scaleHover';
			}
		}
		if ( array_key_exists( 'scaleHoverTarget', $a ) && ! $face ) {
			$o['consumed'][] = 'scaleHoverTarget';
		}
	}

	/**
	 * `transitionDuration`, `transitionEasing` and `transitionEasingCustom` on the blocks that time their own hover.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $a          Owned stored attributes.
	 * @param array<string,mixed> $o          Accumulator.
	 */
	public static function own_transition( string $block_name, array $a, array &$o ): void {
		if ( array_key_exists( 'transitionDuration', $a ) ) {
			$ms      = self::num( $a['transitionDuration'] );
			$default = self::num( Sgs_Motion_Map_Hover::default_of( $block_name, 'transitionDuration' ) );
			if ( null === $ms || $ms < 0 || floor( $ms ) !== $ms ) {
				self::report( $o, 'transitionDuration', $a['transitionDuration'], 'not a whole number of milliseconds', false );
			} else {
				if ( $ms > 0 && $ms !== (float) $default && ! isset( $o['timing']['duration'] ) ) {
					$o['timing']['duration'] = (int) $ms;
				}
				$o['consumed'][] = 'transitionDuration';
			}
		}
		if ( ! array_key_exists( 'transitionEasing', $a ) ) {
			return;
		}
		$value   = $a['transitionEasing'];
		$default = Sgs_Motion_Map_Hover::default_of( $block_name, 'transitionEasing' );
		if ( 'sgs/button' === $block_name ) {
			$curve = self::shared_easing( is_string( $value ) ? $value : '', (string) ( $a['transitionEasingCustom'] ?? '' ) );
			if ( null === $curve ) {
				self::report( $o, 'transitionEasing', $value, 'not an easing the hover state holds (an invalid custom curve rendered plain ease)', false );
				return;
			}
			self::take( $o, array( 'transitionEasingCustom' ), $a );
			$wanted = $curve;
		} elseif ( is_string( $value ) && in_array( $value, self::CSS_EASINGS, true ) ) {
			$wanted = $value;
		} else {
			$wanted = null;
		}
		if ( null !== $wanted && $value !== $default && ! isset( $o['timing']['easing'] ) ) {
			$o['timing']['easing'] = $wanted;
		}
		$o['consumed'][] = 'transitionEasing';
	}

	/**
	 * Consume attributes the block holds.
	 *
	 * @param array<string,mixed> $o    Accumulator.
	 * @param string[]            $keys Attribute names.
	 * @param array<string,mixed> $a    Owned stored attributes.
	 */
	public static function take( array &$o, array $keys, array $a ): void {
		foreach ( $keys as $key ) {
			if ( array_key_exists( $key, $a ) ) {
				$o['consumed'][] = $key;
			}
		}
	}

	/**
	 * Add a reported row.
	 *
	 * @param array<string,mixed> $o        Accumulator.
	 * @param string              $attr     Old attribute.
	 * @param mixed               $value    Stored value.
	 * @param string              $reason   Why.
	 * @param bool                $consumed Whether the attribute is removed.
	 */
	public static function report( array &$o, string $attr, $value, string $reason, bool $consumed ): void {
		$o['reported'][] = array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}

	/**
	 * A stored number, or null for anything that is not an int, float or numeric string.
	 *
	 * @param mixed $value Stored value.
	 * @return float|null
	 */
	public static function num( $value ): ?float {
		return is_int( $value ) || is_float( $value ) || ( is_string( $value ) && is_numeric( $value ) ) ? (float) $value : null;
	}

	/**
	 * A number as an integer when it is whole.
	 *
	 * @param float|int $number Number.
	 * @return float|int
	 */
	public static function tidy( $number ) {
		$rounded = round( (float) $number, 4 );
		return floor( $rounded ) === $rounded ? (int) $rounded : $rounded;
	}

	/**
	 * A hand-typed curve the hover state accepts: a valid `cubic-bezier()` or a schema-valid `linear()`.
	 *
	 * @param mixed $value Stored text.
	 * @return string|null
	 */
	public static function custom_curve( $value ): ?string {
		$curve = is_string( $value ) ? trim( $value ) : '';
		if ( 0 === strpos( $curve, 'cubic-bezier(' ) && Sgs_Motion_Field_Types::is_valid_cubic_bezier( $curve ) ) {
			return $curve;
		}
		return 0 === strpos( $curve, 'linear(' ) && null !== Sgs_Motion_Field_Types::sanitise( 'easing', $curve ) ? $curve : null;
	}

	/**
	 * A name from the shared easing list (`sgs_motion_easing_css()`) as a hover-state easing.
	 *
	 * @param string $value  Stored name; '' means none.
	 * @param string $custom Stored custom curve, read for `custom`.
	 * @return string|null The easing, '' for none, null when the name has no exact value.
	 */
	public static function shared_easing( string $value, string $custom ): ?string {
		$names = array(
			'ease'         => 'ease',
			'ease-out-css' => 'ease-out',
			'ease-in-out'  => 'ease-in-out',
			'linear'       => 'linear',
			'quart-out'    => 'cubic-bezier(0.165, 0.84, 0.44, 1)',
			'standard'     => 'cubic-bezier(0.4, 0, 0.2, 1)',
			'drafts'       => 'cubic-bezier(0.16, 0.84, 0.32, 1)',
		);
		if ( '' === $value ) {
			return '';
		}
		if ( in_array( $value, array( 'default', 'ease-out', 'ease-in', 'spring' ), true ) ) {
			return 'token:easing.' . $value;
		}
		if ( 'custom' === $value ) {
			return self::custom_curve( $custom );
		}
		return $names[ $value ] ?? null;
	}

	/**
	 * The `sgs/button` extras: `opacityHover` (0 to 1) and `liftHover` (0 to 24px; the render clamps with
	 * `sgs_hover_lift_px()` and paints `translate: 0 -Npx`, a plain translate, so it is a negative `translateY`).
	 *
	 * @param array<string,mixed> $a Owned stored attributes.
	 * @param array<string,mixed> $o Accumulator.
	 */
	public static function button_extras( array $a, array &$o ): void {
		if ( array_key_exists( 'opacityHover', $a ) ) {
			$opacity = self::num( $a['opacityHover'] );
			if ( null === $opacity ) {
				self::report( $o, 'opacityHover', $a['opacityHover'], 'not a number from 0 to 1', false );
			} else {
				if ( $opacity > 0 && min( 1.0, $opacity ) < 1.0 ) {
					$o['values']['opacity'] = self::tidy( round( min( 1.0, $opacity ), 2 ) );
				}
				$o['consumed'][] = 'opacityHover';
			}
		}
		if ( ! array_key_exists( 'liftHover', $a ) ) {
			return;
		}
		$lift = self::num( $a['liftHover'] );
		if ( null === $lift ) {
			self::report( $o, 'liftHover', $a['liftHover'], 'not a number of pixels', false );
			return;
		}
		$px = min( \SGS_HOVER_LIFT_MAX_PX, max( 0, (int) $lift ) );
		if ( $px > 0 ) {
			$o['values']['translateY'] = -$px;
			$o['lift']                 = true;
		}
		if ( $px !== (int) $lift ) {
			self::report( $o, 'liftHover', $a['liftHover'], 'clamped to ' . $px . 'px as rendered', true );
		}
		$o['consumed'][] = 'liftHover';
	}
}
