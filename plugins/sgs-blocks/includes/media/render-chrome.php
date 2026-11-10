<?php
/**
 * Media renderer: the helper decision (§7.3), the per-device sibling and caption CSS (§7.1, §7.2) and asset loading.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_media_any_value' ) ) {
	/**
	 * Whether any device's value satisfies a test.
	 *
	 * @param mixed    $raw  Stored value (responsive object or plain).
	 * @param callable $test Receives one device value.
	 * @return bool
	 */
	function sgs_media_any_value( $raw, callable $test ): bool {
		foreach ( sgs_media_device_values( $raw ) as $value ) {
			if ( null !== $value && $test( $value ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_media_needs_helper' ) ) {
	/**
	 * Whether the helper is printed (Spec 49 §7.3): at any device, on resolved values, Height is Fill; an overlay or a
	 * hover form is set; Shape is a mask; or the media part has hover scale above 1, Parallax, Ken Burns, a clip
	 * entrance or an effect that paints a layer. A caption or link never causes it.
	 *
	 * @param string $prefix  Slot prefix.
	 * @param array  $attrs   Block attributes.
	 * @param array  $context Render context; `effects` (names), `entrance`, `hover` ( `scale` ) describe motion.
	 * @return bool
	 */
	function sgs_media_needs_helper( string $prefix, array $attrs, array $context ): bool {
		$filled = static function ( $value ): bool {
			return is_string( $value ) ? '' !== trim( $value ) : ! empty( $value );
		};
		if ( sgs_media_any_value( $attrs[ sgs_media_element_attr( $prefix, 'Height' ) ] ?? null, static fn( $v ): bool => 'fill' === $v ) ) {
			return true;
		}
		foreach ( array( 'OverlayColour', 'OverlayGradient' ) as $base ) {
			$name = sgs_media_element_attr( $prefix, $base );
			if ( sgs_media_any_value( $attrs[ $name ] ?? null, $filled ) ) {
				return true;
			}
		}
		$overlay = sgs_media_element_attr( $prefix, 'Overlay' );
		foreach ( $attrs as $key => $value ) {
			if ( 0 === strpos( (string) $key, $overlay ) && false !== strpos( (string) $key, 'Hover' ) && $filled( $value ) ) {
				return true;
			}
		}
		$mask = static function ( $value ): bool {
			$shape = is_array( $value ) ? (string) ( $value['shape'] ?? '' ) : (string) $value;
			return ! in_array( $shape, array( '', 'none', 'circle', 'ellipse', 'pill' ), true );
		};
		if ( sgs_media_any_value( $attrs[ sgs_media_element_attr( $prefix, 'Shape' ) ] ?? null, $mask ) ) {
			return true;
		}
		if ( (float) ( $context['hover']['scale'] ?? 0 ) > 1 ) {
			return true;
		}
		$painting = array( 'parallax', 'ken-burns', 'sheen', 'glare', 'ripple', 'curtain', 'surface' );
		foreach ( (array) ( $context['effects'] ?? array() ) as $effect ) {
			if ( in_array( (string) $effect, $painting, true ) ) {
				return true;
			}
		}
		return '' !== (string) ( $context['entrance'] ?? '' ) && false !== strpos( (string) $context['entrance'], 'clip' );
	}
}

if ( ! function_exists( 'sgs_media_has_mask' ) ) {
	/**
	 * Whether any device resolves Shape to a mask.
	 *
	 * @param string $prefix Slot prefix.
	 * @param array  $attrs  Block attributes.
	 * @return bool
	 */
	function sgs_media_has_mask( string $prefix, array $attrs ): bool {
		return sgs_media_any_value(
			$attrs[ sgs_media_element_attr( $prefix, 'Shape' ) ] ?? null,
			static function ( $value ): bool {
				$shape = is_array( $value ) ? (string) ( $value['shape'] ?? '' ) : (string) $value;
				return ! in_array( $shape, array( '', 'none', 'circle', 'ellipse', 'pill' ), true );
			}
		);
	}
}

if ( ! function_exists( 'sgs_media_width_is_auto' ) ) {
	/**
	 * The devices at which Width resolves to `auto` (Spec 49 §7.2): a Width the user set wins; otherwise `auto` when
	 * nothing sizing-related is set, or when Ratio and Height are both set.
	 *
	 * @param string $prefix Slot prefix.
	 * @param array  $attrs  Block attributes.
	 * @return string[] Devices.
	 */
	function sgs_media_width_is_auto( string $prefix, array $attrs ): array {
		$values = array();
		foreach ( array( 'Width', 'Ratio', 'Height', 'MinHeight', 'MaxHeight' ) as $base ) {
			$values[ $base ] = sgs_media_device_values( $attrs[ sgs_media_element_attr( $prefix, $base ) ] ?? null );
		}
		$set   = static function ( $value ): bool {
			return null !== $value && '' !== $value;
		};
		$autos = array();
		foreach ( sgs_media_devices() as $device ) {
			if ( $set( $values['Width'][ $device ] ) ) {
				if ( 'auto' === $values['Width'][ $device ] ) {
					$autos[] = $device;
				}
				continue;
			}
			$ratio  = $set( $values['Ratio'][ $device ] ) && 'natural' !== $values['Ratio'][ $device ];
			$height = $set( $values['Height'][ $device ] ) && 'auto' !== $values['Height'][ $device ];
			$other  = $ratio || $height || $set( $values['MinHeight'][ $device ] ) || $set( $values['MaxHeight'][ $device ] );
			if ( ! $other || ( $ratio && $height ) ) {
				$autos[] = $device;
			}
		}
		return $autos;
	}
}

if ( ! function_exists( 'sgs_media_range_for_device' ) ) {
	/**
	 * The `SGS_Breakpoints` range key that matches exactly one device.
	 *
	 * @param string $device Device.
	 * @return string
	 */
	function sgs_media_range_for_device( string $device ): string {
		return array(
			'desktop' => 'desktop',
			'tablet'  => 'tablet-only',
			'mobile'  => 'mobile',
		)[ $device ] ?? 'desktop';
	}
}

if ( ! function_exists( 'sgs_media_sibling_css' ) ) {
	/**
	 * Breakpoint rules that show the right sibling: each sibling is hidden at every device it does not serve.
	 *
	 * Selectors are compound (`.uid .sgs-media-sib.sgs-media-sib--x`) so block CSS cannot out-rank them.
	 *
	 * @param string                  $uid      Scope class, no dot.
	 * @param array<string,string[]>  $siblings Sibling class => devices it serves.
	 * @return string
	 */
	function sgs_media_sibling_css( string $uid, array $siblings ): string {
		$css = '';
		foreach ( sgs_media_devices() as $device ) {
			$hide = array();
			foreach ( $siblings as $class => $devices ) {
				if ( ! in_array( $device, $devices, true ) ) {
					$hide[] = '.' . $uid . ' .sgs-media-sib.' . $class;
				}
			}
			if ( $hide ) {
				$css .= SGS_Breakpoints::media( sgs_media_range_for_device( $device ) ) . '{' . implode( ',', $hide ) . '{display:none}}';
			}
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_media_caption_css' ) ) {
	/**
	 * Caption width follows the media when Width resolves to `auto` (Spec 49 §7.1): Gutenberg's table-caption pattern.
	 *
	 * @param string   $uid     Scope class, no dot.
	 * @param string[] $devices Devices at which Width resolves to `auto`.
	 * @return string
	 */
	function sgs_media_caption_css( string $uid, array $devices ): string {
		$css = '';
		foreach ( $devices as $device ) {
			$css .= SGS_Breakpoints::media( sgs_media_range_for_device( $device ) )
				. '{.' . $uid . '{display:table}.' . $uid . ' .sgs-media-caption{display:table-caption;caption-side:bottom;overflow-wrap:anywhere}}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_media_enqueue_assets' ) ) {
	/**
	 * Enqueue the media stylesheets and the device-video module for a rendered slot that declares `kinds`.
	 *
	 * @param bool $helper Whether the helper is printed (loads the overlay sheet).
	 * @param bool $video  Whether a video sibling is printed (loads the video sheet and the view module).
	 * @param bool $mask   Whether a mask shape is on at any device (loads the mask sheet).
	 * @return void
	 */
	function sgs_media_enqueue_assets( bool $helper, bool $video, bool $mask = false ): void {
		if ( ! defined( 'SGS_BLOCKS_URL' ) || ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}
		$sheets = array( 'base' => true );
		if ( $helper ) {
			$sheets['overlay'] = true;
		}
		if ( $mask ) {
			$sheets['mask'] = true;
		}
		if ( $video ) {
			$sheets['video'] = true;
		}
		foreach ( array_keys( $sheets ) as $name ) {
			$rel    = 'assets/css/media-' . $name . '.css';
			$handle = 'sgs-media-' . $name;
			$file   = SGS_BLOCKS_PATH . $rel;
			if ( ! file_exists( $file ) ) {
				continue;
			}
			wp_enqueue_style( $handle, SGS_BLOCKS_URL . $rel, array(), (string) filemtime( $file ) );
		}
		$module = 'build/shared/media/device-video.js';
		if ( $video && file_exists( SGS_BLOCKS_PATH . $module ) ) {
			wp_enqueue_script_module( '@sgs/media-device-video', SGS_BLOCKS_URL . $module, array(), (string) filemtime( SGS_BLOCKS_PATH . $module ) );
		}
	}
}
