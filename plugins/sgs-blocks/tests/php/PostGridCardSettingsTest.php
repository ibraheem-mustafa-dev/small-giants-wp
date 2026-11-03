<?php
/**
 * sgs/post-grid: metaLayout, categoryPadding, categoryRadius and cardRadius.
 *
 * Each setting is opt-in: unset, the card markup and the scoped CSS are the same as before. The card markup test runs
 * the real Post_Grid_REST::render_card() (the one renderer behind the first render, load more and filters); the CSS
 * tests run the real render.php through the QA harness.
 *
 * Run with: vendor/bin/phpunit --filter PostGridCardSettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Post_Grid_REST;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class PostGridCardSettingsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private static function card( array $extra ): string {
		$dir = dirname( __DIR__, 2 );
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', $dir . '/' );
		}
		require_once $dir . '/scripts/qa/lib/wp-stubs.php';
		$GLOBALS['sgs_qa_post'] = (object) array( 'ID' => 5, 'post_type' => 'post', 'categories' => array( 'News' ), 'post_date' => '2026-01-05 10:00:00' );
		require_once $dir . '/includes/class-post-grid-rest.php';
		return Post_Grid_REST::render_card(
			5,
			array_merge(
				array(
					'cardStyle'    => 'flat',
					'showImage'    => false,
					'showExcerpt'  => false,
					'showReadMore' => false,
					'showDate'     => true,
					'showCategory' => true,
				),
				$extra
			)
		);
	}

	public function test_unset_meta_layout_keeps_the_meta_line_then_the_category_label(): void {
		$html = self::card( array() );
		$this->assertStringNotContainsString( 'sgs-post-grid__meta-row', $html );
		$this->assertLessThan( strpos( $html, 'sgs-post-grid__category ' ), strpos( $html, 'sgs-post-grid__meta"' ) );
	}

	public function test_inline_meta_layout_puts_the_category_label_before_the_date_in_one_row(): void {
		$html = self::card( array( 'metaLayout' => 'inline' ) );
		$this->assertStringContainsString( '<div class="sgs-post-grid__meta-row"><span class="sgs-post-grid__category', $html );
		$this->assertMatchesRegularExpression( '/<\/span><div class="sgs-post-grid__meta"[^>]*><time[^>]*>[^<]*<\/time><\/div><\/div>/', $html );
	}

	public function test_inline_meta_layout_without_a_category_label_adds_no_row(): void {
		$html = self::card( array( 'metaLayout' => 'inline', 'cardStyle' => 'card' ) );
		$this->assertStringNotContainsString( 'sgs-post-grid__meta-row', $html );
	}

	public function test_unset_card_and_category_settings_print_no_rule(): void {
		$out = $this->render_block( 'sgs/post-grid', array( 'cardStyle' => 'flat' ) );
		$this->assertStringNotContainsString( '--sgs-card-radius', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-post-grid__category{padding', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-post-grid__category{border-radius', $out['css'] );
	}

	public function test_card_radius_writes_the_card_radius_property_on_the_block_root(): void {
		$out = $this->render_block( 'sgs/post-grid', array( 'cardStyle' => 'flat', 'cardRadius' => '22px' ) );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-post-grid\{--sgs-card-radius:22px;\}/', $out['css'] );
	}

	public function test_category_padding_and_radius_print_on_the_category_label(): void {
		$out = $this->render_block(
			'sgs/post-grid',
			array(
				'cardStyle'       => 'flat',
				'categoryPadding' => array( 'desktop' => array( 'top' => '4px', 'right' => '9px', 'bottom' => '4px', 'left' => '9px' ) ),
				'categoryRadius'  => '3px',
			)
		);
		$this->assertStringContainsString( '.sgs-post-grid__category{padding-top:4px;padding-right:9px;padding-bottom:4px;padding-left:9px;}', $out['css'] );
		$this->assertStringContainsString( '.sgs-post-grid__category{border-radius:3px;}', $out['css'] );
	}
}
