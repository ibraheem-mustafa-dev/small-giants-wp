<?php
/**
 * Standalone tests for includes/helpers-media.php: the hidden-render-context guard and sgs_image_loading_attrs().
 *
 * Run: php plugins/sgs-blocks/tests/php/run-image-loading-attrs-standalone.php
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

require dirname( __DIR__, 2 ) . '/includes/helpers-media.php';

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

// 2. A hidden image neither consumes nor increments the priority slot.
check( 'hidden bg index is 0', 0 === sgs_next_background_image_index() );
$hidden = sgs_image_loading_attrs();
check( 'hidden image is lazy', 'lazy' === $hidden['loading'] && 'auto' === $hidden['fetchpriority'] );
fire( 'render_block', 'sgs/mega-panel' );
check( 'closing the outer block closes it', ! sgs_in_hidden_render_context() );
fire( 'render_block', 'sgs/mega-panel' );
check( 'extra close never goes negative', ! sgs_in_hidden_render_context() );

// 3a. An ornament takes no priority slot.
$orn = sgs_image_loading_attrs( false );
check( 'ornament eager but never high', 'eager' === $orn['loading'] && 'auto' === $orn['fetchpriority'] );

// 3. Visible images: first sixteen eager, one high page-wide, the rest lazy.
$out = array();
for ( $i = 0; $i < 18; $i++ ) {
	$out[] = sgs_image_loading_attrs();
}
check( 'ornament counted, so fifteen more eager', 'eager' === $out[0]['loading'] && 'eager' === $out[14]['loading'] );
check( 'sixteenth and later lazy', 'lazy' === $out[15]['loading'] && 'lazy' === $out[17]['loading'] );
$high = count( array_filter( $out, static fn( $a ) => 'high' === $a['fetchpriority'] ) );
check( 'exactly one fetchpriority high', 1 === $high && 'high' === $out[0]['fetchpriority'] );
check( 'a later background image is not first', 1 !== sgs_next_background_image_index() );

echo $fail ? "\n{$fail} FAILED\n" : "\nAll passed\n";
exit( $fail ? 1 : 0 );
