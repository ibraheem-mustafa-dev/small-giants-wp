<?php
/**
 * Tests: the nav drawer's top-row Google rating (`chromeRating`), an item independent of the free slot.
 *
 * Runs the REAL includes/nav-drawer-chrome.php (sgs_nav_drawer_chrome() and its helpers) in a child PHP
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
	 * The whole chrome row markup and its scoped CSS.
	 *
	 * @param array<string, mixed> $attrs     Nav drawer attributes.
	 * @param array<string, mixed> $site_info Site Info values.
	 * @return array{html: string, css: string}
	 */
	private function row( array $attrs, array $site_info = self::SITE_INFO ): array {
		$out                = $this->run_child(
			'$css = ""; echo sgs_nav_drawer_chrome( $attributes, ".root", "<button class=\"sgs-nav-drawer__close\"></button>", $css ); echo "@@CSS@@" . $css;',
			$attrs,
			$site_info
		);
		list( $html, $css ) = explode( '@@CSS@@', $out, 2 );
		return array(
			'html' => $html,
			'css'  => $css,
		);
	}

	/**
	 * The rating wrapper's markup alone.
	 *
	 * @param array<string, mixed> $attrs     Nav drawer attributes.
	 * @param array<string, mixed> $site_info Site Info values.
	 */
	private function rating( array $attrs, array $site_info = self::SITE_INFO ): string {
		return trim( $this->run_child( 'echo sgs_nav_drawer_chrome_rating_html( $attributes );', $attrs, $site_info ) );
	}

	public function test_the_rating_renders_beside_a_heading_slot_in_one_row(): void {
		$row = $this->row(
			array(
				'chromeSlotType'        => 'heading',
				'chromeSlotText'        => 'EXAMPLE BRAND',
				'chromeSlotPlacement'   => 'after-logo',
				'chromeRating'          => true,
				'chromeRatingPlacement' => 'end',
			)
		)['html'];
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-slot--heading', $row );
		$this->assertStringContainsString( 'EXAMPLE BRAND', $row );
		$this->assertStringContainsString( '<div class="sgs-nav-drawer__chrome-rating sgs-nav-drawer__chrome-rating--at-end">', $row );
		$this->assertStringContainsString( 'sgs-google-rating-badge', $row );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome--close-only', $row );
		// The heading comes first, then the rating, inside the one row element.
		$this->assertLessThan( strpos( $row, 'sgs-nav-drawer__chrome-rating' ), strpos( $row, 'EXAMPLE BRAND' ) );
		$this->assertSame( 1, substr_count( $row, '<div class="sgs-nav-drawer__chrome' ) - substr_count( $row, '<div class="sgs-nav-drawer__chrome-' ) );
		// Spec 32: no inline style declaration on the front end.
		$this->assertStringNotContainsString( ' style="', $row );

		// Negative control: the same heading with the rating off has no rating.
		$off = $this->row(
			array(
				'chromeSlotType' => 'heading',
				'chromeSlotText' => 'EXAMPLE BRAND',
			)
		)['html'];
		$this->assertStringContainsString( 'EXAMPLE BRAND', $off );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating', $off );
		$this->assertStringNotContainsString( 'sgs-google-rating-badge', $off );
	}

	public function test_rating_off_renders_nothing_even_with_site_info_data(): void {
		$this->assertSame( '', $this->rating( array( 'chromeRating' => false ) ) );
		$this->assertSame( '', $this->rating( array() ) );
		// Negative control: switched on, the same data renders the badge.
		$this->assertStringContainsString( 'sgs-google-rating-badge', $this->rating( array( 'chromeRating' => true ) ) );
	}

	public function test_no_rating_data_gives_nothing_and_a_close_only_row(): void {
		$attrs = array( 'chromeRating' => true );
		$this->assertSame( '', $this->rating( $attrs, array() ) );
		$none = $this->row( $attrs, array() )['html'];
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome--close-only', $none );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating', $none );
		// Negative control: with a rating the row is not close-only.
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome--close-only', $this->row( $attrs )['html'] );
		// A heading slot keeps the row open even with no rating data.
		$slot_only = $this->row(
			$attrs + array(
				'chromeSlotType' => 'heading',
				'chromeSlotText' => 'EXAMPLE BRAND',
			),
			array()
		)['html'];
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome--close-only', $slot_only );
	}

	public function test_show_count_controls_the_visible_review_count(): void {
		$base = array( 'chromeRating' => true );
		$off  = $this->rating( $base + array( 'chromeRatingShowCount' => false ) );
		$this->assertStringContainsString( 'sgs-google-rating-badge', $off );
		$this->assertStringNotContainsString( 'sgs-google-rating-badge__count', $off );
		// The visually hidden accessible name always carries the count; only the visible caption is switched.
		$this->assertStringNotContainsString( '>15 reviews<', $off );

		$on = $this->rating( $base + array( 'chromeRatingShowCount' => true ) );
		$this->assertStringContainsString( 'sgs-google-rating-badge__count', $on );
		$this->assertStringContainsString( '>15 reviews<', $on );
	}

	public function test_placement_classes(): void {
		$base   = array( 'chromeRating' => true );
		$center = $this->rating( $base + array( 'chromeRatingPlacement' => 'center' ) );
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-rating--at-center', $center );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating--at-end', $center );
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-rating--at-end', $this->rating( $base + array( 'chromeRatingPlacement' => 'end' ) ) );
		// The default and an off-enum value both fall back to the end.
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-rating--at-end', $this->rating( $base ) );
		$bad = $this->rating( $base + array( 'chromeRatingPlacement' => 'after-logo' ) );
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-rating--at-end', $bad );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating--at-center', $bad );
	}

	public function test_per_device_show_hides_the_rating_by_tier(): void {
		$base = array( 'chromeRating' => true );
		$css  = $this->row(
			$base + array(
				'chromeRatingShow' => array(
					'desktop' => true,
					'mobile'  => false,
				),
			)
		)['css'];
		$this->assertStringContainsString( '.sgs-nav-drawer__chrome-rating', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer__chrome-rating\{[^}]*display:none/', $css );
		$this->assertStringContainsString( '@media', $css );
		// Negative control: unset shows on every device, so no rating rule is emitted.
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating', $this->row( $base )['css'] );
		// The slot's own per-device switch does not hide the rating.
		$slot_hidden = $this->row( $base + array( 'chromeSlotShow' => array( 'mobile' => false ) ) )['css'];
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-rating', $slot_hidden );
	}

	public function test_a_tier_that_hides_an_end_rating_gives_the_close_button_its_auto_margin_back(): void {
		$hidden_on_mobile = array(
			'chromeRating'     => true,
			'chromeRatingShow' => array(
				'desktop' => true,
				'mobile'  => false,
			),
		);
		$css = $this->row( $hidden_on_mobile )['css'];
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer__close\{[^}]*margin-inline-start:auto/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer__close\{[^}]*margin-inline-start:0/', $css );
		// Negative control: a centred rating never touches the close button's margin.
		$centred = $this->row( $hidden_on_mobile + array( 'chromeRatingPlacement' => 'center' ) )['css'];
		$this->assertStringNotContainsString( 'margin-inline-start', $centred );
	}

	public function test_the_badge_is_unframed_and_follows_the_rating_colour(): void {
		$base  = array( 'chromeRating' => true );
		$plain = $this->rating( $base );
		$this->assertStringContainsString( 'border-style:none', $plain );
		$this->assertStringNotContainsString( '#ff0000', $plain );
		$this->assertStringContainsString( '#ff0000', $this->rating( $base + array( 'chromeRatingColour' => '#ff0000' ) ) );
		// The free slot's colour does not paint the rating.
		$this->assertStringNotContainsString( '#00ff00', $this->rating( $base + array( 'chromeSlotColour' => '#00ff00' ) ) );
	}

	public function test_the_slot_types_are_the_original_five(): void {
		$list = json_decode( $this->run_child( 'echo json_encode( sgs_nav_drawer_chrome_slot_types() );', array(), array() ), true );
		$this->assertSame( array( '', 'heading', 'label', 'text', 'button' ), $list );
		// Negative control: the rating is not a slot type.
		$this->assertNotContains( 'google-rating', $list );

		$meta = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/block.json' ), true );
		$this->assertSame( $list, $meta['attributes']['chromeSlotType']['enum'] );
		$this->assertFalse( $meta['attributes']['chromeRating']['default'] );
		$this->assertSame( array( 'center', 'end' ), $meta['attributes']['chromeRatingPlacement']['enum'] );
		$this->assertSame( 'end', $meta['attributes']['chromeRatingPlacement']['default'] );

		// A slot of the retired type renders nothing.
		$body = 'echo sgs_nav_drawer_chrome_slot_html( $attributes );';
		$this->assertSame( '', trim( $this->run_child( $body, array( 'chromeSlotType' => 'google-rating' ), self::SITE_INFO ) ) );
		// Negative control: a real slot type with words renders.
		$this->assertNotSame( '', trim( $this->run_child( $body, array( 'chromeSlotType' => 'label', 'chromeSlotText' => 'Hi' ), self::SITE_INFO ) ) );
	}

	public function test_slot_types_still_require_text(): void {
		$with = $this->row(
			array(
				'chromeSlotType' => 'heading',
				'chromeSlotText' => 'Menu',
			)
		)['html'];
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-slot--heading', $with );

		foreach ( array( 'heading', 'label', 'text', 'button' ) as $type ) {
			$html = $this->row(
				array(
					'chromeSlotType' => $type,
					'chromeSlotUrl'  => 'https://example.com/',
				)
			)['html'];
			$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-slot', $html, $type . ' with no words must render nothing' );
		}
	}
}
