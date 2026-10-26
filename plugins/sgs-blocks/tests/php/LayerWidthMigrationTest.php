<?php
/**
 * The stored-width sweep for sgs/decorative-image (scripts/migrate-layer-width/transform.php): numbers become lengths
 * in their stored unit, Fit the content becomes max-content, an explicit cap moves to maxWidth, the implicit 20% is
 * not carried over, and widthUnit and maxWidthPercent are removed; a layer already in the length shape is untouched.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter LayerWidthMigrationTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/scripts/migrate-layer-width/transform.php';

final class LayerWidthMigrationTest extends TestCase {

	/**
	 * @return array<string, array{0: array<string, mixed>, 1: array<string, mixed>}>
	 */
	public static function cases(): array {
		return array(
			'px numbers per device'          => array(
				array( 'width' => array( 'desktop' => 340, 'tablet' => 240, 'mobile' => 40 ), 'className' => 'ring' ),
				array( 'width' => array( 'desktop' => '340px', 'tablet' => '240px', 'mobile' => '40px' ), 'className' => 'ring' ),
			),
			'percentage unit'                => array(
				array( 'widthUnit' => '%', 'width' => array( 'desktop' => 60, 'tablet' => 40 ) ),
				array( 'width' => array( 'desktop' => '60%', 'tablet' => '40%' ) ),
			),
			'percentage with no width'       => array(
				array( 'widthUnit' => '%' ),
				array( 'width' => array( 'desktop' => '200%' ) ),
			),
			'fit the content'                => array(
				array( 'widthUnit' => 'auto', 'width' => array( 'desktop' => 300, 'tablet' => 180 ) ),
				array( 'width' => array( 'desktop' => 'max-content' ) ),
			),
			'explicit cap on a fixed width'  => array(
				array( 'width' => array( 'desktop' => 240 ), 'maxWidthPercent' => 30 ),
				array( 'width' => array( 'desktop' => '240px' ), 'maxWidth' => array( 'desktop' => '30%' ) ),
			),
			'cap on a percentage width'      => array(
				array( 'widthUnit' => '%', 'width' => array( 'desktop' => 60 ), 'maxWidthPercent' => 30 ),
				array( 'width' => array( 'desktop' => '60%' ) ),
			),
			'a set maxWidth is kept'         => array(
				array( 'width' => array( 'desktop' => 240 ), 'maxWidthPercent' => 30, 'maxWidth' => array( 'desktop' => '12rem' ) ),
				array( 'width' => array( 'desktop' => '240px' ), 'maxWidth' => array( 'desktop' => '12rem' ) ),
			),
			'a numeric string and a decimal' => array(
				array( 'width' => array( 'desktop' => '200', 'mobile' => 12.5 ) ),
				array( 'width' => array( 'desktop' => '200px', 'mobile' => '12.5px' ) ),
			),
			'an out-of-range cap is clamped' => array(
				array( 'maxWidthPercent' => 250 ),
				array( 'maxWidth' => array( 'desktop' => '100%' ) ),
			),
		);
	}

	/**
	 * @dataProvider cases
	 *
	 * @param array<string, mixed> $before Stored attributes.
	 * @param array<string, mixed> $after  The length shape.
	 */
	public function test_the_old_width_shape_moves_to_lengths( array $before, array $after ): void {
		$this->assertTrue( sgs_migrate_layer_width_needed( $before ) );
		$this->assertSame( $after, sgs_migrate_layer_width_attrs( $before ) );
		$this->assertFalse( sgs_migrate_layer_width_needed( $after ), 'the result needs nothing more' );
	}

	public function test_a_layer_in_the_length_shape_is_untouched(): void {
		$done = array( 'width' => array( 'desktop' => 'max-content', 'mobile' => '80%' ), 'maxWidth' => array( 'desktop' => 'none' ), 'opacity' => 90 );
		$this->assertFalse( sgs_migrate_layer_width_needed( $done ) );
		$this->assertSame( $done, sgs_migrate_layer_width_attrs( $done ) );
		$this->assertSame( array(), sgs_migrate_layer_width_attrs( array() ), 'a default layer stays empty' );
	}
}
