/**
 * Loop control wiring for `@sgs/fx-lottie` (Spec 38A FR-38A-37, FR-38A-52): a looping Lottie, one with the pause button
 * switched on, or one with a server-rendered pause button beside it is registered with the shared loop control
 * (`@sgs/loop-control`). The control pauses it off screen, while focus is inside its block (always on, WCAG 2.2.2) and
 * from the pause button; this module pauses and plays the player from `onPausedChange`.
 *
 * @package
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).
import { registerLoop } from '@sgs/loop-control';
import { isLayer } from './lottie-config.js';

/**
 * Play, unless the trigger no longer wants it or the loop control holds the animation paused.
 *
 * @param {Object} binding The element's binding (`fx-lottie.js`).
 * @return {void}
 */
export function playIfAllowed( binding ) {
	if ( ! binding.player || ! binding.active ) {
		return;
	}
	if ( binding.loopCtl && binding.loopCtl.isPaused() ) {
		return;
	}
	binding.player.play();
}

/**
 * @param {Element} el A `sgs_render_lottie()` span.
 * @return {Element|null} The server-rendered pause button beside it, if any.
 */
function serverPauseButton( el ) {
	const next = el.nextElementSibling;
	if ( next && next.matches( '.sgs-lottie__pause' ) ) {
		return next;
	}
	return el.parentElement
		? el.parentElement.querySelector( '.sgs-lottie__pause' )
		: null;
}

/**
 * @param {Object} binding The element's binding (`fx-lottie.js`).
 * @return {void}
 */
export function registerWithLoopControl( binding ) {
	const { el, config, controller } = binding;
	const button = isLayer( el ) ? null : serverPauseButton( el );

	if (
		'scroll' === config.trigger ||
		! ( config.loop || config.pauseControl || button )
	) {
		return;
	}

	binding.loopCtl = registerLoop( el, {
		pauseControl: config.pauseControl,
		onPausedChange: ( paused ) => {
			if ( ! binding.player ) {
				return;
			}
			if ( paused ) {
				binding.player.pause();
			} else {
				playIfAllowed( binding );
			}
		},
	} );

	if ( button ) {
		button.addEventListener(
			'click',
			() => {
				const paused = ! binding.loopCtl.isPaused();
				if ( paused ) {
					binding.loopCtl.pause();
				} else {
					binding.loopCtl.play();
				}
				button.setAttribute(
					'aria-pressed',
					paused ? 'true' : 'false'
				);
			},
			{ signal: controller.signal }
		);
	}
}
