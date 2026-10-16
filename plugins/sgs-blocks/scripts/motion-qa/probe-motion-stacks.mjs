/**
 * Spec 38A unit M5.Z: live acceptance of stacked-effect composition (FR-38A-23, FR-38A-47, FR-38A-49, FR-38A-50) and the
 * page-weight budget (spec section 3), with every effect on a stack active together.
 *
 * STACKS (the tree is tests/fixtures/motion/pages/motion-stacks.json; elements are found by marker class):
 *   stack-magnet-sheen-ripple  `.m5z-a`  a magnet translate, the sheen band moving and the ripple `::after` painting at once
 *   stack-tilt-scale-lift      `.m5z-b`  rotation in `transform` (non-zero rotateX and rotateY at a corner) with scale 1.04
 *                                        and translate -6px still present
 *   stack-lift-parallax        `.m5z-c`  the lift and the page-basis parallax offset sum to the computed translate within
 *                                        0.5px, with the tilt applied at the same time
 *   stack-layers               `.m5z-d`  the cursor-field ring, the ripple and the sheen layers all present, at most two
 *                                        injected layers on the element, every layer aria-hidden with no text
 *   stack-style-custom-only              no stack element carries an inline channel declaration (custom properties only)
 *   page-weight                          from the network log: total CSS < 100 KB and total JS < 50 KB
 * Each check has a negative control: the control card (`.m5z-control`, no motion) read through the same judge must come
 * out red, and the composed stacks are also read against a wrong expectation that must fail.
 *
 * PAGE-WEIGHT METHOD. Live: every stylesheet and script response of the page load, sized by the bytes on the wire
 * (`request.sizes().responseBodySize`; the decoded body when the engine reports none). The totals are summed over ALL
 * responses, not only the SGS files; the SGS share is reported beside them. Spec 38's tier rules: GSAP (Tier G) is counted
 * inside the JS total, and on a page with no Tier G effect it must be absent (FR-38-3, zero GSAP bytes); a Tier W page
 * (webgl, surface-treatment, wave-gradient, generative-background) has a 120 KB JS budget; the Lottie player (Tier H) is
 * left out of the 50 KB and held to its own 60 KB allowance. --local sums the harness's real files, gzipped (the nearest
 * offline figure to a transfer).
 *
 * TWO MODES
 *   --page <id>   the live site (the fixture built with scripts/wp-build-page.js)
 *   --local       an offline harness built from the repository's own stylesheets and scripts and the renderer's markup
 *                 contract, so the composition is measured in real engines before any deploy
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-stacks.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-motion-stacks.mjs --local [--engine ...]
 *   node scripts/motion-qa/probe-motion-stacks.mjs --self-test      (offline: the judges, the fixture and their controls)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { gotoThroughCheck, settleInView, parseArgs, siteBase, Reporter, collectMotion, styleWritesTransform, FIXTURE_DIR } from './probe-motion-model-lib.mjs';
import * as L from './probe-motion-stacks-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const GAP = 60;
const SEL = { a: '.m5z-a', b: '.m5z-b', c: '.m5z-c', d: '.m5z-d', control: '.m5z-control' };

// ---- Pointer helpers --------------------------------------------------------------------------------------------

/** Scroll the element to the middle of the viewport, wait out Lenis smooth scroll, and return its box. */
const reveal = ( page, sel ) => settleInView( page, sel );

const away = async ( page ) => {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 900 );
};

/** Enter a box at one of its points (as a share of its size) in a few steps, from outside, and let the writers settle. */
async function enter( page, box, [ fx, fy ], settle = 320 ) {
	const x = box.x + box.width * fx;
	const y = box.y + box.height * fy;
	await page.mouse.move( x, y - 40 );
	await page.mouse.move( x, y, { steps: 4 } );
	await page.waitForTimeout( settle );
	return { x, y };
}

const read = ( page, sel ) => page.evaluate( L.readComposed, { sel, gap: GAP } );

/** Tilt stacks: park, enter at the top right corner, read. */
async function cornerRead( page, sel, inset = 12 ) {
	await away( page );
	const box = await reveal( page, sel );
	if ( ! box ) return null;
	// A tilted card's corner is pulled inward, so a pointer within about 20px of an edge flickers out of :hover: read 5% in
	// horizontally and 11.5% down, with `inset` as the floor.
	const x = box.x + box.width - Math.max( inset, box.width * 0.05 );
	const y = box.y + Math.max( inset, box.height * 0.115 );
	await page.mouse.move( x, y - 30 );
	await page.mouse.move( x, y, { steps: 4 } );
	await page.waitForTimeout( 420 );
	return read( page, sel );
}

// ---- The checks -------------------------------------------------------------------------------------------------

async function pressed( page, sel, point ) {
	const box = await reveal( page, sel );
	if ( ! box ) return null;
	await away( page );
	const at = await enter( page, await ( await page.$( sel ) ).boundingBox(), point, 120 );
	await page.mouse.down();
	const reading = await read( page, sel );
	await page.mouse.up();
	return { reading, at };
}

async function stackMagnet( page, rep ) {
	const id = 'stack-magnet-sheen-ripple';
	await page.evaluate( () => document.addEventListener( 'click', ( e ) => e.preventDefault(), true ) );
	const got = await pressed( page, SEL.a, [ 0.97, 0.5 ] );
	if ( ! got ) return rep.check( id, { selector: SEL.a, pass: null, why: 'no .m5z-a element on the page' } );
	const r = got.reading;
	rep.check( id, { selector: SEL.a, property: 'computed translate, the sheen sweep clock and the ::after ripple, read together with the pointer down inside the box', measured: { translate: r.translate, sheen: r.sheen, ripple: r.ripple }, expected: 'translate x above 2px, sheen sweep running and advancing, ripple animating on ::after with a visible circle', pass: L.judgeMagnetStack( r ) } );
	rep.control( id, { selector: SEL.a, property: 'the magnet translate read as rest (the effect with its pull removed)', measured: r.translate, expected: 'rest', red: ! L.judgeMagnetStack( { ...r, translate: 'none' } ) && ! L.judgeMagnetStack( { ...r, sheen: { ...r.sheen, running: false } } ) && ! L.judgeMagnetStack( { ...r, ripple: { ...r.ripple, animating: false } } ) } );
	const plain = await pressed( page, SEL.control, [ 0.97, 0.5 ] );
	rep.control( id, { selector: SEL.control, property: 'the control card pressed at the same point, read through the same judge', measured: plain && { translate: plain.reading.translate, sheen: plain.reading.sheen.layer, ripple: plain.reading.ripple.animating }, expected: 'no translate, no sheen layer, no ripple', red: !! plain && ! L.judgeMagnetStack( plain.reading ) && ! plain.reading.sheen.layer && ! plain.reading.ripple.animating } );
}

async function stackTilt( page, rep ) {
	const id = 'stack-tilt-scale-lift';
	const r = await cornerRead( page, SEL.b );
	if ( ! r ) return rep.check( id, { selector: SEL.b, pass: null, why: 'no .m5z-b element on the page' } );
	const angles = L.decompose( r.matrix );
	rep.check( id, { selector: SEL.b, property: 'computed transform decomposed, scale and translate at the top right corner', measured: { angles, scale: r.scale, translate: r.translate }, expected: 'rotateX and rotateY non-zero (up to 8deg), scale 1.04 and translate y -6px together', pass: L.judgeTiltStack( r ) } );
	rep.control( id, { selector: SEL.b, property: 'the same reading judged with the rotation zeroed, then the lift removed', measured: angles, expected: 'the judge rejects both', red: ! L.judgeTiltStack( { ...r, matrix: { m11: 1, m22: 1, m23: 0, m31: 0 } } ) && ! L.judgeTiltStack( { ...r, translate: '0px 0px' } ) } );
	const plain = await cornerRead( page, SEL.control );
	rep.control( id, { selector: SEL.control, property: 'the control card at its top right corner through the same judge', measured: plain && { scale: plain.scale, translate: plain.translate }, expected: 'no rotation, scale 1 and no lift', red: !! plain && ! L.judgeTiltStack( plain ) } );
}

async function stackLiftParallax( page, rep ) {
	const id = 'stack-lift-parallax';
	const first = await reveal( page, SEL.c );
	if ( ! first ) return rep.check( id, { selector: SEL.c, pass: null, why: 'no .m5z-c element on the page' } );
	await away( page );
	const top = await page.evaluate( ( sel ) => document.querySelector( sel ).getBoundingClientRect().top + window.scrollY, SEL.c );
	await page.evaluate( ( y ) => window.scrollTo( 0, y ), Math.max( 300, Math.round( top - 250 ) ) );
	await page.waitForTimeout( 400 );
	const r = await cornerRead( page, SEL.c, 14 );
	const offset = L.parallaxOffset( r.scrollY );
	rep.check( id, { selector: SEL.c, property: `computed translate y at scrollY ${ r.scrollY } against lift ${ L.LIFT }px plus ratio ${ L.PARALLAX_RATIO } x scrollY (${ offset }px), tilt applied`, measured: { translate: r.translate, angles: L.decompose( r.matrix ), scrollY: r.scrollY }, expected: `translate y ${ L.LIFT + offset }px within 0.5px and rotation non-zero`, pass: L.judgeLiftParallaxStack( r, offset ) } );
	rep.control( id, { selector: SEL.c, property: 'the same reading against the lift alone (no parallax term)', measured: r.translate, expected: `${ L.LIFT }px, which the parallax offset must break`, red: ! L.judgeLiftParallaxStack( r, 0 ) && L.judgeLiftParallaxStack( r, offset ) } );
	const plain = await cornerRead( page, SEL.control );
	rep.control( id, { selector: SEL.control, property: 'the control card at the same scroll position through the same judge', measured: plain && plain.translate, expected: 'no lift, no parallax, no tilt', red: !! plain && ! L.judgeLiftParallaxStack( plain, offset ) } );
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
}

async function stackLayers( page, rep ) {
	const id = 'stack-layers';
	const got = await pressed( page, SEL.d, [ 0.55, 0.5 ] );
	if ( ! got ) return rep.check( id, { selector: SEL.d, pass: null, why: 'no .m5z-d element on the page' } );
	const r = got.reading;
	rep.check( id, { selector: SEL.d, property: 'injected layers, the ring, the ripple on ::after and the sheen band, with the pointer down in the card', measured: { layers: r.layers, ring: r.ring, ripple: r.ripple, sheen: r.sheen, pseudoContent: r.pseudoContent }, expected: 'ring, ripple and sheen all painting; at most two injected layers; each aria-hidden with no text; ::before and ::after hold no text', pass: L.judgeLayerStack( r ) && r.pseudoContent.length === 0 } );
	const crowded = [ ...r.layers, { layer: 'third', ariaHidden: 'true', text: '' } ];
	rep.control( id, { selector: SEL.d, property: 'the layer list with a planted third layer, then a layer without aria-hidden', measured: crowded.length, expected: 'the judge rejects both', red: ! L.layersHidden( crowded ) && ! L.layersHidden( [ { ...r.layers[ 0 ], ariaHidden: null } ] ) } );
	const plain = await pressed( page, SEL.control, [ 0.55, 0.5 ] );
	rep.control( id, { selector: SEL.control, property: 'the control card pressed at the same point through the same judge', measured: plain && plain.reading.layers.length, expected: 'no layers, no ripple', red: !! plain && ! L.judgeLayerStack( plain.reading ) && plain.reading.layers.length === 0 } );
}

async function styleCheck( page, rep ) {
	const id = 'stack-style-custom-only';
	const styles = await page.evaluate( ( sels ) => sels.map( ( s ) => ( { sel: s, style: document.querySelector( s )?.getAttribute( 'style' ) || '' } ) ), [ SEL.a, SEL.b, SEL.c, SEL.d ] );
	const bad = styles.filter( ( s ) => styleWritesTransform( s.style ) || /(^|;)\s*filter\s*:/i.test( s.style ) );
	rep.check( id, { selector: `${ SEL.a }, ${ SEL.b }, ${ SEL.c }, ${ SEL.d }`, property: 'inline style attributes after the stacks ran', measured: styles, expected: 'no transform, translate, rotate, scale, opacity or filter declaration (custom properties only)', pass: bad.length === 0 } );
	rep.control( id, { selector: SEL.a, property: 'a planted inline transform judged by the same rule', measured: 'transform: scale(1)', expected: 'caught', red: styleWritesTransform( '--sgs-mag-x: 4px; transform: scale(1)' ) && ! styleWritesTransform( '--sgs-mag-x: 4px' ) } );
}

function weightRow( rep, log, local ) {
	const w = L.weigh( log );
	const tierG = false;
	// The live fixture carries every effect family: its ceiling is the accepted stress allowance. The offline harness carries four stacks and keeps the client-page budget.
	const stress = ! local;
	const kb = ( n ) => Math.round( ( n / 1024 ) * 10 ) / 10;
	rep.check( 'page-weight', { property: `${ local ? 'gzipped harness files' : 'bytes on the wire' } for ${ w.files } stylesheet and script responses`, measured: { cssKB: kb( w.css ), jsKB: kb( w.js ), gsapKB: kb( w.gsap ), lottieKB: kb( w.lottie ), webglKB: kb( w.webgl ), sgsCssKB: kb( w.sgsCss ), sgsJsKB: kb( w.sgsJs ) }, expected: stress ? 'the stress fixture ceiling: CSS under 200 KB and JS under 100 KB (the client-page budget is 100 KB and 50 KB), zero GSAP bytes with no Tier G effect' : 'CSS under 100 KB, JS under 50 KB (Tier W 120 KB, Lottie player its own 60 KB), zero GSAP bytes with no Tier G effect', pass: w.files > 0 ? L.judgeWeight( w, { tierG, stress } ) : null, why: w.files > 0 ? '' : 'no stylesheet or script response was logged' } );
	rep.control( 'page-weight', { property: 'the same log with a planted 51 KB script, a 101 KB stylesheet and a GSAP file', measured: [ kb( w.js + 101 * 1024 ), kb( w.css + 201 * 1024 ), 'gsap' ], expected: 'each judged over budget', red: ! L.judgeWeight( L.weigh( [ ...log, { url: '/x.js', type: 'js', bytes: 101 * 1024 } ] ), { stress } ) && ! L.judgeWeight( L.weigh( [ ...log, { url: '/x.css', type: 'css', bytes: 201 * 1024 } ] ), { stress } ) && ! L.judgeWeight( L.weigh( [ ...log, { url: '/gsap.min.js', type: 'js', bytes: 10 } ] ), { stress } ) } );
}

/** Collect the page's stylesheet and script responses with their wire size. */
function watchNetwork( page, log ) {
	const pending = [];
	page.on( 'response', ( response ) => {
		const type = response.request().resourceType();
		if ( type !== 'stylesheet' && type !== 'script' ) return;
		pending.push( ( async () => {
			let bytes = 0;
			try {
				bytes = ( await response.request().sizes() ).responseBodySize;
			} catch ( e ) {
				bytes = 0;
			}
			if ( ! ( bytes > 0 ) ) bytes = ( await response.body().catch( () => Buffer.alloc( 0 ) ) ).length;
			log.push( { url: response.url(), type: type === 'stylesheet' ? 'css' : 'js', bytes } );
		} )() );
	} );
	return () => Promise.all( pending );
}

// ---- Self-test --------------------------------------------------------------------------------------------------

export function selfTest() {
	const failures = [];
	const want = ( ok, msg ) => ok || failures.push( msg );
	const rot = ( a, b ) => {
		const r = ( d ) => ( d * Math.PI ) / 180;
		return { m22: Math.cos( r( a ) ), m23: Math.sin( r( a ) ), m11: Math.cos( r( b ) ), m31: Math.sin( r( b ) ) };
	};
	const sheen = { layer: true, running: true, advanced: 60 };
	const ripple = { animating: true, width: 80, opacity: 0.3 };
	const magnet = { translate: '5px 0px', sheen, ripple };
	want( L.judgeMagnetStack( magnet ), 'the full magnet stack passes' );
	want( ! L.judgeMagnetStack( { ...magnet, translate: 'none' } ), 'no magnet translate fails' );
	want( ! L.judgeMagnetStack( { ...magnet, translate: '0px 0px' } ), 'a zero translate fails' );
	want( ! L.judgeMagnetStack( { ...magnet, sheen: { ...sheen, advanced: 0 } } ), 'a frozen sheen fails' );
	want( ! L.judgeMagnetStack( { ...magnet, ripple: { ...ripple, opacity: 0 } } ), 'an invisible ripple fails' );
	const tilt = { matrix: rot( 8, 8 ), scale: '1.04 1.04', translate: '0px -6px' };
	want( L.judgeTiltStack( tilt ), 'rotation with scale and lift passes' );
	want( ! L.judgeTiltStack( { ...tilt, matrix: rot( 0, 0 ) } ), 'no rotation fails' );
	want( ! L.judgeTiltStack( { ...tilt, scale: '1' } ), 'a lost scale fails' );
	want( ! L.judgeTiltStack( { ...tilt, translate: 'none' } ), 'a lost lift fails' );
	want( ! L.judgeTiltStack( { ...tilt, matrix: rot( 20, 20 ) } ), 'a rotation past the maximum fails' );
	want( L.parallaxOffset( 500 ) === 90 && L.parallaxOffset( 333 ) === 60, 'the parallax offset is ratio x scroll, rounded to 1px' );
	const sum = { matrix: rot( 6, 6 ), translate: '0px 84px' };
	want( L.judgeLiftParallaxStack( sum, 90 ), 'lift plus parallax within 0.5px passes' );
	want( L.judgeLiftParallaxStack( { ...sum, translate: '0px 84.4px' }, 90 ), 'a 0.4px error passes' );
	want( ! L.judgeLiftParallaxStack( { ...sum, translate: '0px 84.6px' }, 90 ), 'a 0.6px error fails' );
	want( ! L.judgeLiftParallaxStack( { ...sum, translate: '0px -6px' }, 90 ), 'a parallax overwritten by the lift fails' );
	want( ! L.judgeLiftParallaxStack( { ...sum, matrix: rot( 0, 0 ) }, 90 ), 'no tilt fails' );
	const hidden = [ { layer: 'cursor-field-ring', ariaHidden: 'true', text: '' }, { layer: 'sheen', ariaHidden: 'true', text: '' } ];
	want( L.layersHidden( hidden ), 'two hidden empty layers pass' );
	want( ! L.layersHidden( [ ...hidden, { layer: 'x', ariaHidden: 'true', text: '' } ] ), 'a third layer fails' );
	want( ! L.layersHidden( [ { ...hidden[ 0 ], ariaHidden: null }, hidden[ 1 ] ] ), 'a layer without aria-hidden fails' );
	want( ! L.layersHidden( [ { ...hidden[ 0 ], text: 'x' }, hidden[ 1 ] ] ), 'a layer with text fails' );
	const kb = ( n ) => n * 1024;
	const ok = [ { url: '/wp-content/plugins/sgs-blocks/build/a.css', type: 'css', bytes: kb( 40 ) }, { url: '/wp-content/plugins/sgs-blocks/build/a.js', type: 'js', bytes: kb( 20 ) } ];
	want( L.judgeWeight( L.weigh( ok ) ), 'a page under both budgets passes' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/b.js', type: 'js', bytes: kb( 31 ) } ] ) ), 'JS over 50 KB fails' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/b.css', type: 'css', bytes: kb( 61 ) } ] ) ), 'CSS over 100 KB fails' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/build/gsap.min.js', type: 'js', bytes: kb( 5 ) } ] ) ), 'GSAP bytes on a no-Tier-G page fail' );
	want( L.judgeWeight( L.weigh( [ ...ok, { url: '/build/gsap.min.js', type: 'js', bytes: kb( 5 ) } ] ), { tierG: true } ), 'GSAP bytes on a Tier G page count in the total and pass under budget' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/build/gsap.min.js', type: 'js', bytes: kb( 40 ) } ] ), { tierG: true } ), 'GSAP counted in the JS total: 60 KB fails' );
	want( L.judgeWeight( L.weigh( [ ...ok, { url: '/build/lottie.js', type: 'js', bytes: kb( 55 ) } ] ) ), 'the Lottie player is held to its own 60 KB allowance' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/build/lottie.js', type: 'js', bytes: kb( 61 ) } ] ) ), 'a Lottie player over 60 KB fails' );
	want( L.judgeWeight( L.weigh( [ ...ok, { url: '/build/webgl-renderer.js', type: 'js', bytes: kb( 80 ) } ] ) ), 'a Tier W page has 120 KB' );
	want( L.judgeWeight( L.weigh( [ ...ok, { url: '/b.js', type: 'js', bytes: kb( 60 ) }, { url: '/b.css', type: 'css', bytes: kb( 100 ) } ] ), { stress: true } ), 'the stress fixture ceiling admits 80 KB of JS and 140 KB of CSS' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/b.js', type: 'js', bytes: kb( 81 ) } ] ), { stress: true } ), 'the stress ceiling still fails JS over 100 KB' );
	want( ! L.judgeWeight( L.weigh( [ ...ok, { url: '/b.css', type: 'css', bytes: kb( 161 ) } ] ), { stress: true } ), 'the stress ceiling still fails CSS over 200 KB' );
	want( styleWritesTransform( '--a:1; transform: none' ) && ! styleWritesTransform( '--a:1' ), 'the inline style judge catches a transform' );
	const tree = JSON.parse( fs.readFileSync( path.join( FIXTURE_DIR, 'motion-stacks.json' ), 'utf8' ) );
	const found = collectMotion( tree ).map( ( m ) => m.className );
	for ( const cls of [ 'm5z-a', 'm5z-b', 'm5z-c', 'm5z-d' ] ) want( found.includes( cls ), `the fixture carries ${ cls }` );
	want( JSON.stringify( tree ).includes( 'm5z-control' ), 'the fixture carries the control card' );
	const effects = JSON.stringify( collectMotion( tree ).map( ( m ) => m.motion ) );
	for ( const e of [ 'magnet', 'sheen', 'ripple', 'cursor-field', 'parallax', 'followPointer' ] ) want( effects.includes( e ), `the fixture uses ${ e }` );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

// ---- Main -------------------------------------------------------------------------------------------------------

async function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const local = argv.includes( '--local' );
	const args = parseArgs( [ 'node', 'probe', ...argv.filter( ( a ) => a !== '--local' ) ] );
	if ( ! local && ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/motion-stacks.json), --local or --self-test.' );
		process.exit( 1 );
	}
	const url = local ? null : `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m5z`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( { headless: ! process.env.SGS_HEADED, ...( process.env.SGS_HEADED && { channel: "chrome" } ) } );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: local ? 'local' : 'live' } );
			const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
			const log = [];
			try {
				let page;
				let settled = async () => {};
				if ( local ) {
					page = await L.openHarness( context, log );
				} else {
					page = await context.newPage();
					settled = watchNetwork( page, log );
					await gotoThroughCheck( page, url );
				}
				await page.waitForTimeout( 500 );
				await settled();
				for ( const run of [ stackMagnet, stackTilt, stackLiftParallax, stackLayers, styleCheck ] ) {
					try {
						await run( page, rep );
					} catch ( e ) {
						rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
				}
				weightRow( rep, log, local );
			} catch ( e ) {
				rep.check( 'error:setup', { pass: false, why: String( e && e.message ? e.message : e ) } );
			}
			await context.close();
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	process.exit( finish.summary() );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().catch( ( e ) => {
		console.error( e );
		process.exit( 1 );
	} );
}
