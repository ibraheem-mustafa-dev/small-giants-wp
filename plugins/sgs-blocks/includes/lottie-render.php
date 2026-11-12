<?php
/**
 * Lottie effect layer helpers: the attachment's file URL for a Lottie effect layer, and the `render_block` filter that
 * adds it to the layer's element.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * The URL a Lottie effect layer fetches its animation from: the attachment's file when it is a Lottie JSON with valid
 * stored meta (an attachment that is a Lottie JSON with valid stored meta), else an empty string.
 *
 * @param int $attachment_id Lottie JSON attachment ID (the layer's `file` value).
 * @return string File URL, or '' when the attachment is not a usable Lottie.
 */
function sgs_lottie_layer_source_url( int $attachment_id ): string {
	if ( $attachment_id <= 0 || 'application/json' !== get_post_mime_type( $attachment_id ) ) {
		return '';
	}
	$meta = get_post_meta( $attachment_id, '_sgs_lottie_meta', true );
	if ( ! is_array( $meta ) || empty( $meta['w'] ) || empty( $meta['h'] ) ) {
		return '';
	}
	$src = wp_get_attachment_url( $attachment_id );
	return is_string( $src ) ? $src : '';
}

/**
 * Add `data-src` to every element carrying a Lottie effect layer's `data-sgs-fx-lottie-file`. The layer stores the
 * animation as an attachment ID; the browser needs its URL, which only the server can resolve. An element whose
 * attachment is not a usable Lottie keeps no `data-src`, so `fx-lottie.js` leaves it as rendered.
 *
 * Hooked on `render_block` after the motion renderer has printed the layer attributes.
 *
 * @param mixed $block_content Rendered block HTML.
 * @return mixed The HTML, with `data-src` added where a layer names a usable Lottie.
 */
function sgs_lottie_layer_add_source( $block_content ) {
	if ( ! is_string( $block_content ) || false === strpos( $block_content, 'data-sgs-fx-lottie-file=' ) ) {
		return $block_content;
	}
	$processor = new WP_HTML_Tag_Processor( $block_content );
	while ( $processor->next_tag() ) {
		$file = $processor->get_attribute( 'data-sgs-fx-lottie-file' );
		if ( ! is_string( $file ) || ! ctype_digit( $file ) ) {
			continue;
		}
		$url = sgs_lottie_layer_source_url( (int) $file );
		if ( '' !== $url ) {
			$processor->set_attribute( 'data-src', $url );
		}
	}
	return $processor->get_updated_html();
}
