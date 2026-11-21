<?php
/**
 * sgs/choice-flow's six buttons (Back, Skip, Continue, Add to basket, Buy now, Close) on the built-in button kit (Spec 43
 * FR-43-28): a preset chosen for a button prints as the kit's shared rule and puts its classes on that button alone, a colour
 * set prints on the button's scoped selector, Back's per-device radius prints per device, and the stylesheet's lone-Add-to-basket
 * rule no longer out-ranks a look set on the button. With every setting unset the render is what
 * ChoiceFlowFooterPinTest pins.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowButtonKitTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowButtonKitTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** Render the flow with its block.json defaults applied. */
	private function flow( array $attrs ): array {
		return $this->render_block( 'sgs/choice-flow', $attrs, array(), array(), '', true );
	}

	/** The class attribute of the first button carrying `$class`. */
	private static function button_classes( string $html, string $class ): string {
		return 1 === preg_match( '/<button type="button" class="([^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*)"/', $html, $m ) ? $m[1] : '';
	}

	/** The rule bodies printed for `$selector_tail` (a class selector chained onto the scoped root or the minted classes). */
	private static function rules_for( string $css, string $selector_tail ): array {
		preg_match_all( '/([^{}]*' . preg_quote( $selector_tail, '/' ) . '(?::[a-z-]+)?)\{([^}]*)\}/', $css, $m, PREG_SET_ORDER );
		return array_map( static fn( array $r ): array => array( trim( $r[1] ), $r[2] ), $m );
	}

	public function test_a_preset_chosen_for_add_to_basket_prints_the_shared_rule_and_marks_that_button_only(): void {
		$out = $this->flow( array( 'addToBasketStyle' => 'primary' ) );
		$cls = self::button_classes( $out['html'], 'sgs-choice-flow__add-to-basket' );
		$this->assertMatchesRegularExpression( '/\bsgs-btn-kit-[0-9a-f]{8}\b/', $cls, 'Add to basket carries the preset class' );
		preg_match( '/sgs-btn-kit-[0-9a-f]{8}/', $cls, $m );
		$this->assertStringContainsString( '.' . $m[0] . '.' . $m[0] . '.sgs-choice-flow__add-to-basket{', $out['css'], 'the shared rule is the class doubled on the button' );
		foreach ( array( 'sgs-choice-flow__continue', 'sgs-choice-flow__buy-now', 'sgs-choice-flow__nav-back' ) as $other ) {
			$this->assertStringNotContainsString( 'sgs-btn-kit-', self::button_classes( $out['html'], $other ), "{$other} is untouched" );
		}
	}

	public function test_the_preset_prints_its_hover_colours_so_hover_stays_readable(): void {
		$out = $this->flow( array( 'addToBasketStyle' => 'secondary' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-btn-kit-[0-9a-f]{8}\.sgs-btn-kit-[0-9a-f]{8}\.sgs-choice-flow__add-to-basket:hover\{[^}]*color:var\(--wp--custom--button-presets--secondary--hover-text/', $out['css'], 'the hover text colour is printed with the hover fill' );
		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__add-to-basket:focus-visible\{[^}]*background:/', $out['css'], 'and on keyboard focus' );
	}

	public function test_a_colour_set_on_a_button_prints_on_its_scoped_selector(): void {
		$out   = $this->flow( array( 'continueColourBackground' => 'accent', 'continueColourText' => 'surface' ) );
		$rules = self::rules_for( $out['css'], '.sgs-choice-flow__continue' );
		$this->assertNotEmpty( $rules, 'a Continue rule prints' );
		$this->assertStringContainsString( '.wp-block-sgs-choice-flow .sgs-choice-flow__continue', $rules[0][0], 'scoped to the flow: weighs 3 classes against the stylesheet\'s 1' );
		$this->assertStringContainsString( 'background-color:var(--wp--preset--color--accent', $rules[0][1] );
		$this->assertStringContainsString( 'color:var(--wp--preset--color--surface', $rules[0][1] );
		$this->assertStringNotContainsString( 'sgs-btn-kit-', self::button_classes( $out['html'], 'sgs-choice-flow__continue' ), 'no preset chosen: no preset class' );
	}

	public function test_the_lone_add_to_basket_rule_no_longer_out_ranks_a_set_look(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/choice-flow/style.css' );
		$this->assertSame( 0, preg_match( '/^\.sgs-choice-flow__footer-actions:has\(/m', $css ), 'no rule starts with the row\'s :has() condition outside :where()' );
		$this->assertSame( 2, substr_count( $css, ':where(.sgs-choice-flow__footer-actions:has(> .sgs-choice-flow__buy-now[hidden])) .sgs-choice-flow__add-to-basket' ), 'the resting rule and the hover rule both keep the condition in :where()' );
	}

	public function test_the_close_button_takes_its_own_preset_and_keeps_its_variant_class(): void {
		$out = $this->flow( array( 'showHeader' => true, 'closeButtonStyle' => 'secondary', 'closeStyle' => 'text' ) );
		$cls = self::button_classes( $out['html'], 'sgs-choice-flow__chrome-close' );
		$this->assertStringContainsString( 'sgs-choice-flow__chrome-close--text', $cls, 'closeStyle still chooses the variant' );
		$this->assertMatchesRegularExpression( '/\bsgs-btn-kit-[0-9a-f]{8}\b/', $cls );
		$icon = $this->flow( array( 'showHeader' => true, 'closeStyle' => 'icon' ) );
		$this->assertStringNotContainsString( 'sgs-btn-kit-', self::button_classes( $icon['html'], 'sgs-choice-flow__chrome-close' ) );
	}

	public function test_the_skip_link_takes_a_preset(): void {
		$out = $this->flow( array( 'skipLabel' => 'Skip', 'skipStyle' => 'outline' ) );
		$this->assertMatchesRegularExpression( '/\bsgs-btn-kit-[0-9a-f]{8}\b/', self::button_classes( $out['html'], 'sgs-choice-flow__skip-button' ) );
	}

	public function test_an_unknown_preset_name_changes_nothing(): void {
		$base = $this->flow( array() );
		$out  = $this->flow( array( 'continueStyle' => 'no-such-preset' ) );
		// The instance id hashes the attributes, so it differs; everything else is equal.
		$mask = static fn( string $text ): string => preg_replace( '/sgs-choice-flow-[0-9a-f]{8}/', 'sgs-choice-flow-UID', $text );
		$this->assertSame( $mask( $base['html'] ), $mask( $out['html'] ) );
		$this->assertSame( $mask( $base['css'] ), $mask( $out['css'] ) );
	}

	public function test_back_prints_its_radius_per_device(): void {
		$radius = static fn( string $px ): array => array( 'topLeft' => $px, 'topRight' => $px, 'bottomRight' => $px, 'bottomLeft' => $px );
		$out    = $this->flow( array( 'backBorderRadius' => array( 'desktop' => $radius( '6px' ), 'tablet' => $radius( '14px' ), 'mobile' => $radius( '0px' ) ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__nav-back\{[^}]*border-top-left-radius:6px/', $out['css'], 'the desktop radius is in the base rule' );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\.sgs-choice-flow__nav-back\{[^}]*border-top-left-radius:14px/', $out['css'], 'the tablet radius prints in a tablet media rule' );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\.sgs-choice-flow__nav-back\{[^}]*border-top-left-radius:0px/', $out['css'], 'and the mobile one in a mobile rule' );
	}

	public function test_back_with_a_preset_drops_its_default_colours(): void {
		$out = $this->flow( array( 'backStyle' => 'primary' ) );
		$this->assertMatchesRegularExpression( '/\bsgs-btn-kit-[0-9a-f]{8}\b/', self::button_classes( $out['html'], 'sgs-choice-flow__nav-back' ) );
		$this->assertDoesNotMatchRegularExpression( '/\.wp-block-sgs-choice-flow \.sgs-choice-flow__nav-back\{[^}]*(color|border-color):/', $out['css'], 'the default ink-and-paper pair no longer paints over the preset' );
	}

	public function test_back_keeps_a_colour_the_author_set_under_a_preset(): void {
		$out = $this->flow( array( 'backStyle' => 'primary', 'backColourBorder' => 'accent' ) );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-choice-flow \.sgs-choice-flow__nav-back\{[^}]*border-color:var\(--wp--preset--color--accent/', $out['css'] );
	}

	public function test_back_prints_padding_and_type_from_the_kit(): void {
		$out = $this->flow( array( 'backPadding' => array( 'desktop' => array( 'top' => '4px', 'right' => '9px', 'bottom' => '4px', 'left' => '9px' ) ), 'backFontSize' => array( 'desktop' => '17' ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__nav-back\{[^}]*padding[^}]*9px/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__nav-back\{[^}]*font-size:17px/', $out['css'] );
	}
}
