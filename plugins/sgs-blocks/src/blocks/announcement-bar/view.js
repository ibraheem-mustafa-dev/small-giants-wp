/**
 * Announcement Bar — Frontend Interactivity
 *
 * Uses WordPress Interactivity API for dismissal, countdown, and rotation.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const STORAGE_KEY_PREFIX = 'sgs_announcement_dismissed_';

/** @type {Map<HTMLElement, number>} Track interval IDs per element for cleanup. */
const activeIntervals = new Map();

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

			// Clear any running interval for this element.
			const el = getElement().ref;
			if ( activeIntervals.has( el ) ) {
				clearInterval( activeIntervals.get( el ) );
				activeIntervals.delete( el );
			}

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
						}
						// Expired — clear it.
						localStorage.removeItem( STORAGE_KEY_PREFIX + 'persistent' );
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
			const el = getElement().ref;
			const targetTimestamp = new Date( ctx.targetDate ).getTime();
			const { state } = store( 'sgs/announcement-bar' );

			const updateCountdown = () => {
				const now = Date.now();
				const remaining = targetTimestamp - now;

				if ( remaining <= 0 ) {
					// Countdown ended — update individual properties.
					state.countdown.days = 0;
					state.countdown.hours = 0;
					state.countdown.minutes = 0;
					state.countdown.seconds = 0;

					// Clear the interval.
					if ( activeIntervals.has( el ) ) {
						clearInterval( activeIntervals.get( el ) );
						activeIntervals.delete( el );
					}

					if ( 'hide' === ctx.countdownEndAction ) {
						ctx.isDismissed = true;
					} else if ( 'show-message' === ctx.countdownEndAction ) {
						const messageElement = el.querySelector( '.sgs-announcement-bar__text' );
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

				// Mutate individual state properties — keeps reactive bindings intact.
				state.countdown.days = days.toString().padStart( 2, '0' );
				state.countdown.hours = hours.toString().padStart( 2, '0' );
				state.countdown.minutes = minutes.toString().padStart( 2, '0' );
				state.countdown.seconds = seconds.toString().padStart( 2, '0' );
			};

			// Update immediately, then every second.
			updateCountdown();
			const intervalId = setInterval( updateCountdown, 1000 );
			activeIntervals.set( el, intervalId );
		},

		/**
		 * Start message rotation.
		 */
		startRotation() {
			const el = getElement().ref;
			const messages = el.querySelectorAll( '.sgs-announcement-bar__message' );

			if ( messages.length <= 1 ) {
				return; // Nothing to rotate.
			}

			let currentIndex = 0;

			const rotateMessages = () => {
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

			// Rotate on interval — store ID for cleanup.
			const ctx = getContext();
			const intervalId = setInterval( rotateMessages, parseInt( ctx.rotationInterval, 10 ) );
			activeIntervals.set( el, intervalId );
		},

		/**
		 * Update countdown display — called via data-wp-watch.
		 */
		updateCountdown() {
			// Triggered by data-wp-watch on the countdown element.
			// Actual countdown logic is in startCountdown().
		},

		/**
		 * Check if a message should be hidden (for rotating variant).
		 */
		isMessageHidden() {
			const ctx = getContext();
			const element = getElement();

			if ( 'rotating' !== ctx.variant ) {
				return false;
			}

			const index = parseInt( element.ref.getAttribute( 'data-index' ), 10 );
			return index !== ctx.currentMessageIndex;
		},
	},
} );
