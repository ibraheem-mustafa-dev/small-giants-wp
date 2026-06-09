<?php
/**
 * Google Reviews — Server Render
 *
 * WS-4: OUTER wrapper is now rendered by SGS_Container_Wrapper (kind='layout').
 * Carries block-specific classes + styles + WP-Interactivity data-* attrs via opts.
 *
 * @package SGS\Blocks
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param \WP_Block $block      Block instance.
 */

use SGS\Blocks\Google_Reviews_Settings;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$variant            = $attributes['variant'] ?? 'grid';
$place_id           = $attributes['placeId'] ?? Google_Reviews_Settings::get_settings()['place_id'] ?? '';
$columns            = $attributes['columns'] ?? 3;
$columns_tablet     = $attributes['columnsTablet'] ?? 2;
$columns_mobile     = $attributes['columnsMobile'] ?? 1;
$max_reviews        = $attributes['maxReviews'] ?? 10;
$min_rating         = $attributes['minRating'] ?? 1;
$text_only          = $attributes['textOnly'] ?? false;
$exclude_keywords   = $attributes['excludeKeywords'] ?? '';
$sort_by            = $attributes['sortBy'] ?? 'newest';
$show_aggregate     = $attributes['showAggregate'] ?? true;
$show_breakdown     = $attributes['showBreakdown'] ?? false;
$show_avatar        = $attributes['showAvatar'] ?? true;
$show_date          = $attributes['showDate'] ?? true;
$show_google_logo   = $attributes['showGoogleLogo'] ?? true;
$review_request_url = $attributes['reviewRequestUrl'] ?? '';
$theme              = $attributes['theme'] ?? 'light';
$card_style         = $attributes['cardStyle'] ?? 'bordered';
$star_colour        = $attributes['starColour'] ?? 'accent';
$autoplay           = $attributes['autoplay'] ?? false;
$autoplay_speed     = $attributes['autoplaySpeed'] ?? 5000;
$show_dots          = $attributes['showDots'] ?? true;
$show_arrows        = $attributes['showArrows'] ?? true;

// Placeholder reviews used when API key is not configured or API call fails.
// These demonstrate the block's styling without requiring a Google Places API key.
$dummy_reviews = array(
	array(
		'authorAttribution' => array(
			'displayName' => 'Sarah Patel',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Reliable supplier for over five years now. Consistent quality, excellent service, and their account team really understands our needs.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-6 months' ) ),
	),
	array(
		'authorAttribution' => array(
			'displayName' => 'James Wright',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Excellent product range and fast delivery times. Competitive pricing for the quality. Always our first choice for catering supplies.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-3 months' ) ),
	),
	array(
		'authorAttribution' => array(
			'displayName' => 'Aisha Khan',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Great trade prices and a genuinely helpful account team. They go the extra mile to support our business growth.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-1 month' ) ),
	),
);

if ( empty( $place_id ) ) {
	// No API key configured — use dummy content to showcase styling.
	$data = array(
		'reviews'         => $dummy_reviews,
		'rating'          => 4.9,
		'userRatingCount' => 47,
		'displayName'     => array( 'text' => __( 'Our Business', 'sgs-blocks' ) ),
	);
} else {
	// Fetch reviews from API.
	$data = Google_Reviews_Settings::fetch_reviews( $place_id );

	if ( is_wp_error( $data ) ) {
		// API error — fall back to dummy content.
		$data = array(
			'reviews'         => $dummy_reviews,
			'rating'          => 4.9,
			'userRatingCount' => 47,
			'displayName'     => array( 'text' => __( 'Our Business', 'sgs-blocks' ) ),
		);
	}
}

$all_reviews   = $data['reviews'] ?? array();
$rating        = $data['rating'] ?? 0;
$rating_count  = $data['userRatingCount'] ?? 0;
$business_name = $data['displayName']['text'] ?? '';

// Filter reviews.
$filtered_reviews = array_filter(
	$all_reviews,
	function ( $review ) use ( $min_rating, $text_only, $exclude_keywords ) {
		$review_rating = $review['rating'] ?? 0;

		if ( $review_rating < $min_rating ) {
			return false;
		}

		if ( $text_only && empty( $review['text']['text'] ) ) {
			return false;
		}

		if ( ! empty( $exclude_keywords ) ) {
			$keywords = array_map( 'trim', explode( ',', $exclude_keywords ) );
			$text     = strtolower( $review['text']['text'] ?? '' );
			foreach ( $keywords as $keyword ) {
				if ( ! empty( $keyword ) && str_contains( $text, strtolower( $keyword ) ) ) {
					return false;
				}
			}
		}

		return true;
	}
);

// Sort reviews.
usort(
	$filtered_reviews,
	function ( $a, $b ) use ( $sort_by ) {
		if ( 'highest' === $sort_by ) {
			return ( $b['rating'] ?? 0 ) <=> ( $a['rating'] ?? 0 );
		}

		if ( 'lowest' === $sort_by ) {
			return ( $a['rating'] ?? 0 ) <=> ( $b['rating'] ?? 0 );
		}

		// Default: newest.
		$time_a = strtotime( $a['publishTime'] ?? '' );
		$time_b = strtotime( $b['publishTime'] ?? '' );
		return $time_b <=> $time_a;
	}
);

// Limit reviews.
$reviews = array_slice( $filtered_reviews, 0, $max_reviews );

// ───────────────────────────────────────────────────────────────────────────
// Wrapper: own classes, styles, and WP-Interactivity data-* attrs.
// data-wp-interactive / data-wp-context / data-wp-init consumed by store
// (sgs/google-reviews) in view.js; must ride through extra_attrs so the
// WP Interactivity runtime can find them on the element.
// ───────────────────────────────────────────────────────────────────────────

$gr_extra_classes = array(
	'sgs-google-reviews',
	'sgs-google-reviews--' . sanitize_key( $variant ),
	'sgs-google-reviews--theme-' . sanitize_key( $theme ),
	'sgs-google-reviews--card-' . sanitize_key( $card_style ),
	'sgs-google-reviews--star-' . sanitize_key( $star_colour ),
	'sgs-google-reviews--cols-' . (int) $columns,
	'sgs-google-reviews--cols-tablet-' . (int) $columns_tablet,
	'sgs-google-reviews--cols-mobile-' . (int) $columns_mobile,
);

// Only the inner star colour remains as a custom CSS variable
// (targets SVG fill on inner elements).
$sgs_gr_star     = sgs_colour_value( $star_colour );
$gr_extra_styles = array(
	'--sgs-gr-star-colour:' . $sgs_gr_star,
);

// WP Interactivity attrs — carried verbatim so the store binds correctly.
$gr_extra_attrs = array(
	'data-wp-interactive' => 'sgs/google-reviews',
	'data-wp-context'     => wp_json_encode(
		array(
			'autoplay'      => $autoplay,
			'autoplaySpeed' => $autoplay_speed,
			'currentSlide'  => 0,
		)
	),
	'data-wp-init'        => 'callbacks.init',
);

$gr_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $gr_extra_classes,
	'extra_styles'  => $gr_extra_styles,
	'extra_attrs'   => $gr_extra_attrs,
);

// ───────────────────────────────────────────────────────────────────────────
// Star rendering helper (inline — shared helper not yet shipped).
// ───────────────────────────────────────────────────────────────────────────

if ( ! function_exists( 'sgs_render_stars_svg' ) ) {
	/**
	 * Render SVG star rating.
	 *
	 * TODO: Replace with sgs_render_stars() from includes/render-helpers.php
	 * once Agent P ships the shared helper — this inline version can then be removed.
	 *
	 * Uses Lucide-compatible 5-point star SVG paths.
	 * Full stars are solid; half stars use a clip-path split; empty stars are outline only.
	 *
	 * @param float $star_rating Rating value (0-5).
	 * @return string HTML for star rating.
	 */
	function sgs_render_stars_svg( float $star_rating ): string {
		$full_stars  = (int) floor( $star_rating );
		$half_star   = ( $star_rating - $full_stars ) >= 0.5 ? 1 : 0;
		$empty_stars = 5 - $full_stars - $half_star;

		// SVG star path — standard 5-point polygon, 24×24 viewBox.
		$star_path = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

		$label = esc_attr(
			sprintf(
				/* translators: %s: rating number */
				__( '%s out of 5 stars', 'sgs-blocks' ),
				number_format( $star_rating, 1 )
			)
		);

		$html = '<div class="sgs-google-reviews__stars" role="img" aria-label="' . $label . '">';
		$uid  = wp_unique_id( 'star-half-' );

		for ( $i = 0; $i < $full_stars; $i++ ) {
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--full" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
		}

		if ( $half_star ) {
			// Half star: left half filled, right half outline, achieved via clipPath.
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--half" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">';
			$html .= '<defs><clipPath id="' . esc_attr( $uid ) . '"><rect x="0" y="0" width="12" height="24"/></clipPath></defs>';
			$html .= '<path class="sgs-google-reviews__star-outline" d="' . $star_path . '"/>';
			$html .= '<path class="sgs-google-reviews__star-fill" d="' . $star_path . '" clip-path="url(#' . esc_attr( $uid ) . ')"/>';
			$html .= '</svg>';
		}

		for ( $i = 0; $i < $empty_stars; $i++ ) {
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--empty" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
		}

		$html .= '</div>';

		return $html;
	}
}

// ───────────────────────────────────────────────────────────────────────────
// Schema.org JSON-LD (emitted before the wrapper element).
// ───────────────────────────────────────────────────────────────────────────

$schema = array(
	'@context'        => 'https://schema.org',
	'@type'           => 'LocalBusiness',
	'name'            => $business_name,
	'aggregateRating' => array(
		'@type'       => 'AggregateRating',
		'ratingValue' => $rating,
		'reviewCount' => $rating_count,
	),
);

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output is safe for script context.
echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . '</script>';

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

if ( $show_aggregate && ! in_array( $variant, array( 'badge', 'floating-badge' ), true ) ) :
	?>
	<div class="sgs-google-reviews__aggregate">
		<?php echo sgs_render_stars_svg( $rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<div class="sgs-google-reviews__aggregate-text">
			<strong><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<?php
			echo '<span class="sgs-google-reviews__count">' . esc_html( number_format( $rating_count ) ) . ' ' . esc_html__( 'reviews', 'sgs-blocks' ) . '</span>';
			?>
		</div>
		<?php if ( $show_google_logo ) : ?>
			<img
				src="<?php echo esc_url( plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' ) ); ?>"
				alt="Google"
				class="sgs-google-reviews__google-logo"
				width="16"
				height="16"
			/>
		<?php endif; ?>
	</div>
	<?php
endif;

// ───────────────────────────────────────────────────────────────────────────
// Ratings breakdown — per-star distribution bars (5★ … 1★).
// Counts are derived from the available reviews ($all_reviews); the Google
// Places API returns no histogram, so the sample of returned reviews is the
// best available source. WCAG: each row carries a visible numeric star label
// + the count + an aria-label — meaning is NOT conveyed by the bar colour alone.
// Hidden for badge variants (no room) and when there are no reviews to count.
// ───────────────────────────────────────────────────────────────────────────
if ( $show_breakdown && ! in_array( $variant, array( 'badge', 'floating-badge' ), true ) && ! empty( $all_reviews ) ) :
	$gr_star_counts = array(
		5 => 0,
		4 => 0,
		3 => 0,
		2 => 0,
		1 => 0,
	);
	foreach ( $all_reviews as $gr_review ) {
		$gr_r = (int) round( (float) ( $gr_review['rating'] ?? 0 ) );
		if ( $gr_r >= 1 && $gr_r <= 5 ) {
			++$gr_star_counts[ $gr_r ];
		}
	}
	$gr_total = array_sum( $gr_star_counts );
	if ( $gr_total > 0 ) :
		?>
		<div class="sgs-google-reviews__breakdown" role="table" aria-label="<?php echo esc_attr__( 'Rating breakdown by number of stars', 'sgs-blocks' ); ?>">
			<?php foreach ( $gr_star_counts as $gr_stars => $gr_count ) : ?>
				<?php $gr_pct = $gr_total > 0 ? round( ( $gr_count / $gr_total ) * 100 ) : 0; ?>
				<div class="sgs-google-reviews__breakdown-row" role="row">
					<span class="sgs-google-reviews__breakdown-label" role="cell">
						<?php
						/* translators: %d: number of stars (1-5). */
						echo esc_html( sprintf( _n( '%d star', '%d stars', $gr_stars, 'sgs-blocks' ), $gr_stars ) );
						?>
					</span>
					<span class="sgs-google-reviews__breakdown-bar" role="cell" aria-hidden="true">
						<span class="sgs-google-reviews__breakdown-fill" style="width:<?php echo esc_attr( $gr_pct ); ?>%"></span>
					</span>
					<span class="sgs-google-reviews__breakdown-count" role="cell">
						<?php
						/* translators: %1$d: number of reviews; %2$d: percentage. */
						echo esc_html( sprintf( _n( '%1$d review (%2$d%%)', '%1$d reviews (%2$d%%)', $gr_count, 'sgs-blocks' ), $gr_count, $gr_pct ) );
						?>
					</span>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	endif;
endif;

if ( in_array( $variant, array( 'badge', 'floating-badge' ), true ) ) :
	?>
	<div class="sgs-google-reviews__badge">
		<?php echo sgs_render_stars_svg( $rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<div class="sgs-google-reviews__badge-text">
			<strong><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<span><?php echo esc_html( number_format( $rating_count ) ) . ' ' . esc_html__( 'reviews', 'sgs-blocks' ); ?></span>
		</div>
		<?php if ( $show_google_logo ) : ?>
			<img
				src="<?php echo esc_url( plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' ) ); ?>"
				alt="Google"
				width="16"
				height="16"
			/>
		<?php endif; ?>
	</div>
	<?php
else :
	?>
	<div class="sgs-google-reviews__list">
		<?php foreach ( $reviews as $review ) : ?>
			<?php
			$author        = $review['authorAttribution']['displayName'] ?? __( 'Anonymous', 'sgs-blocks' );
			$author_photo  = $review['authorAttribution']['photoUri'] ?? '';
			$text          = $review['text']['text'] ?? '';
			$review_rating = $review['rating'] ?? 0;
			$publish_time  = isset( $review['publishTime'] ) ? strtotime( $review['publishTime'] ) : 0;
			?>
			<article class="sgs-google-reviews__review">
				<?php if ( $show_avatar ) : ?>
					<div class="sgs-google-reviews__avatar">
						<?php if ( ! empty( $author_photo ) ) : ?>
							<img
								src="<?php echo esc_url( $author_photo ); ?>"
								alt=""
								loading="lazy"
								width="48"
								height="48"
							/>
						<?php else : ?>
							<div class="sgs-google-reviews__avatar-initials">
								<?php echo esc_html( strtoupper( substr( $author, 0, 1 ) ) ); ?>
							</div>
						<?php endif; ?>
					</div>
				<?php endif; ?>

				<div class="sgs-google-reviews__review-content">
					<div class="sgs-google-reviews__review-header">
						<strong class="sgs-google-reviews__author"><?php echo esc_html( $author ); ?></strong>
						<?php if ( $show_date && $publish_time ) : ?>
							<time class="sgs-google-reviews__date" datetime="<?php echo esc_attr( gmdate( 'Y-m-d', $publish_time ) ); ?>">
								<?php echo esc_html( human_time_diff( $publish_time, time() ) . ' ago' ); ?>
							</time>
						<?php endif; ?>
					</div>

					<?php echo sgs_render_stars_svg( $review_rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

					<?php if ( ! empty( $text ) ) : ?>
						<p class="sgs-google-reviews__text"><?php echo esc_html( $text ); ?></p>
					<?php endif; ?>
				</div>
			</article>
		<?php endforeach; ?>
	</div>

	<?php if ( ! empty( $review_request_url ) ) : ?>
		<div class="sgs-google-reviews__cta">
			<a href="<?php echo esc_url( $review_request_url ); ?>" class="sgs-google-reviews__write-review" target="_blank" rel="noopener">
				<?php esc_html_e( 'Write a Review', 'sgs-blocks' ); ?>
			</a>
		</div>
	<?php endif; ?>
	<?php
endif;

$inner_html = ob_get_clean();

// ───────────────────────────────────────────────────────────────────────────
// Output via shared wrapper helper.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// ───────────────────────────────────────────────────────────────────────────
echo SGS_Container_Wrapper::render( $attributes, $block, $inner_html, 'layout', $gr_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
