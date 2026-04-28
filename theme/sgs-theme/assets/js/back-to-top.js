/**
 * Back to Top — theme version.
 */
( function() {
	function initBackToTop( btn ) {
		function toggleVisibility() {
			const threshold = parseInt( btn.dataset.threshold, 10 ) || 200;
			const shouldShow = window.scrollY > threshold;
			btn.hidden = ! shouldShow;
			btn.setAttribute( 'aria-hidden', String( ! shouldShow ) );
		}

		btn.addEventListener( 'click', () => {
			window.scrollTo( { top: 0, behavior: 'smooth' } );
		} );

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

		toggleVisibility();
	}

	document.addEventListener( 'DOMContentLoaded', () => {
		const btn = document.getElementById( 'sgs-back-to-top' );
		if ( btn ) {
			initBackToTop( btn );
		}
	} );
} )();
