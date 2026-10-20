<?php
/**
 * Product_Manifest::build() names each axis by the same key WooCommerce gives the variation's own attribute.
 *
 * `WC_Product_Variable::get_variation_attributes()` keys a product-local attribute by its raw name ("Pack"), while
 * every variation's `get_attributes()` (and so the manifest's combo keys and `defaultAxes`) keys it `sanitize_title()`d
 * ("pack"). The add-to-cart store reads `selectedAxes[axis.taxonomy]`, so an axis left as "Pack" found no selection,
 * sent no `variation` list and the cart proxy refused the add with "Variation attributes are required." A global
 * taxonomy ('pa_size') is already in that form and must not change.
 *
 * `axis_key()` runs in a child process with the QA harness's WordPress function stubs, so the stubs stay out of the
 * PHPUnit process.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ProductManifestAxisKeyTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ProductManifestAxisKeyTest extends TestCase {

	/**
	 * Call Product_Manifest::axis_key() on each name in a child process.
	 *
	 * @param string[] $names Attribute keys as get_variation_attributes() returns them.
	 * @return array<string,string> name => axis key.
	 */
	private function axis_keys( array $names ): array {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsak' );
		$names_file = tempnam( sys_get_temp_dir(), 'sgsan' );
		file_put_contents( $names_file, json_encode( $names, JSON_THROW_ON_ERROR ) );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "/" ); require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . '; require ' . var_export( $root . '/includes/class-product-manifest.php', true ) . ';'
			. ' $out = array(); foreach ( json_decode( file_get_contents( $argv[1] ), true ) as $n ) { $out[ $n ] = \SGS\Blocks\Product_Manifest::axis_key( $n ); } echo json_encode( $out );'
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' ' . escapeshellarg( $names_file ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $names_file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start   = strpos( $out, '{' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'child process did not return JSON: ' . $out );
		return $decoded;
	}

	public function test_a_product_local_attribute_takes_the_key_its_variations_use(): void {
		$keys = $this->axis_keys( array( 'Pack', 'Size (cm)' ) );
		$this->assertSame( 'pack', $keys['Pack'] );
		$this->assertSame( 'size-cm', $keys['Size (cm)'] );
	}

	public function test_a_global_taxonomy_keeps_its_key(): void {
		$keys = $this->axis_keys( array( 'pa_size', 'pa_frame-size' ) );
		$this->assertSame( 'pa_size', $keys['pa_size'] );
		$this->assertSame( 'pa_frame-size', $keys['pa_frame-size'] );
	}
}
