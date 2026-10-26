// The resting rows a motion part's hover state holds (Spec 48 FR-48-78). A draft element whose width eases on its parent's
// hover (a burger bar: `width: var(--b2, 13px); transition: width .3s ...`, the button's hover setting --b2) is written by
// lib/fill-motion.mjs::motionWrites as the part's sgsMotion hover state: its rest length (restWidth), hover length (width),
// duration, delay and easing. The resolver passes, which look for a block setting by property, raise the same element's
// resting transition-duration, transition-timing-function, transition-delay and width rows before the motion pass runs.
// Each such row whose every width equals what the written state carries is settled by the motion pass (reason `motion`,
// lib/fill-report.mjs::passSettled); a row that differs at any width stays raised. The resting transition-property and
// transition-behavior reads, which no setting holds, get their outcome here too (transitionListOutcomes).
import { msOf, easingOf, clientTokens } from './motion-tokens.mjs';
import { targetName } from './fill-motion.mjs';
import { exactHome } from './fill-part-pairing.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultPaint, INHERITED } from './fill-prop.mjs';
import { CSS_WIDE } from './fill-declared.mjs';
import { longhandsOf, layerTimings, layerGives } from './census-conservation.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { timingDuplicates } from './fill-timing.mjs';

// A row's value per width: a per-width JSON object as written, a plain value at every width the read declares.
function perWidth( row, declaredAt ) {
	try {
		const v = JSON.parse( row.value );
		if ( v && 'object' === typeof v && ! Array.isArray( v ) ) {
			return v;
		}
	} catch {}
	return Object.fromEntries( declaredAt.map( ( w ) => [ w, row.value ] ) );
}

const LIST = ( v ) => String( v ).split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() );

// Whether the state's values give the row's property `raw` at one width. tok: a 'token:' value resolved to the client's.
function carries( prop, raw, values, tok ) {
	if ( 'transition-duration' === prop ) {
		const ms = msOf( tok( values.duration ) );
		return null !== ms && LIST( raw ).every( ( x ) => msOf( x ) === ms );
	}
	if ( 'transition-delay' === prop ) {
		const ms = msOf( tok( values.delay ?? 0 ) );
		return null !== ms && LIST( raw ).every( ( x ) => msOf( x ) === ms );
	}
	if ( 'transition-timing-function' === prop ) {
		const e = easingOf( tok( values.easing ) );
		return null !== e && LIST( raw ).every( ( x ) => easingOf( x ) === e );
	}
	if ( 'width' === prop ) {
		return undefined !== values.restWidth && parseFloat( values.restWidth ) === parseFloat( raw ) && /px$/.test( String( values.restWidth ) ) && /px$/.test( String( raw ) );
	}
	return false;
}

const PROPS = [ 'transition-duration', 'transition-delay', 'transition-timing-function', 'width' ];

// opts: { unmapped, writes (the motion pass's writes), nodes, flat, refOf, mdb, db, calFor, reads, rawSnapshot }.
// Returns { unmapped (the rows still raised), answered ([ row + { widths } ], for passSettled) }. A resting timing the state
// pass raised per property leaves no generic row beside it (lib/fill-timing.mjs::timingDuplicates): the generic row is
// answered with a detail naming the state pass's row that holds its evidence, so it is listed settled, never lost.
export function motionSettled( { unmapped, writes, nodes, flat, refOf, mdb, db, calFor, reads, rawSnapshot } ) {
	const tokens = clientTokens( rawSnapshot );
	const tok = ( v ) => ( 'string' === typeof v && v.startsWith( 'token:' ) ? tokens[ v.slice( 6 ) ] : v );
	const kept = [];
	const answered = [];
	const dup = timingDuplicates( unmapped );
	for ( const row of dup.dropped ) {
		const twin = dup.of.get( row );
		const declaredAt = READ_WIDTHS.filter( ( w ) => undefined !== reads?.declared?.[ w ] && Object.values( reads.declared[ w ] ).some( ( d ) => undefined !== d?.[ row.property ] ) );
		answered.push( { ...row, slot: row.slot ?? '', widths: Object.keys( perWidth( row, declaredAt.length ? declaredAt : READ_WIDTHS ) ).map( Number ), settledDetail: `lib/fill-timing.mjs: the state pass's ${ String( twin.reason ).split( ':' )[ 0 ] } row for the same ${ row.property } (${ twin.value }) holds it per property` } );
	}
	for ( const row of dup.unmapped ) {
		const n = row.slot && PROPS.includes( row.property ) && ! row.state ? nodes.find( ( x ) => refOf( flat[ x.index ] ) === row.node ) : null;
		const t = n?.targets.find( ( x ) => x.slot === ( row.slot ?? '' ) );
		const doc = t ? writes.find( ( w ) => w.node === row.node && 'motion' === w.how && 'sgsMotion' === w.attr )?.after : null;
		if ( ! doc ) {
			kept.push( row );
			continue;
		}
		const cal = calFor?.( n.name );
		const target = targetName( n, t, mdb.targetsOf( n.name ), cal && db ? ( el ) => exactHome( db, n.name, cal, el ) : null );
		const values = target ? doc.elements?.[ target ]?.hover?.state?.values : null;
		const declaredAt = READ_WIDTHS.filter( ( w ) => undefined !== reads?.declared?.[ w ]?.[ t.id ]?.[ row.property ] );
		const at = perWidth( row, declaredAt.length ? declaredAt : READ_WIDTHS );
		const widths = Object.keys( at ).map( Number );
		if ( values && widths.length && widths.every( ( w ) => carries( row.property, at[ w ], values, tok ) ) ) {
			answered.push( { ...row, slot: row.slot ?? '', widths } );
		} else {
			kept.push( row );
		}
	}
	return { unmapped: kept, answered };
}

const TIMING_PROPS = [ 'transition-duration', 'transition-delay', 'transition-timing-function' ];

// The resting timing rows the element pass settled `equal` (the element's stylesheet shows the draft's timing) on an
// element the written sgsMotion document gives a layer: the emitter's scoped `transition` replaces the stylesheet's list
// there (class-sgs-motion-emitter.php), so the stylesheet's timing is not what live runs. Each such row is judged by the
// layer instead: settled `motion` where every width's value is one the layer gives (census-conservation.mjs::layerGives),
// else an UNMAPPED timing-conflict row naming the layer. opts: { settled, writes (the motion pass's), nodes, flat, refOf,
// mdb, db, calFor, rawSnapshot }. Returns { settled (the whole list, judged rows replaced), unmapped (the raised rows) }.
export function motionRejudged( { settled, writes, nodes, flat, refOf, mdb, db, calFor, rawSnapshot } ) {
	const tokens = clientTokens( rawSnapshot );
	const out = { settled: [], unmapped: [] };
	for ( const s of settled ) {
		const n = 'equal' === s.reason && TIMING_PROPS.includes( s.property ) && ! s.state ? nodes.find( ( x ) => refOf( flat[ x.index ] ) === s.node ) : null;
		const t = n?.targets.find( ( x ) => x.slot === ( s.slot ?? '' ) );
		const doc = t ? writes.find( ( w ) => 'sgsMotion' === w.attr && 'motion' === w.how && w.node === s.node )?.after : null;
		const cal = doc ? calFor?.( n.name ) : null;
		const target = doc ? targetName( n, t, mdb.targetsOf( n.name ), cal && db ? ( el ) => exactHome( db, n.name, cal, el ) : null ) : null;
		const given = target ? layerTimings( doc.elements?.[ target ] ) : {};
		const at = perWidth( s, s.widths || [] );
		if ( ! Object.keys( given ).length || ! Object.keys( at ).length ) {
			out.settled.push( s );
			continue;
		}
		const part = s.slot || 'the block root';
		if ( Object.values( at ).every( ( v ) => layerGives( s.property, v, given[ s.property ], tokens ) ) ) {
			out.settled.push( { ...s, reason: 'motion', detail: `lib/fill-motion-settle.mjs: the sgsMotion layer of ${ target } gives ${ part } this ${ s.property } (it replaces the stylesheet's transition)` } );
		} else {
			out.unmapped.push( { node: s.node, block: s.block, slot: s.slot ?? '', property: s.property, state: null, value: JSON.stringify( at ), reason: `timing-conflict: the motion hover layer (sgsMotion) of ${ target } replaces the stylesheet's transition on ${ part }, and its ${ s.property } (${ ( given[ s.property ] || [ 'the emitter default' ] ).join( ', ' ) }) is not the draft's resting ${ s.property }` } );
		}
	}
	return out;
}

// The colour-and-shadow properties every sgsMotion hover state transitions beside its movement (includes/motion/
// class-sgs-motion-emitter.php::HOVER_PAINT).
export const HOVER_PAINT = [ 'color', 'background-color', 'border-color', 'box-shadow' ];
// The hover state values that time the layer; any other value is a movement whose property the layer also transitions.
const TIMING_VALUE = /^(?:duration|easing|delay|(?:paint|shadow)(?:Duration|Easing|Delay))$/;
const BASE_FILE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', 'plugins', 'sgs-blocks', 'includes', 'motion', 'data', 'base-transitions.json' );
let baseTable;
// The block parts' own base transitions, which a part's motion `transition` keeps (Sgs_Motion_Base_Transitions::entries),
// or null where the generated table is not there.
export function baseTransitions() {
	if ( undefined === baseTable ) {
		baseTable = fs.existsSync( BASE_FILE ) ? JSON.parse( fs.readFileSync( BASE_FILE, 'utf8' ) ) : null;
	}
	return baseTable;
}

const names = ( v ) => LIST( v ).map( ( x ) => x.toLowerCase() ).filter( Boolean );
// Whether transitioning `a` transitions every longhand `b` sets (`all` covers everything).
const covers = ( a, b ) => 'all' === a || longhandsOf( b ).every( ( l ) => longhandsOf( a ).includes( l ) );
// The properties a moving hover state's own entries transition, which Fill does not rebuild (liveList `complete`).
const MOVEMENT = [ 'transform', 'translate', 'scale', 'rotate' ];
const uncovered = ( list, by ) => list.filter( ( p ) => ! by.some( ( q ) => covers( q, p ) ) );
// A transition-behavior list per transitioned property: the entry at the property's place, the list repeating when shorter.
const behaviours = ( props, list ) => props.map( ( p, i ) => [ p, list.length ? list[ i % list.length ] : 'normal' ] );

// What the live element transitions at one width: { props, behaviours, complete, by } from the element's written sgsMotion
// hover state (its HOVER_PAINT entries, the part's base transitions, and its movement; the layer's `transition` shorthand
// sets every entry's behaviour to normal; `complete` is false where Fill does not rebuild every entry the emitter adds:
// a state that moves something (follow pointer among them, with its settle entries), a hover effect's own entries, an
// open or state entrance's colour entries), else from the element's calibrated default paint (`behaviours` null where calibration did
// not read transition-behavior), or null where calibration did not read the list.
function liveList( { n, t, w, motion, mdb, db, cal, base } ) {
	const doc = motion.find( ( x ) => x.node === n.ref )?.after;
	const target = doc ? targetName( n, t, mdb.targetsOf( n.name ), cal && db ? ( el ) => exactHome( db, n.name, cal, el ) : null ) : null;
	const element = target ? doc.elements?.[ target ] : null;
	const values = element?.hover?.state?.values;
	if ( values ) {
		const moves = Object.keys( values ).some( ( k ) => ! TIMING_VALUE.test( k ) );
		const more = !! element.hover.effects?.length || !! element.entrance?.base;
		const kept = moves || ! base ? [] : ( base[ n.name ]?.[ target ] || [] ).map( ( e ) => String( e ).split( ' ' )[ 0 ].toLowerCase() );
		return { props: [ ...HOVER_PAINT, ...kept ], behaviours: [ 'normal' ], complete: ! moves && ! more && !! base, by: 'motion' };
	}
	const at = ( prop ) => defaultPaint( cal, t.slot || '', w, prop );
	const behaviour = at( 'transition-behavior' );
	return undefined === at( 'transition-property' ) ? null : { props: names( at( 'transition-property' ) ), behaviours: undefined === behaviour ? null : names( behaviour ), complete: true, by: 'paint' };
}

// What the draft's state looks change at one width: { own, up, ownUnknown, upUnknown } or null where no state look was read
// there. `own` holds the properties the target's own looks declare differently from rest (a pseudo-element's look is
// another element's); `up` holds those of every target of the node's ancestors, which an inherited property follows
// (lib/fill-state-reach.mjs::ancestorLook). A state the read could not reach (`reads.states[w].unreached`) on the target, or
// on an ancestor's target, is unknown, not unchanging: `ownUnknown` and `upUnknown` say so.
function changingAt( reads, nodes, n, t, w ) {
	if ( ! reads?.states?.[ w ] ) {
		return null;
	}
	const declared = ( ids ) => new Set( ids.flatMap( ( id ) => ( reads.states[ w ].looks?.[ id ] || [] ).filter( ( l ) => ! l.pseudo ).flatMap( ( l ) => Object.keys( l.declared || {} ) ) ).flatMap( longhandsOf ) );
	const above = [];
	for ( let p = n.parent; null !== p && undefined !== p; p = nodes[ p ]?.parent ) {
		above.push( ...( nodes[ p ]?.targets || [] ).map( ( x ) => x.id ) );
	}
	const unknown = ( ids ) => ( reads.states[ w ].unreached || [] ).some( ( u ) => ids.includes( u.id ) );
	return { own: declared( [ t.id ] ), up: declared( above ), ownUnknown: unknown( [ t.id ] ), upUnknown: unknown( above ) };
}

// One resting read's outcome at one width: { settle: 'equal' | 'motion', inert } or { reason } (an UNMAPPED row's).
// `changing`: what the states change at this width (changingAt), or null where unread: a live list that also transitions
// properties the draft does not is inert (settled, `inert` naming them) when none of them changes, an inherited one also
// from an ancestor's look.
function listOutcome( { prop, draft, behaviour, live, block, part, changing = null } ) {
	if ( ! live || ( 'transition-behavior' === prop && ! live.behaviours ) ) {
		return { reason: `calibration has no reading of ${ prop } for ${ part } of ${ block } (lib/calibrate-props.mjs::READ_PROPS does not read it), so whether live transitions the draft's ${ draft.join( ', ' ) }${ 'transition-behavior' === prop ? ` with behaviour ${ behaviour.join( ', ' ) }` : '' } is unknown` };
	}
	const settle = 'motion' === live.by ? 'motion' : 'equal';
	const whose = 'motion' === live.by ? `its sgsMotion hover state transitions ${ live.props.join( ', ' ) }${ live.complete ? '' : ' and the entries its movement, effects or entrance add' } (Sgs_Motion_Emitter::HOVER_PAINT${ live.complete ? ' and the part\'s base transitions' : '' })` : `its stylesheet transitions ${ live.props.join( ', ' ) } (calibrated default paint)`;
	if ( 'transition-behavior' === prop ) {
		const liveOf = ( p ) => {
			const i = live.props.indexOf( p );
			return i >= 0 ? live.behaviours[ i % live.behaviours.length ] : 1 === new Set( live.behaviours ).size ? live.behaviours[ 0 ] : null;
		};
		const off = behaviours( draft, behaviour ).filter( ( [ p, b ] ) => liveOf( p ) !== b );
		return off.length ? { reason: `no-setting: ${ block } has no setting for the transition-behavior of ${ part }; ${ whose } with behaviour ${ live.behaviours.join( ', ' ) }, the draft times ${ off.map( ( [ p, b ] ) => `${ p } ${ b }` ).join( ', ' ) }` } : { settle };
	}
	const more = uncovered( live.props, draft );
	const less = live.complete ? uncovered( draft, live.props ) : [];
	const exact = 'paint' === live.by ? draft.join( ',' ) === live.props.join( ',' ) : live.complete && ! more.length && ! less.length;
	if ( exact ) {
		return { settle };
	}
	// Whether no state change reaches an extra property, given what the states change (`c`).
	const still = ( c ) => more.length && ! less.length && ! uncovered( draft, live.props ).some( ( p ) => ! MOVEMENT.includes( p ) ) && more.every( ( p ) => ! longhandsOf( p ).some( ( l ) => c.own.has( l ) || ( INHERITED.includes( p ) && c.up.has( l ) ) ) );
	if ( changing && ! changing.ownUnknown && ! ( changing.upUnknown && more.some( ( p ) => INHERITED.includes( p ) ) ) && still( changing ) ) {
		return { settle, inert: more };
	}
	const unreached = changing && ( changing.ownUnknown || changing.upUnknown ) && still( changing ) ? 'a state of this element or an ancestor was not reached, so the extra properties are not known to stay still' : '';
	const diff = [ more.length ? `live also transitions ${ more.join( ', ' ) }` : '', less.length ? `the draft also transitions ${ less.join( ', ' ) }` : '', unreached ].filter( Boolean ).join( '; ' ) || ( live.complete ? 'the same properties in another order' : 'Fill cannot tell whether the movement, an effect or the entrance adds a property the draft does not transition' );
	return { reason: `no-setting: ${ block } has no setting for which properties ${ part } transitions; ${ whose }, the draft ${ draft.join( ', ' ) }: ${ diff }` };
}

// The resting transition-property and transition-behavior reads (no setting holds either): each width where the live
// element transitions the draft's properties (with its behaviours) is settled, `equal` by the calibrated default paint
// (compared in order: the list pairs with the timing lists) or `motion` by the written sgsMotion hover state (compared as
// a set: the emitter times each entry itself); every other width is an UNMAPPED row naming the difference. opts: { nodes,
// flat, refOf, reads, writes (every write so far), mdb, db, calFor, base (baseTransitions()) }. Returns { settled, unmapped }.
export function transitionListOutcomes( { nodes, flat, refOf, reads, writes, mdb, db, calFor, base = baseTransitions() } ) {
	const motion = writes.filter( ( w ) => 'motion' === w.how && 'sgsMotion' === w.attr );
	const rows = new Map();
	for ( const node of nodes ) {
		const n = { ...node, ref: refOf( flat[ node.index ] ) };
		const cal = calFor?.( n.name ) ?? null;
		for ( const t of n.targets ) {
			const part = t.slot || 'the block root';
			for ( const w of READ_WIDTHS ) {
				const decl = reads?.declared?.[ w ]?.[ t.id ] || {};
				for ( const prop of [ 'transition-property', 'transition-behavior' ] ) {
					if ( undefined === decl[ prop ] || CSS_WIDE.test( String( decl[ prop ] ).trim() ) ) {
						continue;
					}
					const draft = names( decl[ 'transition-property' ] ?? 'all' );
					const o = listOutcome( { prop, draft, behaviour: names( decl[ 'transition-behavior' ] ?? 'normal' ), live: liveList( { n, t, w, motion, mdb, db, cal, base } ), block: n.name, part, changing: changingAt( reads, nodes, n, t, w ) } );
					const key = `${ t.id }|${ prop }|${ o.settle ?? o.reason }|${ ( o.inert || [] ).join() }`;
					const row = rows.get( key ) || { o, node: n.ref, block: n.name, slot: t.slot ?? '', property: prop, at: {} };
					row.at[ w ] = decl[ prop ];
					rows.set( key, row );
				}
			}
		}
	}
	const out = { settled: [], unmapped: [] };
	for ( const { o, at, ...row } of rows.values() ) {
		const value = JSON.stringify( at );
		const how = 'equal' === o.settle ? "the element's calibrated default paint transitions the draft's properties at these widths" : "lib/fill-motion-settle.mjs: the written sgsMotion hover state transitions the draft's properties at these widths";
		const detail = o.inert ? `${ how }, and also ${ o.inert.join( ', ' ) }, which no state changes there, so nothing animates that the draft does not` : how;
		o.settle ? out.settled.push( { ...row, value, widths: Object.keys( at ).map( Number ), reason: o.settle, detail } ) : out.unmapped.push( { ...row, state: null, value, reason: o.reason } );
	}
	return out;
}
