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
 * There may be multiple `.sgs-adaptive-nav` instances on a page — each is
 * initialised independently.
 *
 * @package SGS\Blocks
 */

const RESIZE_DEBOUNCE_MS = 150;

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

	// Guard: bail for this instance if the list is missing.
	if ( ! nav || ! list ) {
		return;
	}

	setupDisclosures( root );

	if ( nav.dataset.overflow === 'more-menu' ) {
		setupOverflowMenu( root, nav, list );
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
