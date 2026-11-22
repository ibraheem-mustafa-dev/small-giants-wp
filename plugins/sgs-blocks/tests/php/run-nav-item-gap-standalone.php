<?php
/**
 * Standalone runner: `sgs/nav-drawer-menu`'s `itemGap` prints `gap` on the link row per device, and prints nothing when
 * unset (`includes/nav-menu-item-padding-css.php::sgs_nav_item_padding_css`).
 *
 * MUST FAIL WITHOUT itemGap: before it, a draft drawer whose plain link rows carry a gap between the label and a trailing
 * arrow had no setting to write.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-nav-item-gap-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
function add_filter( ...$args ) {
	return true;
}
function apply_filters( $tag, $value, ...$args ) {
	return $value;
}
function esc_attr( $s ) {
	return htmlspecialchars( (string) $s, ENT_QUOTES );
}
$inc = dirname( __DIR__, 2 ) . '/includes/';
require_once $inc . 'class-sgs-breakpoints.php';
require_once $inc . 'helpers-css-safety.php';
require_once $inc . 'helpers-responsive.php';
require_once $inc . 'nav-menu-item-padding-css.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$sel   = '.u1';
$bem   = 'sgs-nav-drawer-menu';
$link  = '.u1 .sgs-nav-drawer-menu__link';
$unset = sgs_nav_item_padding_css( $sel, $bem, array() );
$check( false === strpos( $unset, 'gap' ), 'negative control: unset prints no gap' );
$empty = sgs_nav_item_padding_css( $sel, $bem, array( 'itemGap' => array() ) );
$check( false === strpos( $empty, 'gap' ), 'negative control: an empty itemGap prints no gap' );

$one = sgs_nav_item_padding_css( $sel, $bem, array( 'itemGap' => array( 'desktop' => '12px' ) ) );
$check( false !== strpos( $one, $link . '{gap:12px' ), "MUST FAIL WITHOUT itemGap: a desktop gap prints on the link row (got: $one)" );
$two = sgs_nav_item_padding_css( $sel, $bem, array( 'itemGap' => array( 'desktop' => '12px', 'mobile' => '6px 10px' ) ) );
$check( false !== strpos( $two, '(max-width:767.98px)' ) && false !== strpos( $two, 'gap:6px 10px' ), "a phone value (a row and column pair) prints inside the phone query (got: $two)" );
$bad = sgs_nav_item_padding_css( $sel, $bem, array( 'itemGap' => array( 'desktop' => '12px;color:red' ) ) );
$check( false === strpos( $bad, 'color:red' ), 'an unsafe value is refused' );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
