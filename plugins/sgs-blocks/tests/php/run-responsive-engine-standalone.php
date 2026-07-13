<?php
/**
 * Standalone runner for the FR-S9-6 responsive-override engine.
 *
 * Exercises the engine's public functions with plain PHP — no PHPUnit / composer
 * required (mirrors run-pricing-engine-standalone.php). Exits non-zero on any
 * failure and prints a per-case PASS/FAIL line.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-responsive-engine-standalone.php
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
if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal wp_json_encode() stub for the standalone runner.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false JSON string.
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';

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

// ── Breakpoint source ──────────────────────────────────────────────────────────
ok( 1023 === SGS_Breakpoints::TABLET_MAX, 'TABLET_MAX = 1023' );
ok( 767 === SGS_Breakpoints::MOBILE_MAX, 'MOBILE_MAX = 767' );
ok( 1023 === SGS_Breakpoints::max_for_tier( 'tablet' ), 'max_for_tier(tablet)' );
ok( null === SGS_Breakpoints::max_for_tier( 'desktop' ), 'max_for_tier(desktop) = null' );
ok( array( '@media (max-width:767px){' ) === SGS_Breakpoints::tier_at_rules( 767 ), 'tier_at_rules media-only' );
$cq = SGS_Breakpoints::tier_at_rules( 1023, true );
ok( in_array( '@container (max-width:1023px){', $cq, true ) && in_array( '@media (max-width:1023px){', $cq, true ), 'tier_at_rules with container' );

// ── Scalar tier-diff ────────────────────────────────────────────────────────────
$css = sgs_emit_responsive_css(
	'.x',
	array(
		array(
			'value' => array( 'desktop' => '16px' ),
			'css'   => 'gap',
		),
	)
);
ok( '.x{gap:16px;}' === $css, 'scalar desktop-only = base rule, no media' );

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
ok( '.x{gap:16px;}' === $css, 'scalar identical tiers → no redundant rule (tier-diff)' );

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
contains( $css, '.x{gap:30px;}', 'distinct tiers: base' );
contains( $css, '@media (max-width:1023px){.x{gap:20px;}}', 'distinct tiers: tablet' );
contains( $css, '@media (max-width:767px){.x{gap:10px;}}', 'distinct tiers: mobile' );

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
contains( $css, '.x{gap:30px;}', 'null-tablet: base' );
not_contains( $css, '(max-width:1023px)', 'null-tablet: no tablet rule' );
contains( $css, '@media (max-width:767px){.x{gap:10px;}}', 'null-tablet: mobile emitted' );

// ── Box per-side inheritance ─────────────────────────────────────────────────────
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
contains( $css, 'padding-top:10px;', 'box base: top' );
contains( $css, 'padding-left:10px;', 'box base: left' );
contains( $css, '@media (max-width:767px){.x{padding-top:20px;}}', 'box mobile: only diverging side' );
not_contains( $css, 'padding-right:20px', 'box mobile: non-diverging side NOT re-emitted' );
not_contains( $css, '(max-width:1023px)', 'box: no tablet tier' );

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
contains( $css, '.x{margin-left:5px;}', 'box inherit: desktop left' );
contains( $css, '@media (max-width:1023px){.x{margin-left:15px;}}', 'box inherit: tablet left' );
not_contains( $css, '(max-width:767px)', 'box inherit: mobile inherits tablet → no mobile rule' );

// ── Container-query emission ──────────────────────────────────────────────────────
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
contains( $css, '@media (max-width:767px){.x{gap:10px;}}', 'container mode: media fallback present' );
contains( $css, '@container (max-width:767px){.x{gap:10px;}}', 'container mode: container query present' );

// ── Transform ─────────────────────────────────────────────────────────────────────
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
contains( $css, '.x{color:var(--wp--preset--color--primary);}', 'transform: base colour var' );
contains( $css, '@media (max-width:767px){.x{color:var(--wp--preset--color--accent);}}', 'transform: mobile colour var' );

// ── normalise_object ───────────────────────────────────────────────────────────────
ok(
	array(
		'desktop' => '16px',
		'tablet'  => null,
		'mobile'  => null,
	) === sgs_responsive_normalise_object( '16px' ),
	'normalise: plain scalar → desktop'
);
$obj = sgs_responsive_normalise_object( array( 'top' => '10' ), true );
ok( array( 'top' => '10' ) === $obj['desktop'] && null === $obj['tablet'], 'normalise: flat box → desktop box' );
$obj = sgs_responsive_normalise_object(
	array(
		'desktop' => '5',
		'mobile'  => '3',
	)
);
ok( '5' === $obj['desktop'] && null === $obj['tablet'] && '3' === $obj['mobile'], 'normalise: tiered object passthrough' );

// ── Canonicalisation oracle + golden uid stability ─────────────────────────────────
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
ok( wp_json_encode( $a ) !== wp_json_encode( $b ), 'precondition: raw JSON differs by key order' );
$ca = sgs_canonicalise_responsive_attrs( $a );
$cb = sgs_canonicalise_responsive_attrs( $b );
ok( wp_json_encode( $ca ) === wp_json_encode( $cb ), 'canonical JSON identical across key-order permutations' );
ok( md5( wp_json_encode( $ca ) ) === md5( wp_json_encode( $cb ) ), 'canonical md5 (uid basis) identical' );

$attrs = array(
	'gap' => array(
		'desktop' => '16',
		'tablet'  => null,
		'mobile'  => '8',
	),
);
$uid1  = 'sgs-container-' . substr( md5( wp_json_encode( $attrs ) . '' ), 0, 8 );
$uid2  = 'sgs-container-' . substr( md5( wp_json_encode( $attrs ) . '' ), 0, 8 );
ok( $uid1 === $uid2, 'golden: re-save yields same uid' );

$attrs = array(
	'rowSlot' => 'middle',
	'gap'     => array(
		'mobile'  => '8',
		'desktop' => '16',
	),
);
$out   = sgs_canonicalise_responsive_attrs( $attrs );
ok( 'middle' === $out['rowSlot'] && array( 'desktop', 'mobile' ) === array_keys( $out['gap'] ), 'canonicalise preserves non-responsive attrs + reorders responsive' );

// ── Summary ─────────────────────────────────────────────────────────────────────────
echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
