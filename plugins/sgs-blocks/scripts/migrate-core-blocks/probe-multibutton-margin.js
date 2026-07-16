#!/usr/bin/env node
/**
 * Settles one question empirically: does `style.spacing.margin` actually
 * RENDER on sgs/multi-button (which declares no spacing support, but routes
 * through SGS_Container_Wrapper — which reads style.spacing.* directly)?
 *
 * Expected --wp--preset--spacing--40 on this canary if it works.
 */
const { chromium } = require( 'playwright' );

( async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto(
		'https://sandybrown-nightingale-600381.hostingersite.com/tc-multibutton-margin-probe/',
		{ waitUntil: 'networkidle' }
	);
	const out = await page.evaluate( () => {
		const spacing40 = getComputedStyle( document.documentElement )
			.getPropertyValue( '--wp--preset--spacing--40' ).trim();
		const core = document.querySelector( '.wp-block-buttons' );
		const sgs = document.querySelector( '.wp-block-sgs-multi-button, .sgs-multi-button' );
		const read = ( el ) =>
			el
				? {
						classes: el.className,
						marginTop: getComputedStyle( el ).marginTop,
						inlineStyle: el.getAttribute( 'style' ) || '(none)',
				  }
				: 'NOT FOUND';
		return { spacing40, core: read( core ), sgs: read( sgs ) };
	} );
	console.log( JSON.stringify( out, null, 1 ) );
	await browser.close();
} )();
