// Reads the motion writer's proof page on indus-test at 375, 768 and 1440: per block, the renderer's data-sgs-me, the
// --sgs-me-* custom properties and the CSS animation the browser runs (name, duration, delay, curve); the marquee's
// data-sgs-fx, --sgs-marquee-speed and its lane's measured speed in px/s. Compares each with the draft's values.
import { chromium } from 'playwright';

const URL = 'https://lavender-dinosaur-183533.hostingersite.com/motion-writer-proof/';
const EXPECT = [
	{ label: 'Hero heading', delay: 80, dur: 900 },
	{ label: 'Hero text', delay: 190, dur: 900 },
	{ label: 'Hero button', delay: 300, dur: 900 },
	{ label: 'Hero panel', delay: 410, dur: 900 },
	{ label: 'Section reveal', delay: 0, dur: 850 },
	{ label: 'Item one', delay: 0, dur: 800 },
	{ label: 'Item two', delay: 80, dur: 800 },
];
const ms = ( s ) => ( /ms$/.test( s ) ? parseFloat( s ) : parseFloat( s ) * 1000 );
const browser = await chromium.launch( { channel: 'chrome' } ).catch( () => chromium.launch() );
let failures = 0;
try {
	for ( const width of [ 375, 768, 1440 ] ) {
		const page = await browser.newPage( { viewport: { width, height: 900 } } );
		await page.goto( `${ URL }?nocache=${ Date.now() }`, { waitUntil: 'networkidle' } );
		for ( let y = 0; y < 8; y++ ) {
			await page.mouse.wheel( 0, 700 );
			await page.waitForTimeout( 250 );
		}
		await page.waitForTimeout( 1500 );
		const rows = await page.evaluate( ( labels ) => labels.map( ( label ) => {
			const textEl = [ ...document.querySelectorAll( 'h1,h2,h3,h4,p,a,span,div' ) ].find( ( e ) => e.childElementCount === 0 && e.textContent.trim().startsWith( label ) );
			const el = textEl?.closest( '[data-sgs-me]' );
			if ( ! el ) {
				return { label, found: !! textEl, me: null };
			}
			const cs = getComputedStyle( el );
			return { label, me: el.getAttribute( 'data-sgs-me' ), dur: cs.getPropertyValue( '--sgs-me-dur' ).trim(), delay: cs.getPropertyValue( '--sgs-me-delay' ).trim(), ease: cs.getPropertyValue( '--sgs-me-ease' ).trim(), animName: cs.animationName, animDur: cs.animationDuration, animDelay: cs.animationDelay, animEase: cs.animationTimingFunction, opacity: cs.opacity };
		} ), EXPECT.map( ( e ) => e.label ) );
		console.log( `\n== ${ width }px` );
		for ( const r of rows ) {
			const e = EXPECT.find( ( x ) => x.label === r.label );
			const names = r.me ? r.animName.split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ) : [];
			const at = ( list ) => String( list ).split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ).filter( ( _, i ) => /^sgs-me-/.test( names[ i ] ) );
			const durs = at( r.animDur ).map( ms );
			const delays = at( r.animDelay ).map( ms );
			const eases = [ ...new Set( at( r.animEase ) ) ];
			r.animDur = [ ...new Set( durs ) ].join( '/' ) + 'ms';
			r.animDelay = [ ...new Set( delays ) ].join( '/' ) + 'ms';
			r.animEase = eases.join( ' / ' );
			r.animName = names.filter( ( n ) => /^sgs-me-/.test( n ) ).join( ' ' );
			const ok = r.me && durs.length > 0 && durs.every( ( d ) => Math.abs( d - e.dur ) < 1 ) && delays.every( ( d ) => Math.abs( d - e.delay ) < 1 ) && 'cubic-bezier(0.16, 0.84, 0.32, 1)' === r.animEase && '1' === r.opacity;
			failures += ok ? 0 : 1;
			console.log( `${ ok ? 'PASS' : 'FAIL' } ${ r.label }: data-sgs-me=${ r.me } anim ${ r.animName } ${ r.animDur } delay ${ r.animDelay } ease ${ r.animEase } | --sgs-me-dur ${ r.dur } --sgs-me-delay ${ r.delay } | opacity ${ r.opacity } (draft ${ e.dur }ms, delay ${ e.delay }ms)` );
		}
		const mq = await page.evaluate( async () => {
			const strip = document.querySelector( '[data-sgs-fx~="marquee"]' );
			const lane = strip?.querySelector( '[data-sgs-marquee-set]' );
			if ( ! strip || ! lane ) {
				return null;
			}
			strip.scrollIntoView( { block: 'center', behavior: 'instant' } );
			await new Promise( ( r ) => setTimeout( r, 600 ) );
			const x = () => lane.getBoundingClientRect().left;
			const a = x();
			const t0 = performance.now();
			await new Promise( ( r ) => setTimeout( r, 1000 ) );
			const b = x();
			return { fx: strip.getAttribute( 'data-sgs-fx' ), speedVar: getComputedStyle( strip ).getPropertyValue( '--sgs-marquee-speed' ).trim(), pxPerS: Math.round( ( Math.abs( b - a ) / ( ( performance.now() - t0 ) / 1000 ) ) * 10 ) / 10, dir: b < a ? 'left' : 'right' };
		} );
		const mqOk = mq && Math.abs( mq.pxPerS - 45 ) <= 0.9 && 'left' === mq.dir;
		failures += mqOk ? 0 : 1;
		// The planted draft's SVG pulse: opacity 1 to 0.4 and back every 2000ms, read every 25ms over 4.2s with the block
		// on screen (the loop control pauses an off-screen loop).
		const pulse = await page.evaluate( async () => {
			const label = [ ...document.querySelectorAll( 'p' ) ].find( ( e ) => e.textContent.startsWith( 'SVG pulse' ) );
			const el = label?.closest( '[data-sgs-fx~="svg-loop"]' );
			if ( ! el ) {
				return null;
			}
			el.scrollIntoView( { block: 'center', behavior: 'instant' } );
			await new Promise( ( r ) => setTimeout( r, 300 ) );
			const samples = [];
			const t0 = performance.now();
			while ( performance.now() - t0 < 4200 ) {
				samples.push( [ performance.now() - t0, parseFloat( getComputedStyle( el ).opacity ) ] );
				await new Promise( ( r ) => setTimeout( r, 25 ) );
			}
			const min = Math.min( ...samples.map( ( s ) => s[ 1 ] ) );
			const dips = samples.filter( ( s, i ) => i > 0 && i < samples.length - 1 && s[ 1 ] <= samples[ i - 1 ][ 1 ] && s[ 1 ] < samples[ i + 1 ][ 1 ] && s[ 1 ] < min + 0.05 ).map( ( s ) => s[ 0 ] );
			return { fx: el.getAttribute( 'data-sgs-fx' ), min: Math.round( min * 100 ) / 100, max: Math.round( Math.max( ...samples.map( ( s ) => s[ 1 ] ) ) * 100 ) / 100, periodMs: dips.length > 1 ? Math.round( dips[ dips.length - 1 ] - dips[ dips.length - 2 ] ) : null };
		} );
		const pulseOk = pulse && Math.abs( pulse.min - 0.4 ) <= 0.05 && pulse.max >= 0.95 && Math.abs( pulse.periodMs - 2000 ) <= 100;
		failures += pulseOk ? 0 : 1;
		console.log( `${ pulseOk ? 'PASS' : 'FAIL' } svg pulse: ${ JSON.stringify( pulse ) } (draft: opacity 1 to 0.4 every 2000ms)` );
		console.log( `${ mqOk ? 'PASS' : 'FAIL' } marquee: ${ JSON.stringify( mq ) } (draft 45px/s left, within 2%)` );
		await page.close();
	}
} finally {
	await browser.close();
}
console.log( `\n${ failures } failure(s)` );
process.exit( failures ? 1 : 0 );
