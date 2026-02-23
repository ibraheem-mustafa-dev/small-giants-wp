/**
 * Decorative Image — frontend interactivity.
 *
 * Implements parallax scroll effect only. Uses IntersectionObserver +
 * requestAnimationFrame for smooth, performant scroll-linked transforms.
 * Respects prefers-reduced-motion. Less than 1KB minified.
 *
 * @package SGS\Blocks
 */

function initDecorativeImageParallax() {
	// Check for reduced motion preference.
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	if ( prefersReducedMotion ) {
		// Skip all parallax if user prefers reduced motion.
		return;
	}

	// Find all decorative images with parallax enabled.
	const parallaxImages = document.querySelectorAll(
		'.sgs-decorative-image[data-parallax]'
	);

	if ( parallaxImages.length === 0 ) {
		return;
	}

	// Track images currently in viewport.
	const visibleImages = new Set();

	// Intersection Observer to track which images are in viewport.
	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					visibleImages.add( entry.target );
				} else {
					visibleImages.delete( entry.target );
				}
			} );
		},
		{
			rootMargin: '20% 0px', // Start parallax slightly before/after viewport.
		}
	);

	// Observe all parallax images.
	parallaxImages.forEach( ( img ) => {
		observer.observe( img );
	} );

	// Parallax scroll handler using requestAnimationFrame.
	let ticking = false;

	function applyParallax() {
		visibleImages.forEach( ( img ) => {
			const parallaxStrength =
				parseFloat( img.getAttribute( 'data-parallax' ) ) || 0;

			if ( parallaxStrength === 0 ) {
				return;
			}

			const rect = img.getBoundingClientRect();
			const windowHeight = window.innerHeight;

			// Calculate scroll progress through viewport (0 to 1).
			const scrollProgress =
				( windowHeight - rect.top ) / ( windowHeight + rect.height );

			// Parallax offset based on scroll progress and strength.
			// Range: -parallaxStrength to +parallaxStrength pixels.
			const offset = ( scrollProgress - 0.5 ) * parallaxStrength * 2;

			// Get existing transform and replace translateY.
			const currentTransform = img.style.transform || '';
			const baseTransform = currentTransform.replace(
				/translateY\([^)]+\)/g,
				''
			);

			img.style.transform = `${ baseTransform } translateY(${ offset }px)`.trim();
		} );

		ticking = false;
	}

	function onScroll() {
		if ( ! ticking ) {
			requestAnimationFrame( applyParallax );
			ticking = true;
		}
	}

	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Apply parallax on initial load.
	applyParallax();
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener(
		'DOMContentLoaded',
		initDecorativeImageParallax
	);
} else {
	initDecorativeImageParallax();
}
