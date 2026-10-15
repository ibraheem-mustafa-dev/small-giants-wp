<?php
/**
 * Standalone runner for Sgs_Motion_Background_Lottie (Spec 38A FR-38A-52): when a background block's `background`
 * part holds a `lottie` layer, the wrapper prints a holder the player can mount in, with the image inside as poster.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-motion-background-lottie-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped

// phpcs:disable WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

use SGS\Blocks\Motion\Sgs_Motion_Background_Lottie as Holder;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-background-lottie.php';

$pass = 0;
$fail = 0;
$ok   = static function ( bool $cond, string $label ) use ( &$pass, &$fail ): void {
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	$cond ? ++$pass : ++$fail;
};

$layer = static fn( string $part, string $effect ): array => array(
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array(
			$part => array(
				'effects' => array(
					array(
						'id'     => 'x',
						'effect' => $effect,
						'values' => array( 'file' => 4079 ),
					),
				),
			),
		),
	),
);
$ok( Holder::has_layer( $layer( 'background', 'lottie' ) ), 'a lottie layer on the background part needs the holder' );
$ok( ! Holder::has_layer( $layer( 'background', 'ken-burns' ) ), 'a ken-burns layer on the background part keeps the plain image' );
$ok( ! Holder::has_layer( $layer( 'wrapper', 'lottie' ) ), 'a lottie layer on another part prints no holder' );
$ok( ! Holder::has_layer( array() ) && ! Holder::has_layer( array( 'sgsMotion' => array( 'elements' => array( 'background' => array( 'effects' => 'bad' ) ) ) ) ), 'no motion, or an effects value that is not a list: no holder' );

$poster = '<img class="' . Holder::POSTER_CLASS . '" src="a.jpg" alt="" aria-hidden="true" />';
$html   = Holder::holder( $poster );
$ok( 1 === preg_match( '/^<div class="sgs-container__image-bg sgs-container__lottie-bg" aria-hidden="true"><img /', $html ) && str_ends_with( $html, '</div>' ), 'the holder carries the background part class and the old holder class, hidden from assistive technology, around the poster' );
$ok( 1 === substr_count( $html, 'sgs-container__image-bg' ), 'only the holder carries the part class, so the motion renderer stamps the layer on it alone' );
$ok( '<div class="sgs-container__image-bg sgs-container__lottie-bg" aria-hidden="true"></div>' === Holder::holder( '' ), 'with no image the holder is still printed, empty, so the layer has an element' );

$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/fx-lottie.css' );
$ok( 1 === preg_match( '/\.sgs-container__lottie-bg > \.sgs-container__lottie-poster \{[^}]*object-position: inherit;/', $css ), 'fx-lottie.css fills the poster and passes it the holder\'s focal point' );

$wrapper = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php' );
$ok( false !== strpos( $wrapper, 'Sgs_Motion_Background_Lottie::holder( $bg_img_html )' ) && false !== strpos( $wrapper, '$has_bg_lottie_layer ? \\SGS\\Blocks\\Motion\\Sgs_Motion_Background_Lottie::POSTER_CLASS' ), 'the container wrapper prints the holder and builds the image with the poster class when the layer is present' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
