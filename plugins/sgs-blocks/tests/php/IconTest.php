<?php
/**
 * Tests: sgs/icon block — render.php contracts and WCAG semantics.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

class IconTest extends TestCase {

    private string $block_dir;

    protected function setUp(): void {
        $this->block_dir = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/icon';
    }

    private function render_block( array $attributes ): string {
        static $helpers_loaded = false;
        if ( ! $helpers_loaded ) {
            require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php';
            require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/lucide-icons.php';
            $helpers_loaded = true;
        }
        $block             = new stdClass();
        $block->attributes = $attributes;
        $content           = '';
        ob_start();
        try {
            include $this->block_dir . '/render.php';
            return ob_get_clean() ?: '';
        } catch ( \Throwable $e ) {
            ob_end_clean();
            throw $e;
        }
    }

    public function test_render_php_passes_lint(): void {
        $out = shell_exec( PHP_BINARY . ' -l ' . escapeshellarg( $this->block_dir . '/render.php' ) . ' 2>&1' ) ?? '';
        $this->assertStringContainsString( 'No syntax errors', $out );
    }

    public function test_block_json_is_valid(): void {
        $data  = json_decode( file_get_contents( $this->block_dir . '/block.json' ), associative: true );
        $attrs = $data['attributes'] ?? array();
        $this->assertSame( 'sgs/icon', $data['name'] ?? '' );
        $this->assertArrayHasKey( 'iconName',   $attrs );
        $this->assertArrayHasKey( 'iconSize',   $attrs );
        $this->assertArrayHasKey( 'linkUrl',    $attrs );
        $this->assertArrayHasKey( 'linkTarget', $attrs );
        $this->assertArrayHasKey( 'ariaLabel',  $attrs );
    }

    public function test_star_icon_renders_svg(): void {
        $output = $this->render_block( array( 'iconName' => 'star' ) );
        $this->assertNotEmpty( $output );
        $this->assertStringContainsString( '<svg', $output );
        $this->assertStringContainsString( 'sgs-icon__svg', $output );
    }

    public function test_linked_icon_blank_target_gets_rel_and_aria_label(): void {
        $output = $this->render_block( array(
            'iconName'   => 'arrow-right',
            'linkUrl'    => 'https://example.com',
            'linkTarget' => '_blank',
            'ariaLabel'  => 'Go to example',
        ) );
        $this->assertStringContainsString( 'rel="noopener noreferrer"',  $output );
        $this->assertStringContainsString( 'aria-label="Go to example"', $output );
        $this->assertStringContainsString( 'sgs-icon__link',             $output );
    }

    public function test_informative_icon_has_role_img(): void {
        $output = $this->render_block( array(
            'iconName'  => 'check',
            'ariaLabel' => 'Task complete',
        ) );
        $this->assertStringContainsString( 'role="img"',                 $output );
        $this->assertStringContainsString( 'aria-label="Task complete"', $output );
        $this->assertStringContainsString( 'aria-hidden="true"',         $output );
    }

    public function test_decorative_icon_is_aria_hidden(): void {
        $output = $this->render_block( array( 'iconName' => 'heart', 'ariaLabel' => '' ) );
        $this->assertStringContainsString(    'aria-hidden="true"', $output );
        $this->assertStringNotContainsString( 'role="img"',         $output );
    }

    public function test_self_target_no_noopener(): void {
        $output = $this->render_block( array(
            'iconName'   => 'home',
            'linkUrl'    => 'https://example.com',
            'linkTarget' => '_self',
        ) );
        $this->assertStringNotContainsString( 'noopener', $output );
    }

    public function test_linked_icon_falls_back_to_icon_name_for_aria_label(): void {
        $output = $this->render_block( array(
            'iconName'   => 'phone',
            'linkUrl'    => 'tel:+441234567890',
            'linkTarget' => '_self',
            'ariaLabel'  => '',
        ) );
        $this->assertStringContainsString( 'aria-label="phone"', $output );
    }
}
