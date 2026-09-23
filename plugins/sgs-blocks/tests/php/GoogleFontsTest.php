<?php
/**
 * Google Fonts consent + self-host — pure-logic contract tests.
 *
 * Covers what can be proven without WordPress: URL allow-listing (with look-alike hosts as negative
 * controls), CSS2 request building, response parsing, which theme.json entries need self-hosting
 * (a family already served locally must NOT be queued), manifest-to-fontFace mapping, and the
 * consent script respecting an explicit revoke. Network download is proven live via
 * `wp sgs google-fonts sync` on a test site, not here.
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests;

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Google_Fonts_Consent;
use SGS\Blocks\Google_Fonts_Installer;
use SGS\Blocks\Google_Fonts_Self_Host;

require_once __DIR__ . '/stubs/google-fonts-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-google-fonts-installer.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-google-fonts-self-host.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-google-fonts-consent.php';

/**
 * Tests.
 */
class GoogleFontsTest extends TestCase {

	const CSS = "/* cyrillic */\n@font-face {\n  font-family: 'Roboto';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/roboto/v48/cyr.woff2) format('woff2');\n  unicode-range: U+0301, U+0400-045F;\n}\n/* latin */\n@font-face {\n  font-family: 'Roboto';\n  font-style: normal;\n  font-weight: 500;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/roboto/v48/latin.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}\n@font-face {\n  font-family: 'Roboto';\n  font-style: normal;\n  font-weight: 700;\n  src: url(https://fonts.gstatic.com.evil.example/x.woff2) format('woff2');\n}\n@font-face {\n  font-family: 'Lato';\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/lato/x.woff2) format('woff2');\n}";

	/**
	 * Only https URLs on the exact host pass; look-alikes fail.
	 */
	public function test_url_allow_list_is_exact_host_https_only(): void {
		$this->assertTrue( Google_Fonts_Installer::is_allowed_url( 'https://fonts.gstatic.com/s/a.woff2', 'fonts.gstatic.com' ) );
		$this->assertFalse( Google_Fonts_Installer::is_allowed_url( 'http://fonts.gstatic.com/s/a.woff2', 'fonts.gstatic.com' ) );
		$this->assertFalse( Google_Fonts_Installer::is_allowed_url( 'https://fonts.gstatic.com.evil.example/a', 'fonts.gstatic.com' ) );
		$this->assertFalse( Google_Fonts_Installer::is_allowed_url( 'https://evil.example/?fonts.gstatic.com', 'fonts.gstatic.com' ) );
	}

	/**
	 * Family names cannot smuggle query parameters or paths.
	 */
	public function test_family_name_validation(): void {
		$this->assertTrue( Google_Fonts_Installer::valid_family_name( 'Playfair Display' ) );
		$this->assertFalse( Google_Fonts_Installer::valid_family_name( 'Roboto&family=Evil' ) );
		$this->assertFalse( Google_Fonts_Installer::valid_family_name( '../x' ) );
	}

	/**
	 * The CSS2 request names exactly the recorded weights and styles.
	 */
	public function test_css_url_requests_only_recorded_weights(): void {
		$this->assertSame(
			'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500&display=swap',
			Google_Fonts_Installer::css_url( 'Playfair Display', array( '500' ), array( 'normal' ) )
		);
		$this->assertSame(
			'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;1,400;1,500&display=swap',
			Google_Fonts_Installer::css_url( 'Roboto', array( '400', '500' ), array( 'normal', 'italic' ) )
		);
	}

	/**
	 * Weights and styles are normalised; junk is dropped.
	 */
	public function test_normalisers(): void {
		$this->assertSame( array( '400', '700' ), Google_Fonts_Installer::normalise_weights( array( 'bold', '400', 'x', '2000', '400' ) ) );
		$this->assertSame( array( '400' ), Google_Fonts_Installer::normalise_weights( array() ) );
		$this->assertSame( array( 'italic', 'normal' ), Google_Fonts_Installer::normalise_styles( array( 'oblique 10deg', 'normal', 'garbage' ) ) );
	}

	/**
	 * Parsing keeps this family, allowed hosts only, with unicode ranges.
	 */
	public function test_parse_keeps_family_faces_with_allowed_src_only(): void {
		$faces = Google_Fonts_Installer::parse_css( self::CSS, 'Roboto' );
		$this->assertCount( 2, $faces, 'look-alike host and other family must be dropped' );
		$this->assertSame( '500', $faces[1]['fontWeight'] );
		$this->assertSame( 'U+0000-00FF', $faces[1]['unicodeRange'] );
	}

	/**
	 * A family already served locally is not queued (with negative control).
	 */
	public function test_required_skips_a_family_already_served_locally(): void {
		$families = array(
			array(
				'slug'       => 'heading',
				'fontFamily' => '"Playfair Display", serif',
				'fontFace'   => array(
					array(
						'fontFamily' => 'Playfair Display',
						'src'        => array( 'file:./assets/fonts/p.woff2' ),
					),
				),
			),
			array(
				'slug'        => 'playfair-display',
				'fontFamily'  => '"Playfair Display", serif',
				'google'      => true,
				'fontWeights' => array( '500' ),
			),
			array(
				'slug'        => 'roboto',
				'fontFamily'  => 'Roboto, Arial, sans-serif',
				'google'      => true,
				'fontWeights' => array( '400', '500' ),
				'fontFace'    => array(
					array(
						'fontFamily' => 'Roboto',
						'src'        => array( 'https://fonts.gstatic.com/s/roboto/x.woff2' ),
					),
				),
			),
			array(
				'slug'       => 'lato',
				'fontFamily' => 'Lato',
			),
		);
		$local    = static fn( string $src ): bool => str_starts_with( $src, 'file:./' );
		$required = Google_Fonts_Self_Host::required( $families, $local );
		$this->assertSame( array( 2 ), array_keys( $required ), 'only Roboto: Playfair is local, Lato is not flagged google' );
		$this->assertSame( array( '400', '500' ), $required[2]['weights'] );

		// Negative control: with nothing counted as local, Playfair must be queued too.
		$none = static fn( string $src ): bool => '' === $src && false;
		$this->assertSame( array( 1, 2 ), array_keys( Google_Fonts_Self_Host::required( $families, $none ) ) );
	}

	/**
	 * Installed faces point at the site fonts directory.
	 */
	public function test_faces_for_theme_json_point_at_the_site(): void {
		$faces = Google_Fonts_Self_Host::faces_for_theme_json(
			array(
				array(
					'fontFamily'   => 'Roboto',
					'fontStyle'    => 'normal',
					'fontWeight'   => '400',
					'unicodeRange' => 'U+0000-00FF',
					'file'         => 'sgs-google/roboto/latin.woff2',
				),
			),
			'https://example.test/wp-content/uploads/fonts'
		);
		$this->assertSame( array( 'https://example.test/wp-content/uploads/fonts/sgs-google/roboto/latin.woff2' ), $faces[0]['src'] );
		$this->assertSame( 'U+0000-00FF', $faces[0]['unicodeRange'] );
	}

	/**
	 * The consent script never overwrites an explicit revoke.
	 */
	public function test_consent_script_sets_only_an_unset_key(): void {
		$js = Google_Fonts_Consent::script();
		$this->assertStringContainsString( 'null===window.localStorage.getItem("wp-font-library-google-fonts-permission")', $js );
		$this->assertStringContainsString( 'setItem("wp-font-library-google-fonts-permission","true")', $js );
	}
}
