<?php
/**
 * Gallery column partial for sgs/buybox.
 *
 * Renders the .product-card__media (main image) + .product-card__thumbs
 * (thumbnail strip) using the EXACT same markup and CSS classes as
 * product-card/render.php L684-750. This is MANDATORY — the product-card
 * Interactivity store engine (sgs/product-card) depends on:
 *   - .product-card__media img with data-wp-bind--src="context.imageSrc"
 *   - .product-card__thumbs with data-wp-bind--hidden="context.thumbsHidden"
 *   - .product-card__thumb buttons with data-index="N" and aria-current
 *
 * Called via require __DIR__ . '/gallery-col.php' inside the buybox render
 * ob_start() buffer. The $buybox_def_gallery, $buybox_img_src,
 * $buybox_img_alt, and $buybox_thumbs_hidden variables are resolved in
 * render.php step 5 before this file is required.
 *
 * GROUND-TRUTH: product-card/render.php L684-750 live-read 2026-06-12:
 * confirmed .product-card__media wrapping img, .product-card__thumbs with
 * role="list" + data-wp-bind--hidden, .product-card__thumb buttons with
 * role="listitem" + data-index + aria-current. No product-card/view.js edits.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Step-10a)
 */

defined( 'ABSPATH' ) || exit;

// $buybox_def_gallery, $buybox_img_src, $buybox_img_alt, $buybox_thumbs_hidden
// are all set in render.php step 5. Guard defensively.
if ( ! isset( $buybox_def_gallery ) || ! is_array( $buybox_def_gallery ) ) {
	$buybox_def_gallery = array();
}
if ( ! isset( $buybox_img_src ) ) {
	$buybox_img_src = '';
}
if ( ! isset( $buybox_img_alt ) ) {
	$buybox_img_alt = '';
}
if ( ! isset( $buybox_thumbs_hidden ) ) {
	$buybox_thumbs_hidden = true;
}

// Resolve width/height from the first gallery item for LCP <img> hint.
$buybox_def_img_w = ( ! empty( $buybox_def_gallery[0]['w'] ) ) ? (int) $buybox_def_gallery[0]['w'] : 0;
$buybox_def_img_h = ( ! empty( $buybox_def_gallery[0]['h'] ) ) ? (int) $buybox_def_gallery[0]['h'] : 0;
?>
<?php // ── Main image (mirrors product-card L684-717 exactly, minus the optional permalink wrap). ?>
<div
	class="product-card__media"
>
<?php if ( '' !== $buybox_img_src ) : ?>
	<img
		class="product-card-img"
		src="<?php echo esc_url( $buybox_img_src ); ?>"
		alt="<?php echo esc_attr( $buybox_img_alt ); ?>"
		<?php echo $buybox_def_img_w > 0 ? 'width="' . esc_attr( (string) $buybox_def_img_w ) . '"' : ''; ?>
		<?php echo $buybox_def_img_h > 0 ? 'height="' . esc_attr( (string) $buybox_def_img_h ) . '"' : ''; ?>
		loading="eager"
		fetchpriority="high"
		decoding="async"
		data-wp-bind--src="context.imageSrc"
		data-wp-bind--alt="context.imageAlt"
	>
<?php else : ?>
	<div class="product-card__no-image" aria-hidden="true">
		<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
	</div>
<?php endif; ?>
</div><?php // end .product-card__media — aspect-ratio/overflow:hidden MUST NOT wrap the thumbnail strip. ?>

<?php // ── Thumbnail strip (mirrors product-card L719-750 exactly). ?>
<div
	class="product-card__thumbs"
	role="list"
	aria-label="<?php esc_attr_e( 'Product images', 'sgs-blocks' ); ?>"
	data-wp-bind--hidden="context.thumbsHidden"
	<?php echo $buybox_thumbs_hidden ? 'hidden' : ''; ?>
>
	<?php foreach ( $buybox_def_gallery as $buybox_thumb_idx => $buybox_thumb ) : ?>
		<?php
		/* translators: %d is the image number in the thumbnail strip, e.g. "Image 1". */
		$buybox_thumb_aria_label = esc_attr( sprintf( __( 'Image %d', 'sgs-blocks' ), $buybox_thumb_idx + 1 ) );
		?>
	<button
		type="button"
		class="product-card__thumb"
		role="listitem"
		data-index="<?php echo esc_attr( (string) $buybox_thumb_idx ); ?>"
		aria-current="<?php echo 0 === $buybox_thumb_idx ? 'true' : 'false'; ?>"
		aria-label="<?php echo $buybox_thumb_aria_label; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr applied above. ?>"
	>
		<img
			src="<?php echo esc_url( $buybox_thumb['url'] ); ?>"
			alt="<?php echo esc_attr( $buybox_thumb['alt'] ); ?>"
			<?php echo $buybox_thumb['w'] > 0 ? 'width="' . esc_attr( (string) $buybox_thumb['w'] ) . '"' : ''; ?>
			<?php echo $buybox_thumb['h'] > 0 ? 'height="' . esc_attr( (string) $buybox_thumb['h'] ) . '"' : ''; ?>
			loading="lazy"
			decoding="async"
		>
	</button>
	<?php endforeach; ?>
</div>