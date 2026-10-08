<?php
/**
 * Tests: the nav drawer's `google-rating` top-row slot type.
 *
 * Runs the REAL includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome_slot_html() in a child PHP
 * process through the QA harness (scripts/qa/lib/render-css-harness.php, via --render-file). The
 * harness's render_block() is a stub, so a temporary auto_prepend_file supplies a render_block() that
 * runs the REAL src/blocks/google-rating-badge/render.php with the block.json defaults merged in
 * (what WordPress does before render). Live Google data is faked by
 * tests/php/stubs/google-reviews-render-prepend.php; Site Info is seeded through SGS_QA_OPTIONS, the
 * same way GoogleRatingBadgeTest does.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerChromeRatingTest extends TestCase {

	/** Site Info holding a written rating, review count and Google link. */
	private const SITE_INFO = array(
		'google_rating'       => '4.7',
		'google_review_count' => '15',
		'socials.google'      => 'https://www.google.com/maps/place/example',
	);

	/**
	 * Run a PHP snippet that has the chrome functions and $attributes in scope.
	 *
	 * @param string               $body      PHP statements; whatever they echo is returned.
	 * @param array<string, mixed> $attrs     Nav drawer attributes.
	 * @param array<string, mixed> $site_info Site Info values keyed by dot-notation key.
	 * @return string The snippet's output.
	 */
	private function run_child( string $body, array $attrs, array $site_info ): string {
		$root    = dirname( __DIR__, 2 );
		$harness = $root . '/scripts/qa/lib/render-css-harness.php';
		$badge   = $root . '/src/blocks/google-rating-badge';

		$prepend = tempnam( sys_get_temp_dir(), 'sgsnp' );
		file_put_contents(
			$prepend,
			"<?php\nrequire_once " . var_export( __DIR__ . '/stubs/google-reviews-render-prepend.php', true ) . ";\n"
			. "if ( ! function_exists( 'render_block' ) ) {\n"
			. "\tfunction render_block( array \$parsed ): string {\n"
			. "\t\t\$meta     = json_decode( (string) file_get_contents( " . var_export( $badge . '/block.json', true ) . " ), true );\n"
			. "\t\t\$defaults = array();\n"
			. "\t\tforeach ( (array) \$meta['attributes'] as \$name => \$schema ) {\n"
			. "\t\t\tif ( array_key_exists( 'default', \$schema ) ) {\n"
			. "\t\t\t\t\$defaults[ \$name ] = \$schema['default'];\n"
			. "\t\t\t}\n"
			. "\t\t}\n"
			. "\t\tif ( 'sgs/google-rating-badge' !== ( \$parsed['blockName'] ?? '' ) ) {\n"
			. "\t\t\treturn '';\n"
			. "\t\t}\n"
			. "\t\t\$attributes = array_merge( \$defaults, (array) \$parsed['attrs'] );\n"
			. "\t\t\$content    = '';\n"
			. "\t\t\$block      = new SGS_QA_Stub_Block( \$attributes );\n"
			. "\t\tob_start();\n"
			. "\t\tinclude " . var_export( $badge . '/render.php', true ) . ";\n"
			. "\t\treturn (string) ob_get_clean();\n"
			. "\t}\n"
			. "}\n"
		);

		$render = tempnam( sys_get_temp_dir(), 'sgsnr' );
		file_put_contents(
			$render,
			"<?php\nrequire_once " . var_export( $root . '/includes/nav-drawer-chrome.php', true ) . ";\n" . $body . "\n"
		);

		$attrs_file = tempnam( sys_get_temp_dir(), 'sgsna' );
		file_put_contents( $attrs_file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		$store = array();
		foreach ( $site_info as $key => $value ) {
			$parts = explode( '.', $key );
			if ( 2 === count( $parts ) ) {
				$store[ $parts[0] ][ $parts[1] ] = $value;
			} else {
				$store[ $key ] = $value;
			}
		}

		putenv( 'SGS_GR_TEST_MODE=empty' );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $store ), JSON_THROW_ON_ERROR ) );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/nav-drawer --render-file ' . escapeshellarg( $render )
				. ' --attrs-file ' . escapeshellarg( $attrs_file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			putenv( 'SGS_QA_OPTIONS' );
			unlink( $prepend );
			unlink( $render );
			unlink( $attrs_file );
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'the child must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * The slot markup for the given attributes.
	 *
	 * @param array<string, mixed> $attrs     Nav drawer attributes.
	 * @param array<string, mixed> $site_info Site Info values.
	 */
	private function slot( array $attrs, array $site_info = self::SITE_INFO ): string {
		return trim( $this->run_child( 'echo sgs_nav_drawer_chrome_slot_html( $attributes );', $attrs, $site_info ) );
	}

	public function test_rating_type_renders_the_badge_inside_the_slot_wrapper(): void {
		$html = $this->slot(
			array(
				'chromeSlotType'      => 'google-rating',
				'chromeSlotPlacement' => 'end',
			)
		);
		$this->assertStringStartsWith( '<div class="sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--google-rating sgs-nav-drawer__chrome-slot--at-end">', $html );
		$this->assertStringContainsString( 'sgs-google-rating-badge', $html );
		$this->assertStringContainsString( 'href="https://www.google.com/maps/place/example"', $html );
		$this->assertStringContainsString( '4.7', $html );
		// Spec 32: no inline style declaration on the front end.
		$this->assertStringNotContainsString( ' style="', $html );

		// Negative control: the text type with no words renders nothing, so the wrapper is not a side effect of the harness.
		$this->assertSame( '', $this->slot( array( 'chromeSlotType' => 'text' ) ) );
	}

	public function test_no_rating_anywhere_returns_an_empty_string(): void {
		$attrs = array( 'chromeSlotType' => 'google-rating' );
		$this->assertSame( '', $this->slot( $attrs, array() ) );
		// Negative control: the same attributes with a Site Info rating render the slot.
		$this->assertNotSame( '', $this->slot( $attrs ) );
	}

	public function test_a_row_with_only_the_rating_slot_and_no_rating_is_close_only(): void {
		$body  = '$css = ""; echo sgs_nav_drawer_chrome( $attributes, ".root", "<button></button>", $css );';
		$attrs = array( 'chromeSlotType' => 'google-rating' );
		$none  = $this->run_child( $body, $attrs, array() );
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome--close-only', $none );
		// Negative control: with a rating the row is not close-only.
		$rated = $this->run_child( $body, $attrs, self::SITE_INFO );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome--close-only', $rated );
		$this->assertStringContainsString( 'sgs-google-rating-badge', $rated );
	}

	public function test_the_type_list_includes_google_rating(): void {
		$list = json_decode( $this->run_child( 'echo json_encode( sgs_nav_drawer_chrome_slot_types() );', array(), array() ), true );
		$this->assertContains( 'google-rating', $list );
		// Negative control: an invented type is not in the list.
		$this->assertNotContains( 'bogus', $list );

		// The PHP list mirrors block.json's enum.
		$meta = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/block.json' ), true );
		$this->assertEqualsCanonicalizing( $meta['attributes']['chromeSlotType']['enum'], $list );
		$this->assertFalse( $meta['attributes']['chromeSlotBadgeShowCount']['default'] );
	}

	public function test_an_unknown_type_renders_nothing(): void {
		$this->assertSame(
			'',
			$this->slot(
				array(
					'chromeSlotType' => 'bogus',
					'chromeSlotText' => 'Hello',
				)
			)
		);
	}

	public function test_show_count_controls_the_review_count(): void {
		$base = array( 'chromeSlotType' => 'google-rating' );
		$off  = $this->slot( $base + array( 'chromeSlotBadgeShowCount' => false ) );
		$this->assertStringContainsString( 'sgs-google-rating-badge', $off );
		$this->assertStringNotContainsString( 'sgs-google-rating-badge__count', $off );
		// The visually hidden accessible name always carries the count; only the visible caption is switched.
		$this->assertStringNotContainsString( '>15 reviews<', $off );

		$on = $this->slot( $base + array( 'chromeSlotBadgeShowCount' => true ) );
		$this->assertStringContainsString( 'sgs-google-rating-badge__count', $on );
		$this->assertStringContainsString( '>15 reviews<', $on );
	}

	public function test_the_badge_is_unframed_and_follows_the_slot_colour(): void {
		$base  = array( 'chromeSlotType' => 'google-rating' );
		$plain = $this->slot( $base );
		$this->assertStringContainsString( 'border-style:none', $plain );
		$this->assertStringNotContainsString( '#ff0000', $plain );

		$coloured = $this->slot( $base + array( 'chromeSlotColour' => '#ff0000' ) );
		$this->assertStringContainsString( '#ff0000', $coloured );
	}

	public function test_other_types_still_require_text(): void {
		$with = $this->slot(
			array(
				'chromeSlotType' => 'heading',
				'chromeSlotText' => 'Menu',
			)
		);
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-slot--heading', $with );
		$this->assertStringContainsString( 'Menu', $with );

		foreach ( array( 'heading', 'label', 'text', 'button' ) as $type ) {
			$this->assertSame(
				'',
				$this->slot(
					array(
						'chromeSlotType' => $type,
						'chromeSlotUrl'  => 'https://example.com/',
					)
				),
				$type . ' with no words must render nothing'
			);
		}
		// Negative control: the rating type is the only one that needs no words.
		$this->assertNotSame( '', $this->slot( array( 'chromeSlotType' => 'google-rating' ) ) );
	}
}
