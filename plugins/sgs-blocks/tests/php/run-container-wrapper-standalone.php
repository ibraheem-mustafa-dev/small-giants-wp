<?php
/**
 * Standalone runner for SGS_Container_Wrapper (class-sgs-container-wrapper.php).
 *
 * This is the highest-blast-radius render helper in the plugin — 28 dependent
 * blocks (sgs/container, hero, cta-section, trust-bar, card-grid, feature-grid,
 * etc.) all call SGS_Container_Wrapper::render() to assemble their outer wrapper.
 * It had ZERO tests before this file. Mirrors run-responsive-engine-standalone.php
 * (plain PHP, no PHPUnit/composer required) — exits non-zero on any failure and
 * prints a per-case PASS/FAIL line.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-container-wrapper-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators + un-prefixed helper
// names + direct echo are the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress function stubs ─────────────────────────────────────────
// Only what SGS_Container_Wrapper::render() + its required helpers actually
// call for the fixtures exercised below (no bg-image/video/svg/shape-divider
// fixture is used, so wp_kses() etc. are deliberately NOT stubbed — if a future
// fixture needs them, add the stub then).

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal wp_json_encode() stub — the uid is derived from this.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false JSON string.
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		$filtered = filter_var( (string) $url, FILTER_SANITIZE_URL );
		return $filtered ? $filtered : '';
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $string ): string {
		return strip_tags( $string );
	}
}

if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	/**
	 * Deterministic get_block_wrapper_attributes() stub.
	 *
	 * The REAL WP function reads the current-block global — irrelevant here
	 * since SGS_Container_Wrapper never relies on that global itself (it only
	 * forwards class/style/extra-attrs). Emits `class` first, then the rest in
	 * insertion order, matching WP core's own attribute ordering closely enough
	 * for a byte-stable golden fixture.
	 *
	 * @param array $extra_attrs Extra attributes (class/style/data-*).
	 * @return string HTML attribute string.
	 */
	function get_block_wrapper_attributes( array $extra_attrs = array() ): string {
		$parts = array();
		foreach ( $extra_attrs as $key => $value ) {
			$value = trim( (string) $value, "; \t\n\r\0\x0B" );
			if ( '' === $value ) {
				continue;
			}
			$parts[] = esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Deterministic wp_style_engine_get_styles() stub for the base-spacing
	 * (padding/margin) scoped-rule path (Spec 32, D293 no-inline contract).
	 * Only supports the 'spacing' => ['padding'=>[...], 'margin'=>[...]] shape
	 * that SGS_Container_Wrapper actually passes — enough to make the base
	 * spacing golden rule deterministic without pulling in real WP.
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

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

function contains( string $haystack, string $needle, string $label ): void {
	ok( false !== strpos( $haystack, $needle ), $label . ' — expected to contain: ' . $needle );
}

function not_contains( string $haystack, string $needle, string $label ): void {
	ok( false === strpos( $haystack, $needle ), $label . ' — expected NOT to contain: ' . $needle );
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
// One representative attribute set per KIND (section/layout/content), chosen to
// exercise: outer max-width, content-band (contentWidth), grid/flex + gap, and
// base (non-responsive) padding — the properties every one of the 28 dependent
// composite blocks relies on via the KIND-gated 3-layer model (OUTER /
// CONTENT-WIDTH / PER-GRID-ITEM — Spec 31 §13.6).

$section_attrs = array(
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

$layout_attrs = array(
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

$content_attrs = array(
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

// ── (a) Structural + byte-stable golden assertions per KIND ───────────────────
// A full byte-exact golden string was judged TOO BRITTLE for a 1671-line wrapper
// with dozens of independent feature gates (any unrelated future feature landing
// a new class/attr on the SAME selector would false-fail this test even though
// the 3 properties under test are untouched). Instead we pin: (1) the exact
// class list assembled for the given KIND+attrs (byte-exact — this IS the
// output contract composites depend on), (2) the exact <style> rule bodies for
// each of the base-spacing / base-max-width / base-band / base-grid layers
// (byte-exact per rule), and (3) presence of the scoped <style id> + uid class.
// This pins everything a regression could plausibly break while staying robust
// to additive changes elsewhere in the wrapper.

$section_html = SGS_Container_Wrapper::render( $section_attrs, null, '<p>inner</p>', 'section' );

contains( $section_html, '<style id="sgs-container-', 'section: scoped <style> tag present' );
contains( $section_html, '<section class="sgs-container sgs-container--flex sgs-container-', 'section: exact class list (sgs-container sgs-container--flex + uid)' );
contains( $section_html, 'padding-top:40px;padding-right:20px;padding-bottom:40px;padding-left:20px;', 'section: base spacing golden rule' );
contains( $section_html, '{max-width:1200px;margin-inline:auto}', 'section: base outer max-width golden rule' );
contains( $section_html, '>.sgs-container__inner{max-width:var(--wp--style--global--content-size,1200px);margin-inline:auto}', 'section: base content-band golden rule' );
contains( $section_html, '>.sgs-container__inner{gap:24px;display:flex;flex-wrap:wrap}', 'section: base grid/flex golden rule (grid-on-inner)' );
contains( $section_html, '<div class="sgs-container__inner">', 'section: __inner band wrapper present, no inline style (no grid-item vars on flex)' );
contains( $section_html, '<p>inner</p>', 'section: inner_html passed through verbatim' );
not_contains( $section_html, 'style="', 'section: NO inline style="" attribute anywhere (Spec 32 no-inline contract)' );

$layout_html = SGS_Container_Wrapper::render( $layout_attrs, null, '<p>cols</p>', 'layout' );

// html_tag defaults to 'section' when the caller passes no $opts['tag'] — this
// is true for every KIND (the tag is a caller override, not KIND-derived), so
// 'layout' renders <section> here exactly like 'section' and 'content' do.
contains( $layout_html, '<section class="sgs-container sgs-container--grid sgs-cols-3 sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-container-', 'layout: exact class list incl. default column-shorthand classes (sgs-container sgs-container--grid sgs-cols-3/tablet-2/mobile-1 + uid)' );
contains( $layout_html, 'padding-top:32px;padding-bottom:32px;', 'layout: base spacing golden rule (top+bottom only)' );
contains( $layout_html, '{max-width:960px;margin-inline:auto}', 'layout: base outer max-width golden rule' );
contains( $layout_html, '>.sgs-container__inner{max-width:var(--wp--style--global--wide-size,1400px);margin-inline:auto}', 'layout: base content-band golden rule (wide token)' );
contains( $layout_html, '>.sgs-container__inner{gap:16px;display:grid;grid-template-columns:repeat(3,1fr)}', 'layout: base grid golden rule (3 columns, grid-on-inner)' );
not_contains( $layout_html, 'backgroundImage', 'layout: NO section-only background layer leaks through the KIND gate' );

$content_html = SGS_Container_Wrapper::render( $content_attrs, null, '<p>text</p>', 'content' );

contains( $content_html, '<section class="sgs-container sgs-container-', 'content: default tag=section, exact class list (no layout class — content kind has no grid/flex)' );
contains( $content_html, 'padding-top:16px;padding-bottom:16px;', 'content: base spacing golden rule (WP-native style.spacing.padding, applied to the OUTER — distinct from band padding)' );
contains( $content_html, '{max-width:800px;margin-inline:auto}', 'content: base outer max-width golden rule' );
contains( $content_html, '>.sgs-container__inner{max-width:var(--wp--style--global--content-size,1200px);margin-inline:auto}', 'content: base content-band golden rule (contentWidth only — no contentBandPadding attr was set)' );
not_contains( $content_html, 'display:grid', 'content: NO grid layer (content kind has no __inner grid/flex per Spec 31 §13.6)' );
not_contains( $content_html, 'display:flex', 'content: NO flex layer (content kind has no __inner grid/flex per Spec 31 §13.6)' );

// ── KIND gate — the mechanism that makes composite-mirror (D294) safe ─────────
// Section-only layers (background image/video/overlay/svg/shape-divider) must
// be completely absent for 'layout' and 'content' kinds, even given the EXACT
// SAME $attributes that produce them under 'section'. This is what lets a
// content-KIND composite (quote/info-box) safely reuse this class without
// accidentally inheriting section-only behaviour.
$bg_attrs = array(
	'maxWidth'        => '1200px',
	'backgroundImage' => array( 'url' => 'https://example.com/bg.jpg' ),
);

$bg_section_html = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'section' );
$bg_layout_html  = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'layout' );
$bg_content_html = SGS_Container_Wrapper::render( $bg_attrs, null, '<p>x</p>', 'content' );

contains( $bg_section_html, 'sgs-container--has-bg-image', 'kind-gate: section kind WITH backgroundImage emits the has-bg-image class' );
contains( $bg_section_html, 'background-image:url(https://example.com/bg.jpg)', 'kind-gate: section kind WITH backgroundImage emits the background-image scoped rule' );
not_contains( $bg_layout_html, 'sgs-container--has-bg-image', 'kind-gate: layout kind with the SAME backgroundImage attr does NOT emit has-bg-image (section-only layer gated off)' );
not_contains( $bg_layout_html, 'background-image:', 'kind-gate: layout kind with the SAME backgroundImage attr does NOT emit the background-image rule' );
not_contains( $bg_content_html, 'sgs-container--has-bg-image', 'kind-gate: content kind with the SAME backgroundImage attr does NOT emit has-bg-image (section-only layer gated off)' );
not_contains( $bg_content_html, 'background-image:', 'kind-gate: content kind with the SAME backgroundImage attr does NOT emit the background-image rule' );

// ── (b) UID-STABILITY INVARIANT — highest-value assertion in this file ────────
// The whole responsive-CSS + scoped-selector mechanism depends on the uid being
// a pure deterministic function of (verbatim $attributes, anchor) — the SAME
// md5(wp_json_encode($attributes).$anchor) pattern the FR-S9-6 object-model
// engine uses (ResponsiveOverrideEngineTest::test_golden_resave_same_uid).
// Render the SAME attributes twice (fresh calls, no caching) and assert the
// uid embedded in the output is byte-identical both times.

/**
 * Extract the 8-hex-char uid suffix from a rendered SGS_Container_Wrapper string.
 *
 * @param string $html Rendered wrapper HTML.
 * @return string 8-char hex uid, or '' if no uid class is present.
 */
function extract_uid( string $html ): string {
	if ( ! preg_match( '/sgs-container-([0-9a-f]{8})/', $html, $m ) ) {
		return '';
	}
	return $m[1];
}

$render_a = SGS_Container_Wrapper::render( $section_attrs, null, '<p>inner</p>', 'section' );
$render_b = SGS_Container_Wrapper::render( $section_attrs, null, '<p>inner</p>', 'section' );
$uid_a    = extract_uid( $render_a );
$uid_b    = extract_uid( $render_b );

ok( '' !== $uid_a, 'uid-stability: first render produced a uid' );
ok( $uid_a === $uid_b, 'uid-stability: re-rendering the SAME attributes twice yields the IDENTICAL uid (' . $uid_a . ' === ' . $uid_b . ')' );
ok( $render_a === $render_b, 'uid-stability: re-rendering the SAME attributes twice yields byte-identical full output' );

// Different inner_html must NOT change the uid — the uid is derived solely from
// $attributes + anchor, never from the caller's InnerBlocks content.
$render_c = SGS_Container_Wrapper::render( $section_attrs, null, '<p>DIFFERENT inner content</p>', 'section' );
$uid_c    = extract_uid( $render_c );
ok( $uid_a === $uid_c, 'uid-stability: uid is independent of $inner_html (only $attributes + anchor feed the md5)' );

// ── (c) DIFFERENT attributes → DIFFERENT uid ───────────────────────────────────

$section_attrs_variant = $section_attrs;
$section_attrs_variant['gap'] = '32px'; // Single differing scalar.

$render_variant = SGS_Container_Wrapper::render( $section_attrs_variant, null, '<p>inner</p>', 'section' );
$uid_variant     = extract_uid( $render_variant );

ok( '' !== $uid_variant, 'uid-variance: variant render produced a uid' );
ok( $uid_a !== $uid_variant, 'uid-variance: changing a single attribute (gap 24px→32px) changes the uid (' . $uid_a . ' !== ' . $uid_variant . ')' );

// KIND alone (section vs layout vs content) also changes rendered output even
// on identical $attributes, because KIND gates which layers are consumed —
// but the uid basis is $attributes+anchor only, so same attrs + different KIND
// legitimately SHARE a uid (verified above: $bg_section_html / $bg_layout_html
// / $bg_content_html all carry the same uid) while their HTML content differs
// (already asserted in the kind-gate block above: has-bg-image / background-
// image present under 'section', absent under 'layout' and 'content').
ok(
	extract_uid( $bg_section_html ) === extract_uid( $bg_layout_html )
		&& extract_uid( $bg_layout_html ) === extract_uid( $bg_content_html ),
	'uid-variance: identical $attributes under different KIND share the same uid (uid basis is $attributes+anchor only, never KIND) — content divergence is asserted separately by the kind-gate block'
);

// A second, unrelated attribute change (maxWidth) must also change the uid —
// guards against a hypothetical partial-hash regression that only hashes some
// keys.
$section_attrs_variant_2               = $section_attrs;
$section_attrs_variant_2['maxWidth']   = '1400px';
$render_variant_2                      = SGS_Container_Wrapper::render( $section_attrs_variant_2, null, '<p>inner</p>', 'section' );
$uid_variant_2                         = extract_uid( $render_variant_2 );
ok( $uid_a !== $uid_variant_2, 'uid-variance: changing maxWidth (1200px→1400px) changes the uid (' . $uid_a . ' !== ' . $uid_variant_2 . ')' );
ok( $uid_variant !== $uid_variant_2, 'uid-variance: two independently-differing attribute sets produce two independently-differing uids' );

// ── Summary ─────────────────────────────────────────────────────────────────────
echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
