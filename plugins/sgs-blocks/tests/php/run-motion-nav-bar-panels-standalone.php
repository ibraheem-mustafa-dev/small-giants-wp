<?php
/**
 * Standalone test for the nav bar's panels on the Entrance model (Spec 38A FR-38A-51; build unit M4.6):
 * `includes/helpers-nav-bar-motion-model.php`, run with the shipped motion classes and `Sgs_Motion_Loop_Delays`
 * through the stand-ins in `stubs/motion-render-stubs.php`.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-nav-bar-panels-standalone.php
 *
 * What it proves:
 * - every panel wrap becomes a motion state host (`data-sgs-motion-state=""`); each item takes its index in its OWN
 *   panel (0, 1, 2 then 0, 1 for a second dropdown; never `:nth-child`), a `<style>` child is never counted, a mega
 *   column takes the `sgs-nav-bar-menu__mega-item` class and a column's rows `sgs-nav-bar-menu__mega-row` (restarting in
 *   each column); a part with no entrance is not tagged;
 * - the bar's stored stagger (26ms step, 320ms cap) writes one `--sgs-me-delay` rule per index: 0, 26 ... 312, 320,
 *   320, plus `--sgs-me-close-delay` because the items open on the `open` trigger; front end to the collector, the
 *   editor preview as a `<style>` tag;
 * - the closing panel stays displayed and out of the pointer's way; the scrim reads the panel layer's timing (a token
 *   duration gives no number, so the scrim keeps its own default);
 * - negative controls: a bar with no `sgsMotion` is off the model, and a bar with no stagger settings writes no server
 *   delays; `apply: false` is not an off switch (it only decides whether a child with no entrance takes the container's).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-nav-bar-motion-model.php';

use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;

$pass = 0;
$fail = 0;
$ok   = static function ( bool $cond, string $label, string $detail = '' ) use ( &$pass, &$fail ): void {
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
		return;
	}
	++$fail;
	echo "FAIL  $label" . ( '' !== $detail ? "  => $detail" : '' ) . "\n";
};

$reset = static function ( bool $frontend = true ): void {
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = ! $frontend;
	$GLOBALS['sgs_test_rest']     = false;
};

/** The `data-sgs-loop-i` values of every element carrying a class, in document order. */
$indices = static function ( string $html, string $class ): array {
	preg_match_all( '/<[a-z][a-z0-9]*\b[^>]*\bclass="([^"]*)"[^>]*>/i', $html, $m, PREG_SET_ORDER );
	$out = array();
	foreach ( $m as $tag ) {
		if ( in_array( $class, preg_split( '/\s+/', $tag[1] ), true ) ) {
			$out[] = preg_match( '/data-sgs-loop-i="(\d+)"/', $tag[0], $i ) ? (int) $i[1] : null;
		}
	}
	return $out;
};

/** Desktop `--sgs-me-delay` (or another property) per index from emitted CSS (base rules only). */
$delays = static function ( string $css, string $class, string $prop = '--sgs-me-delay' ): array {
	$css = preg_replace( '/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/', '', $css );
	$out = array();
	if ( preg_match_all( '/([^{}]+)\{([^{}]*)\}/', $css, $m, PREG_SET_ORDER ) ) {
		foreach ( $m as $rule ) {
			if ( false !== strpos( $rule[1], '.' . $class . '[data-sgs-loop-i=' ) && preg_match( '/data-sgs-loop-i="(\d+)"/', $rule[1], $i ) && preg_match( '/' . preg_quote( $prop, '/' ) . ':(\d+)ms/', $rule[2], $d ) ) {
				$out[ (int) $i[1] ] = (int) $d[1];
			}
		}
	}
	ksort( $out );
	return array_values( $out );
};

$layer = static function ( array $from, array $to, int $duration ): array {
	return array(
		'entrance' => array(
			'base' => array(
				'trigger' => 'open',
				'values'  => array( 'from' => $from, 'to' => $to, 'duration' => $duration, 'easing' => 'ease-out' ),
				'close'   => array( 'to' => $to, 'closeDuration' => 0 ),
			),
		),
	);
};

// A bar's rendered items: two dropdowns (3 and 2 links) and one mega panel (a <style>, then 15 columns, the first
// holding a heading and a list).
$dropdown = static function ( string $id, int $count ): string {
	$li = '';
	for ( $i = 0; $i < $count; $i++ ) {
		$li .= '<li class="sgs-nav-bar-menu__subitem"><a class="sgs-nav-bar-menu__sublink" href="#">L' . $i . '</a></li>';
	}
	return '<li class="sgs-nav-bar-menu__item sgs-nav-bar-menu__item--has-submenu"><div class="sgs-nav-bar-menu__submenu-root"><button type="button" class="sgs-nav-bar-menu__subtoggle" data-sgs-mega-trigger aria-expanded="false" aria-controls="' . $id . '">x</button>'
		. '<div id="' . $id . '" class="sgs-nav-bar-menu__submenu-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--none" data-sgs-mega-panel data-lenis-prevent><ul class="sgs-nav-bar-menu__submenu">' . $li . '</ul></div></div></li>';
};
$columns = '';
for ( $c = 0; $c < 15; $c++ ) {
	$columns .= 0 === $c
		? '<div class="wp-block-sgs-mega-group sgs-mega-group"><style>.x{color:red}</style><h3 class="wp-block-heading">Group</h3><ul class="wp-block-sgs-icon-list"><li>a</li><li>b<br></li></ul><img src="x.png" alt=""></div>'
		: '<div class="wp-block-sgs-mega-group sgs-mega-group"><p>C' . $c . '</p></div>';
}
$mega = '<li class="sgs-nav-bar-menu__item sgs-nav-bar-menu__item--mega"><div class="sgs-nav-bar-menu__mega"><button type="button" class="sgs-nav-bar-menu__link sgs-nav-bar-menu__mega-trigger" data-sgs-mega-trigger aria-expanded="false" aria-controls="m1">Products</button>'
	. '<div id="m1" class="sgs-nav-bar-menu__mega-panel-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--none" data-sgs-mega-panel data-lenis-prevent>'
	. '<style>.wp-block-sgs-mega-panel{gap:1px}</style><div class="wp-block-sgs-mega-panel"><div class="sgs-mega-panel__content"><style>.y{}</style>' . $columns . '</div></div></div></div></li>';
$html = $dropdown( 'd1', 3 ) . $dropdown( 'd2', 2 ) . $mega;

$item = $layer( array( 'opacity' => 0, 'translateY' => 8 ), array( 'opacity' => 1, 'translateY' => 0 ), 460 );
$bar  = array(
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array(
			'panel'     => array(
				'entrance' => array(
					'base' => array(
						'trigger' => 'open',
						'values'  => array( 'from' => array( 'opacity' => 0 ), 'to' => array( 'opacity' => 1 ), 'duration' => 340, 'easing' => 'cubic-bezier(0.16, 0.84, 0.32, 1)' ),
						'close'   => array( 'closeDuration' => 0 ),
					),
				),
			),
			'subitem'   => $item,
			'mega-item' => $item,
		),
		'stagger'  => array( 'offset' => 0, 'step' => 26, 'order' => 'row-first', 'perRow' => false, 'cap' => 320 ),
	),
);

// 1. Hosts and per-panel indices.
$ok( sgs_nav_bar_uses_motion_model( $bar ) && ! sgs_nav_bar_uses_motion_model( array( 'submenuItemStagger' => 26 ) ) && ! sgs_nav_bar_uses_motion_model( array( 'sgsMotion' => array( 'v' => 1 ) ) ), 'on the model only with layers or stagger settings (NEGATIVE CONTROL: a bar holding only the old attributes is off it)' );
$reset();
$out = sgs_nav_bar_motion_panels( $html, 'sgs-nav-bar-menu-abc', $bar );
$ok( 3 === substr_count( $out['html'], 'data-sgs-motion-state=""' ) && 0 === substr_count( $html, 'data-sgs-motion-state' ), 'every panel wrap (two dropdowns, one mega) becomes a motion state host' );
$ok( array( 0, 1, 2, 0, 1 ) === $indices( $out['html'], 'sgs-nav-bar-menu__subitem' ), 'dropdown items count from 0 in each dropdown: 0, 1, 2 then 0, 1', json_encode( $indices( $out['html'], 'sgs-nav-bar-menu__subitem' ) ) );
$mega_ix = $indices( $out['html'], 'sgs-nav-bar-menu__mega-item' );
$ok( range( 0, 14 ) === $mega_ix, 'the 15 mega columns take the mega-item class and 0 ... 14; the <style> children are not counted', json_encode( $mega_ix ) );
$ok( array() === $indices( $out['html'], 'sgs-nav-bar-menu__mega-row' ), 'no row entrance: the rows are not tagged' );
$ok( false === strpos( $out['html'], '<style data-sgs-loop-i' ) && false !== strpos( $out['html'], '<li>a</li><li>b<br></li>' ), 'no <style> carries an index; the icon list\'s own <li> items (not a container\'s children) carry none' );

// 2. Stored delays: the U-5 measured 26ms step capped at 320ms, open and close.
$css = implode( '', $GLOBALS['sgs_collected_css'] ?? array() );
$want = array( 0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 320, 320 );
$ok( '' === $out['style'] && $want === $delays( $css, 'sgs-nav-bar-menu__mega-item' ), 'the mega columns get 0, 26 ... 312, 320, 320 through the collector (front end)', json_encode( $delays( $css, 'sgs-nav-bar-menu__mega-item' ) ) );
$ok( array( 0, 26, 52 ) === $delays( $css, 'sgs-nav-bar-menu__subitem' ), 'the dropdown items get 0, 26, 52 (the longest dropdown, shared by every dropdown)' );
$ok( $want === $delays( $css, 'sgs-nav-bar-menu__mega-item', '--sgs-me-close-delay' ), 'each item also stores its close delay, in the same order (closeOrder same)' );
$ok( false !== strpos( $css, '.sgs-nav-bar-menu-abc .sgs-nav-bar-menu__mega-item[data-sgs-loop-i="13"]' ) && false === strpos( $css, 'nth-child' ), 'the rules are scoped to the bar and keyed on the index attribute, never :nth-child' );
$reset( false );
$editor = sgs_nav_bar_motion_panels( $html, 'sgs-nav-bar-menu-abc', $bar );
$ok( 0 === strpos( $editor['style'], '<style id="sgs-nav-bar-menu-abc-loop">' ) && array() === ( $GLOBALS['sgs_collected_css'] ?? array() ), 'the editor preview gets the rules as a <style> tag (the collector never flushes there)' );

// 3. Rows scope: each column's rows count from 0.
$rows_bar = $bar;
unset( $rows_bar['sgsMotion']['elements']['mega-item'] );
$rows_bar['sgsMotion']['elements']['mega-row'] = $item;
$reset();
$rows = sgs_nav_bar_motion_panels( $html, 'sgs-nav-bar-menu-abc', $rows_bar );
$row_ix = $indices( $rows['html'], 'sgs-nav-bar-menu__mega-row' );
$ok( array_merge( array( 0, 1, 2 ), array_fill( 0, 14, 0 ) ) === $row_ix && array() === $indices( $rows['html'], 'sgs-nav-bar-menu__mega-item' ), 'rows: the first column\'s heading, list and image are 0, 1, 2 (its <style> skipped), every other column\'s row is 0; the columns are not tagged', json_encode( $row_ix ) );

// 4. A panel layer with no item entrance: hosts only.
$panel_only = array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'panel' => $bar['sgsMotion']['elements']['panel'] ) ) );
$reset();
$po = sgs_nav_bar_motion_panels( $html, 'sgs-nav-bar-menu-abc', $panel_only );
$ok( 3 === substr_count( $po['html'], 'data-sgs-motion-state=""' ) && false === strpos( $po['html'], 'data-sgs-loop-i' ) && '' === implode( '', $GLOBALS['sgs_collected_css'] ?? array() ), 'a panel entrance alone: the panels are hosts, no item is tagged, no delay rule is written' );

// 5. The closing panel and the scrim timing.
$ok( '.sgs-nav-bar-menu-abc .sgs-nav-bar-menu__panel-motion[data-sgs-motion-state~="close"]{display:block;pointer-events:none;z-index:99;}' === $out['css'], 'a closing panel stays displayed for its close values, takes no pointer hits and sits below an opening panel' );
$timing = sgs_nav_bar_motion_timing( $bar );
$ok( 340 === $timing['enter_ms'] && 0 === $timing['exit_ms'] && 'cubic-bezier(0.16, 0.84, 0.32, 1)' === $timing['easing'], 'the scrim reads the panel layer: 340ms in, 0ms out, its curve', json_encode( $timing ) );
$token_bar = $panel_only;
$token_bar['sgsMotion']['elements']['panel']['entrance']['base']['values']['duration'] = 'token:duration.slow';
unset( $token_bar['sgsMotion']['elements']['panel']['entrance']['base']['close'] );
$tt = sgs_nav_bar_motion_timing( $token_bar );
$ok( null === $tt['enter_ms'] && null === $tt['exit_ms'], 'a token duration gives no number, so the scrim keeps its own default' );

// 6. `apply: false` is not an off switch: the server delays are still written. Negative control: no stagger settings,
// no delays.
$apply_off = $bar;
$apply_off['sgsMotion']['stagger']['apply'] = false;
$reset();
$ok( null !== Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu', 'u', $apply_off, 3, '.sgs-nav-bar-menu__subitem' ), 'apply false still writes the server delays (Sgs_Motion_Loop_Delays::normalise)' );
$no_stagger = $bar;
unset( $no_stagger['sgsMotion']['stagger'] );
$reset();
sgs_nav_bar_motion_panels( $html, 'sgs-nav-bar-menu-abc', $no_stagger );
$ok( '' === implode( '', $GLOBALS['sgs_collected_css'] ?? array() ) && null === Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu', 'u', $no_stagger, 3, '.sgs-nav-bar-menu__subitem' ), 'NEGATIVE CONTROL: a bar with no stagger settings writes no delays' );

echo "\nRESULT  $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
