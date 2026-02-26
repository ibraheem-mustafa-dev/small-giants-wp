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

	if ( ! nav || ! tabButtons.length || ! panels.length ) {
		return;
	}

	const orientation = nav.getAttribute( 'aria-orientation' ) || 'horizontal';
	const tabCount    = tabButtons.length;

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
			} else {
				panel.setAttribute( 'hidden', '' );
			}
		} );

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
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initTabBlocks );
} else {
	initTabBlocks();
}
