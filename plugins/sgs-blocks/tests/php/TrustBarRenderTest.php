<?php
/**
 * Tests: sgs/trust-bar bare-icon variant, stroke width, item gap and padding. The
 * marquee options are in TrustBarMarqueeTest; the shared render harness is in
 * TrustBarRenderTrait.
 *
 * The render tests run the REAL src/blocks/trust-bar/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php) in a child PHP process, the same way
 * ReviewsPlaceholderTest does, so render.php's top-level state stays out of the PHPUnit
 * process. The harness applies no block.json defaults, so each test passes exactly the
 * attributes it means to.
 *
 * "Default output unchanged" is checked two ways: against goldens captured from the
 * pre-change render.php (test_default_output_matches_pre_change_golden), and by asserting that
 * passing every new attribute at its default renders the same as omitting it.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/TrustBarRenderTrait.php';

final class TrustBarRenderTest extends TestCase {

	use TrustBarRenderTrait;

	/** Golden scoped CSS of the pre-change render for the icon-circle attrs in circle_attrs(). */
	private const GOLDEN_CIRCLE_CSS = '.sgs-tb-1.wp-block-sgs-trust-bar{color:var(--wp--preset--color--text, currentColor)}.sgs-tb-1 .sgs-trust-bar__badge:nth-child(3) .sgs-trust-bar__circle.sgs-trust-bar__circle--filled{--sgs-trust-badge-icon-fill:var(--wp--preset--color--primary, currentColor);}' . "\n" . '.sgs-container-c10c708d{--sgs-trust-badge-circle-bg: var(--wp--preset--color--surface, currentColor);--sgs-trust-badge-icon-colour: var(--wp--preset--color--primary-dark, currentColor);--sgs-trust-badge-text-colour: var(--wp--preset--color--text, currentColor);--sgs-trust-badge-circle-shadow: var(--wp--preset--shadow--subtle);}.sgs-container-c10c708d{gap:0.5rem;}';

	/** Golden scoped CSS of the pre-change render for the auto-scroll attrs in scroll_attrs(). */
	private const GOLDEN_SCROLL_CSS = '.sgs-tb-1.wp-block-sgs-trust-bar{color:var(--wp--preset--color--text, currentColor)}' . "\n" . '.sgs-container-0c0d0389{--sgs-trust-badge-circle-bg: var(--wp--preset--color--surface, currentColor);--sgs-trust-badge-icon-colour: var(--wp--preset--color--primary-dark, currentColor);--sgs-trust-badge-text-colour: var(--wp--preset--color--text, currentColor);--sgs-trust-badge-circle-shadow: var(--wp--preset--shadow--subtle);}';

	/** Golden wrapper opening tag of the pre-change render for scroll_attrs(). */
	private const GOLDEN_SCROLL_OPEN_TAG = '<section class="sgs-container sgs-trust-bar sgs-trust-bar--icon-circle sgs-trust-bar--medium sgs-tb-1 sgs-container-0c0d0389" aria-label="Trust signals" data-auto-scroll="true" data-auto-scroll-speed="medium" data-auto-scroll-pause="true">';

	/** @return array<string, mixed> */
	private function circle_attrs(): array {
		return array(
			'badgeStyle' => 'icon-circle',
			'items'      => array(
				array(
					'icon'  => 'truck',
					'label' => 'Fast delivery',
				),
				array(
					'icon'  => 'check',
					'label' => 'Certified quality',
				),
				array(
					'icon'       => 'star',
					'label'      => 'Trusted service',
					'fillStyle'  => 'filled',
					'fillColour' => 'primary',
				),
				array(
					'icon'  => 'heart',
					'label' => 'Loved',
				),
			),
			'columns'    => array(
				'desktop' => 4,
				'tablet'  => 4,
				'mobile'  => 2,
			),
			'gap'        => array( 'desktop' => '0.5rem' ),
		);
	}

	/** @return array<string, mixed> */
	private function bare_attrs(): array {
		return array(
			'badgeStyle'   => 'icon-bare',
			'iconBareSize' => 15,
			'iconColour'   => 'primary',
			'items'        => $this->two_items(),
		);
	}

	// ── Defaults are unchanged ───────────────────────────────────────────────

	public function test_default_output_matches_pre_change_golden(): void {
		$circle = $this->render( $this->circle_attrs() );
		$this->assertSame( self::GOLDEN_CIRCLE_CSS, $circle['css'], 'icon-circle scoped CSS is byte-identical to the pre-change render' );
		$this->assertStringContainsString( '<span class="sgs-trust-bar__circle" aria-hidden="true">', $circle['html'] );
		$this->assertStringContainsString( '<span class="sgs-trust-bar__circle sgs-trust-bar__circle--filled" aria-hidden="true">', $circle['html'] );
		$this->assertStringNotContainsString( 'sgs-trust-bar__icon', $circle['html'], 'no bare-icon markup in the circle variant' );

		$scroll = $this->render( $this->scroll_attrs() );
		$this->assertSame( self::GOLDEN_SCROLL_CSS, $scroll['css'], 'auto-scroll scoped CSS is byte-identical to the pre-change render' );
		$this->assertStringContainsString( self::GOLDEN_SCROLL_OPEN_TAG, $scroll['html'], 'auto-scroll wrapper tag is byte-identical to the pre-change render' );
	}

	public function test_new_attributes_at_their_defaults_change_nothing(): void {
		$defaults = array(
			'autoScrollBelow'    => 0,
			'autoScrollDuration' => 0,
			'iconStrokeWidth'    => 1.8,
			'iconBareSize'       => 20,
			'itemGap'            => array(),
			'itemPadding'        => array( 'desktop' => array() ),
		);

		foreach ( array( $this->circle_attrs(), $this->scroll_attrs() ) as $base ) {
			$plain  = $this->render( $base );
			$with   = $this->render( array_merge( $base, $defaults ) );
			$this->assertSame( $this->normalise_uid( $plain['html'] ), $this->normalise_uid( $with['html'] ), 'defaults render exactly as the attributes being absent' );
			$this->assertStringNotContainsString( 'data-auto-scroll-below', $with['html'] );
		}
	}

	// ── Bare icon variant ────────────────────────────────────────────────────

	public function test_bare_variant_has_no_circle_wrapper(): void {
		$out = $this->render( $this->bare_attrs() );

		$this->assertStringContainsString( 'sgs-trust-bar--icon-bare', $out['html'] );
		$this->assertStringContainsString( '<span class="sgs-trust-bar__icon" aria-hidden="true">', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-trust-bar__circle', $out['html'], 'no circle element or class in the bare variant' );
		$this->assertStringContainsString( '<svg', $out['html'], 'the icon still renders' );
		$this->assertStringContainsString( '<span class="sgs-trust-bar__label">Fast delivery</span>', $out['html'] );
		$this->assertStringNotContainsString( ' style="', $out['html'], 'no inline style attribute (Spec 32)' );
		$this->assertStringNotContainsString( 'sgs-trust-badge-circle', $out['css'], 'no circle custom properties in the bare variant' );
	}

	public function test_bare_size_and_colours_are_scoped_custom_properties(): void {
		$out = $this->render( $this->bare_attrs() );

		$this->assertStringContainsString( '--sgs-trust-badge-icon-size: 15px', $out['css'] );
		$this->assertStringContainsString( '--sgs-trust-badge-icon-colour: var(--wp--preset--color--primary, currentColor)', $out['css'] );
		$this->assertStringContainsString( '--sgs-trust-badge-text-colour:', $out['css'] );
	}

	public function test_bare_size_is_independent_of_the_circle_clamp(): void {
		$small = $this->render( array_merge( $this->bare_attrs(), array( 'iconBareSize' => 12 ) ) );
		$this->assertStringContainsString( '--sgs-trust-badge-icon-size: 12px', $small['css'], '12px is below the circle variant\'s 36px floor and still applies' );

		$clamped = $this->render( array_merge( $this->bare_attrs(), array( 'iconBareSize' => 500 ) ) );
		$this->assertStringContainsString( '--sgs-trust-badge-icon-size: 96px', $clamped['css'] );
	}

	public function test_bare_default_size_emits_no_size_variable(): void {
		$out = $this->render( array_merge( $this->bare_attrs(), array( 'iconBareSize' => 20 ) ) );
		$this->assertStringNotContainsString( '--sgs-trust-badge-icon-size', $out['css'] );
	}

	public function test_bare_filled_item_uses_the_bare_class_and_fill_rule(): void {
		$attrs          = $this->bare_attrs();
		$attrs['items'] = array(
			array(
				'icon'       => 'star',
				'label'      => 'Trusted',
				'fillStyle'  => 'filled',
				'fillColour' => 'primary',
			),
		);
		$out            = $this->render( $attrs );

		$this->assertStringContainsString( 'sgs-trust-bar__icon sgs-trust-bar__icon--filled', $out['html'] );
		$this->assertStringContainsString( '.sgs-trust-bar__icon.sgs-trust-bar__icon--filled{--sgs-trust-badge-icon-fill:', $out['css'] );
	}

	// ── Stroke width ─────────────────────────────────────────────────────────

	public function test_stroke_width_is_scoped_css_not_inline(): void {
		foreach ( array( 'icon-bare' => '.sgs-trust-bar__icon', 'icon-circle' => '.sgs-trust-bar__circle' ) as $variant => $icon_class ) {
			$out = $this->render(
				array(
					'badgeStyle'      => $variant,
					'iconStrokeWidth' => 1.6,
					'items'           => $this->two_items(),
				)
			);

			$this->assertStringContainsString( '--sgs-trust-badge-icon-stroke-width: 1.6', $out['css'], $variant );
			$this->assertStringContainsString( '.sgs-tb-1 ' . $icon_class . ' svg *{stroke-width:inherit;}', $out['css'], $variant . ': children inherit the width' );
			$this->assertStringNotContainsString( ' style="', $out['html'], $variant . ': never inline' );
			$markup = (string) preg_replace( '#<style.*?</style>#s', '', $out['html'] );
			$this->assertStringNotContainsString( '1.6', $markup, $variant . ': the width is in the scoped stylesheet, not the markup' );
		}
	}

	public function test_default_stroke_width_emits_nothing(): void {
		$out = $this->render( array_merge( $this->bare_attrs(), array( 'iconStrokeWidth' => 1.8 ) ) );
		$this->assertStringNotContainsString( 'stroke-width', $out['css'] );
	}

	public function test_stroke_width_is_clamped(): void {
		$high = $this->render( array_merge( $this->bare_attrs(), array( 'iconStrokeWidth' => 99 ) ) );
		$this->assertStringContainsString( '--sgs-trust-badge-icon-stroke-width: 4;', $high['css'] );

		$low = $this->render( array_merge( $this->bare_attrs(), array( 'iconStrokeWidth' => 0.01 ) ) );
		$this->assertStringContainsString( '--sgs-trust-badge-icon-stroke-width: 0.25;', $low['css'] );
	}

	public function test_stroke_width_reaches_a_raw_svg_icon(): void {
		$attrs          = $this->bare_attrs();
		$attrs['items'] = array(
			array(
				'iconSvg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 12h16" stroke-width="3"/></svg>',
				'label'   => 'Raw',
			),
		);
		$attrs['iconStrokeWidth'] = 1.6;
		$out                      = $this->render( $attrs );

		$this->assertStringContainsString( '<path d="M4 12h16"', $out['html'], 'the raw SVG renders' );
		$this->assertStringContainsString( '.sgs-tb-1 .sgs-trust-bar__icon svg *{stroke-width:inherit;}', $out['css'], 'the forcing rule overrides the path\'s own stroke-width attribute' );
	}

	public function test_icon_gradient_targets_the_bare_icon(): void {
		$attrs                       = $this->bare_attrs();
		$attrs['iconColourGradient'] = 'linear-gradient(90deg, #f00, #00f)';
		$out                         = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-tb-1 .sgs-trust-bar__icon svg', $out['css'], 'gradient stroke rule uses the bare-icon selector' );
		$this->assertStringNotContainsString( 'sgs-trust-bar__circle svg', $out['css'] );
	}

	// ── Item gap and padding ─────────────────────────────────────────────────

	public function test_item_gap_and_padding_are_scoped_css(): void {
		$attrs                = $this->bare_attrs();
		$attrs['itemGap']     = array( 'desktop' => '9px' );
		$attrs['itemPadding'] = array(
			'desktop' => array(),
			'mobile'  => array(
				'top'    => '0',
				'right'  => '20px',
				'bottom' => '0',
				'left'   => '20px',
			),
		);
		$out                  = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-tb-1.wp-block-sgs-trust-bar .sgs-trust-bar__badge{gap:9px;}', $out['css'] );
		$this->assertStringContainsString( '@media (max-width:767px){.sgs-tb-1.wp-block-sgs-trust-bar .sgs-trust-bar__badge{padding-top:0px;padding-right:20px;padding-bottom:0px;padding-left:20px;}}', $out['css'] );
		$this->assertStringNotContainsString( ' style="', $out['html'] );
	}

	public function test_item_gap_bare_number_is_pixels(): void {
		$attrs            = $this->bare_attrs();
		$attrs['itemGap'] = array( 'desktop' => '9' );
		$out              = $this->render( $attrs );

		$this->assertStringContainsString( '.sgs-trust-bar__badge{gap:9px;}', $out['css'] );
	}

	public function test_item_spacing_applies_to_every_variant(): void {
		foreach ( array( 'icon-circle', 'text-only', 'image-badge' ) as $variant ) {
			$out = $this->render(
				array(
					'badgeStyle' => $variant,
					'itemGap'    => array( 'desktop' => '4px' ),
					'items'      => $this->two_items(),
				)
			);
			$this->assertStringContainsString( '.sgs-trust-bar__badge{gap:4px;}', $out['css'], $variant );
		}
	}
}
