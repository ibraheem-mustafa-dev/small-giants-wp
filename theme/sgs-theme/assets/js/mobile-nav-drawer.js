/**
 * SGS Theme — Mobile Navigation Drawer
 *
 * Handles open/close behaviour, clones the desktop nav into the drawer,
 * builds submenu toggles, and maintains full keyboard accessibility
 * with focus trapping and ARIA state management.
 *
 * @package SGS\Theme
 */

(function () {
	'use strict';

	/**
	 * Initialise the mobile navigation drawer when the DOM is ready.
	 */
	function init() {
		var drawer   = document.querySelector('.sgs-mobile-nav-drawer');
		var backdrop = document.querySelector('.sgs-mobile-nav-drawer__backdrop');
		var toggle   = document.querySelector('.sgs-mobile-nav-toggle');
		var closeBtn = document.querySelector('.sgs-mobile-nav-drawer__close');
		var content  = document.querySelector('.sgs-mobile-nav-drawer__content');

		if (!drawer || !backdrop || !toggle || !closeBtn || !content) {
			return;
		}

		// Clone desktop nav into the drawer before setting up interactions.
		cloneDesktopNav(content);

		// Build submenu toggles for items that have sub-navigation.
		buildSubmenuToggles(content);

		// Focus trap state.
		var firstFocusable = null;
		var lastFocusable  = null;

		/**
		 * Open the drawer.
		 */
		function openDrawer() {
			var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			document.documentElement.style.setProperty('--sgs-scrollbar-width', scrollbarWidth + 'px');

			drawer.classList.add('is-open');
			backdrop.classList.add('is-open');
			document.body.classList.add('sgs-mobile-nav-drawer-open');

			drawer.setAttribute('aria-hidden', 'false');
			toggle.setAttribute('aria-expanded', 'true');

			refreshFocusTrap();
			closeBtn.focus();
		}

		/**
		 * Close the drawer.
		 */
		function closeDrawer() {
			drawer.classList.remove('is-open');
			backdrop.classList.remove('is-open');
			document.body.classList.remove('sgs-mobile-nav-drawer-open');

			drawer.setAttribute('aria-hidden', 'true');
			toggle.setAttribute('aria-expanded', 'false');

			toggle.focus();
			document.documentElement.style.removeProperty('--sgs-scrollbar-width');
		}

		/**
		 * Recalculate focusable elements — called each time the drawer opens
		 * (submenus may have changed since last open).
		 */
		function refreshFocusTrap() {
			var all = Array.from(
				drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
			);
			// Exclude items inside collapsed submenus.
			var visible = all.filter(function (el) {
				var submenu = el.closest('.sgs-drawer-submenu');
				return !submenu || submenu.classList.contains('is-open');
			});
			firstFocusable = visible[0] || null;
			lastFocusable  = visible[visible.length - 1] || null;
		}

		/**
		 * Trap keyboard focus inside the drawer while it is open.
		 */
		function trapFocus(event) {
			if (!drawer.classList.contains('is-open')) {
				return;
			}

			if (event.key === 'Escape') {
				closeDrawer();
				return;
			}

			if (event.key !== 'Tab' || !firstFocusable || !lastFocusable) {
				return;
			}

			if (event.shiftKey) {
				if (document.activeElement === firstFocusable) {
					event.preventDefault();
					lastFocusable.focus();
				}
			} else {
				if (document.activeElement === lastFocusable) {
					event.preventDefault();
					firstFocusable.focus();
				}
			}
		}

		// Wire up event listeners.
		toggle.addEventListener('click', openDrawer);
		closeBtn.addEventListener('click', closeDrawer);
		backdrop.addEventListener('click', closeDrawer);
		document.addEventListener('keydown', trapFocus);

		// Close drawer when a real nav link is clicked.
		drawer.addEventListener('click', function (event) {
			var link = event.target.closest('a[href]');
			if (link && drawer.contains(link)) {
				setTimeout(closeDrawer, 80);
			}
		});

		// Set initial ARIA state.
		drawer.setAttribute('aria-hidden', 'true');
		toggle.setAttribute('aria-expanded', 'false');
	}

	/**
	 * Clone the desktop navigation container into the drawer content area.
	 *
	 * The desktop nav container may be hidden via display:none on mobile —
	 * we must NOT filter by visibility here. We find it purely by DOM location
	 * (inside header, outside the drawer).
	 *
	 * @param {Element} content - The drawer content container.
	 */
	function cloneDesktopNav(content) {
		var candidates = document.querySelectorAll('header .wp-block-navigation__container');
		var desktopNav = null;

		for (var i = 0; i < candidates.length; i++) {
			if (!candidates[i].closest('.sgs-mobile-nav-drawer')) {
				desktopNav = candidates[i];
				break;
			}
		}

		if (!desktopNav) {
			return;
		}

		var clone = desktopNav.cloneNode(true);

		// Remove IDs to prevent duplicates in the document.
		var withIds = clone.querySelectorAll('[id]');
		for (var j = 0; j < withIds.length; j++) {
			withIds[j].removeAttribute('id');
		}

		// Remove desktop-specific ARIA attributes managed by WP.
		var withControls = clone.querySelectorAll('[aria-controls]');
		for (var k = 0; k < withControls.length; k++) {
			withControls[k].removeAttribute('aria-controls');
		}

		var withExpanded = clone.querySelectorAll('[aria-expanded]');
		for (var l = 0; l < withExpanded.length; l++) {
			withExpanded[l].removeAttribute('aria-expanded');
		}

		// Remove WP core submenu containers — we build our own accordion below.
		var subContainers = clone.querySelectorAll('.wp-block-navigation__submenu-container');
		for (var m = 0; m < subContainers.length; m++) {
			subContainers[m].remove();
		}

		// Remove WP core responsive overlay containers (mega-menus use these).
		var responsiveContainers = clone.querySelectorAll('.wp-block-navigation__responsive-container');
		for (var rc = 0; rc < responsiveContainers.length; rc++) {
			responsiveContainers[rc].remove();
		}

		// Remove custom SGS mega-menu panels and backdrops.
		var megaPanels = clone.querySelectorAll('.sgs-mega-menu__panel, .sgs-mega-menu__backdrop, .sgs-mega-menu__dropdown');
		for (var mp = 0; mp < megaPanels.length; mp++) {
			megaPanels[mp].remove();
		}

		// Remove WP core chevron icons on desktop nav links.
		var subIcons = clone.querySelectorAll('.wp-block-navigation__submenu-icon');
		for (var n = 0; n < subIcons.length; n++) {
			subIcons[n].remove();
		}

		content.appendChild(clone);
	}

	/**
	 * For each nav item that has sub-items (has-child class), fetch the submenu
	 * links from the original desktop DOM and build a mobile accordion toggle.
	 *
	 * @param {Element} content - The drawer content container.
	 */
	function buildSubmenuToggles(content) {
		var desktopItems = document.querySelectorAll(
			'header .wp-block-navigation__container > .wp-block-navigation-item.has-child'
		);

		var drawerItems = content.querySelectorAll('.wp-block-navigation-item.has-child');

		for (var i = 0; i < drawerItems.length; i++) {
			(function (drawerItem, index) {
				var desktopItem = desktopItems[index];
				if (!desktopItem) {
					return;
				}

				var subLinks = desktopItem.querySelectorAll('.wp-block-navigation__submenu-container a');
				if (subLinks.length === 0) {
					return;
				}

				// Build wrapper row: link text + chevron toggle side by side.
				var row = document.createElement('div');
				row.className = 'sgs-drawer-nav-row';

				var navLink = drawerItem.querySelector('.wp-block-navigation-item__content');
				if (navLink) {
					row.appendChild(navLink.cloneNode(true));
				}

				// Build chevron toggle button using DOM methods (no innerHTML).
				var toggleBtn = document.createElement('button');
				toggleBtn.className = 'sgs-drawer-submenu-toggle';
				toggleBtn.setAttribute('aria-expanded', 'false');
				toggleBtn.setAttribute('aria-label', 'Toggle sub-menu');

				var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('width', '18');
				svg.setAttribute('height', '18');
				svg.setAttribute('viewBox', '0 0 24 24');
				svg.setAttribute('fill', 'none');
				svg.setAttribute('aria-hidden', 'true');

				var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', 'M6 9l6 6 6-6');
				path.setAttribute('stroke', 'currentColor');
				path.setAttribute('stroke-width', '2');
				path.setAttribute('stroke-linecap', 'round');
				path.setAttribute('stroke-linejoin', 'round');

				svg.appendChild(path);
				toggleBtn.appendChild(svg);
				row.appendChild(toggleBtn);

				// Build the submenu list.
				var submenu = document.createElement('div');
				submenu.className = 'sgs-drawer-submenu';

				for (var s = 0; s < subLinks.length; s++) {
					var a = document.createElement('a');
					a.href = subLinks[s].href;
					a.textContent = subLinks[s].textContent.trim();
					var ariaCurrent = subLinks[s].getAttribute('aria-current');
					if (ariaCurrent) {
						a.setAttribute('aria-current', ariaCurrent);
					}
					submenu.appendChild(a);
				}

				// Replace item contents with row + submenu.
				while (drawerItem.firstChild) {
					drawerItem.removeChild(drawerItem.firstChild);
				}
				drawerItem.appendChild(row);
				drawerItem.appendChild(submenu);

				// Toggle submenu on button click.
				toggleBtn.addEventListener('click', function () {
					var isOpen = submenu.classList.contains('is-open');

					// Collapse other open submenus.
					var openMenus = content.querySelectorAll('.sgs-drawer-submenu.is-open');
					for (var o = 0; o < openMenus.length; o++) {
						if (openMenus[o] !== submenu) {
							openMenus[o].classList.remove('is-open');
							var prevRow = openMenus[o].previousElementSibling;
							if (prevRow) {
								var otherBtn = prevRow.querySelector('.sgs-drawer-submenu-toggle');
								if (otherBtn) {
									otherBtn.setAttribute('aria-expanded', 'false');
								}
							}
						}
					}

					if (isOpen) {
						submenu.classList.remove('is-open');
						toggleBtn.setAttribute('aria-expanded', 'false');
					} else {
						submenu.classList.add('is-open');
						toggleBtn.setAttribute('aria-expanded', 'true');
					}
				});

			}(drawerItems[i], i));
		}
	}

	// Run init when the DOM is ready.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}());
