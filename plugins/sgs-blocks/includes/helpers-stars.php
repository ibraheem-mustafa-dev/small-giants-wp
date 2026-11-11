<?php
/**
 * Star-rating markup shared by the review blocks.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Render inline SVG star icons for a given rating value.
 *
 * Used by star-rating, testimonial, and google-reviews blocks so star markup
 * is defined in exactly one place. Outputs filled, half, and empty SVG stars.
 *
 * @param float  $rating      Rating value, e.g. 4.5.
 * @param int    $best_rating Maximum stars to display (default 5).
 * @param int    $size        SVG width/height in pixels (default 20).
 * @param string $colour_css  CSS colour value for filled stars (default: currentColor).
 * @return string HTML string — a sequence of <span> elements, each wrapping an <svg>.
 */
function sgs_render_stars( float $rating, int $best_rating = 5, int $size = 20, string $colour_css = 'currentColor' ): string {
	$stars_html = '';
	$safe_size  = absint( $size );
	$safe_color = esc_attr( $colour_css );

	for ( $i = 1; $i <= $best_rating; $i++ ) {
		$filled = $i <= floor( $rating );
		$half   = ! $filled && ceil( $rating ) === (float) $i && fmod( $rating, 1 ) >= 0.5;

		if ( $half ) {
			$grad_id     = 'sgs-star-half-' . $i . '-' . wp_unique_id();
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--half" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<defs><linearGradient id="%s"><stop offset="50%%" stop-color="%s"/><stop offset="50%%" stop-color="%s" stop-opacity="0.25"/></linearGradient></defs>' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#%s)"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				esc_attr( $grad_id ),
				$safe_color,
				$safe_color,
				esc_attr( $grad_id )
			);
		} elseif ( $filled ) {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--filled" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="%s"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		} else {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--empty" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="%s" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.35"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		}
	}

	return $stars_html;
}
