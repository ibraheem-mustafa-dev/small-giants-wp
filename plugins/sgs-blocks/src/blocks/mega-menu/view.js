/**
 * Mega Menu — frontend interactivity (Interactivity API).
 *
 * Handles:
 * - Hover/click toggle (desktop)
 * - Click/tap toggle (mobile)
 * - WCAG 2.2 AA keyboard navigation
 * - Close on Escape, focus management
 * - Auto-close siblings on hover (single-open mode)
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'sgs/mega-menu', {
	state: {
		openMenuId: null,
	},
	actions: {
		/**
		 * Toggle panel on click/tap.
		 */
		toggle() {
			const ctx = getContext();
			ctx.isOpen = ! ctx.isOpen;
			state.openMenuId = ctx.isOpen ? ctx.menuId : null;

			// Focus first focusable element in panel when opening.
			if ( ctx.isOpen ) {
				const { ref } = getElement();
				const panel = ref.querySelector( '.sgs-mega-menu__panel' );
				if ( panel ) {
					requestAnimationFrame( () => {
						const firstFocusable = panel.querySelector(
							'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
						);
						if ( firstFocusable ) {
							firstFocusable.focus();
						}
					} );
				}
			}
		},

		/**
		 * Open panel on hover (desktop only, if openOn=hover).
		 */
		openOnHover() {
			const ctx = getContext();
			if ( ctx.openOn !== 'hover' ) {
				return;
			}

			// Close other open menus (single-open mode).
			if (
				state.openMenuId &&
				state.openMenuId !== ctx.menuId
			) {
				// This will be handled by the other menu's context watcher.
			}

			ctx.isOpen = true;
			state.openMenuId = ctx.menuId;
		},

		/**
		 * Close panel on mouse leave (desktop only, if openOn=hover).
		 */
		closeOnHover() {
			const ctx = getContext();
			if ( ctx.openOn !== 'hover' ) {
				return;
			}
			ctx.isOpen = false;
			if ( state.openMenuId === ctx.menuId ) {
				state.openMenuId = null;
			}
		},

		/**
		 * Handle keyboard navigation on trigger element.
		 * - Enter/Space: toggle panel
		 * - ArrowDown: open panel and focus first item
		 * - ArrowLeft/Right: move to adjacent menu item
		 */
		handleTriggerKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();
			const key = event.key;

			// Enter or Space: toggle panel.
			if ( key === 'Enter' || key === ' ' ) {
				event.preventDefault();
				ctx.isOpen = ! ctx.isOpen;
				state.openMenuId = ctx.isOpen ? ctx.menuId : null;

				// Focus first item when opening.
				if ( ctx.isOpen ) {
					const panel = ref.querySelector(
						'.sgs-mega-menu__panel'
					);
					if ( panel ) {
						requestAnimationFrame( () => {
							const firstFocusable =
								panel.querySelector(
									'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
								);
							if ( firstFocusable ) {
								firstFocusable.focus();
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
					ctx.isOpen = true;
					state.openMenuId = ctx.menuId;
				}
				const panel = ref.querySelector(
					'.sgs-mega-menu__panel'
				);
				if ( panel ) {
					requestAnimationFrame( () => {
						const firstFocusable = panel.querySelector(
							'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
						);
						if ( firstFocusable ) {
							firstFocusable.focus();
						}
					} );
				}
				return;
			}

			// ArrowLeft/Right: move to adjacent menu item.
			if ( key === 'ArrowLeft' || key === 'ArrowRight' ) {
				event.preventDefault();
				const menubar = ref.closest( '.wp-block-navigation__container' );
				if ( ! menubar ) {
					return;
				}
				const items = Array.from(
					menubar.querySelectorAll(
						'.sgs-mega-menu__trigger, .wp-block-navigation-item > a'
					)
				);
				const currentIndex = items.indexOf( event.target );
				if ( currentIndex === -1 ) {
					return;
				}

				let nextIndex;
				if ( key === 'ArrowLeft' ) {
					nextIndex =
						currentIndex === 0
							? items.length - 1
							: currentIndex - 1;
				} else {
					nextIndex =
						currentIndex === items.length - 1
							? 0
							: currentIndex + 1;
				}

				items[ nextIndex ]?.focus();

				// Close current panel when moving away.
				ctx.isOpen = false;
				if ( state.openMenuId === ctx.menuId ) {
					state.openMenuId = null;
				}
			}
		},

		/**
		 * Handle keyboard navigation inside panel.
		 * - Escape: close panel, return focus to trigger
		 */
		handlePanelKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();

			if ( event.key === 'Escape' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMenuId = null;

				// Return focus to trigger.
				const trigger = ref.querySelector(
					'.sgs-mega-menu__trigger'
				);
				if ( trigger ) {
					trigger.focus();
				}
			}
		},
	},
	callbacks: {
		/**
		 * Watch for global state changes and close sibling menus.
		 */
		watchOpenState() {
			const ctx = getContext();
			// If another menu opened, close this one.
			if (
				state.openMenuId &&
				state.openMenuId !== ctx.menuId &&
				ctx.isOpen
			) {
				ctx.isOpen = false;
			}
		},
	},
} );
