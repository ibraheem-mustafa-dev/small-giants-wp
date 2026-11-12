<?php
/**
 * Cover-crop `sizes` planning: a cover-cropped image drawn wider than its box needs a file wide enough for the crop,
 * so the plan computes its `sizes` value and the `wp_content_img_tag` filter drops core's `auto`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/helpers-image-dimensions.php';
require_once __DIR__ . '/media-values.php';
require_once __DIR__ . '/render-sources.php';

if ( ! function_exists( 'sgs_media_cover_crop_plan' ) ) {
	/**
	 * Work out how a cover-cropped image is drawn relative to its box, and the `sizes` value that describes it.
	 *
	 * The browser picks a srcset file for the width `sizes` describes, and core's lazy-image `sizes="auto"` describes
	 * the box width only. A cover-cropped image is drawn at box width x max( 1, image ratio / box ratio ), so a file
	 * chosen by box width is too small when the crop is wider than the box and the photo looks soft.
	 *
	 * Every setting is read per device (`Fit`, `Ratio`, `Width`, `MaxWidth`, `Height`, each a {desktop,tablet,mobile}
	 * object where a device without its own value takes the wider device's). An unset `Fit` is `cover`, which is what
	 * assets/css/media-base.css draws. A device whose Fit is not cover never widens. The box width is the px `Width`,
	 * else (when no `Width` is set) the px `MaxWidth`; the box shape is `Ratio` (`natural` follows the image), else px
	 * width over px height.
	 *
	 * Outcomes:
	 * - `widens` false: `auto` is right (no device crops wider than its box, or every box follows the image).
	 * - `widens` true and `sizes` set: every device's drawn width is known, so `sizes` carries one concrete px value
	 *   per device (breakpoints from SGS_Breakpoints).
	 * - `widens` true and `by_device` set: a device's box width is not a px setting, but the layout model knows the
	 *   width of the box the slot sits in (`$boxes`, from `sgs_media_width_model()`), an upper bound. That device draws
	 *   the box model times the crop factor (a `min()`/`calc()` over the layout term); a device that does not widen
	 *   prints its box model. The caller prints `by_device` through `sgs_media_combine_sizes()`.
	 * - `widens` true and `sizes` empty: the drawn width cannot be known (a fill box, or a width that is not px and no
	 *   layout model); the caller keeps the attachment's own hint with `auto` removed. A portrait image never widens,
	 *   so it keeps `auto`.
	 *
	 * A fill-height box (`Height: fill`) takes its shape from its parent when the parent is a container with a
	 * `boxAspectRatio` and the box is its only child (`$parent_box`, from `Sgs_Layout_Width::box()`): the box ratio is the
	 * parent's. The fill helper is never shorter than its floor (assets/css/media-base.css `.sgs-media-box--fill::before`:
	 * the parent's content height when its px min-height sets one, `$parent_box['floor']`, else 12rem), so a box narrower
	 * than floor x ratio is still floor tall and the crop is `floor x image ratio` wide: that figure joins the printed width
	 * as a floor. A parent's px `minHeight` bounds the height from below only, so on its own it
	 * gives no upper bound on the crop; with a ratio, a stack that does not stretch its children and no width of its own,
	 * the parent is `minHeight x ratio` wide (`$parent_box['width']`), which bounds the box's width.
	 *
	 * @param array $attributes    Block attributes.
	 * @param array $slot          The media slot (`prefix`).
	 * @param int   $attachment_id The image's attachment ID.
	 * @param array $boxes         Device => layout model `{vw,off,cap}` of the slot's own box (`sgs_media_width_model()`); empty when the layout is unknown.
	 * @param array|null $parent_box The box shape the parent container gives the slot (`Sgs_Layout_Width::box()`: `ratio`, `roomy`, `width` per device); null for none.
	 * @return array{widens:bool,sizes:string,by_device?:array<string,string>}
	 */
	function sgs_media_cover_crop_plan( array $attributes, array $slot, int $attachment_id, array $boxes = array(), ?array $parent_box = null ): array {
		$keep_auto = array(
			'widens' => false,
			'sizes'  => '',
		);
		$unknown   = array(
			'widens' => true,
			'sizes'  => '',
		);
		$get       = static function ( string $base ) use ( $attributes, $slot ): array {
			return sgs_media_device_values( $attributes[ sgs_media_key( $slot, $base ) ] ?? null );
		};
		$fits      = $get( 'Fit' );
		$covers    = array();
		foreach ( sgs_media_devices() as $device ) {
			$covers[ $device ] = null === $fits[ $device ] || 'cover' === $fits[ $device ];
		}
		if ( ! in_array( true, $covers, true ) ) {
			return $keep_auto;
		}
		$meta   = $attachment_id > 0 ? wp_get_attachment_metadata( $attachment_id ) : array();
		$width  = (int) ( is_array( $meta ) ? ( $meta['width'] ?? 0 ) : 0 );
		$height = (int) ( is_array( $meta ) ? ( $meta['height'] ?? 0 ) : 0 );
		if ( $width <= 0 || $height <= 0 ) {
			return $unknown;
		}
		$image_ratio = $width / $height;

		$px     = static function ( $value ): ?float {
			return is_string( $value ) && preg_match( '/^\s*(\d+(?:\.\d+)?)\s*px\s*$/i', $value, $m ) ? (float) $m[1] : null;
		};
		$widths = $get( 'Width' );
		$maxes  = $get( 'MaxWidth' );
		$heights = $get( 'Height' );
		$ratios = $get( 'Ratio' );

		$drawn      = array();
		$factors    = array();
		$heights_px = array();
		$floors     = array();
		foreach ( sgs_media_devices() as $device ) {
			if ( ! $covers[ $device ] ) {
				$drawn[ $device ] = null;
				continue;
			}
			$box_w = $px( null !== $widths[ $device ] && '' !== $widths[ $device ] ? $widths[ $device ] : $maxes[ $device ] );
			$box_h = $px( $heights[ $device ] );
			$ratio = $ratios[ $device ];
			if ( 'natural' === $ratio ) {
				$drawn[ $device ] = null;
				continue;
			}
			$box_ratio = 0.0;
			if ( null === $box_w && 'fill' === $heights[ $device ] && null !== $parent_box && isset( $boxes[ $device ] ) && is_array( $boxes[ $device ] )
				&& ( $parent_box['ratio'] ?? 0.0 ) > 0.0 && ( ! empty( $parent_box['roomy'] ) || $parent_box['ratio'] >= 1.0 ) ) {
				// A fill box in a shaped parent: the parent's ratio, and the fill helper's floor (the parent's content height
				// when its px min-height sets one, else 12rem). A parent whose own width is known (`width`) holds the box to it.
				if ( isset( $parent_box['width'][ $device ] ) && class_exists( 'Sgs_Layout_Width' ) ) {
					$boxes[ $device ] = Sgs_Layout_Width::capped( $boxes[ $device ], (float) $parent_box['width'][ $device ] );
				}
				$factors[ $device ] = max( 1.0, $image_ratio / $parent_box['ratio'] );
				$floors[ $device ]  = (int) ceil( $image_ratio * (float) ( $parent_box['floor'][ $device ] ?? 192.0 ) );
				continue;
			}
			if ( is_string( $ratio ) && preg_match( '#^\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*$#', $ratio, $m ) && (float) $m[2] > 0.0 ) {
				$box_ratio = (float) $m[1] / (float) $m[2];
			} elseif ( null !== $box_w && null !== $box_h && $box_h > 0.0 ) {
				$box_ratio = $box_w / $box_h;
			}
			if ( $box_ratio <= 0.0 ) {
				// No Ratio and no fixed box. With no Height the box takes the image's own shape, so nothing is cropped and
				// the browser's own measurement (`auto`) stays right.
				$h = $heights[ $device ];
				if ( null === $h || '' === $h ) {
					$drawn[ $device ] = null;
					continue;
				}
				// A px Height with an automatic width (no Width, or `auto`): the width follows the image (`height x ratio`)
				// but the box is held to its container, and a container narrower than that crops the sides (cover). Either
				// way the file must be `height x image ratio` wide, which is the figure to print.
				if ( null !== $box_h && null === $box_w && ( null === $widths[ $device ] || '' === $widths[ $device ] ) ) {
					$drawn[ $device ] = (int) ceil( $box_h * $image_ratio );
					continue;
				}
				// An explicit `auto` Width sits in a helper box that takes the container's width (the file's own width at
				// most), so the file is as wide as the larger of `height x image ratio` and the container: both are printed.
				if ( null !== $box_h && null === $box_w && 'auto' === $widths[ $device ] && isset( $boxes[ $device ] ) && is_array( $boxes[ $device ] ) ) {
					$drawn[ $device ]   = null;
					$heights_px[ $device ] = (int) ceil( $box_h * $image_ratio );
					continue;
				}
				// A fill or relative Height: the box shape is unknowable here, so only a portrait image (or a square one)
				// is certain not to widen.
				if ( $image_ratio > 1.0 ) {
					return $unknown;
				}
				$drawn[ $device ] = null;
				continue;
			}
			$factor = max( 1.0, $image_ratio / $box_ratio );
			if ( $factor <= 1.01 ) {
				$drawn[ $device ] = null;
			} elseif ( null !== $box_w ) {
				$drawn[ $device ] = (int) ceil( $box_w * $factor );
			} elseif ( isset( $boxes[ $device ] ) && is_array( $boxes[ $device ] ) ) {
				$drawn[ $device ]   = null;
				$factors[ $device ] = $factor;
			} else {
				return $unknown;
			}
		}
		$known = array_filter( $drawn, 'is_int' );
		if ( array() === $known && array() === $factors && array() === $heights_px ) {
			return $keep_auto;
		}
		if ( array() !== $factors || array() !== $heights_px ) {
			// At least one device draws a model-sized box: print every device from its box model (or its px figure).
			$by_device = array();
			foreach ( sgs_media_devices() as $device ) {
				if ( isset( $drawn[ $device ] ) && is_int( $drawn[ $device ] ) ) {
					$by_device[ $device ] = $drawn[ $device ] . 'px';
				} elseif ( isset( $heights_px[ $device ] ) && class_exists( 'Sgs_Layout_Width' ) ) {
					$by_device[ $device ] = 'max(' . $heights_px[ $device ] . 'px, ' . Sgs_Layout_Width::to_sizes( $boxes[ $device ], true ) . ')';
				} elseif ( isset( $floors[ $device ], $boxes[ $device ] ) && is_array( $boxes[ $device ] ) && class_exists( 'Sgs_Layout_Width' ) ) {
					$by_device[ $device ] = 'max(' . $floors[ $device ] . 'px, ' . Sgs_Layout_Width::to_sizes( Sgs_Layout_Width::scaled( $boxes[ $device ], $factors[ $device ] ?? 1.0 ), true ) . ')';
				} elseif ( isset( $boxes[ $device ] ) && is_array( $boxes[ $device ] ) && class_exists( 'Sgs_Layout_Width' ) ) {
					$by_device[ $device ] = Sgs_Layout_Width::to_sizes( Sgs_Layout_Width::scaled( $boxes[ $device ], $factors[ $device ] ?? 1.0 ) );
				} else {
					return $unknown;
				}
			}
			return array(
				'widens'    => true,
				'sizes'     => '',
				'by_device' => $by_device,
			);
		}
		if ( count( $known ) < 3 || ! class_exists( 'SGS_Breakpoints' ) ) {
			// One sizes list cannot hold a concrete width for some devices and `auto` for others.
			return $unknown;
		}
		return array(
			'widens' => true,
			'sizes'  => sprintf(
				'(max-width: %dpx) %dpx, (max-width: %dpx) %dpx, %dpx',
				(int) SGS_Breakpoints::MOBILE_MAX,
				$drawn['mobile'],
				(int) SGS_Breakpoints::TABLET_MAX,
				$drawn['tablet'],
				$drawn['desktop']
			),
		);
	}
}

if ( ! function_exists( 'sgs_media_drop_auto_sizes' ) ) {
	/**
	 * `wp_content_img_tag` filter: take core's `auto` out of `sizes` on an image marked `data-sgs-cover-crop`.
	 *
	 * Core adds `auto` to every lazy image before this filter runs (wp-includes/media.php::wp_filter_content_tags).
	 * Without it the browser reads the attachment's own sizes hint, which picks a file wide enough for the crop.
	 * Parameters stay untyped: a typed hook callback fatals on an unexpected value.
	 *
	 * @param mixed $filtered_image The image tag.
	 * @return mixed The tag, `auto` removed from a marked image's sizes.
	 */
	function sgs_media_drop_auto_sizes( $filtered_image ) {
		if ( ! is_string( $filtered_image ) || false === strpos( $filtered_image, 'data-sgs-cover-crop' ) ) {
			return $filtered_image;
		}
		return (string) preg_replace( '/\ssizes="auto,\s*/i', ' sizes="', $filtered_image, 1 );
	}
}
