/**
 * SGS Mobile Navigation — frontend interactivity.
 *
 * Minimal JS because the Popover API handles open/close, ESC, and backdrop.
 * This module adds: accordion one-at-a-time, swipe-to-close, scroll lock,
 * focus return, link click close, and Popover API fallback.
 *
 * @package SGS\Blocks
 */

const SWIPE_THRESHOLD = 60;

/**
 * Initialise the mobile navigation drawer.
 */
function init() {
	const drawer = document.getElementById( 'sgs-mobile-nav' );
	if ( ! drawer ) {
		return;
	}

	const trigger = document.querySelector(
		'[popovertarget="sgs-mobile-nav"]'
	);
	const supportsPopover = 'popover' in HTMLElement.prototype;

	// Set up accordion toggles.
	setupAccordions( drawer );

	// Set up link-click close.
	setupLinkClickClose( drawer );

	// Scroll lock + exit animation easing.
	if ( supportsPopover ) {
		// beforetoggle fires before state change — set closing easing.
		drawer.addEventListener( 'beforetoggle', ( e ) => {
			if ( e.newState === 'closed' ) {
				drawer.classList.add( 'is-closing' );
			}
		} );

		drawer.addEventListener( 'toggle', ( e ) => {
			if ( e.newState === 'open' ) {
				drawer.classList.remove( 'is-closing' );
				lockScroll();
			} else {
				unlockScroll();
				returnFocus( trigger );
				drawer.classList.remove( 'is-closing' );
			}
		} );
	}

	// Swipe-to-close gesture.
	if ( drawer.dataset.swipe === 'true' ) {
		setupSwipe( drawer );
	}

	// Popover API fallback for older browsers.
	if ( ! supportsPopover ) {
		setupFallback( drawer, trigger );
	}
}

/**
 * Set up accordion one-at-a-time toggles.
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function setupAccordions( drawer ) {
	const toggles = drawer.querySelectorAll( '.sgs-mobile-nav__toggle' );

	toggles.forEach( ( toggle ) => {
		toggle.addEventListener( 'click', () => {
			const expanded = toggle.getAttribute( 'aria-expanded' ) === 'true';
			const submenu = document.getElementById(
				toggle.getAttribute( 'aria-controls' )
			);

			if ( ! submenu ) {
				return;
			}

			// Close all other submenus (one-at-a-time).
			toggles.forEach( ( other ) => {
				if ( other !== toggle ) {
					other.setAttribute( 'aria-expanded', 'false' );
					const otherSub = document.getElementById(
						other.getAttribute( 'aria-controls' )
					);
					if ( otherSub ) {
						otherSub.hidden = true;
					}
				}
			} );

			// Toggle this submenu.
			const nowExpanded = ! expanded;
			toggle.setAttribute( 'aria-expanded', String( nowExpanded ) );
			submenu.hidden = ! nowExpanded;
		} );
	} );
}

/**
 * Close the drawer when a navigation link is clicked.
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function setupLinkClickClose( drawer ) {
	drawer.addEventListener( 'click', ( e ) => {
		const link = e.target.closest(
			'a.sgs-mobile-nav__link, a.sgs-mobile-nav__sublink, a.sgs-mobile-nav__cta-btn'
		);
		if ( ! link ) {
			return;
		}

		// Small delay so the user sees the tap state.
		setTimeout( () => {
			closeDrawer( drawer );
		}, 80 );
	} );
}

/**
 * Set up swipe-to-close gesture via Pointer Events API.
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function setupSwipe( drawer ) {
	let startX = 0;
	let startY = 0;
	let deltaX = 0;
	let tracking = false;
	const variant = drawer.dataset.variant || 'overlay';

	drawer.addEventListener(
		'pointerdown',
		( e ) => {
			// Only track single-finger touch.
			if ( e.pointerType === 'mouse' ) {
				return;
			}
			startX = e.clientX;
			startY = e.clientY;
			deltaX = 0;
			tracking = true;
			drawer.style.transition = 'none';
		},
		{ passive: true }
	);

	drawer.addEventListener(
		'pointermove',
		( e ) => {
			if ( ! tracking ) {
				return;
			}

			deltaX = e.clientX - startX;
			const deltaY = e.clientY - startY;

			// If vertical scroll is greater, abort gesture.
			if ( Math.abs( deltaY ) > Math.abs( deltaX ) && Math.abs( deltaX ) < 10 ) {
				tracking = false;
				drawer.style.transition = '';
				drawer.style.transform = '';
				return;
			}

			// Apply real-time follow based on variant direction.
			const translate = getSwipeTranslate( variant, deltaX );
			if ( translate !== null ) {
				drawer.style.transform = translate;
			}
		},
		{ passive: true }
	);

	drawer.addEventListener( 'pointerup', () => {
		if ( ! tracking ) {
			return;
		}
		tracking = false;
		drawer.style.transition = '';

		if ( shouldCloseOnSwipe( variant, deltaX ) ) {
			closeDrawer( drawer );
		} else {
			// Spring snap back.
			drawer.style.transform = '';
		}
	} );

	drawer.addEventListener( 'pointercancel', () => {
		tracking = false;
		drawer.style.transition = '';
		drawer.style.transform = '';
	} );
}

/**
 * Get the CSS transform value for swipe follow based on variant.
 *
 * @param {string} variant Drawer variant.
 * @param {number} dx      Horizontal delta in pixels.
 * @return {string|null} CSS transform value, or null if no swipe in this direction.
 */
function getSwipeTranslate( variant, dx ) {
	switch ( variant ) {
		case 'slide-left':
			// Only allow swiping left to close.
			return dx < 0 ? `translateX(${ dx }px)` : null;
		case 'slide-right':
			// Only allow swiping right to close.
			return dx > 0 ? `translateX(${ dx }px)` : null;
		case 'overlay':
			// Allow swiping down to close.
			return dx < 0 ? `translateY(${ -Math.abs( dx ) }px)` : null;
		case 'bottom-sheet':
			// Allow swiping down to close.
			return dx > 0 ? `translateY(${ dx }px)` : null;
		default:
			return null;
	}
}

/**
 * Determine if the swipe delta is large enough to close.
 *
 * @param {string} variant Drawer variant.
 * @param {number} dx      Horizontal delta in pixels.
 * @return {boolean} True if the drawer should close.
 */
function shouldCloseOnSwipe( variant, dx ) {
	switch ( variant ) {
		case 'slide-left':
			return dx < -SWIPE_THRESHOLD;
		case 'slide-right':
			return dx > SWIPE_THRESHOLD;
		case 'overlay':
		case 'bottom-sheet':
			return Math.abs( dx ) > SWIPE_THRESHOLD;
		default:
			return false;
	}
}

/**
 * Close the drawer using Popover API or fallback.
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function closeDrawer( drawer ) {
	if ( 'popover' in HTMLElement.prototype && drawer.matches( ':popover-open' ) ) {
		drawer.hidePopover();
	} else {
		drawer.classList.remove( 'is-open' );
		drawer.setAttribute( 'aria-hidden', 'true' );
		const backdrop = document.querySelector( '.sgs-mobile-nav__backdrop' );
		if ( backdrop ) {
			backdrop.classList.remove( 'is-open' );
		}
		unlockScroll();
	}
	drawer.style.transform = '';
}

/**
 * Lock body scroll to prevent background scrolling.
 */
function lockScroll() {
	const scrollbarWidth =
		window.innerWidth - document.documentElement.clientWidth;
	document.documentElement.style.setProperty(
		'--sgs-scrollbar-width',
		scrollbarWidth + 'px'
	);
	document.body.classList.add( 'sgs-mobile-nav-open' );
}

/**
 * Unlock body scroll.
 */
function unlockScroll() {
	document.body.classList.remove( 'sgs-mobile-nav-open' );
}

/**
 * Return focus to the trigger button after closing.
 *
 * @param {HTMLElement|null} trigger The hamburger button.
 */
function returnFocus( trigger ) {
	if ( trigger ) {
		trigger.focus();
	}
}

/**
 * Set up fallback for browsers without Popover API.
 *
 * @param {HTMLElement}      drawer  The drawer element.
 * @param {HTMLElement|null} trigger The hamburger button.
 */
function setupFallback( drawer, trigger ) {
	// Remove popover attribute so it renders as a normal element.
	drawer.removeAttribute( 'popover' );
	drawer.setAttribute( 'aria-hidden', 'true' );

	// Create backdrop.
	const backdrop = document.createElement( 'div' );
	backdrop.className = 'sgs-mobile-nav__backdrop';
	drawer.parentNode.insertBefore( backdrop, drawer );

	// Trigger opens the drawer.
	if ( trigger ) {
		trigger.removeAttribute( 'popovertarget' );
		trigger.addEventListener( 'click', () => {
			drawer.classList.add( 'is-open' );
			drawer.setAttribute( 'aria-hidden', 'false' );
			backdrop.classList.add( 'is-open' );
			lockScroll();
			// Focus the close button.
			const closeBtn = drawer.querySelector( '.sgs-mobile-nav__close' );
			if ( closeBtn ) {
				closeBtn.focus();
			}
		} );
	}

	// Close button.
	const closeBtn = drawer.querySelector( '.sgs-mobile-nav__close' );
	if ( closeBtn ) {
		closeBtn.removeAttribute( 'popovertarget' );
		closeBtn.removeAttribute( 'popovertargetaction' );
		closeBtn.addEventListener( 'click', () => {
			closeDrawer( drawer );
			returnFocus( trigger );
		} );
	}

	// Backdrop click.
	backdrop.addEventListener( 'click', () => {
		closeDrawer( drawer );
		returnFocus( trigger );
	} );

	// ESC key.
	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && drawer.classList.contains( 'is-open' ) ) {
			closeDrawer( drawer );
			returnFocus( trigger );
		}
	} );
}

// Initialise on DOM ready or immediately if already loaded.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
