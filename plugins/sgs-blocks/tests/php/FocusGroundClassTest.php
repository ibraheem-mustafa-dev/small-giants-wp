<?php
/**
 * Tests: a control on a dark or imagery ground carries the class that hands the focus system its on-dark or duotone tokens.
 *
 * Renders the real render.php of each block and asserts the ground classes (theme/sgs-theme/assets/css/focus.css):
 * the gallery lightbox dialog and the dark themes of google-reviews and trustpilot-reviews carry `sgs-on-dark`
 * (and the light themes do not); the before-after video toggle, which sits over imagery, carries `sgs-focus--duotone`.
 * Also asserts the block-link overlay anchor that keeps its own tab stop (no lender link) carries `sgs-focus--inset`
 * and the inert overlay beside a lender link does not.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class FocusGroundClassTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The class attribute of the first element matching an XPath on a class token.
	 *
	 * @param string $html  Rendered HTML.
	 * @param string $token Class token the element is found by.
	 */
	private function classes_of( string $html, string $token ): string {
		$doc = new DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="utf-8"?><body>' . $html . '</body>' );
		libxml_clear_errors();
		$xp   = new DOMXPath( $doc );
		$node = $xp->query( "//*[contains(concat(' ', normalize-space(@class), ' '), ' {$token} ')]" )->item( 0 );
		$this->assertNotNull( $node, "no element carries {$token}" );
		return (string) $node->getAttribute( 'class' );
	}

	private function has_token( string $classes, string $token ): bool {
		return in_array( $token, preg_split( '/\s+/', trim( $classes ) ) ?: array(), true );
	}

	public function test_gallery_lightbox_dialog_is_on_dark(): void {
		$out = $this->render_block(
			'sgs/gallery',
			array( 'enableLightbox' => true, 'images' => array( array( 'id' => 0, 'url' => 'https://example.test/a.jpg', 'alt' => 'A' ) ) )
		);
		$this->assertTrue( $this->has_token( $this->classes_of( $out['html'], 'sgs-gallery__lightbox' ), 'sgs-on-dark' ), 'the lightbox dialog sits on a dark scrim' );
	}

	public function test_google_reviews_dark_theme_is_on_dark_and_light_is_not(): void {
		$base = array(
			'placeId'    => 'ChIJtestplace',
			'dataSource' => 'inline',
			'reviews'    => array( array( 'author' => 'A', 'text' => 'Body.', 'rating' => 5 ) ),
		);
		$dark  = $this->render_block( 'sgs/google-reviews', $base + array( 'theme' => 'dark' ) );
		$light = $this->render_block( 'sgs/google-reviews', $base + array( 'theme' => 'light' ) );
		$this->assertTrue( $this->has_token( $this->classes_of( $dark['html'], 'sgs-google-reviews--theme-dark' ), 'sgs-on-dark' ) );
		$this->assertFalse( $this->has_token( $this->classes_of( $light['html'], 'sgs-google-reviews--theme-light' ), 'sgs-on-dark' ) );
	}

	public function test_trustpilot_dark_theme_is_on_dark_and_light_is_not(): void {
		$base  = array( 'dataSource' => 'placeholder', 'showArrows' => true, 'showDots' => true );
		$dark  = $this->render_block( 'sgs/trustpilot-reviews', $base + array( 'theme' => 'dark' ) );
		$light = $this->render_block( 'sgs/trustpilot-reviews', $base + array( 'theme' => 'light' ) );
		$this->assertTrue( $this->has_token( $this->classes_of( $dark['html'], 'sgs-trustpilot-reviews--theme-dark' ), 'sgs-on-dark' ) );
		$this->assertFalse( $this->has_token( $this->classes_of( $light['html'], 'sgs-trustpilot-reviews--theme-light' ), 'sgs-on-dark' ) );
	}

	public function test_before_after_video_toggle_is_duotone(): void {
		$out = $this->render_block(
			'sgs/before-after',
			array(
				'beforeMediaType' => 'video',
				'beforeVideoUrl'  => 'https://example.test/before.mp4',
				'afterImageUrl'   => 'https://example.test/after.jpg',
				'heightUnit'      => 'px',
			)
		);
		$this->assertTrue( $this->has_token( $this->classes_of( $out['html'], 'wp-block-sgs-before-after__video-toggle' ), 'sgs-focus--duotone' ), 'the toggle sits over imagery' );
	}

	public function test_block_link_overlay_with_no_lender_is_inset_and_with_a_lender_is_not(): void {
		foreach ( array( 'untrailingslashit' => 'rtrim( $v, "/\\\\" )', 'esc_url' => '(string) $v', 'esc_attr' => 'htmlspecialchars( (string) $v, ENT_QUOTES )', 'wp_parse_url' => 'parse_url( $v, $c )' ) as $name => $body ) {
			if ( ! function_exists( $name ) ) {
				// phpcs:ignore Squiz.PHP.Eval.Discouraged -- stubs the WordPress helpers the pure string function calls.
				eval( 'function ' . $name . '( $v, $c = -1 ) { return ' . $body . '; }' );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/hover-effects/link-overlay.php';
		$fn    = '\\SGS\\Blocks\\insert_block_link_overlay';
		$root  = '<div class="card"><p>Text</p></div>';
		$none  = $fn( $root, 0, 'https://example.test/x', false, 'Go' );
		$owned = $fn( '<div class="card"><a href="https://example.test/x">Title</a></div>', 0, 'https://example.test/x', false, 'Go' );
		$this->assertTrue( $this->has_token( $this->classes_of( $none, 'sgs-block-link-overlay' ), 'sgs-focus--inset' ), 'a focusable overlay is inset so an overflow:hidden card cannot clip its ring' );
		$this->assertFalse( $this->has_token( $this->classes_of( $owned, 'sgs-block-link-overlay' ), 'sgs-focus--inset' ), 'the inert overlay beside a lender link takes no ring' );
	}
}
