/**
 * SGS Scroll Progress Extension
 *
 * Exposes CSS custom properties on the root element reflecting the user's scroll position.
 * Designers can use var(--sgs-scroll-progress) in any CSS rule.
 * Example: .progress-bar { width: calc(var(--sgs-scroll-progress) * 100%); }
 *
 * Properties exposed:
 * --sgs-scroll-progress: 0 to 1 (clamped)
 * --sgs-scroll-y: Raw scroll position in pixels
 * --sgs-scroll-direction: -1 for up, 1 for down
 *
 * @package SGS\Blocks
 */

(function() {
	'use strict';

	let lastScrollY = window.scrollY;
	let ticking = false;

	/**
	 * Update scroll progress and other CSS variables.
	 */
	function update() {
		const scrollY = window.scrollY;
		const scrollHeight = document.documentElement.scrollHeight;
		const innerHeight = window.innerHeight;
		const scrollRange = scrollHeight - innerHeight;

		// Calculate progress (0 to 1).
		let progress = 0;
		if (scrollRange > 0) {
			progress = scrollY / scrollRange;
		}

		// Clamp progress between 0 and 1.
		progress = Math.max(0, Math.min(1, progress));

		// Determine direction: 1 for down, -1 for up.
		const direction = scrollY > lastScrollY ? 1 : -1;

		// Update CSS custom properties on the root element.
		const root = document.documentElement;
		root.style.setProperty('--sgs-scroll-progress', progress.toFixed(4));
		root.style.setProperty('--sgs-scroll-y', Math.round(scrollY) + 'px');
		root.style.setProperty('--sgs-scroll-direction', direction);

		lastScrollY = scrollY;
		ticking = false;
	}

	/**
	 * Request an update via requestAnimationFrame for performance.
	 */
	function requestUpdate() {
		if (!ticking) {
			requestAnimationFrame(update);
			ticking = true;
		}
	}

	// Initial update.
	document.addEventListener('DOMContentLoaded', update);

	// Update on scroll and resize.
	window.addEventListener('scroll', requestUpdate, { passive: true });
	window.addEventListener('resize', requestUpdate, { passive: true });

})();
