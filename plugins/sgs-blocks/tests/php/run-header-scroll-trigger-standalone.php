<?php
/**
 * Standalone runner for the header scroll trigger (Wave 3C U-13 M-03).
 *
 * Exercises includes/sgs-header-scroll-trigger.php directly, with plain PHP,
 * no PHPUnit. Every case pairs a positive assertion with a negative control
 * that proves the assertion can actually fail — see each block's own comment
 * for what the control demonstrates. Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-header-scroll-trigger-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $value ) {
		return abs( (int) $value );
	}
}

// The REAL functions from helpers-tokens.php/class-sgs-breakpoints.php, same
// house convention as run-header-ink-standalone.php.
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-scroll-trigger.php';

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

$root_sel = '.sgs-sh-abc123.sgs-site-header';
$all_on   = array(
	'desktop' => 'on',
	'tablet'  => 'on',
	'mobile'  => 'on',
);
$all_off  = array(
	'desktop' => 'off',
	'tablet'  => 'off',
	'mobile'  => 'off',
);

// ─────────────────────────────────────────────────────────────────────────
// 1. scrolledTrigger enum allow-list — an off-enum value coerces to the
// default rather than reaching the DOM raw.
// ─────────────────────────────────────────────────────────────────────────
ok( 'position' === sgs_header_scrolled_trigger_value( array() ), 'unset scrolledTrigger resolves to position' );
ok( 'direction' === sgs_header_scrolled_trigger_value( array( 'scrolledTrigger' => 'direction' ) ), 'a valid enum value passes through' );
ok(
	'position' === sgs_header_scrolled_trigger_value( array( 'scrolledTrigger' => 'DROP TABLE;' ) ),
	'an off-enum value coerces to position, never reaches the DOM raw'
);
// NEGATIVE CONTROL: a DIFFERENT off-enum string also coerces — proves the
// allow-list genuinely checks membership, not just inequality with one string.
ok(
	'position' === sgs_header_scrolled_trigger_value( array( 'scrolledTrigger' => 'scroll' ) ),
	'NEGATIVE CONTROL: a second, different off-enum value also coerces to position'
);

// ─────────────────────────────────────────────────────────────────────────
// 2. scrolledOffset sanitisation — absint, clamped 0-2000, default 50.
// ─────────────────────────────────────────────────────────────────────────
ok( 50 === sgs_header_scrolled_offset_value( array() ), 'unset scrolledOffset resolves to 50' );
ok( 100 === sgs_header_scrolled_offset_value( array( 'scrolledOffset' => 100 ) ), 'a valid offset passes through' );
ok( 2000 === sgs_header_scrolled_offset_value( array( 'scrolledOffset' => 50000 ) ), 'an over-range offset clamps to 2000' );
// absint() strips the sign rather than zeroing it (WordPress's own contract:
// abs((int) $number)), so -50 resolves to 50, not 0 — the guarantee this
// sanitisation gives is "never negative", not "negative becomes zero".
ok( 50 === sgs_header_scrolled_offset_value( array( 'scrolledOffset' => -50 ) ), 'a negative offset is never emitted negative (absint strips the sign)' );
ok( 50 === sgs_header_scrolled_offset_value( array( 'scrolledOffset' => 'DROP TABLE;' ) ), 'a non-numeric offset resolves to the default, never NaN' );
// NEGATIVE CONTROL: a DIFFERENT in-range value passes through unchanged —
// proves clamping is a genuine range check, not a function that always
// returns the same constant.
ok( 1999 === sgs_header_scrolled_offset_value( array( 'scrolledOffset' => 1999 ) ), 'NEGATIVE CONTROL: a different in-range value passes through, proving the clamp is a real range' );

// ─────────────────────────────────────────────────────────────────────────
// 3. Fade CSS — only fires for direction + solid-first + a genuine resting
// fill + Transparent on at that tier. Every OTHER combination is a no-op,
// proving the gating is real rather than always-on.
// ─────────────────────────────────────────────────────────────────────────

// position mode: no fade CSS at all, toggle map passed through unchanged.
$fade_position = sgs_header_scroll_fade_css( $root_sel, 'position', true, $all_on, '#fff', '' );
ok( '' === $fade_position['css'], 'position mode emits no fade CSS' );
ok( false === $fade_position['any_fade'], 'position mode: any_fade is false' );
ok( $fade_position['toggle_effective'] === $all_on, 'position mode: the toggle map is passed through unmodified' );

// transparent-first (not solid-first): out of scope for the fade (§4.6's
// documented scope), so still a no-op even in direction mode.
$fade_transparent_first = sgs_header_scroll_fade_css( $root_sel, 'direction', false, $all_on, '#fff', '' );
ok( '' === $fade_transparent_first['css'], 'transparent-first + direction still emits no fade CSS (out of scope, documented)' );

// No resting fill at all: nothing to duplicate onto ::after, so no-op.
$fade_no_fill = sgs_header_scroll_fade_css( $root_sel, 'direction', true, $all_on, '', '' );
ok( '' === $fade_no_fill['css'], 'direction + solid-first with NO resting fill emits no fade CSS' );

// The real exit cell: direction + solid-first + a resting fill + Transparent
// on at every tier.
$fade_real = sgs_header_scroll_fade_css( $root_sel, 'direction', true, $all_on, '#fff', 'linear-gradient(90deg,#fff,#000)' );
ok( true === $fade_real['any_fade'], 'the fantasy exit cell combination activates the fade' );
ok(
	false !== strpos( $fade_real['css'], $root_sel . '{background:transparent !important;}' ),
	'the fade forces the header\'s own background fully transparent'
);
ok(
	false !== strpos( $fade_real['css'], $root_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;' ),
	'the fade paints the duplicated fill on ::after, not on the root selector'
);
ok(
	false !== strpos( $fade_real['css'], 'background-image:linear-gradient(90deg,#fff,#000);opacity:1;' ),
	'the resting gradient is duplicated onto ::after at opacity 1'
);
ok(
	false !== strpos( $fade_real['css'], $root_sel . '.is-header-scrolled::after{opacity:0;}' ),
	'.is-header-scrolled fades ::after to opacity 0'
);
ok(
	array(
		'desktop' => 'off',
		'tablet'  => 'off',
		'mobile'  => 'off',
	) === $fade_real['toggle_effective'],
	'every fade-active tier is removed from the old instant-toggle map'
);
// NEGATIVE CONTROL: a tier where Transparent is genuinely OFF is not claimed
// by the fade even though direction+solid-first+fill are all satisfied —
// proves the per-tier gate reads $transparent_effective, not just the global
// flags.
$mixed_tiers = array(
	'desktop' => 'on',
	'tablet'  => 'off',
	'mobile'  => 'on',
);
$fade_mixed  = sgs_header_scroll_fade_css( $root_sel, 'direction', true, $mixed_tiers, '#fff', '' );
ok(
	'off' === $fade_mixed['toggle_effective']['tablet'],
	'NEGATIVE CONTROL (unchanged from input): the tablet tier, where Transparent was already off, stays off'
);
ok(
	false === strpos( $fade_mixed['css'], '@media (min-width:768px) and (max-width:1023px)' ),
	'NEGATIVE CONTROL: the tablet media block, where Transparent is off, gets no fade rule at all'
);

echo "\n" . $pass . '/' . ( $pass + $fail ) . " passed\n";
if ( $fail > 0 ) {
	echo $fail . " FAILED\n";
	exit( 1 );
}
