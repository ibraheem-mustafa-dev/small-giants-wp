<?php
/**
 * Post grid card media: each card's featured image goes through the shared media renderer (Spec 49 §7, §8.3).
 *
 * Every card of a grid shows its post's featured image with the grid's own settings (`imageFit`, `imageFocal`,
 * `imageRadius`, `imageShape`, `imageLoading` and the rest of the adopted `image` slot), so the rules are the same for
 * every card and print once per grid (`media_css()`), under the grid's media scope class `{uid}-media`. Cards paged in
 * later by the REST route carry the same scope class and take the rules already on the page. A REST render is lazy and
 * never high priority (§7.7 rule 2).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * The featured-image slot of the post grid.
 */
class Post_Grid_Media {

	/**
	 * The longest `imageMedia` JSON the REST route accepts.
	 */
	const MAX_JSON = 4096;

	/**
	 * The grid's `image` slot.
	 *
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	public static function slot(): array {
		return array(
			'prefix'  => 'image',
			'kinds'   => array( 'image' ),
			'context' => 'item',
		);
	}

	/**
	 * The scope class the grid's media rules print under.
	 *
	 * @param string $uid The grid's own uid class.
	 * @return string
	 */
	public static function scope( string $uid ): string {
		return sanitize_html_class( $uid ) . '-media';
	}

	/**
	 * The slot's settings from the block's attributes: every `image*` attribute except the Source and Alt (each card
	 * brings its own), as the REST route's `imageMedia` parameter carries them, plus the grid's column counts for `sizes`.
	 *
	 * @param array $attributes Block attributes.
	 * @param array $columns    Columns per device.
	 * @return array<string,mixed>
	 */
	public static function settings( array $attributes, array $columns ): array {
		$out = array();
		foreach ( $attributes as $name => $value ) {
			if ( 1 === preg_match( '/^image[A-Z]/', (string) $name ) && ! in_array( $name, array( 'imageSource', 'imageAlt' ), true ) && null !== $value && '' !== $value && array() !== $value ) {
				$out[ $name ] = $value;
			}
		}
		$out['_columns'] = $columns;
		return $out;
	}

	/**
	 * Settings from the REST route's JSON parameter: only `image*` names and `_columns`, as stored values.
	 *
	 * @param mixed $raw The JSON string.
	 * @return array<string,mixed>
	 */
	public static function decode_settings( $raw ): array {
		if ( ! is_string( $raw ) || '' === $raw || strlen( $raw ) > self::MAX_JSON ) {
			return array();
		}
		$data = json_decode( $raw, true );
		if ( ! is_array( $data ) ) {
			return array();
		}
		$out = array();
		foreach ( $data as $name => $value ) {
			if ( 1 === preg_match( '/^image[A-Z]/', (string) $name ) && ! in_array( $name, array( 'imageSource', 'imageAlt' ), true ) ) {
				$out[ $name ] = $value;
			}
		}
		if ( is_array( $data['_columns'] ?? null ) ) {
			$out['_columns'] = array_map( 'absint', array_intersect_key( $data['_columns'], array_flip( array( 'desktop', 'tablet', 'mobile' ) ) ) );
		}
		return $out;
	}

	/**
	 * The renderer's attributes for one card: the grid's settings with the post's featured image as the Source.
	 *
	 * @param int   $thumb_id  The featured image's attachment id; 0 for none.
	 * @param array $settings  The grid's settings (`settings()`).
	 * @return array<string,mixed>
	 */
	private static function attrs( int $thumb_id, array $settings ): array {
		$attrs = $settings;
		unset( $attrs['_columns'] );
		$attrs['imageSource'] = $thumb_id > 0 ? array(
			'desktop' => array(
				'kind' => 'image',
				'id'   => $thumb_id,
			),
		) : null;
		$attrs['imageAlt']    = $thumb_id > 0 ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';
		return $attrs;
	}

	/**
	 * The renderer's context.
	 *
	 * @param string $uid      The grid's own uid class.
	 * @param array  $settings The grid's settings.
	 * @return array<string,mixed>
	 */
	private static function context( string $uid, array $settings ): array {
		$columns = is_array( $settings['_columns'] ?? null ) ? $settings['_columns'] : array();
		return array(
			'uid'       => self::scope( $uid ),
			'block'     => 'sgs/post-grid',
			'hidden'    => function_exists( 'sgs_in_hidden_render_context' ) && sgs_in_hidden_render_context(),
			'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
			'item_set'  => array( 'columns' => $columns ),
		);
	}

	/**
	 * One card's featured image as the renderer prints it.
	 *
	 * @param int    $post_id  The post.
	 * @param string $uid      The grid's own uid class.
	 * @param array  $settings The grid's settings.
	 * @return string The picture markup; '' when the post has no featured image the renderer can print.
	 */
	public static function card_image( int $post_id, string $uid, array $settings ): string {
		$thumb_id = (int) get_post_thumbnail_id( $post_id );
		if ( $thumb_id <= 0 || ! class_exists( 'SGS_Media_Element' ) ) {
			return '';
		}
		$out = \SGS_Media_Element::render( self::slot(), self::attrs( $thumb_id, $settings ), self::context( $uid, $settings ) );
		return (string) $out['html'];
	}

	/**
	 * The grid's media rules, printed once with the grid. They do not depend on the file, so a stand-in picture of the
	 * default ratio produces the same rules every card's picture takes, whether or not the first page holds a photo.
	 *
	 * @param string $uid      The grid's own uid class.
	 * @param array  $settings The grid's settings.
	 * @return string CSS.
	 */
	public static function media_css( string $uid, array $settings ): string {
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return '';
		}
		$attrs                = self::attrs( 0, $settings );
		$attrs['imageSource'] = array(
			'desktop' => array(
				'kind'   => 'image',
				'url'    => 'https://stand-in.invalid/photo.jpg',
				'width'  => 16,
				'height' => 9,
			),
		);
		// The stand-in is never printed, so it is a hidden surface to the loading resolver: it claims no eager slot and no priority.
		$out                  = \SGS_Media_Element::render( self::slot(), $attrs, array_merge( self::context( $uid, $settings ), array( 'hidden' => true ) ) );
		return (string) $out['css'];
	}

	/**
	 * The image frame's rules: its ratio per device (`imageRatio`; 16 / 9 where the desktop sets none) as the
	 * `--sgs-pg-aspect` custom property, and a fixed height per device (`imageHeight`), which replaces the ratio.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $frame_sel  The frame's scoped selector.
	 * @return string CSS.
	 */
	public static function frame_css( array $attributes, string $frame_sel ): string {
		$ratios = array( 'desktop' => '16 / 9' );
		foreach ( self::tiers( $attributes['imageRatio'] ?? null ) as $device => $raw ) {
			$ratio = is_string( $raw ) ? sgs_media_ratio( $raw ) : '';
			if ( '' !== $ratio ) {
				$ratios[ $device ] = $ratio;
			} elseif ( 'natural' === $raw ) {
				$ratios[ $device ] = 'auto';
			}
		}
		$css = sgs_emit_responsive_css(
			$frame_sel,
			array(
				array(
					'value'     => $ratios,
					'css'       => '--sgs-pg-aspect',
					'transform' => static fn( $raw ): string => (string) $raw,
				),
			)
		);
		$heights = array();
		foreach ( self::tiers( $attributes['imageHeight'] ?? null ) as $device => $raw ) {
			$length = is_scalar( $raw ) ? sgs_css_length_value( (string) $raw ) : '';
			if ( '' !== $length ) {
				$heights[ $device ] = $length;
			}
		}
		if ( array() !== $heights ) {
			$css .= sgs_emit_responsive_css(
				$frame_sel,
				array(
					array(
						'value'        => $heights,
						'css'          => 'height',
						'unit_default' => 'px',
					),
					array(
						'value'     => $heights,
						'css'       => 'aspect-ratio',
						'transform' => static fn(): string => 'auto',
					),
				)
			);
		}
		return $css;
	}

	/**
	 * A responsive value's own `{desktop,tablet,mobile}` entries, empty ones left out; a plain value is the desktop one.
	 *
	 * @param mixed $raw Stored value.
	 * @return array<string,mixed>
	 */
	private static function tiers( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return null === $raw || '' === $raw ? array() : array( 'desktop' => $raw );
		}
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			if ( isset( $raw[ $device ] ) && '' !== $raw[ $device ] && array() !== $raw[ $device ] ) {
				$out[ $device ] = $raw[ $device ];
			}
		}
		return $out;
	}
}
