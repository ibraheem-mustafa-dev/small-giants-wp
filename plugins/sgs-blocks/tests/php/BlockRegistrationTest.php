<?php
/**
 * Tests: Block JSON registration contracts.
 *
 * Validates every block's block.json file for:
 *   - Required fields (name, title, category, $schema, apiVersion).
 *   - Naming convention (sgs/<slug>).
 *   - Attribute defaults for array-type attributes (prevents JS .map() errors).
 *   - editorScript declaration (required for Gutenberg registration).
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class BlockRegistrationTest
 */
class BlockRegistrationTest extends TestCase {

    // ── Data providers ────────────────────────────────────────────────────────

    /**
     * Discover all block slugs from src/blocks/.
     *
     * @return array<string, array{0: string}> PHPUnit data-provider rows.
     */
    public static function block_slug_provider(): array {
        $src_dir = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks';

        if ( ! is_dir( $src_dir ) ) {
            return [];
        }

        $rows = [];

        foreach ( scandir( $src_dir ) as $item ) {
            if ( str_starts_with( $item, '.' ) || 'extensions' === $item ) {
                continue;
            }
            $full = $src_dir . '/' . $item;
            if ( is_dir( $full ) && file_exists( $full . '/block.json' ) ) {
                $rows[ $item ] = [ $item ];
            }
        }

        return $rows;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Load and JSON-decode a block's block.json.
     *
     * @param string $slug Block directory name.
     * @return array<string, mixed> Decoded JSON data.
     */
    private function load_block_json( string $slug ): array {
        $path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/block.json';
        $this->assertFileExists( $path, "block.json must exist for sgs/{$slug}." );

        $raw  = file_get_contents( $path );
        $data = json_decode( $raw, associative: true );
        $this->assertIsArray( $data, "block.json for sgs/{$slug} is not valid JSON." );

        return $data;
    }

    // ── Global tests ──────────────────────────────────────────────────────────

    public function test_src_blocks_directory_exists(): void {
        $this->assertDirectoryExists(
            SGS_BLOCKS_PLUGIN_DIR . '/src/blocks',
            'src/blocks/ directory must exist.'
        );
    }

    public function test_minimum_block_count(): void {
        $rows = self::block_slug_provider();

        $this->assertGreaterThanOrEqual(
            55,
            count( $rows ),
            sprintf(
                'Expected at least 55 blocks, found %d: %s',
                count( $rows ),
                implode( ', ', array_keys( $rows ) )
            )
        );
    }

    public function test_plugin_file_exists(): void {
        $this->assertFileExists(
            SGS_BLOCKS_PLUGIN_DIR . '/sgs-blocks.php',
            'sgs-blocks.php must exist in the plugin root.'
        );
    }

    public function test_includes_directory_exists(): void {
        $this->assertDirectoryExists(
            SGS_BLOCKS_PLUGIN_DIR . '/includes',
            'includes/ directory must exist.'
        );
    }

    // ── Per-block tests ───────────────────────────────────────────────────────

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_schema( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( '$schema', $data, "sgs/{$slug} block.json is missing \$schema." );
        $this->assertStringContainsString( 'schemas.wp.org', $data['$schema'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_api_version( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'apiVersion', $data, "sgs/{$slug} block.json is missing apiVersion." );
        $this->assertGreaterThanOrEqual( 2, $data['apiVersion'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_name_matches_slug( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'name', $data, "sgs/{$slug} block.json is missing 'name'." );
        $this->assertSame( "sgs/{$slug}", $data['name'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_title( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'title', $data, "sgs/{$slug} block.json is missing 'title'." );
        $this->assertNotEmpty( $data['title'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_category( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'category', $data, "sgs/{$slug} block.json is missing 'category'." );
        $this->assertNotEmpty( $data['category'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_textdomain( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'textdomain', $data, "sgs/{$slug} block.json is missing 'textdomain'." );
        $this->assertSame( 'sgs-blocks', $data['textdomain'] );
    }

    /**
     * Array-type attributes must declare a default value — missing defaults
     * cause JavaScript .map() errors in the block editor.
     */
    #[DataProvider( 'block_slug_provider' )]
    public function test_array_attributes_have_defaults( string $slug ): void {
        $data = $this->load_block_json( $slug );

        if ( empty( $data['attributes'] ) || ! is_array( $data['attributes'] ) ) {
            $this->addToAssertionCount( 1 );
            return;
        }

        foreach ( $data['attributes'] as $attr_name => $attr_def ) {
            if ( isset( $attr_def['type'] ) && 'array' === $attr_def['type'] ) {
                $this->assertArrayHasKey(
                    'default',
                    $attr_def,
                    "sgs/{$slug}: array attribute '{$attr_name}' must declare a 'default' value."
                );
            }
        }
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_json_has_editor_script( string $slug ): void {
        $data = $this->load_block_json( $slug );
        $this->assertArrayHasKey( 'editorScript', $data, "sgs/{$slug} block.json is missing 'editorScript'." );
        $this->assertNotEmpty( $data['editorScript'] );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_has_edit_js( string $slug ): void {
        $this->assertFileExists(
            SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/edit.js',
            "sgs/{$slug} must have an edit.js source file."
        );
    }

    #[DataProvider( 'block_slug_provider' )]
    public function test_block_has_index_js( string $slug ): void {
        $this->assertFileExists(
            SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/index.js',
            "sgs/{$slug} must have an index.js source file."
        );
    }
}
