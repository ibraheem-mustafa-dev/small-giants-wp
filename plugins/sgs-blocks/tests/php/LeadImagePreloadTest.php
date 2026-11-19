<?php
/**
 * Tests: `media/lead-image-preload.php::sgs_lead_image_preload` (Spec 49 section 7.7 rule 4), the head preload of
 * the page's lead image: one link after the viewport meta, the image's srcset and sizes copied exactly, and no link
 * (the page byte-identical) when there is no lead image or it may not be preloaded.
 *
 * Run with:
 *   vendor/bin/phpunit --filter LeadImagePreloadTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

namespace SGS\Blocks\Tests;

use PHPUnit\Framework\TestCase;
use function SGS\Blocks\sgs_lead_image_preload;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class LeadImagePreloadTest extends TestCase {

	private const SRCSET = 'https://x.test/a.jpg 608w, https://x.test/a-300x300.avif 300w';
	private const SIZES  = '(max-width:767.98px) min(630px, calc(50vw - 30px)), min(400px, calc(33.33vw - 40px))';

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'esc_url' ) ) {
			eval( 'function esc_url( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES, "UTF-8" ); }' );
		}
		if ( ! function_exists( 'esc_attr' ) ) {
			eval( 'function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, "UTF-8" ); }' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/media/lead-image-preload.php';
	}

	private static function page( string $body, string $head_extra = '' ): string {
		return "<!DOCTYPE html>\n<html><head>\n<meta charset=\"UTF-8\" />\n<script>var a=1;</script>\n"
			. "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" . $head_extra
			. "<style id=\"big\">.a{color:red}</style>\n</head><body>" . $body . '</body></html>';
	}

	private static function lead( string $extra = '', string $loading = 'eager' ): string {
		return '<img src="https://x.test/a-300x300.avif" alt="A" loading="' . $loading . '" fetchpriority="high" sizes="' . self::SIZES
			. '" srcset="' . self::SRCSET . '"' . $extra . ' />';
	}

	private static function links( string $html ): array {
		preg_match_all( '/<link rel="preload" as="image"[^>]*>/', $html, $m );
		return $m[0];
	}

	public function test_lead_image_gets_one_preload_after_the_viewport_meta_and_before_the_css(): void {
		$out   = sgs_lead_image_preload( self::page( '<p>x</p><img src="https://x.test/b.jpg" alt="" />' . self::lead() ) );
		$links = self::links( $out );
		$this->assertCount( 1, $links );
		$this->assertStringContainsString( 'href="https://x.test/a-300x300.avif"', $links[0] );
		$this->assertStringContainsString( 'fetchpriority="high"', $links[0] );
		$link_at = strpos( $out, $links[0] );
		$this->assertGreaterThan( strpos( $out, 'name="viewport"' ), $link_at, 'after the viewport meta, so sizes resolves at device width' );
		$this->assertLessThan( strpos( $out, '<style id="big">' ), $link_at, 'before the inline CSS' );
	}

	public function test_srcset_and_sizes_are_copied_exactly(): void {
		$links = self::links( sgs_lead_image_preload( self::page( self::lead() ) ) );
		$this->assertStringContainsString( 'imagesrcset="' . self::SRCSET . '"', $links[0] );
		$this->assertStringContainsString( 'imagesizes="' . self::SIZES . '"', $links[0] );
	}

	public function test_character_references_are_decoded_then_escaped_once(): void {
		$html  = self::page( '<img src="https://x.test/a.jpg?w=1&amp;h=2" fetchpriority=high alt="" />' );
		$links = self::links( sgs_lead_image_preload( $html ) );
		preg_match( '/href="([^"]*)"/', $links[0], $href );
		$this->assertSame( 'https://x.test/a.jpg?w=1&h=2', html_entity_decode( $href[1], ENT_QUOTES | ENT_HTML5 ), 'the same URL as the image' );
		$this->assertStringNotContainsString( '&amp;amp;', $links[0], 'escaped once, not twice' );
		$this->assertStringNotContainsString( 'imagesrcset', $links[0], 'no srcset on the image, none on the link' );
	}

	public function test_no_lead_image_leaves_the_page_byte_identical(): void {
		$html = self::page( '<img src="https://x.test/b.jpg" alt="" loading="lazy" />' );
		$this->assertSame( $html, sgs_lead_image_preload( $html ) );
	}

	public function test_a_high_priority_image_in_the_head_does_not_count(): void {
		$html = self::page( '<p>x</p>', '<noscript><img src="https://x.test/px.gif" fetchpriority="high" /></noscript>' );
		$this->assertSame( $html, sgs_lead_image_preload( $html ) );
	}

	/**
	 * @return array<string,array{0:string}>
	 */
	public static function refused(): array {
		return array(
			'lazy'           => array( self::lead( '', 'lazy' ) ),
			'no src'         => array( '<img fetchpriority="high" srcset="' . self::SRCSET . '" alt="" />' ),
			'in noscript'    => array( '<noscript>' . self::lead() . '</noscript>' ),
			'in template'    => array( '<template>' . self::lead() . '</template>' ),
			'picture source' => array( '<picture><source type="image/webp" srcset="https://x.test/a.webp" />' . self::lead() . '</picture>' ),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'refused' )]
	public function test_an_image_that_may_not_be_preloaded_gets_none( string $body ): void {
		$html = self::page( $body );
		$this->assertSame( $html, sgs_lead_image_preload( $html ) );
	}

	public function test_only_the_first_lead_image_is_considered(): void {
		$html = self::page( self::lead( '', 'lazy' ) . '<img src="https://x.test/c.jpg" fetchpriority="high" alt="" />' );
		$this->assertSame( $html, sgs_lead_image_preload( $html ), 'a refused lead is not replaced by a later image' );
	}

	public function test_a_closed_picture_before_the_image_does_not_refuse_it(): void {
		$body = '<picture><source srcset="https://x.test/l.webp" /><img src="https://x.test/l.jpg" alt="" /></picture>' . self::lead();
		$this->assertCount( 1, self::links( sgs_lead_image_preload( self::page( $body ) ) ) );
	}

	public function test_an_image_already_preloaded_gets_no_second_link(): void {
		$head = '<link rel="preload" as="image" href="https://x.test/a-300x300.avif" />' . "\n";
		$html = self::page( self::lead(), $head );
		$this->assertSame( $html, sgs_lead_image_preload( $html ) );
	}

	public function test_without_a_viewport_meta_the_link_follows_the_head_tag(): void {
		$html = '<html><head lang="en"><style>.a{}</style></head><body>' . self::lead() . '</body></html>';
		$out  = sgs_lead_image_preload( $html );
		$this->assertStringStartsWith( "<html><head lang=\"en\">\n<link rel=\"preload\" as=\"image\"", $out );
	}

	public function test_a_page_without_a_head_is_unchanged(): void {
		$html = '<div>' . self::lead() . '</div>';
		$this->assertSame( $html, sgs_lead_image_preload( $html ) );
	}
}
