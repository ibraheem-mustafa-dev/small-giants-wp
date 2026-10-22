/**
 * Accordion — scroll the opened item's header into view.
 *
 * The offset is the pinned chrome (sticky site header and admin bar) plus the block's extra gap, so the header lands
 * below them. Nothing scrolls when the header is already fully
 * inside the visible area. Reduced motion jumps instead of scrolling smoothly.
 *
 * @package SGS\Blocks
 */

import { chromeOffsetPx } from '../../shared/effects/motion-utils';

/** Wait for the sibling's close animation to settle before measuring. */
const SETTLE_MS = 560;

/**
 * Resolve the scroll offset in px: the chrome pinned to the top (sticky site header and admin bar, measured by
 * `chromeOffsetPx()`) plus the gap (a length or a `var()` preset).
 *
 * @param {HTMLElement} accordion Accordion root, the probe's parent so custom properties resolve there.
 * @param {string}      gap       CSS length, or '' for none.
 * @return {number} Offset in px.
 */
export function resolveOffset( accordion, gap ) {
	const probe = document.createElement( 'div' );
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	probe.style.width = '0';
	probe.style.height = gap || '0px';
	accordion.appendChild( probe );
	const gapPx = probe.getBoundingClientRect().height;
	probe.remove();
	return chromeOffsetPx() + ( Number.isFinite( gapPx ) ? gapPx : 0 );
}

/**
 * Scroll an opened item's header below the sticky header unless it is already fully in view.
 *
 * @param {HTMLDetailsElement} details   Opened item.
 * @param {HTMLElement}        accordion Accordion root carrying `data-scroll-gap`.
 * @return {boolean} True when a scroll was issued.
 */
export function scrollOpenedIntoView( details, accordion ) {
	const header = details.querySelector( ':scope > summary' );
	if ( ! header || ! details.open ) {
		return false;
	}
	const offset = resolveOffset( accordion, accordion.dataset.scrollGap || '' );
	const rect = header.getBoundingClientRect();
	if ( rect.top >= offset && rect.bottom <= window.innerHeight ) {
		return false;
	}
	const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	window.scrollBy( { top: rect.top - offset, behavior: reduced ? 'auto' : 'smooth' } );
	return true;
}

/**
 * Schedule the scroll once an item the visitor opened has settled.
 *
 * @param {HTMLDetailsElement} details   Opened item.
 * @param {HTMLElement}        accordion Accordion root.
 */
export function scheduleScrollToOpened( details, accordion ) {
	if ( accordion.dataset.scrollToOpened !== 'true' ) {
		return;
	}
	const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	window.setTimeout( () => scrollOpenedIntoView( details, accordion ), reduced ? 0 : SETTLE_MS );
}
