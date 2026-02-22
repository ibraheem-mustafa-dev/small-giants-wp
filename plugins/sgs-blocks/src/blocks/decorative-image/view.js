/**
 * Decorative Image — frontend interactivity.
 *
 * Implements parallax scroll effect and reveal-on-scroll animation.
 * Uses simple scroll listener (no heavy libraries) and Intersection Observer.
 *
 * @package SGS\Blocks
 */

function initDecorativeImages() {
	// Check for reduced motion preference.
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	if ( prefersReducedMotion ) {
		// Skip all animations if user prefers reduced motion.
		return;
	}

	// ─── Parallax Effect ───
	const parallaxImages = document.querySelectorAll(
		'.sgs-decorative-image--parallax[data-parallax="true"]'
	);

	if ( parallaxImages.length > 0 ) {
		// Throttle scroll events for performance.
		let ticking = false;

		function handleParallaxScroll() {
			if ( ! ticking ) {
				window.requestAnimationFrame( () => {
					parallaxImages.forEach( ( wrapper ) => {
						const img = wrapper.querySelector(
							'.sgs-decorative-image__img'
						);
						if ( ! img ) {
							return;
						}

						const rect = wrapper.getBoundingClientRect();
						const windowHeight = window.innerHeight;

						// Only apply parallax when element is in viewport.
						if (
							rect.top < windowHeight &&
							rect.bottom > 0
						) {
							// Calculate scroll progress through viewport.
							const scrollProgress =
								( windowHeight - rect.top ) /
								( windowHeight + rect.height );

							// Parallax intensity (adjust multiplier to taste).
							const offset = scrollProgress * 50 - 25;

							img.style.transform = `translateY(${ offset }px)`;
						}
					} );
					ticking = false;
				} );

				ticking = true;
			}
		}

		window.addEventListener( 'scroll', handleParallaxScroll, {
			passive: true,
		} );

		// Run once on load.
		handleParallaxScroll();
	}

	// ─── Reveal on Scroll Effect ───
	const revealImages = document.querySelectorAll(
		'.sgs-decorative-image--reveal'
	);

	if ( revealImages.length > 0 && 'IntersectionObserver' in window ) {
		const revealObserver = new IntersectionObserver(
			( entries ) => {
				entries.forEach( ( entry ) => {
					if ( entry.isIntersecting ) {
						entry.target.classList.add( 'sgs-revealed' );
						// Optionally stop observing once revealed.
						revealObserver.unobserve( entry.target );
					}
				} );
			},
			{
				threshold: 0.2, // Trigger when 20% of the image is visible.
				rootMargin: '0px 0px -50px 0px', // Reveal slightly before entering viewport.
			}
		);

		revealImages.forEach( ( img ) => {
			revealObserver.observe( img );
		} );
	}
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initDecorativeImages );
} else {
	initDecorativeImages();
}
