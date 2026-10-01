<?php
/**
 * SVG uploads to the media library — sanitised on the way in.
 *
 * WordPress refuses `.svg` uploads by default because an SVG is XML that can
 * carry script. SGS sites use SVGs as images (client logos, brand marks), so
 * the framework accepts them for any user who can upload files, and makes
 * every uploaded file safe before WordPress stores it:
 *
 *   1. The markup is run through wp_kses() with the framework's SVG allowlist
 *      (sgs_svg_kses_allowed_tags(), the same list inline SVGs use), minus
 *      <animate> (it can rewrite an attribute such as href at run time).
 *      Scripts, event handlers (on*), <foreignObject> and every HTML element
 *      are removed.
 *   2. Every href / xlink:href that is not an in-file fragment (`#id`) is
 *      removed, and so is any attribute whose value holds a url() that is not
 *      an in-file fragment, so a file can neither load nor link to anything
 *      outside itself (wp_kses() checks neither the protocol of xlink:href nor
 *      a url() inside a value).
 *   3. The XML prolog, DOCTYPE and any entity declarations are dropped
 *      (no external entities), and a file with no <svg> root left is refused.
 *
 * The same sanitising runs on both ways a file reaches the media library: an
 * upload (wp_handle_upload) and a sideload from a URL (wp_handle_sideload, used
 * by importers and WooCommerce's remote product images).
 *
 * The attachment's width and height are read from the root's width/height
 * or viewBox, so blocks that size by the image's own ratio work as for a
 * raster image.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_svg_upload_sanitise' ) ) {
	/**
	 * Sanitise uploaded SVG markup.
	 *
	 * @param string $markup Raw file contents.
	 * @return string Safe SVG markup, or '' when nothing usable remains.
	 */
	function sgs_svg_upload_sanitise( string $markup ): string {
		// No prolog, DOCTYPE, entity declarations or comments.
		$markup = preg_replace( '/<\?xml.*?\?>/is', '', $markup );
		$markup = preg_replace( '/<!DOCTYPE[^>\[]*(\[[^\]]*\])?\s*>/is', '', (string) $markup );
		$markup = preg_replace( '/<!ENTITY.*?>/is', '', (string) $markup );
		$markup = preg_replace( '/<!--.*?-->/s', '', (string) $markup );

		$allowed = sgs_svg_kses_allowed_tags();
		unset( $allowed['animate'] );
		$markup = wp_kses( (string) $markup, $allowed );

		// Only in-file references survive (#id): no external or javascript: link.
		$markup = preg_replace_callback(
			'/\s(xlink:href|href)\s*=\s*("([^"]*)"|\'([^\']*)\')/i',
			static function ( $match ) {
				$value = '' !== ( $match[3] ?? '' ) ? $match[3] : ( $match[4] ?? '' );
				return 0 === strpos( trim( $value ), '#' ) ? $match[0] : '';
			},
			(string) $markup
		);

		// No url() reference to anything outside the file, in any attribute
		// (fill, filter, mask, clip-path, style): an attribute holding a url()
		// that is not an in-file fragment (#id) is removed.
		$markup = preg_replace_callback(
			'/\s[a-zA-Z:-]+\s*=\s*("([^"]*)"|\'([^\']*)\')/',
			static function ( $match ) {
				$value = '' !== ( $match[2] ?? '' ) ? $match[2] : ( $match[3] ?? '' );
				return preg_match( '/url\(\s*[\'"]?\s*(?!#)/i', $value ) ? '' : $match[0];
			},
			(string) $markup
		);

		$markup = trim( (string) $markup );
		return preg_match( '/^<svg\b/i', $markup ) ? $markup : '';
	}
}

/**
 * Allow the SVG type for users who can upload files.
 *
 * @param array $mimes Allowed extension => MIME map.
 * @return array
 */
function sgs_svg_upload_mimes( $mimes ) {
	if ( is_array( $mimes ) && current_user_can( 'upload_files' ) ) {
		$mimes['svg'] = 'image/svg+xml';
	}
	return $mimes;
}
add_filter( 'upload_mimes', 'sgs_svg_upload_mimes' );

/**
 * WordPress's content sniffing cannot identify an SVG (it is text), so confirm
 * the type from the extension and the file's own root element.
 *
 * @param array  $data     Values WordPress determined.
 * @param string $file     Full path to the uploaded file.
 * @param string $filename The file's name.
 * @return array
 */
function sgs_svg_upload_filetype( $data, $file, $filename ) {
	if ( 'svg' !== strtolower( pathinfo( (string) $filename, PATHINFO_EXTENSION ) ) || ! current_user_can( 'upload_files' ) ) {
		return $data;
	}
	$head = is_readable( $file ) ? (string) file_get_contents( $file, false, null, 0, 4096 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local upload tmp file.
	if ( preg_match( '/<svg\b/i', $head ) ) {
		$data['ext']             = 'svg';
		$data['type']            = 'image/svg+xml';
		$data['proper_filename'] = $data['proper_filename'] ?? false;
	}
	return $data;
}
add_filter( 'wp_check_filetype_and_ext', 'sgs_svg_upload_filetype', 10, 3 );

/**
 * Sanitise an SVG in place before WordPress moves it into the uploads folder.
 *
 * @param array $file The $_FILES-style upload array.
 * @return array The same array, with 'error' set when the file is refused.
 */
function sgs_svg_upload_prefilter( $file ) {
	$name = (string) ( $file['name'] ?? '' );
	if ( 'svg' !== strtolower( pathinfo( $name, PATHINFO_EXTENSION ) ) ) {
		return $file;
	}
	$path = (string) ( $file['tmp_name'] ?? '' );
	$raw  = is_readable( $path ) ? (string) file_get_contents( $path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local upload tmp file.
	$safe = sgs_svg_upload_sanitise( $raw );
	if ( '' === $safe ) {
		$file['error'] = __( 'This SVG could not be made safe to upload.', 'sgs-blocks' );
		return $file;
	}
	file_put_contents( $path, $safe ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- rewriting the upload tmp file before WordPress moves it.
	$file['size'] = strlen( $safe );
	return $file;
}
add_filter( 'wp_handle_upload_prefilter', 'sgs_svg_upload_prefilter' );
add_filter( 'wp_handle_sideload_prefilter', 'sgs_svg_upload_prefilter' );

/**
 * Record an SVG attachment's width and height from its root element, so blocks
 * that size an image by its own ratio treat it like a raster image.
 *
 * @param array $metadata      Attachment metadata.
 * @param int   $attachment_id Attachment ID.
 * @return array
 */
function sgs_svg_upload_metadata( $metadata, $attachment_id ) {
	if ( 'image/svg+xml' !== get_post_mime_type( $attachment_id ) ) {
		return $metadata;
	}
	$path = get_attached_file( $attachment_id );
	$head = ( $path && is_readable( $path ) ) ? (string) file_get_contents( $path, false, null, 0, 4096 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local attachment file.
	if ( ! preg_match( '/<svg\b[^>]*>/i', $head, $root ) ) {
		return $metadata;
	}
	$width  = preg_match( '/\swidth\s*=\s*["\']([\d.]+)(px)?["\']/i', $root[0], $w ) ? (float) $w[1] : 0.0;
	$height = preg_match( '/\sheight\s*=\s*["\']([\d.]+)(px)?["\']/i', $root[0], $h ) ? (float) $h[1] : 0.0;
	if ( ( ! $width || ! $height ) && preg_match( '/\sviewBox\s*=\s*["\']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["\']/i', $root[0], $vb ) ) {
		$width  = (float) $vb[1];
		$height = (float) $vb[2];
	}
	if ( $width && $height ) {
		$metadata           = is_array( $metadata ) ? $metadata : array();
		$metadata['width']  = (int) round( $width );
		$metadata['height'] = (int) round( $height );
		$metadata['file']   = $metadata['file'] ?? _wp_relative_upload_path( (string) $path );
	}
	return $metadata;
}
add_filter( 'wp_generate_attachment_metadata', 'sgs_svg_upload_metadata', 10, 2 );
