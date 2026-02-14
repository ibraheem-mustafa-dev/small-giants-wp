/**
 * Accordion — frontend interactivity.
 *
 * Enhances native <details>/<summary> with:
 * - Smooth expand/collapse animation (CSS transitions)
 * - Single-open mode (closes siblings when one opens)
 * - Respects data-allow-multiple and data-default-open attributes
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

		// Open the default item if set.
		if ( defaultOpen >= 0 && items[ defaultOpen ] ) {
			items[ defaultOpen ].setAttribute( 'open', '' );
		}

		// Animate and handle exclusive open.
		items.forEach( ( details ) => {
			const summary = details.querySelector( 'summary' );
			const content = details.querySelector(
				'.sgs-accordion-item__content'
			);

			if ( ! summary || ! content ) {
				return;
			}

			// Wrap content for animation.
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

			summary.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const isOpen = details.hasAttribute( 'open' );

				if ( isOpen ) {
					// Close this item with animation.
					closeItem( details, content, wrapper );
				} else {
					// Close siblings first (if single-open mode).
					if ( ! allowMultiple ) {
						items.forEach( ( sibling ) => {
							if (
								sibling !== details &&
								sibling.hasAttribute( 'open' )
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
										sibWrapper
									);
								}
							}
						} );
					}
					// Open this item with animation.
					openItem( details, content, wrapper );
				}
			} );
		} );
	} );
}

/**
 * Open an accordion item with smooth animation.
 */
function openItem( details, content, wrapper ) {
	details.setAttribute( 'open', '' );
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
			},
			{ once: true }
		);
	} );
}

/**
 * Close an accordion item with smooth animation.
 */
function closeItem( details, content, wrapper ) {
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
