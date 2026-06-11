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
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ── Attribute extraction ───────────────────────────────────────────────────
$layout              = $attributes['layout'] ?? 'full';
$side_image          = $attributes['sideImage'] ?? null;
$autoplay            = $attributes['autoplay'] ?? false;
$autoplay_speed      = $attributes['autoplaySpeed'] ?? 5000;
$show_dots           = $attributes['showDots'] ?? true;
$show_arrows         = $attributes['showArrows'] ?? true;
$slides_visible      = $attributes['slidesVisible'] ?? 1;
$card_style          = $attributes['cardStyle'] ?? 'card';
$name_font_size      = $attributes['nameFontSize'] ?? '';
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

// ── Own CSS vars — carried as extra_styles into the wrapper helper ─────────
// SGS_Container_Wrapper merges these with any container-level style declarations
// (gap, widthMode custom width, etc.) before calling get_block_wrapper_attributes().
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

// ── Own extra attrs — carousel data-* + ARIA region attrs ─────────────────
// view.js queries .sgs-testimonial-slider[data-autoplay] / [data-speed] /
// [data-slides] on the OUTER wrapper. These must ride through extra_attrs so
// they are present on the element that get_block_wrapper_attributes() emits.
// The role/aria-roledescription/aria-label that were previously on the <div>
// in the printf() calls are also moved here so the wrapper helper owns the tag.
$slider_extra_attrs = array(
	'data-autoplay'        => $autoplay ? 'true' : 'false',
	'data-speed'           => (string) absint( $autoplay_speed ),
	'data-slides'          => (string) absint( $slides_visible ),
	'role'                 => 'region',
	'aria-roledescription' => 'carousel',
	'aria-label'           => esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
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
	$child_rating = isset( $child_attrs['ratingStars'] ) ? (float) $child_attrs['ratingStars'] : 0;

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

// ── Arrows — always rendered when showArrows is enabled, regardless of count.
// Bug-fix (2026-06-03): removed "total > slidesVisible" gate — nav must always
// show and rotate even when total === slidesVisible (e.g. 4 cards, 3 visible).
$arrow_prev_html = '';
$arrow_next_html = '';
if ( $show_arrows && $total_testimonials > 0 ) {
	$arrow_prev_html = '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="' . esc_attr__( 'Previous testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">‹</span></button>';
	$arrow_next_html = '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="' . esc_attr__( 'Next testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">›</span></button>';
}

// ── Dots — always rendered when showDots is enabled, regardless of count.
// Bug-fix (2026-06-03): removed "total > slidesVisible" gate — same reason.
$dots_html = '';
if ( $show_dots && $total_testimonials > 0 ) {
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

// ── Controls bar (dots + pause button slot) — always rendered when there are
// slides, so view.js can always inject the pause button into __controls.
// Bug-fix (2026-06-03): was conditional on $dots_html — pause btn fell outside
// __controls when dots were hidden. Now rendered whenever there are slides.
$controls_html = '';
if ( $total_testimonials > 0 ) {
	$controls_html = '<div class="sgs-testimonial-slider__controls">' . $dots_html . '</div>';
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

/*
 * ── Output ─────────────────────────────────────────────────────────────────
 * WCAG 2.2 AA — carousel pattern (ARIA 1.2):
 * - Outer wrapper: role="region" + aria-roledescription="carousel" + aria-label
 * - Track: aria-live="polite" announces slide changes to screen readers
 * - Slides: role="group" + aria-label="N of Total" (view.js updates on transition)
 *
 * Layout structure (non-split):
 *   .sgs-testimonial-slider  (outer wrapper)
 *     .sgs-testimonial-slider__stage  (flex row: [prev] [track] [next])
 *       .sgs-testimonial-slider__arrow--prev
 *       .sgs-testimonial-slider__track
 *       .sgs-testimonial-slider__arrow--next
 *     .sgs-testimonial-slider__controls  (below row: dots + injected pause btn)
 *       .sgs-testimonial-slider__dots
 *
 * Arrows flank the track as flex siblings — they never overlap card content.
 * Controls bar sits beneath the full-width card row, centred.
 */
$slider_inner = sprintf(
	'<div class="sgs-testimonial-slider__stage">%s<div class="sgs-testimonial-slider__track" aria-live="polite" tabindex="0"%s>%s</div>%s</div>%s',
	$arrow_prev_html,
	$track_style_attr,
	$slides_html,
	$arrow_next_html,
	$controls_html
);

// ── Build $inner_html for the wrapper helper ───────────────────────────────
// For the split layout the interior wraps in a two-column shell (side image +
// slider content div). For full-width, the slider inner IS the interior.
// $schema_html is appended outside the region tag (same as before) — it is a
// <script type="application/ld+json"> which must not be inside a landmark.
if ( $is_split ) {
	$carousel_inner = $side_image_html
		. '<div class="sgs-testimonial-slider__slider-content">' . $slider_inner . '</div>';
} else {
	$carousel_inner = $slider_inner;
}

// ── WS-4 wrapper via SGS_Container_Wrapper ─────────────────────────────────
// tag='div' — WCAG carousel region is a <div>; the __stage/__track structure
// is preserved in $carousel_inner. CSS vars (transition, hover) ride in
// extra_styles. Carousel data-* + ARIA region attributes ride in extra_attrs.
// $schema_html is appended after the wrapper element (outside the landmark).
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML built with esc_* helpers throughout; $schema_html uses wp_json_encode.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$carousel_inner,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $classes,
		'extra_styles'  => $css_vars,
		'extra_attrs'   => $slider_extra_attrs,
	)
) . $schema_html;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
