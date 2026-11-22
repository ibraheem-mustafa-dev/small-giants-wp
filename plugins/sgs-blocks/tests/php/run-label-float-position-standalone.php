<?php
/**
 * Standalone runner: `sgs/label` opts into the shared float-position extension (`supports.sgs.enabledExtensions`),
 * so a label can be placed over its parent (absolute, with per-device edge offsets) through the one shared
 * `includes/float-position.php::inject_float_position` filter. Unset prints nothing.
 *
 * MUST FAIL WITHOUT THE OPT-IN: before it, `float_position_enabled( 'sgs/label' )` was false and the filter returned
 * the label's markup untouched, so a draft badge laid 10px in from a picture's corner had no setting to write.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-label-float-position-standalone.php
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
function wp_strip_all_tags( $s ) {
	return strip_tags( (string) $s );
}
function esc_attr( $s ) {
	return htmlspecialchars( (string) $s, ENT_QUOTES );
}

$root = dirname( __DIR__, 2 );
$json = json_decode( (string) file_get_contents( $root . '/src/blocks/label/block.json' ), true );

class WP_Block_Type_Registry {
	public static $types = array();
	public static function get_instance() {
		return new self();
	}
	public function get_registered( $name ) {
		return self::$types[ $name ] ?? null;
	}
}
WP_Block_Type_Registry::$types['sgs/label'] = (object) array( 'supports' => $json['supports'] );
WP_Block_Type_Registry::$types['sgs/plain'] = (object) array( 'supports' => array( 'sgs' => array( 'enabledExtensions' => array() ) ) );

$inc = $root . '/includes/';
require_once $inc . 'class-sgs-breakpoints.php';
require_once $inc . 'helpers-css-safety.php';
require_once $inc . 'helpers-responsive.php';
require_once $inc . 'helpers-scoped-instance-vars.php';
require_once $inc . 'render-helpers.php';
require_once $inc . 'float-position.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$html  = '<span class="sgs-label sgs-label--x">New</span>';
$attrs = array(
	'sgsPosition'  => array( 'desktop' => 'absolute' ),
	'sgsInsetTop'  => array( 'desktop' => '10px' ),
	'sgsInsetLeft' => array( 'desktop' => '10px' ),
);

$check( \SGS\Blocks\float_position_enabled( 'sgs/label' ), 'MUST FAIL WITHOUT THE OPT-IN: sgs/label lists floatPosition in enabledExtensions' );
$out = \SGS\Blocks\inject_float_position( $html, array( 'blockName' => 'sgs/label', 'attrs' => $attrs ) );
$check( false !== strpos( $out, 'position:absolute;top:10px;left:10px;' ), "a label set absolute with top and left prints them (got: $out)" );
$check( false !== strpos( $out, 'sgs-float-position' ), 'the label root gains the scope class' );

$unset = \SGS\Blocks\inject_float_position( $html, array( 'blockName' => 'sgs/label', 'attrs' => array() ) );
$check( $unset === $html, 'negative control: an unset label is left untouched' );
$other = \SGS\Blocks\inject_float_position( $html, array( 'blockName' => 'sgs/plain', 'attrs' => $attrs ) );
$check( $other === $html, 'negative control: a block that has not opted in is left untouched' );

$phone = \SGS\Blocks\inject_float_position(
	$html,
	array(
		'blockName' => 'sgs/label',
		'attrs'     => array(
			'sgsPosition' => array( 'desktop' => 'static', 'mobile' => 'absolute' ),
			'sgsInsetTop' => array( 'mobile' => '6px' ),
		),
	)
);
$check( false !== strpos( $phone, '(max-width:767.98px)' ) && false !== strpos( $phone, 'position:absolute;top:6px;' ), "a phone-only float prints inside the phone query (got: $phone)" );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
