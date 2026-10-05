<?php
/**
 * sgs/accordion-item scope id covers the inherited accordion context.
 *
 * The item paints ~25 settings it inherits from its parent sgs/accordion
 * through block context into rules keyed on its own `.sgs-accordion-item-<hash>`
 * class. Two identical items in two differently styled accordions must
 * therefore carry different scope classes, or the second accordion's rules
 * restyle the first accordion's items.
 *
 * Run with: vendor/bin/phpunit --filter AccordionItemScopeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class AccordionItemScopeTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The item's scope class from rendered HTML.
	 *
	 * @param string $html Rendered HTML.
	 * @return string Scope class.
	 */
	private function scope_of( string $html ): string {
		$this->assertSame( 1, preg_match( '/sgs-accordion-item-[0-9a-f]{8}/', $html, $m ), 'no scope class in: ' . $html );
		return $m[0];
	}

	public function test_identical_items_under_different_accordions_get_different_scopes(): void {
		$item = array( 'title' => 'Same question' );

		$red  = $this->render_block( 'sgs/accordion-item', $item, array( 'sgs/accordionHeaderColour' => 'primary' ) );
		$blue = $this->render_block( 'sgs/accordion-item', $item, array( 'sgs/accordionHeaderColour' => 'accent' ) );

		$this->assertNotSame( $this->scope_of( $red['html'] ), $this->scope_of( $blue['html'] ) );
		$this->assertStringContainsString( $this->scope_of( $red['html'] ), $red['css'] );
		$this->assertStringContainsString( $this->scope_of( $blue['html'] ), $blue['css'] );
	}

	public function test_identical_items_under_the_same_accordion_share_a_scope(): void {
		$item    = array( 'title' => 'Same question' );
		$context = array( 'sgs/accordionHeaderColour' => 'primary' );

		$a = $this->render_block( 'sgs/accordion-item', $item, $context );
		$b = $this->render_block( 'sgs/accordion-item', $item, $context );

		$this->assertSame( $this->scope_of( $a['html'] ), $this->scope_of( $b['html'] ) );
	}
}
