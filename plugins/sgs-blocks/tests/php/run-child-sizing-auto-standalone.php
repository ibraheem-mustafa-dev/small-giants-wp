<?php
/**
 * Standalone runner: sgsChildWidth 'auto' under sgsChildSizing 'fixed' is the block's natural size that never shrinks
 * (`includes/child-sizing.php::child_sizing_tier_width` and `child_sizing_declarations`).
 *
 * MUST FAIL WITHOUT 'auto': before it, 'auto' went through sgs_css_single_length_value(), came back '', and 'fixed'
 * wrote nothing, so a fluid non-shrinking item (a logo with a clamp() height) had no value.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-child-sizing-auto-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
function add_filter( ...$args ) {
	return true;
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';
require_once dirname( __DIR__, 2 ) . '/includes/child-sizing.php';

use function SGS\Blocks\child_sizing_tier_width;
use function SGS\Blocks\child_sizing_declarations;

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$check( 'auto' === child_sizing_tier_width( 'fixed', 'auto' ), "MUST FAIL WITHOUT 'auto': fixed + auto resolves to auto" );
$decls = child_sizing_declarations( 'fixed', child_sizing_tier_width( 'fixed', 'auto' ), true );
$check( false !== strpos( $decls, 'flex:0 0 auto;' ) && false !== strpos( $decls, 'width:auto;' ) && false === strpos( $decls, 'max-width:100%' ), "MUST FAIL WITHOUT 'auto': fixed + auto writes flex:0 0 auto and width:auto with no cap (got: $decls)" );
$px = child_sizing_declarations( 'fixed', child_sizing_tier_width( 'fixed', '32px' ), true );
$check( false !== strpos( $px, 'width:32px;' ) && false !== strpos( $px, 'max-width:none;' ) && false === strpos( $px, 'max-width:100%' ), "MUST FAIL ON max-width:100%: fixed + a px width prints max-width:none, as the draft's flex item has (got: $px)" );
$check( false !== strpos( $px, 'flex:0 0 auto;' ), 'negative control: the fixed px width still does not shrink or grow' );
$check( false === strpos( child_sizing_declarations( 'fit', '', false ), 'max-width' ), 'negative control: fit with no fixed tier prints no max-width' );
$check( '120px' === child_sizing_tier_width( 'fixed', '120px' ), 'a length still passes through' );
$check( '' === child_sizing_tier_width( 'fixed', 'auto;color:red' ), 'an unsafe value is refused' );
$check( '' === child_sizing_tier_width( 'fill', 'auto' ), 'only fixed reads the width' );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
