<?php
/**
 * The theme's heading look for titles that are not headings.
 *
 * A title that sits before the page's `h1` in the document (the basket drawer's title and its empty-state
 * message) must not be an `h2` or `h3`: assistive technology and search engines read it as the page's first
 * heading. Those titles are plain elements, and this gives them the look the theme gives that heading level: the
 * typography and text colour of `styles.elements.heading` and `styles.elements.<level>` in the site's global styles
 * (theme.json plus the saved snapshot), printed as zero-specificity rules. A block's own settings and base rules
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
	 * Register the front-end and editor output.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'print_front' ), 100 );
		\add_filter( 'block_editor_settings_all', array( __CLASS__, 'add_editor_style' ) );
	}

	/**
	 * Add the rules after the global styles on the front end.
	 *
	 * @return void
	 */
	public static function print_front(): void {
		$css = self::css();
		if ( '' !== $css && \wp_style_is( 'global-styles', 'enqueued' ) ) {
			\wp_add_inline_style( 'global-styles', $css );
		}
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
	 * The CSS for every selector.
	 *
	 * @return string
	 */
	public static function css(): string {
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
