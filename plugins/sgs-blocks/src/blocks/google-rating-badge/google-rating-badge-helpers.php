<?php
/**
 * Google Rating Badge: data and link resolution helpers.
 *
 * Function file, loaded once with require_once from render.php. render.php itself never defines a
 * function (it runs once per block instance and a second declaration would fatal).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_grb_https_url' ) ) {
	/**
	 * An https URL, or '' for anything else (javascript:, http:, relative, malformed).
	 *
	 * @param mixed $url Candidate URL.
	 * @return string The trimmed URL when it starts with https://, otherwise ''.
	 */
	function sgs_grb_https_url( $url ): string {
		$url = is_string( $url ) ? trim( $url ) : '';
		if ( 1 !== preg_match( '#^https://[^\s<>"\']+$#i', $url ) ) {
			return '';
		}
		return $url;
	}
}

if ( ! function_exists( 'sgs_grb_site_info' ) ) {
	/**
	 * A value from the site-wide Site Info store, '' when the store is unavailable or the key is unset.
	 *
	 * @param string $key Dot-notation Site Info key.
	 * @return string The value as a string.
	 */
	function sgs_grb_site_info( string $key ): string {
		if ( ! class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			return '';
		}
		$value = \SGS\Blocks\Sgs_Site_Info::get( $key, '' );
		return is_scalar( $value ) ? trim( (string) $value ) : '';
	}
}

if ( ! function_exists( 'sgs_grb_clamp_rating' ) ) {
	/**
	 * A rating held to 0-5 and one decimal; non-numeric input is 0.
	 *
	 * @param mixed $value Raw rating.
	 * @return float Rating between 0.0 and 5.0.
	 */
	function sgs_grb_clamp_rating( $value ): float {
		if ( ! is_numeric( $value ) ) {
			return 0.0;
		}
		return max( 0.0, min( 5.0, round( (float) $value, 1 ) ) );
	}
}

if ( ! function_exists( 'sgs_grb_resolve' ) ) {
	/**
	 * Decide what the badge shows.
	 *
	 * Rating and count, each in turn: the block's own value when above zero, then the Site Info
	 * `google_rating` / `google_review_count`. Only when the data source allows it and no rating was
	 * found that way does the live Google fetch run.
	 *
	 * - manual: block values then Site Info, never a fetch.
	 * - synced: live Google data only.
	 * - auto:   the manual chain first, then live.
	 *
	 * The link: the block's listingUrl, then (live data only) Google's googleMapsUri, then Site Info
	 * `socials.google`. https only throughout.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array{rating: float, count: int, source: string, url: string}|null Null when there is no real rating to show.
	 */
	function sgs_grb_resolve( array $attributes ): ?array {
		$mode = (string) ( $attributes['dataSource'] ?? 'auto' );
		if ( ! in_array( $mode, array( 'auto', 'manual', 'synced' ), true ) ) {
			$mode = 'auto';
		}

		$result = null;

		if ( 'synced' !== $mode ) {
			$rating = sgs_grb_clamp_rating( $attributes['rating'] ?? 0 );
			if ( $rating <= 0 ) {
				$rating = sgs_grb_clamp_rating( sgs_grb_site_info( 'google_rating' ) );
			}
			if ( $rating > 0 ) {
				$count = (int) ( $attributes['reviewCount'] ?? 0 );
				if ( $count <= 0 ) {
					$count = (int) sgs_grb_site_info( 'google_review_count' );
				}
				$result = array(
					'rating' => $rating,
					'count'  => max( 0, $count ),
					'source' => 'manual',
					'url'    => '',
				);
			}
		}

		if ( null === $result && 'manual' !== $mode ) {
			$result = sgs_grb_resolve_synced( $attributes );
		}

		if ( null === $result ) {
			return null;
		}

		$url = sgs_grb_https_url( $attributes['listingUrl'] ?? '' );
		if ( '' === $url ) {
			$url = $result['url'];
		}
		if ( '' === $url ) {
			$url = sgs_grb_https_url( sgs_grb_site_info( 'socials.google' ) );
		}
		$result['url'] = $url;

		return $result;
	}
}

if ( ! function_exists( 'sgs_grb_resolve_synced' ) ) {
	/**
	 * Live Google data through the transient-cached fetcher.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array{rating: float, count: int, source: string, url: string}|null Null when nothing real came back.
	 */
	function sgs_grb_resolve_synced( array $attributes ): ?array {
		if ( ! class_exists( '\SGS\Blocks\Google_Reviews_Settings' ) ) {
			return null;
		}
		$settings = \SGS\Blocks\Google_Reviews_Settings::get_settings();
		$place_id = sgs_reviews_place_id( $attributes, (string) ( $settings['place_id'] ?? '' ) );
		if ( '' === $place_id ) {
			return null;
		}
		$data = \SGS\Blocks\Google_Reviews_Settings::fetch_reviews( $place_id );
		if ( ! is_array( $data ) ) {
			return null;
		}
		$rating = sgs_grb_clamp_rating( $data['rating'] ?? 0 );
		if ( $rating <= 0 ) {
			return null;
		}
		return array(
			'rating' => $rating,
			'count'  => max( 0, (int) ( $data['userRatingCount'] ?? 0 ) ),
			'source' => 'synced',
			'url'    => sgs_grb_https_url( $data['googleMapsUri'] ?? '' ),
		);
	}
}

if ( ! function_exists( 'sgs_grb_count_label' ) ) {
	/**
	 * "15 reviews" (plain __() rather than _n(): the shared QA harness stubs __() but not _n()).
	 *
	 * @param int $count Review count above zero.
	 * @return string Plural-aware label.
	 */
	function sgs_grb_count_label( int $count ): string {
		/* translators: %s: number of reviews. */
		$label = 1 === $count ? __( '%s review', 'sgs-blocks' ) : __( '%s reviews', 'sgs-blocks' );
		return sprintf( $label, number_format( $count ) );
	}
}

if ( ! function_exists( 'sgs_grb_hide_below_css' ) ) {
	/**
	 * The badge hidden below a viewport width (a crowded header row), as one scoped media rule.
	 *
	 * @param string $root_sel   The instance's scoped root selector.
	 * @param int    $hide_below Viewport width in px; 0 or less emits nothing.
	 * @return string CSS, or '' when off.
	 */
	function sgs_grb_hide_below_css( string $root_sel, int $hide_below ): string {
		if ( $hide_below <= 0 ) {
			return '';
		}
		$max = rtrim( rtrim( number_format( $hide_below - 0.02, 2, '.', '' ), '0' ), '.' );
		return '@media (max-width:' . $max . 'px){' . $root_sel . '{display:none;}}';
	}
}

if ( ! function_exists( 'sgs_grb_compact_css' ) ) {
	/**
	 * The one scoped media rule that shrinks a badge below the compact breakpoint:
	 * the count goes, stars 2-5 go, and the order becomes G, one star, score.
	 *
	 * Plain viewport media query, never a container query (a shrink-to-fit flex child with
	 * container-type:inline-size collapses to zero width).
	 *
	 * @param string $root_sel      The instance selector.
	 * @param int    $compact_below Viewport width in px below which the badge is compact; 0 = off.
	 * @param bool   $keep_caption  True for live Google data: the "Google Maps" source text stays.
	 * @return string CSS, or '' when compaction is off.
	 */
	function sgs_grb_compact_css( string $root_sel, int $compact_below, bool $keep_caption ): string {
		if ( $compact_below <= 0 ) {
			return '';
		}
		$max   = rtrim( rtrim( number_format( $compact_below - 0.02, 2, '.', '' ), '0' ), '.' );
		$block = '.sgs-google-rating-badge__';
		$css   = $root_sel . ' ' . $block . 'count{display:none;}'
			. $root_sel . ' ' . $block . 'stars svg:nth-child(n+2){display:none;}'
			. $root_sel . ' ' . $block . 'stars{order:1;}'
			. $root_sel . ' ' . $block . 'score{order:2;}'
			. $root_sel . ' ' . $block . 'caption{order:3;}';
		if ( ! $keep_caption ) {
			$css .= $root_sel . ' ' . $block . 'caption{display:none;}';
		}
		return '@media (max-width:' . $max . 'px){' . $css . '}';
	}
}
