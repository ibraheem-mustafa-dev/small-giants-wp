<?php
/**
 * The `data-sgs-fx` runtime grammar of the effect layers (Spec 38 §11.2, Spec 38A §5.3, FR-38A-22).
 *
 * Read in both directions: `Sgs_Motion_Fx_Emitter` turns a layer value into the data attribute the shipped runtime
 * reads, and `Sgs_Motion_Map_Fx` turns a flat `fx*` block attribute into the layer value. Everything about a field's
 * markup is schema data on its `x-sgs-field` in `schemas/motion.schema.json`:
 * - `dataAttr`: the attribute it writes. The shared Tier G parameters carry no effect prefix (`start`, `end`, `scrub`,
 *   `ease`, `duration`, `stagger`, `hold`, `split`, `mask`), the Tier V and W families their family prefix (`field-`,
 *   `wave-`, `grid-`, `particle-`, `treatment-`, `gen-`, `magnet-`, `motion-path-`); every other field is
 *   `data-sgs-fx-<effect>-<value key in kebab case>`. A position's edge and viewport-line fields share one attribute.
 * - `dataUnit` (duration, length and angle fields): `s` seconds, `ms` milliseconds, `px` pixels, `deg` degrees, or
 *   `css` a CSS length or angle as written.
 * - `dataForm` (fields the runtime reads in its own vocabulary): `position` a ScrollTrigger `<edge> <line>`,
 *   `pinLength` a relative end `+=N%`, `gsapEase` a GSAP ease, `maskUnit` the split unit when
 *   masked, `flagText` `true`/`false`, `flagTrue` `true` only when on, `offWord` `off` only when off, `omitDefault`
 *   nothing for the value named by `dataOmit`.
 *
 * What stays in code is what is not a framework fact but a runtime's private vocabulary, each with its JavaScript twin
 * named and a parity check in `tests/php/run-motion-fx-emitter-standalone.php`: `RUNTIME_TRIGGERS` and
 * `GSAP_CURVES`. The editor never needs them (it stores the schema's values), so they are not schema data.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Fx_Grammar
 */
final class Sgs_Motion_Fx_Grammar {

	/**
	 * Layer triggers the shipped runtimes read from `data-sgs-fx-trigger`; any other is left to the module default.
	 * Twin: `src/shared/effects/gsap/provider-resolvers.js::resolveTrigger` (`load`, `hover`, else `scroll`).
	 */
	const RUNTIME_TRIGGERS = array( 'load', 'scroll', 'hover' );

	/**
	 * Pointer triggers an effect's own runtime reads from `data-sgs-fx-trigger` (the press effects, which the GSAP provider
	 * never sees). Twin: `src/shared/effects/fx-ripple.js::triggerOf` (`click`, else `pointerdown`).
	 */
	const POINTER_TRIGGERS = array( 'pointerdown', 'click' );

	/** The CSS easing keywords as the curves they name (CSS Easing Functions Level 1). */
	const CSS_KEYWORD_CURVES = array(
		'ease'        => 'cubic-bezier(0.25, 0.1, 0.25, 1)',
		'ease-in'     => 'cubic-bezier(0.42, 0, 1, 1)',
		'ease-out'    => 'cubic-bezier(0, 0, 0.58, 1)',
		'ease-in-out' => 'cubic-bezier(0.42, 0, 0.58, 1)',
	);

	/**
	 * The GSAP eases the flat `fxEase` attribute stores as the schema easings that draw them: `none` is `linear`, the
	 * power and back eases their standard cubic-bezier equivalents. `bounce.out` and `elastic.out(1,0.5)`, which no
	 * cubic-bezier can draw, are `linear()` curves sampled from GSAP's own functions (`self::gsap_curves`). Twin: the
	 * `gsap` vocabulary of `src/components/motion/easing-master-list.js` (every non-empty value is a key here).
	 */
	const GSAP_CURVES = array(
		'none'         => 'linear',
		'power1.out'   => 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
		'power2.inOut' => 'cubic-bezier(0.645, 0.045, 0.355, 1)',
		'power3.out'   => 'cubic-bezier(0.165, 0.84, 0.44, 1)',
		'back.out'     => 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
	);

	/** The root font size a `rem` length converts at for a runtime that reads pixels. */
	const ROOT_FONT_PX = 16;

	/**
	 * Every value field of one effect, read from the schema once per request: the fields of the effect's values `$def`
	 * (`x-sgs-effects.<effect>.values`) and of any values `$def` nested in it.
	 *
	 * @param string $effect Effect slug.
	 * @return array<int,array{path:array<int,string>,type:string,node:array<string,mixed>,list:bool,attr:string,unit:string,form:string,omit:mixed}>
	 */
	public static function fields( string $effect ): array {
		static $cache = array();
		if ( ! isset( $cache[ $effect ] ) ) {
			$ref              = Sgs_Motion_Field_Types::schema()['x-sgs-effects'][ $effect ]['values'] ?? '';
			$cache[ $effect ] = is_string( $ref ) && '' !== $ref ? self::def_fields( str_replace( '#/$defs/', '', $ref ), array() ) : array();
		}
		return $cache[ $effect ];
	}

	/**
	 * The fields of one values `$def`, recursing into nested values `$defs`.
	 *
	 * @param string            $def    A `$defs` name.
	 * @param array<int,string> $prefix The path of the `$def` inside `values`.
	 * @return array<int,array<string,mixed>>
	 */
	private static function def_fields( string $def, array $prefix ): array {
		$defs = Sgs_Motion_Field_Types::defs();
		$out  = array();
		foreach ( $defs[ $def ]['properties'] ?? array() as $key => $node ) {
			$path = array_merge( $prefix, array( (string) $key ) );
			$meta = is_array( $node ) ? ( $node['x-sgs-field'] ?? null ) : null;
			$ref  = is_array( $node ) && isset( $node['$ref'] ) ? str_replace( '#/$defs/', '', (string) $node['$ref'] ) : '';
			if ( null === $meta && 'values' === ( $defs[ $ref ]['x-sgs-kind'] ?? null ) ) {
				$out = array_merge( $out, self::def_fields( $ref, $path ) );
				continue;
			}
			if ( ! is_array( $meta ) || ! isset( $meta['fieldType'] ) ) {
				continue;
			}
			$list  = ! empty( $meta['list'] );
			$out[] = array(
				'path' => $path,
				'type' => (string) $meta['fieldType'],
				'node' => $list ? ( $defs[ $ref ]['items'] ?? null ) : $node,
				'list' => $list,
				'attr' => is_string( $meta['dataAttr'] ?? null ) ? $meta['dataAttr'] : '',
				'unit' => is_string( $meta['dataUnit'] ?? null ) ? $meta['dataUnit'] : '',
				'form' => is_string( $meta['dataForm'] ?? null ) ? $meta['dataForm'] : '',
				'omit' => $meta['dataOmit'] ?? null,
			);
		}
		return $out;
	}

	/**
	 * Every GSAP ease the flat attribute stores, as its schema easing.
	 *
	 * @return array<string,string>
	 */
	public static function gsap_curves(): array {
		return self::GSAP_CURVES + array(
			'bounce.out'         => self::sampled_curve( 'bounce.out' ),
			'elastic.out(1,0.5)' => self::sampled_curve( 'elastic.out(1,0.5)' ),
		);
	}

	/**
	 * A token reference resolved to the theme's value (`settings.custom.<family>.<key>` through the framework helper
	 * `sgs_global_custom_setting`, so a client snapshot's override wins), a negated distance token prefixed with `-`.
	 *
	 * @param mixed $value A value that may be a token reference.
	 * @return mixed The theme value; the value unchanged when it is not a token; null for a token that does not resolve.
	 */
	public static function resolve_token( $value ) {
		if ( ! Sgs_Motion_Field_Css::looks_like_token( $value ) ) {
			return $value;
		}
		if ( 1 !== preg_match( '/^(-?)token:([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)$/D', (string) $value, $m ) || ! function_exists( 'sgs_global_custom_setting' ) ) {
			return null;
		}
		$family = \sgs_global_custom_setting( $m[2] );
		$theme  = is_array( $family ) ? ( $family[ $m[3] ] ?? null ) : null;
		if ( ! is_string( $theme ) || '' === trim( $theme ) || 1 === preg_match( '/[;{}<>"]/', $theme ) ) {
			return null;
		}
		$theme = trim( $theme );
		return '-' === $m[1] ? ( '-' === $theme[0] ? substr( $theme, 1 ) : '-' . $theme ) : $theme;
	}

	/**
	 * A duration in milliseconds: a number as is, a CSS time (`250ms`, `0.3s`) converted.
	 *
	 * @param mixed $value A duration value or resolved token.
	 * @return int|float|null
	 */
	public static function milliseconds( $value ) {
		if ( is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		if ( is_string( $value ) && 1 === preg_match( '/^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/', trim( $value ), $m ) ) {
			return 's' === $m[2] ? (float) $m[1] * 1000 : (float) $m[1];
		}
		return null;
	}

	/**
	 * A ScrollTrigger position from an element edge and a viewport line.
	 *
	 * @param string    $element  `top`, `middle` or `bottom`.
	 * @param int|float $viewport 0 (top) to 100 (bottom).
	 * @return string For example `top 85%`, `top center`.
	 */
	public static function position( string $element, $viewport ): string {
		$edge  = 'middle' === $element ? 'center' : $element;
		$lines = array(
			'0'   => 'top',
			'50'  => 'center',
			'100' => 'bottom',
		);
		$num   = Sgs_Motion_Field_Css::number( $viewport );
		return $edge . ' ' . ( $lines[ $num ] ?? $num . '%' );
	}

	/**
	 * Parse a ScrollTrigger position the flat attributes store (`top 85%`, `top center`, `bottom top`).
	 *
	 * @param mixed $value Stored position.
	 * @return array{0:string,1:int|float}|null Element edge and viewport line; null for any other shape (a relative
	 *                                          `+=` offset, pixels or an offset sum).
	 */
	public static function parse_position( $value ): ?array {
		if ( ! is_string( $value ) || 1 !== preg_match( '/^\s*(top|center|bottom)\s+(top|center|bottom|\d+(?:\.\d+)?%)\s*$/', $value, $m ) ) {
			return null;
		}
		$lines = array(
			'top'    => 0,
			'center' => 50,
			'bottom' => 100,
		);
		$line  = $lines[ $m[2] ] ?? (float) rtrim( $m[2], '%' );
		return array( 'center' === $m[1] ? 'middle' : $m[1], ( floor( $line ) === (float) $line ) ? (int) $line : $line );
	}

	/**
	 * A layer easing as the ease a GSAP runtime receives. A curve that is one of the GSAP eases the flat attribute
	 * stored is written as that GSAP name, which every runtime reads; `linear` is `none`. Any other curve (a CSS
	 * keyword as its cubic-bezier, a `cubic-bezier()` or `linear()`) is written as the curve, which no shipped runtime
	 * resolves yet: `provider.js::resolveEase` can, but no effect module calls it.
	 *
	 * @param mixed $easing A schema-valid easing with any token already resolved.
	 * @return array{ease:string,readable:bool}|null
	 */
	public static function gsap_ease( $easing ): ?array {
		if ( ! is_string( $easing ) || '' === $easing ) {
			return null;
		}
		$curve = self::CSS_KEYWORD_CURVES[ $easing ] ?? $easing;
		$name  = array_search( self::squash( $curve ), array_map( array( __CLASS__, 'squash' ), self::gsap_curves() ), true );
		if ( false !== $name ) {
			return array(
				'ease'     => (string) $name,
				'readable' => true,
			);
		}
		return array(
			'ease'     => $curve,
			'readable' => false,
		);
	}

	/**
	 * A curve without spaces, for comparison.
	 *
	 * @param string $curve Curve text.
	 * @return string
	 */
	private static function squash( string $curve ): string {
		return (string) preg_replace( '/\s+/', '', $curve );
	}

	/**
	 * A flat `fxEase` GSAP ease as a schema easing.
	 *
	 * @param mixed $ease Stored GSAP ease.
	 * @return string|null Null for an empty or unknown ease.
	 */
	public static function schema_easing( $ease ): ?string {
		return is_string( $ease ) && '' !== $ease ? ( self::gsap_curves()[ $ease ] ?? null ) : null;
	}

	/**
	 * A `linear()` curve sampled from GSAP's `bounce.out` or `elastic.out(1, 0.5)` at 41 evenly spaced points.
	 *
	 * @param string $ease `bounce.out` or `elastic.out(1,0.5)`.
	 * @return string
	 */
	private static function sampled_curve( string $ease ): string {
		$points = array();
		for ( $i = 0; $i <= 40; $i++ ) {
			$t        = $i / 40;
			$points[] = Sgs_Motion_Field_Css::number( 'bounce.out' === $ease ? self::bounce_out( $t ) : self::elastic_out( $t ) );
		}
		return 'linear(' . implode( ', ', $points ) . ')';
	}

	/**
	 * GSAP's `bounce.out` (`gsap-core.js`, `_bounce` with n1 7.5625).
	 *
	 * @param float $t Progress 0 to 1.
	 * @return float
	 */
	private static function bounce_out( float $t ): float {
		$n1 = 7.5625;
		$d1 = 2.75;
		if ( $t < 1 / $d1 ) {
			return $n1 * $t * $t;
		}
		if ( $t < 2 / $d1 ) {
			$t -= 1.5 / $d1;
			return $n1 * $t * $t + 0.75;
		}
		if ( $t < 2.5 / $d1 ) {
			$t -= 2.25 / $d1;
			return $n1 * $t * $t + 0.9375;
		}
		$t -= 2.625 / $d1;
		return $n1 * $t * $t + 0.984375;
	}

	/**
	 * GSAP's `elastic.out(1, 0.5)` (`gsap-core.js`, `_configElastic` with amplitude 1, period 0.5): p1 is the
	 * amplitude, p3 = period / 2π · asin(1 / p1) the phase shift, and the sine runs at 2π / period.
	 *
	 * @param float $t Progress 0 to 1.
	 * @return float
	 */
	private static function elastic_out( float $t ): float {
		if ( $t <= 0 || $t >= 1 ) {
			return $t <= 0 ? 0.0 : 1.0;
		}
		$amplitude = 1.0;
		$period    = 0.5;
		$p3        = $period / ( 2 * M_PI ) * asin( 1 / $amplitude );
		return $amplitude * pow( 2, -10 * $t ) * sin( ( $t - $p3 ) * ( 2 * M_PI / $period ) ) + 1;
	}

	/**
	 * A length or angle as a plain number in a runtime's base unit: pixels (a number, `Npx`, or `Nrem` at the root
	 * font size) or degrees (a number, `Ndeg`, `Nturn`). Any other unit (`em`, `%`, viewport units) is null: it has no
	 * pixel value outside the page.
	 *
	 * @param mixed  $value Length or angle, any token already resolved.
	 * @param string $unit  `px` or `deg`.
	 * @return int|float|null
	 */
	public static function plain_number( $value, string $unit ) {
		if ( is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		if ( ! is_string( $value ) || 1 !== preg_match( '/^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z]*)$/', trim( $value ), $m ) ) {
			return null;
		}
		$factors = 'px' === $unit ? array(
			'px'  => 1,
			'rem' => self::ROOT_FONT_PX,
		) : array(
			'deg'  => 1,
			'turn' => 360,
		);
		return isset( $factors[ $m[2] ] ) ? (float) $m[1] * $factors[ $m[2] ] : null;
	}
}
