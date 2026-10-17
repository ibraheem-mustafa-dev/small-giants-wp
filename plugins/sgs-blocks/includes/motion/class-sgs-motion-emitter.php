<?php
/**
 * Motion emitter: one target's scoped custom properties per device, its `transition` list and its data attributes
 * (Spec 38A §6.5, §9, §10; FR-38A-16, FR-38A-18).
 *
 * The shared stylesheet (`assets/css/motion*.css`) owns every generic rule; this class writes only per-instance
 * values, through the shared collector, as plain custom properties on the target's scoped selector:
 *
 * - Hover state: the hover to-values as `--sgs-mh-to-<suffix>` (the suffix of the field's owner property, so
 *   `--sgs-mh-ty` gives `--sgs-mh-to-ty`); the resting fields (state `rest`: the rest Z, X and Y angles and the one
 *   perspective `--sgs-persp-self`) are written directly to their own property, and each hover angle is stored as
 *   the hover angle minus its rest angle (`Sgs_Motion_Rotation`). Only an X or Y angle or Follow pointer adds the
 *   `transform` channel (a perspective alone does not), and an element with one and no perspective gets the schema's
 *   default perspective. Follow pointer settles on its own transition, which runs only while the hover state is
 *   disengaged, so the element tracks the pointer at once and springs back on leave. The owner properties themselves (`--sgs-mh-*`) are switched on by the stylesheet
 *   under `:hover` and `:focus-visible` (or the root's or hover group's `:hover` and `:focus-within`), never here.
 * - Entrance: `--sgs-me-from-<suffix>`, `--sgs-me-to-<suffix>`, `--sgs-me-dur`, `--sgs-me-delay`, `--sgs-me-ease`,
 *   `--sgs-me-start` and the one perspective `--sgs-persp-self` when the entrance sets it; multi-keyframe entrances also get `data-sgs-me-keyframes` (JSON) for the WAAPI module.
 *   A one-edge or anchored clip replaces the uniform clip holder with four edge holders (`Sgs_Motion_Clip_Edge`).
 *   The trigger passes through the `sgs_motion_entrance_trigger` filter (an empty string drops the entrance), and the
 *   `sgs_motion_entrance_css` filter appends a trigger's own rules (`Sgs_Motion_Trigger_Open_State`).
 * - `transition`: only the owners present on the element, each with its own duration, easing and delay (the hover
 *   state's list also carries `color`, `background-color`, `border-color` and `box-shadow`), never `all`.
 * - The hover ring (`ringSpread`, `ringColour`) and the Border accent line (`accentWidth`, `accentColour`): a
 *   `box-shadow` painted by the stylesheet's `box-shadow` channel from their owner properties; dropped on an element
 *   whose block sets a shadow (`Sgs_Motion_Ring_Guard`).
 * - The rest grayscale (`restGrayscale`) is written plain to `--sgs-gray-rest`, and the hover grayscale is stored minus
 *   it, the same pair as the rotate angles (`Sgs_Motion_Rotation::PAIRS`).
 * - The form Focus state (`hover.focus`, `sgs/form` root only): its field-control rules (`Sgs_Motion_Focus_State`).
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
	 * @param array<string,mixed> $context  `lcp` (bool), `suppress_entrance` (bool), `attributes` (the block's stored attributes, for the ring guard), `no_transition` (bool: a target
	 *                                      that shares its element with an earlier-declared one writes no `transition`,
	 *                                      `Sgs_Motion_Shared_Element`), `block`, `target`.
	 * @return array{css:string,attrs:array<string,string>,entrance:bool}
	 */
	public static function emit( array $element, string $selector, array $context ): array {
		$decls    = array_fill_keys( self::TIERS, array() );
		$attrs    = array();
		$channels = array();
		$trans    = array_fill_keys( self::TIERS, array() );
		$state    = $element['hover']['state'] ?? null;
		if ( is_array( $state ) && Sgs_Motion_Ring_Guard::has_ring( $state ) ) {
			// The ring and the accent line are a `box-shadow`: they would replace the element's own shadow on hover
			// (FR-38A-42), so a shadowed element drops both; an invisible pair (no colour, or a zero size on every device)
			// is dropped on its own.
			$block   = (string) ( $context['block'] ?? '' );
			$target  = (string) ( $context['target'] ?? '' );
			$refused = is_array( $context['attributes'] ?? null ) && Sgs_Motion_Ring_Guard::refused( $block, $target, $context['attributes'] );
			if ( $refused || ! Sgs_Motion_Ring_Guard::paints( $state ) ) {
				$state = Sgs_Motion_Ring_Guard::strip( $state, $refused );
			}
			if ( $refused ) {
				do_action(
					'sgs_motion_layer_dropped',
					$block,
					$target,
					array(
						'id'    => Sgs_Motion_Ring_Guard::REFUSAL,
						'layer' => 'hover.state',
					)
				);
			}
		}
		if ( is_array( $state ) ) {
			$attrs['data-sgs-mh'] = (string) ( $state['source'] ?? 'self' );
			self::hover_state( $state, $decls, $trans, $channels );
		}
		foreach ( $element['hover']['effects'] ?? array() as $layer ) {
			self::effect_channels( $layer, $channels );
			self::effect_transition( $layer, $trans );
		}
		foreach ( array( $element['entrance']['text'] ?? array(), $element['effects'] ?? array() ) as $list ) {
			foreach ( is_array( $list ) ? $list : array() as $layer ) {
				self::effect_channels( $layer, $channels );
			}
		}
		$entrance = false;
		$base     = $element['entrance']['base'] ?? null;
		if ( is_array( $base ) && empty( $context['suppress_entrance'] ) ) {
			$entrance = self::entrance( $base, $decls, $attrs, $context );
		}
		Sgs_Motion_Rotation::default_perspective( $decls, isset( $channels['transform'] ) || in_array( 'transform', explode( ' ', $attrs['data-sgs-me'] ?? '' ), true ) );
		if ( array() !== $channels ) {
			$attrs['data-sgs-mc'] = implode( ' ', self::ordered_channels( $channels ) );
		}
		foreach ( self::TIERS as $tier ) {
			if ( array() !== $trans[ $tier ] && empty( $context['no_transition'] ) ) {
				$decls[ $tier ]['transition'] = implode( ', ', $trans[ $tier ] );
			}
		}
		$css = self::rules( $selector, $decls );
		if ( $entrance ) {
			// A trigger's own rules beyond the entrance values: the `open` close values and the `state` rule
			// (`Sgs_Motion_Trigger_Open_State`).
			$css .= (string) apply_filters( 'sgs_motion_entrance_css', '', $base, $selector, $attrs );
		}
		if ( is_array( $element['hover']['focus'] ?? null ) ) {
			$css .= Sgs_Motion_Focus_State::css( $element['hover']['focus'], $selector, $context );
		}
		return array(
			'css'      => $css,
			'attrs'    => $attrs,
			'entrance' => $entrance,
		);
	}

	/**
	 * The fields of one values def: key => node, field type and CSS property.
	 *
	 * @param string $def A `$defs` name.
	 * @return array<string,array{node:array<string,mixed>,type:string,css:?string,state:?string,perDevice:bool}>
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
						'state'     => isset( $meta['state'] ) ? (string) $meta['state'] : null,
						'perDevice' => ! empty( $meta['perDevice'] ),
					);
				}
			}
		}
		return $cache[ $def ];
	}

	/**
	 * Owner (and shared, and plain input) custom property => channel, read from `x-sgs-channels`.
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
				foreach ( array_merge( $row['shared'] ?? array(), $row['inputs'] ?? array() ) as $prop ) {
					$map[ (string) $prop['name'] ] = (string) $row['channel'];
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
	 * The hover state's to-values, resting values, channels and transition list.
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
		$follows     = Sgs_Motion_Rotation::follows( $tiers['desktop'] );
		$follow      = Sgs_Motion_Rotation::follow_defaults();
		$angles      = Sgs_Motion_Rotation::empty_angles();
		$raw         = $angles;
		$owner_count = 0;
		foreach ( self::TIERS as $tier ) {
			$timing_changed = 'desktop' === $tier;
			$angle_changed  = array();
			if ( $follows && Sgs_Motion_Rotation::follow_timing( $tiers[ $tier ], $follow ) ) {
				$timing_changed = true;
			}
			foreach ( $tiers[ $tier ] as $key => $value ) {
				$prop = $fields[ $key ]['css'] ?? null;
				$css  = self::value_css( $def, (string) $key, $value );
				if ( null === $prop || null === $css ) {
					continue;
				}
				if ( isset( $timing[ $prop ] ) ) {
					$timing[ $prop ] = $css;
					$timing_changed  = true;
				} elseif ( Sgs_Motion_Rotation::is_angle( (string) $key ) ) {
					$angles[ $key ]        = $css;
					$raw[ $key ]           = $value;
					$angle_changed[ $key ] = true;
				} elseif ( in_array( $fields[ $key ]['state'], array( 'rest', 'active' ), true ) ) {
					$decls[ $tier ][ $prop ] = $css;
				} elseif ( 0 === strpos( $prop, self::MH_PREFIX ) ) {
					$decls[ $tier ][ self::MH_PREFIX . 'to-' . substr( $prop, strlen( self::MH_PREFIX ) ) ] = $css;
					$owners[ $prop ] = true;
				} else {
					$decls[ $tier ][ self::MH_PREFIX . 'to-' . $key ] = $css;
					$owners[ $prop ]                                  = true;
				}
			}
			if ( array() !== $angle_changed ) {
				Sgs_Motion_Rotation::hover_angles( $angles, $raw, $angle_changed, $tier, $decls, $owners );
			}
			// A tier repeats the whole list when its timing or its owner set differs from the wider tier's.
			if ( $timing_changed || count( $owners ) !== $owner_count ) {
				$trans[ $tier ] = array();
				foreach ( array_merge( array_keys( $owners ), self::HOVER_PAINT ) as $prop ) {
					$trans[ $tier ][] = $prop . ' ' . $timing['transition-duration'] . ' ' . $timing['transition-timing-function'] . ' ' . $timing['transition-delay'];
				}
				if ( $follows ) {
					$trans[ $tier ] = array_merge( $trans[ $tier ], Sgs_Motion_Rotation::follow_entries( $follow ) );
				}
			}
			$owner_count = count( $owners );
		}
		foreach ( array_keys( $owners ) as $prop ) {
			if ( isset( $map[ $prop ] ) ) {
				$channels[ $map[ $prop ] ] = true;
			}
		}
		Sgs_Motion_Rotation::angle_channels( $angles, $channels );
		if ( $follows ) {
			Sgs_Motion_Rotation::follow_channels( $channels );
		}
	}

	/**
	 * The channels an effect layer writes, from `x-sgs-writes`. `channels` lists every channel the effect can write;
	 * an optional `select` (`{field, true, false}`) narrows it to the list matching the layer's desktop boolean value,
	 * so parallax stamps `background-position` only when its `background` switch is on and `translate` otherwise.
	 *
	 * @param array<string,mixed> $layer    An effect layer.
	 * @param array<string,bool>  $channels Channel set (by reference).
	 * @return void
	 */
	private static function effect_channels( array $layer, array &$channels ): void {
		$writes = Sgs_Motion_Field_Types::schema()['x-sgs-writes'][ (string) ( $layer['effect'] ?? '' ) ] ?? array();
		$list   = $writes['channels'] ?? array();
		$select = $writes['select'] ?? null;
		if ( is_array( $select ) && isset( $select['field'] ) ) {
			$on   = ! empty( $layer['values'][ (string) $select['field'] ] );
			$list = $select[ $on ? 'true' : 'false' ] ?? $list;
		}
		foreach ( $list as $channel ) {
			$channels[ (string) $channel ] = true;
		}
	}

	/**
	 * A hover effect's own return transition: its owner properties (from `x-sgs-channels`) on its stored duration and easing
	 * fields (keyed `duration`/`easing`, else ending `Duration`/`Easing`). An effect whose `x-sgs-effects` row names
	 * `runtimeTiming` has its runtime time those properties (the magnet writes 0ms while the pointer tracks and the
	 * return duration on release): its entries read the runtime's custom properties, falling back to no duration and the
	 * stored easing, once for every tier, since the runtime reads each tier's stored value from the data attribute.
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
			$dur_key  = self::better_timing_key( $dur_key, $key, 'duration' === $field['type'], 'Duration' );
			$ease_key = self::better_timing_key( $ease_key, $key, 'easing' === $field['type'], 'Easing' );
		}
		$duration = self::token_or( 'token:duration.medium', '300ms' );
		$easing   = self::token_or( 'token:easing.ease-out', 'ease-out' );
		$tiers    = self::tier_values( $layer );
		if ( null !== $ease_key && isset( $tiers['desktop'][ $ease_key ] ) ) {
			$easing = self::value_css( $def, $ease_key, $tiers['desktop'][ $ease_key ] ) ?? $easing;
		}
		$runtime = Sgs_Motion_Field_Types::schema()['x-sgs-effects'][ $effect ]['runtimeTiming'] ?? null;
		if ( is_array( $runtime ) && isset( $runtime['duration'], $runtime['easing'] ) ) {
			foreach ( $props as $prop ) {
				$trans['desktop'][] = $prop . ' var(' . $runtime['duration'] . ', 0ms) var(' . $runtime['easing'] . ', ' . $easing . ') 0ms';
			}
			return;
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
	 * Which of two same-typed timing fields the return transition reads: the field keyed exactly `duration` or `easing`
	 * wins, then the first key ending in `Duration` or `Easing`.
	 *
	 * @param string|null $current  The key chosen so far.
	 * @param string      $key      The candidate field key.
	 * @param bool        $is_type  Whether the candidate has the wanted field type.
	 * @param string      $suffix   `Duration` or `Easing`.
	 * @return string|null
	 */
	private static function better_timing_key( ?string $current, string $key, bool $is_type, string $suffix ): ?string {
		if ( ! $is_type ) {
			return $current;
		}
		if ( strtolower( $suffix ) === $key ) {
			return $key;
		}
		if ( null === $current && substr( $key, -strlen( $suffix ) ) === $suffix ) {
			return $key;
		}
		return $current;
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
		$keep_op = in_array( $trigger, array( 'load', 'scroll' ), true ) && ! empty( $context['lcp'] ) && true !== ( $tiers['desktop']['allowLcpFade'] ?? false );
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
			$persp = self::fields( 'EntranceValues' )['perspective']['css'] ?? null;
			$css   = null !== $persp && array_key_exists( 'perspective', $tiers[ $tier ] ) ? self::value_css( 'EntranceValues', 'perspective', $tiers[ $tier ]['perspective'] ) : null;
			if ( null !== $css ) {
				$decls[ $tier ][ $persp ] = $css;
			}
		}
		Sgs_Motion_Clip_Edge::apply( $tiers, $decls, $context );
		$keyframes = Sgs_Motion_Keyframes::json( $tiers['desktop']['keyframes'] ?? null, $used, $keep_op, $decls['desktop'] );
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
	 * The scoped rules: desktop in the base rule, Tablet and Mobile inside their media queries. The one per-device
	 * writer, also used by the trigger rules.
	 *
	 * @param string                             $selector Scoped selector.
	 * @param array<string,array<string,string>> $decls    Per-tier declarations.
	 * @return string
	 */
	public static function rules( string $selector, array $decls ): string {
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
