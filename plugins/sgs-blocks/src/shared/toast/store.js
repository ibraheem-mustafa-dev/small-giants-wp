/**
 * SGS Toast — shared frontend store (`store('sgs/toast')`).
 *
 * The ONE transient feedback surface. Every add-to-bag surface
 * (`sgs/product-card`'s card + `sgs/buybox`'s form, `sgs/choice-flow`'s
 * terminal footer) reports its outcome through this store instead of
 * painting its own inline status strip.
 *
 * Importing this module REGISTERS the store. Consumers `import` it by
 * relative path; @wordpress/scripts bundles a copy into each consuming view
 * module, so `store( 'sgs/toast', … )` runs once per bundle. That is SAFE:
 * the Interactivity runtime dedupes by the `sgs/toast` namespace and MERGES
 * repeat registrations, so every bundle ends up holding the SAME merged
 * state proxy. No webpack.config.js entry and no wp_register_script_module()
 * call are needed — and a shared module registered that way would have three
 * registration points with no gate over them.
 *
 * EVERY piece of state lives in `state` for that reason. A module-scope
 * variable is per-bundle, so two blocks importing this file would each get
 * their own copy and the two would disagree about what is showing and when
 * it closes. That includes the auto-close timer handle: a close from one
 * bundle must be able to clear a timer started by another.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC API CONTRACT — consumers code against THIS.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Namespace:  store( 'sgs/toast' )
 *
 * Imperative API (call from any view module after a cart request settles):
 *   actions.showSuccess( message )  — success colours, auto-closes after 5s.
 *   actions.showError( message )    — error colours, STAYS until closed.
 *   actions.close()                 — close it now.
 *
 * Directive-bound API (wired by includes/class-sgs-toast.php's markup):
 *   actions.pointerIn / pointerOut  — mouseenter / mouseleave.
 *   actions.focusIn   / focusOut    — focusin / focusout.
 *   state.isVisible, isSuccess, isError, isAnimated,
 *   state.isNotSuccess, isNotError, isHidden, isActionHidden, message.
 *
 * The region itself is server-rendered at `wp_footer`. It is never created
 * from JS: Interactivity directives on a node injected after the runtime has
 * booted are not picked up, and the failure is silent.
 *
 * @package SGS\Blocks
 */

import { store } from '@wordpress/interactivity';
import { prefersReducedMotion } from '../effects/motion-utils.js';

/** Auto-close delay for a success toast, in milliseconds. */
const AUTO_CLOSE_MS = 5000;

/**
 * Where the toast lives when no dialog is open, so it can be put back.
 *
 * @type {?HTMLElement}
 */
let toastHome = null;

/**
 * Move the toast into the open modal dialog, or back out again.
 *
 * A dialog opened with `showModal()` is painted in the browser's TOP LAYER,
 * which sits above every z-index on the page — the toast already asks for
 * `z-index: 100000` and still rendered behind the lens pop-up, so no CSS value
 * can fix this. The only way for the toast to be both SEEN and USED over a
 * modal is to be inside it: a modal dialog also makes everything outside
 * itself inert, so a toast merely promoted into the top layer beside the
 * dialog would be visible with a dead "View bag" button.
 *
 * The toast is server-rendered once at `wp_footer` and never recreated, so it
 * is moved rather than cloned — Interactivity directives on a node injected
 * after the runtime has booted are not picked up, and that failure is silent.
 *
 * Called BEFORE the message is set, so the live region is already in its final
 * position when its text changes; moving a live region at the same moment as
 * its content can lose the announcement.
 */
function hostToast() {
	const toast = document.querySelector( '.sgs-toast' );
	if ( ! toast ) {
		return;
	}

	const open = [ ...document.querySelectorAll( 'dialog[open]' ) ].filter( ( d ) => {
		// `:modal` is what distinguishes showModal() from show(); only the
		// former takes the top layer. Older engines that do not know the
		// selector throw, and there the open dialog is the best guess.
		try {
			return d.matches( ':modal' );
		} catch {
			return true;
		}
	} );
	const dialog = open[ open.length - 1 ] || null;

	if ( dialog ) {
		if ( toast.parentElement !== dialog ) {
			if ( ! toastHome ) {
				toastHome = toast.parentElement;
			}
			dialog.appendChild( toast );
			// `close` does not bubble, so the way back is registered on the
			// dialog that actually holds it, once.
			dialog.addEventListener( 'close', hostToast, { once: true } );
		}
		return;
	}

	if ( toastHome && toast.parentElement !== toastHome ) {
		toastHome.appendChild( toast );
	}
}

const { state, actions } = store( 'sgs/toast', {
	state: {
		/** '' | 'success' | 'error' — '' means nothing has been shown yet. */
		variant: '',
		/** The message sentence, without any repeat suffix. */
		baseMessage: '',
		/** How many times the CURRENT success message has been repeated. */
		repeat: 1,
		/** setTimeout handle for the auto-close, or 0 when no timer is armed. */
		timer: 0,
		/** Epoch ms at which the armed timer will fire, or 0. */
		deadline: 0,
		/** Milliseconds left on a paused timer, or 0 when not paused. */
		paused: 0,
		/** True while the pointer is over the toast. */
		hovering: false,
		/** True while focus is inside the toast. */
		focused: false,
		/** Resolved once: the visitor asked for reduced motion. */
		reduceMotion: prefersReducedMotion(),

		/**
		 * The announced sentence. Repeat adds of the SAME message carry a
		 * count so the second add is a real, distinguishable announcement
		 * rather than a silent no-change on an aria-atomic region.
		 *
		 * @return {string} Message text.
		 */
		get message() {
			if ( ! state.baseMessage ) {
				return '';
			}
			return state.repeat > 1
				? `${ state.baseMessage } (×${ state.repeat })`
				: state.baseMessage;
		},

		/** @return {boolean} True while a toast is on screen. */
		get isVisible() {
			return '' !== state.variant;
		},

		/** @return {boolean} True for the success variant. */
		get isSuccess() {
			return 'success' === state.variant;
		},

		/** @return {boolean} True for the error variant. */
		get isError() {
			return 'error' === state.variant;
		},

		/**
		 * Entrance/exit motion is allowed. JS-side half of the
		 * reduced-motion contract; assets/toast/toast.css carries the
		 * `@media (prefers-reduced-motion: reduce)` half, so the preference
		 * is honoured even before this module evaluates.
		 *
		 * @return {boolean} True when the toast may animate.
		 */
		get isAnimated() {
			return ! state.reduceMotion;
		},

		/** @return {boolean} Hide the success icon. */
		get isNotSuccess() {
			return ! state.isSuccess;
		},

		/** @return {boolean} Hide the error icon. */
		get isNotError() {
			return ! state.isError;
		},

		/**
		 * Hide the close button while no toast is showing, so a keyboard
		 * user can never tab into an invisible surface. `hidden` (not
		 * `opacity`) because it must leave the tab order AND the
		 * accessibility tree — unlike the message paragraph, which stays
		 * present so it can announce.
		 *
		 * @return {boolean} True when nothing is showing.
		 */
		get isHidden() {
			return ! state.isVisible;
		},

		/**
		 * "View bag" is hidden while nothing is showing, and on an error —
		 * the item did NOT reach the bag, so offering to view it would be
		 * misleading.
		 *
		 * @return {boolean} True when the action must not be reachable.
		 */
		get isActionHidden() {
			return ! state.isVisible || state.isError;
		},
	},

	actions: {
		/**
		 * Show a success toast. Auto-closes after 5s.
		 *
		 * Rapid repeat adds REPLACE rather than queue or stack: one region,
		 * one message, timer reset, and a repeat count when the sentence is
		 * unchanged. Replacing is the keyboard-safe choice — the region is
		 * server-rendered once and only its text and attributes change, so a
		 * user who has tabbed to "View bag" or the close button keeps focus
		 * on that exact node through any number of further adds. A queue
		 * would have to tear the controls down and rebuild them, taking
		 * focus with them, and a stack would grow a second focusable region
		 * underneath the user's cursor. Nothing ever moves focus INTO the
		 * toast either.
		 *
		 * @param {string} message Sentence to announce.
		 */
		showSuccess( message ) {
			const text = String( message || '' );
			if ( ! text ) {
				return;
			}

			hostToast();

			if ( 'success' === state.variant && state.baseMessage === text ) {
				state.repeat += 1;
			} else {
				state.repeat = 1;
				state.baseMessage = text;
			}

			state.variant = 'success';
			arm( AUTO_CLOSE_MS );
		},

		/**
		 * Show an error toast. STAYS until the visitor closes it — an error
		 * the visitor missed is an error they cannot act on.
		 *
		 * @param {string} message Sentence to announce.
		 */
		showError( message ) {
			const text = String( message || '' );
			if ( ! text ) {
				return;
			}

			hostToast();

			disarm();
			state.paused = 0;
			state.repeat = 1;
			state.baseMessage = text;
			state.variant = 'error';
		},

		/**
		 * Close the toast and clear its message.
		 *
		 * Clearing `baseMessage` empties the live region rather than leaving
		 * a stale sentence behind an invisible wrapper — a screen-reader
		 * user navigating by element would otherwise still find it.
		 */
		close() {
			disarm();
			state.paused = 0;
			state.variant = '';
			state.baseMessage = '';
			state.repeat = 1;

			// A closed toast is pointer-events:none, so no mouseleave can
			// ever fire from it — leaving `hovering` true would pause the
			// NEXT toast forever. `focused` is reset for the same reason:
			// closing from the close button moves focus off a [hidden]
			// element without a focusout the wrapper can see.
			state.hovering = false;
			state.focused = false;
		},

		/** Pointer entered the toast — hold the auto-close. */
		pointerIn() {
			state.hovering = true;
			holdOrRelease();
		},

		/** Pointer left the toast — resume the auto-close. */
		pointerOut() {
			state.hovering = false;
			holdOrRelease();
		},

		/** Focus moved into the toast — hold the auto-close. */
		focusIn() {
			state.focused = true;
			holdOrRelease();
		},

		/** Focus left the toast — resume the auto-close. */
		focusOut() {
			state.focused = false;
			holdOrRelease();
		},
	},
} );

/**
 * Start (or restart) the auto-close timer.
 *
 * An error never gets a timer. A toast under the pointer or holding focus is
 * armed as "paused with the full delay left", so it starts counting the
 * moment the visitor leaves it rather than closing out from under them.
 *
 * @param {number} ms Milliseconds until close.
 */
function arm( ms ) {
	disarm();

	if ( state.hovering || state.focused ) {
		state.paused = ms;
		return;
	}

	state.paused = 0;
	state.deadline = Date.now() + ms;
	state.timer = window.setTimeout( () => {
		state.timer = 0;
		state.deadline = 0;
		actions.close();
	}, ms );
}

/**
 * Cancel any armed timer. Safe to call when none is armed, and safe to call
 * from a different bundle than the one that armed it — the handle lives in
 * the shared `state`, not in module scope.
 */
function disarm() {
	if ( state.timer ) {
		window.clearTimeout( state.timer );
	}
	state.timer = 0;
	state.deadline = 0;
}

/**
 * Apply the combined hover + focus hold.
 *
 * Both conditions pause, and the timer only resumes once BOTH have cleared,
 * so a visitor who tabs into a hovered toast and then moves the mouse away
 * does not lose the remaining time. The remaining delay is preserved across
 * the pause instead of restarting at 5s.
 */
function holdOrRelease() {
	const held = state.hovering || state.focused;

	if ( held ) {
		if ( state.timer ) {
			state.paused = Math.max( 0, state.deadline - Date.now() );
			disarm();
		}
		return;
	}

	if ( state.isSuccess && state.paused > 0 ) {
		const remaining = state.paused;
		state.paused = 0;
		arm( remaining );
	}
}

/**
 * The store's actions, re-exported for imperative consumers.
 *
 * A view module that settles a cart request outside a directive calls
 * `toastActions.showSuccess( … )` / `.showError( … )`. Re-exporting the
 * object `store()` already returned is deliberate: calling `store()` a
 * second time in the consumer would be a second registration point for the
 * same namespace, and this module is meant to be the only one.
 */
export { actions as toastActions };
