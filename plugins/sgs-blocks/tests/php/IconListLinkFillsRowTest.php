<?php
/**
 * sgs/icon-list: a linked row in the flex marker modes carries its vertical padding on the link; every other row keeps
 * the padding on the <li>.
 *
 * Run with: vendor/bin/phpunit --filter IconListLinkFillsRowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class IconListLinkFillsRowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function list( array $extra, bool $linked = true ): array {
		$item = $linked
			? array( 'text' => 'Opticians', 'url' => 'https://example.test/opticians/' )
			: array( 'text' => 'Opticians' );
		return $this->render_block( 'sgs/icon-list', array_merge( array( 'items' => array( $item ) ), $extra ) );
	}

	public function test_a_linked_flex_row_moves_the_padding_onto_the_link(): void {
		$out = $this->list( array( 'itemPaddingBlock' => '12px' ) );

		$this->assertStringContainsString( 'class="sgs-icon-list__item sgs-icon-list__item--linked"', $out['html'] );
		$this->assertStringContainsString( '.sgs-icon-list__item.sgs-icon-list__item--linked{padding-block:0;}', $out['css'] );
		$this->assertStringContainsString( '.sgs-icon-list__text{align-self:stretch;display:flex;align-items:center;}', $out['css'] );
		$this->assertStringContainsString( '.sgs-icon-list__item-link{display:block;padding-block:12px;}', $out['css'] );
	}

	public function test_no_padding_setting_prints_no_link_rules(): void {
		$out = $this->list( array() );

		$this->assertStringNotContainsString( 'align-self:stretch', $out['css'] );
		$this->assertStringNotContainsString( '.sgs-icon-list__item-link{display:block', $out['css'] );
	}

	public function test_list_item_marker_modes_keep_the_padding_on_the_row(): void {
		foreach ( array( 'bullet', 'numbered', 'none' ) as $mode ) {
			$out = $this->list( array( 'itemPaddingBlock' => '12px', 'markerType' => $mode ) );
			$this->assertStringContainsString( '.sgs-icon-list__item{padding-block:12px;}', $out['css'], $mode );
			$this->assertStringNotContainsString( 'align-self:stretch', $out['css'], $mode );
			$this->assertStringNotContainsString( 'item-link{display:block', $out['css'], $mode );
		}
	}

	public function test_an_unlinked_row_has_no_linked_class(): void {
		$out = $this->list( array( 'itemPaddingBlock' => '12px' ), false );

		$this->assertStringNotContainsString( 'sgs-icon-list__item--linked"', $out['html'] );
		$this->assertStringContainsString( 'class="sgs-icon-list__item"', $out['html'] );
	}
}
