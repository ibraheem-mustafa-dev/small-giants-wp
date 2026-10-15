<?php
/**
 * Standalone runner for the state-change motion on the Entrance model: the cart count pop, the burger morph and the
 * accordion icon turn (Spec 38A FR-38A-53, plan unit M5.17).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-state-model-standalone.php
 *
 * Reads the REAL block.json files and the shipped motion classes (through `stubs/motion-render-stubs.php`) and asserts:
 * - declaration: `sgs/cart` declares `count-changed` and `count-loaded`, `sgs/nav-bar-menu` `menu-open`, `sgs/accordion`
 *   `expanded`; a state a block does not declare is refused with no CSS and no module load (the negative control, per
 *   block);
 * - emission: each declared state's layer prints its rule keyed to that state on the part's element, and the pop (a
 *   multi-keyframe entrance) names its state for the keyframe player;
 * - tokens, not literals: a layer holding `token:easing.default` prints `--sgs-me-ease:var(--wp--custom--easing--default)`
 *   for the pop and the icon turn, the burger morph reads it into `--sgs-nbm-burger-morph-easing` and its duration token
 *   into `--sgs-nbm-burger-morph-duration` (so one change to the theme token restyles all three); no literal time or
 *   curve is printed by the model path;
 * - reduced motion: every rule that sets the animation name keys on `--sgs-mt-in`, which `assets/css/motion-triggers.css`
 *   defines only inside `prefers-reduced-motion: no-preference`, and the keyframe player returns early under reduce;
 * - the overlap rule: a block whose `sgsMotion` carries no layer on the part renders byte-identically to the commit
 *   recorded in `fixtures/state-model-old-path.json` (cart in three modes plus the legacy boolean, the accordion item
 *   with and without a rotation, the burger morph section of the nav bar), and the same blocks with a layer take the new
 *   path (negative control: the new path differs from the recorded old output). The recorded outputs are captured by
 *   `SGS_STATE_MODEL_CAPTURE=<commit> php plugins/sgs-blocks/tests/php/run-motion-state-model-standalone.php`.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-nav-bar-motion-model.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-motion-easing.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-state-motion-model.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Trigger_Open_State;

$root     = dirname( __DIR__, 2 );
$fixture  = __DIR__ . '/fixtures/state-model-old-path.json';
$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};
$has = static function ( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
};

/** Render one block's motion layers over static markup. */
$render = static function ( string $block, array $elements, string $html ): array {
	Sgs_Motion_Renderer::reset();
	Sgs_Motion_Trigger_Open_State::reset();
	$GLOBALS['sgs_collected_css']        = array();
	$GLOBALS['sgs_test_is_admin']        = false;
	$GLOBALS['sgs_test_in_loop']         = false;
	$GLOBALS['sgs_test_actions']         = array();
	$GLOBALS['sgs_test_enqueued_styles'] = array();
	$GLOBALS['sgs_test_enqueued']        = array();
	$out = sgs_test_render_motion_block(
		array(
			'blockName' => $block,
			'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
		),
		$html
	);
	return array( $out, implode( '', $GLOBALS['sgs_collected_css'] ) );
};
/** Whether an element with the class carries a state entrance mark (`data-sgs-me` starting `state`), whatever the attribute order. */
$marked = static function ( string $html, string $class ): bool {
	return 1 === preg_match( '/<[a-z]+(?=[^>]*\bclass="[^"]*\b' . preg_quote( $class, '/' ) . '\b)(?=[^>]*\bdata-sgs-me="state[^"]*")[^>]*>/', $html );
};
$scope_of = static function ( string $html ): string {
	return 1 === preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ) ? $m[1] : 'none';
};
$dropped = static function (): array {
	return array_values( array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] ) );
};

$cart_html = '<div class="wp-block-sgs-cart sgs-cart"><a class="sgs-cart__trigger"><span class="sgs-cart__badge" data-sgs-cart-count>0</span></a></div>';
$bar_html  = '<nav class="wp-block-sgs-nav-bar-menu"><div class="sgs-nav-bar-menu__toggle-wrap"><button class="sgs-nav-bar-menu__burger">Menu</button></div></nav>';
$acc_html  = '<div class="wp-block-sgs-accordion sgs-accordion"><details class="sgs-accordion-item"><summary><span class="sgs-accordion-item__icons"><span class="sgs-accordion-item__icon-open sgs-accordion-item__icon-open--rotates">+</span></span></summary></details></div>';

$pop = array(
	'trigger' => 'state',
	'state'   => 'count-changed',
	'values'  => array(
		'keyframes' => array(
			array( 'offset' => 0, 'opacity' => 0, 'scale' => 0.6 ),
			array( 'offset' => 60, 'opacity' => 1, 'scale' => 1.15 ),
			array( 'offset' => 100, 'opacity' => 1, 'scale' => 1 ),
		),
		'duration'  => 500,
		'easing'    => 'token:easing.default',
	),
);
$morph = array(
	'trigger' => 'state',
	'state'   => 'menu-open',
	'values'  => array( 'duration' => 'token:duration.medium', 'easing' => 'token:easing.default' ),
);
$turn = array(
	'trigger' => 'state',
	'state'   => 'expanded',
	'values'  => array( 'to' => array( 'rotate' => 45 ), 'duration' => 'token:duration.medium', 'easing' => 'token:easing.default' ),
);

// 1. The declarations come from the shipped block.json files.
$check( array( 'count-changed', 'count-loaded' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/cart' ), 'sgs/cart declares count-changed and count-loaded: ' . json_encode( Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/cart' ) ) );
$check( array( 'menu-open' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/nav-bar-menu' ), 'sgs/nav-bar-menu declares menu-open: ' . json_encode( Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/nav-bar-menu' ) ) );
$check( array( 'expanded' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/accordion' ), 'sgs/accordion declares expanded: ' . json_encode( Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/accordion' ) ) );

// 2. Emission: the count pop (a multi-keyframe entrance), the burger morph and the icon turn.
list( $html, $css ) = $render( 'sgs/cart', array( 'badge' => array( 'entrance' => array( 'base' => $pop ) ) ), $cart_html );
$markups            = array( $html );
$scope              = $scope_of( $html );
$check( $marked( $html, 'sgs-cart__badge' ), 'cart: the badge is marked as a state entrance: ' . $html );
$check( $has( $html, 'data-sgs-me-keyframes' ), 'cart: the pop carries its keyframes for the player: ' . $html );
$check( $has( $css, '.' . $scope . ' .sgs-cart__badge:is([data-sgs-motion-state~="count-changed"],[data-sgs-motion-state~="count-changed"] *){--sgs-mt-on:1;}' ), 'cart: the rule is keyed to count-changed and sets the on flag only (the keyframe player plays it): ' . $css );
$check( $has( $css, '.' . $scope . ' .sgs-cart__badge{--sgs-mt-kf:count-changed;}' ), 'cart: the pop names its state for the keyframe player: ' . $css );
$check( $has( $css, '--sgs-me-dur:500ms;' ), 'cart: the pop duration is emitted: ' . $css );
$check( $has( $css, '--sgs-me-ease:var(--wp--custom--easing--default);' ), 'cart: the easing token prints the theme custom property, not a curve: ' . $css );
$check( ! $has( $css, 'cubic-bezier' ) && ! $has( $css, 'sgs-cart-count-pop' ), 'cart: no literal curve and no old keyframe name in the model path: ' . $css );
$check( ! empty( $GLOBALS['sgs_test_enqueued']['module:@sgs/motion-state'] ), 'cart: a declared state entrance enqueues the state helper module' );

list( $html, $css ) = $render( 'sgs/nav-bar-menu', array( 'burger' => array( 'entrance' => array( 'base' => $morph ) ) ), $bar_html );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( $marked( $html, 'sgs-nav-bar-menu__burger' ), 'burger: the button is marked as a state entrance with no movement channel: ' . $html );
$check( $has( $css, '.' . $scope . ' .sgs-nav-bar-menu__burger:is([data-sgs-motion-state~="menu-open"],[data-sgs-motion-state~="menu-open"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}' ), 'burger: the rule is keyed to menu-open: ' . $css );
$check( $has( $css, '--sgs-me-dur:var(--wp--custom--duration--medium);' ) && $has( $css, '--sgs-me-ease:var(--wp--custom--easing--default);' ), 'burger: duration and easing print their theme tokens: ' . $css );

list( $html, $css ) = $render( 'sgs/accordion', array( 'turning-icon' => array( 'entrance' => array( 'base' => $turn ) ) ), $acc_html );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( $marked( $html, 'sgs-accordion-item__icon-open--rotates' ), 'accordion: the turning icon is marked as a state entrance on the rotate channel: ' . $html );
$check( $has( $css, '.' . $scope . ' .sgs-accordion-item__icon-open--rotates:is([data-sgs-motion-state~="expanded"],[data-sgs-motion-state~="expanded"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}' ), 'accordion: the rule is keyed to expanded: ' . $css );
$check( $has( $css, '--sgs-me-to-rot:45deg;' ) && $has( $css, '--sgs-me-dur:var(--wp--custom--duration--medium);' ) && $has( $css, '--sgs-me-ease:var(--wp--custom--easing--default);' ), 'accordion: the 45 degree turn, duration and easing print as values and tokens: ' . $css );

// 3. NEGATIVE CONTROLS: a state the block does not declare is refused, with no CSS and no module.
$cases = array(
	'cart expanded (the accordion\'s state)'      => array( 'sgs/cart', 'badge', $cart_html, 'expanded', $pop ),
	'cart menu-open (the bar\'s state)'          => array( 'sgs/cart', 'badge', $cart_html, 'menu-open', $pop ),
	'burger count-changed (the cart\'s state)'   => array( 'sgs/nav-bar-menu', 'burger', $bar_html, 'count-changed', $morph ),
	'burger expanded (the accordion\'s state)'   => array( 'sgs/nav-bar-menu', 'burger', $bar_html, 'expanded', $morph ),
	'accordion count-changed (the cart\'s state)' => array( 'sgs/accordion', 'turning-icon', $acc_html, 'count-changed', $turn ),
	'accordion menu-open (the bar\'s state)'     => array( 'sgs/accordion', 'turning-icon', $acc_html, 'menu-open', $turn ),
);
foreach ( $cases as $label => list( $block, $part, $block_html, $state, $layer ) ) {
	$layer['state']     = $state;
	list( $html, $css ) = $render( $block, array( $part => array( 'entrance' => array( 'base' => $layer ) ) ), $block_html );
	$markups[]          = $html;
	$refusal            = $dropped();
	$check( ! $has( $html, 'data-sgs-me=' ) && ! $has( $css, 'data-sgs-motion-state' ) && ! $has( $css, '--sgs-me-' ), "$label: refused with no entrance attribute and no CSS: $css" );
	$check( isset( $refusal[0][1][2]['id'] ) && 'state-not-declared' === $refusal[0][1][2]['id'], "$label: the refusal is reported" );
	$check( empty( $GLOBALS['sgs_test_enqueued']['module:@sgs/motion-state'] ) && ! in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), "$label: nothing is enqueued" );
}

// 4. The helpers the three renders read.
$check( null === sgs_cart_count_pop_mode( array() ) && null === sgs_cart_count_pop_mode( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => $pop ) ) ) ) ) ), 'cart: no badge layer means the old path (a layer on another part does not flip it)' );
$badge = static fn( array $layer ): array => array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'badge' => array( 'entrance' => array( 'base' => $layer ) ) ) ) );
$check( 'change' === sgs_cart_count_pop_mode( $badge( $pop ) ) && 'load-and-change' === sgs_cart_count_pop_mode( $badge( array_merge( $pop, array( 'state' => 'count-loaded' ) ) ) ), 'cart: count-changed is change, count-loaded is load-and-change' );
$check( 'off' === sgs_cart_count_pop_mode( $badge( array( 'trigger' => 'load', 'values' => array( 'from' => array( 'opacity' => 0 ) ) ) ) ), 'cart: a badge layer on another trigger leaves the count unpopped (off)' );
$bar = static fn( array $layer ): array => array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'burger' => array( 'entrance' => array( 'base' => $layer ) ) ) ) );
$check( null === sgs_nav_bar_burger_morph_timing( array() ), 'burger: no layer means the old path' );
$check( array( 'duration' => 'var(--wp--custom--duration--medium)', 'easing' => 'var(--wp--custom--easing--default)' ) === sgs_nav_bar_burger_morph_timing( $bar( $morph ) ), 'burger: the layer\'s tokens print as theme custom properties: ' . json_encode( sgs_nav_bar_burger_morph_timing( $bar( $morph ) ) ) );
$check( array( 'duration' => '320ms', 'easing' => 'cubic-bezier(0.16, 0.84, 0.32, 1)' ) === sgs_nav_bar_burger_morph_timing( $bar( array( 'trigger' => 'state', 'state' => 'menu-open', 'values' => array( 'duration' => 320, 'easing' => 'cubic-bezier(0.16, 0.84, 0.32, 1)' ) ) ) ), 'burger: a stored time and curve print as stored' );
$check( array( 'duration' => '', 'easing' => '' ) === sgs_nav_bar_burger_morph_timing( $bar( array( 'trigger' => 'state', 'state' => 'menu-open', 'values' => array() ) ) ), 'burger: a layer storing no timing leaves both to the stylesheet fallback' );
$check( ! sgs_nav_bar_uses_motion_model( $bar( $morph ) ) && sgs_nav_bar_uses_motion_model( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'burger' => array( 'entrance' => array( 'base' => $morph ) ), 'panel' => array( 'entrance' => array( 'base' => array( 'trigger' => 'open', 'values' => array( 'duration' => 180 ) ) ) ) ) ) ) ), 'burger: a layer on the burger alone leaves the dropdown panels on the old motion; a panel layer puts them on the model' );
$check( sgs_accordion_icon_turn_on_model( $bar( $turn ) ) === false && sgs_accordion_icon_turn_on_model( array( 'elements' => array( 'turning-icon' => array( 'entrance' => array( 'base' => $turn ) ) ) ) ) && ! sgs_accordion_icon_turn_on_model( null ) && ! sgs_accordion_icon_turn_on_model( array( 'elements' => array( 'turning-icon' => array( 'entrance' => array( 'base' => array_merge( $turn, array( 'state' => 'other' ) ) ) ) ) ) ), 'accordion: only an expanded layer on the turning-icon part puts the turn on the model' );

// 5. Reduced motion: the animation name every rule sets comes from `--sgs-mt-in`, defined only under no-preference.
$triggers_css = (string) file_get_contents( $root . '/assets/css/motion-triggers.css' );
preg_match_all( '/@media \(prefers-reduced-motion: no-preference\) \{(.*?)\n\}\n/s', $triggers_css, $m );
$no_pref = implode( "\n", $m[1] );
$outside = str_replace( $no_pref, '', $triggers_css );
$check( $has( $no_pref, '--sgs-mt-in:' ) && ! $has( $outside, '--sgs-mt-in:' ), 'reduced motion: --sgs-mt-in (the name list every state rule animates) is defined only inside prefers-reduced-motion: no-preference' );
$check( $has( $triggers_css, '@media (prefers-reduced-motion: reduce)' ) && $has( $triggers_css, '[data-sgs-me~="state"] {' ), 'reduced motion: a named state shows its to-values at once under reduce' );
$player = (string) file_get_contents( $root . '/assets/js/motion-keyframes.js' );
$check( 1 === preg_match( '/function replay\( el \) \{\s*if \( reducedMotion\(\)/', $player ) && 1 === preg_match( '/function play\( el \) \{\s*if \( reducedMotion\(\)/', $player ), 'reduced motion: the keyframe player (the pop) returns before animating under reduce, on play and on every replay' );
foreach ( array( 'cart/style.css', 'nav-bar-menu/style.css', 'accordion/style.css' ) as $file ) {
	$check( 0 === preg_match( '/animation:\s*[^;]*\b\d+(\.\d+)?m?s\b[^;]*;/', preg_replace( '#@media \(prefers-reduced-motion: no-preference\) \{.*?\n\}\n#s', '', (string) file_get_contents( $root . '/src/blocks/' . $file ) ) ), "$file: no animation shorthand with a literal time outside the no-preference block" );
}

// 6. The overlap rule: old paths byte-identical to the recorded commit, the new paths different.
$blocks_dir = $root . '/src/blocks';
$harness    = $root . '/scripts/qa/lib/render-css-harness.php';
$prepend    = __DIR__ . '/stubs/woocommerce-class-stub.php';

/** Render a block's render.php through the QA harness (optionally a different file), returning the HTML. */
$harness_render = static function ( string $slug, array $attrs, array $context = array(), string $render_file = '' ) use ( $harness, $prepend ): string {
	$attrs_file   = tempnam( sys_get_temp_dir(), 'sgsatt' );
	$context_file = tempnam( sys_get_temp_dir(), 'sgsctx' );
	file_put_contents( $attrs_file, json_encode( $attrs ) );
	file_put_contents( $context_file, json_encode( $context ) );
	$command = array( PHP_BINARY, '-d', 'auto_prepend_file=' . $prepend, $harness, '--slug', $slug, '--attrs-file', $attrs_file, '--context-file', $context_file );
	if ( '' !== $render_file ) {
		array_push( $command, '--render-file', $render_file );
	}
	$pipes = array();
	$proc  = proc_open( $command, array( 1 => array( 'pipe', 'w' ), 2 => array( 'pipe', 'w' ) ), $pipes );
	$out   = '';
	if ( is_resource( $proc ) ) {
		$out = (string) stream_get_contents( $pipes[1] );
		stream_get_contents( $pipes[2] );
		fclose( $pipes[1] );
		fclose( $pipes[2] );
		proc_close( $proc );
	}
	unlink( $attrs_file );
	unlink( $context_file );
	$data = json_decode( $out, true );
	return is_array( $data ) && ! empty( $data['ok'] ) ? (string) $data['html'] : 'HARNESS-ERROR ' . $out;
};

/** The burger-morph section of nav-bar-menu/render.php, run against fixture attributes: the CSS it appends. */
$morph_section = static function ( string $source ): string {
	$start = strpos( $source, '$sgs_nm_morph_duration = isset(' );
	$end   = strpos( $source, "\t\$css .= \$uid_sel . '{' . \$sgs_nm_morph_vars . '}';\n}", (int) $start );
	return false === $start || false === $end ? '' : substr( $source, $start, $end + strlen( "\t\$css .= \$uid_sel . '{' . \$sgs_nm_morph_vars . '}';\n}" ) - $start );
};
$run_morph = static function ( string $section, array $attributes ): string {
	$css     = '';
	$uid_sel = '.uid';
	// The established CLI-test idiom: a section extracted VERBATIM from the shipped render.php, so a change to it is a change to what is tested.
	eval( $section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return $css;
};

$cart_cases = array(
	'cart_off'        => array( 'displayMode' => 'link' ),
	'cart_change'     => array( 'displayMode' => 'link', 'countPopAnimation' => 'change' ),
	'cart_load'       => array( 'displayMode' => 'link', 'countPopAnimation' => 'load-and-change' ),
	'cart_bool'       => array( 'displayMode' => 'link', 'countPopAnimation' => true ),
	'cart_other_part' => array( 'displayMode' => 'link', 'countPopAnimation' => 'change', 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'from' => array( 'opacity' => 0 ) ) ) ) ) ) ) ),
);
$item_cases = array(
	'item_cross'       => array( array( 'title' => 'Q' ), array() ),
	'item_cross_zero'  => array( array( 'title' => 'Q' ), array( 'sgs/accordionIconRotation' => 0 ) ),
	'item_rotate_45'   => array( array( 'title' => 'Q' ), array( 'sgs/accordionIconRotation' => 45 ) ),
	'item_other_part'  => array( array( 'title' => 'Q' ), array( 'sgs/accordionIconRotation' => 45, 'sgs/accordionMotion' => array( 'v' => 1, 'elements' => array( 'inner' => array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'from' => array( 'opacity' => 0 ) ) ) ) ) ) ) ) ),
);
$morph_cases = array(
	'morph_default'   => array(),
	'morph_320'       => array( 'burgerMorphDuration' => 320 ),
	'morph_easing'    => array( 'burgerMorphEasing' => 'default' ),
	'morph_custom'    => array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'cubic-bezier(0.1, 0.7, 0.3, 1)', 'burgerMorphDuration' => 90 ),
	'morph_other_part' => array( 'burgerMorphDuration' => 320, 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'panel' => array( 'entrance' => array( 'base' => array( 'trigger' => 'open', 'values' => array( 'duration' => 180 ) ) ) ) ) ) ),
);

$render_all = static function ( string $cart_file, string $item_file, string $nav_source ) use ( $harness_render, $cart_cases, $item_cases, $morph_cases, $morph_section, $run_morph ): array {
	$out = array();
	foreach ( $cart_cases as $id => $attrs ) {
		$out[ $id ] = $harness_render( 'sgs/cart', $attrs, array(), $cart_file );
	}
	foreach ( $item_cases as $id => list( $attrs, $context ) ) {
		$out[ $id ] = $harness_render( 'sgs/accordion-item', $attrs, $context, $item_file );
	}
	$section = $morph_section( $nav_source );
	foreach ( $morph_cases as $id => $attrs ) {
		$out[ $id ] = '' === $section ? 'SECTION-NOT-FOUND' : $run_morph( $section, $attrs );
	}
	return $out;
};

$capture = (string) getenv( 'SGS_STATE_MODEL_CAPTURE' );
if ( '' !== $capture ) {
	// Capture mode: render the files at a commit, in place next to the working copies so their relative requires resolve.
	$show = static function ( string $path ) use ( $capture ): string {
		return (string) shell_exec( 'git -C ' . escapeshellarg( dirname( __DIR__, 4 ) ) . ' show ' . escapeshellarg( $capture . ':plugins/sgs-blocks/' . $path ) );
	};
	$base_cart = $blocks_dir . '/cart/render.base-capture.php';
	$base_item = $blocks_dir . '/accordion-item/render.base-capture.php';
	file_put_contents( $base_cart, $show( 'src/blocks/cart/render.php' ) );
	file_put_contents( $base_item, $show( 'src/blocks/accordion-item/render.php' ) );
	$recorded = $render_all( $base_cart, $base_item, $show( 'src/blocks/nav-bar-menu/render.php' ) );
	unlink( $base_cart );
	unlink( $base_item );
	file_put_contents( $fixture, json_encode( array( 'commit' => $capture, 'outputs' => $recorded ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
	echo 'CAPTURED ' . count( $recorded ) . " outputs from $capture into $fixture\n";
	exit( 0 );
}

$golden  = json_decode( (string) file_get_contents( $fixture ), true );
$golden  = is_array( $golden['outputs'] ?? null ) ? $golden['outputs'] : array();
$current = $render_all( '', '', (string) file_get_contents( $blocks_dir . '/nav-bar-menu/render.php' ) );
$check( count( $golden ) === count( $current ) && array() !== $golden, 'the recorded old-path outputs cover every case: ' . count( $golden ) . ' recorded, ' . count( $current ) . ' rendered' );
foreach ( $current as $id => $now ) {
	$check( isset( $golden[ $id ] ) && $golden[ $id ] === $now && 0 !== strpos( $now, 'HARNESS-ERROR' ) && 'SECTION-NOT-FOUND' !== $now, "$id: byte-identical to the recorded old path" );
}
$check( $has( $current['cart_change'], 'data-count-pop="change"' ) && $has( $current['cart_load'], 'data-count-pop="load-and-change"' ) && $has( $current['cart_bool'], 'data-count-pop="load-and-change"' ), 'the recorded cart outputs carry the legacy attribute\'s mode (the comparison is not vacuous)' );

// The new paths: a layer on the part takes over, so the output DIFFERS from the old path.
$model_cart = $harness_render( 'sgs/cart', array( 'displayMode' => 'link', 'countPopAnimation' => 'load-and-change', 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'badge' => array( 'entrance' => array( 'base' => $pop ) ) ) ) ) );
$check( $has( $model_cart, 'data-count-pop="change"' ) && ! $has( $model_cart, 'data-count-pop="load-and-change"' ) && $model_cart !== $golden['cart_load'], 'cart on the model: the layer\'s state decides the mode (count-changed is change), the legacy attribute is ignored, and the output differs from the old path' );
$model_cart_loaded = $harness_render( 'sgs/cart', array( 'displayMode' => 'link', 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'badge' => array( 'entrance' => array( 'base' => array_merge( $pop, array( 'state' => 'count-loaded' ) ) ) ) ) ) ) );
$check( $has( $model_cart_loaded, 'data-count-pop="load-and-change"' ), 'cart on the model: count-loaded is load-and-change' );
$model_item = $harness_render( 'sgs/accordion-item', array( 'title' => 'Q' ), array( 'sgs/accordionIconRotation' => 45, 'sgs/accordionMotion' => array( 'v' => 1, 'elements' => array( 'turning-icon' => array( 'entrance' => array( 'base' => $turn ) ) ) ) ) );
$check( $has( $model_item, 'sgs-accordion-item__icon-open--rotates' ) && ! $has( $model_item, '--sgs-accordion-icon-rotate' ) && $model_item !== $golden['item_rotate_45'], 'accordion item on the model: the single turning icon is printed and the iconRotation variable is not' );
$model_item_zero = $harness_render( 'sgs/accordion-item', array( 'title' => 'Q' ), array( 'sgs/accordionIconRotation' => 0, 'sgs/accordionMotion' => array( 'v' => 1, 'elements' => array( 'turning-icon' => array( 'entrance' => array( 'base' => $turn ) ) ) ) ) );
$check( $has( $model_item_zero, 'sgs-accordion-item__icon-open--rotates' ) && ! $has( $model_item_zero, 'sgs-accordion-item__icon-close' ), 'accordion item on the model: with iconRotation 0 the layer still prints the single turning icon and no cross-fade pair' );
$section = $morph_section( (string) file_get_contents( $blocks_dir . '/nav-bar-menu/render.php' ) );
$model_morph = $run_morph( $section, array( 'burgerMorphDuration' => 900, 'burgerMorphEasing' => 'spring', 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'burger' => array( 'entrance' => array( 'base' => $morph ) ) ) ) ) );
$check( $model_morph === '.uid{--sgs-nbm-burger-morph-duration:var(--wp--custom--duration--medium);--sgs-nbm-burger-morph-easing:var(--wp--custom--easing--default);}', 'burger on the model: the layer\'s tokens replace burgerMorphDuration and burgerMorphEasing (900ms and spring are ignored): ' . $model_morph );
$check( $model_morph !== $run_morph( $section, array( 'burgerMorphDuration' => 900, 'burgerMorphEasing' => 'spring' ) ), 'burger: the same attributes without the layer take the old path (a different output)' );

// 7. No inline style anywhere in the model path.
foreach ( array_merge( $markups, array( $model_cart, $model_cart_loaded, $model_item, $model_item_zero ) ) as $i => $markup ) {
	$check( 0 === preg_match( '/\sstyle\s*=/i', $markup ), "no style attribute in markup $i" );
}

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );
