/**
 * Spec 38A unit M5.Z: the pure judges, the offline harness and the in-page readers for `probe-motion-stacks.mjs`.
 *
 * The judges take a measurement and return pass or fail; the live checks and `--self-test` both run them, so a judge
 * that cannot fail is caught offline.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { near, parseTranslate } from './probe-motion-model-lib.mjs';

export const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
export const LIFT = -6;
export const SCALE = 1.04;
export const PARALLAX_RATIO = 0.18;
export const CSS_BUDGET = 100 * 1024;
export const JS_BUDGET = 50 * 1024;
/** Spec 38 §1.2: Tier W pages carry a named 120 KB JS allowance; the Lottie player (Tier H) a named 60 KB one, for the player alone. */
export const TIER_W_JS_BUDGET = 120 * 1024;
export const LOTTIE_ALLOWANCE = 60 * 1024;

// ---- Pure judges ------------------------------------------------------------------------------------------------

/** rotateX and rotateY (deg) of `perspective() rotateX(a) rotateY(b)`, from a matrix's m23 m22 m31 m11. */
export function decompose( m ) {
	const deg = ( r ) => ( r * 180 ) / Math.PI;
	return { x: deg( Math.atan2( m.m23, m.m22 ) ), y: deg( Math.atan2( m.m31, m.m11 ) ) };
}

const rotated = ( m ) => {
	const a = decompose( m );
	return Math.abs( a.x ) > 1 && Math.abs( a.y ) > 1 && Math.abs( a.x ) <= 8.5 && Math.abs( a.y ) <= 8.5;
};

/** The sheen band is crossing: its layer exists, one sweep animation runs, and its clock advanced between two reads. */
export const sheenMoving = ( s ) => !! s && s.layer && s.running && s.advanced > 5;

/** The ripple circle paints: the animation runs on `::after`, the circle has a size and a visible opacity. */
export const ripplePainting = ( r ) => !! r && r.animating && r.width > 1 && r.opacity > 0.02;

/** Stack (a): magnet translate, sheen band and ripple circle, all at once. */
export const judgeMagnetStack = ( r ) => !! r && ! parseTranslate( r.translate ).none && Math.abs( parseTranslate( r.translate ).x ) > 2 && sheenMoving( r.sheen ) && ripplePainting( r.ripple );

/** Stack (b): rotation in `transform` with scale 1.04 and translate -6px still present. */
export const judgeTiltStack = ( r ) => !! r && rotated( r.matrix ) && near( parseFloat( r.scale ), SCALE, 0.005 ) && near( parseTranslate( r.translate ).y, LIFT, 0.5 );

/** The parallax offset the page basis gives at a scrolled distance: ratio x scrolled px, rounded to 1px (fx-parallax.css). */
export const parallaxOffset = ( scrollY, ratio = PARALLAX_RATIO ) => Math.round( ratio * scrollY );

/** Stack (c): the translate Y is the lift plus the parallax offset within 0.5px, with the tilt applied at the same time. */
export const judgeLiftParallaxStack = ( r, expectedOffset ) => !! r && expectedOffset !== 0 && near( parseTranslate( r.translate ).y, LIFT + expectedOffset, 0.5 ) && rotated( r.matrix );

/** Stack (d): the ring, the ripple and the sheen layers present together, at most two injected layers, each aria-hidden. */
export const judgeLayerStack = ( r ) => !! r && !! r.ring && r.ring.width > 1 && ripplePainting( r.ripple ) && sheenMoving( r.sheen ) && r.layers.length >= 2 && layersHidden( r.layers );

/** At most two injected layers per element, every one aria-hidden and with no text of its own (FR-38A-49). */
export const layersHidden = ( layers ) => layers.length <= 2 && layers.every( ( l ) => l.ariaHidden === 'true' && l.text === '' );

/** Bytes by bucket from a network log: [{ url, type, bytes }] with type 'css' or 'js'. */
export function weigh( log ) {
	const out = { css: 0, js: 0, gsap: 0, lottie: 0, webgl: 0, sgsCss: 0, sgsJs: 0, files: log.length };
	for ( const { url, type, bytes } of log ) {
		const sgs = /\/(?:sgs-blocks|sgs-theme|sgs-[a-z-]+)\//.test( url );
		if ( type === 'css' ) {
			out.css += bytes;
			if ( sgs ) out.sgsCss += bytes;
			continue;
		}
		if ( /gsap/i.test( url ) ) out.gsap += bytes;
		else if ( /lottie/i.test( url ) ) out.lottie += bytes;
		else if ( /webgl|surface-treatment|wave-gradient|generative-background/i.test( url ) ) out.webgl += bytes;
		out.js += bytes;
		if ( sgs ) out.sgsJs += bytes;
	}
	return out;
}

/**
 * The page-weight verdict under Spec 38's tier rules. GSAP (Tier G) is counted inside the total JS and, on a page that uses
 * no Tier G effect, must be absent (FR-38-3: zero GSAP bytes). A Tier W page's JS budget is 120 KB; the Lottie player is
 * counted against its own 60 KB allowance and left out of the 50 KB figure.
 */
export function judgeWeight( w, { tierG = false } = {} ) {
	const jsBudget = w.webgl > 0 ? TIER_W_JS_BUDGET : JS_BUDGET;
	const jsCounted = w.js - w.lottie;
	return w.css < CSS_BUDGET && jsCounted < jsBudget && w.lottie <= LOTTIE_ALLOWANCE && ( tierG || w.gsap === 0 );
}

// ---- The offline harness ----------------------------------------------------------------------------------------

export const HARNESS_ORIGIN = 'http://sgs.test';
const IMAGE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240'%3E%3Crect width='400' height='240' fill='%23c2410c'/%3E%3C/svg%3E\")";
const layer = ( name ) => `<span class="sgs-motion-layer" data-sgs-layer="${ name }" aria-hidden="true"></span>`;
const IMPORT_MAP = { imports: { '@sgs/magnet': '/src/shared/effects/magnet.js', '@sgs/scroll-driver': '/src/shared/effects/scroll-driver.js' } };
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>motion stacks harness</title>
<link rel="stylesheet" href="/assets/css/motion.css"><link rel="stylesheet" href="/assets/css/fx-magnet.css"><link rel="stylesheet" href="/assets/css/fx-sheen.css"><link rel="stylesheet" href="/assets/css/fx-ripple.css"><link rel="stylesheet" href="/assets/css/fx-parallax.css"><link rel="stylesheet" href="/assets/css/fx-cursor-field.css">
<style>
body { margin: 0; padding: 60px 160px 1600px; font: 16px sans-serif; }
.btn { display: inline-block; padding: 22px 48px; background: #335; color: #fff; margin: 0 0 90px; }
.card { position: relative; width: 420px; height: 200px; margin: 0 0 90px; background: #ddd; }
.card[data-sgs-mh] { --sgs-persp-self: 1100px; --sgs-tilt-max: 8deg; --sgs-tilt-lock: none; --sgs-mh-to-ty: ${ LIFT }px; }
.m5z-b { --sgs-mh-to-s: ${ SCALE }; }
.m5z-a, .m5z-d { --sgs-ripple-op: 0.35; }
.m5z-c { --sgs-fx-parallax-ratio: ${ PARALLAX_RATIO }; }
.m5z-d { --sgs-cursor-field-image: ${ IMAGE }; --sgs-ring-size: 180px; }
.card[data-sgs-mh] { transition: --sgs-mh-ty 150ms ease-out, --sgs-mh-s 150ms ease-out; }
.card[data-sgs-mh]:not(:hover) { transition: --sgs-mh-ty 150ms ease-out, --sgs-mh-s 150ms ease-out, --sgs-tilt-x 600ms ease-out, --sgs-tilt-y 600ms ease-out; }
</style></head><body>
<div><div class="btn m5z-a" data-sgs-fx="magnet sheen ripple" data-sgs-mc="translate ::after injected" data-sgs-fx-magnet-engage="over" data-sgs-fx-magnet-pull-model="normalised" data-sgs-fx-magnet-strength="10" data-sgs-fx-magnet-max-pull-y="8" data-sgs-fx-magnet-return-duration="250">${ layer( 'sheen' ) }Magnet, sheen and ripple</div></div>
<div class="card m5z-b" data-sgs-mh="self" data-sgs-mc="translate scale transform" data-sgs-fx="follow-pointer">Follow pointer, scale and lift</div>
<div class="card m5z-c" data-sgs-mh="self" data-sgs-mc="translate transform" data-sgs-fx="follow-pointer parallax" data-sgs-fx-parallax-basis="page">Lift, parallax and Follow pointer</div>
<div class="card m5z-d" data-sgs-fx="cursor-field ripple sheen" data-sgs-mc="::before ::after injected" data-sgs-cursor-field="image-reveal">${ layer( 'cursor-field-ring' ) }${ layer( 'sheen' ) }<p>Ring, ripple and sheen</p></div>
<div class="card m5z-control">Control</div>
<script type="importmap">${ JSON.stringify( IMPORT_MAP ) }</script>
<script type="module" src="/src/shared/effects/fx-magnet.js"></script>
<script type="module" src="/src/shared/effects/fx-follow-pointer.js"></script>
<script type="module" src="/src/shared/effects/fx-parallax.js"></script>
<script type="module" src="/src/shared/effects/fx-cursor-field.js"></script>
<script type="module" src="/src/shared/effects/fx-ripple.js"></script>
</body></html>`;

/** Serve the harness and the repository's real assets. `log` receives { url, type, bytes } (gzipped size, the nearest offline figure to a transfer). */
export async function openHarness( context, log ) {
	await context.route( `${ HARNESS_ORIGIN }/**`, ( route ) => {
		const rel = new URL( route.request().url() ).pathname;
		if ( rel === '/' || rel === '/harness.html' ) return route.fulfill( { status: 200, contentType: 'text/html', body: HARNESS } );
		const file = path.join( PLUGIN, path.extname( rel ) ? rel : `${ rel }.js` );
		if ( ! file.startsWith( PLUGIN ) || ! fs.existsSync( file ) ) return route.fulfill( { status: 404, body: 'not found' } );
		const body = fs.readFileSync( file );
		const type = file.endsWith( '.css' ) ? 'css' : 'js';
		log.push( { url: rel, type, bytes: zlib.gzipSync( body ).length } );
		return route.fulfill( { status: 200, contentType: type === 'css' ? 'text/css' : 'text/javascript', body } );
	} );
	const page = await context.newPage();
	if ( process.env.SGS_PROBE_DEBUG ) {
		page.on( 'console', ( m ) => console.error( 'console:', m.text() ) );
		page.on( 'pageerror', ( e ) => console.error( 'pageerror:', e.message ) );
	}
	await page.goto( `${ HARNESS_ORIGIN }/harness.html`, { waitUntil: 'load' } );
	return page;
}

// ---- In-page readers --------------------------------------------------------------------------------------------

/** Everything the four stacks are judged on, read in one evaluate so the effects are measured together. `gap` ms separates the two sheen clock reads. */
export const readComposed = async ( { sel, gap } ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const cs = getComputedStyle( el );
	const m = new DOMMatrix( cs.transform === 'none' ? undefined : cs.transform );
	const layers = [ ...el.children ].filter( ( c ) => c.classList.contains( 'sgs-motion-layer' ) );
	const sheenLayer = layers.find( ( l ) => l.getAttribute( 'data-sgs-layer' ) === 'sheen' );
	const sweep = () => ( sheenLayer ? sheenLayer.getAnimations( { subtree: true } ).find( ( a ) => a.animationName === 'sgs-sheen-sweep' ) : null );
	const first = sweep();
	const t0 = first ? Number( first.currentTime ) : null;
	await new Promise( ( resolve ) => setTimeout( resolve, gap ) );
	const second = sweep();
	const after = getComputedStyle( el, '::after' );
	const rippleAnim = document.getAnimations().find( ( a ) => a.effect && a.effect.target === el && a.effect.pseudoElement === '::after' );
	const ringLayer = layers.find( ( l ) => l.getAttribute( 'data-sgs-layer' ) === 'cursor-field-ring' );
	const ring = ringLayer ? getComputedStyle( ringLayer, '::before' ) : null;
	return {
		translate: cs.translate,
		scale: cs.scale,
		matrix: { m11: m.m11, m22: m.m22, m23: m.m23, m31: m.m31 },
		scrollY: window.scrollY,
		style: el.getAttribute( 'style' ) || '',
		sheen: { layer: !! sheenLayer, running: !! second && second.playState === 'running', advanced: first && second ? Number( second.currentTime ) - t0 : 0 },
		ripple: { animating: !! rippleAnim, width: parseFloat( after.width ) || 0, opacity: parseFloat( after.opacity ) || 0, content: after.content },
		ring: ring ? { width: parseFloat( ring.width ) || 0 } : null,
		layers: layers.map( ( l ) => ( { layer: l.getAttribute( 'data-sgs-layer' ), ariaHidden: l.getAttribute( 'aria-hidden' ), text: l.textContent.trim() } ) ),
		pseudoContent: [ getComputedStyle( el, '::before' ).content, after.content ].filter( ( c ) => c && c !== 'none' && c !== 'normal' && c !== '""' ),
	};
};
