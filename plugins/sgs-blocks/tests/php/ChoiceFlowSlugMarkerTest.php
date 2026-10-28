<?php
/**
 * Sgs/choice-flow names the saved flow it shows: the root carries
 * data-flow-slug="<slug>" when the block holds a flowId (the linking block
 * stamps the slug onto the saved flow's own root as it renders it, FR-43-6),
 * and prints no such attribute for a flow placed directly with no flowId.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowSlugMarkerTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Choice-flow slug marker.
 */
final class ChoiceFlowSlugMarkerTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * A referenced flow's root prints its slug.
	 */
	public function test_referenced_flow_root_prints_its_slug(): void {
		$out = $this->render_block( 'sgs/choice-flow', array( 'flowId' => 'choice-flow-build-your-zookie' ) );

		$this->assertStringContainsString( 'data-wp-interactive="sgs/choice-flow"', $out['html'], 'no flow root in the markup' );
		$this->assertMatchesRegularExpression( '/<div [^>]*data-flow-slug="choice-flow-build-your-zookie"[^>]*data-wp-interactive="sgs\/choice-flow"|<div [^>]*data-wp-interactive="sgs\/choice-flow"[^>]*data-flow-slug="choice-flow-build-your-zookie"/', $out['html'], 'the slug is not on the flow root' );
	}

	/**
	 * The slug is sanitised and escaped: markup in a flowId never reaches an attribute.
	 */
	public function test_slug_is_sanitised(): void {
		$out = $this->render_block( 'sgs/choice-flow', array( 'flowId' => 'a" onfocus="x' ) );

		$this->assertStringNotContainsString( 'onfocus=', $out['html'], 'an unsanitised flowId reached the markup' );
		$this->assertStringContainsString( 'data-flow-slug="a-onfocusx"', $out['html'] );
	}

	/**
	 * Negative control: a flow placed with no flowId prints no data-flow-slug at all (not an empty one).
	 */
	public function test_flow_without_a_flow_id_prints_no_slug(): void {
		$out = $this->render_block( 'sgs/choice-flow', array() );

		$this->assertStringContainsString( 'data-wp-interactive="sgs/choice-flow"', $out['html'], 'no flow root in the markup' );
		$this->assertStringNotContainsString( 'data-flow-slug', $out['html'] );
	}
}
