<?php
/**
 * sgs/container `flexWrap`: a plain string (unchanged) or a per-device tier object.
 *
 * Run with: vendor/bin/phpunit --filter ContainerFlexWrapTierTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerFlexWrapTierTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_block_json_accepts_a_tier_object_for_flex_wrap(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/container/block.json' ), true );
		$type = (array) $json['attributes']['flexWrap']['type'];
		$this->assertContains( 'object', $type );
		$this->assertContains( 'string', $type );
		$this->assertSame( 'wrap', $json['attributes']['flexWrap']['default'] );
	}

	public function test_string_flex_wrap_is_unchanged(): void {
		$out = $this->render_block( 'sgs/container', array( 'layout' => 'flex', 'flexWrap' => 'nowrap' ) );
		$all = $out['html'] . $out['css'];
		$this->assertStringContainsString( 'flex-wrap:nowrap', $all );
		$this->assertStringNotContainsString( 'flex-wrap:wrap', $all );
	}

	public function test_tier_object_prints_wrap_on_desktop_and_nowrap_on_mobile(): void {
		$out = $this->render_block(
			'sgs/container',
			array( 'layout' => 'flex', 'flexWrap' => array( 'desktop' => 'wrap', 'mobile' => 'nowrap' ) )
		);
		$all = $out['html'] . $out['css'];
		$this->assertStringContainsString( 'flex-wrap:wrap', $all );
		$this->assertMatchesRegularExpression( '/@media \(max-width:767px\)\{[^}]*\{[^}]*flex-wrap:nowrap/', $all );
	}
}
