<?php
/**
 * Media renderer: resolving a slot's per-device Source, playback and `sizes` (Spec 49 §7.1, §7.6, §8).
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/tier-embed.php';

if ( ! function_exists( 'sgs_media_devices' ) ) {
	/**
	 * The three devices, widest first.
	 *
	 * @return string[]
	 */
	function sgs_media_devices(): array {
		return array( 'desktop', 'tablet', 'mobile' );
	}
}

if ( ! function_exists( 'sgs_media_device_query' ) ) {
	/**
	 * The bare media condition that matches exactly one device (viewport width only, from SGS_Breakpoints).
	 *
	 * @param string $device `desktop`, `tablet` or `mobile`.
	 * @return string e.g. `(max-width:767.98px)`, with no gap at fractional widths.
	 */
	function sgs_media_device_query( string $device ): string {
		$range = array(
			'desktop' => 'desktop',
			'tablet'  => 'tablet-only',
			'mobile'  => 'mobile',
		);
		return SGS_Breakpoints::query_fractional( $range[ $device ] ?? 'desktop' );
	}
}

if ( ! function_exists( 'sgs_media_device_values' ) ) {
	/**
	 * A responsive value resolved for every device, each device inheriting from the next wider one.
	 *
	 * Accepts the responsive object `{desktop,tablet,mobile}` or a plain value (taken as the desktop value).
	 * `null`, `''` and `'inherit'` mean "inherit".
	 *
	 * @param mixed $raw Stored value.
	 * @return array<string,mixed> Device => value; null where nothing is set at or above the device.
	 */
	function sgs_media_device_values( $raw ): array {
		$is_tier = is_array( $raw ) && ( array_key_exists( 'desktop', $raw ) || array_key_exists( 'tablet', $raw ) || array_key_exists( 'mobile', $raw ) );
		$own     = $is_tier ? $raw : array( 'desktop' => $raw );
		$out     = array();
		$last    = null;
		foreach ( sgs_media_devices() as $device ) {
			$value = $own[ $device ] ?? null;
			if ( null !== $value && '' !== $value && 'inherit' !== $value && array() !== $value ) {
				$last = $value;
			}
			$out[ $device ] = $last;
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_attachment_size' ) ) {
	/**
	 * An attachment's full-size dimensions from its metadata, for a file stored with an id and no width and height.
	 *
	 * @param int $id Attachment id.
	 * @return array{0:int,1:int} Width and height; zeros when the attachment has none.
	 */
	function sgs_media_attachment_size( int $id ): array {
		if ( $id <= 0 || ! function_exists( 'wp_get_attachment_metadata' ) ) {
			return array( 0, 0 );
		}
		$meta = wp_get_attachment_metadata( $id );
		return is_array( $meta ) ? array( absint( $meta['width'] ?? 0 ), absint( $meta['height'] ?? 0 ) ) : array( 0, 0 );
	}
}

if ( ! function_exists( 'sgs_media_normalise_source' ) ) {
	/**
	 * One device's stored Source reduced to what the renderer prints, or null when the device shows nothing.
	 *
	 * @param mixed    $raw   The device's Source object.
	 * @param string[] $kinds The slot's allowed kinds; empty allows all.
	 * @param bool     $unsized True for a background: an image with no attachment id may carry no width and height, because a background is a positioned layer that shifts nothing.
	 * @return array|null `{kind,id,url,width,height,mime,alt,poster,captions,markup}`.
	 */
	function sgs_media_normalise_source( $raw, array $kinds, bool $unsized = false ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$id     = absint( $raw['id'] ?? 0 );
		$url    = trim( (string) ( $raw['url'] ?? '' ) );
		$markup = trim( (string) ( $raw['markup'] ?? '' ) );
		$kind   = (string) ( $raw['kind'] ?? '' );
		if ( '' === $kind ) {
			$kind = '' !== $markup ? 'svg' : ( preg_match( '/\.(mp4|webm|mov|ogv|m4v)(\?|#|$)/i', $url ) ? 'video' : 'image' );
		}
		if ( 'none' === $kind || ( $kinds && ! in_array( $kind, $kinds, true ) ) ) {
			return null;
		}
		if ( '' === $url && $id > 0 && function_exists( 'wp_get_attachment_url' ) ) {
			$url = (string) wp_get_attachment_url( $id );
		}
		$poster_raw = is_array( $raw['poster'] ?? null ) ? $raw['poster'] : array();
		$poster     = array(
			'id'     => absint( $poster_raw['id'] ?? 0 ),
			'url'    => trim( (string) ( $poster_raw['url'] ?? '' ) ),
			'width'  => absint( $poster_raw['width'] ?? 0 ),
			'height' => absint( $poster_raw['height'] ?? 0 ),
		);
		if ( '' === $poster['url'] && $poster['id'] > 0 && function_exists( 'wp_get_attachment_url' ) ) {
			$poster['url'] = (string) wp_get_attachment_url( $poster['id'] );
		}
		if ( $poster['id'] > 0 && ( $poster['width'] <= 0 || $poster['height'] <= 0 ) ) {
			list( $poster['width'], $poster['height'] ) = sgs_media_attachment_size( $poster['id'] );
		}
		$source = array(
			'kind'     => $kind,
			'id'       => $id,
			'url'      => $url,
			'width'    => absint( $raw['width'] ?? 0 ),
			'height'   => absint( $raw['height'] ?? 0 ),
			'mime'     => (string) ( $raw['mime'] ?? '' ),
			'alt'      => (string) ( $raw['alt'] ?? '' ),
			'poster'   => $poster,
			'captions' => is_array( $raw['captions'] ?? null ) ? $raw['captions'] : array(),
			'markup'   => $markup,
		);
		if ( in_array( $kind, array( 'image', 'video' ), true ) && $id > 0 && ( $source['width'] <= 0 || $source['height'] <= 0 ) ) {
			list( $source['width'], $source['height'] ) = sgs_media_attachment_size( $id );
		}
		if ( 'svg' === $kind ) {
			return '' !== $markup ? $source : null;
		}
		if ( 'embed' === $kind ) {
			return '' !== sgs_media_normalise_embed_url( $url ) ? $source : null;
		}
		if ( '' === $url ) {
			return null;
		}
		// FR-49-16: a file with no attachment id carries its own width and height, or nothing prints.
		if ( ! $unsized && 'image' === $kind && 0 === $id && ( $source['width'] <= 0 || $source['height'] <= 0 ) ) {
			return null;
		}
		return $source;
	}
}

if ( ! function_exists( 'sgs_media_resolve_sources' ) ) {
	/**
	 * Each device's Source, inheriting upward, normalised.
	 *
	 * @param array $slot  The slot ( `prefix`, `kinds` ).
	 * @param array $attrs Block attributes.
	 * @return array<string,array|null> Device => source, or null for a device that shows nothing.
	 */
	function sgs_media_resolve_sources( array $slot, array $attrs ): array {
		$prefix = (string) ( $slot['prefix'] ?? '' );
		$kinds  = array_map( 'strval', (array) ( $slot['kinds'] ?? array() ) );
		$raw    = $attrs[ sgs_media_element_attr( $prefix, 'Source' ) ] ?? null;
		$out    = array();
		foreach ( sgs_media_device_values( $raw ) as $device => $source ) {
			$out[ $device ] = sgs_media_normalise_source( $source, $kinds, 'background' === ( $slot['context'] ?? '' ) );
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_playback' ) ) {
	/**
	 * The slot's playback options with Spec 49 §8's defaults: block video shows controls and does not autoplay;
	 * a background autoplays muted and looped without controls.
	 *
	 * @param array $slot  The slot ( `prefix`, `context` ).
	 * @param array $attrs Block attributes.
	 * @return array{autoplay:bool,muted:bool,inline:bool,loop:bool,controls:bool,lazy:bool,start:int,pause:bool}
	 */
	function sgs_media_playback( array $slot, array $attrs ): array {
		$prefix = (string) ( $slot['prefix'] ?? '' );
		$bg     = 'background' === ( $slot['context'] ?? '' );
		$raw    = $attrs[ sgs_media_element_attr( $prefix, 'Playback' ) ] ?? array();
		$raw    = is_array( $raw ) ? $raw : array();
		$pick   = static function ( string $key, bool $default ) use ( $raw ): bool {
			return array_key_exists( $key, $raw ) ? (bool) $raw[ $key ] : $default;
		};
		$autoplay = $pick( 'autoplay', $bg );
		return array(
			'autoplay' => $autoplay,
			'muted'    => $autoplay || $pick( 'muted', $bg ),
			'inline'   => $pick( 'inline', true ),
			'loop'     => $pick( 'loop', $bg ),
			'controls' => $pick( 'controls', ! $bg ),
			'lazy'     => $pick( 'lazy', true ),
			'start'    => max( 0, (int) ( $raw['start'] ?? 0 ) ),
			'pause'    => $pick( 'pause', false ),
		);
	}
}

if ( ! function_exists( 'sgs_media_sizes_px' ) ) {
	/**
	 * A Width or Max width as pixels when it is a `px`, `rem` or `em` length (rem and em at 16px), else null.
	 *
	 * @param mixed $value Stored value.
	 * @return float|null
	 */
	function sgs_media_sizes_px( $value ): ?float {
		$value = is_string( $value ) || is_numeric( $value ) ? trim( (string) $value ) : '';
		if ( preg_match( '/^(\d+(?:\.\d+)?)px$/i', $value, $m ) ) {
			return (float) $m[1];
		}
		if ( preg_match( '/^(\d+(?:\.\d+)?)(rem|em)$/i', $value, $m ) ) {
			return (float) $m[1] * 16;
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_media_sizes_for_width' ) ) {
	/**
	 * The `sizes` value for one device's Width and Max width (Spec 49 §7.6).
	 *
	 * `px` prints WordPress's own form; `vw` is kept; `rem` and `em` are taken at 16px; anything else is `100vw`. A px
	 * Max width caps the slot: the smaller of Width and Max width prints when both are lengths, and `min()` caps a `vw`
	 * or column-divided width. An item in an item set divides the fallback by its column count. Lazy images get the
	 * `auto, ` prefix.
	 *
	 * @param mixed $width     The device's Width value.
	 * @param bool  $lazy      True when the image loads lazily.
	 * @param int   $columns   Column count of an item-set parent; 0 or 1 when not applicable.
	 * @param mixed $max_width The device's Max width value; null or '' for none.
	 * @return string
	 */
	function sgs_media_sizes_for_width( $width, bool $lazy, int $columns = 0, $max_width = null ): string {
		$width  = is_string( $width ) || is_numeric( $width ) ? trim( (string) $width ) : '';
		$trim   = static function ( float $px ): string {
			return rtrim( rtrim( number_format( $px, 2, '.', '' ), '0' ), '.' ) . 'px';
		};
		$px     = sgs_media_sizes_px( $width );
		$cap    = sgs_media_sizes_px( $max_width );
		$sizes  = '100vw';
		if ( null !== $px ) {
			$px    = null !== $cap ? min( $px, $cap ) : $px;
			$sizes = sprintf( '(max-width: %1$s) 100vw, %1$s', $trim( $px ) );
		} elseif ( preg_match( '/^(\d+(?:\.\d+)?)vw$/i', $width, $m ) ) {
			$sizes = $m[1] . 'vw';
		} elseif ( $columns > 1 ) {
			$sizes = 'calc(100vw / ' . $columns . ')';
		}
		if ( null !== $cap && null === $px ) {
			$sizes = '100vw' === $sizes ? sprintf( '(max-width: %1$s) 100vw, %1$s', $trim( $cap ) ) : 'min(' . $sizes . ', ' . $trim( $cap ) . ')';
		}
		return $lazy ? 'auto, ' . $sizes : $sizes;
	}
}
