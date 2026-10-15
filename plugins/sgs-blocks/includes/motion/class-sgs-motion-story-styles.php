<?php
/**
 * The effect stylesheets the editor canvas's effect stories need (Spec 38A §11, M3.6; the editor and frontend
 * asset-guard rule).
 *
 * Each canvas story under `src/blocks/extensions/motion/stories/` has an entry in `includes/motion/data/canvas-stories.json`;
 * an entry whose `stylesheet` is true renders the effect's own runtime markup in the canvas and so needs that effect's
 * companion stylesheet (`assets/css/fx-<effect>.css`, resolved by `SGS_Motion_Registry::effect_stylesheet()`). Those
 * stylesheets, and only those, are enqueued from `enqueue_block_assets` under an `is_admin()` guard, so a front-end
 * page still loads an `fx-*.css` file only when `SGS_Motion_Registry` finds the effect on the page. The handle is the
 * registry's own (`sgs-fx-<effect>`), so a stylesheet the registry also enqueues prints once.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use SGS\Blocks\SGS_Motion_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Story_Styles
 */
final class Sgs_Motion_Story_Styles {

	const MANIFEST_PATH = 'includes/motion/data/canvas-stories.json';
	const HANDLE_PREFIX = 'sgs-fx-';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue_editor_styles' ) );
	}

	/**
	 * The story entries of the shipped manifest.
	 *
	 * @return array<string,array<string,mixed>> Story entries keyed by effect slug; empty when the file is missing or unreadable.
	 */
	public static function stories(): array {
		$path = SGS_BLOCKS_PATH . self::MANIFEST_PATH;
		if ( ! is_readable( $path ) ) {
			return array();
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local plugin file.
		$data = json_decode( (string) file_get_contents( $path ), true );
		return is_array( $data ) && isset( $data['stories'] ) && is_array( $data['stories'] ) ? $data['stories'] : array();
	}

	/**
	 * The stylesheets the stories need, by effect slug.
	 *
	 * @param array<string,array<string,mixed>> $stories Story entries keyed by effect slug.
	 * @return array<string,string> Plugin-relative stylesheet paths keyed by effect slug.
	 */
	public static function stylesheets( array $stories ): array {
		$out = array();
		foreach ( $stories as $effect => $story ) {
			if ( ! is_string( $effect ) || ! is_array( $story ) || true !== ( $story['stylesheet'] ?? false ) ) {
				continue;
			}
			$rel = SGS_Motion_Registry::effect_stylesheet( $effect );
			if ( null !== $rel ) {
				$out[ $effect ] = $rel;
			}
		}
		return $out;
	}

	/**
	 * Enqueue the stories' stylesheets, in the editor only.
	 *
	 * @param array<string,array<string,mixed>>|null $stories Story entries; the shipped manifest when null (the hook passes nothing).
	 * @return void
	 */
	public static function enqueue_editor_styles( $stories = null ): void {
		if ( ! is_admin() ) {
			return;
		}
		$entries = is_array( $stories ) ? $stories : self::stories();
		foreach ( self::stylesheets( $entries ) as $effect => $rel ) {
			wp_enqueue_style( self::HANDLE_PREFIX . $effect, SGS_BLOCKS_URL . $rel, array(), SGS_BLOCKS_VERSION );
		}
	}
}

Sgs_Motion_Story_Styles::register();
