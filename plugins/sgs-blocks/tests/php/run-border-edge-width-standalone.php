<?php
/**
 * Standalone test: `sgs_border_edge_width()`, the border width a self-ringing element hands focus.css as
 * `--sgs-focus-edge` so its inset focus ring sits inside its own border (a ring the colour of the border vanished
 * into it on the Shop's product cards).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-border-edge-width-standalone.php
 * Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ . '/' );
function add_action() {}
function add_filter() {}
function __( $text ) { return $text; }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function wp_json_encode( $v ) { return json_encode( $v ); }
function wp_get_global_settings() { return array(); }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }

require dirname( __DIR__, 2 ) . '/includes/render-helpers.php';

$failures = 0;
function ok( bool $cond, string $label, string $detail = '' ): void {
	global $failures;
	if ( ! $cond ) { ++$failures; }
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . ( ! $cond && '' !== $detail ? "  => {$detail}" : '' ) . "\n";
}

$box = static function ( $t, $r = null, $b = null, $l = null ) { return array( 'top' => $t, 'right' => $r ?? $t, 'bottom' => $b ?? $t, 'left' => $l ?? $t ); };

ok( '2px' === sgs_border_edge_width( $box( '2px' ), 'solid' ), 'one width on every side gives that length' );
ok( '2px' === sgs_border_edge_width( $box( '2px' ), '' ), 'no chosen style still paints solid, so the width counts' );
ok( '' === sgs_border_edge_width( $box( '2px' ), 'none' ), 'style none gives no edge' );
ok( '' === sgs_border_edge_width( null, 'solid' ), 'no width gives no edge' );
ok( '' === sgs_border_edge_width( $box( '0px' ), 'solid' ), 'a zero width gives no edge' );
ok( '3px' === sgs_border_edge_width( $box( '3px', '0px', '0px', '0px' ), 'solid' ), 'one painted side gives its width, zero sides ignored' );
ok( 'max(1px,4px)' === sgs_border_edge_width( $box( '1px', '4px', '1px', '1px' ), 'solid' ), 'different sides give the widest' );
ok( 'max(2px,5px)' === sgs_border_edge_width( array( 'desktop' => $box( '2px' ), 'mobile' => $box( '5px' ) ), 'solid' ), 'per-device widths count every device' );
ok( '2px' === sgs_border_edge_width( array( 'desktop' => $box( '2px' ), 'tablet' => $box( '2px' ) ), 'solid' ), 'equal per-device widths collapse to one length' );

echo $failures ? "\n{$failures} failure(s)\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
