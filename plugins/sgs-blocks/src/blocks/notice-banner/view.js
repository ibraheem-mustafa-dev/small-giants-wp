/**
 * SGS Notice Banner — Frontend Interactivity (announcement mode).
 *
 * Only loaded when the block registers viewScriptModule. Handles dismissal
 * for announcement bars (displayMode='announcement', dismissible=true).
 *
 * Storage strategy:
 *  - session  → sessionStorage (cleared when the tab/session ends)
 *  - permanent → localStorage with a 365-day expiry timestamp
 *
 * Pre-paint flash prevention: render.php emits a tiny inline <script> that
 * checks storage BEFORE the first paint and sets display:none on the wrapper.
 * This module then syncs the isDismissed context flag on init so Interactivity
 * keeps the element hidden reactively.
 *
 * MEMORY GOTCHA (wp-interactivity-data-wp-on-rejects-colon-event-names):
 * close button is in the SSR markup so data-wp-on--click binds normally.
 * No custom event names with colons used here.
 *
 * @package SGS\Blocks
 */

import { store, getContext } from '@wordpress/interactivity';

const PERMANENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 365 days.

store( 'sgs/notice-banner', {
	actions: {
		/**
		 * Dismiss the announcement bar.
		 *
		 * Hides the bar reactively via context.isDismissed and writes
		 * the dismiss flag to sessionStorage or localStorage.
		 */
		dismiss() {
			const ctx = getContext();
			ctx.isDismissed = true;

			const { storageKey, dismissBehaviour } = ctx;
			if ( ! storageKey ) {
				return;
			}

			if ( 'session' === dismissBehaviour ) {
				try {
					sessionStorage.setItem( storageKey, '1' );
				} catch ( e ) {
					// Storage unavailable (private browsing quota hit, etc.) — fail silently.
				}
			} else {
				// permanent: localStorage with an expiry timestamp.
				try {
					localStorage.setItem(
						storageKey,
						JSON.stringify( { dismissed: true, expiry: Date.now() + PERMANENT_EXPIRY_MS } )
					);
				} catch ( e ) {
					// Storage unavailable — fail silently.
				}
			}
		},
	},

	callbacks: {
		/**
		 * Initialise on mount.
		 *
		 * Syncs isDismissed with whatever the pre-paint script already did
		 * (or catches cases where the inline script was blocked / hydration
		 * runs after paint). Also clears expired permanent entries.
		 */
		init() {
			const ctx = getContext();
			const { storageKey, dismissBehaviour } = ctx;

			if ( ! storageKey ) {
				return;
			}

			if ( 'session' === dismissBehaviour ) {
				try {
					if ( sessionStorage.getItem( storageKey ) ) {
						ctx.isDismissed = true;
					}
				} catch ( e ) {
					// Storage unavailable.
				}
			} else {
				try {
					const raw = localStorage.getItem( storageKey );
					if ( raw ) {
						const data = JSON.parse( raw );
						if ( data.expiry && data.expiry > Date.now() ) {
							ctx.isDismissed = true;
						} else {
							// Entry expired — remove it so the bar shows again.
							localStorage.removeItem( storageKey );
						}
					}
				} catch ( e ) {
					// Storage unavailable or invalid JSON — fail silently.
				}
			}
		},
	},
} );
