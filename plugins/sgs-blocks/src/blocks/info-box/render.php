<?php
/**
 * Server-side render for the SGS Info Box block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (button InnerBlocks slot).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Element renderer helpers -- guarded so they are safe when multiple
// info-box instances appear on the same page (functions only declared once).
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_info_box_render_media' ) ) {
	/**
	 * Render the media element (icon, emoji, or image).
	 *
	 * @param array $attrs Block attributes.
	 * @return string HTML string.
	 */
	function sgs_info_box_render_media( $attrs ) {
		$media_type     = isset( $attrs['mediaType'] ) ? $attrs['mediaType'] : 'icon';
		$icon           = isset( $attrs['icon'] ) ? $attrs['icon'] : 'star-filled';
		$icon_size      = isset( $attrs['iconSize'] ) ? $attrs['iconSize'] : 'medium';
		$icon_colour    = isset( $attrs['iconColour'] ) ? $attrs['iconColour'] : 'primary';
		$icon_bg_colour = isset( $attrs['iconBackgroundColour'] ) ? $attrs['iconBackgroundColour'] : 'accent-light';
		$media_emoji    = isset( $attrs['mediaEmoji'] ) ? $attrs['mediaEmoji'] : '';
		$image          = isset( $attrs['image'] ) ? $attrs['image'] : null;

		$icon_style_parts = array();
		if ( $icon_colour ) {
			$icon_style_parts[] = 'color:' . sgs_colour_value( $icon_colour );
		}
		if ( $icon_bg_colour ) {
			$icon_style_parts[] = 'background-color:' . sgs_colour_value( $icon_bg_colour );
		}
		$icon_style_attr = $icon_style_parts
			? ' style="' . esc_attr( implode( ';', $icon_style_parts ) ) . '"'
			: '';

		if ( 'image' === $media_type && ! empty( $image['url'] ) ) {
			$img_id    = ! empty( $image['id'] ) ? absint( $image['id'] ) : 0;
			$img_attrs = array(
				'class'    => 'sgs-info-box__image',
				'loading'  => 'lazy',
				'decoding' => 'async',
			);
			if ( ! empty( $image['width'] ) ) {
				$img_attrs['width'] = absint( $image['width'] );
			}
			if ( ! empty( $image['height'] ) ) {
				$img_attrs['height'] = absint( $image['height'] );
			}
			$img_alt = isset( $image['alt'] ) ? $image['alt'] : '';
			return sgs_responsive_image( $img_id, $image['url'], $img_alt, 'medium', $img_attrs );
		}

		if ( 'emoji' === $media_type ) {
			return '<div class="sgs-info-box__media sgs-info-box__media--emoji" aria-hidden="true">'
				. esc_html( $media_emoji )
				. '</div>';
		}

		// Default: Lucide icon.
		require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
		$icon_svg = sgs_get_lucide_icon( $icon );

		return '<span class="sgs-info-box__icon sgs-info-box__icon--'
			. esc_attr( $icon_size ) . '"'
			. $icon_style_attr
			. ' aria-hidden="true">'
			. $icon_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from trusted internal map.
			. '</span>';
	}
}

if ( ! function_exists( 'sgs_info_box_render_title' ) ) {
	/**
	 * Render the title element.
	 *
	 * @param array $attrs Block attributes.
	 * @return string HTML string.
	 */
	function sgs_info_box_render_title( $attrs ) {
		$heading            = isset( $attrs['heading'] ) ? $attrs['heading'] : '';
		$heading_colour     = isset( $attrs['headingColour'] ) ? $attrs['headingColour'] : '';
		$heading_font_size  = isset( $attrs['headingFontSize'] ) ? $attrs['headingFontSize'] : '';
		$text_align_mobile  = isset( $attrs['textAlignMobile'] ) ? $attrs['textAlignMobile'] : '';
		$text_align_tablet  = isset( $attrs['textAlignTablet'] ) ? $attrs['textAlignTablet'] : '';
		$text_align_desktop = isset( $attrs['textAlignDesktop'] ) ? $attrs['textAlignDesktop'] : '';

		$h_classes = array( 'sgs-info-box__heading' );
		if ( $text_align_mobile ) {
			$h_classes[] = 'sgs-text-align-m-' . $text_align_mobile;
		}
		if ( $text_align_tablet ) {
			$h_classes[] = 'sgs-text-align-t-' . $text_align_tablet;
		}
		if ( $text_align_desktop ) {
			$h_classes[] = 'sgs-text-align-d-' . $text_align_desktop;
		}

		$style_parts = array();
		if ( $heading_colour ) {
			$style_parts[] = 'color:' . sgs_colour_value( $heading_colour );
		}
		if ( $heading_font_size ) {
			$style_parts[] = 'font-size:' . sgs_font_size_value( $heading_font_size );
		}
		$style_attr = $style_parts
			? ' style="' . esc_attr( implode( ';', $style_parts ) ) . '"'
			: '';

		return '<h3 class="' . esc_attr( implode( ' ', $h_classes ) ) . '"'
			. $style_attr . '>'
			. wp_kses_post( $heading )
			. '</h3>';
	}
}

if ( ! function_exists( 'sgs_info_box_render_subtitle' ) ) {
	/**
	 * Render the subtitle element.
	 *
	 * @param array $attrs Block attributes.
	 * @return string HTML string.
	 */
	function sgs_info_box_render_subtitle( $attrs ) {
		$subtitle           = isset( $attrs['subtitle'] ) ? $attrs['subtitle'] : '';
		$subtitle_colour    = isset( $attrs['subtitleColour'] ) ? $attrs['subtitleColour'] : '';
		$subtitle_font_size = isset( $attrs['subtitleFontSize'] ) ? $attrs['subtitleFontSize'] : '';

		$style_parts = array();
		if ( $subtitle_colour ) {
			$style_parts[] = 'color:' . sgs_colour_value( $subtitle_colour );
		}
		if ( $subtitle_font_size ) {
			$style_parts[] = 'font-size:' . sgs_font_size_value( $subtitle_font_size );
		}
		$style_attr = $style_parts
			? ' style="' . esc_attr( implode( ';', $style_parts ) ) . '"'
			: '';

		return '<p class="sgs-info-box__subtitle"'
			. $style_attr . '>'
			. wp_kses_post( $subtitle )
			. '</p>';
	}
}

if ( ! function_exists( 'sgs_info_box_render_text' ) ) {
	/**
	 * Render the text body element.
	 *
	 * @param array $attrs Block attributes.
	 * @return string HTML string.
	 */
	function sgs_info_box_render_text( $attrs ) {
		$description        = isset( $attrs['description'] ) ? $attrs['description'] : '';
		$description_colour = isset( $attrs['descriptionColour'] ) ? $attrs['descriptionColour'] : '';

		$style_attr = '';
		if ( $description_colour ) {
			$style_attr = ' style="color:' . esc_attr( sgs_colour_value( $description_colour ) ) . '"';
		}

		return '<p class="sgs-info-box__description"'
			. $style_attr . '>'
			. wp_kses_post( $description )
			. '</p>';
	}
}

// ---------------------------------------------------------------------------
// Visibility toggles.
// ---------------------------------------------------------------------------
$sgs_show = array(
	'media'    => ! empty( $attributes['showMedia'] ),
	'title'    => ! empty( $attributes['showTitle'] ),
	'subtitle' => ! empty( $attributes['showSubtitle'] ),
	'text'     => ! empty( $attributes['showText'] ),
	'button'   => ! empty( $attributes['showButton'] ),
);

// ---------------------------------------------------------------------------
// Element order -- defensive: ensure all 5 IDs are present.
// ---------------------------------------------------------------------------
$sgs_order = isset( $attributes['elementOrder'] ) && is_array( $attributes['elementOrder'] )
	? $attributes['elementOrder']
	: array( 'media', 'title', 'subtitle', 'text', 'button' );

$sgs_default_order = array( 'media', 'title', 'subtitle', 'text', 'button' );
foreach ( $sgs_default_order as $sgs_element_id ) {
	if ( ! in_array( $sgs_element_id, $sgs_order, true ) ) {
		$sgs_order[] = $sgs_element_id;
	}
}

// ---------------------------------------------------------------------------
// Extract attributes with defaults.
// ---------------------------------------------------------------------------
$sgs_icon_position  = isset( $attributes['iconPosition'] ) ? $attributes['iconPosition'] : 'top';
$sgs_link           = isset( $attributes['link'] ) ? $attributes['link'] : '';
$sgs_link_new_tab   = isset( $attributes['linkOpensNewTab'] ) ? (bool) $attributes['linkOpensNewTab'] : false;
$sgs_icon_sz_tablet = isset( $attributes['iconSizeTablet'] ) ? $attributes['iconSizeTablet'] : '';
$sgs_icon_sz_mobile = isset( $attributes['iconSizeMobile'] ) ? $attributes['iconSizeMobile'] : '';
$sgs_head_fs_tablet = isset( $attributes['headingFontSizeTablet'] ) ? $attributes['headingFontSizeTablet'] : '';
$sgs_head_fs_mobile = isset( $attributes['headingFontSizeMobile'] ) ? $attributes['headingFontSizeMobile'] : '';
$sgs_sub_fs_tablet  = isset( $attributes['subtitleFontSizeTablet'] ) ? $attributes['subtitleFontSizeTablet'] : '';
$sgs_sub_fs_mobile  = isset( $attributes['subtitleFontSizeMobile'] ) ? $attributes['subtitleFontSizeMobile'] : '';
$sgs_card_style     = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$sgs_hover_effect   = isset( $attributes['hoverEffect'] ) ? $attributes['hoverEffect'] : 'lift';
$sgs_hover_bg       = isset( $attributes['hoverBackgroundColour'] ) ? $attributes['hoverBackgroundColour'] : '';
$sgs_hover_text     = isset( $attributes['hoverTextColour'] ) ? $attributes['hoverTextColour'] : '';
$sgs_hover_border   = isset( $attributes['hoverBorderColour'] ) ? $attributes['hoverBorderColour'] : '';
$sgs_hover_scale    = isset( $attributes['hoverScale'] ) ? $attributes['hoverScale'] : '';
$sgs_hover_shadow   = isset( $attributes['hoverShadow'] ) ? $attributes['hoverShadow'] : '';
$sgs_block_link     = isset( $attributes['blockLink'] ) ? $attributes['blockLink'] : '';
$sgs_block_link_tgt = isset( $attributes['blockLinkTarget'] ) ? (bool) $attributes['blockLinkTarget'] : false;
$sgs_hover_gray     = isset( $attributes['hoverGrayscale'] ) ? (bool) $attributes['hoverGrayscale'] : false;

// ---------------------------------------------------------------------------
// Wrapper styles.
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = array();
$sgs_wrapper_styles = array_merge( $sgs_wrapper_styles, sgs_transition_vars( $attributes ) );

if ( $sgs_hover_bg ) {
	$sgs_wrapper_styles[] = '--sgs-hover-bg:' . sgs_colour_value( $sgs_hover_bg );
}
if ( $sgs_hover_text ) {
	$sgs_wrapper_styles[] = '--sgs-hover-text:' . sgs_colour_value( $sgs_hover_text );
}
if ( $sgs_hover_border ) {
	$sgs_wrapper_styles[] = '--sgs-hover-border:' . sgs_colour_value( $sgs_hover_border );
}

$sgs_valid_icon_sizes = array( 'small', 'medium', 'large' );
$sgs_valid_font_sizes = array( 'small', 'medium', 'large', 'x-large', 'xx-large' );

// ---------------------------------------------------------------------------
// Wrapper classes.
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'sgs-info-box',
	'sgs-info-box--' . esc_attr( $sgs_card_style ),
	'sgs-info-box--hover-' . esc_attr( $sgs_hover_effect ),
	'sgs-info-box--media-' . esc_attr( $sgs_icon_position ),
);

$sgs_allowed_scales  = array( '1.02', '1.05', '1.1' );
$sgs_allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );

if ( $sgs_hover_scale && in_array( $sgs_hover_scale, $sgs_allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $sgs_hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}
if ( $sgs_hover_shadow && in_array( $sgs_hover_shadow, $sgs_allowed_shadows, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $sgs_hover_shadow ) . ')';
	$sgs_classes[]        = 'sgs-has-hover';
}
if ( $sgs_hover_gray ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}

$sgs_wrapper_attr_args = array(
	'class' => implode( ' ', $sgs_classes ),
);
if ( $sgs_wrapper_styles ) {
	$sgs_wrapper_attr_args['style'] = implode( ';', $sgs_wrapper_styles ) . ';';
}

if ( $sgs_icon_sz_tablet && in_array( $sgs_icon_sz_tablet, $sgs_valid_icon_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-icon-size-tablet'] = $sgs_icon_sz_tablet;
}
if ( $sgs_icon_sz_mobile && in_array( $sgs_icon_sz_mobile, $sgs_valid_icon_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-icon-size-mobile'] = $sgs_icon_sz_mobile;
}
if ( $sgs_head_fs_tablet && in_array( $sgs_head_fs_tablet, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-heading-fs-tablet'] = $sgs_head_fs_tablet;
}
if ( $sgs_head_fs_mobile && in_array( $sgs_head_fs_mobile, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-heading-fs-mobile'] = $sgs_head_fs_mobile;
}
if ( $sgs_sub_fs_tablet && in_array( $sgs_sub_fs_tablet, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-subtitle-fs-tablet'] = $sgs_sub_fs_tablet;
}
if ( $sgs_sub_fs_mobile && in_array( $sgs_sub_fs_mobile, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-subtitle-fs-mobile'] = $sgs_sub_fs_mobile;
}

$sgs_wrapper_attributes = get_block_wrapper_attributes( $sgs_wrapper_attr_args );

// ---------------------------------------------------------------------------
// Build inner HTML in element order.
// ---------------------------------------------------------------------------
ob_start();
foreach ( $sgs_order as $sgs_element_id ) {
	if ( empty( $sgs_show[ $sgs_element_id ] ) ) {
		continue;
	}
	switch ( $sgs_element_id ) {
		case 'media':
			echo sgs_info_box_render_media( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			break;
		case 'title':
			echo sgs_info_box_render_title( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			break;
		case 'subtitle':
			echo sgs_info_box_render_subtitle( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			break;
		case 'text':
			echo sgs_info_box_render_text( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			break;
		case 'button':
			// $content is the compiled InnerBlocks output provided by WordPress.
			echo '<div class="sgs-info-box__button">' . $content . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			break;
		default:
			break;
	}
}
$sgs_inner = ob_get_clean();

// ---------------------------------------------------------------------------
// Legacy link wrapper (kept for pre-upgrade info boxes using the link attr).
// ---------------------------------------------------------------------------
$sgs_link_open  = '';
$sgs_link_close = '';
if ( $sgs_link && empty( $sgs_show['button'] ) ) {
	$sgs_link_target = $sgs_link_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
	$sgs_link_open   = '<a href="' . esc_url( $sgs_link ) . '" class="sgs-info-box__link"' . $sgs_link_target . '>';
	$sgs_link_close  = '</a>';
}

$sgs_inner_html = '<div ' . $sgs_wrapper_attributes . '>'
	. $sgs_link_open
	. $sgs_inner
	. $sgs_link_close
	. '</div>';

// ---------------------------------------------------------------------------
// Block link -- wraps the entire block in an <a> tag.
// ---------------------------------------------------------------------------
if ( $sgs_block_link ) {
	$sgs_block_target = $sgs_block_link_tgt ? ' target="_blank" rel="noopener noreferrer"' : '';
	echo '<a href="' . esc_url( $sgs_block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_block_target is a hardcoded safe string.
		. $sgs_inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		. '</a>';
} else {
	echo $sgs_inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
