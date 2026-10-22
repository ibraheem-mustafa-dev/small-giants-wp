<?php
/**
 * Direct-open guard for uploaded SVGs.
 *
 * A trusted SVG keeps its scripts, so opening its upload URL directly must not run them in the site's origin. A block
 * in the uploads folder's .htaccess sends a Content-Security-Policy with `sandbox` (and nosniff) for every .svg and
 * .svgz file. It is written on admin_init whenever its version changes or the block in the file differs from the expected
 * lines (another tool rewrote the file), and a folder that cannot be written is skipped.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

defined( 'SGS_SVG_HTACCESS_VERSION' ) || define( 'SGS_SVG_HTACCESS_VERSION', '1' );

if ( ! function_exists( 'sgs_svg_htaccess_lines' ) ) {
	/**
	 * The lines of the guard block.
	 *
	 * @return string[]
	 */
	function sgs_svg_htaccess_lines(): array {
		return array(
			'<IfModule mod_headers.c>',
			'<FilesMatch "\.svgz?$">',
			'Header always set Content-Security-Policy "default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; sandbox"',
			'Header always set X-Content-Type-Options "nosniff"',
			'</FilesMatch>',
			'</IfModule>',
		);
	}
}

if ( ! function_exists( 'sgs_svg_htaccess_install' ) ) {
	/**
	 * Write the guard block into the uploads folder's .htaccess when its version is not the stored one.
	 *
	 * @return void
	 */
	function sgs_svg_htaccess_install(): void {
		$uploads = wp_upload_dir();
		$base    = (string) ( $uploads['basedir'] ?? '' );
		if ( '' === $base ) {
			return;
		}
		$file = $base . '/.htaccess';
		if ( ! function_exists( 'insert_with_markers' ) || ! function_exists( 'extract_from_markers' ) ) {
			require_once ABSPATH . 'wp-admin/includes/misc.php';
		}
		if ( SGS_SVG_HTACCESS_VERSION === get_option( 'sgs_svg_htaccess_version' ) && file_exists( $file ) && sgs_svg_htaccess_lines() === extract_from_markers( $file, 'SGS SVG' ) ) {
			return;
		}
		if ( file_exists( $file ) ? ! is_writable( $file ) : ! is_writable( $base ) ) {
			return;
		}
		if ( insert_with_markers( $file, 'SGS SVG', sgs_svg_htaccess_lines() ) ) {
			update_option( 'sgs_svg_htaccess_version', SGS_SVG_HTACCESS_VERSION );
		}
	}
}
add_action( 'admin_init', 'sgs_svg_htaccess_install' );
