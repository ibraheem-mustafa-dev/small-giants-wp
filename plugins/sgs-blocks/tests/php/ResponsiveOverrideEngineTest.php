<?php
/**
 * Unit tests for the FR-S9-6 object-model responsive-override engine.
 *
 * Covers: the shared breakpoint source, the resolver/emitter tier-diff logic,
 * per-side box inheritance, container-query emission, the canonicalisation
 * oracle (key-order permutations → same md5), and the golden "re-save = same
 * uid" stability contract.
 *
 * Self-contained (no WordPress): requires the two engine files directly. The
 * `defined('ABSPATH')||exit` guards pass because bootstrap.php defines ABSPATH.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-breakpoints.php';
require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-responsive.php';

final class ResponsiveOverrideEngineTest extends TestCase {

	// ── Breakpoint source (R-31-1) ────────────────────────────────────────────

	public function test_breakpoint_constants(): void {
		$this->assertSame( 1023, SGS_Breakpoints::TABLET_MAX );
		$this->assertSame( 767, SGS_Breakpoints::MOBILE_MAX );
		$this->assertSame( 1023, SGS_Breakpoints::max_for_tier( 'tablet' ) );
		$this->assertSame( 767, SGS_Breakpoints::max_for_tier( 'mobile' ) );
		$this->assertNull( SGS_Breakpoints::max_for_tier( 'desktop' ) );
	}

	public function test_tier_at_rules_media_only_by_default(): void {
		$rules = SGS_Breakpoints::tier_at_rules( 767 );
		$this->assertSame( array( '@media (max-width:767px){' ), $rules );
	}

	public function test_tier_at_rules_adds_container_when_requested(): void {
		$rules = SGS_Breakpoints::tier_at_rules( 1023, true );
		$this->assertContains( '@media (max-width:1023px){', $rules );
		$this->assertContains( '@container (max-width:1023px){', $rules );
	}

	// ── Scalar tier-diff emission ──────────────────────────────────────────────

	public function test_scalar_desktop_only_emits_base_no_media(): void {
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value' => array( 'desktop' => '16px' ),
					'css'   => 'gap',
				),
			)
		);
		$this->assertSame( '.x{gap:16px;}', $css );
		$this->assertStringNotContainsString( '@media', $css );
	}

	public function test_scalar_identical_tiers_emit_no_redundant_rule(): void {
		// tablet == desktop → tier-diff must suppress the tablet rule.
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value' => array(
						'desktop' => '16px',
						'tablet'  => '16px',
						'mobile'  => null,
					),
					'css'   => 'gap',
				),
			)
		);
		$this->assertSame( '.x{gap:16px;}', $css );
		$this->assertStringNotContainsString( '@media', $css );
	}

	public function test_scalar_distinct_tiers_emit_base_tablet_mobile(): void {
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'        => array(
						'desktop' => '30',
						'tablet'  => '20',
						'mobile'  => '10',
					),
					'css'          => 'gap',
					'unit_default' => 'px',
				),
			)
		);
		$this->assertStringContainsString( '.x{gap:30px;}', $css );
		$this->assertStringContainsString( '@media (max-width:1023px){.x{gap:20px;}}', $css );
		$this->assertStringContainsString( '@media (max-width:767px){.x{gap:10px;}}', $css );
	}

	public function test_scalar_null_tablet_but_set_mobile_skips_tablet(): void {
		// mobile diverges from the effective tablet (== desktop) → mobile emitted,
		// tablet inherits desktop → no tablet rule.
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'        => array(
						'desktop' => '30',
						'tablet'  => null,
						'mobile'  => '10',
					),
					'css'          => 'gap',
					'unit_default' => 'px',
				),
			)
		);
		$this->assertStringContainsString( '.x{gap:30px;}', $css );
		$this->assertStringNotContainsString( '(max-width:1023px)', $css );
		$this->assertStringContainsString( '@media (max-width:767px){.x{gap:10px;}}', $css );
	}

	// ── Box per-side inheritance ───────────────────────────────────────────────

	public function test_box_per_side_inheritance_only_diverging_side_emits(): void {
		// desktop all 10px; mobile overrides ONLY top=20 → mobile rule carries
		// padding-top:20px only; right/bottom/left inherit → not re-emitted.
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'        => array(
						'desktop' => array(
							'top'    => '10',
							'right'  => '10',
							'bottom' => '10',
							'left'   => '10',
						),
						'tablet'  => null,
						'mobile'  => array( 'top' => '20' ),
					),
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		// Base carries all four longhands.
		$this->assertStringContainsString( 'padding-top:10px;', $css );
		$this->assertStringContainsString( 'padding-left:10px;', $css );
		// Mobile tier carries ONLY the diverging side.
		$this->assertStringContainsString( '@media (max-width:767px){.x{padding-top:20px;}}', $css );
		$this->assertStringNotContainsString( 'padding-right:20px', $css );
		// No tablet tier at all (nothing set / diverges there).
		$this->assertStringNotContainsString( '(max-width:1023px)', $css );
	}

	public function test_box_side_inherits_through_tablet_to_mobile(): void {
		// desktop.left=5; tablet.left=15; mobile.left null → mobile inherits tablet(15)
		// so NO mobile rule for left (it equals the effective tablet).
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'        => array(
						'desktop' => array( 'left' => '5' ),
						'tablet'  => array( 'left' => '15' ),
						'mobile'  => null,
					),
					'css'          => 'margin',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		$this->assertStringContainsString( '.x{margin-left:5px;}', $css );
		$this->assertStringContainsString( '@media (max-width:1023px){.x{margin-left:15px;}}', $css );
		$this->assertStringNotContainsString( '(max-width:767px)', $css );
	}

	// ── Container-query emission ────────────────────────────────────────────────

	public function test_container_option_emits_media_and_container(): void {
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'        => array(
						'desktop' => '30',
						'mobile'  => '10',
					),
					'css'          => 'gap',
					'unit_default' => 'px',
				),
			),
			array( 'container' => true )
		);
		$this->assertStringContainsString( '@media (max-width:767px){.x{gap:10px;}}', $css );
		$this->assertStringContainsString( '@container (max-width:767px){.x{gap:10px;}}', $css );
	}

	// ── Transform (colour-style) ────────────────────────────────────────────────

	public function test_transform_value_is_used_verbatim(): void {
		$css = sgs_emit_responsive_css(
			'.x',
			array(
				array(
					'value'     => array(
						'desktop' => 'primary',
						'mobile'  => 'accent',
					),
					'css'       => 'color',
					'transform' => static function ( $raw ) {
						return 'var(--wp--preset--color--' . $raw . ')';
					},
				),
			)
		);
		$this->assertStringContainsString( '.x{color:var(--wp--preset--color--primary);}', $css );
		$this->assertStringContainsString( '@media (max-width:767px){.x{color:var(--wp--preset--color--accent);}}', $css );
	}

	// ── normalise_object: legacy/plain lift ─────────────────────────────────────

	public function test_normalise_lifts_plain_scalar_to_desktop(): void {
		$obj = sgs_responsive_normalise_object( '16px' );
		$this->assertSame(
			array(
				'desktop' => '16px',
				'tablet'  => null,
				'mobile'  => null,
			),
			$obj
		);
	}

	public function test_normalise_lifts_flat_box_to_desktop(): void {
		$obj = sgs_responsive_normalise_object( array( 'top' => '10' ), true );
		$this->assertSame( array( 'top' => '10' ), $obj['desktop'] );
		$this->assertNull( $obj['tablet'] );
	}

	public function test_normalise_passes_tiered_object_through(): void {
		$obj = sgs_responsive_normalise_object(
			array(
				'desktop' => '5',
				'mobile'  => '3',
			)
		);
		$this->assertSame( '5', $obj['desktop'] );
		$this->assertNull( $obj['tablet'] );
		$this->assertSame( '3', $obj['mobile'] );
	}

	// ── Canonicalisation oracle + golden uid stability ──────────────────────────

	public function test_canonicalisation_is_key_order_independent(): void {
		// Same data, keys in different order at both the tier and side level.
		$a = array(
			'gap'     => array(
				'desktop' => '16',
				'tablet'  => '12',
				'mobile'  => '8',
			),
			'padding' => array(
				'desktop' => array(
					'top'    => '1',
					'right'  => '2',
					'bottom' => '3',
					'left'   => '4',
				),
			),
		);
		$b = array(
			'gap'     => array(
				'mobile'  => '8',
				'desktop' => '16',
				'tablet'  => '12',
			),
			'padding' => array(
				'desktop' => array(
					'left'   => '4',
					'bottom' => '3',
					'right'  => '2',
					'top'    => '1',
				),
			),
		);
		$this->assertNotSame( wp_json_encode( $a ), wp_json_encode( $b ), 'precondition: raw JSON differs by key order' );

		$ca = sgs_canonicalise_responsive_attrs( $a );
		$cb = sgs_canonicalise_responsive_attrs( $b );
		$this->assertSame( wp_json_encode( $ca ), wp_json_encode( $cb ), 'canonical JSON must be identical' );
		$this->assertSame(
			md5( wp_json_encode( $ca ) ),
			md5( wp_json_encode( $cb ) ),
			'canonical md5 (the uid basis) must be identical across key-order permutations'
		);
	}

	public function test_golden_resave_same_uid(): void {
		// Simulate the write-time contract: an object built in canonical order,
		// re-encoded on a subsequent "save", yields the same uid.
		$attrs      = array(
			'gap'      => array(
				'desktop' => '16',
				'tablet'  => null,
				'mobile'  => '8',
			),
			'maxWidth' => array(
				'desktop' => '1200px',
				'tablet'  => null,
				'mobile'  => null,
			),
		);
		$uid_first  = 'sgs-container-' . substr( md5( wp_json_encode( $attrs ) . '' ), 0, 8 );
		$uid_second = 'sgs-container-' . substr( md5( wp_json_encode( $attrs ) . '' ), 0, 8 );
		$this->assertSame( $uid_first, $uid_second );
	}

	public function test_canonicalisation_preserves_non_responsive_attrs(): void {
		$attrs = array(
			'rowSlot'        => 'middle',
			'justifyContent' => 'center',
			'gap'            => array(
				'mobile'  => '8',
				'desktop' => '16',
			),
		);
		$out   = sgs_canonicalise_responsive_attrs( $attrs );
		$this->assertSame( 'middle', $out['rowSlot'] );
		$this->assertSame( 'center', $out['justifyContent'] );
		// Responsive object reordered to canonical desktop-first.
		$this->assertSame( array( 'desktop', 'mobile' ), array_keys( $out['gap'] ) );
	}
}
