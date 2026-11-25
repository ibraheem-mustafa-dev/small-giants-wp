<?php
/**
 * Tests: the width a brand strip logo is told it draws at (`src/blocks/brand-strip/logo-media.php::sgs_brand_strip_item_cap`).
 *
 * The cap feeds the picture's `sizes`. A tile's logo box is square, so its Max height is the cap; a row's logo is only
 * height-capped, so Logo max width is the cap (the Max height as a width would shrink logos that have resized copies).
 *
 * Run with:
 *   vendor/bin/phpunit --filter BrandStripItemCapTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class BrandStripItemCapTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'absint' ) ) {
			eval( 'function absint( $n ) { return abs( (int) $n ); }' );
		}
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/brand-strip/logo-media.php' );
		// Only the cap helper: the rest of the file needs the media renderer.
		preg_match( "/if \( ! function_exists\( 'sgs_brand_strip_item_cap' \) \) \{.*?\n\}\r?\n/s", $source, $m );
		$this->assertNotEmpty( $m, 'the cap helper is in logo-media.php' );
		eval( $m[0] );
	}

	public function test_a_row_is_capped_at_its_logo_max_width_not_its_max_height(): void {
		$this->assertSame( 120, sgs_brand_strip_item_cap( array( 'logoLayout' => 'row', 'maxHeight' => 22, 'logoMaxWidth' => 120 ) ) );
	}

	public function test_a_row_with_no_logo_max_width_has_no_cap(): void {
		$this->assertSame( 0, sgs_brand_strip_item_cap( array( 'logoLayout' => 'row', 'maxHeight' => 22 ) ) );
	}

	public function test_a_tile_is_capped_at_its_max_height(): void {
		$this->assertSame( 22, sgs_brand_strip_item_cap( array( 'logoLayout' => 'tiles', 'maxHeight' => 22, 'logoMaxWidth' => 120 ) ) );
		$this->assertSame( 180, sgs_brand_strip_item_cap( array() ), 'the default Max height' );
	}
}
