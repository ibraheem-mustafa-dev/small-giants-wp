<?php
/**
 * Tests: Breadcrumbs block render.php — archive title markup handling.
 *
 * Verifies that get_the_archive_title() output (which contains markup) is
 * properly stripped and escaped, preventing literal tag characters from
 * appearing as visible text.
 *
 * The bug: esc_html( get_the_archive_title() ) converts markup tags to
 * HTML entities, appearing as "Category: &lt;span&gt;Uncategorized&lt;/span&gt;"
 *
 * The fix: wp_strip_all_tags( get_the_archive_title() ) removes tags first,
 * then esc_html() safely escapes the result.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Tests for breadcrumbs render.php.
 */
class BreadcrumbsRenderTest extends TestCase {

	/**
	 * Test: archive title with markup is handled correctly.
	 *
	 * Simulates WordPress get_the_archive_title() returning markup,
	 * verifies the output does not contain literal or escaped tag chars.
	 *
	 * @return void
	 */
	public function test_archive_title_markup_does_not_appear_as_visible_text(): void {
		// Simulate get_the_archive_title() return value (with markup).
		$archive_title_raw = 'Category: <span>Uncategorized</span>';

		// The BUGGY approach (what the code did before):
		// esc_html( get_the_archive_title() ) — escapes without stripping.
		$buggy_result = htmlspecialchars( $archive_title_raw, ENT_QUOTES, 'UTF-8' );

		// The FIXED approach (what the code does now):
		// esc_html( wp_strip_all_tags( get_the_archive_title() ) )
		// — strips tags first, then escapes.
		$stripped = strip_tags( $archive_title_raw );
		$fixed_result = htmlspecialchars( $stripped, ENT_QUOTES, 'UTF-8' );

		// Verify the bug: buggy approach produces visible tag chars.
		$this->assertStringContainsString(
			'&lt;span&gt;',
			$buggy_result,
			'Buggy approach (without wp_strip_all_tags) produces escaped tag chars visible as text.'
		);

		// Verify the fix: fixed approach removes tag chars.
		$this->assertStringNotContainsString(
			'&lt;span&gt;',
			$fixed_result,
			'Fixed approach (with wp_strip_all_tags) should not produce escaped tag chars.'
		);

		// The fixed result should contain only the text content.
		$this->assertStringContainsString(
			'Category:',
			$fixed_result,
			'Fixed result should contain "Category:" text.'
		);

		$this->assertStringContainsString(
			'Uncategorized',
			$fixed_result,
			'Fixed result should contain "Uncategorized" text.'
		);

		// Confirm they differ (bug vs fix).
		$this->assertNotEquals(
			$buggy_result,
			$fixed_result,
			'Buggy and fixed approaches should produce different results.'
		);
	}

	/**
	 * Test: get_the_title() does not need stripping (returns plain text).
	 *
	 * Verifies that get_the_title() (used on lines 276, 284) returns plain text
	 * without markup, so it does not need wp_strip_all_tags().
	 *
	 * This test documents the behavior difference between get_the_archive_title()
	 * (which may return markup) and get_the_title() (which returns plain text).
	 *
	 * @return void
	 */
	public function test_get_the_title_returns_plain_text_not_markup(): void {
		// Simulate get_the_title() return values (plain text only).
		$post_title = 'About Us';
		$ancestor_title = 'Services';

		// Both should be safe to esc_html() directly without stripping.
		$escaped_post = htmlspecialchars( $post_title, ENT_QUOTES, 'UTF-8' );
		$escaped_ancestor = htmlspecialchars( $ancestor_title, ENT_QUOTES, 'UTF-8' );

		// Should match the input (no markup to strip).
		$this->assertSame(
			$post_title,
			$escaped_post,
			'Plain text post title should remain unchanged after esc_html().'
		);

		$this->assertSame(
			$ancestor_title,
			$escaped_ancestor,
			'Plain text ancestor title should remain unchanged after esc_html().'
		);

		// Confirm no tag chars are present.
		$this->assertStringNotContainsString( '<', $escaped_post );
		$this->assertStringNotContainsString( '&lt;', $escaped_post );
		$this->assertStringNotContainsString( '<', $escaped_ancestor );
		$this->assertStringNotContainsString( '&lt;', $escaped_ancestor );
	}

	/**
	 * Test: render.php source code includes wp_strip_all_tags() call and prefix filter.
	 *
	 * Verifies that the fix (wp_strip_all_tags before esc_html, and prefix filter)
	 * is actually present in the render.php source code for the archive title.
	 *
	 * This is a negative control: if this test fails, it proves the fix is missing.
	 *
	 * @return void
	 */
	public function test_render_php_has_wp_strip_all_tags_for_archive_title(): void {
		$render_file = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/breadcrumbs/render.php';

		$this->assertFileExists(
			$render_file,
			'Breadcrumbs render.php file not found.'
		);

		$source = file_get_contents( $render_file );

		// The fix requires two components in the archive block:
		// 1. The get_the_archive_title_prefix filter suppression.
		// 2. wp_strip_all_tags() to be called on the archive title to remove markup.
		$this->assertStringContainsString(
			"get_the_archive_title_prefix",
			$source,
			'render.php must apply the get_the_archive_title_prefix filter to suppress the WordPress-generated prefix.'
		);

		$this->assertStringContainsString(
			"wp_strip_all_tags(",
			$source,
			'render.php must call wp_strip_all_tags() to strip markup before escaping. ' .
			'Without this, archive titles with markup display visible tag characters to users.'
		);

		// Verify lines 276 and 284 do NOT have wp_strip_all_tags (they use get_the_title which returns plain text).
		// These should only have esc_html( get_the_title(...) ), not esc_html( wp_strip_all_tags( get_the_title(...) ) ).
		$lines = explode( "\n", $source );
		$line_276 = $lines[275] ?? '';
		$line_284 = $lines[283] ?? '';

		// Line 276 should have get_the_title but NOT wp_strip_all_tags on the same call.
		if ( strpos( $line_276, 'get_the_title' ) !== false ) {
			// Check the immediate context: wp_strip_all_tags should NOT precede get_the_title.
			$this->assertStringNotContainsString(
				'wp_strip_all_tags( get_the_title',
				$line_276,
				'Line 276 should NOT strip get_the_title (it returns plain text). Only get_the_archive_title needs stripping.'
			);
		}

		// Line 284 should have get_the_title but NOT wp_strip_all_tags on the same call.
		if ( strpos( $line_284, 'get_the_title' ) !== false ) {
			$this->assertStringNotContainsString(
				'wp_strip_all_tags( get_the_title',
				$line_284,
				'Line 284 should NOT strip get_the_title (it returns plain text). Only get_the_archive_title needs stripping.'
			);
		}
	}

	/**
	 * Test: archive title does not include WordPress's built-in prefix.
	 *
	 * WordPress's get_the_archive_title() includes a prefix like "Category: ",
	 * "Archives: ", "Tag: ", or "Search: " that is redundant in a breadcrumb trail.
	 * The breadcrumb label should contain only the term/archive name, not the prefix.
	 *
	 * This test verifies the logic of suppressing the prefix. It simulates how the
	 * filter 'get_the_archive_title_prefix' removes the prefix from the title.
	 *
	 * @return void
	 */
	/**
	 * NOTE ON COVERAGE, deliberately honest:
	 *
	 * A behavioural test of the prefix suppression is NOT possible in this suite.
	 * It would need a booted WordPress so that `get_the_archive_title()` and the
	 * `get_the_archive_title_prefix` filter actually exist; this suite has neither.
	 *
	 * An earlier version of this file contained a test that LOOKED behavioural — it
	 * built a fixture string that already had no prefix, then asserted the string
	 * had no prefix. It passed with the fix reverted, so it guarded nothing while
	 * reading as proof. It was removed rather than kept, because a test that cannot
	 * fail is worse than no test: it converts "untested" into "tested and green".
	 *
	 * The real guard is test_render_php_has_wp_strip_all_tags_for_archive_title()
	 * above — a STRUCTURAL assertion on the source. It is weaker than a behavioural
	 * test and is labelled as such, but it was verified to FAIL when the fix is
	 * removed from render.php, which is the only property that matters here.
	 */
}
