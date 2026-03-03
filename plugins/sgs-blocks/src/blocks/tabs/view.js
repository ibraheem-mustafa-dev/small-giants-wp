/**
 * SGS Tabs — Interactivity API store.
 *
 * Replaces vanilla JS tab switching with reactive WP Interactivity API.
 * Handles: tab activation, keyboard navigation (WAI-ARIA), deep-link hash.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'sgs/tabs', {
	actions: {
		/**
		 * Activate the clicked tab.
		 * Reads tabId from the item's context and writes activeTabId to the parent context.
		 */
		activate() {
			const ctx = getContext();
			// ctx.activeTabId lives on the wrapper; ctx.tabId on the button.
			// Because contexts merge, both are accessible here.
			ctx.activeTabId = ctx.tabId;

			// Deep-link: update URL hash to the tab button's ID.
			const { ref } = getElement();
			if ( ref.id ) {
				history.replaceState( null, '', '#' + ref.id );
			}
		},

		/**
		 * Keyboard navigation within the tab list.
		 * WAI-ARIA: Arrow keys, Home, End.
		 *
		 * @param {KeyboardEvent} event
		 */
		handleKeydown( event ) {
			const ctx        = getContext();
			const { ref }    = getElement(); // ref = the tablist div
			const isHoriz    = 'horizontal' === ctx.orientation;
			const prevKey    = isHoriz ? 'ArrowLeft' : 'ArrowUp';
			const nextKey    = isHoriz ? 'ArrowRight' : 'ArrowDown';
			const key        = event.key;

			if ( ! [ prevKey, nextKey, 'Home', 'End' ].includes( key ) ) {
				return;
			}

			event.preventDefault();

			const tabs     = Array.from( ref.querySelectorAll( '[role="tab"]' ) );
			const total    = tabs.length;
			const current  = tabs.findIndex(
				( t ) => t.getAttribute( 'aria-selected' ) === 'true'
			);

			let target = current;
			if ( key === nextKey )    { target = ( current + 1 ) % total; }
			if ( key === prevKey )    { target = ( current - 1 + total ) % total; }
			if ( key === 'Home' )     { target = 0; }
			if ( key === 'End' )      { target = total - 1; }

			if ( target === current ) {
				return;
			}

			// Activate target tab and move focus.
			tabs[ target ].click();
			tabs[ target ].focus();
		},
	},

	callbacks: {
		/**
		 * On init: check URL hash for deep-link activation.
		 * Runs once when the block mounts in the browser.
		 */
		init() {
			const ctx     = getContext();
			const { ref } = getElement();
			const hash    = window.location.hash.slice( 1 );

			if ( ! hash ) {
				return;
			}

			const matchedTab = ref.querySelector( `[role="tab"][id="${ hash }"]` );
			if ( matchedTab ) {
				ctx.activeTabId = matchedTab.dataset.tabId || hash;
			}
		},
	},
} );
