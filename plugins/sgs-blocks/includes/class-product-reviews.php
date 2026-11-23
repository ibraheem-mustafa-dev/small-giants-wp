<?php
/**
 * A product's own WooCommerce reviews as `aggregateRating` and `review` structured data.
 *
 * Only reviews left on this product's page and approved in WordPress are printed. A rating from a third party
 * (Trustpilot, Google reviews or any synced source) is never read here: Google's review guidelines ask for the
 * reviews the site itself collects for the product marked up, and a rating that is not on the product's page is
 * a guideline breach, not a missing field. A product with no approved, rated reviews prints neither key.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Reviews
 */
final class Product_Reviews {

	/**
	 * The most recent reviews to print: enough for a rich result, small enough to keep the script short.
	 */
	private const MAX_REVIEWS = 10;

	/**
	 * The `aggregateRating` and `review` keys for a product, empty when it has no approved, rated reviews.
	 *
	 * @param \WC_Product $product The product (the parent of a variable product).
	 * @return array<string,mixed>
	 */
	public static function fields( \WC_Product $product ): array {
		$fields  = array();
		$ratings = (int) $product->get_rating_count();
		if ( $ratings > 0 && (float) $product->get_average_rating() > 0 ) {
			$fields['aggregateRating'] = array(
				'@type'       => 'AggregateRating',
				'ratingValue' => $product->get_average_rating(),
				'ratingCount' => $ratings,
				'reviewCount' => \max( $ratings, (int) $product->get_review_count() ),
				'bestRating'  => 5,
				'worstRating' => 1,
			);
		}
		$reviews = self::reviews( $product );
		if ( ! empty( $reviews ) ) {
			$fields['review'] = $reviews;
		}
		return $fields;
	}

	/**
	 * The product's newest approved reviews that carry a star rating and an author name.
	 *
	 * @param \WC_Product $product The product.
	 * @return array<int,array<string,mixed>>
	 */
	private static function reviews( \WC_Product $product ): array {
		$comments = \get_comments(
			array(
				'post_id' => $product->get_id(),
				'status'  => 'approve',
				'type'    => 'review',
				'number'  => self::MAX_REVIEWS * 2,
				'orderby' => 'comment_date_gmt',
				'order'   => 'DESC',
			)
		);
		$reviews  = array();
		foreach ( (array) $comments as $comment ) {
			$rating = (int) \get_comment_meta( (int) $comment->comment_ID, 'rating', true );
			$author = \trim( \sanitize_text_field( \wp_strip_all_tags( (string) $comment->comment_author ) ) );
			if ( $rating < 1 || $rating > 5 || '' === $author ) {
				continue;
			}
			$review = array(
				'@type'         => 'Review',
				'author'        => array(
					'@type' => 'Person',
					'name'  => $author,
				),
				'datePublished' => \substr( (string) $comment->comment_date_gmt, 0, 10 ),
				'reviewRating'  => array(
					'@type'       => 'Rating',
					'ratingValue' => $rating,
					'bestRating'  => 5,
					'worstRating' => 1,
				),
			);
			$body   = \trim( \sanitize_text_field( \wp_strip_all_tags( (string) $comment->comment_content ) ) );
			if ( '' !== $body ) {
				$review['reviewBody'] = $body;
			}
			$reviews[] = $review;
			if ( \count( $reviews ) >= self::MAX_REVIEWS ) {
				break;
			}
		}
		return $reviews;
	}
}
