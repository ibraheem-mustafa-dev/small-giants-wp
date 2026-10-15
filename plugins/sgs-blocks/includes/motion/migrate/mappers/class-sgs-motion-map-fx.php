<?php
/**
 * The `fx` migration mapper (Spec 38A §13.2, FR-38A-22, FR-38A-31): the flat `fx*` attributes to effect layers.
 *
 * Three sources of flat effect attributes:
 * - the shared effect roster: `fx` names the effect and its parameters are the `fx*` attributes of
 *   `includes/fx-attributes.php::FX_ATTR_MAP`. They are first normalised as the render layer normalises them
 *   (`sgs_fx_normalise`: the intensity preset's values filled in, other effects' parameters cleared), so the layer
 *   holds what renders today. `fxPreset` becomes the layer's intensity (`dramatic` is now `bold`); a parameter the
 *   normalisation cleared rendered nothing and is removed, reported as inert;
 * - a block that declares the block-private `fxEffect` selector (`sgs/mega-panel`, `sgs/site-header-row`,
 *   `sgs/site-footer-row`): the effect must be one the block's own render accepts (its `fxEffect` enum, else
 *   `PRIVATE_SELECTOR_EFFECTS`), and only that effect's parameters are read. `fxFooterStagger` on the footer row is a
 *   `scrub` layer on the root;
 * - `sgs/image-sequence`: `fxStart`, `fxEnd` and `fxPin` are its `image-sequence` effect on the `canvas` part.
 *
 * Placement follows the schema's layer enums: an effect the hover effect list allows goes in `hover.effects`;
 * `split-reveal`, `scramble` and `draw` on load or scroll go in `entrance.text` (`scramble` and `draw` on hover go in
 * `effects`); any other effect the effect list allows goes in `effects`. A layer is on the root, except `draw` on a
 * block that declares an `svg-bg` motion part (the container's background SVG, where the flat path drew it) and
 * image-sequence's canvas.
 *
 * Each parameter's runtime attribute names the value field that holds it (the field's schema `dataAttr`), and its
 * `dataForm` says how the stored text reads back. `fxDisableTablet` and `fxDisableMobile` become the layer's `off`
 * tiers. All or nothing: when any parameter in scope cannot be expressed in the layer (a `top top+=93` offset start, a
 * GSAP ease the easing list does not name, a value its field refuses), the effect is not migrated: nothing of it is
 * consumed, and each such parameter comes back as a `reported` row.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-fx-value.php';

/**
 * Class Sgs_Motion_Map_Fx
 */
final class Sgs_Motion_Map_Fx implements Sgs_Motion_Mapper_Interface {

	/**
	 * The effects the block-private selector blocks' renders accept when the block declares no `fxEffect` enum. The
	 * allow-lists live in code in `src/blocks/mega-panel/render.php` and `src/blocks/site-header-row/render.php` (their
	 * block.json notes say why: WordPress coerces an off-enum stored value to the default); the standalone test checks
	 * this list against both files.
	 */
	const PRIVATE_SELECTOR_EFFECTS = array( 'cursor-field', 'particles', 'grid-dots', 'wave-gradient' );

	/** The block whose own render prints its effect on the `canvas` part. */
	const IMAGE_SEQUENCE = 'sgs/image-sequence';

	/** The part a `draw` layer goes on when the block declares it. */
	const DRAW_PART = 'svg-bg';

	/** The roster's intensity presets as layer intensities. */
	const INTENSITIES = array(
		'subtle'   => 'subtle',
		'standard' => 'standard',
		'dramatic' => 'bold',
	);

	/** The flat per-breakpoint switches as `off` tiers. */
	const OFF_FLAGS = array(
		'fxDisableTablet' => 'tablet',
		'fxDisableMobile' => 'mobile',
	);

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'fx';
	}

	/**
	 * Whether the block holds a flat effect.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return '' !== self::source( $block_name, $attrs )['effect'] || true === ( $attrs['fxFooterStagger'] ?? false );
	}

	/**
	 * A block's declared attribute (from the registered type, else its block.json).
	 *
	 * @param string $block_name Block name.
	 * @param string $attr       Attribute name.
	 * @return array<string,mixed>|null
	 */
	private static function declared( string $block_name, string $attr ): ?array {
		$type = class_exists( '\WP_Block_Type_Registry' ) ? \WP_Block_Type_Registry::get_instance()->get_registered( $block_name ) : null;
		if ( is_object( $type ) && isset( $type->attributes ) && is_array( $type->attributes ) ) {
			return is_array( $type->attributes[ $attr ] ?? null ) ? $type->attributes[ $attr ] : null;
		}
		$slug = substr( $block_name, (int) strpos( $block_name, '/' ) + 1 );
		foreach ( array( 'build', 'src' ) as $dir ) {
			$file = dirname( __DIR__, 4 ) . '/' . $dir . '/blocks/' . $slug . '/block.json';
			if ( is_readable( $file ) ) {
				$json = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file.
				return is_array( $json['attributes'][ $attr ] ?? null ) ? $json['attributes'][ $attr ] : null;
			}
		}
		return null;
	}

	/**
	 * The effect a block names, the attribute that names it, and the effects its render accepts.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{effect:string,selector:?string,target:string,allowed:?array<int,string>}
	 */
	private static function source( string $block_name, array $attrs ): array {
		$fx = $attrs['fx'] ?? '';
		if ( is_string( $fx ) && '' !== $fx && 'none' !== $fx ) {
			return array(
				'effect'   => $fx,
				'selector' => 'fx',
				'target'   => 'draw' === $fx && array_key_exists( self::DRAW_PART, Sgs_Motion_Targets::parts( $block_name ) ) ? self::DRAW_PART : 'root',
				'allowed'  => null,
			);
		}
		$private = $attrs['fxEffect'] ?? '';
		$decl    = is_string( $private ) && '' !== $private ? self::declared( $block_name, 'fxEffect' ) : null;
		if ( null !== $decl ) {
			$enum = isset( $decl['enum'] ) && is_array( $decl['enum'] ) ? array_values( array_filter( $decl['enum'], 'strlen' ) ) : self::PRIVATE_SELECTOR_EFFECTS;
			return array(
				'effect'   => $private,
				'selector' => 'fxEffect',
				'target'   => 'root',
				'allowed'  => $enum,
			);
		}
		if ( self::IMAGE_SEQUENCE === $block_name ) {
			foreach ( array( 'fxStart', 'fxEnd', 'fxPin' ) as $key ) {
				if ( ! empty( $attrs[ $key ] ) ) {
					return array(
						'effect'   => 'image-sequence',
						'selector' => null,
						'target'   => 'canvas',
						'allowed'  => null,
					);
				}
			}
		}
		return array(
			'effect'   => '',
			'selector' => null,
			'target'   => 'root',
			'allowed'  => null,
		);
	}

	/**
	 * Map the block's flat effect attributes to layers.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$source   = self::source( $block_name, $attrs );
		$elements = array();
		$consumed = array();
		$reported = array();
		if ( '' !== $source['effect'] ) {
			$result   = self::effect( $source, $attrs );
			$consumed = $result['consumed'];
			$reported = $result['reported'];
			if ( null !== $result['layer'] ) {
				$elements[ $source['target'] ] = self::put( array(), $result['list'], $result['layer'] );
			}
		}
		if ( array_key_exists( 'fxFooterStagger', $attrs ) && null !== self::declared( $block_name, 'fxFooterStagger' ) ) {
			$consumed[] = 'fxFooterStagger';
			if ( true === $attrs['fxFooterStagger'] && ! in_array( 'scrub', array_column( $elements['root']['effects'] ?? array(), 'effect' ), true ) ) {
				$elements['root'] = self::put(
					$elements['root'] ?? array(),
					'effects',
					array(
						'id'     => 'scrub',
						'effect' => 'scrub',
					)
				);
			}
		}
		return array(
			'motion'   => array() === $elements ? array() : array(
				'v'        => 1,
				'elements' => $elements,
			),
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $reported,
		);
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
	 * The layer for the block's effect, all or nothing.
	 *
	 * @param array<string,mixed> $source The block's effect source.
	 * @param array<string,mixed> $attrs  Stored attributes.
	 * @return array{list:string,layer:?array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	private static function effect( array $source, array $attrs ): array {
		$effect = $source['effect'];
		$none   = array(
			'list'     => '',
			'layer'    => null,
			'consumed' => array(),
			'reported' => array(),
		);
		if ( null !== $source['allowed'] && ! in_array( $effect, $source['allowed'], true ) ) {
			$none['reported'][] = self::row( (string) $source['selector'], $effect, 'this block\'s render never drew ' . $effect . ' (it accepts ' . implode( ', ', $source['allowed'] ) . '), so it is not migrated', false );
			return $none;
		}
		$list = self::list_for( $effect, (string) ( $attrs['fxTrigger'] ?? '' ) );
		if ( null === $list ) {
			$none['reported'][] = self::row( (string) ( $source['selector'] ?? 'fx' ), $effect, 'no effect layer list holds ' . $effect, false );
			return $none;
		}
		$flat = $attrs;
		if ( 'fx' === $source['selector'] && function_exists( '\SGS\Blocks\sgs_fx_normalise' ) ) {
			$flat = \SGS\Blocks\sgs_fx_normalise( $attrs, $effect );
		}
		$names    = self::flat_names();
		$own      = self::effect_flat_names( $effect, $names );
		$layer    = array(
			'id'     => $effect,
			'effect' => $effect,
		);
		$values   = array();
		$consumed = array();
		$failed   = array();
		$inert    = array();
		$filled   = array_filter(
			$flat,
			static function ( $value ) {
				return '' !== $value && null !== $value;
			}
		);
		foreach ( self::in_scope( array_merge( $attrs, $filled ), $names ) as $key ) {
			$set = isset( $flat[ $key ] ) && '' !== $flat[ $key ] && null !== $flat[ $key ];
			if ( ! $set ) {
				$inert[] = self::row( $key, $attrs[ $key ], 'inert: the render cleared it for ' . $effect, true );
				continue;
			}
			if ( 'fxEffect' === $source['selector'] && ! in_array( $key, $own, true ) ) {
				continue;
			}
			$why = self::map_one( $key, $flat[ $key ], $effect, $list, $flat, $names, $layer, $values );
			if ( null === $why ) {
				$consumed[] = $key;
			} else {
				$failed[] = self::row( $key, $flat[ $key ], $why, false );
			}
		}
		if ( array() !== $failed ) {
			$none['reported'] = $failed;
			return $none;
		}
		if ( array() !== $values ) {
			$layer['values'] = $values;
		}
		if ( null !== $source['selector'] ) {
			$consumed[] = $source['selector'];
		}
		return array(
			'list'     => $list,
			'layer'    => $layer,
			'consumed' => array_merge( $consumed, array_column( $inert, 'attr' ) ),
			'reported' => $inert,
		);
	}

	/**
	 * The attributes a migration of this effect must account for, stored or filled in by the preset: every flat effect
	 * parameter, the trigger, the preset and the per-breakpoint switches.
	 *
	 * @param array<string,mixed>  $attrs Stored attributes.
	 * @param array<string,string> $names Data attribute => flat attribute.
	 * @return array<int,string>
	 */
	private static function in_scope( array $attrs, array $names ): array {
		$known = array_merge( array_values( $names ), array( 'fxTrigger', 'fxPreset' ), array_keys( self::OFF_FLAGS ) );
		$out   = array();
		foreach ( $attrs as $key => $value ) {
			if ( in_array( $key, $known, true ) && 'fx' !== $key && '' !== $value && null !== $value ) {
				$out[] = (string) $key;
			}
		}
		return $out;
	}

	/**
	 * The flat attributes whose runtime attribute one of the effect's value fields writes.
	 *
	 * @param string               $effect Effect slug.
	 * @param array<string,string> $names  Data attribute => flat attribute.
	 * @return array<int,string>
	 */
	private static function effect_flat_names( string $effect, array $names ): array {
		$out = array();
		foreach ( Sgs_Motion_Fx_Grammar::fields( $effect ) as $field ) {
			if ( isset( $names[ $field['attr'] ] ) ) {
				$out[] = $names[ $field['attr'] ];
			}
		}
		return $out;
	}

	/**
	 * Map one flat attribute into the layer.
	 *
	 * @param string               $key    Flat attribute.
	 * @param mixed                $value  Its normalised value.
	 * @param string               $effect Effect slug.
	 * @param string               $into   The layer's list.
	 * @param array<string,mixed>  $flat   Every normalised flat attribute.
	 * @param array<string,string> $names  Data attribute => flat attribute.
	 * @param array<string,mixed>  $layer  The layer (by reference: intensity, trigger, off).
	 * @param array<string,mixed>  $values The layer values (by reference).
	 * @return string|null Null when mapped; otherwise why it cannot be.
	 */
	private static function map_one( string $key, $value, string $effect, string $into, array $flat, array $names, array &$layer, array &$values ): ?string {
		if ( 'fxPreset' === $key ) {
			if ( is_string( $value ) && isset( self::INTENSITIES[ $value ] ) ) {
				$layer['intensity'] = self::INTENSITIES[ $value ];
			}
			return null;
		}
		if ( 'fxTrigger' === $key ) {
			$defs = array(
				'hover.effects' => 'HoverEffect',
				'entrance.text' => 'EntranceTextEffect',
				'effects'       => 'EffectLayer',
			);
			if ( ! in_array( $value, self::layer_enum( $defs[ $into ], 'trigger' ), true ) ) {
				return 'the trigger ' . wp_json_encode( $value ) . ' is not one this layer list takes';
			}
			$layer['trigger'] = $value;
			return null;
		}
		if ( isset( self::OFF_FLAGS[ $key ] ) ) {
			if ( true === $value ) {
				$layer['off'][] = self::OFF_FLAGS[ $key ];
			}
			return null;
		}
		$attr = array_search( $key, $names, true );
		$all  = array();
		$keys = array();
		foreach ( Sgs_Motion_Fx_Grammar::fields( $effect ) as $field ) {
			if ( 1 === count( $field['path'] ) ) {
				$all[ $field['path'][0] ] = $field;
				if ( $attr === $field['attr'] ) {
					$keys[ $field['path'][0] ] = $field;
				}
			}
		}
		if ( array() === $keys ) {
			return 'the ' . $effect . ' layer has no value that writes ' . $attr;
		}
		$mapped = Sgs_Motion_Legacy_Fx_Value::convert( $keys, $value, $flat );
		if ( null === $mapped ) {
			return 'the value ' . wp_json_encode( $value ) . ' cannot be expressed in the ' . $effect . ' layer';
		}
		foreach ( $mapped as $value_key => $mapped_value ) {
			$field = $all[ $value_key ] ?? null;
			if ( null === $field || null === Sgs_Motion_Field_Types::sanitise( $field['type'], $mapped_value, $field['node'] ) ) {
				return 'the ' . $effect . ' layer refuses ' . $value_key . ' ' . wp_json_encode( $mapped_value );
			}
		}
		$values = array_merge( $values, $mapped );
		return null;
	}

	/**
	 * The list an effect goes in, or null when no layer list takes it.
	 *
	 * @param string $effect  Effect slug.
	 * @param string $trigger The flat trigger.
	 * @return string|null
	 */
	private static function list_for( string $effect, string $trigger ): ?string {
		$lists = array(
			'hover.effects' => 'HoverEffect',
			'entrance.text' => 'EntranceTextEffect',
			'effects'       => 'EffectLayer',
		);
		foreach ( $lists as $name => $def ) {
			$text_on_hover = 'entrance.text' === $name && 'hover' === $trigger && in_array( $effect, self::layer_enum( 'EffectLayer', 'effect' ), true );
			if ( in_array( $effect, self::layer_enum( $def, 'effect' ), true ) && ! $text_on_hover ) {
				return $name;
			}
		}
		return null;
	}

	/**
	 * A layer def's enum, read from the shipped schema.
	 *
	 * @param string $def `HoverEffect`, `EntranceTextEffect` or `EffectLayer`.
	 * @param string $key `effect` or `trigger`.
	 * @return array<int,string>
	 */
	private static function layer_enum( string $def, string $key ): array {
		$enum = Sgs_Motion_Field_Types::defs()[ $def ]['properties'][ $key ]['enum'] ?? array();
		return is_array( $enum ) ? $enum : array();
	}

	/**
	 * The flat attribute that wrote each runtime attribute: `includes/fx-attributes.php::FX_ATTR_MAP` inverted (it is
	 * loaded while the flat attributes exist and is deleted with them), plus `fxPin`, which `sgs/image-sequence` writes
	 * itself.
	 *
	 * @return array<string,string> Data attribute => flat attribute.
	 */
	private static function flat_names(): array {
		$map = defined( '\SGS\Blocks\FX_ATTR_MAP' ) ? array_flip( \SGS\Blocks\FX_ATTR_MAP ) : array();
		unset( $map['data-sgs-fx'] );
		return $map + array( 'data-sgs-fx-pin' => 'fxPin' );
	}

	/**
	 * Add a layer to an element's list.
	 *
	 * @param array<string,mixed> $element The element so far.
	 * @param string              $into    `hover.effects`, `entrance.text` or `effects`.
	 * @param array<string,mixed> $layer   The layer.
	 * @return array<string,mixed>
	 */
	private static function put( array $element, string $into, array $layer ): array {
		$parts = explode( '.', $into );
		if ( 2 === count( $parts ) ) {
			$element[ $parts[0] ][ $parts[1] ][] = $layer;
		} else {
			$element[ $into ][] = $layer;
		}
		return $element;
	}
}
