<?php
/**
 * sgs/mega-aside carries the standard block link and its own hover shadow: the overlay is a stretched-link sibling
 * appended as the aside's last child (never a wrapper, so the drawer's nth-child card slots stay put and the inner
 * button is not a nested link), and the shadow comes through the shared shadow assembler.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter MegaAsideBlockLinkTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class MegaAsideBlockLinkTest extends TestCase {

	private const CONTENT = '<div class="wp-block-sgs-media">m</div><p class="wp-block-sgs-label">tag</p><h3 class="wp-block-sgs-heading">T</h3><p class="wp-block-sgs-text">d</p><div class="wp-block-sgs-button"><a class="sgs-button" href="/about/our-story/">Go</a></div>';

	private function aside( array $attributes ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsma' );
		file_put_contents( $file, json_encode( array( 'attributes' => (object) $attributes, 'content' => self::CONTENT ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/mega-aside-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . $out );
		return (string) $decoded['html'];
	}

	public function test_a_block_link_adds_a_sibling_overlay_and_leaves_the_slots_alone(): void {
		$html = $this->aside( array( 'sgsBlockLink' => '/about/our-story/', 'sgsBlockLinkLabel' => 'Read our story' ) );
		$this->assertStringContainsString( 'sgs-has-block-link', $html );
		$this->assertSame( 1, preg_match( '/<div class="[^"]*sgs-has-block-link[^"]*"/', $html ), 'the class is on the aside root' );
		$this->assertSame( 1, preg_match( '/<a [^>]*sgs-block-link-overlay[^>]*><\/a><\/div>\s*$/', $html ), 'the overlay is the aside\'s last child' );
		$this->assertSame( 0, preg_match( '/<a [^>]*sgs-block-link-overlay[^>]*>[^<]*<(?:div|p|h3|a)/', $html ), 'the overlay wraps nothing' );
		$inner = substr( $html, (int) strpos( $html, '<div class="wp-block-sgs-media' ) );
		$this->assertSame( 5, preg_match_all( '/<(?:div|p|h3) class="wp-block-sgs-(?:media|label|heading|text|button)"/', $inner ), 'the five content slots are untouched, in order' );
		$this->assertStringContainsString( 'class="sgs-button sgs-block-link-source" href="/about/our-story/"', $html, 'the inner button, with the same destination, is the one accessible link' );
		$this->assertStringContainsString( 'tabindex="-1" aria-hidden="true"></a></div>', $html, 'the overlay is hidden from assistive tech and the tab order' );
		$this->assertSame( 0, preg_match( '/<a [^>]*>(?:(?!<\/a>).)*<a /s', $html ), 'no link nests inside another' );
	}

	public function test_without_a_link_the_aside_is_unchanged(): void {
		$html = $this->aside( array() );
		$this->assertStringNotContainsString( 'sgs-block-link-overlay', $html );
		$this->assertStringNotContainsString( 'sgs-has-block-link', $html );
	}

	public function test_hover_shadow_comes_through_the_shared_assembler(): void {
		$html = $this->aside( array( 'asideShadow' => 'soft', 'asideShadowHover' => 'lg' ) );
		$this->assertMatchesRegularExpression( '/:hover[^{]*\{[^}]*box-shadow:/', $html, 'a hover rule paints the shadow' );
		$this->assertMatchesRegularExpression( '/:has\(:focus-visible\)[^{]*\{[^}]*box-shadow:/', $html );
		$plain = $this->aside( array() );
		$this->assertStringNotContainsString( 'box-shadow', $plain, 'no shadow attributes, no shadow rule' );
	}
}
