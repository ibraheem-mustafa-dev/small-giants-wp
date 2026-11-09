<?php
/**
 * Standalone tests: sgs/media clips its frame when its image part has a hover scale above 1
 * (includes/helpers-media-element.php::sgs_media_hover_zoom_clips, ::sgs_media_element_style and
 * includes/class-sgs-media-element.php::requires_box).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-media-hover-zoom-clip-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.Security.EscapeOutput.OutputNotEscaped, Squiz.Commenting

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

require dirname( __DIR__, 2 ) . '/includes/helpers-media-element.php';
require dirname( __DIR__, 2 ) . '/includes/class-sgs-media-element.php';

$fail = 0;
function check( string $label, bool $ok ): void {
	global $fail;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $ok ) {
		++$fail;
	}
}
function with_scale( $scale ): array {
	return array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'media' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => $scale ) ) ) ) ) ) );
}

check( 'scale 1.05 clips', sgs_media_hover_zoom_clips( with_scale( 1.05 ), 'sgs/media' ) );
check( 'scale 1 does not clip', ! sgs_media_hover_zoom_clips( with_scale( 1 ), 'sgs/media' ) );
check( 'scale below 1 does not clip', ! sgs_media_hover_zoom_clips( with_scale( 0.95 ), 'sgs/media' ) );
check( 'no motion does not clip', ! sgs_media_hover_zoom_clips( array(), 'sgs/media' ) );
check( 'a non-numeric scale does not clip', ! sgs_media_hover_zoom_clips( with_scale( 'big' ), 'sgs/media' ) );
check( 'only sgs/media (the hero column keeps its spill)', ! sgs_media_hover_zoom_clips( with_scale( 1.05 ), 'sgs/hero' ) );

$css = sgs_media_element_style( with_scale( 1.1 ), '', 'sgs/media', 'sgs-m-abc', array( 'box-shape' ) );
check( 'the frame rule prints overflow:hidden on the scope class', '.sgs-m-abc{overflow:hidden}' === $css );
check( 'no zoom prints no frame rule', '' === sgs_media_element_style( with_scale( 1 ), '', 'sgs/media', 'sgs-m-abc', array( 'box-shape' ) ) );
check( 'a zoom needs the frame element', SGS_Media_Element::requires_box( with_scale( 1.05 ), '', 'sgs/media', array( 'box-shape' ) ) );
check( 'no zoom, no frame', ! SGS_Media_Element::requires_box( with_scale( 1 ), '', 'sgs/media', array( 'box-shape' ) ) );

echo $fail ? "\n{$fail} FAILED\n" : "\nAll passed\n";
exit( $fail ? 1 : 0 );
