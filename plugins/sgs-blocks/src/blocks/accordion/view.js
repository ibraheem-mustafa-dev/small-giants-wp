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

			// Guard flag: prevents the toggle listener re-firing when closeItem
		// programmatically removes the open attribute at animation end.
		let animating = false;

		details.addEventListener( 'toggle', () => {
				// Skip programmatic toggles triggered by our own animation code.
				if ( animating ) {
					return;
				}

				// The native toggle has already updated details.open.
				// We use this event so we always know the new state without
				// needing e.preventDefault(), preserving progressive enhancement.
				if ( details.open ) {
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
										sibWrapper,
										() => { animating = false; }
									);
								}
							}
						} );
					}
					// Animate the newly-opened item.
					openItem( details, content, wrapper );
				} else {
					// Native already removed open — restore it so closeItem
					// can measure and animate the collapse, then removes it.
					animating = true;
					details.setAttribute( 'open', '' );
					closeItem( details, content, wrapper, () => {
						animating = false;
					} );
				}
			} );
		} );
	} );
}

/**
 * Open an accordion item with smooth animation.
 *
 * The native <details> toggle has already set the open attribute before this
 * is called, so content is already visible. We animate from 0 to full height.
 */
function openItem( details, content, wrapper ) {
	// details is already open — measure the natural height, then animate from 0.
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
 *
 * @param {HTMLElement}  details    The <details> element.
 * @param {HTMLElement}  content    The content wrapper element.
 * @param {HTMLElement}  wrapper    The inner content element used for height measurement.
 * @param {Function|undefined} onComplete Optional callback fired after animation completes.
 */
function closeItem( details, content, wrapper, onComplete ) {
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
				if ( 'function' === typeof onComplete ) {
					onComplete();
				}
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
