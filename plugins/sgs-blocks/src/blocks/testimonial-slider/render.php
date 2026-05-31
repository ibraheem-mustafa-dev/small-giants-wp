<?php
/**
 * Server-side render for the SGS Testimonial Slider block.
 *
 * FR-22-6 InnerBlocks migration (2026-05-30):
 * Slides are now sgs/testimonial InnerBlocks, not a scalar `testimonials`
 * array attribute. The render iterates $block->inner_blocks, renders each
 * child via $inner_block->render(), and wraps it in the existing
 * .sgs-testimonial-slider__slide container so view.js (which queries
 * '.sgs-testimonial-slider__slide') and style.css continue to work
 * unchanged — zero edits needed to view.js or CSS.
 *
 * Dots and arrows are derived from count( $block->inner_blocks ) so the
 * navigation count is always in sync with the actual number of testimonials.
 *
 * Schema.org Review JSON-LD is rebuilt from each inner block's stored
 * attributes (read from $inner_block->parsed_block['attrs']) so structured
 * data is preserved without requiring the scalar testimonials array.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — we iterate inner_blocks directly).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ── Attribute extraction ───────────────────────────────────────────────────
$layout              = $attributes['layout'] ?? 'full';
$side_image          = $attributes['sideImage'] ?? null;
$autoplay            = $attributes['autoplay'] ?? false;
$autoplay_speed      = $attributes['autoplaySpeed'] ?? 5000;
$show_dots           = $attributes['showDots'] ?? true;
$show_arrows         = $attributes['showArrows'] ?? true;
$slides_visible      = $attributes['slidesVisible'] ?? 1;
$card_style          = $attributes['cardStyle'] ?? 'card';
$quote_colour        = $attributes['quoteColour'] ?? 'text';
$name_colour         = $attributes['nameColour'] ?? 'primary';
$name_font_size      = $attributes['nameFontSize'] ?? '';
$role_colour         = $attributes['roleColour'] ?? 'text-muted';
$rating_colour       = $attributes['ratingColour'] ?? 'accent';
$hover_bg_colour     = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour   = $attributes['hoverTextColour'] ?? '';
$hover_border_colour = $attributes['hoverBorderColour'] ?? '';
$hover_effect        = $attributes['hoverEffect'] ?? 'none';
$transition_duration = $attributes['transitionDuration'] ?? '300';
$transition_easing   = $attributes['transitionEasing'] ?? 'ease-in-out';

// Derive total slide count from actual inner blocks.
$inner_blocks       = $block->inner_blocks ?? array();
$total_testimonials = count( $inner_blocks );

// ── Wrapper classes + CSS vars ─────────────────────────────────────────────
$is_split = 'split' === $layout;
$classes  = array(
	'sgs-testimonial-slider',
	'sgs-testimonial-slider--' . esc_attr( $card_style ),
);
if ( $is_split ) {
	$classes[] = 'sgs-testimonial-slider--split';
}
$allowed_effects   = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-testimonial-slider--hover-' . esc_attr( $safe_hover_effect );
}

$css_vars = sgs_transition_vars( $attributes );
if ( $hover_bg_colour ) {
	$css_vars[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_bg_colour );
}
if ( $hover_text_colour ) {
	$css_vars[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$css_vars[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}
$transition_style = implode( ';', $css_vars ) . ';';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'         => implode( ' ', $classes ),
		'data-autoplay' => $autoplay ? 'true' : 'false',
		'data-speed'    => absint( $autoplay_speed ),
		'data-slides'   => absint( $slides_visible ),
		'style'         => $transition_style,
	)
);

// ── Track style ────────────────────────────────────────────────────────────
$track_style_attr = ' style="--sgs-slides-visible:' . absint( $slides_visible ) . '"';

// ── Unique prefix for slide/dot IDs ────────────────────────────────────────
$slider_prefix = wp_unique_id( 'sgs-slider-' );

// ── Build slides from InnerBlocks ──────────────────────────────────────────
// Each sgs/testimonial child is rendered by its own render.php (which echoes
// its card shell + $content). We wrap it in .sgs-testimonial-slider__slide
// so view.js querySelectorAll('.sgs-testimonial-slider__slide') still finds it,
// and CSS scroll-snap / flex-sizing rules continue to apply unchanged.
$slides_html  = '';
$schema_items = array();
$slide_index  = 1;

foreach ( $inner_blocks as $inner_block ) {
	// Render the child block — this calls sgs/testimonial's render.php.
	$child_html = $inner_block->render();

	// WCAG 2.2: role="group" + aria-roledescription="slide" + aria-label="N of Total"
	// gives carousel slides a clear semantic identity for screen readers.
	/* translators: 1: current slide number, 2: total number of slides */
	$slide_label = esc_attr( sprintf( __( '%1$d of %2$d', 'sgs-blocks' ), $slide_index, $total_testimonials ) );
	$slide_id    = esc_attr( $slider_prefix ) . '-slide-' . $slide_index;

	$slides_html .= sprintf(
		'<div id="%s" class="sgs-testimonial-slider__slide sgs-testimonial-slider__slide--%s" role="group" aria-roledescription="slide" aria-label="%s">%s</div>',
		$slide_id,
		esc_attr( $card_style ),
		$slide_label,
		$child_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered by WP block API.
	);

	// ── Collect Schema.org data from inner block attrs ─────────────────────
	// $inner_block->parsed_block['attrs'] holds the stored block comment JSON.
	// These attrs are present on both old posts and new converter-generated posts.
	$child_attrs  = $inner_block->parsed_block['attrs'] ?? array();
	$child_name   = wp_strip_all_tags( $child_attrs['name'] ?? '' );
	$child_quote  = wp_strip_all_tags( $child_attrs['quote'] ?? '' );
	$child_rating = isset( $child_attrs['rating'] ) ? (float) $child_attrs['rating'] : 0;

	if ( '' !== trim( $child_name ) && '' !== trim( $child_quote ) ) {
		$review = array(
			'@type'      => 'Review',
			'reviewBody' => trim( $child_quote ),
			'author'     => array(
				'@type' => 'Person',
				'name'  => trim( $child_name ),
			),
		);
		if ( $child_rating > 0 ) {
			$review['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $child_rating,
				'bestRating'  => 5,
			);
		}
		$schema_items[] = $review;
	}

	++$slide_index;
}

// ── Arrows ─────────────────────────────────────────────────────────────────
$arrows_html = '';
if ( $show_arrows && $total_testimonials > $slides_visible ) {
	$arrows_html  = '<div class="sgs-testimonial-slider__arrows">';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="' . esc_attr__( 'Previous testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">‹</span></button>';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="' . esc_attr__( 'Next testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">›</span></button>';
	$arrows_html .= '</div>';
}

// ── Dots ───────────────────────────────────────────────────────────────────
$dots_html = '';
if ( $show_dots && $total_testimonials > $slides_visible ) {
	$dots_html = '<div class="sgs-testimonial-slider__dots" role="group" aria-label="' . esc_attr__( 'Testimonial navigation', 'sgs-blocks' ) . '">';
	for ( $d = 1; $d <= $total_testimonials; $d++ ) {
		$is_first    = ( 1 === $d );
		$this_dot_id = esc_attr( $slider_prefix ) . '-dot-' . $d;
		$controls_id = esc_attr( $slider_prefix ) . '-slide-' . $d;
		$dots_html  .= sprintf(
			'<button id="%s" class="sgs-testimonial-slider__dot%s" aria-current="%s" aria-controls="%s" aria-label="%s" type="button"></button>',
			$this_dot_id,
			$is_first ? ' sgs-testimonial-slider__dot--active' : '',
			$is_first ? 'true' : 'false',
			$controls_id,
			/* translators: %d = slide number */
			esc_attr( sprintf( __( 'Go to testimonial %d', 'sgs-blocks' ), $d ) )
		);
	}
	$dots_html .= '</div>';
}

// ── Side image (split layout) ──────────────────────────────────────────────
$side_image_html = '';
if ( $is_split && ! empty( $side_image['url'] ) ) {
	$side_img_id     = ! empty( $side_image['id'] ) ? absint( $side_image['id'] ) : 0;
	$side_img_tag    = sgs_responsive_image(
		$side_img_id,
		$side_image['url'],
		$side_image['alt'] ?? '',
		'large',
		array(
			'class'   => 'sgs-testimonial-slider__side-img',
			'loading' => 'lazy',
		)
	);
	$side_image_html = '<div class="sgs-testimonial-slider__side-image">' . $side_img_tag . '</div>';
}

// ── Schema.org Review JSON-LD ──────────────────────────────────────────────
// Rebuilt from inner block attrs above. If $total_testimonials is 0
// (block has no inner blocks yet — e.g. freshly inserted), no schema emitted.
$schema_html = '';
if ( ! empty( $schema_items ) ) {
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		wp_json_encode( $schema_items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
	);
}

// ── Output ─────────────────────────────────────────────────────────────────
// WCAG 2.2 AA — carousel pattern (ARIA 1.2):
// - Outer wrapper: role="region" + aria-roledescription="carousel" + aria-label
// - Track: aria-live="polite" announces slide changes to screen readers
// - Slides: role="group" + aria-label="N of Total" (set above; view.js updates on transition)
$slider_inner = sprintf(
	'<div class="sgs-testimonial-slider__stage"><div class="sgs-testimonial-slider__track" aria-live="polite" tabindex="0"%s>%s</div>%s</div>%s',
	$track_style_attr,
	$slides_html,
	$arrows_html,
	$dots_html
);

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; HTML built with esc_* helpers throughout.
if ( $is_split ) {
	printf(
		'<div %s role="region" aria-roledescription="carousel" aria-label="%s">%s<div class="sgs-testimonial-slider__slider-content">%s</div></div>%s',
		$wrapper_attributes,
		esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
		$side_image_html,
		$slider_inner,
		$schema_html
	);
} else {
	printf(
		'<div %s role="region" aria-roledescription="carousel" aria-label="%s">%s</div>%s',
		$wrapper_attributes,
		esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
		$slider_inner,
		$schema_html
	);
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
