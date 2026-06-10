/**
 * Product FAQ — frontend view module.
 *
 * Native <details>/<summary> handles the disclosure behaviour without JS.
 * This module only keeps aria-expanded on each <summary> in sync with the
 * open state, for legacy screen readers that do not announce the native
 * <details> state. The `toggle` event does not bubble, so we listen in the
 * capture phase on each FAQ wrapper.
 * @param {HTMLElement} details The <details> element that toggled.
 */
const syncAria = ( details ) => {
	const summary = details.querySelector(
		':scope > .sgs-product-faq-item__question'
	);
	if ( summary ) {
		summary.setAttribute(
			'aria-expanded',
			details.open ? 'true' : 'false'
		);
	}
};

document.querySelectorAll( '.sgs-product-faq' ).forEach( ( faq ) => {
	faq.addEventListener(
		'toggle',
		( event ) => {
			if ( 'DETAILS' === event.target?.tagName ) {
				syncAria( event.target );
			}
		},
		true
	);
} );
