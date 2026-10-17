<?php
/**
 * Tests: a visually hidden control hands its focus ring to a visible stand-in.
 *
 * Renders the real render.php of each block that hides its input and asserts the focus-system markup contract
 * (theme/sgs-theme/assets/css/focus.css): the hidden input carries `sgs-focus-source`, its visible stand-in
 * carries `sgs-focus-proxy` and is the input's next element sibling (adjacent arm), or sits inside an
 * `sgs-focus-scope` ancestor (scoped arm, before-after).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Focus source/proxy markup per block.
 */
final class FocusProxyMarkupTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Parse rendered HTML into an XPath handle.
	 *
	 * @param string $html Rendered block HTML.
	 */
	private function xpath( string $html ): DOMXPath {
		$doc = new DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="utf-8"?><body>' . $html . '</body>' );
		libxml_clear_errors();
		return new DOMXPath( $doc );
	}

	/**
	 * XPath for "element with this whole class token".
	 *
	 * @param string $token Class token.
	 */
	private function has_class( string $token ): string {
		return "contains(concat(' ', normalize-space(@class), ' '), ' {$token} ')";
	}

	/**
	 * Assert every source in the HTML is followed directly by a proxy, and return how many sources exist.
	 *
	 * @param string $html Rendered block HTML.
	 */
	private function assert_adjacent_pairs( string $html ): int {
		$xp      = $this->xpath( $html );
		$sources = $xp->query( '//*[' . $this->has_class( 'sgs-focus-source' ) . ']' );
		foreach ( $sources as $source ) {
			$next = $source->nextSibling;
			while ( $next && XML_ELEMENT_NODE !== $next->nodeType ) {
				$next = $next->nextSibling;
			}
			$this->assertNotNull( $next, 'a source has no next element sibling' );
			$this->assertStringContainsString( 'sgs-focus-proxy', (string) $next->getAttribute( 'class' ), 'the next sibling of a source is not a proxy' );
		}
		return $sources->length;
	}

	public function test_option_picker_radio_is_a_source_and_its_pill_the_proxy(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array(
				'label'       => 'Pick a size',
				'optionItems' => array(
					array( 'key' => 's', 'label' => 'Small' ),
					array( 'key' => 'm', 'label' => 'Medium' ),
				),
			)
		);
		$this->assertSame( 2, $this->assert_adjacent_pairs( $out['html'] ), 'one source per radio' );
		$xp = $this->xpath( $out['html'] );
		$this->assertSame( 2, $xp->query( '//input[@type="radio"][' . $this->has_class( 'sgs-focus-source' ) . ']' )->length );
		$this->assertSame( 2, $xp->query( '//span[' . $this->has_class( 'sgs-option-picker__pill' ) . '][' . $this->has_class( 'sgs-focus-proxy' ) . ']' )->length );
	}

	public function test_pricing_table_toggle_inputs_are_sources_and_their_labels_proxies(): void {
		$out = $this->render_block(
			'sgs/pricing-table',
			array(
				'billingToggle' => 'monthly-yearly',
				'plans'         => array(
					array(
						'name'        => 'Plan',
						'price'       => '9',
						'priceYearly' => '90',
						'period'      => 'monthly',
						'features'    => array(),
						'ctaText'     => 'Go',
						'ctaUrl'      => '',
					),
				),
			)
		);
		$this->assertSame( 2, $this->assert_adjacent_pairs( $out['html'] ), 'monthly and yearly toggle inputs' );
		$xp = $this->xpath( $out['html'] );
		$this->assertSame( 2, $xp->query( '//label[' . $this->has_class( 'sgs-pricing-table__toggle-label' ) . '][' . $this->has_class( 'sgs-focus-proxy' ) . ']' )->length );
	}

	public function test_form_file_input_is_a_source_and_its_label_the_proxy(): void {
		$out = $this->render_block( 'sgs/form-field-file', array( 'fieldName' => 'cv', 'label' => 'CV' ) );
		$this->assertSame( 1, $this->assert_adjacent_pairs( $out['html'] ) );
		$xp = $this->xpath( $out['html'] );
		$this->assertSame( 1, $xp->query( '//input[@type="file"][' . $this->has_class( 'sgs-focus-source' ) . ']' )->length );
		$this->assertSame( 1, $xp->query( '//*[' . $this->has_class( 'sgs-form-field__file-label' ) . '][' . $this->has_class( 'sgs-focus-proxy' ) . ']' )->length );
	}

	public function test_before_after_range_is_a_source_inside_a_scope_that_holds_the_handle_proxy(): void {
		$out = $this->render_block(
			'sgs/before-after',
			array(
				'beforeImageUrl' => 'https://example.test/before.jpg',
				'afterImageUrl'  => 'https://example.test/after.jpg',
				'heightUnit'     => 'px',
			)
		);
		$xp = $this->xpath( $out['html'] );
		$this->assertSame( 1, $xp->query( '//input[@type="range"][' . $this->has_class( 'sgs-focus-source' ) . ']' )->length, 'the range is the source' );
		$this->assertSame(
			1,
			$xp->query( '//*[' . $this->has_class( 'sgs-focus-scope' ) . ']//*[' . $this->has_class( 'wp-block-sgs-before-after__handle' ) . '][' . $this->has_class( 'sgs-focus-proxy' ) . ']' )->length,
			'the handle is a proxy inside the scope'
		);
		$this->assertSame(
			1,
			$xp->query( '//*[' . $this->has_class( 'sgs-focus-scope' ) . ']//input[' . $this->has_class( 'sgs-focus-source' ) . ']' )->length,
			'the range sits inside the scope'
		);
	}
}
