<?php
/**
 * sgs/icon-list: linkUnderline reaches the per-item links through sgs_link_underline_css, an explicit choice replaces
 * the row's inherited decoration, and none/always switch the theme's site-wide link sweep off for the list.
 *
 * Run with: vendor/bin/phpunit --filter IconListLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class IconListLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function list( array $extra ): array {
		return $this->render_block(
			'sgs/icon-list',
			array_merge(
				array(
					'items' => array(
						array( 'text' => 'Opticians', 'url' => 'https://example.test/opticians/' ),
						array( 'text' => 'Contact lenses', 'url' => 'https://example.test/lenses/' ),
					),
				),
				$extra
			)
		);
	}

	public function test_sweep_paints_the_items_links_with_the_doubled_class(): void {
		$out = $this->list( array( 'linkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( 'class="sgs-icon-list__item-link"', $out['html'], 'positive control: an item rendered as a link' );
		$this->assertMatchesRegularExpression( '/(\.sgs-ilist-[0-9a-f]{8}\.wp-block-sgs-icon-list)\1 a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-sweep-thickness:0px', $out['css'], 'sweep keeps the sweep on' );
	}

	public function test_none_and_always_switch_the_site_wide_sweep_off_for_the_list(): void {
		foreach ( array( 'none', 'always' ) as $mode ) {
			$out = $this->list( array( 'linkUnderline' => $mode ) );
			$this->assertMatchesRegularExpression( '/(\.sgs-ilist-[0-9a-f]{8}\.wp-block-sgs-icon-list)\1 \.sgs-icon-list__item-link\{--sgs-sweep-thickness:0px;\}/', $out['css'], $mode );
		}
	}

	public function test_unset_leaves_the_theme_default_untouched(): void {
		$out = $this->list( array() );

		$this->assertStringNotContainsString( '--sgs-sweep-thickness', $out['css'] );
		$this->assertStringNotContainsString( 'link-sweep', $out['css'], 'negative control: nothing printed when unset' );
	}

	public function test_an_explicit_choice_replaces_the_rows_inherited_decoration(): void {
		$with = $this->list( array( 'itemTextDecoration' => 'underline' ) );
		$this->assertStringContainsString( '.sgs-icon-list__item-link{text-decoration:inherit}', $with['css'], 'positive control: the row decoration reaches the link' );

		$both = $this->list( array( 'itemTextDecoration' => 'underline', 'linkUnderline' => 'none' ) );
		$this->assertStringNotContainsString( '.sgs-icon-list__item-link{text-decoration:inherit}', $both['css'] );
	}
}
