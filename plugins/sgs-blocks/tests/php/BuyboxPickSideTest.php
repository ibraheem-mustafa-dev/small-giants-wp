<?php
/**
 * Tests: the Pick a set side-column settings. `pickSideAxis` prints one variation picker under the preview picture and
 * `pickSideButton` prints the add-to-basket form there; both off (the default) leave today's markup untouched.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxPickSideTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxPickSideTest extends TestCase {

	private static function html( array $attrs = array() ): string {
		$term   = static fn( string $slug, string $label ): array => array( 'id' => 0, 'slug' => $slug, 'label' => $label, 'colour' => '', 'image' => 0, 'badge' => '', 'description' => '' );
		$groups = array(
			array( 'key' => 'pa_size', 'label' => 'Size', 'role' => 'priced', 'flags' => array(), 'terms' => array( $term( 'small', 'Pack of 8' ), $term( 'large', 'Pack of 20' ) ) ),
			array(
				'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer',
				'flags' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => 'equal' ),
				'terms' => array( $term( 'vanilla', 'Vanilla' ), $term( 'mango', 'Mango' ) ),
			),
		);
		putenv( 'SGS_QA_GROUPS=' . json_encode( $groups ) );
		try {
			return BuyboxSnapshotTest::render_fixture( 'standard', array_merge( array( 'buyboxLayout' => 'configurator' ), $attrs ), null, array( 'meta' => array( '_sgs_pack_size_axis' => 'pa_size' ) ), true );
		} finally {
			putenv( 'SGS_QA_GROUPS' );
		}
	}

	public function test_both_settings_off_equal_the_explicit_defaults_and_print_no_side_markup(): void {
		$plain = self::html();
		$this->assertSame( $plain, self::html( array( 'pickSideAxis' => '', 'pickSideButton' => false ) ) );
		foreach ( array( 'sgs-buybox-pick__side-picker', 'sgs-buybox-pick__side-cart', 'sgs-buybox-pick--side-cart', 'sgs-buybox-side-cart' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $plain );
		}
		$this->assertSame( 1, substr_count( $plain, 'class="buybox__cart-form"' ) );
	}

	public function test_the_chosen_axis_picker_moves_under_the_picture_and_leaves_the_main_column(): void {
		$on    = self::html( array( 'pickSideAxis' => 'pa_size' ) );
		$main  = substr( $on, 0, (int) strpos( $on, 'class="sgs-buybox-pick__side"' ) );
		$side  = substr( $on, (int) strpos( $on, 'class="sgs-buybox-pick__side"' ) );
		$this->assertStringContainsString( 'sgs-buybox-pick__side-picker', $side );
		$this->assertStringContainsString( 'data-type-key="pa_size"', $side );
		$this->assertStringNotContainsString( 'data-type-key="pa_size"', $main, 'the pack picker is no longer in the main column' );
		$this->assertStringContainsString( 'data-type-key="pa_colour"', $main, 'the other pickers stay' );
		$this->assertStringContainsString( '.sgs-buybox-pick__side-picker.sgs-buybox__pick-box{background:none', $on, 'no second box around the moved picker' );
		$this->assertSame( 1, substr_count( $on, 'data-type-key="pa_size"' ), 'the picker prints once' );
	}

	public function test_the_button_moves_into_the_side_column_once_and_keeps_its_form_wiring(): void {
		$on   = self::html( array( 'pickSideButton' => true ) );
		$this->assertStringContainsString( 'sgs-buybox-pick--side-cart', $on );
		$this->assertStringNotContainsString( 'sgs-buybox-side-cart', $on, 'the placeholder is always replaced' );
		$this->assertSame( 1, substr_count( $on, 'class="buybox__cart-form"' ) );
		$side = substr( $on, (int) strpos( $on, 'class="sgs-buybox-pick__side"' ) );
		$cell = substr( $side, (int) strpos( $side, 'sgs-buybox-pick__side-cart' ), 600 );
		$this->assertStringContainsString( 'buybox__cart-form', $cell );
		$this->assertMatchesRegularExpression( '/<form\s+class="buybox__cart-form" id="([^"]+)"/', $on );
		preg_match( '/<form\s+class="buybox__cart-form" id="([^"]+)"/', $on, $m );
		$this->assertStringContainsString( 'form="' . $m[1] . '"', $on, 'the pick inputs are still tied to the form' );
		$this->assertStringContainsString( 'name="add-to-cart"', $on, 'the no-JS post still works' );
		$this->assertStringNotContainsString( 'style="', $on );
	}

	public function test_both_together_and_with_the_preview_hidden(): void {
		$on = self::html( array( 'pickSideAxis' => 'pa_size', 'pickSideButton' => true, 'pickHidePreview' => true ) );
		$this->assertStringContainsString( 'sgs-buybox-pick__side-picker', $on );
		$this->assertStringContainsString( 'sgs-buybox-pick__side-cart', $on );
		$this->assertSame( 1, substr_count( $on, 'class="buybox__cart-form"' ) );
	}

	public function test_an_axis_that_is_not_on_the_product_prints_nothing_extra(): void {
		$on = self::html( array( 'pickSideAxis' => 'pa_nothing' ) );
		$this->assertStringNotContainsString( 'class="sgs-buybox-pick__side-picker', $on );
		$this->assertSame( 1, substr_count( $on, 'data-type-key="pa_size"' ) );
	}
}
