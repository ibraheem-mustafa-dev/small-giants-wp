<?php
/**
 * Trustpilot Reviews — Server-rendered output for sgs/trustpilot-reviews.
 *
 * Renders a Trustpilot-styled reviews block. Data source can be inline
 * (reviews array in block attributes), synced (read from wp_options
 * 'sgs_trustpilot_data', populated by the sync mechanism in a future
 * release), or placeholder demo content for editor previews.
 *
 * WS-4: OUTER wrapper is now rendered by SGS_Container_Wrapper (kind='layout').
 * Carries block-specific classes + styles + data-* attrs via opts.
 *
 * Helpers (score-to-label mapping, asset URLs, relative dates) live in
 * includes/trustpilot-helpers.php — kept outside the render template so
 * multiple block instances on the same page do not redeclare functions.
 *
 * @package SGS\Blocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var \WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ───────────────────────────────────────────────────────────────────────────
// Attribute resolution
// ───────────────────────────────────────────────────────────────────────────

$variant            = isset( $attributes['variant'] ) ? $attributes['variant'] : 'carousel';
$data_source        = isset( $attributes['dataSource'] ) ? sanitize_key( $attributes['dataSource'] ) : 'synced';
$empty_state        = isset( $attributes['emptyState'] ) ? $attributes['emptyState'] : 'hide';
$business_url       = isset( $attributes['businessUnitUrl'] ) ? $attributes['businessUnitUrl'] : '';
$reviews_attr       = isset( $attributes['reviews'] ) ? $attributes['reviews'] : array();
$trust_score        = isset( $attributes['trustScore'] ) ? floatval( $attributes['trustScore'] ) : 0.0;
$trust_score_label  = isset( $attributes['trustScoreLabel'] ) ? $attributes['trustScoreLabel'] : '';
$total_reviews      = isset( $attributes['totalReviews'] ) ? intval( $attributes['totalReviews'] ) : 0;
$reviews_average    = isset( $attributes['reviewsAverage'] ) ? floatval( $attributes['reviewsAverage'] ) : 0.0;
$show_source_header = isset( $attributes['showSourceHeader'] ) ? (bool) $attributes['showSourceHeader'] : true;
$show_subtitle      = isset( $attributes['showSubtitle'] ) ? (bool) $attributes['showSubtitle'] : false;
$subtitle_text      = isset( $attributes['subtitleText'] ) ? $attributes['subtitleText'] : 'Showing our latest reviews';
$show_logo          = isset( $attributes['showTrustpilotLogo'] ) ? (bool) $attributes['showTrustpilotLogo'] : true;
$show_verified      = isset( $attributes['showVerifiedBadge'] ) ? (bool) $attributes['showVerifiedBadge'] : true;
$show_date          = isset( $attributes['showDate'] ) ? (bool) $attributes['showDate'] : true;
$show_author        = isset( $attributes['showAuthor'] ) ? (bool) $attributes['showAuthor'] : true;
$show_schema        = isset( $attributes['showSchema'] ) ? (bool) $attributes['showSchema'] : true;
$columns            = isset( $attributes['columns'] ) ? intval( $attributes['columns'] ) : 3;
$columns_tablet     = isset( $attributes['columnsTablet'] ) ? intval( $attributes['columnsTablet'] ) : 2;
$columns_mobile     = isset( $attributes['columnsMobile'] ) ? intval( $attributes['columnsMobile'] ) : 1;
$theme              = isset( $attributes['theme'] ) ? $attributes['theme'] : 'light';
$card_style         = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$autoplay           = isset( $attributes['autoplay'] ) ? (bool) $attributes['autoplay'] : false;
$autoplay_speed     = isset( $attributes['autoplaySpeed'] ) ? intval( $attributes['autoplaySpeed'] ) : 5000;
$show_dots          = isset( $attributes['showDots'] ) ? (bool) $attributes['showDots'] : false;
$show_arrows        = isset( $attributes['showArrows'] ) ? (bool) $attributes['showArrows'] : true;

// DMCC FR-30-10: whitelist the data source. Any unsanitised / invalid / REST-injected
// value must NEVER fall through to fake demo reviews — coerce it to the safe synced
// (empty-state) path, which renders genuine data or nothing, never placeholders.
if ( ! in_array( $data_source, array( 'synced', 'inline', 'placeholder' ), true ) ) {
	$data_source = 'synced';
}

// ───────────────────────────────────────────────────────────────────────────
// Data source resolution
// ───────────────────────────────────────────────────────────────────────────

// Placeholder reviews used in editor preview and when no data configured.
// These mirror Trustpilot's own demo content so previews look authentic.
$placeholder_reviews = array(
	array(
		'author'        => 'Steve',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-2 minutes' ) ),
		'reviewBody'    => 'Never had a better experience than with this awesome company.',
		'title'         => 'THIS WAS AWESOME!',
		'isVerified'    => true,
	),
	array(
		'author'        => 'Thomas',
		'rating'        => 4,
		'datePublished' => gmdate( 'c', strtotime( '-3 hours' ) ),
		'reviewBody'    => 'The product was so nice, easy to use, would recommend.',
		'title'         => 'Really liked it',
		'isVerified'    => true,
	),
	array(
		'author'        => 'Wendy',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-4 days' ) ),
		'reviewBody'    => 'Five stars all the way. Great service, fast delivery, lovely team.',
		'title'         => '',
		'isVerified'    => true,
	),
	array(
		'author'        => 'April',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-5 hours' ) ),
		'reviewBody'    => 'Nothing broke on the way, and it arrived on time.',
		'title'         => 'I guess it\'s fine',
		'isVerified'    => true,
	),
);

$reviews         = array();
$synced_is_empty = false; // True when dataSource=synced but no live data is available.

if ( 'synced' === $data_source ) {
	$synced = get_option( 'sgs_trustpilot_data', null );
	if ( is_array( $synced ) && ! empty( $synced['reviews'] ) ) {
		$reviews = $synced['reviews'];
		if ( 0.0 === $trust_score ) {
			$trust_score = floatval( isset( $synced['trust_score'] ) ? $synced['trust_score'] : 0 );
		}
		if ( '' === $trust_score_label ) {
			$trust_score_label = isset( $synced['trust_score_label'] ) ? $synced['trust_score_label'] : '';
		}
		if ( 0 === $total_reviews ) {
			$total_reviews = intval( isset( $synced['review_count'] ) ? $synced['review_count'] : count( $reviews ) );
		}
		if ( 0.0 === $reviews_average ) {
			$reviews_average = floatval( isset( $synced['reviews_average'] ) ? $synced['reviews_average'] : 0 );
		}
		if ( '' === $business_url ) {
			$business_url = isset( $synced['source_url'] ) ? $synced['source_url'] : '';
		}
	} else {
		// No live sync data — never render placeholder reviews on the frontend (DMCC compliance).
		$synced_is_empty = true;
	}
} elseif ( 'inline' === $data_source && ! empty( $reviews_attr ) ) {
	$reviews = $reviews_attr;
} elseif ( 'placeholder' === $data_source ) {
	// Placeholder is for editor preview / explicit operator demo only. This is the
	// ONLY path that may render demo data, and only via an explicit dataSource choice.
	$reviews = $placeholder_reviews;
} else {
	// DMCC FR-30-10: any other case (e.g. inline with no reviews) renders nothing —
	// never placeholder/fake reviews on a live frontend.
	$reviews = array();
}

// ───────────────────────────────────────────────────────────────────────────
// Empty-state handling (DMCC FR-30-10): when synced source has no live data,
// render the operator-chosen empty state and return early — never a broken gap.
// ───────────────────────────────────────────────────────────────────────────

if ( $synced_is_empty ) {
	if ( 'coming-soon' === $empty_state ) {
		$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'sgs-trustpilot-reviews sgs-trustpilot-reviews--empty-state' ) );
		printf(
			'<div %s><p class="sgs-trustpilot-reviews__coming-soon">%s</p></div>',
			$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped attribute string.
			esc_html__( 'Reviews coming soon', 'sgs-blocks' )
		);
	}
	// emptyState=hide: output nothing — no gap, no layout break.
	return;
}

// Auto-derive aggregates when missing.
if ( 0 === $total_reviews ) {
	$total_reviews = count( $reviews );
}
if ( 0.0 === $reviews_average && ! empty( $reviews ) ) {
	$sum = 0.0;
	foreach ( $reviews as $r ) {
		$sum += floatval( isset( $r['rating'] ) ? $r['rating'] : 0 );
	}
	$reviews_average = $total_reviews > 0 ? round( $sum / $total_reviews, 1 ) : 0.0;
}
if ( 0.0 === $trust_score ) {
	$trust_score = $reviews_average;
}
if ( '' === $trust_score_label ) {
	$trust_score_label = sgs_trustpilot_score_label( $trust_score );
}

// ───────────────────────────────────────────────────────────────────────────
// Wrapper: own classes, styles, and data-* attrs for the shared helper.
// ───────────────────────────────────────────────────────────────────────────

$tp_extra_classes = array(
	'sgs-trustpilot-reviews',
	'sgs-trustpilot-reviews--' . sanitize_html_class( $variant ),
	'sgs-trustpilot-reviews--theme-' . sanitize_html_class( $theme ),
	'sgs-trustpilot-reviews--card-' . sanitize_html_class( $card_style ),
);

$tp_extra_styles = array(
	sprintf(
		'--sgs-tp-cols:%d;--sgs-tp-cols-tablet:%d;--sgs-tp-cols-mobile:%d',
		max( 1, $columns ),
		max( 1, $columns_tablet ),
		max( 1, $columns_mobile )
	),
);

// data-* attrs consumed by view.js for carousel + autoplay behaviour.
// Must be carried via extra_attrs so the vanilla-JS carousel selectors work.
$tp_extra_attrs = array(
	'data-autoplay'       => $autoplay ? 'true' : 'false',
	'data-autoplay-speed' => $autoplay_speed,
	'data-variant'        => esc_attr( $variant ),
);

$tp_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $tp_extra_classes,
	'extra_styles'  => $tp_extra_styles,
	'extra_attrs'   => $tp_extra_attrs,
);

// ───────────────────────────────────────────────────────────────────────────
// Brand asset URLs
// ───────────────────────────────────────────────────────────────────────────

$logo_filename = ( 'dark' === $theme ) ? 'logo-white.svg' : 'logo-black.svg';
$logo_url      = sgs_trustpilot_asset_url( $logo_filename );
$shield_url    = sgs_trustpilot_asset_url( 'trustpilot-shield.svg' );

$is_carousel = ( 'carousel' === $variant || 'mini-carousel' === $variant );

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

if ( $show_source_header ) :
	?>
	<div class="sgs-trustpilot-reviews__header">
		<?php if ( '' !== $trust_score_label ) : ?>
			<span class="sgs-trustpilot-reviews__label"><?php echo esc_html( $trust_score_label ); ?></span>
		<?php endif; ?>

		<img
			class="sgs-trustpilot-reviews__header-stars"
			src="<?php echo esc_url( sgs_trustpilot_stars_url( $trust_score ) ); ?>"
			alt="
			<?php
			/* translators: %s = trust score, e.g. "4.0 out of 5 stars" */
			echo esc_attr( sprintf( __( '%s out of 5 stars', 'sgs-blocks' ), number_format( $trust_score, 1 ) ) );
			?>
			"
			width="125"
			height="24"
			loading="eager"
		/>

		<span class="sgs-trustpilot-reviews__aggregate">
			<?php
			/* translators: %s = trust score, e.g. "4.0" */
			printf( esc_html__( 'Rated %s / 5 based on ', 'sgs-blocks' ), esc_html( number_format( $trust_score, 1 ) ) );

			if ( '' !== $business_url ) {
				printf(
					'<a class="sgs-trustpilot-reviews__count-link" href="%s" target="_blank" rel="noopener nofollow">%s</a>',
					esc_url( $business_url ),
					/* translators: %d = number of reviews */
					esc_html( sprintf( _n( '%d review', '%d reviews', $total_reviews, 'sgs-blocks' ), $total_reviews ) )
				);
			} else {
				/* translators: %d = number of reviews */
				echo esc_html( sprintf( _n( '%d review', '%d reviews', $total_reviews, 'sgs-blocks' ), $total_reviews ) );
			}

			if ( $show_logo ) :
				?>
				<span class="sgs-trustpilot-reviews__on"><?php esc_html_e( ' on ', 'sgs-blocks' ); ?></span>
				<?php if ( '' !== $business_url ) : ?>
					<a class="sgs-trustpilot-reviews__header-logo-link" href="<?php echo esc_url( $business_url ); ?>" target="_blank" rel="noopener nofollow" aria-label="<?php esc_attr_e( 'Read reviews on Trustpilot (opens in new tab)', 'sgs-blocks' ); ?>">
						<img
							class="sgs-trustpilot-reviews__header-logo"
							src="<?php echo esc_url( $logo_url ); ?>"
							alt="Trustpilot"
							width="93"
							height="22"
							loading="eager"
						/>
					</a>
				<?php else : ?>
					<img
						class="sgs-trustpilot-reviews__header-logo"
						src="<?php echo esc_url( $logo_url ); ?>"
						alt="Trustpilot"
						width="93"
						height="22"
						loading="eager"
					/>
				<?php endif; ?>
				<?php
			endif;
			?>
		</span>
	</div>
	<?php
endif;

if ( $show_subtitle && '' !== $subtitle_text ) :
	?>
	<p class="sgs-trustpilot-reviews__subtitle"><?php echo esc_html( $subtitle_text ); ?></p>
	<?php
endif;
?>

<div class="sgs-trustpilot-reviews__viewport">

	<?php if ( $is_carousel && $show_arrows ) : ?>
		<button class="sgs-trustpilot-reviews__arrow sgs-trustpilot-reviews__arrow--prev" type="button" aria-label="<?php esc_attr_e( 'Previous review', 'sgs-blocks' ); ?>">
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>
		</button>
	<?php endif; ?>

	<div
		class="sgs-trustpilot-reviews__track"
		tabindex="0"
		role="group"
		aria-label="<?php esc_attr_e( 'Customer reviews', 'sgs-blocks' ); ?>"
	>
		<?php
		foreach ( $reviews as $idx => $r ) :
			$rating       = floatval( isset( $r['rating'] ) ? $r['rating'] : 0 );
			$author       = isset( $r['author'] ) ? $r['author'] : '';
			$date         = isset( $r['datePublished'] ) ? $r['datePublished'] : '';
			$body         = isset( $r['reviewBody'] ) ? $r['reviewBody'] : '';
			$review_title = isset( $r['title'] ) ? $r['title'] : '';
			$is_verified  = isset( $r['isVerified'] ) ? (bool) $r['isVerified'] : true;
			?>
			<article class="sgs-trustpilot-reviews__card" data-index="<?php echo esc_attr( $idx ); ?>">

				<header class="sgs-trustpilot-reviews__card-header">
					<img
						class="sgs-trustpilot-reviews__card-stars"
						src="<?php echo esc_url( sgs_trustpilot_stars_url( $rating ) ); ?>"
						alt="
						<?php
						/* translators: %d = star rating 1-5 */
						echo esc_attr( sprintf( __( '%d out of 5 stars', 'sgs-blocks' ), (int) $rating ) );
						?>
						"
						width="125"
						height="24"
						loading="lazy"
					/>

					<?php if ( $show_verified && $is_verified ) : ?>
						<span class="sgs-trustpilot-reviews__verified">
							<img
								class="sgs-trustpilot-reviews__verified-icon"
								src="<?php echo esc_url( $shield_url ); ?>"
								alt=""
								width="16"
								height="16"
								loading="lazy"
							/>
							<span class="sgs-trustpilot-reviews__verified-text"><?php esc_html_e( 'Verified', 'sgs-blocks' ); ?></span>
						</span>
					<?php endif; ?>
				</header>

				<?php if ( '' !== $review_title ) : ?>
					<h3 class="sgs-trustpilot-reviews__card-title"><?php echo esc_html( $review_title ); ?></h3>
				<?php endif; ?>

				<div class="sgs-trustpilot-reviews__card-body"><?php echo wp_kses_post( wpautop( $body ) ); ?></div>

				<?php if ( $show_author || $show_date ) : ?>
					<footer class="sgs-trustpilot-reviews__card-meta">
						<?php if ( $show_author && '' !== $author ) : ?>
							<span class="sgs-trustpilot-reviews__card-author"><?php echo esc_html( $author ); ?></span>
						<?php endif; ?>

						<?php if ( $show_date && '' !== $date ) : ?>
							<?php if ( $show_author && '' !== $author ) : ?>
								<span class="sgs-trustpilot-reviews__card-sep">, </span>
							<?php endif; ?>
							<time class="sgs-trustpilot-reviews__card-date" datetime="<?php echo esc_attr( $date ); ?>">
								<?php echo esc_html( sgs_trustpilot_relative_date( $date ) ); ?>
							</time>
						<?php endif; ?>
					</footer>
				<?php endif; ?>
			</article>
			<?php
		endforeach;
		?>
	</div>

	<?php if ( $is_carousel && $show_arrows ) : ?>
		<button class="sgs-trustpilot-reviews__arrow sgs-trustpilot-reviews__arrow--next" type="button" aria-label="<?php esc_attr_e( 'Next review', 'sgs-blocks' ); ?>">
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg>
		</button>
	<?php endif; ?>

</div>

<?php if ( $is_carousel && $show_dots && count( $reviews ) > 1 ) : ?>
	<div class="sgs-trustpilot-reviews__dots" role="tablist" aria-label="<?php esc_attr_e( 'Review pagination', 'sgs-blocks' ); ?>">
		<?php foreach ( $reviews as $idx => $r ) : ?>
			<button
				class="sgs-trustpilot-reviews__dot<?php echo 0 === $idx ? ' is-active' : ''; ?>"
				type="button"
				role="tab"
				aria-selected="<?php echo 0 === $idx ? 'true' : 'false'; ?>"
				data-index="<?php echo esc_attr( $idx ); ?>"
				aria-label="
				<?php
				/* translators: %d = review index */
				echo esc_attr( sprintf( __( 'Go to review %d', 'sgs-blocks' ), $idx + 1 ) );
				?>
				"
			></button>
		<?php endforeach; ?>
	</div>
	<?php
endif;

$inner_html = ob_get_clean();

// ───────────────────────────────────────────────────────────────────────────
// Schema.org JSON-LD (appended after the wrapper)
// ───────────────────────────────────────────────────────────────────────────

$schema_html = '';
if ( $show_schema && ! empty( $reviews ) ) {
	$schema_reviews = array();
	foreach ( $reviews as $r ) {
		$schema_reviews[] = array(
			'@type'         => 'Review',
			'author'        => array(
				'@type' => 'Person',
				'name'  => isset( $r['author'] ) ? $r['author'] : '',
			),
			'datePublished' => isset( $r['datePublished'] ) ? $r['datePublished'] : '',
			'reviewRating'  => array(
				'@type'       => 'Rating',
				'ratingValue' => floatval( isset( $r['rating'] ) ? $r['rating'] : 0 ),
				'bestRating'  => 5,
				'worstRating' => 1,
			),
			'reviewBody'    => isset( $r['reviewBody'] ) ? $r['reviewBody'] : '',
		);
	}

	$schema = array(
		'@context'        => 'https://schema.org',
		'@type'           => 'Organization',
		'name'            => get_bloginfo( 'name' ),
		'aggregateRating' => array(
			'@type'       => 'AggregateRating',
			'ratingValue' => $reviews_average > 0 ? $reviews_average : $trust_score,
			'reviewCount' => $total_reviews,
			'bestRating'  => 5,
			'worstRating' => 1,
		),
		'review'          => $schema_reviews,
	);

	$schema_html = '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
}

// ───────────────────────────────────────────────────────────────────────────
// Output: schema JSON-LD first, then the outer wrapper via the shared helper.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// ───────────────────────────────────────────────────────────────────────────
echo $schema_html;
echo SGS_Container_Wrapper::render( $attributes, $block, $inner_html, 'layout', $tp_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
