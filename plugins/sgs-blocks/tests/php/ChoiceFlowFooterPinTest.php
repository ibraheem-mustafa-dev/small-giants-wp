<?php
/**
 * Pins what sgs/choice-flow's footer buttons and chrome Close button render with none of the built-in button kit's settings
 * set (Spec 43, Spec 11 section 4): the footer markup, the header markup and every scoped rule that names a footer button or
 * the Close button. The snapshots in tests/fixtures/choice-flow/footer-snapshots.json were taken before the buttons moved onto
 * the kit; with the kit unset the flow must keep rendering them byte for byte.
 *
 * Buy now's show and hide is the step's runtime state (`data-show-buy-now` on a result step, flow-steps.js), so its markup is
 * the same in both modes and one snapshot covers it. The cases cover the footer with the skip link off and on, and the Close
 * button as an icon and as text, each with the block's own attribute defaults applied.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowFooterPinTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowFooterPinTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const FIXTURE = __DIR__ . '/../fixtures/choice-flow/footer-snapshots.json';

	/** The attribute sets the snapshots are taken for, by name. */
	public static function cases(): array {
		return array(
			'footer-skip-off'  => array( 'footer-skip-off', array() ),
			'footer-skip-on'   => array( 'footer-skip-on', array( 'skipLabel' => 'Skip the lenses', 'skipPrompt' => 'Frame only?' ) ),
			'close-icon'       => array( 'close-icon', array( 'showHeader' => true ) ),
			'close-text'       => array( 'close-text', array( 'showHeader' => true, 'closeStyle' => 'text', 'closeLabel' => 'Close' ) ),
		);
	}

	/**
	 * What the render holds for the footer buttons and the Close button: the footer block, the header block and the
	 * scoped rules that name one of the buttons (the instance id, which hashes the attributes, is masked).
	 *
	 * @param array<string,mixed> $attrs Attributes to render with.
	 * @return array<string,mixed>
	 */
	private function pinned( array $attrs ): array {
		$out  = $this->render_block( 'sgs/choice-flow', $attrs, array(), array(), '', true );
		$html = (string) $out['html'];
		preg_match( '#<div class="sgs-choice-flow__footer">.*?sgs-choice-flow__continue-hint[^>]*></p></div>#s', $html, $footer );
		preg_match( '#<div class="sgs-choice-flow__chrome-header".*?</button></div>#s', $html, $header );
		$rules = array();
		foreach ( preg_split( '/(?<=\})/', (string) $out['css'] ) as $rule ) {
			if ( preg_match( '/__(nav-back|continue|add-to-basket|buy-now|skip|chrome-close)/', $rule ) ) {
				$rules[] = trim( preg_replace( '/sgs-choice-flow-[0-9a-f]{8}/', 'sgs-choice-flow-UID', $rule ) );
			}
		}
		return array(
			'footer' => $footer[0] ?? '',
			'header' => $header[0] ?? '',
			'rules'  => $rules,
		);
	}

	/**
	 * @dataProvider cases
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'cases' )]
	public function test_unset_kit_renders_as_before( string $name, array $attrs ): void {
		$snapshots = json_decode( (string) file_get_contents( self::FIXTURE ), true, 512, JSON_THROW_ON_ERROR );
		$now       = $this->pinned( $attrs );
		if ( getenv( 'SGS_RECORD_CHOICE_FLOW_PIN' ) ) {
			$snapshots[ $name ] = $now;
			ksort( $snapshots );
			file_put_contents( self::FIXTURE, json_encode( $snapshots, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( 'recorded' );
		}
		$this->assertArrayHasKey( $name, $snapshots );
		$this->assertNotSame( '', $now['footer'], 'the footer was not found in the render' );
		$this->assertSame( $snapshots[ $name ]['footer'], $now['footer'], 'footer markup changed' );
		$this->assertSame( $snapshots[ $name ]['header'], $now['header'], 'header markup changed' );
		$this->assertSame( $snapshots[ $name ]['rules'], $now['rules'], 'scoped rules for the footer buttons changed' );
	}
}
