/**
 * Announcement Bar — Frontend Interactivity
 *
 * Uses WordPress Interactivity API for dismissal, countdown, and rotation.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const STORAGE_KEY_PREFIX = 'sgs_announcement_dismissed_';

store( 'sgs/announcement-bar', {
	state: {
		countdown: {
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
		},
	},
	actions: {
		/**
		 * Dismiss the announcement bar.
		 */
		dismiss() {
			const ctx = getContext();
			ctx.isDismissed = true;

			// Store dismissal based on close behaviour.
			if ( 'session' === ctx.closeBehaviour ) {
				sessionStorage.setItem( STORAGE_KEY_PREFIX + 'session', '1' );
			} else if ( 'persistent' === ctx.closeBehaviour ) {
				const expiryDate = new Date();
				expiryDate.setDate( expiryDate.getDate() + parseInt( ctx.cookieDays, 10 ) );
				localStorage.setItem(
					STORAGE_KEY_PREFIX + 'persistent',
					JSON.stringify( { dismissed: true, expiry: expiryDate.getTime() } )
				);
			}
		},
	},
	callbacks: {
		/**
		 * Initialise on mount — check dismissal state, start countdown/rotation.
		 */
		init() {
			const ctx = getContext();
			const element = getElement();

			// Check if already dismissed.
			if ( 'session' === ctx.closeBehaviour ) {
				if ( sessionStorage.getItem( STORAGE_KEY_PREFIX + 'session' ) ) {
					ctx.isDismissed = true;
					return;
				}
			} else if ( 'persistent' === ctx.closeBehaviour ) {
				const stored = localStorage.getItem( STORAGE_KEY_PREFIX + 'persistent' );
				if ( stored ) {
					try {
						const data = JSON.parse( stored );
						if ( data.expiry && data.expiry > Date.now() ) {
							ctx.isDismissed = true;
							return;
						} else {
							// Expired — clear it.
							localStorage.removeItem( STORAGE_KEY_PREFIX + 'persistent' );
						}
					} catch ( e ) {
						// Invalid JSON — ignore.
					}
				}
			}

			// Start countdown if variant is countdown.
			if ( 'countdown' === ctx.variant && ctx.targetDate ) {
				this.startCountdown();
			}

			// Start rotation if variant is rotating.
			if ( 'rotating' === ctx.variant ) {
				this.startRotation();
			}
		},

		/**
		 * Start countdown timer.
		 */
		startCountdown() {
			const ctx = getContext();
			const targetTimestamp = new Date( ctx.targetDate ).getTime();

			const updateCountdown = () => {
				const now = Date.now();
				const remaining = targetTimestamp - now;

				if ( remaining <= 0 ) {
					// Countdown ended.
					store.state.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };

					if ( 'hide' === ctx.countdownEndAction ) {
						ctx.isDismissed = true;
					} else if ( 'show-message' === ctx.countdownEndAction ) {
						// Replace message with end message.
						const messageElement = getElement().ref.querySelector( '.sgs-announcement-bar__text' );
						if ( messageElement ) {
							messageElement.textContent = ctx.countdownEndMessage;
						}
					}
					return;
				}

				const days = Math.floor( remaining / ( 1000 * 60 * 60 * 24 ) );
				const hours = Math.floor( ( remaining % ( 1000 * 60 * 60 * 24 ) ) / ( 1000 * 60 * 60 ) );
				const minutes = Math.floor( ( remaining % ( 1000 * 60 * 60 ) ) / ( 1000 * 60 ) );
				const seconds = Math.floor( ( remaining % ( 1000 * 60 ) ) / 1000 );

				store.state.countdown = {
					days: days.toString().padStart( 2, '0' ),
					hours: hours.toString().padStart( 2, '0' ),
					minutes: minutes.toString().padStart( 2, '0' ),
					seconds: seconds.toString().padStart( 2, '0' ),
				};
			};

			// Update every second.
			updateCountdown();
			setInterval( updateCountdown, 1000 );
		},

		/**
		 * Start message rotation.
		 */
		startRotation() {
			const ctx = getContext();
			const element = getElement();
			const messages = element.ref.querySelectorAll( '.sgs-announcement-bar__message' );

			if ( messages.length <= 1 ) {
				return; // Nothing to rotate.
			}

			let currentIndex = 0;

			const rotateMessages = () => {
				// Hide all messages.
				messages.forEach( ( msg, index ) => {
					if ( index === currentIndex ) {
						msg.setAttribute( 'data-current', 'true' );
					} else {
						msg.removeAttribute( 'data-current' );
					}
				} );

				currentIndex = ( currentIndex + 1 ) % messages.length;
			};

			// Initial display.
			rotateMessages();

			// Rotate on interval.
			setInterval( rotateMessages, parseInt( ctx.rotationInterval, 10 ) );
		},

		/**
		 * Update countdown display — called via data-wp-watch.
		 */
		updateCountdown() {
			// This callback is triggered by the data-wp-watch on the countdown element.
			// The actual countdown logic is in startCountdown().
			// This just ensures the element updates when state.countdown changes.
		},

		/**
		 * Check if a message should be hidden (for rotating variant).
		 */
		isMessageHidden() {
			const ctx = getContext();
			const element = getElement();

			if ( 'rotating' !== ctx.variant ) {
				return false; // All messages visible in non-rotating variants.
			}

			const index = parseInt( element.ref.getAttribute( 'data-index' ), 10 );
			return index !== ctx.currentMessageIndex;
		},
	},
} );
