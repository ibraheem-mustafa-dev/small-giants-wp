<?php
/**
 * Section-anchored decorative layers are marked by their own render and lifted whole by the section block
 * (includes/section-anchored-layers.php::mark_section_anchored_layer, ::sgs_lift_section_anchored_layers).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use function SGS\Blocks\mark_section_anchored_layer;
use function SGS\Blocks\sgs_lift_section_anchored_layers;
use const SGS\Blocks\SECTION_LAYER_CLOSE;
use const SGS\Blocks\SECTION_LAYER_OPEN;

class SectionAnchoredLayersTest extends TestCase {

	protected function setUp(): void {
		if ( ! function_exists( 'add_filter' ) ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
			function add_filter( ...$args ) {
				return true;
			}
		}
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/section-anchored-layers.php';
	}

	private function mark( string $html, string $anchor ): string {
		return mark_section_anchored_layer( $html, array( 'attrs' => array( 'anchorTo' => $anchor ) ) );
	}

	public function test_only_a_section_anchored_layer_is_marked(): void {
		$this->assertSame( '<span class="ring"></span>', $this->mark( '<span class="ring"></span>', 'parent' ) );
		$this->assertSame( SECTION_LAYER_OPEN . '<span class="ring"></span>' . SECTION_LAYER_CLOSE, $this->mark( '<span class="ring"></span>', 'section' ) );
		$this->assertSame( '', $this->mark( '', 'section' ) );
	}

	public function test_marked_layers_are_lifted_in_order_and_the_rest_keeps_its_order(): void {
		$content = '<h1>A</h1>' . $this->mark( '<span id="r1"></span>', 'section' ) . '<p>B</p>' . $this->mark( '<span id="r2"></span>', 'section' ) . '<p>C</p>';
		[ $rest, $lifted ] = sgs_lift_section_anchored_layers( $content );
		$this->assertSame( '<h1>A</h1><p>B</p><p>C</p>', $rest );
		$this->assertSame( '<span id="r1"></span><span id="r2"></span>', $lifted );
	}

	public function test_a_marked_layer_inside_a_marked_layer_moves_with_its_parent(): void {
		$inner   = $this->mark( '<i id="in"></i>', 'section' );
		$content = '<p>A</p>' . $this->mark( '<div id="out">' . $inner . '</div>', 'section' ) . '<p>B</p>';
		[ $rest, $lifted ] = sgs_lift_section_anchored_layers( $content );
		$this->assertSame( '<p>A</p><p>B</p>', $rest );
		$this->assertSame( '<div id="out">' . $inner . '</div>', $lifted );
	}

	public function test_unpaired_markers_leave_the_content_untouched(): void {
		foreach ( array( '<p>A</p>' . SECTION_LAYER_OPEN . '<i></i>', '<p>A</p>' . SECTION_LAYER_CLOSE . '<i></i>' ) as $content ) {
			$this->assertSame( array( $content, '' ), sgs_lift_section_anchored_layers( $content ) );
		}
	}

	public function test_content_without_markers_is_returned_as_is(): void {
		$this->assertSame( array( '<p>A</p>', '' ), sgs_lift_section_anchored_layers( '<p>A</p>' ) );
	}
}
