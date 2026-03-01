<?php
/**
 * Tests: Server-side render.php file contracts.
 *
 * Verifies that server-rendered blocks:
 *   - Declare "render": "file:./render.php" in block.json.
 *   - Have the render.php file present in src/blocks/<slug>/.
 *   - Pass PHP lint (no syntax errors).
 *   - Reference the $attributes variable (standard WP render contract).
 *   - Contain the expected root HTML element.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class RenderOutputTest
 */
class RenderOutputTest extends TestCase {

    // ── Data providers ────────────────────────────────────────────────────────

    /**
     * Return all blocks that declare "render": "file:./render.php" in block.json.
     *
     * @return array<string, array{0: string}> PHPUnit data-provider rows.
     */
    public static function server_rendered_block_provider(): array {
        $src_dir = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks';

        if ( ! is_dir( $src_dir ) ) {
            return [];
        }

        $rows = [];

        foreach ( scandir( $src_dir ) as $item ) {
            if ( str_starts_with( $item, '.' ) || 'extensions' === $item ) {
                continue;
            }

            $block_json_path = $src_dir . '/' . $item . '/block.json';

            if ( ! file_exists( $block_json_path ) ) {
                continue;
            }

            $data = json_decode( file_get_contents( $block_json_path ), associative: true );

            if ( isset( $data['render'] ) && str_starts_with( $data['render'], 'file:' ) ) {
                $rows[ $item ] = [ $item ];
            }
        }

        return $rows;
    }

    /**
     * Key blocks with their expected root HTML element.
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function key_block_element_provider(): array {
        return [
            'hero outputs section'       => [ 'hero',        '<section' ],
            'cta-section outputs section'=> [ 'cta-section', '<section' ],
            'icon-list outputs ul'       => [ 'icon-list',   '<ul'      ],
            'form contains form element' => [ 'form',        '<form'    ],
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Run `php -l` on a file and return the output.
     *
     * @param string $path Absolute path to a PHP file.
     * @return string
     */
    private function php_lint( string $path ): string {
        return shell_exec( 'php -l ' . escapeshellarg( $path ) . ' 2>&1' ) ?? '';
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /**
     * Every block that declares render.php in block.json must have the file.
     *
     * @param string $slug Block slug.
     */
    #[DataProvider( 'server_rendered_block_provider' )]
    public function test_render_php_file_exists( string $slug ): void {
        $this->assertFileExists(
            SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/render.php',
            "sgs/{$slug} declares render.php in block.json but the file is missing."
        );
    }

    /**
     * render.php must pass PHP lint (no parse errors).
     *
     * @param string $slug Block slug.
     */
    #[DataProvider( 'server_rendered_block_provider' )]
    public function test_render_php_is_valid_php( string $slug ): void {
        $path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/render.php';

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "render.php not found for sgs/{$slug}." );
        }

        $output = $this->php_lint( $path );

        $this->assertStringContainsString(
            'No syntax errors',
            $output,
            "sgs/{$slug} render.php has PHP syntax errors:\n{$output}"
        );
    }

    /**
     * render.php must reference the $attributes variable (WP render contract).
     *
     * @param string $slug Block slug.
     */
    #[DataProvider( 'server_rendered_block_provider' )]
    public function test_render_php_uses_attributes_variable( string $slug ): void {
        $path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/render.php';

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "render.php not found for sgs/{$slug}." );
        }

        $this->assertStringContainsString(
            '$attributes',
            file_get_contents( $path ),
            "sgs/{$slug} render.php must use \$attributes (WordPress render callback contract)."
        );
    }

    /**
     * Key blocks must output their expected root HTML element.
     *
     * @param string $slug         Block slug.
     * @param string $expected_tag Expected root HTML element opening tag (e.g. '<section').
     */
    #[DataProvider( 'key_block_element_provider' )]
    public function test_key_block_render_uses_expected_element( string $slug, string $expected_tag ): void {
        $path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/render.php';

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "render.php not found for sgs/{$slug}." );
        }

        $this->assertStringContainsString(
            $expected_tag,
            file_get_contents( $path ),
            "sgs/{$slug} render.php should output a {$expected_tag}> element."
        );
    }

    /**
     * render.php files must not be empty.
     *
     * @param string $slug Block slug.
     */
    #[DataProvider( 'server_rendered_block_provider' )]
    public function test_render_php_is_not_empty( string $slug ): void {
        $path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/' . $slug . '/render.php';

        if ( ! file_exists( $path ) ) {
            $this->markTestSkipped( "render.php not found for sgs/{$slug}." );
        }

        $this->assertNotEmpty(
            trim( file_get_contents( $path ) ),
            "sgs/{$slug} render.php must not be empty."
        );
    }

    // ── PHP lint: include files ────────────────────────────────────────────────

    /**
     * All PHP files in includes/ must pass PHP lint.
     */
    public function test_includes_php_files_are_valid(): void {
        $includes_dir = SGS_BLOCKS_PLUGIN_DIR . '/includes';

        if ( ! is_dir( $includes_dir ) ) {
            $this->markTestSkipped( 'includes/ directory not found.' );
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator( $includes_dir, FilesystemIterator::SKIP_DOTS )
        );

        $failures = [];

        foreach ( $iterator as $file ) {
            if ( $file->getExtension() !== 'php' ) {
                continue;
            }

            $output = $this->php_lint( $file->getPathname() );

            if ( ! str_contains( $output, 'No syntax errors' ) ) {
                $failures[] = $file->getPathname() . ': ' . trim( $output );
            }
        }

        $this->assertEmpty(
            $failures,
            'PHP syntax errors in includes/: ' . PHP_EOL . implode( PHP_EOL, $failures )
        );
    }

    /**
     * Main plugin file must pass PHP lint.
     */
    public function test_main_plugin_file_is_valid_php(): void {
        $path   = SGS_BLOCKS_PLUGIN_DIR . '/sgs-blocks.php';
        $output = $this->php_lint( $path );

        $this->assertStringContainsString(
            'No syntax errors',
            $output,
            "sgs-blocks.php has PHP syntax errors:\n{$output}"
        );
    }
}
