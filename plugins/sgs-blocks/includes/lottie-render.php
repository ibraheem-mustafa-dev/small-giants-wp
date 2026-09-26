<?php
/**
 * `sgs_render_lottie()` — shared Lottie markup emitter (U-17, design §3.2).
 *
 * ONE function, every surface (`sgs/media`, `sgs/hero` split media, the
 * shared wrapper background, `sgs/responsive-logo`) calls it rather than
 * hand-rolling the wrapper markup. No inline `style="…"` (Spec 32): the
 * aspect-ratio box comes from `_sgs_lottie_meta` through the caller's own
 * scoped `<style>` block, never a `style` attribute here.
 *
 * Returns the wrapper markup and the pause control SEPARATELY — the caller
 * decides where the pause button prints (council fix 4: a logo's poster
 * sits inside the home `<a>`, so the pause control must print AFTER that
 * `</a>`, never nested inside it, or the markup is invalid HTML — a link
 * cannot contain interactive content).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Build the `<span class="sgs-lottie">…</span>` wrapper and its pause
 * control for one Lottie attachment.
 *
 * @param int   $attachment_id Lottie JSON attachment ID.
 * @param array $args {
 *    Optional render args.
 *
 *     @type string $poster_html   Pre-rendered poster markup (an <img>/<picture>),
 *                                 shown until the player mounts and always shown
 *                                 under reduced motion. Required for a useful
 *                                 result — an attachment with no poster still
 *                                 renders, but empty, under reduced motion.
 *     @type string $alt           Accessible name. Empty (default) means decorative.
 *     @type bool   $decorative    Force `aria-hidden="true"` regardless of $alt
 *                                 (e.g. inside an already-labelled link).
 *     @type string $trigger       'load' | 'visible' | 'hover' | 'scroll'. Default 'visible'.
 *     @type bool   $loop          Whether the animation loops. Default false.
 *     @type float  $speed         Playback speed, 0.25–3. Default 1.
 *     @type string $extra_class   Extra class(es) on the wrapper span.
 * }
 * @return array{wrapper: string, pause: string} `wrapper` is the `<span>…</span>`
 *                                                markup (poster inside, no pause
 *                                                button); `pause` is the pause
 *                                                `<button>` markup, or '' when
 *                                                not needed — print it wherever
 *                                                the caller's markup allows.
 */
function sgs_render_lottie( int $attachment_id, array $args = array() ): array {
	$defaults = array(
		'poster_html' => '',
		'alt'         => '',
		'decorative'  => false,
		'trigger'     => 'visible',
		'loop'        => false,
		'speed'       => 1.0,
		'extra_class' => '',
	);
	$args     = wp_parse_args( $args, $defaults );

	if ( $attachment_id <= 0 || 'application/json' !== get_post_mime_type( $attachment_id ) ) {
		// Fail closed: not a valid attachment reference. The poster (if any)
		// is still the honest thing to render.
		return array(
			'wrapper' => $args['poster_html'],
			'pause'   => '',
		);
	}

	$meta = get_post_meta( $attachment_id, '_sgs_lottie_meta', true );
	if ( ! is_array( $meta ) || empty( $meta['w'] ) || empty( $meta['h'] ) ) {
		// No valid stored meta — fail closed to the poster only (design §3.2:
		// "an attachment without valid meta renders the poster only").
		return array(
			'wrapper' => $args['poster_html'],
			'pause'   => '',
		);
	}

	$src = wp_get_attachment_url( $attachment_id );
	if ( ! $src ) {
		return array(
			'wrapper' => $args['poster_html'],
			'pause'   => '',
		);
	}

	$trigger = in_array( $args['trigger'], array( 'load', 'visible', 'hover', 'scroll' ), true )
		? $args['trigger']
		: 'visible';
	$speed   = (float) $args['speed'];
	if ( $speed < 0.25 || $speed > 3 ) {
		$speed = 1.0;
	}

	$alt         = (string) $args['alt'];
	$decorative  = (bool) $args['decorative'] || '' === $alt;
	$duration    = isset( $meta['duration'] ) ? (float) $meta['duration'] : 0.0;
	$needs_pause = (bool) $args['loop'] || $duration > 5;

	$classes = trim( 'sgs-lottie ' . (string) $args['extra_class'] );

	$attr_parts = array(
		sprintf( 'class="%s"', esc_attr( $classes ) ),
		'data-sgs-fx="lottie"',
		sprintf( 'data-src="%s"', esc_url( $src ) ),
		sprintf( 'data-trigger="%s"', esc_attr( $trigger ) ),
		sprintf( 'data-loop="%s"', $args['loop'] ? '1' : '0' ),
		sprintf( 'data-speed="%s"', esc_attr( (string) $speed ) ),
	);

	if ( $decorative ) {
		$attr_parts[] = 'aria-hidden="true"';
	} else {
		$attr_parts[] = 'role="img"';
		$attr_parts[] = sprintf( 'aria-label="%s"', esc_attr( $alt ) );
	}

	$wrapper = sprintf(
		'<span %s>%s</span>',
		implode( ' ', $attr_parts ),
		$args['poster_html']
	);

	$pause = '';
	if ( $needs_pause ) {
		$pause = sprintf(
			'<button type="button" class="sgs-lottie__pause" aria-pressed="false" aria-label="%s"><span class="sgs-lottie__pause-icon" aria-hidden="true"></span></button>',
			esc_attr__( 'Pause animation', 'sgs-blocks' )
		);
	}

	return array(
		'wrapper' => $wrapper,
		'pause'   => $pause,
	);
}

/**
 * Aspect-ratio custom-property declarations for a Lottie attachment, for the
 * caller's own scoped `<style>` block (Spec 32 — never an inline `style=`
 * attribute). Emits nothing when the attachment has no valid meta, so the
 * caller's existing fallback sizing is untouched.
 *
 * @param int $attachment_id Lottie JSON attachment ID.
 * @return string[] `--custom-property:value` declarations, no trailing `;`.
 */
function sgs_lottie_aspect_ratio_css( int $attachment_id ): array {
	if ( $attachment_id <= 0 ) {
		return array();
	}
	$meta = get_post_meta( $attachment_id, '_sgs_lottie_meta', true );
	if ( ! is_array( $meta ) || empty( $meta['w'] ) || empty( $meta['h'] ) ) {
		return array();
	}
	$width  = (float) $meta['w'];
	$height = (float) $meta['h'];
	if ( $width <= 0 || $height <= 0 ) {
		return array();
	}
	return array(
		sprintf( '--sgs-lottie-aspect-ratio:%s / %s', sgs_lottie_format_number( $width ), sgs_lottie_format_number( $height ) ),
	);
}

/**
 * Trim a float to its shortest CSS-safe representation (no trailing `.0`).
 *
 * @param float $value Number to format.
 * @return string Formatted number.
 */
function sgs_lottie_format_number( float $value ): string {
	if ( floor( $value ) === $value ) {
		return (string) (int) $value;
	}
	return rtrim( rtrim( sprintf( '%.3f', $value ), '0' ), '.' );
}
