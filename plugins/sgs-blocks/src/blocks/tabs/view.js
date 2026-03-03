/**
 * SGS Tabs — Interactivity API store.
 *
 * Replaces vanilla JS with reactive WP Interactivity API.
 *
 * IMPORTANT: WP IA directive expressions are evaluated as property access paths
 * (`.split(".").reduce()`), NOT as JavaScript. This means `===`, `!==`, and
 * ternaries `? :` are NOT valid in directive strings. All derived/compared
 * values must be computed inside `state` getters and referenced via simple
 * property paths such as `state.isTabActive`.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'sgs/tabs', {
	state: {
		/**
		 * Active tab per block instance, keyed by blockId.
		 * Initialised lazily by callbacks.init.
		 *
		 * @type {Object.<string, string>}
		 */
		activeTabs: {},

		/**
		 * Returns true when the current element's tab matches the active tab.
		 * Reads state.activeTabs[blockId] (or falls back to defaultTabId) and
		 * compares with the element's own context.tabId.
		 *
		 * Used by: data-wp-class--is-active, data-wp-bind--hidden (negated).
		 *
		 * @returns {boolean}
		 */
		get isTabActive() {
			const ctx = getContext();
			return ( state.activeTabs[ ctx.blockId ] ?? ctx.defaultTabId ) === ctx.tabId;
		},

		/**
		 * Returns "true" or "false" string for aria-selected.
		 *
		 * We must return a string, not a boolean, because the IA's bind directive
		 * calls removeAttribute when the value is boolean false — which would
		 * remove aria-selected entirely instead of setting it to "false".
		 *
		 * Used by: data-wp-bind--aria-selected.
		 *
		 * @returns {string}
		 */
		get tabAriaSelected() {
			const ctx = getContext();
			return ( state.activeTabs[ ctx.blockId ] ?? ctx.defaultTabId ) === ctx.tabId
				? 'true'
				: 'false';
		},

		/**
		 * Returns "0" or "-1" string for tabindex.
		 * Active tab: roving tabindex = 0. Others: -1.
		 *
		 * Used by: data-wp-bind--tabindex.
		 *
		 * @returns {string}
		 */
		get tabTabIndex() {
			const ctx = getContext();
			return ( state.activeTabs[ ctx.blockId ] ?? ctx.defaultTabId ) === ctx.tabId
				? '0'
				: '-1';
		},
	},

	actions: {
		/**
		 * Activate the clicked tab.
		 * Sets state.activeTabs[blockId] = tabId and updates the URL hash.
		 */
		activate() {
			const ctx     = getContext();
			const { ref } = getElement();

			state.activeTabs[ ctx.blockId ] = ctx.tabId;

			if ( ref.id ) {
				history.replaceState( null, '', '#' + ref.id );
			}
		},

		/**
		 * WAI-ARIA keyboard navigation on the tablist nav element.
		 * Supports Arrow keys, Home, End. Horizontal and vertical orientations.
		 *
		 * @param {KeyboardEvent} event
		 */
		handleKeydown( event ) {
			const ctx     = getContext();
			const { ref } = getElement(); // The nav element.
			const isH     = ctx.orientation === 'horizontal';
			const prevKey = isH ? 'ArrowLeft' : 'ArrowUp';
			const nextKey = isH ? 'ArrowRight' : 'ArrowDown';
			const { key } = event;

			if ( ! [ prevKey, nextKey, 'Home', 'End' ].includes( key ) ) {
				return;
			}

			event.preventDefault();

			const tabs     = Array.from( ref.querySelectorAll( '[role="tab"]' ) );
			const activeId = state.activeTabs[ ctx.blockId ] ?? ctx.defaultTabId;
			const idx      = tabs.findIndex( t => t.id === activeId );
			const len      = tabs.length;
			let   nextIdx  = idx;

			if ( key === nextKey ) nextIdx = ( idx + 1 ) % len;
			if ( key === prevKey ) nextIdx = ( idx - 1 + len ) % len;
			if ( key === 'Home' ) nextIdx = 0;
			if ( key === 'End' )  nextIdx = len - 1;

			if ( nextIdx !== idx ) {
				tabs[ nextIdx ].click();
				tabs[ nextIdx ].focus();
			}
		},
	},

	callbacks: {
		/**
		 * On mount: initialise active tab from default, then check URL hash.
		 * Attached via data-wp-init on the wrapper element.
		 */
		init() {
			const ctx     = getContext();
			const { ref } = getElement();

			// Initialise with the first tab if not already set.
			if ( ! state.activeTabs[ ctx.blockId ] ) {
				state.activeTabs[ ctx.blockId ] = ctx.defaultTabId;
			}

			// Deep-link: activate tab matching the URL hash.
			const hash = window.location.hash.slice( 1 );
			if ( ! hash ) {
				return;
			}

			const btn = ref.querySelector( `[role="tab"][id="${ hash }"]` );
			if ( btn ) {
				state.activeTabs[ ctx.blockId ] = hash;
			}
		},
	},
} );
