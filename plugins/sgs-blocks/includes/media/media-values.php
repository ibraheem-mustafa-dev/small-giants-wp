<?php
/**
 * Media emitter core: value checks (FR-49-12) and the rule builder the C3 emitters share.
 *
 * Every stored string that reaches CSS passes one of the `sgs_media_*` value functions here, which sit on the
 * existing helpers (`sgs_css_single_length_value`, `sgs_colour_value`, `sgs_css_gradient_value`, `sgs_shadow_layers`)
 * and add what those do not check. JS twin: `src/components/media/emit/values.js` and `core.js`.
 *
 * The emitters `sgs_media_atom_<id>_emit( $slot, $attrs, $uid, $helper )` return finished rules. A slot is
 * `{prefix, kinds, context, wrapper}`; `wrapper` is true when a figure or link is printed around the media.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/class-sgs-breakpoints.php';
require_once dirname( __DIR__ ) . '/helpers-css-safety.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-tokens.php';
require_once dirname( __DIR__ ) . '/helpers-shadow-layers.php';

if ( ! function_exists( 'sgs_media_devices' ) ) {
	/**
	 * The devices, widest first.
	 *
	 * @return string[]
	 */
	function sgs_media_devices(): array {
		return array( 'desktop', 'tablet', 'mobile' );
	}
}

if ( ! function_exists( 'sgs_media_key' ) ) {
	/**
	 * The stored attribute name of a base: `{prefix}{Base}`, with the first letter lower-cased when the prefix is empty.
	 *
	 * @param array  $slot Slot.
	 * @param string $base Base name.
	 * @return string
	 */
	function sgs_media_key( array $slot, string $base ): string {
		$prefix = (string) ( $slot['prefix'] ?? '' );
		return '' === $prefix ? lcfirst( $base ) : $prefix . $base;
	}
}

if ( ! function_exists( 'sgs_media_is_tiered' ) ) {
	/**
	 * Whether a stored value is a responsive object (`desktop`, `tablet` or `mobile` key).
	 *
	 * @param mixed $value Stored value.
	 * @return bool
	 */
	function sgs_media_is_tiered( $value ): bool {
		return is_array( $value ) && array() !== array_intersect( array_keys( $value ), sgs_media_devices() );
	}
}

if ( ! function_exists( 'sgs_media_tiers' ) ) {
	/**
	 * A base's stored value as a responsive object; a plain value is the desktop value.
	 *
	 * @param array  $attrs Attributes.
	 * @param array  $slot  Slot.
	 * @param string $base  Base name.
	 * @return array
	 */
	function sgs_media_tiers( array $attrs, array $slot, string $base ): array {
		$raw = $attrs[ sgs_media_key( $slot, $base ) ] ?? null;
		if ( null === $raw || '' === $raw || array() === $raw ) {
			return array();
		}
		return sgs_media_is_tiered( $raw ) ? $raw : array( 'desktop' => $raw );
	}
}

if ( ! function_exists( 'sgs_media_own' ) ) {
	/**
	 * The value a device sets itself, or null when it inherits.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $base   Base name.
	 * @param string $device Device.
	 * @return mixed
	 */
	function sgs_media_own( array $attrs, array $slot, string $base, string $device ) {
		$value = sgs_media_tiers( $attrs, $slot, $base )[ $device ] ?? null;
		return ( null === $value || '' === $value || 'inherit' === $value ) ? null : $value;
	}
}

if ( ! function_exists( 'sgs_media_resolved' ) ) {
	/**
	 * The value in force at a device: its own, else the nearest wider device's.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $base   Base name.
	 * @param string $device Device.
	 * @return mixed Null when nothing is set.
	 */
	function sgs_media_resolved( array $attrs, array $slot, string $base, string $device ) {
		$tiers = sgs_media_tiers( $attrs, $slot, $base );
		return array() === $tiers ? null : sgs_resolve_tier( $tiers, $device, null )['value'];
	}
}

if ( ! function_exists( 'sgs_media_scalar' ) ) {
	/**
	 * A plain (not per-device) value.
	 *
	 * @param array  $attrs Attributes.
	 * @param array  $slot  Slot.
	 * @param string $base  Base name.
	 * @return mixed
	 */
	function sgs_media_scalar( array $attrs, array $slot, string $base ) {
		$raw = $attrs[ sgs_media_key( $slot, $base ) ] ?? null;
		return sgs_media_is_tiered( $raw ) ? ( $raw['desktop'] ?? null ) : $raw;
	}
}

if ( ! function_exists( 'sgs_media_num' ) ) {
	/**
	 * A number as CSS text: at most two decimals, no trailing zeros.
	 *
	 * @param float $n Number.
	 * @return string
	 */
	function sgs_media_num( float $n ): string {
		return (string) round( $n, 2 );
	}
}

if ( ! function_exists( 'sgs_media_length' ) ) {
	/**
	 * A length that is safe to print, an allowed keyword, or ''. A bare number is not a length, quotes must pair up
	 * and no two terms may sit side by side inside min(), max() or clamp().
	 *
	 * @param mixed    $raw      Stored value.
	 * @param string[] $keywords Keywords this setting allows.
	 * @return string
	 */
	function sgs_media_length( $raw, array $keywords = array() ): string {
		$raw = is_string( $raw ) ? trim( $raw ) : '';
		if ( in_array( $raw, $keywords, true ) ) {
			return $raw;
		}
		if ( '' === $raw || 1 === preg_match( '/^[\d.]+$/', $raw ) ) {
			return '';
		}
		return sgs_css_single_length_value( $raw );
	}
}

if ( ! function_exists( 'sgs_media_px' ) ) {
	/**
	 * A stored length that may be a bare number of pixels (clamped 0 to $max), or ''.
	 *
	 * @param mixed $raw Stored value.
	 * @param float $max Largest allowed pixel number.
	 * @return string
	 */
	function sgs_media_px( $raw, float $max = 500.0 ): string {
		if ( is_int( $raw ) || is_float( $raw ) || ( is_string( $raw ) && 1 === preg_match( '/^\s*\d+(\.\d+)?\s*$/', $raw ) ) ) {
			return sgs_media_num( max( 0.0, min( $max, (float) $raw ) ) ) . 'px';
		}
		return sgs_media_length( $raw );
	}
}

if ( ! function_exists( 'sgs_media_ratio' ) ) {
	/**
	 * An aspect ratio `w / h`, or ''.
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_media_ratio( $raw ): string {
		$raw = is_string( $raw ) ? trim( $raw ) : '';
		return 1 === preg_match( '/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/', $raw ) ? $raw : '';
	}
}

if ( ! function_exists( 'sgs_media_colour' ) ) {
	/**
	 * A colour that is safe to print: hex, rgb(), rgba(), hsl(), hsla(), var(), a keyword or a palette slug. '' when unsafe.
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_media_colour( $raw ): string {
		$raw = is_string( $raw ) ? trim( $raw ) : '';
		if ( '' === $raw ) {
			return '';
		}
		if ( 1 === preg_match( '/^(rgb|rgba|hsl|hsla)\(([0-9a-z\s.,%\/+\-]*)\)$/i', $raw ) ) {
			return $raw;
		}
		if ( 1 === preg_match( '/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $raw ) ) {
			return $raw;
		}
		if ( 0 === stripos( $raw, 'var(' ) ) {
			return sgs_resolved_css_value( $raw );
		}
		if ( 1 !== preg_match( '/^[a-z][a-z0-9-]*$/i', $raw ) ) {
			return '';
		}
		return sgs_colour_value( $raw );
	}
}

if ( ! function_exists( 'sgs_media_gradient' ) ) {
	/**
	 * A gradient that is safe to print, or ''.
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_media_gradient( $raw ): string {
		return sgs_css_gradient_value( is_string( $raw ) ? $raw : '' );
	}
}

if ( ! function_exists( 'sgs_media_shadow' ) ) {
	/**
	 * A box-shadow value from a stored shape and colour, or ''. Layers and colours are checked by `sgs_shadow_layers()`.
	 *
	 * @param mixed $shape  Stored shape.
	 * @param mixed $colour Stored colour text.
	 * @return string
	 */
	function sgs_media_shadow( $shape, $colour ): string {
		return sgs_shadow_layers( is_string( $shape ) ? $shape : '', is_string( $colour ) ? $colour : '' );
	}
}

if ( ! function_exists( 'sgs_media_blend' ) ) {
	/**
	 * A mix-blend-mode keyword, or ''.
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_media_blend( $raw ): string {
		$modes = array( 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter' );
		$raw   = is_string( $raw ) ? strtolower( trim( $raw ) ) : '';
		return in_array( $raw, $modes, true ) ? $raw : '';
	}
}

if ( ! function_exists( 'sgs_media_filter' ) ) {
	/**
	 * A `filter` value for a colour treatment: `natural` is '', `greyscale` is `grayscale(N%)`, `white` is `brightness(0) invert(1)`.
	 *
	 * @param mixed $colour   Stored treatment.
	 * @param mixed $strength Greyscale strength 0 to 100; 100 when unset.
	 * @return string
	 */
	function sgs_media_filter( $colour, $strength ): string {
		if ( 'white' === $colour ) {
			return 'brightness(0) invert(1)';
		}
		if ( 'greyscale' !== $colour ) {
			return '';
		}
		$n = is_numeric( $strength ) ? max( 0.0, min( 100.0, (float) $strength ) ) : 100.0;
		return 'grayscale(' . sgs_media_num( $n ) . '%)';
	}
}

if ( ! function_exists( 'sgs_media_url' ) ) {
	/**
	 * A URL that is safe inside `url()`: http, https or site-relative, with no quote, bracket or backslash; or ''.
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_media_url( $raw ): string {
		$raw = is_string( $raw ) ? trim( $raw ) : '';
		if ( '' === $raw || 1 === preg_match( '/["\'\\\\()<>{};\s]|[\x00-\x1f]/', $raw ) ) {
			return '';
		}
		if ( 1 !== preg_match( '#^(https?://|/(?!/))#i', $raw ) ) {
			return '';
		}
		return function_exists( 'esc_url' ) ? esc_url( $raw ) : $raw;
	}
}

if ( ! function_exists( 'sgs_media_nodes' ) ) {
	/**
	 * The selectors of each paint node (C3, §7.4).
	 *
	 * @param array  $slot   Slot.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @param bool   $mask   Whether a mask layer is printed.
	 * @return array<string,string> layout, surface, media, mask, overlay.
	 */
	function sgs_media_nodes( array $slot, string $uid, bool $helper, bool $mask = false ): array {
		$root    = '.' . $uid;
		$wrapped = ! empty( $slot['wrapper'] );
		$surface = $helper ? ( $wrapped ? $root . ' .sgs-media-box' : $root ) : ( $wrapped ? $root . ' .sgs-media-el' : $root );
		$media   = ( $helper || $wrapped ) ? $root . ' .sgs-media-el' : $root;
		$maskSel = $root . ' .sgs-media-box__mask';
		return array(
			'layout'  => $root,
			'surface' => $surface,
			'media'   => $media,
			'mask'    => $maskSel,
			'overlay' => ( $mask ? $maskSel : $surface ) . '::after',
		);
	}
}

if ( ! function_exists( 'sgs_media_add' ) ) {
	/**
	 * Add one declaration to a rule set: selector, device, property.
	 *
	 * @param array  $rules    Rule set, by reference.
	 * @param string $selector Selector.
	 * @param string $device   Device.
	 * @param string $prop     Property.
	 * @param string $value    Value.
	 */
	function sgs_media_add( array &$rules, string $selector, string $device, string $prop, string $value ): void {
		$rules[ $selector ][ $device ][ $prop ] = $value;
	}
}

if ( ! function_exists( 'sgs_media_decls_body' ) ) {
	/**
	 * A declaration map as rule text, properties sorted. A key starting with `@` is a nested at-rule: its value is printed as it is.
	 *
	 * @param array $decls Property => value.
	 * @return string
	 */
	function sgs_media_decls_body( array $decls ): string {
		ksort( $decls, SORT_STRING );
		$body = '';
		foreach ( $decls as $prop => $value ) {
			$body .= ( '@' === $prop[0] ) ? $value : $prop . ':' . $value . ';';
		}
		return $body;
	}
}

if ( ! function_exists( 'sgs_media_rules_css' ) ) {
	/**
	 * Print a rule set: per selector, desktop plain and the narrower devices in their media queries, properties sorted;
	 * then the hover rules, each inside `(hover:hover)` with a 200ms transition that reduced motion removes.
	 *
	 * @param array $rules Selector => device => property => value.
	 * @param array $hover List of `array( hoverSelector, transitionSelector, array property => value )`.
	 * @return string
	 */
	function sgs_media_rules_css( array $rules, array $hover = array() ): string {
		$css = '';
		foreach ( $rules as $selector => $devices ) {
			foreach ( sgs_media_devices() as $device ) {
				$decls = $devices[ $device ] ?? array();
				if ( array() === $decls ) {
					continue;
				}
				$rule = $selector . '{' . sgs_media_decls_body( $decls ) . '}';
				$css .= 'desktop' === $device ? $rule : SGS_Breakpoints::media( $device ) . '{' . $rule . '}';
			}
		}
		foreach ( $hover as $entry ) {
			list( $hover_sel, $base_sel, $decls ) = $entry;
			if ( array() === $decls ) {
				continue;
			}
			$css .= '@media(hover:hover){' . $hover_sel . '{' . sgs_media_decls_body( $decls ) . '}}';
			$css .= '@media(hover:hover) and (prefers-reduced-motion:no-preference){' . $base_sel . '{transition:' . implode( ' 200ms,', array_keys( $decls ) ) . ' 200ms;}}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_media_emit_plain' ) ) {
	/**
	 * Add a `plain` setting: the property once per device that sets its own value, nothing else.
	 *
	 * @param array    $rules    Rule set, by reference.
	 * @param array    $attrs    Attributes.
	 * @param array    $slot     Slot.
	 * @param string   $base     Base name.
	 * @param string   $selector Target selector.
	 * @param string   $prop     CSS property.
	 * @param callable $format   Maps the raw value to the printed value, '' to print nothing.
	 * @param bool     $skip_default_desktop A desktop value equal to this printed value is not printed.
	 */
	function sgs_media_emit_plain( array &$rules, array $attrs, array $slot, string $base, string $selector, string $prop, callable $format, string $skip_default_desktop = '' ): void {
		foreach ( sgs_media_devices() as $device ) {
			$own = sgs_media_own( $attrs, $slot, $base, $device );
			if ( null === $own ) {
				continue;
			}
			$value = $format( $own );
			if ( '' === $value || ( 'desktop' === $device && '' !== $skip_default_desktop && $value === $skip_default_desktop ) ) {
				continue;
			}
			sgs_media_add( $rules, $selector, $device, $prop, $value );
		}
	}
}
