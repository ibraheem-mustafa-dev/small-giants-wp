// C4 trigger-based motion. For each trigger that starts motion (drawer open, drawer accordion rows, desktop mega
// panels, scrolling, slider arrows) the same trigger is performed on the draft and on the live page and what
// starts within a second is compared: animations started, per-item stagger, duration, start latency, the longest
// frame and animations started on hidden elements. Cannot measure a trigger on either side -> "unmeasured", never a pass.
import fs from 'fs';
import path from 'path';
import { chromium, recordDrawerOpen, recordAccordion, recordMega, recordArrow, recordScrollSteps } from './c4-record.mjs';

const TOL = 0.25;
const median = ( a ) => {
	const s = [ ...a ].sort( ( x, y ) => x - y );
	return s.length ? s[ Math.floor( ( s.length - 1 ) / 2 ) ] : null;
};
const differs = ( a, b ) => null !== a && null !== b && Math.abs( a - b ) > TOL * Math.max( Math.abs( a ), Math.abs( b ), 1 );

const MOTION = new Set( [ 'opacity', 'transform', 'translate', 'scale', 'rotate', 'filter', 'clip-path', 'clipPath' ] );
const STRICT = new Set( [ 'closed-details', 'display-none-or-visibility', 'zero-size', 'detached' ] );

// Shape of one recording. Entrance motion = visible, non-looping animations that move opacity/transform/filter,
// minus transitions a scroll or pointer re-fires every frame (a target with 4+ transitions). One entry per
// (element, delay, duration), so a draft animation carrying three properties and a live one split across three
// animations count alike. step = median gap between distinct entry delays; span = largest minus smallest.
export function summarise( rec ) {
	const anims = rec.anims || [];
	const perTarget = {};
	anims.forEach( ( a ) => {
		perTarget[ a.uid ?? a.target ] = ( perTarget[ a.uid ?? a.target ] || 0 ) + ( 'CSSTransition' === a.kind ? 1 : 0 );
	} );
	const motion = anims.filter( ( a ) => ! a.hidden && ! a.loop && a.props.some( ( p ) => MOTION.has( p ) ) && ! ( 'CSSTransition' === a.kind && perTarget[ a.uid ?? a.target ] > 3 ) );
	const entries = [ ...new Map( motion.map( ( a ) => [ ( a.uid ?? a.target ) + '|' + a.delay + '|' + a.duration, a ] ) ).values() ];
	const hidden = anims.filter( ( a ) => a.hidden );
	const strict = hidden.filter( ( a ) => STRICT.has( a.hidden ) );
	const delays = [ ...new Set( entries.map( ( a ) => a.delay ) ) ].sort( ( x, y ) => x - y );
	const gaps = delays.slice( 1 ).map( ( d, i ) => d - delays[ i ] ).filter( ( g ) => g > 0 );
	return {
		started: anims.length, shown: entries.length, hidden: hidden.length, hiddenStrict: strict.length, hiddenOff: hidden.length - strict.length,
		hiddenWhy: [ ...new Set( hidden.map( ( a ) => a.hidden ) ) ],
		hiddenSample: [ ...new Set( strict.map( ( a ) => a.target ) ) ].slice( 0, 3 ),
		step: median( gaps ), span: delays.length ? delays[ delays.length - 1 ] - delays[ 0 ] : null,
		duration: median( entries.map( ( a ) => a.duration ).filter( ( d ) => 'number' === typeof d ) ),
		firstMs: entries.length ? Math.min( ...entries.map( ( a ) => a.t ) ) : null, longest: rec.longest || 0,
		easings: [ ...new Set( entries.map( ( a ) => a.easing ) ) ].slice( 0, 4 ),
	};
}

// Judges one trigger's draft and live recordings. Returns a list of findings (empty list = the trigger agrees).
export function compareTrigger( draft, live, ctx = {} ) {
	const base = { class: 'C4', trigger: draft.trigger, ...ctx };
	if ( 'ok' !== draft.status || 'ok' !== live.status ) {
		return [ { ...base, severity: 'unmeasured', check: 'measure', reason: [ 'ok' !== draft.status ? 'draft: ' + draft.reason : '', 'ok' !== live.status ? 'live: ' + live.reason : '' ].filter( Boolean ).join( '; ' ) } ];
	}
	const d = summarise( draft );
	const l = summarise( live );
	const out = [];
	const add = ( check, dv, lv, note ) => out.push( { ...base, severity: 'fail', check, draft: dv, live: lv, note } );
	if ( d.shown > 0 && 0 === l.shown ) {
		add( 'no-animation-at-trigger', d.shown + ' animations (' + d.easings.join(' | ') + ')', 0, 'draft animates at this trigger; live starts none' );
	} else if ( d.shown > 0 ) {
		if ( differs( d.step, l.step ) || ( null !== d.step ) !== ( null !== l.step ) ) {
			add( 'stagger-step', d.step, l.step, 'delay step between sibling items differs by over 25%' );
		}
		if ( differs( d.span, l.span ) ) {
			add( 'stagger-span', d.span, l.span, 'total stagger span differs by over 25% (a restarting stagger shows as a shorter span)' );
		}
		if ( differs( d.duration, l.duration ) ) {
			add( 'duration', d.duration, l.duration, 'median animation duration differs by over 25%' );
		}
		if ( null !== d.firstMs && null !== l.firstMs && l.firstMs > d.firstMs + 60 && l.firstMs > d.firstMs * 1.5 ) {
			add( 'start-latency', d.firstMs + 'ms', l.firstMs + 'ms', 'first animation starts later after the trigger than in the draft' );
		}
	}
	if ( l.hiddenStrict > d.hiddenStrict ) {
		add( 'animations-on-hidden-elements', d.hiddenStrict, l.hiddenStrict + ' (' + l.hiddenWhy.join( '/' ) + '; e.g. ' + l.hiddenSample.join( ', ' ) + ')', 'live starts animations on display:none, closed-details or zero-size elements (the draft starts fewer)' );
	} else if ( l.hiddenOff > d.hiddenOff * 1.25 + 2 ) {
		add( 'animations-on-offscreen-elements', d.hiddenOff, l.hiddenOff, 'live starts more animations on off-screen elements than the draft' );
	}
	const cap = Math.max( 50, d.longest * 1.5 );
	if ( l.longest > cap ) {
		add( 'longest-frame', d.longest + 'ms', l.longest + 'ms', 'longest frame after the trigger exceeds max(50ms, draft x 1.5) = ' + Math.round( cap ) + 'ms' );
	}
	return out;
}

// A finding is "ruled" when divergences.json holds an entry for the page and trigger (node = trigger name or '*')
// with property 'motion' or 'trigger-motion' (or '*'), matching the width when the entry names widths.
export function applyRulings( findings, entries ) {
	return findings.map( ( f ) => {
		if ( 'fail' !== f.severity ) {
			return f;
		}
		const e = ( entries || [] ).find( ( x ) => ( x.scope === f.page || '*' === x.scope ) && ( x.node === f.trigger || '*' === x.node ) &&
			[ 'motion', 'trigger-motion', '*' ].includes( x.property ) && ( ! x.widths || x.widths.includes( f.width ) ) );
		return e ? { ...f, severity: 'ruled', ruling: e.id } : f;
	} );
}

async function openPage( browser, url, width ) {
	let last;
	for ( let attempt = 0; attempt < 3; attempt++ ) {
		const ctx = await browser.newContext( { viewport: { width, height: width < 500 ? 812 : 900 }, reducedMotion: 'no-preference' } );
		const page = await ctx.newPage();
		try {
			await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
			await page.waitForTimeout( 3500 );
			return { ctx, page };
		} catch ( e ) {
			last = e;
			await ctx.close();
			await new Promise( ( r ) => setTimeout( r, 4000 ) );
		}
	}
	throw last;
}

// reps > 1 repeats the recording and keeps the one with the smaller longest frame (a busy machine only adds jitter).
async function onBothSides( browser, urls, width, recorder, reps = 1 ) {
	const res = {};
	for ( const side of [ 'draft', 'live' ] ) {
		const { ctx, page } = await openPage( browser, urls[ side ], width );
		try {
			res[ side ] = await recorder( page );
		} catch ( e ) {
			res[ side ] = { trigger: '?', status: 'unmeasured', reason: side + ' error: ' + String( e.message ).split( '\n' )[ 0 ], anims: [], longest: 0 };
		}
		await ctx.close();
	}
	return res;
}

const asList = ( x ) => ( Array.isArray( x ) ? x : [ x ] );

// opts: { site, draft, pages: [{route,id}], widths, outDir, divergences, only?: ['drawer','mega','scroll','arrow'] }
export async function run( opts ) {
	const browser = await chromium.launch( { ignoreDefaultArgs: [ '--hide-scrollbars' ] } );
	const findings = [];
	const records = [];
	const want = ( k ) => ! opts.only || opts.only.includes( k );
	try {
		for ( const pg of opts.pages ) {
			const urls = { draft: `${ opts.draft.replace( /\/$/, '' ) }/#/${ pg.route }`, live: `${ opts.site.replace( /\/$/, '' ) }/?page_id=${ pg.id }` };
			for ( const width of opts.widths ) {
				const jobs = [];
				if ( 'home' === pg.route ) {
					if ( width < 1024 && want( 'drawer' ) ) {
						jobs.push( [ 'drawer-open', ( p ) => recordDrawerOpen( p ) ] );
						for ( let n = 0; n < 4; n++ ) {
							jobs.push( [ 'drawer-accordion-' + ( n + 1 ), ( p ) => recordAccordion( p, n ) ] );
						}
					}
					if ( width >= 1024 && want( 'mega' ) ) {
						for ( let n = 0; n < 4; n++ ) {
							jobs.push( [ 'mega-' + ( n + 1 ), ( p ) => recordMega( p, n ) ] );
						}
					}
				}
				if ( want( 'arrow' ) ) {
					jobs.push( [ 'slider-arrow', ( p ) => recordArrow( p ) ] );
				}
				if ( want( 'scroll' ) ) {
					jobs.push( [ 'scroll', ( p ) => recordScrollSteps( p ) ] );
				}
				const flush = () => {
					if ( opts.outDir ) {
						fs.mkdirSync( opts.outDir, { recursive: true } );
						fs.writeFileSync( path.join( opts.outDir, 'c4-partial.json' ), JSON.stringify( { done: pg.route + '@' + width, findings, records } ) );
					}
				};
				for ( const [ name, rec ] of jobs ) {
					const r = await onBothSides( browser, urls, width, rec, /^(drawer|mega)/.test( name ) ? 2 : 1 );
					const d = asList( r.draft );
					const l = asList( r.live );
					const n = Math.max( d.length, l.length );
					for ( let i = 0; i < n; i++ ) {
						const dr = d[ i ] || { trigger: l[ i ].trigger, status: 'unmeasured', reason: 'draft has no ' + l[ i ].trigger, anims: [], longest: 0 };
						const lr = l[ i ] || { trigger: dr.trigger, status: 'unmeasured', reason: 'live has no ' + dr.trigger, anims: [], longest: 0 };
						const ctx = { page: pg.route, width };
						records.push( { ...ctx, trigger: dr.trigger, draft: summarise( dr ), live: summarise( lr ), draftFrames: dr.frames, liveFrames: lr.frames } );
						findings.push( ...compareTrigger( dr, lr, ctx ) );
					}
					if ( 'scroll' === name && 0 === Math.max( asList( r.draft ).length, asList( r.live ).length ) ) {
						findings.push( { class: 'C4', page: pg.route, width, trigger: 'scroll', severity: 'unmeasured', check: 'measure', reason: 'page is not scrollable on either side' } );
					}
					flush();
				}
			}
		}
	} finally {
		await browser.close();
	}
	const ruled = applyRulings( findings, opts.divergences );
	if ( opts.outDir ) {
		fs.mkdirSync( opts.outDir, { recursive: true } );
		fs.writeFileSync( path.join( opts.outDir, 'c4-trigger-motion.json' ), JSON.stringify( { findings: ruled, records }, null, 1 ) );
	}
	return { findings: ruled, records };
}

export function summaryLines( findings ) {
	const by = {};
	for ( const f of findings ) {
		const k = f.severity + ' ' + ( f.check || '' );
		by[ k ] = ( by[ k ] || 0 ) + 1;
	}
	return Object.entries( by ).sort().map( ( [ k, v ] ) => `C4 ${ k }: ${ v }` );
}
