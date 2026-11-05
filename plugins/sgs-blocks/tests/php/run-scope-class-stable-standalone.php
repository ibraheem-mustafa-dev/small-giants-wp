<?php
/**
 * Standalone runner: a minted scope class is a hash of the CSS rules it scopes, so it is the same for the same block
 * on every request (`includes/helpers-scoped-instance-vars.php::sgs_scope_class_for_root`).
 *
 * A "request" here is a fresh PHP process, so no state can carry over. Run: php plugins/sgs-blocks/tests/php/run-scope-class-stable-standalone.php
 *
 * @package SGS\Blocks
 */

if ( isset( $argv[1] ) && 'child' === $argv[1] ) {
	define( 'ABSPATH', __DIR__ );
	function add_filter( ...$args ) {
		return true;
	}
	function wp_strip_all_tags( $text ) {
		return strip_tags( (string) $text );
	}
	function wp_rand( $a = 0, $b = 0 ) {
		return mt_rand( $a, $b );
	}
	class WP_Block_Type_Registry {
		public static function get_instance() {
			return new self();
		}
		public function get_registered( $name ) {
			return (object) array( 'supports' => array( 'sgs' => array( 'enabledExtensions' => array( 'childSizing' ) ) ) );
		}
	}
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';
	require_once dirname( __DIR__, 2 ) . '/includes/child-sizing.php';

	$render = static function ( string $width ): string {
		return \SGS\Blocks\inject_child_sizing(
			'<div class="wp-block-sgs-x">hi</div>',
			array( 'blockName' => 'sgs/x', 'attrs' => array( 'sgsChildSizing' => array( 'desktop' => 'fixed' ), 'sgsChildWidth' => array( 'desktop' => $width ) ) )
		);
	};
	$first   = $render( '200px' );
	$second  = $render( '200px' );
	$other   = $render( '300px' );
	$pick    = static fn( string $h ): string => preg_match( '/sgs-child-sizing-[0-9a-f]{8}/', $h, $m ) ? $m[0] : '';
	echo json_encode( array( $pick( $first ), $pick( $second ), $pick( $other ), $first === $second ) );
	exit;
}

$runs = array();
foreach ( array( 1, 2 ) as $i ) {
	$runs[] = json_decode( (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' child' ), true );
}
$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};
$check( '' !== $runs[0][0], 'a scope class is minted' );
$check( $runs[0][0] === $runs[0][1] && true === $runs[0][3], 'the same block twice in one request gives the same class and HTML' );
$check( $runs[0][0] === $runs[1][0], 'the same block in a second request gives the same class' );
$check( $runs[0][0] !== $runs[0][2], 'different rules give a different class' );
echo "{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
