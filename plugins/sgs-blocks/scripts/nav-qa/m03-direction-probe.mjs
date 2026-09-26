/**
 * U-13 M-03 live probe: direction-keyed restyle (fixture `direction-fade`, fantasy's cell).
 *
 * Usage: node scripts/nav-qa/m03-direction-probe.mjs <page-url>
 *
 * At 375, 768 and 1440 (headless), with real wheel input:
 *   1. at rest: the header's `::after` fill is at opacity 1 and the painted pixel at the header's top
 *      edge is darker than the same point with the header scrolled away (the fill really paints);
 *   2. wheel down past 100px: `is-header-scrolled` on, `::after` opacity reaches 0;
 *   3. wheel up 5px: still scrolled (the 8px deadzone, the negative control);
 *   4. wheel up another 10px: `is-header-scrolled` off, `::after` back to 1, at any offset.
 * The opacity is sampled every 50ms after each flip to record the fade's duration.
 * Exit code 1 on any failed assertion.
 */
import { chromium } from 'playwright';

const url = process.argv[ 2 ];
if ( ! url ) {
	console.error( 'usage: m03-direction-probe.mjs <page-url>' );
	process.exit( 2 );
}

const failures = [];
const browser  = await chromium.launch( { headless: true } );

async function state( page ) {
	return page.evaluate( () => {
		const h = document.querySelector( '.sgs-site-header' );
		const a = getComputedStyle( h, '::after' );
		return {
			scrollY: Math.round( window.scrollY ),
			scrolled: h.classList.contains( 'is-header-scrolled' ),
			afterOpacity: +a.opacity,
			afterImage: a.backgroundImage.slice( 0, 60 ),
			transition: a.transition,
		};
	} );
}
async function fadeTrace( page ) {
	const trace = [];
	for ( let i = 0; i < 10; i++ ) {
		trace.push( ( await state( page ) ).afterOpacity.toFixed( 2 ) );
		await page.waitForTimeout( 50 );
	}
	return trace.join( ' ' );
}
async function pixelAtHeaderTop( page ) {
	const buf = await page.screenshot( { clip: { x: 10, y: 2, width: 1, height: 1 } } );
	return page.evaluate( async ( b64 ) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + b64;
		await img.decode();
		const c = document.createElement( 'canvas' );
		c.width = 1;
		c.height = 1;
		c.getContext( '2d' ).drawImage( img, 0, 0 );
		const d = c.getContext( '2d' ).getImageData( 0, 0, 1, 1 ).data;
		return d[ 0 ] + d[ 1 ] + d[ 2 ];
	}, buf.toString( 'base64' ) );
}

for ( const width of [ 375, 768, 1440 ] ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	await page.goto( url + ( url.includes( '?' ) ? '&' : '?' ) + 'nocache=' + Date.now(), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );
	await page.mouse.move( width / 2, 450 );

	const rest     = await state( page );
	const restPx   = await pixelAtHeaderTop( page );
	for ( let i = 0; i < 8; i++ ) {
		await page.mouse.wheel( 0, 60 );
		await page.waitForTimeout( 40 );
	}
	const downTrace = await fadeTrace( page );
	const down      = await state( page );
	const downPx    = await pixelAtHeaderTop( page );
	await page.mouse.wheel( 0, -5 );
	await page.waitForTimeout( 300 );
	const up5 = await state( page );
	await page.mouse.wheel( 0, -10 );
	const upTrace = await fadeTrace( page );
	const up15    = await state( page );

	console.log( `\n== ${ width }px` );
	console.log( `  rest      y=${ rest.scrollY } scrolled=${ rest.scrolled } ::after=${ rest.afterOpacity } image=${ rest.afterImage } transition=${ rest.transition } pixelSum=${ restPx }` );
	console.log( `  down      y=${ down.scrollY } scrolled=${ down.scrolled } ::after=${ down.afterOpacity } pixelSum=${ downPx } fade: ${ downTrace }` );
	console.log( `  up 5px    y=${ up5.scrollY } scrolled=${ up5.scrolled } ::after=${ up5.afterOpacity }` );
	console.log( `  up 15px   y=${ up15.scrollY } scrolled=${ up15.scrolled } ::after=${ up15.afterOpacity } fade: ${ upTrace }` );

	if ( rest.scrolled || 1 !== rest.afterOpacity || 'none' === rest.afterImage ) {
		failures.push( `${ width }: at rest the fill layer is not showing (scrolled=${ rest.scrolled }, opacity=${ rest.afterOpacity }, image=${ rest.afterImage })` );
	}
	if ( ! ( restPx < downPx ) ) {
		failures.push( `${ width }: the resting fill does not darken the header's top edge (rest ${ restPx } vs scrolled ${ downPx })` );
	}
	if ( down.scrollY <= 100 || ! down.scrolled || 0 !== down.afterOpacity ) {
		failures.push( `${ width }: scrolling down past 100px did not fade the fill (y=${ down.scrollY }, scrolled=${ down.scrolled }, opacity=${ down.afterOpacity })` );
	}
	if ( ! up5.scrolled ) {
		failures.push( `${ width }: a 5px upward scroll cleared the state (the 8px deadzone failed)` );
	}
	if ( up15.scrolled || 1 !== up15.afterOpacity || up15.scrollY <= 100 ) {
		failures.push( `${ width }: scrolling up 15px at y=${ up15.scrollY } did not restore the fill (scrolled=${ up15.scrolled }, opacity=${ up15.afterOpacity })` );
	}
	await page.close();
}
await browser.close();
console.log( failures.length ? `\nFAIL (${ failures.length })\n  ` + failures.join( '\n  ' ) : '\nPASS' );
process.exit( failures.length ? 1 : 0 );
