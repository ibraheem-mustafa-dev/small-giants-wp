/**
 * SGS Counter — count-up animation.
 *
 * Finds all .sgs-counter elements and animates the number when scrolled
 * into view. Progressive enhancement: final number is already in the
 * markup, so this is a visual enhancement only.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const counters = document.querySelectorAll( '.sgs-counter' );

if (
	counters.length &&
	! window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches &&
	typeof IntersectionObserver !== 'undefined'
) {
	/**
	 * Format a number with en-GB thousand separators.
	 *
	 * @param {number}  num          The number to format.
	 * @param {boolean} useSeparator Whether to add separators.
	 * @return {string} Formatted string.
	 */
	const formatNumber = ( num, useSeparator ) => {
		const rounded = Math.round( num );
		if ( useSeparator ) {
			return rounded.toLocaleString( 'en-GB' );
		}
		return String( rounded );
	};

	/**
	 * Animate a single counter element from 0 to its target.
	 *
	 * @param {Element} counterEl The .sgs-counter wrapper element.
	 */
	const animateCounter = ( counterEl ) => {
		const numberEl = counterEl.querySelector( '.sgs-counter__number' );
		if ( ! numberEl ) {
			return;
		}

		const target = parseInt( numberEl.dataset.target, 10 );
		if ( isNaN( target ) || target === 0 ) {
			return;
		}

		const duration = parseInt( numberEl.dataset.duration || '2000', 10 );
		const useSeparator = numberEl.dataset.separator === 'true';
		const prefix = numberEl.dataset.prefix || '';
		const suffix = numberEl.dataset.suffix || '';

		const startTime = performance.now();

		const step = ( currentTime ) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min( elapsed / duration, 1 );

			// Ease-out cubic for natural deceleration.
			const eased = 1 - Math.pow( 1 - progress, 3 );
			const current = eased * target;

			numberEl.textContent =
				prefix + formatNumber( current, useSeparator ) + suffix;

			if ( progress < 1 ) {
				requestAnimationFrame( step );
			}
		};

		// Reset to zero before animating.
		numberEl.textContent = prefix + '0' + suffix;
		requestAnimationFrame( step );
	};

	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					animateCounter( entry.target );
					observer.unobserve( entry.target );
				}
			} );
		},
		{ threshold: 0.15 }
	);

	counters.forEach( ( counter ) => observer.observe( counter ) );
}
