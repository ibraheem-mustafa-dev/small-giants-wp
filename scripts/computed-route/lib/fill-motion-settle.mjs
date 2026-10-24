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
import { defaultPaint } from './fill-prop.mjs';
import { CSS_WIDE } from './fill-declared.mjs';
import { longhandsOf } from './census-conservation.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

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
// Returns { unmapped (the rows still raised), answered ([ row + { widths } ], for passSettled) }.
export function motionSettled( { unmapped, writes, nodes, flat, refOf, mdb, db, calFor, reads, rawSnapshot } ) {
	const tokens = clientTokens( rawSnapshot );
	const tok = ( v ) => ( 'string' === typeof v && v.startsWith( 'token:' ) ? tokens[ v.slice( 6 ) ] : v );
	const kept = [];
	const answered = [];
	for ( const row of unmapped ) {
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
const uncovered = ( list, by ) => list.filter( ( p ) => ! by.some( ( q ) => covers( q, p ) ) );
// A transition-behavior list per transitioned property: the entry at the property's place, the list repeating when shorter.
const behaviours = ( props, list ) => props.map( ( p, i ) => [ p, list.length ? list[ i % list.length ] : 'normal' ] );

// What the live element transitions at one width: { props, behaviours, complete, by } from the element's written sgsMotion
// hover state (its HOVER_PAINT entries, the part's base transitions, and its movement; the layer's `transition` shorthand
// sets every entry's behaviour to normal; `complete` is false where the state moves something, whose property Fill does
// not read back), else from the element's calibrated default paint, or null where calibration did not read it.
function liveList( { n, t, w, motion, mdb, db, cal, base } ) {
	const doc = motion.find( ( x ) => x.node === n.ref )?.after;
	const target = doc ? targetName( n, t, mdb.targetsOf( n.name ), cal && db ? ( el ) => exactHome( db, n.name, cal, el ) : null ) : null;
	const values = target ? doc.elements?.[ target ]?.hover?.state?.values : null;
	if ( values ) {
		const moves = Object.keys( values ).some( ( k ) => ! TIMING_VALUE.test( k ) );
		const kept = moves || ! base ? [] : ( base[ n.name ]?.[ target ] || [] ).map( ( e ) => String( e ).split( ' ' )[ 0 ].toLowerCase() );
		return { props: [ ...HOVER_PAINT, ...kept ], behaviours: [ 'normal' ], complete: ! moves && !! base, by: 'motion' };
	}
	const at = ( prop ) => defaultPaint( cal, t.slot || '', w, prop );
	return undefined === at( 'transition-property' ) ? null : { props: names( at( 'transition-property' ) ), behaviours: names( at( 'transition-behavior' ) ?? 'normal' ), complete: true, by: 'paint' };
}

// One resting read's outcome at one width: { settle: 'equal' | 'motion' } or { reason } (an UNMAPPED row's).
function listOutcome( { prop, draft, behaviour, live, block, part } ) {
	if ( ! live ) {
		return { reason: `calibration has no reading of ${ prop } for ${ part } of ${ block } (lib/calibrate-props.mjs::READ_PROPS does not read it), so whether live transitions the draft's ${ draft.join( ', ' ) }${ 'transition-behavior' === prop ? ` with behaviour ${ behaviour.join( ', ' ) }` : '' } is unknown` };
	}
	const settle = 'motion' === live.by ? 'motion' : 'equal';
	const whose = 'motion' === live.by ? `its sgsMotion hover state transitions ${ live.props.join( ', ' ) }${ live.complete ? '' : ' and the properties its movement sets' } (Sgs_Motion_Emitter::HOVER_PAINT${ live.complete ? ' and the part\'s base transitions' : '' })` : `its stylesheet transitions ${ live.props.join( ', ' ) } (calibrated default paint)`;
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
	const diff = [ more.length ? `live also transitions ${ more.join( ', ' ) }` : '', less.length ? `the draft also transitions ${ less.join( ', ' ) }` : '' ].filter( Boolean ).join( '; ' ) || ( live.complete ? 'the same properties in another order' : 'Fill cannot tell whether the movement adds a property the draft does not transition' );
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
					const o = listOutcome( { prop, draft, behaviour: names( decl[ 'transition-behavior' ] ?? 'normal' ), live: liveList( { n, t, w, motion, mdb, db, cal, base } ), block: n.name, part } );
					const key = `${ t.id }|${ prop }|${ o.settle ?? o.reason }`;
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
		const detail = 'equal' === o.settle ? 'the element\'s calibrated default paint transitions the draft\'s properties at these widths' : 'lib/fill-motion-settle.mjs: the written sgsMotion hover state transitions the draft\'s properties at these widths';
		o.settle ? out.settled.push( { ...row, value, widths: Object.keys( at ).map( Number ), reason: o.settle, detail } ) : out.unmapped.push( { ...row, state: null, value, reason: o.reason } );
	}
	return out;
}
