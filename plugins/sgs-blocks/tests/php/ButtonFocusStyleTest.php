<?php
/**
 * sgs/button "Keyboard focus" (focusStyle): Default, Contrast (duotone) or Signature.
 *
 * Contrast adds `sgs-focus--duotone`; Signature adds `sgs-focus--signature`, whose rotating band is the
 * `::before` pseudo-element of the focus system (theme/sgs-theme/assets/css/focus.css). Signature is refused
 * (no class) when something else already owns the button's `::before`: a gradient border
 * (`sgs_border_gradient_css`) or a motion layer whose effect claims the `::before` paint slot (FR-38A-49).
 * A signature button with a border sets `--sgs-focus-host-border` to that width in its scoped rule, so the band
 * sits outside the ring.
 *
 * Run with: vendor/bin/phpunit --filter ButtonFocusStyleTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ButtonFocusStyleTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The class attribute of the rendered button root.
	 *
	 * @param string $html Rendered HTML.
	 * @return string[]
	 */
	private function root_classes( string $html ): array {
		$this->assertSame( 1, preg_match( '/<(?:a|button)\b[^>]*\bclass="([^"]*)"/', $html, $m ), 'the button root renders: ' . $html );
		return preg_split( '/\s+/', trim( $m[1] ) );
	}

	/**
	 * A motion document with one layer of an effect on the root element.
	 *
	 * @param string $effect Effect slug.
	 * @return array<string,mixed>
	 */
	private function motion_with( string $effect ): array {
		return array(
			'elements' => array(
				'root' => array(
					'effects' => array(
						array(
							'id'     => 'l1',
							'effect' => $effect,
							'values' => (object) array(),
						),
					),
				),
			),
		);
	}

	public function test_signature_adds_the_signature_class(): void {
		$out     = $this->render_block(
			'sgs/button',
			array(
				'label'      => 'Go',
				'focusStyle' => 'signature',
			)
		);
		$classes = $this->root_classes( $out['html'] );
		$this->assertContains( 'sgs-focus--signature', $classes );
		$this->assertNotContains( 'sgs-focus--duotone', $classes );
	}

	public function test_duotone_adds_the_duotone_class(): void {
		$out     = $this->render_block(
			'sgs/button',
			array(
				'label'      => 'Go',
				'focusStyle' => 'duotone',
			)
		);
		$classes = $this->root_classes( $out['html'] );
		$this->assertContains( 'sgs-focus--duotone', $classes );
		$this->assertNotContains( 'sgs-focus--signature', $classes );
	}

	public function test_default_adds_neither_class(): void {
		foreach ( array( array(), array( 'focusStyle' => '' ), array( 'focusStyle' => 'sparkle' ) ) as $extra ) {
			$out     = $this->render_block( 'sgs/button', array( 'label' => 'Go' ) + $extra );
			$classes = $this->root_classes( $out['html'] );
			$this->assertNotContains( 'sgs-focus--signature', $classes );
			$this->assertNotContains( 'sgs-focus--duotone', $classes );
		}
	}

	public function test_signature_is_refused_on_a_gradient_border(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'                => 'Go',
				'focusStyle'           => 'signature',
				'borderWidth'          => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
				'borderColourGradient' => 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
			)
		);
		$this->assertStringContainsString( '::before', $out['css'], 'the gradient border owns ::before' );
		$this->assertNotContains( 'sgs-focus--signature', $this->root_classes( $out['html'] ) );
		$this->assertStringNotContainsString( '--sgs-focus-host-border', $out['css'] );
	}

	public function test_signature_is_refused_with_a_motion_effect_that_owns_before(): void {
		foreach ( array( 'cursor-field', 'wave-gradient' ) as $effect ) {
			$out = $this->render_block(
				'sgs/button',
				array(
					'label'      => 'Go',
					'focusStyle' => 'signature',
					'sgsMotion'  => $this->motion_with( $effect ),
				)
			);
			$this->assertNotContains( 'sgs-focus--signature', $this->root_classes( $out['html'] ), $effect . ' owns ::before' );
		}
	}

	public function test_negative_control_an_after_only_effect_keeps_signature(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'      => 'Go',
				'focusStyle' => 'signature',
				'sgsMotion'  => $this->motion_with( 'ripple' ),
			)
		);
		$this->assertContains( 'sgs-focus--signature', $this->root_classes( $out['html'] ), 'ripple owns ::after, not ::before' );
	}

	public function test_duotone_is_never_refused(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'                => 'Go',
				'focusStyle'           => 'duotone',
				'borderWidth'          => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
				'borderColourGradient' => 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
			)
		);
		$this->assertContains( 'sgs-focus--duotone', $this->root_classes( $out['html'] ) );
	}

	public function test_signature_button_with_a_border_sets_the_host_border_width(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'       => 'Go',
				'focusStyle'  => 'signature',
				'borderWidth' => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-btn-[0-9a-f]{8}\.sgs-button\{--sgs-focus-host-border:2px;?\}/', $out['css'] );
		$this->assertStringNotContainsString( 'style="', $out['html'], 'no inline style (Spec 32)' );
	}

	public function test_host_border_follows_the_preset_border_width(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'        => 'Go',
				'focusStyle'   => 'signature',
				'inheritStyle' => 'outline',
			)
		);
		$this->assertStringContainsString( '--sgs-focus-host-border:var(--wp--custom--button-presets--outline--border-width,2px)', $out['css'] );
	}

	public function test_negative_control_no_host_border_without_a_border_or_signature(): void {
		$cases = array(
			array(
				'focusStyle'   => 'signature',
				'inheritStyle' => 'link',
			),
			array(
				'focusStyle'   => 'signature',
				'inheritStyle' => 'custom',
			),
			array(
				'focusStyle'   => 'signature',
				'inheritStyle' => 'primary',
				'borderStyle'  => 'none',
			),
			array(
				'focusStyle'  => 'duotone',
				'borderWidth' => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
			),
			array(
				'borderWidth' => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
			),
		);
		foreach ( $cases as $extra ) {
			$out = $this->render_block( 'sgs/button', array( 'label' => 'Go' ) + $extra );
			$this->assertStringNotContainsString( '--sgs-focus-host-border', $out['css'], (string) json_encode( $extra ) );
		}
	}

	public function test_uneven_border_widths_take_the_widest(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'       => 'Go',
				'focusStyle'  => 'signature',
				'borderWidth' => array(
					'top'    => '1px',
					'bottom' => '3px',
				),
			)
		);
		$this->assertStringContainsString( '--sgs-focus-host-border:max(1px,0px,3px,0px)', $out['css'] );
	}
}
