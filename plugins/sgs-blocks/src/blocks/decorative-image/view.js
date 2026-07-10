/**
 * Decorative Image — frontend interactivity.
 *
 * Implements parallax scroll effect only. Uses IntersectionObserver +
 * requestAnimationFrame for smooth, performant scroll-linked transforms.
 * Respects prefers-reduced-motion. Less than 1KB minified.
 *
 * NO-INLINE (no-inline styling contract §A, 2026-07-10): the base
 * position/transform/opacity declarations live in the block's own scoped
 * `<style>` (render.php), never inline. This script therefore never writes
 * `img.style.transform` / `img.style.opacity` directly — it only mutates the
 * two CSS CUSTOM PROPERTIES the scoped rule reads (`--sgs-di-py` for the
 * parallax translateY offset, `--sgs-di-op` for the fade-on-scroll opacity).
 * A `--var: value` is a value, not a CSS property declaration, so the
 * element carries zero inline property declarations at any point in its
 * lifecycle. (Writing `img.style.transform` directly would also have
 * SILENTLY DROPPED the scoped translate/rotate/flip declaration — inline
 * `style.transform` always wins over the scoped stylesheet rule by
 * specificity, so any JS-set transform simply replaces it. Composing via
 * `translateY(var(--sgs-di-py, 0px))` inside the scoped rule avoids that.)
 *
 * @package SGS\Blocks
 */

function initDecorativeImageEffects() {
	// Check for reduced motion preference.
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	// Find images with parallax or fade-on-scroll enabled.
	const parallaxImages = prefersReducedMotion
		? []
		: Array.from( document.querySelectorAll( '.sgs-decorative-image[data-parallax]' ) );

	const fadeImages = prefersReducedMotion
		? []
		: Array.from( document.querySelectorAll( '.sgs-decorative-image[data-fade-on-scroll]' ) );

	const activeImages = [ ...new Set( [ ...parallaxImages, ...fadeImages ] ) ];

	if ( activeImages.length === 0 ) {
		return;
	}

	// Track images currently in (or near) the viewport.
	const visibleImages = new Set();

	// Intersection Observer — start slightly outside viewport so effects
	// begin before the image is fully on-screen.
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
			rootMargin: '20% 0px',
		}
	);

	activeImages.forEach( ( img ) => observer.observe( img ) );

	// Combined scroll handler — parallax + fade in one rAF loop.
	let ticking = false;

	function applyEffects() {
		visibleImages.forEach( ( img ) => {
			const rect = img.getBoundingClientRect();
			const windowHeight = window.innerHeight;

			// Scroll progress through the viewport: 0 (top of vp) → 1 (bottom of vp).
			const scrollProgress =
				( windowHeight - rect.top ) / ( windowHeight + rect.height );

			// ── Parallax ──────────────────────────────────────────────────────────
			const parallaxStrength =
				parseFloat( img.getAttribute( 'data-parallax' ) ) || 0;

			if ( parallaxStrength !== 0 ) {
				const offset = ( scrollProgress - 0.5 ) * parallaxStrength * 2;
				// Custom-property VALUE only — the scoped <style> rule composes
				// this into the full transform (translate/rotate/flip + this
				// offset). Never set img.style.transform directly here.
				img.style.setProperty( '--sgs-di-py', `${ offset }px` );
			}

			// ── Fade on scroll ────────────────────────────────────────────────────
			// Opacity fades from 1 (element fully in viewport) to 0 (scrolled
			// past the top of the viewport). Progress > 1 means element is above vp.
			if ( img.hasAttribute( 'data-fade-on-scroll' ) ) {
				// clamp: 1 when progress ≤ 0.7, fading out as it approaches 1.
				const fadeOpacity = Math.max( 0, Math.min( 1, ( 1 - scrollProgress ) / 0.3 ) );
				// Custom-property VALUE only — the scoped <style> rule reads
				// var(--sgs-di-op, <base opacity>).
				img.style.setProperty( '--sgs-di-op', String( fadeOpacity ) );
			}
		} );

		ticking = false;
	}

	function onScroll() {
		if ( ! ticking ) {
			requestAnimationFrame( applyEffects );
			ticking = true;
		}
	}

	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Apply on initial load so above-the-fold images start correctly.
	applyEffects();
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initDecorativeImageEffects );
} else {
	initDecorativeImageEffects();
}
