<?php
/**
 * The button's pressed look and its reduced-motion reset are shared rules read through marker classes, not rules under
 * every button's uid (Stage C, plan `.claude/plans/2026-11-19-stage-c-per-instance-css.md` Task 2).
 *
 * Each test renders the real `sgs/button` render.php through the CSS harness. MUST FAIL cases are marked: each goes red
 * when the rule it names is removed.
 *
 * Run with: vendor/bin/phpunit --filter ButtonSharedRulesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ButtonSharedRulesTest extends TestCase {

	/** Tokens: primary and secondary press differently; outline sets none of its own and falls back to default. */
	private const SETTINGS = array(
		'custom' => array(
			'buttonPresets' => array(
				'primary'   => array( 'active-transform' => 'scale(.98)', 'active-shadow' => 'none' ),
				'secondary' => array( 'active-shadow' => '0 1px 2px #000' ),
				'default'   => array( 'active-transform' => 'translateY(1px)' ),
			),
		),
	);

	/**
	 * Render sgs/button through the harness.
	 *
	 * @param array<string,mixed> $attrs    Block attributes.
	 * @param array<string,mixed> $settings Global settings.
	 * @return array{html:string,css:string}
	 */
	private function render( array $attrs, array $settings = self::SETTINGS ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		try {
			foreach ( array( 'attrs' => (object) $attrs, 'settings' => $settings ) as $key => $data ) {
				$files[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgsbs' );
				file_put_contents( $files[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
			}
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/button --attrs-file ' . escapeshellarg( $files['attrs'] ) . ' --global-settings-file ' . escapeshellarg( $files['settings'] ) . ' 2>&1' );
		} finally {
			foreach ( $files as $file ) {
				unlink( $file );
			}
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	private static function root_class( string $html ): string {
		self::assertSame( 1, preg_match( '/<(?:a|button|span)\b[^>]*\bclass="([^"]*)"/', $html, $m ), 'a root element with a class' );
		return $m[1];
	}

	/** @return string[] the `<style>` tag contents in document order. */
	private static function style_tags( string $html ): array {
		preg_match_all( '#<style[^>]*>(.*?)</style>#s', $html, $m );
		return $m[1];
	}

	private function attrs( string $style, string $label = 'Go' ): array {
		return array(
			'label'        => $label,
			'url'          => '/x',
			'inheritStyle' => $style,
		);
	}

	public function test_equal_value_is_skipped_the_button_prints_no_press_rule_under_its_own_uid(): void {
		$r = $this->render( $this->attrs( 'primary' ) );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-btn-[0-9a-f]{8}\.sgs-btn-[0-9a-f]{8}\.sgs-button:active/', $r['css'], 'MUST FAIL: no :active rule under the button\'s uid' );
		$this->assertStringContainsString( 'sgs-btn-press-', self::root_class( $r['html'] ), 'MUST FAIL: the button wears its pressed look\'s marker' );
		$this->assertSame( 1, preg_match( '/\.(sgs-btn-press-[0-9a-f]{8})\.\1\.sgs-button:active\{transform:var\(--wp--custom--button-presets--primary--active-transform\);box-shadow:var\(--wp--custom--button-presets--primary--active-shadow\);--sgs-focus-under:var\(--wp--custom--button-presets--primary--active-shadow\);\}/', $r['css'] ), 'MUST FAIL: the same declarations as the per-uid rule had, under the marker doubled (0,4,0 with :active)' );
	}

	public function test_the_pressed_look_is_the_same_text_for_buttons_of_one_style_and_differs_for_another(): void {
		$a = $this->render( $this->attrs( 'primary', 'One' ) );
		$b = $this->render( $this->attrs( 'primary', 'Two' ) );
		$c = $this->render( $this->attrs( 'secondary' ) );
		$press = static function ( array $r ): string {
			foreach ( self::style_tags( $r['html'] ) as $css ) {
				if ( str_contains( $css, ':active' ) ) {
					return $css;
				}
			}
			return '';
		};
		$this->assertNotSame( '', $press( $a ) );
		$this->assertSame( $press( $a ), $press( $b ), 'MUST FAIL: identical text, so the collector keeps one copy' );
		$this->assertNotSame( $press( $a ), $press( $c ), 'MUST FAIL: a different pressed look keeps its own rule and class' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--secondary--active-shadow)', $press( $c ) );
		$marker = static function ( array $r ): string {
			preg_match( '/sgs-btn-press-[0-9a-f]{8}/', self::root_class( $r['html'] ), $m );
			return $m[0] ?? '';
		};
		$this->assertNotSame( '', $marker( $a ) );
		$this->assertSame( $marker( $a ), $marker( $b ), 'MUST FAIL: buttons of one pressed look share one class' );
		$this->assertNotSame( $marker( $a ), $marker( $c ), 'MUST FAIL: a different pressed look never reuses a class' );
	}

	public function test_a_style_with_no_press_token_gets_no_press_marker(): void {
		$r = $this->render( $this->attrs( 'link' ) );
		$this->assertStringNotContainsString( 'sgs-btn-press-', $r['html'], 'MUST FAIL: the link style never presses' );
		$this->assertStringNotContainsString( ':active', $r['css'] );
		$r = $this->render( $this->attrs( 'primary' ), array() );
		$this->assertStringNotContainsString( 'sgs-btn-press-', $r['html'], 'MUST FAIL: no tokens at all, no rule' );
	}

	public function test_a_style_with_no_token_of_its_own_takes_the_default_look_like_before(): void {
		$r = $this->render( $this->attrs( 'outline' ) );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--default--active-transform)', $r['css'], 'MUST FAIL: outline falls back to the default press, as the per-uid rule did' );
	}

	public function test_the_reduced_motion_reset_keeps_its_specificity_and_importance(): void {
		$r = $this->render( $this->attrs( 'primary' ) );
		$this->assertStringContainsString( 'sgs-button--still', self::root_class( $r['html'] ), 'MUST FAIL: the button holds still under reduced motion' );
		$this->assertStringContainsString(
			'@media(prefers-reduced-motion:reduce){.sgs-button--still.sgs-button{transition:none !important;transform:none !important;translate:none !important;}}',
			$r['css'],
			'MUST FAIL: marker plus .sgs-button is (0,2,0), the specificity of the old .uid.sgs-button, with all three declarations !important'
		);
		$this->assertDoesNotMatchRegularExpression( '/prefers-reduced-motion:reduce\)\{\.sgs-btn-[0-9a-f]{8}\.sgs-button/', $r['css'], 'MUST FAIL: no reset under the uid' );
	}

	public function test_the_reduced_motion_reset_is_the_same_text_for_every_button(): void {
		$a = $this->render( $this->attrs( 'primary', 'One' ) );
		$b = $this->render( $this->attrs( 'secondary', 'Two' ) );
		$still = static fn ( array $r ): array => array_values( array_filter( self::style_tags( $r['html'] ), static fn ( string $c ): bool => str_contains( $c, 'prefers-reduced-motion' ) ) );
		$this->assertCount( 1, $still( $a ) );
		$this->assertSame( $still( $a ), $still( $b ), 'MUST FAIL: identical text in two buttons' );
	}
}
