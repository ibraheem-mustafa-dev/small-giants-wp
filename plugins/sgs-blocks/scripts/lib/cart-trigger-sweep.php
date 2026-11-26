<?php
/**
 * The cart trigger sweep's rewrite: the icon button's and the text pill's separate padding, size and radius become one shared set.
 *
 * Pure functions with no WordPress dependency, so the sweep script and its test both load them.
 *
 * Old settings                                     New setting
 *   pillPadding                                    triggerPadding
 *   pillMinHeight + iconTriggerSize                triggerSize {desktop:{width,height},…}
 *   pillBorderRadius + iconTriggerRadius           triggerBorderRadius
 *
 * The backgrounds (pillBgColour* and iconBg*) are not touched: a colour is not per device, so each style keeps its own and the block
 * paints each only in the devices that show that style.
 *
 * The old block printed the pill's padding and height in the devices that showed the pill, and the icon button's size in the devices
 * that showed the icon, each cascading down from the device above. The new settings cascade across both styles, so a device whose
 * style would inherit a value the old block never printed there gets an explicit value that keeps the old result (zero padding on an
 * icon device below a padded pill, the 44px tap floor on a device below a taller button). The radius is one value for the whole
 * block: the one the desktop device's style carried, or the other style's when that was empty. Where the two styles carried
 * different radii the second one cannot be kept, and the rewrite reports it in `conflicts`.
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_cart_trigger_sweep_old_keys' ) ) {
	/**
	 * Every attribute the rewrite removes.
	 *
	 * @return string[]
	 */
	function sgs_cart_trigger_sweep_old_keys(): array {
		return array(
			'pillPadding',
			'pillMinHeight',
			'iconTriggerSize',
			'pillBorderRadius',
			'iconTriggerRadius',
		);
	}

	/**
	 * A per-device value as `desktop`, `tablet` and `mobile` entries (a missing device is null); a flat box is the desktop's. A bare
	 * scalar is nobody's: the old block printed a size only from a tier object, so a scalar `pillMinHeight` or `iconTriggerSize`
	 * printed nothing and must not start to.
	 *
	 * @param mixed $raw    The saved value.
	 * @param bool  $is_box Whether a flat array is one box (its sides) rather than a tier object.
	 * @return array{desktop: mixed, tablet: mixed, mobile: mixed}
	 */
	function sgs_cart_trigger_sweep_tiers( $raw, bool $is_box = false ): array {
		$empty = array(
			'desktop' => null,
			'tablet'  => null,
			'mobile'  => null,
		);
		if ( null === $raw || '' === $raw || array() === $raw ) {
			return $empty;
		}
		if ( is_array( $raw ) && ( array_key_exists( 'desktop', $raw ) || array_key_exists( 'tablet', $raw ) || array_key_exists( 'mobile', $raw ) ) ) {
			foreach ( array_keys( $empty ) as $tier ) {
				$empty[ $tier ] = $raw[ $tier ] ?? null;
			}
			return $empty;
		}
		if ( ! is_array( $raw ) || ! $is_box ) {
			return $empty;
		}
		$empty['desktop'] = $raw;
		return $empty;
	}

	/**
	 * The style each device shows: the desktop value, then the tablet and mobile overrides, each inheriting the device above.
	 *
	 * @param array $attrs The block's saved attributes.
	 * @return array{desktop: string, tablet: string, mobile: string} `icon` or `pill`.
	 */
	function sgs_cart_trigger_sweep_modes( array $attrs ): array {
		$desktop = 'pill' === ( $attrs['triggerStyle'] ?? 'icon' ) ? 'pill' : 'icon';
		$tablet  = in_array( $attrs['triggerStyleTablet'] ?? '', array( 'icon', 'pill' ), true ) ? (string) $attrs['triggerStyleTablet'] : $desktop;
		$mobile  = in_array( $attrs['triggerStyleMobile'] ?? '', array( 'icon', 'pill' ), true ) ? (string) $attrs['triggerStyleMobile'] : $tablet;
		return array(
			'desktop' => $desktop,
			'tablet'  => $tablet,
			'mobile'  => $mobile,
		);
	}

	/**
	 * A box's four sides as strings, so two boxes compare by what they print.
	 *
	 * @param mixed $box A saved padding box.
	 * @return array<string, string>|null Null for no box or an empty one.
	 */
	function sgs_cart_trigger_sweep_box( $box ): ?array {
		if ( ! is_array( $box ) ) {
			return null;
		}
		$out = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			if ( isset( $box[ $side ] ) && is_scalar( $box[ $side ] ) && '' !== (string) $box[ $side ] ) {
				$out[ $side ] = (string) $box[ $side ];
			}
		}
		return array() === $out ? null : $out;
	}

	/**
	 * A saved length as a CSS length: a bare number is pixels, and zero is a value (the old block printed `min-height:0px`).
	 *
	 * @param mixed $raw The saved value.
	 * @return string|null Null when there is none.
	 */
	function sgs_cart_trigger_sweep_length( $raw ): ?string {
		if ( is_int( $raw ) || is_float( $raw ) ) {
			return $raw >= 0 ? rtrim( rtrim( number_format( (float) $raw, 3, '.', '' ), '0' ), '.' ) . 'px' : null;
		}
		$raw = is_string( $raw ) ? trim( $raw ) : '';
		if ( '' === $raw ) {
			return null;
		}
		return preg_match( '/^\d+(?:\.\d+)?$/', $raw ) ? $raw . 'px' : $raw;
	}

	/**
	 * The padding the old block printed at each device: the pill's cascaded value in a pill device, nothing in an icon device.
	 *
	 * @param array $attrs The old attributes.
	 * @param array $modes The style each device shows.
	 * @return array<string, array<string, string>|null>
	 */
	function sgs_cart_trigger_sweep_old_padding( array $attrs, array $modes ): array {
		$tiers   = sgs_cart_trigger_sweep_tiers( $attrs['pillPadding'] ?? null, true );
		$current = null;
		$out     = array();
		foreach ( $modes as $device => $mode ) {
			$own     = sgs_cart_trigger_sweep_box( $tiers[ $device ] );
			$current = $own ?? $current;
			$out[ $device ] = 'pill' === $mode ? $current : null;
		}
		return $out;
	}

	/**
	 * The size the old block printed at each device: the pill's cascaded height in a pill device (its width follows its label), the
	 * icon button's cascaded square (never below 24px) in an icon device.
	 *
	 * @param array $attrs The old attributes.
	 * @param array $modes The style each device shows.
	 * @return array<string, array{width: ?string, height: ?string}>
	 */
	function sgs_cart_trigger_sweep_old_size( array $attrs, array $modes ): array {
		$pill_tiers = sgs_cart_trigger_sweep_tiers( $attrs['pillMinHeight'] ?? null );
		$icon_tiers = sgs_cart_trigger_sweep_tiers( $attrs['iconTriggerSize'] ?? null );
		$pill_seen  = null;
		$icon_seen  = null;
		$out        = array();
		foreach ( $modes as $device => $mode ) {
			$pill_seen = sgs_cart_trigger_sweep_length( $pill_tiers[ $device ] ) ?? $pill_seen;
			$icon_raw  = $icon_tiers[ $device ];
			if ( is_numeric( $icon_raw ) && (float) $icon_raw > 0 ) {
				$icon_seen = max( 24, (int) abs( (float) $icon_raw ) ) . 'px';
			}
			$out[ $device ] = 'pill' === $mode
				? array(
					'width'  => null,
					'height' => $pill_seen,
				)
				: array(
					'width'  => $icon_seen,
					'height' => $icon_seen,
				);
		}
		return $out;
	}

	/**
	 * One value for the whole block from the two styles' old values: the desktop device's style first, then the other style's, counting
	 * only a style some device shows. A second style carrying a different value is reported, not kept.
	 *
	 * @param array<string, string> $by_style  The old value per style (`pill`, `icon`), '' for none.
	 * @param array                 $modes     The style each device shows.
	 * @param string                $label     The setting's name, for the conflict line.
	 * @param string[]              $conflicts Appended with each conflict.
	 * @return string The one value, '' for none.
	 */
	function sgs_cart_trigger_sweep_pick( array $by_style, array $modes, string $label, array &$conflicts ): string {
		$used  = array_values( array_unique( array_values( $modes ) ) );
		$first = $modes['desktop'];
		$order = array_values( array_unique( array_merge( array( $first ), $used ) ) );
		$value = '';
		foreach ( $order as $style ) {
			if ( '' !== $by_style[ $style ] ) {
				$value = $by_style[ $style ];
				break;
			}
		}
		foreach ( $used as $style ) {
			if ( $by_style[ $style ] !== $value ) {
				$conflicts[] = sprintf( '%s: the %s style carried "%s", the block keeps "%s"', $label, $style, $by_style[ $style ], $value );
			}
		}
		return $value;
	}

	/**
	 * Rewrite one block's attributes to the shared settings.
	 *
	 * @param array $attrs The block's saved attributes.
	 * @return array{attrs: array, conflicts: string[]} The new attributes (the same array when none of the old settings is present).
	 */
	function sgs_cart_trigger_sweep_attrs( array $attrs ): array {
		$old_keys = sgs_cart_trigger_sweep_old_keys();
		if ( array() === array_intersect_key( $attrs, array_flip( $old_keys ) ) ) {
			return array(
				'attrs'     => $attrs,
				'conflicts' => array(),
			);
		}
		$modes     = sgs_cart_trigger_sweep_modes( $attrs );
		$conflicts = array();
		$new       = array();

		// Padding: write a value only where the cascade across both styles would not give the old result.
		$old_padding = sgs_cart_trigger_sweep_old_padding( $attrs, $modes );
		$padding     = array();
		$inherited   = null;
		foreach ( $modes as $device => $mode ) {
			$want = $old_padding[ $device ];
			if ( 'icon' === $mode && null === $want && null !== $inherited ) {
				$want = array(
					'top'    => '0px',
					'right'  => '0px',
					'bottom' => '0px',
					'left'   => '0px',
				);
			}
			if ( $want !== $inherited && null !== $want ) {
				$padding[ $device ] = $want;
				$inherited          = $want;
			}
		}
		if ( $padding ) {
			$new['triggerPadding'] = $padding;
		}

		// Size: a device writes the keys its style reads, and only when the cascade would not give the old result.
		$old_size  = sgs_cart_trigger_sweep_old_size( $attrs, $modes );
		$size      = array();
		$inherit_w = null;
		$inherit_h = null;
		foreach ( $modes as $device => $mode ) {
			$want_w = $old_size[ $device ]['width'];
			$want_h = $old_size[ $device ]['height'];
			// A height that was unset below a taller button is the 44px tap floor.
			if ( null === $want_h && null !== $inherit_h ) {
				$want_h = '44px';
			}
			if ( 'icon' === $mode && null === $want_w && null !== $inherit_w ) {
				$want_w = '44px';
			}
			$write_h = $want_h !== $inherit_h && null !== $want_h;
			$write_w = 'icon' === $mode && $want_w !== $inherit_w && null !== $want_w;
			if ( ! $write_h && ! $write_w ) {
				continue;
			}
			$box = array();
			if ( 'icon' === $mode && null !== $want_w ) {
				$box['width'] = $want_w;
			}
			if ( null !== $want_h ) {
				$box['height'] = $want_h;
			}
			$size[ $device ] = $box;
			$inherit_h       = $want_h ?? $inherit_h;
			if ( 'icon' === $mode ) {
				$inherit_w = $want_w ?? $inherit_w;
			}
		}
		if ( $size ) {
			$new['triggerSize'] = $size;
		}

		// Radius: one value for the block.
		$radius = sgs_cart_trigger_sweep_pick(
			array(
				'pill' => (string) ( $attrs['pillBorderRadius'] ?? '' ),
				'icon' => (string) ( $attrs['iconTriggerRadius'] ?? '' ),
			),
			$modes,
			'corner radius',
			$conflicts
		);
		if ( '' !== $radius ) {
			$new['triggerBorderRadius'] = $radius;
		}

		return array(
			'attrs'     => array_merge( array_diff_key( $attrs, array_flip( $old_keys ) ), $new ),
			'conflicts' => $conflicts,
		);
	}

	/**
	 * Whether `apply` must leave a post alone: it holds a value the rewrite cannot keep and nobody accepted losing it.
	 *
	 * @param string[] $conflicts The post's conflict lines.
	 * @param bool     $accept    Whether `accept-conflicts` was given.
	 * @return bool
	 */
	function sgs_cart_trigger_sweep_blocked( array $conflicts, bool $accept ): bool {
		return array() !== $conflicts && ! $accept;
	}

	/**
	 * Rewrite every sgs/cart delimiter in a post's content.
	 *
	 * Only a delimiter that holds an old setting changes, and only its attribute JSON; every other byte stays as it was.
	 *
	 * @param string        $content   The post content.
	 * @param callable|null $serialise Attribute serialiser (default `serialize_block_attributes`).
	 * @return array{content: string, changed: int, conflicts: string[], keys: array<string, int>}
	 */
	function sgs_cart_trigger_sweep_content( string $content, ?callable $serialise = null ): array {
		$serialise = $serialise ?? 'serialize_block_attributes';
		$changed   = 0;
		$conflicts = array();
		$keys      = array();
		$old_keys  = sgs_cart_trigger_sweep_old_keys();
		$new       = preg_replace_callback(
			'#<!--(\s+)wp:sgs/cart(\s+)(\{(?:(?!-->).)*?\})(\s+)(/?)-->#s',
			static function ( array $m ) use ( $serialise, $old_keys, &$changed, &$conflicts, &$keys ): string {
				$attrs = json_decode( $m[3], true );
				if ( ! is_array( $attrs ) ) {
					return $m[0];
				}
				$result = sgs_cart_trigger_sweep_attrs( $attrs );
				if ( $result['attrs'] === $attrs ) {
					return $m[0];
				}
				++$changed;
				foreach ( $result['conflicts'] as $line ) {
					$conflicts[] = $line;
				}
				foreach ( $old_keys as $key ) {
					if ( array_key_exists( $key, $attrs ) ) {
						$keys[ $key ] = ( $keys[ $key ] ?? 0 ) + 1;
					}
				}
				return '<!--' . $m[1] . 'wp:sgs/cart' . $m[2] . $serialise( $result['attrs'] ) . $m[4] . $m[5] . '-->';
			},
			$content
		);
		ksort( $keys );
		return array(
			'content'   => is_string( $new ) ? $new : $content,
			'changed'   => $changed,
			'conflicts' => $conflicts,
			'keys'      => $keys,
		);
	}
}
