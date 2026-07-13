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

	// Re-parent the drawer to <body> so it is a SIBLING of .wp-site-blocks,
	// not a descendant (2026-07-13 bug fix). The open handler sets `inert` on
	// .wp-site-blocks to freeze the background for the modal — but `inert`
	// applies to the whole subtree, and the drawer lived INSIDE .wp-site-blocks,
	// so opening it disabled itself (every link/button became unclickable, and
	// hit-testing returned <body>). The Popover API promotes the drawer to the
	// top layer for PAINTING, so it looked open, but `inert` follows the DOM
	// tree, not the paint tree. Moving it out to <body> keeps the background
	// freeze working while leaving the drawer interactive. `popovertarget`
	// resolves by id, so the trigger still opens it after the move.
	// Proven live: elementFromPoint reaches the drawer links AND the background
	// stays inert-frozen after the move.
	if ( drawer.parentElement !== document.body ) {
		document.body.appendChild( drawer );
	}

	const trigger = document.querySelector(
		'[popovertarget="sgs-mobile-nav"]'
	);
	const supportsPopover = 'popover' in HTMLElement.prototype;

	// Set up accordion toggles — bound regardless of trigger presence.
	setupAccordions( drawer );

	// Set up link-click close — bound regardless of trigger presence.
	setupLinkClickClose( drawer );

	// Background element for inert management.
	const siteBlocks = document.querySelector( '.wp-site-blocks' );

	// Scroll lock + exit animation + a11y state management.
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
				// A11y: announce drawer state + trap screen readers.
				// Guard: trigger may not exist (e.g. drawer in template part without hamburger).
				if ( trigger ) {
					trigger.setAttribute( 'aria-expanded', 'true' );
				}
				if ( siteBlocks ) {
					siteBlocks.setAttribute( 'inert', '' );
				}
				// Move focus to close button.
				const closeBtn = drawer.querySelector( '.sgs-mobile-nav__close' );
				if ( closeBtn ) {
					closeBtn.focus();
				}
			} else {
				unlockScroll();
				returnFocus( trigger ); // returnFocus already guards for null trigger.
				drawer.classList.remove( 'is-closing' );
				// A11y: reset state.
				if ( trigger ) {
					trigger.setAttribute( 'aria-expanded', 'false' );
				}
				if ( siteBlocks ) {
					siteBlocks.removeAttribute( 'inert' );
				}
			}
		} );

		// ESC key handler — popover="manual" does not auto-dismiss.
		// Bound regardless of trigger presence so the drawer is always closeable via keyboard.
		document.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' && drawer.matches( ':popover-open' ) ) {
				drawer.hidePopover();
			}
		} );
	}

	// Set initial aria-expanded state on trigger (only when trigger exists).
	if ( trigger && ! trigger.hasAttribute( 'aria-expanded' ) ) {
		trigger.setAttribute( 'aria-expanded', 'false' );
		trigger.setAttribute( 'aria-haspopup', 'dialog' );
	}

	// Swipe-to-close gesture.
	if ( drawer.dataset.swipe === 'true' ) {
		setupSwipe( drawer );
	}

	// Focus trap for modal accessibility
	setupFocusTrap( drawer );

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
			// No-inline contract (2026-07-10): visual state is driven entirely by
			// a class (transition kill switch, in style.css) + two CSS custom
			// PROPERTY VALUES (--sgs-mn-swipe-x/-y, allowed — a var VALUE is not a
			// property declaration). Never write .style.transform/.style.transition.
			drawer.classList.add( 'is-swiping' );
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
				resetSwipeState( drawer );
				return;
			}

			// Apply real-time follow based on variant direction.
			const translate = getSwipeTranslate( variant, deltaX );
			if ( translate !== null ) {
				drawer.style.setProperty( '--sgs-mn-swipe-x', translate.x );
				drawer.style.setProperty( '--sgs-mn-swipe-y', translate.y );
			}
		},
		{ passive: true }
	);

	drawer.addEventListener( 'pointerup', () => {
		if ( ! tracking ) {
			return;
		}
		tracking = false;
		drawer.classList.remove( 'is-swiping' );

		if ( shouldCloseOnSwipe( variant, deltaX ) ) {
			closeDrawer( drawer );
		} else {
			// Spring snap back — clearing the swipe vars lets the variant's own
			// transform rule (with its transition) take over again.
			drawer.style.removeProperty( '--sgs-mn-swipe-x' );
			drawer.style.removeProperty( '--sgs-mn-swipe-y' );
		}
	} );

	drawer.addEventListener( 'pointercancel', () => {
		tracking = false;
		resetSwipeState( drawer );
	} );
}

/**
 * Clear swipe-tracking visual state (class + custom-property values only —
 * no inline property declarations, per the no-inline styling contract).
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function resetSwipeState( drawer ) {
	drawer.classList.remove( 'is-swiping' );
	drawer.style.removeProperty( '--sgs-mn-swipe-x' );
	drawer.style.removeProperty( '--sgs-mn-swipe-y' );
}

/**
 * Get the swipe-follow translation as custom-property VALUES (not a
 * `transform` property declaration — consumed by the `.is-swiping` CSS rule
 * in style.css via `translate(var(--sgs-mn-swipe-x), var(--sgs-mn-swipe-y))`).
 *
 * @param {string} variant Drawer variant.
 * @param {number} dx      Horizontal delta in pixels.
 * @return {{x: string, y: string}|null} Custom-property values, or null if no swipe in this direction.
 */
function getSwipeTranslate( variant, dx ) {
	switch ( variant ) {
		case 'slide-left':
			// Only allow swiping left to close.
			return dx < 0 ? { x: `${ dx }px`, y: '0px' } : null;
		case 'slide-right':
			// Only allow swiping right to close.
			return dx > 0 ? { x: `${ dx }px`, y: '0px' } : null;
		case 'overlay':
			// Allow swiping down to close.
			return dx < 0 ? { x: '0px', y: `${ -Math.abs( dx ) }px` } : null;
		case 'bottom-sheet':
			// Allow swiping down to close.
			return dx > 0 ? { x: '0px', y: `${ dx }px` } : null;
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
	resetSwipeState( drawer );
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
 * Set up focus trap for accessibility.
 *
 * @param {HTMLElement} drawer The drawer element.
 */
function setupFocusTrap( drawer ) {
	drawer.addEventListener( 'keydown', ( e ) => {
		if ( e.key !== 'Tab' ) {
			return;
		}

		// Get all focusable elements
		const focusables = Array.from(
			drawer.querySelectorAll(
				'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
			)
		).filter( el => ! el.hasAttribute( 'disabled' ) && ! el.closest( '[hidden]' ) );

		if ( focusables.length === 0 ) {
			return;
		}

		const firstFocusable = focusables[ 0 ];
		const lastFocusable = focusables[ focusables.length - 1 ];

		if ( e.shiftKey ) {
			// Shift + Tab: if on first, cycle to last
			if ( document.activeElement === firstFocusable ) {
				e.preventDefault();
				lastFocusable.focus();
			}
		} else {
			// Tab: if on last, cycle to first
			if ( document.activeElement === lastFocusable ) {
				e.preventDefault();
				firstFocusable.focus();
			}
		}
	} );
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
