/**
 * SGS motion pause: the one pause mechanism for content that moves on its own.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide) asks for "a mechanism for the user to pause" content that
 * starts moving automatically, runs for more than five seconds and sits beside other content.
 * Pausing only while hovered or focused is not that mechanism (W3C Understanding 2.2.2: an
 * animation that resumes as soon as focus or the pointer leaves does not count), so every
 * auto-moving SGS block combines two things through this module:
 *
 *   1. A persistent pause / play button (techniques G4 and G186): the server renders it with
 *      `sgs_motion_pause_button()` (includes/helpers-motion-pause.php), `hidden`, and this
 *      module shows it only while the motion actually runs, so a visitor without JavaScript,
 *      or one whose motion never starts (reduced motion, nothing overflowing), never meets a
 *      dead control. One accessible name; `aria-pressed="true"` means paused. A pause stays
 *      until the button is pressed again, and the block resumes from where it stopped.
 *   2. Temporary pauses while the pointer hovers the region, a finger presses (or taps) it,
 *      or keyboard focus is inside it. Each cause is its own flag, so ending one never resumes
 *      motion another still holds.
 *
 * Pressing play is an explicit choice: it overrides the hover and focus pauses (the button
 * sits inside the region, so pressing it always hovers or focuses the region) until both have
 * ended, after which they apply again.
 *
 * The block owns the motion itself and only hears the effective state through `onChange`:
 * a CSS animation toggles a class whose rule sets `animation-play-state: paused` (no inline
 * style), a timer-driven carousel stops and restarts its interval from the current slide.
 *
 * Loaded by each block's view module (bundled per block, so its state is per block).
 */

/**
 * Wire the pause mechanism to one moving region.
 *
 * @param {HTMLElement} root                  The moving region; hover, touch and focus are read on it.
 * @param {Object}      options
 * @param {Function}    options.onChange      Called with `true` (paused) or `false` (playing) on every change.
 * @param {HTMLElement} [options.button]      The pause button. Default: the region's own `[data-sgs-motion-pause]`.
 * @param {boolean}     [options.hover=true]  Pause while a mouse or pen pointer is over the region.
 * @param {string}      [options.touch]       'press' (default): pause while a finger is down on the region.
 *                                            'toggle': a tap on the region pauses, the next tap resumes.
 *                                            'none': touch alone does not pause.
 * @return {{isPaused: Function, setRunning: Function, pause: Function, play: Function, addFocusRegion: Function, removeFocusRegion: Function, reset: Function}} Controller.
 */
export function initMotionPause( root, options = {} ) {
	const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
	const button = options.button || root.querySelector( '[data-sgs-motion-pause]' );
	const hoverPauses = options.hover !== false;
	const touchMode = [ 'press', 'toggle', 'none' ].includes( options.touch ) ? options.touch : 'press';

	let hovered = false;
	let pressed = false;
	let tapped = false;
	let focused = false;
	let userPaused = false;
	let userPlayed = false;
	let last = null;

	const transient = () => hovered || pressed || tapped || focused;
	const isPaused = () => userPaused || ( ! userPlayed && transient() );

	function sync() {
		const paused = isPaused();
		if ( paused !== last ) {
			last = paused;
			onChange( paused );
		}
	}

	function releasePlay() {
		if ( ! hovered && ! pressed && ! focused ) {
			userPlayed = false;
		}
	}

	function setUserPaused( paused ) {
		userPaused = paused;
		userPlayed = ! paused;
		if ( button ) {
			button.setAttribute( 'aria-pressed', paused ? 'true' : 'false' );
		}
		sync();
	}

	if ( button ) {
		button.addEventListener( 'click', () => setUserPaused( ! userPaused ) );
	}

	const fromButton = ( event ) => !! ( button && event.target instanceof Node && button.contains( event.target ) );

	root.addEventListener( 'pointerenter', ( event ) => {
		if ( event.pointerType === 'touch' ) {
			return;
		}
		if ( hoverPauses ) {
			hovered = true;
			sync();
		}
	} );
	root.addEventListener( 'pointerleave', ( event ) => {
		if ( event.pointerType === 'touch' ) {
			pressed = false;
		} else {
			hovered = false;
		}
		releasePlay();
		sync();
	} );
	root.addEventListener( 'pointerdown', ( event ) => {
		if ( event.pointerType !== 'touch' || fromButton( event ) ) {
			return;
		}
		if ( touchMode === 'press' ) {
			pressed = true;
		} else if ( touchMode === 'toggle' ) {
			tapped = ! tapped;
		}
		sync();
	} );
	root.addEventListener( 'pointerup', ( event ) => {
		if ( event.pointerType === 'touch' && pressed ) {
			pressed = false;
			releasePlay();
			sync();
		}
	} );
	// The focus region is the root plus any element added with `addFocusRegion()` (a pause button placed outside the
	// root); focus moving between them is not leaving it.
	const regions = [ root ];
	// Region -> its [ focusin, focusout ] handlers, so a region can be removed with its listeners.
	const handlers = new Map();
	const inRegion = ( node ) => node instanceof Node && regions.some( ( region ) => region.contains( node ) );
	const listenForFocus = ( region ) => {
		const onIn = () => {
			focused = true;
			sync();
		};
		const onOut = ( event ) => {
			if ( inRegion( event.relatedTarget ) ) {
				return;
			}
			focused = false;
			releasePlay();
			sync();
		};
		region.addEventListener( 'focusin', onIn );
		region.addEventListener( 'focusout', onOut );
		handlers.set( region, [ onIn, onOut ] );
	};
	const removeRegion = ( region ) => {
		const pair = handlers.get( region );
		if ( region === root || ! pair ) {
			return;
		}
		region.removeEventListener( 'focusin', pair[ 0 ] );
		region.removeEventListener( 'focusout', pair[ 1 ] );
		handlers.delete( region );
		regions.splice( regions.indexOf( region ), 1 );
	};
	listenForFocus( root );

	return {
		isPaused,
		/**
		 * Show the button while the motion runs; hide it when nothing moves.
		 *
		 * @param {boolean} running Whether the block's automatic motion is running.
		 */
		setRunning( running ) {
			if ( button ) {
				button.hidden = ! running;
			}
		},
		/** A deliberate pause from another control (an arrow, a dot): held like the button's. */
		pause() {
			setUserPaused( true );
		},
		/** A deliberate play. */
		play() {
			setUserPaused( false );
		},
		/**
		 * Count focus inside another element as focus inside the region.
		 *
		 * @param {HTMLElement} region An element outside the root that belongs to the moving region.
		 */
		addFocusRegion( region ) {
			if ( region instanceof Node && ! inRegion( region ) ) {
				regions.push( region );
				listenForFocus( region );
			}
		},
		/**
		 * Stop counting focus inside an element added with `addFocusRegion()` (a button that has been removed).
		 *
		 * @param {HTMLElement} region The element.
		 */
		removeFocusRegion( region ) {
			removeRegion( region );
			focused = inRegion( document.activeElement );
			sync();
		},
		/**
		 * Back to the state of a fresh controller, for an owner whose motion ended and may start again (the loop
		 * control when a root's last loop is destroyed): no held pause or play, no added regions, and the focus pause
		 * only while focus really is inside the root.
		 */
		reset() {
			regions.slice( 1 ).forEach( removeRegion );
			userPaused = false;
			userPlayed = false;
			hovered = false;
			pressed = false;
			tapped = false;
			focused = inRegion( document.activeElement );
			if ( button ) {
				button.setAttribute( 'aria-pressed', 'false' );
			}
			sync();
		},
	};
}
