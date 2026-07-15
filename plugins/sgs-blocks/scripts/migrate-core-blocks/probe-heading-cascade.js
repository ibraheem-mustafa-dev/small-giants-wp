#!/usr/bin/env node
/**
 * Diagnose WHY a heading's colour/letter-spacing differs between the core
 * and SGS renders: dump the theme's preset custom properties and enumerate
 * every CSS rule that matches the element (live DOM, never static parsing).
 */
const { chromium } = require( 'playwright' );

( async () => {
	const [ url, needle ] = process.argv.slice( 2 );
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( url, { waitUntil: 'networkidle' } );
	const out = await page.evaluate( ( text ) => {
		const root = getComputedStyle( document.documentElement );
		const vars = {};
		for ( const name of [ 'primary', 'text', 'text-muted', 'secondary', 'accent' ] ) {
			vars[ name ] = root.getPropertyValue( `--wp--preset--color--${ name }` ).trim();
		}
		const el = Array.from(
			document.querySelectorAll( 'p, h1, h2, h3, h4, h5, h6' )
		).find( ( n ) => ( n.innerText || '' ).trim().startsWith( text ) );
		if ( ! el ) {
			return { vars, error: 'element not found' };
		}
		const cs = getComputedStyle( el );
		const matched = [];
		for ( const sheet of document.styleSheets ) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch ( e ) {
				continue;
			}
			for ( const rule of rules ) {
				if ( ! rule.selectorText ) {
					continue;
				}
				let hit = false;
				try {
					hit = el.matches( rule.selectorText );
				} catch ( e ) {
					continue;
				}
				if ( hit && /color|letter-spacing/.test( rule.cssText ) ) {
					matched.push( rule.cssText.slice( 0, 200 ) );
				}
			}
		}
		return {
			vars,
			tag: el.tagName.toLowerCase(),
			classes: el.className,
			computed: { color: cs.color, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize },
			matchedRules: matched,
		};
	}, needle );
	console.log( JSON.stringify( out, null, 1 ) );
	await browser.close();
} )();
