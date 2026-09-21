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

if ( ! function_exists( 'sgs_reviews_placeholder_data' ) ) {

	/**
	 * The three sample reviews shown ONLY when an author explicitly picks `dataSource: "placeholder"`.
	 *
	 * These are invented, so they must never reach a visitor by default and never feed review
	 * schema. The average and count describe the sample set itself (5.0 from 3), not a made-up
	 * business score.
	 *
	 * @return array{reviews: array, rating: float, userRatingCount: int, displayName: array{text: string}}
	 */
	function sgs_reviews_placeholder_data(): array {
		$samples = array(
			array( 'Sarah Patel', 'Reliable supplier for over five years now. Consistent quality, excellent service, and their account team really understands our needs.', '-6 months' ),
			array( 'James Wright', 'Excellent product range and fast delivery times. Competitive pricing for the quality. Always our first choice for catering supplies.', '-3 months' ),
			array( 'Aisha Khan', 'Great trade prices and a genuinely helpful account team. They go the extra mile to support our business growth.', '-1 month' ),
		);

		$rows = array();
		foreach ( $samples as $sample ) {
			$rows[] = array(
				'authorAttribution' => array(
					'displayName' => $sample[0],
					'photoUri'    => '',
				),
				'rating'            => 5,
				'text'              => array( 'text' => $sample[1] ),
				'publishTime'       => gmdate( 'c', strtotime( $sample[2] ) ),
			);
		}

		return array(
			'reviews'         => $rows,
			'rating'          => 5.0,
			'userRatingCount' => count( $rows ),
			'displayName'     => array( 'text' => __( 'Sample business', 'sgs-blocks' ) ),
		);
	}
}

if ( ! function_exists( 'sgs_reviews_place_id' ) ) {

	/**
	 * The Google place ID to fetch: the block's own, else the site-wide one from the plugin settings.
	 *
	 * The block's `placeId` attribute defaults to an empty string, and `??` does not treat an empty
	 * string as missing, so the settings fallback has to be an explicit empty check.
	 *
	 * @param array<string, mixed> $attributes        Block attributes.
	 * @param string               $settings_place_id The place ID saved in the plugin settings.
	 * @return string Place ID, or an empty string when neither is set.
	 */
	function sgs_reviews_place_id( array $attributes, string $settings_place_id ): string {
		$own = trim( (string) ( $attributes['placeId'] ?? '' ) );
		return '' !== $own ? $own : trim( $settings_place_id );
	}
}

if ( ! function_exists( 'sgs_reviews_resolve' ) ) {

	/**
	 * Decide what `sgs/google-reviews` may show, in order: written, live Google, sample, or nothing.
	 *
	 * - `inline`: the client's own written reviews. `auto` (the default) is this when the block holds
	 *   any, otherwise Google. Never fetches, never the sample set.
	 * - `synced`: Google via `$fetcher`. A missing place ID, a fetch error (with nothing cached) or an
	 *   empty response gives null: there is nothing real to show.
	 * - `placeholder`: the sample set, only because the author asked for it.
	 * - Anything else that has no data gives null, and the block renders nothing on the front end.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $place_id   Place ID from sgs_reviews_place_id().
	 * @param callable|null        $fetcher    `fn( string $place_id )` returning the Places API response or a WP_Error.
	 *                                         Defaults to Google_Reviews_Settings::fetch_reviews (transient-cached).
	 * @return array{source: string, data: array}|null `source` is `inline`, `synced` or `placeholder`; null means render nothing.
	 */
	function sgs_reviews_resolve( array $attributes, string $place_id, ?callable $fetcher = null ): ?array {
		$attr = (string) ( $attributes['dataSource'] ?? 'auto' );

		if ( 'placeholder' === $attr ) {
			return array(
				'source' => 'placeholder',
				'data'   => sgs_reviews_placeholder_data(),
			);
		}

		if ( 'inline' === $attr || ( 'synced' !== $attr && ! empty( $attributes['reviews'] ) ) ) {
			$data = sgs_reviews_inline_data( $attributes );
			return empty( $data['reviews'] ) ? null : array(
				'source' => 'inline',
				'data'   => $data,
			);
		}

		if ( '' === $place_id ) {
			return null;
		}

		if ( null === $fetcher ) {
			if ( ! class_exists( '\SGS\Blocks\Google_Reviews_Settings' ) ) {
				return null;
			}
			$fetcher = array( '\SGS\Blocks\Google_Reviews_Settings', 'fetch_reviews' );
		}

		$data = $fetcher( $place_id );
		if ( ! is_array( $data ) || ( empty( $data['reviews'] ) && (float) ( $data['rating'] ?? 0 ) <= 0 ) ) {
			return null;
		}

		return array(
			'source' => 'synced',
			'data'   => $data,
		);
	}
}

if ( ! function_exists( 'sgs_reviews_may_emit_schema' ) ) {

	/**
	 * Whether `LocalBusiness` + `AggregateRating` JSON-LD may be printed for this data.
	 *
	 * Only real Google data qualifies: written reviews are controlled by the business itself
	 * (ineligible for review snippets) and the sample set is invented. The aggregate also has to be
	 * complete (a name, a positive rating and count), otherwise the markup would be invalid.
	 *
	 * @param string               $source `inline`, `synced` or `placeholder` from sgs_reviews_resolve().
	 * @param array<string, mixed> $data   The Places-shaped data.
	 * @return bool
	 */
	function sgs_reviews_may_emit_schema( string $source, array $data ): bool {
		return 'synced' === $source
			&& '' !== trim( (string) ( $data['displayName']['text'] ?? '' ) )
			&& (float) ( $data['rating'] ?? 0 ) > 0
			&& (int) ( $data['userRatingCount'] ?? 0 ) > 0;
	}
}
