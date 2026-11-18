<?php
/**
 * The theme's heading look for titles that are not headings.
 *
 * A title that sits before the page's `h1` in the document (the basket drawer's title and its empty-state
 * message) must not be an `h2` or `h3`: assistive technology and search engines read it as the page's first
 * heading. Those titles are plain elements, and this gives them the look the theme gives that heading level: the
 * typography and text colour of `styles.elements.heading` and `styles.elements.<level>` in the site's global styles
 * (theme.json plus the saved snapshot), printed as zero-specificity rules, and only on a request whose drawer renders. A block's own settings and base rules
 * still win, as they did over the element rule. Text colour follows `--sgs-tone-heading` on a dark surface, as headings do.
 *
 * The selector list is `self::SELECTORS`; the `sgs_heading_look_selectors` filter adds or removes entries (selector
 * to heading level, `h1` to `h6`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Heading_Look
 */
final class Heading_Look {

	/**
	 * Title elements that wear the heading look, as selector => heading level.
	 *
	 * @var array<string,string>
	 */
	private const SELECTORS = array(
		'.sgs-cart__panel-heading'                                 => 'h2',
		'.sgs-cart__panel-empty--rich .sgs-cart__panel-empty-message' => 'h3',
	);

	/**
	 * Whether the rules were already added on this request.
	 *
	 * @var bool
	 */
	private static bool $added = false;

	/**
	 * Register the editor output. The front end adds its rules only when a drawer renders ({@see self::enqueue()}).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'block_editor_settings_all', array( __CLASS__, 'add_editor_style' ) );
	}

	/**
	 * The rules to print, set by {@see self::enqueue()}.
	 *
	 * @var string
	 */
	private static string $front_css = '';

	/**
	 * Queue the rules for the page; the basket drawer's markup builder calls this, so a request that renders no
	 * drawer computes and prints nothing.
	 *
	 * A block theme builds the template (and so the drawer) before `wp_head` runs `wp_enqueue_scripts`, so the rules
	 * join the `global-styles` inline style there. A drawer built later (a classic theme, or a late widget area) prints
	 * them as a `<style>` tag in the footer instead.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		if ( self::$added ) {
			return;
		}
		self::$added = true;
		$css         = self::css();
		if ( '' === $css ) {
			return;
		}
		self::$front_css = $css;
		if ( ! \did_action( 'wp_enqueue_scripts' ) ) {
			\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'print_front' ), 100 );
			return;
		}
		if ( \wp_style_is( 'global-styles', 'enqueued' ) && ! \did_action( 'wp_head' ) ) {
			self::print_front();
			return;
		}
		\add_action( 'wp_footer', array( __CLASS__, 'print_footer' ) );
	}

	/**
	 * Add the queued rules to the `global-styles` inline style.
	 *
	 * @return void
	 */
	public static function print_front(): void {
		if ( '' !== self::$front_css && \wp_style_is( 'global-styles', 'enqueued' ) ) {
			\wp_add_inline_style( 'global-styles', self::$front_css );
		}
	}

	/**
	 * Print the queued rules as a style tag (a drawer built after the head was printed).
	 *
	 * @return void
	 */
	public static function print_footer(): void {
		echo '<style id="sgs-heading-look">' . \wp_strip_all_tags( self::$front_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS built from global-styles values by wp_style_engine_get_styles(), tags stripped.
	}

	/**
	 * Add the rules to the editor canvas styles.
	 *
	 * @param array<string,mixed> $settings Editor settings.
	 * @return array<string,mixed>
	 */
	public static function add_editor_style( $settings ) {
		$settings = (array) $settings;
		$css      = self::css();
		if ( '' !== $css ) {
			$settings['styles']   = isset( $settings['styles'] ) && \is_array( $settings['styles'] ) ? $settings['styles'] : array();
			$settings['styles'][] = array( 'css' => $css );
		}
		return $settings;
	}

	/**
	 * The CSS for every selector, from a transient while the global styles are unchanged.
	 *
	 * The transient name carries a hash of what the global styles are built from: the plugin version, the selector list, the modified
	 * time of the parent and child `theme.json`, and the saved user global styles (post id and modified time, which
	 * is where a pushed theme snapshot lands). Any of them changing gives a new name, so the old rules are never
	 * served; the old transient expires on its own.
	 *
	 * @return string
	 */
	public static function css(): string {
		$key    = 'sgs_heading_look_' . self::source_hash();
		$cached = \get_transient( $key );
		if ( \is_string( $cached ) ) {
			return $cached;
		}
		$css = self::build_css();
		\set_transient( $key, $css, DAY_IN_SECONDS );
		return $css;
	}

	/**
	 * A hash of everything the heading look is read from (see {@see self::css()}).
	 *
	 * @return string
	 */
	private static function source_hash(): string {
		$parts = array(
			defined( 'SGS_BLOCKS_VERSION' ) ? SGS_BLOCKS_VERSION : '',
			(string) \wp_json_encode( \apply_filters( 'sgs_heading_look_selectors', self::SELECTORS ) ),
		);
		foreach ( array_unique( array( \get_template_directory(), \get_stylesheet_directory() ) ) as $dir ) {
			$parts[] = $dir . ':' . (int) @filemtime( $dir . '/theme.json' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a theme without theme.json has no file to stat.
		}
		if ( class_exists( '\WP_Theme_JSON_Resolver' ) && method_exists( '\WP_Theme_JSON_Resolver', 'get_user_global_styles_post_id' ) ) {
			$post_id = (int) \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
			$post    = $post_id > 0 ? \get_post( $post_id ) : null;
			$parts[] = $post_id . ':' . ( $post instanceof \WP_Post ? $post->post_modified_gmt : '' );
		}
		return md5( implode( '|', $parts ) );
	}

	/**
	 * Compute the CSS for every selector.
	 *
	 * @return string
	 */
	private static function build_css(): string {
		/**
		 * Filters the title elements that wear the theme's heading look.
		 *
		 * @param array<string,string> $selectors Selector => heading level (`h1` to `h6`).
		 */
		$selectors = (array) \apply_filters( 'sgs_heading_look_selectors', self::SELECTORS );
		$css       = '';
		foreach ( $selectors as $selector => $level ) {
			$declarations = self::declarations( (string) $level );
			if ( '' !== $declarations ) {
				$css .= ':where(' . $selector . '){' . $declarations . '}';
			}
		}
		return $css;
	}

	/**
	 * The declarations the global styles give a heading level, as one string.
	 *
	 * @param string $level Heading level, `h1` to `h6`.
	 * @return string
	 */
	public static function declarations( string $level ): string {
		if ( ! \function_exists( 'wp_get_global_styles' ) || ! \function_exists( 'wp_style_engine_get_styles' ) || ! \preg_match( '/^h[1-6]$/', $level ) ) {
			return '';
		}
		$heading = (array) \wp_get_global_styles( array( 'elements', 'heading' ) );
		$own     = (array) \wp_get_global_styles( array( 'elements', $level ) );

		$typography = \array_merge( (array) ( $heading['typography'] ?? array() ), (array) ( $own['typography'] ?? array() ) );
		$colour     = $own['color']['text'] ?? ( $heading['color']['text'] ?? '' );

		$styles = array( 'typography' => $typography );
		if ( '' !== (string) $colour ) {
			$styles['color'] = array( 'text' => (string) $colour );
		}
		$result       = \wp_style_engine_get_styles( $styles );
		$declarations = (array) ( $result['declarations'] ?? array() );
		if ( isset( $declarations['color'] ) ) {
			$declarations['color'] = 'var(--sgs-tone-heading, ' . $declarations['color'] . ')';
		}

		$out = '';
		foreach ( $declarations as $property => $value ) {
			$out .= $property . ':' . $value . ';';
		}
		return $out;
	}
}
