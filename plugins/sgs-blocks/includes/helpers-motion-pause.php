<?php
/**
 * Shared pause / play button for content that moves on its own (WCAG 2.2.2 Pause, Stop, Hide).
 *
 * Every SGS block whose content moves automatically (a marquee, an autoplaying carousel, a
 * rotating message) prints this one button and wires it with the shared runtime
 * `src/shared/motion-pause/index.js` (`initMotionPause()`), which also pauses the motion while
 * the region is hovered, pressed or holds keyboard focus. The markup:
 *
 *   <button type="button" class="sgs-motion-pause sgs-motion-pause--{placement} {block}__pause"
 *           aria-pressed="false" aria-label="{label}" data-sgs-motion-pause hidden>
 *     <svg class="sgs-motion-pause__icon sgs-motion-pause__icon--pause">…</svg>
 *     <svg class="sgs-motion-pause__icon sgs-motion-pause__icon--play">…</svg>
 *   </button>
 *
 * One accessible name (a toggle button keeps its name); `aria-pressed="true"` says the motion
 * is paused, and the stylesheet swaps the pause icon for the play icon from that state. The
 * button is rendered `hidden`; the runtime un-hides it only while the motion actually runs, so
 * no visitor meets a control that does nothing (no JavaScript, reduced motion, nothing
 * overflowing).
 *
 * The base look (44px target, visible focus ring, icon swap, placement) lives in
 * `assets/css/motion-pause.css`, enqueued on demand when a button renders and always in the
 * editor. Its colours sit at zero specificity, so a block's own `{block}__pause` rule (or the
 * selector list it shares with its arrows) paints the button with the block's existing colour
 * controls.
 *
 * Placements:
 *   overlay-end  over the end edge of the region, vertically centred (a marquee row).
 *   inline       in the flow, beside the block's other controls (arrows, dots).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_motion_pause_placements' ) ) {
	/**
	 * The button placements, the first being the default.
	 *
	 * @return string[]
	 */
	function sgs_motion_pause_placements(): array {
		return array( 'overlay-end', 'inline' );
	}
}

if ( ! function_exists( 'sgs_motion_pause_button' ) ) {
	/**
	 * The pause / play button markup. Enqueues the shared stylesheet.
	 *
	 * @param array<string, mixed> $args {
	 *     The button's settings.
	 *
	 *     @type string $block     The block's root class (BEM block name), e.g. 'sgs-trust-bar';
	 *                             the button also carries `{block}__pause`.
	 *     @type string $label     Accessible name, already translated, e.g. __( 'Pause scrolling' ).
	 *     @type string $placement One of sgs_motion_pause_placements(); unknown values fall back to the first.
	 * }
	 * @return string The escaped button markup.
	 */
	function sgs_motion_pause_button( array $args ): string {
		$block     = sanitize_html_class( (string) ( $args['block'] ?? '' ) );
		$label     = (string) ( $args['label'] ?? '' );
		$placement = (string) ( $args['placement'] ?? '' );
		if ( ! in_array( $placement, sgs_motion_pause_placements(), true ) ) {
			$placement = sgs_motion_pause_placements()[0];
		}
		if ( '' === $label ) {
			$label = __( 'Pause animation', 'sgs-blocks' );
		}

		$classes = array( 'sgs-motion-pause', 'sgs-motion-pause--' . $placement );
		if ( '' !== $block ) {
			$classes[] = $block . '__pause';
		}
		if ( 'overlay-end' === $placement ) {
			// The marquee clips beyond its own height, so the ring sits inside the button.
			$classes[] = 'sgs-focus--inset';
		}

		sgs_motion_pause_enqueue_style();

		return '<button type="button" class="' . esc_attr( implode( ' ', $classes ) ) . '"'
			. ' aria-pressed="false" aria-label="' . esc_attr( $label ) . '" data-sgs-motion-pause hidden>'
			. '<svg class="sgs-motion-pause__icon sgs-motion-pause__icon--pause" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>'
			. '<svg class="sgs-motion-pause__icon sgs-motion-pause__icon--play" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
			. '</button>';
	}
}

if ( ! function_exists( 'sgs_motion_pause_enqueue_style' ) ) {
	/**
	 * Enqueue the shared stylesheet. A block theme renders the content before the head assets
	 * print, so enqueueing from a render still lands in the head.
	 *
	 * @return void
	 */
	function sgs_motion_pause_enqueue_style(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}
		wp_enqueue_style(
			'sgs-motion-pause',
			plugins_url( 'assets/css/motion-pause.css', SGS_BLOCKS_PATH . 'sgs-blocks.php' ),
			array(),
			defined( 'SGS_BLOCKS_VERSION' ) ? SGS_BLOCKS_VERSION : false
		);
	}
}

if ( ! function_exists( 'sgs_motion_pause_editor_assets' ) ) {
	/**
	 * Editor: the canvas preview is a server render, which never runs the page's enqueue.
	 *
	 * @return void
	 */
	function sgs_motion_pause_editor_assets(): void {
		if ( is_admin() ) {
			sgs_motion_pause_enqueue_style();
		}
	}
	if ( function_exists( 'add_action' ) ) {
		add_action( 'enqueue_block_assets', 'sgs_motion_pause_editor_assets' );
	}
}
