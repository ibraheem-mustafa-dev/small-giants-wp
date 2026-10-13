<?php
/**
 * Tests: the renderer's drops (Spec 38A FR-38A-2 renderer clause, FR-38A-23 render-time refusal drop, FR-38A-49).
 *
 * Plants an unknown key, an out-of-range duration, an X rotation owner beside a transform-tweening Tier G effect, a
 * third injected layer, a Follow pointer child under a pin-scrub parent, two different perspectives and a parent
 * perspective, and asserts each is dropped or cleared while the valid rest survives (each case has a negative control
 * that keeps the layer or value when the plant is removed).
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRefusalsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Document;
use SGS\Blocks\Motion\Sgs_Motion_Layer_Drops;
use SGS\Blocks\Motion\Sgs_Motion_Layers;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions and load the CSS collector, which would change other test files'
// behaviour in the shared suite process, so every test here runs in its own process and loads them in setUp().
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRefusalsTest extends TestCase {

	private const CARD = '<div class="wp-block-sgs-info-box"><div class="sgs-info-box__media"></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private static function doc( array $root ): array {
		return array(
			'v'        => 1,
			'elements' => array( 'root' => $root ),
		);
	}

	private function render( array $motion ): string {
		return sgs_test_render_motion_block( array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsMotion' => $motion ) ), self::CARD );
	}

	public function test_an_unknown_key_is_dropped_and_the_rest_kept(): void {
		$doc = self::doc( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'wobble' => 3 ), 'planted' => true ) ) ) );
		$out = Sgs_Motion_Document::sanitise( $doc );
		$this->assertSame( array( 'values' => array( 'scale' => 1.04 ) ), $out['elements']['root']['hover']['state'] );
		$this->render( $doc );
		$css = implode( '', $GLOBALS['sgs_collected_css'] );
		$this->assertStringContainsString( '--sgs-mh-to-s:1.04;', $css );
		$this->assertStringNotContainsString( 'wobble', $css );
	}

	public function test_an_out_of_range_duration_is_dropped(): void {
		$doc = self::doc( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'duration' => 999999 ) ) ) ) );
		$this->assertArrayNotHasKey( 'duration', Sgs_Motion_Document::sanitise( $doc )['elements']['root']['hover']['state']['values'] );
		$this->render( $doc );
		$css = implode( '', $GLOBALS['sgs_collected_css'] );
		$this->assertStringNotContainsString( '999999', $css );
		$this->assertStringContainsString( 'var(--wp--custom--duration--fast)', $css, 'the default hover timing applies' );

		$control = self::doc( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'duration' => 400 ) ) ) ) );
		$this->assertSame( 400, Sgs_Motion_Document::sanitise( $control )['elements']['root']['hover']['state']['values']['duration'], 'negative control' );
	}

	public function test_a_layer_missing_its_required_values_is_dropped_whole(): void {
		$out = Sgs_Motion_Document::sanitise( self::doc( array( 'hover' => array( 'state' => array( 'source' => 'root', 'values' => 'nope' ) ) ) ) );
		$this->assertArrayNotHasKey( 'state', $out['elements']['root']['hover'] ?? array() );
	}

	public function test_an_x_owner_with_a_transform_scrub_drops_the_later_layer(): void {
		$state = array( 'values' => array( 'restRotateX' => 10 ) );
		$scrub = array( 'id' => 'e1', 'effect' => 'scrub', 'trigger' => 'scroll', 'values' => array( 'rows' => array( array( 'property' => 'y', 'from' => 40, 'to' => 0 ) ) ) );
		$root  = array( 'hover' => array( 'state' => $state ), 'effects' => array( $scrub ) );
		$res   = Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $root ) )['elements']['root'] );
		$this->assertSame( 'effects[0]', $res['dropped'][0]['path'], 'the scrub comes later in paint order' );
		$this->assertSame( "Hover state and Scrub both drive this element's transform. Move one of them to a different part.", $res['dropped'][0]['text'] );
		$this->assertArrayNotHasKey( 'effects', $res['element'] );
		$this->assertSame( 10, $res['element']['hover']['state']['values']['restRotateX'] );

		$out = $this->render( self::doc( $root ) );
		$this->assertStringContainsString( 'data-sgs-mc="transform"', $out, 'the X owner stays, the scrub (and its background-position channel) is gone' );
		$this->assertSame( 'sgs_motion_layer_dropped', $GLOBALS['sgs_test_actions'][0][0] ?? null );

		$opacity_only = $root;
		$opacity_only['effects'][0]['values']['rows'][0]['property'] = 'opacity';
		$this->assertSame( array(), Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $opacity_only ) )['elements']['root'] )['dropped'], 'negative control: an opacity row does not drive transform' );
	}

	public function test_a_third_injected_layer_is_dropped(): void {
		$root = array(
			'hover'   => array(
				'effects' => array(
					array( 'id' => 'h1', 'effect' => 'sheen', 'values' => array( 'opacity' => 0.4 ) ),
					array( 'id' => 'h2', 'effect' => 'glare', 'values' => array( 'glareOpacity' => 0.4 ) ),
				),
			),
			'effects' => array( array( 'id' => 'e1', 'effect' => 'cursor-field', 'trigger' => 'hover', 'values' => array( 'ring' => true ) ) ),
		);
		$el   = Sgs_Motion_Document::sanitise( self::doc( $root ) )['elements']['root'];
		$this->assertCount( 3, array_filter( Sgs_Motion_Layers::element_layers( $el ), static function ( $e ) { return array() !== Sgs_Motion_Layers::slot_claims( $e ); } ) );
		$res = Sgs_Motion_Layer_Drops::resolve( $el );
		$this->assertSame( 'effects[0]', $res['dropped'][0]['path'] );
		$this->assertSame( 'This element already has two motion layers (Sheen, Glare). Remove one to add Cursor field ring.', $res['dropped'][0]['text'] );
		$this->assertSame( array( 'sheen', 'glare' ), Sgs_Motion_Layer_Drops::injected_layers( $res['element'] ) );

		$out = $this->render( self::doc( $root ) );
		$this->assertSame( 2, substr_count( $out, 'class="sgs-motion-layer"' ) );
		$this->assertSame( 2, substr_count( $out, 'aria-hidden="true"' ) );

		unset( $root['effects'] );
		$this->assertSame( array(), Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $root ) )['elements']['root'] )['dropped'], 'negative control: two layers fit' );
	}

	public function test_a_follow_pointer_child_under_a_pin_scrub_parent_loses_its_x_and_y_owner(): void {
		$parent = array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array(
				'sgsMotion' => self::doc(
					array( 'effects' => array( array( 'id' => 'p1', 'effect' => 'pin-scrub', 'trigger' => 'scroll', 'values' => array( 'rows' => array( array( 'property' => 'y', 'from' => 60, 'to' => 0 ) ) ) ) ) )
				),
			),
		);
		$child  = self::doc(
			array(
				'hover' => array(
					'state'   => array( 'values' => array( 'scale' => 1.04, 'followPointer' => true, 'maxAngle' => 8 ) ),
					'effects' => array( array( 'id' => 'h1', 'effect' => 'glare', 'values' => array( 'glareOpacity' => 0.4 ) ) ),
				),
			)
		);
		$child_out = '';
		$renderer  = Sgs_Motion_Renderer::class;
		$parent    = $renderer::open_frame( $parent, $parent, null );
		$child_out = sgs_test_render_motion_block( array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsMotion' => $child ) ), self::CARD, new stdClass() );
		$renderer::close_frame( $renderer::render( self::CARD, $parent ), $parent );

		$this->assertStringContainsString( 'data-sgs-mc="scale injected"', $child_out, 'Follow pointer is cleared, the scale and the glare layer stay' );
		$this->assertStringContainsString( 'data-sgs-mh="self"', $child_out, 'the hover state stays' );
		$this->assertStringContainsString( "Follow pointer and Pin scrub both drive this element's transform.", json_encode( $GLOBALS['sgs_test_actions'] ) );

		Sgs_Motion_Renderer::reset();
		$alone = sgs_test_render_motion_block( array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsMotion' => $child ) ), self::CARD, new stdClass() );
		$this->assertStringContainsString( 'data-sgs-mc="scale transform injected"', $alone, 'negative control: no pin-scrub parent, Follow pointer kept' );
	}

	public function test_a_second_different_perspective_is_cleared_and_the_first_wins(): void {
		$root = array(
			'hover'    => array( 'state' => array( 'values' => array( 'restRotateX' => 10, 'perspective' => 800 ) ) ),
			'entrance' => array(
				'base' => array(
					'trigger' => 'load',
					'values'  => array(
						'from'        => array( 'rotateY' => 90 ),
						'to'          => array( 'rotateY' => 0 ),
						'perspective' => 1200,
					),
					'devices' => array( 'mobile' => array( 'perspective' => 600 ) ),
				),
			),
		);
		$res  = Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $root ) )['elements']['root'] );
		$this->assertSame( 'one-perspective', $res['dropped'][0]['id'] );
		$this->assertSame( 'entrance.base.values.perspective', $res['dropped'][0]['path'] );
		$this->assertSame( 'Hover state and Entrance set different perspectives on this element. Give them the same perspective, or clear one.', $res['dropped'][0]['text'] );
		$this->assertArrayNotHasKey( 'perspective', $res['element']['entrance']['base']['values'], 'the later perspective is cleared' );
		$this->assertArrayNotHasKey( 'perspective', $res['element']['entrance']['base']['devices']['mobile'] ?? array(), 'with its device overrides' );
		$this->assertSame( 90, $res['element']['entrance']['base']['values']['from']['rotateY'], 'the entrance itself stays' );

		$out = $this->render( self::doc( $root ) );
		$css = implode( '', $GLOBALS['sgs_collected_css'] );
		$this->assertStringContainsString( '--sgs-persp-self:800px;', $css );
		$this->assertStringNotContainsString( '1200px', $css );
		$this->assertStringContainsString( 'data-sgs-me="load transform"', $out );

		$same = $root;
		$same['entrance']['base']['values']['perspective'] = 800;
		unset( $same['entrance']['base']['devices'] );
		$this->assertSame( array(), Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $same ) )['elements']['root'] )['dropped'], 'negative control: the same perspective twice is one perspective' );
	}

	public function test_a_parent_perspective_is_cleared_and_the_element_uses_its_own(): void {
		$root = array( 'hover' => array( 'state' => array( 'values' => array( 'followPointer' => true, 'perspective' => 1100, 'perspectiveOn' => 'parent' ) ) ) );
		$res  = Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $root ) )['elements']['root'] );
		$this->assertSame( 'perspective-parent', $res['dropped'][0]['id'] );
		$this->assertSame( 'Perspective on the parent is not available here; the card uses its own perspective.', $res['dropped'][0]['text'] );
		$this->assertArrayNotHasKey( 'perspectiveOn', $res['element']['hover']['state']['values'] );
		$this->assertSame( 1100, $res['element']['hover']['state']['values']['perspective'] );

		$this->render( self::doc( $root ) );
		$this->assertStringContainsString( '--sgs-persp-self:1100px;', implode( '', $GLOBALS['sgs_collected_css'] ), 'the perspective sits on the element itself' );

		$self = $root;
		$self['hover']['state']['values']['perspectiveOn'] = 'self';
		$this->assertSame( array(), Sgs_Motion_Layer_Drops::resolve( Sgs_Motion_Document::sanitise( self::doc( $self ) )['elements']['root'] )['dropped'], 'negative control: self is allowed' );
	}
}
