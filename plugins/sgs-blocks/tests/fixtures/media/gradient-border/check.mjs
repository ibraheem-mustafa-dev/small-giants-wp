/**
 * AC-26 fixture check for the gradient border (Spec 49 §8 "BorderColour, gradient forms").
 * Install the page first: `wsl bash install.sh /var/www/<mirror>` (idempotent, prints the URL).
 * Run: node check.mjs --base http://localhost:8104 [--slug gr-gradient-border-fixture]
 * For each `.gr-fix-*` media on the page, at 375, 768 and 1440, asserts the resting border is transparent, a gradient
 * paints as the background-image across the border box and, on hover, the hover gradient replaces it. Exit 1 on mismatch.
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire( path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../../package.json' ) );
const { chromium } = require( 'playwright' );

const arg = ( name, dflt ) => {
	const i = process.argv.indexOf( `--${ name }` );
	return i > 0 ? process.argv[ i + 1 ] : dflt;
};
const base = arg( 'base', '' ).replace( /\/$/, '' );
const slug = arg( 'slug', 'gr-gradient-border-fixture' );
if ( ! base ) {
	console.error( 'usage: node check.mjs --base URL' );
	process.exit( 1 );
}
let fail = 0;
const ck = ( name, ok, extra = '' ) => {
	console.log( `  ${ ok ? 'ok  ' : 'FAIL' } ${ name }${ ok ? '' : '  ' + extra }` );
	fail += ok ? 0 : 1;
};
const read = ( el ) => {
	const cs = getComputedStyle( el );
	const r = el.getBoundingClientRect();
	return {
		image: cs.backgroundImage,
		clip: cs.backgroundClip,
		border: cs.borderTopColor,
		width: cs.borderTopWidth,
		radius: cs.borderTopLeftRadius,
		w: Math.round( r.width ),
		h: Math.round( r.height ),
		notice: /Notice:|Warning:|Fatal error/.test( document.body.innerText ),
	};
};
const browser = await chromium.launch();
for ( const vw of [ 375, 768, 1440 ] ) {
	const page = await browser.newPage( { viewport: { width: vw, height: 900 } } );
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	await page.goto( `${ base }/${ slug }/`, { waitUntil: 'networkidle' } );
	const els = await page.$$( '[class*="gr-fix-"]' );
	console.log( `${ vw }px: ${ els.length } fixture block(s)` );
	ck( `${ vw } fixture blocks present`, els.length > 0 );
	for ( const el of els ) {
		const cls = ( await el.getAttribute( 'class' ) ).match( /gr-fix-\w+/ )[ 0 ];
		const rest = await el.evaluate( read );
		ck( `${ vw } ${ cls } resting border is transparent`, 'rgba(0, 0, 0, 0)' === rest.border, rest.border );
		ck( `${ vw } ${ cls } resting gradient paints the border box`, /gradient\(/.test( rest.image ) && /border-box/.test( rest.clip ), `${ rest.image } | ${ rest.clip }` );
		ck( `${ vw } ${ cls } border width set`, parseFloat( rest.width ) > 0, rest.width );
		ck( `${ vw } ${ cls } no PHP notice`, ! rest.notice );
		await el.scrollIntoViewIfNeeded();
		await el.hover();
		await page.waitForTimeout( 400 );
		const hov = await el.evaluate( read );
		ck( `${ vw } ${ cls } hover gradient replaces the resting one`, hov.image !== rest.image && /gradient\(/.test( hov.image ), `${ rest.image } -> ${ hov.image }` );
		ck( `${ vw } ${ cls } size is unchanged by hover`, hov.w === rest.w && hov.h === rest.h );
	}
	ck( `${ vw } no console error`, 0 === errors.length, errors.join( ';' ) );
	await page.close();
}
await browser.close();
console.log( fail ? `FAIL: ${ fail } check(s)` : 'PASS' );
process.exit( fail ? 1 : 0 );
