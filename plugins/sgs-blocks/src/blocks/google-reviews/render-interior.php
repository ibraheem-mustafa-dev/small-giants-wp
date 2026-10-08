<?php
/**
 * Google Reviews — interior HTML: header, actions, ratings breakdown and the review rail, captured between ob_start() and ob_get_clean().
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $variant, $reviews, $all_reviews, $data, $rating, $rating_count and the $gr_* locals.
 * Writes: $inner_html and the $gr_* interior locals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

// "N review(s)" for the aggregate; only called when the count is above zero.
$gr_count_label = static function ( int $count ): string {
	// Plain __() rather than _n(): the shared QA render harness stubs __() but not _n().
	/* translators: %s: number of reviews. */
	$label = 1 === $count ? __( '%s review', 'sgs-blocks' ) : __( '%s reviews', 'sgs-blocks' );
	return sprintf( $label, number_format( $count ) );
};

// The two header buttons ("See all reviews", "Write a review"). They sit at the end of the header row while
// that row is drawn, otherwise below the reviews as before. Each is drawn only when it has a link.
$gr_actions_html = '';
if ( '' !== $gr_see_all_url || ! empty( $review_request_url ) ) {
	$gr_actions_html = '<div class="sgs-google-reviews__cta">';
	if ( '' !== $gr_see_all_url ) {
		$gr_actions_html .= '<a href="' . esc_url( $gr_see_all_url ) . '" class="sgs-google-reviews__see-all" target="_blank" rel="noopener">'
			. esc_html( '' !== $gr_see_all_label ? $gr_see_all_label : __( 'See all reviews', 'sgs-blocks' ) ) . '</a>';
	}
	if ( ! empty( $review_request_url ) ) {
		$gr_actions_html .= '<a href="' . esc_url( $review_request_url ) . '" class="sgs-google-reviews__write-review" target="_blank" rel="noopener">'
			. esc_html( '' !== $gr_write_label ? $gr_write_label : __( 'Write a review', 'sgs-blocks' ) ) . '</a>';
	}
	$gr_actions_html .= '</div>';
}

$gr_google_logo_url = plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' );

/*
 * The Google attribution (Places API policy): Google's plain "Google" wordmark at a fixed 18px high with its
 * clear space, on every render of every variant. For live API data the policy's text form is met as well by
 * the one "View on Google Maps" link to the place when Google sent its googleMapsUri (the policy: "In cases
 * where space is limited, the text Google Maps is acceptable."). The colour wordmark is the default; the
 * white one is shown by style.css on a dark ground (theme-dark, or a .sgs-on-dark surface), so there is no
 * setting for it.
 */
$gr_new_tab_hint = '<span class="sgs-sr-only">' . esc_html__( ' (opens in a new tab)', 'sgs-blocks' ) . '</span>';
$gr_https_url    = static function ( $url ): string {
	$url = is_string( $url ) ? trim( $url ) : '';
	return 1 === preg_match( '#^https://#i', $url ) ? $url : '';
};
$gr_logo_img     = static function ( string $tone ): string {
	// The wordmark's viewBox is 272x92, so 18px high is 53px wide (272 / 92 * 18 = 53.2, rounded).
	$file = 'colour' === $tone ? 'google-wordmark-colour.svg' : 'google-wordmark-light.svg';
	return '<img src="' . esc_url( plugins_url( 'assets/' . $file, SGS_BLOCKS_PATH . 'sgs-blocks.php' ) ) . '"'
		. ' alt="Google" class="sgs-google-reviews__google-logo sgs-google-reviews__google-logo--' . $tone . '" width="53" height="18" />';
};

$gr_place_maps_url   = 'synced' === $data_source ? $gr_https_url( $data['googleMapsUri'] ?? '' ) : '';
$gr_attribution_html = '<div class="sgs-google-reviews__attribution">' . $gr_logo_img( 'colour' ) . $gr_logo_img( 'light' );
if ( '' !== $gr_place_maps_url ) {
	$gr_attribution_html .= '<a href="' . esc_url( $gr_place_maps_url ) . '" class="sgs-google-reviews__maps-link sgs-google-reviews__maps-link--place" target="_blank" rel="noopener noreferrer">'
		. esc_html__( 'View on Google Maps', 'sgs-blocks' ) . $gr_new_tab_hint . '</a>';
}
$gr_attribution_html .= '</div>';
$gr_header_shown      = $show_aggregate && ( $has_rating || $has_count );

if ( $gr_header_shown ) :
	?>
	<div class="sgs-google-reviews__aggregate">
		<?php // The logo and the rating text are ONE group at their natural width, so the buttons either sit beside it or drop below it together (never squeezing it). ?>
		<div class="sgs-google-reviews__aggregate-main">
		<div class="sgs-google-reviews__aggregate-text">
			<?php if ( '' !== $gr_source_label ) : ?>
				<span class="sgs-google-reviews__source-label"><?php echo esc_html( $gr_source_label ); ?></span>
			<?php endif; ?>
			<?php if ( $has_rating || $has_count ) : ?>
			<div class="sgs-google-reviews__score-row">
				<?php if ( $has_rating ) : ?>
				<strong class="sgs-google-reviews__score"><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<?php endif; ?>
				<?php
				if ( $has_rating ) {
					echo sgs_render_stars_svg( $rating, $gr_star_stroke_grad['defs'], 'sgs-google-reviews__aggregate-stars' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}
				if ( $has_count ) {
					echo '<span class="sgs-google-reviews__count">' . esc_html( $gr_count_label( $rating_count ) ) . '</span>';
				}
				?>
			</div>
			<?php endif; ?>
		</div>
		<?php echo $gr_attribution_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only. ?>
		</div>
		<?php echo $gr_actions_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only. ?>
	</div>
	<?php
endif;

// ───────────────────────────────────────────────────────────────────────────
// Ratings breakdown — per-star distribution bars (5★ … 1★).
// Counts are derived from the available reviews ($all_reviews); the Google
// Places API returns no histogram, so the sample of returned reviews is the
// best available source. WCAG: each row carries a visible numeric star label
// + the count + an aria-label — meaning is NOT conveyed by the bar colour alone.
// Hidden when there are no reviews to count.
// ───────────────────────────────────────────────────────────────────────────
if ( $show_breakdown && ! empty( $all_reviews ) ) :
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
		<?php $gr_star_position = 0; ?>
		<div class="sgs-google-reviews__breakdown" role="table" aria-label="<?php echo esc_attr__( 'Rating breakdown by number of stars', 'sgs-blocks' ); ?>">
			<?php foreach ( $gr_star_counts as $gr_stars => $gr_count ) : ?>
				<?php
				$gr_pct = $gr_total > 0 ? round( ( $gr_count / $gr_total ) * 100 ) : 0;
				++$gr_star_position;
				// gr_pct VARIES per star row (FR-32-4, D345), so it cannot be a
				// single scoped rule on the block root; emitted into a
				// `:nth-child(N)` scoped rule instead (same mechanism as
				// sgs/social-icons' / sgs/pricing-table's per-item values) — every
				// row renders `.sgs-google-reviews__breakdown-row` unconditionally
				// (all 5 star tiers), so position is stable.
				$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__breakdown-row:nth-child(' . $gr_star_position . ') .sgs-google-reviews__breakdown-fill{--sgs-gr-pct:' . sgs_css_length_sanitise( $gr_pct ) . '%;}';
				?>
				<div class="sgs-google-reviews__breakdown-row" role="row">
					<span class="sgs-google-reviews__breakdown-label" role="cell">
						<?php
						/* translators: %d: number of stars (1-5). */
						echo esc_html( sprintf( _n( '%d star', '%d stars', $gr_stars, 'sgs-blocks' ), $gr_stars ) );
						?>
					</span>
					<span class="sgs-google-reviews__breakdown-bar" role="cell" aria-hidden="true">
						<span class="sgs-google-reviews__breakdown-fill"></span>
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

// The header does not carry it: it still prints, on its own, above the reviews.
if ( ! $gr_header_shown ) {
	echo $gr_attribution_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only.
}

/*
 * Slider navigation is only meaningful for the slider variant with more than one review: anything
 * else has nothing to navigate between. $gr_nav_enabled is the single gate for the shared navigation
 * (includes/helpers-slider-nav.php: arrows, dots, the footnote's slot and the placement classes), the
 * rail class it lays out, and the scroll-sync directive, so switching arrows off or choosing a
 * pagination without dots REMOVES that markup rather than hiding it (no dead controls). The arrows
 * are the slider's single-pointer alternative to dragging (WCAG 2.5.7).
 */
$gr_nav_enabled = ( 'slider' === $variant && count( $reviews ) > 1 );
// The footnote takes the navigation's leading slot when there is one, so it shares the arrows' row.
$gr_footnote_html = '' !== $gr_footnote
	? '<p class="' . esc_attr( 'sgs-google-reviews__footnote' . ( $gr_nav_enabled ? ' sgs-slider-nav__lead' : '' ) ) . '">' . esc_html( $gr_footnote ) . '</p>'
	: '';
$gr_list_class    = 'sgs-google-reviews__list' . ( $gr_nav_enabled ? ' sgs-slider-nav__rail' : '' );
// The active dot is re-measured on scroll only when there are dots to keep in step.
$gr_list_sync_attr = ( $gr_nav_enabled && 'dots' === $gr_pagination ) ? ' data-wp-on--scroll="actions.syncActiveDot"' : '';
ob_start();
?>
<div
	class="<?php echo esc_attr( $gr_list_class ); ?>"
	<?php echo $sgs_gr_list_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from literal strings, no dynamic value. ?>
	<?php echo $gr_list_sync_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal string, no dynamic value. ?>
>
	<?php $gr_card_n = 0; ?>
	<?php foreach ( $reviews as $review ) : ?>
		<?php
		++$gr_card_n;
		$author       = ( $review['authorAttribution']['displayName'] ?? '' ) ?: __( 'Anonymous', 'sgs-blocks' );
		$author_photo = $review['authorAttribution']['photoUri'] ?? '';
		$author_url   = $gr_https_url( $review['authorAttribution']['uri'] ?? '' );
		$review_maps  = $gr_https_url( $review['googleMapsUri'] ?? '' );
		$text         = $review['text']['text'] ?? '';
		// Absent for a written review with no rating: no stars are drawn for it.
		$review_rating = $review['rating'] ?? null;
		$publish_time  = ! empty( $review['publishTime'] ) ? strtotime( $review['publishTime'] ) : 0;
		// Written reviews only: the date as typed, the reviewer detail line and the initials colour.
		$date_label  = (string) ( $review['dateLabel'] ?? '' );
		$review_meta = (string) ( $review['meta'] ?? '' );
		$review_url  = (string) ( $review['reviewUrl'] ?? '' );
		if ( ! empty( $review['avatarColour'] ) ) {
			// One scoped rule per card (the registry's nth-child pattern), never an inline style.
			$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__list > .sgs-google-reviews__review:nth-child(' . $gr_card_n . ') .sgs-google-reviews__avatar-initials{background:' . sgs_colour_value( (string) $review['avatarColour'] ) . ';}';
		}
		?>
		<article class="sgs-google-reviews__review">
			<div class="sgs-google-reviews__review-header">
				<div class="sgs-google-reviews__avatar">
					<?php if ( ! empty( $author_photo ) ) : ?>
						<img
							src="<?php echo esc_url( $author_photo ); ?>"
							alt=""
							loading="lazy"
							width="48"
							height="48"
							<?php echo $gr_media_classes ? 'class="' . esc_attr( implode( ' ', $gr_media_classes ) ) . '"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped via esc_attr() above. ?>
						/>
					<?php else : ?>
						<div class="sgs-google-reviews__avatar-initials">
							<?php echo esc_html( strtoupper( mb_substr( $author, 0, 1 ) ) ); ?>
						</div>
					<?php endif; ?>
				</div>

				<?php if ( '' !== $author_url ) : ?>
					<a href="<?php echo esc_url( $author_url ); ?>" class="sgs-google-reviews__author" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $author ); ?><?php echo $gr_new_tab_hint; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_html__() only. ?></a>
				<?php else : ?>
					<strong class="sgs-google-reviews__author"><?php echo esc_html( $author ); ?></strong>
				<?php endif; ?>

				<?php if ( '' !== $review_meta ) : ?>
					<span class="sgs-google-reviews__meta"><?php echo esc_html( $review_meta ); ?></span>
				<?php endif; ?>

				<?php if ( $gr_show_card_logo ) : ?>
					<?php
					$gr_card_logo_url = '' !== $review_url ? $review_url : $gr_see_all_url;
					if ( '' !== $gr_card_logo_url ) {
						?>
						<a href="<?php echo esc_url( $gr_card_logo_url ); ?>" class="sgs-google-reviews__card-logo-link" target="_blank" rel="noopener noreferrer">
							<img
								src="<?php echo esc_url( $gr_google_logo_url ); ?>"
								alt=""
								class="sgs-google-reviews__card-logo"
								width="17"
								height="17"
								aria-hidden="true"
							/>
							<span class="sgs-sr-only"><?php echo esc_html__( 'View on Google', 'sgs-blocks' ); ?></span>
						</a>
						<?php
					} else {
						?>
						<img
							src="<?php echo esc_url( $gr_google_logo_url ); ?>"
							alt=""
							class="sgs-google-reviews__card-logo"
							width="17"
							height="17"
							aria-hidden="true"
						/>
						<?php
					}
					?>
				<?php endif; ?>
			</div>

			<div class="sgs-google-reviews__review-content">
				<?php if ( null !== $review_rating ) : ?>
					<?php echo sgs_render_stars_svg( $review_rating, $gr_star_stroke_grad['defs'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<?php endif; ?>

				<?php if ( $show_date && ( $publish_time || '' !== $date_label ) ) : ?>
					<time class="sgs-google-reviews__date"<?php echo $publish_time ? ' datetime="' . esc_attr( gmdate( 'Y-m-d', $publish_time ) ) . '"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the datetime value is escaped above, the rest is literal. ?>>
						<?php echo esc_html( '' !== $date_label ? $date_label : human_time_diff( $publish_time, time() ) . ' ago' ); ?>
					</time>
				<?php endif; ?>

				<?php if ( ! empty( $text ) ) : ?>
					<p class="sgs-google-reviews__text"><?php echo esc_html( $text ); ?></p>
				<?php endif; ?>

				<?php if ( '' !== $review_maps ) : ?>
					<a href="<?php echo esc_url( $review_maps ); ?>" class="sgs-google-reviews__maps-link" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'View on Google Maps', 'sgs-blocks' ); ?><?php echo $gr_new_tab_hint; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_html__() only. ?></a>
				<?php endif; ?>

				<?php if ( $gr_show_review_link && '' !== $review_url ) : ?>
					<a href="<?php echo esc_url( $review_url ); ?>" class="sgs-google-reviews__review-link" target="_blank" rel="noopener"><?php echo esc_html( '' !== $gr_review_link_text ? $gr_review_link_text : __( 'Read the full review', 'sgs-blocks' ) ); ?></a>
				<?php endif; ?>
			</div>
		</article>
	<?php endforeach; ?>
</div>
<?php
$gr_rail_html = (string) ob_get_clean();

if ( $gr_nav_enabled ) {
	sgs_slider_nav_enqueue_style();
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every part is escaped inside sgs_slider_nav_render() or above (rail, footnote).
	echo sgs_slider_nav_render(
		array(
			'block'           => 'sgs-google-reviews',
			'placement'       => $gr_nav_position,
			'pagination'      => $gr_pagination,
			'show_arrows'     => (bool) $show_arrows,
			'rail_html'       => $gr_rail_html,
			'lead_html'       => $gr_footnote_html,
			'count'           => count( $reviews ),
			'labels'          => array(
				'prev' => __( 'Previous review', 'sgs-blocks' ),
				'next' => __( 'Next review', 'sgs-blocks' ),
				'dots' => __( 'Review pagination', 'sgs-blocks' ),
				/* translators: %d: review number (1-indexed). */
				'dot'  => __( 'Go to review %d', 'sgs-blocks' ),
			),
			'prev_directives' => array( 'data-wp-on--click' => 'actions.prevSlide' ),
			'next_directives' => array( 'data-wp-on--click' => 'actions.nextSlide' ),
			'dot_directives'  => array( 'data-wp-on--click' => 'actions.goToSlide' ),
		)
	);
} else {
	echo $gr_rail_html . $gr_footnote_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the rail is escaped where it is built, the footnote above.
}
?>

<?php if ( ! $gr_header_shown ) : ?>
	<?php echo $gr_actions_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only. ?>
<?php endif; ?>
<?php

$inner_html = ob_get_clean();
