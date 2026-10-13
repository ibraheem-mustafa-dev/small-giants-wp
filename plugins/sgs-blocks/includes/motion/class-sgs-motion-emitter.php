<?php
/**
 * Motion emitter: one target's scoped custom properties per device, its `transition` list and its data attributes
 * (Spec 38A §6.5, §9, §10; FR-38A-16, FR-38A-18).
 *
 * The shared stylesheet (`assets/css/motion*.css`) owns every generic rule; this class writes only per-instance
 * values, through the shared collector, as plain custom properties on the target's scoped selector:
 *
 * - Hover state: the hover to-values as `--sgs-mh-to-<suffix>` (the suffix of the field's owner property, so
 *   `--sgs-mh-ty` gives `--sgs-mh-to-ty`), with `--sgs-mh-to-rot` stored as the hover angle minus the rest angle;
 *   the resting angle is written directly as `--sgs-rot-rest`. The owner properties themselves (`--sgs-mh-*`) are
 *   switched on by the stylesheet under `:hover` and `:focus-visible` (or the root's or hover group's `:hover` and
 *   `:focus-within`), never here.
 * - Entrance: `--sgs-me-from-<suffix>`, `--sgs-me-to-<suffix>`, `--sgs-me-dur`, `--sgs-me-delay`, `--sgs-me-ease`
 *   and `--sgs-me-start`; multi-keyframe entrances also get `data-sgs-me-keyframes` (JSON) for the WAAPI module.
 * - `transition`: only the owners present on the element, each with its own duration, easing and delay (the hover
 *   state's list also carries `color`, `background-color`, `border-color` and `box-shadow`), never `all`.
 *
 * Desktop values sit in the base rule; Tablet and Mobile overrides sit in `@media (max-width:1023px)` and
 * `@media (max-width:767px)` (the `SGS_Breakpoints` constants), and a tier with no override emits no block.
 * Every value is printed by `Sgs_Motion_Field_Types::css()`, which resolves `token:<family>.<key>` to
 * `var(--wp--custom--<family>--<key>)`. Field names, owner properties and channels are read from the schema.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Emitter
 */
final class Sgs_Motion_Emitter {

	const TIERS = array( 'desktop', 'tablet', 'mobile' );

	/** Hover colour and shadow properties whose timing the hover state owns (FR-38A-7). */
	const HOVER_PAINT = array( 'color', 'background-color', 'border-color', 'box-shadow' );

	const MH_PREFIX = '--sgs-mh-';
	const ME_PREFIX = '--sgs-me-';

	/**
	 * Emit one target.
	 *
	 * @param array<string,mixed> $element  The resolved element (refusals already dropped).
	 * @param string              $selector The target's scoped selector.
	 * @param array<string,mixed> $context  `lcp` (bool), `suppress_entrance` (bool), `block`, `target`.
	 * @return array{css:string,attrs:array<string,string>,entrance:bool}
	 */
	public static function emit( array $element, string $selector, array $context ): array {
		$decls    = array_fill_keys( self::TIERS, array() );
		$attrs    = array();
		$channels = array();
		$trans    = array_fill_keys( self::TIERS, array() );
		$state    = $element['hover']['state'] ?? null;
		if ( is_array( $state ) ) {
			$attrs['data-sgs-mh'] = (string) ( $state['source'] ?? 'self' );
			self::hover_state( $state, $decls, $trans, $channels );
		}
		foreach ( $element['hover']['effects'] ?? array() as $layer ) {
			self::effect_channels( (string) $layer['effect'], $channels );
			self::effect_transition( $layer, $trans );
		}
		foreach ( $element['effects'] ?? array() as $layer ) {
			self::effect_channels( (string) $layer['effect'], $channels );
		}
		$entrance = false;
		$base     = $element['entrance']['base'] ?? null;
		if ( is_array( $base ) && empty( $context['suppress_entrance'] ) ) {
			$entrance = self::entrance( $base, $decls, $attrs, $context );
		}
		if ( array() !== $channels ) {
			$attrs['data-sgs-mc'] = implode( ' ', self::ordered_channels( $channels ) );
		}
		foreach ( self::TIERS as $tier ) {
			if ( array() !== $trans[ $tier ] ) {
				$decls[ $tier ]['transition'] = implode( ', ', $trans[ $tier ] );
			}
		}
		return array(
			'css'      => self::rules( $selector, $decls ),
			'attrs'    => $attrs,
			'entrance' => $entrance,
		);
	}

	/**
	 * The fields of one values def: key => node, field type and CSS property.
	 *
	 * @param string $def A `$defs` name.
	 * @return array<string,array{node:array<string,mixed>,type:string,css:?string,perDevice:bool}>
	 */
	public static function fields( string $def ): array {
		static $cache = array();
		if ( ! isset( $cache[ $def ] ) ) {
			$cache[ $def ] = array();
			foreach ( Sgs_Motion_Field_Types::defs()[ $def ]['properties'] ?? array() as $key => $node ) {
				$meta = is_array( $node ) ? ( $node['x-sgs-field'] ?? null ) : null;
				if ( is_array( $meta ) && isset( $meta['fieldType'] ) ) {
					$cache[ $def ][ (string) $key ] = array(
						'node'      => $node,
						'type'      => (string) $meta['fieldType'],
						'css'       => isset( $meta['cssProperty'] ) ? (string) $meta['cssProperty'] : null,
						'perDevice' => ! empty( $meta['perDevice'] ),
					);
				}
			}
		}
		return $cache[ $def ];
	}

	/**
	 * Owner custom property => channel, read from `x-sgs-channels`.
	 *
	 * @return array<string,string>
	 */
	public static function property_channels(): array {
		static $map = null;
		if ( null === $map ) {
			$map = array();
			foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-channels'] ?? array() as $row ) {
				foreach ( $row['owners'] ?? array() as $owner ) {
					foreach ( $owner['properties'] ?? array() as $prop ) {
						$map[ (string) $prop['name'] ] = (string) $row['channel'];
					}
				}
			}
		}
		return $map;
	}

	/**
	 * A value's CSS through its field type, or null.
	 *
	 * @param string $def   Values def.
	 * @param string $key   Field key.
	 * @param mixed  $value Value.
	 * @return string|null
	 */
	public static function value_css( string $def, string $key, $value ): ?string {
		$field = self::fields( $def )[ $key ] ?? null;
		if ( null === $field ) {
			return null;
		}
		$out = Sgs_Motion_Field_Types::css( $field['type'], $value, $field['node'] );
		return $out['ok'] && is_string( $out['css'] ?? null ) && '' !== $out['css'] ? $out['css'] : null;
	}

	/**
	 * A token reference's CSS (the defaults below), with a literal fallback.
	 *
	 * @param string $token    `token:<family>.<key>`.
	 * @param string $fallback Literal when the schema has no such token.
	 * @return string
	 */
	private static function token_or( string $token, string $fallback ): string {
		return Sgs_Motion_Field_Types::resolve_token( $token ) ?? $fallback;
	}

	/**
	 * Per-tier value sources of a layer: desktop is `values`, the others its device overrides.
	 *
	 * @param array<string,mixed> $layer A layer.
	 * @return array<string,array<string,mixed>>
	 */
	private static function tier_values( array $layer ): array {
		return array(
			'desktop' => is_array( $layer['values'] ?? null ) ? $layer['values'] : array(),
			'tablet'  => is_array( $layer['devices']['tablet'] ?? null ) ? $layer['devices']['tablet'] : array(),
			'mobile'  => is_array( $layer['devices']['mobile'] ?? null ) ? $layer['devices']['mobile'] : array(),
		);
	}

	/**
	 * The hover state's to-values, rest angle, channels and transition list.
	 *
	 * @param array<string,mixed>                $state    Hover state layer.
	 * @param array<string,array<string,string>> $decls    Per-tier declarations (by reference).
	 * @param array<string,array<int,string>>    $trans    Per-tier transition entries (by reference).
	 * @param array<string,bool>                 $channels Channel set (by reference).
	 * @return void
	 */
	private static function hover_state( array $state, array &$decls, array &$trans, array &$channels ): void {
		$def         = 'HoverStateValues';
		$fields      = self::fields( $def );
		$tiers       = self::tier_values( $state );
		$map         = self::property_channels();
		$owners      = array();
		$timing      = array(
			'transition-duration'        => self::token_or( 'token:duration.fast', '200ms' ),
			'transition-delay'           => '0ms',
			'transition-timing-function' => self::token_or( 'token:easing.ease-out', 'ease-out' ),
		);
		$angles      = array(
			'rotate'     => null,
			'restRotate' => null,
		);
		$raw         = $angles;
		$owner_count = 0;
		foreach ( self::TIERS as $tier ) {
			$timing_changed = 'desktop' === $tier;
			$angle_changed  = false;
			foreach ( $tiers[ $tier ] as $key => $value ) {
				$prop = $fields[ $key ]['css'] ?? null;
				$css  = self::value_css( $def, (string) $key, $value );
				if ( null === $prop || null === $css ) {
					continue;
				}
				if ( isset( $timing[ $prop ] ) ) {
					$timing[ $prop ] = $css;
					$timing_changed  = true;
				} elseif ( array_key_exists( (string) $key, $angles ) ) {
					$angles[ $key ] = $css;
					$raw[ $key ]    = $value;
					$angle_changed  = true;
				} elseif ( 0 === strpos( $prop, self::MH_PREFIX ) ) {
					$decls[ $tier ][ self::MH_PREFIX . 'to-' . substr( $prop, strlen( self::MH_PREFIX ) ) ] = $css;
					$owners[ $prop ] = true;
				} else {
					$decls[ $tier ][ self::MH_PREFIX . 'to-' . $key ] = $css;
					$owners[ $prop ]                                  = true;
				}
			}
			if ( $angle_changed ) {
				self::hover_angles( $angles, $raw, $tier, $decls, $owners, $fields );
			}
			// A tier repeats the whole list when its timing or its owner set differs from the wider tier's.
			if ( $timing_changed || count( $owners ) !== $owner_count ) {
				$trans[ $tier ] = array();
				foreach ( array_merge( array_keys( $owners ), self::HOVER_PAINT ) as $prop ) {
					$trans[ $tier ][] = $prop . ' ' . $timing['transition-duration'] . ' ' . $timing['transition-timing-function'] . ' ' . $timing['transition-delay'];
				}
			}
			$owner_count = count( $owners );
		}
		foreach ( array_keys( $owners ) as $prop ) {
			if ( isset( $map[ $prop ] ) ) {
				$channels[ $map[ $prop ] ] = true;
			}
		}
		if ( null !== $angles['restRotate'] || null !== $angles['rotate'] ) {
			$channels['rotate'] = true;
		}
	}

	/**
	 * Write `--sgs-rot-rest` and `--sgs-mh-to-rot` (the hover angle minus the rest angle) for one tier.
	 *
	 * @param array<string,?string>              $angles Effective CSS angles so far.
	 * @param array<string,mixed>                $raw    Effective stored angles so far.
	 * @param string                             $tier   Tier.
	 * @param array<string,array<string,string>> $decls  Per-tier declarations (by reference).
	 * @param array<string,bool>                 $owners Owner properties present (by reference).
	 * @param array<string,array<string,mixed>>  $fields Hover state fields.
	 * @return void
	 */
	private static function hover_angles( array $angles, array $raw, string $tier, array &$decls, array &$owners, array $fields ): void {
		$rest_prop = (string) $fields['restRotate']['css'];
		$rot_prop  = (string) $fields['rotate']['css'];
		if ( null !== $angles['restRotate'] ) {
			$decls[ $tier ][ $rest_prop ] = $angles['restRotate'];
		}
		if ( null === $angles['rotate'] ) {
			return;
		}
		$to = $angles['rotate'];
		if ( null !== $angles['restRotate'] ) {
			$diff = null;
			if ( ( is_int( $raw['rotate'] ) || is_float( $raw['rotate'] ) ) && ( is_int( $raw['restRotate'] ) || is_float( $raw['restRotate'] ) ) ) {
				$diff = self::value_css( 'HoverStateValues', 'rotate', $raw['rotate'] - $raw['restRotate'] );
			}
			$to = $diff ?? 'calc(' . $angles['rotate'] . ' - ' . $angles['restRotate'] . ')';
		}
		$decls[ $tier ][ self::MH_PREFIX . 'to-' . substr( $rot_prop, strlen( self::MH_PREFIX ) ) ] = $to;
		$owners[ $rot_prop ] = true;
	}

	/**
	 * The channels an effect writes, from `x-sgs-writes`.
	 *
	 * @param string             $effect   Effect slug.
	 * @param array<string,bool> $channels Channel set (by reference).
	 * @return void
	 */
	private static function effect_channels( string $effect, array &$channels ): void {
		foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-writes'][ $effect ]['channels'] ?? array() as $channel ) {
			$channels[ (string) $channel ] = true;
		}
	}

	/**
	 * A hover effect's own return transition: its owner properties (from `x-sgs-channels`) on its stored `*Duration`
	 * and `*Easing` values.
	 *
	 * @param array<string,mixed>             $layer A hover effect layer.
	 * @param array<string,array<int,string>> $trans Per-tier transition entries (by reference).
	 * @return void
	 */
	private static function effect_transition( array $layer, array &$trans ): void {
		$effect = (string) $layer['effect'];
		$props  = array();
		foreach ( Sgs_Motion_Field_Types::schema()['x-sgs-channels'] ?? array() as $row ) {
			foreach ( $row['owners'] ?? array() as $owner ) {
				if ( ( $owner['owner'] ?? '' ) === $effect ) {
					$props = array_merge( $props, array_column( $owner['properties'] ?? array(), 'name' ) );
				}
			}
		}
		$def = (string) str_replace( '#/$defs/', '', (string) ( Sgs_Motion_Field_Types::schema()['x-sgs-effects'][ $effect ]['values'] ?? '' ) );
		if ( array() === $props || '' === $def ) {
			return;
		}
		$dur_key  = null;
		$ease_key = null;
		foreach ( self::fields( $def ) as $key => $field ) {
			$dur_key  = null === $dur_key && 'duration' === $field['type'] && 'Duration' === substr( $key, -8 ) ? $key : $dur_key;
			$ease_key = null === $ease_key && 'easing' === $field['type'] && 'Easing' === substr( $key, -6 ) ? $key : $ease_key;
		}
		$duration = self::token_or( 'token:duration.medium', '300ms' );
		$easing   = self::token_or( 'token:easing.ease-out', 'ease-out' );
		$tiers    = self::tier_values( $layer );
		if ( null !== $ease_key && isset( $tiers['desktop'][ $ease_key ] ) ) {
			$easing = self::value_css( $def, $ease_key, $tiers['desktop'][ $ease_key ] ) ?? $easing;
		}
		foreach ( self::TIERS as $tier ) {
			$changed = 'desktop' === $tier;
			if ( null !== $dur_key && isset( $tiers[ $tier ][ $dur_key ] ) ) {
				$duration = self::value_css( $def, $dur_key, $tiers[ $tier ][ $dur_key ] ) ?? $duration;
				$changed  = true;
			}
			if ( $changed ) {
				foreach ( $props as $prop ) {
					$trans[ $tier ][] = $prop . ' ' . $duration . ' ' . $easing . ' 0ms';
				}
			}
		}
	}

	/**
	 * The entrance's from and to holders, timing, start line, channels and data attributes.
	 *
	 * @param array<string,mixed>                $base    Entrance base layer.
	 * @param array<string,array<string,string>> $decls   Per-tier declarations (by reference).
	 * @param array<string,string>               $attrs   Data attributes (by reference).
	 * @param array<string,mixed>                $context Render context.
	 * @return bool Whether an entrance was emitted.
	 */
	private static function entrance( array $base, array &$decls, array &$attrs, array $context ): bool {
		$trigger = (string) ( $base['trigger'] ?? 'scroll' );
		$trigger = (string) apply_filters( 'sgs_motion_entrance_trigger', $trigger, $base, $context );
		if ( '' === $trigger ) {
			return false;
		}
		$tiers   = self::tier_values( $base );
		$keep_op = 'load' === $trigger && ! empty( $context['lcp'] ) && true !== ( $tiers['desktop']['allowLcpFade'] ?? false );
		$map     = self::property_channels();
		$used    = array();
		$timing  = array(
			'duration' => 'dur',
			'delay'    => 'delay',
			'easing'   => 'ease',
			'start'    => 'start',
		);
		foreach ( self::TIERS as $tier ) {
			foreach ( array(
				'from' => 'EntranceFrom',
				'to'   => 'EntranceTo',
			) as $end => $def ) {
				foreach ( is_array( $tiers[ $tier ][ $end ] ?? null ) ? $tiers[ $tier ][ $end ] : array() as $key => $value ) {
					$prop = self::fields( $def )[ $key ]['css'] ?? null;
					$css  = self::value_css( $def, (string) $key, $value );
					if ( null === $prop || null === $css ) {
						continue;
					}
					$used[ $prop ] = true;
					$decls[ $tier ][ self::ME_PREFIX . $end . '-' . substr( $prop, strlen( self::ME_PREFIX ) ) ] = $css;
				}
			}
			foreach ( $timing as $key => $suffix ) {
				$css = array_key_exists( $key, $tiers[ $tier ] ) ? self::value_css( 'EntranceValues', $key, $tiers[ $tier ][ $key ] ) : null;
				if ( null !== $css ) {
					$decls[ $tier ][ self::ME_PREFIX . $suffix ] = $css;
				}
			}
		}
		$keyframes = self::keyframes( $tiers['desktop']['keyframes'] ?? null, $used, $keep_op );
		if ( $keep_op ) {
			$op_from = self::ME_PREFIX . 'from-op';
			foreach ( array( 'tablet', 'mobile' ) as $tier ) {
				unset( $decls[ $tier ][ $op_from ] );
			}
			if ( isset( $used[ self::ME_PREFIX . 'op' ] ) ) {
				$decls['desktop'][ $op_from ] = '1';
			}
		}
		if ( null !== $keyframes ) {
			$attrs['data-sgs-me-keyframes'] = $keyframes;
		}
		$channels = array();
		foreach ( array_keys( $used ) as $prop ) {
			if ( isset( $map[ $prop ] ) ) {
				$channels[ $map[ $prop ] ] = true;
			}
		}
		$attrs['data-sgs-me'] = trim( $trigger . ' ' . implode( ' ', self::ordered_channels( $channels ) ) );
		return true;
	}

	/**
	 * The desktop keyframes as JSON for the WAAPI module: offset 0 to 1 and each owner property's CSS.
	 *
	 * @param mixed              $list    Stored keyframe list.
	 * @param array<string,bool> $used    Owner properties touched (by reference through the caller's array).
	 * @param bool               $keep_op Whether the LCP rule holds opacity at 1.
	 * @return string|null
	 */
	private static function keyframes( $list, array &$used, bool $keep_op ): ?string {
		if ( ! is_array( $list ) || array() === $list ) {
			return null;
		}
		$out = array();
		foreach ( $list as $frame ) {
			$row = array();
			foreach ( is_array( $frame ) ? $frame : array() as $key => $value ) {
				if ( 'offset' === $key ) {
					$css = self::value_css( 'EntranceKeyframe', 'offset', $value );
					if ( null !== $css && ( is_int( $value ) || is_float( $value ) ) ) {
						$row['offset'] = $value / 100;
					}
					continue;
				}
				$prop = self::fields( 'EntranceKeyframe' )[ $key ]['css'] ?? null;
				$css  = self::value_css( 'EntranceKeyframe', (string) $key, $value );
				if ( null !== $prop && null !== $css ) {
					$row[ $prop ]  = $keep_op && self::ME_PREFIX . 'op' === $prop ? '1' : $css;
					$used[ $prop ] = true;
				}
			}
			$out[] = $row;
		}
		return (string) wp_json_encode( $out );
	}

	/**
	 * Channels in `x-sgs-channels` order.
	 *
	 * @param array<string,bool> $channels Channel set.
	 * @return array<int,string>
	 */
	private static function ordered_channels( array $channels ): array {
		$order = array_column( Sgs_Motion_Field_Types::schema()['x-sgs-channels'] ?? array(), 'channel' );
		$out   = array_values( array_intersect( $order, array_keys( $channels ) ) );
		return array_merge( $out, array_values( array_diff( array_keys( $channels ), $order ) ) );
	}

	/**
	 * The scoped rules: desktop in the base rule, Tablet and Mobile inside their media queries.
	 *
	 * @param string                             $selector Scoped selector.
	 * @param array<string,array<string,string>> $decls    Per-tier declarations.
	 * @return string
	 */
	private static function rules( string $selector, array $decls ): string {
		$media = array(
			'desktop' => null,
			'tablet'  => '@media (max-width:' . ( class_exists( '\SGS_Breakpoints' ) ? \SGS_Breakpoints::TABLET_MAX : 1023 ) . 'px)',
			'mobile'  => '@media (max-width:' . ( class_exists( '\SGS_Breakpoints' ) ? \SGS_Breakpoints::MOBILE_MAX : 767 ) . 'px)',
		);
		$css   = '';
		foreach ( self::TIERS as $tier ) {
			if ( array() === $decls[ $tier ] ) {
				continue;
			}
			$body = '';
			foreach ( $decls[ $tier ] as $prop => $value ) {
				$body .= $prop . ':' . $value . ';';
			}
			$rule = $selector . '{' . $body . '}';
			$css .= null === $media[ $tier ] ? $rule : $media[ $tier ] . '{' . $rule . '}';
		}
		return $css;
	}
}
