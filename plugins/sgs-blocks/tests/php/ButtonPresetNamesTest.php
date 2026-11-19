<?php
/**
 * A button preset works under any name the site's snapshot carries, on a site that opted in (Spec 32 FR-32-2).
 *
 * The switch is `settings.custom.namedButtonPresets: true`. Off, the starters (primary, secondary, outline) are the only
 * names and nothing prints: a snapshot that holds a fifth name changes no page. On, every snapshot key other than
 * `default`, `link` and `custom` is a name that sgs/button, sgs/product-card, sgs/buybox, sgs/form and the WooCommerce
 * helper accept, and the CSS a name needs is printed from the snapshot's keys.
 *
 * Every test renders the real files (the harness runs the block's render.php; the helpers are loaded as the plugin loads
 * them). MUST FAIL cases are marked: each goes red when the rule it names is removed.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonPresetNamesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonPresetNamesTest extends TestCase {

	private const GOLD = array(
		'background'       => '#c90',
		'text'             => '#000',
		'border'           => '#c90',
		'hover-background' => '#fc3',
		'shadow'           => '0 1px 2px rgba(0,0,0,.3)',
		'hover-shadow'     => '0 4px 8px rgba(0,0,0,.3)',
		'active-shadow'    => 'none',
		'padding'          => '10px 20px',
	);

	/**
	 * Settings with a gold preset beyond the starters.
	 *
	 * @param bool $on Whether the site opted in.
	 * @return array<string,mixed>
	 */
	private function settings( bool $on, array $presets = array() ): array {
		$presets = array() === $presets
			? array(
				'primary' => array( 'background' => '#111' ),
				'gold'    => self::GOLD,
				'default' => array( 'hover-transition' => '0.3s' ),
			)
			: $presets;
		return array(
			'custom' => $on
				? array(
					'namedButtonPresets' => true,
					'buttonPresets'      => $presets,
				)
				: array( 'buttonPresets' => $presets ),
		);
	}

	/**
	 * Render a block's real render.php through the harness.
	 *
	 * @param string              $slug     Block name.
	 * @param array<string,mixed> $attrs    Attributes.
	 * @param array<string,mixed> $settings Global settings.
	 * @return array{html:string,css:string}
	 */
	private function render( string $slug, array $attrs, array $settings ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		try {
			foreach ( array(
				'attrs'    => (object) $attrs,
				'settings' => $settings,
			) as $key => $data ) {
				$files[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgsbn' );
				file_put_contents( $files[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
			}
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $files['attrs'] ) . ' --global-settings-file ' . escapeshellarg( $files['settings'] ) . ' 2>&1'
			);
		} finally {
			foreach ( $files as $file ) {
				@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
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

	/**
	 * Run a PHP snippet with the helpers loaded and the settings set; return what it prints.
	 *
	 * @param array<string,mixed> $settings Global settings.
	 * @param string              $code     Snippet body.
	 */
	private function run_php( array $settings, string $code ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = (string) tempnam( sys_get_temp_dir(), 'sgsbn' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require ABSPATH . 'includes/helpers-button-preset-names.php';\nrequire ABSPATH . 'includes/helpers-button-preset.php';\n"
			. "require ABSPATH . 'includes/helpers-button-press.php';\nrequire ABSPATH . 'includes/helpers-button-focus.php';\n"
			. '$GLOBALS[\'sgs_qa_global_settings\'] = json_decode( ' . var_export( json_encode( $settings ), true ) . ", true );\n" . $code
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	public function test_a_name_beyond_the_starters_is_a_name_only_on_a_site_that_opted_in(): void {
		$this->assertSame( 'primary,secondary,outline,gold', $this->run_php( $this->settings( true ), 'echo implode( ",", sgs_button_preset_names() );' ), 'MUST FAIL: on, the snapshot key joins the starters; default is not a name' );
		$this->assertSame( 'primary,secondary,outline', $this->run_php( $this->settings( false ), 'echo implode( ",", sgs_button_preset_names() );' ), 'MUST FAIL: off, only the starters' );
		$this->assertSame( 'primary,secondary,outline', $this->run_php( array(), 'echo implode( ",", sgs_button_preset_names() );' ), 'no snapshot at all: the starters' );
	}

	public function test_reserved_keys_and_unsafe_keys_are_never_names(): void {
		$presets = array(
			'link'    => array( 'text' => '#000' ),
			'custom'  => array( 'text' => '#000' ),
			'default' => array( 'hover-transition' => '0.3s' ),
			'Big Gold' => array( 'text' => '#000' ),
			'!!'      => array( 'text' => '#000' ),
			'bad'     => 'not an array',
		);
		$names   = $this->run_php( $this->settings( true, $presets ), 'echo implode( ",", sgs_button_preset_names() );' );
		$this->assertSame( 'primary,secondary,outline,big-gold', $names, 'MUST FAIL: link, custom and default are styles of the block, a key with no letters or digits and a non-array are dropped, a spaced key is slugged' );
	}

	public function test_a_stored_style_resolves_to_its_slug_or_to_nothing(): void {
		$on = $this->settings( true, array( 'Big Gold' => array( 'text' => '#000' ) ) );
		$this->assertSame( 'big-gold', $this->run_php( $on, 'echo sgs_button_preset_resolve( "Big Gold" );' ) );
		$this->assertSame( 'big-gold', $this->run_php( $on, 'echo sgs_button_preset_resolve( "big-gold" );' ) );
		$this->assertSame( '', $this->run_php( $on, 'echo sgs_button_preset_resolve( "nope" );' ), 'an unknown name resolves to nothing' );
		$this->assertSame( '', $this->run_php( $on, 'echo sgs_button_preset_resolve( "" );' ) );
		$this->assertSame( '', $this->run_php( $this->settings( false, array( 'gold' => array( 'text' => '#000' ) ) ), 'echo sgs_button_preset_resolve( "gold" );' ), 'MUST FAIL: off, a snapshot name is not accepted' );
		$this->assertSame( 'outline', $this->run_php( $this->settings( false ), 'echo sgs_button_preset_resolve( "outline" );' ), 'a starter always resolves' );
	}

	public function test_sgs_button_wears_a_snapshot_name_on_an_opted_in_site(): void {
		$r = $this->render(
			'sgs/button',
			array(
				'label'        => 'Go',
				'url'          => '/x',
				'inheritStyle' => 'gold',
			),
			$this->settings( true )
		);
		$this->assertStringContainsString( 'sgs-button--gold', $r['html'], 'MUST FAIL: the preset class carries the name' );
		$this->assertStringContainsString( 'data-preset="gold"', $r['html'] );
		$this->assertStringContainsString( '.sgs-button:active{box-shadow:var(--wp--custom--button-presets--gold--active-shadow)', $r['css'], 'MUST FAIL: the pressed look reads the named preset' );
	}

	public function test_the_same_name_on_a_site_that_did_not_opt_in_renders_as_the_default(): void {
		$attrs = array(
			'label'        => 'Go',
			'url'          => '/x',
			'inheritStyle' => 'gold',
		);
		$off   = $this->render( 'sgs/button', $attrs, $this->settings( false ) );
		$plain = $this->render( 'sgs/button', array_merge( $attrs, array( 'inheritStyle' => 'primary' ) ), $this->settings( false ) );
		$this->assertStringNotContainsString( 'sgs-button--gold', $off['html'], 'MUST FAIL: off, the name paints nothing' );
		$uid = static fn( string $html ): string => (string) preg_replace( '/sgs-btn-[0-9a-f]+/', 'sgs-btn-UID', $html );
		$this->assertSame( $uid( $plain['html'] ), $uid( $off['html'] ), 'off, an unknown name renders exactly as the default (primary): the old enum dropped it' );
		$this->assertSame( $uid( $plain['css'] ), $uid( $off['css'] ) );
	}

	public function test_link_and_custom_keep_their_meaning_and_garbage_falls_back_to_primary(): void {
		foreach ( array( 'link', 'custom' ) as $style ) {
			$html = $this->render(
				'sgs/button',
				array(
					'label'        => 'Go',
					'url'          => '/x',
					'inheritStyle' => $style,
				),
				$this->settings( true )
			)['html'];
			$this->assertSame( 'link' === $style, str_contains( $html, 'sgs-button--link' ), $style );
			$this->assertStringNotContainsString( 'sgs-button--custom', $html );
		}
		$garbage = $this->render(
			'sgs/button',
			array(
				'label'        => 'Go',
				'url'          => '/x',
				'inheritStyle' => 'zzz',
			),
			$this->settings( true )
		)['html'];
		$this->assertStringContainsString( 'sgs-button--primary', $garbage, 'a value no preset names falls back to primary, as the old enum did' );
	}

	public function test_a_name_beyond_the_starters_prints_its_rule_from_the_snapshot_and_the_starters_do_not(): void {
		$css = $this->run_php( $this->settings( true ), 'echo sgs_button_named_preset_css();' );
		$this->assertStringContainsString( '.sgs-button.sgs-button--gold{border-width:var(--wp--custom--button-presets--gold--border-width,2px)', $css, 'MUST FAIL: the name gets a rule' );
		$this->assertStringContainsString( '--sgs-btn-bg:var(--wp--custom--button-presets--gold--background,', $css );
		$this->assertStringContainsString( '--sgs-btn-bg-hover:var(--wp--custom--button-presets--gold--hover-background,', $css );
		$this->assertStringNotContainsString( 'sgs-button--secondary', $css, 'a starter without the shadow tokens prints nothing: style.css already holds its rule' );
		$this->assertStringNotContainsString( '.sgs-button.sgs-button--primary{border-width', $css );
	}

	public function test_a_preset_shadow_paints_as_resting_and_hover_shadow_only_where_the_snapshot_sets_it(): void {
		$css = $this->run_php( $this->settings( true ), 'echo sgs_button_named_preset_css();' );
		$this->assertStringContainsString( '.sgs-button.sgs-button--gold{box-shadow:var(--wp--custom--button-presets--gold--shadow);--sgs-focus-under:var(--wp--custom--button-presets--gold--shadow);}', $css, 'MUST FAIL: resting shadow, handed to the focus ring' );
		$this->assertStringContainsString( '.sgs-button.sgs-button--gold:hover{box-shadow:var(--wp--custom--button-presets--gold--hover-shadow,var(--wp--custom--button-presets--gold--shadow));', $css, 'MUST FAIL: hover shadow falls back to the resting one' );
		$starter = $this->run_php(
			$this->settings( true, array( 'primary' => array( 'shadow' => '0 1px 2px #000' ) ) ),
			'echo sgs_button_named_preset_css();'
		);
		$this->assertStringContainsString( '.sgs-button.sgs-button--primary{box-shadow:var(--wp--custom--button-presets--primary--shadow);', $starter, 'a starter with a shadow token paints it too, on an opted-in site' );
		$this->assertStringNotContainsString( 'border-width', $starter );
	}

	public function test_nothing_prints_when_the_switch_is_off(): void {
		$this->assertSame( '', $this->run_php( $this->settings( false ), 'echo sgs_button_named_preset_css() . sgs_buybox_named_preset_css();' ), 'MUST FAIL: off, no CSS' );
		$this->assertSame( '', $this->run_php( $this->settings( true, array( 'primary' => array( 'background' => '#111' ) ) ), 'echo sgs_button_named_preset_css() . sgs_buybox_named_preset_css();' ), 'on, with only starters carrying no shadow: no CSS' );
		$this->assertSame( '', $this->run_php( array(), 'echo sgs_button_named_preset_css();' ), 'no snapshot: no CSS' );
	}

	public function test_the_buy_box_add_to_cart_takes_a_name_with_its_own_rule(): void {
		$css = $this->run_php( $this->settings( true ), 'echo sgs_buybox_named_preset_css();' );
		$this->assertStringContainsString( '.sgs-buybox .buybox__add-to-cart--gold{', $css, 'MUST FAIL' );
		$this->assertStringContainsString( 'background:var(--wp--custom--button-presets--gold--background,', $css );
		$this->assertStringContainsString( '.sgs-buybox .buybox__add-to-cart--gold:hover:not([disabled]){', $css );
		$code = 'require ABSPATH . "src/blocks/buybox/extras.php"; echo sgs_buybox_add_to_cart_class( "gold" ) . "|" . sgs_buybox_add_to_cart_class( "nope" ) . "|" . sgs_buybox_add_to_cart_class( "outline" ) . "|" . sgs_buybox_add_to_cart_class( "" );';
		$this->assertSame( 'gold||outline|', $this->run_php( $this->settings( true ), $code ), 'MUST FAIL: the class takes the name; an unknown name and empty keep today\'s look' );
		$this->assertSame( '|||', str_replace( 'outline', '', $this->run_php( $this->settings( false ), $code ) ), 'off: the name is refused' );
	}

	public function test_the_form_submit_button_paints_the_whole_preset_by_name(): void {
		$attrs = array( 'submitStyle' => 'gold' );
		$on    = $this->render( 'sgs/form', $attrs, $this->settings( true ) );
		$this->assertMatchesRegularExpression( '/\.sgs-form-[0-9a-f]+ \.sgs-form__button--submit\{background:var\(--wp--custom--button-presets--gold--background\)/', $on['css'], 'MUST FAIL: the submit button reads the named preset' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--gold--shadow)', $on['css'] );
		$this->assertStringContainsString( 'sgs-form__button--gold', $on['html'] );
		$off = $this->render( 'sgs/form', $attrs, $this->settings( false ) );
		$this->assertStringNotContainsString( 'button-presets--gold', $off['css'], 'off: the form prints nothing for the name' );
		$starter = $this->render( 'sgs/form', array( 'submitStyle' => 'primary' ), $this->settings( true ) );
		$this->assertStringNotContainsString( 'button-presets--primary--background', $starter['css'], 'a starter keeps the form\'s own primary look' );
	}

	public function test_the_product_card_ctas_wear_a_snapshot_name(): void {
		$attrs = array(
			'ctaText'   => 'Buy',
			'ctaUrl'    => '/b',
			'ctaStyle'  => 'gold',
			'cta2Text'  => 'More',
			'cta2Style' => 'gold',
		);
		$on    = $this->render( 'sgs/product-card', $attrs, $this->settings( true ) );
		$this->assertSame( 2, substr_count( $on['html'], 'sgs-button--gold ' ), 'MUST FAIL: both CTAs carry the name' );
		$this->assertStringContainsString( '.sgs-button--gold:active{box-shadow:var(--wp--custom--button-presets--gold--active-shadow)', $on['css'], 'MUST FAIL: the pressed look covers the name' );
		$off = $this->render( 'sgs/product-card', $attrs, $this->settings( false ) );
		$this->assertStringNotContainsString( 'sgs-button--gold', $off['html'], 'off: an unknown name falls back to primary and secondary' );
		$this->assertStringContainsString( 'sgs-button--primary sgs-product-card__cta--primary', $off['html'] );
		$this->assertStringContainsString( 'sgs-button--secondary sgs-product-card__cta--secondary', $off['html'] );
	}

	public function test_the_woocommerce_helper_prints_a_name_only_on_an_opted_in_site(): void {
		$code = 'echo sgs_button_preset_css( ".x", "gold" );';
		$on   = $this->run_php( $this->settings( true ), $code );
		$this->assertStringContainsString( '.x{background:var(--wp--custom--button-presets--gold--background);', $on, 'MUST FAIL' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--gold--shadow);', $on );
		$this->assertStringContainsString( '.x:hover{background:var(--wp--custom--button-presets--gold--hover-background,', $on );
		$this->assertSame( '', $this->run_php( $this->settings( false ), $code ), 'off: an unknown name prints nothing, as before' );
		$this->assertSame( '', $this->run_php( $this->settings( false ), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'off: outline still prints nothing, as before' );
		$this->assertNotSame( '', $this->run_php( $this->settings( false ), 'echo sgs_button_preset_css( ".x", "primary" );' ) );
		$this->assertSame( '', $this->run_php( $this->settings( true ), 'echo sgs_button_preset_css( ".x", "outline" );' ), 'MUST FAIL: on, outline still prints nothing: a site that opts in with only the starters renders as before' );
	}

	public function test_the_press_and_focus_helpers_keep_no_name_list(): void {
		$on = $this->settings( true );
		$this->assertSame( '--wp--custom--button-presets--gold--active-shadow', $this->run_php( $on, 'echo sgs_button_press_token( "gold", "active-shadow" );' ), 'MUST FAIL: press reads a named preset' );
		$this->assertSame( '', $this->run_php( $this->settings( false ), 'echo sgs_button_press_token( "gold", "active-shadow" );' ), 'off: a name falls to the default preset, which sets none here' );
		$this->assertStringContainsString( '.u.u .sgs-button--gold:active{', $this->run_php( $on, 'echo sgs_button_press_rules_by_variant( "u" );' ), 'MUST FAIL: the by-class press rules cover the name' );
		$this->assertSame( 'var(--wp--custom--button-presets--gold--border-width,2px)', $this->run_php( $on, 'echo sgs_button_focus_host_border( array( "", "", "", "" ), "", "gold" );' ), 'MUST FAIL: a named preset has a border for the signature ring' );
		$this->assertSame( '', $this->run_php( $this->settings( false ), 'echo sgs_button_focus_host_border( array( "", "", "", "" ), "", "gold" );' ), 'off: a name has no border' );
	}

	public function test_the_editor_is_told_the_names_beyond_the_starters_once(): void {
		$stub = 'function wp_add_inline_script( $h, $js, $pos = "after" ) { echo $h . "|" . $js . "|" . $pos; } function wp_json_encode( $v ) { return json_encode( $v ); } sgs_button_preset_names_editor_data();';
		$this->assertSame( 'wp-blocks|window.sgsButtonPresetNames=["gold"];|before', $this->run_php( $this->settings( true ), $stub ), 'MUST FAIL' );
		$this->assertSame( '', $this->run_php( $this->settings( false ), $stub ), 'off: nothing is published' );
	}
}
