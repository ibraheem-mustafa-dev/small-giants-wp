<?php
/**
 * The text-family blocks and the button store a size as one length string per device: sgs/text and sgs/heading
 * (maxWidth, customWidth), sgs/button (customWidth for a custom width type, minHeight) and sgs/modal (dialogWidth).
 * Desktop prints in the base rule, a different mobile value prints in the 767px media query, and a keyword the
 * property accepts prints as it is.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter TextLengthStringTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TextLengthStringTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @return array<string, array{0: string, 1: array<string, mixed>, 2: string}>
	 */
	public static function text_family(): array {
		return array(
			'text'    => array( 'sgs/text', array( 'text' => 'Fresh bread' ), 'text' ),
			'heading' => array( 'sgs/heading', array( 'content' => 'Fresh bread' ), 'heading' ),
		);
	}

	/**
	 * @dataProvider text_family
	 * @param array<string, mixed> $base Attributes every render needs.
	 */
	public function test_max_width_and_custom_width_print_per_device( string $slug, array $base ): void {
		$css = $this->render_block(
			$slug,
			array_merge(
				$base,
				array(
					'maxWidth'    => array( 'desktop' => '40rem', 'mobile' => '90%' ),
					'customWidth' => array( 'desktop' => '320px', 'mobile' => 'auto' ),
				)
			)
		)['css'];

		$this->assertMatchesRegularExpression( '/max-width:40rem/', $css, 'desktop max width' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*max-width:90%/', $css, 'mobile max width' );
		$this->assertMatchesRegularExpression( '/[;{]width:320px/', $css, 'desktop custom width' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*[;{]width:auto/', $css, 'a keyword prints as it is' );
	}

	public function test_a_text_max_width_still_centres_the_block(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'Fresh bread', 'maxWidth' => array( 'mobile' => '90%' ) ) )['css'];
		$this->assertStringContainsString( 'margin-inline:auto', $css );
	}

	public function test_button_custom_width_and_min_height_print_per_device(): void {
		$css = $this->render_block(
			'sgs/button',
			array(
				'label'       => 'Book',
				'widthType'   => array( 'desktop' => 'custom', 'mobile' => 'custom' ),
				'customWidth' => array( 'desktop' => '240px', 'mobile' => '80%' ),
				'minHeight'   => array( 'desktop' => '3rem', 'mobile' => '56px' ),
			)
		)['css'];

		$this->assertMatchesRegularExpression( '/\.sgs-button\{width:240px/', $css, 'desktop width' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*width:80%/', $css, 'mobile width' );
		$this->assertStringContainsString( 'min-height:3rem', $css, 'desktop min height' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*min-height:56px/', $css, 'mobile min height' );
	}

	public function test_button_min_height_falls_back_to_48px_and_refuses_a_hostile_value(): void {
		$none = $this->render_block( 'sgs/button', array( 'label' => 'Book' ) )['css'];
		$this->assertStringContainsString( 'min-height:48px', $none );
		$bad = $this->render_block( 'sgs/button', array( 'label' => 'Book', 'minHeight' => array( 'desktop' => '9px;}body{color:red' ) ) )['css'];
		$this->assertStringNotContainsString( 'body{', $bad );
		$this->assertStringContainsString( 'min-height:48px', $bad );
	}

	public function test_modal_dialog_width_prints_per_device(): void {
		$css = $this->render_block( 'sgs/modal', array( 'dialogWidth' => array( 'desktop' => '640px', 'mobile' => '95vw' ) ) )['css'];

		$this->assertMatchesRegularExpression( '/sgs-modal__dialog\{[^}]*width:640px/', $css, 'desktop width' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*sgs-modal__dialog\{[^}]*width:95vw/', $css, 'mobile width' );
		$this->assertStringContainsString( 'max-width:calc(100vw - 2rem)', $css );
	}

	/**
	 * The clamp travels with the width: a dialog with a width on mobile only keeps its variant's own max-width on
	 * desktop and tablet, and clamps on mobile.
	 */
	public function test_modal_clamp_prints_only_where_a_width_is_set(): void {
		$css = $this->render_block( 'sgs/modal', array( 'dialogWidth' => array( 'mobile' => '90%' ) ) )['css'];

		$base = preg_replace( '/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/', '', $css );
		$this->assertStringNotContainsString( 'max-width:calc(100vw - 2rem)', $base, 'no clamp outside the mobile query' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*sgs-modal__dialog\{[^}]*max-width:calc\(100vw - 2rem\)/', $css, 'the clamp in the mobile query' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^@]*sgs-modal__dialog\{[^}]*width:90%/', $css, 'control: the mobile width prints' );
	}
}
