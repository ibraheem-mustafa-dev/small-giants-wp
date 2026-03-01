<?php
/**
 * Test that all 55 SGS blocks register correctly.
 *
 * Strategy:
 * 1. Discover expected blocks by scanning src/blocks/ (excludes 'extensions').
 * 2. The plugin registers blocks from build/blocks/ on the 'init' hook.
 * 3. After init fires (WP_UnitTestCase boots WP fully), each expected block
 *    should appear in WP_Block_Type_Registry::get_instance().
 *
 * @package SGS\Blocks\Tests
 */

/**
 * Class Test_Block_Registration
 */
class Test_Block_Registration extends WP_UnitTestCase {

	/**
	 * Fully-qualified path to the src/blocks directory.
	 *
	 * @var string
	 */
	private string $src_blocks_dir;

	/**
	 * Fully-qualified path to the build/blocks directory.
	 *
	 * @var string
	 */
	private string $build_blocks_dir;

	/**
	 * WP_Block_Type_Registry singleton.
	 *
	 * @var WP_Block_Type_Registry
	 */
	private WP_Block_Type_Registry $registry;

	/**
	 * Set up before each test method.
	 */
	public function setUp(): void {
		parent::setUp();

		$this->src_blocks_dir   = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks';
		$this->build_blocks_dir = SGS_BLOCKS_PLUGIN_DIR . '/build/blocks';
		$this->registry         = WP_Block_Type_Registry::get_instance();
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	/**
	 * Return the list of expected block slugs derived from src/blocks/ directories.
	 *
	 * Skips 'extensions' (editor-only sidebar controls, not a block type) and
	 * any hidden/dot directories.
	 *
	 * @return array<string> Block directory names (e.g. ['hero', 'accordion', …]).
	 */
	private function get_expected_block_slugs(): array {
		$this->assertDirectoryExists(
			$this->src_blocks_dir,
			'src/blocks/ directory must exist.'
		);

		$items = scandir( $this->src_blocks_dir );
		$slugs = [];

		foreach ( $items as $item ) {
			// Skip hidden entries and the 'extensions' directory.
			if ( str_starts_with( $item, '.' ) || 'extensions' === $item ) {
				continue;
			}

			if ( is_dir( $this->src_blocks_dir . '/' . $item ) ) {
				$slugs[] = $item;
			}
		}

		return $slugs;
	}

	// ─── Tests ───────────────────────────────────────────────────────────────

	/**
	 * Sanity check: the build directory must exist before registration tests
	 * can run. If you see this failure, run `npm run build` first.
	 */
	public function test_build_directory_exists(): void {
		$this->assertDirectoryExists(
			$this->build_blocks_dir,
			'build/blocks/ directory must exist. Run `npm run build` first.'
		);
	}

	/**
	 * There should be at least 55 block directories in src/blocks/.
	 */
	public function test_expected_block_count(): void {
		$slugs = $this->get_expected_block_slugs();

		$this->assertGreaterThanOrEqual(
			55,
			count( $slugs ),
			sprintf(
				'Expected at least 55 blocks in src/blocks/, found %d: %s',
				count( $slugs ),
				implode( ', ', $slugs )
			)
		);
	}

	/**
	 * Every block discovered in src/blocks/ must be registered under sgs/{slug}.
	 *
	 * @dataProvider block_slug_provider
	 */
	public function test_block_is_registered( string $slug ): void {
		$block_name = "sgs/{$slug}";

		$this->assertTrue(
			$this->registry->is_registered( $block_name ),
			"Block '{$block_name}' is not registered. " .
			"Ensure build/blocks/{$slug}/block.json exists (run `npm run build`)."
		);
	}

	/**
	 * Every registered block must have either a render_callback (server-side
	 * render) or be a static save() block (render === null is fine for those).
	 *
	 * We verify the block type object is returned and is a WP_Block_Type.
	 *
	 * @dataProvider block_slug_provider
	 */
	public function test_block_type_is_valid( string $slug ): void {
		$block_name  = "sgs/{$slug}";
		$block_type  = $this->registry->get_registered( $block_name );

		// Skip if not registered — already tested by test_block_is_registered.
		if ( null === $block_type ) {
			$this->markTestSkipped( "Block '{$block_name}' not registered; skipping type check." );
		}

		$this->assertInstanceOf(
			WP_Block_Type::class,
			$block_type,
			"Block '{$block_name}' registry entry must be a WP_Block_Type instance."
		);

		// Blocks with render.php have render_callback set automatically by WP.
		// Static-save blocks have render_callback === null, which is valid.
		// At minimum, the name must match.
		$this->assertSame(
			$block_name,
			$block_type->name,
			"Block type name mismatch for '{$block_name}'."
		);
	}

	/**
	 * Blocks that have a render.php in their build directory must have a
	 * render_callback set (WordPress auto-wires this from block.json).
	 *
	 * @dataProvider block_slug_provider
	 */
	public function test_server_side_blocks_have_render_callback( string $slug ): void {
		$build_render = $this->build_blocks_dir . '/' . $slug . '/render.php';

		// If there is no render.php in the build, this block uses save().  Skip.
		if ( ! file_exists( $build_render ) ) {
			$this->markTestSkipped( "Block 'sgs/{$slug}' has no render.php — static save() block; skipping." );
		}

		$block_type = $this->registry->get_registered( "sgs/{$slug}" );

		if ( null === $block_type ) {
			$this->markTestSkipped( "Block 'sgs/{$slug}' not registered; skipping render callback check." );
		}

		$this->assertNotNull(
			$block_type->render_callback,
			"Block 'sgs/{$slug}' has render.php but no render_callback registered. " .
			"Check that register_block_type() is pointing at the correct block.json."
		);
	}

	/**
	 * The sgs block category must be registered so blocks appear correctly in
	 * the editor.
	 */
	public function test_sgs_block_categories_registered(): void {
		$categories = get_block_categories( get_post( $this->factory->post->create() ) );
		$sgs_cats   = array_filter(
			$categories,
			fn( array $cat ) => str_starts_with( $cat['slug'] ?? '', 'sgs-' )
		);

		$this->assertNotEmpty(
			$sgs_cats,
			'No SGS block categories registered. Check includes/block-categories.php.'
		);
	}

	// ─── Data providers ──────────────────────────────────────────────────────

	/**
	 * Provide all expected block slugs as individual data-provider rows.
	 *
	 * PHPUnit calls test_block_is_registered() once per slug.
	 *
	 * @return array<string, array{0: string}>
	 */
	public function block_slug_provider(): array {
		// Discover slugs at data-provider time (before setUp).
		$src_dir = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks';

		if ( ! is_dir( $src_dir ) ) {
			return [];
		}

		$rows = [];

		foreach ( scandir( $src_dir ) as $item ) {
			if ( str_starts_with( $item, '.' ) || 'extensions' === $item ) {
				continue;
			}
			if ( is_dir( $src_dir . '/' . $item ) ) {
				$rows[ $item ] = [ $item ];
			}
		}

		return $rows;
	}
}
