<?php
/**
 * A text setting the author types prints as inline HTML (Bean 2026-10-30).
 *
 * The shared print path (helpers-inline-formats.php::sgs_rich_text_kses, ::sgs_authored_text_plain) and a sample of
 * converted blocks. The harness stubs wp_kses() as a pass-through, so these tests prove the render path (markup is
 * not escaped; attribute and JSON contexts get plain words); the real kses allowlist is proved on a WordPress install
 * by the check in the report. Each block test fails on the old render (`esc_html( $value )` turned
 * `<strong>` into `&lt;strong&gt;`).
 *
 * Run with: vendor/bin/phpunit --filter AuthoredTextRichTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class AuthoredTextRichTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const RICH = 'Save <strong>20%</strong> &amp; <em>more</em><br>today';

	public static function setUpBeforeClass(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		// The shared test bootstrap or an earlier test may have declared wp_kses() / wp_kses_allowed_html(); declare a
		// pass-through only when none exists, so these assertions hold under either stub.
		if ( ! function_exists( 'wp_kses_allowed_html' ) ) {
			function wp_kses_allowed_html( $context = '' ) { // phpcs:ignore
				return array( 'a' => array( 'href' => true ), 'strong' => array(), 'em' => array(), 'br' => array() );
			}
		}
		if ( ! function_exists( 'wp_kses' ) ) {
			function wp_kses( $content, $allowed_html, $allowed_protocols = array() ) { // phpcs:ignore
				return (string) $content;
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-inline-formats.php';
	}

	public function test_plain_helper_strips_tags_breaks_and_decodes_entities(): void {
		$this->assertSame( 'Save 20% & more today', sgs_authored_text_plain( self::RICH ) );
		$this->assertSame( 'A & B < C "q" \'s\'', sgs_authored_text_plain( 'A &amp; B &lt; C &quot;q&quot; &#039;s&#039;' ) );
		$this->assertSame( '', sgs_authored_text_plain( array( 'not', 'scalar' ) ) );
	}

	public function test_a_plain_value_keeps_its_words_through_the_plain_helper(): void {
		$value = 'Tom & Jerry "love" it';
		$this->assertSame( $value, sgs_authored_text_plain( $value ), 'a stored plain value reads the same as plain text' );
	}

	public function test_a_stored_plain_value_with_a_stray_less_than_keeps_its_words(): void {
		$out = sgs_rich_text_kses( 'Rooms from 5 < 6 guests & "extras" > none' );
		$this->assertStringContainsString( '5 &lt; 6 guests', $out, 'a < that opens no tag is escaped, not read as a tag start' );
		$this->assertStringContainsString( 'none', $out );
	}

	public function test_link_is_dropped_but_its_words_stay_when_the_text_prints_inside_a_link(): void {
		$out = sgs_rich_text_kses( 'Buy <a href="https://example.org/">now</a> <strong>today</strong>', false );
		$this->assertStringNotContainsString( '<a', $out );
		$this->assertStringContainsString( 'now', $out );
		$this->assertStringContainsString( 'today', $out );
		$this->assertStringContainsString( '<a href="https://example.org/">now</a>', sgs_rich_text_kses( 'Buy <a href="https://example.org/">now</a>' ), 'the default keeps the link' );
	}

	public function test_star_rating_label_prints_its_markup(): void {
		$html = $this->render_block( 'sgs/star-rating', array( 'rating' => 4, 'displayMode' => 'stars-only', 'label' => self::RICH ) )['html'];
		$this->assertStringContainsString( '<strong>20%</strong>', $html );
		$this->assertStringNotContainsString( '&lt;strong&gt;', $html, 'the old render escaped the markup' );
	}

	public function test_separator_content_text_prints_its_markup(): void {
		$html = $this->render_block( 'sgs/separator', array( 'contentMode' => 'text', 'contentText' => self::RICH ) )['html'];
		$this->assertStringContainsString( '<em>more</em>', $html );
		$this->assertStringNotContainsString( '&lt;em&gt;', $html );
	}

	public function test_local_time_label_prints_its_markup(): void {
		$html = $this->render_block( 'sgs/local-time', array( 'label' => self::RICH, 'timeZone' => 'Europe/London' ) )['html'];
		$this->assertStringContainsString( '<strong>20%</strong>', $html );
		$this->assertStringNotContainsString( '&lt;strong&gt;', $html );
	}

	public function test_modal_trigger_keeps_markup_in_the_button_and_plain_words_in_the_dialog_name(): void {
		$html = $this->render_block( 'sgs/modal', array( 'triggerText' => 'Open <strong>now</strong>' ) )['html'];
		$this->assertStringContainsString( '<strong>now</strong>', $html );
		$this->assertStringContainsString( 'aria-label="Open now"', $html, 'the accessible name is plain words' );
	}

	public function test_product_search_label_keeps_markup_in_the_text_and_plain_words_in_the_accessible_name(): void {
		$html = $this->render_block( 'sgs/product-search', array( 'buttonLabel' => 'Find <strong>it</strong>' ) )['html'];
		$this->assertStringContainsString( 'aria-label="Find it"', $html );
		$this->assertStringContainsString( 'Find <strong>it</strong>', $html );
		$this->assertStringNotContainsString( '&lt;strong&gt;', $html );
	}

	public function test_form_field_label_keeps_markup_and_names_the_field_from_its_words(): void {
		$html = $this->render_block( 'sgs/form-field-text', array( 'label' => 'Your <strong>name</strong>', 'fieldName' => '' ) )['html'];
		$this->assertStringContainsString( 'Your <strong>name</strong>', $html );
		$this->assertStringNotContainsString( '&lt;strong&gt;', $html );
		$this->assertMatchesRegularExpression( '/name="your-name[^"]*"/', $html, 'the submission name is slugged from the words, not the markup' );
	}

	public function test_icon_label_keeps_markup(): void {
		$html = $this->render_block( 'sgs/icon', array( 'iconName' => 'star', 'showLabel' => true, 'labelText' => 'Five <strong>stars</strong>' ) )['html'];
		$this->assertStringContainsString( 'Five <strong>stars</strong>', $html );
		$this->assertStringNotContainsString( '&lt;strong&gt;', $html );
	}

	public function test_media_caption_aria_name_for_a_video_is_plain_words(): void {
		$html = $this->render_block( 'sgs/media', array( 'mediaType' => 'video', 'videoUrl' => 'https://example.test/v.mp4', 'caption' => 'A <strong>short</strong> film' ) )['html'];
		$this->assertStringContainsString( 'A <strong>short</strong> film', $html );
		$this->assertStringNotContainsString( 'aria-label="A <', $html );
	}

	public function test_an_image_and_a_highlight_survive_only_in_a_setting_that_holds_those_formats(): void {
		if ( ! function_exists( 'wp_kses_allowed_html' ) ) {
			$this->markTestSkipped( 'needs the allowlist stub' );
		}
		$html = 'Hi <img src="https://example.test/a.jpg" alt="a"> <span class="sgs-highlight sgs-highlight--accent">hot</span>';
		$free = sgs_rich_text_kses( $html );
		$this->assertStringNotContainsString( '<img', $free, 'a free-text setting strips the photo' );
		$this->assertStringNotContainsString( 'sgs-highlight', $free, 'and the highlight class' );
		$this->assertStringContainsString( 'hot', $free );
		$body = sgs_rich_text_kses( $html, true, 'body' );
		$this->assertStringContainsString( '<img', $body, 'a body setting (RICH_TEXT_BODY) keeps the photo' );
		// (The body highlight span is kept by WordPress's real kses; this test's stub allowlist has no such span.)
	}
}
