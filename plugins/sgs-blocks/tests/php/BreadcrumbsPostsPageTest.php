<?php
/**
 * sgs/breadcrumbs on the posts page: Home / middle crumb / posts page title.
 *
 * Run with: vendor/bin/phpunit --filter BreadcrumbsPostsPageTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class BreadcrumbsPostsPageTest extends TestCase {

	use BlockHarnessRenderTrait;

	protected function tearDown(): void {
		putenv( 'SGS_QA_IS_HOME' );
		putenv( 'SGS_QA_OPTIONS' );
		putenv( 'SGS_QA_TITLES' );
	}

	/**
	 * Visible crumb labels in order.
	 *
	 * @param string $html Rendered HTML.
	 * @return string[] Labels.
	 */
	private function labels( string $html ): array {
		preg_match_all( '/<li class="sgs-breadcrumbs__item[^"]*"[^>]*>(.*?)<\/li>/s', $html, $m );
		return array_map( static fn( string $li ): string => trim( wp_strip_all_tags( $li ) ), $m[1] );
	}

	public function test_off_the_posts_page_the_trail_is_unchanged(): void {
		$out = $this->render_block( 'sgs/breadcrumbs', array( 'middleCrumbLabel' => 'About' ) );

		$this->assertSame( array( 'Home/', 'About' ), $this->labels( $out['html'] ) );
	}

	public function test_posts_page_appends_its_title_as_the_current_crumb(): void {
		putenv( 'SGS_QA_IS_HOME=1' );
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'page_for_posts' => 2741 ) ) );
		putenv( 'SGS_QA_TITLES=' . json_encode( array( 2741 => 'Journal' ) ) );
		$out = $this->render_block( 'sgs/breadcrumbs', array( 'middleCrumbLabel' => 'About' ) );

		$this->assertSame( array( 'Home/', 'About/', 'Journal' ), $this->labels( $out['html'] ) );
		$this->assertStringContainsString( 'aria-current="page">Journal<', $out['html'] );
		$this->assertStringContainsString( '"name":"Journal"', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], '>About' ), 'the middle crumb appears once' );
	}

	public function test_posts_page_without_a_title_falls_back_to_blog(): void {
		putenv( 'SGS_QA_IS_HOME=1' );
		$out = $this->render_block( 'sgs/breadcrumbs', array() );

		$this->assertSame( array( 'Home/', 'Blog' ), $this->labels( $out['html'] ) );
	}
}
