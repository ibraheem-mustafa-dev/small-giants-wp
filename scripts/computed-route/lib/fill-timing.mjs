// State transition timing for Fill (Spec 48 FR-48-81; .claude/plans/archive/2026-10-20-states-wave.md "Motion timings and states"):
// what the draft's code declares as `transition-duration` and `transition-timing-function`, written into the block's
// role-`motion` settings that hold them (block_attributes: css_property, css_element, css_state), found by the same
// resolver every other setting goes through. CSS semantics decide the direction: a timing on the resting rule times
// both directions of a state change (settings with no state), one on a state rule times entering that state only
// (settings tagged with that state). Closing reverses opening: a draft that declares only the state rule's timing has
// one timing to write, into the setting that times both ways, unless the draft declares a different resting timing,
// which the resting setting takes and the enter timing is then reported when the block has no setting for the state.

import { resolveProperty } from './fill-prop.mjs';
import { setAttr } from './tree.mjs';
import { timeToMs } from './resolve.mjs';
import { candidates } from './db.mjs';
import { easingOf } from './motion-tokens.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

export const COVERAGE_WRITES = [
	'block-setting:motion:motion',
];

export const TIMING_PROPS = [ 'transition-duration', 'transition-timing-function' ];

// The order a single both-ways timing is taken from when several states time entering: hover, focus, then the rest.
const ENTER_ORDER = [ 'hover', 'focus', 'active', 'open' ];
const order = ( state ) => ( ENTER_ORDER.includes( state ) ? ENTER_ORDER.indexOf( state ) : ENTER_ORDER.length );

// A comma list split at its top level (a `cubic-bezier( … , … )` keeps its commas).
const splitList = ( text ) => {
	const out = [];
	let depth = 0;
	let start = 0;
	const s = String( text ?? '' );
	for ( let k = 0; k < s.length; k++ ) {
		depth += '(' === s[ k ] ? 1 : ')' === s[ k ] ? -1 : 0;
		if ( ',' === s[ k ] && 0 === depth ) {
			out.push( s.slice( start, k ).trim() );
			start = k + 1;
		}
	}
	return [ ...out, s.slice( start ).trim() ].filter( Boolean );
};

// The one value a transition list states for every property it times ("0.3s, 0.3s" is 0.3s), or null when the entries
// differ (a time per property) or the value is computed in the code (`var()`, `calc()`).
export function oneTiming( text ) {
	const items = [ ...new Set( splitList( text ).map( ( v ) => v.toLowerCase() ) ) ];
	return 1 === items.length && ! /var\(|calc\(|env\(/.test( items[ 0 ] ) ? items[ 0 ] : null;
}

const perWidth = ( byWidth ) => ( Object.keys( byWidth ).length ? byWidth : null );

// The timings one target's code declares: { rest: { prop: { width: value } }, enter: { state: { prop: { width: value } } },
// skipped: [{ prop, why }] }. The resting rule's timing is the cascade winner of the resting read (reads.declared); a
// state rule's is the look's rendered value (lib/fill-state.mjs::stateDrafts' rule: the render confirms the code).
export function timingFacts( reads, id ) {
	const out = { rest: {}, enter: {}, skipped: [] };
	for ( const prop of TIMING_PROPS ) {
		const rest = {};
		for ( const w of READ_WIDTHS ) {
			const declared = reads.declared?.[ w ]?.[ id ]?.[ prop ];
			if ( undefined === declared ) {
				continue;
			}
			const v = oneTiming( declared );
			if ( null === v ) {
				out.skipped.push( { prop, why: `"${ declared }" at ${ w }px is a time per property or computed in the code` } );
			} else {
				rest[ w ] = v;
			}
		}
		if ( perWidth( rest ) ) {
			out.rest[ prop ] = rest;
		}
		for ( const w of READ_WIDTHS ) {
			for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
				const v = undefined === look.declared?.[ prop ] ? null : oneTiming( look.rendered?.[ prop ] ?? look.declared[ prop ] );
				if ( null !== v ) {
					const state = [ ...look.states ].sort().join( '+' );
					( ( out.enter[ state ] ??= {} )[ prop ] ??= {} )[ w ] = v;
				}
			}
		}
	}
	return out;
}

// Writes every timing of every target into the tree node in place. opts: { node, ref, rec (skeletonNodes record), target,
// cal, db, snapshot, reads, held (the setting states this block holds, lib/db.mjs::settingStates) }. Returns
// { writes, unmapped } in the shapes lib/fill-state.mjs::fillStates uses.
export function timingWrites( { node, ref, rec, target, cal, db, snapshot, reads, held } ) {
	const out = { writes: [], unmapped: [] };
	const facts = timingFacts( reads, target.id );
	const where = { node: ref, block: rec.name, slot: target.slot };
	const resolve = ( prop, draft, state ) => resolveProperty( { node, block: rec.name, prop, draft, baseline: () => undefined, slots: [ target.slot ], calibration: cal, db, snapshot, log: [], state } );
	const apply = ( prop, state, res, how ) => {
		for ( const w of res.writes ) {
			const { before, after } = setAttr( node, w );
			out.writes.push( { ...where, index: rec.index, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how } );
		}
	};
	const gap = ( prop, state, draft, reason ) => out.unmapped.push( { ...where, property: prop, state, value: JSON.stringify( draft ), reason } );
	// A computed timing is a gap only where the block has a setting for it.
	out.unmapped.push( ...facts.skipped.filter( ( s ) => candidates( db, rec.name, s.prop ).length ).map( ( s ) => ( { ...where, property: s.prop, state: null, value: '', reason: `timing-computed: ${ s.why }` } ) ) );
	for ( const prop of TIMING_PROPS ) {
		const rest = facts.rest[ prop ] || null;
		// A block with no setting for the resting timing is not a gap worth listing: hover transitions on most elements
		// are the motion writer's hover layer (lib/fill-motion.mjs), and every other element times itself.
		const res = rest ? resolve( prop, rest, null ) : null;
		if ( 'written' === res?.status ) {
			apply( prop, null, res, 'fill-timing' );
		} else if ( res && ! [ 'no-setting', 'unmapped-element' ].includes( res.gap ) ) {
			gap( prop, null, rest, `${ res.gap }: ${ res.detail || 'the resting timing has no single value this setting holds' }` );
		}
		const pending = [];
		for ( const [ state, props ] of Object.entries( facts.enter ) ) {
			const enter = props[ prop ];
			if ( ! enter ) {
				continue;
			}
			if ( state.includes( '+' ) ) {
				gap( prop, state, enter, `combined-state: the draft times ${ state } together, and a setting holds one state` );
				continue;
			}
			const own = held.has( state ) ? resolve( prop, enter, state ) : null;
			if ( 'written' === own?.status ) {
				apply( prop, state, own, 'fill-timing' );
			} else if ( ! rest ) {
				// Close reverses open: the draft's one timing, on the setting that times both directions. The setting holds
				// one value, so the first state of ENTER_ORDER that can write takes it and each other state is named.
				pending.push( { state, enter, own } );
			} else if ( ! sameAtWidths( prop, enter, rest ) ) {
				gap( prop, state, enter, `timing-enter-differs: the draft times entering ${ state } differently from leaving it, and ${ rec.name } has no ${ state } timing setting for ${ target.slot || 'this element' }${ own?.gap ? ` (${ own.gap })` : '' }` );
			}
		}
		pending.sort( ( a, b ) => order( a.state ) - order( b.state ) );
		let taken = null;
		for ( const { state, enter } of pending ) {
			const both = taken ? null : resolve( prop, enter, null );
			if ( 'written' === both?.status ) {
				apply( prop, null, both, 'fill-timing-reverse' );
				taken = { state, enter };
			} else if ( taken ) {
				if ( ! sameAtWidths( prop, enter, taken.enter ) ) {
					gap( prop, state, enter, `timing-enter-differs: the draft times entering ${ state } differently from ${ taken.state }, and the one setting for both directions holds ${ taken.state }'s` );
				}
			} else {
				gap( prop, state, enter, `no-state-setting: no setting times entering ${ state } or both directions of it${ both.gap ? ` (${ both.gap })` : '' }` );
			}
		}
	}
	return out;
}

// Whether two per-width timings ({ width: value }) are one timing at every width, by sameTiming's canonical reading
// (`.2s` is `200ms`); a value it cannot read compares as written.
function sameAtWidths( prop, a, b ) {
	const widths = Object.keys( a );
	return widths.length === Object.keys( b ).length && widths.every( ( w ) => w in b && ( sameTiming( prop, a[ w ], b[ w ] ) ?? a[ w ] === b[ w ] ) );
}

// Whether a live timing is the draft's: times within 10ms, easings by their canonical spelling. null when either cannot
// be read as one.
function sameTiming( prop, a, b ) {
	if ( 'transition-duration' === prop ) {
		const [ x, y ] = [ timeToMs( oneTiming( a ) ), timeToMs( oneTiming( b ) ) ];
		return null === x || null === y ? null : Math.abs( x - y ) <= 10;
	}
	const [ x, y ] = [ easingOf( oneTiming( a ) ), easingOf( oneTiming( b ) ) ];
	return null === x || null === y ? null : x === y;
}

// The timing check (FR-48-46, FR-48-81): whether the live page times each state change as the draft does. draft, live:
// { [width]: { rest: { [targetId]: { prop: value } }, states: readStates result } }; pairs: [{ draft, live }]. Rows
// { draft, live, width, prop, direction: 'both' | 'enter' | 'leave', state, draftValue, liveValue, verdict: 'match' |
// 'differs' | 'unreadable' }. The resting timing is compared with the live resting timing (it times both directions);
// a state rule's with the live state's, else the live resting timing; a draft with only a state timing has none to
// leave by, so closing reverses opening and the live resting timing must equal the enter timing.
export function timingCheck( { draft, live, pairs } ) {
	const rows = [];
	for ( const [ width, read ] of Object.entries( draft ) ) {
		for ( const pair of pairs ) {
			const liveRest = live[ width ]?.rest?.[ pair.live ] || {};
			const liveLooks = live[ width ]?.states?.looks?.[ pair.live ] || [];
			for ( const prop of TIMING_PROPS ) {
				const add = ( direction, state, draftValue, liveValue ) => {
					const same = sameTiming( prop, draftValue, liveValue );
					rows.push( { draft: pair.draft, live: pair.live, width: Number( width ), prop, direction, state, draftValue, liveValue: liveValue ?? null, verdict: null === same ? 'unreadable' : same ? 'match' : 'differs' } );
				};
				const restValue = read.rest?.[ pair.draft ]?.[ prop ];
				const looks = ( read.states?.looks?.[ pair.draft ] || [] ).filter( ( l ) => undefined !== l.declared?.[ prop ] );
				for ( const look of looks ) {
					const state = look.states.join( '+' );
					const liveLook = liveLooks.find( ( l ) => l.states.join( '+' ) === state && undefined !== l.declared?.[ prop ] );
					add( 'enter', state, look.rendered?.[ prop ] ?? look.declared[ prop ], liveLook?.rendered?.[ prop ] ?? liveRest[ prop ] );
				}
				if ( undefined !== restValue ) {
					add( 'both', null, restValue, liveRest[ prop ] );
				} else if ( looks.length ) {
					const l = looks[ 0 ];
					add( 'leave', l.states.join( '+' ), l.rendered?.[ prop ] ?? l.declared[ prop ], liveRest[ prop ] );
				}
			}
		}
	}
	return rows;
}
