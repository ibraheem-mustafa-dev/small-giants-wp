<?php
/**
 * An sgs/heading with no words renders nothing, as sgs/text does: a bound heading whose value resolves to '' (an
 * unanswered order fact, a signed-out customer with no fallback typed) leaves no empty h2 and no scoped style behind.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter HeadingEmptyContentTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeadingEmptyContentTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @return array<string, array{0: array<string, mixed>}>
	 */
	public static function empty_headings(): array {
		return array(
			'no content attribute'   => array( array( 'level' => 'h2' ) ),
			'empty string'           => array( array( 'content' => '', 'level' => 'h3' ) ),
			'whitespace only'        => array( array( 'content' => "  \n ", 'level' => 'h2' ) ),
			'markup with no words'   => array( array( 'content' => '<strong></strong><br>', 'level' => 'h2' ) ),
			'subheading, empty'      => array( array( 'content' => '', 'headingRole' => 'subheading', 'subTag' => 'p' ) ),
			'empty with a look set'  => array( array( 'content' => '', 'level' => 'h2', 'textColour' => '#c00', 'fontSize' => '32px' ) ),
		);
	}

	/**
	 * @dataProvider empty_headings
	 * @param array<string, mixed> $attrs Attributes.
	 */
	public function test_an_empty_heading_renders_nothing( array $attrs ): void {
		$out = $this->render_block( 'sgs/heading', $attrs );
		$this->assertSame( '', trim( $out['html'] ), 'an empty heading prints no element' );
		$this->assertSame( '', trim( $out['css'] ), 'an empty heading prints no scoped style' );
	}

	/**
	 * Negative control: a heading with words still renders its element and its words.
	 */
	public function test_a_heading_with_words_still_renders(): void {
		$out = $this->render_block( 'sgs/heading', array( 'content' => 'Your order', 'level' => 'h2' ) );
		$this->assertMatchesRegularExpression( '#<h2\b[^>]*>\s*Your order\s*</h2>#', $out['html'] );
		$sub = $this->render_block( 'sgs/heading', array( 'content' => '<em>Thank</em> you', 'headingRole' => 'subheading', 'subTag' => 'p' ) );
		$this->assertMatchesRegularExpression( '#<p\b[^>]*>\s*<em>Thank</em> you\s*</p>#', $sub['html'] );
	}
}
