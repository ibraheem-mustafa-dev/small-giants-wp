<?php
/**
 * Server-side render for the SGS Star Rating block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$rating        = (float) ( $attributes['rating'] ?? 5 );
$max_rating    = (int) ( $attributes['maxRating'] ?? 5 );
$star_size     = (int) ( $attributes['starSize'] ?? 24 );
$star_colour   = sgs_colour_value( $attributes['starColour'] ?? 'accent' );
$empty_colour  = sgs_colour_value( $attributes['emptyColour'] ?? 'border-subtle' );
$label         = $attributes['label'] ?? '';
$show_numeric  = $attributes['showNumeric'] ?? false;
$schema_enabled    = $attributes['schemaEnabled'] ?? true;
$schema_item_name  = $attributes['schemaItemName'] ?? '';
$schema_review_count = (int) ( $attributes['schemaReviewCount'] ?? 1 );

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'sgs-star-rating',
) );

// Build star SVGs.
$stars_html = '';
$unique_id = wp_unique_id( 'sgs-star-' );

for ( $i = 1; $i <= $max_rating; $i++ ) {
	if ( $i <= floor( $rating ) ) {
		$fill = $star_colour;
	} elseif ( $i === ceil( $rating ) && fmod( $rating, 1 ) >= 0.25 ) {
		$grad_id = $unique_id . '-half-' . $i;
		$fill = "url(#$grad_id)";
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
				'reviewCount' => $schema_review_count,
			),
		), JSON_UNESCAPED_SLASHES )
	);
}

?>
<div <?php echo $wrapper_attributes; ?>>
	<div class="sgs-star-rating__stars" role="img" aria-label="<?php echo esc_attr( $aria_label ); ?>">
		<?php echo $stars_html; ?>
	</div>
	<?php if ( $show_numeric ) : ?>
		<span class="sgs-star-rating__numeric"><?php echo esc_html( $rating . '/' . $max_rating ); ?></span>
	<?php endif; ?>
	<?php if ( $label ) : ?>
		<span class="sgs-star-rating__label"><?php echo esc_html( $label ); ?></span>
	<?php endif; ?>
	<?php echo $schema_html; ?>
</div>
