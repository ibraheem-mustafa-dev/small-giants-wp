<?php
/**
 * Tests: Block deprecation coverage (FR-S7-1, Spec 17 Wave 2).
 *
 * For every SGS block whose `block.json` or `save.js` changed in the audit
 * window covered by FR-S7-1, this test asserts:
 *
 *   - The block ships a `deprecated.js` covering the previous save shape.
 *   - The block's `index.js` imports that module AND wires it into
 *     `registerBlockType` via the `deprecated` property.
 *
 * The affected-block list is maintained alongside this test and updated
 * whenever a block's save output or attribute schema changes in a way that
 * would break previously-stored post_content. See
 * `plugins/sgs-blocks/CLAUDE.md` ("Adding a deprecation when a block's save
 * output changes") for the procedure.
 *
 * The `business-info` block is intentionally excluded: its deprecation is
 * owned by Spec 17 Wave 2 Task 2 (the spec's anchor case), tested elsewhere.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class BlockDeprecationsTest
 */
class BlockDeprecationsTest extends TestCase {

	/**
	 * Blocks whose save output or attribute schema changed in the last
	 * 30 days (audit window for FR-S7-1) and therefore require a
	 * deprecation entry covering the previous shape.
	 *
	 * @var array<int, string>
	 */
	private const AFFECTED_BLOCKS = array(
		// Static save -> null (now dynamic via render.php).
		'card-grid',
		'pricing-table',
		'testimonial',
		'whatsapp-cta',
		// Static save -> InnerBlocks.Content (gained InnerBlocks slot).
		'cta-section',
		'info-box',
		// Static save modified (HTML output diverged from stored shape).
		// 'certification-bar' removed 2026-05-29 D95 — retired, merged into sgs/trust-bar.
		'counter',
		'notice-banner',
		// trust-bar renamed from trust-badges 2026-05-31.
		'trust-bar',
	);

	// ── Data provider ─────────────────────────────────────────────────────────

	/**
	 * Provides each affected block slug as a separate PHPUnit data row.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function affected_block_provider(): array {
		$rows = array();
		foreach ( self::AFFECTED_BLOCKS as $slug ) {
			$rows[ $slug ] = array( $slug );
		}
		return $rows;
	}

	// ── Assertions ────────────────────────────────────────────────────────────

	/**
	 * Every affected block must ship a deprecated.js file.
	 *
	 * @param string $slug Block slug under src/blocks/.
	 */
	#[DataProvider( 'affected_block_provider' )]
	public function test_deprecated_file_exists( string $slug ): void {
		$path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/deprecated.js';

		$this->assertFileExists(
			$path,
			sprintf(
				'Block "%s" is in the affected list but has no deprecated.js. '
				. 'Add the previous save shape — see plugins/sgs-blocks/CLAUDE.md '
				. '("Adding a deprecation when a block\'s save output changes").',
				$slug
			)
		);
	}

	/**
	 * The deprecated.js must export a non-empty array of version entries.
	 *
	 * @param string $slug Block slug under src/blocks/.
	 */
	#[DataProvider( 'affected_block_provider' )]
	public function test_deprecated_file_exports_array( string $slug ): void {
		$path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/deprecated.js';
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a local source file in a test, no HTTP involved.
		$contents = (string) file_get_contents( $path );

		$this->assertMatchesRegularExpression(
			'/export\s+default\s+\[\s*[A-Za-z_][A-Za-z0-9_]*/',
			$contents,
			sprintf(
				'deprecated.js for block "%s" must `export default [ vN, ... ]` '
				. '— see plugins/sgs-blocks/src/blocks/process-steps/deprecated.js '
				. 'for the canonical pattern.',
				$slug
			)
		);
	}

	/**
	 * The block's index.js must import the deprecated module AND pass it
	 * to registerBlockType via the `deprecated` property.
	 *
	 * @param string $slug Block slug under src/blocks/.
	 */
	#[DataProvider( 'affected_block_provider' )]
	public function test_index_wires_deprecated_into_register_block_type( string $slug ): void {
		$path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/index.js';
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a local source file in a test, no HTTP involved.
		$contents = (string) file_get_contents( $path );

		$this->assertMatchesRegularExpression(
			"#import\\s+deprecated\\s+from\\s+['\"]\\./deprecated['\"]#",
			$contents,
			sprintf(
				'index.js for block "%s" must import deprecated from "./deprecated".',
				$slug
			)
		);

		$this->assertMatchesRegularExpression(
			'/\bdeprecated(\s*,|\s*:\s*deprecated\s*[,\}])/',
			$contents,
			sprintf(
				'index.js for block "%s" must wire `deprecated` into the '
				. 'registerBlockType options object (e.g. `{ edit, save, '
				. 'deprecated }`).',
				$slug
			)
		);
	}
}
