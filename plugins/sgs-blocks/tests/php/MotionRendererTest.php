<?php
/**
 * Tests: the motion renderer's hover-state emission, part targeting, tokens and item sources (Spec 38A §6.5, §9, §10; FR-38A-16, FR-38A-18, FR-38A-49, FR-38A-7 group source).
 *
 * Renders fixture blocks through the shipped renderer (`includes/motion/class-sgs-motion-renderer.php`) with the
 * WordPress stand-ins in `stubs/motion-render-stubs.php` (block types come from the real block.json files) and reads
 * the collected CSS and the returned markup.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRendererTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

require_once __DIR__ . '/MotionRendererTestTrait.php';

// The stand-ins define global WordPress functions and load the CSS collector, which would change other test files'
// behaviour in the shared suite process, so every test here runs in its own process and loads them in setUp().
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRendererTest extends TestCase {

	use MotionRendererTestTrait;

	public function test_happy_media_part_hover_state_emits_one_scoped_rule_per_device(): void {
		$out   = $this->render(
			self::media_hover(
				array( 'scale' => 1.04, 'translateY' => -6, 'duration' => 250 ),
				array( 'tablet' => array( 'scale' => 1.02 ), 'mobile' => array( 'translateY' => -3 ) )
			)
		);
		$scope = $this->scope( $out );
		$css   = $this->css();
		$sel   = '.' . $scope . ' .sgs-hero__media';

		$this->assertSame( 1, substr_count( $css, $sel . '{--sgs-mh-to-s:1.04;--sgs-mh-to-ty:-6px;transition:' ), $css );
		$this->assertSame( 1, substr_count( $css, '@media (max-width:1023px){' . $sel . '{--sgs-mh-to-s:1.02;}}' ), $css );
		$this->assertSame( 1, substr_count( $css, '@media (max-width:767px){' . $sel . '{--sgs-mh-to-ty:-3px;}}' ), $css );
		$this->assertSame( 1, substr_count( $css, 'transition:' ) );
		$this->assertStringContainsString( 'transition:--sgs-mh-s 250ms var(--wp--custom--easing--ease-out) 0ms, --sgs-mh-ty 250ms', $css );
		$this->assertStringContainsString( 'box-shadow 250ms', $css );
		$this->assertStringNotContainsString( 'transition:all', str_replace( ' ', '', $css ) );
		$this->assertStringNotContainsString( '--sgs-mh-rot', $css, 'only the owners present are listed' );
		$this->assertStringNotContainsString( ' style=', $out );
		$this->assertStringNotContainsString( '<style', $out, 'the front end sends the CSS through the collector' );
		$this->assertStringContainsString( '<div data-sgs-mc="translate scale" data-sgs-mh="self" class="sgs-hero__media">', $out );
		$this->assertStringNotContainsString( 'data-sgs-mroot', $out );
	}

	public function test_indent_hover_writes_its_to_value_owner_transition_and_channel(): void {
		$out = $this->render( self::media_hover( array( 'indent' => 8 ), array() ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-indent:8px;', $css );
		$this->assertStringContainsString( 'transition:--sgs-mh-indent ', $css, 'the indent owner transitions, not padding-inline-start itself' );
		$this->assertStringContainsString( 'data-sgs-mc="padding-inline-start"', $out, 'the shared stylesheet composes padding-inline-start only where the channel is named' );
	}

	public function test_edge_tablet_only_override_writes_only_the_1023px_block(): void {
		$this->render( self::media_hover( array( 'scale' => 1.04 ), array( 'tablet' => array( 'scale' => 1.1 ) ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '@media (max-width:1023px)', $css );
		$this->assertStringNotContainsString( '@media (max-width:767px)', $css, 'a blank Mobile tier inherits; no block' );
	}

	public function test_edge_blank_devices_write_no_media_block(): void {
		$this->render( self::media_hover( array( 'scale' => 1.04 ) ) );
		$this->assertStringNotContainsString( '@media', $this->css() );
	}

	public function test_edge_custom_target_selector_is_prefixed_by_the_scoped_root(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array(
				'custom:1' => array(
					'selector' => 'p.lede',
					'review'   => array( 'draftNode' => 'hero lede', 'reason' => 'no declared part for the lede' ),
					'hover'    => array( 'state' => array( 'values' => array( 'translateX' => 4 ) ) ),
				),
			),
		);
		$out    = $this->render( $motion );
		$scope  = $this->scope( $out );
		$this->assertStringContainsString( '.' . $scope . ' p.lede{--sgs-mh-to-tx:4px;', $this->css() );
		$this->assertStringContainsString( '<p data-sgs-mc="translate" data-sgs-mh="self" class="lede">', $out );
	}

	public function test_happy_declared_part_selector_finds_the_real_element(): void {
		$html   = '<div class="wp-block-sgs-testimonial"><blockquote class="sgs-testimonial__quote">Great</blockquote><cite class="sgs-testimonial__name">Ann</cite></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'quote-text' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/testimonial', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertStringContainsString( '.' . $scope . ' .sgs-testimonial__quote{--sgs-mh-to-ty:-4px;', $this->css(), 'the part resolves to its declared selector' );
		$this->assertStringNotContainsString( 'sgs-testimonial__quote-text', $this->css(), 'not the part key as a class' );
		$this->assertStringContainsString( '<blockquote data-sgs-mc="translate" data-sgs-mh="self" class="sgs-testimonial__quote">', $out, 'data-sgs-mh lands on the real element' );
		$this->assertStringNotContainsString( '<cite data-sgs-mh', $out, 'the sibling is untouched' );
	}

	public function test_edge_band_part_reaches_only_its_own_band_not_a_nested_containers(): void {
		$band   = 'sgs-container__inner sgs-container__content-band';
		$html   = '<div class="wp-block-sgs-container"><div class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>Hi</p></div></div><br><img src="a.jpg" alt=""></div></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'content-band' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertSame( 1, substr_count( $out, 'data-sgs-mh=' ), 'exactly one element is stamped' );
		$this->assertStringContainsString( '.' . $scope . ' > .sgs-container__content-band{--sgs-mh-to-ty:-4px;', $this->css(), 'the band rule uses the child combinator' );
		$this->assertStringNotContainsString( '.' . $scope . ' .sgs-container__content-band{', $this->css(), 'no descendant-form rule' );
		$this->assertStringContainsString( '"><div data-sgs-mc="translate" data-sgs-mh="self" class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>', $out, 'the outer band is stamped and the nested band is not' );
	}

	public function test_edge_container_inner_part_is_its_own_band_only(): void {
		$band   = 'sgs-container__inner sgs-container__content-band';
		$html   = '<div class="wp-block-sgs-container"><div class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>Hi</p></div></div></div></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'inner' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertSame( 1, substr_count( $out, 'data-sgs-mh=' ), 'exactly one element is stamped' );
		$this->assertStringContainsString( '.' . $scope . ' > .sgs-container__inner{', $this->css() );
	}

	public function test_refusal_part_marked_motion_false_is_not_a_target(): void {
		// sgs/hero's `headline` is a child sgs/heading (block.json "motion": false), even when that child carries the BEM class.
		$html   = '<section class="wp-block-sgs-hero"><div class="sgs-hero__content"><h1 class="sgs-hero__headline">Hi</h1></div></section>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'headline' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$this->assertStringNotContainsString( 'sgs-hero__headline{', $this->css(), 'no rule for an excluded part' );
		$this->assertStringNotContainsString( 'data-sgs-mh', $out, 'no element is stamped' );
	}


	public function test_tokens_resolve_to_theme_custom_properties(): void {
		$this->render(
			self::media_hover( array( 'translateY' => 'token:distance.sm', 'duration' => 'token:duration.fast', 'easing' => 'token:easing.spring' ) )
		);
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-ty:var(--wp--custom--distance--sm);', $css );
		$this->assertStringContainsString( '--sgs-mh-ty var(--wp--custom--duration--fast) var(--wp--custom--easing--spring) 0ms', $css );
		$this->assertStringNotContainsString( 'token:', $css );
	}

	public function test_rest_rotate_is_direct_and_hover_rotate_is_stored_minus_rest(): void {
		$this->render( self::media_hover( array( 'rotate' => 8, 'restRotate' => 2 ), array( 'mobile' => array( 'restRotate' => 5 ) ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-rot-rest:2deg;--sgs-mh-to-rot:6deg;', $css );
		$this->assertStringContainsString( '{--sgs-rot-rest:5deg;--sgs-mh-to-rot:3deg;}}', $css );
	}

	public function test_root_source_marks_the_root(): void {
		$out = $this->render( self::media_hover( array( 'scale' => 1.04 ), array(), 'root' ) );
		$this->assertMatchesRegularExpression( '/^<div[^>]*\bdata-sgs-mroot\b[^>]*class="wp-block-sgs-hero sgs-m-/', $out );
		$this->assertStringContainsString( 'data-sgs-mh="root"', $out );
	}

	private function render_grid( string $source ): string {
		$html = '<div class="wp-block-sgs-card-grid"><div class="sgs-card-grid__item" id="a"><h3 class="sgs-card-grid__title">A</h3></div>'
			. '<article class="sgs-product-card" id="b"><h3 class="sgs-product-card__title">B</h3></article>'
			. '<h3 class="sgs-card-grid__title" id="outside">C</h3></div>';
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/card-grid',
				'attrs'     => array(
					'sgsMotion' => array(
						'v'        => 1,
						'elements' => array( 'title' => array( 'hover' => array( 'state' => array( 'source' => $source, 'values' => array( 'scale' => 1.05 ) ) ) ) ),
					),
				),
			),
			$html
		);
	}

	public function test_item_source_marks_each_item_and_the_part_reads_its_flag(): void {
		$out = $this->render_grid( 'item' );
		$this->assertMatchesRegularExpression( '/<div data-sgs-mitem="" class="sgs-card-grid__item"/', $out, 'a declared item part is marked' );
		$this->assertMatchesRegularExpression( '/<article data-sgs-mitem="" class="sgs-product-card"/', $out, 'a delegated child block root named by animationItems is marked' );
		$this->assertSame( 2, substr_count( $out, 'data-sgs-mitem' ), 'only the items are marked, not the block root or a part' );
		$this->assertStringNotContainsString( 'data-sgs-mroot', $out );
		$this->assertSame( 2, substr_count( $out, 'data-sgs-mh="item"' ), 'each block title is a target of the item source' );
		$this->assertStringContainsString( 'sgs-card-grid__title', $this->css() );
	}

	public function test_other_sources_mark_no_item(): void {
		foreach ( array( 'self', 'root', 'group' ) as $source ) {
			$this->assertStringNotContainsString( 'data-sgs-mitem', $this->render_grid( $source ), $source );
			Sgs_Motion_Renderer::reset();
		}
	}

	public function test_item_source_on_a_block_without_items_marks_nothing(): void {
		$out = $this->render( self::media_hover( array( 'scale' => 1.04 ), array(), 'item' ) );
		$this->assertStringNotContainsString( 'data-sgs-mitem', $out );
		$this->assertStringContainsString( 'data-sgs-mh="item"', $out );
	}

	public function test_hover_group_marking_and_group_hover_colours(): void {
		$group = $this->render( array(), self::CARD, array( 'sgsBlockLink' => 'https://example.test/' ) );
		$this->assertStringContainsString( 'data-sgs-hover-group', $group, 'a whole-block link makes the block a hover group' );

		$rules = '';
		$out   = sgs_test_render_motion_block(
			array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => self::media_hover( array( 'scale' => 1.04 ), array(), 'group' ) ) ),
			self::CARD,
			null,
			static function () use ( &$rules ) {
				$rules = sgs_hover_state_rules( '.x', 'color:red', ':focus-visible' );
			}
		);
		$this->assertStringContainsString( 'data-sgs-mh="group"', $out );
		$this->assertStringContainsString( '[data-sgs-hover-group]:hover .x', $rules );
		$this->assertStringContainsString( '[data-sgs-hover-group]:focus-within .x', $rules );
		$this->assertStringNotContainsString( 'data-sgs-hover-group', sgs_hover_state_rules( '.x', 'color:red' ), 'only while the group block renders' );
	}
}
