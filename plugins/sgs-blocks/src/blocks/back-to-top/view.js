/**
 * Back to Top — frontend interactivity.
 *
 * Shows/hides the button based on scroll position and smooth-scrolls to top on click.
 *
 * @package SGS\Blocks
 */

function initBackToTop( btn ) {
	const threshold = parseInt( btn.dataset.threshold, 10 ) || 300;

	function toggleVisibility() {
		const shouldShow = window.scrollY > threshold;
		btn.hidden = ! shouldShow;
		btn.setAttribute( 'aria-hidden', String( ! shouldShow ) );
	}

	btn.addEventListener( 'click', () => {
		window.scrollTo( { top: 0, behavior: 'smooth' } );
	} );

	// Debounced scroll listener.
	let ticking = false;
	window.addEventListener( 'scroll', () => {
		if ( ! ticking ) {
			requestAnimationFrame( () => {
				toggleVisibility();
				ticking = false;
			} );
			ticking = true;
		}
	}, { passive: true } );

	// Initial check.
	toggleVisibility();
}

document.querySelectorAll( '.sgs-back-to-top' ).forEach( initBackToTop );
