<?php
/**
 * Tests: every default rule in sgs/order-items' style.css has zero specificity, so each setting that prints a scoped rule
 * (thumbnail width, height and border, row, text) beats the default.
 *
 * `:where(.sgs-order-items) .sgs-order-items__thumb .sgs-media-el` carried two classes, one more than the scoped
 * `.uid .sgs-media-el` rule that prints the thumbnail settings, so those settings did nothing.
 *
 * Run with: vendor/bin/phpunit --filter OrderItemsDefaultsSpecificityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class OrderItemsDefaultsSpecificityTest extends TestCase {

	/**
	 * Every selector of every rule in the stylesheet.
	 *
	 * @return string[]
	 */
	private function selectors(): array {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/order-items/style.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		preg_match_all( '/([^{}]+)\{[^}]*\}/', $css, $m );
		$out = array();
		foreach ( $m[1] as $group ) {
			foreach ( explode( ',', $group ) as $selector ) {
				$out[] = trim( $selector );
			}
		}
		return $out;
	}

	public function test_the_stylesheet_has_rules(): void {
		$this->assertGreaterThan( 5, count( $this->selectors() ) );
	}

	public function test_every_default_selector_sits_wholly_inside_where(): void {
		foreach ( $this->selectors() as $selector ) {
			$this->assertMatchesRegularExpression( '/^:where\([^()]+\)$/', $selector, "default rule `$selector` must be one :where() so it carries zero specificity" );
		}
	}

	public function test_the_thumbnail_default_loses_to_a_one_class_scoped_rule(): void {
		$this->assertContains( ':where(.sgs-order-items .sgs-order-items__thumb .sgs-media-el)', $this->selectors() );
	}
}
