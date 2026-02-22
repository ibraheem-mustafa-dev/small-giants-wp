/**
 * Back to Top — frontend interactivity.
 *
 * Shows/hides the button based on scroll position.
 * Uses IntersectionObserver for performance.
 *
 * @package SGS\Blocks
 */

function initBackToTop() {
	const buttons = document.querySelectorAll( '.sgs-back-to-top' );

	buttons.forEach( ( btn ) => {
		const showAfter = parseInt( btn.dataset.showAfter || '300', 10 );

		// Create a sentinel element at the threshold.
		const sentinel = document.createElement( 'div' );
		sentinel.style.cssText = 'position:absolute;top:' + showAfter + 'px;width:1px;height:1px;pointer-events:none';
		sentinel.setAttribute( 'aria-hidden', 'true' );
		document.body.appendChild( sentinel );

		const observer = new IntersectionObserver(
			( entries ) => {
				// When sentinel is NOT visible, user has scrolled past it.
				entries.forEach( ( entry ) => {
					btn.classList.toggle( 'sgs-back-to-top--visible', ! entry.isIntersecting );
				} );
			},
			{ threshold: 0 }
		);

		observer.observe( sentinel );

		btn.addEventListener( 'click', () => {
			window.scrollTo( { top: 0, behavior: 'smooth' } );
		} );
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initBackToTop );
} else {
	initBackToTop();
}
