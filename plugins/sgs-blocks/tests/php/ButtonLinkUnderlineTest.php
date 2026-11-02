<?php
/**
 * sgs/button: the shared link-underline settings in self mode, the precedence over the old decoration settings, and the
 * byte-for-byte parity of the existing (non-self) helper output.
 *
 * Run with: vendor/bin/phpunit --filter ButtonLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-link-underline.php';

final class ButtonLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function button( array $extra ): array {
		return $this->render_block( 'sgs/button', array_merge( array( 'label' => 'Go', 'url' => 'https://example.test/' ), $extra ) );
	}

	/**
	 * The non-self output for the seven blocks that carry the setting, hashed from the helper as it was before the
	 * `$self` parameter existed (35 cases: 7 blocks x 5 attribute sets x 2 call shapes' joined output).
	 */
	public function test_non_self_output_is_byte_identical_to_before(): void {
		$sets = array(
			array( 'linkUnderline' => 'none' ),
			array( 'linkUnderline' => 'always', 'linkUnderlineThickness' => '2px', 'linkUnderlineColour' => 'primary', 'linkUnderlineColourHover' => '#fff', 'linkUnderlineOffset' => '4px' ),
			array( 'linkUnderline' => 'hover', 'linkUnderlineThickness' => '2px', 'linkUnderlineColourHover' => 'accent' ),
			array( 'linkUnderline' => 'sweep', 'linkUnderlineThickness' => '3px', 'linkUnderlineColour' => '#123456', 'linkUnderlineColourHover' => '#654321' ),
			array( 'linkUnderline' => 'sweep', 'linkColourGradient' => 'linear-gradient(red,blue)' ),
		);
		$out  = array();
		foreach ( array( 'text', 'heading', 'label', 'icon-list', 'business-info', 'testimonial', 'collapsible-text' ) as $block ) {
			foreach ( $sets as $i => $attrs ) {
				$out[ "$block-$i" ] = array(
					sgs_link_underline_css( $attrs, '', '.sgs-' . $block . '-abc' ),
					sgs_link_underline_css( $attrs, '', '.x.x', ' .sgs-business-info__text' ),
				);
			}
		}
		$this->assertSame( '19561f8667e1f5c054a4766d231a987e', md5( wp_json_encode( $out ) ) );
		$this->assertCount( 35, $out );
	}

	public function test_self_always_prints_four_variants_above_the_stylesheet_resets(): void {
		$out = $this->button(
			array(
				'inheritStyle'            => 'link',
				'linkUnderline'           => 'always',
				'linkUnderlineColour'     => '#ff3366',
				'linkUnderlineThickness'  => '2px',
				'linkUnderlineOffset'     => '4px',
			)
		);
		$css = $out['css'];
		$this->assertMatchesRegularExpression( '/(\.sgs-btn-[0-9a-f]{8})\1\.sgs-button,\1\1\.sgs-button:focus:not\(:focus-visible\)\{text-decoration-line:underline;text-decoration-thickness:2px;text-decoration-color:#ff3366;text-underline-offset:4px;\}/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-button:hover,\.sgs-btn-[0-9a-f]{8}\.sgs-btn-[0-9a-f]{8}\.sgs-button:focus-visible\{text-decoration-line:underline;/', $css, 'hover and keyboard focus keep the line' );
		$this->assertStringNotContainsString( '.sgs-button a', $css, 'self mode never styles a descendant link' );
	}

	public function test_a_set_underline_replaces_the_old_decoration_settings(): void {
		$set_with_rest  = $this->button( array( 'linkUnderline' => 'always', 'textDecoration' => 'line-through' ) );
		$set_with_hover = $this->button( array( 'linkUnderline' => 'none', 'textDecorationHover' => 'underline' ) );
		$unset_both     = $this->button( array( 'textDecoration' => 'line-through', 'textDecorationHover' => 'underline' ) );

		$this->assertStringNotContainsString( 'line-through', $set_with_rest['css'], 'rest decoration is not printed while the shared underline is set' );
		$this->assertStringNotContainsString( 'text-decoration:underline', $set_with_hover['css'], 'hover decoration is not printed while the shared underline is set' );
		$this->assertStringContainsString( 'line-through', $unset_both['css'], 'unset: today\'s rest output, unchanged' );
		$this->assertStringContainsString( 'text-decoration:underline', $unset_both['css'], 'unset: today\'s hover output, unchanged' );
	}

	public function test_sweep_paints_on_the_label_and_skips_a_button_with_its_own_hover_fill(): void {
		$plain = $this->button( array( 'linkUnderline' => 'sweep' ) );
		$fill  = $this->button( array( 'linkUnderline' => 'sweep', 'colourBackgroundHover' => '#000000' ) );

		$this->assertMatchesRegularExpression( '/\.sgs-button \.sgs-button__label\{background-image:linear-gradient\(currentColor,currentColor\)/', $plain['css'] );
		$this->assertStringNotContainsString( 'linear-gradient(currentColor,currentColor)', $fill['css'] );
	}

	public function test_unset_prints_nothing_new(): void {
		$out = $this->button( array() );
		$this->assertStringNotContainsString( 'text-decoration-line', $out['css'] );
	}
}
