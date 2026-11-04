<?php
/**
 * sgs/text `linkFontWeight`: the font weight of the links inside the text.
 *
 * Run with: vendor/bin/phpunit --filter TextLinkFontWeightTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TextLinkFontWeightTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function text( array $attrs ): array {
		return $this->render_block( 'sgs/text', array_merge( array( 'text' => '<a href="/about/">About</a>' ), $attrs ) );
	}

	public function test_unset_prints_no_link_weight(): void {
		$this->assertStringNotContainsString( 'font-weight', $this->text( array() )['css'] );
	}

	public function test_weight_prints_on_the_links_of_the_block(): void {
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-text\.sgs-text-[0-9a-f]{8} a\{font-weight:700;\}/', $this->text( array( 'linkFontWeight' => '700' ) )['css'] );
	}

	public function test_an_invalid_weight_prints_nothing(): void {
		$this->assertStringNotContainsString( 'font-weight', $this->text( array( 'linkFontWeight' => 'bold;color:red' ) )['css'] );
	}
}
