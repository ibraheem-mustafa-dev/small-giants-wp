<?php
/**
 * Tests: the photo map a variable product's card prints beside its seeded context
 * (`includes/product-card-media.php::sgs_pcm_card_images` and `::sgs_pcm_images_script`).
 *
 * The map is keyed by the thumbnail address the seeded options carry, stores each photo once however many options
 * share it, keeps only the photos a swap can write, and leaves out a photo the manifest holds no file for.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ProductCardPhotoMapTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class ProductCardPhotoMapTest extends TestCase {

	private const IMAGES = array(
		10 => array( 'src' => 'https://t.test/a.jpg', 'srcset' => 'https://t.test/a-300.avif 300w, https://t.test/a.jpg 2048w', 'w' => 2048, 'h' => 1024 ),
		11 => array( 'src' => 'https://t.test/b.jpg', 'srcset' => 'https://t.test/b-300.avif 300w', 'w' => 1000, 'h' => 1000 ),
		12 => array( 'src' => 'https://t.test/c.jpg', 'srcset' => '', 'w' => 500, 'h' => 500 ),
	);

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'wp_json_encode' ) ) {
			eval( 'function wp_json_encode( $data, $flags = 0 ) { return json_encode( $data, $flags ); }' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-media.php';
	}

	public function test_each_photo_is_stored_once_keyed_by_its_thumbnail_address(): void {
		$combos = array(
			'k1' => array( 'imageUrl' => 'https://t.test/a-300x300.avif', 'imageId' => 10, 'gallery' => array() ),
			'k2' => array( 'imageUrl' => 'https://t.test/a-300x300.avif', 'imageId' => 10, 'gallery' => array() ),
			'k3' => array( 'imageUrl' => 'https://t.test/b-300x300.avif', 'imageId' => 11, 'gallery' => array() ),
		);
		$map = sgs_pcm_card_images( $combos, array(), self::IMAGES );
		$this->assertSame( array( 'https://t.test/a-300x300.avif', 'https://t.test/b-300x300.avif' ), array_keys( $map ) );
		$this->assertSame( array( 'src' => 'https://t.test/a.jpg', 'srcset' => self::IMAGES[10]['srcset'] ), $map['https://t.test/a-300x300.avif'] );
		$this->assertSame( array( 'src', 'srcset' ), array_keys( $map['https://t.test/b-300x300.avif'] ), 'only src and srcset travel' );
	}

	public function test_a_gallery_is_kept_only_when_it_has_two_photos(): void {
		$combos = array(
			'solo' => array(
				'imageUrl' => 'https://t.test/a-300x300.avif',
				'imageId'  => 10,
				'gallery'  => array( array( 'id' => 11, 'url' => 'https://t.test/b-300x300.avif' ) ),
			),
			'pair' => array(
				'imageUrl' => 'https://t.test/a-300x300.avif',
				'imageId'  => 10,
				'gallery'  => array(
					array( 'id' => 10, 'url' => 'https://t.test/a-300x300.avif' ),
					array( 'id' => 12, 'url' => 'https://t.test/c-300x300.avif' ),
				),
			),
		);
		$map = sgs_pcm_card_images( $combos, array(), self::IMAGES );
		$this->assertArrayHasKey( 'https://t.test/c-300x300.avif', $map );
		$this->assertArrayNotHasKey( 'https://t.test/b-300x300.avif', $map, 'a one-photo gallery is not seeded, so its photo is not a swap target' );
	}

	public function test_the_default_gallery_is_kept(): void {
		$map = sgs_pcm_card_images( array(), array( array( 'id' => 11, 'url' => 'https://t.test/b-300x300.avif' ) ), self::IMAGES );
		$this->assertSame( array( 'https://t.test/b-300x300.avif' ), array_keys( $map ) );
	}

	public function test_an_entry_with_no_id_no_address_or_no_file_in_the_manifest_is_left_out(): void {
		$combos = array(
			'external' => array( 'imageUrl' => 'https://cdn.test/x.jpg', 'imageId' => 0, 'gallery' => array() ),
			'noimage'  => array( 'imageUrl' => '', 'imageId' => 0, 'gallery' => array() ),
			'unknown'  => array( 'imageUrl' => 'https://t.test/z-300x300.avif', 'imageId' => 99, 'gallery' => array() ),
		);
		$this->assertSame( array(), sgs_pcm_card_images( $combos, array(), self::IMAGES ) );
		$this->assertSame( '', sgs_pcm_images_script( array() ), 'a card with no mapped photo prints no script' );
	}

	public function test_the_script_is_inert_json_that_cannot_break_out(): void {
		$html = sgs_pcm_images_script( array( 'https://t.test/a-300x300.avif' => array( 'src' => 'https://t.test/a.jpg?x=</script><b>', 'srcset' => '' ) ) );
		$this->assertStringStartsWith( '<script type="application/json" class="sgs-photo-images">', $html );
		$this->assertSame( 1, substr_count( $html, '</script>' ), 'the only closing tag is the script itself' );
		$this->assertStringNotContainsString( '<b>', $html );
	}
}
