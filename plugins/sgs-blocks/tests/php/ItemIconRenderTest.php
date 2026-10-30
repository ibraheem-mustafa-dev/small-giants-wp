<?php
/**
 * An item icon picked in the editor is drawn on the page.
 *
 * sgs/process-steps (steps[].icon), sgs/timeline (entries[].icon) and sgs/counter (icon) take a Lucide slug.
 * Each draws the bundled SVG inside its icon element; with no icon chosen, or an unknown slug, no icon element
 * is printed.
 *
 * Run with: vendor/bin/phpunit --filter ItemIconRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ItemIconRenderTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_process_steps_draws_the_step_icon(): void {
		$html = $this->render_block( 'sgs/process-steps', array( 'steps' => array( array( 'icon' => 'phone', 'title' => 'Call' ) ) ) )['html'];
		$this->assertMatchesRegularExpression( '/<span class="sgs-process-steps__icon"[^>]*>\s*(<!--.*?-->)?\s*<svg/s', $html );
		$this->assertStringNotContainsString( 'data-icon', $html );
	}

	public function test_process_steps_prints_no_icon_element_without_an_icon(): void {
		$html = $this->render_block( 'sgs/process-steps', array( 'steps' => array( array( 'title' => 'Call' ) ) ) )['html'];
		$this->assertStringNotContainsString( 'sgs-process-steps__icon', $html );
		$html = $this->render_block( 'sgs/process-steps', array( 'steps' => array( array( 'icon' => 'no-such-icon', 'title' => 'Call' ) ) ) )['html'];
		$this->assertStringNotContainsString( 'sgs-process-steps__icon', $html );
	}

	public function test_timeline_draws_the_entry_icon(): void {
		$html = $this->render_block( 'sgs/timeline', array( 'entries' => array( array( 'icon' => 'star', 'title' => 'Founded', 'date' => '2020' ) ) ) )['html'];
		$this->assertMatchesRegularExpression( '/<span class="sgs-timeline__node-icon"[^>]*>\s*(<!--.*?-->)?\s*<svg/s', $html );
		$this->assertStringNotContainsString( 'data-icon', $html );
	}

	public function test_timeline_prints_no_icon_element_without_an_icon(): void {
		$html = $this->render_block( 'sgs/timeline', array( 'entries' => array( array( 'title' => 'Founded', 'date' => '2020' ) ) ) )['html'];
		$this->assertStringNotContainsString( 'sgs-timeline__node-icon', $html );
	}

	public function test_counter_draws_its_icon(): void {
		$html = $this->render_block( 'sgs/counter', array( 'number' => 5, 'label' => 'Years', 'icon' => 'award' ) )['html'];
		$this->assertMatchesRegularExpression( '/<span class="sgs-counter__icon"[^>]*>\s*(<!--.*?-->)?\s*<svg/s', $html );
		$this->assertStringNotContainsString( 'icon-placeholder', $html );
	}

	public function test_counter_prints_no_icon_element_without_an_icon(): void {
		$html = $this->render_block( 'sgs/counter', array( 'number' => 5, 'label' => 'Years' ) )['html'];
		$this->assertStringNotContainsString( 'sgs-counter__icon', $html );
	}
}
