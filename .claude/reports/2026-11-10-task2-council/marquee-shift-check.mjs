// Does an overflow-mode marquee that fits paint its running layout first and then jump (layout shift)? Task 2 council, 2026-11-10.
import { createRequire } from 'module';
const require = createRequire( 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json' );
const { chromium } = require( 'playwright' );
const url = process.argv[ 2 ] || 'http://localhost:8082/?page_id=5957';
const b = await chromium.launch( { channel: 'chrome' } );
for ( const w of [ 1440, 768, 375 ] ) {
	const ctx = await b.newContext( { viewport: { width: w, height: 1200 } } );
	await ctx.addInitScript( () => {
		window.__shifts = [];
		window.__marks = [];
		new PerformanceObserver( ( l ) => l.getEntries().forEach( ( e ) => window.__shifts.push( { v: e.value, t: Math.round( e.startTime ), src: ( e.sources || [] ).map( ( s ) => ( s.node && s.node.className ) ? String( s.node.className ).slice( 0, 50 ) : '' ) } ) ) ).observe( { type: 'layout-shift', buffered: true } );
		document.addEventListener( 'DOMContentLoaded', () => {
			window.__marks = [ ...document.querySelectorAll( '[data-sgs-fx~="marquee"]' ) ].map( ( r ) => ( { below: r.getAttribute( 'data-sgs-fx-marquee-below-breakpoint' ), markedAtDCL: r.getAttribute( 'data-sgs-marquee' ) } ) );
		} );
	} );
	const p = await ctx.newPage();
	await p.goto( url, { waitUntil: 'load' } );
	await p.waitForTimeout( 2500 );
	const r = await p.evaluate( () => ( {
		marks: window.__marks,
		final: [ ...document.querySelectorAll( '[data-sgs-fx~="marquee"]' ) ].map( ( r ) => r.querySelectorAll( '[data-sgs-marquee-clone]' ).length > 0 ),
		shifts: window.__shifts,
	} ) );
	const cls = r.shifts.reduce( ( s, e ) => s + e.v, 0 );
	console.log( `${ w }: CLS ${ cls.toFixed( 4 ) }; bars ${ r.marks.map( ( m, i ) => `${ i }:${ m.below }/markedAtDCL=${ m.markedAtDCL }/runs=${ r.final[ i ] }` ).join( ' ' ) }` );
	r.shifts.forEach( ( s ) => console.log( `   shift ${ s.v.toFixed( 4 ) } at ${ s.t }ms ${ s.src.join( ' | ' ) }` ) );
	await ctx.close();
}
await b.close();
