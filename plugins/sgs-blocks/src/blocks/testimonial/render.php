<?php
/**
 * Server-side render for the SGS Testimonial block.
 *
 * Converted from a static block to a dynamic block on 2026-05-05 as part of
 * the unified media-slot migration (Gap H-3). The new `authorMedia` slot
 * uses MediaPicker + sgs_render_media() so the testimonial author photo
 * follows the same shape as every other block media slot. The legacy
 * `avatar` attribute is retained for back-compat — older posts continue to
 * render until they next round-trip through the editor.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block has no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$quote                    = $attributes['quote'] ?? '';
$name                     = $attributes['name'] ?? '';
$role                     = $attributes['role'] ?? '';
$avatar                   = $attributes['avatar'] ?? null;
$author_media             = $attributes['authorMedia'] ?? null;
$rating                   = isset( $attributes['rating'] ) ? (float) $attributes['rating'] : 0;
$card_style               = $attributes['style'] ?? 'card';
$quote_colour             = $attributes['quoteColour'] ?? 'text';
$name_colour              = $attributes['nameColour'] ?? 'primary';
$name_font_size           = $attributes['nameFontSize'] ?? '';
$name_font_size_tablet    = $attributes['nameFontSizeTablet'] ?? '';
$name_font_size_mobile    = $attributes['nameFontSizeMobile'] ?? '';
$role_colour              = $attributes['roleColour'] ?? 'text-muted';
$rating_colour            = $attributes['ratingColour'] ?? 'accent';
$hover_background_colour  = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour        = $attributes['hoverTextColour'] ?? '';
$hover_border_colour      = $attributes['hoverBorderColour'] ?? '';
$hover_effect             = $attributes['hoverEffect'] ?? 'none';
$transition_duration      = $attributes['transitionDuration'] ?? '300';
$transition_easing        = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale              = $attributes['hoverScale'] ?? '';
$hover_shadow             = $attributes['hoverShadow'] ?? '';
$stagger_delay            = isset( $attributes['staggerDelay'] ) ? (int) $attributes['staggerDelay'] : 0;
$schema_enabled           = ! empty( $attributes['schemaEnabled'] );

// ── authorMedia / avatar synthesis ─────────────────────────────────────────
// authorMedia is the unified slot (MediaPicker shape). When only the legacy
// avatar object is set, synthesise an authorMedia object so sgs_render_media()
// can render it. When only authorMedia is set, hydrate a legacy avatar fallback
// so any future template tweaks still see a familiar shape.
if ( empty( $author_media ) && ! empty( $avatar['url'] ) ) {
	$author_media = array(
		'url'  => $avatar['url'],
		'type' => 'image',
		'id'   => isset( $avatar['id'] ) ? absint( $avatar['id'] ) : 0,
		'alt'  => isset( $avatar['alt'] ) ? (string) $avatar['alt'] : '',
		'mime' => 'image/jpeg',
	);
}
if ( empty( $avatar['url'] ) && ! empty( $author_media['url'] ) && 'image' === ( $author_media['type'] ?? 'image' ) ) {
	$avatar = array(
		'url' => $author_media['url'],
		'id'  => isset( $author_media['id'] ) ? absint( $author_media['id'] ) : 0,
		'alt' => isset( $author_media['alt'] ) ? (string) $author_media['alt'] : '',
	);
}

// Build wrapper classes.
$classes = array( 'sgs-testimonial' );
if ( $card_style ) {
	$classes[] = 'sgs-testimonial--' . sanitize_html_class( $card_style );
}
if ( $hover_effect && 'none' !== $hover_effect ) {
	$classes[] = 'sgs-testimonial--hover-' . sanitize_html_class( $hover_effect );
}
if ( $hover_scale ) {
	$classes[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$classes[] = 'sgs-has-hover';
}
if ( $stagger_delay ) {
	$classes[] = 'sgs-has-stagger';
}

// Build wrapper inline styles (CSS custom properties for hover + transitions).
$styles = array();
if ( $hover_background_colour ) {
	$styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$dur = (string) $transition_duration;
	if ( ! preg_match( '/(ms|s)$/', $dur ) ) {
		$dur .= 'ms';
	}
	$styles[] = '--sgs-transition-duration:' . esc_attr( $dur );
}
if ( $transition_easing ) {
	$styles[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
if ( $hover_scale ) {
	$styles[] = '--sgs-hover-scale:' . esc_attr( (string) $hover_scale );
}
if ( $hover_shadow ) {
	$styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $hover_shadow ) ) ) . ')';
}
if ( $stagger_delay ) {
	$styles[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
}

// Responsive name font-size data-attributes for CSS media-query selectors.
$data_attrs = '';
if ( $name_font_size_tablet ) {
	$data_attrs .= ' data-name-fs-tablet="' . esc_attr( $name_font_size_tablet ) . '"';
}
if ( $name_font_size_mobile ) {
	$data_attrs .= ' data-name-fs-mobile="' . esc_attr( $name_font_size_mobile ) . '"';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => $styles ? implode( ';', $styles ) . ';' : '',
	)
);

// ── Stars ──────────────────────────────────────────────────────────────────
$stars_html = '';
if ( $rating > 0 ) {
	$rating_colour_value = sgs_colour_value( $rating_colour );
	$stars_inner         = '';
	for ( $i = 0; $i < 5; $i++ ) {
		$filled = $i < (int) floor( $rating );
		$half   = ! $filled && $i < $rating && fmod( $rating, 1 ) >= 0.5;
		$class  = 'sgs-testimonial__star ';
		if ( $filled ) {
			$class .= 'sgs-testimonial__star--filled';
		} elseif ( $half ) {
			$class .= 'sgs-testimonial__star--half';
		} else {
			$class .= 'sgs-testimonial__star--empty';
		}

		if ( $half ) {
			$grad_id      = 'sgs-th-' . $i;
			$stars_inner .= '<span class="' . esc_attr( $class ) . '" aria-hidden="true">'
				. '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
				. '<defs><linearGradient id="' . esc_attr( $grad_id ) . '">'
				. '<stop offset="50%" stop-color="currentColor" />'
				. '<stop offset="50%" stop-color="currentColor" stop-opacity="0.2" />'
				. '</linearGradient></defs>'
				. '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#' . esc_attr( $grad_id ) . ')" />'
				. '</svg></span>';
		} else {
			$fill         = $filled ? 'currentColor' : 'none';
			$stroke_width = $filled ? '0' : '1.5';
			$stars_inner .= '<span class="' . esc_attr( $class ) . '" aria-hidden="true">'
				. '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
				. '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="' . esc_attr( $fill ) . '" stroke="currentColor" stroke-width="' . esc_attr( $stroke_width ) . '" stroke-linecap="round" stroke-linejoin="round" />'
				. '</svg></span>';
		}
	}
	$stars_style = $rating_colour_value ? ' style="color:' . esc_attr( $rating_colour_value ) . '"' : '';
	// translators: %s is the numeric star rating (out of 5).
	$aria_label = sprintf( esc_attr__( '%s out of 5 stars', 'sgs-blocks' ), $rating );
	$stars_html = '<div class="sgs-testimonial__stars"' . $stars_style . ' role="img" aria-label="' . $aria_label . '">' . $stars_inner . '</div>';
}

// ── Quote ──────────────────────────────────────────────────────────────────
$quote_style = '';
$quote_value = sgs_colour_value( $quote_colour );
if ( $quote_value ) {
	$quote_style = ' style="color:' . esc_attr( $quote_value ) . '"';
}
$quote_html = '<p class="sgs-testimonial__quote"' . $quote_style . '>' . wp_kses_post( $quote ) . '</p>';

// ── Avatar / authorMedia ───────────────────────────────────────────────────
$avatar_inner = '';
$media_html   = '';
if ( ! empty( $author_media['url'] ) ) {
	// Hand off to the unified media renderer. authorMedia is image-only for
	// testimonials but the helper produces the canonical lazy <img> markup
	// that matches the existing class hooks.
	$media_html = sgs_render_media( $author_media, 'sgs/testimonial' );
}

if ( '' !== $media_html ) {
	$avatar_inner = $media_html;
} elseif ( ! empty( $avatar['url'] ) ) {
	// Legacy fallback for posts that have not yet round-tripped.
	$avatar_inner = sprintf(
		'<img src="%s" alt="%s" class="sgs-testimonial__avatar-img" loading="lazy" width="48" height="48" />',
		esc_url( $avatar['url'] ),
		esc_attr( $avatar['alt'] ?? '' )
	);
} else {
	// No image — render initials as decorative fallback.
	$plain_name = trim( wp_strip_all_tags( $name ) );
	$initials   = '';
	if ( $plain_name ) {
		$parts = preg_split( '/\s+/', $plain_name );
		if ( count( $parts ) === 1 ) {
			$initials = mb_strtoupper( mb_substr( $parts[0], 0, 1 ) );
		} else {
			$first    = $parts[0];
			$last     = $parts[ count( $parts ) - 1 ];
			$initials = mb_strtoupper( mb_substr( $first, 0, 1 ) . mb_substr( $last, 0, 1 ) );
		}
	}
	if ( '' === $initials ) {
		$initials = '?';
	}
	$avatar_inner = '<span class="sgs-testimonial__avatar-initials" aria-hidden="true">' . esc_html( $initials ) . '</span>';
}

$avatar_html = '<div class="sgs-testimonial__avatar">' . $avatar_inner . '</div>';

// ── Name + Role ────────────────────────────────────────────────────────────
$name_styles = array();
$name_value  = sgs_colour_value( $name_colour );
if ( $name_value ) {
	$name_styles[] = 'color:' . $name_value;
}
$name_fs_value = sgs_font_size_value( $name_font_size );
if ( $name_fs_value ) {
	$name_styles[] = 'font-size:' . $name_fs_value;
}
$name_style_attr = $name_styles ? ' style="' . esc_attr( implode( ';', $name_styles ) ) . '"' : '';
$name_html       = '<cite class="sgs-testimonial__name"' . $name_style_attr . '>' . wp_kses_post( $name ) . '</cite>';

$role_value      = sgs_colour_value( $role_colour );
$role_style_attr = $role_value ? ' style="color:' . esc_attr( $role_value ) . '"' : '';
$role_html       = '<span class="sgs-testimonial__role"' . $role_style_attr . '>' . wp_kses_post( $role ) . '</span>';

$footer_html = '<footer class="sgs-testimonial__footer">'
	. $avatar_html
	. '<div class="sgs-testimonial__meta">' . $name_html . $role_html . '</div>'
	. '</footer>';

// ── Schema.org Review JSON-LD ──────────────────────────────────────────────
$schema_html = '';
if ( $schema_enabled && '' !== trim( wp_strip_all_tags( $name ) ) ) {
	$plain_name  = trim( wp_strip_all_tags( $name ) );
	$plain_quote = trim( wp_strip_all_tags( $quote ) );
	$schema      = array(
		'@context'   => 'https://schema.org',
		'@type'      => 'Review',
		'reviewBody' => $plain_quote,
		'author'     => array(
			'@type' => 'Person',
			'name'  => $plain_name,
		),
	);
	if ( $rating > 0 ) {
		$schema['reviewRating'] = array(
			'@type'       => 'Rating',
			'ratingValue' => $rating,
			'bestRating'  => 5,
		);
	}
	$schema_html = '<script type="application/ld+json">' . wp_json_encode( $schema ) . '</script>';
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- All HTML built with esc_* helpers above; $wrapper_attributes from WP core.
printf(
	'<blockquote %1$s%2$s>%3$s%4$s%5$s</blockquote>%6$s',
	$wrapper_attributes,
	$data_attrs,
	$stars_html,
	$quote_html,
	$footer_html,
	$schema_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
