<?php
/**
 * Hover on touch screens for the inline CSS WordPress prints (Spec 38A FR-38A-17).
 *
 * Stylesheet files get the hover-on-touch contract at build time (`scripts/hover-guard/`), and SGS's per-instance CSS
 * gets it in the collector (`class-sgs-css-registry.php::sgs_css_place`). This pass covers the rest: the inline CSS
 * WordPress builds from theme.json and the site's snapshot (`global-styles`, e.g. `elements.link[':hover']`) and the
 * inline additions of SGS's own handles (`sgs-*`). It runs right before WordPress prints each batch, in the head
 * (`wp_print_styles`, just before `Css_Delivery`) and for styles enqueued in the body (`wp_footer`, priority 1).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';

/**
 * Applies `sgs_touch_hover_css()` to the inline CSS of `global-styles` and every `sgs-*` handle.
 */
final class Touch_Hover_Styles {

	/**
	 * Wire the head and footer passes.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_print_styles', array( __CLASS__, 'run' ), PHP_INT_MAX - 1 );
		\add_action( 'wp_footer', array( __CLASS__, 'run' ), 1 );
	}

	/**
	 * Hook callback: rewrite the inline CSS still to print on a front-end render.
	 *
	 * @return void
	 */
	public static function run(): void {
		if ( ! sgs_is_frontend_render() ) {
			return;
		}
		self::apply( \wp_styles() );
	}

	/**
	 * Rewrite the inline additions of every handle this pass owns.
	 *
	 * @param \WP_Styles $styles The style registry.
	 * @return string[] The handles changed, for tests.
	 */
	public static function apply( \WP_Styles $styles ): array {
		$changed = array();
		foreach ( $styles->registered as $handle => $obj ) {
			if ( ! self::owns( (string) $handle ) || \in_array( $handle, $styles->done, true ) ) {
				continue;
			}
			$after = $obj->extra['after'] ?? null;
			if ( ! \is_array( $after ) ) {
				continue;
			}
			$new = array_map(
				static fn ( $css ) => \is_string( $css ) ? \sgs_touch_hover_css( $css ) : $css,
				$after
			);
			if ( $new !== $after ) {
				$styles->registered[ $handle ]->extra['after'] = $new;
				$changed[]                                    = (string) $handle;
			}
		}
		return $changed;
	}

	/**
	 * Whether this pass rewrites a handle's inline CSS: WordPress's global styles and SGS's own handles.
	 *
	 * @param string $handle Style handle.
	 * @return bool
	 */
	public static function owns( string $handle ): bool {
		return 'global-styles' === $handle || 0 === strpos( $handle, 'sgs-' );
	}
}
