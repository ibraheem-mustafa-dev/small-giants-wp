<?php
/**
 * Standalone runner: a span at one device is bounded to the devices that hold it and never touches `grid-column` at the
 * others (`includes/child-sizing.php::child_sizing_css` and `child_sizing_span_rules`).
 *
 * MUST FAIL ON THE OLD CODE: once any device spanned, every other device printed `grid-column:auto`, so a half form field
 * (its own `grid-column:span 3` in the form's six-track grid) given span on a phone only fell to one track of six at
 * desktop and tablet.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-child-sizing-span-bounds-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
function add_filter( ...$args ) {
	return true;
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/child-sizing.php';

use function SGS\Blocks\child_sizing_css;

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$sel   = '.sgs-child-sizing.s';
$span  = '{grid-column:1/-1;}';
$css   = static function ( array $modes, array $widths = array() ) use ( $sel ): string {
	$norm = static function ( array $o ): array {
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $t ) {
			$out[ $t ] = ( isset( $o[ $t ] ) && '' !== $o[ $t ] ) ? $o[ $t ] : null;
		}
		return $out;
	};
	return child_sizing_css( $sel, $norm( $modes ), $norm( $widths ) );
};

// Span at one device only.
$mobile = $css( array( 'mobile' => 'span' ) );
$check( $mobile === '@media(max-width:767.98px){' . $sel . $span . '}', "MUST FAIL ON OLD CODE: span on a phone only prints one rule bounded to the phone (got: $mobile)" );
$check( false === strpos( $mobile, 'grid-column:auto' ), 'MUST FAIL ON OLD CODE: span on a phone only resets nothing at desktop or tablet' );
$desktop = $css( array( 'desktop' => 'span', 'tablet' => 'fit' ) );
$check( false !== strpos( $desktop, '@media(min-width:1024px){' . $sel . $span . '}' ), "span at desktop only is bounded to desktop (got: $desktop)" );
$check( false === strpos( $desktop, 'grid-column:auto' ), 'span at desktop only prints no reset at tablet' );
$tablet = $css( array( 'desktop' => 'fit', 'tablet' => 'span', 'mobile' => 'fit' ) );
$check( false !== strpos( $tablet, '@media(min-width:768px) and (max-width:1023.98px){' . $sel . $span . '}' ), "span at tablet only is bounded to the tablet range (got: $tablet)" );

// Span at two devices.
$dt = $css( array( 'desktop' => 'span', 'tablet' => 'span', 'mobile' => 'fit' ) );
$check( false !== strpos( $dt, '@media(min-width:768px){' . $sel . $span . '}' ) && false === strpos( $dt, 'grid-column:auto' ), "span at desktop and tablet is one rule from 768px up (got: $dt)" );
$tm = $css( array( 'desktop' => 'fit', 'tablet' => 'span', 'mobile' => 'span' ) );
$check( false !== strpos( $tm, '@media(max-width:1023.98px){' . $sel . $span . '}' ), "span at tablet and phone is one rule up to 1023px (got: $tm)" );
$dm = $css( array( 'desktop' => 'span', 'tablet' => 'fit', 'mobile' => 'span' ) );
$check( false !== strpos( $dm, '@media(min-width:1024px){' . $sel . $span . '}' ) && false !== strpos( $dm, '@media(max-width:767.98px){' . $sel . $span . '}' ), "span at desktop and phone is two rules with tablet left out (got: $dm)" );

// Span at all three: one plain rule, no media query.
$all = $css( array( 'desktop' => 'span' ) );
$check( $all === $sel . $span, "span at desktop with the others inheriting is one plain rule (got: $all)" );
$all3 = $css( array( 'desktop' => 'span', 'tablet' => 'span', 'mobile' => 'span' ) );
$check( $all3 === $sel . $span, "span at all three devices is one plain rule (got: $all3)" );

// Negative controls: the other modes print as before, and nothing set prints nothing.
$fill = $css( array( 'desktop' => 'fill', 'mobile' => 'fit' ) );
$check( false !== strpos( $fill, $sel . '{flex:1 1 0%;min-width:0;}' ) && false !== strpos( $fill, '{flex:0 1 auto;width:fit-content;}' ) && false === strpos( $fill, 'grid-column' ), 'negative control: fill then fit print their flex rules and no grid-column' );
$mixed = $css( array( 'desktop' => 'fill', 'mobile' => 'span' ) );
$check( false !== strpos( $mixed, $sel . '{flex:1 1 0%;min-width:0;}' ) && false !== strpos( $mixed, '@media(max-width:767.98px){' . $sel . $span . '}' ), 'a span beside a fill keeps the fill at the wider devices and spans on the phone' );
$check( '' === $css( array() ), 'negative control: nothing set prints nothing' );
$fixed = $css( array( 'desktop' => 'fixed' ), array( 'desktop' => '200px' ) );
$check( false !== strpos( $fixed, 'width:200px;' ) && false === strpos( $fixed, 'grid-column' ), 'negative control: fixed prints its width and no grid-column' );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
