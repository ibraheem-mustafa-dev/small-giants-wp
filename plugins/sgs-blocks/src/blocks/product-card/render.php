<?php
/**
 * Server-side render for the SGS Product Card block.
 *
 * FR-22-6 migration: renders the card wrapper shell (variantStyle-driven
 * classes) and echoes $content (InnerBlocks) for all card content —
 * image, name, description, price, badge, and CTA.
 *
 * The scalar attributes (productName, description, priceLarge, image,
 * packSizes, trialTag, featuredTag) are retained in block.json for
 * deprecated.js back-compat only. Rendering from those scalars was
 * removed in this migration; they are no longer read here.
 *
 * Two variants (shell classes only):
 *  - standard: .product-card
 *  - trial:    .product-card .trial-card (dashed border + gradient bg)
 *  - featured: .product-card .featured-card
 *
 * @since 1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (all card content).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$variant_style = $attributes['variantStyle'] ?? 'standard';

$classes = array( 'product-card' );
if ( 'trial' === $variant_style ) {
	$classes[] = 'trial-card';
}
if ( 'featured' === $variant_style ) {
	$classes[] = 'featured-card';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>
	<?php
	// All card content (image, heading, description, price, badge, CTA)
	// is rendered via InnerBlocks. No scalar-attr rendering — R-22-14.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
	echo $content;
	?>
</div>
