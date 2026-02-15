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

// Helper for colour values (handles both hex and design token slugs).
$colour_value = function ( $value ) {
	if ( ! $value ) {
		return '';
	}
	// If it starts with # or rgb, it's a direct CSS value.
	if ( '#' === $value[0] || 0 === strpos( $value, 'rgb' ) ) {
		return esc_attr( $value );
	}
	// Otherwise it's a design token slug.
	return 'var(--wp--preset--color--' . esc_attr( $value ) . ')';
};

$font_size_var = function ( $slug ) {
	if ( ! $slug ) {
		return '';
	}
	return 'var(--wp--preset--font-size--' . esc_attr( $slug ) . ')';
};

// Helper to extract initials from name.
$get_initials = function ( $name ) {
	$words = explode( ' ', trim( $name ) );
	if ( count( $words ) === 1 ) {
		return strtoupper( substr( $words[0], 0, 1 ) );
	}
	return strtoupper( substr( $words[0], 0, 1 ) . substr( end( $words ), 0, 1 ) );
};

// Build wrapper classes.
$classes = array(
	'sgs-testimonial-slider',
	'sgs-testimonial-slider--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'                => implode( ' ', $classes ),
		'data-autoplay'        => $autoplay ? 'true' : 'false',
		'data-speed'           => absint( $autoplay_speed ),
		'data-slides'          => absint( $slides_visible ),
	)
);

// Build track styles.
$track_style_attr = ' style="--sgs-slides-visible:' . absint( $slides_visible ) . '"';

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
				$rating_style_attr = ' style="color:' . $colour_value( $rating_colour ) . '"';
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
			$avatar_html .= sprintf(
				'<img src="%s" alt="%s" class="sgs-testimonial-slider__avatar-img" loading="lazy" />',
				esc_url( $avatar['url'] ),
				esc_attr( $name )
			);
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
			$quote_style_attr = ' style="color:' . $colour_value( $quote_colour ) . '"';
		}

		// Build name styles.
		$name_styles = array();
		if ( $name_colour ) {
			$name_styles[] = 'color:' . $colour_value( $name_colour );
		}
		if ( $name_font_size ) {
			$name_styles[] = 'font-size:' . $font_size_var( $name_font_size );
		}
		$name_style_attr = $name_styles ? ' style="' . implode( ';', $name_styles ) . '"' : '';

		// Build role styles.
		$role_style_attr = '';
		if ( $role_colour ) {
			$role_style_attr = ' style="color:' . $colour_value( $role_colour ) . '"';
		}

		// Build slide HTML.
		$slides_html .= sprintf(
			'<blockquote class="sgs-testimonial-slider__slide sgs-testimonial-slider__slide--%s" role="group" aria-label="Testimonial %d of %d">%s<p class="sgs-testimonial-slider__quote"%s>%s</p><footer class="sgs-testimonial-slider__footer">%s<div class="sgs-testimonial-slider__meta"><cite class="sgs-testimonial-slider__name"%s>%s</cite><span class="sgs-testimonial-slider__role"%s>%s</span></div></footer></blockquote>',
			esc_attr( $card_style ),
			$i,
			$total_testimonials,
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
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="Previous testimonial" type="button"><span aria-hidden="true">‹</span></button>';
	$arrows_html .= '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="Next testimonial" type="button"><span aria-hidden="true">›</span></button>';
	$arrows_html .= '</div>';
}

// Build dots HTML (only if there are more testimonials than slides visible).
$dots_html = '';
if ( $show_dots && $total_testimonials > $slides_visible ) {
	$dots_html = '<div class="sgs-testimonial-slider__dots" role="tablist" aria-label="Testimonial navigation">';
	for ( $d = 1; $d <= $total_testimonials; $d++ ) {
		$is_first = ( 1 === $d );
		$dots_html .= sprintf(
			'<button class="sgs-testimonial-slider__dot%s" role="tab" aria-selected="%s" aria-label="Go to testimonial %d" type="button"></button>',
			$is_first ? ' sgs-testimonial-slider__dot--active' : '',
			$is_first ? 'true' : 'false',
			$d
		);
	}
	$dots_html .= '</div>';
}

// Output.
printf(
	'<div %s><div class="sgs-testimonial-slider__track" role="region" aria-label="Testimonials" tabindex="0"%s>%s</div>%s%s</div>',
	$wrapper_attributes,
	$track_style_attr,
	$slides_html,
	$arrows_html,
	$dots_html
);
