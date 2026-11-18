<?php
/**
 * Product_Manifest gives the main photo what it needs to be sharp, and the share consumers a format-safe large file.
 *
 * A gallery entry is the thumbnail-strip picture (the small copy) plus the attachment id. `image_data()` is the pair
 * WordPress prints for the full size (`src` and the `srcset` of every copy), stored once per attachment in the
 * manifest's `images` map. `share_url()` is the address structured data, Open Graph and the product feed print: the
 * original when it is a JPEG, PNG, GIF or WebP, since a new upload's resized copies are AVIF and some consumers do not
 * read AVIF. The private helpers run in a child process with stubbed WordPress image functions.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ProductManifestImagesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ProductManifestImagesTest extends TestCase {

	/**
	 * Call one private Product_Manifest helper for an attachment in a child process.
	 *
	 * @param string $method     gallery_item, image_data or share_url.
	 * @param int    $id         Attachment id.
	 * @param array  $attachment Stub data: mime, original, sizes (name => [url, w, h]), srcset.
	 * @return mixed Decoded result.
	 */
	private function call( string $method, int $id, array $attachment ) {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsmi' );
		$data   = tempnam( sys_get_temp_dir(), 'sgsmd' );
		file_put_contents( $data, json_encode( $attachment, JSON_THROW_ON_ERROR ) );
		$stubs = <<<'PHP'
$GLOBALS['att'] = json_decode( file_get_contents( $argv[1] ), true );
function esc_url_raw( $u ) { return $u; }
function wp_get_attachment_url( $id ) { return $GLOBALS['att']['original']; }
function get_post_mime_type( $id ) { return $GLOBALS['att']['mime']; }
function get_post_meta( $id, $k, $single = false ) { return 'Alt text'; }
function wp_get_attachment_image_srcset( $id, $size ) { return $GLOBALS['att']['srcset']; }
function wp_get_attachment_image_src( $id, $size ) {
	$sizes = $GLOBALS['att']['sizes'];
	if ( 'full' === $size ) { return array( $GLOBALS['att']['original'], 2048, 1784, false ); }
	return isset( $sizes[ $size ] ) ? array( $sizes[ $size ][0], $sizes[ $size ][1], $sizes[ $size ][2], true ) : false;
}
PHP;
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "/" ); require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';' . $stubs
			. ' require ' . var_export( $root . '/includes/class-product-manifest.php', true ) . ';'
			. ' $m = new ReflectionMethod( \SGS\Blocks\Product_Manifest::class, ' . var_export( $method, true ) . ' ); $m->setAccessible( true );'
			. ' echo "@@" . json_encode( $m->invoke( null, ' . $id . ' ) );'
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' ' . escapeshellarg( $data ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $data ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$pos = strpos( $out, '@@' );
		$this->assertNotFalse( $pos, 'child process failed: ' . $out );
		return json_decode( substr( $out, $pos + 2 ), true );
	}

	private function attachment( string $mime, string $original ): array {
		return array(
			'mime'     => $mime,
			'original' => $original,
			'srcset'   => 'https://x.test/u/a-300x300.avif 300w, https://x.test/u/a-1024x892.avif 1024w, ' . $original . ' 2048w',
			'sizes'    => array(
				'woocommerce_thumbnail' => array( 'https://x.test/u/a-300x300.avif', 300, 300 ),
				'large'                 => array( 'https://x.test/u/a-1024x892.avif', 1024, 892 ),
			),
		);
	}

	public function test_a_gallery_entry_keeps_the_small_copy_and_gains_the_attachment_id(): void {
		$item = $this->call( 'gallery_item', 5985, $this->attachment( 'image/jpeg', 'https://x.test/u/a.jpg' ) );
		$this->assertSame( 5985, $item['id'] );
		$this->assertSame( 'https://x.test/u/a-300x300.avif', $item['url'] );
		$this->assertSame( 300, $item['w'] );
		$this->assertSame( 'Alt text', $item['alt'] );
	}

	public function test_the_images_map_entry_is_the_full_size_src_with_every_copy_in_the_srcset(): void {
		$data = $this->call( 'image_data', 5985, $this->attachment( 'image/jpeg', 'https://x.test/u/a.jpg' ) );
		$this->assertSame( 'https://x.test/u/a.jpg', $data['src'] );
		$this->assertStringContainsString( 'a-300x300.avif 300w', $data['srcset'] );
		$this->assertStringContainsString( 'a-1024x892.avif 1024w', $data['srcset'] );
		$this->assertSame( 2048, $data['w'] );
	}

	public function test_a_jpeg_original_is_the_address_structured_data_prints(): void {
		$this->assertSame(
			'https://x.test/u/a.jpg',
			$this->call( 'share_url', 5985, $this->attachment( 'image/jpeg', 'https://x.test/u/a.jpg' ) )
		);
	}

	public function test_an_avif_original_falls_back_to_a_copy_in_a_safe_format_else_the_original(): void {
		$avif = $this->attachment( 'image/avif', 'https://x.test/u/a.avif' );
		$avif['sizes']['large'] = array( 'https://x.test/u/a-1024x892.jpg', 1024, 892 );
		// 'full' resolves to the original (.avif), so the first safe copy is the 'large' one.
		$this->assertSame( 'https://x.test/u/a-1024x892.jpg', $this->call( 'share_url', 1, $avif ) );
		$this->assertSame(
			'https://x.test/u/a.avif',
			$this->call( 'share_url', 1, $this->attachment( 'image/avif', 'https://x.test/u/a.avif' ) )
		);
	}

	public function test_the_cache_key_changes_so_old_manifests_rebuild(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-product-manifest.php' );
		$this->assertStringContainsString( "'sgs_manifest_v10_'", $src );
		$this->assertStringNotContainsString( "'sgs_manifest_v9_'", $src );
	}

	public function test_the_lean_seed_drops_the_server_only_large_address(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/configurator-seed.php';
		$seed = sgs_lean_seed_combos(
			array(
				'k' => array(
					'imageUrl'  => 'thumb',
					'imageId'   => 7,
					'imageFull' => 'https://x.test/u/a.jpg',
					'gallery'   => array(),
				),
			)
		);
		$this->assertArrayNotHasKey( 'imageFull', $seed['k'] );
		$this->assertSame( 7, $seed['k']['imageId'] );
	}

	public function test_a_product_card_seed_drops_the_attachment_ids_it_cannot_use(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/configurator-seed.php';
		$combos = array(
			'k' => array(
				'imageUrl'  => 'thumb',
				'imageId'   => 7,
				'imageFull' => 'https://x.test/u/a.jpg',
				'gallery'   => array(
					array( 'id' => 7, 'url' => 'a', 'w' => 300, 'h' => 300, 'alt' => '' ),
					array( 'id' => 8, 'url' => 'b', 'w' => 300, 'h' => 300, 'alt' => '' ),
				),
			),
		);
		$card = sgs_lean_seed_combos( $combos, false );
		$this->assertArrayNotHasKey( 'imageId', $card['k'] );
		$this->assertArrayNotHasKey( 'id', $card['k']['gallery'][0] );
		$this->assertSame( 'b', $card['k']['gallery'][1]['url'] );
		$buybox = sgs_lean_seed_combos( $combos );
		$this->assertSame( 8, $buybox['k']['gallery'][1]['id'] );
	}
}
