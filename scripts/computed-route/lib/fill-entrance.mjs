// Entrances for Fill (Spec 48 FR-48-47, the render check of the motion writer in lib/fill-motion.mjs): what a draft
// element does as it paints in, measured in a real browser. The walker's sampler (scripts/parity/lib/entrances.mjs::sampleEntrances)
// keeps only when each block's pose first and last changed, keyed by its words; Fill also needs the pose at the first
// sampled frame (the distance an element travels), must start before a single-page draft's open click, and must see the
// entrances that play as an element scrolls into view, so it runs its own probe with the same idea: poll every frame,
// compare the pose, scroll down the page a step at a time, treat a block still moving at the end as a loop.
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { makeHelpers } from '../../parity/lib/helpers.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';
import { loadChromium, routeDraft } from './fill-read.mjs';

const RESOLVE = resolveFinder.toString();

// In-page. Starts polling every frame for every job (jobs: [{ id, finder }]) and stores a promise on window.__fillProbe
// that resolves with { id: { seenAt, visibleAt, first, firstChange, start, secondAt, end, loop } } for each element found. With a
// sweep, from sweep.afterMs on the page scrolls down by sweep.step of the viewport height every sweep.everyMs until it
// reaches the bottom; the probe ends windowMs after it starts and sweep.settleMs after the last scroll, whichever is
// later. `visibleAt` is the first frame the element's box meets the viewport. A pose is the element's own opacity,
// transform, translate, scale, rotate, filter and clip-path: the block that animates is the element whose own pose
// changes, so a child moved only by its parent's animation is not an entrance of its own.
function startProbe( [ jobs, resolveSrc, windowMs, sweep ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const seen = new Map();
	const poseOf = ( el ) => {
		const own = getComputedStyle( el );
		const opacity = Math.round( parseFloat( own.opacity ) * 1000 ) / 1000;
		return { opacity, transform: own.transform, translate: own.translate, scale: own.scale, rotate: own.rotate, filter: own.filter, clipPath: own.clipPath, key: `${ Math.round( opacity * 20 ) / 20 }|${ own.transform }${ own.translate }${ own.scale }${ own.rotate }${ own.filter }${ own.clipPath }` };
	};
	const inView = ( el ) => {
		const r = el.getBoundingClientRect();
		return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
	};
	const t0 = performance.now();
	let lastScroll = t0;
	let scrolledToEnd = ! sweep;
	window.__fillProbe = new Promise( ( done ) => {
		const tick = () => {
			const now = performance.now();
			for ( const j of jobs ) {
				let s = seen.get( j.id );
				if ( s && ! s.el.isConnected ) {
					seen.delete( j.id );
					s = null;
				}
				if ( ! s ) {
					const el = resolve( j.finder );
					if ( el ) {
						const p = poseOf( el );
						seen.set( j.id, { el, seenAt: now, visibleAt: inView( el ) ? now : null, first: p, lastKey: p.key, firstChange: null, start: null, secondAt: null, end: null } );
					}
					continue;
				}
				if ( null === s.visibleAt && inView( s.el ) ) {
					s.visibleAt = now;
				}
				const p = poseOf( s.el );
				if ( p.key !== s.lastKey ) {
					if ( null !== s.start && null === s.secondAt ) {
						s.secondAt = now;
					}
					s.start ??= now;
					s.firstChange ??= p;
					s.end = now;
					s.lastKey = p.key;
				}
			}
			if ( ! scrolledToEnd && now - t0 >= sweep.afterMs && now - lastScroll >= sweep.everyMs ) {
				const before = scrollY;
				scrollBy( 0, Math.round( innerHeight * sweep.step ) );
				lastScroll = now;
				scrolledToEnd = scrollY === before || scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
			}
			if ( now - t0 < windowMs || ! scrolledToEnd || ( sweep && now - lastScroll < sweep.settleMs ) ) {
				requestAnimationFrame( tick );
				return;
			}
			const out = {};
			for ( const [ id, s ] of seen ) {
				const strip = ( p ) => p && { opacity: p.opacity, transform: p.transform, translate: p.translate, scale: p.scale, rotate: p.rotate, filter: p.filter, clipPath: p.clipPath };
				out[ id ] = { seenAt: s.seenAt, visibleAt: s.visibleAt, first: strip( s.first ), firstChange: strip( s.firstChange ), start: s.start, secondAt: s.secondAt, end: s.end, loop: null !== s.end && now - s.end < 120 };
			}
			done( out );
		};
		requestAnimationFrame( tick );
	} );
}

// The page sweep: the first scroll after 1.5s, then 0.7 of the viewport every 700ms, ending 2.5s after the last scroll.
export const SWEEP = { afterMs: 1500, everyMs: 700, step: 0.7, settleMs: 2500 };

// Probes the entrances of every job (the skeleton's targets) on the draft at one width. The probe starts before the
// page's own scripts and the draft's open step, so a load animation and a single-page draft's view both play inside the
// window, and it sweeps down the page so a scroll entrance plays too (`sweep: null` keeps the page still). Returns
// { id: raw probe result }.
export async function sampleEntrances( { url, jobs, open = null, width = 1440, windowMs = 4500, sweep = SWEEP, headless = true, external = false, mirror = {} } ) {
	const { chromium } = await loadChromium();
	const origin = new URL( url ).origin;
	const browser = await chromium.launch( { headless, args: [ '--hide-scrollbars' ] } );
	try {
		const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
		await routeDraft( ctx, { origin, external, mirror } );
		const page = await ctx.newPage();
		const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE, onAction: null } );
		// Installed before the page's own scripts run, so an entrance that plays at load is seen from its first frame.
		await page.addInitScript( startProbe, [ jobs, RESOLVE, windowMs, sweep ] );
		await h.goto( url );
		if ( open ) {
			await h.clickText( open, { wait: 50 } );
		}
		const raw = await page.evaluate( () => window.__fillProbe );
		await settleAnimations( page, { floor: 0 } );
		return raw;
	} finally {
		await browser.close();
	}
}

// The motion writer's render check: every job sampled at 375, 768 and 1440 and shaped. Returns { '<job id>': { 375,
// 768, 1440: shapeEntrance() result, or null when the element was found and played no entrance } }; a width where the
// element was not found has no key.
export const SAMPLE_WIDTHS = [ 375, 768, 1440 ];
export async function sampleWidths( { jobs, ...opts } ) {
	const out = Object.fromEntries( jobs.map( ( j ) => [ j.id, {} ] ) );
	for ( const width of SAMPLE_WIDTHS ) {
		const raw = await sampleEntrances( { ...opts, jobs, width } );
		for ( const j of jobs ) {
			if ( raw[ j.id ] ) {
				out[ j.id ][ width ] = shapeEntrance( raw[ j.id ] );
			}
		}
	}
	return out;
}

// Sampling every frame resolves a time to about +-17ms at 60Hz, so a duration or delay is rounded to the 50ms an
// author would set, and a delay of two frames or less is the 0 it measures as.
export const STEP_MS = 50;
export const JITTER_MS = 40;
export const FRAME_MS = 16;
const toStep = ( ms ) => Math.round( ms / STEP_MS ) * STEP_MS;

// The translation a pose applies, in px: from its transform matrix and its translate property.
export function translationOf( pose ) {
	let x = 0;
	let y = 0;
	const m = /^matrix\(([^)]+)\)$/.exec( pose.transform || '' );
	const m3 = /^matrix3d\(([^)]+)\)$/.exec( pose.transform || '' );
	if ( m ) {
		const v = m[ 1 ].split( ',' ).map( Number );
		[ x, y ] = [ v[ 4 ], v[ 5 ] ];
	} else if ( m3 ) {
		const v = m3[ 1 ].split( ',' ).map( Number );
		[ x, y ] = [ v[ 12 ], v[ 13 ] ];
	}
	const t = /^(-?[\d.]+)px(?: (-?[\d.]+)px)?$/.exec( pose.translate || '' );
	if ( t ) {
		x += Number( t[ 1 ] );
		y += Number( t[ 2 ] ?? 0 );
	}
	return { x: Math.round( x * 100 ) / 100, y: Math.round( y * 100 ) / 100 };
}

const atRest = ( p ) => p.opacity >= 0.95 && 0 === translationOf( p ).x && 0 === translationOf( p ).y && ( 'none' === p.scale || '1' === p.scale );

// One probe result as an entrance, or null when the element did not move (static) or is still moving at the end (a loop,
// not an entrance). An element that was off-screen when first seen and started moving once it met the viewport is a
// `scroll` entrance timed from that moment; any other is a `load` entrance timed from first sight. delayMs and
// durationMs are rounded to STEP_MS, and a delay of two frames or less (JITTER_MS) is the 0 it measures as; the raw times
// are kept for a caller that knows the step the code uses. The distance is read from the pose at the first sampled
// frame; when that frame is already at rest (an entrance with no backwards fill, or a scroll entrance first seen at rest)
// the first frame that moved is used. An element that jumps from rest to its from-pose and holds there (a backwards fill
// through a delay) starts moving a frame before its second change, and the jump is its trigger, so the hold is its
// delay. `exactDelay` is false for a scroll entrance with no hold. Returns { trigger, delayMs, durationMs, delayRawMs, durationRawMs, distancePx, x,
// y, scale, opacityFrom, from: { opacity, transform, translate, filter, clipPath }, fromFirstChange }.
export function shapeEntrance( raw ) {
	if ( ! raw || null === raw.start || raw.loop ) {
		return null;
	}
	const offscreen = null !== ( raw.visibleAt ?? null ) && raw.visibleAt - raw.seenAt > 150;
	const trigger = offscreen && raw.start >= raw.visibleAt - JITTER_MS ? 'scroll' : 'load';
	const base = 'scroll' === trigger ? raw.visibleAt : raw.seenAt;
	const useChange = atRest( raw.first ) && raw.firstChange;
	const from = useChange ? raw.firstChange : raw.first;
	const { x, y } = translationOf( from );
	const held = useChange && null !== ( raw.secondAt ?? null ) && raw.secondAt - raw.start > JITTER_MS;
	const moveStart = held ? raw.secondAt - FRAME_MS : raw.start;
	// A held jump is the trigger moment itself, so its hold is the exact delay; otherwise the delay runs from first sight
	// or, for a scroll entrance, from the first frame the element met the viewport (the draft's own start line is later,
	// so that delay is an upper bound: `exactDelay` false).
	const delayRaw = Math.max( 0, moveStart - ( held ? raw.start : base ) );
	return {
		trigger,
		delayMs: delayRaw <= JITTER_MS ? 0 : toStep( delayRaw ),
		durationMs: Math.max( 0, toStep( raw.end - moveStart ) ),
		delayRawMs: Math.round( delayRaw ),
		durationRawMs: Math.round( raw.end - moveStart ),
		distancePx: Math.round( Math.hypot( x, y ) * 100 ) / 100,
		x,
		y,
		scale: scaleOf( from ),
		opacityFrom: from.opacity,
		from: { opacity: String( from.opacity ), transform: from.transform, translate: from.translate, filter: from.filter ?? 'none', clipPath: from.clipPath ?? 'none' },
		fromFirstChange: !! useChange,
		held,
		exactDelay: held || 'load' === trigger,
	};
}

// The uniform scale a pose applies (the transform matrix's x scale times the scale property), 1 when none.
export function scaleOf( pose ) {
	let s = 1;
	const m = /^matrix\(([^)]+)\)$/.exec( pose.transform || '' );
	if ( m ) {
		const [ a, b ] = m[ 1 ].split( ',' ).map( Number );
		s = Math.hypot( a, b );
	}
	const p = /^(-?[\d.]+)/.exec( pose.scale || '' );
	if ( p ) {
		s *= Number( p[ 1 ] );
	}
	return Math.round( s * 1000 ) / 1000;
}
