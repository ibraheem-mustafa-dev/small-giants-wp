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
		$this->assertStringContainsString( '@media(max-width:767px){', $html );
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

	public function test_pack_tile_number_price_and_each_line_take_their_own_sizes(): void {
		$html = self::html(
			array(
				'pickTileNumberSize' => array( 'desktop' => '26px', 'mobile' => '20px' ),
				'pickTilePriceSize'  => array( 'desktop' => '14px' ),
				'pickTileEachSize'   => array( 'desktop' => '12px' ),
			)
		);
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__pill-label{font-size:26px;}', $html );
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__sub-label{font-size:14px;}', $html );
		$this->assertStringContainsString( '.sgs-option-picker--tile .sgs-option-picker__term-description{font-size:12px;}', $html );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:767px\)\{[^}]*pill-label\{font-size:20px;\}\}/', $html, 'the mobile tier prints inside the mobile query' );
	}

	public function test_priced_pills_take_their_own_radius_padding_gap_and_size(): void {
		$html = self::html(
			array(
				'pickPricedRadius'   => '999px',
				'pickPricedGap'      => '8px',
				'pickPricedPadding'  => array( 'desktop' => array( 'top' => '0', 'right' => '18px', 'bottom' => '0', 'left' => '12px' ) ),
				'pickPricedFontSize' => array( 'desktop' => '16px' ),
			)
		);
		$pill = '.sgs-option-picker:not(.sgs-option-picker--tile)';
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__pill{border-radius:999px;}', $html );
		$this->assertStringContainsString( $pill . '{--sgs-op-pill-radius:999px;}', $html, 'the selected pill reads the property' );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__options{gap:8px;}', $html );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__pill{padding-top:0px;padding-right:18px;padding-bottom:0px;padding-left:12px;}', $html );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__pill{font-size:16px;}', $html );
	}

	public function test_a_configurator_with_none_of_the_new_settings_prints_none_of_them(): void {
		$html = self::html();
		foreach ( array( 'pill-label{font-size', 'sub-label{font-size', 'term-description{font-size', 'sgs-op-pill-radius', '--sgs-op-sel-text', '--sgs-pick-sel-text', '--sgs-buybox-thumb-size' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $html, $needle );
		}
	}

	public function test_the_selected_text_reads_4_5_to_1_on_the_selected_fill(): void {
		foreach ( array( '#F5C518', '#1F3A5F', '#FFFFFF', '#000000' ) as $fill ) {
			$html = self::html( array( 'pickSelectedBackgroundColour' => $fill ) );
			$this->assertMatchesRegularExpression( '/--sgs-op-sel-text:(#000|#fff);/', $html, $fill );
			preg_match( '/--sgs-op-sel-text:(#000|#fff);/', $html, $m );
			$text = '#000' === $m[1] ? '#000000' : '#ffffff';
			$this->assertGreaterThanOrEqual( 4.5, sgs_wcag_contrast_ratio( $text, $fill ), "text $text on $fill" );
		}
		$own = self::html( array( 'pickSelectedBackgroundColour' => '#F5C518', 'pickSelectedTextColour' => '#222222' ) );
		$this->assertStringContainsString( '--sgs-op-sel-text:#222222;', $own, 'the author text colour wins' );
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/configurator.css' );
		$this->assertMatchesRegularExpression( '/:checked ~ \.sgs-option-picker__pill \.sgs-option-picker__term-description\s*\{\s*opacity: 1;/', $css, 'the selected each-line is not muted' );
	}

	public function test_priced_pills_can_size_to_their_text_and_take_a_minimum_height(): void {
		$pill = '.sgs-buybox__pick-box .sgs-option-picker:not(.sgs-option-picker--tile)';
		$html = self::html( array( 'pickPricedLayout' => 'auto', 'pickPricedMinHeight' => array( 'desktop' => '48px' ) ) );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__options{display:flex;flex-wrap:wrap;align-items:center;}', $html );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__pill{width:auto;}', $html );
		$this->assertStringContainsString( $pill . ' .sgs-option-picker__pill{min-height:48px;}', $html );
		$columns = self::html( array( 'pickPricedLayout' => 'columns' ) );
		$this->assertStringNotContainsString( 'flex-wrap:wrap;align-items:center;}', $columns, 'columns keeps the grid' );
		$this->assertStringNotContainsString( 'min-height:', self::html(), 'unset prints no height' );
	}

	public function test_the_term_badge_text_reads_4_5_to_1_on_its_fill_and_unset_prints_nothing(): void {
		foreach ( array( '#F9CF6E', '#1F3A5F', '#FFFFFF' ) as $fill ) {
			$html = self::html( array( 'pickBadgeBackgroundColour' => $fill ) );
			$this->assertMatchesRegularExpression( '/term-badge,[^{]*option-badge\{background-color:' . $fill . ';color:(#[0-9a-fA-F]{3,6});\}/', $html, $fill );
			preg_match( '/option-badge\{background-color:[^;]+;color:(#[0-9a-fA-F]{3,6});\}/', $html, $m );
			$text = '#000' === $m[1] ? '#000000' : ( '#fff' === $m[1] ? '#ffffff' : $m[1] );
			$this->assertGreaterThanOrEqual( 4.5, sgs_wcag_contrast_ratio( $text, $fill ), "text $text on $fill" );
		}
		$own = self::html( array( 'pickBadgeBackgroundColour' => '#F9CF6E', 'pickBadgeTextColour' => '#222222' ) );
		$this->assertStringContainsString( '{background-color:#F9CF6E;color:#222222;}', $own, 'the author text colour wins' );
		$this->assertStringNotContainsString( 'option-badge{', self::html(), 'unset prints no badge rule when the stylesheet pair passes or cannot be resolved' );
	}

	public function test_the_gallery_gaps_are_per_device_and_a_saved_string_still_works(): void {
		$string = self::html( array( 'galleryColumnGap' => '60px', 'thumbGap' => '6px' ) );
		$this->assertStringContainsString( '@media(min-width:768px){', $string );
		$this->assertStringContainsString( '{gap:60px;}}', $string, 'a saved string is the desktop value, unchanged' );
		$this->assertStringContainsString( '.product-card__thumbs:not([hidden]){gap:6px;}', $string );

		$tiers = self::html(
			array(
				'galleryColumnGap' => array( 'desktop' => '64px', 'tablet' => '36px' ),
				'thumbGap'         => array( 'desktop' => '10px', 'mobile' => '4px' ),
				'galleryThumbSize' => array( 'desktop' => '88px', 'tablet' => '76px', 'mobile' => '64px' ),
			)
		);
		$this->assertStringContainsString( '@media(min-width:768px){', $tiers );
		$this->assertMatchesRegularExpression( '/\{gap:64px;\}@media ?\(max-width:1023px\)\{[^}]*\{gap:36px;\}\}\}/', $tiers );
		$this->assertStringContainsString( '.product-card__thumbs:not([hidden]){gap:10px;}', $tiers );
		$this->assertStringContainsString( '--sgs-buybox-thumb-size:88px;', $tiers );
		$this->assertStringContainsString( '--sgs-buybox-thumb-size:76px;', $tiers );
		$this->assertStringContainsString( '--sgs-buybox-thumb-size:64px;', $tiers );
	}
}
