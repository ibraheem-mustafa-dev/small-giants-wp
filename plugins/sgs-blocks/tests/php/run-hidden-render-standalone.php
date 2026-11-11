<?php
/**
 * Standalone tests for includes/media/hidden-render.php: the hidden-render-context guard.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-hidden-render-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.Security.EscapeOutput.OutputNotEscaped, Squiz.Commenting

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

$GLOBALS['sgs_t_filters'] = array();
function add_filter( string $tag, $cb, int $priority = 10, int $args = 1 ): bool {
	$GLOBALS['sgs_t_filters'][ $tag ][] = $cb;
	return true;
}
function apply_filters( string $tag, $value ) {
	return $value;
}

require dirname( __DIR__, 2 ) . '/includes/media/hidden-render.php';

$fail = 0;
function check( string $label, bool $ok ): void {
	global $fail;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $ok ) {
		++$fail;
	}
}
function fire( string $tag, string $block ): void {
	foreach ( $GLOBALS['sgs_t_filters'][ $tag ] ?? array() as $cb ) {
		'pre_render_block' === $tag ? $cb( null, array( 'blockName' => $block ) ) : $cb( '', array( 'blockName' => $block ) );
	}
}

// 1. Hidden context: the hidden blocks open and close it; others do not.
check( 'not hidden at start', ! sgs_in_hidden_render_context() );
fire( 'pre_render_block', 'sgs/hero' );
check( 'hero does not open it', ! sgs_in_hidden_render_context() );
fire( 'pre_render_block', 'sgs/mega-panel' );
check( 'mega-panel opens it', sgs_in_hidden_render_context() );
fire( 'pre_render_block', 'sgs/nav-drawer' );
fire( 'render_block', 'sgs/nav-drawer' );
check( 'nested block leaves it open', sgs_in_hidden_render_context() );

fire( 'render_block', 'sgs/mega-panel' );
check( 'closing the outer block closes it', ! sgs_in_hidden_render_context() );
fire( 'render_block', 'sgs/mega-panel' );
check( 'extra close never goes negative', ! sgs_in_hidden_render_context() );

echo $fail ? "\n{$fail} FAILED\n" : "\nAll passed\n";
exit( $fail ? 1 : 0 );
