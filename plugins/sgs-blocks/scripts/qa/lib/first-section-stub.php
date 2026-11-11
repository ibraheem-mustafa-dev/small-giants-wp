<?php
/**
 * The page's first-section state for the render harness, loaded only by `--first-section`: the block being rendered
 * sits inside the page's first top-level section, above the fold, on a page the motion renderer is armed on. That is
 * what `SGS_Media_Priority::resolve()` (includes/media/class-sgs-media-priority.php) reads from the renderer on a real
 * page (`is_armed()`, `in_above_fold()`), and what the old `sgs_content_image_claims_priority()` read
 * (`in_first_section()`).
 *
 * WHAT IT IS: the real `Sgs_Motion_Renderer`, set into that state through reflection (the harness runs no render_block
 * filters, so it has no frames of its own): armed, with one frame marked first-section and above-the-fold. Where a
 * harness run loads no real renderer, a stub class answers the same three questions. Test scaffolding only; nothing
 * here is shipped. With `$GLOBALS['sgs_qa_stub_fold'] = false` (`--armed`) the renderer is armed and the block sits below
 * the fold.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

namespace SGS\Blocks\Motion;

if ( class_exists( __NAMESPACE__ . '\Sgs_Motion_Renderer', false ) ) {
	$sgs_fs_class = new \ReflectionClass( __NAMESPACE__ . '\Sgs_Motion_Renderer' );
	$sgs_fs_armed = $sgs_fs_class->getProperty( 'armed' );
	$sgs_fs_armed->setAccessible( true );
	$sgs_fs_armed->setValue( null, true );
	$sgs_fs_stack = $sgs_fs_class->getProperty( 'stack' );
	$sgs_fs_stack->setAccessible( true );
	$sgs_fs_stack->setValue(
		null,
		array(
			array(
				'name'  => 'sgs/container',
				'first' => false !== ( $GLOBALS['sgs_qa_stub_fold'] ?? true ),
				'fold'  => false !== ( $GLOBALS['sgs_qa_stub_fold'] ?? true ),
			),
		)
	);
	unset( $sgs_fs_class, $sgs_fs_armed, $sgs_fs_stack );
} else {
	/** The renderer's answers for a block rendered inside the page's first section. */
	final class Sgs_Motion_Renderer {
		public static function in_first_section(): bool {
			return true;
		}

		public static function in_above_fold(): bool {
			return false !== ( $GLOBALS['sgs_qa_stub_fold'] ?? true );
		}

		public static function is_armed(): bool {
			return true;
		}
	}
}
