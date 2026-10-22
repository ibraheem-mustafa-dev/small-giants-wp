<?php
/**
 * An uploaded SVG attachment's markup, ready to print inline: read from the attachment's file, rebuilt through
 * sgs_svg_sanitise_document() and cached per attachment and file modification time (a replaced file is re-read).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-svg-document.php';

if ( ! function_exists( 'sgs_svg_inline_attachment' ) ) {
	/**
	 * The attachment's sanitised SVG markup, or '' when it is not an SVG file or the file is refused.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	function sgs_svg_inline_attachment( int $attachment_id ): string {
		if ( $attachment_id <= 0 ) {
			return '';
		}
		$path = (string) get_attached_file( $attachment_id );
		if ( '' === $path || 'svg' !== strtolower( pathinfo( $path, PATHINFO_EXTENSION ) ) || ! is_readable( $path ) ) {
			return '';
		}
		$stamp  = (int) filemtime( $path ) . ':' . (int) filesize( $path ) . ':' . md5_file( __DIR__ . '/helpers-svg-document.php' ) . md5_file( __DIR__ . '/helpers-svg-kses.php' );
		$key    = 'sgs_svg_inline_' . $attachment_id;
		$cached = get_transient( $key );
		if ( is_array( $cached ) && ( $cached['stamp'] ?? '' ) === $stamp && is_string( $cached['svg'] ?? null ) ) {
			return $cached['svg'];
		}
		$raw = (string) file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local attachment file.
		$svg = sgs_svg_sanitise_document( $raw )['svg'];
		set_transient(
			$key,
			array(
				'stamp' => $stamp,
				'svg'   => $svg,
			),
			30 * DAY_IN_SECONDS
		);
		return $svg;
	}
}

if ( ! function_exists( 'sgs_svg_inline_root_attributes' ) ) {
	/**
	 * Put attributes on the root <svg> of sanitised markup, ahead of the file's own (the first of a repeated
	 * attribute wins in HTML, so these override a role or aria-hidden the file carries).
	 *
	 * @param string               $svg   Markup from sgs_svg_inline_attachment().
	 * @param array<string,string> $attrs Attribute name => value; escaped here.
	 * @return string
	 */
	function sgs_svg_inline_root_attributes( string $svg, array $attrs ): string {
		if ( 0 !== strpos( $svg, '<svg' ) ) {
			return '';
		}
		$printed = '';
		foreach ( $attrs as $name => $value ) {
			$printed .= ' ' . sanitize_key( (string) $name ) . '="' . esc_attr( (string) $value ) . '"';
		}
		return '<svg' . $printed . substr( $svg, 4 );
	}
}
