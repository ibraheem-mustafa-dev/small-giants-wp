<?php
/**
 * Button preset hover transform, split into its three movements.
 *
 * WHY
 * ---
 * A client's button preset publishes one `hover-transform` string (`settings.custom.buttonPresets.<preset>.hover-transform`,
 * written by the theme extractor), for example `matrix(1.05, 0, 0, 1.05, 0, -2.1)`: a scale and a lift in one value. The
 * Motion panel's hover movement writes the individual `translate`, `scale` and `rotate` properties, which compose with
 * `transform`, so a button with both moved twice. To let a button's own hover lift replace only the preset's lift, and
 * its own hover scale replace only the preset's scale, `sgs/button`'s stylesheet needs the preset's movements as three
 * separate values. This class derives them, beside the original, in the same theme.json layer:
 *
 *   `hover-lift`    `translate(<x>px, <y>px)`
 *   `hover-scale`   `scale(<s>)`
 *   `hover-rotate`  `rotate(<a>deg)`
 *
 * Each is published only when it is not the identity. `hover-transform` itself stays (other blocks read it whole).
 * A transform that cannot be split (anything beyond translate, uniform scale and rotate in that order) is left whole in
 * `hover-lift`, so the button still moves exactly as before; the other two parts are then not published.
 *
 * A preset that sets its own `hover-transform` replaces the site `default` preset's whole movement today. The stylesheet
 * falls back part by part, so a preset with its own transform publishes an identity for every part the `default`
 * preset moves and the preset itself does not: nothing leaks across.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Splits a preset's `hover-transform` and publishes the parts.
 */
final class Sgs_Button_Hover_Parts {

	const NAMESPACE_KEY = 'buttonPresets';
	const SOURCE_ROLE   = 'hover-transform';
	const DEFAULT_KEY   = 'default';
	const WHOLE_MARKER  = 'hover-lift-whole';

	/**
	 * Hook the two theme.json layers a preset token can come from (the theme file and the client's snapshot).
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'wp_theme_json_data_theme', array( __CLASS__, 'filter_theme_json' ), 20 );
		add_filter( 'wp_theme_json_data_user', array( __CLASS__, 'filter_theme_json' ), 20 );
	}

	/**
	 * Add the part tokens to the layer's button presets.
	 *
	 * @param object $theme_json A `WP_Theme_JSON_Data`.
	 * @return object The same object, updated when a preset carries a `hover-transform`.
	 */
	public static function filter_theme_json( $theme_json ) {
		if ( ! is_object( $theme_json ) || ! method_exists( $theme_json, 'get_data' ) || ! method_exists( $theme_json, 'update_with' ) ) {
			return $theme_json;
		}
		$data    = $theme_json->get_data();
		$presets = $data['settings']['custom'][ self::NAMESPACE_KEY ] ?? null;
		if ( ! is_array( $presets ) ) {
			return $theme_json;
		}
		$parts = self::derive( $presets );
		if ( array() === $parts ) {
			return $theme_json;
		}
		return $theme_json->update_with(
			array(
				'version'  => $data['version'] ?? 3,
				'settings' => array( 'custom' => array( self::NAMESPACE_KEY => $parts ) ),
			)
		);
	}

	/**
	 * The part tokens for every preset that carries a `hover-transform`.
	 *
	 * @param array<string,mixed> $presets Presets by slug, each a role => value map.
	 * @return array<string,array<string,string>> Preset slug => part tokens to merge in.
	 */
	public static function derive( array $presets ): array {
		$split = array();
		foreach ( $presets as $slug => $roles ) {
			if ( is_array( $roles ) && isset( $roles[ self::SOURCE_ROLE ] ) && is_string( $roles[ self::SOURCE_ROLE ] ) ) {
				$split[ $slug ] = self::split( $roles[ self::SOURCE_ROLE ] );
			}
		}
		$default = $split[ self::DEFAULT_KEY ] ?? array();
		$out     = array();
		foreach ( $split as $slug => $parts ) {
			if ( self::DEFAULT_KEY !== $slug ) {
				// A transform that could not be split sits whole in `hover-lift`, so that part is already set; scale and
				// rotate still get their identity wherever the default moves them, or the default's parts would stack
				// on the preset's whole transform.
				foreach ( self::identities() as $part => $identity ) {
					if ( isset( $default[ $part ] ) && ! isset( $parts[ $part ] ) ) {
						$parts[ $part ] = $identity;
					}
				}
			}
			unset( $parts[ self::WHOLE_MARKER ] );
			if ( array() !== $parts ) {
				$out[ $slug ] = $parts;
			}
		}
		return $out;
	}

	/**
	 * The identity of each part, published to stop the `default` preset's part showing through a preset with its own.
	 *
	 * @return array<string,string>
	 */
	private static function identities(): array {
		return array(
			'hover-lift'   => 'translate(0px, 0px)',
			'hover-scale'  => 'scale(1)',
			'hover-rotate' => 'rotate(0deg)',
		);
	}

	/**
	 * Split one `hover-transform` value into its non-identity parts.
	 *
	 * Supported: `none`, `matrix(a, b, c, d, tx, ty)` with a uniform scale and a rotation (no skew), `translate`,
	 * `translateX`, `translateY`, `scale` (uniform) and `rotate` (degrees), in any number, with every translate before the
	 * first scale or rotate (scale and rotate commute). Anything else comes back whole as `hover-lift` (plus the internal
	 * whole marker, which `derive()` removes).
	 *
	 * @param string $transform The preset's transform value.
	 * @return array<string,string> Part => CSS value; empty for an identity.
	 */
	public static function split( string $transform ): array {
		$transform = trim( $transform );
		if ( '' === $transform || 'none' === strtolower( $transform ) ) {
			return array();
		}
		$calls = self::calls( $transform );
		$parts = null === $calls ? null : self::measure( $calls );
		if ( null === $parts ) {
			return array(
				'hover-lift'       => $transform,
				self::WHOLE_MARKER => '1',
			);
		}
		$out = array();
		if ( abs( $parts['tx'] ) > 1e-6 || abs( $parts['ty'] ) > 1e-6 ) {
			$out['hover-lift'] = 'translate(' . self::num( $parts['tx'] ) . 'px, ' . self::num( $parts['ty'] ) . 'px)';
		}
		if ( abs( $parts['s'] - 1 ) > 1e-4 ) {
			$out['hover-scale'] = 'scale(' . self::num( $parts['s'] ) . ')';
		}
		if ( abs( $parts['r'] ) > 1e-4 ) {
			$out['hover-rotate'] = 'rotate(' . self::num( $parts['r'] ) . 'deg)';
		}
		return $out;
	}

	/**
	 * The function calls of a transform list, or null when the string holds anything else.
	 *
	 * @param string $transform Transform list.
	 * @return array<int,array{0:string,1:string[]}>|null Name (lower case) and raw arguments per call.
	 */
	private static function calls( string $transform ): ?array {
		$call = '/([a-zA-Z]+)\(([^()]*)\)/';
		if ( ! preg_match_all( $call, $transform, $m, PREG_SET_ORDER ) ) {
			return null;
		}
		if ( '' !== trim( (string) preg_replace( $call, '', $transform ) ) ) {
			return null;
		}
		$calls = array();
		foreach ( $m as $found ) {
			$calls[] = array( strtolower( $found[1] ), array_map( 'trim', explode( ',', $found[2] ) ) );
		}
		return $calls;
	}

	/**
	 * The lift, uniform scale and rotation of a call list.
	 *
	 * @param array<int,array{0:string,1:string[]}> $calls Calls from `calls()`.
	 * @return array{tx:float,ty:float,s:float,r:float}|null Null when the list cannot be split.
	 */
	private static function measure( array $calls ): ?array {
		$tx    = 0.0;
		$ty    = 0.0;
		$s     = 1.0;
		$r     = 0.0;
		$moved = false;
		foreach ( $calls as list( $name, $args ) ) {
			if ( 'matrix' === $name ) {
				return 1 === count( $calls ) ? self::from_matrix( $args ) : null;
			}
			if ( in_array( $name, array( 'translate', 'translatex', 'translatey' ), true ) ) {
				$lengths = array_map( array( __CLASS__, 'px' ), $args );
				if ( $moved || in_array( null, $lengths, true ) ) {
					return null;
				}
				if ( 'translate' === $name && count( $lengths ) <= 2 ) {
					$tx += $lengths[0];
					$ty += $lengths[1] ?? 0.0;
				} elseif ( 'translatex' === $name && 1 === count( $lengths ) ) {
					$tx += $lengths[0];
				} elseif ( 'translatey' === $name && 1 === count( $lengths ) ) {
					$ty += $lengths[0];
				} else {
					return null;
				}
			} elseif ( 'scale' === $name ) {
				$moved = true;
				$same  = isset( $args[1] ) ? is_numeric( $args[1] ) && abs( (float) $args[1] - (float) $args[0] ) <= 1e-6 : true;
				if ( count( $args ) > 2 || ! is_numeric( $args[0] ) || ! $same ) {
					return null;
				}
				$s *= (float) $args[0];
			} elseif ( 'rotate' === $name ) {
				$moved = true;
				if ( 1 !== count( $args ) || ! preg_match( '/^(-?\d*\.?\d+)(deg)?$/i', $args[0], $angle ) ) {
					return null;
				}
				$r += (float) $angle[1];
			} else {
				return null;
			}
		}
		return array(
			'tx' => $tx,
			'ty' => $ty,
			's'  => $s,
			'r'  => $r,
		);
	}

	/**
	 * The parts of `matrix(a, b, c, d, tx, ty)`: a uniform scale and a rotation, no skew.
	 *
	 * @param string[] $args The six arguments.
	 * @return array{tx:float,ty:float,s:float,r:float}|null
	 */
	private static function from_matrix( array $args ): ?array {
		if ( 6 !== count( $args ) || array_filter( $args, static fn( $a ) => ! is_numeric( $a ) ) ) {
			return null;
		}
		list( $a, $b, $c, $d, $e, $f ) = array_map( 'floatval', $args );
		$scale = sqrt( $a * $a + $b * $b );
		if ( $scale < 1e-9 || abs( $c + $b ) > 1e-6 || abs( $d - $a ) > 1e-6 ) {
			return null;
		}
		return array(
			'tx' => $e,
			'ty' => $f,
			's'  => $scale,
			'r'  => rad2deg( atan2( $b, $a ) ),
		);
	}

	/**
	 * A pixel length as a float; a bare 0 counts; any other unit is null.
	 *
	 * @param string $value Argument.
	 * @return float|null
	 */
	private static function px( string $value ): ?float {
		return preg_match( '/^(-?\d*\.?\d+)(px)?$/i', $value, $m ) ? (float) $m[1] : null;
	}

	/**
	 * A number for CSS: at most four decimals, no trailing zeros, no negative zero.
	 *
	 * @param float $n Number.
	 * @return string
	 */
	private static function num( float $n ): string {
		$text = rtrim( rtrim( number_format( $n, 4, '.', '' ), '0' ), '.' );
		return ( '-0' === $text || '' === $text ) ? '0' : $text;
	}
}
