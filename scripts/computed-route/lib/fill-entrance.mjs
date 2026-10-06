// Entrances for Fill (FR-47-4 "values that need care"): what a draft element does as it paints in, measured in a real
// browser, and the settings that hold it. The walker's sampler (scripts/parity/lib/entrances.mjs::sampleEntrances) keeps
// only when each block's pose first and last changed, keyed by its words; Fill also needs the pose at the first sampled
// frame (the distance an element travels) and must start before a single-page draft's open click, so it runs its own
// probe with the same idea: poll every frame, compare the pose, treat a block still moving at the end as a loop.
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { makeHelpers } from '../../parity/lib/helpers.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';
import { loadChromium, routeDraft } from './fill-read.mjs';
import { resolveProperty } from './fill-prop.mjs';
import { setAttr } from './tree.mjs';

const RESOLVE = resolveFinder.toString();

// In-page. Starts polling every frame for every job (jobs: [{ id, finder }]) and stores a promise on window.__fillProbe
// that resolves, windowMs later, with { id: { seenAt, first, firstChange, start, end, loop } } for each element found.
// A pose is the element's own opacity, transform, translate, scale and rotate: the block that animates is the element whose
// own pose changes, so a child moved only by its parent's animation is not an entrance of its own.
function startProbe( [ jobs, resolveSrc, windowMs ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const seen = new Map();
	const poseOf = ( el ) => {
		const own = getComputedStyle( el );
		const opacity = Math.round( parseFloat( own.opacity ) * 1000 ) / 1000;
		return { opacity, transform: own.transform, translate: own.translate, scale: own.scale, rotate: own.rotate, key: `${ Math.round( opacity * 20 ) / 20 }|${ own.transform }${ own.translate }${ own.scale }${ own.rotate }` };
	};
	const t0 = performance.now();
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
						seen.set( j.id, { el, seenAt: now, first: p, lastKey: p.key, firstChange: null, start: null, end: null } );
					}
					continue;
				}
				const p = poseOf( s.el );
				if ( p.key !== s.lastKey ) {
					s.start ??= now;
					s.firstChange ??= p;
					s.end = now;
					s.lastKey = p.key;
				}
			}
			if ( now - t0 < windowMs ) {
				requestAnimationFrame( tick );
				return;
			}
			const out = {};
			for ( const [ id, s ] of seen ) {
				const strip = ( p ) => p && { opacity: p.opacity, transform: p.transform, translate: p.translate, scale: p.scale, rotate: p.rotate };
				out[ id ] = { seenAt: s.seenAt, first: strip( s.first ), firstChange: strip( s.firstChange ), start: s.start, end: s.end, loop: null !== s.end && now - s.end < 120 };
			}
			done( out );
		};
		requestAnimationFrame( tick );
	} );
}

// Probes the entrances of every job (the skeleton's root targets) on the draft at one width. The probe starts before the
// page's own scripts and the draft's open step, so a load animation and a single-page draft's view both play inside the window. Returns { id: raw probe result }.
export async function sampleEntrances( { url, jobs, open = null, width = 1440, windowMs = 4500, headless = true, external = false, mirror = {} } ) {
	const { chromium } = await loadChromium();
	const origin = new URL( url ).origin;
	const browser = await chromium.launch( { headless, args: [ '--hide-scrollbars' ] } );
	try {
		const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
		await routeDraft( ctx, { origin, external, mirror } );
		const page = await ctx.newPage();
		const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE, onAction: null } );
		// Installed before the page's own scripts run, so an entrance that plays at load is seen from its first frame.
		await page.addInitScript( startProbe, [ jobs, RESOLVE, windowMs ] );
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

// Sampling every frame resolves a time to about +-17ms at 60Hz, so a duration or delay is rounded to the 50ms an
// author would set, and a delay of two frames or less is the 0 it measures as.
export const STEP_MS = 50;
export const JITTER_MS = 40;
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
// not an entrance). delayMs and durationMs are rounded to STEP_MS, and a delay of two frames or less (JITTER_MS) is the 0 it measures as. The distance is read from the pose at
// the first sampled frame; when that frame is already at rest (an entrance with no backwards fill, whose first frame is
// the final pose) the first frame that moved is used. Returns { delayMs, durationMs, distancePx, x, y, opacityFrom,
// from: { opacity, transform, translate }, fromFirstChange }.
export function shapeEntrance( raw ) {
	if ( ! raw || null === raw.start || raw.loop ) {
		return null;
	}
	const useChange = atRest( raw.first ) && raw.firstChange;
	const from = useChange ? raw.firstChange : raw.first;
	const { x, y } = translationOf( from );
	return { delayMs: raw.start - raw.seenAt <= JITTER_MS ? 0 : toStep( raw.start - raw.seenAt ), durationMs: Math.max( 0, toStep( raw.end - raw.start ) ), distancePx: Math.round( Math.hypot( x, y ) * 100 ) / 100, x, y, opacityFrom: from.opacity, from: { opacity: String( from.opacity ), transform: from.transform, translate: from.translate }, fromFirstChange: !! useChange };
}

// The properties an entrance is written through, each with the measured value as a computed style reads it.
export function entranceValues( e ) {
	return [
		[ 'opacity', String( e.from.opacity ) ],
		...( 'none' !== e.from.transform && e.from.transform ? [ [ 'transform', e.from.transform ] ] : [] ),
		...( 'none' !== e.from.translate && e.from.translate ? [ [ 'translate', e.from.translate ] ] : [] ),
		[ 'animation-duration', `${ e.durationMs / 1000 }s` ],
		...( e.delayMs > 0 ? [ [ 'animation-delay', `${ e.delayMs / 1000 }s` ] ] : [] ),
	];
}

// Writes one node's entrance through the resolver (R-47-3): opacity, transform and translate at the first frame, and the
// animation's duration and delay, each to the setting calibration ties to it on this block. A measured entrance is the same
// at every width (it is sampled once, at one width). Returns { writes: [...], unmapped: [...] } in the shapes
// fill-resolve.mjs uses; a value no setting holds is UNMAPPED with the resolver's reason.
export function entranceWrites( { entrance, node, ref, block, calibration, db, snapshot, log } ) {
	const out = { writes: [], unmapped: [] };
	const draftFor = ( v ) => ( { 375: v, 768: v, 1440: v } );
	const siblings = Object.fromEntries( entranceValues( entrance ).map( ( [ p, v ] ) => [ p, draftFor( v ) ] ) );
	for ( const [ prop, value ] of entranceValues( entrance ) ) {
		const res = resolveProperty( { node, block, prop, draft: draftFor( value ), baseline: () => undefined, slots: [ '' ], calibration, db, snapshot, log, siblings } );
		if ( 'written' !== res.status ) {
			out.unmapped.push( { node: ref, block, slot: '', property: `entrance ${ prop }`, value: 'animation-duration' === prop ? `${ entrance.durationMs }ms` : 'animation-delay' === prop ? `${ entrance.delayMs }ms` : value, reason: 'gap' === res.status ? `${ res.gap }: ${ res.detail }` : 'equal' } );
			continue;
		}
		for ( const w of res.writes ) {
			if ( JSON.stringify( node.attributes?.[ w.attr ] ) === JSON.stringify( w.value ) ) {
				continue;
			}
			const { before, after } = setAttr( node, w );
			out.writes.push( { node: ref, block, slot: '', prop: `entrance ${ prop }`, attr: w.attr, before, after, widths: [], how: 'entrance' } );
		}
	}
	return out;
}
