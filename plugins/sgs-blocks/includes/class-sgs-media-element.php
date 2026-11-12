<?php
/**
 * SGS_Media_Element: the one renderer for a media slot (Spec 49 C2).
 *
 * `render()` prints a slot's markup and returns the CSS its rules need; the implementation is
 * `includes/media/render-slot.php::sgs_media_render_slot` (a background slot: `render-background.php`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-media-element.php';
require_once __DIR__ . '/media/render-slot.php';
require_once __DIR__ . '/media/class-sgs-media-priority.php';

if ( ! class_exists( 'SGS_Media_Element' ) ) {

	/**
	 * The media renderer.
	 */
	class SGS_Media_Element {

		/**
		 * Render one media slot (Spec 49 C2): per-device kinds, the helper decision, paint placement and `sizes`.
		 *
		 * The implementation is `includes/media/render-slot.php::sgs_media_render_slot`. The caller prints `html` and
		 * passes `css` to the collector. An empty or deleted source returns empty `html`.
		 *
		 * @param array $slot    `{prefix, kinds, context}`.
		 * @param array $attrs   Block attributes.
		 * @param array $context `{uid, block, area, section_index, item_set:{index,columns}, in_editor, extra_class, anchor}`.
		 * @return array{html:string,css:string,needs_helper:bool,lead_candidate:bool}
		 */
		public static function render( array $slot, array $attrs, array $context = array() ): array {
			if ( 'background' === ( $slot['context'] ?? '' ) ) {
				// A background prints one `.sgs-bg-media` element, not the content slot's nesting (§7.8).
				require_once __DIR__ . '/media/render-background.php';
				return sgs_media_render_background( $slot, $attrs, $context );
			}
			return sgs_media_render_slot( $slot, $attrs, $context );
		}
	}
}
