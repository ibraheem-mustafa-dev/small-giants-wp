// Does an overflow-mode marquee decide differently on a fresh load (ready gate pre-marks the root) than after a resize?
// Fresh load at each width vs one page resized through the same widths. Task 2 council, 2026-11-10.
import { createRequire } from 'module';
const require = createRequire( 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json' );
const { chromium } = require( 'playwright' );
const url = process.argv[ 2 ] || 'http://localhost:8082/?page_id=5957';
const widths = [];
for ( let w = 1440; w >= 320; w -= 40 ) widths.push( w );

const b = await chromium.launch( { channel: 'chrome' } );
const read = ( p ) => p.evaluate( () => ( {
	gate: !! document.getElementById( 'sgs-marquee-ready-gate' ),
	bars: [ ...document.querySelectorAll( '[data-sgs-fx~="marquee"]' ) ].map( ( r, i ) => ( {
		i, below: r.getAttribute( 'data-sgs-fx-marquee-below-breakpoint' ),
		run: r.querySelectorAll( '[data-sgs-marquee-clone]' ).length > 0,
	} ) ),
} ) );

const fresh = {};
let gateSeen = false;
for ( const w of widths ) {
	const ctx = await b.newContext( { viewport: { width: w, height: 800 } } );
	const p = await ctx.newPage();
	await p.goto( url, { waitUntil: 'load' } );
	await p.waitForTimeout( 1500 );
	const s = await read( p );
	gateSeen = gateSeen || s.gate;
	s.bars.forEach( ( bar ) => { ( fresh[ bar.i ] ||= { below: bar.below, runs: {} } ).runs[ w ] = bar.run; } );
	await ctx.close();
}
const ctx = await b.newContext( { viewport: { width: 1440, height: 800 } } );
const p = await ctx.newPage();
await p.goto( url, { waitUntil: 'load' } );
await p.waitForTimeout( 1500 );
const resized = {};
for ( const w of [ ...widths ].reverse().concat( widths ) ) {
	await p.setViewportSize( { width: w, height: 800 } );
	await p.waitForTimeout( 700 );
	( await read( p ) ).bars.forEach( ( bar ) => { ( resized[ bar.i ] ||= {} )[ w ] = bar.run; } );
}
await b.close();

console.log( 'ready gate printed on page:', gateSeen );
for ( const i of Object.keys( fresh ) ) {
	if ( fresh[ i ].below !== 'overflow' ) continue;
	const diff = widths.filter( ( w ) => fresh[ i ].runs[ w ] !== resized[ i ][ w ] );
	const runsFresh = widths.filter( ( w ) => fresh[ i ].runs[ w ] );
	const runsResized = widths.filter( ( w ) => resized[ i ][ w ] );
	console.log( `bar ${ i } (overflow): runs on fresh load at <= ${ Math.max( ...runsFresh.length ? runsFresh : [ 0 ] ) }px; after resize at <= ${ Math.max( ...runsResized.length ? runsResized : [ 0 ] ) }px; widths that disagree: ${ diff.join( ',' ) || 'none' }` );
}
