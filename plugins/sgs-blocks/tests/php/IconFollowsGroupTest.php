<?php
/**
 * sgs/icon follows its card's hover: an icon whose own hover layer has `source: group` carries `sgs-icon--follows-group`,
 * and style.css paints its hover colour, ground, border and shadow while a wrapping [data-sgs-hover-group] is hovered
 * or holds focus-visible. An icon with no group layer carries neither the class nor a changed rule set.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter IconFollowsGroupTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconFollowsGroupTest extends TestCase {

	private const BASE = array(
		'iconSource'     => 'lucide',
		'iconName'       => 'mail',
		'shape'          => 'circle',
		'showBackground' => true,
	);

	private function icon( array $attributes ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsfg' );
		file_put_contents( $file, json_encode( array( 'attributes' => (object) $attributes, 'site_info' => (object) array(), 'load_motion' => true ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/icon-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . $out );
		return (string) $decoded['html'];
	}

	private static function motion( string $source ): array {
		return array(
			'sgsMotion' => array(
				'v'        => 1,
				'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'source' => $source, 'values' => array( 'scale' => 1.1 ) ) ) ) ),
			),
		);
	}

	public function test_a_group_hover_layer_prints_the_class(): void {
		$this->assertStringContainsString( 'sgs-icon--follows-group', $this->icon( self::BASE + self::motion( 'group' ) ) );
	}

	public function test_an_icon_with_no_group_layer_is_unchanged(): void {
		$plain = $this->icon( self::BASE );
		$this->assertStringNotContainsString( 'follows-group', $plain );
		$this->assertStringNotContainsString( 'follows-group', $this->icon( self::BASE + self::motion( 'self' ) ), 'a self-driven layer is not the opt-in' );
	}

	public function test_every_hover_arm_has_a_group_twin_scoped_to_the_class(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/icon/style.css' );
		$arms = preg_match_all( '/^(?:\.sgs-icon[^\n]*__link:hover[^\n]*)(?:__shape|__outline-path),$/m', $css );
		$this->assertGreaterThanOrEqual( 6, $arms );
		$this->assertSame( 7, substr_count( $css, '[data-sgs-hover-group]:hover .sgs-icon--follows-group' ), 'one group hover arm per paint rule' );
		$this->assertSame( 7, substr_count( $css, '[data-sgs-hover-group]:has(:focus-visible) .sgs-icon--follows-group' ) );
		$this->assertSame( 0, preg_match( '/\[data-sgs-hover-group\]:(?:hover|has\(:focus-visible\)) \.sgs-icon__/', $css ), 'no group arm without the class' );
	}
}
