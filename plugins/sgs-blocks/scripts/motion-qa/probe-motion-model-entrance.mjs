/**
 * Entrance, reveal, keyframes, scroll-driver and asset-loading checks for probe-motion-model.mjs (Spec 38A unit M2.9).
 * Each exported function takes the shared context { browser, engine, width, markers, rep, newPage, base, args, shared }.
 *
 * @package SGS\Blocks
 */

import { parseTranslate, isRest, near, viewProgress } from './probe-motion-model-lib.mjs';

const PART = '.m29-fade-part [data-sgs-me]';
const ROOT = '.m29-fade-part';
const SIBLING = '.m29-fade-sibling';

const STATE = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const cs = getComputedStyle( el );
	return { opacity: parseFloat( cs.opacity ), translate: cs.translate, animations: el.getAnimations().length, inAttr: el.hasAttribute( 'data-sgs-in' ), ready: document.documentElement.classList.contains( 'sgs-motion-ready' ), fromTy: cs.getPropertyValue( '--sgs-me-from-ty' ).trim(), fromOp: cs.getPropertyValue( '--sgs-me-from-op' ).trim(), animName: cs.animationName, animDur: cs.animationDuration };
};

const missing = ( rep, ids, why ) => ids.forEach( ( id ) => rep.check( id, { pass: null, why } ) );

/** Fade up on one part: reveal gating, JS-blocked visibility, plays on that part only, ends at translate none, distance.sm. */
export async function fadeChecks( ctx ) {
	const { rep, markers } = ctx;
	const ids = [ 'reveal-hidden-only-when-ready', 'fade-plays-on-part-only', 'entrance-ends-translate-none', 'distance-token-resolves', 'js-blocked-visible' ];
	if ( ! markers[ '.m29-fade-part' ] ) return missing( rep, ids, 'no page with .m29-fade-part (hover-entrance fixture) given' );
	const { page, close } = await ctx.newPage( markers[ '.m29-fade-part' ] );
	try {
		await page.waitForTimeout( 400 );
		const pre = await page.evaluate( STATE, PART );
		const rootStamp = await page.evaluate( ( s ) => document.querySelector( s ).hasAttribute( 'data-sgs-me' ), ROOT );
		rep.check( 'reveal-hidden-only-when-ready', { selector: PART, property: 'opacity (before scroll)', measured: { ready: pre.ready, opacity: pre.opacity, inAttr: pre.inAttr, rootStamped: rootStamp }, expected: 'html.sgs-motion-ready present, opacity 0, no data-sgs-in, root not stamped', pass: pre.ready && pre.opacity === 0 && ! pre.inAttr && ! rootStamp } );
		const ungated = await page.evaluate( ( s ) => { document.documentElement.classList.remove( 'sgs-motion-ready' ); const o = parseFloat( getComputedStyle( document.querySelector( s ) ).opacity ); document.documentElement.classList.add( 'sgs-motion-ready' ); return o; }, PART );
		rep.control( 'reveal-hidden-only-when-ready', { selector: PART, property: 'opacity', measured: ungated, expected: '1 once the class is removed (the class is the only gate)', red: ungated === 1 } );

		const sm = await page.evaluate( () => { const d = document.createElement( 'div' ); d.setAttribute( 'style', 'margin-top: var(--wp--custom--distance--sm, 0px)' ); document.body.appendChild( d ); const v = getComputedStyle( d ).marginTop; d.remove(); return v; } );
		rep.check( 'distance-token-resolves', { selector: PART, property: '--sgs-me-from-ty', measured: pre.fromTy, expected: sm, pass: sm === '0px' ? null : pre.fromTy === sm, why: sm === '0px' ? 'distance.sm did not resolve on this site' : '' } );
		rep.control( 'distance-token-resolves', { selector: PART, property: '--sgs-me-from-ty', measured: pre.fromTy, expected: 'not 24px (a literal) when the token is used', red: pre.fromTy !== '24px' } );

		await page.$eval( PART, ( el ) => el.scrollIntoView( { block: 'center' } ) );
		await page.waitForSelector( `${ PART }[data-sgs-in]`, { timeout: 3000 } ).catch( () => null );
		const mid = await page.evaluate( STATE, PART );
		const sib = await page.evaluate( STATE, SIBLING );
		rep.check( 'fade-plays-on-part-only', { selector: PART, property: 'getAnimations().length', measured: { part: mid.animations, sibling: sib ? sib.animations : null, inAttr: mid.inAttr }, expected: 'part >= 1 animation and data-sgs-in; sibling 0', pass: mid.animations >= 1 && mid.inAttr && sib !== null && sib.animations === 0 } );
		rep.control( 'fade-plays-on-part-only', { selector: SIBLING, property: 'getAnimations().length', measured: sib ? sib.animations : null, expected: '0 (an unanimated sibling is not reported as playing)', red: !! sib && sib.animations === 0 && mid.animations !== sib.animations } );

		const inFlight = await page.evaluate( ( s ) => { const el = document.querySelector( s ); const a = el.getAnimations()[ 0 ]; if ( ! a ) return null; a.pause(); a.currentTime = 100; const t = getComputedStyle( el ).translate; a.play(); return t; }, PART );
		await page.waitForTimeout( 900 );
		const end = await page.evaluate( STATE, PART );
		rep.check( 'entrance-ends-translate-none', { selector: PART, property: 'translate / opacity (after end)', measured: { translate: end.translate, opacity: end.opacity, animations: end.animations }, expected: 'translate none, opacity 1, no running animation', pass: end.translate === 'none' && end.opacity === 1 && end.animations === 0 } );
		rep.control( 'entrance-ends-translate-none', { selector: PART, property: 'translate (paused mid-animation)', measured: inFlight, expected: 'not none while the animation runs', red: inFlight !== null && parseTranslate( inFlight ).none === false } );
	} finally {
		await close();
	}
	await jsBlocked( ctx );
}

/** With JavaScript disabled the below-fold element is fully visible and the page-load entrance still has its CSS animation. */
async function jsBlocked( ctx ) {
	const { rep, markers } = ctx;
	const url = markers[ '.m29-fade-part' ];
	const off = await ctx.newPage( url, { javaScriptEnabled: false } );
	try {
		const fade = await off.page.evaluate( STATE, PART ).catch( () => null );
		if ( ! fade ) {
			rep.check( 'js-blocked-visible', { selector: PART, pass: null, why: `${ ctx.engine } cannot evaluate with JavaScript disabled` } );
			return;
		}
		rep.check( 'js-blocked-visible', { selector: PART, property: 'opacity', measured: { opacity: fade.opacity, ready: fade.ready }, expected: 'opacity 1 and no sgs-motion-ready (no JS, nothing hidden)', pass: fade.opacity === 1 && ! fade.ready } );
		if ( markers[ '.m29-load-first' ] ) {
			const lp = await ctx.newPage( markers[ '.m29-load-first' ], { javaScriptEnabled: false } );
			try {
				const load = await lp.page.evaluate( STATE, '.m29-load-first[data-sgs-me]' ).catch( () => null );
				rep.check( 'js-blocked-load-entrance', { selector: '.m29-load-first', property: 'animation-name', measured: load && { animName: load.animName, animDur: load.animDur }, expected: 'an sgs-me animation with a non-zero duration', pass: !! load && /sgs-me/.test( load.animName ) && parseFloat( load.animDur ) > 0 } );
			} finally {
				await lp.close();
			}
		}
	} finally {
		await off.close();
	}
	const on = await ctx.newPage( url );
	try {
		await on.page.waitForTimeout( 400 );
		const hidden = await on.page.evaluate( STATE, PART );
		rep.control( 'js-blocked-visible', { selector: PART, property: 'opacity', measured: hidden.opacity, expected: '0 with JS on before scroll (the same reading can see a hidden element)', red: hidden.opacity === 0 } );
	} finally {
		await on.close();
	}
}

/** Load entrances: the first section keeps from-opacity 1 and is never below full opacity; a later one fades. */
export async function loadChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( ! markers[ '.m29-load-first' ] ) return missing( rep, [ 'lcp-first-section-opacity', 'load-later-fades' ], 'no hover-entrance page given' );
	const { page, close } = await ctx.newPage( markers[ '.m29-load-first' ], {}, ( p ) => p.addInitScript( () => {
		window.__m29min = {};
		const t0 = performance.now();
		const tick = () => {
			for ( const sel of [ '.m29-load-first', '.m29-load-later' ] ) {
				const el = document.querySelector( sel );
				if ( el ) window.__m29min[ sel ] = Math.min( window.__m29min[ sel ] ?? 1, parseFloat( getComputedStyle( el ).opacity ) );
			}
			if ( performance.now() - t0 < 1500 ) requestAnimationFrame( tick );
		};
		requestAnimationFrame( tick );
	} ) );
	try {
		await page.waitForTimeout( 1700 );
		const r = await page.evaluate( () => ( { min: window.__m29min, first: getComputedStyle( document.querySelector( '.m29-load-first' ) ).getPropertyValue( '--sgs-me-from-op' ).trim(), later: getComputedStyle( document.querySelector( '.m29-load-later' ) ).getPropertyValue( '--sgs-me-from-op' ).trim() } ) );
		rep.check( 'lcp-first-section-opacity', { selector: '.m29-load-first', property: 'opacity (min over first 1.5 s) and --sgs-me-from-op', measured: { min: r.min[ '.m29-load-first' ], fromOp: r.first }, expected: 'min opacity 1, from-opacity 1 (movement only)', pass: r.min[ '.m29-load-first' ] === 1 && r.first === '1' } );
		rep.control( 'lcp-first-section-opacity', { selector: '.m29-load-later', property: 'opacity (min) and --sgs-me-from-op', measured: { min: r.min[ '.m29-load-later' ], fromOp: r.later }, expected: 'the same reading on a non-first load entrance is below 1 (the check can see a fade)', red: r.min[ '.m29-load-later' ] < 1 && r.later === '0' } );
		rep.check( 'load-later-fades', { selector: '.m29-load-later', property: '--sgs-me-from-op', measured: r.later, expected: '0 (the LCP rule exempts only the first section)', pass: r.later === '0' } );
	} finally {
		await close();
	}
}

/** Three-keyframe entrance through animate() with its stored delay; hover lift added later still plays the entrance. */
export async function keyframeChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( ! markers[ '.m29-kf' ] ) return missing( rep, [ 'keyframes-three-with-delay', 'entrance-then-hover-lift' ], 'no page with .m29-kf (keyframes-tilt fixture) given' );
	const { page, close } = await ctx.newPage( markers[ '.m29-kf' ] );
	const READ_KF = ( sel ) => {
		const el = document.querySelector( sel );
		return el.getAnimations().map( ( a ) => ( { frames: a.effect.getKeyframes().length, props: [ ...new Set( a.effect.getKeyframes().flatMap( ( k ) => Object.keys( k ) ) ) ].filter( ( k ) => k.startsWith( '--sgs-me-' ) ), delay: a.effect.getTiming().delay, fill: a.effect.getTiming().fill, duration: a.effect.getTiming().duration } ) );
	};
	try {
		await page.$eval( '.m29-kf', ( el ) => el.scrollIntoView( { block: 'center' } ) );
		await page.waitForSelector( '.m29-kf[data-sgs-in]', { timeout: 3000 } ).catch( () => null );
		const own = await page.evaluate( READ_KF, '.m29-kf' );
		const attr = await page.$eval( '.m29-kf', ( el ) => { try { return JSON.parse( el.getAttribute( 'data-sgs-me-keyframes' ) ).length; } catch { return null; } } );
		const three = own.filter( ( a ) => a.frames === 3 );
		rep.check( 'keyframes-three-with-delay', { selector: '.m29-kf', property: 'getAnimations()[].effect', measured: { animations: own, attrFrames: attr }, expected: 'one animation with 3 keyframes on --sgs-me-* properties, delay 500, fill backwards; data-sgs-me-keyframes holds 3 frames', pass: three.length >= 1 && three.some( ( a ) => a.delay === 500 && a.fill === 'backwards' && a.props.length > 0 ) && attr === 3 } );
		const sib = await page.evaluate( READ_KF, '.m29-kf-sibling' );
		rep.control( 'keyframes-three-with-delay', { selector: '.m29-kf-sibling', property: 'getAnimations()[].effect', measured: sib, expected: 'no 3-keyframe animation on the sibling', red: sib.filter( ( a ) => a.frames === 3 ).length === 0 } );
	} finally {
		await close();
	}
	if ( ! markers[ '.m29-both' ] ) return rep.check( 'entrance-then-hover-lift', { pass: null, why: 'no .m29-both heading' } );
	const both = await ctx.newPage( markers[ '.m29-both' ] );
	try {
		const sel = '.m29-both[data-sgs-me]';
		await both.page.$eval( sel, ( el ) => el.scrollIntoView( { block: 'center' } ) );
		await both.page.waitForSelector( `${ sel }[data-sgs-in]`, { timeout: 3000 } ).catch( () => null );
		const played = await both.page.evaluate( STATE, sel );
		await both.page.waitForTimeout( 700 );
		await both.page.hover( sel );
		await both.page.waitForTimeout( 500 );
		const lifted = await both.page.evaluate( STATE, sel );
		rep.check( 'entrance-then-hover-lift', { selector: sel, property: 'getAnimations().length then translate', measured: { entranceAnimations: played.animations, translateOnHover: lifted.translate }, expected: 'entrance animation played, then translate y -6px on hover', pass: played.animations >= 1 && near( parseTranslate( lifted.translate ).y, -6, 0.5 ) } );
		await both.page.mouse.move( 0, 0 );
		await both.page.waitForTimeout( 500 );
		const rest = await both.page.evaluate( STATE, sel );
		rep.control( 'entrance-then-hover-lift', { selector: sel, property: 'translate', measured: rest.translate, expected: 'none when not hovered', red: isRest( rest.translate ) } );
	} finally {
		await both.close();
	}
}

/** `--sgs-scroll-progress` at three scroll positions: equals the geometry in each engine (cross-engine equality is checked by the runner). */
export async function scrollDriverChecks( ctx ) {
	const { rep, markers, base, args } = ctx;
	const url = markers[ '.m29-first' ] || markers[ '.m29-nomotion' ] || Object.values( markers )[ 0 ];
	if ( ! url ) return rep.check( 'scroll-driver-progress', { pass: null, why: 'no page given' } );
	const moduleUrl = args.scrollDriverUrl || `${ base }/wp-content/plugins/sgs-blocks/build/shared/effects/scroll-driver.js`;
	const { page, close } = await ctx.newPage( url );
	try {
		const vh = await page.evaluate( () => innerHeight );
		const setup = await page.evaluate( async ( u ) => {
			try {
				const m = await import( u );
				const mk = ( id ) => { const d = document.createElement( 'div' ); d.id = id; d.setAttribute( 'style', 'position:absolute;left:0;width:50px;height:200px;top:1500px' ); document.body.appendChild( d ); return d; };
				const driven = mk( 'm29-sd' );
				driven.setAttribute( 'data-sgs-scroll', 'view' );
				m.observe( driven, { basis: 'view' } );
				mk( 'm29-sd-off' );
				return { ok: true };
			} catch ( e ) {
				return { ok: false, error: String( e ) };
			}
		}, moduleUrl );
		if ( ! setup.ok ) return rep.check( 'scroll-driver-progress', { selector: moduleUrl, pass: null, why: `module import failed: ${ setup.error }` } );
		const rows = [];
		for ( const frac of [ 0.8, 0.5, 0.2 ] ) {
			const top = Math.round( vh * frac );
			await page.evaluate( ( y ) => window.scrollTo( { top: y, behavior: 'instant' } ), 1500 - top );
			await page.waitForFunction( ( y ) => {
				const t = window.__m29Y;
				window.__m29Y = window.scrollY;
				return Math.abs( window.scrollY - y ) < 1 && t === window.scrollY && ! document.documentElement.classList.contains( 'lenis-scrolling' );
			}, 1500 - top, { polling: 120, timeout: 5000 } ).catch( () => null );
			await page.waitForTimeout( 150 );
			const read = await page.evaluate( () => ( { driven: getComputedStyle( document.getElementById( 'm29-sd' ) ).getPropertyValue( '--sgs-scroll-progress' ).trim(), off: getComputedStyle( document.getElementById( 'm29-sd-off' ) ).getPropertyValue( '--sgs-scroll-progress' ).trim(), top: document.getElementById( 'm29-sd' ).getBoundingClientRect().top } ) );
			rows.push( { frac, ...read, expected: viewProgress( read.top, 200, vh ) } );
		}
		ctx.shared.scroll[ ctx.engine ] = rows.map( ( r ) => parseFloat( r.driven ) );
		rep.check( 'scroll-driver-progress', { selector: '#m29-sd[data-sgs-scroll=view]', property: '--sgs-scroll-progress', measured: rows.map( ( r ) => r.driven ), expected: rows.map( ( r ) => Number( r.expected.toFixed( 4 ) ) ), pass: rows.every( ( r ) => near( parseFloat( r.driven ), r.expected, 0.01 ) ) } );
		rep.control( 'scroll-driver-progress', { selector: '#m29-sd-off', property: '--sgs-scroll-progress', measured: rows.map( ( r ) => r.off ), expected: 'an unobserved element reads the same at every position while the observed one changes', red: rows.every( ( r ) => r.off === rows[ 0 ].off ) && ! near( parseFloat( rows[ 0 ].driven ), parseFloat( rows[ 2 ].driven ), 0.05 ) } );
	} finally {
		await close();
	}
}

/** A page with no motion requests none of the four motion assets; a motion page does (so the zero is not vacuous). */
export async function assetChecks( ctx ) {
	const { rep, markers, browser, width } = ctx;
	const PATTERNS = [ /\/motion(\.min)?\.css/, /motion-reveal(\.min)?\.js/, /motion-keyframes(\.min)?\.js/, /scroll-driver(\.min)?\.js/ ];
	const load = async ( url ) => {
		const context = await browser.newContext( { viewport: { width, height: 900 } } );
		const page = await context.newPage();
		const seen = [];
		page.on( 'request', ( r ) => seen.push( r.url() ) );
		const res = await page.goto( url, { waitUntil: 'load' } );
		await page.waitForTimeout( 800 );
		await context.close();
		return { status: res ? res.status() : 0, hits: seen.filter( ( u ) => PATTERNS.some( ( p ) => p.test( u ) ) ) };
	};
	if ( ! markers[ '.m29-nomotion' ] ) return rep.check( 'no-motion-assets', { pass: null, why: 'no page with .m29-nomotion (no-motion fixture) given' } );
	const none = await load( markers[ '.m29-nomotion' ] );
	rep.check( 'no-motion-assets', { selector: 'network requests', property: 'motion.css, motion-reveal.js, motion-keyframes.js, scroll-driver.js', measured: none.hits, expected: [], pass: none.status === 200 && none.hits.length === 0 } );
	const motionUrl = markers[ '.m29-fade-part' ] || markers[ '.m29-kf' ];
	if ( ! motionUrl ) return rep.control( 'no-motion-assets', { red: null, why: 'no motion page given to prove the detector sees requests' } );
	const some = await load( motionUrl );
	rep.control( 'no-motion-assets', { selector: 'network requests', property: 'same patterns on a motion page', measured: some.hits, expected: 'at least motion.css', red: some.hits.length > 0 } );
}
