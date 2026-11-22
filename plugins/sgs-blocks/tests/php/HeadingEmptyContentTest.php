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
	/**
	 * A heading whose only content is a picture or an icon is not empty: it still renders its element (an icon-only
	 * heading). Whitespace and tags with no media still render nothing (the provider above).
	 *
	 * @return array<string, array{0: string, 1: array<string, mixed>, 2: string}>
	 */
	public static function media_only(): array {
		return array(
			'heading, svg only'    => array( 'sgs/heading', array( 'content' => '<svg viewBox="0 0 10 10" aria-label="Basket"><path d="M0 0h10v10H0z"/></svg>', 'level' => 'h2' ), 'h2' ),
			'heading, img only'    => array( 'sgs/heading', array( 'content' => '<img src="https://example.test/i.png" alt="Bakery">', 'level' => 'h3' ), 'h3' ),
			'heading, img in span' => array( 'sgs/heading', array( 'content' => ' <span><img src="https://example.test/i.png" alt="Bakery"></span> ', 'level' => 'h2' ), 'h2' ),
			'text, img only'       => array( 'sgs/text', array( 'text' => '<img src="https://example.test/i.png" alt="Bakery">' ), 'p' ),
		);
	}

	/**
	 * @dataProvider media_only
	 * @param array<string, mixed> $attrs Attributes.
	 */
	public function test_a_media_only_heading_or_text_still_renders( string $slug, array $attrs, string $tag ): void {
		$out = $this->render_block( $slug, $attrs );
		$this->assertMatchesRegularExpression( '#<' . $tag . '\b#', $out['html'], 'the element prints' );
	}

	/**
	 * Negative control: sgs/text with only whitespace or empty tags still prints nothing.
	 */
	public function test_an_empty_text_still_renders_nothing(): void {
		$this->assertSame( '', trim( $this->render_block( 'sgs/text', array( 'text' => "  <strong> </strong>\n" ) )['html'] ) );
	}

	public function test_a_heading_with_words_still_renders(): void {
		$out = $this->render_block( 'sgs/heading', array( 'content' => 'Your order', 'level' => 'h2' ) );
		$this->assertMatchesRegularExpression( '#<h2\b[^>]*>\s*Your order\s*</h2>#', $out['html'] );
		$sub = $this->render_block( 'sgs/heading', array( 'content' => '<em>Thank</em> you', 'headingRole' => 'subheading', 'subTag' => 'p' ) );
		$this->assertMatchesRegularExpression( '#<p\b[^>]*>\s*<em>Thank</em> you\s*</p>#', $sub['html'] );
	}
}
