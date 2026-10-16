<?php
/**
 * The page's first-section state for the render harness, loaded only by `--first-section`: the block being rendered
 * sits inside the page's first top-level section, which is what `sgs_content_image_claims_priority()`
 * (includes/helpers-media.php) reads from the motion renderer's frame stack on a real page.
 *
 * WHAT IT IS: `Sgs_Motion_Renderer::in_first_section()` answering true, and nothing else of the renderer (the harness
 * runs no render_block filters, so it has no frames). Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

namespace SGS\Blocks\Motion;

if ( ! class_exists( __NAMESPACE__ . '\Sgs_Motion_Renderer', false ) ) {
	/** The renderer's first-section answer for a block rendered inside the page's first section. */
	final class Sgs_Motion_Renderer {
		public static function in_first_section(): bool {
			return true;
		}
	}
}
