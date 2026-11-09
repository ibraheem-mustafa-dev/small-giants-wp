<?php
/**
 * WooCommerce buttons take the full button preset (resting, hover colours, lift and timing) from one shared helper,
 * and a block's own link decoration switches the global underline sweep off for the same links.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonPresetCssTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonPresetCssTest extends TestCase {

	private const LOGIN  = '.x .sgs-account__wc form .woocommerce-form-login__submit';
	private const REG    = '.x .sgs-account__wc form .woocommerce-form-register__submit';
	private const SECOND = '--wp--custom--button-presets--secondary--';
	private const FIRST  = '--wp--custom--button-presets--primary--';

	/**
	 * Run a PHP snippet with the plugin's helpers loaded and return what it prints.
	 *
	 * @param string $code Snippet body (after the includes).
	 */
	private function run_php( string $code ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = tempnam( sys_get_temp_dir(), 'sgsbp' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require ABSPATH . 'includes/account/helpers-account-look-css.php';\n"
			. "require ABSPATH . 'includes/woocommerce/commerce-look/writer.php';\n" . $code
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/**
	 * @param array<string, mixed> $attrs Account block attributes.
	 */
	private function account( array $attrs ): string {
		return $this->run_php( 'echo sgs_account_login_look_css( json_decode( ' . var_export( json_encode( $attrs ), true ) . ', true ), ".x" );' );
	}

	private function assertFullPreset( string $css, string $selector, string $vars ): void {
		$this->assertStringContainsString( $selector . ':hover{', $css, "{$selector} has a hover rule" );
		$this->assertStringContainsString( 'transform:var(' . $vars . 'hover-lift,translateY(-3px))', $css, 'hover lift token with the 3px fallback' );
		$this->assertStringContainsString( 'transition:background-color var(' . $vars . 'hover-transition,0.25s) var(' . $vars . 'hover-easing,ease)', $css, 'hover timing with the 0.25s fallback' );
	}

	public function test_sign_in_and_create_account_take_their_own_full_preset(): void {
		$css = $this->account(
			array(
				'loginButtonPreset'    => 'primary',
				'registerButtonPreset' => 'secondary',
			)
		);
		$this->assertFullPreset( $css, self::LOGIN, self::FIRST );
		$this->assertFullPreset( $css, self::REG, self::SECOND );
		$this->assertStringNotContainsString( self::REG . '{background:var(' . self::FIRST, $css, 'the register button does not take the sign-in preset' );
	}

	public function test_all_forms_scope_gives_every_form_button_the_login_preset(): void {
		$css = $this->account(
			array(
				'loginButtonPreset' => 'primary',
				'loginButtonScope'  => 'all-forms',
			)
		);
		$this->assertFullPreset( $css, self::REG, self::FIRST );
		$this->assertFullPreset( $css, '.x .sgs-account__wc form.woocommerce-EditAccountForm button[type="submit"]', self::FIRST );
	}

	public function test_nothing_prints_without_a_preset(): void {
		$this->assertSame( '', $this->account( array() ) );
	}

	public function test_a_cart_button_gets_the_same_motion(): void {
		$css = $this->run_php( 'echo \SGS\Blocks\sgs_commerce_look_css( array( "sgsButtonBorderStyle" => "solid" ), "cart", "sgs-x" );' );
		$this->assertFullPreset( $css, '.sgs-x .wp-block-woocommerce-proceed-to-checkout-block .wp-element-button', self::FIRST );
	}

	public function test_link_decoration_switches_the_sweep_off_for_the_same_links(): void {
		$css = $this->account( array( 'loginLinkTextDecoration' => 'underline' ) );
		$this->assertStringContainsString( '.x .sgs-account__wc form .lost_password a{text-decoration:underline;}', $css, 'the decoration prints' );
		$this->assertStringContainsString( '.x .sgs-account__wc form .lost_password a::after{content:none;}', $css, 'the sweep is off for the lost-password link' );
		$this->assertStringContainsString( '.x .sgs-account__wc form .woocommerce-privacy-policy-text a::after{content:none;}', $css, 'the sweep is off for the privacy link' );
	}

	public function test_no_decoration_leaves_the_sweep_alone(): void {
		$css = $this->account( array( 'loginLinkColour' => 'text' ) );
		$this->assertStringNotContainsString( '::after', $css );
	}
}
