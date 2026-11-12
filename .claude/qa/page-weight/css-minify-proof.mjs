// Proof that minifying the hand-written CSS changes no pixel: each page is shot twice as served (A1, A2: the noise
// floor) and once with every theme assets/ and plugin assets/ stylesheet replaced by csso's output (B), at 375 and 1440.
// Usage: node .claude/qa/page-weight/css-minify-proof.mjs [outdir]  (env PROOF_ONLY=url,url  PROOF_WIDTHS=375,1440  PROOF_ORDER=BA)
// A row where noiseA1A2 is also non-zero, or that flips between runs, is a load-timing race, not the CSS.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire( new URL( '../../../plugins/sgs-blocks/package.json', import.meta.url ) );
const csso = req( 'csso' );
const { chromium } = createRequire( new URL( '../../../scripts/computed-route/package.json', import.meta.url ) )( 'playwright' );

const out = process.argv[ 2 ] || 'E:/sgs-tmp/css-minify-proof';
fs.mkdirSync( out, { recursive: true } );
const C = 'https://sandybrown-nightingale-600381.hostingersite.com';
const E = 'https://darkcyan-grouse-898606.hostingersite.com';
const ONLY = process.env.PROOF_ONLY ? process.env.PROOF_ONLY.split(',') : null;
const ALL = [
	C + '/', C + '/blog/', C + '/shop/', C + '/product/qa-simple-toast-fixture/', C + '/product/classic-lactation-cookies/',
	C + '/cart/', C + '/checkout/', E + '/', E + '/shop/', E + '/product/gucci-oversized-cat-eye/', E + '/about/',
];
const pages = ONLY || ALL;
const WIDTHS = process.env.PROOF_WIDTHS ? process.env.PROOF_WIDTHS.split(',').map(Number) : [ 375, 1440 ];
const ORDER = process.env.PROOF_ORDER === 'BA';
const MATCH = /\/(themes\/sgs-theme\/assets|plugins\/sgs-blocks\/assets)\/.*\.css(\?|$)/;

const browser = await chromium.launch();
let swapped = new Set();

async function shoot( url, width, minify ) {
	const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } );
	const page = await ctx.newPage();
	if ( minify ) {
		await page.route( MATCH, async ( route ) => {
			const res = await route.fetch();
			const body = await res.text();
			swapped.add( route.request().url().replace( /\?.*/, '' ).replace( /^.*wp-content\//, '' ) );
			await route.fulfill( { response: res, body: csso.minify( body, { restructure: false, comments: 'exclamation' } ).css } );
		} );
	}
	await page.goto( url, { waitUntil: 'load', timeout: 90000 } );
	// Walk down the page so lazy sections load, then back to the top.
	const h = await page.evaluate( () => document.documentElement.scrollHeight );
	for ( let y = 0; y < h; y += 800 ) {
		await page.evaluate( ( v ) => window.scrollTo( 0, v ), y );
		await page.waitForTimeout( 150 );
	}
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 2500 );
	const png = await page.screenshot( { fullPage: true, animations: 'disabled', caret: 'hide' } );
	await ctx.close();
	return png;
}

const cmpPage = await ( await browser.newContext() ).newPage();
async function diff( a, b ) {
	if ( a.equals( b ) ) {
		return 0;
	}
	return cmpPage.evaluate( async ( [ x, y ] ) => {
		const load = ( s ) => new Promise( ( r ) => { const i = new Image(); i.onload = () => r( i ); i.src = 'data:image/png;base64,' + s; } );
		const [ i1, i2 ] = await Promise.all( [ load( x ), load( y ) ] );
		if ( i1.width !== i2.width || i1.height !== i2.height ) {
			return `size ${ i1.width }x${ i1.height } vs ${ i2.width }x${ i2.height }`;
		}
		const c = new OffscreenCanvas( i1.width, i1.height ).getContext( '2d' );
		c.drawImage( i1, 0, 0 );
		const d1 = c.getImageData( 0, 0, i1.width, i1.height ).data;
		c.clearRect( 0, 0, i1.width, i1.height );
		c.drawImage( i2, 0, 0 );
		const d2 = c.getImageData( 0, 0, i1.width, i1.height ).data;
		let n = 0;
		for ( let k = 0; k < d1.length; k += 4 ) {
			if ( d1[ k ] !== d2[ k ] || d1[ k + 1 ] !== d2[ k + 1 ] || d1[ k + 2 ] !== d2[ k + 2 ] ) {
				n++;
			}
		}
		return n;
	}, [ a.toString( 'base64' ), b.toString( 'base64' ) ] );
}

const rows = [];
for ( const url of pages ) {
	for ( const width of WIDTHS ) {
		swapped = new Set();
		let a1, a2, b;
		if ( ORDER ) {
			b = await shoot( url, width, true );
			a1 = await shoot( url, width, false );
			a2 = await shoot( url, width, false );
		} else {
			a1 = await shoot( url, width, false );
			a2 = await shoot( url, width, false );
			b = await shoot( url, width, true );
		}
		const name = url.replace( /^https:\/\/([a-z]+).*?\.com/, '$1' ).replace( /\W+/g, '_' ) + '_' + width;
		const noise = await diff( a1, a2 );
		const change = await diff( a1, b );
		const change2 = await diff( a2, b );
		if ( change && change2 ) {
			fs.writeFileSync( `${ out }/${ name }_A.png`, a1 );
			fs.writeFileSync( `${ out }/${ name }_B.png`, b );
		}
		const row = { name, swapped: swapped.size, noiseA1A2: noise, A1vsB: change, A2vsB: change2 };
		rows.push( row );
		console.log( JSON.stringify( row ) );
	}
}
fs.writeFileSync( `${ out }/result.json`, JSON.stringify( rows, null, 1 ) );
await browser.close();
