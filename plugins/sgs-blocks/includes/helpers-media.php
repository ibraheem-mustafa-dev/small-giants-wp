<?php
/**
 * Media rendering helpers for SGS block server-side rendering.
 *
 * Provides sgs_responsive_image(), sgs_render_stars(), and sgs_render_media() —
 * outputting responsive image tags, inline SVG star ratings, and unified
 * image/video media slots.
 *
 * @package SGS\Blocks
 */

/**
 * Output a responsive image tag with srcset when a valid attachment ID is available.
 *
 * Falls back to a plain <img> when the attachment ID is 0 or invalid (e.g. images
 * imported from external URLs or pasted content without media library entries).
 *
 * @param int    $id    WordPress attachment ID (0 = unknown/external).
 * @param string $url   Image URL fallback.
 * @param string $alt   Alt text.
 * @param string $size  WordPress image size name (default: 'large').
 * @param array  $attrs Extra HTML attributes (class, style, loading, etc.).
 * @return string HTML img tag.
 */
function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs = array() ): string {
	// Merge defaults.
	$attrs = array_merge(
		array(
			'loading'  => 'lazy',
			'decoding' => 'async',
		),
		$attrs
	);

	// Use wp_get_attachment_image when we have a real attachment ID.
	if ( $id > 0 ) {
		$image = wp_get_attachment_image( $id, $size, false, array_merge( $attrs, array( 'alt' => $alt ) ) );
		if ( $image ) {
			return $image;
		}
	}

	// Fallback: plain <img> with no srcset.
	// Attempt to retrieve explicit dimensions from the attachment metadata so
	// the browser can reserve the correct space and avoid layout shift (CLS).
	if ( ! isset( $attrs['width'] ) && ! isset( $attrs['height'] ) ) {
		$resolve_id = $id;
		// If no attachment ID was provided, try resolving from URL.
		if ( 0 === $resolve_id && ! empty( $url ) ) {
			$resolve_id = absint( attachment_url_to_postid( $url ) );
		}
		if ( $resolve_id > 0 ) {
			$src_data = wp_get_attachment_image_src( $resolve_id, $size );
			if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
				$attrs['width']  = (int) $src_data[1];
				$attrs['height'] = (int) $src_data[2];
			}
		}
	}

	$attr_str = '';
	foreach ( $attrs as $key => $value ) {
		$attr_str .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
	}

	return sprintf(
		'<img src="%s" alt="%s"%s />',
		esc_url( $url ),
		esc_attr( $alt ),
		$attr_str
	);
}

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

if ( ! function_exists( 'sgs_render_media' ) ) {
	/**
	 * Render an image or video from a unified SGS media-slot attribute.
	 *
	 * Used by any block that accepts both image and video in the same slot
	 * (Gap H-3 — "video everywhere image works"). Pairs with the JS
	 * MediaPicker component which produces the attribute shape this helper
	 * consumes.
	 *
	 * Expected $attrs shape:
	 *   - url           string  Asset URL (required — empty string => silent return).
	 *   - type          string  'image' | 'video'.
	 *   - alt           string  Alt text (image) or aria-label (video). Optional.
	 *   - id            int     Attachment ID (0 = external). Optional.
	 *   - mobile_url    string  Optional mobile-specific source (image only — emits <picture>).
	 *   - video_options array   Optional override for video flags. Keys:
	 *       autoplay (bool, default true)
	 *       loop     (bool, default true)
	 *       muted    (bool, default true)
	 *       controls (bool, default false)
	 *       playsinline (bool, default true)
	 *
	 * For images: emits a lazy-loaded <img> (or <picture> with mobile source).
	 * For videos: emits a <video> with safe defaults — autoplay, loop, muted,
	 * playsinline so the asset autoplays on mobile without a sound prompt.
	 * Empty url returns an empty string so the caller can render a fallback.
	 *
	 * @param array  $attrs   Media attributes (see shape above).
	 * @param string $context Block name for class scoping (e.g. 'sgs/hero').
	 * @return string HTML string, or '' if no url is provided.
	 */
	function sgs_render_media( $attrs, $context = '' ) {
		if ( empty( $attrs ) || ! is_array( $attrs ) ) {
			return '';
		}

		$url = isset( $attrs['url'] ) ? trim( (string) $attrs['url'] ) : '';
		if ( '' === $url ) {
			return '';
		}

		$type = isset( $attrs['type'] ) ? (string) $attrs['type'] : 'image';
		$alt  = isset( $attrs['alt'] ) ? (string) $attrs['alt'] : '';

		// Build a CSS-safe context slug for the class hook.
		$context_slug = preg_replace( '/[^a-z0-9-]/', '-', strtolower( (string) $context ) );
		$context_slug = trim( $context_slug, '-' );
		$context_cls  = '' !== $context_slug ? ' sgs-media--' . $context_slug : '';

		if ( 'video' === $type ) {
			$opts_in = isset( $attrs['video_options'] ) && is_array( $attrs['video_options'] )
				? $attrs['video_options']
				: array();
			$opts    = array_merge(
				array(
					'autoplay'    => true,
					'loop'        => true,
					'muted'       => true,
					'controls'    => false,
					'playsinline' => true,
				),
				$opts_in
			);

			$flags = '';
			if ( ! empty( $opts['autoplay'] ) ) {
				$flags .= ' autoplay';
			}
			if ( ! empty( $opts['loop'] ) ) {
				$flags .= ' loop';
			}
			if ( ! empty( $opts['muted'] ) ) {
				$flags .= ' muted';
			}
			if ( ! empty( $opts['playsinline'] ) ) {
				$flags .= ' playsinline';
			}
			if ( ! empty( $opts['controls'] ) ) {
				$flags .= ' controls';
			}

			// Resolve MIME from extension fallback if not explicit.
			$mime = isset( $attrs['mime'] ) && $attrs['mime'] ? (string) $attrs['mime'] : '';
			if ( '' === $mime ) {
				$ext  = strtolower( pathinfo( wp_parse_url( $url, PHP_URL_PATH ) ?? '', PATHINFO_EXTENSION ) );
				$map  = array(
					'mp4'  => 'video/mp4',
					'webm' => 'video/webm',
					'ogv'  => 'video/ogg',
					'mov'  => 'video/quicktime',
				);
				$mime = isset( $map[ $ext ] ) ? $map[ $ext ] : 'video/mp4';
			}

			$aria = '' !== $alt ? $alt : esc_attr__( 'Background video', 'sgs-blocks' );

			return sprintf(
				'<video class="sgs-media sgs-media--video%s"%s aria-label="%s"><source src="%s" type="%s"></video>',
				esc_attr( $context_cls ),
				$flags,
				esc_attr( $aria ),
				esc_url( $url ),
				esc_attr( $mime )
			);
		}

		// Image branch.
		$mobile_url = isset( $attrs['mobile_url'] ) ? trim( (string) $attrs['mobile_url'] ) : '';
		$img_class  = 'sgs-media sgs-media--image' . $context_cls;
		$img_tag    = sprintf(
			'<img src="%s" alt="%s" class="%s" loading="lazy" decoding="async" />',
			esc_url( $url ),
			esc_attr( $alt ),
			esc_attr( $img_class )
		);

		if ( '' !== $mobile_url ) {
			return sprintf(
				'<picture class="sgs-media-picture%s"><source media="(max-width: 767px)" srcset="%s" />%s</picture>',
				esc_attr( $context_cls ),
				esc_url( $mobile_url ),
				$img_tag
			);
		}

		return $img_tag;
	}
}
