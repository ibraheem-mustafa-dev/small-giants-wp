<?php
/**
 * Review Schema JSON-LD for SGS Testimonial blocks.
 *
 * Injects schema.org/Review structured data when a testimonial
 * has a reviewSource attribute set (externally sourced reviews only).
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block_sgs/testimonial', __NAMESPACE__ . '\\add_review_schema', 10, 2 );

/**
 * Append Review Schema JSON-LD after testimonial block HTML.
 *
 * Only fires when reviewSource is set (non-empty string), ensuring
 * hand-written testimonials do not get self-serving review markup.
 *
 * @since 1.0.0
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Full block data including attrs.
 * @return string Block HTML with optional JSON-LD appended.
 */
function add_review_schema( string $block_content, array $block ): string {
	$attrs = $block['attrs'] ?? [];

	// Only output schema for externally sourced reviews.
	$source = trim( $attrs['reviewSource'] ?? '' );
	if ( empty( $source ) ) {
		return $block_content;
	}

	// Require at minimum a quote and a name.
	$quote = trim( wp_strip_all_tags( $attrs['quote'] ?? '' ) );
	$name  = trim( wp_strip_all_tags( $attrs['name'] ?? '' ) );
	if ( empty( $quote ) || empty( $name ) ) {
		return $block_content;
	}

	$schema = [
		'@context'     => 'https://schema.org',
		'@type'        => 'Review',
		'reviewBody'   => $quote,
		'author'       => [
			'@type' => 'Person',
			'name'  => $name,
		],
		'publisher'    => [
			'@type' => 'Organization',
			'name'  => $source,
		],
		'itemReviewed' => [
			'@type' => 'LocalBusiness',
			'name'  => get_bloginfo( 'name' ),
		],
	];

	// Add star rating if present.
	$rating = (int) ( $attrs['rating'] ?? 0 );
	if ( $rating > 0 ) {
		$schema['reviewRating'] = [
			'@type'       => 'Rating',
			'ratingValue' => $rating,
			'bestRating'  => 5,
		];
	}

	// Add role as job title.
	$role = trim( wp_strip_all_tags( $attrs['role'] ?? '' ) );
	if ( ! empty( $role ) ) {
		$schema['author']['jobTitle'] = $role;
	}

	// Add review date if set.
	$date = $attrs['reviewDate'] ?? '';
	if ( ! empty( $date ) ) {
		$schema['datePublished'] = $date;
	}

	$json_ld = wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

	return $block_content . sprintf(
		"\n" . '<script type="application/ld+json">%s</script>',
		$json_ld
	);
}
