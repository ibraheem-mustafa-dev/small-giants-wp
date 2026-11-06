<?php
/**
 * Standalone runner: a scope class an injector minted is never reused as another injector's scope, so two blocks that
 * share an image-controls class still get their own child-sizing class (`sgs_scope_class_for_root`).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-scope-class-not-shared-standalone.php [helper-file-to-test]
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
require_once $argv[1] ?? dirname( __DIR__, 2 ) . '/includes/helpers-scoped-instance-vars.php';

use function SGS\Blocks\sgs_scope_class_for_root;

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$imgctl_rules = static fn( string $c ): string => '.' . $c . '{--sgs-hover-scale:1.02}';
$imgctl_a     = sgs_scope_class_for_root( '<div class="wp-block-sgs-x">', 'sgs-imgctl', $imgctl_rules );
$imgctl_b     = sgs_scope_class_for_root( '<div class="wp-block-sgs-y">', 'sgs-imgctl', $imgctl_rules );
$check( $imgctl_a === $imgctl_b, 'two blocks with the same image-controls vars share one image-controls class' );

$sizing = static fn( string $w ): callable => static fn( string $c ): string => '.' . $c . '{width:' . $w . '}';
$a      = sgs_scope_class_for_root( '<div class="wp-block-sgs-x ' . $imgctl_a . '">', 'sgs-child-sizing', $sizing( '200px' ) );
$b      = sgs_scope_class_for_root( '<div class="wp-block-sgs-y ' . $imgctl_b . '">', 'sgs-child-sizing', $sizing( '300px' ) );
$check( $a !== $b, 'different child-sizing rules give different child-sizing scopes' );
$check( 0 === strpos( $a, 'sgs-child-sizing-' ), 'the child-sizing scope is its own minted class' );

$uid = sgs_scope_class_for_root( '<div class="sgs-info-box-a1b2c3d4 ' . $imgctl_a . '">', 'sgs-child-sizing', $sizing( '200px' ) );
$check( 'sgs-info-box-a1b2c3d4' === $uid, 'a block\'s own uid class is still reused' );

$rerun = sgs_scope_class_for_root( '<div class="wp-block-sgs-x ' . $imgctl_a . '">', 'sgs-child-sizing', $sizing( '200px' ) );
$check( $rerun === $a, 'the same rules give the same class again' );

echo "{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
