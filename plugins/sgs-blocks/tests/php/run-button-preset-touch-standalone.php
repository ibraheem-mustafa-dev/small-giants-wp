<?php
/**
 * sgs_button_preset_css(): the hover lift is a guarded (touch-aware) rule; the hover colours stay unguarded.
 *
 * Run: php tests/php/run-button-preset-touch-standalone.php [path-to-helpers-button-preset.php]
 */
define( 'ABSPATH', __DIR__ );
require dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require $argv[1] ?? dirname( __DIR__, 2 ) . '/includes/helpers-button-preset.php';

$fail = 0;
function ok( bool $cond, string $msg ): void {
	global $fail;
	echo ( $cond ? 'PASS ' : 'FAIL ' ) . $msg . PHP_EOL;
	$fail += $cond ? 0 : 1;
}

$css = sgs_button_preset_css( '.x .b', 'primary' );
ok( false !== strpos( $css, SGS_HOVER_NOT_TOUCH . ' .x .b:hover{transform:var(--wp--custom--button-presets--primary--hover-lift,translateY(-3px))' ), 'the lift prints under the touch guard' );
ok( false !== strpos( $css, '.x .b:hover{background:var(--wp--custom--button-presets--primary--hover-background' ), 'the hover colours print unguarded' );
ok( false === strpos( $css, '.x .b:hover{background:var(--wp--custom--button-presets--primary--hover-background,var(--wp--custom--button-presets--primary--background));color:var(--wp--custom--button-presets--primary--hover-text,var(--wp--custom--button-presets--primary--text));border-color:var(--wp--custom--button-presets--primary--hover-border,var(--wp--custom--button-presets--primary--border,transparent));transform' ), 'no unguarded rule carries the lift' );
$lift_only = sgs_button_preset_css( '.y', 'secondary', false, false );
ok( false !== strpos( $lift_only, SGS_HOVER_NOT_TOUCH . ' .y:hover{transform:' ) && false === strpos( $lift_only, '.y:hover{background' ), 'lift-only mode prints only the guarded lift' );
ok( false !== strpos( $css, '@media (prefers-reduced-motion: reduce){' ), 'reduced motion still removes the lift' );

echo $fail ? "$fail FAILED" . PHP_EOL : 'ALL PASSED' . PHP_EOL;
exit( $fail ? 1 : 0 );
