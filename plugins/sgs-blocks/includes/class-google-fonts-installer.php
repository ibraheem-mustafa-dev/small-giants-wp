<?php
/**
 * Google Fonts installer — downloads a Google font family's woff2 files onto the site.
 *
 * Server-side only. Asks Google's CSS2 API for exactly the weights/styles a snapshot records,
 * parses the returned @font-face rules, and saves each woff2 file into the WordPress fonts
 * directory (wp_get_font_dir(), normally wp-content/uploads/fonts) under sgs-google/<slug>/.
 * Visitors are then served the font from the site's own domain and never contact Google.
 *
 * Security: the family name, weights and styles come from a theme.json snapshot, and the file
 * URLs come from Google's response, so both are validated. Only https URLs whose EXACT host is
 * fonts.googleapis.com (CSS) or fonts.gstatic.com (files) are fetched; a host "containing" those
 * names is refused. A downloaded body must carry the woff2 signature and stay under a size cap.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Fetches, validates and stores Google font files.
 */
class Google_Fonts_Installer {

	const CSS_HOST  = 'fonts.googleapis.com';
	const FILE_HOST = 'fonts.gstatic.com';
	const SUBDIR    = 'sgs-google';
	const MAX_BYTES = 2097152;

	const KEYWORD_WEIGHTS = array(
		'normal' => '400',
		'bold'   => '700',
	);

	const ITAL_AXIS = array(
		'normal' => '0',
		'italic' => '1',
	);

	/**
	 * Google serves woff2 only to a modern-browser user agent; the default WP agent gets ttf.
	 */
	const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

	/**
	 * A Google family name: letters, digits and single spaces, as Google publishes them.
	 *
	 * @param string $name Family name.
	 * @return bool
	 */
	public static function valid_family_name( string $name ): bool {
		return 1 === preg_match( '/^[A-Za-z0-9][A-Za-z0-9 ]{0,63}$/', $name );
	}

	/**
	 * Numeric weights 1-1000 as sorted unique strings; keywords normal/bold mapped. Default 400.
	 *
	 * @param array $weights Raw weights.
	 * @return string[]
	 */
	public static function normalise_weights( array $weights ): array {
		$out = array();
		foreach ( $weights as $weight ) {
			$weight = strtolower( trim( (string) $weight ) );
			$weight = self::KEYWORD_WEIGHTS[ $weight ] ?? $weight;
			if ( ctype_digit( $weight ) && (int) $weight >= 1 && (int) $weight <= 1000 ) {
				$out[ (int) $weight ] = (string) (int) $weight;
			}
		}
		ksort( $out );
		return $out ? array_values( $out ) : array( '400' );
	}

	/**
	 * Styles limited to normal/italic (oblique maps to italic). Default normal.
	 *
	 * @param array $styles Raw styles.
	 * @return string[]
	 */
	public static function normalise_styles( array $styles ): array {
		$out = array();
		foreach ( $styles as $style ) {
			$style = strtolower( trim( (string) $style ) );
			if ( 'normal' === $style ) {
				$out['normal'] = 'normal';
			} elseif ( str_starts_with( $style, 'italic' ) || str_starts_with( $style, 'oblique' ) ) {
				$out['italic'] = 'italic';
			}
		}
		ksort( $out );
		return $out ? array_values( $out ) : array( 'normal' );
	}

	/**
	 * The CSS2 API URL for a family at the given weights/styles.
	 *
	 * @param string   $family  Family name (already validated).
	 * @param string[] $weights Normalised weights.
	 * @param string[] $styles  Normalised styles.
	 * @return string
	 */
	public static function css_url( string $family, array $weights, array $styles ): string {
		if ( in_array( 'italic', $styles, true ) ) {
			$tuples = array();
			foreach ( self::ITAL_AXIS as $style => $ital ) {
				if ( in_array( $style, $styles, true ) ) {
					foreach ( $weights as $weight ) {
						$tuples[] = $ital . ',' . $weight;
					}
				}
			}
			$axis = 'ital,wght@' . implode( ';', $tuples );
		} else {
			$axis = 'wght@' . implode( ';', $weights );
		}
		return 'https://' . self::CSS_HOST . '/css2?family=' . str_replace( '%20', '+', rawurlencode( $family ) ) . ':' . $axis . '&display=swap';
	}

	/**
	 * True only for an https URL whose exact host is $host.
	 *
	 * @param string $url  URL.
	 * @param string $host Required host.
	 * @return bool
	 */
	public static function is_allowed_url( string $url, string $host ): bool {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || 'https' !== ( $parts['scheme'] ?? '' ) ) {
			return false;
		}
		return ( $parts['host'] ?? '' ) === $host;
	}

	/**
	 * Parse a CSS2 response into faces for one family. Faces with a disallowed src are dropped.
	 *
	 * @param string $css    Response body.
	 * @param string $family Family name.
	 * @return array[] Each: fontFamily, fontStyle, fontWeight, unicodeRange, url.
	 */
	public static function parse_css( string $css, string $family ): array {
		$faces = array();
		preg_match_all( '/@font-face\s*\{([^}]*)\}/i', $css, $blocks );
		foreach ( $blocks[1] as $block ) {
			$name = preg_match( '/font-family:\s*[\'"]?([^;\'"]+)/i', $block, $m ) ? trim( $m[1] ) : '';
			$url  = preg_match( '/src:\s*url\(\s*[\'"]?([^\'")\s]+)/i', $block, $m ) ? $m[1] : '';
			if ( 0 !== strcasecmp( $name, $family ) || ! self::is_allowed_url( $url, self::FILE_HOST ) ) {
				continue;
			}
			$faces[] = array(
				'fontFamily'   => $name,
				'fontStyle'    => preg_match( '/font-style:\s*([^;]+)/i', $block, $m ) ? trim( $m[1] ) : 'normal',
				'fontWeight'   => preg_match( '/font-weight:\s*([^;]+)/i', $block, $m ) ? trim( $m[1] ) : '400',
				'unicodeRange' => preg_match( '/unicode-range:\s*([^;]+)/i', $block, $m ) ? trim( $m[1] ) : '',
				'url'          => $url,
			);
		}
		return $faces;
	}

	/**
	 * Download a family and return its faces with site-relative file paths.
	 *
	 * @param string $family  Family name.
	 * @param array  $weights Weights.
	 * @param array  $styles  Styles.
	 * @return array[]|\WP_Error Faces (fontFamily, fontStyle, fontWeight, unicodeRange, file).
	 */
	public function install( string $family, array $weights, array $styles ) {
		if ( ! self::valid_family_name( $family ) || ! function_exists( 'wp_get_font_dir' ) ) {
			return new \WP_Error( 'sgs_google_fonts_invalid', 'Invalid family name or Font Library unavailable.' );
		}
		$weights = self::normalise_weights( $weights );
		$styles  = self::normalise_styles( $styles );
		$css     = $this->get( self::css_url( $family, $weights, $styles ) );
		if ( is_wp_error( $css ) ) {
			// Google refuses a request naming a weight the family lacks: fall back to its default.
			$css = $this->get( 'https://' . self::CSS_HOST . '/css2?family=' . str_replace( '%20', '+', rawurlencode( $family ) ) . '&display=swap' );
		}
		if ( is_wp_error( $css ) ) {
			return $css;
		}
		$faces = self::parse_css( $css, $family );
		if ( ! $faces ) {
			return new \WP_Error( 'sgs_google_fonts_empty', 'Google returned no usable @font-face for ' . $family . '.' );
		}
		return $this->store( $family, $faces );
	}

	/**
	 * Save each unique face file into the fonts directory.
	 *
	 * @param string  $family Family name.
	 * @param array[] $faces  Parsed faces.
	 * @return array[]|\WP_Error
	 */
	private function store( string $family, array $faces ) {
		global $wp_filesystem;
		require_once ABSPATH . 'wp-admin/includes/file.php';
		if ( ! WP_Filesystem() ) {
			return new \WP_Error( 'sgs_google_fonts_fs', 'Filesystem not writable without credentials.' );
		}
		$relative = self::SUBDIR . '/' . sanitize_title( $family );
		$dir      = wp_get_font_dir()['path'] . '/' . $relative;
		if ( ! wp_mkdir_p( $dir ) ) {
			return new \WP_Error( 'sgs_google_fonts_dir', 'Could not create ' . $relative . '.' );
		}
		$out = array();
		foreach ( $faces as $face ) {
			$name = sanitize_file_name( basename( (string) wp_parse_url( $face['url'], PHP_URL_PATH ) ) );
			if ( ! str_ends_with( $name, '.woff2' ) ) {
				continue;
			}
			if ( ! file_exists( $dir . '/' . $name ) ) {
				$body = $this->get( $face['url'] );
				if ( is_wp_error( $body ) || ! str_starts_with( $body, 'wOF2' ) || strlen( $body ) > self::MAX_BYTES ) {
					return new \WP_Error( 'sgs_google_fonts_file', 'Font file download failed or was not woff2: ' . $name );
				}
				if ( ! $wp_filesystem->put_contents( $dir . '/' . $name, $body, FS_CHMOD_FILE ) ) {
					return new \WP_Error( 'sgs_google_fonts_write', 'Could not write ' . $name . '.' );
				}
			}
			unset( $face['url'] );
			$face['file'] = $relative . '/' . $name;
			$out[]        = $face;
		}
		return $out ? $out : new \WP_Error( 'sgs_google_fonts_empty', 'No woff2 files in the response.' );
	}

	/**
	 * GET an allowed Google URL and return the body.
	 *
	 * @param string $url URL.
	 * @return string|\WP_Error
	 */
	private function get( string $url ) {
		if ( ! self::is_allowed_url( $url, self::CSS_HOST ) && ! self::is_allowed_url( $url, self::FILE_HOST ) ) {
			return new \WP_Error( 'sgs_google_fonts_host', 'Refused a URL outside the Google Fonts hosts.' );
		}
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'             => 20,
				'user-agent'          => self::USER_AGENT,
				'limit_response_size' => self::MAX_BYTES + 1,
			)
		);
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		if ( 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return new \WP_Error( 'sgs_google_fonts_http', 'HTTP ' . wp_remote_retrieve_response_code( $response ) . ' from ' . $url );
		}
		return (string) wp_remote_retrieve_body( $response );
	}
}
