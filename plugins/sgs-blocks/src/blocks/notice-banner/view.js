/**
 * SGS Notice Banner — Frontend Interactivity.
 *
 * Only loaded when the block registers viewScriptModule. Two independent
 * jobs share the ONE 'sgs/notice-banner' store/namespace (render.php merges
 * both contexts onto the same root when a banner is both):
 *
 *  1. Dismissal for announcement bars (displayMode='announcement',
 *     dismissible=true) — unchanged from before U-15.
 *  2. U-15 self-changing messages
 *     (`.claude/reports/2026-09-26-u15-notice-message-design.md` §3.3):
 *     rotate/random cycling between two or more sgs/notice-message children.
 *
 * Storage strategy (dismissal only):
 *  - session  → sessionStorage (cleared when the tab/session ends)
 *  - permanent → localStorage with a 365-day expiry timestamp
 *
 * Pre-paint flash prevention: render.php emits a tiny inline <script> that
 * checks storage BEFORE the first paint and sets display:none on the wrapper.
 * This module then syncs the isDismissed context flag on init so Interactivity
 * keeps the element hidden reactively.
 *
 * MEMORY GOTCHA (wp-interactivity-data-wp-on-rejects-colon-event-names):
 * close/pause/arrow buttons are all in the SSR markup so data-wp-on--click
 * binds normally. No custom event names with colons used here.
 *
 * U-15 message rotation is deliberately plain DOM manipulation (classList),
 * not a per-item data-wp-context — each sgs/notice-message child is its own
 * independently-rendered block with no index of its own to bind against, and
 * Spec 38 §1's motion tiers call for vanilla JS by default. The messages
 * wrapper and its children are queried once on init and kept as a closure
 * over the root element, matching the rest of this module's no-framework
 * approach.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const PERMANENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 365 days.

// Root element -> live message-rotation state (one entry per banner on the
// page). Keyed by the root DOM node rather than stored on ctx, because the
// timer/listener handles themselves are not JSON-serialisable context data.
const messageState = new WeakMap();

/**
 * Find the interactive root for a message-rotation control (pause/prev/next)
 * given the element the action's directive is bound to.
 *
 * @param {Element} el A descendant of the banner's root element.
 * @return {Element|null} The `[data-wp-interactive]` root, or null.
 */
function findRoot( el ) {
	return el ? el.closest( '[data-wp-interactive="sgs/notice-banner"]' ) : null;
}

/**
 * Apply the paused/playing state: recompute effective pause, set aria-live,
 * and stop/allow the interval tick to advance.
 *
 * @param {Object} state The message-rotation state for one banner.
 */
function applyPausedState( state ) {
	const ctx = state.ctx;
	const paused = !! ( ctx.pausedByButton || ctx.pausedByHover );
	ctx.isPaused = paused;
	if ( state.messagesEl ) {
		// WAI carousel pattern: silent while auto-advancing, announced once
		// paused (by the button, an arrow, or hover/focus) or after a manual
		// arrow move, so a screen reader is not interrupted every tick.
		state.messagesEl.setAttribute( 'aria-live', paused ? 'polite' : 'off' );
	}
}

/**
 * Move to a message by absolute index, updating the `.is-active` class on
 * the real DOM children (never a directive — see the module docblock).
 *
 * @param {Object} state The message-rotation state for one banner.
 * @param {number} index Absolute index to activate (wrapped to range).
 */
function setActiveMessage( state, index ) {
	const count = state.messageEls.length;
	if ( ! count ) {
		return;
	}
	const wrapped = ( ( index % count ) + count ) % count;
	state.messageEls.forEach( ( el, i ) => {
		el.classList.toggle( 'is-active', i === wrapped );
	} );
	state.ctx.activeIndex = wrapped;
}

/**
 * Advance the active message by a relative step (rotate's auto-timer, or an
 * arrow click).
 *
 * @param {Object} state The message-rotation state for one banner.
 * @param {number} step  +1 (next) or -1 (previous).
 */
function stepMessage( state, step ) {
	setActiveMessage( state, state.ctx.activeIndex + step );
}

store( 'sgs/notice-banner', {
	actions: {
		/**
		 * Dismiss the announcement bar.
		 *
		 * Hides the bar reactively via context.isDismissed and writes
		 * the dismiss flag to sessionStorage or localStorage.
		 */
		dismiss() {
			const ctx = getContext();
			ctx.isDismissed = true;

			const { storageKey, dismissBehaviour } = ctx;
			if ( ! storageKey ) {
				return;
			}

			if ( 'session' === dismissBehaviour ) {
				try {
					sessionStorage.setItem( storageKey, '1' );
				} catch ( e ) {
					// Storage unavailable (private browsing quota hit, etc.) — fail silently.
				}
			} else {
				// permanent: localStorage with an expiry timestamp.
				try {
					localStorage.setItem(
						storageKey,
						JSON.stringify( { dismissed: true, expiry: Date.now() + PERMANENT_EXPIRY_MS } )
					);
				} catch ( e ) {
					// Storage unavailable — fail silently.
				}
			}
		},

		/**
		 * U-15: toggle the rotate-mode pause button. Leaving the button
		 * pressed keeps the banner paused even after the pointer/focus
		 * leaves (design §3.3: "leaving resumes it unless the button is
		 * pressed").
		 */
		togglePause() {
			const ctx = getContext();
			ctx.pausedByButton = ! ctx.pausedByButton;
			const root = findRoot( getElement()?.ref );
			const state = root && messageState.get( root );
			if ( state ) {
				applyPausedState( state );
			}
		},

		/** U-15: previous-message arrow — also pauses auto-rotation. */
		prevMessage() {
			const ctx = getContext();
			ctx.pausedByButton = true;
			const root = findRoot( getElement()?.ref );
			const state = root && messageState.get( root );
			if ( state ) {
				stepMessage( state, -1 );
				applyPausedState( state );
			}
		},

		/** U-15: next-message arrow — also pauses auto-rotation. */
		nextMessage() {
			const ctx = getContext();
			ctx.pausedByButton = true;
			const root = findRoot( getElement()?.ref );
			const state = root && messageState.get( root );
			if ( state ) {
				stepMessage( state, 1 );
				applyPausedState( state );
			}
		},
	},

	callbacks: {
		/**
		 * Initialise on mount.
		 *
		 * Syncs isDismissed with whatever the pre-paint script already did
		 * (or catches cases where the inline script was blocked / hydration
		 * runs after paint). Also clears expired permanent entries. Then, for
		 * an enhanced (rotate/random) banner, sets up message rotation.
		 */
		init() {
			const ctx = getContext();

			if ( ctx.storageKey ) {
				const { storageKey, dismissBehaviour } = ctx;
				if ( 'session' === dismissBehaviour ) {
					try {
						if ( sessionStorage.getItem( storageKey ) ) {
							ctx.isDismissed = true;
						}
					} catch ( e ) {
						// Storage unavailable.
					}
				} else {
					try {
						const raw = localStorage.getItem( storageKey );
						if ( raw ) {
							const data = JSON.parse( raw );
							if ( data.expiry && data.expiry > Date.now() ) {
								ctx.isDismissed = true;
							} else {
								// Entry expired — remove it so the bar shows again.
								localStorage.removeItem( storageKey );
							}
						}
					} catch ( e ) {
						// Storage unavailable or invalid JSON — fail silently.
					}
				}
			}

			if ( ! ctx.messageMode ) {
				return;
			}

			const root = getElement()?.ref;
			const messagesEl = root && root.querySelector( '.sgs-notice-banner__messages' );
			if ( ! root || ! messagesEl ) {
				return;
			}
			const messageEls = Array.from( messagesEl.querySelectorAll( ':scope > .sgs-notice-message' ) );
			if ( messageEls.length < 2 ) {
				return;
			}

			const state = { ctx, root, messagesEl, messageEls };
			messageState.set( root, state );

			// Flip the class-bound flag — CSS only stacks/hides messages once
			// `.is-enhanced` is present (design §3.3), so a page with no JS
			// keeps every message showing, stacked.
			ctx.isEnhanced = true;

			if ( 'random' === ctx.messageMode ) {
				// Client-side (never server-side), so the page cache cannot
				// freeze one message for every visitor.
				setActiveMessage( state, Math.floor( Math.random() * messageEls.length ) );
				return;
			}

			// rotate.
			setActiveMessage( state, 0 );

			const prefersReducedMotion =
				typeof window.matchMedia === 'function' &&
				window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
			// Rotation itself is not suppressed under reduced motion (it is a
			// content change, not motion) — only the CSS transition is
			// instant; style.css handles that via the same media query.
			void prefersReducedMotion;

			const intervalMs = Math.max( 2, Number( ctx.rotateInterval ) || 5 ) * 1000;
			const tick = () => {
				if ( ctx.isPaused || document.hidden ) {
					return;
				}
				stepMessage( state, 1 );
			};
			setInterval( tick, intervalMs );

			document.addEventListener( 'visibilitychange', () => {
				// No explicit action needed — tick() already re-checks
				// document.hidden on its next fire; this listener exists so a
				// long-hidden tab does not silently accumulate missed ticks
				// (setInterval still fires while hidden in most browsers, so
				// the check-on-tick above is sufficient and this listener is
				// a documented no-op kept for clarity/observability).
			} );

			if ( ctx.pauseOnHover ) {
				const setHoverPaused = ( paused ) => {
					ctx.pausedByHover = paused;
					applyPausedState( state );
				};
				root.addEventListener( 'pointerenter', () => setHoverPaused( true ) );
				root.addEventListener( 'pointerleave', () => setHoverPaused( false ) );
				root.addEventListener( 'focusin', () => setHoverPaused( true ) );
				root.addEventListener( 'focusout', ( event ) => {
					if ( ! root.contains( event.relatedTarget ) ) {
						setHoverPaused( false );
					}
				} );
			}
		},
	},
} );
