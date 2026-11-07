<?php
/**
 * The card's own hover movement lands its marker on every printed card (not the block root), so a stylesheet's built-in
 * hover lift can drop out (post-grid cards, info-box icon) and never stack with the motion lift.
 *
 * Run with: vendor/bin/phpunit --filter MotionHoverLiftMarkerTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/MotionRendererTestTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionHoverLiftMarkerTest extends TestCase {

	use MotionRendererTestTrait;

	private function lift( string $source = 'self' ): array {
		return array( 'source' => $source, 'values' => array( 'translateY' => -8 ) );
	}

	private function render_block( string $name, string $html, string $target, array $state ): string {
		return sgs_test_render_motion_block(
			array( 'blockName' => $name, 'attrs' => array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( $target => array( 'hover' => array( 'state' => $state ) ) ) ) ) ),
			$html
		);
	}

	public function test_post_grid_card_marker_lands_on_each_card_and_not_the_root(): void {
		$card = '<article class="sgs-post-grid__card sgs-post-grid__card--card"><h3>T</h3></article>';
		$html = '<div class="wp-block-sgs-post-grid"><div class="sgs-post-grid__grid">' . $card . $card . $card . '</div></div>';
		$out  = $this->render_block( 'sgs/post-grid', $html, 'card', $this->lift() );
		$this->assertSame( 3, substr_count( $out, 'data-sgs-mh-move' ), 'one marker per card' );
		$this->assertSame( 3, preg_match_all( '/<article[^>]*data-sgs-mh-move/', $out ), 'each on its card' );
		$this->assertSame( 0, preg_match( '/<div class="wp-block-sgs-post-grid[^>]*data-sgs-mh-move/', $out ), 'not on the root' );
	}

	public function test_post_grid_group_driven_hover_sets_no_marker(): void {
		$card = '<article class="sgs-post-grid__card sgs-post-grid__card--card"><h3>T</h3></article>';
		$out  = $this->render_block( 'sgs/post-grid', '<div class="wp-block-sgs-post-grid">' . $card . $card . '</div>', 'card', $this->lift( 'group' ) );
		$this->assertStringNotContainsString( 'data-sgs-mh-move', $out, 'a hover another element drives moves no card' );
	}

	private function fetched( array $attrs, string $card ): string {
		$loop  = '\SGS\Blocks\Motion\Sgs_Motion_Loop_Inherit';
		$carry = $loop::item_attrs( 'sgs/post-grid', $attrs, '.sgs-post-grid__card' );
		$back  = $loop::decode_attrs( (string) wp_json_encode( $carry ) );
		return $loop::stamp_class( $card, 'sgs-post-grid__card', $back );
	}

	public function test_a_fetched_post_grid_card_carries_the_hover_markers(): void {
		$card = '<article class="sgs-post-grid__card sgs-post-grid__card--card"><h3>T</h3></article>';
		$lift = array( 'v' => 1, 'elements' => array( 'card' => array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => array( 'translateY' => -8, 'scale' => 1.02 ) ) ) ) ) );
		$out  = $this->fetched( array( 'sgsMotion' => $lift ), $card );
		$this->assertStringContainsString( 'data-sgs-mh="self"', $out );
		$this->assertStringContainsString( 'data-sgs-mh-move', $out );
		$this->assertStringContainsString( 'data-sgs-mh-scale', $out );
		$this->assertStringNotContainsString( 'data-sgs-mh-rotate', $out, 'only the movements the state sets' );
	}

	public function test_a_fetched_card_with_no_motion_hover_carries_none(): void {
		$card = '<article class="sgs-post-grid__card"><h3>T</h3></article>';
		$this->assertSame( $card, $this->fetched( array(), $card ) );
		$group = array( 'v' => 1, 'elements' => array( 'card' => array( 'hover' => array( 'state' => array( 'source' => 'group', 'values' => array( 'translateY' => -8 ) ) ) ) ) );
		$this->assertSame( $card, $this->fetched( array( 'sgsMotion' => $group ), $card ), 'a hover another element drives marks no card' );
		$colour = array( 'v' => 1, 'elements' => array( 'card' => array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => array( 'opacity' => 0.9 ) ) ) ) ) );
		$this->assertStringNotContainsString( 'data-sgs-mh-move', $this->fetched( array( 'sgsMotion' => $colour ), $card ) );
	}

	public function test_decode_refuses_other_attributes_and_values(): void {
		$loop = '\SGS\Blocks\Motion\Sgs_Motion_Loop_Inherit';
		$this->assertSame( array(), $loop::decode_attrs( '{"onclick":"x"}' ) );
		$this->assertSame( array(), $loop::decode_attrs( '{"data-sgs-mh-move":"<script>"}' ) );
		$this->assertSame( array(), $loop::decode_attrs( '{"data-sgs-mh":"self","data-sgs-me-keyframes":"[]"}' ), 'keyframes without an entrance carry nothing' );
		$this->assertSame( array( 'data-sgs-mh' => 'self', 'data-sgs-mh-move' => '' ), $loop::decode_attrs( '{"data-sgs-mh":"self","data-sgs-mh-move":""}' ) );
	}

	public function test_stylesheets_drop_the_built_in_lift_under_the_marker(): void {
		$post = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/post-grid/style.css' );
		$this->assertStringContainsString( 'transform: var( --sgs-card-lift-hover, translateY( -4px ) )', $post );
		$this->assertMatchesRegularExpression( '/\.sgs-post-grid__card\[data-sgs-mh-move\]\s*\{\s*--sgs-card-lift-hover:\s*;/', $post );
		$this->assertStringNotContainsString( 'transform: translateY( -4px ) scale', $post, 'no hard-coded lift remains' );
		$info = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/info-box/style.css' );
		$this->assertStringContainsString( '.sgs-info-box.sgs-has-hover-scale:not([data-sgs-mh-scale]):hover', $info );
	}

	public function test_info_box_root_marker_for_its_own_scale(): void {
		$html = '<div class="wp-block-sgs-info-box sgs-info-box"><div class="sgs-info-box__content">c</div></div>';
		$out  = $this->render_block( 'sgs/info-box', $html, 'root', array( 'source' => 'self', 'values' => array( 'scale' => 1.05 ) ) );
		$this->assertSame( 1, preg_match( '/<div[^>]*sgs-info-box[^>]*data-sgs-mh-scale|<div[^>]*data-sgs-mh-scale[^>]*sgs-info-box/', $out ), $out );
	}
}
