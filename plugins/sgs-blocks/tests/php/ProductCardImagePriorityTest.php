<?php
/**
 * Tests: a bound sgs/product-card's main image claims `loading="eager"` and `fetchpriority="high"` only when it is the
 * page's likely LCP image, and the motion LCP rule (Spec 38A §9) treats the cards a products-mode sgs/card-grid
 * prints accordingly.
 *
 * The causes this pins, for a products-mode grid with a `load` Fade up and "Apply entrance to children" where every
 * card translated but kept opacity 1:
 *   - A card with a photo printed `<img fetchpriority="high">` wherever it sat, so the renderer's image clause
 *     (`Sgs_Motion_Markup::is_priority_image`) set `lcp` and the emitter held its from-opacity at 1.
 *   - A card without a photo shared that card's motion scope (`Sgs_Motion_Renderer::render` hashed only the block
 *     name, the document and the first-section flag), so in the editor preview `Sgs_Motion_Delegate::single_scope_styles`
 *     kept the first card's held-opacity rules and dropped its own fade.
 *   - Not the first-section slot: a card the grid renders through `render_block()` (null parent) never counts as the
 *     first section, in the editor's block-renderer request or below another section.
 *
 * The card renders through the REAL render.php in the QA harness (a child process, `--product-file` with the minimal
 * WooCommerce stub); the motion side runs the shipped renderer with `stubs/motion-render-stubs.php`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ProductCardImagePriorityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Delegate;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

require_once __DIR__ . '/MotionRendererTestTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class ProductCardImagePriorityTest extends TestCase {

	use MotionRendererTestTrait;

	private const PRODUCT = array(
		'id'                => 52,
		'name'              => 'Oak table',
		'price_html'        => '<span class="woocommerce-Price-amount amount">£120</span>',
		'price'             => '120',
		'type'              => 'simple',
		'image_id'          => 7,
		'image_url'         => 'https://example.test/oak.jpg',
		'short_description' => 'Solid oak.',
		'in_stock'          => true,
		'average_rating'    => '4.5',
		'review_count'      => 3,
	);

	/**
	 * The real bound card's HTML, rendered by the QA harness in a child process.
	 *
	 * @param array<string,mixed> $product       The product file.
	 * @param bool                $first_section Whether the card renders inside the page's first section.
	 */
	private function card_html( array $product, bool $first_section = false ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = tempnam( sys_get_temp_dir(), 'sgsat' );
		$prod_f  = tempnam( sys_get_temp_dir(), 'sgspr' );
		$meta_f  = tempnam( sys_get_temp_dir(), 'sgsmt' );
		file_put_contents( $attrs_f, json_encode( array( 'sourceMode' => 'wc-product', 'productId' => 52 ), JSON_THROW_ON_ERROR ) );
		file_put_contents( $prod_f, json_encode( $product, JSON_THROW_ON_ERROR ) );
		// The product photo is attachment 7, 800 x 800: large enough to be the page's lead image.
		file_put_contents( $meta_f, json_encode( array( '7' => array( 'width' => 800, 'height' => 800 ) ), JSON_THROW_ON_ERROR ) );
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug sgs/product-card --attrs-file ' . escapeshellarg( $attrs_f )
				. ' --product-file ' . escapeshellarg( $prod_f )
				. ' --attachment-meta-file ' . escapeshellarg( $meta_f )
				. ( $first_section ? ' --first-section' : '' ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			@unlink( $attrs_f );
			@unlink( $prod_f );
			@unlink( $meta_f );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private static function main_img( string $html ): string {
		return preg_match( '/<img\b[^>]*\bsgs-product-card__image\b[^>]*>/s', $html, $m ) ? $m[0] : '';
	}

	/** The motion a products-mode grid hands each card with stagger apply on: its own load Fade up on the card root. */
	private static function card_motion(): array {
		return self::load_fade();
	}

	private function through_renderer( string $html ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/product-card',
				'attrs'     => array( 'sgsMotion' => self::card_motion() ),
			),
			$html
		);
	}

	public function test_card_outside_the_first_section_loads_its_image_lazily(): void {
		$img = self::main_img( $this->card_html( self::PRODUCT ) );
		$this->assertNotSame( '', $img, 'the bound card prints its main image' );
		$this->assertStringContainsString( 'loading="lazy"', $img );
		$this->assertStringNotContainsString( 'fetchpriority="high"', $img );
	}

	public function test_card_in_the_first_section_claims_the_priority_slot(): void {
		$img = self::main_img( $this->card_html( self::PRODUCT, true ) );
		$this->assertStringContainsString( 'loading="eager"', $img );
		$this->assertStringContainsString( 'fetchpriority="high"', $img );
	}

	public function test_no_card_branch_hardcodes_a_high_priority_image(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/product-card/render.php' );
		$this->assertSame( 0, preg_match( '/fetchpriority="high"/', $src ), 'the variable and simple card branches both decide the priority per render' );
		$this->assertSame( 3, substr_count( $src, 'sgs_pcm_main_image(' ), 'the read-only, variable and simple card branches print the photo through the media renderer, which asks SGS_Media_Priority' );
	}

	public function test_only_the_first_image_above_the_fold_takes_the_page_priority_slot(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-priority.php';
		SGS_Media_Priority::reset();
		$above = array( 'rest' => false, 'armed' => true, 'fold' => true );
		$first = SGS_Media_Priority::resolve( array( 'role' => 'card', 'width' => 800, 'height' => 800 ), $above );
		$next  = SGS_Media_Priority::resolve( array( 'role' => 'card', 'width' => 800, 'height' => 800 ), $above );
		$this->assertSame( array( 'eager', 'high' ), array( $first['loading'], $first['fetchpriority'] ), 'the first card claims the slot' );
		$this->assertSame( array( 'eager', 'auto' ), array( $next['loading'], $next['fetchpriority'] ), 'the next card loads eagerly but takes no priority' );

		$below = SGS_Media_Priority::resolve( array( 'role' => 'card', 'width' => 800, 'height' => 800 ), array( 'rest' => false, 'armed' => true, 'fold' => false ) );
		$this->assertSame( array( 'lazy', 'auto' ), array( $below['loading'], $below['fetchpriority'] ), 'a card below the fold claims nothing' );

		$editor = SGS_Media_Priority::resolve( array( 'role' => 'card', 'width' => 800, 'height' => 800 ), array( 'rest' => true, 'armed' => true, 'fold' => true ) );
		$this->assertSame( 'lazy', $editor['loading'], 'the editor block-renderer request claims nothing' );

		SGS_Media_Priority::reset();
		$hidden = SGS_Media_Priority::resolve( array( 'role' => 'card', 'hidden' => true, 'width' => 800, 'height' => 800 ), $above );
		$lead   = SGS_Media_Priority::resolve( array( 'role' => 'card', 'width' => 800, 'height' => 800 ), $above );
		$this->assertSame( 'lazy', $hidden['loading'], 'a hidden surface claims nothing' );
		$this->assertSame( 'high', $lead['fetchpriority'], 'a hidden image left the slot free' );
	}

	public function test_grid_cards_never_take_the_first_section_slot(): void {
		// The editor's block-renderer request renders the grid alone: no the_content, so no first section is armed.
		$editor = array();
		$grid   = static function () use ( &$editor ): void {
			for ( $i = 0; $i < 6; $i++ ) {
				sgs_test_render_motion_block(
					array( 'blockName' => 'sgs/product-card', 'attrs' => array() ),
					'<div class="wp-block-sgs-product-card"></div>',
					null,
					static function () use ( &$editor ): void {
						$editor[] = Sgs_Motion_Renderer::in_first_section();
					}
				);
			}
		};
		sgs_test_render_motion_block( array( 'blockName' => 'sgs/card-grid', 'attrs' => array() ), '<div></div>', null, $grid );
		$this->assertSame( array_fill( 0, 6, false ), $editor );

		// On a page with another section above the grid, that section takes the slot and no card does.
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '<!-- wp:sgs/section /-->' );
		sgs_test_render_motion_block( array( 'blockName' => 'sgs/container', 'attrs' => array() ), '<div></div>' );
		$editor = array();
		sgs_test_render_motion_block( array( 'blockName' => 'sgs/card-grid', 'attrs' => array() ), '<div></div>', null, $grid );
		$this->assertSame( array_fill( 0, 6, false ), $editor );
	}

	public function test_a_card_outside_the_first_section_fades(): void {
		$this->through_renderer( $this->card_html( self::PRODUCT ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
		$this->assertStringNotContainsString( '--sgs-me-from-op:1;', $this->css() );
	}

	public function test_cards_whose_priority_image_differs_share_one_scope_and_all_fade(): void {
		$GLOBALS['sgs_test_rest'] = true;
		$with    = '<div class="wp-block-sgs-product-card"><img class="sgs-product-card__image" src="a.jpg" alt="" fetchpriority="high"></div>';
		$without = $this->card_html( array( 'image_id' => 0 ) + self::PRODUCT );
		$this->assertStringNotContainsString( 'fetchpriority', $without, 'the no-photo card prints no priority image' );

		$a       = $this->through_renderer( $with );
		$b       = $this->through_renderer( $without );
		$scope_a = $this->scope( $a );
		$this->assertSame( $scope_a, $this->scope( $b ), 'a priority image gives its card no scope of its own' );

		$html = Sgs_Motion_Delegate::single_scope_styles( $a . $b );
		$this->assertSame( 1, preg_match( '/<style id="' . $scope_a . '">(.*?)<\/style>/s', $html, $m ), 'the shared scope prints once' );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $m[1], 'every card fades from its stored start' );
	}
}
