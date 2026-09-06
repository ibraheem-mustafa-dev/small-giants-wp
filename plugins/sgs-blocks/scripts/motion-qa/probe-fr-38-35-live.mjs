/**
 * FR-38-35 LIVE verification against the canary, on the shipped mask stack.
 * Asserts PAINTED PIXELS at real scroll positions — not computed style.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import { PNG } from 'pngjs';

const URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/probe-fr-38-35-timeline-progress-connector/';
const OUT = process.argv[ 2 ];
fs.mkdirSync( OUT, { recursive: true } );

const b = await chromium.launch();

/* ---------- structure + markup ---------- */
{
	const p = await b.newPage( { viewport: { width: 1440, height: 900 } } );
	await p.goto( URL, { waitUntil: 'networkidle' } );
	const s = await p.evaluate( () => {
		const out = [];
		document.querySelectorAll( '.sgs-timeline' ).forEach( ( root ) => {
			const uid = [ ...root.classList ].find( ( c ) => c.startsWith( 'sgs-tl-' ) );
			const prog = root.classList.contains( 'sgs-timeline--connector-progress' );
			const el = root.querySelector( '.sgs-timeline__progress' );
			const firstEntry = root.querySelector( '.sgs-timeline__entry' );
			out.push( {
				uid,
				prog,
				tag: el ? el.tagName.toLowerCase() : null,
				isLastChild: el ? root.lastElementChild === el : null,
				firstEntryNth: firstEntry
					? [ ...root.children ].indexOf( firstEntry ) + 1
					: null,
				layers: el
					? [ ...el.children ].map( ( c ) => c.className ).join( '|' )
					: null,
				beforeDisplay: getComputedStyle( root, '::before' ).display,
			} );
		} );
		return out;
	} );
	console.log( '=== STRUCTURE ===' );
	for ( const r of s ) {
		console.log(
			` ${ r.uid } prog=${ String( r.prog ).padEnd( 5 ) } el=<${ r.tag }> last=${ r.isLastChild } firstEntryNth=${ r.firstEntryNth } ::before=${ r.beforeDisplay }`
		);
	}
	await p.close();
}

/* ---------- painted fill vs scroll ---------- */
{
	const p = await b.newPage( { viewport: { width: 1440, height: 900 } } );
	await p.goto( URL, { waitUntil: 'networkidle' } );
	console.log( '\n=== PAINTED FILL (accent pixels down the connector) ===' );
	const seen = [];
	for ( const frac of [ 0.1, 0.25, 0.4, 0.55, 0.7 ] ) {
		await p.evaluate( ( f ) => {
			const m = document.body.scrollHeight - window.innerHeight;
			window.scrollTo( 0, Math.round( m * f ) );
		}, frac );
		await p.waitForTimeout( 400 );
		const geo = await p.evaluate( () => {
			const el = document.querySelector(
				'.sgs-tl-2da0410a .sgs-timeline__progress'
			);
			if ( ! el ) return null;
			const r = el.getBoundingClientRect();
			const root = document
				.querySelector( '.sgs-tl-2da0410a' )
				.getBoundingClientRect();
			return {
				x: Math.round( r.left + r.width / 2 ),
				t: Math.round( r.top ),
				h: Math.round( r.height ),
				pv: getComputedStyle( document.querySelector( '.sgs-tl-2da0410a' ) )
					.getPropertyValue( '--sgs-timeline-fill-progress' )
					.trim(),
				onScreen: root.top < 900 && root.bottom > 0,
			};
		} );
		if ( ! geo ) { console.log( ' progress element missing' ); break; }
		const buf = await p.screenshot();
		const img = PNG.sync.read( buf );
		let painted = 0, total = 0;
		for ( let y = Math.max( 0, geo.t ); y < Math.min( img.height, geo.t + geo.h ); y++ ) {
			total++;
			const o = ( img.width * y + geo.x ) << 2;
			const [ r, g, bl ] = [ img.data[ o ], img.data[ o + 1 ], img.data[ o + 2 ] ];
			if ( r > 150 && r - g > 40 && bl < 210 ) painted++;
		}
		const pct = total ? Math.round( ( painted / total ) * 100 ) : 0;
		seen.push( pct );
		console.log(
			` scroll=${ frac }  var=${ geo.pv }  painted=${ pct }%  onScreen=${ geo.onScreen }`
		);
	}
	const distinct = new Set( seen ).size;
	console.log(
		` distinct painted values: ${ distinct } ${ distinct >= 3 ? '-> PROGRESSIVE' : '-> NOT progressive' }`
	);
	await p.close();
}

/* ---------- reduced motion ---------- */
{
	const p = await b.newPage( {
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'reduce',
	} );
	await p.goto( URL, { waitUntil: 'networkidle' } );
	await p.evaluate( () => window.scrollTo( 0, 300 ) );
	await p.waitForTimeout( 400 );
	const r = await p.evaluate( () => {
		const out = [];
		document
			.querySelectorAll( '.sgs-timeline--connector-progress' )
			.forEach( ( el ) => {
				out.push( {
					uid: [ ...el.classList ].find( ( c ) => c.startsWith( 'sgs-tl-' ) ),
					pv: getComputedStyle( el )
						.getPropertyValue( '--sgs-timeline-fill-progress' )
						.trim(),
					sparks: el.querySelectorAll( '.sgs-timeline__spark' ).length,
				} );
			} );
		return out;
	} );
	console.log( '\n=== REDUCED MOTION (expect var=1, sparks=0) ===' );
	r.forEach( ( x ) =>
		console.log( ` ${ x.uid } var=${ x.pv } sparks=${ x.sparks }` )
	);
	await p.close();
}

/* ---------- screenshots for Bean ---------- */
{
	const p = await b.newPage( { viewport: { width: 1440, height: 950 } } );
	await p.goto( URL, { waitUntil: 'networkidle' } );
	for ( const [ name, frac ] of [
		[ '1-early', 0.18 ],
		[ '2-mid', 0.34 ],
		[ '3-late', 0.5 ],
	] ) {
		await p.evaluate( ( f ) => {
			const m = document.body.scrollHeight - window.innerHeight;
			window.scrollTo( 0, Math.round( m * f ) );
		}, frac );
		await p.waitForTimeout( 500 );
		const el = await p.$( '.sgs-tl-2da0410a' );
		if ( el ) await el.screenshot( { path: `${ OUT }/${ name }.png` } );
	}
	await p.close();
}
await b.close();
console.log( '\nscreenshots ->', OUT );
