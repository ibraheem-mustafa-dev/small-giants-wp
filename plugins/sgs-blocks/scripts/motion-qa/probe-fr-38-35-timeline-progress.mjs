/**
 * FR-38-35 live probe — sgs/timeline scroll-driven progress connector.
 *
 * Arms:
 *   1. NATIVE driver  — real Chromium, animation-timeline: view() supported.
 *   2. JS driver      — CSS.supports stubbed false BEFORE any module runs,
 *                       forcing the @supports negative branch + the rAF path.
 *   3. REDUCED motion — must render FULLY FILLED (offset 0), never empty.
 *   4. DOUBLE-LINE    — ::before suppressed exactly on progress instances.
 *
 * The decisive assertion is INTERMEDIATE values: sampling only the endpoints
 * would pass a discrete 0->1 jump-cut, which is the exact C1 failure this
 * whole feature was at risk of.
 */
import { chromium } from 'playwright';

const URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/probe-fr-38-35-timeline-progress-connector/';

const SAMPLE_POINTS = [ 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1 ];

function readAll() {
	return () => {
		const out = [];
		document.querySelectorAll( '.sgs-timeline' ).forEach( ( root ) => {
			const uid = [ ...root.classList ].find( ( c ) => c.startsWith( 'sgs-tl-' ) );
			const isProgress = root.classList.contains(
				'sgs-timeline--connector-progress'
			);
			const path = root.querySelector(
				'.sgs-timeline__progress-path--vertical'
			);
			const hpath = root.querySelector(
				'.sgs-timeline__progress-path--horizontal'
			);
			const beforeDisplay = getComputedStyle( root, '::before' ).display;
			const shown = [ path, hpath ].filter(
				( p ) => p && getComputedStyle( p ).display !== 'none'
			);
			const active = shown[ 0 ] || null;
			// PAINTED GEOMETRY, not just computed style. Every computed-style
			// assertion in this probe passed on 2026-08-28 against an SVG that
			// was 2px x 2px inside a 383px timeline and therefore painted
			// NOTHING: display was block, stroke was right, dasharray was 1px
			// and dashoffset animated correctly. An <svg> with a viewBox has an
			// intrinsic aspect ratio, so an explicit width alone sized it from
			// the RATIO. A style check cannot see that; a box check can.
			const svgEl = root.querySelector( '.sgs-timeline__progress' );
			const svgBox = svgEl ? svgEl.getBoundingClientRect() : null;
			const rootBox = root.getBoundingClientRect();
			const isH = root.classList.contains( 'sgs-timeline--horizontal' );
			// 60% is a deliberately loose floor: the real defect was 0.5%.
			const spanOk = ! isProgress
				? null
				: isH
					? !! svgBox && svgBox.width >= rootBox.width * 0.6
					: !! svgBox && svgBox.height >= rootBox.height * 0.6;

			out.push( {
				uid,
				isProgress,
				svgBox: svgBox
					? [ Math.round( svgBox.width ), Math.round( svgBox.height ) ]
					: null,
				rootBox: [
					Math.round( rootBox.width ),
					Math.round( rootBox.height ),
				],
				spanOk,
				horizontal: root.classList.contains( 'sgs-timeline--horizontal' ),
				beforeDisplay,
				visiblePaths: shown.length,
				dashoffset: active
					? getComputedStyle( active ).strokeDashoffset
					: null,
				dasharray: active ? getComputedStyle( active ).strokeDasharray : null,
				stroke: active ? getComputedStyle( active ).stroke : null,
				progressVar: getComputedStyle( root )
					.getPropertyValue( '--sgs-timeline-fill-progress' )
					.trim(),
			} );
		} );
		return out;
	};
}

async function scrollSample( page, label ) {
	const samples = [];
	for ( const frac of SAMPLE_POINTS ) {
		await page.evaluate( ( f ) => {
			const max = document.body.scrollHeight - window.innerHeight;
			window.scrollTo( 0, Math.round( max * f ) );
		}, frac );
		await page.waitForTimeout( 220 );
		const rows = await page.evaluate( readAll() );
		samples.push( { frac, rows } );
	}
	return { label, samples };
}

function numeric( v ) {
	if ( v === null || v === undefined ) return null;
	const m = String( v ).match( /-?[\d.]+/ );
	return m ? parseFloat( m[ 0 ] ) : null;
}

function analyse( run ) {
	const byUid = new Map();
	for ( const s of run.samples ) {
		for ( const r of s.rows ) {
			if ( ! r.isProgress ) continue;
			if ( ! byUid.has( r.uid ) ) byUid.set( r.uid, [] );
			byUid.get( r.uid ).push( { frac: s.frac, off: numeric( r.dashoffset ) } );
		}
	}
	const report = [];
	for ( const [ uid, pts ] of byUid ) {
		const vals = pts.map( ( p ) => p.off ).filter( ( v ) => v !== null );
		const uniq = [ ...new Set( vals.map( ( v ) => v.toFixed( 3 ) ) ) ];
		const intermediate = vals.filter( ( v ) => v > 0.02 && v < 0.98 ).length;
		report.push( {
			uid,
			distinct: uniq.length,
			intermediate,
			min: vals.length ? Math.min( ...vals ).toFixed( 3 ) : null,
			max: vals.length ? Math.max( ...vals ).toFixed( 3 ) : null,
			series: pts.map( ( p ) => `${ p.frac }:${ p.off?.toFixed( 3 ) }` ).join( ' ' ),
		} );
	}
	return report;
}

const results = {};

// ---- Arm 1: native ----
{
	const b = await chromium.launch();
	const page = await b.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( URL, { waitUntil: 'networkidle' } );
	const supports = await page.evaluate( () =>
		window.CSS?.supports?.( 'animation-timeline', 'view()' )
	);
	results.native = { supports, ...( await scrollSample( page, 'native' ) ) };
	results.nativeStatic = await page.evaluate( readAll() );
	await b.close();
}

// ---- Arm 2: forced JS driver ----
{
	const b = await chromium.launch();
	const page = await b.newPage( { viewport: { width: 1440, height: 900 } } );
	// Stub BEFORE any page script runs, so both the JS driver's feature-detect
	// and (via CSS.supports) any script-side branch see "unsupported".
	await page.addInitScript( () => {
		const real = window.CSS.supports.bind( window.CSS );
		window.CSS.supports = ( ...a ) => {
			const j = a.join( ' ' );
			if ( j.includes( 'animation-timeline' ) ) return false;
			return real( ...a );
		};
	} );
	await page.goto( URL, { waitUntil: 'networkidle' } );
	results.forcedJs = { ...( await scrollSample( page, 'forced-js' ) ) };
	await b.close();
}

// ---- Arm 3: reduced motion ----
{
	const b = await chromium.launch();
	const page = await b.newPage( {
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'reduce',
	} );
	await page.goto( URL, { waitUntil: 'networkidle' } );
	await page.evaluate( () => window.scrollTo( 0, 400 ) );
	await page.waitForTimeout( 400 );
	results.reduced = await page.evaluate( readAll() );
	await b.close();
}

// ---- Arm 4: breakpoints ----
{
	const b = await chromium.launch();
	results.breakpoints = {};
	for ( const w of [ 375, 768, 1440 ] ) {
		const page = await b.newPage( { viewport: { width: w, height: 800 } } );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		await page.evaluate( () => window.scrollTo( 0, 600 ) );
		await page.waitForTimeout( 300 );
		results.breakpoints[ w ] = await page.evaluate( readAll() );
		await page.close();
	}
	await b.close();
}

console.log( '=== ARM 1 NATIVE — supports view():', results.native.supports );
console.log( JSON.stringify( analyse( results.native ), null, 1 ) );

console.log( '\n=== ARM 2 FORCED-JS (negative branch) ===' );
console.log( JSON.stringify( analyse( results.forcedJs ), null, 1 ) );

console.log( '\n=== ARM 3 REDUCED MOTION (expect offset 0 = FULLY FILLED) ===' );
for ( const r of results.reduced ) {
	console.log(
		` ${ r.uid } progress=${ r.isProgress } offset=${ r.dashoffset } var=${ r.progressVar } ::before=${ r.beforeDisplay }`
	);
}

console.log( '\n=== DOUBLE-LINE CHECK (::before must be none IFF progress) ===' );
for ( const r of results.nativeStatic ) {
	const ok = r.isProgress
		? r.beforeDisplay === 'none' && r.visiblePaths === 1
		: r.beforeDisplay !== 'none' && r.visiblePaths === 0;
	console.log(
		` ${ ok ? 'OK  ' : 'FAIL' } ${ r.uid } progress=${ r.isProgress } ::before=${ r.beforeDisplay } visiblePaths=${ r.visiblePaths } dasharray=${ r.dasharray } stroke=${ r.stroke }`
	);
}

console.log( '\n=== GEOMETRY (svg must SPAN the block — the zero-area check) ===' );
for ( const r of results.nativeStatic ) {
	if ( ! r.isProgress ) continue;
	console.log(
		` ${ r.spanOk ? 'OK  ' : 'FAIL' } ${ r.uid } svg=${ r.svgBox } root=${ r.rootBox }`
	);
}

console.log( '\n=== BREAKPOINTS (visiblePaths must be 1 on every progress instance) ===' );
for ( const [ w, rows ] of Object.entries( results.breakpoints ) ) {
	for ( const r of rows ) {
		if ( ! r.isProgress ) continue;
		console.log(
			` ${ w }px ${ r.uid } horizontal=${ r.horizontal } visiblePaths=${ r.visiblePaths } offset=${ r.dashoffset }`
		);
	}
}
