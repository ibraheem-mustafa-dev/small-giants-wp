<?php
/**
 * Tests: the Pick a set look settings on sgs/buybox (forwarded pill look, group headings, hint, price line, tile
 * columns, box padding and gap, flavour pill look and dots) and the instance scope id.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxPickLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxPickLookTest extends TestCase {

	private static function pickGroups(): array {
		$term = static fn( string $slug, string $label, string $colour ): array => array(
			'id' => 0, 'slug' => $slug, 'label' => $label, 'colour' => $colour, 'image' => 0, 'badge' => '', 'description' => '',
		);
		return array(
			array(
				'key' => 'pa_size', 'label' => 'Size', 'role' => 'priced', 'flags' => array(),
				'terms' => array( $term( 'small', 'Pack of 8', '' ), $term( 'large', 'Pack of 20', '' ) ),
			),
			array(
				'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer',
				'flags' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => 'equal' ),
				'terms' => array( $term( 'vanilla', 'Vanilla', '#F6E7B8' ), $term( 'mango', 'Mango', '#F5A623' ) ),
			),
		);
	}

	private static function html( array $attrs = array() ): string {
		putenv( 'SGS_QA_GROUPS=' . json_encode( self::pickGroups() ) );
		try {
			return BuyboxSnapshotTest::render_fixture( 'standard', array_merge( array( 'buyboxLayout' => 'configurator', 'pickerStyle' => 'tile' ), $attrs ), null, array( 'meta' => array( '_sgs_pack_size_axis' => 'pa_size' ) ), true );
		} finally {
			putenv( 'SGS_QA_GROUPS' );
		}
	}

	public function test_unset_prints_none_of_the_new_settings_and_is_byte_identical_to_explicit_defaults(): void {
		$off = self::html();
		$this->assertStringContainsString( 'sgs-option-picker', $off, 'the pickers rendered, so the negative control is not vacuous' );
		$this->assertStringContainsString( 'sgs-buybox-pick__group-title', $off );
		foreach ( array( '--sgs-pick-bg', '--sgs-pick-border', '--sgs-pick-weight', '--sgs-op-swatch-tick', 'repeat(', 'sgs-buybox-pick__hint', 'sgs-buybox-pick--dot-tick', 'translate:', 'sgs-option-picker__sub-label' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $off, $needle );
		}
		$this->assertStringContainsString( 'Flavour, choose up to 3', $off );
		$explicit = self::html(
			array(
				'pickGroupNumbers' => false, 'pickTilePriceLine' => false, 'pickerDotTickInside' => false, 'pickerDotShape' => '',
				'pickGroupHeadings' => array(), 'pickTileColumns' => array(), 'pickerBoxPadding' => array(), 'pickerBoxGap' => array(),
			)
		);
		$this->assertSame( $off, $explicit, 'explicit defaults render byte-identically to unset, scope id included' );
	}

	public function test_the_pill_look_reaches_the_pickers_and_the_flavour_pills(): void {
		$html = self::html(
			array(
				'pickerPillBackgroundColour' => '#fffaf0', 'pickerPillBorderColour' => '#3a2a22', 'pickerPillFontWeight' => '700',
				'pickerPillSelectedShadow' => '3px 3px 0 0', 'pickerPillSelectedShadowColour' => '#3a2a22',
				'pickerPillSelectedOffsetX' => '-2px', 'pickerPillSelectedOffsetY' => '-2px',
			)
		);
		$this->assertStringContainsString( '--sgs-op-bg:#fffaf0', $html );
		$this->assertStringContainsString( '--sgs-op-border:#3a2a22', $html );
		$this->assertStringContainsString( 'translate:-2px -2px', $html );
		$this->assertMatchesRegularExpression( '/:checked ~ \.sgs-option-picker__pill\{[^}]*box-shadow:[^;}]*3px 3px 0/', $html );
		$this->assertStringContainsString( '--sgs-pick-bg:#fffaf0', $html );
		$this->assertStringContainsString( '--sgs-pick-border:#3a2a22', $html );
		$this->assertStringContainsString( '--sgs-pick-weight:700', $html );
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__option:has\(\.sgs-buybox-pick__input:checked\)\{box-shadow:3px 3px 0px 0px #3a2a22;.*translate:-2px -2px;\}/s', $html );
		$this->assertStringNotContainsString( 'style="', preg_replace( '/<style.*?<\/style>/s', '', $html ) );
	}

	public function test_group_headings_take_text_number_and_hint_and_keep_the_limit_for_screen_readers(): void {
		$html = self::html(
			array(
				'pickGroupNumbers'  => true,
				'pickGroupHeadings' => array( 'flavour' => array( 'text' => 'Flavours', 'hint' => 'Up to 3, split evenly' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__group-title"[^>]*>\d · Flavours <span class="sgs-buybox-pick__hint">Up to 3, split evenly<\/span><span class="sgs-sr-only">, choose up to 3<\/span>/u', $html );
		$this->assertMatchesRegularExpression( '/>1 · Size</u', $html, 'the first picker is numbered 1 from the attribute name' );
		$this->assertMatchesRegularExpression( '/>2 · Colour</u', $html );
		$hinted = self::html( array( 'pickGroupHeadings' => array( 'pa_size' => array( 'text' => 'How many', 'hint' => 'Pick one' ) ) ) );
		$this->assertStringContainsString( 'sgs-buybox__picker-hint">Pick one<', $hinted );
		$this->assertStringContainsString( 'sgs-buybox__picker-label-text">How many<', $hinted );
	}

	public function test_the_label_typography_also_covers_the_flavour_title(): void {
		$html = self::html( array( 'pickerLabelFontWeight' => '800', 'pickerLabelTextTransform' => 'uppercase', 'pickerLabelColour' => '#3a2a22', 'pickerHintColour' => '#5e4a3d' ) );
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__group-title\{[^}]*font-weight:800/', $html );
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__group-title\{[^}]*text-transform:uppercase/', $html );
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__group-title\{color:#3a2a22/', $html );
		$this->assertStringContainsString( '{color:#5e4a3d;}', $html );
	}

	public function test_a_pack_tile_can_show_the_variation_total_price(): void {
		$html = self::html( array( 'pickTilePriceLine' => true ) );
		$this->assertMatchesRegularExpression( '/pill-label">Small<\/span><span class="sgs-option-picker__sub-label">[^<]*9</', $html );
		$this->assertMatchesRegularExpression( '/pill-label">Large<\/span><span class="sgs-option-picker__sub-label">[^<]*15</', $html );
		$this->assertStringNotContainsString( 'pill-label">Red</span><span class="sgs-option-picker__sub-label"', $html, 'only the pack axis shows the price line' );
	}

	public function test_tile_columns_box_padding_and_gap_print_per_device(): void {
		$html = self::html(
			array(
				'pickTileColumns' => array( 'desktop' => 3, 'tablet' => 3, 'mobile' => 3 ),
				'pickerBoxPadding' => array( 'desktop' => array( 'top' => '28px', 'right' => '28px', 'bottom' => '28px', 'left' => '28px' ), 'mobile' => array( 'top' => '20px', 'right' => '16px', 'bottom' => '20px', 'left' => '16px' ) ),
				'pickerBoxGap' => array( 'desktop' => '20px' ),
			)
		);
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__options{grid-template-columns:repeat(3,minmax(0,1fr));}', $html );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^}]*sgs-option-picker--tile \.sgs-option-picker__options\{grid-template-columns:repeat\(3/', $html );
		$this->assertMatchesRegularExpression( '/sgs-buybox__pick-box\{padding-top:28px;padding-right:28px;padding-bottom:28px;padding-left:28px;\}/', $html );
		$this->assertMatchesRegularExpression( '/sgs-buybox__pick-box\{gap:20px;\}/', $html );
	}

	public function test_the_colour_dots_take_shape_size_ring_and_the_tick_inside(): void {
		$html = self::html( array( 'pickerGroupDotSize' => '22px', 'pickerDotShape' => 'round', 'pickerDotRingThickness' => '2px', 'pickerDotRingColour' => '#3a2a22', 'pickerDotTickInside' => true, 'pickerDotTickColour' => '#ffffff' ) );
		$this->assertMatchesRegularExpression( '/sgs-buybox-pick__swatch\{border-radius:50%;width:22px;height:22px;border-width:2px;border-color:#3a2a22;\}/', $html );
		$this->assertStringContainsString( 'sgs-buybox-pick--dot-tick', $html );
		$this->assertStringContainsString( '--sgs-pick-dot-tick:#ffffff', $html );
	}

	public function test_the_option_text_weight_stays_off_tiles_and_the_tile_number_has_its_own(): void {
		$html = self::html( array( 'pickerPillFontWeight' => '700', 'pickTileNumberWeight' => '400' ) );
		$this->assertStringNotContainsString( 'pillFontWeight', $html );
		$this->assertDoesNotMatchRegularExpression( '/sgs-option-picker__pill\{[^}]*font-weight:700/', $html, 'a tile gets no forwarded weight' );
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__pill-label{font-weight:400;}', $html );
		$plain = BuyboxSnapshotTest::render_fixture( 'standard', array( 'buyboxLayout' => 'configurator', 'pickerStyle' => 'outlined', 'pickerPillFontWeight' => '700' ), null, array(), true );
		$this->assertMatchesRegularExpression( '/sgs-option-picker__pill\{[^}]*font-weight:700/', $plain, 'a pill gets it' );
	}

	public function test_pack_tile_price_weight_prints_on_the_price_line(): void {
		$html = self::html( array( 'pickTilePriceWeight' => '700' ) );
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__sub-label{font-weight:700;}', $html );
	}
}
