<?php
/**
 * The built-in button kit: includes/helpers-button-style.php::sgs_button_kit_css prints one built-in button's preset,
 * look, type, min height and shadow from its prefixed attribute set, by composing the shared emitters.
 *
 * Every test runs the real helpers in a child process (as the plugin loads them), with the site's global settings handed in.
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonKitCssTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonKitCssTest extends TestCase {

	private const SEL = '.u .btn';

	private const BREAKOUT = 'red;}body{x:y';

	/**
	 * Site settings: the starter presets with a pressed look, so the press rule exists.
	 *
	 * @param bool $open Whether the site opted in to named presets, with a `gold` one.
	 * @return array<string,mixed>
	 */
	private function settings( bool $open = false ): array {
		$presets = array(
			'primary' => array(
				'active-transform' => 'scale(0.98)',
				'active-shadow'    => 'none',
			),
		);
		if ( $open ) {
			$presets['gold'] = array( 'background' => '#c90' );
			return array(
				'custom' => array(
					'namedButtonPresets' => true,
					'buttonPresets'      => $presets,
				),
			);
		}
		return array( 'custom' => array( 'buttonPresets' => $presets ) );
	}

	/**
	 * Run PHP in a child process with the plugin's render helpers loaded.
	 *
	 * @param array<string,mixed> $settings Global settings.
	 * @param string              $code     PHP to run (it echoes).
	 * @return string Output.
	 */
	private function run_php( array $settings, string $code ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = (string) tempnam( sys_get_temp_dir(), 'sgskit' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require_once ABSPATH . 'includes/helpers-button-preset.php';\n"
			. '$GLOBALS[\'sgs_qa_global_settings\'] = json_decode( ' . var_export( json_encode( $settings ), true ) . ", true );\n" . $code
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/**
	 * The kit's CSS for one attribute set.
	 *
	 * @param array<string,mixed> $attrs    Block attributes.
	 * @param string              $selector Selector.
	 * @param array<string,mixed> $settings Global settings.
	 * @param array<string,mixed> $opts     Kit options.
	 * @return string
	 */
	private function kit( array $attrs, string $selector = self::SEL, ?array $settings = null, array $opts = array() ): string {
		return $this->run_php(
			$settings ?? $this->settings(),
			'echo sgs_button_kit_css( ' . var_export( $attrs, true ) . ", 'x', " . var_export( $selector, true ) . ', ' . var_export( $opts, true ) . ' );'
		);
	}

	public function test_all_unset_prints_nothing(): void {
		$this->assertSame( '', $this->kit( array() ), 'MUST FAIL: no kit attribute, no CSS' );
		$this->assertSame( '', $this->kit( array( 'otherColourBackground' => 'primary', 'xStyle' => '' ) ), 'another prefix and an empty preset print nothing' );
		$this->assertSame( '', $this->kit( array( 'xColourText' => '#fff' ), '' ), 'an empty selector prints nothing' );
	}

	public function test_a_preset_alone_prints_the_preset_the_press_rule_and_the_focus_border(): void {
		$css = $this->kit( array( 'xStyle' => 'primary' ) );

		$this->assertStringContainsString( '.u .btn{background:var(--wp--custom--button-presets--primary--background);', $css, 'MUST FAIL: the whole preset prints' );
		$this->assertStringContainsString( '.u .btn:hover{background:var(--wp--custom--button-presets--primary--hover-background,', $css );
		$this->assertStringContainsString( '.u .btn:active{transform:var(--wp--custom--button-presets--primary--active-transform);', $css, 'MUST FAIL: the pressed look' );
		$this->assertStringContainsString( '.u .btn{--sgs-focus-host-border:var(--wp--custom--button-presets--primary--border-width,2px);}', $css, 'MUST FAIL: the focus border' );
		$this->assertStringNotContainsString( 'font-size', $css, 'nothing but the preset' );
	}

	public function test_outline_prints_through_the_kit_only(): void {
		$css = $this->kit( array( 'xStyle' => 'outline' ) );
		$this->assertStringContainsString( '.u .btn{background:var(--wp--custom--button-presets--outline--background);', $css, 'MUST FAIL: the kit asks for outline' );
		$this->assertStringContainsString( '.u .btn:hover{', $css );

		$this->assertSame( '', $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'the WooCommerce callers still get nothing for outline' );
		$this->assertSame( '', $this->run_php( $this->settings( true ), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'and on an opted-in site' );
		$this->assertStringContainsString( '--button-presets--outline--', $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ".x", "outline", true, true, true );' ), 'MUST FAIL: the new argument prints it' );
	}

	public function test_the_preset_helper_output_is_unchanged_for_its_existing_callers(): void {
		// Length and md5 of what each call printed before the outline argument existed (taken from origin/main's helper).
		$pinned = array(
			array( array( '.x', 'primary' ), 2345, 'f2688adcf315fbef73492612355e38a5' ),
			array( array( '.x', 'secondary' ), 2407, '1377a9bca017451d26b0cce0b11136bf' ),
			array( array( '.x', 'primary', false ), 1741, 'e1741e7c97d1a29a4e2f81f86f67b1c9' ),
			array( array( '.x', 'primary', true, false ), 1965, '74ed510868e41a2f9667e86651dae400' ),
			array( array( '.x,.y', 'secondary' ), 2479, 'ab442b7fecc84f2227b1091c7c5d64a2' ),
			array( array( '.x', 'outline' ), 0, md5( '' ) ),
			array( array( '.x', 'nope' ), 0, md5( '' ) ),
		);
		foreach ( $pinned as list( $args, $length, $hash ) ) {
			$label = json_encode( $args );
			$got   = $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ...' . var_export( $args, true ) . ' );' );
			$this->assertSame( array( $length, $hash ), array( strlen( $got ), md5( $got ) ), 'an existing caller\'s output is byte for byte unchanged: ' . $label );
			if ( 0 !== $length ) {
				$padded = array_merge( $args, array_slice( array( true, true ), count( $args ) - 2 ), array( true ) );
				$same   = $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ...' . var_export( $padded, true ) . ' );' );
				$this->assertSame( $got, $same, 'the outline argument changes nothing for a preset that is not outline: ' . $label );
			}
		}
	}

	public function test_an_unknown_preset_name_prints_nothing_for_the_preset(): void {
		foreach ( array( 'nope', 'link', 'custom', 'Gold', self::BREAKOUT ) as $name ) {
			$this->assertSame( '', $this->kit( array( 'xStyle' => $name ) ), 'MUST FAIL: ' . $name . ' is no preset here' );
		}
		$css = $this->kit( array( 'xStyle' => 'nope', 'xColourText' => '#fff' ) );
		$this->assertSame( '.u .btn{color:#fff;}', $css, 'the look still prints; the preset does not' );
	}

	public function test_a_name_the_site_opted_in_to_prints_its_preset(): void {
		$on = $this->kit( array( 'xStyle' => 'Gold' ), self::SEL, $this->settings( true ) );
		$this->assertStringContainsString( '.u .btn{background:var(--wp--custom--button-presets--gold--background);', $on );
		$this->assertSame( '', $this->kit( array( 'xStyle' => 'Gold' ) ), 'off: the name is refused' );
	}

	public function test_typography_tier_objects_print_per_device_and_never_one_pixel(): void {
		$css = $this->kit(
			array(
				'xFontSize'      => array( 'desktop' => 16, 'tablet' => 14, 'mobile' => 12 ),
				'xLineHeight'    => array( 'desktop' => 1.4, 'mobile' => 1.2 ),
				'xLetterSpacing' => array( 'desktop' => 0.05 ),
				'xFontWeight'    => '700',
				'xTextTransform' => 'uppercase',
			)
		);
		$this->assertStringContainsString( '.u .btn{font-size:16px;line-height:1.4;letter-spacing:0.05em;}', $css, 'MUST FAIL: desktop prints' );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023\.98px[^{]*\{\.u \.btn\{font-size:14px;\}\}/', $css, 'tablet' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.btn\{font-size:12px;line-height:1\.2;\}\}/', $css, 'mobile' );
		$this->assertStringContainsString( '.u .btn{font-weight:700;text-transform:uppercase;}', $css );
		$this->assertStringNotContainsString( 'font-size:1px', $css, 'MUST FAIL: an object never reaches the legacy absint path' );
		$this->assertStringNotContainsString( 'font-size:var(--wp--preset--font-size--array)', $css );
	}

	public function test_min_height_prints_per_device(): void {
		$css = $this->kit( array( 'xMinHeight' => array( 'desktop' => 48, 'tablet' => 44, 'mobile' => '30' ) ) );
		$this->assertStringContainsString( '.u .btn{min-height:48px;}', $css, 'MUST FAIL' );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023\.98px[^{]*\{\.u \.btn\{min-height:44px;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.btn\{min-height:[^;]*30[^;]*;\}\}/', $css, 'a bare slug is the spacing preset' );
		$this->assertSame( '', $this->kit( array( 'xMinHeight' => array() ) ), 'an empty object prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xMinHeight' => '48px' ) ), 'a scalar is not a tier object: nothing' );
	}

	public function test_the_shadow_prints_resting_and_hover_and_feeds_the_focus_ring(): void {
		$css = $this->kit(
			array(
				'xShadow'            => '0 4px 12px 0',
				'xShadowColour'      => '#112233',
				'xShadowHover'       => '0 8px 20px 0',
				'xShadowColourHover' => '#445566',
			)
		);
		$this->assertStringContainsString( '.u .btn{box-shadow:0px 4px 12px 0px #112233;--sgs-focus-under:0px 4px 12px 0px #112233;', $css, 'MUST FAIL: resting, and handed to the focus ring' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:hover{box-shadow:0px 8px 20px 0px #445566;--sgs-focus-under:0px 8px 20px 0px #445566;}', $css, 'MUST FAIL: hover, behind the touch guard' );
	}

	public function test_a_resting_shadow_alone_takes_the_automatic_hover_lift(): void {
		$css = $this->kit( array( 'xShadow' => '0 4px 12px 0', 'xShadowColour' => '#112233' ) );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:hover{box-shadow:', $css );
		$this->assertSame( '', $this->kit( array( 'xShadowColour' => '#112233' ) ), 'negative control: a colour with no shape prints nothing' );
	}

	public function test_colours_print_and_the_hover_is_behind_the_touch_guard(): void {
		$css = $this->kit(
			array(
				'xColourBackground'      => 'primary',
				'xColourText'            => '#ffffff',
				'xColourBorder'          => '#000000',
				'xColourBackgroundHover' => '#112233',
				'xColourTextHover'       => '#eeeeee',
				'xColourBorderHover'     => '#ff0000',
			)
		);
		$this->assertStringContainsString( '.u .btn{background-color:var(--wp--preset--color--primary, currentColor);color:#ffffff;border-color:#000000;}', $css, 'MUST FAIL' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:hover{background-color:#112233;color:#eeeeee;border-color:#ff0000;}', $css, 'MUST FAIL: the guarded hover' );
		$this->assertStringContainsString( '.u .btn:focus-visible{background-color:#112233;color:#eeeeee;border-color:#ff0000;}', $css, 'keyboard focus is not guarded' );
		$this->assertDoesNotMatchRegularExpression( '/(?<!\) )\.u \.btn:hover\{/', $css, 'no unguarded hover rule' );
	}

	public function test_a_border_and_padding_and_width_print_through_the_look_step(): void {
		$css = $this->kit(
			array(
				'xBorderStyle'  => 'dashed',
				'xBorderWidth'  => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
				'xBorderRadius' => array( 'desktop' => array( 'topLeft' => '4px' ) ),
				'xPadding'      => array( 'desktop' => array( 'top' => '10px', 'right' => '20px', 'bottom' => '10px', 'left' => '20px' ) ),
				'xWidthType'    => 'full',
			)
		);
		$this->assertStringContainsString( 'border-style:dashed;border-width:2px 2px 2px 2px;', $css );
		$this->assertStringContainsString( 'border-top-left-radius:4px;', $css, 'MUST FAIL: a per-device radius prints' );
		$this->assertStringContainsString( 'padding-top:10px;', $css, 'MUST FAIL: a per-device padding prints' );
		$this->assertStringContainsString( 'width:100%;', $css );
		$this->assertStringContainsString( '.u .btn{--sgs-focus-host-border:2px;}', $css, 'the border width reaches the focus ring' );
	}

	public function test_the_values_the_panel_writes_print(): void {
		// tests/fixtures/button-kit/panel-values.json is what tests/js/builtin-button-panel.test.js proves the panel writes.
		$panel = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/button-kit/panel-values.json' ), true )['values'];
		$attrs = array();
		foreach ( $panel as $base => $value ) {
			$attrs[ 'x' . $base ] = $value;
		}
		$css = $this->kit( $attrs );
		$this->assertStringContainsString( 'padding-top:4px;padding-right:6px;padding-bottom:4px;padding-left:6px;', $css, 'MUST FAIL: the padding the panel writes prints' );
		$this->assertStringContainsString( 'border-top-left-radius:8px;', $css, 'MUST FAIL: the radius the panel writes prints' );
		$this->assertStringContainsString( 'border-width:1px 1px 1px 1px;', $css, 'the border width the panel writes prints' );

		$tiers = $this->kit(
			array(
				'xPadding'      => array( 'desktop' => $panel['Padding']['desktop'], 'mobile' => array( 'top' => '2px' ) ),
				'xBorderRadius' => array( 'desktop' => $panel['BorderRadius']['desktop'], 'tablet' => array( 'topLeft' => '2px' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.btn\{padding-top:2px;\}\}/', $tiers, 'a mobile padding side prints under the mobile query only' );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023\.98px[^{]*\{\.u \.btn\{[^}]*border-top-left-radius:2px;/', $tiers, 'a tablet radius prints under the tablet query' );

		$this->assertSame( '', $this->kit( array( 'xPadding' => array( 'desktop' => array() ), 'xBorderRadius' => array( 'desktop' => array(), 'tablet' => array() ) ) ), 'empty boxes print nothing' );
	}

	public function test_a_gradient_group_key_prints(): void {
		$css = $this->kit( array( 'xColourBackgroundGradient' => 'linear-gradient(90deg,#000,#fff)' ) );
		$this->assertStringContainsString( '.u .btn{background-image:linear-gradient(90deg,#000,#fff);}', $css, 'MUST FAIL' );
		$hover = $this->kit( array( 'xColourBackgroundHoverGradient' => 'linear-gradient(90deg,#111,#eee)' ) );
		$this->assertStringContainsString( '.u .btn:hover{background-image:linear-gradient(90deg,#111,#eee);}', $hover );
		$layer = $this->kit( array( 'xColourBackgroundGradient' => 'linear-gradient(90deg,#000,#fff)' ), self::SEL, null, array( 'bg_layer' => true ) );
		$this->assertStringContainsString( '.u .btn::after{', $layer, 'the bg_layer option passes to the look step' );
	}

	public function test_a_comma_separated_selector_scopes_every_state_on_every_part(): void {
		$css = $this->kit(
			array(
				'xStyle'                 => 'primary',
				'xColourBackgroundHover' => '#112233',
				'xShadow'                => '0 4px 12px 0',
				'xShadowColour'          => '#112233',
			),
			'.u .a, .u .b'
		);
		$this->assertStringContainsString( '.u .a:active{', $css, 'MUST FAIL: the press rule on the first part' );
		$this->assertStringContainsString( '.u .b:active{', $css, 'MUST FAIL: and on the last' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .a:hover,:where(:root:not(.sgs-touch-input)) .u .b:hover{background-color:#112233;}', $css );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .a:hover,:where(:root:not(.sgs-touch-input)) .u .b:hover{box-shadow:', $css, 'the hover shadow on both parts' );
		$this->assertStringNotContainsString( ', .u .b:hover', $css, 'no state suffix on the last part alone' );
	}

	public function test_a_value_that_tries_to_break_out_of_the_css_is_refused_or_escaped(): void {
		$bad   = self::BREAKOUT;
		$attrs = array(
			'xStyle'                       => $bad,
			'xColourBackground'            => $bad,
			'xColourText'                  => $bad,
			'xColourBorder'                => $bad,
			'xColourBackgroundHover'       => $bad,
			'xColourBackgroundGradient'    => $bad,
			'xColourBorderGradient'        => $bad,
			'xBorderStyle'                 => $bad,
			'xBorderWidth'                 => array( 'top' => $bad ),
			'xBorderRadius'                => array( 'topLeft' => $bad ),
			'xPadding'                     => array( 'top' => $bad ),
			'xWidthType'                   => $bad,
			'xFontFamily'                  => $bad,
			'xFontWeight'                  => $bad,
			'xFontStyle'                   => $bad,
			'xTextTransform'               => $bad,
			'xTextDecoration'              => $bad,
			'xFontSize'                    => array( 'desktop' => $bad ),
			'xLineHeight'                  => array( 'desktop' => $bad ),
			'xLetterSpacing'               => array( 'desktop' => $bad ),
			'xMinHeight'                   => array( 'desktop' => $bad, 'tablet' => $bad ),
			'xShadow'                      => $bad,
			'xShadowColour'                => $bad,
			'xShadowHover'                 => $bad,
			'xShadowColourHover'           => $bad,
		);
		$css   = $this->kit( $attrs );
		$this->assertStringNotContainsString( '}body', $css, 'MUST FAIL: no value closes the rule' );
		$this->assertStringNotContainsString( 'x:y', $css );
		$this->assertStringNotContainsString( ';}body{', $css );
		$this->assertSame( substr_count( $css, '{' ), substr_count( $css, '}' ), 'every brace the CSS opens it closes' );
		$this->assertStringNotContainsString( 'min-height', $css, 'an unsafe length is refused' );
		$this->assertStringNotContainsString( 'box-shadow', $css, 'an unsafe shadow is refused' );
	}
}
