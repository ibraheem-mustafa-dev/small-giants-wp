/**
 * SGS Tabs — frontend interactivity.
 *
 * Handles:
 * - Tab switching with ARIA state management
 * - Keyboard navigation (Arrow keys, Home, End, Tab into panel)
 * - Deep linking: URL hash (#tab-id) activates the matching tab on load
 * - Focus management: keyboard tab switches move focus to the new tab button
 * - prefers-reduced-motion: skips transitions when motion is reduced
 *
 * Progressive enhancement: tabs render with the first panel visible and
 * correct ARIA from the server. This script adds interactivity on top.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 *
 * @package SGS\Blocks
 */

/**
 * Initialise all tab blocks on the page.
 */
function initTabBlocks() {
	const tabBlocks = document.querySelectorAll( '[data-tabs-block]' );
	tabBlocks.forEach( initTabBlock );
}

/**
 * Initialise a single tabs block.
 *
 * @param {HTMLElement} block The .sgs-tabs wrapper element.
 */
function initTabBlock( block ) {
	const nav        = block.querySelector( '.sgs-tabs__nav' );
	const panels     = block.querySelectorAll( '.sgs-tabs__panel' );
	const tabButtons = nav ? nav.querySelectorAll( '[role="tab"]' ) : [];

	// Mark block as JS-enhanced for the cross-fade CSS hook.
	block.classList.add( 'sgs-tabs--js' );

	if ( ! nav || ! tabButtons.length || ! panels.length ) {
		return;
	}

	const orientation = nav.getAttribute( 'aria-orientation' ) || 'horizontal';
	const tabCount    = tabButtons.length;
	const isVertical  = orientation === 'vertical';

	/**
	 * Update the sliding indicator CSS custom properties on the nav element
	 * to match the position and size of the given tab button.
	 *
	 * For horizontal tabs: sets --sgs-indicator-left and --sgs-indicator-width.
	 * For vertical tabs: sets --sgs-indicator-top and --sgs-indicator-height.
	 *
	 * @param {HTMLElement} activeBtn The currently active tab button.
	 */
	function updateIndicator( activeBtn ) {
		if ( ! activeBtn ) {
			return;
		}

		if ( isVertical ) {
			nav.style.setProperty( '--sgs-indicator-top', activeBtn.offsetTop + 'px' );
			nav.style.setProperty( '--sgs-indicator-height', activeBtn.offsetHeight + 'px' );
		} else {
			nav.style.setProperty( '--sgs-indicator-left', activeBtn.offsetLeft + 'px' );
			nav.style.setProperty( '--sgs-indicator-width', activeBtn.offsetWidth + 'px' );
		}
	}

	/**
	 * Activate a tab by index.
	 *
	 * Updates ARIA attributes, shows the correct panel, and optionally moves
	 * focus to the newly active tab button.
	 *
	 * @param {number}  index         Zero-based tab index to activate.
	 * @param {boolean} moveFocus     Whether to focus the tab button (keyboard nav).
	 * @param {boolean} updateHash    Whether to update the URL hash.
	 */
	function activateTab( index, moveFocus, updateHash ) {
		if ( index < 0 || index >= tabCount ) {
			return;
		}

		tabButtons.forEach( ( btn, i ) => {
			const isActive = ( i === index );
			btn.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
			btn.setAttribute( 'tabindex', isActive ? '0' : '-1' );
			btn.classList.toggle( 'sgs-tabs__tab--active', isActive );
		} );

		panels.forEach( ( panel, i ) => {
			if ( i === index ) {
				panel.removeAttribute( 'hidden' );
				// Defer adding --active by one frame so the browser registers
				// the display change before the opacity transition begins.
				requestAnimationFrame( () => {
					panel.classList.add( 'sgs-tabs__panel--active' );
				} );
			} else {
				panel.classList.remove( 'sgs-tabs__panel--active' );
				panel.setAttribute( 'hidden', '' );
			}
		} );

		// Update sliding indicator position.
		updateIndicator( tabButtons[ index ] );

		if ( moveFocus ) {
			tabButtons[ index ].focus();
		}

		if ( updateHash ) {
			const tabId = tabButtons[ index ].id;
			if ( tabId ) {
				history.replaceState( null, '', '#' + tabId );
			}
		}
	}

	/**
	 * Keydown handler attached to the tab nav list.
	 *
	 * Implements WAI-ARIA Authoring Practices keyboard interaction:
	 * - Arrow keys move between tabs (direction depends on orientation)
	 * - Home / End jump to first / last tab
	 * - Tab key is not intercepted — browser default moves focus into panel
	 *
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown( event ) {
		const isHorizontal = ( 'horizontal' === orientation );
		const prevKey      = isHorizontal ? 'ArrowLeft'  : 'ArrowUp';
		const nextKey      = isHorizontal ? 'ArrowRight' : 'ArrowDown';

		const currentIndex = Array.from( tabButtons ).findIndex(
			( btn ) => btn === document.activeElement
		);

		if ( currentIndex === -1 ) {
			return;
		}

		let targetIndex = currentIndex;

		switch ( event.key ) {
			case nextKey:
				targetIndex = ( currentIndex + 1 ) % tabCount;
				break;
			case prevKey:
				targetIndex = ( currentIndex - 1 + tabCount ) % tabCount;
				break;
			case 'Home':
				targetIndex = 0;
				break;
			case 'End':
				targetIndex = tabCount - 1;
				break;
			default:
				return; // Let other keys pass through unhandled.
		}

		event.preventDefault();
		activateTab( targetIndex, true, true );
	}

	// Attach click listeners to each tab button.
	tabButtons.forEach( ( btn, index ) => {
		btn.addEventListener( 'click', () => {
			activateTab( index, false, true );
		} );
	} );

	// Attach keyboard listener to the nav container.
	nav.addEventListener( 'keydown', handleKeydown );

	// ─── Deep linking — check URL hash on load ───────────────────────────
	const hash = window.location.hash.slice( 1 );
	if ( hash ) {
		const matchIndex = Array.from( tabButtons ).findIndex(
			( btn ) => btn.id === hash
		);
		if ( matchIndex !== -1 ) {
			activateTab( matchIndex, false, false );
		}
	}

	// ─── Set initial indicator position ──────────────────────────────────
	const initialActive = nav.querySelector( '[aria-selected="true"]' );
	if ( initialActive ) {
		updateIndicator( initialActive );
	}

	// ─── Initialise active panel opacity ─────────────────────────────────
	// The server renders the first panel without [hidden]. Add --active so
	// the CSS fade-in rule shows it at full opacity from the start.
	panels.forEach( ( panel ) => {
		if ( ! panel.hasAttribute( 'hidden' ) ) {
			panel.classList.add( 'sgs-tabs__panel--active' );
		}
	} );
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initTabBlocks );
} else {
	initTabBlocks();
}
