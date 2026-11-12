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
 * role="group" + data-wp-bind--hidden, .product-card__thumb buttons with
 * data-index + aria-current (no list roles: a button is not a list item). No product-card/view.js edits.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Step-10a)
 */

defined( 'ABSPATH' ) || exit;

// $buybox_def_gallery, $buybox_img_src, $buybox_img_alt, $buybox_thumbs_hidden and
// $buybox_thumbs_fx_attr are set by render.php before it requires this file; the
// render-undefined-vars gate reads the two as one template and proves they exist.
// $buybox_img_src can be null there, so it alone keeps a fallback.
if ( ! is_array( $buybox_def_gallery ) ) {
	$buybox_def_gallery = array();
}
if ( ! isset( $buybox_img_src ) ) {
	$buybox_img_src = '';
}

// The main photo and each thumbnail are the `main` and `thumb` media slots: the renderer prints each with its scope
// class and rules, and sizes it from the manifest's own width and height (so a photo never shifts the layout). The main
// photo carries the colour swap's bindings. The `main` slot's border, corners, shadow and ground print on the frame
// (render.php), so the renderer gets the slot without them.
// A product page's own buybox is its page's lead content (single-product.html prints it before the post content), so its
// main photo asks to load first unless the author chose Later.
$buybox_main_attrs = sgs_pcm_picture_attrs( $attributes, 'main' );
if ( function_exists( 'is_singular' ) && is_singular( 'product' ) && $product instanceof \WC_Product && (int) get_queried_object_id() === (int) $product->get_id() && 'later' !== ( $attributes['mainLoading'] ?? '' ) ) {
	$buybox_main_attrs['mainLoading'] = 'first';
}
$buybox_first       = isset( $buybox_def_gallery[0] ) && is_array( $buybox_def_gallery[0] ) ? $buybox_def_gallery[0] : array();
$buybox_main        = '' !== $buybox_img_src
	? sgs_pcm_main_image(
		'main',
		$buybox_main_attrs,
		$uid . '-main',
		array(
			'url'    => (string) $buybox_img_src,
			'width'  => (int) ( $buybox_first['w'] ?? 0 ),
			'height' => (int) ( $buybox_first['h'] ?? 0 ),
			'id'     => 0,
			'alt'    => (string) $buybox_img_alt,
		),
		false,
		array(
			'block' => 'sgs/buybox',
			'class' => 'product-card-img sgs-buybox__main-photo',
			'bind'  => true,
		)
	)
	: array(
		'html' => '',
		'css'  => '',
	);
$buybox_frame_class = 'product-card__media sgs-buybox__main-photo-frame ' . $uid . '-frame' . ( sgs_pcm_sized( $attributes, 'main' ) ? ' sgs-buybox__main-photo-frame--sized' : '' );
$buybox_thumb_attrs = sgs_pcm_picture_attrs( $attributes, 'thumb' );
?>
<?php // ── Main image (mirrors product-card L684-717 exactly, minus the optional permalink wrap). ?>
<div
	class="<?php echo esc_attr( $buybox_frame_class ); ?>"
>
<?php if ( '' !== $buybox_main['html'] ) : ?>
	<?php echo $buybox_main['html'] . sgs_pcm_style( $buybox_main['css'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the renderer escapes; its bindings are literals. ?>
<?php else : ?>
	<div class="product-card__no-image" aria-hidden="true">
		<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
	</div>
<?php endif; ?>
<?php echo sgs_buybox_gallery_sticker_html( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the builder. ?>
</div><?php // end .product-card__media — aspect-ratio/overflow:hidden MUST NOT wrap the thumbnail strip. ?>

<?php // ── Thumbnail strip (mirrors product-card L719-750 exactly). ?>
<div
	class="product-card__thumbs"
	role="group"
	aria-label="<?php esc_attr_e( 'Product images', 'sgs-blocks' ); ?>"
	data-wp-bind--hidden="context.thumbsHidden"
	<?php echo $buybox_thumbs_hidden ? 'hidden' : ''; ?>
	<?php echo $buybox_thumbs_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from literal strings in render.php, no dynamic value. ?>
>
	<?php foreach ( $buybox_def_gallery as $buybox_thumb_idx => $buybox_thumb ) : ?>
		<?php
		/* translators: %d is the image number in the thumbnail strip, e.g. "Image 1". */
		$buybox_thumb_aria_label = esc_attr( sprintf( __( 'Image %d', 'sgs-blocks' ), $buybox_thumb_idx + 1 ) );
		?>
	<button
		type="button"
		class="product-card__thumb sgs-buybox__gallery-thumb <?php echo esc_attr( $uid ); ?>-thumbbtn"
		data-index="<?php echo esc_attr( (string) $buybox_thumb_idx ); ?>"
		aria-current="<?php echo 0 === $buybox_thumb_idx ? 'true' : 'false'; ?>"
		aria-label="<?php echo $buybox_thumb_aria_label; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr applied above. ?>"
	>
		<?php echo sgs_pcm_thumb( 'thumb', $buybox_thumb_attrs, $uid . '-thumb', $buybox_thumb, 'sgs/buybox', 0 === $buybox_thumb_idx ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the renderer escapes. ?>
	</button>
	<?php endforeach; ?>
</div>