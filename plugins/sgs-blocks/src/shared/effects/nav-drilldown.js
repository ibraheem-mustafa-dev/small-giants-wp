/**
 * SGS shared motion — in-drawer drill-down submenu (Spec 36 FR-36-6).
 *
 * Progressive enhancement over the accordion markup `sgs/nav-menu`'s
 * `render_items_drawer()` (PHP) always emits — a `<details name>` exclusive
 * accordion, per-item. With this module NOT running (no JS, or a page where
 * it never mounts), that accordion IS the whole experience: `<summary>`
 * click natively opens the panel in place. This module intercepts that same
 * click, keeps the panel accessible via the `<details open>` attribute
 * (unchanged semantics for assistive tech), but repaints it as a full-size
 * sliding sub-panel with a Back control — the "drill-down" model FR-36-6
 * asks for.
 *
 * FOCUS MANAGEMENT (the actual ask, not decoration):
 *   - Opening a submenu moves focus to its Back button (the first meaningful
 *     control in the now-visible panel).
 *   - Back returns focus to the `<summary>` that opened it — never to the
 *     drawer root, never lost.
 *   - The top-level list is marked `inert` while a panel is open, so Tab
 *     cannot land on a link the user cannot currently see (native `inert`
 *     removes it from the accessibility tree AND the tab order in one step;
 *     see the `store.js` `getFocusable()` `[inert]` exclusion this depends
 *     on).
 *   - Escape / the drawer's own × still close the WHOLE drawer — this module
 *     adds NO Escape handling of its own, so `store('sgs/nav')`'s existing
 *     dialog-level ESC/× behaviour (FR-36-6) is completely untouched. A
 *     drill-down panel left open when the drawer itself closes stays open in
 *     the DOM (the `<details>` element itself is unaffected by the dialog
 *     closing) but is invisible behind the closed dialog; it is not reset,
 *     so re-opening the drawer shows the same panel it was on — matching how
 *     the pre-existing accordion mode already behaves for the same reason.
 *
 * CSS consumer (nav-menu/style.css): everything here is gated behind the
 * `[data-drill-enhanced]` attribute this module sets on the bar on init, so
 * the structural slide rules only ever apply once this module has actually
 * wired up the behaviour they assume.
 *
 * @package
 */

import { prefersReducedMotion } from './motion-utils';

const PANEL_ACTIVE_CLASS = 'is-active';
const BAR_DRILL_ACTIVE_CLASS = 'sgs-nav-menu__bar--drill-active';

/**
 * Mark every top-level `<li>` in `barEl` INERT except `activeLi` (or clear
 * `inert` from all of them when `activeLi` is null).
 *
 * Deliberately per-SIBLING, not `inert` on `barEl` itself. `inert` is
 * computed from "this node OR any ancestor carries the attribute" — a
 * descendant cannot remove its own inertness while an ancestor still has
 * the attribute set, so `barEl.setAttribute('inert', '')` followed by
 * `details.removeAttribute('inert')` would leave the open `<details>`
 * itself STILL inert (unreachable, unfocusable) alongside the siblings it
 * was meant to isolate. Marking every OTHER item inert instead achieves the
 * same "Tab cannot reach a hidden link" goal without that trap.
 *
 * @param {HTMLElement}      barEl    The `.sgs-nav-menu__bar--drawer` element.
 * @param {HTMLElement|null} activeLi The top-level `<li>` to leave interactive,
 *                                    or null to clear `inert` from every item.
 */
function setSiblingsInert( barEl, activeLi ) {
	Array.from( barEl.children ).forEach( ( li ) => {
		if ( null === activeLi || li === activeLi ) {
			li.removeAttribute( 'inert' );
		} else {
			li.setAttribute( 'inert', '' );
		}
	} );
}

/**
 * Initialise drill-down behaviour on one drawer's nav bar.
 *
 * @param {HTMLElement} barEl The `.sgs-nav-menu__bar--drawer` element with
 *                            `data-sgs-nav-submenu-model="drill-down"`.
 * @return {Function} Cleanup — removes every listener + injected Back button,
 *                     restores the plain accordion state. Safe on a
 *                     detached/empty element.
 */
export function initDrillDown( barEl ) {
	if ( ! barEl || typeof barEl.querySelectorAll !== 'function' ) {
		return () => {};
	}

	const accordions = Array.from(
		barEl.querySelectorAll( ':scope > .sgs-nav-menu__item--has-submenu > .sgs-nav-menu__accordion-row > .sgs-nav-menu__accordion' )
	);
	if ( 0 === accordions.length ) {
		return () => {};
	}

	const cleanups = [];
	let openPanel = null; // The currently-open { details, summary, backBtn } record, or null.

	/**
	 * Close whichever panel is currently open (if any) and return focus to
	 * the `<summary>` that opened it — the Back button's own behaviour, and
	 * also used for the "reset on drawer close" cleanup path.
	 *
	 * @param {boolean} returnFocus Whether to move focus back to the trigger
	 *                              (false when tearing down because the whole
	 *                              drawer/effect is being destroyed).
	 */
	function closeOpenPanel( returnFocus ) {
		if ( ! openPanel ) {
			return;
		}
		const { details, summary, panelList } = openPanel;
		details.open = false;
		panelList.classList.remove( PANEL_ACTIVE_CLASS );
		barEl.classList.remove( BAR_DRILL_ACTIVE_CLASS );
		setSiblingsInert( barEl, null );
		if ( returnFocus ) {
			summary.focus();
		}
		openPanel = null;
	}

	accordions.forEach( ( details ) => {
		const summary = details.querySelector( ':scope > summary.sgs-nav-menu__accordion-summary' );
		const panelList = details.querySelector( ':scope > ul.sgs-nav-menu__submenu' );
		if ( ! summary || ! panelList ) {
			return;
		}

		// Back row — JS-injected only, first child of the panel it opens.
		// The plain accordion fallback (no JS) never gets this element at all.
		// The label is READ from render.php's data attribute (already
		// translated server-side via __( 'Back to %s', 'sgs-blocks' )) rather
		// than hardcoded here, so this JS module carries zero English text.
		const backLi = document.createElement( 'li' );
		backLi.className = 'sgs-nav-menu__drill-back';
		const backBtn = document.createElement( 'button' );
		backBtn.type = 'button';
		backBtn.className = 'sgs-nav-menu__drill-back-btn';
		// The arrow is a real `aria-hidden` element, not CSS `content` — a
		// generated pseudo-element's text can still surface in some browsers'
		// accessibility trees even while its host is genuinely hidden/inert,
		// which is a real risk for a decorative glyph a screen reader has no
		// reason to announce. The visible label carries the actual meaning.
		const backArrow = document.createElement( 'span' );
		backArrow.className = 'sgs-nav-menu__drill-back-btn__arrow';
		backArrow.setAttribute( 'aria-hidden', 'true' );
		backArrow.textContent = '←';
		const backLabel = document.createElement( 'span' );
		backLabel.textContent = details.dataset.sgsNavBackLabel || details.dataset.sgsNavParentLabel || '';
		backBtn.append( backArrow, backLabel );
		backLi.appendChild( backBtn );
		panelList.insertBefore( backLi, panelList.firstChild );

		const record = { details, summary, panelList, backLi };

		/**
		 * Intercept the native accordion toggle. `preventDefault()` on the
		 * `<summary>` click stops the browser opening `<details>` inline —
		 * this function takes over what "open" means instead.
		 *
		 * @param {MouseEvent} event The summary click event.
		 */
		function onSummaryClick( event ) {
			event.preventDefault();
			// Only one drill panel open at a time per bar — closing any
			// previously open one first keeps `inert`/focus state coherent.
			if ( openPanel && openPanel.details !== details ) {
				closeOpenPanel( false );
			}
			details.open = true;
			panelList.classList.add( PANEL_ACTIVE_CLASS );
			barEl.classList.add( BAR_DRILL_ACTIVE_CLASS );
			// Every OTHER top-level item becomes inert while this one's panel
			// is the visible surface — keeps Tab off links the user cannot
			// see, without trapping the open item itself (see setSiblingsInert).
			// `details` sits two levels below its `<li class="…item--has-
			// submenu">` (…<li><div class="accordion-row"><details>…), so the
			// nearest `<li>` ancestor IS that top-level item.
			setSiblingsInert( barEl, details.closest( 'li' ) );
			openPanel = record;
			if ( prefersReducedMotion() ) {
				backBtn.focus();
			} else {
				// Focus after the slide-in transition would otherwise scroll
				// the still-off-screen button into view mid-animation; a
				// microtask defers just long enough for the transform to be
				// applied without waiting for `transitionend` (which CSS
				// gates out entirely under reduced motion, so it would never
				// fire on that path).
				requestAnimationFrame( () => backBtn.focus() );
			}
		}

		const onBackClick = () => closeOpenPanel( true );

		summary.addEventListener( 'click', onSummaryClick );
		backBtn.addEventListener( 'click', onBackClick );

		cleanups.push( () => {
			summary.removeEventListener( 'click', onSummaryClick );
			backBtn.removeEventListener( 'click', onBackClick );
			backLi.remove();
		} );
	} );

	barEl.setAttribute( 'data-drill-enhanced', '' );

	return () => {
		closeOpenPanel( false );
		cleanups.forEach( ( fn ) => fn() );
		barEl.removeAttribute( 'data-drill-enhanced' );
		barEl.classList.remove( BAR_DRILL_ACTIVE_CLASS );
		barEl.removeAttribute( 'inert' );
	};
}
