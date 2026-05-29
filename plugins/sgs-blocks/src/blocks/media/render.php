<?php
/**
 * Server-side render for the SGS Media block.
 *
 * Content media block — image or video. Replaces core/image in the SGS
 * clone-pipeline converter output so styling attributes (objectFit,
 * objectPosition, maxWidth, borderRadius, etc.) are applied on the frontend
 * via server-side render rather than the frozen static save.js HTML that
 * core/image produces.
 *
 * mediaType = 'image' (default): image render path with imageUrl / imageId.
 * mediaType = 'video': <video> (internal WP-library or direct MP4) or
 *             <iframe> (YouTube / Vimeo embed) depending on the resolved URL.
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

$aspect_ratio = isset( $attributes['aspectRatio'] ) ? (string) $attributes['aspectRatio'] : '';

$allowed_object_fits = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
$object_fit_raw      = $attributes['objectFit'] ?? 'cover';
$object_fit          = in_array( $object_fit_raw, $allowed_object_fits, true ) ? $object_fit_raw : 'cover';
$object_position     = isset( $attributes['objectPosition'] ) ? (string) $attributes['objectPosition'] : 'center center';

$border_radius      = isset( $attributes['borderRadius'] ) ? (string) $attributes['borderRadius'] : '';
$border_radius_unit = isset( $attributes['borderRadiusUnit'] ) ? (string) $attributes['borderRadiusUnit'] : 'px';
$border_radius_tl   = isset( $attributes['borderRadiusTL'] ) ? (string) $attributes['borderRadiusTL'] : '';
$border_radius_tr   = isset( $attributes['borderRadiusTR'] ) ? (string) $attributes['borderRadiusTR'] : '';
$border_radius_bl   = isset( $attributes['borderRadiusBL'] ) ? (string) $attributes['borderRadiusBL'] : '';
$border_radius_br   = isset( $attributes['borderRadiusBR'] ) ? (string) $attributes['borderRadiusBR'] : '';

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
$media_type = in_array( $media_type_raw, array( 'image', 'video' ), true ) ? $media_type_raw : 'image';

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

// ---------------------------------------------------------------------------
// 4. Build shared media element inline styles (applies to both <img> and <video>/<iframe>).
// ---------------------------------------------------------------------------
$media_styles = array();

// object-fit.
$media_styles[] = 'object-fit:' . esc_attr( $object_fit );

// object-position: allow alphanumeric, %, spaces, commas, dashes (valid CSS).
if ( '' !== $object_position && preg_match( '/^[a-zA-Z0-9%\s.,\-]+$/', $object_position ) ) {
	$media_styles[] = 'object-position:' . esc_attr( $object_position );
}

// aspect-ratio: allow digits, slash, spaces.
if ( '' !== $aspect_ratio && preg_match( '/^[\d\s\/]+$/', $aspect_ratio ) ) {
	$media_styles[] = 'aspect-ratio:' . esc_attr( $aspect_ratio );
}

// max-width (desktop).
if ( '' !== $max_width && is_numeric( $max_width ) ) {
	$media_styles[] = 'max-width:' . absint( $max_width ) . sgs_media_validate_unit( $max_width_unit );
}

// max-height (desktop).
if ( '' !== $max_height && is_numeric( $max_height ) ) {
	$media_styles[] = 'max-height:' . absint( $max_height ) . sgs_media_validate_unit( $max_height_unit );
}

// opacity.
if ( 1.0 !== $opacity ) {
	$media_styles[] = 'opacity:' . esc_attr( $opacity );
}

// border-radius — per-corner when any corner is set; else bare radius.
$has_corners = ( '' !== $border_radius_tl || '' !== $border_radius_tr ||
				'' !== $border_radius_bl || '' !== $border_radius_br );

if ( $has_corners ) {
	$br_unit = sgs_media_validate_unit( $border_radius_unit );
	$br_tl   = is_numeric( $border_radius_tl ) ? absint( $border_radius_tl ) . $br_unit : '0';
	$br_tr   = is_numeric( $border_radius_tr ) ? absint( $border_radius_tr ) . $br_unit : '0';
	$br_br   = is_numeric( $border_radius_br ) ? absint( $border_radius_br ) . $br_unit : '0';
	$br_bl   = is_numeric( $border_radius_bl ) ? absint( $border_radius_bl ) . $br_unit : '0';
	// CSS shorthand order: top-left / top-right / bottom-right / bottom-left.
	$media_styles[] = 'border-radius:' . $br_tl . ' ' . $br_tr . ' ' . $br_br . ' ' . $br_bl;
} elseif ( '' !== $border_radius && is_numeric( $border_radius ) ) {
	$media_styles[] = 'border-radius:' . absint( $border_radius ) . sgs_media_validate_unit( $border_radius_unit );
}

// box-shadow — delegate to sgs_shadow_value() so raw CSS values pass through correctly.
if ( '' !== $box_shadow ) {
	$shadow_css = sgs_shadow_value( $box_shadow );
	if ( '' !== $shadow_css ) {
		$media_styles[] = 'box-shadow:' . $shadow_css;
	}
}

$media_style_attr = implode( ';', $media_styles );

// ---------------------------------------------------------------------------
// 5. Build the <figure> wrapper inline styles and classes.
// ---------------------------------------------------------------------------
$wrapper_styles  = array();
$wrapper_classes = array( 'sgs-media', 'sgs-media--align-' . esc_attr( $alignment ) );

// CSS order for flex/grid placement.
if ( null !== $css_order ) {
	$wrapper_styles[] = 'order:' . intval( $css_order );
}

// Display rule for alignment (figures are block-level by default).
if ( 'center' === $alignment ) {
	$wrapper_styles[] = 'margin-left:auto;margin-right:auto';
} elseif ( 'right' === $alignment ) {
	$wrapper_styles[] = 'margin-left:auto';
}

// ---------------------------------------------------------------------------
// 6. Anchor / unique-ID for scoped responsive CSS.
// ---------------------------------------------------------------------------
$block_anchor = $block->parsed_block['attrs']['anchor'] ?? '';
if ( ! $block_anchor ) {
	// Deterministic ID based on attribute fingerprint so it survives re-render.
	$block_anchor = 'sgs-media-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
}

// ---------------------------------------------------------------------------
// 7. Per-viewport responsive CSS (emitted as a scoped <style> tag).
// ---------------------------------------------------------------------------
$responsive_css = '';

$needs_responsive = (
	( '' !== $max_width_tablet && is_numeric( $max_width_tablet ) ) ||
	( '' !== $max_width_mobile && is_numeric( $max_width_mobile ) ) ||
	( '' !== $max_height_tablet && is_numeric( $max_height_tablet ) ) ||
	( '' !== $max_height_mobile && is_numeric( $max_height_mobile ) ) ||
	null !== $css_order_tablet ||
	null !== $css_order_mobile
);

if ( $needs_responsive ) {
	$mw_unit = sgs_media_validate_unit( $max_width_unit );
	$mh_unit = sgs_media_validate_unit( $max_height_unit );
	// Target the inner media element (img or video) for dimension constraints.
	$id_sel  = '#' . esc_attr( $block_anchor ) . ' .sgs-media__img, #' . esc_attr( $block_anchor ) . ' .sgs-media__video';
	$id_wrap = '#' . esc_attr( $block_anchor );

	// Tablet (≤1023px).
	$tablet_rules = array();
	if ( '' !== $max_width_tablet && is_numeric( $max_width_tablet ) ) {
		$tablet_rules[] = 'max-width:' . absint( $max_width_tablet ) . $mw_unit;
	}
	if ( '' !== $max_height_tablet && is_numeric( $max_height_tablet ) ) {
		$tablet_rules[] = 'max-height:' . absint( $max_height_tablet ) . $mh_unit;
	}
	if ( $tablet_rules ) {
		$responsive_css .= '@media(max-width:1023px){' . $id_sel . '{' . implode( ';', $tablet_rules ) . '}}';
	}
	if ( null !== $css_order_tablet ) {
		$responsive_css .= '@media(max-width:1023px){' . $id_wrap . '{order:' . intval( $css_order_tablet ) . '}}';
	}

	// Mobile (≤599px).
	$mobile_rules = array();
	if ( '' !== $max_width_mobile && is_numeric( $max_width_mobile ) ) {
		$mobile_rules[] = 'max-width:' . absint( $max_width_mobile ) . $mw_unit;
	}
	if ( '' !== $max_height_mobile && is_numeric( $max_height_mobile ) ) {
		$mobile_rules[] = 'max-height:' . absint( $max_height_mobile ) . $mh_unit;
	}
	if ( $mobile_rules ) {
		$responsive_css .= '@media(max-width:599px){' . $id_sel . '{' . implode( ';', $mobile_rules ) . '}}';
	}
	if ( null !== $css_order_mobile ) {
		$responsive_css .= '@media(max-width:599px){' . $id_wrap . '{order:' . intval( $css_order_mobile ) . '}}';
	}
}

// ---------------------------------------------------------------------------
// 8. Build caption styles.
// ---------------------------------------------------------------------------
$caption_styles = array();
if ( '' !== $caption_colour ) {
	$caption_styles[] = 'color:' . sgs_colour_value( $caption_colour );
}
if ( $caption_font_size > 0 ) {
	$caption_styles[] = 'font-size:' . $caption_font_size . sgs_media_validate_unit( $caption_font_size_unit );
}
$caption_style_attr = $caption_styles ? ' style="' . esc_attr( implode( ';', $caption_styles ) ) . '"' : '';

// ---------------------------------------------------------------------------
// 9. Build caption element.
// ---------------------------------------------------------------------------
$caption_html = '';
if ( '' !== $caption ) {
	$caption_tag_escaped = tag_escape( $caption_tag );
	$caption_html        = sprintf(
		'<%1$s class="sgs-media__caption"%2$s>%3$s</%1$s>',
		$caption_tag_escaped,
		$caption_style_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_attr() components above.
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

	$media_style_part = $media_style_attr ? ' style="' . esc_attr( $media_style_attr ) . '"' : '';
	$img_width_part   = $image_width ? ' width="' . esc_attr( $image_width ) . '"' : '';
	$img_height_part  = $image_height ? ' height="' . esc_attr( $image_height ) . '"' : '';

	$image_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s class="sgs-media__img" loading="lazy" decoding="async" />',
		esc_url( $resolved_url ),
		esc_attr( $image_alt ),
		$img_width_part,
		$img_height_part,
		$img_srcset,
		$img_sizes,
		$media_style_part
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

	$media_style_part = $media_style_attr ? ' style="' . esc_attr( $media_style_attr ) . '"' : '';

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
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen%s%s%s></iframe>',
			esc_url( $embed_url ),
			$media_style_part,
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
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen%s%s%s></iframe>',
			esc_url( $embed_url ),
			$media_style_part,
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
			'<video class="sgs-media__video"%s%s%s%s%s%s%s%s%s>' .
			'<source src="%s" type="%s">' .
			'</video>',
			$media_style_part,
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
// 13. Assemble wrapper attributes via get_block_wrapper_attributes().
// ---------------------------------------------------------------------------
$wrapper_attr_args = array(
	'class' => implode( ' ', $wrapper_classes ),
	'id'    => $block_anchor,
);
if ( $wrapper_styles ) {
	$wrapper_attr_args['style'] = implode( ';', $wrapper_styles ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_attr_args );

// ---------------------------------------------------------------------------
// 14. Naked-mode for image: emit bare <img> with merged classes when no
// caption and no link wrapper are present. Matches canonical mockup pattern
// `.sgs-foo__image` so per-class CSS rules cascade to the right element.
// Naked-mode is image-only; video always emits a <figure> wrapper.
// ---------------------------------------------------------------------------
$naked_mode = ( 'image' === $media_type ) && ( '' === $caption ) && empty( $link_open );

if ( $naked_mode && '' !== $image_html ) {
	// Parse class= and id= from wrapper_attributes string; merge with sgs-media__img.
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

	$naked_style_part  = $media_style_attr ? ' style="' . esc_attr( $media_style_attr ) . '"' : '';
	$naked_width_part  = $image_width_attr ? ' width="' . esc_attr( $image_width_attr ) . '"' : '';
	$naked_height_part = $image_height_attr ? ' height="' . esc_attr( $image_height_attr ) . '"' : '';

	$image_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s%s class="%s" loading="lazy" decoding="async" />',
		esc_url( $naked_resolved_url ),
		esc_attr( $image_alt_attr ),
		$naked_width_part,
		$naked_height_part,
		$naked_srcset,
		$naked_sizes,
		$naked_style_part,
		$id_attr,
		esc_attr( $merged_classes )
	);
}

// ---------------------------------------------------------------------------
// 15. Emit the scoped responsive <style> block (before the main element).
// ---------------------------------------------------------------------------
if ( $responsive_css ) {
	printf(
		'<style id="%s-css">%s</style>',
		esc_attr( $block_anchor ),
		$responsive_css // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_attr() components throughout.
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
} else {
	// Video always emits a <figure> wrapper (needed for caption + accessible labelling).
	printf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$video_html,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
}
