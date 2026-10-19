<?php
/**
 * sgs/container "Stop below the site header" (pinBelowHeader) and "Gap below
 * the header" (pinGap): a container pinned to the top edge sits below a sticky
 * site header instead of sliding under it (includes/container-pin-edge-css.php).
 *
 * Run with: vendor/bin/phpunit --filter ContainerPinBelowHeaderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerPinBelowHeaderTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const OFFSET = 'top:calc(var(--sgs-header-height,0px) + 36px)';

	public function test_top_pin_with_the_toggle_on_offsets_by_the_header_height_and_the_gap(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'         => array( 'desktop' => 'top' ),
				'pinBelowHeader'  => array( 'desktop' => 'on' ),
				'pinGap'          => array( 'desktop' => '36px' ),
			)
		);

		$this->assertStringContainsString( self::OFFSET, $out['css'] );
		$this->assertStringContainsString( ':not(dialog *,[role="dialog"] *,[popover] *)', $out['css'] );
		$this->assertStringContainsString( 'position:sticky;top:0;', $out['css'], 'the base pin rule stays' );
	}

	public function test_an_unset_gap_uses_the_shop_filter_default(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'top' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
			)
		);

		$this->assertStringContainsString( 'top:calc(var(--sgs-header-height,0px) + var(--wp--preset--spacing--40,1.5rem))', $out['css'] );
	}

	public function test_an_unsafe_gap_falls_back_to_the_default(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'top' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
				'pinGap'         => array( 'desktop' => '1px}body{color:red' ),
			)
		);

		$this->assertStringNotContainsString( 'body{color:red', $out['css'] );
		$this->assertStringContainsString( '+ var(--wp--preset--spacing--40,1.5rem))', $out['css'] );
	}

	public function test_the_toggle_unset_adds_no_offset(): void {
		$out = $this->render_block( 'sgs/container', array( 'pinEdge' => array( 'desktop' => 'top' ) ) );

		$this->assertStringContainsString( 'position:sticky;top:0;', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-header-height', $out['css'] );
	}

	public function test_the_toggle_off_adds_no_offset(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'top' ),
				'pinBelowHeader' => array( 'desktop' => 'off' ),
			)
		);

		$this->assertStringNotContainsString( '--sgs-header-height', $out['css'] );
	}

	public function test_a_bottom_edge_adds_no_offset(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'bottom' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
				'pinGap'         => array( 'desktop' => '36px' ),
			)
		);

		$this->assertStringContainsString( 'position:sticky;bottom:0;', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-header-height', $out['css'] );
	}

	public function test_the_toggle_on_with_no_pin_adds_no_offset_rule(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'none' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
			)
		);

		$this->assertStringNotContainsString( '--sgs-header-height', $out['css'] );
		$this->assertStringNotContainsString( 'position:sticky', $out['css'] );
	}

	public function test_tablet_inherits_desktop_on_and_a_bottom_pin_at_mobile_gets_no_offset(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'top', 'mobile' => 'bottom' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
				'pinGap'         => array( 'desktop' => '36px' ),
			)
		);

		$this->assertSame( 1, substr_count( $out['css'], '--sgs-header-height' ), 'one offset rule, for the top tiers only' );

		$offset_at = (int) strpos( $out['css'], '--sgs-header-height' );
		$open       = (int) strrpos( substr( $out['css'], 0, $offset_at ), '@media' );
		$query      = substr( $out['css'], $open, (int) strpos( $out['css'], '{', $open ) - $open );

		$this->assertStringContainsString( '(min-width:1024px)', $query, 'desktop is covered' );
		$this->assertStringContainsString( '(max-width:1023px)', $query, 'tablet inherits desktop on' );
		$this->assertStringNotContainsString( '(max-width:767px)', $query, 'mobile is not covered' );
		$this->assertStringContainsString( 'position:sticky;bottom:0;', $out['css'], 'mobile keeps its bottom pin' );
	}

	public function test_the_offset_rule_keeps_a_drawer_pin_at_the_top(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'pinEdge'        => array( 'desktop' => 'top' ),
				'pinBelowHeader' => array( 'desktop' => 'on' ),
			)
		);

		foreach ( array( 'dialog *', '[role="dialog"] *', '[popover] *' ) as $guard ) {
			$this->assertStringContainsString( $guard, $out['css'] );
		}
		$this->assertMatchesRegularExpression( '/:not\([^)]*dialog \*[^)]*\)\{top:calc\(var\(--sgs-header-height,0px\)/', $out['css'] );
	}
}
