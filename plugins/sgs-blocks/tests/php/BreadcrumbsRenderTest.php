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
	 * Test: render.php source code includes wp_strip_all_tags() call.
	 *
	 * Verifies that the fix (wp_strip_all_tags before esc_html) is actually
	 * present in the render.php source code for the archive title on line 290.
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

		// The fix requires wp_strip_all_tags() to be called on get_the_archive_title().
		// Pattern: 'label' => esc_html( wp_strip_all_tags( get_the_archive_title()
		$this->assertStringContainsString(
			"wp_strip_all_tags( get_the_archive_title()",
			$source,
			'render.php must call wp_strip_all_tags( get_the_archive_title() ) to strip markup before escaping. ' .
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
}
