/**
 * SGS Trust Bar — count-up animation for numeric values.
 *
 * Targets .sgs-trust-bar__value elements that have a data-target attribute.
 * Non-numeric values are left untouched.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const animatedValues = document.querySelectorAll(
	'.sgs-trust-bar__value[data-target]'
);

if (
	animatedValues.length &&
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
	 * Animate a single value element from 0 to its target.
	 *
	 * @param {Element} valueEl The .sgs-trust-bar__value element.
	 */
	const animateValue = ( valueEl ) => {
		const target = parseInt( valueEl.dataset.target, 10 );
		if ( isNaN( target ) || target === 0 ) {
			return;
		}

		const useSeparator = valueEl.dataset.separator === 'true';
		const suffix = valueEl.dataset.suffix || '';
		const duration = 2000;
		const startTime = performance.now();

		const step = ( currentTime ) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min( elapsed / duration, 1 );

			// Ease-out cubic for natural deceleration.
			const eased = 1 - Math.pow( 1 - progress, 3 );
			const current = eased * target;

			valueEl.textContent =
				formatNumber( current, useSeparator ) + suffix;

			if ( progress < 1 ) {
				requestAnimationFrame( step );
			}
		};

		// Reset to zero before animating.
		valueEl.textContent = '0' + suffix;
		requestAnimationFrame( step );
	};

	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					animateValue( entry.target );
					observer.unobserve( entry.target );
				}
			} );
		},
		{ threshold: 0.15 }
	);

	animatedValues.forEach( ( el ) => observer.observe( el ) );
}
