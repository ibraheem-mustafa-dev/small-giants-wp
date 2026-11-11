<?php
/**
 * Product card and buybox media: each picture goes through the shared renderer (Spec 49 §7, §10.4).
 *
 * Both blocks print a main picture, a thumbnail strip and (card) a brand logo or (buybox) a configurator preview. Each
 * is one slot: `image`/`main`, `thumb` and `logo`/`preview`. The slot's settings are the block's `{prefix}*`
 * attributes; this file turns a product's picture into the slot's `{prefix}Source`, calls
 * `SGS_Media_Element::render()` once, and adds what the card's colour swap needs on the picture.
 *
 * A swappable picture (the main one, on a product with options) carries `data-wp-bind--src`, `--alt` and `--srcset`
 * and prints one file for every device: a `<picture>` source would outrank the `src` the swap writes.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-image-dimensions.php';
require_once __DIR__ . '/media/render-chrome.php';

if ( ! function_exists( 'sgs_pcm_slot' ) ) {
	/**
	 * A slot of the product card or buybox: images only, item context.
	 *
	 * @param string $prefix Slot prefix (`image`, `thumb`, `logo`, `main`, `preview`).
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_pcm_slot( string $prefix ): array {
		return array(
			'prefix'  => $prefix,
			'kinds'   => array( 'image' ),
			'context' => 'item',
		);
	}
}

if ( ! function_exists( 'sgs_pcm_source' ) ) {
	/**
	 * A picture's Source object, one file for every device.
	 *
	 * An attachment id is enough (the renderer reads its size). A file with no id carries its own width and height,
	 * read from the file when the caller has none; a file whose size cannot be read prints nothing (FR-49-16).
	 *
	 * @param string $url    File address.
	 * @param int    $width  Pixel width, 0 when unknown.
	 * @param int    $height Pixel height, 0 when unknown.
	 * @param int    $id     Attachment id, 0 when none.
	 * @return array|null `{desktop:{kind,id,url,width,height}}`, or null when there is no file.
	 */
	function sgs_pcm_source( string $url, int $width = 0, int $height = 0, int $id = 0 ): ?array {
		$url = trim( $url );
		if ( '' === $url && $id <= 0 ) {
			return null;
		}
		if ( $id <= 0 && ( $width <= 0 || $height <= 0 ) ) {
			$size = '' !== $url ? sgs_image_intrinsic_size( $url ) : null;
			if ( null === $size ) {
				return null;
			}
			list( $width, $height ) = $size;
		}
		return array(
			'desktop' => array(
				'kind'   => 'image',
				'id'     => max( 0, $id ),
				'url'    => $url,
				'width'  => max( 0, $width ),
				'height' => max( 0, $height ),
			),
		);
	}
}

if ( ! function_exists( 'sgs_pcm_has_file' ) ) {
	/**
	 * Whether a Source object holds a file at any device.
	 *
	 * @param mixed $source A stored Source.
	 * @return bool
	 */
	function sgs_pcm_has_file( $source ): bool {
		if ( ! is_array( $source ) ) {
			return false;
		}
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = $source[ $device ] ?? null;
			if ( is_array( $entry ) && ( ! empty( $entry['id'] ) || '' !== trim( (string) ( $entry['url'] ?? '' ) ) ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_pcm_first_url' ) ) {
	/**
	 * The address of the file a Source shows on desktop (or the first device that has one); '' when none.
	 *
	 * @param mixed $source A stored Source.
	 * @return string
	 */
	function sgs_pcm_first_url( $source ): string {
		if ( ! is_array( $source ) ) {
			return '';
		}
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = $source[ $device ] ?? null;
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$url = trim( (string) ( $entry['url'] ?? '' ) );
			$id  = absint( $entry['id'] ?? 0 );
			if ( '' === $url && $id > 0 && function_exists( 'wp_get_attachment_url' ) ) {
				$url = (string) wp_get_attachment_url( $id );
			}
			if ( '' !== $url ) {
				return $url;
			}
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_pcm_sized' ) ) {
	/**
	 * Whether a slot's Ratio or Height sizes the picture itself (so the card's fixed-height box steps aside).
	 *
	 * A Height of Fill leaves the box as the size: the picture fills it.
	 *
	 * @param array  $attrs  Block attributes.
	 * @param string $prefix Slot prefix.
	 * @return bool
	 */
	function sgs_pcm_sized( array $attrs, string $prefix ): bool {
		$sized = static function ( $value ): bool {
			return is_string( $value ) && '' !== trim( $value ) && ! in_array( trim( $value ), array( 'fill', 'auto', 'natural' ), true );
		};
		foreach ( array( 'Ratio', 'Height' ) as $base ) {
			if ( function_exists( 'sgs_media_any_value' ) && sgs_media_any_value( $attrs[ sgs_media_element_attr( $prefix, $base ) ] ?? null, $sized ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_pcm_srcset' ) ) {
	/**
	 * The `srcset` the renderer printed on the first picture, or '' when it printed none.
	 *
	 * @param string $html The renderer's markup.
	 * @return string
	 */
	function sgs_pcm_srcset( string $html ): string {
		return preg_match( '/<img\b[^>]*\ssrcset="([^"]*)"/i', $html, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : '';
	}
}

if ( ! function_exists( 'sgs_pcm_bind' ) ) {
	/**
	 * Put the colour swap's bindings on the picture. `srcset` is bound too: the swap writes `src`, and a `srcset` left in
	 * place would outrank it, so the swap empties `context.imageSrcset`.
	 *
	 * @param string $html The renderer's markup.
	 * @return string
	 */
	function sgs_pcm_bind( string $html ): string {
		return (string) preg_replace(
			'/<img\b/i',
			'<img data-wp-bind--src="context.imageSrc" data-wp-bind--alt="context.imageAlt" data-wp-bind--srcset="context.imageSrcset"',
			$html,
			1
		);
	}
}

if ( ! function_exists( 'sgs_pcm_render' ) ) {
	/**
	 * Render one slot's picture.
	 *
	 * `$opts`: `source` (a Source laid over the block's own `{prefix}Source`; null keeps the block's), `alt`,
	 * `decorative`, `class` (on the outermost printed element), `block` (`sgs/product-card` or `sgs/buybox`), `hidden`
	 * (inside a hidden surface: lazy, claims nothing), `role`, `bind` (carry the colour swap's bindings), `desktop_only`.
	 *
	 * @param string $prefix Slot prefix.
	 * @param array  $attrs  Block attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param array  $opts   Options.
	 * @return array{html:string,css:string}
	 */
	function sgs_pcm_render( string $prefix, array $attrs, string $uid, array $opts = array() ): array {
		$empty = array(
			'html' => '',
			'css'  => '',
		);
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return $empty;
		}
		if ( array_key_exists( 'source', $opts ) && null !== $opts['source'] ) {
			$attrs[ $prefix . 'Source' ] = $opts['source'];
		}
		if ( ! empty( $opts['bind'] ) ) {
			$source = $attrs[ $prefix . 'Source' ] ?? null;
			if ( is_array( $source ) ) {
				$resolved = function_exists( 'sgs_media_device_values' ) ? sgs_media_device_values( $source ) : $source;
				$first    = is_array( $resolved['desktop'] ?? null ) ? $resolved['desktop'] : null;
				$attrs[ $prefix . 'Source' ] = null === $first ? $source : array( 'desktop' => $first );
			}
		}
		if ( isset( $opts['alt'] ) ) {
			$attrs[ $prefix . 'Alt' ] = (string) $opts['alt'];
		}
		if ( isset( $opts['decorative'] ) ) {
			$attrs[ $prefix . 'Decorative' ] = (bool) $opts['decorative'];
		}
		if ( ! sgs_pcm_has_file( $attrs[ $prefix . 'Source' ] ?? null ) ) {
			return $empty;
		}
		$out  = SGS_Media_Element::render(
			sgs_pcm_slot( $prefix ),
			$attrs,
			array(
				'uid'         => $uid,
				'block'       => (string) ( $opts['block'] ?? '' ),
				'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
				'extra_class' => (string) ( $opts['class'] ?? '' ),
				'hidden'      => ! empty( $opts['hidden'] ),
				'role'        => (string) ( $opts['role'] ?? '' ),
			)
		);
		$html = (string) $out['html'];
		if ( '' !== $html && ! empty( $opts['bind'] ) ) {
			$html = sgs_pcm_bind( $html );
		}
		return array(
			'html' => $html,
			'css'  => (string) $out['css'],
		);
	}
}

if ( ! function_exists( 'sgs_pcm_style' ) ) {
	/**
	 * A renderer's CSS as a `<style>` element, or '' when there is none.
	 *
	 * @param string $css Rules.
	 * @return string
	 */
	function sgs_pcm_style( string $css ): string {
		return '' === trim( $css ) ? '' : '<style>' . wp_strip_all_tags( $css ) . '</style>';
	}
}

if ( ! function_exists( 'sgs_pcm_main_image' ) ) {
	/**
	 * The main picture of a card or buybox: the live product's file, or the block's own Source when it overrides.
	 *
	 * @param string $prefix   Slot prefix (`image` or `main`).
	 * @param array  $attrs    Block attributes.
	 * @param string $uid      Scope class, without the dot.
	 * @param array  $live     The live picture: `url`, `width`, `height`, `id`, `alt`.
	 * @param bool   $override Whether the block's own Source replaces the live file.
	 * @param array  $opts     `block`, `bind`, `class`.
	 * @return array{html:string,css:string,srcset:string}
	 */
	function sgs_pcm_main_image( string $prefix, array $attrs, string $uid, array $live, bool $override, array $opts = array() ): array {
		$render = array_merge(
			$opts,
			$override
				? array()
				: array(
					'source'     => sgs_pcm_source( (string) ( $live['url'] ?? '' ), (int) ( $live['width'] ?? 0 ), (int) ( $live['height'] ?? 0 ), (int) ( $live['id'] ?? 0 ) ),
					'alt'        => (string) ( $live['alt'] ?? '' ),
					'decorative' => false,
				)
		);
		if ( ! $override && null === $render['source'] ) {
			return array(
				'html'   => '',
				'css'    => '',
				'srcset' => '',
			);
		}
		$out = sgs_pcm_render( $prefix, $attrs, $uid, $render );
		return array(
			'html'   => $out['html'],
			'css'    => $out['css'],
			'srcset' => sgs_pcm_srcset( $out['html'] ),
		);
	}
}

if ( ! function_exists( 'sgs_pcm_thumb' ) ) {
	/**
	 * One thumbnail of the strip: the manifest's `{url, w, h, alt}` through the `thumb` slot.
	 *
	 * Every thumbnail is the same slot, so the slot's rules print once, after the first one. A thumbnail sits in a hidden
	 * or scrolling strip and never claims the page's eager loading.
	 *
	 * @param string $prefix Slot prefix (`thumb`).
	 * @param array  $attrs  Block attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param array  $thumb  `{url, w, h, alt}`.
	 * @param string $block  Block name.
	 * @param bool   $first  Whether this is the strip's first thumbnail (it prints the rules).
	 * @return string Markup, with the rules in a `<style>` for the first.
	 */
	function sgs_pcm_thumb( string $prefix, array $attrs, string $uid, array $thumb, string $block, bool $first ): string {
		$out = sgs_pcm_render(
			$prefix,
			$attrs,
			$uid,
			array(
				'source' => sgs_pcm_source( (string) ( $thumb['url'] ?? '' ), (int) ( $thumb['w'] ?? 0 ), (int) ( $thumb['h'] ?? 0 ) ),
				'alt'    => (string) ( $thumb['alt'] ?? '' ),
				'block'  => $block,
				'hidden' => true,
			)
		);
		return $out['html'] . ( $first ? sgs_pcm_style( $out['css'] ) : '' );
	}
}

if ( ! function_exists( 'sgs_pcm_chrome_bases' ) ) {
	/**
	 * The settings of a slot that paint the slot's box rather than the picture: border, corners, shadow and ground.
	 *
	 * The buybox draws these on its own box (the photo frame, the thumbnail button, the preview box), which also carries
	 * the sticker, the selected state and the clip; the picture inside fills it. The renderer therefore prints the
	 * picture without them, and `sgs_pcm_chrome_css()` prints them on the box.
	 *
	 * @return string[]
	 */
	function sgs_pcm_chrome_bases(): array {
		return array(
			'BorderWidth',
			'BorderStyle',
			'BorderColour',
			'BorderColourHover',
			'Radius',
			'BoxShadow',
			'BoxShadowColour',
			'BoxShadowColourHover',
			'Background',
		);
	}
}

if ( ! function_exists( 'sgs_pcm_picture_attrs' ) ) {
	/**
	 * A slot's attributes without the box settings (see `sgs_pcm_chrome_bases()`), for the renderer.
	 *
	 * @param array  $attrs  Block attributes.
	 * @param string $prefix Slot prefix.
	 * @return array
	 */
	function sgs_pcm_picture_attrs( array $attrs, string $prefix ): array {
		foreach ( sgs_pcm_chrome_bases() as $base ) {
			unset( $attrs[ sgs_media_element_attr( $prefix, $base ) ] );
		}
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_pcm_chrome_css' ) ) {
	/**
	 * A slot's box settings as rules on the box that carries the scope class `$uid` (the shape, shadow and ground twins
	 * of the renderer's own emitters, so the box and a picture draw the same way).
	 *
	 * @param array  $attrs  Block attributes.
	 * @param string $prefix Slot prefix.
	 * @param string $uid    The box's scope class, without the dot.
	 * @return string CSS, '' when no setting is set.
	 */
	function sgs_pcm_chrome_css( array $attrs, string $prefix, string $uid ): string {
		foreach ( array( 'shape', 'shadow', 'media-padding' ) as $atom ) {
			require_once __DIR__ . '/media/atoms/' . $atom . '.php';
		}
		$keys = array();
		foreach ( sgs_pcm_chrome_bases() as $base ) {
			$keys[ sgs_media_element_attr( $prefix, $base ) ] = true;
		}
		$own  = array_intersect_key( $attrs, $keys );
		$slot = sgs_pcm_slot( $prefix );
		return sgs_media_atom_shape_emit( $slot, $own, $uid, false )
			. sgs_media_atom_shadow_emit( $slot, $own, $uid, false )
			. sgs_media_atom_media_padding_emit( $slot, $own, $uid, false );
	}
}

