/**
 * SGS Mega Panel — frontend view module.
 *
 * Wires the two shared motion effects (§6 U4/U6) into every rendered panel:
 *
 * - Staggered reveal (`initStagger`), opt-in per panel via the `data-stagger`
 *   attribute the `staggerOnOpen` block attribute sets. Fires once on
 *   panel-OPEN.
 * - Cursor spotlight (`initSpotlight`), always on for the aside slot when a
 *   `.sgs-mega-aside` child is present — no opt-in attribute for this one
 *   (§6 U6 doesn't gate it behind a control).
 *
 * OPEN-SIGNAL CONTRACT (verified against the live disclosure mechanism —
 * corrected 2026-07-27, prior revision of this file wrongly assumed a
 * `hidden` attribute on the panel, which never occurs; see below).
 *
 * The mega panel is shown/hidden by `nav-menu/render.php`'s scoped CSS via a
 * sibling combinator reacting to the TRIGGER BUTTON's `aria-expanded`, not by
 * any attribute on the panel itself:
 *
 *   .sgs-nav-menu__mega-panel-wrap { display: none; }
 *   .sgs-nav-menu__mega-trigger[aria-expanded="true"]
 *     ~ .sgs-nav-menu__mega-panel-wrap { display: block; }
 *
 * `mega-disclosure.js` only ever writes `context.isOpen`, which the
 * Interactivity API reflects onto the TRIGGER's `aria-expanded` via
 * `data-wp-bind--aria-expanded` — never onto the panel. So this module
 * observes the trigger's `aria-expanded`, not any attribute on the panel:
 *
 * - PRIMARY: the accessible `aria-controls` contract — the trigger carries
 *   `aria-controls="<panel-wrap id>"`, so resolve the wrap's `id` and query
 *   `[aria-controls="<id>"]` anywhere in the document. Robust to DOM
 *   reordering; this is the contract that MUST hold regardless of markup
 *   shape.
 * - FALLBACK: walk up to the closest `.sgs-nav-menu__mega-panel-wrap`, then
 *   walk its previous siblings for `.sgs-nav-menu__mega-trigger` (the same
 *   shape the CSS `~` combinator relies on).
 * - If NEITHER resolves the trigger, this module deliberately does nothing
 *   further (no observer, no hidden starting values are ever written) — the
 *   stagger effect module's own CSS contract (style.css) defaults every
 *   `--sgs-stagger-*` custom property to the fully-visible end state via
 *   `var(…, 1)` / `var(…, 0)`, so an unresolved trigger degrades to
 *   "visible, unanimated", never "invisible". A `console.warn` marks the
 *   failure for developers without affecting what a visitor sees.
 *
 * @package SGS\Blocks
 */

import { initStagger } from '../../shared/effects/stagger';
import { initSpotlight } from '../../shared/effects/spotlight';

const MEGA_WRAP_SELECTOR = '.sgs-nav-menu__mega-panel-wrap';
const MEGA_TRIGGER_SELECTOR = '.sgs-nav-menu__mega-trigger';

/**
 * Resolve the disclosure trigger button for a rendered mega panel.
 *
 * `aria-controls` (the accessible contract the trigger/panel pair MUST
 * honour) is tried first; the previous-sibling walk mirrors the CSS `~`
 * combinator's own shape as a fallback for markup that hasn't wired
 * `aria-controls` up yet.
 *
 * @param {HTMLElement} panelEl The `.wp-block-sgs-mega-panel` root element.
 * @return {HTMLElement|null} The trigger button, or null if unresolved.
 */
function resolveMegaTrigger( panelEl ) {
	const wrap = panelEl.closest( MEGA_WRAP_SELECTOR ) || panelEl;

	if ( wrap.id ) {
		const viaAriaControls = document.querySelector(
			`[aria-controls="${ wrap.id }"]`
		);
		if ( viaAriaControls ) {
			return viaAriaControls;
		}
	}

	let sibling = wrap.previousElementSibling;
	while ( sibling ) {
		if ( sibling.matches && sibling.matches( MEGA_TRIGGER_SELECTOR ) ) {
			return sibling;
		}
		sibling = sibling.previousElementSibling;
	}

	return null;
}

/**
 * Boot the motion effects for one rendered mega-panel instance.
 *
 * @param {HTMLElement} panelEl The `.wp-block-sgs-mega-panel` root element.
 * @return {Function} Teardown — disconnects observers and effect cleanups.
 */
function bootMegaPanel( panelEl ) {
	const teardownFns = [];

	if ( panelEl.hasAttribute( 'data-stagger' ) ) {
		const contentEl = panelEl.querySelector( '.sgs-mega-panel__content' );
		const triggerEl = resolveMegaTrigger( panelEl );

		if ( contentEl && triggerEl ) {
			let staggerCleanup = null;

			const runStagger = () => {
				if ( staggerCleanup ) {
					staggerCleanup();
				}
				staggerCleanup = initStagger( panelEl, {
					childSelector: ':scope > .sgs-mega-panel__content > *',
					mobile: window.matchMedia( '(max-width: 767px)' ).matches,
				} );
			};

			// Already expanded on first paint — run once now.
			if ( 'true' === triggerEl.getAttribute( 'aria-expanded' ) ) {
				runStagger();
			}

			const observer = new window.MutationObserver( ( mutations ) => {
				for ( const mutation of mutations ) {
					const isExpandedAttr =
						'aria-expanded' === mutation.attributeName;
					const justOpened =
						'true' === triggerEl.getAttribute( 'aria-expanded' );
					if ( isExpandedAttr && justOpened ) {
						runStagger();
					}
				}
			} );
			observer.observe( triggerEl, {
				attributes: true,
				attributeFilter: [ 'aria-expanded' ],
			} );

			teardownFns.push( () => observer.disconnect() );
			teardownFns.push( () => staggerCleanup && staggerCleanup() );
		} else if ( contentEl && ! triggerEl ) {
			// Fail OPEN, not silently hidden (mirrors the stagger module's
			// own fail-open contract): no observer is attached and
			// `initStagger()` is never called, so no `--sgs-stagger-*`
			// hidden starting values are ever written. style.css's `var(…,
			// fallback)` defaults keep every child at its fully-visible,
			// unanimated end state.
			// eslint-disable-next-line no-console
			console.warn(
				'sgs/mega-panel: could not resolve the disclosure trigger for a `data-stagger` panel — rendering static (visible, unanimated) instead of staggered.',
				panelEl
			);
		}
	}

	const asideEl = panelEl.querySelector( '.sgs-mega-aside' );
	if ( asideEl ) {
		// Attribute is applied here (JS-only) rather than by render.php —
		// this is the mechanism that scopes the shared spotlight CSS contract
		// (style.css `.sgs-mega-aside[data-spotlight]`) to asides that actually
		// got the effect wired up, without needing a new PHP-side attribute.
		asideEl.setAttribute( 'data-spotlight', '' );
		const spotlightCleanup = initSpotlight( asideEl );
		teardownFns.push( spotlightCleanup );
	}

	return () => teardownFns.forEach( ( fn ) => 'function' === typeof fn && fn() );
}

document
	.querySelectorAll( '.wp-block-sgs-mega-panel' )
	.forEach( ( panelEl ) => bootMegaPanel( panelEl ) );
