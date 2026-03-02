/**
 * SGS Mega Menu — Frontend Interactivity (Interactivity API)
 *
 * Handles:
 * - Hover / click toggle (desktop)
 * - Tap toggle with accordion animation (mobile ≤ 1024 px)
 * - Configurable close delay on mouse-out (hover mode)
 * - Layout variants: full-width, contained, columns, flyout
 * - WCAG 2.2 AA keyboard navigation
 *   - Trigger: Enter/Space/ArrowDown/ArrowLeft/ArrowRight
 *   - Panel: Escape, Tab (focus trap), ArrowUp/ArrowDown
 * - Auto-close sibling menus (single-open)
 * - Focus management on open / close
 *
 * @since 1.0.0
 * @since 1.1.0 Close delay, flyout backdrop, mobile accordion,
 *              focus trapping, ArrowUp/Down within panel.
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

// ── Module-level close-timer registry ────────────────────────────────────
// Keyed by menuId so that overlapping enter/leave events don't conflict.
const closeTimers = new Map();

/**
 * Collect all focusable elements within a container.
 *
 * @param {Element} container
 * @returns {Element[]}
 */
function getFocusable( container ) {
	return Array.from(
		container.querySelectorAll(
			'a[href], button:not([disabled]), input:not([disabled]),'
			+ ' textarea:not([disabled]), select:not([disabled]),'
			+ ' [tabindex]:not([tabindex="-1"])'
		)
	);
}

/**
 * Return true when running on a touch / narrow viewport (mobile mode).
 *
 * @returns {boolean}
 */
function isMobileViewport() {
	return window.matchMedia( '(max-width: 1024px)' ).matches;
}

// ── Interactivity API store ───────────────────────────────────────────────

const { state } = store( 'sgs/mega-menu', {
	state: {
		/** ID of the currently open menu — shared across all instances. */
		openMenuId: null,
	},

	actions: {
		// ── Open / Close ──────────────────────────────────────────────────

		/**
		 * Toggle panel visibility (click / tap handler).
		 */
		toggle() {
			const ctx       = getContext();
			const { ref }   = getElement();
			const wasOpen   = ctx.isOpen;

			ctx.isOpen      = ! wasOpen;
			state.openMenuId = ctx.isOpen ? ctx.menuId : null;

			// On mobile, animate accordion max-height.
			if ( isMobileViewport() && ! ctx.isFlyout ) {
				const panel = ref.querySelector( '.sgs-mega-menu__panel' );
				if ( panel ) {
					if ( ctx.isOpen ) {
						// Allow browser to paint "display: block" first.
						requestAnimationFrame( () => {
							panel.style.maxHeight = panel.scrollHeight + 'px';
						} );
					} else {
						panel.style.maxHeight = '0';
					}
				}
			}

			// Reset search input when closing a search-in-menu panel.
			if ( ! ctx.isOpen ) {
				const searchInput = ref.querySelector( '.sgs-mega-menu__search-input' );
				if ( searchInput && searchInput.value ) {
					searchInput.value = '';
					searchInput.dispatchEvent( new Event( 'input', { bubbles: true } ) );
				}
			}

			// Focus first focusable element in panel when opening.
			if ( ctx.isOpen ) {
				const panel = ref.querySelector( '.sgs-mega-menu__panel' );
				if ( panel ) {
					requestAnimationFrame( () => {
						const first = getFocusable( panel )[ 0 ];
						if ( first ) {
							first.focus();
						}
					} );
				}
			}
		},

		/**
		 * Open panel on mouse-enter (desktop hover mode).
		 * Cancels any pending close timer.
		 */
		openOnHover() {
			const ctx = getContext();
			if ( ctx.openOn !== 'hover' || isMobileViewport() ) {
				return;
			}

			// Cancel pending close for this menu.
			const existing = closeTimers.get( ctx.menuId );
			if ( existing ) {
				clearTimeout( existing );
				closeTimers.delete( ctx.menuId );
			}

			ctx.isOpen       = true;
			state.openMenuId = ctx.menuId;
		},

		/**
		 * Close panel on mouse-leave (desktop hover mode).
		 * Respects configurable close delay.
		 */
		closeOnHover() {
			const ctx = getContext();
			if ( ctx.openOn !== 'hover' || isMobileViewport() ) {
				return;
			}

			const delay = typeof ctx.closeDelay === 'number'
				? ctx.closeDelay
				: 300;

			if ( delay <= 0 ) {
				ctx.isOpen = false;
				if ( state.openMenuId === ctx.menuId ) {
					state.openMenuId = null;
				}
				return;
			}

			const timer = setTimeout( () => {
				ctx.isOpen = false;
				if ( state.openMenuId === ctx.menuId ) {
					state.openMenuId = null;
				}
				closeTimers.delete( ctx.menuId );
			}, delay );

			closeTimers.set( ctx.menuId, timer );
		},

		// ── Keyboard — trigger ────────────────────────────────────────────

		/**
		 * Handle keyboard events on the trigger element.
		 *
		 * Keys handled:
		 * - Enter / Space  → toggle panel
		 * - ArrowDown      → open panel, focus first item
		 * - ArrowLeft/Right → move to adjacent trigger, close panel
		 * - Escape         → close panel (redundant — panel handler covers it)
		 *
		 * @param {KeyboardEvent} event
		 */
		handleTriggerKeydown( event ) {
			const ctx     = getContext();
			const { ref } = getElement();
			const key     = event.key;

			// Enter / Space: toggle panel.
			if ( key === 'Enter' || key === ' ' ) {
				event.preventDefault();
				ctx.isOpen       = ! ctx.isOpen;
				state.openMenuId = ctx.isOpen ? ctx.menuId : null;

				if ( ctx.isOpen ) {
					const panel = ref.querySelector( '.sgs-mega-menu__panel' );
					if ( panel ) {
						requestAnimationFrame( () => {
							const first = getFocusable( panel )[ 0 ];
							if ( first ) {
								first.focus();
							}
						} );
					}
				}
				return;
			}

			// ArrowDown: open panel and focus first item.
			if ( key === 'ArrowDown' ) {
				event.preventDefault();
				if ( ! ctx.isOpen ) {
					ctx.isOpen       = true;
					state.openMenuId = ctx.menuId;
				}
				const panel = ref.querySelector( '.sgs-mega-menu__panel' );
				if ( panel ) {
					requestAnimationFrame( () => {
						const first = getFocusable( panel )[ 0 ];
						if ( first ) {
							first.focus();
						}
					} );
				}
				return;
			}

			// ArrowLeft / ArrowRight: move to adjacent top-level trigger.
			if ( key === 'ArrowLeft' || key === 'ArrowRight' ) {
				event.preventDefault();

				// Close current panel.
				ctx.isOpen = false;
				if ( state.openMenuId === ctx.menuId ) {
					state.openMenuId = null;
				}

				// Find all top-level triggers in this navigation.
				const menubar = ref.closest( '.wp-block-navigation__container' );
				if ( ! menubar ) {
					return;
				}
				const triggers = Array.from(
					menubar.querySelectorAll(
						':scope > .sgs-mega-menu > .sgs-mega-menu__trigger,'
						+ ' :scope > .wp-block-navigation-item > a'
					)
				);
				const currentIndex = triggers.indexOf( event.target );
				if ( currentIndex === -1 ) {
					return;
				}

				let nextIndex;
				if ( key === 'ArrowLeft' ) {
					nextIndex = currentIndex === 0
						? triggers.length - 1
						: currentIndex - 1;
				} else {
					nextIndex = currentIndex === triggers.length - 1
						? 0
						: currentIndex + 1;
				}

				triggers[ nextIndex ]?.focus();
				return;
			}

			// Escape: close panel.
			if ( key === 'Escape' ) {
				if ( ctx.isOpen ) {
					event.preventDefault();
					ctx.isOpen = false;
					if ( state.openMenuId === ctx.menuId ) {
						state.openMenuId = null;
					}
					event.target.focus();
				}
			}
		},

		// ── Tabbed layout ─────────────────────────────────────────────────

		/**
		 * Switch the active tab in a tabbed or side-tabs layout panel.
		 *
		 * Works for both horizontal (.sgs-mega-menu__tab) and vertical
		 * (.sgs-mega-menu__side-tab) tab buttons. The clicked tab's nearest
		 * [role="tablist"] container is used to scope the tab set.
		 *
		 * The Interactivity API directive is placed on each tab button:
		 *   data-wp-on--click="actions.switchTab"
		 *
		 * @param {MouseEvent} event
		 */
		switchTab( event ) {
			const { ref } = getElement();

			const clickedTab = event.target.closest(
				'.sgs-mega-menu__tab, .sgs-mega-menu__side-tab'
			);
			if ( ! clickedTab ) {
				return;
			}

			// Scope to the nearest tablist so nested lists don't collide.
			const tabList = clickedTab.closest( '[role="tablist"]' );
			if ( ! tabList ) {
				return;
			}

			const tabs = Array.from(
				tabList.querySelectorAll(
					'.sgs-mega-menu__tab, .sgs-mega-menu__side-tab'
				)
			);
			const tabIndex = tabs.indexOf( clickedTab );

			// Update ARIA attributes and active class on each tab.
			tabs.forEach( ( tab, i ) => {
				const isActive = i === tabIndex;
				tab.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
				tab.setAttribute( 'tabindex', isActive ? '0' : '-1' );
				tab.classList.toggle( 'is-active', isActive );
			} );

			// Show the matching panel; hide all others.
			// Both tabbed and side-tabs share the .sgs-mega-menu__tab-panel class.
			const tabPanels = Array.from(
				ref.querySelectorAll( '.sgs-mega-menu__tab-panel' )
			);
			tabPanels.forEach( ( panel, i ) => {
				panel.hidden = i !== tabIndex;
			} );
		},

		/**
		 * Handle ArrowLeft / ArrowRight keyboard navigation in a horizontal tab list.
		 *
		 * Placed on the tab-list container:
		 *   data-wp-on--keydown="actions.handleTabListKeydown"
		 *
		 * @param {KeyboardEvent} event
		 */
		handleTabListKeydown( event ) {
			const key = event.key;
			if ( key !== 'ArrowLeft' && key !== 'ArrowRight' ) {
				return;
			}

			event.preventDefault();

			const { ref } = getElement();
			const tabList = ref.querySelector( '.sgs-mega-menu__tab-list' );
			if ( ! tabList ) {
				return;
			}

			const tabs      = Array.from( tabList.querySelectorAll( '.sgs-mega-menu__tab' ) );
			const activeTab = tabs.find(
				( t ) => t.getAttribute( 'aria-selected' ) === 'true'
			);
			const currentIndex = activeTab ? tabs.indexOf( activeTab ) : 0;

			const nextIndex = key === 'ArrowLeft'
				? ( currentIndex === 0 ? tabs.length - 1 : currentIndex - 1 )
				: ( currentIndex === tabs.length - 1 ? 0 : currentIndex + 1 );

			// Trigger tab switch and move focus to the newly active tab.
			tabs[ nextIndex ]?.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
			tabs[ nextIndex ]?.focus();
		},

		/**
		 * Handle ArrowUp / ArrowDown keyboard navigation in a vertical side-tab list.
		 *
		 * Placed on the side-tab-list container:
		 *   data-wp-on--keydown="actions.handleSideTabListKeydown"
		 *
		 * @param {KeyboardEvent} event
		 */
		handleSideTabListKeydown( event ) {
			const key = event.key;
			// On mobile, the list is horizontal — fall back to L/R arrows.
			const isMobile = isMobileViewport();
			const vertical = ! isMobile;

			if ( vertical && key !== 'ArrowUp' && key !== 'ArrowDown' ) {
				return;
			}
			if ( ! vertical && key !== 'ArrowLeft' && key !== 'ArrowRight' ) {
				return;
			}

			event.preventDefault();

			const { ref } = getElement();
			const tabList = ref.querySelector( '.sgs-mega-menu__side-tab-list' );
			if ( ! tabList ) {
				return;
			}

			const tabs = Array.from(
				tabList.querySelectorAll( '.sgs-mega-menu__side-tab' )
			);
			const activeTab    = tabs.find(
				( t ) => t.getAttribute( 'aria-selected' ) === 'true'
			);
			const currentIndex = activeTab ? tabs.indexOf( activeTab ) : 0;
			const isPrev       = key === 'ArrowUp' || key === 'ArrowLeft';

			const nextIndex = isPrev
				? ( currentIndex === 0 ? tabs.length - 1 : currentIndex - 1 )
				: ( currentIndex === tabs.length - 1 ? 0 : currentIndex + 1 );

			tabs[ nextIndex ]?.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
			tabs[ nextIndex ]?.focus();
		},

		// ── Search-in-menu ────────────────────────────────────────────────

		/**
		 * Live-filter menu items as the user types in the search input.
		 *
		 * Targets every anchor (<a>) within .sgs-mega-menu__search-content
		 * and hides the item's nearest container (li / icon-item / nav-item)
		 * when the link text does not match the query.
		 *
		 * Placed on the search input:
		 *   data-wp-on--input="actions.filterSearch"
		 *
		 * @param {InputEvent} event
		 */
		filterSearch( event ) {
			const query   = event.target.value.toLowerCase().trim();
			const menuWrap = event.target.closest( '.sgs-mega-menu' );
			const panel    = menuWrap?.querySelector( '.sgs-mega-menu__panel' );
			const content  = panel?.querySelector( '.sgs-mega-menu__search-content' );

			if ( ! content ) {
				return;
			}

			const links   = Array.from( content.querySelectorAll( 'a' ) );
			let visible   = 0;

			links.forEach( ( link ) => {
				// Use plain text so HTML entities don't interfere.
				const text    = link.textContent.toLowerCase();
				const matches = ! query || text.includes( query );

				// Hide/show the outermost meaningful container.
				const container =
					link.closest( '.sgs-mega-menu-icon-item' ) ||
					link.closest( '.sgs-mega-menu-nav-item' )  ||
					link.closest( 'li' )                       ||
					link;

				container.classList.toggle(
					'sgs-mega-menu__search-item--hidden',
					! matches
				);

				if ( matches ) {
					visible++;
				}
			} );

			// Show "no results" when active query returns nothing.
			const emptyMsg = panel.querySelector( '.sgs-mega-menu__search-empty' );
			if ( emptyMsg ) {
				emptyMsg.style.display =
					( ! query || visible > 0 ) ? 'none' : 'block';
			}
		},

		// ── Keyboard — panel ─────────────────────────────────────────────

		/**
		 * Handle keyboard events inside the open panel.
		 *
		 * Keys handled:
		 * - Escape       → close panel, return focus to trigger
		 * - Tab          → focus trap (cycle within panel)
		 * - ArrowDown/Up → move between focusable items
		 *
		 * @param {KeyboardEvent} event
		 */
		handlePanelKeydown( event ) {
			const ctx     = getContext();
			const { ref } = getElement();
			const panel   = ref.querySelector( '.sgs-mega-menu__panel' );

			if ( ! panel ) {
				return;
			}

			const key       = event.key;
			const focusable = getFocusable( panel );
			const activeEl  = document.activeElement;

			// Escape: close panel, return focus to trigger.
			if ( key === 'Escape' ) {
				event.preventDefault();
				ctx.isOpen = false;
				if ( state.openMenuId === ctx.menuId ) {
					state.openMenuId = null;
				}
				const trigger = ref.querySelector( '.sgs-mega-menu__trigger' );
				if ( trigger ) {
					trigger.focus();
				}
				return;
			}

			// Tab: focus trap within panel.
			if ( key === 'Tab' && focusable.length > 0 ) {
				const first = focusable[ 0 ];
				const last  = focusable[ focusable.length - 1 ];

				if ( event.shiftKey ) {
					// Shift+Tab: if on first, wrap to last.
					if ( activeEl === first ) {
						event.preventDefault();
						last.focus();
					}
				} else {
					// Tab: if on last, wrap to first.
					if ( activeEl === last ) {
						event.preventDefault();
						first.focus();
					}
				}
				return;
			}

			// ArrowDown: move to next focusable item.
			if ( key === 'ArrowDown' ) {
				event.preventDefault();
				const idx  = focusable.indexOf( activeEl );
				const next = idx === -1 || idx === focusable.length - 1
					? 0
					: idx + 1;
				focusable[ next ]?.focus();
				return;
			}

			// ArrowUp: move to previous focusable item.
			if ( key === 'ArrowUp' ) {
				event.preventDefault();
				const idx  = focusable.indexOf( activeEl );
				const prev = idx <= 0 ? focusable.length - 1 : idx - 1;
				focusable[ prev ]?.focus();
			}
		},
	},

	callbacks: {
		/**
		 * Reactive callback — watch global openMenuId and close sibling menus.
		 * Runs whenever state.openMenuId changes.
		 */
		watchOpenState() {
			const ctx = getContext();
			// Another menu opened; close this one if it is still open.
			if (
				state.openMenuId &&
				state.openMenuId !== ctx.menuId &&
				ctx.isOpen
			) {
				ctx.isOpen = false;

				// Reset mobile accordion height if applicable.
				if ( isMobileViewport() && ! ctx.isFlyout ) {
					const { ref } = getElement();
					const panel   = ref?.querySelector( '.sgs-mega-menu__panel' );
					if ( panel ) {
						panel.style.maxHeight = '0';
					}
				}
			}
		},
	},
} );
