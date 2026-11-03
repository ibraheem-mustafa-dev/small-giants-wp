<?php
/**
 * Per-breakpoint text alignment (FW-F): `textAlign` on sgs/text and sgs/heading is a `{desktop, tablet, mobile}` object
 * printed by includes/helpers-typography.php::sgs_typography_css_rule through the explicit `$tiered_keys` argument, and a
 * key the caller does not list stays the scalar it is declared as.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter TextAlignTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TextAlignTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_text_prints_each_breakpoint_and_only_where_it_changes(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'Hello', 'textAlign' => array( 'desktop' => 'left', 'mobile' => 'center' ) ) )['css'];

		$this->assertMatchesRegularExpression( '/\{[^}]*text-align:left;[^}]*\}/', $css, 'desktop is the base rule' );
		$this->assertMatchesRegularExpression( '/@media \(max-width:\s*767px\)\s*\{[^{}]*\{[^}]*text-align:center/', $css, 'mobile overrides' );
		$this->assertDoesNotMatchRegularExpression( '/@media \(max-width:\s*1023px\)\s*\{[^{}]*\{[^}]*text-align/', $css, 'tablet inherits desktop, so it prints nothing' );
	}

	public function test_a_desktop_only_value_prints_one_base_rule_and_no_media_query(): void {
		$css = $this->render_block( 'sgs/heading', array( 'content' => 'Hi', 'textAlign' => array( 'desktop' => 'center' ) ) )['css'];

		$this->assertSame( 1, preg_match_all( '/text-align:center/', $css ), 'one declaration' );
		$this->assertDoesNotMatchRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*text-align/', $css );
	}

	public function test_a_value_off_the_allowlist_prints_nothing(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'Hello', 'textAlign' => array( 'desktop' => 'middle;color:red' ) ) )['css'];

		$this->assertStringNotContainsString( 'text-align', $css );
		$this->assertStringNotContainsString( 'color:red', $css );
	}

	public function test_an_unset_attribute_prints_no_alignment(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'Hello' ) )['css'];

		$this->assertStringNotContainsString( 'text-align', $css, 'negative control: nothing set, nothing printed' );
	}

	public function test_a_key_the_caller_does_not_list_is_printed_as_the_scalar_it_is(): void {
		$css = sgs_typography_css_rule( array( 'textAlign' => 'right' ), '', '.x', '', false, false, array() ); // scalar-tier-allow: a key the caller does not list is a scalar.
		$this->assertStringContainsString( '.x{text-align:right;}', $css );

		$tiered = sgs_typography_css_rule( array( 'textAlign' => array( 'desktop' => 'right', 'tablet' => 'left' ) ), '', '.x', '', false, false, array( 'textAlign' ) );
		$this->assertStringContainsString( '.x{text-align:right;}', $tiered );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023px[^{]*\{\.x\{text-align:left;\}/', $tiered );
	}

	public function test_the_object_attribute_keys_come_from_the_block_schema(): void {
		$block             = new stdClass();
		$block->block_type = (object) array( 'attributes' => array( 'textAlign' => array( 'type' => 'object' ), 'text' => array( 'type' => 'string' ) ) );

		$this->assertSame( array( 'textAlign' ), sgs_object_attr_keys( $block ) );
		$this->assertSame( array(), sgs_object_attr_keys( null ) );
	}
}
