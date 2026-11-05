<?php
/**
 * Tests: sgs_instance_scope_hash() hashes only the attributes that differ from their block.json default, so adding a
 * setting to a block never renames the scope class of a block that did not set it.
 *
 * Run with: vendor/bin/phpunit --filter InstanceScopeHashTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class InstanceScopeHashTest extends TestCase {

	public static function setUpBeforeClass(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'wp_json_encode' ) ) {
			function wp_json_encode( $data ) {
				return json_encode( $data );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-instance-scope-hash.php';
	}

	private static function block( array $defaults ): object {
		return (object) array( 'block_type' => (object) array( 'attributes' => $defaults ) );
	}

	public function test_a_value_left_at_its_default_does_not_change_the_hash(): void {
		$old = sgs_instance_scope_hash( array( 'a' => 'x' ), self::block( array( 'a' => array( 'type' => 'string' ) ) ) );
		$new = sgs_instance_scope_hash(
			array( 'a' => 'x', 'pickHidePreview' => false, 'pickTileColumns' => array() ),
			self::block( array( 'a' => array( 'type' => 'string' ), 'pickHidePreview' => array( 'default' => false ), 'pickTileColumns' => array( 'default' => array() ) ) )
		);
		$this->assertSame( $old, $new );
	}

	public function test_a_value_that_differs_from_its_default_changes_the_hash(): void {
		$block = self::block( array( 'pickHidePreview' => array( 'default' => false ) ) );
		$this->assertNotSame(
			sgs_instance_scope_hash( array( 'pickHidePreview' => false ), $block ),
			sgs_instance_scope_hash( array( 'pickHidePreview' => true ), $block )
		);
	}

	public function test_the_extra_text_is_part_of_the_hash(): void {
		$this->assertNotSame( sgs_instance_scope_hash( array(), null, 'a' ), sgs_instance_scope_hash( array(), null, 'b' ) );
	}
}
