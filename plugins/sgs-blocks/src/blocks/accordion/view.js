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
 */
function openItem( details, content, wrapper, animatingItems ) {
	animatingItems.add( details );
	details.setAttribute( 'open', '' );

	// Measure height after open.
	const height = wrapper.offsetHeight;
	content.style.height = '0px';
	content.style.overflow = 'hidden';

	requestAnimationFrame( () => {
		content.style.transition = 'height 0.3s ease';
		content.style.height = height + 'px';

		content.addEventListener(
			'transitionend',
			() => {
				content.style.height = '';
				content.style.overflow = '';
				content.style.transition = '';
				animatingItems.delete( details );
			},
			{ once: true }
		);
	} );
}

/**
 * Close an accordion item with smooth animation.
 */
function closeItem( details, content, wrapper, animatingItems ) {
	animatingItems.add( details );
	const height = wrapper.offsetHeight;
	content.style.height = height + 'px';
	content.style.overflow = 'hidden';

	requestAnimationFrame( () => {
		content.style.transition = 'height 0.3s ease';
		content.style.height = '0px';

		content.addEventListener(
			'transitionend',
			() => {
				details.removeAttribute( 'open' );
				content.style.height = '';
				content.style.overflow = '';
				content.style.transition = '';
				animatingItems.delete( details );
			},
			{ once: true }
		);
	} );
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initAccordions );
} else {
	initAccordions();
}
