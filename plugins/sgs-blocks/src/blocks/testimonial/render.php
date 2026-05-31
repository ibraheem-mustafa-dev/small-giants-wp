<?php
/**
 * Server-side render for the SGS Testimonial block.
 *
 * FR-22-6 InnerBlocks migration (2026-05-30):
 * The block card shell (wrapper, hover CSS vars, style class, avatar footer)
 * is rendered here. The CONTENT area (quote text, stars, author name/role)
 * is rendered by child inner blocks via echo $content.
 *
 * Existing posts that have not yet round-tripped through the editor will
 * have empty $content (the WP-CLI batch migration handles them). R-22-14
 * prohibits server-side legacy fallback hacks — no if/else scalar render.
 *
 * Schema.org Review JSON-LD is emitted here when schemaEnabled is set,
 * reading the name/quote/rating scalar attrs. Those attrs are still stored
 * in the block comment JSON on existing posts, so schema continues to work
 * even before WP-CLI migration. New converter-generated posts should carry
 * the sgs/testimonial's own schemaEnabled attr.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (FR-22-6 InnerBlocks slot).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$card_style              = $attributes['style'] ?? 'card';
$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$hover_effect            = $attributes['hoverEffect'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale             = $attributes['hoverScale'] ?? '';
$hover_shadow            = $attributes['hoverShadow'] ?? '';
$stagger_delay           = isset( $attributes['staggerDelay'] ) ? (int) $attributes['staggerDelay'] : 0;
$schema_enabled          = ! empty( $attributes['schemaEnabled'] );

// Avatar / authorMedia — presentation identity, kept as attrs.
$avatar       = $attributes['avatar'] ?? null;
$author_media = $attributes['authorMedia'] ?? null;

// Synthesise authorMedia from legacy avatar for back-compat.
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

// ── Wrapper classes ────────────────────────────────────────────────────────
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

// ── Wrapper inline styles (CSS custom properties) ──────────────────────────
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

// Responsive name font-size data-attributes (kept for CSS consumers even
// though name is now in InnerBlocks — legacy posts may still carry these).
$name_font_size_tablet = $attributes['nameFontSizeTablet'] ?? '';
$name_font_size_mobile = $attributes['nameFontSizeMobile'] ?? '';
$data_attrs            = '';
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

// ── Avatar / author photo ──────────────────────────────────────────────────
// Avatar is a presentation/identity attr managed via the inspector MediaPicker.
// It renders in the card footer outside the InnerBlocks content slot.
$avatar_inner = '';
$media_html   = '';
if ( ! empty( $author_media['url'] ) ) {
	$media_html = sgs_render_media( $author_media, 'sgs/testimonial' );
}

if ( '' !== $media_html ) {
	$avatar_inner = $media_html;
} elseif ( ! empty( $avatar['url'] ) ) {
	$avatar_inner = sprintf(
		'<img src="%s" alt="%s" class="sgs-testimonial__avatar-img" loading="lazy" width="48" height="48" />',
		esc_url( $avatar['url'] ),
		esc_attr( $avatar['alt'] ?? '' )
	);
} else {
	// No image — render initials placeholder as decorative fallback.
	// Name comes from scalar attr (legacy) or is empty on new InnerBlocks posts.
	$name     = wp_strip_all_tags( $attributes['name'] ?? '' );
	$initials = '';
	if ( $name ) {
		$parts = preg_split( '/\s+/', trim( $name ) );
		if ( count( $parts ) === 1 ) {
			$initials = mb_strtoupper( mb_substr( $parts[0], 0, 1 ) );
		} else {
			$initials = mb_strtoupper( mb_substr( $parts[0], 0, 1 ) . mb_substr( $parts[ count( $parts ) - 1 ], 0, 1 ) );
		}
	}
	if ( '' === $initials ) {
		$initials = '?';
	}
	$avatar_inner = '<span class="sgs-testimonial__avatar-initials" aria-hidden="true">' . esc_html( $initials ) . '</span>';
}

$avatar_html = '<div class="sgs-testimonial__avatar">' . $avatar_inner . '</div>';
$footer_html = '<footer class="sgs-testimonial__footer">' . $avatar_html . '</footer>';

// ── Schema.org Review JSON-LD ──────────────────────────────────────────────
// Read from scalar attrs (present on existing posts and on new posts where the
// converter still writes schemaEnabled / name / quote / rating to the block
// comment JSON). This survives the InnerBlocks migration because the attrs are
// stored in the block delimiter comment, not sourced from saved HTML.
$schema_html = '';
if ( $schema_enabled ) {
	$name_attr  = trim( wp_strip_all_tags( $attributes['name'] ?? '' ) );
	$quote_attr = trim( wp_strip_all_tags( $attributes['quote'] ?? '' ) );
	$rating_val = isset( $attributes['rating'] ) ? (float) $attributes['rating'] : 0;
	if ( '' !== $name_attr ) {
		$schema = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'Review',
			'reviewBody' => $quote_attr,
			'author'     => array(
				'@type' => 'Person',
				'name'  => $name_attr,
			),
		);
		if ( $rating_val > 0 ) {
			$schema['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $rating_val,
				'bestRating'  => 5,
			);
		}
		$schema_html = '<script type="application/ld+json">' . wp_json_encode( $schema ) . '</script>';
	}
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $content from inner blocks (WP-rendered); $footer_html/$schema_html built with esc_* helpers above.
printf(
	'<blockquote %1$s%2$s>%3$s%4$s</blockquote>%5$s',
	$wrapper_attributes,
	$data_attrs,
	$content,
	$footer_html,
	$schema_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
