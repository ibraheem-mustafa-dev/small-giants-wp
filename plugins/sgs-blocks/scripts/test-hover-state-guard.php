<?php
/**
 * Gate: the touch-safe hover emitter emits the shape it claims to.
 *
 * Guards `includes/helpers-hover-state.php`, which every SGS `:hover` rule now
 * routes through. The three properties that matter, and why each is here:
 *
 *  1. The HOVER half sits inside `@media (hover: hover) and (pointer: fine)`
 *     and behind `:where(:root:not(.sgs-touch-input))`. Lose either and a tap
 *     on a phone engages hover and it sticks -- the defect this exists to fix.
 *  2. The FOCUS half sits OUTSIDE both guards. Lose that and keyboard users
 *     lose the focus state on every touch device: an accessibility regression
 *     that no visual check would catch.
 *  3. The touch guard is wrapped in `:where()`, contributing ZERO specificity,
 *     so a hover rule still out-ranks its own resting rule by `:hover` alone.
 *     A rule that silently loses is indistinguishable from one that is absent.
 *
 * Includes a negative control: the guarded output must differ from the old
 * unguarded shape, so this cannot pass against an emitter that stopped
 * guarding.
 *
 * Run: php scripts/test-hover-state-guard.php
 *
 * @package SGS\Blocks
 */

require_once __DIR__ . '/../includes/helpers-hover-state.php';

$fail = 0;
function check( $label, $cond, $got = '' ) {
	global $fail;
	if ( $cond ) { echo "  PASS  $label\n"; }
	else { echo "  FAIL  $label\n        got: $got\n"; $fail++; }
}

$r = sgs_hover_state_rules( '.uid', 'color:red', ':focus-visible' );
echo "emitted: $r\n\n";

check( 'hover half is inside the media query',
	strpos( $r, '@media (hover: hover) and (pointer: fine){' ) === 0, $r );
check( 'hover half carries the zero-specificity touch guard',
	strpos( $r, ':where(:root:not(.sgs-touch-input)) .uid:hover{color:red}' ) !== false, $r );
check( 'focus half is OUTSIDE the media query (keyboard must survive)',
	preg_match( '/\}\.uid:focus-visible\{color:red\}$/', $r ) === 1, $r );
check( 'both halves carry identical declarations',
	substr_count( $r, 'color:red' ) === 2, $r );

// Multi-selector: every part must get the suffix, not just the last.
$m = sgs_hover_state_rules( '.a,.b', 'color:red', ':focus-within' );
check( 'multi-selector: EVERY part gets :hover (not just the last)',
	strpos( $m, '.a:hover' ) !== false && strpos( $m, '.b:hover' ) !== false, $m );
check( 'multi-selector: EVERY part gets the focus pseudo',
	strpos( $m, '.a:focus-within' ) !== false && strpos( $m, '.b:focus-within' ) !== false, $m );

// Pseudo-element suffix.
$p = sgs_hover_state_rules( '.uid', 'background:blue', ':focus-within', '::after' );
check( 'pseudo-element suffix lands on hover AND focus',
	strpos( $p, '.uid:hover::after' ) !== false && strpos( $p, '.uid:focus-within::after' ) !== false, $p );

// Empty inputs emit nothing.
check( 'empty decls emit nothing', '' === sgs_hover_state_rules( '.uid', '', ':focus-visible' ) );
check( 'empty selector emits nothing', '' === sgs_hover_state_rules( '', 'color:red', ':focus-visible' ) );
check( 'empty rule wrap emits nothing', '' === sgs_hover_media_wrap( '   ' ) );

// NEGATIVE CONTROL: prove the guard is not vacuous — an unguarded emit must differ.
$unguarded = '.uid:hover,.uid:focus-visible{color:red}';
check( 'NEGATIVE CONTROL: guarded output differs from the old unguarded shape',
	$r !== $unguarded, $r );

echo "\n" . ( $fail ? "$fail CHECK(S) FAILED\n" : "ALL CHECKS PASSED\n" );
exit( $fail ? 1 : 0 );
