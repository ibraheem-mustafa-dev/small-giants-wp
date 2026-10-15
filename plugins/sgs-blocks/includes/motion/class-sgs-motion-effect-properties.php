<?php
/**
 * Effect-layer custom properties (Spec 38A §6.5): the scoped CSS of each effect value field that names a
 * `x-sgs-field.cssProperty`, per device tier.
 *
 * A layer's `values` give the desktop rule and its `devices.tablet` / `devices.mobile` overrides the tablet and mobile
 * rules, inside the same breakpoint `@media` queries every scoped motion rule uses (`Sgs_Motion_Emitter::rules`).
 * Each value prints through its field type (`Sgs_Motion_Field_Types::css`): a length or duration with its unit, a token
 * as its theme custom property, a choice or easing as written; a position or pin length prints in the form its data
 * attribute takes (`top 85%`, `+=150%`), which the Tier G runtimes read from the property first. A custom property two fields of one effect share (a
 * rest and an active value, such as ken-burns' `zoomStart` and `zoomEnd` on `--sgs-kb-s`) is a state pair the
 * effect's own stylesheet switches, so it is not written here. The effect's runtime stylesheet
 * (`assets/css/fx-<effect>.css`) reads the properties.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Effect_Properties
 */
final class Sgs_Motion_Effect_Properties {

	/**
	 * The scoped CSS of one element's effect layers.
	 *
	 * @param array<string,mixed> $element  A sanitised sgsMotion element.
	 * @param string              $selector The target's scoped selector.
	 * @return string
	 */
	public static function css( array $element, string $selector ): string {
		$decls = array_fill_keys( Sgs_Motion_Emitter::TIERS, array() );
		foreach ( Sgs_Motion_Fx_Emitter::LISTS as $list ) {
			$parts = explode( '.', $list );
			$node  = 2 === count( $parts ) ? ( $element[ $parts[0] ][ $parts[1] ] ?? array() ) : ( $element[ $list ] ?? array() );
			foreach ( is_array( $node ) ? $node : array() as $layer ) {
				if ( is_array( $layer ) && is_string( $layer['effect'] ?? null ) ) {
					self::layer( $layer, $decls );
				}
			}
		}
		return Sgs_Motion_Emitter::rules( $selector, $decls );
	}

	/**
	 * Add one layer's declarations; an earlier layer's property is kept.
	 *
	 * @param array<string,mixed>                $layer An effect layer.
	 * @param array<string,array<string,string>> $decls Per-tier declarations (by reference).
	 * @return void
	 */
	private static function layer( array $layer, array &$decls ): void {
		$props = self::properties( (string) $layer['effect'] );
		$tiers = array(
			'desktop' => $layer['values'] ?? array(),
			'tablet'  => $layer['devices']['tablet'] ?? array(),
			'mobile'  => $layer['devices']['mobile'] ?? array(),
		);
		foreach ( $tiers as $tier => $values ) {
			foreach ( is_array( $values ) ? $values : array() as $key => $value ) {
				$field = $props[ (string) $key ] ?? null;
				if ( null === $field || isset( $decls[ $tier ][ $field['prop'] ] ) ) {
					continue;
				}
				$css = self::value_css( $field, $value, is_array( $tiers['desktop'] ) ? $tiers['desktop'] : array() );
				if ( null !== $css ) {
					$decls[ $tier ][ $field['prop'] ] = $css;
				}
			}
		}
	}

	/**
	 * One value's CSS. A field the runtime reads in its own form takes that form, as its data attribute does: a
	 * position's viewport line becomes the whole ScrollTrigger position with the desktop edge (an edge is not set per
	 * device), a pin length the relative end `+=N%`. Any other value prints through its field type.
	 *
	 * @param array<string,mixed> $field   The field.
	 * @param mixed               $value   Stored value for one tier.
	 * @param array<string,mixed> $desktop The layer's desktop values.
	 * @return string|null
	 */
	private static function value_css( array $field, $value, array $desktop ): ?string {
		if ( 'position' === $field['form'] || 'pinLength' === $field['form'] ) {
			$clean = Sgs_Motion_Field_Types::sanitise( $field['type'], $value, $field['node'] );
			$clean = is_string( $clean ) ? Sgs_Motion_Fx_Grammar::resolve_token( $clean ) : $clean;
			if ( 'pinLength' === $field['form'] ) {
				return null === $clean ? null : Sgs_Motion_Fx_Emitter::pin_end( $clean );
			}
			$edge = null === $field['edge'] ? null : ( $desktop[ $field['edge'] ] ?? null );
			return is_string( $edge ) && ( is_int( $clean ) || is_float( $clean ) ) ? Sgs_Motion_Fx_Grammar::position( $edge, $clean ) : null;
		}
		$out = Sgs_Motion_Field_Types::css( $field['type'], $value, $field['node'] );
		return $out['ok'] && is_string( $out['css'] ?? null ) && '' !== $out['css'] ? $out['css'] : null;
	}

	/**
	 * An effect's value fields that each own a custom property: value key => property, type and node.
	 *
	 * @param string $effect Effect slug.
	 * @return array<string,array{prop:string,type:string,node:array<string,mixed>,form:string,edge:?string}>
	 */
	private static function properties( string $effect ): array {
		static $cache = array();
		if ( isset( $cache[ $effect ] ) ) {
			return $cache[ $effect ];
		}
		$owned  = array();
		$count  = array();
		$fields = Sgs_Motion_Fx_Grammar::fields( $effect );
		$edges  = array();
		foreach ( $fields as $field ) {
			if ( 'position' === $field['form'] && 'choice' === $field['type'] ) {
				$edges[ $field['attr'] ] = $field['path'][0];
			}
		}
		foreach ( $fields as $field ) {
			$prop = $field['node']['x-sgs-field']['cssProperty'] ?? null;
			if ( 1 !== count( $field['path'] ) || ! is_string( $prop ) || 0 !== strpos( $prop, '--' ) || $field['list'] ) {
				continue;
			}
			$count[ $prop ]             = ( $count[ $prop ] ?? 0 ) + 1;
			$owned[ $field['path'][0] ] = array(
				'prop' => $prop,
				'type' => $field['type'],
				'node' => $field['node'],
				'form' => $field['form'],
				'edge' => $edges[ $field['attr'] ] ?? null,
			);
		}
		$cache[ $effect ] = array_filter(
			$owned,
			static function ( $field ) use ( $count ) {
				return 1 === $count[ $field['prop'] ];
			}
		);
		return $cache[ $effect ];
	}
}
