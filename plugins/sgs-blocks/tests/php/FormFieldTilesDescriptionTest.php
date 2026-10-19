<?php
/**
 * Sgs/form-field-tiles prints an optional description line under each tile's label, with its own typography and
 * colour controls (Spec 04 FR-4-2).
 *
 * The description sits inside the tile's <label for>, between the label text and the check mark, so the accessible
 * name includes it (WCAG 2.5.3). It is cut to 140 characters. The tile label and the description each take their
 * typography and colour through a scoped rule keyed to the field's uid class.
 *
 * Run with: vendor/bin/phpunit --filter FormFieldTilesDescriptionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Tiles description line.
 */
final class FormFieldTilesDescriptionTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Attributes for a two-tile field; the first tile carries the description.
	 *
	 * @param string               $description The first tile's description.
	 * @param array<string, mixed> $extra       Further block attributes.
	 * @return array<string, mixed>
	 */
	private function attrs( string $description, array $extra = array() ): array {
		return array_merge(
			array(
				'fieldName' => 'service',
				'label'     => 'What can we help with?',
				'tiles'     => array(
					array(
						'value'       => 'wholesale',
						'label'       => 'Wholesale',
						'description' => $description,
					),
					array(
						'value' => 'catering',
						'label' => 'Catering',
					),
				),
			),
			$extra
		);
	}

	/**
	 * The description prints inside the label, after the label text and before the check mark.
	 */
	public function test_description_renders_inside_the_label(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs( 'Trade prices on pallets' ) );

		$this->assertMatchesRegularExpression(
			'#<label class="sgs-form-tile"[^>]*>.*?<span class="sgs-form-tile__label">Wholesale</span><span class="sgs-form-tile__description">Trade prices on pallets</span><span class="sgs-form-tile__check"#s',
			$out['html']
		);
		$this->assertSame( 1, substr_count( $out['html'], 'sgs-form-tile__description' ), 'only the tile that has a description prints one' );
	}

	/**
	 * No description, no span.
	 */
	public function test_no_description_prints_no_span(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs( '' ) );

		$this->assertStringNotContainsString( 'sgs-form-tile__description', $out['html'] );
	}

	/**
	 * A long description is cut to 140 characters.
	 */
	public function test_a_long_description_is_cut_to_140_characters(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs( str_repeat( 'a', 200 ) ) );

		$this->assertSame( 1, preg_match( '#<span class="sgs-form-tile__description">(a+)</span>#', $out['html'], $m ) );
		$this->assertSame( 140, strlen( $m[1] ) );
	}

	/**
	 * The description is escaped.
	 */
	public function test_description_is_escaped(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs( '<b>Bold</b> & more' ) );

		$this->assertStringContainsString( '&lt;b&gt;Bold&lt;/b&gt; &amp; more', $out['html'] );
		$this->assertStringNotContainsString( '<b>Bold</b>', $out['html'] );
	}

	/**
	 * The label and description typography and colour reach scoped rules on the field's uid class.
	 */
	public function test_typography_and_colour_reach_scoped_rules(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->attrs(
				'Trade prices on pallets',
				array(
					'tileLabelFontSize'         => array( 'desktop' => 17 ),
					'tileLabelFontWeight'       => '700',
					'tileLabelColour'           => '#112233',
					'tileDescriptionFontSize'   => array( 'desktop' => 15 ),
					'tileDescriptionLineHeight' => array( 'desktop' => 1.3 ),
					'tileDescriptionColour'     => '#667788',
				)
			)
		);

		$this->assertSame( 1, preg_match( '/\.(sgs-ft-[0-9a-f]{8}) \.sgs-form-tile__label\{/', $out['css'], $uid ), 'no label rule: ' . $out['css'] );
		$label       = $this->declarations( $out['css'], '.' . $uid[1] . ' .sgs-form-tile__label' );
		$description = $this->declarations( $out['css'], '.' . $uid[1] . ' .sgs-form-tile__description' );

		$this->assertStringContainsString( 'font-size:17px', $label );
		$this->assertStringContainsString( 'font-weight:700', $label );
		$this->assertStringContainsString( 'color:#112233', $label );
		$this->assertStringContainsString( 'font-size:15px', $description );
		$this->assertStringContainsString( 'color:#667788', $description );
	}

	/**
	 * Every declaration the CSS prints for one selector (base rules only), joined.
	 *
	 * @param string $css      The block's CSS.
	 * @param string $selector The rule's selector.
	 * @return string
	 */
	private function declarations( string $css, string $selector ): string {
		preg_match_all( '/(?<![^}])' . preg_quote( $selector, '/' ) . '\{([^}]*)\}/', $css, $m );
		return implode( ';', $m[1] );
	}

	/**
	 * Nothing set, no rule for either line.
	 */
	public function test_nothing_set_prints_no_tile_text_rules(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs( 'Trade prices on pallets' ) );

		$this->assertStringNotContainsString( 'sgs-form-tile__label{', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-form-tile__description{', $out['css'] );
	}
}
