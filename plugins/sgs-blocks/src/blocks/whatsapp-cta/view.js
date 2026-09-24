/**
 * SGS WhatsApp CTA — floating button visibility logic.
 *
 * Shows the floating WhatsApp button after the user scrolls past a
 * per-instance threshold (render.php's `data-scroll-threshold`, sourced from
 * the `floatingScrollThreshold` attribute). 0 = always visible (the default,
 * so an existing floating button with no threshold configured is unaffected).
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const floatingBtns = document.querySelectorAll(
	'.sgs-whatsapp-cta--floating'
);

if ( floatingBtns.length ) {
	const toggleVisibility = () => {
		floatingBtns.forEach( ( btn ) => {
			const threshold = parseInt( btn.dataset.scrollThreshold, 10 ) || 0;
			const scrolled = threshold === 0 || window.scrollY > threshold;
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
