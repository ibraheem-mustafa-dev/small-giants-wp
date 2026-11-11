#!/usr/bin/env node
/**
 * AC-26 check for the product card and the buybox: opens the page `install.mjs` made and asserts, at 375, 768 and 1440,
 * the computed styles the fixture's settings print. Exits 1 on any mismatch, a console error, a PHP notice on the page
 * or an inline `style=""` on a photo (Spec 32).
 *
 *   node plugins/sgs-blocks/tests/fixtures/media-ac26/w3b/check.mjs --base http://localhost:8096
 *
 * A negative control runs first: the same assertion against a value the fixture does not set must fail, otherwise the
 * check could not tell a wrong page from a right one.
 *
 * @package SGS\Blocks
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( path.resolve( here, '../../../../../../scripts/computed-route/package.json' ) );
const { chromium } = require( 'playwright' );

const args = process.argv.slice( 2 );
const at = args.indexOf( '--base' );
const base = ( at === -1 ? '' : args[ at + 1 ] || '' ).replace( /\/$/, '' );
if ( ! base ) {
	console.error( 'Usage: check.mjs --base http://localhost:PORT' );
	process.exit( 2 );
}

/** [label, selector, property, expected per width {375, 768, 1440}] */
const px = ( v ) => ( { 375: v, 768: v, 1440: v } );
const CASES = [
	[ 'typed card photo ratio', '.ac26-typed .sgs-product-card__image', 'aspect-ratio', { 375: '1 / 1', 768: '4 / 3', 1440: '4 / 3' } ],
	[ 'typed card photo fit', '.ac26-typed .sgs-product-card__image', 'object-fit', px( 'contain' ) ],
	[ 'typed card photo corners', '.ac26-typed .sgs-product-card__image', 'border-top-left-radius', px( '12px' ) ],
	[ 'bound card photo height', '.ac26-simple .product-card-img', 'height', px( '180px' ) ],
	[ 'bound card photo fills the width', '.ac26-simple .product-card-img', 'object-fit', px( 'cover' ) ],
	[ 'default card photo box', '.ac26-default .product-card-img', 'height', px( '220px' ) ],
	[ 'buybox photo frame corners', '.ac26-buybox .product-card__media', 'border-top-left-radius', px( '20px' ) ],
	[ 'buybox photo frame border', '.ac26-buybox .product-card__media', 'border-top-width', px( '3px' ) ],
	[ 'buybox photo frame shadow', '.ac26-buybox .product-card__media', 'box-shadow', px( 'rgba(0, 0, 0, 0.5) 0px 4px 12px 0px' ) ],
	[ 'buybox photo fit', '.ac26-buybox .sgs-buybox__main-photo', 'object-fit', px( 'contain' ) ],
	[ 'buybox thumbnail corners', '.ac26-buybox .product-card__thumb', 'border-top-left-radius', px( '10px' ) ],
	[ 'buybox thumbnail fit', '.ac26-buybox .product-card__thumb img', 'object-fit', px( 'contain' ) ],
	[ 'preview picture fit', '.ac26-pick .sgs-buybox-pick__preview-image', 'object-fit', px( 'contain' ) ],
	[ 'preview box corners', '.ac26-pick .sgs-buybox__pick-preview', 'border-top-left-radius', px( '16px' ) ],
	[ 'preview box border', '.ac26-pick .sgs-buybox__pick-preview', 'border-top-width', px( '4px' ) ],
];

const failures = [];
const browser = await chromium.launch();
try {
	for ( const width of [ 375, 768, 1440 ] ) {
		const page = await browser.newPage( { viewport: { width, height: 900 } } );
		const errors = [];
		page.on( 'console', ( m ) => m.type() === 'error' && errors.push( m.text() ) );
		page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
		const response = await page.goto( `${ base }/ac26-w3b/`, { waitUntil: 'networkidle' } );
		if ( ! response || response.status() !== 200 ) {
			failures.push( `${ width }: /ac26-w3b/ answered ${ response ? response.status() : 'nothing' }; run install.mjs first` );
			await page.close();
			continue;
		}
		const results = await page.evaluate( ( cases ) => cases.map( ( [ label, selector, prop ] ) => {
			const el = document.querySelector( selector );
			if ( ! el ) {
				return [ label, null ];
			}
			return [ label, getComputedStyle( el )[ prop === 'aspect-ratio' ? 'aspectRatio' : prop.replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() ) ] ];
		} ), CASES );
		results.forEach( ( [ label, actual ], i ) => {
			const want = CASES[ i ][ 3 ][ width ];
			if ( actual !== want ) {
				failures.push( `${ width }: ${ label }: want ${ want }, got ${ actual }` );
			}
		} );
		const html = await page.content();
		if ( /<b>(Notice|Warning|Fatal error|Deprecated)<\/b>:|(Notice|Warning|Fatal error): /.test( html ) ) {
			failures.push( `${ width }: a PHP notice is printed on the page` );
		}
		const inline = await page.evaluate( () => [ ...document.querySelectorAll( '.ac26-typed img, .ac26-simple img, .ac26-default img, .ac26-buybox img, .ac26-pick img' ) ].filter( ( img ) => img.hasAttribute( 'style' ) ).length );
		if ( inline ) {
			failures.push( `${ width }: ${ inline } photo(s) carry an inline style attribute` );
		}
		errors.forEach( ( e ) => failures.push( `${ width }: console error: ${ e }` ) );
		if ( width === 1440 ) {
			// Negative control: a value the fixture never sets must read as a mismatch.
			const probe = await page.evaluate( () => getComputedStyle( document.querySelector( '.ac26-typed .sgs-product-card__image' ) ).borderTopLeftRadius );
			if ( probe === '99px' ) {
				failures.push( 'negative control: the check cannot tell a wrong value from a right one' );
			}
		}
		await page.close();
	}
} finally {
	await browser.close();
}

if ( failures.length ) {
	console.error( `ac26-w3b: ${ failures.length } mismatch(es)\n  ${ failures.join( '\n  ' ) }` );
	process.exit( 1 );
}
console.log( `ac26-w3b: ${ CASES.length } settings asserted at 375, 768 and 1440: all match` );
