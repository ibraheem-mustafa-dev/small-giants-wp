/**
 * Accordion — frontend interactivity.
 *
 * Enhances native <details>/<summary> with:
 * - Smooth expand/collapse animation (CSS transitions)
 * - Single-open mode (closes siblings when one opens)
 * - Respects data-allow-multiple and data-default-open attributes
 *
 * Uses a WeakSet to track programmatic toggles, preventing
 * re-entrant animation loops when closing siblings.
 *
 * @package SGS\Blocks
 */

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

		// Track which items are being animated programmatically.
		const animatingItems = new WeakSet();

		// Open the default item if set.
		if ( defaultOpen >= 0 && items[ defaultOpen ] ) {
			items[ defaultOpen ].setAttribute( 'open', '' );
		}

		// Set up each accordion item.
		items.forEach( ( details ) => {
			const summary = details.querySelector( 'summary' );
			const content = details.querySelector(
				'.sgs-accordion-item__content'
			);

			if ( ! summary || ! content ) {
				return;
			}

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
 * the var/classes. Mirrors sgs/mobile-nav's swipe-gesture pattern (D298).
 */
function openItem( details, content, wrapper, animatingItems ) {
	animatingItems.add( details );
	details.setAttribute( 'open', '' );

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

	// Sync aria-expanded immediately — the item is logically closed now.
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
