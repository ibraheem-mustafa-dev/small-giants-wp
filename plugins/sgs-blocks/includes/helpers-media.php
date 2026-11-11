<?php
/**
 * Media rendering helpers for SGS block server-side rendering.
 *
 * Provides sgs_responsive_image() and the page-wide loading-priority helpers the background layer still reads.
 *
 * @package SGS\Blocks
 */

require_once __DIR__ . '/helpers-image-dimensions.php';

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
 * Return the next 1-based index in the PAGE-WIDE background-image render order.
 *
 * LCP (Largest Contentful Paint) priority is a PAGE-level property, not a
 * per-block one: `fetchpriority="high"` should land on whichever background
 * image renders FIRST on the page, full stop. Every block that renders its
 * own background <img> (sgs/hero, the shared SGS_Container_Wrapper used by
 * sgs/container/trust-bar/etc.) must therefore share ONE counter
 * — a private `static` inside each block's own render path only knows "am I
 * first within MY code path", not "am I first on the page". Two independent
 * counters both returning 1 for their own first call means a page with (say)
 * a hero background image followed by a container background image marks
 * BOTH `fetchpriority="high"`/`loading="eager"` — prioritising two images
 * prioritises neither, defeating the entire reason this exists.
 *
 * A PHP `static` local persists for the lifetime of the current request only
 * (WordPress does not share it across requests), which is exactly the scope
 * needed: "first background image THIS PAGE LOAD rendered."
 *
 * Markup rendered inside a hidden surface (sgs_in_hidden_render_context()) is never the page's lead image: it
 * returns 0 and leaves the counter where it was.
 *
 * @return int 1 on the first call in this request, 2 on the second, etc.; 0 inside a hidden surface.
 */
function sgs_next_background_image_index(): int {
	static $sgs_bg_image_index = 0;
	if ( sgs_in_hidden_render_context() ) {
		return 0;
	}
	++$sgs_bg_image_index;
	return $sgs_bg_image_index;
}
