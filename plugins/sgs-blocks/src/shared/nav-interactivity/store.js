/**
 * SGS Navigation — shared frontend interactivity store (`store('sgs/nav')`).
 *
 * FR-36-7: the ONE reusable nav-plumbing utility both nav blocks consume. A
 * UTILITY, not a component — proven by its THREE call-sites (all on the SAME
 * three functions): (1) drawer OPEN, (2) drawer CLOSE, (3) burger TOGGLE. Every
 * surface (`sgs/nav-menu` burger, `sgs/nav-drawer` dialog) drives open/close/
 * focus/`inert`/scroll-lock through this single store.
 *
 * Importing this module REGISTERS the store. Both Wave-2 blocks `import` it via a
 * relative path; @wordpress/scripts bundles a copy into each block's view module,
 * so `store('sgs/nav', …)` runs once per bundle. That is SAFE: the Interactivity
 * runtime dedupes by the `sgs/nav` namespace and MERGES repeat registrations
 * (identical definition → no-op merge). No webpack.config.js change is needed.
 *
 * Progressive enhancement only. Every menu link + top-level item is server-
 * rendered and crawlable with zero JS (FR-36-7 no-JS honesty). The drawer PANEL
 * is the enhancement: with no JS the burger has no handler and the drawer stays
 * closed; the `<details>` submenu fallback still works. "Crawlable without JS" is
 * NOT "every panel opens without JS."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC API CONTRACT — Wave-2 blocks (Steps 6 & 7) code against THIS.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Namespace:  store( 'sgs/nav' )
 *
 * Actions (bind with `data-wp-on--click`):
 *   actions.openDrawer    — open the drawer named by context.drawerRef.
 *   actions.closeDrawer   — close it (× button binds this).
 *   actions.toggleDrawer  — open⇄close (the burger binds this; it is BOTH burger
 *                           and ×, staying live in the header row).
 *
 * State (bind with `data-wp-bind--…`):
 *   state.isOpen          — reactive boolean, per instance (a derived getter that
 *                           reads the caller's context). Bind on the burger:
 *                           `data-wp-bind--aria-expanded="state.isOpen"`.
 *                           (context.isOpen is the underlying source and may be
 *                            bound directly too.)
 *
 * Context (`data-wp-context` on the wrapper that CONTAINS the burger):
 *   {
 *     "isOpen":   false,               // per-instance open flag (reactive)
 *     "drawerRef": "sgs-nav-drawer-…"  // the id of the <dialog> to open
 *   }
 *
 * Required markup conventions (resolved by id/attribute, NOT by directive, so
 * they SURVIVE the D323 body-reparent — a moved node keeps its id/attrs but loses
 * its Interactivity region, hence × + scrim + ESC are wired imperatively here):
 *   • Drawer:  <dialog id="{drawerRef}" data-sgs-nav-drawer> … </dialog>
 *   • Close ×: any element INSIDE the drawer carrying  data-sgs-nav-close
 *              (chrome, rendered by render.php outside the editable InnerBlocks —
 *               FR-36-6 undeletable-by-construction).
 *   • Scrim:   (non-modal fallback only) an element carrying
 *              data-sgs-nav-scrim="{drawerRef}". Under `showModal()` the native
 *              `::backdrop` is the scrim and this element is unused.
 *
 * Example burger markup a consumer emits:
 *   <div data-wp-context='{"isOpen":false,"drawerRef":"sgs-nav-drawer-1"}'>
 *     <button
 *       data-wp-on--click="actions.toggleDrawer"
 *       data-wp-bind--aria-expanded="state.isOpen"
 *       aria-controls="sgs-nav-drawer-1">…</button>
 *   </div>
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Canonical focusable-element selector — MERGED from the two salvage sources
 * (Claim D: they disagreed). Resolution:
 *   • adaptive-nav (view.js:46-47) required `a[href]` + guarded every control
 *     with `:not([disabled])` — CHOSEN as the base (it is the correct one:
 *     it excludes disabled controls and bare hrefless anchors from the tab ring).
 *   • mega-menu (view.js:16-17) used the looser `a, button, input, …` — REJECTED
 *     (it would trap Tab onto disabled controls and non-navigable anchors).
 *   • `summary` ADDED for the drawer's no-JS `<details>` submenu fallback
 *     (FR-36-6 accordion/drill-down) — a deliberate, justified extension.
 */
const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'summary',
	'[tabindex]:not([tabindex="-1"])',
].join( ', ' );

const SCROLL_LOCK_ATTR = 'data-sgs-nav-scroll-y';

// Per-drawer bookkeeping, keyed by the drawer element so multiple drawers on a
// page never cross-talk: { trigger, scrim, frozen, cleanup[] }.
const drawerBookkeeping = new WeakMap();

// Drawers already re-parented to <body> (idempotency for reparentToBody, D323).
const reparented = new WeakSet();

/* ==========================================================================
 * PORTED VERBATIM — hard-won fixes carried across (do NOT re-derive).
 * ========================================================================== */

/**
 * Re-parent the drawer + scrim to <body> on first open (idempotent, D323).
 * Load-bearing: without it the container wrapper's
 * `.sgs-container > :not(.sgs-container__overlay){position:relative}` (0,2,0)
 * beats the drawer's (0,1,0) `position:fixed`, and a transformed/filtered
 * ancestor would convert `fixed` into ancestor-relative positioning. Moving
 * out to <body> removes every such ancestor by construction.
 *
 * Ported from adaptive-nav/view.js:108-117 (`reparentToBody`); parameterised +
 * WeakSet-keyed for reuse across instances.
 *
 * @param {HTMLElement}      dialog The drawer dialog element.
 * @param {HTMLElement|null} scrim  The scrim element (non-modal fallback only).
 */
function reparentToBody( dialog, scrim ) {
	if ( reparented.has( dialog ) ) {
		return;
	}
	if ( scrim ) {
		document.body.appendChild( scrim );
	}
	document.body.appendChild( dialog );
	reparented.add( dialog );
}

/**
 * Lock body scroll behind the open drawer: fixed-position body + scrollY
 * save. iOS Safari ignores `overflow:hidden` on body, which is why the fixed-
 * position technique is used instead of a simple overflow toggle.
 *
 * Ported verbatim from adaptive-nav/view.js:285-305 (`lockScroll`, D340).
 */
function lockScroll() {
	const y = window.scrollY;
	// Fixing the body collapses the document scroll, so the CLASSIC scrollbar
	// (~15px, desktop Windows/Linux) vanishes MID-ANIMATION — the viewport
	// widens by its width and the right-anchored drawer's anchor jumps right
	// partway through the slide-in. The eye reads it as a bounce: the panel
	// overshoots into the page by exactly the scrollbar width, then steps back
	// (Bean's report, D340 — frame capture showed the anchor moving 753→768 at
	// 768px). Forcing the root's scrollbar track to stay while locked keeps the
	// geometry constant; overlay-scrollbar platforms (iOS/Android, width 0)
	// take the no-op branch.
	if ( window.innerWidth - document.documentElement.clientWidth > 0 ) {
		document.documentElement.style.overflowY = 'scroll';
	}
	document.body.setAttribute( SCROLL_LOCK_ATTR, String( y ) );
	document.body.style.position = 'fixed';
	document.body.style.top = `-${ y }px`;
	document.body.style.left = '0';
	document.body.style.right = '0';
	document.body.style.width = '100%';
}

/**
 * Restore body scroll — removes the fixed positioning and restores the saved
 * scroll offset in the SAME synchronous task (avoids the one-frame jump a
 * deferred `scrollTo` would cause).
 *
 * Ported verbatim from adaptive-nav/view.js:312-324 (`unlockScroll`, D340).
 */
function unlockScroll() {
	const stored = document.body.getAttribute( SCROLL_LOCK_ATTR );
	document.body.removeAttribute( SCROLL_LOCK_ATTR );
	document.documentElement.style.overflowY = '';
	document.body.style.position = '';
	document.body.style.top = '';
	document.body.style.left = '';
	document.body.style.right = '';
	document.body.style.width = '';
	if ( stored !== null ) {
		window.scrollTo( 0, parseInt( stored, 10 ) || 0 );
	}
}

/**
 * Freeze all background content EXCEPT the live header row carrying the toggle.
 * Iterates the direct children of <body> (and one level into `.wp-site-blocks`
 * when present), skipping the toggle's ancestor chain, the drawer, the scrim,
 * and `#wpadminbar`. Focus containment is EMERGENT from this: with everything
 * else inert, the browser's own Tab order cycles {live header + drawer} only,
 * so no hand-rolled trap is needed (FR-34-1). The drawer is never an ancestor of
 * a frozen node — it is re-parented to <body> first.
 *
 * Ported verbatim from adaptive-nav/view.js:208-244 (`freezeBackground`). Used on
 * the NON-modal `.show()` fallback path only; a native `showModal()` inerts the
 * background itself.
 *
 * @param {HTMLElement}      toggle The nav toggle; its ancestor chain stays live.
 * @param {HTMLElement}      dialog The drawer dialog (skipped).
 * @param {HTMLElement|null} scrim  The scrim element (skipped).
 * @return {Array<Object>} Touched elements + their prior inert/aria-hidden state.
 */
function freezeBackground( toggle, dialog, scrim ) {
	const frozen = [];
	const adminBar = document.getElementById( 'wpadminbar' );

	const skip = ( el ) =>
		el === dialog ||
		el === scrim ||
		el === adminBar ||
		el.contains( toggle );

	const freezeChildrenOf = ( parent ) => {
		Array.from( parent.children ).forEach( ( el ) => {
			if ( skip( el ) ) {
				return;
			}
			frozen.push( {
				el,
				hadInert: el.hasAttribute( 'inert' ),
				hadAriaHidden: el.hasAttribute( 'aria-hidden' ),
			} );
			el.setAttribute( 'inert', '' );
			el.setAttribute( 'aria-hidden', 'true' );
		} );
	};

	freezeChildrenOf( document.body );

	// The header lives INSIDE `.wp-site-blocks`, so that wrapper is skipped at
	// the body level (it contains the toggle); descend one level to freeze the
	// header's siblings (main/footer) while the header row itself stays live.
	const siteBlocks = document.querySelector( '.wp-site-blocks' );
	if ( siteBlocks ) {
		freezeChildrenOf( siteBlocks );
	}

	return frozen;
}

/**
 * Restore EXACTLY the set frozen on open — removing inert/aria-hidden only from
 * elements this instance added them to (leaving any pre-existing ones intact).
 *
 * Ported verbatim from adaptive-nav/view.js:252-261 (`unfreezeBackground`).
 *
 * @param {Array<Object>} frozen The tracked freeze set from freezeBackground().
 */
function unfreezeBackground( frozen ) {
	frozen.forEach( ( { el, hadInert, hadAriaHidden } ) => {
		if ( ! hadInert ) {
			el.removeAttribute( 'inert' );
		}
		if ( ! hadAriaHidden ) {
			el.removeAttribute( 'aria-hidden' );
		}
	} );
}

/* ==========================================================================
 * MERGED — the focus-trap / keyboard layer (Claim D re-derivation).
 * ========================================================================== */

/**
 * True when the user has asked for reduced motion. Gates every JS-added
 * animation class (the CSS owns the actual transitions; JS only toggles).
 *
 * @return {boolean} Whether `prefers-reduced-motion: reduce` matches.
 */
function prefersReducedMotion() {
	return (
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/**
 * Currently-visible focusable descendants, in DOM order.
 *
 * @param {HTMLElement} container The element to search within.
 * @return {Array<HTMLElement>} Visible focusable elements.
 */
function getFocusable( container ) {
	return Array.from(
		container.querySelectorAll( FOCUSABLE_SELECTOR )
	).filter(
		( el ) =>
			!! (
				el.offsetWidth ||
				el.offsetHeight ||
				el.getClientRects().length
			)
	);
}

/**
 * Move focus to the first focusable element inside the drawer on open; if none
 * exists (all children non-interactive), focus the drawer itself via a
 * temporary `tabindex="-1"`.
 *
 * Ported from adaptive-nav/view.js:270-278 (`focusFirstInDrawer`), generalised.
 *
 * @param {HTMLElement} container The drawer dialog element.
 */
function focusFirstIn( container ) {
	const focusable = container.querySelector( FOCUSABLE_SELECTOR );
	if ( focusable ) {
		focusable.focus();
		return;
	}
	container.setAttribute( 'tabindex', '-1' );
	container.focus();
}

/**
 * ONE canonical Tab-containment handler for the drawer (dialog surface): Tab on
 * the last focusable WRAPS to the first, Shift+Tab on the first wraps to the
 * last. This is the merge resolution of the two sources' Tab disagreement:
 *   • adaptive-nav had NO hand-rolled trap — containment was EMERGENT from the
 *     selective freeze (correct for its non-modal model, but nothing to reuse).
 *   • mega-menu's Tab-handling (view.js:286-314) CLOSED the panel on tab-out —
 *     that is the DISCLOSURE contract (a menu you tab past), NOT a modal drawer
 *     you must stay inside. Reusing it here would let focus escape the drawer.
 * So the drawer gets a proper WRAPPING trap. It is belt-and-braces under a
 * native `showModal()` (which already contains Tab — same wrap outcome) and
 * ESSENTIAL under the `.show()` fallback.
 *
 * @param {HTMLElement}   container The drawer dialog element.
 * @param {KeyboardEvent} event     The keydown event.
 */
function trapTab( container, event ) {
	if ( 'Tab' !== event.key ) {
		return;
	}
	const focusable = getFocusable( container );
	if ( 0 === focusable.length ) {
		event.preventDefault();
		return;
	}
	const first = focusable[ 0 ];
	const last = focusable[ focusable.length - 1 ];
	if ( event.shiftKey && document.activeElement === first ) {
		event.preventDefault();
		last.focus();
	} else if ( ! event.shiftKey && document.activeElement === last ) {
		event.preventDefault();
		first.focus();
	}
}

/* ==========================================================================
 * Internal drawer orchestration (open/close/scrim/ESC skeleton — ported from
 * adaptive-nav/view.js:119-192, restructured around the store's three actions).
 * ========================================================================== */

/**
 * Resolve the drawer element for a context. Resolved by id (NOT a wrapper
 * `.querySelector`) because after the D323 body-reparent the drawer is no longer
 * a descendant of the burger's wrapper — but a moved node keeps its id.
 *
 * @param {Object} ctx The Interactivity context.
 * @return {HTMLElement|null} The drawer, or null on a dangling drawerRef.
 */
function resolveDrawer( ctx ) {
	if ( ctx && ctx.drawerRef ) {
		return document.getElementById( ctx.drawerRef );
	}
	return null;
}

/**
 * Resolve the (optional) real scrim for a drawer id — non-modal fallback only.
 *
 * @param {string} drawerRef The drawer id.
 * @return {HTMLElement|null} The scrim element, or null.
 */
function resolveScrim( drawerRef ) {
	if ( ! drawerRef ) {
		return null;
	}
	return document.querySelector(
		`[data-sgs-nav-scrim="${ drawerRef }"]`
	);
}

/**
 * Close the drawer (shared by closeDrawer, the ×, the scrim, and ESC). All
 * restoration runs in the single `close`-event handler wired in openDrawer, so
 * this only sets exit timing then triggers the native close.
 *
 * @param {HTMLElement}      drawer The drawer dialog element.
 * @param {HTMLElement|null} scrim  The scrim element, if any.
 */
function runClose( drawer, scrim ) {
	if ( ! drawer.open ) {
		return;
	}
	if ( ! prefersReducedMotion() ) {
		// Added BEFORE close() so the CSS transition active at the moment [open]
		// is removed already carries the faster exit timing (250ms in / 200ms
		// out — see style.css `.is-closing`). Skipped under reduced motion:
		// there is no transition to time.
		drawer.classList.add( 'is-closing' );
	}
	if ( scrim ) {
		scrim.classList.remove( 'is-open' );
	}
	drawer.close();
}

/**
 * Open the drawer for the current context. Reparents (D323), locks scroll
 * (D340), opens as a native modal where supported (FR-36-6) or falls back to a
 * non-modal `.show()` with the selective freeze, then wires the ×/scrim/ESC/Tab
 * handlers imperatively (they survive the reparent) and sets `context.isOpen`.
 *
 * @param {Object}      ctx     The Interactivity context (isOpen + drawerRef).
 * @param {HTMLElement} trigger The burger/toggle element (for focus return).
 */
function openDrawerFor( ctx, trigger ) {
	if ( ctx.isOpen ) {
		return;
	}
	const drawer = resolveDrawer( ctx );
	// Dangling drawerRef → no-op (the editor Notice is the block's job, FR-36-9a).
	// Missing non-modal `<dialog>` support → no-op too: the toggle simply does
	// nothing and the server-rendered links are unaffected (progressive enhancement).
	if (
		! drawer ||
		( typeof drawer.showModal !== 'function' &&
			typeof drawer.show !== 'function' )
	) {
		return;
	}

	const scrim = resolveScrim( ctx.drawerRef );
	const bookkeeping = { trigger, scrim, frozen: [], cleanup: [] };

	reparentToBody( drawer, scrim );
	lockScroll();

	if ( typeof drawer.showModal === 'function' ) {
		// FR-36-6 default: full-screen modal in the top layer — survives a
		// transformed header ancestor; native inert background + native ESC +
		// native `::backdrop`. (Body-scroll-lock is NOT native — kept above.)
		drawer.showModal();
	} else {
		// Fallback: non-modal `.show()` (the Spec-34 model). A non-modal dialog
		// does NOT inert the background or auto-close on ESC, so the selective
		// freeze gives EMERGENT containment and ESC is hand-rolled below.
		drawer.show();
		bookkeeping.frozen = freezeBackground( trigger, drawer, scrim );
		const onEsc = ( e ) => {
			if ( 'Escape' === e.key && drawer.open ) {
				runClose( drawer, scrim );
			}
		};
		document.addEventListener( 'keydown', onEsc );
		bookkeeping.cleanup.push( () =>
			document.removeEventListener( 'keydown', onEsc )
		);
	}

	// Belt-and-braces Tab-trap (essential under `.show()`, harmless under modal).
	const onTab = ( e ) => trapTab( drawer, e );
	drawer.addEventListener( 'keydown', onTab );
	bookkeeping.cleanup.push( () => drawer.removeEventListener( 'keydown', onTab ) );

	// × close — chrome INSIDE the drawer (FR-36-6). Wired imperatively because a
	// `data-wp-on--click` directive de-hydrates once the drawer leaves its region.
	const closeEl = drawer.querySelector( '[data-sgs-nav-close]' );
	if ( closeEl ) {
		const onCloseClick = () => runClose( drawer, scrim );
		closeEl.addEventListener( 'click', onCloseClick );
		bookkeeping.cleanup.push( () =>
			closeEl.removeEventListener( 'click', onCloseClick )
		);
	}

	// Real scrim (fallback only) — its own click listener; the `e.target === dialog`
	// (`::backdrop`) idiom silently stops working with `.show()`.
	if ( scrim ) {
		scrim.classList.add( 'is-open' );
		const onScrimClick = () => runClose( drawer, scrim );
		scrim.addEventListener( 'click', onScrimClick );
		bookkeeping.cleanup.push( () =>
			scrim.removeEventListener( 'click', onScrimClick )
		);
	}

	// The native `close` event fires however the dialog closed (close(), ESC,
	// backdrop) — ONE place to restore aria state + scroll + freeze + focus.
	// Focus return is EXPLICIT (Safari does not focus buttons on click).
	const onNativeClose = () => {
		drawer.classList.remove( 'is-closing' );
		if ( scrim ) {
			scrim.classList.remove( 'is-open' );
		}
		unlockScroll();
		unfreezeBackground( bookkeeping.frozen );
		bookkeeping.cleanup.forEach( ( fn ) => fn() );
		drawerBookkeeping.delete( drawer );
		ctx.isOpen = false;
		if ( trigger ) {
			trigger.focus();
		}
	};
	drawer.addEventListener( 'close', onNativeClose, { once: true } );
	bookkeeping.cleanup.push( () =>
		drawer.removeEventListener( 'close', onNativeClose )
	);

	drawerBookkeeping.set( drawer, bookkeeping );
	ctx.isOpen = true;
	focusFirstIn( drawer );
}

/* ==========================================================================
 * Store registration — the public `store('sgs/nav')` surface.
 * ========================================================================== */

const { actions } = store( 'sgs/nav', {
	state: {
		/**
		 * Reactive per-instance open flag. A derived getter reading the caller's
		 * context so `data-wp-bind--aria-expanded="state.isOpen"` on the burger
		 * tracks THIS instance (multiple navs never cross-bind).
		 *
		 * @return {boolean} Whether this instance's drawer is open.
		 */
		get isOpen() {
			return !! getContext().isOpen;
		},
	},
	actions: {
		/**
		 * CALL-SITE 1 — drawer OPEN.
		 */
		openDrawer() {
			const ctx = getContext();
			const { ref } = getElement();
			openDrawerFor( ctx, ref );
		},

		/**
		 * CALL-SITE 2 — drawer CLOSE (the × binds this).
		 */
		closeDrawer() {
			const ctx = getContext();
			const drawer = resolveDrawer( ctx );
			if ( ! drawer ) {
				return;
			}
			const bookkeeping = drawerBookkeeping.get( drawer );
			runClose( drawer, bookkeeping ? bookkeeping.scrim : null );
		},

		/**
		 * CALL-SITE 3 — burger TOGGLE (open⇄close on one live control).
		 */
		toggleDrawer() {
			const ctx = getContext();
			const drawer = resolveDrawer( ctx );
			if ( drawer && drawer.open ) {
				actions.closeDrawer();
			} else {
				actions.openDrawer();
			}
		},
	},
} );

export { actions, FOCUSABLE_SELECTOR };
