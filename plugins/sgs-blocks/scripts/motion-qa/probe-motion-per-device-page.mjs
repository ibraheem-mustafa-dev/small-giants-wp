/**
 * Page-context helpers shared by the probe-motion-per-device checks: one computed-style reading, scrolling an element
 * into steady view (Lenis stops), and a before and after reading around a hover.
 *
 * @package SGS\Blocks
 */

export const READ_MOTION = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const cs = getComputedStyle( el );
	return { translate: cs.translate, scale: cs.scale, rotate: cs.rotate, transform: cs.transform, ease: cs.transitionTimingFunction, fromTy: cs.getPropertyValue( '--sgs-me-from-ty' ).trim(), classes: [ ...el.classList ].filter( ( c ) => /^sgs-m-/.test( c ) ), stamped: el.hasAttribute( 'data-sgs-mh' ) || el.hasAttribute( 'data-sgs-me' ) };
};

/** Scroll an element to the viewport centre and wait until smooth scrolling (Lenis) has stopped. */
export async function settleInView( page, sel ) {
	await page.$eval( sel, ( el ) => el.scrollIntoView( { block: 'center', behavior: 'instant' } ) );
	await page.waitForFunction( ( s ) => {
		const top = document.querySelector( s ).getBoundingClientRect().top;
		const steady = window.__m39Top !== undefined && Math.abs( window.__m39Top - top ) < 0.5;
		window.__m39Top = top;
		return steady && ! document.documentElement.classList.contains( 'lenis-scrolling' );
	}, sel, { polling: 120, timeout: 5000 } ).catch( () => null );
	await page.evaluate( () => { delete window.__m39Top; } );
}

/** Reading before and after hovering a selector (the pointer returns to the corner afterwards). */
export async function hoverRead( page, hoverSel, readSels, settleMs = 800 ) {
	await settleInView( page, hoverSel );
	const read = async () => Object.fromEntries( await Promise.all( readSels.map( async ( s ) => [ s, await page.evaluate( READ_MOTION, s ) ] ) ) );
	const before = await read();
	await page.hover( hoverSel );
	await page.waitForTimeout( settleMs );
	const after = await read();
	await page.mouse.move( 0, 0 );
	await page.waitForTimeout( 100 );
	return { before, after };
}
