/**
 * SGS Theme — Off-Canvas Mobile Navigation Drawer
 *
 * Handles open/close behaviour, focus trapping, and accessibility.
 * Replaces WordPress core's full-screen overlay navigation.
 *
 * @package SGS\Theme
 */

(function () {
	'use strict';

	/**
	 * Initialise mobile navigation drawer when DOM is ready.
	 */
	function init() {
		const drawer = document.querySelector('.sgs-mobile-nav-drawer');
		const backdrop = document.querySelector('.sgs-mobile-nav-drawer__backdrop');
		const toggleButton = document.querySelector('.sgs-mobile-nav-toggle');
		const closeButton = document.querySelector('.sgs-mobile-nav-drawer__close');

		if (!drawer || !backdrop || !toggleButton || !closeButton) {
			return; // Drawer markup not present (desktop only or missing template).
		}

		// Store focusable elements for focus trapping.
		let focusableElements = [];
		let firstFocusable = null;
		let lastFocusable = null;

		/**
		 * Open the drawer.
		 */
		function openDrawer() {
			// Calculate scrollbar width to prevent layout shift.
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			document.documentElement.style.setProperty('--sgs-scrollbar-width', scrollbarWidth + 'px');

			// Add open classes.
			drawer.classList.add('is-open');
			backdrop.classList.add('is-open');
			document.body.classList.add('sgs-mobile-nav-drawer-open');

			// Update ARIA states.
			drawer.setAttribute('aria-hidden', 'false');
			toggleButton.setAttribute('aria-expanded', 'true');

			// Set up focus trapping.
			setupFocusTrap();

			// Move focus to close button.
			closeButton.focus();
		}

		/**
		 * Close the drawer.
		 */
		function closeDrawer() {
			drawer.classList.remove('is-open');
			backdrop.classList.remove('is-open');
			document.body.classList.remove('sgs-mobile-nav-drawer-open');

			// Update ARIA states.
			drawer.setAttribute('aria-hidden', 'true');
			toggleButton.setAttribute('aria-expanded', 'false');

			// Return focus to toggle button.
			toggleButton.focus();

			// Clean up scrollbar compensation.
			document.documentElement.style.removeProperty('--sgs-scrollbar-width');
		}

		/**
		 * Set up focus trap — keep focus inside drawer when open.
		 */
		function setupFocusTrap() {
			// Get all focusable elements inside drawer.
			focusableElements = drawer.querySelectorAll(
				'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);

			if (focusableElements.length === 0) {
				return;
			}

			firstFocusable = focusableElements[0];
			lastFocusable = focusableElements[focusableElements.length - 1];
		}

		/**
		 * Trap focus inside drawer (keyboard navigation).
		 */
		function trapFocus(event) {
			// Only trap if drawer is open.
			if (!drawer.classList.contains('is-open')) {
				return;
			}

			// Tab key pressed.
			if (event.key === 'Tab') {
				// Shift + Tab (backwards).
				if (event.shiftKey) {
					if (document.activeElement === firstFocusable) {
						event.preventDefault();
						lastFocusable.focus();
					}
				}
				// Tab (forwards).
				else {
					if (document.activeElement === lastFocusable) {
						event.preventDefault();
						firstFocusable.focus();
					}
				}
			}

			// Escape key — close drawer.
			if (event.key === 'Escape') {
				closeDrawer();
			}
		}

		// Event listeners.
		toggleButton.addEventListener('click', openDrawer);
		closeButton.addEventListener('click', closeDrawer);
		backdrop.addEventListener('click', closeDrawer);
		document.addEventListener('keydown', trapFocus);

		// Close drawer when a nav link is clicked (navigate to new page).
		const navLinks = drawer.querySelectorAll('.wp-block-navigation-item__content');
		navLinks.forEach(function (link) {
			link.addEventListener('click', function () {
				// Small delay to allow navigation to start before closing.
				setTimeout(closeDrawer, 100);
			});
		});

		// Initial ARIA states (drawer closed by default).
		drawer.setAttribute('aria-hidden', 'true');
		toggleButton.setAttribute('aria-expanded', 'false');
	}

	// Run init when DOM is ready.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
