// State transition timing for Fill (Spec 48 FR-48-81; .claude/plans/archive/2026-10-20-states-wave.md "Motion timings and states"):
// what the draft's code declares as `transition-duration` and `transition-timing-function`, written into the block's
// role-`motion` settings that hold them (block_attributes: css_property, css_element, css_state), found by the same
// resolver every other setting goes through. CSS semantics decide the direction: a timing on the resting rule times
// both directions of a state change (settings with no state), one on a state rule times entering that state only
// (settings tagged with that state). Closing reverses opening: a draft that declares only the state rule's timing has
// one timing to write, into the setting that times both ways, unless the draft declares a different resting timing,
// which the resting setting takes and the enter timing is then reported when the block has no setting for the state.

import { resolveProperty, defaultPaint } from './fill-prop.mjs';
import { samePaint } from './css-equivalence/tolerance.mjs';
import { setAttr } from './tree.mjs';
import { timeToMs } from './resolve.mjs';
import { candidates } from './db.mjs';
import { easingOf } from './motion-tokens.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { stateHover } from './fill-state-motion.mjs';

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
	return 1 === items.length && ! COMPUTED.test( items[ 0 ] ) ? items[ 0 ] : null;
}

const COMPUTED = /var\(|calc\(|env\(/;

// The timing longhands a transition list is split into, with their initial values (CSS Transitions §2).
export const LIST_PROPS = [ ...TIMING_PROPS, 'transition-delay' ];
const INITIAL = { 'transition-duration': '0s', 'transition-timing-function': 'ease', 'transition-delay': '0s' };

// The draft's transition per property: [{ property, 'transition-duration', 'transition-timing-function',
// 'transition-delay' }] in transition-property order. Each longhand's list is matched by index and repeats when shorter
// than the property list (entries beyond it are unused); a property listed twice takes its last entry; an absent
// transition-property is `all` and `none` transitions nothing. decl: { longhand: declared text }.
export function transitionEntries( decl ) {
	const props = splitList( decl[ 'transition-property' ] ?? 'all' ).map( ( p ) => p.toLowerCase() );
	if ( ! props.length || ( 1 === props.length && 'none' === props[ 0 ] ) ) {
		return [];
	}
	const lists = Object.fromEntries( LIST_PROPS.map( ( p ) => [ p, splitList( decl[ p ] ?? INITIAL[ p ] ) ] ) );
	const out = new Map();
	props.forEach( ( property, i ) => {
		out.delete( property );
		out.set( property, { property, ...Object.fromEntries( LIST_PROPS.map( ( p ) => [ p, lists[ p ].length ? lists[ p ][ i % lists[ p ].length ] : INITIAL[ p ] ] ) ) } );
	} );
	return [ ...out.values() ];
}

// One longhand's timing per property, grouped by equal timing: { value, groups: [{ value, properties }] } where value is
// the timing the most properties share (a tie keeps the draft's order), { computed: true } for a list computed in the
// code, { none: true } when nothing transitions, or null when the longhand is not declared.
export function propertyTimings( decl, prop ) {
	const text = decl[ prop ];
	if ( undefined === text ) {
		return null;
	}
	if ( COMPUTED.test( text ) ) {
		return { computed: true };
	}
	const entries = transitionEntries( decl );
	if ( ! entries.length ) {
		return { none: true };
	}
	const groups = [];
	for ( const e of entries ) {
		const g = groups.find( ( x ) => sameTiming( prop, x.value, e[ prop ] ) ?? x.value === e[ prop ] );
		g ? g.properties.push( e.property ) : groups.push( { value: e[ prop ].toLowerCase(), properties: [ e.property ] } );
	}
	const most = groups.reduce( ( a, b ) => ( b.properties.length > a.properties.length ? b : a ) );
	return { value: most.value, groups };
}

// The colour-and-shadow properties the motion hover layer times on their own (sgsMotion hover.state.values.paintDuration
// and paintEasing; includes/motion/class-sgs-motion-emitter.php::HOVER_PAINT); a draft's `background` and per-side border
// colours are the same paint.
const PAINT = /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?-color|box-shadow)$/;
export const isPaint = ( property ) => PAINT.test( property );
// The paint property the hover layer can time on its own (hover.state.values.shadowDuration and shadowEasing).
export const SHADOW = 'box-shadow';

// The paint timing one target's resting rule gives at each width, per longhand: { [width]: { [longhand]: { value, groups } } }
// over the paint properties the transition list names (a property `all` covers stands for the paint properties the
// element's hover look declares there), value being the timing most of them other than the shadow share (a tie keeps the
// draft's order; a shadow alone is the value).
// A width whose resting rule declares no transition-duration, or times no paint property, is left out (timingFacts reads
// the same widths).
export function paintTimings( reads, id ) {
	const out = {};
	for ( const w of READ_WIDTHS ) {
		const decl = restDeclOf( reads, id, w );
		if ( undefined === decl[ 'transition-duration' ] ) {
			continue;
		}
		const entries = transitionEntries( decl );
		const all = entries.find( ( e ) => 'all' === e.property );
		const hovered = ( reads.states?.[ w ]?.looks?.[ id ] || [] ).filter( ( l ) => 'hover' === [ ...l.states ].sort().join( '+' ) && ! l.pseudo ).flatMap( ( l ) => Object.keys( l.declared || {} ) );
		const paint = [ ...entries.filter( ( e ) => isPaint( e.property ) ), ...( all ? [ ...new Set( hovered ) ].filter( ( p ) => isPaint( p ) && ! entries.some( ( e ) => e.property === p ) ).map( ( p ) => ( { ...all, property: p } ) ) : [] ) ];
		if ( ! paint.length ) {
			continue;
		}
		// The shadow has its own timing (shadowDuration, shadowEasing), so it does not vote; a shadow alone is the paint timing.
		const share = ( g ) => g.properties.filter( ( p ) => SHADOW !== p ).length;
		out[ w ] = Object.fromEntries( LIST_PROPS.map( ( prop ) => {
			const groups = [];
			for ( const e of paint ) {
				const g = groups.find( ( x ) => sameTiming( prop, x.value, e[ prop ] ) ?? x.value === e[ prop ] );
				g ? g.properties.push( e.property ) : groups.push( { value: String( e[ prop ] ).toLowerCase(), properties: [ e.property ] } );
			}
			return [ prop, { value: groups.reduce( ( a, b ) => ( share( b ) > share( a ) ? b : a ) ).value, groups } ];
		} ) );
	}
	return out;
}

// The resting rule's transition longhands at a width: the cascade winner of the resting read, its property list the
// rendered one where the code states none.
function restDeclOf( reads, id, w ) {
	const declared = reads.declared?.[ w ]?.[ id ] || {};
	const rendered = reads.widths?.[ w ]?.[ id ]?.styles || {};
	return { 'transition-property': declared[ 'transition-property' ] ?? rendered[ 'transition-property' ], ...pick( declared ) };
}

const perWidth = ( byWidth ) => ( Object.keys( byWidth ).length ? byWidth : null );
const pick = ( o ) => Object.fromEntries( [ 'transition-property', ...LIST_PROPS ].filter( ( p ) => undefined !== o?.[ p ] ).map( ( p ) => [ p, o[ p ] ] ) );

// The timings one target's code declares: { rest: { prop: { width: value } }, enter: { state: { prop: { width: value } } },
// skipped: [{ prop, why }], split: [{ prop, state, width, value, groups }] }. A list that times its properties
// differently gives the timing most of them share as the value, and the whole split in `split`. The resting rule's
// timing is the cascade winner of the resting read (reads.declared), its property list the rendered one where the code
// states none; a state rule's is the look's rendered value (lib/fill-state-reach.mjs::stateDrafts' rule: the render confirms
// the code), its property list the look's own, else the resting one.
export function timingFacts( reads, id ) {
	const out = { rest: {}, enter: {}, skipped: [], split: [] };
	const restDecl = ( w ) => restDeclOf( reads, id, w );
	const take = ( prop, state, w, decl, onto ) => {
		const t = propertyTimings( decl, prop );
		if ( t?.computed ) {
			out.skipped.push( { prop, why: `"${ decl[ prop ] }" at ${ w }px is computed in the code` } );
		} else if ( t?.value ) {
			onto[ w ] = t.value;
			1 < t.groups.length && out.split.push( { prop, state, width: w, value: t.value, groups: t.groups } );
		}
	};
	for ( const prop of LIST_PROPS ) {
		const rest = {};
		for ( const w of READ_WIDTHS ) {
			undefined !== reads.declared?.[ w ]?.[ id ]?.[ prop ] && take( prop, null, w, restDecl( w ), rest );
		}
		if ( perWidth( rest ) ) {
			out.rest[ prop ] = rest;
		}
		for ( const w of READ_WIDTHS ) {
			for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
				if ( undefined === look.declared?.[ prop ] ) {
					continue;
				}
				const state = [ ...look.states ].sort().join( '+' );
				const own = { ...pick( look.declared ), ...pick( look.rendered ) };
				const decl = { 'transition-property': own[ 'transition-property' ] ?? restDecl( w )[ 'transition-property' ], ...own };
				const onto = {};
				take( prop, state, w, decl, onto );
				if ( undefined !== onto[ w ] ) {
					( ( out.enter[ state ] ??= {} )[ prop ] ??= {} )[ w ] = onto[ w ];
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
	// Which setting took each longhand's timing per state ('prop|state'), and the gap a resting timing met.
	const homes = new Map();
	const tried = new Map();
	const apply = ( prop, state, res, how, also = [] ) => {
		for ( const w of res.writes ) {
			const { before, after } = setAttr( node, w );
			out.writes.push( { ...where, index: rec.index, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how } );
			[ state, ...also ].forEach( ( s ) => homes.set( `${ prop }|${ s || '' }`, w.attr ) );
		}
	};
	const gap = ( prop, state, draft, reason ) => out.unmapped.push( { ...where, property: prop, state, value: JSON.stringify( draft ), reason } );
	const part = target.slot || 'this element';
	// Whether the element's calibrated default paint shows the draft's declared resting `prop` at width `w` (a property
	// the calibration did not measure there shows nothing): such a timing needs no setting, and the element pass settles it.
	const shown = ( prop, w ) => samePaint( prop, reads.declared?.[ w ]?.[ target.id ]?.[ prop ], defaultPaint( cal, target.slot || '', Number( w ), prop ) );
	// A computed timing is a `timing-computed` gap where the block has a setting for it, and a `timing-no-home` row where none holds it.
	out.unmapped.push( ...facts.skipped.map( ( s ) => ( { ...where, property: s.prop, state: null, value: '', reason: candidates( db, rec.name, s.prop ).length ? `timing-computed: ${ s.why }` : `timing-no-home: ${ rec.name } has no setting that holds the ${ s.prop } of ${ part }, and ${ s.why }` } ) ) );
	for ( const prop of LIST_PROPS ) {
		const rest = facts.rest[ prop ] || null;
		const res = rest ? resolve( prop, rest, null ) : null;
		res && tried.set( prop, res );
		if ( 'written' === res?.status ) {
			apply( prop, null, res, 'fill-timing' );
		} else if ( res && ! [ 'no-setting', 'unmapped-element' ].includes( res.gap ) ) {
			gap( prop, null, rest, `${ res.gap }: ${ res.detail || 'the resting timing has no single value this setting holds' }` );
		} else if ( res && ! facts.split.some( ( s ) => s.prop === prop && null === s.state ) && ! inertTiming( prop, rest, facts.rest[ 'transition-duration' ] ) && ! Object.keys( rest ).every( ( w ) => shown( prop, w ) ) ) {
			// A resting timing no setting of the block holds is a `timing-no-home` row (a split list leaves one per property,
			// splitRows), unless the element's calibrated default paint already shows it at every width it is read at.
			gap( prop, null, rest, `timing-no-home: ${ rec.name } has no setting that holds the resting ${ prop } of ${ part } (${ res.gap })` );
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
				apply( prop, null, both, 'fill-timing-reverse', [ state ] );
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
	out.unmapped.push( ...splitRows( { facts, homes, tried, where, rec, target, shown, motion: stateHover( reads, target ).base, paint: paintTimings( reads, target.id ) } ) );
	return out;
}

// Whether a resting timing times nothing at every width it is read at: a 0s duration or delay (the initial value, no
// transition and no wait), or an easing whose duration is 0s there. rest: { width: value }; duration: the resting
// transition-duration by width, or null.
function inertTiming( prop, rest, duration ) {
	const zero = ( v ) => 0 === timeToMs( oneTiming( v ) );
	return Object.entries( rest ).every( ( [ w, v ] ) => ( 'transition-timing-function' === prop ? undefined !== duration?.[ w ] && zero( duration[ w ] ) : zero( v ) ) );
}

const named = ( groups ) => groups.map( ( g ) => `${ g.properties.join( ', ' ) } at ${ g.value }` ).join( '; ' );

// The rows a list that times its properties differently leaves, one per longhand, state and split, with the widths it is
// read at. Where a setting took the longhand, it holds one timing for every property the element transitions, so the
// timing most properties share is written and each other timing is a `timing-conflict` row naming its properties. Where
// the motion hover layer times the element (lib/fill-state-motion.mjs::stateHover found a hover transform), the layer
// holds two timings: transform's for the movement, and one for colour, background, border colour and shadow (paint,
// paintTimings: the timing most paint properties share, written by lib/fill-motion.mjs::motionWrites as paintDuration and
// paintEasing; the shadow's own duration and easing as shadowDuration and shadowEasing). A property these timings hold
// leaves no row; each other is a `timing-conflict` row. Where the block has
// no setting for the longhand on this element, each property is a `timing-no-home` row, and none where the element's
// calibrated default paint already shows the resting list at that width (shown); any other gap leaves a
// `timing-split` row for the properties its reported value does not cover.
function splitRows( { facts, homes, tried, where, rec, target, shown, motion, paint = {} } ) {
	const rows = new Map();
	const part = target.slot || 'this element';
	for ( const { prop, state, width, value, groups } of facts.split ) {
		const attr = homes.get( `${ prop }|${ state || '' }` );
		const gap = null === state ? tried.get( prop )?.gap : null;
		const layer = ! attr && motion && [ null, 'hover' ].includes( state );
		const ref = layer ? groups.find( ( g ) => g.properties.some( ( p ) => [ 'transform', 'all' ].includes( p ) ) ) || groups[ 0 ] : groups.find( ( g ) => sameTiming( prop, g.value, value ) ?? g.value === value );
		const others = groups.filter( ( g ) => g !== ref );
		const lines = layer ? layerLines( { prop, part, groups, ref, paint: null === state ? paint[ width ]?.[ prop ] : undefined } )
			: attr || ! [ 'no-setting', 'unmapped-element' ].includes( gap )
			? [ { draft: others, reason: attr
				? `timing-conflict: ${ attr } holds one ${ prop } for every property ${ part } transitions; ${ ref.value } is written (${ ref.properties.join( ', ' ) }), and the draft times ${ named( others ) }`
				: `timing-split: the ${ prop } reported for ${ part } is ${ ref.value } (${ ref.properties.join( ', ' ) }); the draft also times ${ named( others ) }` } ]
			: shown( prop, width ) ? [] : groups.flatMap( ( g ) => g.properties.map( ( p ) => ( { draft: [ { value: g.value, properties: [ p ] } ], reason: `timing-no-home: ${ rec.name } has no setting that holds the ${ prop } of ${ p } on ${ part } (the draft's ${ g.value })` } ) ) );
		for ( const { draft, reason } of lines ) {
			const key = `${ prop }|${ state }|${ reason }`;
			const row = rows.get( key ) || { ...where, property: prop, state, value: JSON.stringify( draft.map( ( g ) => ( { properties: g.properties, value: g.value } ) ) ), reason, widths: [] };
			row.widths.push( width );
			rows.set( key, row );
		}
	}
	return [ ...rows.values() ];
}

// The rows the motion hover layer's timings leave for one longhand at one width: a paint property timed other than the
// paint timing, and any other property timed other than transform's (ref). The shadow's duration and easing are its own
// fields (lib/fill-motion-element.mjs::paintLayer writes them and names what they cannot hold); its delay is the movement's. paint: paintTimings' entry for the resting
// rule, or undefined (a state rule's timing, which the paint timing is not read from: every property is then movement).
function layerLines( { prop, part, groups, ref, paint } ) {
	const same = ( a, b ) => sameTiming( prop, a, b ) ?? a === b;
	const off = ( keep ) => groups.map( ( g ) => ( { value: g.value, properties: g.properties.filter( ( p ) => keep( p, g ) ) } ) ).filter( ( g ) => g.properties.length );
	const movement = off( ( p, g ) => ! ( paint && isPaint( p ) ) && g !== ref );
	const painted = paint ? off( ( p, g ) => isPaint( p ) && ! ( SHADOW === p && 'transition-delay' !== prop ) && ! same( g.value, paint.value ) ) : [];
	return [
		...( movement.length ? [ { draft: movement, reason: `timing-conflict: the motion hover layer (sgsMotion) times the movement of ${ part } with transform's ${ prop } ${ ref.value }; the draft times ${ named( movement ) }` } ] : [] ),
		...( painted.length ? [ { draft: painted, reason: `timing-conflict: the motion hover layer (sgsMotion) times colour, background, border colour and shadow of ${ part } with one ${ prop }, ${ paint.value } (${ paint.groups.find( ( g ) => same( g.value, paint.value ) ).properties.join( ', ' ) }); the draft times ${ named( painted ) }` } ] : [] ),
	];
}

// Whether two per-width timings ({ width: value }) are one timing at every width, by sameTiming's canonical reading
// (`.2s` is `200ms`); a value it cannot read compares as written.
function sameAtWidths( prop, a, b ) {
	const widths = Object.keys( a );
	return widths.length === Object.keys( b ).length && widths.every( ( w ) => w in b && ( sameTiming( prop, a[ w ], b[ w ] ) ?? a[ w ] === b[ w ] ) );
}

// Whether a live timing is the draft's: times within 10ms, easings by their canonical spelling. null when either cannot
// be read as one.
export function sameTiming( prop, a, b ) {
	if ( 'transition-duration' === prop || 'transition-delay' === prop ) {
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
