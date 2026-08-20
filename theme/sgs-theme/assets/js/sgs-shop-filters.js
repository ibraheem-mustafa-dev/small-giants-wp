/**
 * SGS Shop Filter Drawer — Native <dialog> Bottom Sheet (Mobile) / In-Flow Sidebar (Desktop)
 *
 * Behaviour:
 *   Desktop (≥782px): the filters block is a static, always-open, NON-MODAL
 *                      <dialog open> — renders in-flow as today's sticky sidebar.
 *   Mobile (<782px):   the filters block is a CLOSED <dialog> (no `open` attr,
 *                      so `display:none` by UA stylesheet — zero tabbable
 *                      descendants by construction). The toggle button and a
 *                      scroll-triggered sticky trigger open it via
 *                      `.showModal()`, which promotes it to the browser's TOP
 *                      LAYER — above every stacking context in the page,
 *                      including `sgs/container`'s `position:relative;z-index:1`
 *                      rule that defeats a plain `position:fixed` drawer.
 *
 * Why <dialog> instead of a hand-rolled drawer:
 *   - `.showModal()` renders in the top layer — sidesteps the container
 *     stacking-context fight entirely (proven: container/style.css:63 gives
 *     every direct child `position:relative;z-index:1` at (0,7,0)
 *     specificity, which beats a `position:fixed;z-index:9999` rule at
 *     (0,2,1); `.sgs-shop-layout` also creates its own stacking context, so a
 *     z-index bump alone cannot win).
 *   - Native focus trap, Escape-to-close, focus restoration, and an inert
 *     background all come for free — no hand-rolled trapFocus/backdrop code.
 *   - A closed dialog (no `open` attribute) is `display:none` by the UA
 *     stylesheet, which is what makes "0 tabbable elements while closed" true
 *     BY CONSTRUCTION rather than by a rule (`transform`) that can silently
 *     stop being applied.
 *
 * A11y: WAI-ARIA APG "Dialog (Modal)" pattern.
 *   - Trigger: aria-expanded, aria-controls, aria-haspopup="dialog", 44px target.
 *   - Dialog: aria-labelledby -> the visible <h2 class="sgs-shop-filters__heading">
 *     (NOT aria-label). Focus moves to that heading (tabindex="-1") on open,
 *     not to the close button.
 *   - Escape / native `cancel` + `close` events are handled by the browser for
 *     a showModal()-opened dialog; we only listen to `close` to run our own
 *     cleanup (scroll-lock removal, aria-expanded reset, focus restoration).
 *
 * No-JS: the template still renders a plain <aside> — this script only runs
 * once JS is available, and the conversion to <dialog> happens here. Before
 * that, the existing no-JS CSS (aside stacks above the grid) is untouched.
 *
 * Spec: Spec 30 FR-30-3
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const BREAKPOINT = 782; // px — mirrors WP admin breakpoint / woocommerce.css.
	const SCROLL_REVEAL_PX = () => window.innerHeight; // ~1 viewport of scroll.

	/** Main init — runs once after DOM is ready. */
	function init() {
		const toggle = document.querySelector( '.sgs-shop-filters__toggle' );
		const originalAside = document.getElementById( 'sgs-shop-filters' );

		if ( ! toggle || ! originalAside ) {
			return; // Template parts not present on this page — bail.
		}

		// Signal to CSS that JS is active (kept for the no-JS/enhanced CSS split
		// elsewhere in woocommerce.css; the dialog's own display:none is what
		// actually gates tabbability now, not this class).
		document.body.classList.add( 'is-enhanced' );

		// ── 1. Convert the <aside> into a real <dialog>, in place ──────────────
		// Same id/class, same children — one DOM, two presentations, just a
		// different tag so the browser's native dialog behaviour is available.

		const dialog = document.createElement( 'dialog' );
		dialog.id = originalAside.id;
		dialog.className = originalAside.className;

		// Wrap the existing children in a scrollable region, then move them in,
		// so a persistent sheet-footer can sit outside the scroll area.
		const scrollWrap = document.createElement( 'div' );
		scrollWrap.className = 'sgs-shop-filters__scroll';
		/* The site runs Lenis smooth scrolling (<html class="lenis">), which
		   intercepts wheel events document-wide and drives the PAGE. Inside the
		   open sheet that meant the wheel scrolled the page behind the modal
		   while the sheet's own overflow never moved - the filter list simply did
		   not respond to a scroll wheel. `data-lenis-prevent` is Lenis's own
		   opt-out attribute: it hands wheel events inside this subtree back to
		   native scrolling. Set here rather than in the template because this
		   element is created at runtime. */
		scrollWrap.setAttribute( 'data-lenis-prevent', '' );
		while ( originalAside.firstChild ) {
			scrollWrap.appendChild( originalAside.firstChild );
		}
		dialog.appendChild( scrollWrap );

		originalAside.replaceWith( dialog );

		const heading = dialog.querySelector( '.sgs-shop-filters__heading' );
		const closeBtn = dialog.querySelector( '.sgs-shop-filters__close' );

		if ( heading ) {
			if ( ! heading.id ) {
				heading.id = 'sgs-shop-filters-heading';
			}
			/* tabindex is deliberately NOT set here. It is applied in openDrawer()
			   and removed in finishClose(), because dialog.show() - the desktop,
			   non-modal path - moves focus into the dialog and would land on a
			   permanently-focusable heading, painting a focus ring around the
			   word "Filters" on page load for a mouse user who never interacted.
			   aria-labelledby does not require the target to be focusable. */
			dialog.setAttribute( 'aria-labelledby', heading.id );
		}

		toggle.setAttribute( 'aria-haspopup', 'dialog' );

		// ── 2. Sheet footer (mobile bottom-sheet only; hidden on desktop) ──────

		const footer = document.createElement( 'div' );
		footer.className = 'sgs-shop-filters__sheet-footer';

		const applyBtn = document.createElement( 'button' );
		applyBtn.type = 'button';
		applyBtn.className = 'sgs-shop-filters__apply';
		applyBtn.textContent = 'Show results';

		const clearBtn = document.createElement( 'button' );
		clearBtn.type = 'button';
		clearBtn.className = 'sgs-shop-filters__clear-all';
		clearBtn.textContent = 'Clear all';

		footer.appendChild( clearBtn );
		footer.appendChild( applyBtn );
		dialog.appendChild( footer );

		applyBtn.addEventListener( 'click', closeDrawer );
		clearBtn.addEventListener( 'click', function () {
			// Delegate to WC's own clear-filters control rather than
			// re-implementing filter-reset logic — find and click it.
			const realClear = dialog.querySelector(
				'.wc-block-product-filter-clear-button, .wc-block-components-filter-reset-button'
			);
			if ( realClear ) {
				realClear.click();
			}
		} );

		// ── 3. Sticky mobile trigger (scroll-revealed, shows active count) ─────

		const stickyTrigger = document.createElement( 'button' );
		stickyTrigger.type = 'button';
		stickyTrigger.className = 'sgs-shop-filters__sticky-trigger';
		stickyTrigger.setAttribute( 'aria-haspopup', 'dialog' );
		stickyTrigger.setAttribute( 'aria-controls', dialog.id );
		stickyTrigger.hidden = true; // Reserved-height CSS handles layout; JS handles reveal.
		stickyTrigger.innerHTML =
			'<span class="sgs-shop-filters__sticky-label">Filter</span>' +
			'<span class="sgs-shop-filters__sticky-count" aria-hidden="true"></span>';
		document.body.appendChild( stickyTrigger );

		function countActiveFilters() {
			return dialog.querySelectorAll(
				'.wp-block-woocommerce-product-filter-removable-chips li'
			).length;
		}

		function updateStickyCount() {
			const count = countActiveFilters();
			const countEl = stickyTrigger.querySelector( '.sgs-shop-filters__sticky-count' );
			if ( count > 0 ) {
				countEl.textContent = String( count );
				countEl.hidden = false;
				stickyTrigger.setAttribute(
					'aria-label',
					'Open filters, ' + count + ' active'
				);
			} else {
				countEl.textContent = '';
				countEl.hidden = true;
				stickyTrigger.setAttribute( 'aria-label', 'Open filters' );
			}
		}

		updateStickyCount();

		// WC's filter blocks re-render their own subtree on interaction — watch
		// for that rather than polling.
		const chipsObserver = new MutationObserver( updateStickyCount );
		chipsObserver.observe( dialog, { childList: true, subtree: true } );

		let scrollTicking = false;
		function onScroll() {
			if ( scrollTicking || isDesktop() ) {
				return;
			}
			scrollTicking = true;
			requestAnimationFrame( function () {
				const revealed = window.scrollY > SCROLL_REVEAL_PX();
				stickyTrigger.hidden = ! revealed || modalOpen;
				scrollTicking = false;
			} );
		}
		window.addEventListener( 'scroll', onScroll, { passive: true } );

		stickyTrigger.addEventListener( 'click', openDrawer );

		// ── 4. Open / close ──────────────────────────────────────────────────

		let modalOpen = false;

		function isDesktop() {
			return window.innerWidth >= BREAKPOINT;
		}

		function openDrawer() {
			if ( isDesktop() || modalOpen ) {
				return; // Sidebar is already open/static on desktop.
			}
			modalOpen = true;

			/* showModal() runs the dialog focusing steps, which focus the FIRST
			   focusable descendant - here a filter control far down a tall sheet
			   - and scroll the page to bring it into view. Measured live at
			   390px: opening the sheet scrolled the page 669px, which is the
			   "opens and jumps down randomly" report. `preventScroll` on our own
			   focus call does NOT prevent it, because the scroll has already
			   happened inside showModal() before we run.
			   So the position is captured before and restored after. */
			const scrollBefore = window.scrollY;
			dialog.showModal();
			restoreScroll( scrollBefore );

			toggle.setAttribute( 'aria-expanded', 'true' );
			stickyTrigger.hidden = true;
			document.body.classList.add( 'sgs-scroll-locked' );

			// Focus the heading (not the close button) per the APG pattern.
			if ( heading ) {
				requestAnimationFrame( function () {
					/* tabindex is applied HERE and removed in finishClose(),
					   never left on the element: dialog.show() - the desktop,
					   non-modal path - moves focus into the dialog and would
					   land on a permanently-focusable heading, painting a focus
					   ring around the word "Filters" on page load for a mouse
					   user who had not interacted at all. */
					heading.setAttribute( 'tabindex', '-1' );
					heading.focus( { preventScroll: true } );
					restoreScroll( scrollBefore );
				} );
			}
		}

		/* Restores the page's scroll position if something moved it. Called after
		   showModal() and again after the focus lands, because the browser can
		   scroll at either point. Written as an absolute restore rather than a
		   delta so a second call is harmless. */
		function restoreScroll( y ) {
			if ( Math.abs( window.scrollY - y ) > 1 ) {
				window.scrollTo( { top: y, left: 0, behavior: 'instant' } );
			}
		}

		function closeDrawer() {
			if ( ! modalOpen || ! dialog.open ) {
				return;
			}
			dialog.close(); // Fires 'close' -> finishClose() runs the cleanup.
		}

		function finishClose() {
			modalOpen = false;
			if ( heading ) {
				heading.removeAttribute( 'tabindex' );
			}
			toggle.setAttribute( 'aria-expanded', 'false' );
			document.body.classList.remove( 'sgs-scroll-locked' );
			toggle.focus( { preventScroll: true } );
			onScroll(); // Re-evaluate whether the sticky trigger should show again.
		}

		// Covers explicit close() AND native Escape/cancel closes alike — the
		// browser always fires 'close' when a dialog closes.
		dialog.addEventListener( 'close', function () {
			if ( modalOpen ) {
				finishClose();
			}
		} );

		// Backdrop click: a click that lands on the dialog element itself (not
		// a descendant) is a click on the ::backdrop region.
		dialog.addEventListener( 'click', function ( e ) {
			if ( e.target === dialog && modalOpen ) {
				closeDrawer();
			}
		} );

		if ( closeBtn ) {
			closeBtn.addEventListener( 'click', closeDrawer );
		}

		toggle.addEventListener( 'click', function () {
			if ( modalOpen ) {
				closeDrawer();
			} else {
				openDrawer();
			}
		} );

		// ── 5. Desktop <-> mobile presentation sync ─────────────────────────────

		function syncForViewport() {
			if ( isDesktop() ) {
				if ( modalOpen ) {
					dialog.close(); // Demote out of the modal/top-layer state first.
				}
				if ( ! dialog.open ) {
					dialog.show(); // Non-modal, always-visible, in-flow sidebar.
				}
				stickyTrigger.hidden = true;
				document.body.classList.remove( 'sgs-scroll-locked' );
			} else if ( dialog.open && ! modalOpen ) {
				// Was the desktop static sidebar; mobile default is CLOSED.
				dialog.close();
			}
		}

		window.addEventListener( 'resize', syncForViewport );
		syncForViewport();
	}

	// Run after DOM is ready.
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
