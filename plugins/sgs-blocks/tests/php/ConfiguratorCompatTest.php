<?php
/**
 * Tests: configurator cloning / Typed schema-compatibility (Spec 27 FR-27-I-MVP, U12).
 *
 * The cloning converter emits Typed option-pickers and Typed product-cards. Adding
 * the configurator attributes (sourceMode now; swatch attrs in Phase 2) must keep
 * the Typed shape a DEPRECATION-FREE SUBSET — the converter's emitted markup and
 * every existing Typed post must keep validating against the block schema with no
 * migration. This is the deprecation/compat half of U12; the Jest suite
 * (configurator-schema-compat.test.js) covers the block.json attribute-TYPE
 * contract plus a frozen baseline snapshot.
 *
 * The actual "the converter still emits Typed pickers" behaviour was proven live
 * in D153 (the converter emits `wp:sgs/option-picker {optionItems,defaultSelected,
 * typeKey}`); these tests guard that the block schema that markup resolves against
 * does not drift.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Class ConfiguratorCompatTest
 */
class ConfiguratorCompatTest extends TestCase {

	/** Absolute plugin root (tests/php → up two). */
	private static function plugin_dir(): string {
		return dirname( __DIR__, 2 );
	}

	/**
	 * Read + decode a plugin-relative JSON file.
	 *
	 * @param string $rel Plugin-relative path (leading slash).
	 * @return array
	 */
	private static function read_json( string $rel ): array {
		$raw = file_get_contents( self::plugin_dir() . $rel );
		$decoded = json_decode( (string) $raw, true );
		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * Read a plugin-relative text file.
	 *
	 * @param string $rel Plugin-relative path (leading slash).
	 * @return string
	 */
	private static function read_file( string $rel ): string {
		return (string) file_get_contents( self::plugin_dir() . $rel );
	}

	/**
	 * The option-picker is a dynamic block whose save() returns null, so adding
	 * attributes can never invalidate stored markup (no serialised attr output).
	 */
	public function test_option_picker_is_dynamic_with_null_save(): void {
		$json = self::read_json( '/src/blocks/option-picker/block.json' );
		$this->assertSame( 'file:./render.php', $json['render'] ?? '' );

		$save = self::read_file( '/src/blocks/option-picker/save.js' );
		$this->assertStringContainsString(
			'return null',
			$save,
			'option-picker save() must return null (dynamic) so adding attrs needs no deprecation.'
		);
	}

	/**
	 * The attribute TYPES the converter's emitted option-picker markup relies on
	 * must not drift (gate on type, not presence — the inheritStyle lesson).
	 */
	public function test_option_picker_converter_contract_attr_types(): void {
		$attrs = self::read_json( '/src/blocks/option-picker/block.json' )['attributes'] ?? array();
		$this->assertSame( 'array', $attrs['optionItems']['type'] ?? null );
		$this->assertSame( 'string', $attrs['defaultSelected']['type'] ?? null );
		$this->assertSame( 'string', $attrs['typeKey']['type'] ?? null );
		$this->assertSame( 'array', $attrs['contentImpact']['type'] ?? null );
	}

	/**
	 * The product-card save() emits <InnerBlocks.Content/> only — it serialises the
	 * InnerBlocks slot, never attribute values — so adding scalar configurator
	 * attrs (sourceMode, productId, future swatch attrs) cannot change the stored
	 * output and is therefore deprecation-free. (This project uses no block
	 * deprecations — see plugins/sgs-blocks/CLAUDE.md, D270.)
	 */
	public function test_product_card_save_serialises_innerblocks_only(): void {
		$json = self::read_json( '/src/blocks/product-card/block.json' );
		$this->assertSame( 'file:./render.php', $json['render'] ?? '' );

		$index = self::read_file( '/src/blocks/product-card/index.js' );
		$this->assertStringContainsString(
			'InnerBlocks.Content',
			$index,
			'product-card save must emit InnerBlocks.Content only — no attr serialisation — keeping attr additions deprecation-free.'
		);
	}

	/**
	 * The sourceMode attribute defaults to 'typed' so every existing Typed post and every
	 * converter-emitted card renders in Typed mode with no migration; the Bound
	 * additions are additive + inert in Typed mode (productId default 0).
	 */
	public function test_product_card_sourcemode_defaults_to_typed(): void {
		$attrs = self::read_json( '/src/blocks/product-card/block.json' )['attributes'] ?? array();
		$this->assertSame( 'string', $attrs['sourceMode']['type'] ?? null );
		$this->assertSame( 'typed', $attrs['sourceMode']['default'] ?? null );
		$this->assertContains( 'typed', $attrs['sourceMode']['enum'] ?? array() );
		$this->assertSame( 0, $attrs['productId']['default'] ?? null );
	}
}
