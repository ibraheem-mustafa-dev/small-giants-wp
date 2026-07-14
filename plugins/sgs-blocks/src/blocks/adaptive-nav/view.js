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
 * 3. Off-canvas drawer (absorbed from sgs/mobile-nav, Task 1 / D336) — native
 *    `<dialog>` + `showModal()` gives focus-trap/ESC/::backdrop/top-layer/
 *    background-inert "for free". This module hand-writes only what
 *    showModal() does NOT provide: backdrop-click-to-close, body scroll lock,
 *    aria-expanded sync on the toggle, and the drawer's own accordion
 *    submenus. Do NOT re-parent the dialog, do NOT set `inert` by hand, do
 *    NOT add a hand-rolled focus trap — showModal() already does all three,
 *    and a modal `<dialog>` is the only element that escapes ancestor
 *    inertness by construction.
 *
 * There may be multiple `.sgs-adaptive-nav` instances on a page — each is
 * initialised independently.
 *
 * @package SGS\Blocks
 */

const RESIZE_DEBOUNCE_MS = 150;
const SCROLL_LOCK_ATTR = 'data-sgs-anav-scroll-y';

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
 * Wire up the off-canvas drawer for one adaptive-nav instance: open/close via
 * native `showModal()`/`close()`, backdrop-click-to-close, scroll lock,
 * aria-expanded sync, and accordion submenus.
 *
 * @param {HTMLElement} root The `.sgs-adaptive-nav` container.
 */
function setupDrawer( root ) {
	const toggle = root.querySelector( '.sgs-adaptive-nav__toggle' );
	const dialog = root.querySelector( '.sgs-adaptive-nav__drawer' );

	// Guard: bail if the markup is missing OR the browser lacks <dialog>
	// showModal() support — the toggle then has no JS handler and the drawer
	// stays permanently closed rather than opening in a broken half-state.
	if ( ! toggle || ! dialog || typeof dialog.showModal !== 'function' ) {
		return;
	}

	const closeBtn = dialog.querySelector( '.sgs-adaptive-nav__drawer-close' );

	const openDrawer = () => {
		lockScroll();
		dialog.showModal();
		toggle.setAttribute( 'aria-expanded', 'true' );
	};

	const closeDrawer = () => {
		if ( ! dialog.open ) {
			return;
		}
		// Added BEFORE close() so the CSS transition active at the moment
		// [open] is removed already carries the faster exit timing
		// (250ms in / 200ms out — see style.css `.is-closing`).
		dialog.classList.add( 'is-closing' );
		dialog.close();
	};

	toggle.addEventListener( 'click', openDrawer );

	if ( closeBtn ) {
		closeBtn.addEventListener( 'click', closeDrawer );
	}

	// Backdrop click-to-close: a click landing on the <dialog> element itself
	// (not a descendant) is the ::backdrop area — the dialog's own padding
	// box is entirely filled by the drawer panel content.
	dialog.addEventListener( 'click', ( e ) => {
		if ( e.target === dialog ) {
			closeDrawer();
		}
	} );

	// The native `close` event fires for ESC, the close button, AND backdrop
	// click alike — one place to keep aria-expanded + scroll lock + focus
	// return in sync regardless of how the dialog closed.
	dialog.addEventListener( 'close', () => {
		dialog.classList.remove( 'is-closing' );
		toggle.setAttribute( 'aria-expanded', 'false' );
		unlockScroll();
		toggle.focus();
	} );

	setupDrawerAccordions( dialog );
}

/**
 * Lock body scroll behind the open drawer: fixed-position body + scrollY
 * save. iOS Safari ignores `overflow:hidden` on body, which is why the fixed-
 * position technique is used instead of a simple overflow toggle.
 */
function lockScroll() {
	const y = window.scrollY;
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
 * Wire up the drawer's accordion submenus: click toggles `aria-expanded` +
 * the sibling panel's `hidden` attribute. One-open-at-a-time is NOT enforced
 * here (matches the sgs/mobile-nav baseline being absorbed — an accordion,
 * not a disclosure-with-exclusivity).
 *
 * @param {HTMLElement} dialog The `.sgs-adaptive-nav__drawer` dialog element.
 */
function setupDrawerAccordions( dialog ) {
	const toggles = dialog.querySelectorAll(
		'.sgs-adaptive-nav__drawer-toggle'
	);
	toggles.forEach( ( button ) => {
		button.addEventListener( 'click', () => {
			const panelId = button.getAttribute( 'aria-controls' );
			const panel = panelId ? document.getElementById( panelId ) : null;
			if ( ! panel ) {
				return;
			}
			const isOpen = button.getAttribute( 'aria-expanded' ) === 'true';
			button.setAttribute( 'aria-expanded', isOpen ? 'false' : 'true' );
			panel.hidden = isOpen;
		} );
	} );
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
