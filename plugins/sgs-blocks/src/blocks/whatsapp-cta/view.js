/**
 * SGS WhatsApp CTA — floating button visibility logic.
 *
 * Shows floating WhatsApp button after user scrolls past 300px.
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const floatingBtns = document.querySelectorAll(
	'.sgs-whatsapp-cta--floating'
);

if ( floatingBtns.length ) {
	const SCROLL_THRESHOLD = 300;

	const toggleVisibility = () => {
		const scrolled = window.scrollY > SCROLL_THRESHOLD;
		floatingBtns.forEach( ( btn ) => {
			btn.classList.toggle( 'sgs-whatsapp-cta--visible', scrolled );
		} );
	};

	/* Initial check */
	toggleVisibility();

	/* Throttled scroll listener */
	let ticking = false;
	window.addEventListener(
		'scroll',
		() => {
			if ( ! ticking ) {
				requestAnimationFrame( () => {
					toggleVisibility();
					ticking = false;
				} );
				ticking = true;
			}
		},
		{ passive: true }
	);
}
