<?php
/**
 * Media renderer: the background's per-instance CSS (Spec 49 §7.8, §8, §10.3).
 *
 * Every rule prints under the block's scope class and reaches only the background's own nodes: the element
 * (`.uid > .sgs-bg-media`), the media inside it (`.sgs-media-el`) and the overlay (`.uid > .sgs-bg-overlay`), so a photo
 * in the block's content is never touched. The static base is `assets/css/media-bg.css`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_bg_media_painted_decls' ) ) {
	/**
	 * The declarations of one CSS-painted device: the file, its size, repeat and position.
	 *
	 * A tile uses Tile size and Repeat (Repeat defaults to `repeat` once Fit is Tile); a Pinned photo that is not a tile
	 * keeps its Fit as `background-size` and never repeats.
	 *
	 * @param array  $plan   The plan.
	 * @param array  $slot   The slot.
	 * @param array  $attrs  Block attributes.
	 * @param string $device The device.
	 * @return array<string,string>
	 */
	function sgs_bg_media_painted_decls( array $plan, array $slot, array $attrs, string $device ): array {
		$url = sgs_bg_media_file_url( $plan['sources'][ $device ] );
		if ( '' === $url ) {
			return array();
		}
		$fit     = $plan['fit'][ $device ];
		$repeats = array( 'repeat', 'repeat-x', 'repeat-y', 'no-repeat' );
		if ( 'tile' === $fit ) {
			$repeat = sgs_media_resolved( $attrs, $slot, 'Repeat', $device );
			$size   = sgs_media_length( sgs_media_resolved( $attrs, $slot, 'TileSize', $device ), array( 'auto' ) );
			$repeat = in_array( $repeat, $repeats, true ) ? $repeat : 'repeat';
			$size   = '' !== $size ? $size : 'auto';
		} else {
			$repeat = 'no-repeat';
			$size   = array(
				'cover'      => 'cover',
				'contain'    => 'contain',
				'scale-down' => 'contain',
				'none'       => 'auto',
				'fill'       => '100% 100%',
			)[ $fit ] ?? 'cover';
		}
		$focal = sgs_media_resolved( $attrs, $slot, 'Focal', $device );
		$x     = is_array( $focal ) && is_numeric( $focal['x'] ?? null ) ? max( 0.0, min( 1.0, (float) $focal['x'] ) ) * 100 : 50.0;
		$y     = is_array( $focal ) && is_numeric( $focal['y'] ?? null ) ? max( 0.0, min( 1.0, (float) $focal['y'] ) ) * 100 : 50.0;
		return array(
			'background-image'    => 'url(' . $url . ')',
			'background-position' => sgs_media_num( $x ) . '% ' . sgs_media_num( $y ) . '%',
			'background-repeat'   => $repeat,
			'background-size'     => $size,
		);
	}
}

if ( ! function_exists( 'sgs_bg_media_css' ) ) {
	/**
	 * The background element's per-instance CSS: the painted layer, Fit, Focal, photo Opacity and which sibling shows.
	 *
	 * Rules cascade downward (desktop plain, tablet and mobile in `SGS_Breakpoints::media`), so a device that stops
	 * painting a layer a wider device painted resets it with `background-image:none`.
	 *
	 * @param string $uid   Scope class, without the dot.
	 * @param array  $slot  The background slot.
	 * @param array  $attrs Block attributes.
	 * @return string
	 */
	function sgs_bg_media_css( string $uid, array $slot, array $attrs ): string {
		$plan    = sgs_bg_media_plan( $slot, $attrs );
		$element = '.' . $uid . ' > .' . sgs_bg_media_capability()['element_class'];
		$media   = $element . ' .sgs-media-el';
		$rules   = array();
		$before  = array();
		foreach ( sgs_media_devices() as $device ) {
			$decls = 'css' === $plan['paint'][ $device ] ? sgs_bg_media_painted_decls( $plan, $slot, $attrs, $device ) : array();
			if ( $decls ) {
				if ( $decls !== $before ) {
					foreach ( $decls as $prop => $value ) {
						sgs_media_add( $rules, $element, $device, $prop, $value );
					}
				}
				$before = $decls;
			} elseif ( $before ) {
				// The device paints nothing (another kind, none, or a painted file whose URL is gone): stop the wider layer.
				sgs_media_add( $rules, $element, $device, 'background-image', 'none' );
				$before = array();
			}
		}
		sgs_media_emit_plain(
			$rules,
			$attrs,
			$slot,
			'Opacity',
			$element,
			'opacity',
			static function ( $raw ): string {
				return is_numeric( $raw ) ? sgs_media_num( max( 0.0, min( 100.0, (float) $raw ) ) / 100 ) : '';
			},
			'1'
		);
		sgs_media_emit_plain(
			$rules,
			$attrs,
			$slot,
			'Fit',
			$media,
			'object-fit',
			static function ( $raw ): string {
				return in_array( $raw, array( 'cover', 'contain', 'fill', 'none', 'scale-down' ), true ) ? (string) $raw : '';
			}
		);
		sgs_media_emit_plain(
			$rules,
			$attrs,
			$slot,
			'Focal',
			$media,
			'object-position',
			static function ( $point ): string {
				if ( ! is_array( $point ) || ! is_numeric( $point['x'] ?? null ) || ! is_numeric( $point['y'] ?? null ) ) {
					return '';
				}
				$x = max( 0.0, min( 1.0, (float) $point['x'] ) ) * 100;
				$y = max( 0.0, min( 1.0, (float) $point['y'] ) ) * 100;
				return sgs_media_num( $x ) . '% ' . sgs_media_num( $y ) . '%';
			}
		);
		$css  = sgs_media_rules_css( $rules );
		$css .= sgs_media_sibling_css( $uid, sgs_bg_media_siblings( $plan ) );
		return $css;
	}
}

if ( ! function_exists( 'sgs_bg_media_has_css' ) ) {
	/**
	 * Whether the background prints any per-instance rule (the block then needs a scope class).
	 *
	 * @param array $slot  The background slot.
	 * @param array $attrs Block attributes.
	 * @return bool
	 */
	function sgs_bg_media_has_css( array $slot, array $attrs ): bool {
		return '' !== sgs_bg_media_css( 'sgs-probe', $slot, $attrs );
	}
}

if ( ! function_exists( 'sgs_bg_overlay_css' ) ) {
	/**
	 * The overlay's paint, its hover paint and its per-device strength.
	 *
	 * Only the opacity is re-printed per device, so colour, gradient and blend keep one owner; an unset device inherits
	 * the wider device by the cascade.
	 *
	 * @param string $uid           Scope class, without the dot.
	 * @param string $overlay_decls Pre-sanitised declarations from `sgs_overlay_decls()`.
	 * @param array  $attrs         Block attributes.
	 * @return string
	 */
	function sgs_bg_overlay_css( string $uid, string $overlay_decls, array $attrs ): string {
		if ( '' === $overlay_decls || '' === $uid ) {
			return '';
		}
		$selector = '.' . $uid . ' > .' . sgs_bg_media_capability()['overlay_class'];
		$css      = $selector . '{' . $overlay_decls . '}';
		$hover    = sgs_overlay_decls( (string) ( $attrs['backgroundOverlayColourHover'] ?? '' ), (string) ( $attrs['backgroundOverlayGradientHover'] ?? '' ) );
		if ( '' !== $hover ) {
			$css .= sgs_emit_state_colour_css( $selector, array(), array( $hover ) );
		}
		$opacity = sgs_responsive_normalise_object( $attrs['backgroundOverlayOpacity'] ?? null );
		foreach ( array( 'tablet', 'mobile' ) as $device ) {
			$value = $opacity[ $device ] ?? null;
			if ( null !== $value && '' !== $value && is_numeric( $value ) ) {
				$css .= SGS_Breakpoints::media( $device ) . '{' . $selector . '{opacity:' . esc_attr( (string) ( (float) $value / 100 ) ) . '}}';
			}
		}
		return $css;
	}
}
