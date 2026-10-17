<?php
/**
 * Tests: a post-grid card's featured image claims `loading="eager"` and `fetchpriority="high"` only when it is the
 * page's likely LCP image (`sgs_content_image_claims_priority()`, includes/helpers-media.php): the first card of a grid
 * in the page's first section. Every other card, every grid below the first section and every page the REST endpoint
 * fetches later (load more, page buttons, filters) loads lazily at `fetchpriority="auto"`.
 *
 * Runs the real `Post_Grid_REST::render_card()` with the QA harness's WordPress stand-ins
 * (scripts/qa/lib/wp-stubs.php), a featured image that echoes the attributes it was given, and, for the first-section
 * case, scripts/qa/lib/first-section-stub.php.
 *
 * Run with:
 *   vendor/bin/phpunit --filter PostGridImagePriorityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Post_Grid_REST;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class PostGridImagePriorityTest extends TestCase {

	protected function setUp(): void {
		$dir = dirname( __DIR__, 2 );
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', $dir . '/' );
		}
		require_once $dir . '/scripts/qa/lib/wp-stubs.php';
		// Post 5 with a featured image: the shared stubs' get_the_post_thumbnail() prints the attributes the card passes.
		$GLOBALS['sgs_qa_post']        = (object) array( 'ID' => 5, 'post_type' => 'post', 'thumbnail_id' => 9 );
		$GLOBALS['sgs_qa_attachments'] = array( '9' => 'https://example.test/featured.jpg' );
		require_once $dir . '/includes/class-post-grid-rest.php';
	}

	private static function img( int $index ): string {
		$card = Post_Grid_REST::render_card(
			5,
			array(
				'_card_index'  => $index,
				'showCategory' => false,
				'showDate'     => false,
				'showExcerpt'  => false,
				'showReadMore' => false,
			)
		);
		return preg_match( '/<img\b[^>]*>/', $card, $m ) ? $m[0] : '';
	}

	public function test_first_card_outside_the_first_section_loads_lazily(): void {
		$img = self::img( 0 );
		$this->assertStringContainsString( 'loading="lazy"', $img );
		$this->assertStringContainsString( 'fetchpriority="auto"', $img );
	}

	public function test_first_card_of_a_first_section_grid_claims_the_slot_and_the_rest_do_not(): void {
		require_once dirname( __DIR__, 2 ) . '/scripts/qa/lib/first-section-stub.php';
		$first  = self::img( 0 );
		$second = self::img( 1 );
		$this->assertStringContainsString( 'loading="eager"', $first );
		$this->assertStringContainsString( 'fetchpriority="high"', $first );
		$this->assertStringContainsString( 'loading="lazy"', $second );
		$this->assertStringContainsString( 'fetchpriority="auto"', $second );
	}

	public function test_a_second_first_section_grid_does_not_claim_the_slot_again(): void {
		require_once dirname( __DIR__, 2 ) . '/scripts/qa/lib/first-section-stub.php';
		self::img( 0 );
		$this->assertStringContainsString( 'fetchpriority="auto"', self::img( 0 ), 'one high-priority image per page' );
	}
}
