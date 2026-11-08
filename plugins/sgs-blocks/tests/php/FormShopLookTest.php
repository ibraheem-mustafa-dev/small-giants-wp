<?php
/**
 * Form tiles, required mark, standalone text field styling and the tile-font regression (Mama's B9).
 *
 * - sgs/form-field-tiles: tile fill, chosen-tile fill / border colour / shadow, a starting selection.
 * - sgs/form: requiredMarkHidden prints display:none on the required mark, per device.
 * - sgs/form-field-text: its own fill, border, radius, shadow and a leading icon.
 * - The tile font settings (tileLabelFont*) DO apply: the scoped rule sits above the stylesheet's :where() defaults.
 * Every setting is off by default and the unset markup carries none of it.
 *
 * Run with: vendor/bin/phpunit --filter FormShopLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Form look settings.
 */
final class FormShopLookTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Two tiles, with extra attributes.
	 *
	 * @param array<string, mixed> $extra Extra attributes.
	 * @return array<string, mixed>
	 */
	private function tiles( array $extra = array() ): array {
		return array_merge(
			array(
				'fieldName' => 'topic',
				'label'     => 'What is it about?',
				'tiles'     => array(
					array(
						'value' => 'order',
						'label' => 'My order',
					),
					array(
						'value' => 'other',
						'label' => 'Something else',
					),
				),
			),
			$extra
		);
	}

	public function test_tile_fill_and_chosen_tile_rules_print_when_set(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->tiles(
				array(
					'tileBackgroundColour'         => '#fffaf0',
					'tileSelectedBackgroundColour' => '#f9cf6e',
					'tileSelectedBorderColour'     => '#3a2a22',
					'tileSelectedShadow'           => '3px 3px 0 0',
					'tileSelectedShadowColour'     => '#3a2a22',
				)
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-ft-[0-9a-f]{8} \.sgs-form-tile\{background-color:#fffaf0;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-form-tile:has\(input:checked\)\{background-color:#f9cf6e;border-color:#3a2a22;box-shadow:3px 3px 0px 0px #3a2a22/', $out['css'] );
	}

	public function test_tile_hover_shadow_prints_a_guarded_hover_and_focus_rule_only_when_set(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->tiles(
				array(
					'tileHoverShadow'       => '0 18px 30px -20px',
					'tileHoverShadowColour' => '#0a7ea8',
				)
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-form-tile:hover[^{]*\{box-shadow:0px 18px 30px -20px #0a7ea8;}/', $out['css'] );
		$this->assertStringContainsString( '.sgs-form-tile:has(input:focus-visible)', $out['css'] );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .sgs-ft-', $out['css'] );
		// Negative control: an unset hover shadow prints no hover box-shadow.
		$none = $this->render_block( 'sgs/form-field-tiles', $this->tiles( array( 'tileSelectedShadow' => '3px 3px 0 0' ) ) );
		$this->assertDoesNotMatchRegularExpression( '/:hover[^{]*\{box-shadow/', $none['css'] );
	}

	public function test_default_value_starts_that_tile_chosen(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->tiles( array( 'defaultValue' => 'order' ) ) );
		$this->assertMatchesRegularExpression( '/<label class="sgs-form-tile sgs-form-tile--selected"[^>]*><input[^>]*value="order"[^>]* checked/', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], ' checked' ) );
	}

	public function test_default_value_matching_no_tile_selects_nothing(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->tiles( array( 'defaultValue' => 'nope' ) ) );
		$this->assertStringNotContainsString( ' checked', $out['html'] );
	}

	public function test_a_radio_field_takes_only_the_first_default_value(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->tiles( array( 'defaultValue' => 'order,other' ) ) );
		$this->assertSame( 1, substr_count( $out['html'], ' checked' ) );
	}

	public function test_unset_tiles_print_no_fill_chosen_rule_or_selection(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->tiles() );
		$this->assertSame( '', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-form-tile--selected', $out['html'] );
		$this->assertStringNotContainsString( ' checked', $out['html'] );
	}

	public function test_tile_font_settings_apply_above_the_stylesheet_defaults(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->tiles(
				array(
					'tileLabelFontSize'   => array( 'desktop' => '15' ),
					'tileLabelFontWeight' => '700',
				)
			)
		);
		// Two classes (0,2,0) against style.css's :where(.sgs-form-tile__label) (0,0,0).
		$this->assertMatchesRegularExpression( '/\.sgs-ft-[0-9a-f]{8} \.sgs-form-tile__label\{font-weight:700;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-ft-[0-9a-f]{8} \.sgs-form-tile__label\{font-size:15px;\}/', $out['css'] );
	}

	public function test_form_prints_the_tile_font_rule_on_its_own_uid(): void {
		$out = $this->render_block(
			'sgs/form',
			array(
				'formName'            => 'x',
				'tileLabelFontSize'   => array( 'desktop' => '15' ),
				'tileLabelFontWeight' => '700',
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-form-[0-9a-f]{8} \.sgs-form-tile__label\{font-weight:700;\}/', $out['css'] );
	}

	public function test_required_mark_hidden_prints_display_none_per_device(): void {
		$out = $this->render_block(
			'sgs/form',
			array(
				'formName'           => 'x',
				'requiredMarkHidden' => array(
					'desktop' => true,
					'mobile'  => false,
				),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-form-[0-9a-f]{8} \.sgs-form-field__required\{display:none/', $out['css'] );
		$this->assertStringContainsString( 'display:revert', $out['css'] );
	}

	public function test_leading_icon_gradient_paints_the_icon_stroke_and_unset_prints_none(): void {
		$set = $this->render_block(
			'sgs/form-field-text',
			array(
				'fieldName'                 => 'q',
				'leadingIcon'               => 'search',
				'leadingIconColourGradient' => 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
			)
		);
		$this->assertStringContainsString( 'sgs-form-field__leading-icon svg{', $set['css'] );
		$this->assertStringContainsString( 'stroke:url(#', $set['css'] );
		$this->assertStringContainsString( '<linearGradient', $set['html'] );

		$unset = $this->render_block(
			'sgs/form-field-text',
			array(
				'fieldName'         => 'q',
				'leadingIcon'       => 'search',
				'leadingIconColour' => '#3a2a22',
			)
		);
		$this->assertStringNotContainsString( 'stroke:url(#', $unset['css'] );
		$this->assertStringNotContainsString( '<linearGradient', $unset['html'] );
	}

	public function test_required_mark_is_untouched_when_unset(): void {
		$out = $this->render_block( 'sgs/form', array( 'formName' => 'x' ) );
		$this->assertStringNotContainsString( 'sgs-form-field__required', $out['css'] );
	}

	public function test_text_field_prints_its_own_look_and_leading_icon(): void {
		$out = $this->render_block(
			'sgs/form-field-text',
			array(
				'fieldName'         => 'q',
				'placeholder'       => 'Search',
				'leadingIcon'       => 'search',
				'leadingIconColour' => '#3a2a22',
				'leadingIconSize'   => '1.5rem',
				'fieldBackground'   => '#fffaf0',
				'fieldBorderColour' => '#3a2a22',
				'fieldBorderStyle'  => 'solid',
				'fieldBorderWidth'  => array(
					'desktop' => array(
						'top'    => '2px',
						'right'  => '2px',
						'bottom' => '2px',
						'left'   => '2px',
					),
				),
				'fieldBorderRadius' => array(
					'desktop' => array(
						'topLeft'     => '999px',
						'topRight'    => '999px',
						'bottomRight' => '999px',
						'bottomLeft'  => '999px',
					),
				),
				'fieldShadow'       => '4px 4px 0 0',
				'fieldShadowColour' => '#3a2a22',
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-fo-[0-9a-f]{8} \.sgs-form-field__input\{background-color:#fffaf0;border-style:solid;border-width:2px 2px 2px 2px;/', $out['css'] );
		$this->assertStringContainsString( 'border-top-left-radius:999px', $out['css'] );
		$this->assertStringContainsString( 'box-shadow:4px 4px 0px 0px #3a2a22', $out['css'] );
		$this->assertStringContainsString( '--sgs-field-edge-colour:#3a2a22;--sgs-field-icon-size:1.5rem', $out['css'] );
		$this->assertStringContainsString( '.sgs-form-field__leading-icon{color:#3a2a22;}', $out['css'] );
		$this->assertMatchesRegularExpression( '/<span class="sgs-form-field__control sgs-form-field__control--has-icon"><span class="sgs-form-field__leading-icon" aria-hidden="true">.*<svg.*<\/svg><\/span><input type="text"/s', $out['html'] );
		$this->assertStringNotContainsString( 'style="', $out['html'] );
	}

	public function test_text_field_without_the_settings_is_unchanged(): void {
		$out = $this->render_block( 'sgs/form-field-text', array( 'fieldName' => 'q', 'placeholder' => 'Search' ) );
		$this->assertSame( '', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-fo-', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-form-field__control', $out['html'] );
		$this->assertStringNotContainsString( '<style>', $out['html'] );
	}
}
