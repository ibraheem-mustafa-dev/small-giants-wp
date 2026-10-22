/**
 * Accordion — frontend interactivity.
 *
 * Enhances native <details>/<summary> with:
 * - Single-open mode (an exclusive <details name> group, or a sibling-close
 *   fallback where the name attribute is not supported)
 * - Respects data-allow-multiple and data-default-open attributes
 * - A JS height animation ONLY in browsers without native ::details-content
 *   animation (style.css animates natively where it is supported), so the
 *   two animations never run together.
 *
 * With `data-scroll-to-opened="true"` an item the visitor opens scrolls its header below the sticky site header
 * (scroll-to-opened.js).
 *
 * Uses a WeakSet to track programmatic toggles, preventing
 * re-entrant animation loops when closing siblings.
 *
 * An item whose turning icon holds a `state` Entrance layer (Spec 38A FR-38A-53)
 * carries the state `expanded` on its <details> while it is open, published through
 * `@sgs/motion-state` (src/shared/motion-state-publish.js, which loads it only when
 * the item has state motion); the layer turns the icon. Items with no layer cost nothing.
 *
 * @package SGS\Blocks
 */

import {
	leaveState,
	preloadMotionState,
	restState,
	setState,
} from '../../shared/motion-state-publish';
import { scheduleScrollToOpened } from './scroll-to-opened';

const NATIVE_ANIMATION =
	typeof CSS !== 'undefined' &&
	CSS.supports( 'interpolate-size', 'allow-keywords' ) &&
	CSS.supports( 'selector(::details-content)' );
const NATIVE_GROUPS =
	typeof document !== 'undefined' && 'name' in document.createElement( 'details' );

let groupCounter = 0;

function syncAriaExpanded( details ) {
	const summary = details.querySelector( ':scope > summary' );
	if ( summary ) {
		summary.setAttribute( 'aria-expanded', details.open ? 'true' : 'false' );
	}
}

/**
 * Publish the item's `expanded` motion state from its real open state.
 *
 * At start-up an open item holds the state at rest (no entrance animation on first paint); afterwards opening plays the
 * entrance and closing plays its stored close values.
 *
 * @param {HTMLDetailsElement} details Accordion item.
 * @param {boolean}            initial True for the start-up call.
 */
function publishExpanded( details, initial = false ) {
	if ( details.open ) {
		if ( initial ) {
			restState( details, 'expanded' );
		} else {
			setState( details, 'expanded', true );
		}
		return;
	}
	if ( initial ) {
		setState( details, 'expanded', false );
	} else {
		leaveState( details, 'expanded' );
	}
}

/**
 * Native-animation path: the browser toggles and animates the item; this only
 * keeps aria-expanded in step and, without <details name> support, closes the
 * siblings of a newly opened item.
 */
function initNativeItems( accordion, items, allowMultiple ) {
	const visitorOpened = new WeakSet();
	groupCounter += 1;
	const groupName = 'sgs-accordion-group-' + groupCounter;

	items.forEach( ( details ) => {
		syncAriaExpanded( details );
		preloadMotionState( details );
		publishExpanded( details, true );
		const summary = details.querySelector( ':scope > summary' );
		if ( summary ) {
			summary.addEventListener( 'click', () => {
				if ( ! details.open ) {
					visitorOpened.add( details );
				}
			} );
		}
		details.addEventListener( 'toggle', () => {
			syncAriaExpanded( details );
			publishExpanded( details );
			if ( details.open && visitorOpened.delete( details ) ) {
				scheduleScrollToOpened( details, accordion );
			}
			if ( allowMultiple || NATIVE_GROUPS || ! details.open ) {
				return;
			}
			items.forEach( ( sibling ) => {
				if ( sibling !== details && sibling.open ) {
					sibling.open = false;
				}
			} );
		} );
	} );

	if ( ! allowMultiple && NATIVE_GROUPS ) {
		items.forEach( ( details ) => {
			details.name = groupName;
		} );
	}
}

function initAccordions() {
	const accordions = document.querySelectorAll( '.sgs-accordion' );

	accordions.forEach( ( accordion ) => {
		const allowMultiple =
			accordion.dataset.allowMultiple === 'true';
		const defaultOpen = parseInt(
			accordion.dataset.defaultOpen ?? '-1',
			10
		);
		const items = accordion.querySelectorAll(
			':scope > .sgs-accordion-item'
		);

		// Open the default item if set.
		if ( defaultOpen >= 0 && items[ defaultOpen ] ) {
			items[ defaultOpen ].setAttribute( 'open', '' );
		}

		if ( NATIVE_ANIMATION ) {
			initNativeItems( accordion, items, allowMultiple );
			return;
		}

		// Fallback: JS-animated items (browsers without native animation).
		const animatingItems = new WeakSet();

		// Set up each accordion item.
		items.forEach( ( details ) => {
			const summary = details.querySelector( 'summary' );
			const content = details.querySelector(
				'.sgs-accordion-item__content'
			);

			if ( ! summary || ! content ) {
				return;
			}

			// Start aria-expanded from the item's real open state (the default-open
			// item above is opened here, after the server wrote aria-expanded).
			summary.setAttribute( 'aria-expanded', details.open ? 'true' : 'false' );
			preloadMotionState( details );
			publishExpanded( details, true );

			// Wrap content for animation measurement.
			let wrapper = content.querySelector(
				'.sgs-accordion-item__content-inner'
			);
			if ( ! wrapper ) {
				wrapper = document.createElement( 'div' );
				wrapper.className =
					'sgs-accordion-item__content-inner';
				while ( content.firstChild ) {
					wrapper.appendChild( content.firstChild );
				}
				content.appendChild( wrapper );
			}

			// Use click on summary instead of toggle event.
			// This fires BEFORE the native toggle, giving us control.
			summary.addEventListener( 'click', ( e ) => {
				e.preventDefault();

				if ( animatingItems.has( details ) ) {
					return;
				}

				if ( details.open ) {
					// Currently open — close it.
					closeItem( details, content, wrapper, animatingItems );
				} else {
					// Currently closed — open it.
					// Close siblings first (single-open mode).
					if ( ! allowMultiple ) {
						items.forEach( ( sibling ) => {
							if (
								sibling !== details &&
								sibling.hasAttribute( 'open' ) &&
								! animatingItems.has( sibling )
							) {
								const sibContent =
									sibling.querySelector(
										'.sgs-accordion-item__content'
									);
								const sibWrapper =
									sibling.querySelector(
										'.sgs-accordion-item__content-inner'
									);
								if ( sibContent && sibWrapper ) {
									closeItem(
										sibling,
										sibContent,
										sibWrapper,
										animatingItems
									);
								}
							}
						} );
					}
					openItem( details, content, wrapper, animatingItems );
					scheduleScrollToOpened( details, accordion );
				}
			} );
		} );
	} );
}

/**
 * Open an accordion item with smooth animation.
 * Also updates aria-expanded on the summary for legacy screen reader support.
 *
 * No-inline contract (2026-07-10): visual state is driven entirely by a CSS
 * custom PROPERTY VALUE (--sgs-accordion-height, allowed — a var VALUE is not
 * a property declaration) + two classes (.is-animating toggles the transition,
 * .is-open toggles the settled height). Never write .style.height/.style.
 * overflow/.style.transition — those declarations live in style.css keyed off
 * the var/classes.
 */
function openItem( details, content, wrapper, animatingItems ) {
	animatingItems.add( details );
	details.setAttribute( 'open', '' );
	publishExpanded( details );

	// Sync aria-expanded so legacy screen readers announce the open state.
	const summary = details.querySelector( 'summary' );
	if ( summary ) {
		summary.setAttribute( 'aria-expanded', 'true' );
	}

	// Measure height after open, seed the var at 0 (same tick, before paint —
	// mirrors the original synchronous style.height='0px') so the transition
	// animates from a known starting point with no flash of full height.
	const height = wrapper.offsetHeight;
	content.classList.add( 'is-open' );
	content.style.setProperty( '--sgs-accordion-height', '0px' );

	const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	requestAnimationFrame( () => {
		if ( ! prefersReducedMotion ) {
			content.classList.add( 'is-animating' );
		}
		content.style.setProperty( '--sgs-accordion-height', height + 'px' );

		content.addEventListener(
			'transitionend',
			() => {
				content.classList.remove( 'is-animating' );
				content.style.removeProperty( '--sgs-accordion-height' );
				animatingItems.delete( details );
			},
			{ once: true }
		);

		if ( prefersReducedMotion ) {
			content.style.removeProperty( '--sgs-accordion-height' );
			animatingItems.delete( details );
		}
	} );
}

/**
 * Close an accordion item with smooth animation.
 * Also updates aria-expanded on the summary for legacy screen reader support.
 *
 * No-inline contract (2026-07-10): see openItem() above — var + class only.
 */
function closeItem( details, content, wrapper, animatingItems ) {
	animatingItems.add( details );

	// The item is logically closed now: the state and aria-expanded follow at once.
	leaveState( details, 'expanded' );
	const summary = details.querySelector( 'summary' );
	if ( summary ) {
		summary.setAttribute( 'aria-expanded', 'false' );
	}

	const height = wrapper.offsetHeight;
	content.classList.add( 'is-open' );
	content.style.setProperty( '--sgs-accordion-height', height + 'px' );

	const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	requestAnimationFrame( () => {
		if ( ! prefersReducedMotion ) {
			content.classList.add( 'is-animating' );
		}
		content.style.setProperty( '--sgs-accordion-height', '0px' );

		content.addEventListener(
			'transitionend',
			() => {
				details.removeAttribute( 'open' );
				content.classList.remove( 'is-animating', 'is-open' );
				content.style.removeProperty( '--sgs-accordion-height' );
				animatingItems.delete( details );
			},
			{ once: true }
		);

		if ( prefersReducedMotion ) {
			details.removeAttribute( 'open' );
			content.classList.remove( 'is-open' );
			content.style.removeProperty( '--sgs-accordion-height' );
			animatingItems.delete( details );
		}
	} );
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initAccordions );
} else {
	initAccordions();
}
