<?php
/**
 * Standalone runner for the burger's three bars as motion parts (Spec 38A FR-38A-60): each bar carries its own
 * `__burger-bar-N` class, the Hover state's `restWidth` and `width` emit a real width change per bar with that bar's own
 * delay, and each bar's corner rounding is its own attribute. Fixtures: the Indus draft's bars (18/13/8px growing to 18px,
 * 0.3s, 0.3s and 0.35s with a 0.04s delay on the third) and Mama's (22/22/16px).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-burger-bar-motion-standalone.php
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
foreach ( array( 'esc_attr__', 'esc_html__', '__' ) as $sgs_stub ) {
	if ( ! function_exists( $sgs_stub ) ) {
		eval( 'function ' . $sgs_stub . '( $text, $domain = "default" ) { return htmlspecialchars( (string) $text, ENT_QUOTES, "UTF-8" ); }' );
	}
}
foreach ( array( 'esc_html', 'esc_url' ) as $sgs_stub ) {
	if ( ! function_exists( $sgs_stub ) ) {
		eval( 'function ' . $sgs_stub . '( $text ) { return htmlspecialchars( (string) $text, ENT_QUOTES, "UTF-8" ); }' );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-item-effects.php';
require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-markup.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;

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

/** One bar's hover state: rest and hover width, its own duration and delay. */
function bar_motion( string $rest, string $hover, int $duration, int $delay ): array {
	return array(
		'hover' => array(
			'state' => array(
				'source' => 'item',
				'values' => array(
					'restWidth' => $rest,
					'width'     => $hover,
					'duration'  => $duration,
					'delay'     => $delay,
					'easing'    => 'token:easing.ease-out',
				),
			),
		),
	);
}

/** The real burger markup inside a nav-bar-menu root, through the real motion renderer: [html, css]. */
function render_burger( array $elements, int $bars = 3 ): array {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_in_loop']  = false;
	$GLOBALS['sgs_test_actions']  = array();
	$burger = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 768, 'x', 'after', array(), $bars );
	$html   = '<nav class="wp-block-sgs-nav-bar-menu sgs-nav-bar-menu">' . $burger . '</nav>';
	$out    = sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/nav-bar-menu',
			'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
		),
		$html
	);
	return array( $out, implode( '', $GLOBALS['sgs_collected_css'] ) );
}

/** The declarations of the scoped desktop rule for one bar part. */
function bar_rule( string $css, int $n ): string {
	return 1 === preg_match( '/\.sgs-m-[0-9a-f]+ \.sgs-nav-bar-menu__burger-bar-' . $n . '\{([^}]*)\}/', $css, $m ) ? $m[1] : '';
}

$cases = array(
	'Indus 18/13/8' => array(
		array( 'burger-bar-1' => bar_motion( '18px', '18px', 300, 0 ), 'burger-bar-2' => bar_motion( '13px', '18px', 300, 0 ), 'burger-bar-3' => bar_motion( '8px', '18px', 350, 40 ) ),
		array( 18, 13, 8 ),
		array( 18, 18, 18 ),
		array( 300, 300, 350 ),
	),
	'Mama 22/22/16' => array(
		array( 'burger-bar-1' => bar_motion( '22px', '22px', 250, 0 ), 'burger-bar-2' => bar_motion( '22px', '22px', 250, 0 ), 'burger-bar-3' => bar_motion( '16px', '22px', 250, 40 ) ),
		array( 22, 22, 16 ),
		array( 22, 22, 22 ),
		array( 250, 250, 250 ),
	),
);
foreach ( $cases as $label => $case ) {
	list( $elements, $rest, $hover, $durations ) = $case;
	list( $html, $css )                          = render_burger( $elements );
	for ( $n = 1; $n <= 3; $n++ ) {
		$rule  = bar_rule( $css, $n );
		$i     = $n - 1;
		$delay = 3 === $n ? '40ms' : '0ms';
		ok( '' !== $rule, "$label: bar $n has its own scoped rule on .sgs-nav-bar-menu__burger-bar-$n" );
		ok( false !== strpos( $rule, '--sgs-w-rest:' . $rest[ $i ] . 'px;' ), "$label: bar $n rests at {$rest[$i]}px (--sgs-w-rest)" );
		ok( false !== strpos( $rule, '--sgs-mh-to-w:' . $hover[ $i ] . 'px;' ), "$label: bar $n grows to {$hover[$i]}px (--sgs-mh-to-w)" );
		ok( 1 === preg_match( '/transition:[^;]*--sgs-mh-w ' . $durations[ $i ] . 'ms [^,;]* ' . $delay . '[,;]/', $rule ), "$label: bar $n transitions the width over {$durations[$i]}ms with a $delay delay" );
		ok( 1 === preg_match( '/<span[^>]*data-sgs-mc="width"[^>]*burger-bar-' . $n . '"|<span[^>]*burger-bar-' . $n . '"[^>]*data-sgs-mc="width"/', $html ), "$label: bar $n is stamped with the width channel" );
	}
	ok( 1 === preg_match( '/<button[^>]*data-sgs-mitem/', $html ), "$label: the burger button drives the bars (data-sgs-mitem)" );
	ok( false === strpos( bar_rule( $css, 1 ) . bar_rule( $css, 2 ), '40ms' ) && false !== strpos( bar_rule( $css, 3 ), '40ms' ), "$label: only Bar 3 carries the 40ms delay" );
}

list( $html2 ) = render_burger( array( 'burger-bar-3' => bar_motion( '8px', '18px', 350, 40 ) ), 2 );
ok( false === strpos( $html2, 'burger-bar-3' ), 'two-bar glyph prints no Bar 3 element' );

// Corner rounding and alignment, through the real trigger CSS emitter.
foreach ( array( 'helpers-responsive.php', 'helpers-tokens.php' ) as $f ) {
	$path = dirname( __DIR__, 2 ) . '/includes/' . $f;
	if ( is_file( $path ) ) {
		require_once $path;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-trigger-css.php';
if ( function_exists( 'sgs_nav_bar_menu_trigger_css' ) && function_exists( 'sgs_emit_responsive_css' ) ) {
	$tcss = sgs_nav_bar_menu_trigger_css(
		array(
			'burgerBar1BorderRadius' => array( 'desktop' => '9px' ),
			'burgerBar2BorderRadius' => array( 'desktop' => '4px' ),
			'burgerBar3BorderRadius' => array( 'desktop' => '0px' ),
			'burgerBarAlign'         => 'end',
		),
		'.uid1'
	);
	ok( false !== strpos( $tcss, '.uid1 .sgs-nav-bar-menu__burger-bar-1{border-radius:9px' ), 'Bar 1 corner rounding reaches its own class' );
	ok( false !== strpos( $tcss, '.uid1 .sgs-nav-bar-menu__burger-bar-2{border-radius:4px' ), 'Bar 2 corner rounding reaches its own class' );
	ok( false !== strpos( $tcss, '.uid1 .sgs-nav-bar-menu__burger-bar-3{border-radius:0px' ), 'Bar 3 corner rounding reaches its own class' );
	ok( false !== strpos( $tcss, '.uid1 .sgs-nav-bar-menu__burger-icon{align-items:flex-end;}' ), 'bars line up on the end side' );
	$two = sgs_nav_bar_menu_trigger_css( array( 'burgerBarCount' => 2, 'burgerBar3BorderRadius' => array( 'desktop' => '9px' ) ), '.uid2' );
	ok( false === strpos( $two, 'burger-bar-3' ), 'a two-bar glyph writes no Bar 3 rule' );
} else {
	ok( false, 'the trigger CSS emitter and its helpers load in the standalone harness' );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
