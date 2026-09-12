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
 *
 * K1 fix (2026-09-12): the site's global `html{scroll-behavior:smooth}`
 * (`core-blocks-critical.css:80-84`) was unguarded at this call site, turning
 * the restore into a ~350ms eased climb visible AFTER the drawer had already
 * closed. `scrollTo()` resolves synchronously within the current task, so
 * forcing `scroll-behavior:auto` for the duration of this one call — then
 * restoring whatever was there before on the very next line — is safe;
 * nothing else can scroll in between. Matches the idiom already used in
 * `scripts/motion-qa/probe-horizontal-panel-focus.mjs:375`, scoped down from
 * "disable smooth-scroll for the whole page session" (correct for a test
 * probe) to "disable it only for this one call" (correct for production,
 * where a genuine user-initiated smooth-scroll — e.g. an anchor link — must
 * keep working immediately after the drawer closes).
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
		const root = document.documentElement;
		const previousScrollBehavior = root.style.scrollBehavior;
		root.style.scrollBehavior = 'auto';
		window.scrollTo( 0, parseInt( stored, 10 ) || 0 );
		root.style.scrollBehavior = previousScrollBehavior;
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
			) &&
			// `inert` (freezeBackground, or the drill-down submenu's own use of
			// it on the top-level list — nav-drilldown.js) removes an element
			// from focus/hit-testing/the a11y tree WITHOUT changing its layout
			// box, so the offsetWidth/getClientRects() check above cannot see
			// it. Without this, the drawer's own Tab-trap (below) could still
			// list an inert element as "focusable", wrap Tab onto it, and call
			// .focus() on something the browser silently refuses to focus —
			// leaving Tab appearing to do nothing rather than genuinely
			// cycling the drawer's live controls.
			! el.closest( '[inert]' )
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
 * Whether the container currently holds an OPEN nested `<dialog>` that owns
 * focus containment in its own right.
 *
 * `showModal()` promotes a dialog into the TOP LAYER but does NOT change DOM
 * ancestry — a `sgs/modal` opened from inside the drawer stays a descendant of
 * the drawer (the drawer declares no `allowedBlocks`, and sgs/modal opens in
 * place without reparenting). So the nested dialog's own Tab keydown still
 * BUBBLES to the drawer. `:modal` is the one honest test for "the browser is
 * already containing focus here", because modal-ness is internal browser state
 * with no attribute to read: an open modal and an open non-modal dialog carry
 * the identical `[open]` markup.
 *
 * The `:modal` fallback matters for the narrow band of engines that shipped
 * `<dialog>`/`showModal()` before the `:modal` pseudo-class: there, treat ANY
 * open nested dialog as containing. That is the safe direction — the drawer
 * itself is a modal on the primary path, so the browser's own Tab order already
 * cycles the drawer's subtree and focus cannot escape the page even if this
 * handler stands down.
 *
 * @param {HTMLElement} container The drawer dialog element.
 * @return {boolean} Whether a nested dialog is currently containing focus.
 */
function hasContainingNestedDialog( container ) {
	const nested = Array.from(
		container.querySelectorAll( 'dialog[open]' )
	);
	if ( 0 === nested.length ) {
		return false;
	}
	try {
		return nested.some( ( el ) => el.matches( ':modal' ) );
	} catch ( e ) {
		// `:modal` unsupported — `matches()` throws on an unknown selector.
		return true;
	}
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
	/*
	 * Defer to a nested dialog's NATIVE containment. This listener is bound on
	 * the drawer element and Tab keydown BUBBLES, so without this guard a
	 * `<dialog showModal>` opened inside the drawer would have its Tab wrapped
	 * back into the DRAWER's focusable list — the nested dialog's own
	 * containment broken by an ancestor that is no longer the active surface.
	 *
	 * Cause-agnostic: this is the correct behaviour whether or not the full
	 * failure reproduces on a given engine, and it is a strict no-op when the
	 * drawer holds no open nested dialog (the common case — one extra
	 * `querySelectorAll` per Tab press). Nothing else in this handler changes.
	 */
	if ( hasContainingNestedDialog( container ) ) {
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
	if ( ! drawer.open || drawer.classList.contains( 'is-closing' ) ) {
		return;
	}
	if ( scrim ) {
		scrim.classList.remove( 'is-open' );
	}

	// Reduced motion: no exit animation to wait for — close immediately.
	if ( prefersReducedMotion() ) {
		drawer.close();
		return;
	}

	/*
	 * The exit animation must finish BEFORE dialog.close().
	 *
	 * `close()` removes the [open] attribute, which makes a <dialog>
	 * `display:none` in the same tick — so the element is gone before the
	 * browser paints a single frame of `.is-closing`. That is why the drawer
	 * "just went" instead of animating out: the exit keyframes were never
	 * reachable, both the original vertical ones and the directional ones.
	 * (The old comment here reasoned about a CSS *transition* on a
	 * still-displayed element; a display:none element animates nothing.)
	 *
	 * So: add the class, let the animation run, close on animationend.
	 */
	drawer.classList.add( 'is-closing' );

	let finished = false;
	let timer = 0;

	const finish = () => {
		if ( finished ) {
			return;
		}
		finished = true;
		clearTimeout( timer );
		drawer.removeEventListener( 'animationend', onAnimationEnd );
		// `.is-closing` is removed by the native `close` handler, which is the
		// single teardown point for aria/scroll/freeze/focus.
		drawer.close();
	};

	function onAnimationEnd( e ) {
		// animationend bubbles — ignore a child's animation finishing first.
		if ( e.target === drawer ) {
			finish();
		}
	}

	drawer.addEventListener( 'animationend', onAnimationEnd );

	/*
	 * Fail-safe. If no exit animation actually runs the drawer must still
	 * close — a stuck-open drawer is far worse than a missing animation.
	 * Read the real computed duration rather than hardcoding one, so this
	 * keeps working if the timing changes or a site overrides it.
	 */
	const declared = parseFloat(
		window.getComputedStyle( drawer ).animationDuration
	);
	const ms = Number.isFinite( declared ) && declared > 0 ? declared * 1000 : 0;
	timer = setTimeout( finish, ms + 50 );
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

	// D1011: modality is an OPERATOR CHOICE (block.json `modality` attribute,
	// carried as `data-sgs-nav-modality`), never a capability sniff — every
	// browser's `HTMLDialogElement` defines BOTH `showModal` and `show`
	// (D1012), so a sniff can never actually choose the non-modal branch.
	// `hasModal`/`hasShow` still guard the (currently theoretical) case of a
	// dialog implementation missing one method outright.
	const hasModal = typeof drawer.showModal === 'function';
	const hasShow = typeof drawer.show === 'function';
	const wantsNonModal = 'non-modal' === drawer.dataset.sgsNavModality;
	const useModal = hasModal && ( ! wantsNonModal || ! hasShow );

	const scrim = resolveScrim( ctx.drawerRef );
	const bookkeeping = { trigger, scrim, frozen: [], cleanup: [] };

	reparentToBody( drawer, scrim );
	lockScroll();

	/*
	 * Fix 7 (multi-rater pre-commit review, D-pending): the `header` anchor's
	 * top offset must track the header's REAL rendered bottom edge, not the
	 * theme's static --sgs-header-height (which utilities.css sets to an
	 * unconditional 80px, or 0 when the header is unpinned/hidden). Measure it
	 * once per open — after reparentToBody so the drawer's own geometry can't
	 * skew the header's rect — and write the measured px value as a custom-
	 * property VALUE on the dialog (same pattern as sgs/modal's
	 * --sgs-modal-scroll-y; the no-inline contract permits a JS-set custom-
	 * property value, never a property declaration). render.php's `header`
	 * anchor reads it first, falling back to --sgs-header-height then 0.
	 */
	const headerEl = document.querySelector(
		'.wp-block-sgs-site-header, header.wp-block-template-part, body > header'
	);
	const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
	if ( headerRect && headerRect.bottom > 0 ) {
		drawer.style.setProperty(
			'--sgs-drawer-header-offset',
			`${ Math.max( 0, Math.round( headerRect.bottom ) ) }px`
		);
	} else {
		drawer.style.removeProperty( '--sgs-drawer-header-offset' );
	}

	/*
	 * The `trigger` anchor, measured for real. render.php's `trigger` case used
	 * to return a literal `top:16px;right:16px`, so the panel flew to the
	 * top-right corner no matter where the burger actually was (its own docblock
	 * admitted the approximation). Same measure-and-write pattern as the header
	 * offset directly above: `trigger` is already in scope here (it is this
	 * function's second parameter) and is NOT reparented — only the drawer and
	 * scrim are — so its rect is stable at this point, and lockScroll() has
	 * already run so the scrollbar is settled.
	 *
	 * Two deliberate corrections to the naive reading of the rect:
	 *  - top uses `bottom + 8`, because a panel anchored to a burger hangs BELOW
	 *    it, not over it.
	 *  - right is measured from `document.documentElement.clientWidth`, not
	 *    `window.innerWidth`, because a DOMRect's `.right` is a LEFT-origin
	 *    coordinate; feeding it straight into the CSS `right` property would push
	 *    the panel off the opposite edge, and the SUBTRAHEND must be the width of
	 *    the box the panel is actually laid out against.
	 *
	 * On the choice of basis (do NOT "simplify" this back to `innerWidth`): the
	 * drawer is `position:fixed`, so its `right` offset resolves against the
	 * INITIAL CONTAINING BLOCK, which EXCLUDES a classic scrollbar.
	 * `window.innerWidth` INCLUDES it. Those two are normally equal only because
	 * a scroll-locked page usually has no scrollbar — but `lockScroll` above
	 * DELIBERATELY forces the root's scrollbar track to stay while the drawer is
	 * open (D340, to stop the anchor jumping mid-animation), so the difference is
	 * live at exactly the moment this measurement is taken. Using `innerWidth`
	 * therefore over-states the inset by the scrollbar width (~15px on desktop
	 * Windows/Linux Chrome/Firefox) and the panel sits that far left of the
	 * burger. It is invisible on macOS and on mobile, where overlay scrollbars
	 * make `innerWidth === clientWidth` — which is why it survived review.
	 * `documentElement.clientWidth` is the ICB's width on every platform, so this
	 * is cause-agnostic: it is the correct basis whether or not a scrollbar
	 * happens to exist, and a no-op on the platforms where the two agree.
	 * Both properties are removed when there is no measurable trigger, so
	 * render.php's `var(…, 16px)` fallbacks take over. No cleanup in runClose()
	 * is needed (and none exists for the header offset either): every open
	 * re-writes or re-removes both.
	 */
	const tRect = trigger ? trigger.getBoundingClientRect() : null;
	if ( tRect && tRect.width > 0 ) {
		drawer.style.setProperty(
			'--sgs-drawer-trigger-top',
			`${ Math.max( 0, Math.round( tRect.bottom + 8 ) ) }px`
		);
		drawer.style.setProperty(
			'--sgs-drawer-trigger-right',
			`${ Math.max(
				0,
				Math.round(
					document.documentElement.clientWidth - tRect.right
				)
			) }px`
		);
	} else {
		drawer.style.removeProperty( '--sgs-drawer-trigger-top' );
		drawer.style.removeProperty( '--sgs-drawer-trigger-right' );
	}

	if ( useModal ) {
		// FR-36-6 default: full-screen modal in the top layer — survives a
		// transformed header ancestor; native inert background + native ESC +
		// native `::backdrop`. (Body-scroll-lock is NOT native — kept above.)
		drawer.showModal();

		/*
		 * Native ESC on a modal <dialog> closes it directly, bypassing
		 * runClose() — so without this it would snap shut with no exit
		 * animation while the burger / × / scrim animated out. Cancel the
		 * native close and route ESC through the same path as every other
		 * close, so all four behave identically.
		 *
		 * Safety: if anything here throws, the native close still happens
		 * (preventDefault is the FIRST thing undone by re-dispatching through
		 * runClose, which has its own timeout fail-safe). ESC can never leave
		 * the drawer stuck open.
		 */
		const onCancel = ( e ) => {
			e.preventDefault();
			runClose( drawer, scrim );
		};
		drawer.addEventListener( 'cancel', onCancel );
		bookkeeping.cleanup.push( () =>
			drawer.removeEventListener( 'cancel', onCancel )
		);

		/*
		 * Backdrop click-to-close (FR-36-6 desktop variants). Under
		 * `showModal()` the visible page is inert, so a partial-width panel
		 * (trigger / centred / header anchors) with no click-away dismissal
		 * reads as a broken site. A click on `::backdrop` is delivered with
		 * `target === dialog` and coordinates OUTSIDE the dialog's content box
		 * (the same idiom sgs/modal's view.js uses); a click inside the panel —
		 * including its own padding — falls inside the rect and never closes.
		 * The full-screen anchor is unaffected BY CONSTRUCTION: its dialog
		 * covers the viewport, so no click can land outside its rect. The
		 * `target` guard also excludes keyboard-synthesised clicks (their
		 * 0,0 coordinates would otherwise read as outside on some anchors).
		 */
		const onBackdropClick = ( e ) => {
			if ( e.target !== drawer ) {
				return;
			}
			const rect = drawer.getBoundingClientRect();
			const inDialog =
				rect.top <= e.clientY &&
				e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX &&
				e.clientX <= rect.left + rect.width;
			if ( ! inDialog ) {
				runClose( drawer, scrim );
			}
		};
		drawer.addEventListener( 'click', onBackdropClick );
		bookkeeping.cleanup.push( () =>
			drawer.removeEventListener( 'click', onBackdropClick )
		);

		/*
		 * Tab-trap — MODAL PATH ONLY (D1012 fix, 2026-09-10). A native
		 * `showModal()` dialog already contains focus via the top layer, but
		 * this hand-rolled trap makes the wrap explicit and matches the
		 * pre-existing behaviour exactly.
		 *
		 * It must NOT also bind on the non-modal path below: `freezeBackground`
		 * inerts everything except the live header row specifically so that
		 * native Tab order alone cycles {header, drawer} with no hand-rolled
		 * trap needed (see its own docblock). A trap bound unconditionally here
		 * wraps Tab strictly within `getFocusable(drawer)`, so once focus is
		 * inside the drawer it can never reach the still-visible, still-
		 * clickable header/burger controls — a WCAG 2.1.1 (Level A) keyboard
		 * trap the moment the non-modal branch goes live.
		 */
		const onTab = ( e ) => trapTab( drawer, e );
		drawer.addEventListener( 'keydown', onTab );
		bookkeeping.cleanup.push( () =>
			drawer.removeEventListener( 'keydown', onTab )
		);
	} else {
		// Fallback / D1011 primary: non-modal `.show()`. A non-modal dialog does
		// NOT inert the background or auto-close on ESC, so the selective freeze
		// gives EMERGENT containment and ESC is hand-rolled below.
		// No hand-rolled Tab-trap here — see the comment on the modal branch's
		// `onTab` above.
		drawer.show();
		bookkeeping.frozen = freezeBackground( trigger, drawer, scrim );
		const onEsc = ( e ) => {
			if ( 'Escape' === e.key && drawer.open ) {
				// stopPropagation: this listener is document-level with no
				// containment check beyond `drawer.open`, so without it, an
				// ESC press would also reach `mega-disclosure.js`'s own
				// element-scoped `data-wp-on--keydown` ESC handling if a mega
				// panel happened to be open at the same time (D1011 item 4).
				e.stopPropagation();
				runClose( drawer, scrim );
			}
		};
		document.addEventListener( 'keydown', onEsc );
		bookkeeping.cleanup.push( () =>
			document.removeEventListener( 'keydown', onEsc )
		);
	}

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
 * Back/forward-cache restore.
 * ========================================================================== */

/*
 * A drawer left open when the visitor navigates away comes back OPEN from the
 * bfcache — the browser restores the JS heap exactly as it froze it, so the
 * dialog is still `[open]` and <body> is still `position: fixed` from
 * `lockScroll`. The visitor sees a page that will not scroll, usually with no
 * visible drawer, and reports it as "the site froze".
 *
 * Registered ONCE at module scope, not per instance: a page can host several
 * nav instances and N duplicate listeners would be a leak. (`mega-disclosure.js`
 * makes the same call for its own store, and states the same reasoning.)
 *
 * `close()` rather than `runClose()` is deliberate — a restore is not an
 * interaction, so there is no exit animation to play, and `close()` fires the
 * native `close` event, which is the single teardown point that restores aria
 * state, scroll, freeze and focus.
 *
 * The scroll-lock check afterwards is a cause-agnostic safety net: it is
 * correct whether the lock was left by a drawer this listener just closed, by
 * one whose element no longer exists, or by any future surface that locks
 * scroll. It costs one attribute read.
 */
function dismissOnBfcacheRestore( event ) {
	if ( ! event.persisted ) {
		return;
	}

	document
		.querySelectorAll( 'dialog[data-sgs-nav-drawer][open]' )
		.forEach( ( drawer ) => {
			drawer.classList.remove( 'is-closing' );
			drawer.close();
		} );

	if ( document.body.hasAttribute( SCROLL_LOCK_ATTR ) ) {
		unlockScroll();
	}
}

window.addEventListener( 'pageshow', dismissOnBfcacheRestore );

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
	callbacks: {
		/**
		 * Drop a dangling `aria-controls` from the burger.
		 *
		 * Measured live on /poc-drawer-multi-instance/: three burgers carried
		 * the DEFAULT `aria-controls="sgs-nav-drawer"` while the drawers on that
		 * page had explicit refs, so `getElementById()` returned null for all
		 * three — a promise to assistive tech that resolves to nothing.
		 *
		 * Removing it is the honest repair rather than a loss of function: the
		 * drawer needs JS to open at all, so a burger on a JS-off page is inert
		 * regardless, and this callback only ever runs with JS on. A burger
		 * whose drawer DOES resolve is left completely untouched — the working
		 * pairing is the thing being protected.
		 *
		 * Deliberately NOT fixed by deriving a uid-based `drawerRef` default:
		 * the burger and the drawer render in unpredictable order, are not
		 * parent/child, and share no handle, so two independent derivations
		 * would produce two DIFFERENT strings and break the pairing that
		 * currently works.
		 */
		pruneDanglingAriaControls() {
			const ctx = getContext();
			if ( resolveDrawer( ctx ) ) {
				return;
			}
			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			const burger = ref.matches( '[aria-controls]' )
				? ref
				: ref.querySelector( '[aria-controls]' );
			if ( burger ) {
				burger.removeAttribute( 'aria-controls' );
			}
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
