<?php
/**
 * SVG uploads to the media library — sanitised on the way in.
 *
 * WordPress refuses `.svg` uploads by default because an SVG is XML that can
 * carry script. SGS sites use SVGs as images (client logos, brand marks, animated
 * backgrounds), so the framework accepts them for any user who can upload files,
 * and rebuilds every uploaded file through sgs_svg_sanitise_document()
 * (helpers-svg-document.php) before WordPress stores it. The file keeps its own
 * animation (SMIL and a <style> with @keyframes) and its mesh gradients; a file
 * holding a construct the route's SVG screen refuses (an event attribute, an
 * outside link or CSS url(), an animation that rewrites a link, @import,
 * javascript:, <foreignObject>, an element outside the SVG namespace, entity
 * declarations, malformed XML) is refused with the reason. <script>, comments and
 * editor metadata are stripped.
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

require_once __DIR__ . '/helpers-svg-document.php';

if ( ! function_exists( 'sgs_svg_upload_sanitise' ) ) {
	/**
	 * Sanitise uploaded SVG markup.
	 *
	 * @param string $markup Raw file contents.
	 * @return string Safe SVG markup, or '' when the file is refused.
	 */
	function sgs_svg_upload_sanitise( string $markup ): string {
		return sgs_svg_sanitise_document( $markup )['svg'];
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
	$result = sgs_svg_sanitise_document( $raw );
	$safe   = $result['svg'];
	if ( '' === $safe ) {
		/* translators: %s: why the file was refused, e.g. "holds a CSS @import". */
		$file['error'] = sprintf( __( 'This SVG was not uploaded because it %s.', 'sgs-blocks' ), esc_html( $result['error'] ) );
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
