<?php
/**
 * Tests: the "Gap between chips" extension on woocommerce/product-filter-chips.
 *
 * A set `sgsChipGap` prints `gap` on the chips list (`.wc-block-product-filter-chips__items`)
 * scoped to the block's class, with tablet/mobile media rules only where a tier differs; an
 * unset or unsafe value prints nothing and leaves the markup untouched; other blocks are ignored.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ProductFilterChipsGapTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

namespace SGS\Blocks {
	// Stubs live in the extension's own namespace so they never pre-empt the global WordPress
	// stubs other test files declare (an unqualified call resolves here first).
	if ( ! function_exists( __NAMESPACE__ . '\add_filter' ) ) {
		/**
		 * No-op add_filter(): the extension file registers its render_block filter at load.
		 *
		 * @return bool
		 */
		function add_filter(): bool {
			return true;
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\wp_strip_all_tags' ) ) {
		/**
		 * Minimal wp_strip_all_tags().
		 *
		 * @param string $text Text.
		 * @return string
		 */
		function wp_strip_all_tags( $text ) {
			return trim( strip_tags( (string) $text ) );
		}
	}
}

namespace {
	use PHPUnit\Framework\TestCase;


require_once dirname( __DIR__, 2 ) . '/includes/product-filter-chips-gap.php';

/**
 * The chip gap emitter and render filter.
 */
final class ProductFilterChipsGapTest extends TestCase {

	private const MARKUP = '<div data-block-name="woocommerce/product-filter-chips" class="sgs-chip-test-1a2b3c4d wp-block-woocommerce-product-filter-chips wc-block-product-filter-chips"><fieldset class="wc-block-product-filter-chips__fieldset"><div class="wc-block-product-filter-chips__items"></div></fieldset></div>';

	public function test_set_value_emits_gap_on_the_chips_list(): void {
		$css = \SGS\Blocks\sgs_chip_gap_css( array( 'desktop' => '8px' ), 'sgs-chip-gap-abc12345' );
		$this->assertStringContainsString( '.sgs-chip-gap.sgs-chip-gap-abc12345 .wc-block-product-filter-chips__items{gap:8px', $css );
	}

	public function test_tablet_and_mobile_tiers_emit_media_rules(): void {
		$css = \SGS\Blocks\sgs_chip_gap_css(
			array(
				'desktop' => '8px',
				'tablet'  => '6px',
				'mobile'  => '0.25rem',
			),
			'sgs-chip-gap-abc12345'
		);
		$this->assertStringContainsString( '@media', $css );
		$this->assertStringContainsString( 'gap:6px', $css );
		$this->assertStringContainsString( 'gap:0.25rem', $css );
	}

	public function test_unset_or_unsafe_value_emits_nothing(): void {
		$this->assertSame( '', \SGS\Blocks\sgs_chip_gap_css( array(), 'sgs-chip-gap-abc12345' ) );
		$this->assertSame( '', \SGS\Blocks\sgs_chip_gap_css( array( 'desktop' => '' ), 'sgs-chip-gap-abc12345' ) );
		$this->assertSame( '', \SGS\Blocks\sgs_chip_gap_css( array( 'desktop' => '8px;}body{x:y' ), 'sgs-chip-gap-abc12345' ) );
		$this->assertSame( '', \SGS\Blocks\sgs_chip_gap_css( null, 'sgs-chip-gap-abc12345' ) );
	}

	public function test_render_filter_scopes_the_block_and_appends_the_rule(): void {
		$out = \SGS\Blocks\sgs_inject_chip_gap(
			self::MARKUP,
			array(
				'blockName' => 'woocommerce/product-filter-chips',
				'attrs'     => array( 'sgsChipGap' => array( 'desktop' => '8px' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/class="sgs-chip-gap sgs-chip-test-1a2b3c4d wp-block-woocommerce/', $out );
		$this->assertMatchesRegularExpression( '/<style>\.sgs-chip-gap\.sgs-chip-test-1a2b3c4d \.wc-block-product-filter-chips__items\{gap:8px/', $out );
		$this->assertStringNotContainsString( 'style="', $out );
	}

	public function test_render_filter_leaves_unset_and_other_blocks_alone(): void {
		$this->assertSame(
			self::MARKUP,
			\SGS\Blocks\sgs_inject_chip_gap( self::MARKUP, array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => array() ) )
		);
		$this->assertSame(
			self::MARKUP,
			\SGS\Blocks\sgs_inject_chip_gap( self::MARKUP, array( 'blockName' => 'core/group', 'attrs' => array( 'sgsChipGap' => array( 'desktop' => '8px' ) ) ) )
		);
	}
}
}
