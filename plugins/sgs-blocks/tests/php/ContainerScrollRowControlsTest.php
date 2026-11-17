<?php
/**
 * sgs/container "Scroll sideways" row controls: previous/next arrows, position dots and mouse drag.
 *
 * All three are off by default, so a container without them prints exactly what it printed before. When on (and only
 * where Scroll sideways is on at some device) the arrows and dots are one server-rendered bar after the row, and the
 * row carries `data-sgs-scroll-controls` naming what the script should wire.
 *
 * Run with: vendor/bin/phpunit --filter ContainerScrollRowControlsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerScrollRowControlsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ROW = array( 'scrollSideways' => array( 'mobile' => 'on', 'tablet' => 'on' ) );

	/** @return array<string, mixed> */
	private function attrs( array $extra ): array {
		return array_merge( self::ROW, $extra );
	}

	private function html( array $attrs ): string {
		return $this->render_block( 'sgs/container', $attrs, array(), array(), '<p>A</p><p>B</p>' )['html'];
	}

	public function test_block_json_declares_the_three_settings_off_by_default(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/container/block.json' ), true );
		foreach ( array( 'scrollArrows', 'scrollDots', 'scrollDrag' ) as $name ) {
			$this->assertSame( 'boolean', $json['attributes'][ $name ]['type'], $name );
			$this->assertFalse( $json['attributes'][ $name ]['default'], $name );
		}
	}

	public function test_all_off_prints_exactly_what_it_printed_before(): void {
		$before = $this->html( self::ROW );
		$off    = $this->html( $this->attrs( array( 'scrollArrows' => false, 'scrollDots' => false, 'scrollDrag' => false ) ) );
		// The scoped class carries a hash of the stored attributes, so compare with it masked.
		$mask = static fn ( string $html ): string => (string) preg_replace( '/sgs-(container|cst)-[0-9a-f]{8}/', 'sgs-$1-X', $html );
		$this->assertSame( $mask( $before ), $mask( $off ), 'explicit false equals absent' );
		$this->assertStringNotContainsString( 'scroll-nav', $before );
		$this->assertStringNotContainsString( 'data-sgs-scroll-controls', $before );
		$this->assertStringNotContainsString( '<button', $before );
	}

	public function test_arrows_print_two_named_buttons_and_no_dots(): void {
		$html = $this->html( $this->attrs( array( 'scrollArrows' => true ) ) );
		$this->assertStringContainsString( 'class="sgs-container__scroll-nav"', $html );
		$this->assertSame( 2, substr_count( $html, '<button' ) );
		$this->assertStringContainsString( 'sgs-container__arrow--prev', $html );
		$this->assertStringContainsString( 'sgs-container__arrow--next', $html );
		$this->assertMatchesRegularExpression( '/aria-label="Previous[^"]*"/', $html );
		$this->assertMatchesRegularExpression( '/aria-label="Next[^"]*"/', $html );
		$this->assertStringNotContainsString( 'sgs-container__dots', $html );
		$this->assertStringContainsString( 'data-sgs-scroll-controls="arrows"', $html );
		$this->assertStringNotContainsString( 'style="', $html );
	}

	public function test_dots_print_an_empty_named_group_the_script_fills(): void {
		$html = $this->html( $this->attrs( array( 'scrollDots' => true ) ) );
		$this->assertMatchesRegularExpression( '/<div class="sgs-container__dots"[^>]*role="group"[^>]*aria-label="[^"]+"><\/div>/', $html );
		$this->assertStringNotContainsString( 'sgs-container__arrow', $html );
		$this->assertStringContainsString( 'data-sgs-scroll-controls="dots"', $html );
	}

	public function test_arrows_and_dots_and_drag_are_all_named_on_the_row(): void {
		$html = $this->html( $this->attrs( array( 'scrollArrows' => true, 'scrollDots' => true, 'scrollDrag' => true ) ) );
		$this->assertStringContainsString( 'data-sgs-scroll-controls="arrows dots drag"', $html );
		$this->assertSame( 1, substr_count( $html, 'class="sgs-container__scroll-nav"' ) );
	}

	public function test_drag_alone_prints_no_bar(): void {
		$html = $this->html( $this->attrs( array( 'scrollDrag' => true ) ) );
		$this->assertStringContainsString( 'data-sgs-scroll-controls="drag"', $html );
		$this->assertStringNotContainsString( 'scroll-nav', $html );
	}

	public function test_nothing_prints_where_scroll_sideways_is_off_everywhere(): void {
		$html = $this->html( array( 'scrollArrows' => true, 'scrollDots' => true, 'scrollDrag' => true ) );
		$this->assertStringNotContainsString( 'scroll-nav', $html );
		$this->assertStringNotContainsString( 'data-sgs-scroll-controls', $html );
	}
}
