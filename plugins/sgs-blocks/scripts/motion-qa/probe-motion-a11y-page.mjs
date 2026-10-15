/**
 * Page-context and browser helpers for probe-motion-a11y.mjs: the readings that run inside the page, a real keyboard Tab
 * to a target, the touch (no hover) context, and the loop sequence readings.
 *
 * @package SGS\Blocks
 */

/** Every revealed part under a root: computed visibility values and whether the part sits inside the box that reveals it. */
export const READ_REVEALED = ( { root, part, box } ) => [ ...document.querySelectorAll( `${ root } ${ part }` ) ].map( ( el ) => {
	const cs = getComputedStyle( el );
	const r = el.getBoundingClientRect();
	const b = ( el.closest( box ) || el ).getBoundingClientRect();
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	return {
		selector: `${ root } ${ part }`,
		opacity: cs.opacity,
		visibility: cs.visibility,
		display: cs.display,
		transform: cs.transform,
		width: Math.round( r.width ),
		height: Math.round( r.height ),
		inside: cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom,
	};
} );

/** The media-feature answers, so a context that failed to emulate a touch device is reported rather than assumed. */
export const READ_INPUT = () => ( { hoverNone: matchMedia( '(hover: none)' ).matches, hoverHover: matchMedia( '(hover: hover)' ).matches, reduced: matchMedia( '(prefers-reduced-motion: reduce)' ).matches } );

/**
 * The loop at a selector: its infinite animations with their state, whether the element carries `data-sgs-loop-paused`,
 * and the pause button of its block root (the block root is the nearest `[class*="wp-block-sgs-"]`; a button sits after a
 * loop that is itself the root, and inside the root otherwise).
 */
export const READ_LOOP = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const root = el.closest( '[class*="wp-block-sgs-"]' ) || el;
	const infinite = ( a ) => {
		const timing = a.effect && a.effect.getComputedTiming();
		return Boolean( timing ) && timing.iterations === Infinity;
	};
	const anims = root.getAnimations( { subtree: true } ).filter( infinite ).map( ( a ) => ( { playState: a.playState, id: a.id || '', target: a.effect.target ? a.effect.target.className : '' } ) );
	const next = el.nextElementSibling;
	const button = root === el ? ( next && next.matches( '.sgs-motion-pause' ) ? next : null ) : root.querySelector( '.sgs-motion-pause' );
	let info = null;
	if ( button ) {
		const r = button.getBoundingClientRect();
		info = { present: true, hidden: button.hidden || r.width === 0, size: { width: Math.round( r.width ), height: Math.round( r.height ) }, label: button.getAttribute( 'aria-label' ) || button.textContent.trim(), pressed: button.getAttribute( 'aria-pressed' ) };
	}
	return { anims, attr: el.hasAttribute( 'data-sgs-loop-paused' ), pressed: button ? button.getAttribute( 'aria-pressed' ) : null, button: info };
};

/** Scroll an element to the viewport centre and wait until smooth scrolling (Lenis) has stopped. */
export async function settle( page, sel ) {
	await page.$eval( sel, ( el ) => el.scrollIntoView( { block: 'center', behavior: 'instant' } ) );
	await page.waitForFunction( ( s ) => {
		const top = document.querySelector( s ).getBoundingClientRect().top;
		const steady = window.__m310Top !== undefined && Math.abs( window.__m310Top - top ) < 0.5;
		window.__m310Top = top;
		return steady && ! document.documentElement.classList.contains( 'lenis-scrolling' );
	}, sel, { polling: 120, timeout: 5000 } ).catch( () => null );
	await page.evaluate( () => { delete window.__m310Top; } );
}

/**
 * Press the real Tab key from a point just before a section and report where focus landed. A temporary zero-size
 * element with tabindex -1 is focused first so the sequential-focus order starts at the section; it is removed after.
 * `match` is a selector the landing element must match. When Tab does not land on it (an engine whose Tab skips links,
 * or an element that is not in the tab order) `focus()` is NOT used here: the caller decides what the miss means.
 */
export async function tabInto( page, beforeSel, match ) {
	await page.evaluate( ( sel ) => {
		const anchor = document.createElement( 'span' );
		anchor.id = 'm310-tab-anchor';
		anchor.tabIndex = -1;
		document.querySelector( sel ).before( anchor );
		anchor.focus();
	}, beforeSel );
	await page.keyboard.press( 'Tab' );
	const landed = await page.evaluate( ( m ) => {
		const a = document.activeElement;
		return { matches: Boolean( a && a !== document.body && a.matches( m ) ), tag: a ? a.tagName.toLowerCase() : '', cls: a && typeof a.className === 'string' ? a.className.trim().slice( 0, 80 ) : '' };
	}, match );
	await page.evaluate( () => document.getElementById( 'm310-tab-anchor' )?.remove() );
	return landed;
}

/** Move the pointer and focus away from a section, then let a pending state settle. */
export async function leave( page, ms = 250 ) {
	await page.evaluate( () => document.activeElement && document.activeElement !== document.body && document.activeElement.blur() );
	await page.mouse.move( 0, 0 );
	await page.waitForTimeout( ms );
}

/**
 * The context options for a device that cannot hover, added to the viewport. Chromium and WebKit take `isMobile`;
 * Firefox does not support it but reports `(hover: none)` for `hasTouch`. The page's own media-feature answers are read
 * back (`READ_INPUT`), so a context that failed to emulate is reported by the caller as unanswered, never assumed.
 */
export function touchOptions( engine ) {
	return engine === 'firefox' ? { hasTouch: true } : { hasTouch: true, isMobile: true };
}
