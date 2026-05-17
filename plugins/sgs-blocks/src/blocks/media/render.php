<?php
/**
 * Server-side render for the SGS Media block.
 *
 * Content image block. Replaces core/image in the SGS clone-pipeline
 * converter output so styling attributes (objectFit, objectPosition,
 * maxWidth, borderRadius, etc.) are applied on the frontend via
 * server-side render rather than the frozen static save.js HTML that
 * core/image produces.
 *
 * @since 1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract attributes with safe defaults.
// ---------------------------------------------------------------------------
$image_id     = isset( $attributes['imageId'] ) ? absint( $attributes['imageId'] ) : null;
$image_url    = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';
$image_alt    = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
$image_width  = isset( $attributes['imageWidth'] ) ? absint( $attributes['imageWidth'] ) : 0;
$image_height = isset( $attributes['imageHeight'] ) ? absint( $attributes['imageHeight'] ) : 0;

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
// 2. Resolve the final image URL. imageId wins; fall back to imageUrl.
// ---------------------------------------------------------------------------
$resolved_url = '';
$resolved_id  = 0;

if ( $image_id ) {
	$src_result = wp_get_attachment_image_src( $image_id, 'full' );
	if ( $src_result ) {
		$resolved_url = $src_result[0];
		$resolved_id  = $image_id;
		// Use library dimensions when the block attrs are absent.
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

// ---------------------------------------------------------------------------
// 3. Soft-fail — nothing to render.
// ---------------------------------------------------------------------------
if ( '' === $resolved_url ) {
	echo '<!-- sgs/media: no image set -->';
	return;
}

// ---------------------------------------------------------------------------
// 4. Helper: validate allowed CSS dimension units.
// ---------------------------------------------------------------------------
/**
 * Validate a CSS dimension unit against an allowed list.
 *
 * @param string $unit The raw unit string from block attributes.
 * @return string A validated unit string, defaulting to 'px'.
 */
if ( ! function_exists( 'sgs_media_validate_unit' ) ) {
	function sgs_media_validate_unit( string $unit ): string {
		$allowed = array( 'px', '%', 'em', 'rem', 'vw', 'vh', 'svw', 'svh', 'ch' );
		return in_array( $unit, $allowed, true ) ? $unit : 'px';
	}
}

// ---------------------------------------------------------------------------
// 5. Build the <img> inline style string.
// ---------------------------------------------------------------------------
$img_styles = array();

// object-fit.
$img_styles[] = 'object-fit:' . esc_attr( $object_fit );

// object-position: allow alphanumeric, %, spaces, commas, dashes (valid CSS).
if ( '' !== $object_position && preg_match( '/^[a-zA-Z0-9%\s.,\-]+$/', $object_position ) ) {
	$img_styles[] = 'object-position:' . esc_attr( $object_position );
}

// aspect-ratio: allow digits, slash, spaces, forward slash.
if ( '' !== $aspect_ratio && preg_match( '/^[\d\s\/]+$/', $aspect_ratio ) ) {
	$img_styles[] = 'aspect-ratio:' . esc_attr( $aspect_ratio );
}

// max-width (desktop).
if ( '' !== $max_width && is_numeric( $max_width ) ) {
	$img_styles[] = 'max-width:' . absint( $max_width ) . sgs_media_validate_unit( $max_width_unit );
}

// max-height (desktop).
if ( '' !== $max_height && is_numeric( $max_height ) ) {
	$img_styles[] = 'max-height:' . absint( $max_height ) . sgs_media_validate_unit( $max_height_unit );
}

// opacity.
if ( 1.0 !== $opacity ) {
	$img_styles[] = 'opacity:' . esc_attr( $opacity );
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
	$img_styles[] = 'border-radius:' . $br_tl . ' ' . $br_tr . ' ' . $br_br . ' ' . $br_bl;
} elseif ( '' !== $border_radius && is_numeric( $border_radius ) ) {
	$img_styles[] = 'border-radius:' . absint( $border_radius ) . sgs_media_validate_unit( $border_radius_unit );
}

// box-shadow — delegate to sgs_shadow_value() so raw CSS values
// (e.g. `0 4px 12px rgba(0,0,0,0.1)`) pass through correctly. The previous
// hardcoded `var(--wp--preset--shadow--{slug})` wrap broke raw shadows by
// stripping spaces/parens/commas and producing a non-existent CSS custom
// property name. Captured 2026-05-17 by QC rater 4.
if ( '' !== $box_shadow ) {
	$shadow_css = sgs_shadow_value( $box_shadow );
	if ( '' !== $shadow_css ) {
		$img_styles[] = 'box-shadow:' . $shadow_css;
	}
}

$img_style_attr = implode( ';', $img_styles );

// ---------------------------------------------------------------------------
// 6. Build the <figure> wrapper inline styles and classes.
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
// 7. Anchor / unique-ID for scoped responsive CSS.
// ---------------------------------------------------------------------------
$block_anchor = $block->parsed_block['attrs']['anchor'] ?? '';
if ( ! $block_anchor ) {
	// Deterministic ID based on attribute fingerprint so it survives re-render.
	$block_anchor = 'sgs-media-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
}

// ---------------------------------------------------------------------------
// 8. Per-viewport responsive CSS (emitted as a scoped <style> tag).
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
	$id_sel  = '#' . esc_attr( $block_anchor ) . ' img';
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
// 9. Build caption styles.
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
// 10. Assemble wrapper attributes via get_block_wrapper_attributes().
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
// 11. Build srcset / sizes from the media library when imageId is available.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 12. Build link wrapper parts.
// ---------------------------------------------------------------------------
$link_open  = '';
$link_close = '';
if ( '' !== $link_url ) {
	$link_rel_attr = '';
	if ( $link_opens_new_tab ) {
		// Force noopener for security when opening in a new tab.
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
	// Ensure the link hit target meets 44px minimum (handled in style.css).
	$link_open  = '<a href="' . esc_url( $link_url ) . '"' . $new_tab_attrs . $link_rel_attr . ' class="sgs-media__link">';
	$link_close = '</a>';
}

// ---------------------------------------------------------------------------
// 13. Build the <img> element.
// ---------------------------------------------------------------------------
$img_style_part  = $img_style_attr ? ' style="' . esc_attr( $img_style_attr ) . '"' : '';
$img_width_part  = $image_width ? ' width="' . esc_attr( $image_width ) . '"' : '';
$img_height_part = $image_height ? ' height="' . esc_attr( $image_height ) . '"' : '';

$img_html = sprintf(
	'<img src="%s" alt="%s"%s%s%s%s%s class="sgs-media__img" loading="lazy" decoding="async" />',
	esc_url( $resolved_url ),
	esc_attr( $image_alt ),
	$img_width_part,
	$img_height_part,
	$img_srcset,
	$img_sizes,
	$img_style_part
);

// When the block has no caption AND no link wrapper, fidelity is best
// served by emitting the bare <img> with the wrapper classes/anchor lifted
// onto it directly — no <figure> wrapper. This matches the canonical
// mockup pattern (`<img class="sgs-foo__image">`) so per-class CSS rules
// like `.sgs-brand__image { max-height: 380px }` cascade to the right
// element. The <figure> structure remains for captioned/linked images
// where it carries semantic value. Captured 2026-05-17.
$naked_mode = ( '' === $caption ) && empty( $link_open );
if ( $naked_mode ) {
	// Extract classes from wrapper_attributes string + merge with sgs-media__img.
	// get_block_wrapper_attributes returns a string like `class="..." id="..." ...`.
	// Parse class= and id= specifically; drop the rest (style applies to wrapper, not img).
	preg_match( '/class="([^"]*)"/', $wrapper_attributes, $cm );
	preg_match( '/id="([^"]*)"/', $wrapper_attributes, $im );
	$merged_classes = trim(
		( $cm[1] ?? '' ) . ' sgs-media__img'
	);
	$id_attr = ! empty( $im[1] ) ? ' id="' . esc_attr( $im[1] ) . '"' : '';
	$img_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s%s class="%s" loading="lazy" decoding="async" />',
		esc_url( $resolved_url ),
		esc_attr( $image_alt ),
		$img_width_part,
		$img_height_part,
		$img_srcset,
		$img_sizes,
		$img_style_part,
		$id_attr,
		esc_attr( $merged_classes )
	);
}

// ---------------------------------------------------------------------------
// 14. Build the caption element.
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
// 15. Emit the scoped responsive <style> block (before the figure element).
// ---------------------------------------------------------------------------
if ( $responsive_css ) {
	printf(
		'<style id="%s-css">%s</style>',
		esc_attr( $block_anchor ),
		$responsive_css // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_attr() components throughout.
	);
}

// ---------------------------------------------------------------------------
// 16. Final output: <figure> > [<a>] <img> [</a>] [caption].
// ---------------------------------------------------------------------------
if ( $naked_mode ) {
	// Naked img — classes already merged from wrapper. No <figure> wrapper.
	echo $img_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
} else {
	printf(
		'<figure %s>%s%s%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$link_open,          // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
		$img_html,           // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
		$link_close,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- always '' or '</a>' (static string, no user input).
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
}
