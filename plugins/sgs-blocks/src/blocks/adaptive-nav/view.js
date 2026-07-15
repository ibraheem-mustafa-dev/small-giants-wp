/**
 * SGS Adaptive Navigation — frontend interactivity.
 *
 * Progressive enhancement only: every link is already server-rendered in the
 * DOM (crawlable with zero JS). This module adds two features on top:
 *
 * 1. Mega-panel disclosure — the APG "disclosure" pattern (not role=menu).
 *    Click/Enter/Space on a `.sgs-adaptive-nav__disclosure` button toggles its
 *    panel via `.is-open` + `aria-expanded`. Only one panel open at a time per
 *    instance; Escape closes and returns focus; a click outside any open panel
 *    closes everything. The CSS already opens panels on hover/focus-within as
 *    a no-JS fallback — `.is-open` is an ADDITIONAL open signal, not a
 *    replacement for it.
 *
 * 2. Desktop overflow "More" menu — only runs when the nav declares
 *    `data-overflow="more-menu"`. Measures whether the top-level list
 *    overflows the available width and, if so, relocates the trailing
 *    overflowing items (their real `<a href>` intact) into a synthesised
 *    "More" disclosure appended to the list. Recomputed on resize.
 *
 * 3. Disclosure drawer (Spec 34 FR-34-1/2) — a NON-modal `<dialog>` opened with
 *    `.show()`. The header row stays live and interactive while open (the toggle
 *    IS the close control); everything else is frozen by a SELECTIVE
 *    `inert`+`aria-hidden` walk, so focus containment is EMERGENT — no
 *    hand-rolled trap. On first open the drawer AND scrim re-parent to <body>
 *    (idempotent) so their `position:fixed`/colour rules cannot be beaten by a
 *    container ancestor or broken by a transformed one. This module owns: the
 *    freeze/restore, the real scrim element's close-on-click, document-level ESC
 *    (non-modal `.show()` does NOT auto-close on ESC), body scroll lock,
 *    aria-expanded sync, explicit focus return, and the accordion submenus.
 *
 *    A dialog/disclosure HYBRID — NOT the mega-panel's pure-disclosure pattern
 *    above (no freeze, no ESC-mandate). Do not "simplify" one into the other.
 *
 * There may be multiple `.sgs-adaptive-nav` instances on a page — each is
 * initialised independently.
 *
 * @package SGS\Blocks
 */

const RESIZE_DEBOUNCE_MS = 150;
const SCROLL_LOCK_ATTR = 'data-sgs-anav-scroll-y';

// First-focus target on open — skips non-interactive first children (e.g. an
// empty drawer container) to land on the first real link/control.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Initialise every adaptive-nav instance on the page.
 */
function init() {
	const instances = document.querySelectorAll( '.sgs-adaptive-nav' );
	instances.forEach( setupInstance );
}

/**
 * Wire up one adaptive-nav instance.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 */
function setupInstance( root ) {
	const nav = root.querySelector( '.sgs-adaptive-nav__nav' );
	const list = root.querySelector( '.sgs-adaptive-nav__list' );

	if ( nav && list ) {
		setupDisclosures( root );

		if ( nav.dataset.overflow === 'more-menu' ) {
			setupOverflowMenu( root, nav, list );
		}
	}

	setupDrawer( root );
}

/**
 * Wire up the disclosure drawer for one adaptive-nav instance: non-modal
 * open/close, re-parent-to-body, selective background freeze, scrim + ESC
 * close, scroll lock, aria-expanded sync, and accordion submenus.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 */
function setupDrawer( root ) {
	const toggle = root.querySelector( '.sgs-adaptive-nav__toggle' );
	const dialog = root.querySelector( '.sgs-adaptive-nav__drawer' );
	const scrim = root.querySelector( '.sgs-adaptive-nav__scrim' );

	// Bail if the markup is missing OR the browser lacks non-modal <dialog>
	// support — the toggle then has no JS handler and the drawer stays closed
	// rather than opening in a broken half-state (the server-rendered bar and
	// its crawlable links are unaffected).
	if ( ! toggle || ! dialog || typeof dialog.show !== 'function' ) {
		return;
	}

	// The set frozen on the last open, with each element's prior inert/
	// aria-hidden state, so close restores EXACTLY what this instance touched.
	let frozen = [];
	let reparented = false;

	// Re-parent the drawer + scrim to <body> on first open (idempotent, D323).
	// Load-bearing: without it the container wrapper's
	// `.sgs-container > :not(.sgs-container__overlay){position:relative}` (0,2,0)
	// beats the drawer's (0,1,0) `position:fixed`, and a transformed/filtered
	// ancestor would convert `fixed` into ancestor-relative positioning. Moving
	// out to <body> removes every such ancestor by construction.
	const reparentToBody = () => {
		if ( reparented ) {
			return;
		}
		if ( scrim ) {
			document.body.appendChild( scrim );
		}
		document.body.appendChild( dialog );
		reparented = true;
	};

	const openDrawer = () => {
		if ( dialog.open ) {
			return;
		}
		reparentToBody();
		lockScroll();
		dialog.show();
		if ( scrim ) {
			scrim.classList.add( 'is-open' );
		}
		frozen = freezeBackground( toggle, dialog, scrim );
		toggle.setAttribute( 'aria-expanded', 'true' );
		focusFirstInDrawer( dialog );
	};

	const closeDrawer = () => {
		if ( ! dialog.open ) {
			return;
		}
		// Added BEFORE close() so the CSS transition active at the moment
		// [open] is removed already carries the faster exit timing
		// (250ms in / 200ms out — see style.css `.is-closing`).
		dialog.classList.add( 'is-closing' );
		if ( scrim ) {
			scrim.classList.remove( 'is-open' );
		}
		dialog.close();
	};

	// The toggle is BOTH open and close (burger ↔ X). It lives in the live
	// header row, so it stays clickable while the drawer is open.
	toggle.addEventListener( 'click', () => {
		if ( dialog.open ) {
			closeDrawer();
		} else {
			openDrawer();
		}
	} );

	// Real scrim element with its OWN click listener — the `e.target === dialog`
	// (`::backdrop`) idiom silently stops working with `.show()`.
	if ( scrim ) {
		scrim.addEventListener( 'click', closeDrawer );
	}

	// ESC bound at `document` level, guarded on THIS instance being open: focus
	// may legitimately sit on a live header element (not the drawer), and a
	// non-modal `.show()` dialog does NOT auto-close on ESC.
	document.addEventListener( 'keydown', ( e ) => {
		if ( 'Escape' === e.key && dialog.open ) {
			closeDrawer();
		}
	} );

	// The native `close` event fires for `close()` however it was triggered —
	// one place to restore aria-expanded + scroll lock + the freeze + focus.
	// Focus return is EXPLICIT (Safari does not focus buttons on click, so never
	// rely on native click-focus).
	dialog.addEventListener( 'close', () => {
		dialog.classList.remove( 'is-closing' );
		if ( scrim ) {
			scrim.classList.remove( 'is-open' );
		}
		toggle.setAttribute( 'aria-expanded', 'false' );
		unlockScroll();
		unfreezeBackground( frozen );
		frozen = [];
		toggle.focus();
	} );

	// Accordion submenus are OWNED by the sgs/nav-menu child block's own view.js
	// (FR-34-4) — no drawer-level accordion wiring here, or the two modules would
	// double-toggle every submenu (expanded-then-collapsed announcements).
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
 * @param {HTMLElement}        toggle The nav toggle; its ancestor chain stays live.
 * @param {HTMLElement}        dialog The drawer dialog (skipped).
 * @param {HTMLElement|null}   scrim  The scrim element (skipped).
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

/**
 * Move focus to the first FOCUSABLE element inside the drawer on open; if none
 * exists (all children non-interactive), focus the drawer itself via a
 * temporary `tabindex="-1"`.
 *
 * @param {HTMLElement} dialog The drawer dialog element.
 */
function focusFirstInDrawer( dialog ) {
	const focusable = dialog.querySelector( FOCUSABLE_SELECTOR );
	if ( focusable ) {
		focusable.focus();
		return;
	}
	dialog.setAttribute( 'tabindex', '-1' );
	dialog.focus();
}

/**
 * Lock body scroll behind the open drawer: fixed-position body + scrollY
 * save. iOS Safari ignores `overflow:hidden` on body, which is why the fixed-
 * position technique is used instead of a simple overflow toggle.
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
 * Set up the disclosure (mega-panel) behaviour: single-open, click toggle,
 * Escape-to-close, click-outside-to-close. Delegated at the instance root so
 * disclosures added later (the More menu) are covered automatically.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 */
function setupDisclosures( root ) {
	// Click delegation — covers original disclosures + the synthesised More button.
	root.addEventListener( 'click', ( e ) => {
		const button = e.target.closest( '.sgs-adaptive-nav__disclosure' );
		if ( ! button || ! root.contains( button ) ) {
			return;
		}

		const item = button.closest( '.sgs-adaptive-nav__item--has-panel' );
		if ( ! item ) {
			return;
		}

		const willOpen = ! item.classList.contains( 'is-open' );

		// Only one panel open at a time within this instance.
		closeAllPanels( root );

		if ( willOpen ) {
			openPanel( item, button );
		}
	} );

	// Escape closes the open panel and returns focus to its disclosure button.
	root.addEventListener( 'keydown', ( e ) => {
		if ( e.key !== 'Escape' ) {
			return;
		}

		const openItem = root.querySelector(
			'.sgs-adaptive-nav__item--has-panel.is-open'
		);
		if ( ! openItem ) {
			return;
		}

		const button = openItem.querySelector(
			'.sgs-adaptive-nav__disclosure'
		);
		closeAllPanels( root );
		if ( button ) {
			button.focus();
		}
	} );

	// Click outside any open panel within this instance closes everything.
	document.addEventListener( 'click', ( e ) => {
		const openItem = root.querySelector(
			'.sgs-adaptive-nav__item--has-panel.is-open'
		);
		if ( ! openItem ) {
			return;
		}

		if ( ! openItem.contains( e.target ) ) {
			closeAllPanels( root );
		}
	} );
}

/**
 * Open a single panel item.
 *
 * @param {HTMLElement} item   The `.sgs-adaptive-nav__item--has-panel` element.
 * @param {HTMLElement} button The disclosure button.
 */
function openPanel( item, button ) {
	item.classList.add( 'is-open' );
	button.setAttribute( 'aria-expanded', 'true' );
}

/**
 * Close every open panel within an instance.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 */
function closeAllPanels( root ) {
	const openItems = root.querySelectorAll(
		'.sgs-adaptive-nav__item--has-panel.is-open'
	);
	openItems.forEach( ( item ) => {
		item.classList.remove( 'is-open' );
		const button = item.querySelector( '.sgs-adaptive-nav__disclosure' );
		if ( button ) {
			button.setAttribute( 'aria-expanded', 'false' );
		}
	} );
}

/**
 * Set up the desktop overflow "More" menu: measures the top-level list and
 * relocates trailing overflowing items into a synthesised More disclosure.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 * @param {HTMLElement} nav  The `.sgs-adaptive-nav__nav` element.
 * @param {HTMLElement} list The `.sgs-adaptive-nav__list` element.
 */
function setupOverflowMenu( root, nav, list ) {
	const instanceId =
		root.id || `sgs-anav-${ Math.random().toString( 36 ).slice( 2, 8 ) }`;
	const moreLabel = nav.dataset.moreLabel || 'More';

	// Snapshot the original top-level items (excludes the More li, which
	// doesn't exist yet) so overflow state is always restorable in order.
	const originalItems = Array.from( list.children ).filter(
		( child ) => ! child.classList.contains( 'sgs-adaptive-nav__more' )
	);

	if ( originalItems.length === 0 ) {
		return;
	}

	const moreItem = buildMoreItem( instanceId, moreLabel );
	const morePanelList = moreItem.querySelector(
		'.sgs-adaptive-nav__panel-list'
	);
	const moreButton = moreItem.querySelector(
		'.sgs-adaptive-nav__disclosure'
	);

	let resizeTimer = null;
	let resizeObserver = null;

	const recompute = () => {
		// Restore every original item to the main list, in original order,
		// before re-measuring.
		// Ensure the More item is the last child FIRST, so it is a valid
		// insertBefore anchor when we restore the original items (otherwise
		// insertBefore throws on the first run, when moreItem is unattached).
		if ( ! list.contains( moreItem ) ) {
			list.appendChild( moreItem );
		}

		originalItems.forEach( ( item ) =>
			list.insertBefore( item, moreItem )
		);
		morePanelList.replaceChildren();
		moreItem.hidden = true;

		// Measure with the More item hidden (no reserved width) first, to see
		// if anything overflows at all.
		// Measure against the CONSTRAINED container (nav is min-width:0 +
		// overflow:hidden, bounded by the header flex row), NOT the list's own
		// box — the list is flex-wrap:nowrap so its width is the overflowing
		// content width and would report no overflow.
		const availableWidth = nav.clientWidth;

		let usedWidth = 0;
		let overflowStartIndex = -1;
		const gap =
			parseFloat(
				getComputedStyle( list ).columnGap ||
					getComputedStyle( list ).gap ||
					'0'
			) || 0;

		// Reserve space for the More button up front — measure it while
		// temporarily visible off-flow is unnecessary; use its natural width.
		moreItem.hidden = false;
		const moreWidth = moreItem.getBoundingClientRect().width;
		moreItem.hidden = true;

		for ( let i = 0; i < originalItems.length; i++ ) {
			const itemWidth = originalItems[ i ].getBoundingClientRect().width;
			const runningWidth = usedWidth + itemWidth + ( i > 0 ? gap : 0 );

			// Always keep at least the first item visible.
			if ( i > 0 && runningWidth + gap + moreWidth > availableWidth ) {
				overflowStartIndex = i;
				break;
			}

			usedWidth = runningWidth;
		}

		if ( overflowStartIndex === -1 ) {
			// Nothing overflows — remove the More item from view entirely.
			moreItem.hidden = true;
			if ( list.contains( moreItem ) ) {
				list.removeChild( moreItem );
			}
			return;
		}

		// Move the overflowing tail into the More panel, preserving order.
		for ( let i = overflowStartIndex; i < originalItems.length; i++ ) {
			morePanelList.appendChild( originalItems[ i ] );
		}

		moreItem.hidden = false;
		if ( ! list.contains( moreItem ) ) {
			list.appendChild( moreItem );
		}
	};

	const debouncedRecompute = () => {
		if ( resizeTimer ) {
			clearTimeout( resizeTimer );
		}
		resizeTimer = setTimeout( recompute, RESIZE_DEBOUNCE_MS );
	};

	// Initial measurement.
	recompute();

	window.addEventListener( 'resize', debouncedRecompute );

	if ( 'ResizeObserver' in window ) {
		resizeObserver = new ResizeObserver( debouncedRecompute );
		resizeObserver.observe( nav );
	}

	// Guard against the button lacking aria-controls wiring (defensive only —
	// buildMoreItem always sets it).
	if ( moreButton && ! moreButton.hasAttribute( 'aria-controls' ) ) {
		moreButton.setAttribute(
			'aria-controls',
			`${ instanceId }-more-panel`
		);
	}
}

/**
 * Build the synthesised "More" list item (disclosure button + empty panel).
 *
 * @param {string} instanceId Unique id prefix for this nav instance.
 * @param {string} label      Label text for the More button.
 * @return {HTMLLIElement} The unattached `<li>` element, ready to append.
 */
function buildMoreItem( instanceId, label ) {
	const panelId = `${ instanceId }-more-panel`;

	const li = document.createElement( 'li' );
	li.className =
		'sgs-adaptive-nav__item sgs-adaptive-nav__item--has-panel sgs-adaptive-nav__more';

	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = 'sgs-adaptive-nav__link sgs-adaptive-nav__disclosure';
	button.setAttribute( 'aria-expanded', 'false' );
	button.setAttribute( 'aria-controls', panelId );
	button.appendChild( document.createTextNode( `${ label } ` ) );
	button.appendChild( buildChevron() );

	const panel = document.createElement( 'div' );
	panel.id = panelId;
	panel.className = 'sgs-adaptive-nav__panel sgs-adaptive-nav__more-panel';

	const panelList = document.createElement( 'ul' );
	panelList.className = 'sgs-adaptive-nav__panel-list';
	panel.appendChild( panelList );

	li.appendChild( button );
	li.appendChild( panel );

	return li;
}

/**
 * Build a small inline chevron SVG matching the markup used by the
 * server-rendered disclosure buttons.
 *
 * @return {SVGElement} The chevron icon.
 */
function buildChevron() {
	const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
	svg.setAttribute( 'width', '16' );
	svg.setAttribute( 'height', '16' );
	svg.setAttribute( 'viewBox', '0 0 24 24' );
	svg.setAttribute( 'fill', 'none' );
	svg.setAttribute( 'stroke', 'currentColor' );
	svg.setAttribute( 'stroke-width', '2' );
	svg.setAttribute( 'stroke-linecap', 'round' );
	svg.setAttribute( 'stroke-linejoin', 'round' );
	svg.setAttribute( 'aria-hidden', 'true' );
	svg.setAttribute( 'focusable', 'false' );

	const path = document.createElementNS(
		'http://www.w3.org/2000/svg',
		'path'
	);
	path.setAttribute( 'd', 'm6 9 6 6 6-6' );
	svg.appendChild( path );

	return svg;
}

// Initialise on DOM ready or immediately if already loaded.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
