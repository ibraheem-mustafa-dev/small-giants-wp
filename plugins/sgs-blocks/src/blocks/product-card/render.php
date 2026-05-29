<?php
/**
 * Server-side render for the SGS Product Card block.
 *
 * Static visual block matching the Mama's Munches mockup product-card spec
 * (mockup lines 858-914). No cart/Stripe/Woo wiring — pure presentation.
 *
 * Two variants:
 *  - standard: shows pack-size variant pills, price, primary CTA
 *  - trial:    no pills, dashed border + gradient bg, secondary CTA
 *
 * @since 1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$image         = $attributes['image'] ?? '';
$image_alt     = $attributes['imageAlt'] ?? '';
$product_name  = $attributes['productName'] ?? '';
$description   = $attributes['description'] ?? '';
$variant_style = $attributes['variantStyle'] ?? 'standard';
$trial_tag     = $attributes['trialTag'] ?? '';
$pack_sizes    = $attributes['packSizes'] ?? array();
$price_large   = $attributes['priceLarge'] ?? '';
$price_note    = $attributes['priceNote'] ?? '';
// ctaText and ctaUrl are deprecated. CTA is now rendered via sgs/multi-button InnerBlocks ($content).

$is_trial = 'trial' === $variant_style;

$classes = array( 'product-card' );
if ( $is_trial ) {
	$classes[] = 'trial-card';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

ob_start();
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>
	<?php if ( $image ) : ?>
		<img
			class="product-card-img"
			src="<?php echo esc_url( $image ); ?>"
			alt="<?php echo esc_attr( $image_alt ); ?>"
			loading="lazy"
		/>
	<?php endif; ?>
	<div class="product-card-body">
		<?php if ( $is_trial && $trial_tag ) : ?>
			<div class="trial-tag"><?php echo esc_html( $trial_tag ); ?></div>
		<?php endif; ?>
		<?php if ( $product_name ) : ?>
			<h3><?php echo esc_html( $product_name ); ?></h3>
		<?php endif; ?>
		<?php if ( $description ) : ?>
			<p class="product-desc"><?php echo esc_html( $description ); ?></p>
		<?php endif; ?>
		<?php if ( ! $is_trial && ! empty( $pack_sizes ) ) : ?>
			<div class="pill-group" role="group" aria-label="<?php echo esc_attr__( 'Choose pack size', 'sgs-blocks' ); ?>">
				<?php
				foreach ( $pack_sizes as $pack ) :
					$label    = $pack['label'] ?? '';
					$selected = ! empty( $pack['selected'] );
					if ( ! $label ) {
						continue;
					}
					?>
					<button
						type="button"
						class="pill<?php echo $selected ? ' active' : ''; ?>"
						aria-pressed="<?php echo $selected ? 'true' : 'false'; ?>"
					><?php echo esc_html( $label ); ?></button>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
		<?php if ( $price_large || $price_note ) : ?>
			<div class="price-row">
				<?php if ( $price_large ) : ?>
					<span class="price"><?php echo esc_html( $price_large ); ?></span>
				<?php endif; ?>
				<?php if ( $price_note ) : ?>
					<span class="price-note"><?php echo esc_html( $price_note ); ?></span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
		<?php
		// CTA button rendered via sgs/multi-button + sgs/button InnerBlocks.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content from WP core InnerBlocks rendering.
		echo $content;
		?>
	</div>
</div>
<?php
echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per-field above.
