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
$images          = (array) ( $attributes['images'] ?? [] );
$layout          = sanitize_key( $attributes['layout'] ?? 'grid' );
$columns         = absint( $attributes['columns'] ?? 3 );
$columns_tablet  = absint( $attributes['columnsTablet'] ?? 2 );
$columns_mobile  = absint( $attributes['columnsMobile'] ?? 1 );
$gap             = absint( $attributes['gap'] ?? 16 );
$aspect_ratio    = sanitize_text_field( $attributes['aspectRatio'] ?? '1/1' );
$enable_lightbox = (bool) ( $attributes['enableLightbox'] ?? true );
$show_captions   = (bool) ( $attributes['showCaptions'] ?? false );
$image_size      = sanitize_key( $attributes['imageSize'] ?? 'large' );

$hover_scale     = sanitize_text_field( $attributes['hoverScale'] ?? '' );
$hover_img_zoom  = (bool) ( $attributes['hoverImageZoom'] ?? true );
$trans_duration  = absint( $attributes['transitionDuration'] ?? 300 );
$trans_easing    = sanitize_text_field( $attributes['transitionEasing'] ?? 'ease' );

$carousel_autoplay    = (bool) ( $attributes['carouselAutoplay'] ?? false );
$carousel_speed       = absint( $attributes['carouselSpeed'] ?? 5000 );
$carousel_show_dots   = (bool) ( $attributes['carouselShowDots'] ?? true );
$carousel_show_arrows = (bool) ( $attributes['carouselShowArrows'] ?? true );

// Colour attributes.
$caption_colour       = $attributes['captionColour']      ?? '';
$caption_bg_colour    = $attributes['captionBgColour']    ?? '';
$hover_overlay_colour = $attributes['hoverOverlayColour'] ?? '';

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
if ( $hover_overlay_colour ) {
	$inline_styles_parts[] = '--sgs-hover-overlay:' . sgs_colour_value( $hover_overlay_colour );
}
if ( $caption_colour ) {
	$inline_styles_parts[] = '--sgs-caption-colour:' . sgs_colour_value( $caption_colour );
}
if ( $caption_bg_colour ) {
	$inline_styles_parts[] = '--sgs-caption-bg:' . sgs_colour_value( $caption_bg_colour );
}

$inline_styles = implode( ';', $inline_styles_parts ) . ';';

// -------------------------------------------------------------------------
// Build image context data for Interactivity API store.
// Each entry stores only the data the lightbox needs — no full markup.
// -------------------------------------------------------------------------
$context_images = [];
foreach ( $images as $img ) {
	$img_id  = absint( $img['id'] ?? 0 );
	$full_url = '';

	if ( $img_id ) {
		// Prefer the attachment's full-size URL from WordPress metadata.
		$full_src = wp_get_attachment_image_src( $img_id, 'full' );
		$full_url = $full_src ? esc_url( $full_src[0] ) : '';
	}

	// Fall back to the stored fullUrl if the attachment no longer exists.
	if ( ! $full_url && ! empty( $img['fullUrl'] ) ) {
		$full_url = esc_url( $img['fullUrl'] );
	}

	$context_images[] = [
		'fullUrl' => $full_url,
		'alt'     => esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) ),
		'caption' => esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ),
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
	$enable_lightbox ? 'sgs-gallery--lightbox-enabled' : '',
	$hover_img_zoom  ? 'sgs-gallery--zoom'             : '',
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
			<p class="sgs-gallery__empty"><?php esc_html_e( 'No images selected.', 'sgs-blocks' ); ?></p>
			<?php
		else :
			foreach ( $images as $index => $img ) :
				$img_id      = absint( $img['id'] ?? 0 );
				$img_alt     = esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) );
				$img_caption = $show_captions ? esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ) : '';

				// Determine the aspect-ratio inline style for this item.
				$item_style = '';
				if ( $aspect_ratio ) {
					$item_style = 'aspect-ratio:' . esc_attr( $aspect_ratio ) . ';';
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
								if ( $img_id ) {
									echo wp_get_attachment_image(
										$img_id,
										$image_size,
										false,
										[
											'class'   => 'sgs-gallery__img',
											'loading' => $index < 4 ? 'eager' : 'lazy',
										]
									); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
								} elseif ( ! empty( $img['url'] ) ) {
									?>
									<img
										src="<?php echo esc_url( $img['url'] ); ?>"
										alt="<?php echo esc_attr( $img_alt ); ?>"
										class="sgs-gallery__img"
										loading="<?php echo $index < 4 ? 'eager' : 'lazy'; ?>"
									/>
									<?php
								}
								?>
							</div>
						</button>
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
							if ( $img_id ) {
								echo wp_get_attachment_image(
									$img_id,
									$image_size,
									false,
									[
										'class'   => 'sgs-gallery__img',
										'loading' => $index < 4 ? 'eager' : 'lazy',
									]
								); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
							} elseif ( ! empty( $img['url'] ) ) {
								?>
								<img
									src="<?php echo esc_url( $img['url'] ); ?>"
									alt="<?php echo esc_attr( $img_alt ); ?>"
									class="sgs-gallery__img"
									loading="<?php echo $index < 4 ? 'eager' : 'lazy'; ?>"
								/>
								<?php
							}
							?>
						</div>
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
