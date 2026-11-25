<?php
/**
 * Tests: sgs/trust-bar separator glyph in every style and layout, a centred last row in a grid, and the one Label colour.
 * The shared render harness is in TrustBarRenderTrait.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarGridTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/TrustBarRenderTrait.php';

final class TrustBarGridTest extends TestCase {

	use TrustBarRenderTrait;

	/** @return array<int, array<string, string>> */
	private function five_items(): array {
		$items = array();
		foreach ( array( 'A', 'B', 'C', 'D', 'E' ) as $label ) {
			$items[] = array(
				'icon'  => 'check',
				'label' => 'Badge ' . $label,
			);
		}

		return $items;
	}

	/**
	 * @param string $style  Badge style.
	 * @param string $layout Layout.
	 * @return array<string, mixed>
	 */
	private function bar( string $style, string $layout ): array {
		return array(
			'badgeStyle'         => $style,
			'layout'             => $layout,
			'items'              => $this->five_items(),
			'columns'            => array(
				'desktop' => 4,
				'tablet'  => 3,
				'mobile'  => 2,
			),
			'gap'                => array( 'desktop' => '20px' ),
			'textBadgeSeparator' => '*',
		);
	}

	// ── Separator ────────────────────────────────────────────────────────────

	public function test_a_row_prints_a_separator_after_every_badge_in_every_style(): void {
		foreach ( array( 'icon-circle', 'icon-bare', 'text-only', 'image-badge' ) as $style ) {
			$out = $this->render( $this->bar( $style, 'flex' ) );

			$this->assertSame( 5, substr_count( $out['html'], 'class="sgs-trust-bar__separator"' ), $style . ': one sibling separator per badge' );
			$this->assertStringNotContainsString( 'sgs-trust-bar__separator--cell', $out['html'], $style );
		}
	}

	public function test_a_grid_prints_the_separator_inside_each_badge_in_every_style(): void {
		foreach ( array( 'icon-circle', 'icon-bare', 'text-only', 'image-badge' ) as $style ) {
			$out = $this->render( $this->bar( $style, 'grid' ) );

			$this->assertSame( 5, substr_count( $out['html'], 'class="sgs-trust-bar__separator sgs-trust-bar__separator--cell"' ), $style . ': one in-badge separator per badge' );
			$this->assertSame( 0, preg_match( '/<\/div><span class="sgs-trust-bar__separator"/', $out['html'] ), $style . ': none printed between grid cells' );
		}
	}

	public function test_no_glyph_prints_no_separator_and_no_grid_rules(): void {
		$attrs = $this->bar( 'icon-circle', 'grid' );
		unset( $attrs['textBadgeSeparator'] );
		$out = $this->render( $attrs );

		$this->assertStringNotContainsString( 'sgs-trust-bar__separator', $out['html'] );
		$this->assertStringNotContainsString( 'gap-x', $out['css'] );
	}

	public function test_a_grid_hides_the_separator_at_the_end_of_each_row_for_each_device(): void {
		$out = $this->render( $this->bar( 'icon-circle', 'grid' ) );

		// The bar prints no title, so the badges are the parent's only children.
		$this->assertStringContainsString( '@media(min-width:1024px){', $out['css'] );
		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(4n+4)>.sgs-trust-bar__separator--cell{display:none;}', $out['css'], 'desktop rows of 4' );
		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(3n+3)>.sgs-trust-bar__separator--cell{display:none;}', $out['css'], 'tablet rows of 3' );
		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(2n+2)>.sgs-trust-bar__separator--cell{display:none;}', $out['css'], 'phone rows of 2' );
		$this->assertStringContainsString( ':not([data-sgs-marquee="on"]):not([data-sgs-marquee-hold])', $out['css'], 'a running marquee has its own one-row layout' );
	}

	public function test_the_grid_separator_reads_the_column_gap_of_each_device(): void {
		$attrs        = $this->bar( 'text-only', 'grid' );
		$attrs['gap'] = array(
			'desktop' => '20px 40px',
			'mobile'  => '8px',
		);
		$out          = $this->render( $attrs );

		$this->assertStringContainsString( '{--sgs-trust-bar-gap-x:40px;}', $out['css'], 'the second part of a row and column pair' );
		$this->assertStringContainsString( '(max-width:767.98px){', $out['css'] );
		$this->assertStringContainsString( '{--sgs-trust-bar-gap-x:8px;}', $out['css'], 'the phone gap' );
	}

	public function test_a_title_beside_the_badges_shifts_the_row_end_rule_by_one(): void {
		$attrs          = $this->bar( 'text-only', 'grid' );
		$attrs['title'] = 'Our promises';
		$out            = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(4n+5)>.sgs-trust-bar__separator--cell', $out['css'] );
	}

	public function test_the_separator_colour_reaches_every_style(): void {
		foreach ( array( 'icon-circle', 'icon-bare', 'text-only', 'image-badge' ) as $style ) {
			$attrs                             = $this->bar( $style, 'flex' );
			$attrs['textBadgeSeparatorColour'] = 'primary';
			$out                               = $this->render( $attrs );

			$this->assertStringContainsString( '.sgs-trust-bar__separator{color:', $out['css'], $style );
		}
	}

	public function test_a_filled_icon_colour_finds_its_badge_beside_the_separators(): void {
		$attrs                           = $this->bar( 'icon-circle', 'flex' );
		$attrs['items'][2]['fillStyle']  = 'filled';
		$attrs['items'][2]['fillColour'] = 'primary';
		$out                             = $this->render( $attrs );

		// Badge 3 is child 5 when a separator follows each of the two badges before it.
		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(5) .sgs-trust-bar__circle.sgs-trust-bar__circle--filled{--sgs-trust-badge-icon-fill:', $out['css'] );

		$grid                           = $this->bar( 'icon-circle', 'grid' );
		$grid['items'][2]['fillStyle']  = 'filled';
		$grid['items'][2]['fillColour'] = 'primary';
		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(3) .sgs-trust-bar__circle', $this->render( $grid )['css'], 'a grid prints no sibling separators' );
	}

	// ── Centre a lone last row ───────────────────────────────────────────────

	public function test_centre_last_row_is_off_by_default(): void {
		$attrs = $this->bar( 'icon-circle', 'grid' );
		unset( $attrs['textBadgeSeparator'] );

		$this->assertStringNotContainsString( 'justify-self:center', $this->render( $attrs )['css'] );
	}

	public function test_centre_last_row_spans_a_lone_last_badge_for_each_device(): void {
		$attrs                  = $this->bar( 'icon-circle', 'grid' );
		$attrs['centreLastRow'] = true;
		unset( $attrs['textBadgeSeparator'] );
		$out = $this->render( $attrs );

		// Five badges: alone on the last row when the rows hold 4 or 2, not when they hold 3.
		$this->assertStringContainsString( '.sgs-trust-bar__badge:last-child:nth-child(4n+5){grid-column:1 / -1;justify-self:center;}', $out['css'] );
		$this->assertStringContainsString( '.sgs-trust-bar__badge:last-child:nth-child(3n+4){grid-column:1 / -1;justify-self:center;}', $out['css'] );
		$this->assertStringContainsString( '.sgs-trust-bar__badge:last-child:nth-child(2n+3){grid-column:1 / -1;justify-self:center;}', $out['css'] );
	}

	public function test_centre_last_row_does_nothing_outside_a_grid(): void {
		$attrs                  = $this->bar( 'icon-circle', 'flex' );
		$attrs['centreLastRow'] = true;

		$this->assertStringNotContainsString( 'justify-self:center', $this->render( $attrs )['css'] );
	}

	// ── One Label colour ─────────────────────────────────────────────────────

	public function test_label_colour_paints_both_label_classes(): void {
		foreach ( array( 'icon-circle', 'icon-bare', 'text-only', 'image-badge' ) as $style ) {
			$attrs                = $this->bar( $style, 'flex' );
			$attrs['labelColour'] = 'accent';
			$out                  = $this->render( $attrs );

			$this->assertMatchesRegularExpression( '/\.sgs-tb-1 \.sgs-trust-bar__label\{color:[^}]*accent/', $out['css'], $style . ': the icon styles print __label' );
			$this->assertMatchesRegularExpression( '/\.sgs-tb-1 \.sgs-trust-bar__badge-label\{color:[^}]*accent/', $out['css'], $style . ': the text styles print __badge-label' );
		}
	}

	public function test_an_unset_label_colour_prints_no_label_rule_so_the_root_text_colour_still_reaches_the_label(): void {
		foreach ( array( 'icon-circle', 'text-only' ) as $style ) {
			$attrs               = $this->bar( $style, 'flex' );
			$attrs['textColour'] = 'accent';
			$out                 = $this->render( $attrs );

			$this->assertStringNotContainsString( '__label{color', $out['css'], $style );
			$this->assertStringNotContainsString( '__badge-label{color', $out['css'], $style );
		}
		$icon               = $this->bar( 'icon-circle', 'flex' );
		$icon['textColour'] = 'accent';
		$this->assertStringContainsString( '--sgs-trust-badge-text-colour:', $this->render( $icon )['css'], 'an icon bar keeps the label colour it stored in textColour' );
	}

	public function test_block_json_default_label_colour_is_unset_and_the_separator_belongs_to_every_style(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/trust-bar/block.json' ), true, 512, JSON_THROW_ON_ERROR );

		$this->assertSame( '', $block['attributes']['labelColour']['default'], 'a default colour printed on every text label beat the root text colour' );
		$this->assertFalse( $block['attributes']['centreLastRow']['default'] );
		$this->assertNotContains( 'textBadgeSeparator', $block['supports']['sgs']['variants']['text-only'] );
	}
}
