<?php
/**
 * Every Text indent setting a block declares paints on the front end.
 *
 * The shared sgs_typography_css_rule() emits `{prefix}TextIndent` only on a caller-supplied
 * paragraph-after-paragraph sibling selector (core's convention), so a block
 * that declares the attribute without passing that selector shows a control
 * that paints nothing. The framework rule: an element that can hold several
 * paragraphs passes the sibling selector; a single text element (a title,
 * label, name, list item) does not declare the attribute at all.
 *
 * Run with: vendor/bin/phpunit --filter TextIndentSiblingRuleTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Text indent framework rule.
 */
final class TextIndentSiblingRuleTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Every (block, attribute) pair declaring a text indent.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function indent_attributes(): array {
		$cases = array();
		foreach ( glob( dirname( __DIR__, 2 ) . '/src/blocks/*/block.json' ) as $file ) {
			$meta = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local block.json.
			if ( ! is_array( $meta ) || empty( $meta['name'] ) || empty( $meta['attributes'] ) ) {
				continue;
			}
			foreach ( array_keys( $meta['attributes'] ) as $attr ) {
				if ( 'textIndent' === $attr || 1 === preg_match( '/^[a-z][A-Za-z0-9]*TextIndent$/', $attr ) ) {
					$cases[ $meta['name'] . '::' . $attr ] = array( $meta['name'], $attr );
				}
			}
		}
		return $cases;
	}

	/**
	 * The data set is never empty.
	 */
	public function test_the_rule_covers_blocks(): void {
		$this->assertNotEmpty( self::indent_attributes(), 'no block declares a text indent; the glob or the pattern is broken' );
	}

	/**
	 * A declared text indent paints on the paragraph-after-paragraph selector.
	 *
	 * @param string $slug Block name.
	 * @param string $attr Text indent attribute.
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'indent_attributes' )]
	public function test_text_indent_paints_on_following_paragraphs( string $slug, string $attr ): void {
		$out = $this->render_block(
			$slug,
			array(
				$attr     => '37px',
				'text'    => '<p>One</p><p>Two</p>',
				'content' => '<p>One</p><p>Two</p>',
			)
		);

		$this->assertMatchesRegularExpression(
			'/\+[^{}]*\{text-indent:37px;\}/',
			$out['css'],
			"{$slug} declares {$attr} but render.php paints no paragraph-after-paragraph text-indent rule"
		);
	}
}
