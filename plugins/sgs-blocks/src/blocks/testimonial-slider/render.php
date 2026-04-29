<?php
/**
 * Server-side render for the SGS Testimonial Slider block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$layout              = $attributes['layout'] ?? 'full';
$side_image          = $attributes['sideImage'] ?? null;
$testimonials        = $attributes['testimonials'] ?? array();
$autoplay            = $attributes['autoplay'] ?? false;
$autoplay_speed      = $attributes['autoplaySpeed'] ?? 5000;
$show_dots           = $attributes['showDots'] ?? true;
$show_arrows         = $attributes['showArrows'] ?? true;
$slides_visible      = $attributes['slidesVisible'] ?? 1;
$card_style          = $attributes['cardStyle'] ?? 'card';
// Fallbacks match block.json defaults so inline styles are always emitted.
$quote_colour          = $attributes['quoteColour'] ?? 'text';
$name_colour           = $attributes['nameColour'] ?? 'primary';
$name_font_size        = $attributes['nameFontSize'] ?? '';
$role_colour           = $attributes['roleColour'] ?? 'text-muted';
$rating_colour         = $attributes['ratingColour'] ?? 'accent';
$hover_bg_colour       = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour     = $attributes['hoverTextColour'] ?? '';
$hover_border_colour   = $attributes['hoverBorderColour'] ?? '';
$hover_effect          = $attributes['hoverEffect'] ?? 'none';
$transition_duration   = $attributes['transitionDuration'] ?? '300';
$transition_easing     = $attributes['transitionEasing'] ?? 'ease-in-out';

// Helper to extract initials from name.
$get_initials = function ( $name ) {
	$words = explode( ' ', trim( $name ) );
	if ( count( $words ) === 1 ) {
		return strtoupper( substr( $words[0], 0, 1 ) );
	}
	return strtoupper( substr( $words[0], 0, 1 ) . substr( end( $words ), 0, 1 ) );
};

// H10: announce slide changes to screen readers.
$aria_live_region = 'polite';

// Build custom property style string.
$allowed_effects   = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';

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

// Build wrapper classes.
$is_split = 'split' === $layout;
$classes = array(
	'sgs-testimonial-slider',
	'sgs-testimonial-slider--' . esc_attr( $card_style ),
);
if ( $is_split ) {
	$classes[] = 'sgs-testimonial-slider--split';
}
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-testimonial-slider--hover-' . esc_attr( $safe_hover_effect );
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'         => implode( ' ', $classes ),
		'data-autoplay' => $autoplay ? 'true' : 'false',
		'data-speed'    => absint( $autoplay_speed ),
		'data-slides'   => absint( $slides_visible ),
		'style'         => $transition_style,
	)
);

// Build track styles.
$track_style_attr = ' style="--sgs-slides-visible:' . absint( $slides_visible ) . '"';

// Generate a unique prefix so multiple sliders on the same page have distinct IDs.
$slider_prefix = wp_unique_id( 'sgs-slider-' );

// Build testimonial slides HTML.
$slides_html = '';
$total_testimonials = count( $testimonials );
if ( ! empty( $testimonials ) ) {
	$i = 1;
	foreach ( $testimonials as $testimonial ) {
		$quote  = $testimonial['quote'] ?? '';
		$name   = $testimonial['name'] ?? '';
		$role   = $testimonial['role'] ?? '';
		$rating = absint( $testimonial['rating'] ?? 0 );
		$avatar = $testimonial['avatar'] ?? null;

		// Build stars HTML.
		$stars_html = '';
		if ( $rating > 0 ) {
			$rating_style_attr = '';
			if ( $rating_colour ) {
				$rating_style_attr = ' style="color:' . sgs_colour_value( $rating_colour ) . '"';
			}
			/* translators: %d = star rating number, e.g. "4 out of 5 stars" */
			$stars_aria_label = esc_attr( sprintf( __( '%d out of 5 stars', 'sgs-blocks' ), $rating ) );
			$stars_html      .= sprintf(
				'<div class="sgs-testimonial-slider__stars"%s role="img" aria-label="%s">',
				$rating_style_attr,
				$stars_aria_label
			);
			for ( $s = 1; $s <= 5; $s++ ) {
				$stars_html .= $s <= $rating ? '<span aria-hidden="true">★</span>' : '<span aria-hidden="true">☆</span>';
			}
			$stars_html .= '</div>';
		}

		// Build avatar HTML.
		$avatar_html = '<div class="sgs-testimonial-slider__avatar">';
		if ( ! empty( $avatar['url'] ) ) {
			$avatar_id = ! empty( $avatar['id'] ) ? absint( $avatar['id'] ) : 0;
			$avatar_html .= sgs_responsive_image( $avatar_id, $avatar['url'], $name, 'thumbnail', [
				'class'   => 'sgs-testimonial-slider__avatar-img',
				'loading' => 'lazy',
			] );
		} else {
			$initials = $get_initials( $name );
			$avatar_html .= sprintf(
				'<span class="sgs-testimonial-slider__avatar-initials">%s</span>',
				esc_html( $initials )
			);
		}
		$avatar_html .= '</div>';

		// Build quote styles.
		$quote_style_attr = '';
		if ( $quote_colour ) {
			$quote_style_attr = ' style="color:' . sgs_colour_value( $quote_colour ) . '"';
		}

		// Build name styles.
		$name_styles = array();
		if ( $name_colour ) {
			$name_styles[] = 'color:' . sgs_colour_value( $name_colour );
		}
		if ( $name_font_size ) {
			$name_styles[] = 'font-size:' . sgs_font_size_value( $name_font_size );
		}
		$name_style_attr = $name_styles ? ' style="' . implode( ';', $name_styles ) . '"' : '';

		// Build role styles.
		$role_style_attr = '';
		if ( $role_colour ) {
			$role_style_attr = ' style="color:' . sgs_colour_value( $role_colour ) . '"';
		}

		// Build slide HTML.
		// WCAG 2.2: role="group" + aria-roledescription="slide" + aria-label="N of Total"
		// gives carousel slides a clear semantic identity for screen readers.
		/* translators: 1: current slide number, 2: total number of slides */
		$slide_label = esc_attr( sprintf( __( '%1$d of %2$d', 'sgs-blocks' ), $i, $total_testimonials ) );
		$slide_id    = esc_attr( $slider_prefix ) . '-slide-' . $i;
		$dot_id      = esc_attr( $slider_prefix ) . '-dot-' . $i;

		$slides_html .= sprintf(
			'<blockquote id="%s" class="sgs-testimonial-slider__slide sgs-testimonial-slider__slide--%s" role="group" aria-roledescription="slide" aria-label="%s">%s<p class="sgs-testimonial-slider__quote"%s>%s</p><footer class="sgs-testimonial-slider__footer">%s<div class="sgs-testimonial-slider__meta"><cite class="sgs-testimonial-slider__name"%s>%s</cite><span class="sgs-testimonial-slider__role"%s>%s</span></div></footer></blockquote>',
			$slide_id,
			esc_attr( $card_style ),
			$slide_label,
			$stars_html,
			$quote_style_attr,
			wp_kses_post( $quote ),
			$avatar_html,
			$name_style_attr,
			esc_html( $name ),
			$role_style_attr,
			esc_html( $role )
		);

		$i++;
	}
}

// Build arrows HTML (only if there are more testimonials than slides visible).
$arrows_html = '';
if ( $show_arrows && $total_testimonials > $slides_visible ) {
	$arrows_html = '<div class="sgs-testimonial-slider__arrows">';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="' . esc_attr__( 'Previous testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">‹</span></button>';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="' . esc_attr__( 'Next testimonial', 'sgs-blocks' ) . '" type="button"><span aria-hidden="true">›</span></button>';
	$arrows_html .= '</div>';
}

// Build dots HTML (only if there are more testimonials than slides visible).
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

// Build side image HTML for split layout.
$side_image_html = '';
if ( $is_split && ! empty( $side_image['url'] ) ) {
	$side_img_id  = ! empty( $side_image['id'] ) ? absint( $side_image['id'] ) : 0;
	$side_img_tag = sgs_responsive_image( $side_img_id, $side_image['url'], $side_image['alt'] ?? '', 'large', array(
		'class'   => 'sgs-testimonial-slider__side-img',
		'loading' => 'lazy',
	) );
	$side_image_html = '<div class="sgs-testimonial-slider__side-image">' . $side_img_tag . '</div>';
}

// ─── Schema.org/Review array JSON-LD ───
$schema_html = '';
if ( ! empty( $testimonials ) ) {
	$review_items = array();
	foreach ( $testimonials as $testimonial ) {
		$t_name   = wp_strip_all_tags( $testimonial['name'] ?? '' );
		$t_quote  = wp_strip_all_tags( $testimonial['quote'] ?? '' );
		$t_rating = absint( $testimonial['rating'] ?? 0 );

		if ( empty( $t_name ) || empty( $t_quote ) ) {
			continue;
		}

		$review = array(
			'@type'      => 'Review',
			'reviewBody' => $t_quote,
			'author'     => array(
				'@type' => 'Person',
				'name'  => $t_name,
			),
		);

		if ( $t_rating > 0 ) {
			$review['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $t_rating,
				'bestRating'  => 5,
			);
		}

		$review_items[] = $review;
	}

	if ( count( $review_items ) >= 1 ) {
		$schema_html = sprintf(
			'<script type="application/ld+json">%s</script>',
			wp_json_encode( $review_items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
		);
	}
}

// Output.
// WCAG 2.2 AA — carousel pattern (ARIA 1.2):
// - Outer wrapper: role="region" + aria-roledescription="carousel" + aria-label names the landmark.
// - Track has aria-live="polite" so slide changes are announced.
// - Individual slides use role="group" + aria-label="N of Total" (set on render; view.js updates it on transition).
$slider_inner = sprintf(
	'<div class="sgs-testimonial-slider__stage"><div class="sgs-testimonial-slider__track" aria-live="polite" tabindex="0"%s>%s</div>%s</div>%s',
	$track_style_attr,
	$slides_html,
	$arrows_html,
	$dots_html
);

if ( $is_split ) {
	printf(
		'<div %s role="region" aria-roledescription="carousel" aria-label="%s">%s<div class="sgs-testimonial-slider__slider-content">%s</div></div>%s',
		$wrapper_attributes,
		esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
		$side_image_html,
		$slider_inner,
		$schema_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_json_encode() output inside a script tag; already sanitised above.
	);
} else {
	printf(
		'<div %s role="region" aria-roledescription="carousel" aria-label="%s">%s</div>%s',
		$wrapper_attributes,
		esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
		$slider_inner,
		$schema_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_json_encode() output inside a script tag; already sanitised above.
	);
}
