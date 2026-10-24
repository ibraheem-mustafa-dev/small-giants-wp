<?php
/**
 * Standalone test: a part with a hover state keeps the transition entries its block stylesheet holds (Track R r3-trans, item 1).
 *
 * The emitter's scoped `transition` list replaces the stylesheet's own, so a button with a hover state lost `transform`,
 * `translate` and `opacity` from `.sgs-button`'s list and its lift and press snapped. `Sgs_Motion_Base_Transitions`
 * names, per block and part, the entries the stylesheet holds; the emitter appends them to its list.
 *
 * Runs the REAL `Sgs_Motion_Emitter::emit()` against the real schema. The negative controls: a block with no row emits
 * no extra entry, and a part with no hover state emits no `transition` at all (nothing to replace the stylesheet's).
 * The table is held to the real `src/blocks/button/style.css`: every entry it names appears in `.sgs-button`'s own list,
 * word for word.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-motion-base-transitions-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
define( 'SGS_BLOCKS_VERSION', 'test' );

/** The theme's `settings.custom`, as WordPress merges it (the real theme.json; no client snapshot here). */
function wp_get_global_settings( $path = array() ) {
	$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
	$custom = $theme['settings']['custom'] ?? array();
	return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

use SGS\Blocks\Motion\Sgs_Motion_Base_Transitions as Base;
use SGS\Blocks\Motion\Sgs_Motion_Emitter as Emitter;

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

/** The property of each entry of the first `transition:` list in a CSS string. */
$properties = static function ( string $css ): array {
	if ( ! preg_match( '/transition:\s*([^;}]*)/', $css, $m ) ) {
		return array();
	}
	$out = array();
	foreach ( preg_split( '/,\s*(?=--|[a-z-]+\s)/', $m[1] ) as $entry ) {
		$out[] = strtok( trim( $entry ), ' ' );
	}
	return $out;
};

$state = array( 'values' => array( 'scale' => 1.04 ) );
$hover = array( 'hover' => array( 'state' => $state ) );

$button = Emitter::emit( $hover, '.sgs-m-test', array( 'block' => 'sgs/button', 'target' => 'root' ) );
$props  = $properties( $button['css'] );
foreach ( array( 'transform', 'translate', 'opacity' ) as $prop ) {
	$check( in_array( $prop, $props, true ), "a button with a hover state keeps its $prop transition (list: " . implode( ', ', $props ) . ')' );
}
foreach ( array( 'color', 'background-color', 'border-color', 'box-shadow' ) as $prop ) {
	$check( in_array( $prop, $props, true ), "the emitter's own $prop paint entry is still there" );
}
$check( 1 === count( array_keys( $props, 'transform', true ) ), 'transform is listed once' );

$other = Emitter::emit( $hover, '.sgs-m-test', array( 'block' => 'sgs/not-in-the-table', 'target' => 'root' ) );
$check( ! in_array( 'translate', $properties( $other['css'] ), true ), 'negative control: a block with no row gets no extra entry' );

$part = Emitter::emit( $hover, '.sgs-m-test', array( 'block' => 'sgs/button', 'target' => 'icon' ) );
$check( ! in_array( 'translate', $properties( $part['css'] ), true ), 'negative control: a part the block has no row for gets no extra entry' );

$none = Emitter::emit( array(), '.sgs-m-test', array( 'block' => 'sgs/button', 'target' => 'root' ) );
$check( ! str_contains( $none['css'], 'transition' ), 'negative control: no hover state, no scoped transition to replace the stylesheet' );

// A property the hover state already writes through a motion channel is not eased a second time.
$lift = Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ), '.sgs-m-test', array( 'block' => 'sgs/button', 'target' => 'root' ) );
$lp   = $properties( $lift['css'] );
$check( ! in_array( 'translate', $lp, true ), 'a hover lift (translateY) leaves translate to the owner properties (list: ' . implode( ', ', $lp ) . ')' );
$check( in_array( 'transform', $lp, true ) && in_array( 'opacity', $lp, true ), 'the lift still keeps the stylesheet transform and opacity entries' );
$fade = Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => array( 'opacity' => 0.8 ) ) ) ), '.sgs-m-test', array( 'block' => 'sgs/button', 'target' => 'root' ) );
$fp   = $properties( $fade['css'] );
$check( ! in_array( 'opacity', $fp, true ) && in_array( 'translate', $fp, true ), 'a hover opacity leaves opacity to the owner property and keeps translate (list: ' . implode( ', ', $fp ) . ')' );
$check( array( 'transform', 'opacity' ) === array_map( static fn( $e ) => strtok( $e, ' ' ), Base::entries( 'sgs/button', 'root', array( 'translate' ) ) ), 'entries() drops exactly the channels it is given' );

// Every block the generator finds is covered, not only the button.
$modal = Emitter::emit( $hover, '.sgs-m-test', array( 'block' => 'sgs/modal', 'target' => 'dialog' ) );
$check( in_array( 'opacity', $properties( $modal['css'] ), true ) && in_array( 'transform', $properties( $modal['css'] ), true ), 'sgs/modal dialog keeps the stylesheet opacity and transform entries' );
$card = Emitter::emit( $hover, '.sgs-m-test', array( 'block' => 'sgs/post-grid', 'target' => 'card' ) );
$check( in_array( 'transform', $properties( $card['css'] ), true ), 'sgs/post-grid card keeps its stylesheet transform entry' );

// The table is held to the stylesheet it describes.
$css = (string) preg_replace( '/\s+/', ' ', (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/button/style.css' ) );
foreach ( Base::entries( 'sgs/button', 'root' ) as $entry ) {
	$check( str_contains( $css, $entry ), 'style.css holds the table entry word for word: ' . substr( $entry, 0, 40 ) );
}
$check( array() === Base::entries( 'sgs/button', 'nowhere' ), 'entries() is empty for an unlisted part' );

// A state that sets the movement duration and easing times the kept entries too (Indus header buttons: `transform 0.2s`).
$entry_of = static function ( string $css, string $prop ): string {
	preg_match( '/transition:\s*([^;}]*)/', $css, $m );
	$depth = 0;
	$cur   = '';
	$list  = array();
	foreach ( str_split( $m[1] ?? '' ) as $ch ) {
		$depth += '(' === $ch ? 1 : ( ')' === $ch ? -1 : 0 );
		if ( ',' === $ch && 0 === $depth ) {
			$list[] = trim( $cur );
			$cur    = '';
			continue;
		}
		$cur .= $ch;
	}
	$list[] = trim( $cur );
	foreach ( $list as $e ) {
		if ( 0 === strpos( $e, $prop . ' ' ) ) {
			return $e;
		}
	}
	return '';
};
$ctx     = array( 'block' => 'sgs/button', 'target' => 'root' );
$timed   = Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'duration' => 200, 'easing' => 'ease' ) ) ) ), '.sgs-m-test', $ctx );
$opacity = $entry_of( $timed['css'], 'opacity' );
$check( str_contains( $opacity, '200ms' ) && ! str_contains( $opacity, '0.18s' ), "MUST FAIL ON OLD CODE: the kept opacity entry takes the state's 200ms, not the stylesheet's 0.18s (got: $opacity)" );
$check( 1 === preg_match( '/ ease$/', $opacity ) && ! str_contains( $opacity, '--sgs-btn-transition-easing' ), "MUST FAIL ON OLD CODE: the kept opacity entry takes the state's ease (got: $opacity)" );
$bezier    = Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'duration' => 250, 'easing' => 'cubic-bezier(0.2, 0.8, 0.2, 1)' ) ) ) ), '.sgs-m-test', $ctx );
$b_opacity = $entry_of( $bezier['css'], 'opacity' );
$check( str_contains( $b_opacity, '250ms' ) && str_contains( $b_opacity, 'cubic-bezier(0.2, 0.8, 0.2, 1)' ), "MUST FAIL ON OLD CODE: a cubic-bezier easing stays one token on the kept entry (got: $b_opacity)" );
$only_duration = Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04, 'duration' => 300 ) ) ) ), '.sgs-m-test', $ctx );
$od            = $entry_of( $only_duration['css'], 'opacity' );
$check( str_contains( $od, '300ms' ) && str_contains( $od, '--sgs-btn-transition-easing' ), "a state with a duration only keeps the stylesheet's easing (got: $od)" );
$untimed = Emitter::emit( $hover, '.sgs-m-test', $ctx );
$ut      = $entry_of( $untimed['css'], 'opacity' );
$check( str_contains( $ut, '0.18s' ) && str_contains( $ut, '--sgs-btn-transition-easing' ), "negative control: a state that sets no movement timing keeps the stylesheet's timing (got: $ut)" );
$check( array( 'opacity 1s linear' ) === Base::retime( array( 'opacity 1s linear' ), array() ), 'negative control: retime() with nothing set returns the entries unchanged' );
$check( array( 'opacity 2s var( --x )' ) === Base::retime( array( 'opacity var( --a ) var( --x )' ), array( 'duration' => '2s' ) ), 'retime() splits outside parentheses and replaces only what is set' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
