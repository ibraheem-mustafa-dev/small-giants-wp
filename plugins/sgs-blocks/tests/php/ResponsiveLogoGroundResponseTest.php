<?php
/**
 * Tests: sgs/responsive-logo — "the logo responds to its ground" (U-13 §4.5).
 *
 * The block.json side of the ground-response feature: colourTreatment accepts 'auto'. The render side (the
 * `sgs-responsive-logo--colour-auto` and `--has-dark-logo` marker classes, an unknown value refused) runs the real
 * render.php through the QA harness in ResponsiveLogoMediaTest.php; the ancestor-class CSS in style.scss is covered
 * by scripts/tests/test-responsive-logo-ground-response.mjs.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * Class ResponsiveLogoGroundResponseTest
 */
class ResponsiveLogoGroundResponseTest extends TestCase {

	// ── block.json: colourTreatment enum ─────────────────────────────────────

	/**
	 * Block.json colourTreatment enum must include 'auto' alongside the
	 * existing '' and 'white' values.
	 */
	public function test_block_json_colour_treatment_enum_includes_auto(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$enum = $data['attributes']['colourTreatment']['enum'];

		$this->assertContains( '', $enum );
		$this->assertContains( 'white', $enum );
		$this->assertContains( 'auto', $enum );
	}
}
