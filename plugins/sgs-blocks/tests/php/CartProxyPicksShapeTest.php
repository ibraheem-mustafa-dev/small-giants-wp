<?php
/**
 * Tests: the cart proxy's `picks` REST arg shape check (at most 8 groups, 12 picks each, slug [a-z0-9_-]{1,64}, count 0..999).
 *
 * Run with: vendor/bin/phpunit --filter CartProxyPicksShapeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Cart_Proxy;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class CartProxyPicksShapeTest extends TestCase {

	public static function setUpBeforeClass(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-cart-proxy.php';
	}

	private static function entry( string $slug = 'mango', $count = 0 ): array {
		return array( 'slug' => $slug, 'count' => $count );
	}

	public function test_a_well_formed_set_and_an_empty_one_pass(): void {
		$this->assertTrue( Cart_Proxy::validate_picks_shape( array() ) );
		$this->assertTrue( Cart_Proxy::validate_picks_shape( array( 'flavour' => array( self::entry(), self::entry( 'mint', 7 ) ) ) ) );
	}

	public function test_malformed_sets_are_refused(): void {
		$bad = array(
			'not an object'      => 'mango',
			'a list of groups'   => array( array( self::entry() ) ),
			'bad slug'           => array( 'flavour' => array( self::entry( 'Mango!' ) ) ),
			'script in slug'     => array( 'flavour' => array( self::entry( '<script>' ) ) ),
			'slug too long'      => array( 'flavour' => array( self::entry( str_repeat( 'a', 65 ) ) ) ),
			'count too big'      => array( 'flavour' => array( self::entry( 'mango', 1000 ) ) ),
			'negative count'     => array( 'flavour' => array( self::entry( 'mango', -1 ) ) ),
			'string count'       => array( 'flavour' => array( self::entry( 'mango', '3' ) ) ),
			'bad group key'      => array( 'Flavour Name' => array( self::entry() ) ),
			'a group not a list' => array( 'flavour' => 'mango' ),
		);
		foreach ( $bad as $name => $value ) {
			$this->assertFalse( Cart_Proxy::validate_picks_shape( $value ), $name );
		}
	}

	public function test_the_size_limits_hold(): void {
		$groups = array();
		for ( $i = 0; $i < 9; $i++ ) {
			$groups[ 'g' . $i ] = array( self::entry() );
		}
		$this->assertFalse( Cart_Proxy::validate_picks_shape( $groups ), 'nine groups' );
		$this->assertFalse( Cart_Proxy::validate_picks_shape( array( 'flavour' => array_fill( 0, 13, self::entry() ) ) ), 'thirteen picks' );
		$this->assertTrue( Cart_Proxy::validate_picks_shape( array( 'flavour' => array_fill( 0, 12, self::entry() ) ) ), 'twelve picks' );
	}
}
