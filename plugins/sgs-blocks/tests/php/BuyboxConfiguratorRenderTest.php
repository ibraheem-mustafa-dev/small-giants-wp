<?php
/**
 * Tests: sgs/buybox in "Pick a set" mode (buyboxLayout configurator), rendered through the real render.php: the pick
 * groups as real checkbox inputs, the Start with option pre-checked, scoped colours with no inline style, the preview,
 * the no-JS form wiring, groupStyles and showPriceRow. Standard and guided stay byte-identical (BuyboxSnapshotTest).
 *
 * Run with: vendor/bin/phpunit --filter BuyboxConfiguratorRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxConfiguratorRenderTest extends TestCase {

	private static function pickGroups( string $share = 'equal' ): array {
		$flavour = static fn( string $slug, string $label, string $colour, string $extra = '' ): array => array(
			'id' => 0, 'slug' => $slug, 'label' => $label, 'colour' => $colour, 'image' => 0, 'badge' => '', 'description' => $extra,
		);
		return array(
			array(
				'key' => 'pa_size', 'label' => 'Size', 'role' => 'priced', 'flags' => array(),
				'terms' => array( $flavour( 'small', 'Pack of 8', '' ), $flavour( 'large', 'Pack of 20', '' ) ),
			),
			array(
				'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer',
				'flags' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => $share ),
				'terms' => array(
					$flavour( 'vanilla', 'Vanilla', '#F6E7B8', 'Classic' ),
					$flavour( 'mango', 'Mango', '#F5A623' ),
					$flavour( 'mint', 'Mint', '#8FD1A8' ),
				),
			),
		);
	}

	private static function html( array $attrs = array(), ?array $groups = null ): string {
		putenv( 'SGS_QA_GROUPS=' . json_encode( $groups ?? self::pickGroups() ) );
		try {
			return BuyboxSnapshotTest::render_fixture( 'standard', array_merge( array( 'buyboxLayout' => 'configurator' ), $attrs ), null, array( 'meta' => array( '_sgs_pack_size_axis' => 'pa_size' ) ) );
		} finally {
			putenv( 'SGS_QA_GROUPS' );
		}
	}

	public function test_the_shell_and_the_pick_group_render_as_real_inputs(): void {
		$html = self::html();
		$this->assertStringContainsString( 'sgs-buybox--configurator', $html );
		$this->assertStringContainsString( 'data-sgs-pick', $html );
		$this->assertStringContainsString( 'role="group" aria-labelledby=', $html );
		$this->assertStringContainsString( 'Flavour, choose up to 3', $html );
		$this->assertMatchesRegularExpression( '/<input class="sgs-buybox-pick__input" type="checkbox" form="[^"]+" name="sgs_picks\[flavour\]\[\]" value="mango"/', $html );
		$this->assertMatchesRegularExpression( '/value="vanilla"[^>]*checked/', $html, 'Start with pre-checks Vanilla server-side' );
		$this->assertDoesNotMatchRegularExpression( '/value="mango"[^>]*checked/', $html );
	}

	public function test_colours_print_as_scoped_rules_and_nothing_is_inline(): void {
		$html = self::html();
		$this->assertStringNotContainsString( 'style="', $html );
		$this->assertMatchesRegularExpression( '/\[data-sgs-swatch="flavour:mango"\]\{background-color:#F5A623;\}/', $html );
	}

	public function test_the_form_is_the_standard_add_to_cart_post_for_no_js(): void {
		$html = self::html();
		preg_match( '/<form\s+class="buybox__cart-form" id="([^"]+)"/', $html, $m );
		$this->assertNotEmpty( $m, 'the cart form carries an id' );
		$this->assertStringContainsString( 'form="' . $m[1] . '"', $html, 'the pick inputs are tied to that form' );
		$this->assertStringContainsString( '<input type="hidden" name="add-to-cart" value="52" />', $html );
		$this->assertStringContainsString( 'name="variation_id"', $html );
	}

	public function test_the_summary_and_pack_data_and_the_preview_render(): void {
		$html = self::html( array( 'summaryText' => 'Box of {pack}: {split}' ) );
		$this->assertStringContainsString( 'data-summary="Box of {pack}: {split}"', $html );
		$this->assertStringContainsString( 'data-pack-axis="pa_size"', $html );
		$this->assertStringContainsString( '&quot;small&quot;:8', $html );
		$this->assertStringContainsString( 'role="img" aria-label="" data-sgs-preview', $html );
		$this->assertStringContainsString( 'data-sgs-caption', $html );
	}

	public function test_group_styles_map_onto_the_picker_enum(): void {
		$tile = self::html( array( 'groupStyles' => array( 'flavour' => 'tile' ) ) );
		$this->assertStringContainsString( 'sgs-buybox-pick__options--tile', $tile );
		$this->assertStringContainsString( 'sgs-buybox-pick__option-desc', $tile, 'a tile shows the description' );
		$bad = self::html( array( 'groupStyles' => array( 'flavour' => 'bogus' ) ) );
		$this->assertStringContainsString( 'sgs-buybox-pick__options--outlined', $bad, 'an unknown style falls back' );
	}

	public function test_counts_mode_prints_steppers_and_equal_mode_does_not(): void {
		$this->assertStringContainsString( 'data-sgs-stepper', self::html( array(), self::pickGroups( 'counts' ) ) );
		$this->assertStringNotContainsString( 'data-sgs-stepper', self::html() );
	}

	public function test_show_price_row_off_removes_the_row(): void {
		$this->assertStringContainsString( 'buybox__price-row', self::html() );
		$this->assertStringNotContainsString( 'buybox__price-row', self::html( array( 'showPriceRow' => false ) ) );
	}

	public function test_the_picker_box_colours_print_scoped(): void {
		$html = self::html( array( 'pickerBoxBorderColour' => '#112233', 'pickerBoxBorderWidth' => '2px', 'pickerBoxRadius' => '16px' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__pick-box\{[^}]*border-color:#112233[^}]*border-width:2px[^}]*border-radius:16px/', $html );
	}

	public function test_a_product_with_no_pick_groups_renders_the_shell_without_groups(): void {
		$html = self::html( array(), array() );
		$this->assertStringContainsString( 'sgs-buybox-pick', $html );
		$this->assertStringNotContainsString( 'data-sgs-pick-group', $html );
	}

	public function test_the_standard_layout_has_none_of_it(): void {
		$html = BuyboxSnapshotTest::render_fixture( 'standard' );
		$this->assertStringNotContainsString( 'sgs-buybox-pick', $html );
		$this->assertStringNotContainsString( 'data-sgs-pick-summary', $html );
	}

	public function test_pick_hide_gallery_drops_the_photo_column_and_is_off_by_default(): void {
		$this->assertStringContainsString( 'sgs-buybox__gallery-col', self::html() );
		$hidden = self::html( array( 'pickHideGallery' => true ) );
		$this->assertStringNotContainsString( 'sgs-buybox__gallery-col', $hidden );
		$this->assertStringContainsString( 'sgs-buybox--no-gallery', $hidden );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox--no-gallery\{grid-template-columns:minmax\(0,1fr\);\}/', $hidden );
		$this->assertStringContainsString( 'sgs-buybox__gallery-col', BuyboxSnapshotTest::render_fixture( 'standard', array( 'pickHideGallery' => true ) ), 'the setting only acts in Pick a set' );
	}

	public function test_the_preview_box_settings_print_scoped_per_device(): void {
		$html = self::html(
			array(
				'previewBackgroundColour' => '#FFFAF0',
				'previewBorderColour'     => '#3A2A22',
				'previewBorderWidth'      => '2px',
				'previewRadius'           => '28px',
				'previewPadding'          => array( 'desktop' => array( 'top' => '28px', 'right' => '20px' ), 'mobile' => array( 'top' => '12px' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__pick-preview\{background:#FFFAF0;border-color:#3A2A22;border-width:2px;border-radius:28px;\}/', $html );
		$this->assertStringContainsString( '.sgs-buybox__pick-preview{padding-top:28px;padding-right:20px;}', $html );
		$this->assertStringContainsString( '@media (max-width:767px){', $html );
		$this->assertStringContainsString( 'padding-top:12px', $html );
		$this->assertStringContainsString( 'class="sgs-buybox-pick__preview-box sgs-buybox__pick-preview', $html );
	}

	public function test_the_summary_takes_its_own_colour_and_typography(): void {
		$html = self::html( array( 'pickSummaryColour' => '#112233', 'pickSummaryFontFamily' => 'Caveat', 'pickSummaryFontSize' => array( 'desktop' => 26 ) ) );
		$this->assertStringContainsString( '.sgs-buybox__pick-summary{color:#112233;}', $html );
		$this->assertStringContainsString( 'class="sgs-buybox-pick__caption sgs-buybox__pick-summary"', $html );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__pick-summary\{[^}]*font-family:[^}]*Caveat/', $html );
	}

	public function test_the_selected_colour_reaches_every_group_through_shared_properties(): void {
		$html = self::html( array( 'pickSelectedBackgroundColour' => '#F9CF6E', 'pickSelectedBorderColour' => '#3A2A22' ) );
		$this->assertStringContainsString( '--sgs-pick-sel-bg:#F9CF6E;--sgs-op-sel-bg:#F9CF6E;--sgs-pick-sel-border:#3A2A22;--sgs-op-sel-border:#3A2A22', $html );
		$this->assertStringNotContainsString( '--sgs-pick-sel-bg', self::html(), 'nothing is printed until it is set' );
	}

	public function test_the_pill_and_tile_settings_print_scoped(): void {
		$html = self::html(
			array(
				'pickOptionRadius'  => '999px',
				'pickOptionGap'     => '8px',
				'pickOptionPadding' => array( 'desktop' => array( 'left' => '10px', 'right' => '16px' ) ),
				'pickTilePadding'   => array( 'desktop' => array( 'top' => '12px', 'left' => '8px' ) ),
				'pickTileGap'       => '10px',
			)
		);
		$this->assertStringContainsString( '.sgs-buybox__pick-option{border-radius:999px;}', $html );
		$this->assertStringContainsString( '.sgs-buybox-pick__options{gap:8px;}', $html );
		$this->assertStringContainsString( '.sgs-buybox__pick-option{padding-right:16px;padding-left:10px;}', $html );
		$this->assertStringContainsString( '.sgs-option-picker__pill{padding-top:12px;padding-left:8px;}', $html );
		$this->assertStringContainsString( '.sgs-option-picker__options{gap:10px;}', $html );
	}

	public function test_the_pack_tiles_do_not_ask_for_a_second_sub_line(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/render.php' );
		$this->assertStringNotContainsString( "'_sgs_term_description'", $source, 'the option picker already prints the term description; a sub-label key would print it twice' );
	}
}
