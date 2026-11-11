<?php
/**
 * Cover-crop `sizes` planning: a cover-cropped image drawn wider than its box needs a file wide enough for the crop,
 * so the plan computes its `sizes` value and the `wp_content_img_tag` filter drops core's `auto`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/helpers-image-dimensions.php';

if ( ! function_exists( 'sgs_media_cover_crop_hint_sizes' ) ) {
	/**
	 * A `sizes` value from a per-device `displayWidth` (px the image is drawn at); a device without its own value
	 * inherits the wider device's.
	 *
	 * @param mixed $raw Stored `displayWidth` value ({desktop,tablet,mobile}).
	 * @return string The sizes value, or '' when the desktop value is unset or SGS_Breakpoints is not loaded.
	 */
	function sgs_media_cover_crop_hint_sizes( $raw ): string {
		if ( ! class_exists( 'SGS_Breakpoints' ) || ! function_exists( 'sgs_responsive_normalise_object' ) ) {
			return '';
		}
		$tiers = sgs_responsive_normalise_object( $raw );
		$out   = array();
		$last  = 0;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$value = $tiers[ $tier ] ?? null;
			if ( is_numeric( $value ) && (int) $value > 0 ) {
				$last = (int) $value;
			}
			$out[ $tier ] = $last;
		}
		if ( $out['desktop'] <= 0 ) {
			return '';
		}
		return sprintf(
			'(max-width: %dpx) %dpx, (max-width: %dpx) %dpx, %dpx',
			(int) SGS_Breakpoints::MOBILE_MAX,
			$out['mobile'],
			(int) SGS_Breakpoints::TABLET_MAX,
			$out['tablet'],
			$out['desktop']
		);
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_plan' ) ) {
	/**
	 * Work out how a cover-cropped image is drawn relative to its box, and the `sizes` value that describes it.
	 *
	 * The browser picks a srcset file for the width `sizes` describes, and core's lazy-image `sizes="auto"` describes
	 * the box width only. A cover-cropped image is drawn at box width x max( 1, image ratio / box ratio ), so a file
	 * chosen by box width is too small when the crop is wider than the box and the photo looks soft.
	 *
	 * Outcomes:
	 * - `widens` false: `auto` is right (contain or any other fit, a box that follows the image, or a crop that is
	 *   not wider than the box).
	 * - `widens` true and `sizes` set: every device's drawn width is known, so `sizes` carries one concrete px value
	 *   per device (breakpoints from SGS_Breakpoints).
	 * - `widens` true and `sizes` empty: the drawn width cannot be known; the caller keeps the attachment's own
	 *   hint with `auto` removed.
	 *
	 * A `displayWidth` hint (px per device: the width the image is drawn at) is the author's measurement of the drawn
	 * width and wins in every mode. Without it, a fill box, or a height box with no px width, has no size the server
	 * can read, so the plan is `unknown` unless the image is no wider than the narrowest ratio the box could have
	 * (it is portrait, so a crop never widens it).
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return array{widens:bool,sizes:string}
	 */
	function sgs_media_cover_crop_plan( array $attributes, string $prefix, string $block_slug, int $attachment_id ): array {
		$keep_auto = array(
			'widens' => false,
			'sizes'  => '',
		);
		$unknown   = array(
			'widens' => true,
			'sizes'  => '',
		);
		if ( ! function_exists( 'sgs_media_element_stored_attr' ) || ! function_exists( 'sgs_media_atom_box_shape_resolve_sizing_mode' ) ) {
			return $keep_auto;
		}
		$fit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		if ( 'cover' !== ( $attributes[ $fit_key ] ?? 'cover' ) ) {
			return $keep_auto;
		}
		$hint = sgs_media_cover_crop_hint_sizes( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'DisplayWidth' ) ] ?? null );
		if ( '' !== $hint ) {
			return array(
				'widens' => true,
				'sizes'  => $hint,
			);
		}
		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null, $attributes, $prefix, $block_slug );
		if ( 'auto' === $mode ) {
			return $keep_auto;
		}
		$meta   = $attachment_id > 0 ? wp_get_attachment_metadata( $attachment_id ) : array();
		$width  = (int) ( is_array( $meta ) ? ( $meta['width'] ?? 0 ) : 0 );
		$height = (int) ( is_array( $meta ) ? ( $meta['height'] ?? 0 ) : 0 );
		if ( $width <= 0 || $height <= 0 ) {
			return $unknown;
		}
		$image_ratio = $width / $height;

		// Per-device px width and height; a device without its own value inherits the wider device's. A device whose
		// value is set but is not px (for example `100%`) is null: its width is unknown and stops the inheritance.
		$px      = static function ( $raw ): array {
			$out = array();
			foreach ( sgs_media_atom_box_shape_resolve_tier_object( $raw ) as $tier => $value ) {
				$out[ $tier ] = preg_match( '/^\s*(\d+(?:\.\d+)?)\s*px\s*$/i', $value, $m ) ? (float) $m[1] : null;
			}
			return $out;
		};
		$inherit = static function ( array $tiers ): array {
			$out  = array();
			$last = null;
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $tiers[ $tier ] ) ) {
					$last = $tiers[ $tier ];
				}
				$out[ $tier ] = $last;
			}
			return $out;
		};
		$widths  = $inherit( $px( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidth' ) ] ?? null ) );
		$heights = 'height' === $mode ? $inherit( $px( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'Height' ) ] ?? null ) ) : array();

		$set_ratio = 0.0;
		if ( 'ratio' === $mode ) {
			$ratio_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'AspectRatio' );
			$ratio     = sgs_media_atom_box_shape_normalise_ratio( $attributes[ $ratio_key ] ?? null );
			if ( ! preg_match( '#^([\d.]+) / ([\d.]+)$#', $ratio, $m ) || (float) $m[2] <= 0.0 ) {
				return $unknown;
			}
			$set_ratio = (float) $m[1] / (float) $m[2];
		}

		$drawn = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$box_w = $widths[ $tier ] ?? null;
			$box_h = $heights[ $tier ] ?? null;
			if ( $set_ratio > 0.0 ) {
				$box_ratio = $set_ratio;
			} elseif ( null !== $box_w && null !== $box_h && $box_h > 0.0 ) {
				$box_ratio = $box_w / $box_h;
			} else {
				// The box shape is unknowable here: only a portrait image (or a square one) is certain not to widen.
				if ( $image_ratio > 1.0 ) {
					return $unknown;
				}
				$drawn[ $tier ] = null;
				continue;
			}
			$factor = max( 1.0, $image_ratio / $box_ratio );
			if ( $factor <= 1.01 ) {
				$drawn[ $tier ] = null;
			} elseif ( null !== $box_w ) {
				$drawn[ $tier ] = (int) ceil( $box_w * $factor );
			} else {
				return $unknown;
			}
		}
		$known = array_filter( $drawn, 'is_int' );
		if ( array() === $known ) {
			return $keep_auto;
		}
		if ( count( $known ) < 3 || ! class_exists( 'SGS_Breakpoints' ) ) {
			// One sizes list cannot hold a concrete width for some devices and `auto` for others.
			return $unknown;
		}
		$sizes = sprintf(
			'(max-width: %dpx) %dpx, (max-width: %dpx) %dpx, %dpx',
			(int) SGS_Breakpoints::MOBILE_MAX,
			$drawn['mobile'],
			(int) SGS_Breakpoints::TABLET_MAX,
			$drawn['tablet'],
			$drawn['desktop']
		);
		return array(
			'widens' => true,
			'sizes'  => $sizes,
		);
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_widens' ) ) {
	/**
	 * Whether a cover-cropped image needs core's `auto` taken out of its `sizes` (see sgs_media_cover_crop_plan).
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return bool
	 */
	function sgs_media_cover_crop_widens( array $attributes, string $prefix, string $block_slug, int $attachment_id ): bool {
		return sgs_media_cover_crop_plan( $attributes, $prefix, $block_slug, $attachment_id )['widens'];
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_sizes' ) ) {
	/**
	 * The concrete `sizes` value for a cover-cropped image whose drawn width is known on every device.
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return string The sizes value, or '' to leave WordPress's own.
	 */
	function sgs_media_cover_crop_sizes( array $attributes, string $prefix, string $block_slug, int $attachment_id ): string {
		return sgs_media_cover_crop_plan( $attributes, $prefix, $block_slug, $attachment_id )['sizes'];
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
