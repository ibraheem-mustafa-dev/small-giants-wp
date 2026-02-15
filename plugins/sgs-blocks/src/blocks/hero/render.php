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

$variant          = $attributes['variant'] ?? 'standard';
$headline         = $attributes['headline'] ?? '';
$sub_headline     = $attributes['subHeadline'] ?? '';
$alignment        = $attributes['alignment'] ?? 'left';
$bg_image         = $attributes['backgroundImage'] ?? null;
$overlay_colour   = $attributes['overlayColour'] ?? '#1E1E1E';
$overlay_opacity  = $attributes['overlayOpacity'] ?? 50;
$split_image      = $attributes['splitImage'] ?? null;
$min_height       = $attributes['minHeight'] ?? '520px';
$badges           = $attributes['badges'] ?? array();
$cta_primary_text = $attributes['ctaPrimaryText'] ?? '';
$cta_primary_url  = $attributes['ctaPrimaryUrl'] ?? '';
$cta_primary_style = $attributes['ctaPrimaryStyle'] ?? 'accent';
$cta_secondary_text = $attributes['ctaSecondaryText'] ?? '';
$cta_secondary_url  = $attributes['ctaSecondaryUrl'] ?? '';
$cta_secondary_style = $attributes['ctaSecondaryStyle'] ?? 'outline';

$headline_colour       = $attributes['headlineColour'] ?? '';
$sub_headline_font_size = $attributes['subHeadlineFontSize'] ?? '';
$sub_headline_colour   = $attributes['subHeadlineColour'] ?? '';
$cta_primary_colour    = $attributes['ctaPrimaryColour'] ?? '';
$cta_primary_bg        = $attributes['ctaPrimaryBackground'] ?? '';
$cta_secondary_colour  = $attributes['ctaSecondaryColour'] ?? '';
$cta_secondary_bg      = $attributes['ctaSecondaryBackground'] ?? '';

$is_split = 'split' === $variant;

// Build wrapper styles.
$styles = array();
$styles[] = 'min-height:' . esc_attr( $min_height );

if ( ! $is_split && ! empty( $bg_image['url'] ) ) {
	$styles[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
	$styles[] = 'background-size:cover';
	$styles[] = 'background-position:center';
}

// Build wrapper classes.
$classes = array(
	'sgs-hero',
	'sgs-hero--' . esc_attr( $variant ),
	'sgs-hero--align-' . esc_attr( $alignment ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $styles ),
	)
);

// Build overlay.
$overlay_html = '';
if ( ! $is_split && ! empty( $bg_image['url'] ) ) {
	$overlay_style = sprintf(
		'background-color:%s;opacity:%s',
		esc_attr( $overlay_colour ),
		esc_attr( $overlay_opacity / 100 )
	);
	$overlay_html = '<span class="sgs-hero__overlay" style="' . $overlay_style . '" aria-hidden="true"></span>';
}

// Helper: resolve a colour value — hex passes through, slugs become var().
$colour_var = function ( $value ) {
	if ( ! $value ) {
		return '';
	}
	// Raw hex or rgb — use directly.
	if ( '#' === $value[0] || 0 === strpos( $value, 'rgb' ) ) {
		return esc_attr( $value );
	}
	// Design token slug.
	return 'var(--wp--preset--color--' . esc_attr( $value ) . ')';
};

// Helper: resolve a font-size value — CSS units pass through, slugs become var().
$font_size_var = function ( $value ) {
	if ( ! $value ) {
		return '';
	}
	// Raw CSS value (has digits + unit like 1.5em, 16px, clamp(...)).
	if ( preg_match( '/^[\d.]/', $value ) || 0 === strpos( $value, 'clamp' ) ) {
		return esc_attr( $value );
	}
	// Design token slug.
	return 'var(--wp--preset--font-size--' . esc_attr( $value ) . ')';
};

// Build CTA buttons.
$ctas_html = '';
if ( $cta_primary_text || $cta_secondary_text ) {
	$ctas_html .= '<div class="sgs-hero__ctas">';
	if ( $cta_primary_text ) {
		$cta_pri_styles = array();
		if ( $cta_primary_colour ) {
			$cta_pri_styles[] = 'color:' . $colour_var( $cta_primary_colour );
		}
		if ( $cta_primary_bg ) {
			$cta_pri_styles[] = 'background-color:' . $colour_var( $cta_primary_bg );
		}
		$cta_pri_style_attr = $cta_pri_styles ? ' style="' . implode( ';', $cta_pri_styles ) . '"' : '';
		$ctas_html .= sprintf(
			'<a href="%s" class="sgs-hero__cta sgs-hero__cta--%s"%s>%s</a>',
			esc_url( $cta_primary_url ),
			esc_attr( $cta_primary_style ),
			$cta_pri_style_attr,
			esc_html( $cta_primary_text )
		);
	}
	if ( $cta_secondary_text ) {
		$cta_sec_styles = array();
		if ( $cta_secondary_colour ) {
			$cta_sec_styles[] = 'color:' . $colour_var( $cta_secondary_colour );
		}
		if ( $cta_secondary_bg ) {
			$cta_sec_styles[] = 'background-color:' . $colour_var( $cta_secondary_bg );
		}
		$cta_sec_style_attr = $cta_sec_styles ? ' style="' . implode( ';', $cta_sec_styles ) . '"' : '';
		$ctas_html .= sprintf(
			'<a href="%s" class="sgs-hero__cta sgs-hero__cta--%s"%s>%s</a>',
			esc_url( $cta_secondary_url ),
			esc_attr( $cta_secondary_style ),
			$cta_sec_style_attr,
			esc_html( $cta_secondary_text )
		);
	}
	$ctas_html .= '</div>';
}

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
}

// Build content area.
$content_html = '<div class="sgs-hero__content">';
if ( $headline ) {
	$headline_style = '';
	if ( $headline_colour ) {
		$headline_style = ' style="color:' . $colour_var( $headline_colour ) . '"';
	}
	$content_html .= '<h1 class="sgs-hero__headline"' . $headline_style . '>' . wp_kses_post( $headline ) . '</h1>';
}
if ( $sub_headline ) {
	$sub_styles = array();
	if ( $sub_headline_colour ) {
		$sub_styles[] = 'color:' . $colour_var( $sub_headline_colour );
	}
	if ( $sub_headline_font_size ) {
		$sub_styles[] = 'font-size:' . $font_size_var( $sub_headline_font_size );
	}
	$sub_style_attr = $sub_styles ? ' style="' . implode( ';', $sub_styles ) . '"' : '';
	$content_html .= '<p class="sgs-hero__subheadline"' . $sub_style_attr . '>' . wp_kses_post( $sub_headline ) . '</p>';
}
$content_html .= $ctas_html;
$content_html .= '</div>';

// Build split media area.
$media_html = '';
if ( $is_split && ! empty( $split_image['url'] ) ) {
	$media_html = '<div class="sgs-hero__media">';
	$media_html .= sprintf(
		'<img src="%s" alt="%s" class="sgs-hero__split-image" loading="eager" />',
		esc_url( $split_image['url'] ),
		esc_attr( $split_image['alt'] ?? '' )
	);
	$media_html .= $badges_html;
	$media_html .= '</div>';
}

// Output.
printf(
	'<section %s>%s%s%s%s</section>',
	$wrapper_attributes,
	$overlay_html,
	$content_html,
	$media_html,
	! $is_split ? $badges_html : ''
);
