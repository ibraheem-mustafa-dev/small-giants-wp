<?php
/**
 * Golden regression tests for SGS_Container_Wrapper::render().
 *
 * SGS_Container_Wrapper (class-sgs-container-wrapper.php, ~1671 lines) is the
 * shared OUTER-wrapper render helper for every SGS container-style block — 28
 * dependent composites (sgs/container, hero, cta-section, trust-bar,
 * card-grid, feature-grid, etc.) all call ::render() to assemble their wrapper.
 * It had ZERO tests before this file — a regression here dark-ships across the
 * whole block library. This is the PHPUnit companion to the always-runnable
 * run-container-wrapper-standalone.php (same fixtures, same expected strings —
 * verified against the REAL render output before being written here, per the
 * project's prove-the-cause-before-fix / no-guessing discipline).
 *
 * Self-contained: reuses bootstrap.php's esc_attr()/esc_html()/esc_url()/
 * wp_strip_all_tags()/absint()/get_block_wrapper_attributes() stubs, and adds
 * the two this class additionally needs (wp_json_encode — the uid basis;
 * wp_style_engine_get_styles — the base-spacing scoped-rule path).
 *
 * KNOWN STUB LIMITATION (documented, not worked around by weakening the real
 * assertions): bootstrap.php's get_block_wrapper_attributes() stub always (a)
 * appends a literal ' wp-block-sgs-icon' class (written for the Icon block's
 * own tests) and (b) always emits a `style="…"` attribute — even an empty one
 * (';') — because it never trims a vacuous style value the way WP core's real
 * function does. Both are harmless here: (a) is a class-list SUFFIX so every
 * `assertStringContainsString()` class-prefix check below still matches
 * correctly, and (b) means this file asserts absence of specific INLINE
 * property declarations (e.g. 'style="…max-width' ) rather than a blanket
 * "no style attribute at all" — the run-*-standalone.php companion (which
 * ships its own accurate stub) carries the stronger blanket assertion.
 *
 * Run with:
 *   vendor/bin/phpunit --filter "ContainerWrapperTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

// ---------------------------------------------------------------------------
// Additional WP stubs that bootstrap.php does not already declare.
// Guarded so this composes safely regardless of PHPUnit's file load order.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal wp_json_encode() stub — the uid is derived from this.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- test stub.
	}
}

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Deterministic wp_style_engine_get_styles() stub for the base-spacing
	 * (padding/margin) scoped-rule path (Spec 32, D293 no-inline contract).
	 * Supports the 'spacing' => ['padding'=>[...], 'margin'=>[...]] shape that
	 * SGS_Container_Wrapper actually passes.
	 *
	 * @param array $styles  Style-engine style tree.
	 * @param array $options Must contain 'selector'.
	 * @return array{css: string}
	 */
	function wp_style_engine_get_styles( array $styles, array $options = array() ): array {
		$selector = $options['selector'] ?? '';
		$decls    = array();
		foreach ( array( 'padding', 'margin' ) as $box_prop ) {
			if ( empty( $styles['spacing'][ $box_prop ] ) || ! is_array( $styles['spacing'][ $box_prop ] ) ) {
				continue;
			}
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				if ( isset( $styles['spacing'][ $box_prop ][ $side ] ) && '' !== $styles['spacing'][ $box_prop ][ $side ] ) {
					$decls[] = $box_prop . '-' . $side . ':' . $styles['spacing'][ $box_prop ][ $side ];
				}
			}
		}
		if ( ! $decls || '' === $selector ) {
			return array( 'css' => '' );
		}
		return array( 'css' => $selector . '{' . implode( ';', $decls ) . ';}' );
	}
}

require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-container-wrapper.php';

/**
 * Class ContainerWrapperTest
 */
final class ContainerWrapperTest extends TestCase {

	/**
	 * Representative attrs for the 'section' KIND — exercises outer max-width,
	 * content-band (contentWidth), flex + gap (grid-on-inner), and base
	 * (non-responsive) padding, mirroring what a real composite (hero,
	 * cta-section) passes through.
	 *
	 * @return array
	 */
	private function section_attrs(): array {
		return array(
			'layout'       => 'flex',
			'maxWidth'     => '1200px',
			'contentWidth' => 'normal',
			'gap'          => '24px',
			'style'        => array(
				'spacing' => array(
					'padding' => array(
						'top'    => '40px',
						'right'  => '20px',
						'bottom' => '40px',
						'left'   => '20px',
					),
				),
			),
		);
	}

	/**
	 * Representative attrs for the 'layout' KIND — a grid, no bg/overlay/svg.
	 *
	 * @return array
	 */
	private function layout_attrs(): array {
		return array(
			'layout'       => 'grid',
			'columns'      => 3,
			'maxWidth'     => '960px',
			'contentWidth' => 'wide',
			'gap'          => '16px',
			'style'        => array(
				'spacing' => array(
					'padding' => array(
						'top'    => '32px',
						'bottom' => '32px',
					),
				),
			),
		);
	}

	/**
	 * Representative attrs for the 'content' KIND — box+width only, no grid.
	 *
	 * @return array
	 */
	private function content_attrs(): array {
		return array(
			'maxWidth'     => '800px',
			'contentWidth' => 'normal',
			'style'        => array(
				'spacing' => array(
					'padding' => array(
						'top'    => '16px',
						'bottom' => '16px',
					),
				),
			),
		);
	}

	/**
	 * Extract the 8-hex-char uid suffix from a rendered wrapper string.
	 *
	 * @param string $html Rendered wrapper HTML.
	 * @return string 8-char hex uid, or '' if no uid class is present.
	 */
	private function extract_uid( string $html ): string {
		if ( ! preg_match( '/sgs-container-([0-9a-f]{8})/', $html, $m ) ) {
			return '';
		}
		return $m[1];
	}

	// ── (a) Structural + golden-rule assertions per KIND ─────────────────────

	/**
	 * 'section' KIND golden-rule assertions.
	 */
	public function test_section_kind_golden_output(): void {
		$html = SGS_Container_Wrapper::render( $this->section_attrs(), null, '<p>inner</p>', 'section' );

		$this->assertStringContainsString( '<style id="sgs-container-', $html, 'scoped <style> tag present' );
		$this->assertStringContainsString( '<section class="sgs-container sgs-container--flex sgs-container-', $html, 'exact class-list prefix (sgs-container sgs-container--flex + uid)' );
		$this->assertStringContainsString( 'padding-top:40px;padding-right:20px;padding-bottom:40px;padding-left:20px;', $html, 'base spacing golden rule' );
		$this->assertStringContainsString( '{max-width:1200px;margin-inline:auto}', $html, 'base outer max-width golden rule' );
		$this->assertStringContainsString( '>.sgs-container__inner{max-width:var(--wp--style--global--content-size,1200px);margin-inline:auto}', $html, 'base content-band golden rule' );
		$this->assertStringContainsString( '>.sgs-container__inner{gap:24px;display:flex;flex-wrap:wrap}', $html, 'base grid/flex golden rule (grid-on-inner)' );
		$this->assertStringContainsString( '<div class="sgs-container__inner">', $html, '__inner band wrapper present, no inline style (no grid-item vars on flex)' );
		$this->assertStringContainsString( '<p>inner</p>', $html, 'inner_html passed through verbatim' );
	}

	/**
	 * 'layout' KIND golden-rule assertions.
	 */
	public function test_layout_kind_golden_output(): void {
		$html = SGS_Container_Wrapper::render( $this->layout_attrs(), null, '<p>cols</p>', 'layout' );

		$this->assertStringContainsString(
			'<section class="sgs-container sgs-container--grid sgs-cols-3 sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-container-',
			$html,
			'exact class-list prefix incl. default column-shorthand classes'
		);
		$this->assertStringContainsString( 'padding-top:32px;padding-bottom:32px;', $html, 'base spacing golden rule (top+bottom only)' );
		$this->assertStringContainsString( '{max-width:960px;margin-inline:auto}', $html, 'base outer max-width golden rule' );
		$this->assertStringContainsString( '>.sgs-container__inner{max-width:var(--wp--style--global--wide-size,1400px);margin-inline:auto}', $html, 'base content-band golden rule (wide token)' );
		$this->assertStringContainsString( '>.sgs-container__inner{gap:16px;display:grid;grid-template-columns:repeat(3,1fr)}', $html, 'base grid golden rule (3 columns, grid-on-inner)' );
		$this->assertStringNotContainsString( 'backgroundImage', $html, 'NO section-only background layer leaks through the KIND gate' );
	}

	/**
	 * 'content' KIND golden-rule assertions.
	 */
	public function test_content_kind_golden_output(): void {
		$html = SGS_Container_Wrapper::render( $this->content_attrs(), null, '<p>text</p>', 'content' );

		$this->assertStringContainsString( '<section class="sgs-container sgs-container-', $html, 'default tag=section, no layout class (content kind has no grid/flex)' );
		$this->assertStringContainsString( 'padding-top:16px;padding-bottom:16px;', $html, 'base spacing golden rule (WP-native style.spacing.padding, applied to the OUTER)' );
		$this->assertStringContainsString( '{max-width:800px;margin-inline:auto}', $html, 'base outer max-width golden rule' );
		$this->assertStringContainsString( '>.sgs-container__inner{max-width:var(--wp--style--global--content-size,1200px);margin-inline:auto}', $html, 'base content-band golden rule (contentWidth only)' );
		$this->assertStringNotContainsString( 'display:grid', $html, 'NO grid layer (content kind has no __inner grid/flex, Spec 31 §13.6)' );
		$this->assertStringNotContainsString( 'display:flex', $html, 'NO flex layer (content kind has no __inner grid/flex, Spec 31 §13.6)' );
	}

	/**
	 * KIND gate — the mechanism that makes composite-mirror (D294) safe.
	 * Section-only layers must be completely absent for 'layout'/'content',
	 * even given the EXACT SAME $attributes that produce them under 'section'.
	 */
	public function test_kind_gate_suppresses_section_only_layers(): void {
		$bg_attrs = array(
			'maxWidth'        => '1200px',
			'backgroundImage' => array( 'url' => 'https://example.com/bg.jpg' ),
		);

		$section_html = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'section' );
		$layout_html  = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'layout' );
		$content_html = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'content' );

		$this->assertStringContainsString( 'sgs-container--has-bg-image', $section_html, 'section kind WITH backgroundImage emits the has-bg-image class' );
		$this->assertStringContainsString( 'background-image:url(https://example.com/bg.jpg)', $section_html, 'section kind WITH backgroundImage emits the background-image scoped rule' );
		$this->assertStringNotContainsString( 'sgs-container--has-bg-image', $layout_html, 'layout kind with the SAME attr does NOT emit has-bg-image' );
		$this->assertStringNotContainsString( 'background-image:', $layout_html, 'layout kind with the SAME attr does NOT emit background-image' );
		$this->assertStringNotContainsString( 'sgs-container--has-bg-image', $content_html, 'content kind with the SAME attr does NOT emit has-bg-image' );
		$this->assertStringNotContainsString( 'background-image:', $content_html, 'content kind with the SAME attr does NOT emit background-image' );

		// uid basis is $attributes+anchor only — KIND never enters the hash, so
		// identical attrs legitimately SHARE a uid across all three KINDs even
		// though their rendered content differs (asserted above).
		$this->assertSame( $this->extract_uid( $section_html ), $this->extract_uid( $layout_html ) );
		$this->assertSame( $this->extract_uid( $layout_html ), $this->extract_uid( $content_html ) );
	}

	// ── (b) UID-STABILITY INVARIANT — the highest-value assertion in this file ──
	// The whole responsive-CSS + scoped-selector mechanism depends on the uid
	// being a pure deterministic function of (verbatim $attributes, anchor) —
	// the same md5(wp_json_encode($attributes).$anchor) pattern the FR-S9-6
	// object-model engine uses (ResponsiveOverrideEngineTest::
	// test_golden_resave_same_uid). Render the SAME attributes twice (fresh
	// calls, no caching) and assert the uid is byte-identical both times.

	/**
	 * Re-rendering the SAME attributes twice must yield the identical uid.
	 */
	public function test_uid_is_stable_across_identical_rerenders(): void {
		$attrs = $this->section_attrs();

		$render_a = SGS_Container_Wrapper::render( $attrs, null, '<p>inner</p>', 'section' );
		$render_b = SGS_Container_Wrapper::render( $attrs, null, '<p>inner</p>', 'section' );

		$uid_a = $this->extract_uid( $render_a );
		$uid_b = $this->extract_uid( $render_b );

		$this->assertNotSame( '', $uid_a, 'first render produced a uid' );
		$this->assertSame( $uid_a, $uid_b, 're-rendering the SAME attributes twice yields the IDENTICAL uid' );
		$this->assertSame( $render_a, $render_b, 're-rendering the SAME attributes twice yields byte-identical full output' );
	}

	/**
	 * The uid must be derived solely from $attributes + anchor, never from
	 * the caller-rendered $inner_html.
	 */
	public function test_uid_is_independent_of_inner_html(): void {
		$attrs = $this->section_attrs();

		$render_a = SGS_Container_Wrapper::render( $attrs, null, '<p>inner</p>', 'section' );
		$render_c = SGS_Container_Wrapper::render( $attrs, null, '<p>DIFFERENT inner content</p>', 'section' );

		$this->assertSame(
			$this->extract_uid( $render_a ),
			$this->extract_uid( $render_c ),
			'uid is derived solely from $attributes + anchor, never from the caller-rendered inner_html'
		);
	}

	// ── (c) DIFFERENT attributes → DIFFERENT uid ──────────────────────────────

	/**
	 * Changing a single attribute (gap) must change the uid.
	 */
	public function test_changing_a_single_attribute_changes_the_uid(): void {
		$base_attrs            = $this->section_attrs();
		$variant_attrs         = $base_attrs;
		$variant_attrs['gap']  = '32px';

		$uid_base    = $this->extract_uid( SGS_Container_Wrapper::render( $base_attrs, null, '<p>x</p>', 'section' ) );
		$uid_variant = $this->extract_uid( SGS_Container_Wrapper::render( $variant_attrs, null, '<p>x</p>', 'section' ) );

		$this->assertNotSame( '', $uid_variant, 'variant render produced a uid' );
		$this->assertNotSame( $uid_base, $uid_variant, 'changing gap (24px→32px) changes the uid' );
	}

	/**
	 * Two independently-differing attribute sets must produce two
	 * independently-differing uids — guards against a hypothetical
	 * partial-hash regression that only hashes some keys.
	 */
	public function test_two_independent_attribute_changes_produce_two_independent_uids(): void {
		$base_attrs = $this->section_attrs();

		$gap_variant         = $base_attrs;
		$gap_variant['gap']  = '32px';

		$max_width_variant              = $base_attrs;
		$max_width_variant['maxWidth']  = '1400px';

		$uid_base          = $this->extract_uid( SGS_Container_Wrapper::render( $base_attrs, null, '<p>x</p>', 'section' ) );
		$uid_gap_variant    = $this->extract_uid( SGS_Container_Wrapper::render( $gap_variant, null, '<p>x</p>', 'section' ) );
		$uid_width_variant  = $this->extract_uid( SGS_Container_Wrapper::render( $max_width_variant, null, '<p>x</p>', 'section' ) );

		$this->assertNotSame( $uid_base, $uid_gap_variant, 'gap change diverges from base' );
		$this->assertNotSame( $uid_base, $uid_width_variant, 'maxWidth change diverges from base' );
		$this->assertNotSame( $uid_gap_variant, $uid_width_variant, 'two independently-differing attribute sets produce two independently-differing uids (guards against a partial-hash regression)' );
	}
}
