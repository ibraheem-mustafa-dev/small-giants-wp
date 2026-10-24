// The resting rows a motion part's hover state holds (Spec 48 FR-48-78). A draft element whose width eases on its parent's
// hover (a burger bar: `width: var(--b2, 13px); transition: width .3s ...`, the button's hover setting --b2) is written by
// lib/fill-motion.mjs::motionWrites as the part's sgsMotion hover state: its rest length (restWidth), hover length (width),
// duration, delay and easing. The resolver passes, which look for a block setting by property, raise the same element's
// resting transition-duration, transition-timing-function, transition-delay and width rows before the motion pass runs.
// Each such row whose every width equals what the written state carries is settled by the motion pass (reason `motion`,
// lib/fill-report.mjs::passSettled); a row that differs at any width stays raised.
import { msOf, easingOf, clientTokens } from './motion-tokens.mjs';
import { targetName } from './fill-motion.mjs';
import { exactHome } from './fill-part-pairing.mjs';

const READ_WIDTHS = [ 375, 768, 1440 ];

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
