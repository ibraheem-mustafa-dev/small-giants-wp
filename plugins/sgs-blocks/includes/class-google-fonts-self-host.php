<?php
/**
 * Google Fonts self-host — any theme.json font family flagged `google: true` that has no locally
 * served face gets its files downloaded onto the site automatically, with no person uploading
 * anything and no visitor ever contacting Google.
 *
 * How it fits with the Spec 33 extractor (FR-33-18): the extractor normally self-hosts a draft's
 * Google fonts at extract time into the theme's assets/fonts/ folder, so a deployed snapshot
 * already has local `file:./` faces and this class does nothing. It acts only when a `google: true`
 * entry reaches a site with NO loadable local face: a hand-edited snapshot, a face file missing on
 * the server, or a face pointing at Google's own servers. Then:
 *
 *   1. the `wp_theme_json_data_theme` / `_user` filter queues the family and schedules a one-off
 *      WP-Cron event (never downloads during a visitor's request), and strips any remote src so
 *      the page never asks Google for the font in the meantime;
 *   2. the cron event (or `wp sgs google-fonts sync`) calls Google_Fonts_Installer, which saves the
 *      woff2 files into wp-content/uploads/fonts/sgs-google/<slug>/ and records them in the
 *      `sgs_google_fonts_manifest` option;
 *   3. on later requests the filter injects `fontFace` entries pointing at those files, and core's
 *      WP_Font_Face prints the @font-face rules from the site's own domain.
 *
 * Only the weights/styles the entry records (`fontWeights` / `fontStyles`) are fetched. Turn the
 * whole mechanism off with `add_filter( 'sgs_google_fonts_self_host', '__return_false' );`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Detects Google font families that need local files and supplies them.
 */
class Google_Fonts_Self_Host {

	const MANIFEST  = 'sgs_google_fonts_manifest';
	const PENDING   = 'sgs_google_fonts_pending';
	const CRON_HOOK = 'sgs_google_fonts_install';
	const RETRY     = 3600;

	/**
	 * Installer.
	 *
	 * @var Google_Fonts_Installer
	 */
	private $installer;

	/**
	 * Wire hooks.
	 *
	 * @param Google_Fonts_Installer $installer Installer.
	 */
	public function __construct( Google_Fonts_Installer $installer ) {
		$this->installer = $installer;
		add_filter( 'wp_theme_json_data_theme', array( $this, 'filter_theme_json' ), 20 );
		add_filter( 'wp_theme_json_data_user', array( $this, 'filter_theme_json' ), 20 );
		add_action( self::CRON_HOOK, array( $this, 'install_pending' ) );
	}

	/**
	 * Whether self-hosting is on (default on).
	 *
	 * @return bool
	 */
	public static function enabled(): bool {
		return (bool) apply_filters( 'sgs_google_fonts_self_host', true );
	}

	/**
	 * Primary family name of a CSS stack, quotes stripped.
	 *
	 * @param string $stack Font-family stack.
	 * @return string
	 */
	public static function primary_family( string $stack ): string {
		return trim( trim( explode( ',', $stack )[0] ), " '\"" );
	}

	/**
	 * Manifest key + signature for a request.
	 *
	 * @param string $family  Family.
	 * @param array  $weights Weights.
	 * @param array  $styles  Styles.
	 * @return string
	 */
	public static function signature( string $family, array $weights, array $styles ): string {
		return md5( strtolower( $family ) . '|' . implode( ',', $weights ) . '|' . implode( ',', $styles ) );
	}

	/**
	 * Google entries with no loadable face anywhere in the list, keyed by list index.
	 *
	 * @param array    $families      fontFamilies list.
	 * @param callable $face_loadable fn( string $src ): bool.
	 * @return array[] index => family, weights, styles, signature.
	 */
	public static function required( array $families, callable $face_loadable ): array {
		$local = array();
		foreach ( $families as $fam ) {
			foreach ( (array) ( $fam['fontFace'] ?? array() ) as $face ) {
				$srcs = (array) ( $face['src'] ?? array() );
				if ( $srcs && count( array_filter( $srcs, $face_loadable ) ) === count( $srcs ) ) {
					$local[ strtolower( self::primary_family( (string) ( $face['fontFamily'] ?? '' ) ) ) ] = true;
				}
			}
		}
		$out = array();
		foreach ( $families as $i => $fam ) {
			$family = self::primary_family( (string) ( $fam['fontFamily'] ?? '' ) );
			if ( empty( $fam['google'] ) || '' === $family || isset( $local[ strtolower( $family ) ] )
				|| ! Google_Fonts_Installer::valid_family_name( $family ) ) {
				continue;
			}
			$weights   = Google_Fonts_Installer::normalise_weights( (array) ( $fam['fontWeights'] ?? array() ) );
			$styles    = Google_Fonts_Installer::normalise_styles( (array) ( $fam['fontStyles'] ?? array() ) );
			$out[ $i ] = array(
				'family'    => $family,
				'weights'   => $weights,
				'styles'    => $styles,
				'signature' => self::signature( $family, $weights, $styles ),
			);
		}
		return $out;
	}

	/**
	 * Is a fontFace src served from this site (theme file that exists, or own-domain URL)?
	 *
	 * @param string $src Src.
	 * @return bool
	 */
	public static function is_local_src( string $src ): bool {
		if ( str_starts_with( $src, 'file:./' ) ) {
			return file_exists( get_theme_file_path( substr( $src, 7 ) ) );
		}
		$host = wp_parse_url( $src, PHP_URL_HOST );
		return is_string( $host ) && wp_parse_url( home_url(), PHP_URL_HOST ) === $host;
	}

	/**
	 * Theme.json data filter: inject installed faces, strip remote ones, queue what is missing.
	 *
	 * @param \WP_Theme_JSON_Data $theme_json Data.
	 * @return \WP_Theme_JSON_Data
	 */
	public function filter_theme_json( $theme_json ) {
		if ( ! self::enabled() || ! function_exists( 'wp_get_font_dir' ) ) {
			return $theme_json;
		}
		$data     = $theme_json->get_data();
		$families = $data['settings']['typography']['fontFamilies'] ?? null;
		if ( ! is_array( $families ) || array_values( $families ) !== $families ) {
			return $theme_json;
		}
		$required = self::required( $families, array( __CLASS__, 'is_local_src' ) );
		if ( ! $required ) {
			return $theme_json;
		}
		$manifest = (array) get_option( self::MANIFEST, array() );
		$base_url = wp_get_font_dir()['url'];
		$pending  = array();
		foreach ( $required as $i => $req ) {
			$entry = $manifest[ $req['signature'] ] ?? null;
			unset( $families[ $i ]['fontFace'] );
			if ( is_array( $entry ) && ! empty( $entry['faces'] ) && self::files_exist( $entry['faces'] ) ) {
				$families[ $i ]['fontFace'] = self::faces_for_theme_json( $entry['faces'], $base_url );
			} elseif ( ! is_array( $entry ) || empty( $entry['failed'] ) || time() - (int) $entry['failed'] > self::RETRY ) {
				$pending[ $req['signature'] ] = $req;
			}
		}
		if ( $pending ) {
			$this->queue( $pending );
		}
		return $theme_json->update_with(
			array(
				'version'  => 3,
				'settings' => array( 'typography' => array( 'fontFamilies' => $families ) ),
			)
		);
	}

	/**
	 * Every recorded face file still exists on disk.
	 *
	 * @param array[] $faces Manifest faces.
	 * @return bool
	 */
	private static function files_exist( array $faces ): bool {
		$dir = wp_get_font_dir()['path'];
		foreach ( $faces as $face ) {
			if ( ! file_exists( $dir . '/' . $face['file'] ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Manifest faces -> theme.json fontFace entries.
	 *
	 * @param array[] $faces    Manifest faces.
	 * @param string  $base_url Fonts directory URL.
	 * @return array[]
	 */
	public static function faces_for_theme_json( array $faces, string $base_url ): array {
		$out = array();
		foreach ( $faces as $face ) {
			$row = array(
				'fontFamily'  => $face['fontFamily'],
				'fontStyle'   => $face['fontStyle'],
				'fontWeight'  => $face['fontWeight'],
				'fontDisplay' => 'swap',
				'src'         => array( $base_url . '/' . $face['file'] ),
			);
			if ( '' !== ( $face['unicodeRange'] ?? '' ) ) {
				$row['unicodeRange'] = $face['unicodeRange'];
			}
			$out[] = $row;
		}
		return $out;
	}

	/**
	 * Store the pending set (only when it changed) and schedule one install run.
	 *
	 * @param array[] $pending signature => request.
	 * @return void
	 */
	private function queue( array $pending ): void {
		$stored = (array) get_option( self::PENDING, array() );
		if ( array_diff_key( $pending, $stored ) ) {
			update_option( self::PENDING, array_merge( $stored, $pending ), false );
		}
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_single_event( time(), self::CRON_HOOK );
		}
	}

	/**
	 * Install every pending family. Cron callback and WP-CLI entry point.
	 *
	 * @return array signature => true|\WP_Error.
	 */
	public function install_pending(): array {
		$pending  = (array) get_option( self::PENDING, array() );
		$manifest = (array) get_option( self::MANIFEST, array() );
		$results  = array();
		foreach ( $pending as $signature => $req ) {
			$faces = $this->installer->install( $req['family'], $req['weights'], $req['styles'] );
			if ( is_wp_error( $faces ) ) {
				$manifest[ $signature ] = array(
					'family' => $req['family'],
					'failed' => time(),
					'error'  => $faces->get_error_message(),
				);
			} else {
				$manifest[ $signature ] = array(
					'family'  => $req['family'],
					'faces'   => $faces,
					'weights' => $req['weights'],
					'styles'  => $req['styles'],
				);
			}
			$results[ $signature ] = is_wp_error( $faces ) ? $faces : true;
		}
		update_option( self::MANIFEST, $manifest, true );
		delete_option( self::PENDING );
		wp_clear_scheduled_hook( self::CRON_HOOK );
		if ( in_array( true, $results, true ) ) {
			wp_clean_theme_json_cache();
			do_action( 'sgs_google_fonts_installed', array_keys( array_filter( $results, 'is_bool' ) ) );
			// Pages cached before the files existed carry no @font-face for the family.
			do_action( 'litespeed_purge_all' );
		}
		return $results;
	}

	/**
	 * Resolve theme.json afresh (running the filter, which queues what is missing), then install.
	 *
	 * @return array signature => true|\WP_Error.
	 */
	public function sync(): array {
		wp_clean_theme_json_cache();
		\WP_Theme_JSON_Resolver::get_merged_data();
		return $this->install_pending();
	}
}
