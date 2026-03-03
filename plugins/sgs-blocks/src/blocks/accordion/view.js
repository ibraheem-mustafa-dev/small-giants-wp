/**
 * SGS Accordion — Interactivity API store.
 *
 * Replaces vanilla JS with reactive WP Interactivity API.
 * Handles: toggle, single-open mode, ARIA sync.
 * Smooth animation is handled by CSS (no JS animation needed).
 *
 * @package SGS\Blocks
 */

import { store, getContext } from '@wordpress/interactivity';

// Track the most recently opened item per accordion instance.
// Keyed by accordionId so multiple accordions on one page don't interfere.
const { state } = store( 'sgs/accordion', {
	state: {
		/** Map of accordionId → currently open itemId (single-open mode). */
		openItems: {},
	},

	actions: {
		/**
		 * Toggle the clicked accordion item open or closed.
		 * In single-open mode, closes any sibling that was open.
		 */
		toggle( event ) {
			// Prevent native <summary> click from toggling <details> directly.
			event.preventDefault();

			const ctx         = getContext();
			const accordionId = ctx.accordionId;
			const willOpen    = ! ctx.isOpen;

			// Update both open state and ARIA attribute together.
			// ariaExpanded is stored as a string in context so bind--aria-expanded
			// can use a simple path (state getters with getContext() are not reliably
			// reactive across re-renders in the WP Interactivity API).
			ctx.isOpen       = willOpen;
			ctx.ariaExpanded = willOpen ? 'true' : 'false';

			if ( willOpen ) {
				if ( ! ctx.allowMultiple ) {
					// Signal which item just opened; siblings will react via callbacks.syncSiblings.
					state.openItems = {
						...state.openItems,
						[ accordionId ]: ctx.itemId,
					};
				}
			} else {
				// If this was the tracked open item, clear it.
				if ( state.openItems[ accordionId ] === ctx.itemId ) {
					state.openItems = {
						...state.openItems,
						[ accordionId ]: '',
					};
				}
			}
		},
	},

	callbacks: {
		/**
		 * Reactive callback on each accordion item.
		 * When another item opens (state.openItems changes), close this one
		 * if it is not the newly opened item (single-open enforcement).
		 *
		 * Attached via data-wp-watch="callbacks.syncSiblings" on each <details>.
		 */
		syncSiblings() {
			const ctx         = getContext();
			const accordionId = ctx.accordionId;
			const openId      = state.openItems[ accordionId ];

			// Only act in single-open mode.
			if ( ctx.allowMultiple ) {
				return;
			}

			// If another item is the open one and this item is still open, close it.
			if ( openId && openId !== ctx.itemId && ctx.isOpen ) {
				ctx.isOpen       = false;
				ctx.ariaExpanded = 'false';
			}
		},
	},
} );
