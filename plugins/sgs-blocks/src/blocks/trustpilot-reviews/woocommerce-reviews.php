<?php
/**
 * WooCommerce product-reviews data source for sgs/trustpilot-reviews.
 *
 * Split out of render.php (already well over this codebase's 300-line PHP
 * file guideline before this feature) rather than added to it. Loaded via
 * `require_once __DIR__ . '/woocommerce-reviews.php'` — a SIBLING file inside
 * this block's own directory, so `--webpack-copy-php` carries it to `build/`
 * the same way it already carries render.php (mirrors
 * `before-after/media-render.php`).
 *
 * Named functions (not closures) are safe here — unlike render.php, this
 * file is pulled in via `require_once`, so PHP only ever declares each
 * function once per request regardless of how many sgs/trustpilot-reviews
 * instances are on the page. `function_exists()` guards are the same
 * defensive pattern used in `before-after/media-render.php` and
 * `includes/trustpilot-helpers.php`.
 *
 * Reuses `\SGS\Blocks\resolve_current_product()`
 * (includes/conditional-visibility.php, already loaded plugin-wide by
 * sgs-blocks.php) to find the current WooCommerce product from block
 * context `postId`, the global `$product`, or the queried object — the
 * same resolution order sgs/product-card and the conditional-visibility
 * "current-product reviews" condition already rely on. This file never
 * duplicates that resolution logic.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_trustpilot_woocommerce_review_shape' ) ) {
	/**
	 * Map one approved WooCommerce product-review comment onto the review
	 * array shape render.php's card loop already expects (author, rating,
	 * datePublished, reviewBody, title, isVerified) — the same shape used by
	 * the inline/synced/placeholder sources, so the card markup, schema
	 * builder and empty-state handling all stay untouched.
	 *
	 * @param \WP_Comment $comment An approved 'review' comment.
	 * @return array Review data shaped for the shared card loop.
	 */
	function sgs_trustpilot_woocommerce_review_shape( \WP_Comment $comment ): array {
		$rating   = (float) get_comment_meta( $comment->comment_ID, 'rating', true );
		$verified = (bool) get_comment_meta( $comment->comment_ID, 'verified', true );

		return array(
			'author'        => $comment->comment_author,
			'rating'        => $rating,
			// WooCommerce stores comment_date_gmt without a UTC offset —
			// gmdate('c', ...) below always renders one, matching the ISO
			// 8601 shape the inline/synced sources already store.
			'datePublished' => gmdate( 'c', strtotime( $comment->comment_date_gmt ) ),
			// WooCommerce reviews carry no separate title field (they are
			// a plain comment) — an honest gap, not an oversight. render.php
			// already skips the title heading entirely when this is ''.
			'title'         => '',
			'reviewBody'    => $comment->comment_content,
			'isVerified'    => $verified,
		);
	}
}

if ( ! function_exists( 'sgs_trustpilot_get_woocommerce_reviews' ) ) {
	/**
	 * Fetch a WooCommerce product's own approved reviews, ordered and capped
	 * per the block's settings.
	 *
	 * @param \WC_Product|null $product Resolved product, or null.
	 * @param int              $max     Maximum reviews to return (0 = no cap).
	 * @param string           $order   'newest' or 'highest'.
	 * @return array[] Review arrays, shaped by sgs_trustpilot_woocommerce_review_shape().
	 */
	function sgs_trustpilot_get_woocommerce_reviews( $product, int $max, string $order ): array {
		if ( ! ( $product instanceof \WC_Product ) ) {
			return array();
		}

		$comments = get_comments(
			array(
				'post_id' => $product->get_id(),
				'status'  => 'approve',
				'type'    => 'review',
				'orderby' => 'comment_date_gmt',
				'order'   => 'DESC',
			)
		);

		if ( empty( $comments ) ) {
			return array();
		}

		if ( 'highest' === $order ) {
			// Sorted in PHP rather than via a meta_value_num orderby: the
			// review volume this block targets (a single product's reviews)
			// is small, and this keeps the tie-break (newest first among
			// equal ratings) explicit and easy to verify.
			usort(
				$comments,
				static function ( $a, $b ) {
					$rating_a = (float) get_comment_meta( $a->comment_ID, 'rating', true );
					$rating_b = (float) get_comment_meta( $b->comment_ID, 'rating', true );
					if ( $rating_a === $rating_b ) {
						return strtotime( $b->comment_date_gmt ) <=> strtotime( $a->comment_date_gmt );
					}
					return $rating_b <=> $rating_a;
				}
			);
		}

		if ( $max > 0 ) {
			$comments = array_slice( $comments, 0, $max );
		}

		return array_map( 'sgs_trustpilot_woocommerce_review_shape', $comments );
	}
}

if ( ! function_exists( 'sgs_trustpilot_woocommerce_summary' ) ) {
	/**
	 * Build the header summary (average rating + review count) for a
	 * WooCommerce product, straight from WooCommerce's own aggregate
	 * fields — never re-derived from the fetched review page, so the
	 * summary stays correct even when `wooReviewsMax` caps the visible cards.
	 *
	 * @param \WC_Product|null $product Resolved product, or null.
	 * @return array{average: float, count: int}
	 */
	function sgs_trustpilot_woocommerce_summary( $product ): array {
		if ( ! ( $product instanceof \WC_Product ) ) {
			return array(
				'average' => 0.0,
				'count'   => 0,
			);
		}

		return array(
			'average' => (float) $product->get_average_rating(),
			'count'   => (int) $product->get_review_count(),
		);
	}
}
