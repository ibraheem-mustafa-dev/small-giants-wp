<?php
/**
 * Site-wide block defaults reach the editor with each attribute's declared JSON shape.
 *
 * The option stores PHP arrays, so an empty object attribute saved from the editor
 * (sgs/button iconSize `{}`, padding `{"desktop":{}}`) came back as `[]`: the canary's
 * stored sgs/button defaults carried iconSize [] and the editor drew the icon 0px wide.
 * Block_Defaults::shape_attributes() restores objects from the block's attribute schema
 * (read here from the real block.json, decoded the way WordPress registers it).
 *
 * Run with: vendor/bin/phpunit --filter BlockDefaultsJsonShapeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Block_Defaults;

require_once dirname( __DIR__, 2 ) . '/includes/class-block-defaults.php';

/**
 * Block_Defaults::shape_attributes() against real block.json schemas.
 */
final class BlockDefaultsJsonShapeTest extends TestCase {

	/**
	 * The attribute schema WordPress registers for a block (block.json decoded associatively).
	 *
	 * @param string $slug Block folder.
	 * @return array<string, array<string, mixed>>
	 */
	private function schema( string $slug ): array {
		$file = dirname( __DIR__, 2 ) . "/src/blocks/{$slug}/block.json";
		$json = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local block.json.
		return $json['attributes'];
	}

	/**
	 * JSON as the editor receives it (wp_json_encode is json_encode plus a depth and charset check).
	 *
	 * @param mixed $value Value to encode.
	 * @return string
	 */
	private function encode( $value ): string {
		return (string) json_encode( $value ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- no WordPress in this suite.
	}

	/**
	 * The stored canary value, as PHP holds it after a JSON round trip through the option.
	 *
	 * @return array<string, mixed>
	 */
	private function stored_button(): array {
		return json_decode(
			'{"inheritStyle":"secondary","iconSize":[],"fontSize":[],"customWidth":[],"padding":{"desktop":[]},"borderRadius":{"desktop":[]},"widthType":{"desktop":"fit"},"label":"Go","sgsConditionDays":[]}',
			true
		);
	}

	/**
	 * Negative control: the stored option encoded as it is (what the editor was sent) carries [] for {}.
	 */
	public function test_the_stored_option_alone_encodes_objects_as_lists(): void {
		$json = $this->encode( $this->stored_button() );

		$this->assertStringContainsString( '"iconSize":[]', $json );
		$this->assertStringContainsString( '"padding":{"desktop":[]}', $json );
	}

	/**
	 * Empty object attributes, top level and nested, encode as {}.
	 */
	public function test_empty_object_attributes_reach_json_as_objects(): void {
		$json = $this->encode( Block_Defaults::shape_attributes( $this->stored_button(), $this->schema( 'button' ) ) );

		$this->assertStringContainsString( '"iconSize":{}', $json );
		$this->assertStringContainsString( '"fontSize":{}', $json );
		$this->assertStringContainsString( '"customWidth":{}', $json );
		$this->assertStringContainsString( '"padding":{"desktop":{}}', $json );
		$this->assertStringContainsString( '"borderRadius":{"desktop":{}}', $json );
		$this->assertStringContainsString( '"widthType":{"desktop":"fit"}', $json );
	}

	/**
	 * Strings and undeclared attributes are untouched.
	 */
	public function test_non_object_attributes_pass_through(): void {
		$json = $this->encode( Block_Defaults::shape_attributes( $this->stored_button(), $this->schema( 'button' ) ) );

		$this->assertStringContainsString( '"inheritStyle":"secondary"', $json );
		$this->assertStringContainsString( '"label":"Go"', $json );
		// Not in block.json (an extension attribute): untouched, so a list stays a list.
		$this->assertStringContainsString( '"sgsConditionDays":[]', $json );
	}

	/**
	 * Every object attribute of every SGS block, saved empty, encodes as {}.
	 */
	public function test_every_object_attribute_of_every_block_round_trips(): void {
		foreach ( glob( dirname( __DIR__, 2 ) . '/src/blocks/*/block.json' ) as $file ) {
			$slug   = basename( dirname( $file ) );
			$schema = $this->schema( $slug );
			$stored = array();
			foreach ( $schema as $name => $def ) {
				$type = $def['type'] ?? null;
				if ( 'object' === $type || ( is_array( $type ) && in_array( 'object', $type, true ) ) ) {
					$stored[ $name ] = array();
				}
			}
			$shaped = Block_Defaults::shape_attributes( $stored, $schema );
			foreach ( $shaped as $name => $value ) {
				$this->assertInstanceOf( \stdClass::class, $value, "{$slug}.{$name} must reach JSON as {}" );
			}
		}
	}

	/**
	 * An empty value whose schema default is a list stays a list.
	 */
	public function test_a_list_default_keeps_an_empty_list(): void {
		$schema = array(
			'stops' => array(
				'type'    => 'object',
				'default' => array(
					'items' => array( 'a', 'b' ),
				),
			),
		);
		$json   = $this->encode( Block_Defaults::shape_attributes( array( 'stops' => array( 'items' => array() ) ), $schema ) );

		$this->assertSame( '{"stops":{"items":[]}}', $json );
	}
}
