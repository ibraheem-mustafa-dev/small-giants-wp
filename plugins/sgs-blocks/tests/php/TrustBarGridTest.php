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

	public function test_a_title_takes_a_grid_cell_so_the_row_end_rule_counts_it(): void {
		// A static grid gives the title the first cell: with four columns the end of row one is the third badge, which is
		// child four (the title is child one), so the rule is `4n+4`, not the badge after it.
		$attrs          = $this->bar( 'text-only', 'grid' );
		$attrs['title'] = 'Our promises';
		$out            = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(4n+4)>.sgs-trust-bar__separator--cell', $out['css'] );
		$this->assertStringNotContainsString( 'nth-child(4n+5)', $out['css'] );
	}

	public function test_a_title_outside_the_marquee_track_is_not_a_sibling_of_the_badges(): void {
		// With a marquee layer the badges sit in the track and the title does not: `:nth-child` counts the badges alone, but
		// the grid still gives the title the first cell, so the third badge (child three) ends row one.
		$attrs              = $this->bar( 'text-only', 'grid' );
		$attrs['title']     = 'Our promises';
		$attrs['sgsMotion'] = array(
			'v'        => 1,
			'elements' => array(
				'root' => array(
					'effects' => array(
						array(
							'id'     => 'marquee',
							'effect' => 'marquee',
							'values' => array( 'belowBreakpoint' => 'overflow' ),
						),
					),
				),
			),
		);
		$out                = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-trust-bar__badge:nth-child(4n+3)>.sgs-trust-bar__separator--cell', $out['css'] );
	}

	public function test_a_phone_that_stores_no_gap_keeps_the_tablet_gap_for_the_separator(): void {
		$attrs        = $this->bar( 'text-only', 'grid' );
		$attrs['gap'] = array(
			'desktop' => '2rem',
			'tablet'  => '1rem',
		);
		$css          = $this->render( $attrs )['css'];

		$this->assertStringContainsString( '{--sgs-trust-bar-gap-x:2rem;}', $css );
		// The tablet rule is a max-width query, so it reaches phones as well; no phone rule is needed.
		$this->assertStringContainsString( '@media(max-width:1023.98px){', $css );
		$this->assertMatchesRegularExpression( '/@media\(max-width:1023\.98px\)\{[^}]*\{--sgs-trust-bar-gap-x:1rem;\}\}/', $css );
		$this->assertStringNotContainsString( '(max-width:767.98px){.sgs-tb-1{--sgs-trust-bar-gap-x', $css );
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

	public function test_a_text_or_image_bar_paints_its_label_with_the_label_colour_even_at_the_default(): void {
		foreach ( array( 'text-only', 'image-badge' ) as $style ) {
			$attrs                = $this->bar( $style, 'flex' );
			$attrs['labelColour'] = 'text';
			$out                  = $this->render( $attrs );

			$this->assertMatchesRegularExpression( '/\.sgs-tb-1 \.sgs-trust-bar__badge-label\{color:[^}]*text/', $out['css'], $style . ': the default label colour still prints, as before' );
		}
	}

	public function test_an_icon_bar_with_no_stored_label_colour_keeps_its_root_text_colour_label(): void {
		foreach ( array( 'icon-circle', 'icon-bare' ) as $style ) {
			$attrs                = $this->bar( $style, 'flex' );
			$attrs['labelColour'] = 'text';
			$attrs['textColour']  = 'accent';
			$out                  = $this->render( $attrs );

			$this->assertStringNotContainsString( '.sgs-trust-bar__label{color', $out['css'], $style . ': nothing paints the icon label but the root text colour' );
			$this->assertStringContainsString( '--sgs-trust-badge-text-colour:', $out['css'], $style );
		}
	}

	public function test_a_stored_label_colour_now_paints_an_icon_bar_label(): void {
		foreach ( array( 'icon-circle', 'icon-bare' ) as $style ) {
			$attrs                = $this->bar( $style, 'flex' );
			$attrs['labelColour'] = 'accent';
			$out                  = $this->render( $attrs );

			$this->assertMatchesRegularExpression( '/\.sgs-tb-1 \.sgs-trust-bar__label\{color:[^}]*accent/', $out['css'], $style );
		}
		$hover                      = $this->bar( 'icon-bare', 'flex' );
		$hover['labelColour']       = 'text';
		$hover['labelColourHover']  = 'accent';
		$this->assertStringContainsString( '.sgs-trust-bar__label:focus-visible{color', $this->render( $hover )['css'], 'a stored hover colour paints too' );
	}

	public function test_block_json_keeps_the_label_colour_default_and_the_separator_belongs_to_every_style(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/trust-bar/block.json' ), true, 512, JSON_THROW_ON_ERROR );

		$this->assertSame( 'text', $block['attributes']['labelColour']['default'], 'a text bar keeps painting its label with the theme text colour' );
		$this->assertFalse( $block['attributes']['centreLastRow']['default'] );
		$this->assertNotContains( 'textBadgeSeparator', $block['supports']['sgs']['variants']['text-only'] );
		$this->assertStringNotContainsString( 'text-only', $block['attributes']['textBadgeSeparator']['description'] );
	}
}
