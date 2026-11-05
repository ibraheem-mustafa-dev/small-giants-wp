<?php
/**
 * Tests: a modal without a trigger button takes no block-gap margin.
 *
 * The wrapper of a modal whose triggerStyle is "none" carries `sgs-modal--no-trigger`, and style.css zeroes that
 * wrapper's margin-block-start with two classes, enough to beat the flow layout's `:root :where()` gap rule. A
 * modal with a trigger keeps the gap.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ModalNoTriggerMarginTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ModalNoTriggerMarginTest extends TestCase {

	private function read( string $relative ): string {
		return (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/modal/' . $relative );
	}

	public function test_the_wrapper_class_is_added_only_when_there_is_no_trigger(): void {
		$this->assertStringContainsString(
			"'class' => 'sgs-modal ' . \$uid . ( 'none' === \$trigger_style ? ' sgs-modal--no-trigger' : '' ),",
			$this->read( 'render.php' )
		);
	}

	public function test_the_rule_zeroes_the_margin_with_two_classes(): void {
		$css = $this->read( 'style.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-modal\.sgs-modal--no-trigger\s*\{\s*margin-block-start:\s*0;\s*\}/', $css );
	}

	public function test_negative_control_the_bare_modal_root_has_no_margin_reset(): void {
		$this->assertDoesNotMatchRegularExpression( '/(?<![\w-])\.sgs-modal\s*\{[^}]*margin-block/', $this->read( 'style.css' ) );
	}
}
