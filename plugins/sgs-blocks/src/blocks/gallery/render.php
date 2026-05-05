<?php
/**
 * Server-side render for sgs/gallery.
 *
 * Outputs a responsive image gallery supporting grid, masonry, and carousel
 * layouts. When the lightbox is enabled, image items are rendered as buttons
 * with Interactivity API data attributes. The full lightbox modal is always
 * included in the markup (display:none) so the Interactivity API can manage
 * its open/closed state without DOM insertion.
 *
 * @package SGS\Blocks
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      The WP_Block instance.
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __FILE__, 4 ) . '/includes/render-helpers.php';

// -------------------------------------------------------------------------
// Normalise attributes with safe defaults.
// -------------------------------------------------------------------------
// Prefer the new unified mediaItems attribute. Fall back to the legacy
// `images` array (pre-media-slot migration) so posts that have not yet
// round-tripped through the editor still render correctly.
$media_items_raw = (array) ( $attributes['mediaItems'] ?? [] );
$legacy_images   = (array) ( $attributes['images'] ?? [] );
$images          = ! empty( $media_items_raw ) ? $media_items_raw : $legacy_images;
$layout          = sanitize_key( $attributes['layout'] ?? 'grid' );
$columns         = absint( $attributes['columns'] ?? 3 );
$columns_tablet  = absint( $attributes['columnsTablet'] ?? 2 );
$columns_mobile  = absint( $attributes['columnsMobile'] ?? 1 );
$gap             = absint( $attributes['gap'] ?? 16 );
$aspect_ratio    = sanitize_text_field( $attributes['aspectRatio'] ?? '1/1' );
$enable_lightbox = (bool) ( $attributes['enableLightbox'] ?? true );
$show_captions   = (bool) ( $attributes['showCaptions'] ?? false );
$caption_reveal  = (bool) ( $attributes['captionReveal'] ?? false );
$image_size      = sanitize_key( $attributes['imageSize'] ?? 'large' );

$hover_scale     = sanitize_text_field( $attributes['hoverScale'] ?? '' );
$hover_img_zoom  = (bool) ( $attributes['hoverImageZoom'] ?? true );
$hover_effect    = sanitize_key( $attributes['hoverEffect'] ?? 'zoom' );
$hover_grayscale = (bool) ( $attributes['hoverGrayscale'] ?? false );
$hover_shadow    = sanitize_key( $attributes['hoverShadow'] ?? '' );
$stagger_delay   = absint( $attributes['staggerDelay'] ?? 0 );
$trans_duration  = absint( $attributes['transitionDuration'] ?? 300 );
$trans_easing    = sanitize_text_field( $attributes['transitionEasing'] ?? 'ease' );

$carousel_autoplay    = (bool) ( $attributes['carouselAutoplay'] ?? false );
$carousel_speed       = absint( $attributes['carouselSpeed'] ?? 5000 );
$carousel_show_dots   = (bool) ( $attributes['carouselShowDots'] ?? true );
$carousel_show_arrows = (bool) ( $attributes['carouselShowArrows'] ?? true );

// Colour attributes — fallbacks match block.json defaults so inline CSS vars
// are always emitted even when the attribute is absent from stored post content.
$caption_colour       = $attributes['captionColour']      ?? 'text-inverse';
$caption_bg_colour    = $attributes['captionBgColour']    ?? 'primary-dark';
$hover_overlay_colour = $attributes['hoverOverlayColour'] ?? 'primary-dark';

// -------------------------------------------------------------------------
// Build inline CSS custom properties.
// -------------------------------------------------------------------------
$inline_styles_parts = array_merge(
	array(
		'--sgs-columns-desktop:' . $columns,
		'--sgs-columns-tablet:'  . $columns_tablet,
		'--sgs-columns-mobile:'  . $columns_mobile,
		'--sgs-gap:'             . $gap . 'px',
	),
	sgs_transition_vars( $attributes )
);

if ( $hover_scale ) {
	$inline_styles_parts[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$inline_styles_parts[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
}
if ( $stagger_delay > 0 ) {
	$inline_styles_parts[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
}
// Always emit colour CSS vars — fallbacks are set above so these are never empty.
$inline_styles_parts[] = '--sgs-hover-overlay:' . sgs_colour_value( $hover_overlay_colour );
$inline_styles_parts[] = '--sgs-caption-colour:' . sgs_colour_value( $caption_colour );
$inline_styles_parts[] = '--sgs-caption-bg:' . sgs_colour_value( $caption_bg_colour );

$inline_styles = implode( ';', $inline_styles_parts ) . ';';

// -------------------------------------------------------------------------
// Build image context data for Interactivity API store.
// Each entry stores only the data the lightbox needs — no full markup.
// -------------------------------------------------------------------------
$context_images = [];
foreach ( $images as $img ) {
	$img_id   = absint( $img['id'] ?? 0 );
	$img_type = isset( $img['type'] ) ? sanitize_key( $img['type'] ) : 'image';
	$full_url = '';

	if ( $img_id && 'image' === $img_type ) {
		// Prefer the attachment's full-size URL from WordPress metadata.
		$full_src = wp_get_attachment_image_src( $img_id, 'full' );
		$full_url = $full_src ? esc_url( $full_src[0] ) : '';
	}

	// Fall back to the stored fullUrl / url if the attachment no longer exists,
	// or if this item is a video (always use the direct file URL).
	if ( ! $full_url && ! empty( $img['fullUrl'] ) ) {
		$full_url = esc_url( $img['fullUrl'] );
	}
	if ( ! $full_url && ! empty( $img['url'] ) ) {
		$full_url = esc_url( $img['url'] );
	}

	$context_images[] = [
		'fullUrl' => $full_url,
		'alt'     => esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) ),
		'caption' => esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ),
		'type'    => $img_type,
	];
}

$context_data = wp_json_encode( [
	'lightboxOpen'  => false,
	'currentIndex'  => 0,
	'images'        => $context_images,
] );

// -------------------------------------------------------------------------
// Wrapper class and data attributes.
// -------------------------------------------------------------------------
$wrapper_classes = implode( ' ', array_filter( [
	'sgs-gallery',
	'sgs-gallery--' . $layout,
	'sgs-gallery--hover-' . $hover_effect,
	$enable_lightbox ? 'sgs-gallery--lightbox-enabled' : '',
	$hover_img_zoom  ? 'sgs-gallery--zoom'             : '',
	$hover_shadow    ? 'sgs-has-hover'                 : '',
	$hover_grayscale ? 'sgs-has-grayscale'             : '',
	$stagger_delay   ? 'sgs-has-stagger'               : '',
	( $show_captions && $caption_reveal ) ? 'sgs-gallery--caption-reveal' : '',
] ) );

$wrapper_attrs_extra = [
	'class' => $wrapper_classes,
	'style' => $inline_styles,
];

if ( $enable_lightbox ) {
	$wrapper_attrs_extra['data-wp-interactive'] = 'sgs/gallery';
	$wrapper_attrs_extra['data-wp-context']     = $context_data;
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_attrs_extra );

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — get_block_wrapper_attributes() is safe. ?>>

	<?php /* ----------------------------------------------------------------
	       Gallery grid / masonry / carousel inner track
	       ---------------------------------------------------------------- */ ?>
	<div class="sgs-gallery__grid">

		<?php
		if ( empty( $images ) ) :
			?>
			<div class="sgs-gallery__empty" role="status">
				<svg class="sgs-gallery__empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
					<polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<h3 class="sgs-gallery__empty-heading"><?php esc_html_e( 'No images yet', 'sgs-blocks' ); ?></h3>
				<p class="sgs-gallery__empty-text"><?php esc_html_e( 'Add images via the editor sidebar to populate this gallery.', 'sgs-blocks' ); ?></p>
			</div>
			<?php
		else :
			foreach ( $images as $index => $img ) :
				$img_id      = absint( $img['id'] ?? 0 );
				$img_type    = isset( $img['type'] ) ? sanitize_key( $img['type'] ) : 'image';
				$img_alt     = esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) );
				$img_caption = $show_captions ? esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ) : '';

				// Build the unified media-slot shape for sgs_render_media().
				$item_media = [
					'url'  => $img['url'] ?? '',
					'type' => $img_type,
					'id'   => $img_id,
					'alt'  => $img['alt'] ?? '',
					'mime' => $img['mime'] ?? '',
				];
				$item_html = sgs_render_media( $item_media, 'sgs/gallery' );

				// Determine the aspect-ratio and stagger delay inline style for this item.
				$item_style = '';
				if ( $aspect_ratio ) {
					$item_style .= 'aspect-ratio:' . esc_attr( $aspect_ratio ) . ';';
				}
				if ( $stagger_delay > 0 ) {
					$item_style .= '--sgs-item-index:' . $index . ';';
				}

				// Determine full-size URL for lightbox data attribute.
				$full_url = '';
				if ( $img_id ) {
					$full_src = wp_get_attachment_image_src( $img_id, 'full' );
					$full_url = $full_src ? esc_url( $full_src[0] ) : '';
				}
				if ( ! $full_url && ! empty( $img['fullUrl'] ) ) {
					$full_url = esc_url( $img['fullUrl'] );
				}

				if ( $enable_lightbox ) :
					// Each item is a button — clicking opens the lightbox at this index.
					?>
					<figure
						class="sgs-gallery__item"
						style="<?php echo esc_attr( $item_style ); ?>"
					>
						<button
							type="button"
							class="sgs-gallery__item-btn"
							aria-label="<?php
								/* translators: %s: image alt text */
								printf( esc_attr__( 'View %s in lightbox', 'sgs-blocks' ), $img_alt ?: esc_attr__( 'image', 'sgs-blocks' ) );
							?>"
							data-wp-on--click="actions.openLightbox"
							data-wp-context="<?php echo esc_attr( wp_json_encode( [ 'currentIndex' => $index ] ) ); ?>"
						>
							<div class="sgs-gallery__img-wrap">
								<?php
								if ( 'image' === $img_type && $img_id ) {
									// Prefer wp_get_attachment_image() for images with attachment IDs —
									// it emits srcset, the requested size, and lazy-loading natively.
									echo wp_get_attachment_image(
										$img_id,
										$image_size,
										false,
										[
											'class'   => 'sgs-gallery__img',
											'loading' => $index < 4 ? 'eager' : 'lazy',
										]
									); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
								} else {
									// Video items, or images without an attachment ID, render via the
									// shared media-slot helper — emits <img> or <video> as needed.
									echo $item_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — sgs_render_media() escapes internally.
								}
								?>
							</div>
						</button>
						<?php if ( 'overlay-slide' === $hover_effect && ( $img_alt || $img_caption ) ) : ?>
							<div class="sgs-gallery__overlay">
								<?php echo $img_caption ?: $img_alt; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							</div>
						<?php endif; ?>
						<?php if ( $show_captions && $img_caption ) : ?>
							<figcaption class="sgs-gallery__caption">
								<?php echo $img_caption; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already esc_html() above. ?>
							</figcaption>
						<?php endif; ?>
					</figure>
					<?php

				else :
					// No lightbox — plain figure with a link to the full image.
					?>
					<figure
						class="sgs-gallery__item"
						style="<?php echo esc_attr( $item_style ); ?>"
					>
						<div class="sgs-gallery__img-wrap">
							<?php
							if ( 'image' === $img_type && $img_id ) {
								echo wp_get_attachment_image(
									$img_id,
									$image_size,
									false,
									[
										'class'   => 'sgs-gallery__img',
										'loading' => $index < 4 ? 'eager' : 'lazy',
									]
								); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
							} else {
								echo $item_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — sgs_render_media() escapes internally.
							}
							?>
						</div>
						<?php if ( 'overlay-slide' === $hover_effect && ( $img_alt || $img_caption ) ) : ?>
							<div class="sgs-gallery__overlay">
								<?php echo $img_caption ?: $img_alt; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							</div>
						<?php endif; ?>
						<?php if ( $show_captions && $img_caption ) : ?>
							<figcaption class="sgs-gallery__caption">
								<?php echo $img_caption; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already esc_html() above. ?>
							</figcaption>
						<?php endif; ?>
					</figure>
					<?php

				endif;

			endforeach;
		endif;
		?>

	</div>
	<?php /* end .sgs-gallery__grid */ ?>

	<?php /* ----------------------------------------------------------------
	       Carousel controls (prev/next arrows + dots)
	       Only rendered when layout = carousel.
	       ---------------------------------------------------------------- */ ?>
	<?php if ( 'carousel' === $layout ) : ?>

		<?php if ( $carousel_show_arrows ) : ?>
			<button
				type="button"
				class="sgs-gallery__carousel-prev"
				aria-label="<?php esc_attr_e( 'Previous image', 'sgs-blocks' ); ?>"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button
				type="button"
				class="sgs-gallery__carousel-next"
				aria-label="<?php esc_attr_e( 'Next image', 'sgs-blocks' ); ?>"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		<?php endif; ?>

		<?php if ( $carousel_show_dots ) : ?>
			<div
				class="sgs-gallery__carousel-dots"
				role="tablist"
				aria-label="<?php esc_attr_e( 'Gallery navigation', 'sgs-blocks' ); ?>"
			></div>
		<?php endif; ?>

	<?php endif; ?>

	<?php /* ----------------------------------------------------------------
	       Lightbox modal — always in DOM, shown via --open class.
	       Only rendered when enableLightbox is true.
	       ---------------------------------------------------------------- */ ?>
	<?php if ( $enable_lightbox ) : ?>

		<div
			class="sgs-gallery__lightbox"
			role="dialog"
			aria-modal="true"
			aria-label="<?php esc_attr_e( 'Image lightbox', 'sgs-blocks' ); ?>"
			data-wp-class--sgs-gallery__lightbox--open="state.isLightboxOpen"
			data-wp-on-window--keydown="callbacks.onKeydown"
		>
			<button
				type="button"
				class="sgs-gallery__lightbox-close"
				aria-label="<?php esc_attr_e( 'Close lightbox', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.closeLightbox"
			>
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					<line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				</svg>
			</button>

			<button
				type="button"
				class="sgs-gallery__lightbox-prev"
				aria-label="<?php esc_attr_e( 'Previous image', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.prevImage"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			<div class="sgs-gallery__lightbox-body">
				<img
					class="sgs-gallery__lightbox-img"
					data-wp-bind--src="state.currentFullUrl"
					data-wp-bind--alt="state.currentAlt"
					src=""
					alt=""
				/>
				<p
					class="sgs-gallery__lightbox-caption"
					data-wp-text="state.currentCaption"
				></p>
			</div>

			<button
				type="button"
				class="sgs-gallery__lightbox-next"
				aria-label="<?php esc_attr_e( 'Next image', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.nextImage"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			<p class="sgs-gallery__lightbox-counter" data-wp-text="state.counterText"></p>

		</div>

	<?php endif; ?>

</div>
