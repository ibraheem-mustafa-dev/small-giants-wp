<?php
/**
 * Shared stylesheet delivery without a request per stylesheet (Spec 32 FR-32-32).
 *
 * WordPress prints one `<link>` per block type and per theme or plugin asset, and every one of them blocks the first
 * paint. This step runs on the `wp_print_styles` action at the last priority, so after core's own inliner
 * (`wp_maybe_inline_styles`, `wp_head` priority 1) and after every style added or enqueued later in the head, right
 * before WordPress prints; and at `wp_footer` priority 2 for styles enqueued in the body. It
 * walks the style queue in print order and merges each run of consecutive mergeable handles into the run's first
 * handle, file content first and its inline additions after, so every rule keeps its place in the cascade:
 *   - `inline` (default): the run prints as one `<style>`, so nothing blocks the first paint but the page itself.
 *   - `bundle`: the run is written once to a content-hashed file in `uploads/sgs-css/` (immutable cache headers,
 *     garbage-collected by the CSS epoch) and prints as one `<link>`. The page's HTML is about a third the size, but a
 *     first visit downloads about the same total and waits for the file (canary 2026-11-19: Shop about 0.6 s longer),
 *     and the file is reused only by pages with the same stylesheets (one page type), so it pays off mainly for
 *     returning visitors.
 *   - `links`: WordPress prints its own tags, untouched.
 * A handle is mergeable when it is a `.css` file of this site under ABSPATH or WP_CONTENT_DIR, or has no file and only
 * inline CSS, and it applies to every medium (`media` all). A media query, `conditional`, `alt` or `title` data, an RTL
 * variant on an RTL site, an `@import`, a `</style` sequence or a file that cannot be read ends the run, and that
 * handle prints exactly as WordPress would.
 *
 * The page-specific per-instance CSS is not handled here: the collector (`class-sgs-css-registry.php`) prints it.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Merges runs of shared stylesheets into one inline block or one cached file.
 */
final class Css_Delivery {

	/** Option holding the delivery mode. */
	const OPTION = 'sgs_css_shared_delivery';

	/** Accepted modes. */
	const MODES = array( 'inline', 'bundle', 'links' );

	/** Mode used when the option is unset or invalid. */
	const DEFAULT_MODE = 'inline';

	/**
	 * Query flag that asks for WordPress's own per-file links on one request. Analysis tools (the live pass of
	 * `check-state-exhaustiveness.py`) need each rule's source file; the flag changes only how the same CSS arrives.
	 */
	const QUERY_FLAG = 'sgs-css-delivery';

	/**
	 * Wire the head and footer passes.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_print_styles', array( __CLASS__, 'run' ), PHP_INT_MAX );
		\add_action( 'wp_footer', array( __CLASS__, 'run' ), 2 );
	}

	/**
	 * The delivery mode for this request.
	 *
	 * @return string One of MODES.
	 */
	public static function mode(): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display flag, no state changes.
		if ( isset( $_GET[ self::QUERY_FLAG ] ) && 'links' === \sanitize_key( \wp_unslash( $_GET[ self::QUERY_FLAG ] ) ) ) {
			return 'links';
		}
		$mode = (string) \apply_filters( 'sgs_css_shared_delivery', \get_option( self::OPTION, self::DEFAULT_MODE ) );
		return \in_array( $mode, self::MODES, true ) ? $mode : self::DEFAULT_MODE;
	}

	/**
	 * Hook callback: merge the runs still to print on a front-end render.
	 *
	 * @return void
	 */
	public static function run(): void {
		if ( ! sgs_is_frontend_render() ) {
			return;
		}
		$mode = self::mode();
		if ( 'links' === $mode ) {
			return;
		}
		self::apply( \wp_styles(), $mode );
	}

	/**
	 * Merge every eligible run in `$styles` for the given mode.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @param string     $mode   'inline' or 'bundle'.
	 * @return array<int,array{handles:string[],files:int,bytes:int,src:string|false}> The runs merged, for tests.
	 */
	public static function apply( \WP_Styles $styles, string $mode ): array {
		$merged = array();
		foreach ( self::plan( $styles, self::print_order( $styles ) ) as $run ) {
			$css = \implode( "\n", $run['parts'] );
			if ( 'bundle' === $mode ) {
				if ( $run['files'] < 2 ) {
					continue; // One file is already one request; nothing to gain.
				}
				$url = sgs_css_write_file( 'sgs-' . sgs_css_epoch() . '-run-' . \md5( $css ), $css );
				if ( null === $url ) {
					continue; // Not writable: WordPress's own links stay.
				}
				self::merge( $styles, $run['handles'], $css, $url );
				$merged[] = array(
					'handles' => $run['handles'],
					'files'   => $run['files'],
					'bytes'   => \strlen( $css ),
					'src'     => $url,
				);
				continue;
			}
			if ( $run['files'] < 1 ) {
				continue; // Already all inline.
			}
			self::merge( $styles, $run['handles'], $css, false );
			$merged[] = array(
				'handles' => $run['handles'],
				'files'   => $run['files'],
				'bytes'   => \strlen( $css ),
				'src'     => false,
			);
		}
		return $merged;
	}

	/**
	 * The handles still to print, in the order WordPress will print them. Resolved on a copy of the registry so the
	 * real `to_do` list is untouched.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @return string[]
	 */
	public static function print_order( \WP_Styles $styles ): array {
		$probe        = clone $styles;
		$probe->to_do = array();
		$probe->all_deps( $probe->queue );
		$order = array();
		foreach ( $probe->to_do as $handle ) {
			if ( isset( $styles->registered[ $handle ] ) && ! \in_array( $handle, $styles->done, true ) ) {
				$order[] = $handle;
			}
		}
		return $order;
	}

	/**
	 * Split the print order into runs of consecutive mergeable handles.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @param string[]   $order  Handles in print order.
	 * @return array<int,array{handles:string[],parts:string[],files:int}>
	 */
	public static function plan( \WP_Styles $styles, array $order ): array {
		$runs    = array();
		$current = null;
		foreach ( $order as $handle ) {
			$part = self::part( $styles, $handle );
			if ( null === $part ) {
				if ( null !== $current ) {
					$runs[] = $current;
				}
				$current = null;
				continue;
			}
			if ( null === $current ) {
				$current = array(
					'handles' => array(),
					'parts'   => array(),
					'files'   => 0,
				);
			}
			$current['handles'][] = $handle;
			if ( '' !== $part['css'] ) {
				$current['parts'][] = $part['css'];
			}
			if ( $part['file'] ) {
				++$current['files'];
			}
		}
		if ( null !== $current ) {
			$runs[] = $current;
		}
		return $runs;
	}

	/**
	 * One handle's CSS as it would print (file content, then inline additions), or null when it must print untouched.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @param string     $handle The handle.
	 * @return array{css:string,file:bool}|null
	 */
	public static function part( \WP_Styles $styles, string $handle ): ?array {
		$obj = $styles->registered[ $handle ] ?? null;
		if ( null === $obj ) {
			return null;
		}
		$media = $obj->args;
		if ( null !== $media && '' !== $media && 'all' !== $media ) {
			return null;
		}
		$extra = (array) $obj->extra;
		if ( ! empty( $extra['conditional'] ) || ! empty( $extra['alt'] ) || ! empty( $extra['title'] ) ) {
			return null;
		}
		if ( ! empty( $extra['rtl'] ) && \is_rtl() ) {
			return null;
		}

		$css  = '';
		$file = false;
		if ( \is_string( $obj->src ) && '' !== $obj->src ) {
			$path = self::file_for( $styles, $handle );
			if ( null === $path ) {
				return null;
			}
			$text = \file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local stylesheet read, as core's wp_maybe_inline_styles does.
			if ( false === $text || false !== \stripos( $text, '@import' ) ) {
				return null;
			}
			$text = (string) \preg_replace( '/^\xEF\xBB\xBF|^\s*@charset\s+[^;]+;/i', '', $text );
			$css  = \_wp_normalize_relative_css_links( $text, self::absolute_src( $styles, $obj->src ) );
			$file = true;
		}

		$after = isset( $extra['after'] ) && \is_array( $extra['after'] ) ? \implode( "\n", \array_filter( $extra['after'], 'is_string' ) ) : '';
		$css   = \trim( $css . ( '' !== $css && '' !== $after ? "\n" : '' ) . $after );
		if ( false !== \stripos( $css, '</style' ) ) {
			return null; // Core prints nothing for such inline text; the file must stay a link.
		}
		return array(
			'css'  => $css,
			'file' => $file,
		);
	}

	/**
	 * Fold a run into its first handle. The others print nothing but still count as done, so dependants keep working.
	 *
	 * @param \WP_Styles   $styles  The style registry.
	 * @param string[]     $handles The run, in print order.
	 * @param string       $css     The run's CSS.
	 * @param string|false $src     The bundle URL, or false to print inline.
	 * @return void
	 */
	private static function merge( \WP_Styles $styles, array $handles, string $css, $src ): void {
		foreach ( $handles as $i => $handle ) {
			$obj = $styles->registered[ $handle ];
			unset( $obj->extra['path'], $obj->extra['inlined_src'] );
			$obj->extra['after'] = array();
			$obj->src            = false;
			if ( 0 !== $i ) {
				continue;
			}
			if ( false === $src ) {
				$obj->extra['after'] = array( $css );
				continue;
			}
			$obj->src  = $src;
			$obj->ver  = null;
			$obj->args = 'all';
		}
	}

	/**
	 * The local file behind a handle, or null when it is not a readable `.css` file of this site.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @param string     $handle The handle.
	 * @return string|null Real path.
	 */
	public static function file_for( \WP_Styles $styles, string $handle ): ?string {
		$path = $styles->get_data( $handle, 'path' );
		if ( \is_string( $path ) && '' !== $path ) {
			return self::safe_path( $path );
		}
		$url = (string) \preg_replace( '#^(?:https?:)?//#i', '', self::absolute_src( $styles, (string) $styles->registered[ $handle ]->src ) );
		$url = (string) \strtok( $url, '?#' );
		$map = array(
			\content_url( '/' ) => \WP_CONTENT_DIR . '/',
			\includes_url()     => \ABSPATH . \WPINC . '/',
			\site_url( '/' )    => \ABSPATH,
		);
		foreach ( $map as $base => $dir ) {
			$base = (string) \preg_replace( '#^(?:https?:)?//#i', '', $base );
			if ( 0 === \strpos( $url, $base ) ) {
				return self::safe_path( $dir . \rawurldecode( \substr( $url, \strlen( $base ) ) ) );
			}
		}
		return null;
	}

	/**
	 * A handle's src as an absolute URL (core registers some as paths from the site root).
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @param string     $src    Registered src.
	 * @return string
	 */
	private static function absolute_src( \WP_Styles $styles, string $src ): string {
		if ( \preg_match( '#^(?:https?:)?//#i', $src ) ) {
			return $src;
		}
		return \untrailingslashit( (string) $styles->base_url ) . '/' . \ltrim( $src, '/' );
	}

	/**
	 * Accept a path only when it is a readable `.css` file inside ABSPATH or WP_CONTENT_DIR.
	 *
	 * @param string $path Candidate path.
	 * @return string|null Real path.
	 */
	private static function safe_path( string $path ): ?string {
		$real = \realpath( $path );
		if ( false === $real || '.css' !== \strtolower( \substr( $real, -4 ) ) || ! \is_readable( $real ) ) {
			return null;
		}
		foreach ( array( \ABSPATH, \WP_CONTENT_DIR ) as $root ) {
			$root_real = \realpath( $root );
			if ( false !== $root_real && 0 === \strpos( $real, \trailingslashit( $root_real ) ) ) {
				return $real;
			}
		}
		return null;
	}
}
