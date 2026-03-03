<?php
/**
 * Server-side render for the SGS Testimonial Slider block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$testimonials   = $attributes['testimonials'] ?? array();
$autoplay       = $attributes['autoplay'] ?? false;
$autoplay_speed = $attributes['autoplaySpeed'] ?? 5000;
$show_dots      = $attributes['showDots'] ?? true;
$show_arrows    = $attributes['showArrows'] ?? true;
$slides_visible = $attributes['slidesVisible'] ?? 1;
$card_style     = $attributes['cardStyle'] ?? 'card';
$quote_colour   = $attributes['quoteColour'] ?? '';
$name_colour    = $attributes['nameColour'] ?? '';
$name_font_size = $attributes['nameFontSize'] ?? '';
$role_colour    = $attributes['roleColour'] ?? '';
$rating_colour  = $attributes['ratingColour'] ?? 'accent';

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

// Build wrapper classes.
$classes = array(
	'sgs-testimonial-slider',
	'sgs-testimonial-slider--' . esc_attr( $card_style ),
);

$total_testimonials = count( $testimonials );

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'               => implode( ' ', $classes ),
		'data-wp-interactive' => 'sgs/testimonial-slider',
		'data-wp-context'     => wp_json_encode(
			array(
				'currentIndex'  => 0,
				'totalSlides'   => $total_testimonials,
				'isPlaying'     => (bool) $autoplay,
				'autoplay'      => (bool) $autoplay,
				'speed'         => (int) $autoplay_speed,
				'slidesVisible' => (int) $slides_visible,
			)
		),
		'data-wp-init'        => 'callbacks.init',
		'data-wp-watch'       => 'callbacks.onPlayChange',
		'data-autoplay'       => $autoplay ? 'true' : 'false',
		'data-speed'          => absint( $autoplay_speed ),
		'data-slides'         => absint( $slides_visible ),
	)
);

// Build track styles.
$track_style_attr = ' style="--sgs-slides-visible:' . absint( $slides_visible ) . '"';

// Generate a unique prefix so multiple sliders on the same page have distinct IDs.
$slider_prefix = wp_unique_id( 'sgs-slider-' );

// Build testimonial slides HTML.
$slides_html = '';
if ( ! empty( $testimonials ) ) {
	$i = 0;
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
			$stars_html .= sprintf(
				'<div class="sgs-testimonial-slider__stars"%s role="img" aria-label="%d out of 5 stars">',
				$rating_style_attr,
				$rating
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

		// Build slide HTML — $i is 0-based (used for slideIndex); $i + 1 for display numbers and IDs.
		$slide_id = esc_attr( $slider_prefix ) . '-slide-' . ( $i + 1 );
		$dot_id   = esc_attr( $slider_prefix ) . '-dot-' . ( $i + 1 );
		$slides_html .= sprintf(
			'<blockquote id="%s" class="sgs-testimonial-slider__slide sgs-testimonial-slider__slide--%s" role="tabpanel" aria-labelledby="%s" aria-label="Testimonial %d of %d" data-wp-context=\'{"slideIndex":%d}\' data-wp-class--is-active="state.isActiveSlide">%s<p class="sgs-testimonial-slider__quote"%s>%s</p><footer class="sgs-testimonial-slider__footer">%s<div class="sgs-testimonial-slider__meta"><cite class="sgs-testimonial-slider__name"%s>%s</cite><span class="sgs-testimonial-slider__role"%s>%s</span></div></footer></blockquote>',
			$slide_id,
			esc_attr( $card_style ),
			$dot_id,
			$i + 1,
			$total_testimonials,
			$i,
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
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="Previous testimonial" type="button" data-wp-on--click="actions.prev"><span aria-hidden="true">‹</span></button>';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="Next testimonial" type="button" data-wp-on--click="actions.next"><span aria-hidden="true">›</span></button>';
	$arrows_html .= '</div>';
}

// Build pause button HTML (only if autoplay is enabled).
$pause_html = '';
if ( $autoplay ) {
	$pause_html = '<button type="button" class="sgs-testimonial-slider__pause-btn" aria-live="polite" data-wp-on--click="actions.togglePlay" data-wp-bind--aria-label="state.pauseAriaLabel" data-wp-bind--aria-pressed="state.pauseAriaPressed"><span class="sgs-testimonial-slider__pause-icon" aria-hidden="true" data-wp-text="state.pauseIcon">⏸</span></button>';
}

// Build dots HTML (only if there are more testimonials than slides visible).
$dots_html = '';
if ( $show_dots && $total_testimonials > $slides_visible ) {
	$dots_html = '<div class="sgs-testimonial-slider__dots" role="tablist" aria-label="Testimonial navigation">';
	for ( $d = 1; $d <= $total_testimonials; $d++ ) {
		$this_dot_id = esc_attr( $slider_prefix ) . '-dot-' . $d;
		$controls_id = esc_attr( $slider_prefix ) . '-slide-' . $d;
		$dots_html  .= sprintf(
			'<button id="%s" class="sgs-testimonial-slider__dot" role="tab" aria-controls="%s" aria-label="Go to testimonial %d" type="button" data-wp-context=\'{"dotIndex":%d}\' data-wp-on--click="actions.goTo" data-wp-class--is-active="state.isActiveDot" data-wp-bind--aria-selected="state.dotAriaSelected"></button>',
			$this_dot_id,
			$controls_id,
			$d,
			$d - 1
		);
	}
	$dots_html .= '</div>';
}

// Output.
// H10: role="region" + aria-label names the carousel landmark for screen readers.
// aria-live="polite" announces when the active slide changes. The Interactivity API
// reactively updates aria-selected on dots and is-active classes on slides.
printf(
	'<div %s><div class="sgs-testimonial-slider__track" role="region" aria-label="Customer Testimonials" aria-live="polite"%s data-wp-on--scroll="actions.handleScroll">%s</div>%s%s%s</div>',
	$wrapper_attributes,
	$track_style_attr,
	$slides_html,
	$arrows_html,
	$pause_html,
	$dots_html
);
