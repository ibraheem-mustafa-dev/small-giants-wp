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
	 * @param bool                $open    Whether the site opted in to named presets, with a `gold` one.
	 * @param array<string,string> $primary Roles to set on the primary preset besides its pressed look.
	 * @return array<string,mixed>
	 */
	private function settings( bool $open = false, array $primary = array() ): array {
		$presets = array(
			'primary' => $primary + array(
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
			'echo sgs_button_kit_css( ' . var_export( $attrs, true ) . ", 'x', " . var_export( $selector, true ) . ', ' . var_export( $opts + array( 'element' => '.btn' ), true ) . ' );'
		);
	}

	/** The minted class of the shared preset rule in a kit's CSS, or ''. */
	private static function kit_class( string $css ): string {
		return 1 === preg_match( '/sgs-btn-kit-[0-9a-f]{8}/', $css, $m ) ? $m[0] : '';
	}

	/** The fenced shared group that holds the preset rule (the text between the first fence pair). */
	private static function preset_group( string $css ): string {
		return 1 === preg_match( '#/\*sgs-shared\*/(.*?)/\*sgs-shared-end\*/#s', $css, $m ) ? $m[1] : '';
	}

	public function test_all_unset_prints_nothing(): void {
		$this->assertSame( '', $this->kit( array() ), 'MUST FAIL: no kit attribute, no CSS' );
		$this->assertSame( '', $this->kit( array( 'otherColourBackground' => 'primary', 'xStyle' => '' ) ), 'another prefix and an empty preset print nothing' );
		$this->assertSame( '', $this->kit( array( 'xColourText' => '#fff' ), '' ), 'an empty selector prints nothing' );
	}

	public function test_a_preset_alone_prints_the_preset_as_a_shared_rule_the_press_rule_and_the_focus_border(): void {
		$css   = $this->kit( array( 'xStyle' => 'primary' ) );
		$class = self::kit_class( $css );
		$this->assertNotSame( '', $class, 'MUST FAIL: the preset gets a minted class' );
		$this->assertStringContainsString( '/*sgs-shared*/.' . $class . '.' . $class . '.btn{background:var(--wp--custom--button-presets--primary--background);', $css, 'MUST FAIL: the whole preset prints, fenced, on the doubled minted class chained to the element' );
		$this->assertStringNotContainsString( '.u .btn{background:var(--wp--custom--button-presets--primary', $css, 'the preset no longer prints under the instance selector' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .' . $class . '.' . $class . '.btn:hover{background:var(--wp--custom--button-presets--primary--hover-background,', $css, 'MUST FAIL: the hover colours are behind the touch guard' );
		$this->assertStringContainsString( '.' . $class . '.' . $class . '.btn:focus-visible{background:var(--wp--custom--button-presets--primary--hover-background,', $css, 'MUST FAIL: and have a keyboard-focus twin' );
		preg_match( '/sgs-btn-press-[0-9a-f]{8}/', $css, $press );
		$this->assertNotEmpty( $press, 'the pressed look is a shared rule of its own' );
		$this->assertStringContainsString( '.' . $press[0] . '.' . $press[0] . '.' . $press[0] . '.btn:active{transform:var(--wp--custom--button-presets--primary--active-transform);', $css, 'MUST FAIL: the pressed look, the class tripled' );
		$this->assertStringContainsString( '.' . $class . '.' . $class . '.btn{--sgs-focus-host-border:var(--wp--custom--button-presets--primary--border-width,1px);}', $css, 'MUST FAIL: the focus border falls back to the 1px the preset paints' );
		$this->assertStringNotContainsString( 'font-size', $css, 'a role the site leaves unset prints nothing' );
		$this->assertSame( ' ' . $class . ' ' . $press[0], $this->run_php( $this->settings(), 'echo sgs_button_kit_classes( ' . var_export( array( 'xStyle' => 'primary' ), true ) . ", 'x', '.btn' );" ), 'the classes the button carries are the ones the rules read' );
		$this->assertSame( '', $this->run_php( $this->settings(), 'echo sgs_button_kit_classes( array(), "x", ".btn" );' ), 'no preset, no class' );
	}

	public function test_the_preset_prints_once_however_many_buttons_wear_it(): void {
		$one = $this->kit( array( 'xStyle' => 'primary' ), '.a .btn' );
		$two = $this->kit( array( 'xStyle' => 'primary' ), '.b .btn' );
		$this->assertSame( self::preset_group( $one ), self::preset_group( $two ), 'MUST FAIL: two instances with the same preset print the same shared text, so the collector keeps one copy' );
		$this->assertNotSame( '', self::preset_group( $one ) );
		$this->assertSame( self::kit_class( $one ), self::kit_class( $two ) );
		$other = $this->kit( array( 'xStyle' => 'secondary' ), '.b .btn' );
		$this->assertNotSame( self::kit_class( $one ), self::kit_class( $other ), 'another preset is another class' );
		$this->assertStringNotContainsString( 'sgs-btn-kit', $this->kit( array( 'xColourText' => '#fff' ) ), 'a button with no preset prints no shared rule' );
	}

	public function test_a_preset_prints_the_roles_the_site_sets_and_nothing_for_the_rest(): void {
		$css = $this->kit(
			array( 'xStyle' => 'primary' ),
			self::SEL,
			$this->settings( false, array( 'padding' => '14px 24px', 'font-size' => '15px', 'min-height' => '48px', 'shadow' => '0 2px 4px #000', 'hover-shadow' => '0 4px 8px #000' ) )
		);
		$group = self::preset_group( $css );
		$this->assertStringContainsString( 'padding:var(--wp--custom--button-presets--primary--padding);font-size:var(--wp--custom--button-presets--primary--font-size);min-height:var(--wp--custom--button-presets--primary--min-height);', $group, 'MUST FAIL: the padding, font size and min height of the preset print' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--primary--shadow);--sgs-focus-under:var(--wp--custom--button-presets--primary--shadow);', $group, 'MUST FAIL: the preset shadow is handed to the focus ring' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--primary--hover-shadow);--sgs-focus-under:var(--wp--custom--button-presets--primary--hover-shadow);', $group, 'and so is the hover shadow' );
		$this->assertSame( 2, substr_count( $group, 'box-shadow:var(--wp--custom--button-presets--primary--hover-shadow)' ), 'MUST FAIL: the hover shadow has a keyboard-focus twin' );
		$this->assertStringNotContainsString( 'padding:var(--wp--custom--button-presets--secondary', $group );
	}

	public function test_the_hover_lift_and_the_timing_fall_back_through_default_then_none(): void {
		$group = self::preset_group( $this->kit( array( 'xStyle' => 'primary' ) ) );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--primary--hover-lift,var(--wp--custom--button-presets--default--hover-lift,none));', $group, 'MUST FAIL: variant, then default, then none' );
		$this->assertStringContainsString( 'scale:var(--wp--custom--button-presets--primary--hover-scale,var(--wp--custom--button-presets--default--hover-scale,none));rotate:var(--wp--custom--button-presets--primary--hover-rotate,var(--wp--custom--button-presets--default--hover-rotate,none));', $group );
		$this->assertStringNotContainsString( 'translateY(-3px)', $group, 'the fixed 3px lift is the WooCommerce callers\' default, not the kit\'s' );
		$this->assertStringContainsString( '--sgs-btn-transition-duration:var(--wp--custom--button-presets--primary--hover-transition,var(--wp--custom--button-presets--default--hover-transition,0.18s));', $group, 'MUST FAIL: the duration' );
		$this->assertStringContainsString( '--sgs-btn-transition-easing:var(--wp--custom--button-presets--primary--hover-easing,var(--wp--custom--button-presets--default--hover-easing,var(--wp--custom--easing--ease,ease)));', $group, 'MUST FAIL: the easing' );
		$this->assertStringContainsString( '--sgs-btn-transition-easing-colour:var(--wp--custom--button-presets--primary--hover-easing-colour,var(--wp--custom--button-presets--default--hover-easing-colour,var(--sgs-btn-transition-easing)));', $group );
		$this->assertStringContainsString( 'box-shadow var(--sgs-btn-transition-duration) var(--sgs-btn-transition-easing-shadow)', $group );
		// The WooCommerce callers are not touched: they keep the 3px lift and 0.25s.
		$woo = $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ".x", "primary" );' );
		$this->assertStringContainsString( 'translateY(-3px)', $woo );
		$this->assertStringContainsString( 'hover-transition,0.25s', $woo );
	}

	public function test_the_pressed_look_prints_last_and_the_hover_shadow_has_a_focus_twin(): void {
		$css = $this->kit( array( 'xStyle' => 'primary', 'xShadow' => '0 4px 12px 0', 'xShadowColour' => '#112233', 'xShadowHover' => '0 8px 20px 0', 'xShadowColourHover' => '#445566' ) );
		$hover = strrpos( $css, 'box-shadow:0px 8px 20px 0px #445566' );
		$this->assertNotFalse( $hover );
		$this->assertGreaterThan( $hover, (int) strpos( $css, ':active{' ), 'MUST FAIL: the pressed rule comes after the hover shadow rule it ties with' );
		$this->assertStringEndsWith( '/*sgs-shared-end*/', $css, 'the pressed look is the last thing printed' );
		$this->assertStringContainsString( '.u .btn:focus-visible{box-shadow:0px 8px 20px 0px #445566;--sgs-focus-under:0px 8px 20px 0px #445566;}', $css, 'MUST FAIL: the hover shadow has a keyboard-focus twin' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:hover{box-shadow:0px 8px 20px 0px #445566;', $css, 'and the guarded hover' );
	}

	public function test_a_border_the_button_sets_re_anchors_the_focus_ring(): void {
		$wide = $this->kit( array( 'xStyle' => 'primary', 'xBorderWidth' => array( 'top' => '3px', 'right' => '3px', 'bottom' => '3px', 'left' => '3px' ) ) );
		$this->assertStringContainsString( '.u .btn{--sgs-focus-host-border:3px;}', $wide, 'the button\'s own width wins over the preset\'s token' );
		$none = $this->kit( array( 'xStyle' => 'primary', 'xBorderStyle' => 'none' ) );
		$this->assertStringContainsString( '.u .btn{--sgs-focus-host-border:0px;}', $none, 'a button that draws no border has nothing to anchor to' );
		$plain = $this->kit( array( 'xStyle' => 'primary' ) );
		$this->assertStringNotContainsString( '.u .btn{--sgs-focus-host-border', $plain, 'no border of its own: the shared rule\'s token stands' );
		$this->assertStringNotContainsString( 'focus-host-border', $this->kit( array( 'xColourText' => '#fff' ) ), 'no preset and no border: nothing' );
	}

	public function test_width_fit_prints_fit_content_and_full_prints_full(): void {
		$this->assertStringContainsString( '.u .btn{width:fit-content;}', $this->kit( array( 'xWidthType' => 'fit' ) ), 'MUST FAIL: "Fit to the text" prints, as fit-content (a block-level flex button stretches under auto)' );
		$this->assertStringContainsString( 'width:100%;', $this->kit( array( 'xWidthType' => 'full' ) ) );
		$this->assertSame( '', $this->kit( array( 'xWidthType' => '' ) ), 'negative control: unset prints nothing' );
		$this->assertStringNotContainsString( 'width:', $this->run_php( $this->settings(), 'echo sgs_button_element_style_css( array( "xWidthType" => "fit" ), "x", ".u" );' ), 'the shared look emitter is untouched: it prints only `full`' );
	}

	public function test_the_editor_twin_fixture_prints_every_declaration(): void {
		// tests/js/button-kit-style.test.js proves button-kit-style.js returns the same pairs for the same attributes.
		$fixture = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/button-kit/preview-parity.json' ), true );
		$css     = $this->kit( $fixture['attributes'] );
		foreach ( $fixture['declarations'] as list( $property, $value ) ) {
			$this->assertStringContainsString( $property . ':' . $value . ';', $css, 'MUST FAIL: ' . $property . ' prints as the editor twin expects' );
		}
		// The `size` group (a square control) prints both sides, apart from the width setting that would share `width`.
		$sized = $this->kit( $fixture['sizeAttributes'] );
		foreach ( $fixture['sizeDeclarations'] as list( $property, $value ) ) {
			$this->assertStringContainsString( $property . ':' . $value . ';', $sized, 'MUST FAIL: the size group prints ' . $property );
		}
	}

	public function test_outline_prints_through_the_kit_only(): void {
		$css   = $this->kit( array( 'xStyle' => 'outline' ) );
		$class = self::kit_class( $css );
		$this->assertStringContainsString( '.' . $class . '.' . $class . '.btn{background:var(--wp--custom--button-presets--outline--background);', $css, 'MUST FAIL: the kit asks for outline' );
		$this->assertStringContainsString( '.' . $class . '.' . $class . '.btn:hover{', $css );

		$this->assertSame( '', $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'the WooCommerce callers still get nothing for outline' );
		$this->assertSame( '', $this->run_php( $this->settings( true ), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'and on an opted-in site' );
		$this->assertStringContainsString( '--button-presets--outline--', $this->run_php( $this->settings(), 'echo sgs_button_preset_css( ".x", "outline", true, true, true );' ), 'MUST FAIL: the new argument prints it' );
	}

	public function test_the_preset_helper_output_is_unchanged_for_its_existing_callers(): void {
		// Length and md5 of what each call prints: what it printed before the outline argument existed (origin/main's
		// helper), plus the hover-on-touch contract's `.sgs-pressed` touch half before each guarded hover member (Spec 38A
		// FR-38A-17; the colour hover, unguarded before, now carries the guard too).
		$pinned = array(
			array( array( '.x', 'primary' ), 2411, 'c5f3722b3704a5e4ceb56c34e3a6ff2a' ),
			array( array( '.x', 'secondary' ), 2473, '2b960b6acfc8fc61734e58705ba538be' ),
			array( array( '.x', 'primary', false ), 1807, '84d83c0bc1f12be8f7d63b5009ca1c11' ),
			array( array( '.x', 'primary', true, false ), 1980, '6b23849fee2576fcfde36232f16687cb' ),
			array( array( '.x,.y', 'secondary' ), 2611, 'ab7ef7c7d2781c94ebc91364550a7b31' ),
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
		$this->assertStringContainsString( '.btn{background:var(--wp--custom--button-presets--gold--background);', $on );
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

	public function test_size_prints_width_and_height_per_device(): void {
		$css = $this->kit( array( 'xSize' => array( 'desktop' => 48, 'tablet' => 40, 'mobile' => '2.5rem' ) ) );
		$this->assertStringContainsString( '.u .btn{width:48px;height:48px;}', $css, 'MUST FAIL: a square control takes one length for both' );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023\.98px[^{]*\{\.u \.btn\{width:40px;height:40px;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.btn\{width:2\.5rem;height:2\.5rem;\}\}/', $css );
		$this->assertStringNotContainsString( 'min-height', $css, 'size is not the minimum height' );
		$this->assertSame( '', $this->kit( array( 'xSize' => array() ) ), 'an empty object prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xSize' => '48px' ) ), 'a scalar is not a tier object: nothing' );
		$this->assertSame( '', $this->kit( array( 'ySize' => array( 'desktop' => 48 ) ) ), 'another prefix prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xSize' => array( 'desktop' => self::BREAKOUT ) ) ), 'an unsafe length is refused' );
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

	public function test_preset_false_prints_the_look_alone_for_a_block_that_prints_its_own_preset(): void {
		$attrs = array(
			'xStyle'            => 'primary',
			'xColourBackground' => '#112233',
			'xBorderStyle'      => 'solid',
			'xBorderWidth'      => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
		);
		$with  = $this->kit( $attrs );
		$alone = $this->kit( $attrs, self::SEL, null, array( 'preset' => false ) );
		$this->assertStringContainsString( 'sgs-btn-kit-', $with, 'MUST FAIL: by default the preset prints as a shared rule' );
		$this->assertStringNotContainsString( 'sgs-btn-kit-', $alone, 'preset false: no shared preset rule' );
		$this->assertStringNotContainsString( 'sgs-btn-press-', $alone, 'preset false: no pressed rule' );
		$this->assertStringContainsString( '.u .btn{background-color:#112233;', $alone, 'the look still prints' );
		$this->assertStringContainsString( '--sgs-focus-host-border:2px', $alone, 'a border width the button sets still re-anchors the focus ring' );
	}

	public function test_a_state_guard_is_chained_before_hover_and_focus_in_the_colour_and_shadow_rules(): void {
		$attrs = array(
			'xColourBackgroundHover' => '#112233',
			'xShadow'                => '0 4px 12px 0',
			'xShadowColour'          => '#112233',
			'xShadowHover'           => '0 8px 22px 0',
		);
		$css   = $this->kit( $attrs, self::SEL, null, array( 'state_guard' => ':not([disabled])' ) );
		$this->assertStringContainsString( '.u .btn:not([disabled]):hover{background-color:#112233;}', $css, 'MUST FAIL: the colour hover skips a disabled button' );
		$this->assertStringContainsString( '.u .btn:not([disabled]):focus-visible{background-color:#112233;}', $css, 'and its keyboard-focus twin' );
		$this->assertStringContainsString( '.u .btn:not([disabled]):hover{box-shadow:', $css, 'the hover shadow skips a disabled button' );
		$this->assertDoesNotMatchRegularExpression( '/\.u \.btn:hover\{/', $css, 'no unguarded hover rule' );
		$this->assertStringContainsString( '.u .btn{box-shadow:', $css, 'the resting shadow is not guarded' );
		$this->assertStringContainsString( ':hover{background-color:#112233;}', $this->kit( $attrs ), 'negative control: without the option the selector is unchanged' );
	}

	public function test_shadow_lift_false_and_a_lift_prefix_switch_the_automatic_hover_lift_off(): void {
		$rest = array( 'xShadow' => '0 4px 12px 0', 'xShadowColour' => '#112233' );
		$this->assertStringContainsString( ':hover{box-shadow:', $this->kit( $rest ), 'MUST FAIL: a resting shadow alone lifts by default' );
		$this->assertStringNotContainsString( ':hover{box-shadow:', $this->kit( $rest, self::SEL, null, array( 'shadow_lift' => false ) ), 'shadow_lift false: no automatic lift' );
		$explicit = $this->kit( $rest + array( 'xShadowHover' => '0 8px 22px 0' ), self::SEL, null, array( 'shadow_lift' => false ) );
		$this->assertStringContainsString( ':hover{box-shadow:', $explicit, 'an explicit hover shadow still prints' );
		$this->assertStringNotContainsString( ':hover{box-shadow:', $this->kit( $rest + array( 'xShadowLiftOnHover' => false ), self::SEL, null, array( 'lift_prefix' => 'x' ) ), 'the own {prefix}ShadowLiftOnHover switch of the block is read' );
		$this->assertStringContainsString( ':hover{box-shadow:', $this->kit( $rest + array( 'xShadowLiftOnHover' => true ), self::SEL, null, array( 'lift_prefix' => 'x' ) ), 'negative control: the switch on lifts' );
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
			'.u .a, .u .b',
			null,
			array( 'element' => '.a, .b' )
		);
		$class = self::kit_class( $css );
		preg_match( '/sgs-btn-press-[0-9a-f]{8}/', $css, $press );
		$this->assertStringContainsString( '.' . $press[0] . '.' . $press[0] . '.' . $press[0] . '.a:active{', $css, 'MUST FAIL: the press rule on the first part' );
		$this->assertStringContainsString( '.' . $press[0] . '.' . $press[0] . '.' . $press[0] . '.b:active{', $css, 'MUST FAIL: and on the last' );
		$this->assertStringContainsString( '.' . $class . '.' . $class . '.a,.' . $class . '.' . $class . '.b{background:var(', $css, 'the preset rule names both parts' );
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

	public function test_content_align_prints_justify_content_per_device(): void {
		$css = $this->kit( array( 'xContentAlign' => array( 'desktop' => 'space-between', 'mobile' => 'flex-start' ) ) );
		$this->assertStringContainsString( '.u .btn{justify-content:space-between;}', $css, 'MUST FAIL: the desktop value prints as justify-content on the button' );
		$this->assertStringContainsString( '@media(max-width:767.98px){.u .btn{justify-content:flex-start;}}', $css, 'MUST FAIL: and the mobile value in its own media query' );
		foreach ( array( 'flex-start', 'center', 'flex-end', 'space-between' ) as $value ) {
			$this->assertStringContainsString( 'justify-content:' . $value . ';', $this->kit( array( 'xContentAlign' => array( 'desktop' => $value ) ) ), 'sgs/button\'s four values all print: ' . $value );
		}
		// Negative controls: unset prints nothing, a value outside the list prints nothing, another prefix prints nothing.
		$this->assertSame( '', $this->kit( array( 'xContentAlign' => array() ) ), 'an empty object prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xContentAlign' => array( 'desktop' => 'stretch' ) ) ), 'a value outside sgs/button\'s list prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xContentAlign' => array( 'desktop' => self::BREAKOUT ) ) ), 'an unsafe value prints nothing' );
		$this->assertSame( '', $this->kit( array( 'otherContentAlign' => array( 'desktop' => 'space-between' ) ) ), 'another prefix prints nothing' );
	}

	public function test_hover_lift_distance_makes_the_total_hover_movement_the_setting(): void {
		$css = $this->kit( array( 'xHoverLiftDistance' => '2px' ), self::SEL, null, array( 'state_guard' => ':not([disabled])' ) );
		$this->assertStringContainsString( '@media (prefers-reduced-motion:no-preference){.u .btn:not([disabled]).sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .btn:not([disabled]):hover{translate:0 -2px}.u .btn:not([disabled]):focus-visible{translate:0 -2px}}', $css, 'MUST FAIL: the movement is `translate`, inside the no-preference media query, behind the touch guard and the state guard, with its keyboard-focus twin' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:not([disabled]):hover{transform:none;}.u .btn:not([disabled]):focus-visible{transform:none;}', $css, 'MUST FAIL: an unconditional rule cancels the stylesheet own `transform`, so the total movement is the setting (and none under reduced motion)' );
		$this->assertStringContainsString( 'translate:0 -24px}', $this->kit( array( 'xHoverLiftDistance' => '99px' ) ), 'the distance is clamped to the shared 24px ceiling' );
		$this->assertStringContainsString( 'translate:0 -3px}', $this->kit( array( 'xHoverLiftDistance' => '3' ) ), 'a bare number reads as px' );
		// Negative controls: unset prints nothing; a value the kit does not understand prints nothing, so the site's own lift stands.
		$this->assertSame( '', $this->kit( array( 'xHoverLiftDistance' => '' ) ), 'unset prints nothing' );
		$this->assertSame( '', $this->kit( array() ), 'absent prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xHoverLiftDistance' => '-2px' ) ), 'a negative distance prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xHoverLiftDistance' => '2em' ) ), 'another unit prints nothing' );
		$this->assertSame( '', $this->kit( array( 'xHoverLiftDistance' => self::BREAKOUT ) ), 'an unsafe value prints nothing' );
		$this->assertSame( '', $this->kit( array( 'otherHoverLiftDistance' => '2px' ) ), 'another prefix prints nothing' );
	}

	public function test_a_zero_lift_stops_the_movement_a_site_token_adds(): void {
		$css = $this->kit( array( 'xHoverLiftDistance' => '0px' ), self::SEL, null, array( 'state_guard' => ':not([disabled])' ) );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .btn:not([disabled]):hover{transform:none;translate:none;}', $css, 'MUST FAIL: 0 prints a hover rule that cancels the site\'s transform, behind the touch guard' );
		$this->assertStringContainsString( '.u .btn:not([disabled]):focus-visible{transform:none;translate:none;}', $css, 'MUST FAIL: and its focus twin' );
		$this->assertStringNotContainsString( 'prefers-reduced-motion', $css, 'stopping a movement is not itself motion' );
		$this->assertSame( $css, $this->kit( array( 'xHoverLiftDistance' => '0' ), self::SEL, null, array( 'state_guard' => ':not([disabled])' ) ), 'a bare 0 reads the same' );
		$this->assertStringNotContainsString( 'translate:0 -', $css, 'no lift prints' );
	}
}
