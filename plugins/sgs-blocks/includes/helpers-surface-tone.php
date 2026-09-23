<?php
/**
 * Surface tone: judges what a painted surface looks like from its layers, top-down (overlay,
 * image, gradient, colour), and returns the `sgs-on-dark` / `sgs-on-light` marker class that lets
 * the shadows inside it follow its tone (helpers-shadow-dark.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-wcag.php';
require_once __DIR__ . '/helpers-gradient-tone.php';

/**
 * Judge what a composed surface looks like from its painted layers, top-down
 *.
 *
 * Each entry of $layers is one of:
 *   - array('colour' => string, 'opacity' => float 0..1)
 *   - array('gradient' => string, 'opacity' => float 0..1)
 *   - array('image' => true)
 *
 * Walks top-down, accumulating opacity. The first layer that brings the
 * accumulated opacity to >= 0.5 decides the result:
 *   - colour: tone of that colour (sgs_colour_background_tone()'s rule). An
 *     8-digit hex / rgba() alpha multiplies the layer's own opacity.
 *     `transparent` or empty: skipped, contributes 0 (does not decide, and
 *     the walk continues below it). Anything else unresolvable: the layer IS
 *     the deciding factor but cannot be classified, so the whole call
 *     returns ''.
 *   - gradient: sgs_gradient_tone() of the (validated) gradient string. An
 *     unresolvable stop: ''.
 *   - image: an image is never sampled. Reaching an image layer without a
 *     decisive overlay above it: ''. Nothing below an image is examined —
 *     the image is assumed opaque.
 *   - Nothing ever reaches 0.5 accumulated opacity: ''.
 *
 * @param array<int, array<string, mixed>> $layers Top-down painted layers.
 * @return string 'dark', 'light', or ''.
 */
function sgs_surface_tone( array $layers ): string {
	$accumulated = 0.0;

	foreach ( $layers as $layer ) {
		if ( ! is_array( $layer ) ) {
			continue;
		}

		$layer_opacity = isset( $layer['opacity'] ) && is_numeric( $layer['opacity'] )
			? max( 0.0, min( 1.0, (float) $layer['opacity'] ) )
			: 1.0;

		if ( array_key_exists( 'colour', $layer ) ) {
			$raw   = trim( (string) $layer['colour'] );
			$lower = strtolower( $raw );
			if ( '' === $raw || 'transparent' === $lower ) {
				continue; // Contributes 0 — the walk continues below it.
			}

			$parsed = sgs_colour_resolve_hex_alpha( $raw );
			if ( '' === $parsed['hex'] ) {
				return ''; // Unresolvable colour is the deciding factor.
			}

			$accumulated += max( 0.0, min( 1.0, $layer_opacity * $parsed['alpha'] ) );
			if ( $accumulated >= 0.5 ) {
				$luminance = sgs_wcag_relative_luminance( $parsed['hex'] );
				if ( $luminance < 0 ) {
					return '';
				}
				return sgs_wcag_white_wins_for_luminance( $luminance ) ? 'dark' : 'light';
			}
			continue;
		}

		if ( array_key_exists( 'gradient', $layer ) ) {
			$raw = trim( (string) $layer['gradient'] );
			if ( '' === $raw ) {
				continue; // Contributes 0.
			}

			$accumulated += $layer_opacity;
			if ( $accumulated >= 0.5 ) {
				$tone = sgs_gradient_tone( $raw );
				return '' === $tone ? '' : $tone;
			}
			continue;
		}

		if ( ! empty( $layer['image'] ) ) {
			// No overlay above this point reached 0.5 (we would already have
			// returned): the image is unanalysed and blocks everything below it.
			return '';
		}

		// An unknown layer shape: skip rather than guess.
	}

	return '';
}

/**
 * The `sgs-on-dark` / `sgs-on-light` marker class for a composed surface, enqueuing the dark-shadow stylesheet when the surface is dark.
 *
 * @param array<int, array<string, mixed>> $layers Top-down painted layers (see sgs_surface_tone()).
 * @return string 'sgs-on-dark', 'sgs-on-light', or ''.
 */
function sgs_surface_tone_class( array $layers ): string {
	$tone = sgs_surface_tone( $layers );

	if ( 'dark' === $tone ) {
		if ( function_exists( 'sgs_shadow_dark_enqueue' ) ) {
			sgs_shadow_dark_enqueue();
		}
		return 'sgs-on-dark';
	}

	if ( 'light' === $tone ) {
		return 'sgs-on-light';
	}

	return '';
}
