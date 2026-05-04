<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$variant             = $attributes['variant'] ?? 'standard';
$headline            = $attributes['headline'] ?? '';
$sub_headline        = $attributes['subHeadline'] ?? '';
$alignment           = $attributes['alignment'] ?? 'left';
$bg_image            = $attributes['backgroundImage'] ?? null;
$overlay_colour      = sgs_colour_value( $attributes['overlayColour'] ?? 'text' );
$overlay_opacity     = $attributes['overlayOpacity'] ?? 50;
$split_image         = $attributes['splitImage'] ?? null;
$bg_video            = $attributes['backgroundVideo'] ?? null;
$svg_content         = $attributes['svgContent'] ?? '';
$min_height          = $attributes['minHeight'] ?? '';
$min_height_tablet   = $attributes['minHeightTablet'] ?? '';
$min_height_mobile   = $attributes['minHeightMobile'] ?? '360px';
$badges              = $attributes['badges'] ?? array();
$cta_primary_text    = $attributes['ctaPrimaryText'] ?? '';
$cta_primary_url     = $attributes['ctaPrimaryUrl'] ?? '';
$cta_primary_style   = $attributes['ctaPrimaryStyle'] ?? 'accent';
$cta_secondary_text  = $attributes['ctaSecondaryText'] ?? '';
$cta_secondary_url   = $attributes['ctaSecondaryUrl'] ?? '';
$cta_secondary_style = $attributes['ctaSecondaryStyle'] ?? 'outline';

$headline_colour               = $attributes['headlineColour'] ?? '';
$sub_headline_font_size        = $attributes['subHeadlineFontSize'] ?? '';
$sub_headline_font_size_tablet = $attributes['subHeadlineFontSizeTablet'] ?? '';
$sub_headline_font_size_mobile = $attributes['subHeadlineFontSizeMobile'] ?? '';
$sub_headline_colour           = $attributes['subHeadlineColour'] ?? '';
$cta_primary_colour            = $attributes['ctaPrimaryColour'] ?? '';
$cta_primary_bg                = $attributes['ctaPrimaryBackground'] ?? '';
$cta_secondary_colour          = $attributes['ctaSecondaryColour'] ?? '';
$cta_secondary_bg              = $attributes['ctaSecondaryBackground'] ?? '';

// Per-breakpoint typography controls (new in v2).
$headline_font_size_desktop = $attributes['headlineFontSizeDesktop'] ?? null;
$headline_font_size_tablet  = $attributes['headlineFontSizeTablet'] ?? null;
$headline_font_size_mobile  = $attributes['headlineFontSizeMobile'] ?? null;
$sub_headline_max_width     = $attributes['subHeadlineMaxWidth'] ?? null;
$split_image_mobile_height  = $attributes['splitImageMobileHeight'] ?? null;

$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

// Background effect attributes.
$bg_parallax     = ! empty( $attributes['bgParallax'] );
$bg_ken_burns    = ! empty( $attributes['bgKenBurns'] );
$bg_video_attr   = $attributes['bgVideo'] ?? null;
$bg_video_mobile = $attributes['bgVideoMobile'] ?? null;

// Split-image bleed — removes border-radius and inner padding from the media column.
$split_image_bleed = ! empty( $attributes['splitImageBleed'] );

// Per-CTA hover colour overrides.
$cta_primary_hover_bg       = $attributes['ctaPrimaryHoverBackground'] ?? '';
$cta_primary_hover_colour   = $attributes['ctaPrimaryHoverColour'] ?? '';
$cta_secondary_hover_bg     = $attributes['ctaSecondaryHoverBackground'] ?? '';
$cta_secondary_hover_colour = $attributes['ctaSecondaryHoverColour'] ?? '';

$is_split        = 'split' === $variant;
$is_video        = 'video' === $variant;
$is_svg_animated = 'svg-animated' === $variant;

// Build wrapper styles.
$styles = array();
if ( ! empty( $min_height ) ) {
	$styles[] = 'min-height:' . esc_attr( $min_height );
}

// Transition custom properties — consumed by CSS vars on the block and its children.
$styles = array_merge( $styles, sgs_transition_vars( $attributes ) );

if ( $hover_background_colour ) {
	$styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}

// Per-CTA hover overrides — written as CSS custom properties so the CSS rule can
// reference them without needing a unique selector per instance.
if ( $cta_primary_hover_bg ) {
	$styles[] = '--sgs-cta-pri-hover-bg:' . sgs_colour_value( $cta_primary_hover_bg );
}
if ( $cta_primary_hover_colour ) {
	$styles[] = '--sgs-cta-pri-hover-colour:' . sgs_colour_value( $cta_primary_hover_colour );
}
if ( $cta_secondary_hover_bg ) {
	$styles[] = '--sgs-cta-sec-hover-bg:' . sgs_colour_value( $cta_secondary_hover_bg );
}
if ( $cta_secondary_hover_colour ) {
	$styles[] = '--sgs-cta-sec-hover-colour:' . sgs_colour_value( $cta_secondary_hover_colour );
}

// Standard variant: use <img> instead of CSS background-image so the browser can
// discover the LCP resource early and apply fetchpriority="high".
$has_standard_bg_image = ! $is_split && ! $is_video && ! $is_svg_animated
	&& ! empty( $bg_image['url'] );

// Generate a unique ID for responsive CSS scoping.
$uid = 'sgs-hero-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );

// Build responsive CSS.
$responsive_css = '';
if ( $min_height_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . '{min-height:' . esc_attr( $min_height_tablet ) . '}}';
}
if ( $min_height_mobile ) {
	$responsive_css .= '@media (max-width:599px){.' . $uid . '{min-height:' . esc_attr( $min_height_mobile ) . '}}';
}
if ( $sub_headline_font_size_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__subheadline{font-size:' . sgs_font_size_value( $sub_headline_font_size_tablet ) . '}}';
}
if ( $sub_headline_font_size_mobile ) {
	$responsive_css .= '@media (max-width:599px){.' . $uid . ' .sgs-hero__subheadline{font-size:' . sgs_font_size_value( $sub_headline_font_size_mobile ) . '}}';
}

// Per-breakpoint headline font size.
if ( $headline_font_size_desktop ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_desktop ) . 'px}';
}
if ( $headline_font_size_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_tablet ) . 'px}}';
}
if ( $headline_font_size_mobile ) {
	$responsive_css .= '@media (max-width:599px){.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_mobile ) . 'px}}';
}

// Sub-headline max-width.
if ( $sub_headline_max_width ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__subheadline{max-width:' . absint( $sub_headline_max_width ) . 'px}';
}

// Split image mobile height.
if ( $split_image_mobile_height ) {
	$responsive_css .= '@media (max-width:599px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $split_image_mobile_height ) . 'px;object-fit:cover}}';
}

// Build wrapper classes.
$classes = array(
	'sgs-hero',
	'sgs-hero--' . esc_attr( $variant ),
	'sgs-hero--align-' . esc_attr( $alignment ),
	$uid,
);

if ( $bg_parallax ) {
	$classes[] = 'sgs-hero--parallax';
}
if ( $bg_ken_burns ) {
	$classes[] = 'sgs-hero--ken-burns';
}
if ( $split_image_bleed ) {
	$classes[] = 'sgs-hero--split-bleed';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $styles ) . ';',
	)
);

// Build video background.
// bgVideo / bgVideoMobile override the background image on their respective viewports.
// These attributes work independently of the 'video' variant — any variant can have a video bg.
$video_html        = '';
$has_variant_video = $is_video && ! empty( $bg_video['url'] );
$has_attr_video    = ! empty( $bg_video_attr['url'] );

if ( $has_variant_video || $has_attr_video ) {
	$desktop_src = ! empty( $bg_video_attr['url'] ) ? $bg_video_attr['url'] : ( $bg_video['url'] ?? '' );
	$mobile_src  = ! empty( $bg_video_mobile['url'] ) ? $bg_video_mobile['url'] : $desktop_src;

	if ( $desktop_src === $mobile_src ) {
		// Single source — no viewport switching needed.
		$video_html = sprintf(
			'<video class="sgs-hero__video-bg" autoplay loop muted playsinline aria-hidden="true">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_url( $desktop_src )
		);
	} else {
		// Two sources — JS swaps src based on viewport via data attributes.
		$video_html = sprintf(
			'<video class="sgs-hero__video-bg sgs-hero__video-bg--responsive" autoplay loop muted playsinline aria-hidden="true"' .
			' data-src-desktop="%s" data-src-mobile="%s">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_attr( $desktop_src ),
			esc_attr( $mobile_src ),
			esc_url( $desktop_src )
		);
	}
}

// Build standard background image element.
// Using an <img> instead of CSS background-image lets the browser discover the LCP
// resource early and apply fetchpriority="high". A static per-request counter ensures
// only the first hero on a page gets the high-priority hint.
$bg_img_html = '';
if ( $has_standard_bg_image ) {
	static $sgs_hero_count = 0;
	++$sgs_hero_count;

	$img_id         = ! empty( $bg_image['id'] ) ? absint( $bg_image['id'] ) : 0;
	$fetch_priority = 1 === $sgs_hero_count ? 'high' : 'auto';
	$loading        = 1 === $sgs_hero_count ? 'eager' : 'lazy';

	$img_attrs = array(
		'class'         => 'sgs-hero__bg-img',
		'aria-hidden'   => 'true',
		'fetchpriority' => $fetch_priority,
		'loading'       => $loading,
		'decoding'      => 1 === $sgs_hero_count ? 'sync' : 'async',
		'alt'           => '',
	);

	if ( $bg_parallax ) {
		$img_attrs['class'] .= ' sgs-hero__bg-img--parallax';
	}

	require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
	$bg_img_html = sgs_responsive_image(
		$img_id,
		$bg_image['url'],
		'',
		'full',
		$img_attrs
	);
}

// Build SVG background.
$svg_html = '';
if ( $is_svg_animated && ! empty( $svg_content ) ) {
	$svg_html = '<div class="sgs-hero__svg-bg" aria-hidden="true">' . wp_kses_post( $svg_content ) . '</div>';
}

// Build overlay.
$overlay_html = '';
if ( ( ! $is_split && ! empty( $bg_image['url'] ) ) || $is_video || $is_svg_animated ) {
	$overlay_style = sprintf(
		'background-color:%s;opacity:%s',
		$overlay_colour,
		esc_attr( $overlay_opacity / 100 )
	);
	$overlay_html  = '<span class="sgs-hero__overlay" style="' . $overlay_style . '" aria-hidden="true"></span>';
}

// CTA buttons are now rendered via sgs/multi-button + sgs/button InnerBlocks.
// $content is passed by WordPress and contains the rendered InnerBlocks output.
// Legacy ctaPrimary* / ctaSecondary* attributes are handled by deprecated.js migration.

// Build badges.
$badges_html = '';
if ( ! empty( $badges ) ) {
	foreach ( $badges as $badge ) {
		$position = esc_attr( $badge['position'] ?? 'bottom-left' );
		$style    = esc_attr( $badge['style'] ?? 'light' );
		$number   = esc_html( $badge['number'] ?? '' );
		$suffix   = esc_html( $badge['suffix'] ?? '' );
		$label    = esc_html( $badge['label'] ?? '' );

		$badges_html .= sprintf(
			'<div class="sgs-hero__badge sgs-hero__badge--%s sgs-hero__badge--%s">' .
			'<span class="sgs-hero__badge-number">%s%s</span>' .
			'<span class="sgs-hero__badge-label">%s</span>' .
			'</div>',
			$position,
			$style,
			$number,
			$suffix,
			$label
		);
	}
	if ( $badges_html ) {
		$badges_html = '<div class="sgs-hero__badges">' . $badges_html . '</div>';
	}
}

// Build content area.
$content_html = '<div class="sgs-hero__content">';
if ( $headline ) {
	$h_classes          = array( 'sgs-hero__headline' );
	$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
	$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
	$text_align_desktop = $attributes['textAlignDesktop'] ?? '';

	if ( $text_align_mobile ) {
		$h_classes[] = 'sgs-text-align-m-' . $text_align_mobile; }
	if ( $text_align_tablet ) {
		$h_classes[] = 'sgs-text-align-t-' . $text_align_tablet; }
	if ( $text_align_desktop ) {
		$h_classes[] = 'sgs-text-align-d-' . $text_align_desktop; }

	$h_styles = array();
	if ( $headline_colour ) {
		$h_styles[] = 'color:' . sgs_colour_value( $headline_colour ); }
	$headline_style_attr = $h_styles ? ' style="' . implode( ';', $h_styles ) . '"' : '';
	$headline_class_attr = ' class="' . esc_attr( implode( ' ', $h_classes ) ) . '"';

	$content_html .= '<h1' . $headline_class_attr . $headline_style_attr . '>' . wp_kses_post( $headline ) . '</h1>';
}
if ( $sub_headline ) {
	$sub_styles = array();
	if ( $sub_headline_colour ) {
		$sub_styles[] = 'color:' . sgs_colour_value( $sub_headline_colour );
	}
	if ( $sub_headline_font_size ) {
		$sub_styles[] = 'font-size:' . sgs_font_size_value( $sub_headline_font_size );
	}
	if ( $sub_headline_max_width ) {
		$sub_styles[] = 'max-width:' . absint( $sub_headline_max_width ) . 'px';
	}
	$sub_style_attr = $sub_styles ? ' style="' . implode( ';', $sub_styles ) . '"' : '';
	$content_html  .= '<p class="sgs-hero__subheadline"' . $sub_style_attr . '>' . wp_kses_post( $sub_headline ) . '</p>';
}
// InnerBlocks output (sgs/multi-button + sgs/button) rendered by WordPress.
$content_html .= '<div class="sgs-hero__ctas">' . $content . '</div>';
$content_html .= '</div>';

// Build split media area.
$media_html = '';
if ( $is_split && ! empty( $split_image['url'] ) ) {
	// H13/H14: use responsive image helper for srcset + explicit dimensions.
	$img_id    = ! empty( $split_image['id'] ) ? absint( $split_image['id'] ) : 0;
	$img_attrs = array(
		'class'         => 'sgs-hero__split-image',
		'loading'       => 'eager',
		'decoding'      => 'async',
		'fetchpriority' => 'high',
	);
	if ( ! empty( $split_image['width'] ) ) {
		$img_attrs['width'] = absint( $split_image['width'] );
	}
	if ( ! empty( $split_image['height'] ) ) {
		$img_attrs['height'] = absint( $split_image['height'] );
	}

	// Fallback: if dimensions still missing, try to resolve them from WordPress
	// metadata. Prevents CLS when the editor hasn't stored the explicit size.
	if ( ! isset( $img_attrs['width'] ) || ! isset( $img_attrs['height'] ) ) {
		$resolve_id = $img_id;
		// If no ID was stored with the block, try to look up the attachment by URL.
		if ( 0 === $resolve_id && ! empty( $split_image['url'] ) ) {
			$resolve_id = absint( attachment_url_to_postid( $split_image['url'] ) );
		}
		if ( $resolve_id > 0 ) {
			$src_data = wp_get_attachment_image_src( $resolve_id, 'large' );
			if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
				$img_attrs['width']  = $img_attrs['width'] ?? (int) $src_data[1];
				$img_attrs['height'] = $img_attrs['height'] ?? (int) $src_data[2];
			}
		}
	}

	$media_class = 'sgs-hero__media';
	if ( $split_image_bleed ) {
		$media_class .= ' sgs-hero__media--bleed';
		// Also remove the border-radius on the image itself.
		$img_attrs['class'] .= ' sgs-hero__split-image--bleed';
	}

	$media_html  = '<div class="' . esc_attr( $media_class ) . '">';
	$media_html .= sgs_responsive_image(
		$img_id,
		$split_image['url'],
		$split_image['alt'] ?? '',
		'large',
		$img_attrs
	);
	$media_html .= $badges_html;
	$media_html .= '</div>';
}

// Output responsive CSS if needed.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $responsive_css built from esc_attr() values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), $responsive_css );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; all HTML strings built with esc_url/esc_html/esc_attr above.
printf(
	'<section %s>%s%s%s%s%s%s%s</section>',
	$wrapper_attributes,
	$bg_img_html,
	$video_html,
	$svg_html,
	$overlay_html,
	$content_html,
	$media_html,
	! $is_split ? $badges_html : ''
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
