<?php
/**
 * Tests: the sgs/trust-bar marquee-below-a-breakpoint option and its normalisers.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarMarqueeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/TrustBarRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-trust-bar-marquee.php';

final class TrustBarMarqueeTest extends TestCase {

	use TrustBarRenderTrait;

	// ── Marquee below a breakpoint ───────────────────────────────────────────

	public function test_marquee_below_768_emits_the_media_queries_and_attribute(): void {
		$out = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollBelow' => 768 ) ) );

		$this->assertStringContainsString( 'data-auto-scroll-below="768"', $out['html'] );
		$this->assertStringContainsString( '@media (min-width:768px){.sgs-tb-1.sgs-trust-bar[data-auto-scroll="true"]{overflow:visible;}.sgs-tb-1.sgs-trust-bar .sgs-trust-bar__track{display:contents;}.sgs-tb-1.sgs-trust-bar .sgs-trust-bar__track[aria-hidden="true"]{display:none;}}', $out['css'] );
		$this->assertStringContainsString( '@media (max-width:767px) and (prefers-reduced-motion:no-preference){', $out['css'] );
		$this->assertStringContainsString( '.sgs-tb-1.sgs-trust-bar .sgs-trust-bar__marquee-row > .sgs-trust-bar__track,.sgs-tb-1.sgs-trust-bar.sgs-trust-bar__marquee-row > .sgs-trust-bar__track{flex:0 0 auto;gap:inherit;}', $out['css'] );
		$this->assertStringContainsString( '(prefers-reduced-motion:reduce)', $out['css'], 'reduced motion wraps the badges instead of clipping them' );
	}

	/**
	 * `gap:inherit` replaces the stylesheet's own track gap with the PARENT's computed gap.
	 * It is only right while view.js has put the marquee-row class on the parent, so no rule
	 * that carries it may match a bare `.sgs-trust-bar__track`: a bar that does not scroll
	 * (no overflow, reduced motion, no JavaScript) must keep its badge spacing below the
	 * breakpoint.
	 */
	public function test_marquee_track_gap_inherit_is_scoped_to_the_marquee_row(): void {
		foreach ( array( 768, 1024 ) as $below ) {
			$css = sgs_trust_bar_marquee_css( '.sgs-tb-1', $below, 0.0 );

			preg_match_all( '/([^{}]+)\{([^{}]*)\}/', $css, $rules, PREG_SET_ORDER );
			$carrying = array_values(
				array_filter( $rules, static fn( array $rule ): bool => false !== strpos( $rule[2], 'gap:inherit' ) || false !== strpos( $rule[2], 'flex:0 0 auto' ) )
			);
			$this->assertNotEmpty( $carrying, 'the marquee track declarations are still emitted' );

			foreach ( $carrying as $rule ) {
				// Every comma-separated selector of a rule that carries them must sit under the row class.
				foreach ( explode( ',', trim( $rule[1], "@ 	
" ) ) as $selector ) {
					$selector = preg_replace( '/^@media[^{]*\{/', '', trim( $selector ) );
					$this->assertMatchesRegularExpression( '/sgs-trust-bar__marquee-row\s*>\s*\.sgs-trust-bar__track$/', $selector, "$below: `$selector` carries gap:inherit / flex:0 0 auto but is not scoped to the marquee row" );
				}
			}
		}
	}

	public function test_marquee_row_rules_do_not_apply_under_reduced_motion(): void {
		$css = sgs_trust_bar_marquee_css( '.sgs-tb-1', 768, 0.0 );

		$this->assertStringContainsString( '@media (max-width:767px) and (prefers-reduced-motion:no-preference){.sgs-tb-1.sgs-trust-bar[data-auto-scroll="true"] .sgs-trust-bar__marquee-row', $css, 'the nowrap row is motion-gated' );
		$reduced = substr( $css, (int) strpos( $css, '(prefers-reduced-motion:reduce)' ) );
		$this->assertStringNotContainsString( 'gap:inherit', $reduced );
		$this->assertStringNotContainsString( 'marquee-row', $reduced, 'the reduced-motion block resets the plain track only' );
	}

	public function test_marquee_below_1024_uses_the_tablet_tier(): void {
		$out = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollBelow' => 1024 ) ) );

		$this->assertStringContainsString( 'data-auto-scroll-below="1024"', $out['html'] );
		$this->assertStringContainsString( '@media (min-width:1024px){', $out['css'] );
		$this->assertStringContainsString( '@media (max-width:1023px) and (prefers-reduced-motion:no-preference){', $out['css'] );
	}

	public function test_marquee_below_zero_is_todays_output(): void {
		$plain = $this->render( $this->scroll_attrs() );
		$zero  = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollBelow' => 0 ) ) );

		$this->assertSame( $this->normalise_uid( $plain['html'] ), $this->normalise_uid( $zero['html'] ) );
		$this->assertStringNotContainsString( '@media', $zero['css'], 'no media query added at the default' );
	}

	public function test_marquee_below_rejects_a_bespoke_breakpoint(): void {
		$out = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollBelow' => 500 ) ) );

		$this->assertStringNotContainsString( 'data-auto-scroll-below', $out['html'], 'only the 768 / 1024 device tiers are accepted' );
		$this->assertStringNotContainsString( '@media', $out['css'] );
	}

	public function test_marquee_below_is_ignored_without_auto_scroll(): void {
		$attrs               = $this->scroll_attrs();
		$attrs['autoScroll'] = false;
		$out                 = $this->render( array_merge( $attrs, array( 'autoScrollBelow' => 768 ) ) );

		$this->assertStringNotContainsString( 'data-auto-scroll', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-trust-bar__track', $out['html'] );
		$this->assertStringNotContainsString( '@media', $out['css'] );
	}

	public function test_custom_duration_beats_the_preset_and_presets_still_work(): void {
		$custom = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollDuration' => 30 ) ) );
		$this->assertStringContainsString( '.sgs-tb-1.sgs-trust-bar[data-auto-scroll="true"] .sgs-trust-bar__track--ready{animation-duration:30s;}', $custom['css'] );
		$this->assertStringContainsString( 'data-auto-scroll-speed="medium"', $custom['html'], 'the preset attribute is still emitted' );

		$preset = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollSpeed' => 'fast' ) ) );
		$this->assertStringContainsString( 'data-auto-scroll-speed="fast"', $preset['html'] );
		$this->assertStringNotContainsString( 'animation-duration', $preset['css'], 'no custom rule when the duration is 0' );
	}

	public function test_custom_duration_is_clamped(): void {
		$low = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollDuration' => 0.5 ) ) );
		$this->assertStringContainsString( 'animation-duration:2s;', $low['css'] );

		$high = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollDuration' => 9999 ) ) );
		$this->assertStringContainsString( 'animation-duration:300s;', $high['css'] );

		$fraction = $this->render( array_merge( $this->scroll_attrs(), array( 'autoScrollDuration' => 12.5 ) ) );
		$this->assertStringContainsString( 'animation-duration:12.5s;', $fraction['css'] );
	}

	// ── Helper normalisers ───────────────────────────────────────────────────

	/** @return array<string, array{0: mixed, 1: int}> */
	public static function below_provider(): array {
		return array(
			'zero'          => array( 0, 0 ),
			'tablet'        => array( 1024, 1024 ),
			'mobile'        => array( 768, 768 ),
			'numeric string' => array( '768', 768 ),
			'bespoke'       => array( 600, 0 ),
			'negative'      => array( -768, 0 ),
			'junk'          => array( 'abc', 0 ),
			'null'          => array( null, 0 ),
			'array'         => array( array( 768 ), 0 ),
		);
	}

	/**
	 * @param mixed $raw      Stored value.
	 * @param int   $expected Normalised value.
	 */
	#[DataProvider( 'below_provider' )]
	public function test_marquee_below_normaliser( $raw, int $expected ): void {
		$this->assertSame( $expected, sgs_trust_bar_marquee_below( $raw ) );
	}
}
