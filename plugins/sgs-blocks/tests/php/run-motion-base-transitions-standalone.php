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

// The table is held to the stylesheet it describes.
$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/button/style.css' );
foreach ( Base::entries( 'sgs/button', 'root' ) as $entry ) {
	$check( str_contains( $css, $entry ), 'style.css holds the table entry word for word: ' . substr( $entry, 0, 40 ) );
}
$check( array() === Base::entries( 'sgs/button', 'nowhere' ), 'entries() is empty for an unlisted part' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
