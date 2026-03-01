<?php
/**
 * Server-side render for the SGS Testimonial block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$quote         = $attributes['quote'] ?? '';
$name          = $attributes['name'] ?? '';
$role          = $attributes['role'] ?? '';
$avatar        = $attributes['avatar'] ?? null;
$rating        = (int) ( $attributes['rating'] ?? 0 );
$card_style    = $attributes['style'] ?? 'card';
$quote_colour  = $attributes['quoteColour'] ?? '';
$name_colour   = $attributes['nameColour'] ?? '';
$name_size     = $attributes['nameFontSize'] ?? '';
$role_colour   = $attributes['roleColour'] ?? '';
$rating_colour = $attributes['ratingColour'] ?? 'accent';

// Optional review metadata.
$review_source = $attributes['reviewSource'] ?? '';
$review_date   = $attributes['reviewDate'] ?? '';

$classes = array(
	'sgs-testimonial',
	'sgs-testimonial--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build inline style attributes.
$quote_style_attr = $quote_colour
	? ' style="color:' . sgs_colour_value( $quote_colour ) . '"'
	: '';

$name_styles = array();
if ( $name_colour ) {
	$name_styles[] = 'color:' . sgs_colour_value( $name_colour );
}
if ( $name_size ) {
	$name_styles[] = 'font-size:' . sgs_font_size_value( $name_size );
}
$name_style_attr = $name_styles ? ' style="' . implode( ';', $name_styles ) . '"' : '';

$role_style_attr = $role_colour
	? ' style="color:' . sgs_colour_value( $role_colour ) . '"'
	: '';

$stars_style_attr = $rating_colour
	? ' style="color:' . sgs_colour_value( $rating_colour ) . '"'
	: '';

// Generate initials from the reviewer's name (plain text, strips any HTML tags).
$initials = '';
if ( $name ) {
	$plain_name = wp_strip_all_tags( $name );
	$parts      = preg_split( '/\s+/', trim( $plain_name ) );
	if ( ! empty( $parts ) ) {
		if ( 1 === count( $parts ) ) {
			$initials = strtoupper( mb_substr( $parts[0], 0, 1 ) );
		} else {
			$initials = strtoupper(
				mb_substr( $parts[0], 0, 1 ) .
				mb_substr( $parts[ count( $parts ) - 1 ], 0, 1 )
			);
		}
	}
}

// Build star rating HTML.
$stars_html = '';
if ( $rating > 0 ) {
	$star_label  = sprintf(
		/* translators: %d: rating out of 5. */
		__( '%d out of 5 stars', 'sgs-blocks' ),
		$rating
	);
	$star_items = '';
	for ( $i = 0; $i < 5; $i++ ) {
		$is_filled   = $i < $rating;
		$star_class  = 'sgs-testimonial__star ';
		$star_class .= $is_filled ? 'sgs-testimonial__star--filled' : 'sgs-testimonial__star--empty';
		$star_char   = $is_filled ? '★' : '☆';
		$star_items .= sprintf(
			'<span class="%s" aria-hidden="true">%s</span>',
			esc_attr( $star_class ),
			$star_char
		);
	}
	$stars_html = sprintf(
		'<div class="sgs-testimonial__stars"%s role="img" aria-label="%s">%s</div>',
		$stars_style_attr,
		esc_attr( $star_label ),
		$star_items
	);
}

// Build quote paragraph.
$quote_html = '';
if ( $quote ) {
	$quote_html = sprintf(
		'<p class="sgs-testimonial__quote"%s>%s</p>',
		$quote_style_attr,
		wp_kses_post( $quote )
	);
}

// Build avatar: image or initials fallback.
$avatar_html = '';
if ( ! empty( $avatar['url'] ) ) {
	$avatar_id   = isset( $avatar['id'] ) ? absint( $avatar['id'] ) : 0;
	$avatar_html = sgs_responsive_image(
		$avatar_id,
		$avatar['url'],
		$avatar['alt'] ?? '',
		'thumbnail',
		array(
			'class'   => 'sgs-testimonial__avatar-img',
			'loading' => 'lazy',
			'width'   => '48',
			'height'  => '48',
		)
	);
} else {
	$avatar_html = sprintf(
		'<span class="sgs-testimonial__avatar-initials" aria-hidden="true">%s</span>',
		esc_html( $initials ?: '?' )
	);
}

// Build footer: name, role, and optional source/date metadata.
$footer_html  = '<footer class="sgs-testimonial__footer">';
$footer_html .= '<div class="sgs-testimonial__avatar">' . $avatar_html . '</div>';
$footer_html .= '<div class="sgs-testimonial__meta">';

if ( $name ) {
	$footer_html .= sprintf(
		'<cite class="sgs-testimonial__name"%s>%s</cite>',
		$name_style_attr,
		wp_kses_post( $name )
	);
}
if ( $role ) {
	$footer_html .= sprintf(
		'<span class="sgs-testimonial__role"%s>%s</span>',
		$role_style_attr,
		wp_kses_post( $role )
	);
}
if ( $review_source ) {
	$footer_html .= sprintf(
		'<span class="sgs-testimonial__source">%s</span>',
		esc_html( $review_source )
	);
}
if ( $review_date ) {
	$footer_html .= sprintf(
		'<time class="sgs-testimonial__date">%s</time>',
		esc_html( $review_date )
	);
}

$footer_html .= '</div></footer>';

// Schema.org review markup as JSON-LD.
$schema_html = '';
if ( $quote && $name ) {
	$schema = array(
		'@context'     => 'https://schema.org',
		'@type'        => 'Review',
		'reviewBody'   => wp_strip_all_tags( $quote ),
		'author'       => array(
			'@type' => 'Person',
			'name'  => wp_strip_all_tags( $name ),
		),
	);
	if ( $rating > 0 ) {
		$schema['reviewRating'] = array(
			'@type'       => 'Rating',
			'ratingValue' => $rating,
			'bestRating'  => 5,
		);
	}
	if ( $review_date ) {
		$schema['datePublished'] = esc_attr( $review_date );
	}
	$schema_html = '<script type="application/ld+json">' .
		wp_json_encode( $schema, JSON_UNESCAPED_UNICODE ) .
		'</script>';
}

printf(
	'<blockquote %s>%s%s%s</blockquote>%s',
	$wrapper_attributes,
	$stars_html,
	$quote_html,
	$footer_html,
	$schema_html
);
