<?php
/**
 * Server-side render for the SGS Star Rating block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$rating              = (float) ( $attributes['rating'] ?? 5 );
$max_rating          = (int) ( $attributes['maxRating'] ?? 5 );
$star_size           = (int) ( $attributes['starSize'] ?? 24 );
$star_colour         = sgs_colour_value( $attributes['starColour'] ?? 'accent' );
$empty_colour        = sgs_colour_value( $attributes['emptyColour'] ?? 'border-subtle' );
$label               = $attributes['label'] ?? '';
$show_numeric        = $attributes['showNumeric'] ?? false;
$schema_enabled      = $attributes['schemaEnabled'] ?? true;
$schema_item_name    = $attributes['schemaItemName'] ?? '';
$schema_review_count = (int) ( $attributes['schemaReviewCount'] ?? 1 );

// displayMode: stars-only | stars-with-value | stars-with-value-and-count
$allowed_display_modes = array( 'stars-only', 'stars-with-value', 'stars-with-value-and-count' );
$display_mode          = in_array( $attributes['displayMode'] ?? 'stars-only', $allowed_display_modes, true )
	? $attributes['displayMode']
	: 'stars-only';

/*
 * Block-style presets (2026-06-03). Exact-match the is-style-* class so
 * 'trustpilot' is not a false substring of 'trustpilot-official'.
 *   is-style-trustpilot-official : Trustpilot's own tile-star SVG badge.
 *   is-style-trustpilot          : inline SVG stars forced to Trustpilot green.
 *   default / any other style    : inline SVG stars in the configured starColour.
 */
$style_classes  = preg_split( '/\s+/', (string) ( $attributes['className'] ?? '' ), -1, PREG_SPLIT_NO_EMPTY );
$is_tp_official = in_array( 'is-style-trustpilot-official', $style_classes, true );
$is_tp_flat     = in_array( 'is-style-trustpilot', $style_classes, true ) && ! $is_tp_official;
if ( $is_tp_flat ) {
	$star_colour = '#00B67A'; // Official Trustpilot brand green — the flat-preset fill.
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'sgs-star-rating sgs-star-rating--' . esc_attr( $display_mode ),
) );

// Build the stars markup.
$stars_html = '';
$unique_id  = wp_unique_id( 'sgs-star-' );

if ( $is_tp_official ) {
	// Official Trustpilot badge: their own tile-star SVG for the (rounded) rating.
	require_once dirname( __DIR__, 3 ) . '/includes/trustpilot-helpers.php';
	$stars_html = sprintf(
		'<img class="sgs-star-rating__tp-badge" src="%s" alt="" width="125" height="24" loading="lazy" decoding="async" />',
		esc_url( sgs_trustpilot_stars_url( $rating ) )
	);
}

for ( $i = 1; ! $is_tp_official && $i <= $max_rating; $i++ ) {
	if ( $i <= floor( $rating ) ) {
		$fill = $star_colour;
	} elseif ( $i === ceil( $rating ) && fmod( $rating, 1 ) >= 0.25 ) {
		$grad_id    = $unique_id . '-half-' . $i;
		$fill       = "url(#$grad_id)";
		$stars_html .= sprintf(
			'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' .
			'<defs><linearGradient id="%s"><stop offset="50%%" stop-color="%s"/><stop offset="50%%" stop-color="%s"/></linearGradient></defs>' .
			'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="%s"/></svg>',
			$star_size, $star_size, esc_attr( $grad_id ), $star_colour, $empty_colour, $fill
		);
		continue;
	} else {
		$fill = $empty_colour;
	}

	$stars_html .= sprintf(
		'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' .
		'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="%s"/></svg>',
		$star_size, $star_size, $fill
	);
}

$aria_label = sprintf(
	/* translators: 1: rating value, 2: maximum rating */
	__( '%1$s out of %2$s stars', 'sgs-blocks' ),
	$rating,
	$max_rating
);

// Build the numeric value string for display modes that show it.
$numeric_html = '';
if ( 'stars-with-value' === $display_mode || 'stars-with-value-and-count' === $display_mode ) {
	$numeric_html = sprintf(
		'<span class="sgs-star-rating__value" aria-hidden="true">%s</span>',
		esc_html( number_format( $rating, 1 ) )
	);
}

// Build the review count string for the full display mode.
$count_html = '';
if ( 'stars-with-value-and-count' === $display_mode && $schema_review_count > 0 ) {
	$count_html = sprintf(
		'<span class="sgs-star-rating__count" aria-hidden="true">(%s)</span>',
		esc_html(
			/* translators: %s: number of reviews */
			sprintf( _n( '%s review', '%s reviews', $schema_review_count, 'sgs-blocks' ), number_format_i18n( $schema_review_count ) )
		)
	);
}

// Schema markup.
$schema_html = '';
if ( $schema_enabled && $schema_item_name ) {
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		wp_json_encode( array(
			'@context'        => 'https://schema.org',
			'@type'           => 'Product',
			'name'            => $schema_item_name,
			'aggregateRating' => array(
				'@type'       => 'AggregateRating',
				'ratingValue' => $rating,
				'bestRating'  => $max_rating,
				'worstRating' => 1,
				'reviewCount' => $schema_review_count,
			),
		), JSON_UNESCAPED_SLASHES )
	);
}

?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is safe. ?>>
	<div class="sgs-star-rating__stars" role="img" aria-label="<?php echo esc_attr( $aria_label ); ?>">
		<?php echo $stars_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from controlled SVG templates above. ?>
	</div>
	<?php if ( $numeric_html ) : ?>
		<?php echo $numeric_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>
	<?php endif; ?>
	<?php if ( $count_html ) : ?>
		<?php echo $count_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>
	<?php endif; ?>
	<?php if ( $show_numeric ) : ?>
		<span class="sgs-star-rating__numeric"><?php echo esc_html( $rating . '/' . $max_rating ); ?></span>
	<?php endif; ?>
	<?php if ( $label ) : ?>
		<span class="sgs-star-rating__label"><?php echo esc_html( $label ); ?></span>
	<?php endif; ?>
	<?php echo $schema_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output in script tag. ?>
</div>
