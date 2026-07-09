<?php
/**
 * Server-side render for the SGS Media block.
 *
 * Content media block — image or video. Styling attributes (objectFit,
 * objectPosition, maxWidth, borderRadius, etc.) are applied on the frontend
 * via a scoped `<style>` block — NOTHING is emitted as an inline
 * `style="property:…"` declaration on the media element (no-inline styling
 * contract, Spec 32 / `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`).
 *
 * mediaType = 'image' (default): image render path with imageUrl / imageId.
 * mediaType = 'video': <video> (internal WP-library or direct MP4) or
 *             <iframe> (YouTube / Vimeo embed) depending on the resolved URL.
 * mediaType = 'svg': inline sanitised SVG with optional CSS animation (pure CSS,
 *             no JavaScript required). svgContent is sanitised through an explicit
 *             wp_kses() allowlist — identical to the one used by SGS_Container_Wrapper
 *             for bgSvgContent — before output. No <script>, no event handlers,
 *             no <foreignObject>, no external href/xlink:href.
 *
 * Scoping: this block declares `supports.anchor` — the internal CSS-scope
 * token is therefore a CLASS (`.sgs-media-XXXXXXXX`), never an id, so it can
 * never collide with a user-set anchor id (Spec 31 §B3). The block wrapper's
 * `id` attribute is left entirely to WP core's native anchor handling
 * (`get_block_wrapper_attributes()` applies it automatically from
 * `$attributes['anchor']` when the operator sets one — this file never
 * writes an `id` itself).
 *
 * @since 1.1.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract shared styling attributes with safe defaults.
// ---------------------------------------------------------------------------
$max_width        = isset( $attributes['maxWidth'] ) ? (string) $attributes['maxWidth'] : '';
$max_width_unit   = isset( $attributes['maxWidthUnit'] ) ? (string) $attributes['maxWidthUnit'] : 'px';
$max_width_mobile = isset( $attributes['maxWidthMobile'] ) ? (string) $attributes['maxWidthMobile'] : '';
$max_width_tablet = isset( $attributes['maxWidthTablet'] ) ? (string) $attributes['maxWidthTablet'] : '';

$max_height        = isset( $attributes['maxHeight'] ) ? (string) $attributes['maxHeight'] : '';
$max_height_unit   = isset( $attributes['maxHeightUnit'] ) ? (string) $attributes['maxHeightUnit'] : 'px';
$max_height_mobile = isset( $attributes['maxHeightMobile'] ) ? (string) $attributes['maxHeightMobile'] : '';
$max_height_tablet = isset( $attributes['maxHeightTablet'] ) ? (string) $attributes['maxHeightTablet'] : '';

// Fixed CSS height (fill) — distinct from maxHeight (a cap) and imageHeight (the
// intrinsic HTML attr). A draft `height:440px` on an image makes it FILL that
// height with object-fit cropping. Same unit-embedded + tier format as maxHeight.
$height        = isset( $attributes['height'] ) ? (string) $attributes['height'] : '';
$height_unit   = isset( $attributes['heightUnit'] ) ? (string) $attributes['heightUnit'] : 'px';
$height_mobile = isset( $attributes['heightMobile'] ) ? (string) $attributes['heightMobile'] : '';
$height_tablet = isset( $attributes['heightTablet'] ) ? (string) $attributes['heightTablet'] : '';

$aspect_ratio = isset( $attributes['aspectRatio'] ) ? (string) $attributes['aspectRatio'] : '';

$allowed_object_fits = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
$object_fit_raw      = $attributes['objectFit'] ?? 'cover';
$object_fit          = in_array( $object_fit_raw, $allowed_object_fits, true ) ? $object_fit_raw : 'cover';
$object_position     = isset( $attributes['objectPosition'] ) ? (string) $attributes['objectPosition'] : 'center center';

// Border-radius base — WP-NATIVE style.border.radius (box-object interface
// contract: no more custom flat/per-corner attrs). Tablet/Mobile are the SGS
// custom tier OBJECT attrs { topLeft, topRight, bottomLeft, bottomRight }.
// The whole border group (colour/width/style/radius) is read from
// $attributes['style']['border'] because __experimentalBorder now carries
// __experimentalSkipSerialization (block.json) — WP still POPULATES the attr,
// it just stops auto-inlining it onto the wrapper.
$native_border             = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();
$border_radius_tablet_obj  = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj  = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

$box_shadow = isset( $attributes['boxShadow'] ) ? (string) $attributes['boxShadow'] : '';
$opacity    = isset( $attributes['opacity'] ) ? floatval( $attributes['opacity'] ) : 1.0;
$opacity    = max( 0.0, min( 1.0, $opacity ) );

$allowed_alignments = array( 'left', 'center', 'right' );
$alignment_raw      = $attributes['alignment'] ?? 'left';
$alignment          = in_array( $alignment_raw, $allowed_alignments, true ) ? $alignment_raw : 'left';

$css_order        = isset( $attributes['order'] ) && null !== $attributes['order'] ? intval( $attributes['order'] ) : null;
$css_order_mobile = isset( $attributes['orderMobile'] ) && null !== $attributes['orderMobile'] ? intval( $attributes['orderMobile'] ) : null;
$css_order_tablet = isset( $attributes['orderTablet'] ) && null !== $attributes['orderTablet'] ? intval( $attributes['orderTablet'] ) : null;

$caption                = isset( $attributes['caption'] ) ? (string) $attributes['caption'] : '';
$allowed_caption_tags   = array( 'figcaption', 'div' );
$caption_tag_raw        = $attributes['captionTag'] ?? 'figcaption';
$caption_tag            = in_array( $caption_tag_raw, $allowed_caption_tags, true ) ? $caption_tag_raw : 'figcaption';
$caption_colour         = isset( $attributes['captionColour'] ) ? (string) $attributes['captionColour'] : '';
$caption_font_size      = isset( $attributes['captionFontSize'] ) && null !== $attributes['captionFontSize'] ? absint( $attributes['captionFontSize'] ) : 0;
$caption_font_size_unit = isset( $attributes['captionFontSizeUnit'] ) ? (string) $attributes['captionFontSizeUnit'] : 'px';

$link_url           = isset( $attributes['linkUrl'] ) ? (string) $attributes['linkUrl'] : '';
$link_opens_new_tab = ! empty( $attributes['linkOpensNewTab'] );
$link_rel           = isset( $attributes['linkRel'] ) ? (string) $attributes['linkRel'] : '';

// ---------------------------------------------------------------------------
// 2. Determine media type.
// Auto-detect from populated attrs when mediaType is missing (backwards-compat).
// ---------------------------------------------------------------------------
$media_type_raw = $attributes['mediaType'] ?? '';
if ( '' === $media_type_raw ) {
	// Backwards-compat: if a videoUrl is set and no imageUrl, treat as video.
	$has_video_url = ! empty( $attributes['videoUrl'] ) || ! empty( $attributes['videoId'] );
	$has_image_url = ! empty( $attributes['imageUrl'] ) || ! empty( $attributes['imageId'] );
	if ( $has_video_url && ! $has_image_url ) {
		$media_type_raw = 'video';
	} else {
		$media_type_raw = 'image';
	}
}
$media_type = in_array( $media_type_raw, array( 'image', 'video', 'svg' ), true ) ? $media_type_raw : 'image';

// ---------------------------------------------------------------------------
// 3. Helper: validate allowed CSS dimension units.
// ---------------------------------------------------------------------------
if ( ! function_exists( 'sgs_media_validate_unit' ) ) {
	/**
	 * Validate a CSS dimension unit against an allowed list.
	 *
	 * @param string $unit The raw unit string from block attributes.
	 * @return string A validated unit string, defaulting to 'px'.
	 */
	function sgs_media_validate_unit( string $unit ): string {
		$allowed = array( 'px', '%', 'em', 'rem', 'vw', 'vh', 'svw', 'svh', 'ch' );
		return in_array( $unit, $allowed, true ) ? $unit : 'px';
	}
}

if ( ! function_exists( 'sgs_media_css_length' ) ) {
	/**
	 * Normalise a dimensional value to a validated CSS length string.
	 *
	 * Accepts unit-embedded strings ("440px", "100%", "50vh"), bare numbers
	 * (back-compat — the legacy `*Unit` attr is appended, defaulting to px), and
	 * a `var(--…)` custom-property reference. Every non-var value is validated
	 * against the sgs_media_validate_unit() allowlist so no CSS injection passes.
	 *
	 * @param string $value         The raw dimension string from block attributes.
	 * @param string $unit_fallback Legacy unit to append when $value is a bare number.
	 * @return string A validated CSS length, or '' when the value is empty/invalid.
	 */
	function sgs_media_css_length( string $value, string $unit_fallback = 'px' ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		// Bare number → append the matching legacy unit (validated).
		if ( is_numeric( $value ) ) {
			return $value . sgs_media_validate_unit( $unit_fallback );
		}
		// var(--token) or var(--token, fallback) — no braces/semicolons allowed.
		if ( preg_match( '/^var\(\s*--[a-zA-Z0-9-]+(?:\s*,\s*[^;{}()]+)?\)$/', $value ) ) {
			return $value;
		}
		// Unit-embedded length: numeric prefix + an allowed unit.
		if ( preg_match( '/^(-?\d*\.?\d+)([a-z%]+)$/i', $value, $mm ) ) {
			$allowed = array( 'px', '%', 'em', 'rem', 'vw', 'vh', 'svw', 'svh', 'ch' );
			$unit    = strtolower( $mm[2] );
			if ( in_array( $unit, $allowed, true ) ) {
				return $mm[1] . $unit;
			}
		}
		return '';
	}
}

// ---------------------------------------------------------------------------
// 4. Anchor / internal scope token.
//
// `id` is left ENTIRELY to WP core's native anchor handling (only present in
// $wrapper_attributes when the operator sets one via supports.anchor). The
// scope token used to build every scoped CSS selector below is a CLASS —
// deterministic from the attribute fingerprint so it survives fragment-cached
// re-renders (same attrs → same class on every request) without ever
// colliding with the anchor id (Spec 31 §B3).
// ---------------------------------------------------------------------------
$scope_class = 'sgs-media-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$scope_esc   = esc_attr( $scope_class );

// Targets the inner media element (img or video). The FIRST selector matches
// the NAKED <img> (D6 — where the scope class and element are the SAME node);
// the descendant forms match figure-mode img/video.
$id_sel  = '.' . $scope_esc . '.sgs-media__img, .' . $scope_esc . ' .sgs-media__img, .' . $scope_esc . ' .sgs-media__video';
// Targets the element carrying the scope class itself — the <figure> wrapper
// in figure-mode, or the <img> itself in naked-mode (same class either way).
$id_wrap = '.' . $scope_esc;

// ---------------------------------------------------------------------------
// 5. Build scoped CSS — base (non-responsive) declarations for the media
// element: object-fit, object-position, aspect-ratio, opacity, box-shadow,
// and the native border group (colour/width/style/radius). NONE of these are
// emitted inline any more (no-inline contract §A).
// ---------------------------------------------------------------------------
$media_base_decls = array();

// object-fit — only emit when explicitly set to a NON-default value (D7). The
// default `cover` is provided as an OVERRIDABLE :where() fallback in
// style.css, so an unset value no longer force-crops and can be overridden.
if ( 'cover' !== $object_fit ) {
	$media_base_decls[] = 'object-fit:' . esc_attr( $object_fit );
}

// object-position — only emit when explicitly set to a non-default value (D7).
// Allow alphanumeric, %, spaces, commas, dashes (valid CSS).
if ( '' !== $object_position && 'center center' !== $object_position
	&& preg_match( '/^[a-zA-Z0-9%\s.,\-]+$/', $object_position ) ) {
	$media_base_decls[] = 'object-position:' . esc_attr( $object_position );
}

// aspect-ratio: allow digits, slash, spaces.
if ( '' !== $aspect_ratio && preg_match( '/^[\d\s\/]+$/', $aspect_ratio ) ) {
	$media_base_decls[] = 'aspect-ratio:' . esc_attr( $aspect_ratio );
}

// opacity.
if ( 1.0 !== $opacity ) {
	$media_base_decls[] = 'opacity:' . esc_attr( $opacity );
}

// box-shadow — delegate to sgs_shadow_value() so raw CSS values pass through correctly.
if ( '' !== $box_shadow ) {
	$shadow_css = sgs_shadow_value( $box_shadow );
	if ( '' !== $shadow_css ) {
		$media_base_decls[] = 'box-shadow:' . $shadow_css;
	}
}

$media_base_css = '';
if ( $media_base_decls ) {
	$media_base_css = $id_sel . '{' . implode( ';', $media_base_decls ) . '}';
}

// Native border group (colour/width/style/radius) — base only, via the
// stable core style-engine API (matches sgs/button + sgs/container's proven
// pattern: WP core's own sanitisation, never hand-rolled). Applies to the
// media element (img/video) — mirrors this block's pre-existing behaviour of
// painting border/radius on the media element itself, not the figure.
$border_base_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $native_border ) ) {
	$border_base_out = wp_style_engine_get_styles(
		array( 'border' => $native_border ),
		array( 'selector' => $id_sel )
	);
	if ( ! empty( $border_base_out['css'] ) ) {
		$border_base_css = $border_base_out['css'];
	}
}

// ---------------------------------------------------------------------------
// 6. Wrapper/scope-level base declarations (alignment margin).
// ---------------------------------------------------------------------------
$wrap_base_decls = array();
if ( 'center' === $alignment ) {
	$wrap_base_decls[] = 'margin-left:auto;margin-right:auto';
} elseif ( 'right' === $alignment ) {
	$wrap_base_decls[] = 'margin-left:auto';
}
$wrap_base_css = '';
if ( $wrap_base_decls ) {
	$wrap_base_css = $id_wrap . '{' . implode( ';', $wrap_base_decls ) . '}';
}

// ---------------------------------------------------------------------------
// 7. Per-viewport responsive CSS (emitted as a scoped <style> tag).
// Breakpoints use the framework 767/1023 standard (D3): mobile
// @media(max-width:767px), tablet @media(max-width:1023px).
// ---------------------------------------------------------------------------

// max-width / max-height / height — base + tablet + mobile on the SAME
// selector (Pattern A). Values are validated through sgs_media_css_length().
$base_rules = array();
$mw_base    = sgs_media_css_length( $max_width, $max_width_unit );
$mh_base    = sgs_media_css_length( $max_height, $max_height_unit );
$h_base     = sgs_media_css_length( $height, $height_unit );
if ( '' !== $mw_base ) {
	$base_rules[] = 'max-width:' . $mw_base;
}
if ( '' !== $mh_base ) {
	$base_rules[] = 'max-height:' . $mh_base;
}
if ( '' !== $h_base ) {
	$base_rules[] = 'height:' . $h_base;
}

$tablet_rules = array();
$mw_tablet    = sgs_media_css_length( $max_width_tablet, $max_width_unit );
$mh_tablet    = sgs_media_css_length( $max_height_tablet, $max_height_unit );
$h_tablet     = sgs_media_css_length( $height_tablet, $height_unit );
if ( '' !== $mw_tablet ) {
	$tablet_rules[] = 'max-width:' . $mw_tablet;
}
if ( '' !== $mh_tablet ) {
	$tablet_rules[] = 'max-height:' . $mh_tablet;
}
if ( '' !== $h_tablet ) {
	$tablet_rules[] = 'height:' . $h_tablet;
}

$mobile_rules = array();
$mw_mobile    = sgs_media_css_length( $max_width_mobile, $max_width_unit );
$mh_mobile    = sgs_media_css_length( $max_height_mobile, $max_height_unit );
$h_mobile     = sgs_media_css_length( $height_mobile, $height_unit );
if ( '' !== $mw_mobile ) {
	$mobile_rules[] = 'max-width:' . $mw_mobile;
}
if ( '' !== $mh_mobile ) {
	$mobile_rules[] = 'max-height:' . $mh_mobile;
}
if ( '' !== $h_mobile ) {
	$mobile_rules[] = 'height:' . $h_mobile;
}

$responsive_css  = $media_base_css . $border_base_css . $wrap_base_css;
if ( $base_rules ) {
	$responsive_css .= $id_sel . '{' . implode( ';', $base_rules ) . '}';
}
if ( $tablet_rules ) {
	$responsive_css .= '@media(max-width:1023px){' . $id_sel . '{' . implode( ';', $tablet_rules ) . '}}';
}
if ( $mobile_rules ) {
	$responsive_css .= '@media(max-width:767px){' . $id_sel . '{' . implode( ';', $mobile_rules ) . '}}';
}

// Border-radius tiers — SGS custom tier OBJECT attrs (borderRadiusTablet /
// borderRadiusMobile), routed through the same stable core style-engine API
// as the base rule above (box-object interface contract §B).
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	if ( ! empty( $border_radius_tablet_obj ) ) {
		$radius_tab_out = wp_style_engine_get_styles(
			array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
			array( 'selector' => $id_sel )
		);
		if ( ! empty( $radius_tab_out['css'] ) ) {
			$responsive_css .= '@media(max-width:1023px){' . $radius_tab_out['css'] . '}';
		}
	}
	if ( ! empty( $border_radius_mobile_obj ) ) {
		$radius_mob_out = wp_style_engine_get_styles(
			array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
			array( 'selector' => $id_sel )
		);
		if ( ! empty( $radius_mob_out['css'] ) ) {
			$responsive_css .= '@media(max-width:767px){' . $radius_mob_out['css'] . '}';
		}
	}
}

// order — base + tablet + mobile on the SAME wrapper/scope selector (Pattern A).
if ( null !== $css_order ) {
	$responsive_css .= $id_wrap . '{order:' . intval( $css_order ) . ';}';
}
if ( null !== $css_order_tablet ) {
	$responsive_css .= '@media(max-width:1023px){' . $id_wrap . '{order:' . intval( $css_order_tablet ) . ';}}';
}
if ( null !== $css_order_mobile ) {
	$responsive_css .= '@media(max-width:767px){' . $id_wrap . '{order:' . intval( $css_order_mobile ) . ';}}';
}

// ---------------------------------------------------------------------------
// 8. Caption colour/font-size — scoped CSS, base only (no tiers), targeting
// the caption element nested inside the scoped wrapper.
// ---------------------------------------------------------------------------
$caption_decls = array();
if ( '' !== $caption_colour ) {
	$caption_decls[] = 'color:' . sgs_colour_value( $caption_colour );
}
if ( $caption_font_size > 0 ) {
	$caption_decls[] = 'font-size:' . $caption_font_size . sgs_media_validate_unit( $caption_font_size_unit );
}
if ( $caption_decls ) {
	$responsive_css .= $id_wrap . ' .sgs-media__caption{' . implode( ';', $caption_decls ) . '}';
}

// ---------------------------------------------------------------------------
// 9. Build caption element (no inline style attr — see step 8 above).
// ---------------------------------------------------------------------------
$caption_html = '';
if ( '' !== $caption ) {
	$caption_tag_escaped = tag_escape( $caption_tag );
	$caption_html        = sprintf(
		'<%1$s class="sgs-media__caption">%2$s</%1$s>',
		$caption_tag_escaped,
		wp_kses_post( $caption )
	);
}

// ---------------------------------------------------------------------------
// 10. Build link wrapper parts (image mode only; video has own controls).
// ---------------------------------------------------------------------------
$link_open  = '';
$link_close = '';
if ( 'image' === $media_type && '' !== $link_url ) {
	$link_rel_attr = '';
	if ( $link_opens_new_tab ) {
		$rel_values    = array_filter(
			array_merge(
				array( 'noopener' ),
				$link_rel ? array( sanitize_text_field( $link_rel ) ) : array()
			)
		);
		$link_rel_attr = ' rel="' . esc_attr( implode( ' ', array_unique( $rel_values ) ) ) . '"';
	} elseif ( '' !== $link_rel ) {
		$link_rel_attr = ' rel="' . esc_attr( sanitize_text_field( $link_rel ) ) . '"';
	}

	$new_tab_attrs = $link_opens_new_tab ? ' target="_blank"' : '';
	$link_open     = '<a href="' . esc_url( $link_url ) . '"' . $new_tab_attrs . $link_rel_attr . ' class="sgs-media__link">';
	$link_close    = '</a>';
}

// ---------------------------------------------------------------------------
// 11. IMAGE RENDER PATH.
// ---------------------------------------------------------------------------
$image_html = '';
if ( 'image' === $media_type ) {
	$image_id     = isset( $attributes['imageId'] ) ? absint( $attributes['imageId'] ) : null;
	$image_url    = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';
	$image_alt    = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
	$image_width  = isset( $attributes['imageWidth'] ) ? absint( $attributes['imageWidth'] ) : 0;
	$image_height = isset( $attributes['imageHeight'] ) ? absint( $attributes['imageHeight'] ) : 0;

	// Resolve final image URL: imageId wins; fall back to imageUrl.
	$resolved_url = '';
	$resolved_id  = 0;

	if ( $image_id ) {
		$src_result = wp_get_attachment_image_src( $image_id, 'full' );
		if ( $src_result ) {
			$resolved_url = $src_result[0];
			$resolved_id  = $image_id;
			if ( ! $image_width && isset( $src_result[1] ) ) {
				$image_width = absint( $src_result[1] );
			}
			if ( ! $image_height && isset( $src_result[2] ) ) {
				$image_height = absint( $src_result[2] );
			}
		}
	}

	if ( '' === $resolved_url && '' !== $image_url ) {
		$resolved_url = $image_url;
	}

	if ( '' === $resolved_url ) {
		echo '<!-- sgs/media: no image set -->';
		return;
	}

	// Build srcset / sizes from the media library when imageId is available.
	$img_srcset = '';
	$img_sizes  = '';
	if ( $resolved_id ) {
		$srcset_value = wp_get_attachment_image_srcset( $resolved_id, 'full' );
		$sizes_value  = wp_get_attachment_image_sizes( $resolved_id, 'full' );
		if ( $srcset_value ) {
			$img_srcset = ' srcset="' . esc_attr( $srcset_value ) . '"';
		}
		if ( $sizes_value ) {
			$img_sizes = ' sizes="' . esc_attr( $sizes_value ) . '"';
		}
	}

	$img_width_part  = $image_width ? ' width="' . esc_attr( $image_width ) . '"' : '';
	$img_height_part = $image_height ? ' height="' . esc_attr( $image_height ) . '"' : '';

	$image_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s class="sgs-media__img" loading="lazy" decoding="async" />',
		esc_url( $resolved_url ),
		esc_attr( $image_alt ),
		$img_width_part,
		$img_height_part,
		$img_srcset,
		$img_sizes
	);
}

// ---------------------------------------------------------------------------
// 12. VIDEO RENDER PATH.
// ---------------------------------------------------------------------------
$video_html = '';
if ( 'video' === $media_type ) {
	$video_url       = isset( $attributes['videoUrl'] ) ? (string) $attributes['videoUrl'] : '';
	$video_source    = isset( $attributes['videoSource'] ) ? (string) $attributes['videoSource'] : 'external';
	$video_id        = isset( $attributes['videoId'] ) ? absint( $attributes['videoId'] ) : 0;
	$video_mime      = isset( $attributes['videoMimeType'] ) ? (string) $attributes['videoMimeType'] : '';
	$video_poster    = isset( $attributes['videoPoster'] ) ? (string) $attributes['videoPoster'] : '';
	$video_poster_id = isset( $attributes['videoPosterId'] ) ? absint( $attributes['videoPosterId'] ) : 0;
	$video_autoplay  = ! empty( $attributes['videoAutoplay'] );
	$video_loop      = ! empty( $attributes['videoLoop'] );
	$video_muted     = isset( $attributes['videoMuted'] ) ? (bool) $attributes['videoMuted'] : true;
	$video_controls  = isset( $attributes['videoControls'] ) ? (bool) $attributes['videoControls'] : true;
	$video_inline    = isset( $attributes['videoPlaysInline'] ) ? (bool) $attributes['videoPlaysInline'] : true;
	$video_lazy      = isset( $attributes['videoLazyLoad'] ) ? (bool) $attributes['videoLazyLoad'] : true;

	// Resolve poster image URL: videoPosterId wins; fall back to videoPoster.
	$poster_url = '';
	if ( $video_poster_id ) {
		$poster_src = wp_get_attachment_image_url( $video_poster_id, 'full' );
		if ( $poster_src ) {
			$poster_url = $poster_src;
		}
	}
	if ( '' === $poster_url && '' !== $video_poster ) {
		$poster_url = $video_poster;
	}

	// Resolve internal video source from WP media library.
	$resolved_video_url  = $video_url;
	$resolved_video_mime = $video_mime;
	if ( 'internal' === $video_source && $video_id ) {
		$attachment_url = wp_get_attachment_url( $video_id );
		if ( $attachment_url ) {
			$resolved_video_url = $attachment_url;
		}
		$attachment_mime = get_post_mime_type( $video_id );
		if ( $attachment_mime && str_starts_with( $attachment_mime, 'video/' ) ) {
			$resolved_video_mime = $attachment_mime;
		}
	}

	if ( '' === $resolved_video_url ) {
		echo '<!-- sgs/media: no video set -->';
		return;
	}

	// Detect embed source: YouTube, Vimeo, or direct video file.
	$is_youtube = (bool) preg_match( '/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{11})/', $resolved_video_url, $yt_matches );
	$is_vimeo   = (bool) preg_match( '/(?:vimeo\.com\/)(\d+)/', $resolved_video_url, $vm_matches );

	if ( $is_youtube ) {
		// Convert any YouTube watch URL to embed URL.
		$video_id_yt = $yt_matches[1];
		$embed_url   = 'https://www.youtube-nocookie.com/embed/' . $video_id_yt;
		$embed_query = array();
		if ( $video_autoplay ) {
			$embed_query['autoplay'] = '1';
		}
		if ( $video_loop ) {
			$embed_query['loop']     = '1';
			$embed_query['playlist'] = $video_id_yt;
		}
		if ( ! $video_controls ) {
			$embed_query['controls'] = '0';
		}
		if ( $video_muted ) {
			$embed_query['mute'] = '1';
		}
		if ( $embed_query ) {
			$embed_url .= '?' . http_build_query( $embed_query );
		}
		$poster_attr  = '' !== $poster_url ? ' data-poster="' . esc_url( $poster_url ) . '"' : '';
		$loading_attr = $video_lazy ? ' loading="lazy"' : '';
		$video_html   = sprintf(
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen%s%s></iframe>',
			esc_url( $embed_url ),
			$poster_attr,
			$loading_attr
		);

	} elseif ( $is_vimeo ) {
		// Convert Vimeo watch URL to embed URL.
		$video_id_vm = $vm_matches[1];
		$embed_url   = 'https://player.vimeo.com/video/' . $video_id_vm;
		$embed_query = array();
		if ( $video_autoplay ) {
			$embed_query['autoplay'] = '1';
		}
		if ( $video_loop ) {
			$embed_query['loop'] = '1';
		}
		if ( ! $video_controls ) {
			$embed_query['controls'] = '0';
		}
		if ( $video_muted ) {
			$embed_query['muted'] = '1';
		}
		if ( $embed_query ) {
			$embed_url .= '?' . http_build_query( $embed_query );
		}
		$poster_attr  = '' !== $poster_url ? ' data-poster="' . esc_url( $poster_url ) . '"' : '';
		$loading_attr = $video_lazy ? ' loading="lazy"' : '';
		$video_html   = sprintf(
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen%s%s></iframe>',
			esc_url( $embed_url ),
			$poster_attr,
			$loading_attr
		);

	} else {
		// Direct video file (MP4, WebM, etc.) or internal WP media library video.
		// Auto-detect MIME type from URL extension when not already set.
		if ( '' === $resolved_video_mime ) {
			$ext                 = strtolower( pathinfo( wp_parse_url( $resolved_video_url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
			$resolved_video_mime = match ( $ext ) {
				'mp4'  => 'video/mp4',
				'webm' => 'video/webm',
				'ogg'  => 'video/ogg',
				'ogv'  => 'video/ogg',
				'mov'  => 'video/quicktime',
				default => 'video/mp4',
			};
		}

		$autoplay_attr = $video_autoplay ? ' autoplay' : '';
		$loop_attr     = $video_loop ? ' loop' : '';
		$muted_attr    = $video_muted ? ' muted' : '';
		$controls_attr = $video_controls ? ' controls' : '';
		$inline_attr   = $video_inline ? ' playsinline' : '';
		$preload_attr  = $video_lazy ? ' preload="none"' : ' preload="metadata"';
		$poster_attr   = '' !== $poster_url ? ' poster="' . esc_url( $poster_url ) . '"' : '';

		$video_html = sprintf(
			'<video class="sgs-media__video"%s%s%s%s%s%s%s%s>' .
			'<source src="%s" type="%s">' .
			'</video>',
			$autoplay_attr,
			$loop_attr,
			$muted_attr,
			$controls_attr,
			$inline_attr,
			$preload_attr,
			$poster_attr,
			' aria-label="' . esc_attr( '' !== $caption ? $caption : __( 'Video', 'sgs-blocks' ) ) . '"',
			esc_url( $resolved_video_url ),
			esc_attr( $resolved_video_mime )
		);
	}
}

// ---------------------------------------------------------------------------
// 12b. SVG RENDER PATH.
// ---------------------------------------------------------------------------
$svg_html = '';
if ( 'svg' === $media_type ) {
	$svg_content_raw = isset( $attributes['svgContent'] ) ? (string) $attributes['svgContent'] : '';

	$allowed_svg_animations = array( 'none', 'pulse', 'float', 'wave' );
	$svg_animation_raw      = $attributes['svgAnimation'] ?? 'none';
	$svg_animation          = in_array( $svg_animation_raw, $allowed_svg_animations, true ) ? $svg_animation_raw : 'none';

	$allowed_svg_speeds = array( 'slow', 'medium', 'fast' );
	$svg_speed_raw      = $attributes['svgAnimationSpeed'] ?? 'medium';
	$svg_speed          = in_array( $svg_speed_raw, $allowed_svg_speeds, true ) ? $svg_speed_raw : 'medium';

	if ( '' === $svg_content_raw ) {
		echo '<!-- sgs/media: no SVG content set -->';
		return;
	}

	// Sanitise SVG through an explicit wp_kses() allowlist.
	// Mirrors the identical allowlist used by SGS_Container_Wrapper for bgSvgContent.
	// Strips: <script>, <foreignObject>, event-handler attributes (on*), external
	// href/xlink:href. Only the shapes/structure tags below pass through.
	$allowed_svg_tags = array(
		'svg'      => array(
			'xmlns'               => true,
			'viewbox'             => true,
			'width'               => true,
			'height'              => true,
			'preserveaspectratio' => true,
			'class'               => true,
			'id'                  => true,
		),
		'g'        => array(
			'transform' => true,
			'class'     => true,
			'id'        => true,
		),
		'path'     => array(
			'd'            => true,
			'fill'         => true,
			'stroke'       => true,
			'stroke-width' => true,
			'class'        => true,
		),
		'circle'   => array(
			'cx'     => true,
			'cy'     => true,
			'r'      => true,
			'fill'   => true,
			'stroke' => true,
			'class'  => true,
		),
		'rect'     => array(
			'x'      => true,
			'y'      => true,
			'width'  => true,
			'height' => true,
			'fill'   => true,
			'stroke' => true,
			'class'  => true,
		),
		'polygon'  => array(
			'points' => true,
			'fill'   => true,
			'stroke' => true,
			'class'  => true,
		),
		'polyline' => array(
			'points' => true,
			'fill'   => true,
			'stroke' => true,
			'class'  => true,
		),
		'line'     => array(
			'x1'     => true,
			'y1'     => true,
			'x2'     => true,
			'y2'     => true,
			'stroke' => true,
			'class'  => true,
		),
		'ellipse'  => array(
			'cx'     => true,
			'cy'     => true,
			'rx'     => true,
			'ry'     => true,
			'fill'   => true,
			'stroke' => true,
			'class'  => true,
		),
		'text'     => array(
			'x'           => true,
			'y'           => true,
			'fill'        => true,
			'font-size'   => true,
			'font-family' => true,
			'class'       => true,
		),
		'defs'     => array(),
		'style'    => array( 'type' => true ),
		'animate'  => array(
			'attributename' => true,
			'from'          => true,
			'to'            => true,
			'dur'           => true,
			'repeatcount'   => true,
		),
	);

	$sanitised_svg = wp_kses( $svg_content_raw, $allowed_svg_tags );

	// Build animation class string.
	$svg_classes = array( 'sgs-media__svg' );
	if ( 'none' !== $svg_animation ) {
		$svg_classes[] = 'sgs-media__svg--' . esc_attr( $svg_animation );
		$svg_classes[] = 'sgs-media__svg--speed-' . esc_attr( $svg_speed );
	}

	$svg_html = sprintf(
		'<div class="%s" aria-hidden="true">%s</div>',
		esc_attr( implode( ' ', $svg_classes ) ),
		$sanitised_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- processed through wp_kses() with explicit SVG allowlist above; no <script>/event-handlers/external-href pass through.
	);
}

// ---------------------------------------------------------------------------
// 13. Assemble wrapper attributes via get_block_wrapper_attributes().
// No 'id' is passed — WP core applies it automatically from the anchor
// support when the operator sets one. No 'style' is passed — nothing is
// inline (no-inline contract §A). The scope class is always present.
// ---------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-media', 'sgs-media--align-' . esc_attr( $alignment ), $scope_class );
if ( 'svg' === $media_type ) {
	$wrapper_classes[] = 'sgs-media--svg';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $wrapper_classes ),
	)
);

// ---------------------------------------------------------------------------
// 14. Naked-mode for image: emit bare <img> with merged classes when no
// caption and no link wrapper are present. Matches canonical mockup pattern
// `.sgs-foo__image` so per-class CSS rules cascade to the right element.
// Naked-mode is image-only; video always emits a <figure> wrapper.
// ---------------------------------------------------------------------------
$naked_mode = ( 'image' === $media_type ) && ( '' === $caption ) && empty( $link_open );
// SVG mode always uses the <figure> wrapper (needed for consistent sizing + caption support).

if ( $naked_mode && '' !== $image_html ) {
	// Parse class= and id= from wrapper_attributes string; merge with sgs-media__img.
	// The scope class is already present in $cm[1] (built into $wrapper_classes
	// above), so alignment/order/border/etc scoped rules ($id_wrap / $id_sel)
	// apply to this naked <img> exactly as they do to the <figure> in figure-mode.
	preg_match( '/class="([^"]*)"/', $wrapper_attributes, $cm );
	preg_match( '/id="([^"]*)"/', $wrapper_attributes, $im );
	$merged_classes = trim( ( $cm[1] ?? '' ) . ' sgs-media__img' );
	$id_attr        = ! empty( $im[1] ) ? ' id="' . esc_attr( $im[1] ) . '"' : '';

	$image_id_attr     = isset( $attributes['imageId'] ) ? absint( $attributes['imageId'] ) : null;
	$image_width_attr  = isset( $attributes['imageWidth'] ) ? absint( $attributes['imageWidth'] ) : 0;
	$image_height_attr = isset( $attributes['imageHeight'] ) ? absint( $attributes['imageHeight'] ) : 0;
	$image_alt_attr    = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';

	// Rebuild the resolved URL (already computed above; carry forward).
	$naked_resolved_url = '';
	if ( $image_id_attr ) {
		$naked_src = wp_get_attachment_image_src( $image_id_attr, 'full' );
		if ( $naked_src ) {
			$naked_resolved_url = $naked_src[0];
			if ( ! $image_width_attr && isset( $naked_src[1] ) ) {
				$image_width_attr = absint( $naked_src[1] );
			}
			if ( ! $image_height_attr && isset( $naked_src[2] ) ) {
				$image_height_attr = absint( $naked_src[2] );
			}
		}
	}
	if ( '' === $naked_resolved_url ) {
		$naked_resolved_url = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';
	}

	$naked_srcset = '';
	$naked_sizes  = '';
	if ( $image_id_attr ) {
		$naked_srcset_value = wp_get_attachment_image_srcset( $image_id_attr, 'full' );
		$naked_sizes_value  = wp_get_attachment_image_sizes( $image_id_attr, 'full' );
		if ( $naked_srcset_value ) {
			$naked_srcset = ' srcset="' . esc_attr( $naked_srcset_value ) . '"';
		}
		if ( $naked_sizes_value ) {
			$naked_sizes = ' sizes="' . esc_attr( $naked_sizes_value ) . '"';
		}
	}

	$naked_width_part  = $image_width_attr ? ' width="' . esc_attr( $image_width_attr ) . '"' : '';
	$naked_height_part = $image_height_attr ? ' height="' . esc_attr( $image_height_attr ) . '"' : '';

	$image_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s class="%s" loading="lazy" decoding="async" />',
		esc_url( $naked_resolved_url ),
		esc_attr( $image_alt_attr ),
		$naked_width_part,
		$naked_height_part,
		$naked_srcset,
		$naked_sizes,
		$id_attr,
		esc_attr( $merged_classes )
	);
}

// ---------------------------------------------------------------------------
// 15. Emit the scoped responsive <style> block (before the main element).
// wp_strip_all_tags (not esc_html) matches the proven SGS_Container_Wrapper /
// sgs/button pattern: it blocks a </style> breakout while leaving CSS
// combinators like `>` intact.
// ---------------------------------------------------------------------------
if ( $responsive_css ) {
	printf(
		'<style id="%s-css">%s</style>',
		esc_attr( $scope_class ),
		wp_strip_all_tags( $responsive_css ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_attr()/sanitiser-validated components + the trusted wp_style_engine_get_styles() core API throughout; wp_strip_all_tags guards </style> breakout.
	);
}

// ---------------------------------------------------------------------------
// 16. Final output.
// ---------------------------------------------------------------------------
if ( 'image' === $media_type ) {
	if ( $naked_mode ) {
		// Naked img — no <figure> wrapper.
		echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
	} else {
		printf(
			'<figure %s>%s%s%s%s</figure>',
			$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
			$link_open,          // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
			$image_html,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
			$link_close,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- always '' or '</a>'.
			$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
		);
	}
} elseif ( 'svg' === $media_type ) {
	// SVG — always wrapped in <figure> for consistent sizing and caption support.
	printf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$svg_html,           // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG content processed through wp_kses() with explicit allowlist; wrapper attrs from esc_attr().
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
} else {
	// Video always emits a <figure> wrapper (needed for caption + accessible labelling).
	printf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$video_html,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
}
