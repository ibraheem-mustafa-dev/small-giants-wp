<?php
/**
 * Google Reviews — Server Render
 *
 * @package SGS\Blocks
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 */

use SGS\Blocks\Google_Reviews_Settings;

$variant            = $attributes['variant'] ?? 'grid';
$card_variant       = $attributes['cardVariant'] ?? 'default';
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

if ( empty( $place_id ) ) {
	return '<p class="sgs-google-reviews__error">' . esc_html__( 'Google Reviews: No Place ID configured.', 'sgs-blocks' ) . '</p>';
}

// Fetch reviews from API.
$data = Google_Reviews_Settings::fetch_reviews( $place_id );

if ( is_wp_error( $data ) ) {
	return '<p class="sgs-google-reviews__error">' . esc_html( $data->get_error_message() ) . '</p>';
}

$all_reviews   = $data['reviews'] ?? [];
$rating        = $data['rating'] ?? 0;
$rating_count  = $data['userRatingCount'] ?? 0;
$business_name = $data['displayName']['text'] ?? '';

// Filter reviews.
$filtered_reviews = array_filter( $all_reviews, function( $review ) use ( $min_rating, $text_only, $exclude_keywords ) {
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
} );

// Sort reviews.
usort( $filtered_reviews, function( $a, $b ) use ( $sort_by ) {
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
} );

// Limit reviews.
$reviews = array_slice( $filtered_reviews, 0, $max_reviews );

// Build wrapper classes — sanitise user-influenced values.
$wrapper_classes = [
	'sgs-google-reviews',
	'sgs-google-reviews--' . sanitize_key( $variant ),
	'sgs-google-reviews--theme-' . sanitize_key( $theme ),
	'sgs-google-reviews--card-' . sanitize_key( $card_style ),
	'sgs-google-reviews--star-' . sanitize_key( $star_colour ),
	'sgs-google-reviews--cols-' . $columns,
	'sgs-google-reviews--cols-tablet-' . $columns_tablet,
	'sgs-google-reviews--cols-mobile-' . $columns_mobile,
];

$wrapper_attributes = get_block_wrapper_attributes( [
	'class'               => implode( ' ', $wrapper_classes ),
	'data-wp-interactive' => 'sgs/google-reviews',
	'data-wp-context'     => wp_json_encode( [
		'autoplay'      => $autoplay,
		'autoplaySpeed' => $autoplay_speed,
		'currentSlide'  => 0,
	] ),
	'data-wp-init'        => 'callbacks.init',
] );

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
if ( ! function_exists( 'sgs_render_stars_svg' ) ) {
	function sgs_render_stars_svg( float $star_rating ): string {
		$full_stars  = (int) floor( $star_rating );
		$half_star   = ( $star_rating - $full_stars ) >= 0.5 ? 1 : 0;
		$empty_stars = 5 - $full_stars - $half_star;

		// SVG star path — standard 5-point polygon, 24×24 viewBox.
		$star_path = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

		$label = esc_attr( sprintf(
			/* translators: %s: rating number */
			__( '%s out of 5 stars', 'sgs-blocks' ),
			number_format( $star_rating, 1 )
		) );

		$html  = '<div class="sgs-google-reviews__stars" role="img" aria-label="' . $label . '">';
		$uid   = wp_unique_id( 'star-half-' );

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

// Output schema.org markup.
$schema = [
	'@context'        => 'https://schema.org',
	'@type'           => 'LocalBusiness',
	'name'            => $business_name,
	'aggregateRating' => [
		'@type'       => 'AggregateRating',
		'ratingValue' => $rating,
		'reviewCount' => $rating_count,
	],
];

?>
<script type="application/ld+json"><?php echo wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ); ?></script>

<div <?php echo $wrapper_attributes; ?>>
	<?php if ( $show_aggregate && ! in_array( $variant, [ 'badge', 'floating-badge' ], true ) ) : ?>
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
	<?php endif; ?>

	<?php if ( in_array( $variant, [ 'badge', 'floating-badge' ], true ) ) : ?>
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
	<?php else : ?>
		<div class="sgs-google-reviews__list">
			<?php foreach ( $reviews as $review ) : ?>
				<?php
				$author       = $review['authorAttribution']['displayName'] ?? __( 'Anonymous', 'sgs-blocks' );
				$author_photo = $review['authorAttribution']['photoUri'] ?? '';
				$text         = $review['text']['text'] ?? '';
				$review_rating = $review['rating'] ?? 0;
				$publish_time = isset( $review['publishTime'] ) ? strtotime( $review['publishTime'] ) : 0;
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
									<?php echo esc_html( human_time_diff( $publish_time, current_time( 'timestamp' ) ) . ' ago' ); ?>
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
	<?php endif; ?>
</div>
