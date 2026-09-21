<?php
/**
 * Written ("inline") reviews, shaped like the Google Places API's reviews.
 *
 * `sgs/google-reviews` renders from one data shape: the Places API (New) response
 * (`authorAttribution.displayName`, `text.text`, `rating`, `publishTime`, plus the
 * business's `rating`, `userRatingCount` and `displayName.text`). In `dataSource:
 * "inline"` the client types the reviews into the block instead, and this file
 * turns them into that same shape, so every variant (grid, slider, list, badge,
 * floating badge, wall), the filters and the slider run unchanged.
 *
 * Google's API returns at most five reviews, so a site that wants to show more
 * (or a verbatim curated set) has to hold them itself: that is what this mode is.
 *
 * Extras the Places shape does not carry travel on the same row under their own keys:
 * `dateLabel` (the date exactly as written), `meta` (a reviewer detail line),
 * `avatarColour` and `reviewUrl`.
 *
 * Item keys accepted (the block's `reviews[]` schema): author, text, rating, date,
 * datePublished, photo { url }, meta, url, avatarColour. `reviewBody` is read as an
 * alias of `text` so the same normaliser can serve `sgs/trustpilot-reviews` items.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_reviews_inline_normalise' ) ) {

	/**
	 * Turn written review items into Places-API-shaped review rows.
	 *
	 * An item with neither an author nor any text is skipped. A rating outside 0-5 or
	 * missing is left out of the row (an unrated review renders without stars and is
	 * never removed by the minimum-rating filter).
	 *
	 * @param mixed $items The block's `reviews` attribute.
	 * @return array<int, array<string, mixed>> Rows in the Places shape.
	 */
	function sgs_reviews_inline_normalise( $items ): array {
		if ( ! is_array( $items ) ) {
			return array();
		}
		$rows = array();
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			$author = sanitize_text_field( (string) ( $item['author'] ?? '' ) );
			$text   = sanitize_textarea_field( (string) ( $item['text'] ?? ( $item['reviewBody'] ?? '' ) ) );
			if ( '' === $author && '' === $text ) {
				continue;
			}
			$photo = is_array( $item['photo'] ?? null ) ? esc_url_raw( (string) ( $item['photo']['url'] ?? '' ) ) : '';
			$row   = array(
				'authorAttribution' => array(
					'displayName' => $author,
					'photoUri'    => $photo,
				),
				'text'              => array( 'text' => $text ),
			);

			if ( isset( $item['rating'] ) && is_numeric( $item['rating'] ) && (float) $item['rating'] >= 0 && (float) $item['rating'] <= 5 ) {
				$row['rating'] = (float) $item['rating'];
			}

			$published = trim( (string) ( $item['datePublished'] ?? '' ) );
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}/', $published ) ) {
				$stamp = strtotime( $published );
				if ( false !== $stamp ) {
					$row['publishTime'] = gmdate( 'c', $stamp );
				}
			}

			$label = sanitize_text_field( (string) ( $item['date'] ?? '' ) );
			if ( '' !== $label ) {
				$row['dateLabel'] = $label;
			}
			$meta = sanitize_text_field( (string) ( $item['meta'] ?? '' ) );
			if ( '' !== $meta ) {
				$row['meta'] = $meta;
			}
			$colour = sanitize_text_field( (string) ( $item['avatarColour'] ?? '' ) );
			if ( '' !== $colour ) {
				$row['avatarColour'] = $colour;
			}
			$url = esc_url_raw( (string) ( $item['url'] ?? '' ) );
			if ( '' !== $url ) {
				$row['reviewUrl'] = $url;
			}
			$rows[] = $row;
		}
		return $rows;
	}
}

if ( ! function_exists( 'sgs_reviews_inline_data' ) ) {

	/**
	 * The full data object `sgs/google-reviews` renders from, built from block attributes.
	 *
	 * The average and the count come from `averageRating` / `reviewCount` when set, otherwise
	 * from the written reviews themselves (the mean of the rated ones, and how many there are).
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array{reviews: array, rating: float, userRatingCount: int, displayName: array{text: string}}
	 */
	function sgs_reviews_inline_data( array $attributes ): array {
		$rows  = sgs_reviews_inline_normalise( $attributes['reviews'] ?? array() );
		$rated = array_values( array_filter( array_column( $rows, 'rating' ), 'is_numeric' ) );

		$average = (float) ( $attributes['averageRating'] ?? 0 );
		if ( $average <= 0 && $rated ) {
			$average = round( array_sum( $rated ) / count( $rated ), 1 );
		}
		$count = (int) ( $attributes['reviewCount'] ?? 0 );
		if ( $count <= 0 ) {
			$count = count( $rows );
		}

		return array(
			'reviews'         => $rows,
			'rating'          => $average,
			'userRatingCount' => $count,
			'displayName'     => array( 'text' => sanitize_text_field( (string) ( $attributes['businessName'] ?? '' ) ) ),
		);
	}
}
